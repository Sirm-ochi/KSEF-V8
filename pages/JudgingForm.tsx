import React, { useState, useContext, useEffect, useMemo, useRef, useCallback } from 'react';
// FIX: Replaced namespace import for react-router-dom with named imports to resolve module export errors.
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
// FIX: Removed `USERS` import as it is not exported from constants. The user list will be fetched from context.
import { SCORE_SHEET } from '../constants';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { JudgingCriterion, ProjectStatus, JudgeAssignment, UserRole } from '../types';
import { ArrowLeft, Check, Users, AlertCircle, AlertTriangle, Clock } from 'lucide-react';
import InfoModal from '../components/ui/InfoModal';

// Helper function to validate a score based on its criterion rules.
const validateScore = (score: string | number, max: number, step: number): number => {
    const numValue = typeof score === 'string' ? parseFloat(score) : score;
    if (isNaN(numValue)) {
        return 0;
    }
    let validatedValue = Math.max(0, Math.min(numValue, max));
    // Handle floating point inaccuracies by rounding to the nearest step and fixing precision.
    validatedValue = parseFloat((Math.round(validatedValue / step) * step).toFixed(2));
    return validatedValue;
};

// Helper to generate score options for quick-select buttons
const generateScoreOptions = (max: number, step: number): number[] => {
    const options: number[] = [];
    // Use a small epsilon to handle floating point inaccuracies
    for (let i = 0; i <= max + 1e-9; i += step) {
        options.push(parseFloat(i.toFixed(2)));
    }
    return options;
};

// --- Sub-components for the new layout ---

