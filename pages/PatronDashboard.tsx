import React, { useContext, useState, useMemo, useEffect } from 'react';
// FIX: Replaced namespace import for react-router-dom with a named import to resolve module export errors.
import { useNavigate } from 'react-router-dom';
import { Plus, Download, BarChart2, Edit, Trash2, Clock, Eye, Hourglass, FilterX, AlertTriangle, Trophy, School, FileText, Award } from 'lucide-react';
import { AppContext, ProjectScores } from '../context/AppContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import DashboardCard from '../components/DashboardCard';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, ReferenceLine } from 'recharts';
import { Project, CompetitionLevel, JudgingDetails, CategoryStats, JudgingCriterion, ProjectStatus } from '../types';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import { SCORE_SHEET } from '../constants';

const criteriaMap = new Map<number, JudgingCriterion>();
SCORE_SHEET.forEach(section => {
    section.criteria.forEach(criterion => {
        criteriaMap.set(criterion.id, criterion);
    });
});

const ScoreBreakdownTable: React.FC<{ breakdown: { [key: number]: number } }> = ({ breakdown }) => {
    return (
        <div className="overflow-x-auto mt-2 border dark:border-gray-700 rounded-lg">
            <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                        <th className="px-3 py-2 text-left font-medium text-text-muted-light dark:text-text-muted-dark">Criterion</th>
                        <th className="px-3 py-2 text-center font-medium text-text-muted-light dark:text-text-muted-dark">Score</th>
                    </tr>
                </thead>
                <tbody>
                    {Object.entries(breakdown).map(([criterionId, score]) => {
                        const criterion = criteriaMap.get(Number(criterionId));
                        if (!criterion) return null;
                        return (
                            <tr key={criterionId} className="border-t dark:border-gray-700">
                                <td className="px-3 py-2">
                                    <p className="text-text-light dark:text-text-dark">{criterion.text}</p>
                                    <p className="text-xs text-text-muted-light dark:text-text-muted-dark">{criterion.details}</p>
                                </td>
                                <td className="px-3 py-2 text-center font-semibold text-primary">{score} / {criterion.maxScore}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

const ProjectDetailsModal: React.FC<{ 
    isOpen: boolean;
    onClose: () => void;
    details: {
        project: Project | null;
        scores: ProjectScores | null;
        details: JudgingDetails[];
        stats: CategoryStats | null;
    }
}> = ({ isOpen, onClose, details }) => {
    const { project, scores, details: judgingDetails, stats } = details;

    if (!isOpen || !project || !scores) return null;

    const handleDownloadSingleScoresheet = () => {
        const doc = new jsPDF();
        let finalY = 28;
        doc.setFontSize(18);
        doc.text(`KSEF Scoresheet: ${project.title}`, 105, 20, { align: 'center' });
        doc.setFontSize(12);
        doc.text(`Category: ${project.category} | School: ${project.school}`, 105, finalY, { align: 'center' });
        finalY += 12;

        // Final Scores
        (doc as any).autoTable({
            startY: finalY,
            head: [['Section', 'Max Score', 'Final Score']],
            body: [
                ['Part A (Written)', '30', scores.scoreA?.toFixed(2) || 'N/A'],
                ['Part B & C (Oral)', '50', scores.scoreBC?.toFixed(2) || 'N/A'],
                [{ content: 'Total Score', styles: { fontStyle: 'bold' } }, { content: '80', styles: { fontStyle: 'bold' } }, { content: scores.totalScore.toFixed(2), styles: { fontStyle: 'bold' } }]
            ],
            theme: 'grid',
        });
        finalY = (doc as any).lastAutoTable.finalY + 10;
        
        doc.setFontSize(14);
        doc.text("Judges' Detailed Feedback", 14, finalY);
        finalY += 5;

        judgingDetails.forEach(detail => {
            if (finalY > 250) { doc.addPage(); finalY = 20; }
            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.text(`Feedback from: ${detail.judgeName} (${detail.assignedSection})`, 14, finalY);
            doc.setFont(undefined, 'normal');
            finalY += 6;

            if (detail.scoreBreakdown) {
                const breakdownBody = Object.entries(detail.scoreBreakdown).map(([id, score]) => {
                    const criterion = criteriaMap.get(Number(id));
                    return [
                        { content: criterion?.text || `Criterion ${id}` },
                        { content: `${score} / ${criterion?.maxScore}` }
                    ];
                });

                (doc as any).autoTable({
                    startY: finalY,
                    head: [['Criterion', 'Score']],
                    body: breakdownBody,
                    theme: 'grid',
                    headStyles: {fillColor: [240, 240, 240], textColor: 40},
                    columnStyles: { 1: { halign: 'center' } }
                });
                finalY = (doc as any).lastAutoTable.finalY + 5;
            }

            doc.setFontSize(10);
            doc.setFont(undefined, 'bold');
            doc.text(`Total Score:`, 14, finalY);
            doc.setFont(undefined, 'normal');
            doc.text(`${detail.score?.toFixed(2) || 'N/A'}`, 50, finalY);
            finalY += 6;
            
            doc.setFont(undefined, 'bold');
            doc.text(`Comments:`, 14, finalY);
            doc.setFont(undefined, 'normal');
            const splitComments = doc.splitTextToSize(detail.comments || 'No comment provided.', 180);
            doc.text(splitComments, 14, finalY + 4);
            finalY += (splitComments.length * 4) + 5;

            if (finalY > 250) { doc.addPage(); finalY = 20; }

            doc.setFont(undefined, 'bold');
            doc.text(`Recommendations:`, 14, finalY);
            doc.setFont(undefined, 'normal');
            const splitRecommendations = doc.splitTextToSize(detail.recommendations || 'No recommendation provided.', 180);
            doc.text(splitRecommendations, 14, finalY + 4);
            finalY += (splitRecommendations.length * 4) + 10;
        });


        doc.save(`${project.title}_Scoresheet.pdf`);
    };

    const CategoryPerformanceChart = () => {
        if (!stats) return null;
        const data = [
            { name: project.category, 'Your Score': scores.totalScore, 'Category Average': stats.average },
        ];
        return (
            <ResponsiveContainer width="100%" height={100}>
                <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <XAxis type="number" domain={[Math.floor(stats.min / 10) * 10, Math.ceil(stats.max / 10) * 10]} hide />
                    <YAxis type="category" dataKey="name" hide />
                    <Tooltip contentStyle={{ backgroundColor: 'rgba(30, 41, 59, 0.8)', borderColor: '#00A8E8', color: '#E2E8F0' }} />
                    <Bar dataKey="Your Score" fill="#00A8E8" barSize={20} />
                    <ReferenceLine x={stats.average} stroke="#FFBB28" strokeDasharray="3 3" />
                </BarChart>
            </ResponsiveContainer>
        );
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-card-light dark:bg-card-dark rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold text-secondary dark:text-accent-green mb-2">Project Details: {project.title}</h3>
                <p className="text-sm text-text-muted-light dark:text-text-muted-dark mb-4">{project.category} | {project.school}</p>
                
                <div className="overflow-y-auto pr-2 space-y-4">
                    <Card>
                        <h4 className="font-semibold mb-2 text-text-light dark:text-text-dark">Final Score</h4>
                        <div className="font-bold text-3xl text-right text-primary">{scores.totalScore.toFixed(2)} / 80</div>
                    </Card>

                    {stats && (
                        <Card>
                            <h4 className="font-semibold mb-2 text-text-light dark:text-text-dark">Performance in Category ({stats.count} projects)</h4>
                            {CategoryPerformanceChart()}
                            <div className="flex justify-between text-xs text-text-muted-light dark:text-text-muted-dark px-2">
                                <span>Lowest: {stats.min.toFixed(2)}</span>
                                <span className="font-bold text-yellow-500">Avg: {stats.average.toFixed(2)}</span>
                                <span>Highest: {stats.max.toFixed(2)}</span>
                            </div>
                        </Card>
                    )}

                    <Card>
                         <h4 className="font-semibold mb-2 text-text-light dark:text-text-dark">Judges' Feedback</h4>
                         <div className="space-y-4">
                            {judgingDetails.length > 0 ? (judgingDetails ?? []).map((detail, index) => (
                                <div key={index} className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                                    <div className="flex justify-between items-baseline font-bold text-lg">
                                        <span className="text-text-light dark:text-text-dark">{detail.judgeName} ({detail.assignedSection})</span>
                                        <span className="text-text-light dark:text-text-dark">{detail.score?.toFixed(2) || 'N/A'}</span>
                                    </div>
                                    
                                    {detail.scoreBreakdown && <ScoreBreakdownTable breakdown={detail.scoreBreakdown} />}
                                    
                                    <div className="mt-3">
                                        <h5 className="font-semibold text-sm text-text-light dark:text-text-dark">Comments:</h5>
                                        <p className="text-sm mt-1 text-text-light dark:text-text-dark italic bg-white dark:bg-gray-700/50 p-2 rounded-md">"{detail.comments || 'No comment provided.'}"</p>
                                    </div>
                                    <div className="mt-2">
                                        <h5 className="font-semibold text-sm text-text-light dark:text-text-dark">Recommendations:</h5>
                                        <p className="text-sm mt-1 text-text-light dark:text-text-dark italic bg-white dark:bg-gray-700/50 p-2 rounded-md">"{detail.recommendations || 'No recommendation provided.'}"</p>
                                    </div>
                                </div>
                            )) : <p className="text-text-muted-light dark:text-text-muted-dark">No detailed feedback available yet.</p>}
                         </div>
                    </Card>

                </div>
                
                <div className="flex justify-end gap-3 mt-6 pt-4 border-t dark:border-gray-700">
                    <Button variant="ghost" onClick={onClose}>Close</Button>
                    <Button onClick={handleDownloadSingleScoresheet} className="flex items-center gap-2"><Download/> Download Scoresheet</Button>
                </div>
            </div>
        </div>
    );
};


const PatronDashboard: React.FC = () => {
    const { user, projects, assignments, deleteProject, submissionDeadline, calculateProjectScores, calculateRankingsAndPoints, getProjectJudgingDetails, getCategoryStats } = useContext(AppContext);
    // FIX: Replaced ReactRouterDOM.useNavigate with useNavigate from named import.
    const navigate = useNavigate();

    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [viewingProjectDetails, setViewingProjectDetails] = useState<{
        project: Project | null;
        scores: ProjectScores | null;
        details: JudgingDetails[];
        stats: CategoryStats | null;
    }>({ project: null, scores: null, details: [], stats: null });

    const [confirmModalState, setConfirmModalState] = useState<{
        isOpen: boolean;
        projectToDelete: Project | null;
    }>({ isOpen: false, projectToDelete: null });
    
    const [activeFilter, setActiveFilter] = useState<'ALL' | 'QUALIFIED' | 'ACTIVE' | 'ELIMINATED'>('ALL');

    const isDeadlinePassed = useMemo(() => submissionDeadline && new Date() > new Date(submissionDeadline), [submissionDeadline]);

    const myProjects = useMemo(() => (projects ?? []).filter(p => p.patronId === user?.id), [projects, user]);
    
    const rankingData = useMemo(() => calculateRankingsAndPoints(), [calculateRankingsAndPoints]);

    const projectStats = useMemo(() => {
        const active = (myProjects ?? []).filter(p => !p.isEliminated && p.currentLevel === CompetitionLevel.SUB_COUNTY).length;
        const qualified = (myProjects ?? []).filter(p => !p.isEliminated && p.currentLevel !== CompetitionLevel.SUB_COUNTY).length;
        const eliminated = (myProjects ?? []).filter(p => p.isEliminated).length;
        return { total: myProjects.length, active, qualified, eliminated };
    }, [myProjects]);
    
    const filteredProjects = useMemo(() => {
        switch (activeFilter) {
            case 'ACTIVE':
                return (myProjects ?? []).filter(p => !p.isEliminated && p.currentLevel === CompetitionLevel.SUB_COUNTY);
            case 'QUALIFIED':
                return (myProjects ?? []).filter(p => !p.isEliminated && p.currentLevel !== CompetitionLevel.SUB_COUNTY);
            case 'ELIMINATED':
                return (myProjects ?? []).filter(p => p.isEliminated);
            case 'ALL':
            default:
                return myProjects;
        }
    }, [myProjects, activeFilter]);
    
    const recentlyPromotedProjects = useMemo(() => {
        return (myProjects ?? []).filter(p => !p.isEliminated && p.currentLevel !== CompetitionLevel.SUB_COUNTY);
    }, [myProjects]);

    const schoolRank = useMemo(() => {
        const rankInfo = rankingData.schoolRanking.find(s => s.name === user?.school);
        if (!rankInfo) return 'N/A';
        return `#${rankInfo.rank}`;
    }, [rankingData, user]);

    const handleViewDetails = (project: Project) => {
        setViewingProjectDetails({
            project: project,
            scores: calculateProjectScores(project.id),
            details: getProjectJudgingDetails(project.id),
            stats: getCategoryStats(project.category)
        });
        setIsDetailsModalOpen(true);
    };

    const handleDeleteClick = (project: Project) => {
        setConfirmModalState({ isOpen: true, projectToDelete: project });
    };

    const handleConfirmDelete = () => {
        if (confirmModalState.projectToDelete) {
            deleteProject(confirmModalState.projectToDelete.id);
        }
        setConfirmModalState({ isOpen: false, projectToDelete: null });
    };

    const handleDownloadSchoolReport = () => {
        if (!user || !user.school) return;
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text(`KSEF Performance Report for ${user.school}`, 105, 20, { align: 'center' });
        
        const schoolRankInfo = rankingData.schoolRanking.find(s => s.name === user.school);
        doc.setFontSize(12);
        doc.text(`Overall School Rank: ${schoolRankInfo ? '#' + schoolRankInfo.rank : 'N/A'} with ${schoolRankInfo ? schoolRankInfo.totalPoints.toFixed(0) : '0'} points.`, 14, 35);
        
        const projectsWithRanks = rankingData.(projectsWithPoints ?? []).filter(p => p.school === user.school);

        if (projectsWithRanks.length > 0) {
            (doc as any).autoTable({
                startY: 45,
                head: [['Project Title', 'Category', 'Category Rank', 'Score', 'Points Earned']],
                body: (projectsWithRanks ?? []).map(p => [p.title, p.category, p.categoryRank, p.totalScore.toFixed(2), p.points]),
                theme: 'grid',
                headStyles: { fillColor: [0, 52, 89] },
            });
        } else {
             doc.text("No fully judged projects were found for this school.", 14, 45);
        }
        
        doc.save(`${user.school}_Performance_Report.pdf`);
    };
    
    const renderStatus = (project: Project) => {
        if (project.isEliminated) {
            return <span className="flex items-center gap-1.5 text-red-500 font-semibold text-xs py-1 px-2 rounded-full bg-red-100 dark:bg-red-900/30"><FilterX className="w-4 h-4"/> Eliminated at {project.currentLevel}</span>;
        }
        if (project.currentLevel !== CompetitionLevel.SUB_COUNTY) {
            return <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400 font-semibold text-xs py-1 px-2 rounded-full bg-green-100 dark:bg-green-900/30"><Trophy className="w-4 h-4"/> Qualified for {project.currentLevel} Level</span>;
        }
        return <span className="flex items-center gap-1.5 text-blue-500 font-semibold text-xs py-1 px-2 rounded-full bg-blue-100 dark:bg-blue-900/30"><Hourglass className="w-4 h-4"/> Active at {project.currentLevel}</span>;
    };

    const getCardClass = (filter: string) => {
        const base = 'cursor-pointer transition-all duration-300';
        const active = 'ring-2 ring-primary shadow-lg';
        const inactive = 'hover:ring-2 hover:ring-primary/50 hover:shadow-md';
        return `${base} ${activeFilter === filter ? active : inactive}`;
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap justify-between items-center gap-4">
                 <h2 className="text-2xl font-bold text-text-light dark:text-text-dark">Patron Dashboard</h2>
                 <Button 
                    onClick={() => navigate('/project/new')} 
                    className="flex items-center gap-2"
                    disabled={isDeadlinePassed}
                    title={isDeadlinePassed ? 'The submission deadline has passed' : 'Add a new project'}
                >
                    <Plus className="w-5 h-5" /> Add New Project
                </Button>
            </div>

            {recentlyPromotedProjects.length > 0 && (
                <Card className="bg-green-100 dark:bg-green-900/40 border border-green-400">
                    <div className="flex items-start gap-4">
                        <Trophy className="w-8 h-8 text-green-500 flex-shrink-0 mt-1" />
                        <div>
                            <h3 className="text-lg font-semibold text-green-800 dark:text-green-300">Congratulations!</h3>
                            <p className="text-green-700 dark:text-green-400">The following project(s) have qualified for the next level of the competition:</p>
                            <ul className="list-disc list-inside mt-2 text-green-700 dark:text-green-400 font-medium">
                                {(recentlyPromotedProjects ?? []).map(p => (
                                    <li key={p.id}>"{p.title}" has advanced to the {p.currentLevel} level.</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </Card>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                <DashboardCard title="Overall School Rank" value={schoolRank} icon={<Award />} />
                <DashboardCard title="Total Projects" value={projectStats.total.toString()} icon={<BarChart2 />} onClick={() => setActiveFilter('ALL')} className={getCardClass('ALL')} />
                <DashboardCard title="Projects Qualified" value={projectStats.qualified.toString()} icon={<Trophy />} onClick={() => setActiveFilter('QUALIFIED')} className={getCardClass('QUALIFIED')} />
                <DashboardCard title="Active Projects" value={projectStats.active.toString()} icon={<Clock />} onClick={() => setActiveFilter('ACTIVE')} className={getCardClass('ACTIVE')} />
                <DashboardCard title="Eliminated" value={projectStats.eliminated.toString()} icon={<FilterX />} onClick={() => setActiveFilter('ELIMINATED')} className={getCardClass('ELIMINATED')} />
            </div>
            
            <Card>
                 <h3 className="text-lg font-semibold text-text-light dark:text-text-dark mb-4">
                    My Projects ({activeFilter})
                </h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-text-muted-light dark:text-text-muted-dark uppercase bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="px-4 py-3 text-text-muted-light dark:text-text-muted-dark">Project Title</th>
                                <th className="px-4 py-3 text-text-muted-light dark:text-text-muted-dark">Category</th>
                                <th className="px-4 py-3 w-48 text-text-muted-light dark:text-text-muted-dark">Judging Progress</th>
                                <th className="px-4 py-3 text-text-muted-light dark:text-text-muted-dark">Competition Status</th>
                                <th className="px-4 py-3 text-center text-text-muted-light dark:text-text-muted-dark">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(filteredProjects ?? []).map(project => {
                                const projectAssignments = (assignments ?? []).filter(a => a.projectId === project.id);
                                const hasJudgingStarted = projectAssignments.some(a => a.status !== ProjectStatus.NOT_STARTED);
                                const isLocked = hasJudgingStarted || isDeadlinePassed;

                                const totalAssignmentsCount = projectAssignments.length;
                                const completedAssignmentsCount = (projectAssignments ?? []).filter(a => a.status === ProjectStatus.COMPLETED).length;
                                const completionPercentage = totalAssignmentsCount > 0 ? (completedAssignmentsCount / totalAssignmentsCount) * 100 : 0;
                                
                                const scores = calculateProjectScores(project.id);
                                
                                return (
                                    <tr key={project.id} className="border-b dark:border-gray-700">
                                        <td className="px-4 py-3 font-medium text-text-light dark:text-text-dark">{project.title}</td>
                                        <td className="px-4 py-3 text-text-light dark:text-text-dark">{project.category}</td>
                                        <td className="px-4 py-3 text-text-light dark:text-text-dark">
                                            <div className="flex items-center gap-2">
                                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                                                    <div className="bg-primary h-2.5 rounded-full transition-all" style={{ width: `${completionPercentage}%` }}></div>
                                                </div>
                                                <span className="text-xs font-semibold w-10 text-right">{completionPercentage.toFixed(0)}%</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            {renderStatus(project)}
                                        </td>
                                        <td className="px-4 py-3 flex items-center justify-center gap-2">
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                onClick={() => handleViewDetails(project)}
                                                disabled={!scores.isFullyJudged}
                                                title={scores.isFullyJudged ? "View final scores and feedback" : "Results are not yet available for viewing"}
                                                className="flex items-center gap-1"
                                            >
                                                <Eye className="w-4 h-4" /> View
                                            </Button>
                                            <Button variant="ghost" className="p-2" onClick={() => navigate(`/project/edit/${project.id}`)} aria-label="Edit" title={isLocked ? "Cannot edit project after judging has started" : "Edit Project"} disabled={isLocked}>
                                                <Edit className={`w-4 h-4 ${isLocked ? 'text-gray-400 dark:text-gray-500' : 'text-blue-500'}`}/>
                                            </Button>
                                            <Button variant="ghost" className="p-2" onClick={() => handleDeleteClick(project)} aria-label="Delete" title={isLocked ? "Cannot delete project after judging has started" : "Delete Project"} disabled={isLocked}>
                                                <Trash2 className={`w-4 h-4 ${isLocked ? 'text-gray-400 dark:text-gray-500' : 'text-red-500'}`}/>
                                            </Button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>
            
            <Card>
                <div className="flex flex-wrap justify-between items-center gap-4">
                    <div>
                        <h3 className="text-lg font-semibold text-text-light dark:text-text-dark">School Performance Report</h3>
                        <p className="text-text-muted-light dark:text-text-muted-dark mt-1">
                            Download a detailed PDF report of all your school's project performances and overall ranking.
                        </p>
                    </div>
                    <Button variant="secondary" onClick={handleDownloadSchoolReport} className="w-full sm:w-auto flex items-center justify-center gap-2">
                        <Download /> Download School Report
                    </Button>
                </div>
            </Card>
            
            {isDetailsModalOpen && <ProjectDetailsModal isOpen={isDetailsModalOpen} onClose={() => setIsDetailsModalOpen(false)} details={viewingProjectDetails} />}
            {confirmModalState.isOpen && confirmModalState.projectToDelete && (
                <ConfirmationModal
                    isOpen={confirmModalState.isOpen}
                    onClose={() => setConfirmModalState({ isOpen: false, projectToDelete: null })}
                    onConfirm={handleConfirmDelete}
                    title="Delete Project"
                    confirmText="Delete"
                >
                    Are you sure you want to delete the project "{confirmModalState.projectToDelete.title}"? This action cannot be undone.
                </ConfirmationModal>
            )}
        </div>
    );
};

export default PatronDashboard;