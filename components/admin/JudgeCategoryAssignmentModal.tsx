
import React, { useState, useContext, useMemo, FormEvent, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { AppContext } from '../../context/AppContext';
import { User, Project, JudgeAssignment, UserRole } from '../../types';
import { Trash2, AlertCircle, PlusCircle, CheckCircle } from 'lucide-react';
import ConfirmationModal from '../ui/ConfirmationModal';

type Section = 'Part A' | 'Part B & C';
const SECTIONS: Section[] = ['Part A', 'Part B & C'];

// Helper to summarize a judge's assignments by category
const summarizeAssignments = (judgeId: string, assignments: JudgeAssignment[], projects: Project[]) => {
    const summary = new Map<string, Set<Section>>();
    const judgeAssignments = (assignments ?? []).filter(a => a.judgeId === judgeId);

    for (const assignment of judgeAssignments) {
        const project = projects.find(p => p.id === assignment.projectId);
        if (project) {
            if (!summary.has(project.category)) {
                summary.set(project.category, new Set());
            }
            summary.get(project.category)!.add(assignment.assignedSection);
        }
    }
    return Array.from(summary.entries()).map(([category, sections]) => ({
        category,
        sections: Array.from(sections).sort()
    }));
};

const JudgeCategoryAssignmentModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    judge: User;
}> = ({ isOpen, onClose, judge }) => {
    const { 
        projects, 
        assignments, 
        assignJudgeToCategory, 
        unassignJudgeFromCategory,
        assignCoordinatorToCategory,
        unassignCoordinatorFromCategory,
        showNotification,
    } = useContext(AppContext);

    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedSection, setSelectedSection] = useState<Section>('Part A');
    const [error, setError] = useState('');
    
    const [confirmState, setConfirmState] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    } | null>(null);

    const isCoordinator = judge.roles.includes(UserRole.COORDINATOR);

    const allCategories = useMemo(() => [...new Set((projects ?? []).map(p => p.category))].sort(), [projects]);

    const judgeCategoryAssignments = useMemo(
        () => summarizeAssignments(judge.id, assignments, projects),
        [judge.id, assignments, projects]
    );

    const coordinatorAssignedCategory = useMemo(() => {
        if (!isCoordinator) return null;
        return judgeCategoryAssignments.length > 0 ? judgeCategoryAssignments[0].category : null;
    }, [isCoordinator, judgeCategoryAssignments]);
    
    // Effect to reset state when the modal opens, preventing stale notifications
    useEffect(() => {
        if (isOpen) {
            setSelectedCategory('');
            setSelectedSection('Part A');
            setError('');
            setConfirmState(null);
        }
    }, [isOpen]);

    const handleAssign = async (e: FormEvent) => {
        e.preventDefault();
        setError('');

        if (!selectedCategory) {
            setError('Please select a category.');
            return;
        }

        if (isCoordinator) {
            if (coordinatorAssignedCategory) {
                const message = `Coordinators can only be assigned to one category. This user already manages '${coordinatorAssignedCategory}'.`;
                setError(message);
                showNotification(message, 'error');
                return;
            }
            await assignCoordinatorToCategory(judge.id, selectedCategory);
            showNotification(`Assigned ${judge.name} to coordinate '${selectedCategory}'.`, 'success');
        } else {
            // FIX: The 'assignJudgeToCategory' function is asynchronous. It must be awaited to access the 'success' and 'message' properties from the resolved result.
            const result = await assignJudgeToCategory(judge.id, selectedCategory, selectedSection);

            showNotification(result.message, result.success ? 'success' : 'error');

            if (!result.success) {
                setError(result.message);
            }
        }
        
        setSelectedCategory('');
    };
    
    const handleUnassignJudge = (category: string, section: Section) => {
        setConfirmState({
            isOpen: true,
            title: "Confirm Unassignment",
            message: `Are you sure you want to unassign ${judge.name} from ${section} for the ${category} category?`,
            onConfirm: () => {
                unassignJudgeFromCategory(judge.id, category, section);
                showNotification(`Unassigned ${judge.name} from ${section} of ${category}.`, 'success');
                setConfirmState(null);
            }
        });
    };
    
    const handleUnassignCoordinator = (category: string) => {
        setConfirmState({
            isOpen: true,
            title: "Confirm Unassignment",
            message: `Are you sure you want to unassign ${judge.name} from coordinating the ${category} category?`,
            onConfirm: () => {
                unassignCoordinatorFromCategory(judge.id, category);
                showNotification(`Unassigned ${judge.name} from coordinating ${category}.`, 'success');
                setConfirmState(null);
            }
        });
    };

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title={`Manage Assignments for ${judge.name}`} size="xl">
                <div className="space-y-6">
                    <div>
                        <h3 className="font-semibold text-lg text-secondary dark:text-accent-green mb-2">Current Assignments</h3>
                        {judgeCategoryAssignments.length > 0 ? (
                            <div className="space-y-2">
                                {isCoordinator && coordinatorAssignedCategory ? (
                                    <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg flex justify-between items-center">
                                        <div>
                                            <p className="font-bold text-text-light dark:text-text-dark">{coordinatorAssignedCategory}</p>
                                            <p className="text-sm text-text-muted-light dark:text-text-muted-dark">Coordinating all sections</p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleUnassignCoordinator(coordinatorAssignedCategory!)}
                                            className="text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/50 flex items-center gap-1"
                                        >
                                            <Trash2 className="w-4 h-4" /> Remove
                                        </Button>
                                    </div>
                                ) : (
                                    (judgeCategoryAssignments ?? []).map(({ category, sections }) => (
                                        <div key={category} className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                                            <p className="font-bold text-text-light dark:text-text-dark">{category}</p>
                                            <ul className="space-y-1 mt-2">
                                                {(sections ?? []).map(section => (
                                                    <li key={section} className="flex justify-between items-center p-2 bg-white dark:bg-gray-700 rounded-md">
                                                        <span className="font-medium text-text-light dark:text-text-dark">{section}</span>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleUnassignJudge(category, section as Section)}
                                                            className="text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/50 flex items-center gap-1"
                                                        >
                                                            <Trash2 className="w-4 h-4" /> Remove
                                                        </Button>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))
                                )}
                            </div>
                        ) : (
                            <p className="text-text-muted-light dark:text-text-muted-dark">This user has no assignments.</p>
                        )}
                    </div>

                    <form onSubmit={handleAssign} className="border-t dark:border-gray-700 pt-4 space-y-3">
                        <h3 className="font-semibold text-lg text-secondary dark:text-accent-green">Assign New Duty</h3>
                        
                        <fieldset disabled={isCoordinator && !!coordinatorAssignedCategory}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="category" className="block text-sm font-medium mb-1 text-text-light dark:text-text-dark">Category</label>
                                    <select id="category" value={selectedCategory} onChange={e => { setSelectedCategory(e.target.value); setError(''); }} className="w-full p-2 rounded-md bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark border border-gray-300 dark:border-gray-600">
                                        <option value="">Select a Category</option>
                                        {(allCategories ?? []).map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                {!isCoordinator && (
                                    <div>
                                        <label htmlFor="section" className="block text-sm font-medium mb-1 text-text-light dark:text-text-dark">Section</label>
                                        <select id="section" value={selectedSection} onChange={e => { setSelectedSection(e.target.value as Section); setError(''); }} className="w-full p-2 rounded-md bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark border border-gray-300 dark:border-gray-600">
                                            {(SECTIONS ?? []).map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                )}
                            </div>
                            {error && (
                                <div className="flex items-center gap-2 text-red-600 dark:text-red-400 p-2 bg-red-500/10 rounded-md text-sm">
                                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                    <p>{error}</p>
                                </div>
                            )}
                            {isCoordinator && coordinatorAssignedCategory && (
                                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 p-2 bg-amber-500/10 rounded-md text-sm">
                                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                    <p>A coordinator can only be assigned to one category at a time.</p>
                                </div>
                            )}
                            <Button type="submit" className="w-full flex items-center justify-center gap-2" disabled={isCoordinator && !!coordinatorAssignedCategory}>
                                <PlusCircle className="w-4 h-4" /> Assign
                            </Button>
                        </fieldset>
                    </form>

                    <div className="text-right mt-4">
                        <Button variant="ghost" onClick={onClose}>Close</Button>
                    </div>
                </div>
            </Modal>
            {confirmState?.isOpen && (
                <ConfirmationModal
                    isOpen={confirmState.isOpen}
                    onClose={() => setConfirmState(null)}
                    onConfirm={confirmState.onConfirm}
                    title={confirmState.title}
                    confirmText="Unassign"
                >
                    {confirmState.message}
                </ConfirmationModal>
            )}
        </>
    );
};

export default JudgeCategoryAssignmentModal;