const CriterionInput: React.FC<{
    criterion: JudgingCriterion;
    value: number | string;
    reviewScores?: { judgeName: string; score?: number }[];
    error?: string;
    onUpdate: (id: number, val: string) => void;
    onValidate: (id: number, val: string, max: number, step: number) => void;
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, id: number) => void;
}> = ({ criterion, value, reviewScores, error, onUpdate, onValidate, onKeyDown }) => {
    const { id, text, details, maxScore, step = 0.5 } = criterion;
    const scoreOptions = generateScoreOptions(maxScore, step);

    const handleQuickSelect = (scoreValue: number) => {
        // Update and immediately validate
        onUpdate(id, String(scoreValue));
        onValidate(id, String(scoreValue), maxScore, step);
    };

    return (
        <div className={`p-4 bg-background-light dark:bg-background-dark rounded-lg border ${error ? 'border-red-500 shadow-md' : 'dark:border-gray-700'} transition-all duration-300 hover:shadow-md`}>
            <div className="flex flex-col md:flex-row gap-4 justify-between">
                {/* Criterion Details */}
                <div className="flex-1">
                    <p className="font-semibold text-text-light dark:text-text-dark">{text}</p>
                    <p className="text-sm text-text-muted-light dark:text-text-muted-dark mt-1">{details}</p>
                    {reviewScores && reviewScores.length > 0 && (
                        <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded-md">
                           <p className="text-xs font-bold flex items-center gap-1"><Users className="w-3 h-3"/> Other Judges' Total Scores:</p>
                           <div className="flex gap-4 text-xs">
                            {(reviewScores ?? []).map((rs, i) => (
                                <p key={i}><strong>{rs.judgeName}:</strong> <span className="text-primary">{rs.score}</span></p>
                            ))}
                           </div>
                        </div>
                    )}
                </div>

                {/* Scoring Controls */}
                <div className="flex flex-col items-start md:items-end gap-2" style={{ minWidth: '180px' }}>
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            inputMode="decimal"
                            value={value}
                            data-criterion-id={id}
                            onChange={(e) => onUpdate(id, e.target.value)}
                            onBlur={(e) => onValidate(id, e.target.value, maxScore, step)}
                            onKeyDown={(e) => onKeyDown(e, id)}
                            className={`w-20 p-2 text-center font-bold text-lg text-primary bg-white dark:bg-gray-800 border-2 rounded-md transition-colors ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:border-primary focus:ring-primary'}`}
                        />
                        <span className="font-semibold text-lg text-text-muted-light dark:text-text-muted-dark">/ {maxScore}</span>
                    </div>
                    {scoreOptions.length <= 6 && ( // Only show quick select for a reasonable number of options
                        <div className="flex flex-wrap gap-1">
                            {(scoreOptions ?? []).map(opt => (
                                <button
                                    key={opt}
                                    type="button"
                                    onClick={() => handleQuickSelect(opt)}
                                    className={`w-10 h-7 text-xs font-semibold rounded-md transition-colors ${
                                        Number(value) === opt && value !== ''
                                        ? 'bg-primary text-white ring-2 ring-primary-dark'
                                        : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                                    }`}
                                >
                                    {opt}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>
    );
};

const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

const JudgingForm: React.FC = () => {
    // FIX: Replaced ReactRouterDOM.useParams with useParams from named import.
    const { projectId } = useParams<{ projectId: string }>();
    // FIX: Replaced ReactRouterDOM.useNavigate with useNavigate from named import.
    const navigate = useNavigate();
    // FIX: Replaced ReactRouterDOM.useLocation with useLocation from named import.
    const location = useLocation();
    // FIX: Added `users` to the context destructuring to get the list of all users.
    const { user, projects, users, assignments, startJudging, updateAssignment, submitAssignmentScore, setActiveJudgingInfo } = useContext(AppContext);

    const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
    const sectionParam = queryParams.get('section');
    const isReviewMode = queryParams.get('review') === 'true';

    const [scores, setScores] = useState<{ [key: number]: number | string }>({});
    const [comments, setComments] = useState('');
    const [recommendations, setRecommendations] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<{ [key: number]: string }>({});
    const [generalError, setGeneralError] = useState('');
    const [conflictError, setConflictError] = useState<string | null>(null);
    
    // --- NEW: State for timer and inactivity modal ---
    const [elapsedTime, setElapsedTime] = useState(0);
    const [showInactivityModal, setShowInactivityModal] = useState(false);
    const inactivityTimerRef = useRef<ReturnType<typeof setTimeout>>();

    const { project, assignment, section, otherJudgeAssignments } = useMemo(() => {
        if (!projectId || !user) return { project: null, assignment: null, section: null, otherJudgeAssignments: [] };
        
        const currentProject = projects.find(p => p.id === projectId);
        
        let currentAssignment = assignments.find(a => a.projectId === projectId && a.judgeId === user.id && a.assignedSection === sectionParam);

        // If in review mode as a coordinator and no assignment exists, create a temporary one.
        if (!currentAssignment && isReviewMode && user.currentRole === UserRole.COORDINATOR && sectionParam) {
            currentAssignment = {
                projectId: projectId,
                judgeId: user.id,
                assignedSection: sectionParam as 'Part A' | 'Part B & C',
                status: ProjectStatus.IN_PROGRESS, // Start as in progress
            };
        }

        const currentSection = currentAssignment ? SCORE_SHEET.find(s => s.id === (currentAssignment.assignedSection === 'Part A' ? 'A' : 'BC')) : null;

        let otherAssignments: JudgeAssignment[] = [];
        if (isReviewMode && currentProject && currentSection) {
             otherAssignments = (assignments ?? []).filter(a => 
                a.projectId === projectId && 
                a.assignedSection === currentAssignment?.assignedSection &&
                a.status === ProjectStatus.COMPLETED
            );
        }

        return { project: currentProject, assignment: currentAssignment, section: currentSection, otherJudgeAssignments: otherAssignments };
    }, [projectId, user, projects, assignments, sectionParam, isReviewMode]);

    const orderedCriteriaIds = useMemo(() => section?.(criteria ?? []).map(c => c.id) || [], [section]);

    const sessionKey = useMemo(() => `judging-${projectId}-${user?.id}-${assignment?.assignedSection}`, [projectId, user?.id, assignment?.assignedSection]);
    
    // --- NEW: Session Timer Effect ---
    useEffect(() => {
        const timer = setInterval(() => {
            setElapsedTime(prevTime => prevTime + 1);
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // --- NEW: Inactivity Timer Logic ---
    const resetInactivityTimer = useCallback(() => {
        if (showInactivityModal) return;
        if (inactivityTimerRef.current) {
            clearTimeout(inactivityTimerRef.current);
        }
        inactivityTimerRef.current = setTimeout(() => {
            setShowInactivityModal(true);
        }, INACTIVITY_TIMEOUT_MS);
    }, [showInactivityModal]);

    useEffect(() => {
        window.addEventListener('mousemove', resetInactivityTimer);
        window.addEventListener('keydown', resetInactivityTimer);
        window.addEventListener('scroll', resetInactivityTimer);
        resetInactivityTimer();
        return () => {
            if (inactivityTimerRef.current) {
                clearTimeout(inactivityTimerRef.current);
            }
            window.removeEventListener('mousemove', resetInactivityTimer);
            window.removeEventListener('keydown', resetInactivityTimer);
            window.removeEventListener('scroll', resetInactivityTimer);
        };
    }, [resetInactivityTimer]);
    
    const handleContinueJudging = () => {
        setShowInactivityModal(false);
        resetInactivityTimer();
    };

    const formatTime = (totalSeconds: number): string => {
        const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
        const seconds = (totalSeconds % 60).toString().padStart(2, '0');
        return `${minutes}:${seconds}`;
    };

    // Effect for checking conflict of interest
    useEffect(() => {
        if (project && user && user.currentRole === UserRole.JUDGE && user.school && project.school && user.school === project.school) {
            setConflictError("You cannot judge this project due to a conflict of interest because it is from your own school. This assignment has been flagged for coordinator review.");
        } else {
            setConflictError(null);
        }
    }, [project, user]);
    
    // Effect for initializing form state from session storage
    useEffect(() => {
        if (conflictError) return; // Don't load saved data if there's a conflict
        const savedStateJSON = sessionStorage.getItem(sessionKey);
        if (savedStateJSON) {
            const savedState = JSON.parse(savedStateJSON);
            setScores(savedState.scores || {});
            setComments(savedState.comments || '');
            setRecommendations(savedState.recommendations || '');
        } else if (section) {
            const initialScores = section.(criteria ?? []).reduce((acc, criterion) => {
                acc[criterion.id] = ''; // Start as empty string (blank)
                return acc;
            }, {} as { [key: number]: string });
            setScores(initialScores);
        }
    }, [sessionKey, section, conflictError]);

    // Effect for persisting state to session storage on any change
    useEffect(() => {
        if (section && !conflictError) {
             sessionStorage.setItem(sessionKey, JSON.stringify({ scores, comments, recommendations }));
        }
    }, [scores, comments, recommendations, sessionKey, section, conflictError]);

    // Effect to set status to IN_PROGRESS. Uses a ref to run only once per assignment.
    const statusUpdateRef = useRef<string | null>(null);
    useEffect(() => {
        if (conflictError) return;
        if (assignment && section && statusUpdateRef.current !== assignment.projectId) {
            if (assignment.status === ProjectStatus.NOT_STARTED) {
                updateAssignment({ ...assignment, status: ProjectStatus.IN_PROGRESS });
            }
            startJudging(assignment.projectId, section.id);
            statusUpdateRef.current = assignment.projectId;
        }
    }, [assignment, section, updateAssignment, startJudging, conflictError]);
    
    const handleScoreUpdate = (criterionId: number, stringValue: string) => {
        setScores(prev => ({ ...prev, [criterionId]: stringValue }));
        setGeneralError('');
        if (errors[criterionId]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[criterionId];
                return newErrors;
            });
        }
    };

    const handleScoreValidation = (criterionId: number, stringValue: string, max: number, step: number) => {
        if (stringValue.trim() === '') {
            setScores(prev => ({ ...prev, [criterionId]: '' }));
            return;
        }
        const numValue = parseFloat(stringValue);
        if (isNaN(numValue)) {
            setScores(prev => ({ ...prev, [criterionId]: '' }));
            return;
        }
        
        let validatedValue = Math.max(0, Math.min(numValue, max));
        validatedValue = parseFloat((Math.round(validatedValue / step) * step).toFixed(2));
        setScores(prev => ({ ...prev, [criterionId]: validatedValue }));
    };
    
    const isFormComplete = useMemo(() => {
        if (!section) return false;
        
        const allScoresEntered = section.criteria.every(
            (criterion) => {
                const score = scores[criterion.id];
                return score !== '' && score !== undefined && score !== null && !isNaN(parseFloat(String(score)));
            }
        );
        const commentsEntered = comments.trim() !== '';
        const recommendationsEntered = recommendations.trim() !== '';
        
        return allScoresEntered && commentsEntered && recommendationsEntered;
    }, [scores, comments, recommendations, section]);

    const handleSubmit = async () => {
        if (!assignment || !section) return;

        const newErrors: { [key: number]: string } = {};
        let finalTotalScore = 0;
        const scoreBreakdown: { [key: number]: number } = {};

        for (const criterion of section.criteria) {
            const scoreValue = scores[criterion.id];
            if (scoreValue === '' || scoreValue === null || scoreValue === undefined) {
                newErrors[criterion.id] = 'This field is required.';
                continue;
            }
            const numericScore = parseFloat(String(scoreValue));
            if (isNaN(numericScore)) {
                newErrors[criterion.id] = 'Please enter a valid number.';
                continue;
            }
            const validatedScore = validateScore(numericScore, criterion.maxScore, criterion.step || 0.5);
            finalTotalScore += validatedScore;
            scoreBreakdown[criterion.id] = validatedScore;
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            setGeneralError('Please fix the errors highlighted below before submitting.');
            const firstErrorId = Object.keys(newErrors)[0];
            document.querySelector(`input[data-criterion-id='${firstErrorId}']`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        if (comments.trim() === '' || recommendations.trim() === '') {
            setGeneralError('Please fill in the Comments and Recommendations sections.');
            return;
        }
        
        setErrors({});
        setGeneralError('');
        setIsSubmitting(true);

        const completedAssignment: JudgeAssignment = { 
            ...assignment, 
            status: ProjectStatus.COMPLETED, 
            score: finalTotalScore,
            comments: comments,
            recommendations: recommendations,
            scoreBreakdown: scoreBreakdown,
        };
        
        const success = await submitAssignmentScore(completedAssignment);
        
        if (success) {
            setActiveJudgingInfo(null);
            sessionStorage.removeItem(sessionKey);
            sessionStorage.removeItem('activeJudgingInfo');
            navigate('/dashboard');
        } else {
            // Error is shown by context, just stop loading spinner
            setIsSubmitting(false);
        }
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>, currentCriterionId: number) => {
        const isTabForward = event.key === 'Tab' && !event.shiftKey;
        const isTabBackward = event.key === 'Tab' && event.shiftKey;

        if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp' && !isTabForward && !isTabBackward) return;

        event.preventDefault();

        const currentIndex = orderedCriteriaIds.indexOf(currentCriterionId);
        let nextIndex;

        if (event.key === 'ArrowUp' || isTabBackward) {
            nextIndex = (currentIndex - 1 + orderedCriteriaIds.length) % orderedCriteriaIds.length;
        } else { // ArrowDown or TabForward
            nextIndex = (currentIndex + 1) % orderedCriteriaIds.length;
        }

        const nextCriterionId = orderedCriteriaIds[nextIndex];
        const nextInput = document.querySelector(`input[data-criterion-id='${nextCriterionId}']`) as HTMLInputElement;
        if (nextInput) {
            nextInput.focus();
            nextInput.select();
        }
    };

    const scoredCriteriaCount = useMemo(() => {
        return Object.values(scores).filter(score => score !== '' && score !== null && score !== undefined).length;
    }, [scores]);

    const progressPercentage = section ? (scoredCriteriaCount / section.criteria.length) * 100 : 0;

    if (conflictError) {
        return (
            <Card className="bg-red-100 dark:bg-red-900/40 border border-red-400 text-center p-8">
                <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-red-800 dark:text-red-300">Conflict of Interest Detected</h2>
                <p className="text-red-700 dark:text-red-400 mt-2">{conflictError}</p>
                <Button onClick={() => navigate('/dashboard')} className="mt-6">Back to Dashboard</Button>
            </Card>
        );
    }

    if (!project || !assignment || !section) {
        return <Card><p>Loading judging assignment...</p></Card>;
    }
    
    const reviewScoresData = (otherJudgeAssignments ?? []).map(a => {
            // FIX: Replaced `USERS.find` with `users.find` to use live data from context.
            const judge = users.find(u => u.id === a.judgeId);
            return { judgeName: judge?.name || 'Unknown', score: a.score }
        });

    let lastRenderedSection: string | undefined = undefined;

    return (
        <div className="space-y-6">
            <Card className="sticky top-0 z-20">
                 <div className="flex flex-wrap justify-between items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-text-light dark:text-text-dark">{project.title}</h1>
                        <p className="text-sm text-text-muted-light dark:text-text-muted-dark">{project.category} | {project.school}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 p-2 bg-secondary/10 rounded-md text-secondary dark:text-accent-green" title="Active Session Duration">
                            <Clock className="w-5 h-5" />
                            <span className="font-mono font-semibold text-lg">{formatTime(elapsedTime)}</span>
                        </div>
                        <Button variant="ghost" onClick={() => navigate(-1)} className="flex items-center gap-2">
                            <ArrowLeft className="w-4 h-4" /> Back
                        </Button>
                        <Button 
                            onClick={handleSubmit} 
                            disabled={!isFormComplete || isSubmitting}
                            title={isFormComplete ? 'Submit your final marks' : 'Please fill in all scores and feedback sections to submit'}
                            className="flex items-center gap-2"
                        >
                            {isSubmitting ? 'Submitting...' : <><Check className="w-4 h-4" /> Submit Final Scores</>}
                        </Button>
                    </div>
                </div>
                 {generalError && (
                    <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/40 border border-red-400 rounded-md text-red-700 dark:text-red-300 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5" />
                        <p>{generalError}</p>
                    </div>
                 )}
                <div className="mt-4">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-text-muted-light dark:text-text-muted-dark">Progress</span>
                        <span className="text-sm font-bold text-primary">{scoredCriteriaCount} / {section.criteria.length} Scored</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                        <div className="bg-primary h-2.5 rounded-full transition-all duration-500" style={{ width: `${progressPercentage}%` }}></div>
                    </div>
                </div>
            </Card>

            {isReviewMode && (
                <Card className="bg-yellow-100 dark:bg-yellow-900/40 border border-yellow-400">
                    <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-300">Coordinator Review Mode</h3>
                    <p className="text-yellow-700 dark:text-yellow-400 text-sm">You are viewing this project because of a high score variance. The original judges' total scores are shown for reference. Your score will act as the definitive one.</p>
                </Card>
            )}

            <Card>
                <div className="bg-primary/10 p-4 rounded-lg mb-4">
                    <h2 className="text-xl font-bold text-secondary dark:text-accent-green">{section.title}</h2>
                    <p className="text-sm text-text-muted-light dark:text-text-muted-dark mt-1">
                        Assigned Section: <strong>{assignment.assignedSection}</strong>
                    </p>
                </div>
                
                <div className="space-y-3">
                    {section.(criteria ?? []).map(criterion => {
                        const currentSection = criterion.originalSection;
                        const showHeader = currentSection && currentSection !== lastRenderedSection;
                        if(showHeader) {
                            lastRenderedSection = currentSection;
                        }
                        
                        const subSectionInfo = (section.subSectionDetails && currentSection) ? section.subSectionDetails[currentSection] : null;

                        return (
                            <React.Fragment key={criterion.id}>
                                {showHeader && subSectionInfo && (
                                    <div className="pt-6 mt-6 border-t-2 border-primary/50">
                                        <h3 className="text-xl font-bold text-secondary dark:text-accent-green">{subSectionInfo.title}</h3>
                                        <p className="text-sm text-text-muted-light dark:text-text-muted-dark mt-1">{subSectionInfo.description}</p>
                                    </div>
                                )}
                                <CriterionInput
                                    criterion={criterion}
                                    value={scores[criterion.id] ?? ''}
                                    reviewScores={isReviewMode ? reviewScoresData : undefined}
                                    error={errors[criterion.id]}
                                    onUpdate={handleScoreUpdate}
                                    onValidate={handleScoreValidation}
                                    onKeyDown={handleKeyDown}
                                />
                            </React.Fragment>
                        )
                    })}
                </div>
            </Card>

            <Card>
                 <h3 className="text-xl font-bold text-secondary dark:text-accent-green mb-4">Feedback & Recommendations</h3>
                 <div className="space-y-4">
                    <div>
                        <label htmlFor="comments" className="block mb-1 font-medium text-text-light dark:text-text-dark">General Comments <span className="text-red-500">*</span></label>
                        <textarea
                            id="comments"
                            rows={4}
                            value={comments}
                            onChange={(e) => { setComments(e.target.value); setGeneralError(''); }}
                            className="w-full p-2 rounded-md bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark border border-gray-300 dark:border-gray-600 focus:border-primary focus:ring-primary"
                            placeholder="Provide overall feedback on the project's strengths and weaknesses..."
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="recommendations" className="block mb-1 font-medium text-text-light dark:text-text-dark">Recommendations for Improvement <span className="text-red-500">*</span></label>
                        <textarea
                            id="recommendations"
                            rows={4}
                            value={recommendations}
                            onChange={(e) => { setRecommendations(e.target.value); setGeneralError(''); }}
                            className="w-full p-2 rounded-md bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark border border-gray-300 dark:border-gray-600 focus:border-primary focus:ring-primary"
                            placeholder="Suggest specific ways the students could improve or extend their research..."
                            required
                        />
                    </div>
                 </div>
            </Card>

            <InfoModal
                isOpen={showInactivityModal}
                onClose={handleContinueJudging}
                title="Are you still there?"
            >
                <div className="text-center">
                    <p className="text-text-muted-light dark:text-text-muted-dark mb-4">
                        Your judging session has been inactive. Please confirm you're still working to avoid losing progress.
                    </p>
                    <Button onClick={handleContinueJudging}>
                        Continue Judging
                    </Button>
                </div>
            </InfoModal>
        </div>
    );
};

export default JudgingForm;