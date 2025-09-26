
import React, { useState, useContext, useMemo } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { AppContext } from '../context/AppContext';
import { Project, ProjectStatus, UserRole } from '../types';
import { Settings, CheckCircle, Clock, Hourglass, AlertTriangle } from 'lucide-react';

const ManageProjectModal: React.FC<{ project: Project; onClose: () => void }> = ({ project, onClose }) => {
    const { users, assignments } = useContext(AppContext);
    
    const projectAssignments = (assignments ?? []).filter(a => a.projectId === project.id);
    const assignmentsA = (projectAssignments ?? []).filter(a => a.assignedSection === 'Part A');
    const assignmentsBC = (projectAssignments ?? []).filter(a => a.assignedSection === 'Part B & C');
    
    const SectionAssignments: React.FC<{title: string, assignments: typeof assignmentsA}> = ({ title, assignments }) => (
        <div className="border-t dark:border-gray-700 pt-4">
            <h4 className="font-semibold text-md text-primary">{title}</h4>
            {assignments.length > 0 ? (
                <ul className="space-y-2 mt-2">
                    {(assignments ?? []).map(a => {
                        const judge = users.find(u => u.id === a.judgeId);
                        return (
                            <li key={`${a.judgeId}-${a.assignedSection}`} className="flex justify-between items-center p-2 bg-gray-100 dark:bg-gray-800 rounded-md">
                                <div>
                                    <p className="font-medium">{judge?.name || 'Unknown Judge'}</p>
                                    <p className="text-sm text-text-muted-light dark:text-text-muted-dark"><span className="italic">{a.status}</span></p>
                                </div>
                                {a.score !== undefined && <span className="font-bold text-lg">{a.score}</span>}
                            </li>
                        );
                    })}
                </ul>
            ) : <p className="text-text-muted-light dark:text-text-muted-dark mt-1">No judges assigned to this section.</p>}
        </div>
    );

    return (
        <div className="space-y-6">
            <div>
                <h3 className="font-semibold text-lg text-secondary dark:text-accent-green">Project Details</h3>
                <p><strong>Title:</strong> {project.title}</p>
                <p><strong>School:</strong> {project.school}</p>
                <p><strong>Category:</strong> {project.category}</p>
                <p><strong>Students:</strong> {project.students.join(', ')}</p>
            </div>

            <SectionAssignments title="Part A Judges" assignments={assignmentsA} />
            <SectionAssignments title="Part B & C Judges" assignments={assignmentsBC} />

            <div className="text-right mt-6">
                <Button variant="ghost" onClick={onClose}>Close</Button>
            </div>
        </div>
    );
};


const ProjectsPage: React.FC = () => {
    const { user, projects, assignments, submissionDeadline, setSubmissionDeadline } = useContext(AppContext);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [newDeadline, setNewDeadline] = useState('');

    const {
        scopedProjects,
        scopedAssignments,
    } = useMemo(() => {
        if (!user) return { scopedProjects: [], scopedAssignments: [] };
        
        if (user.currentRole === UserRole.SUPER_ADMIN || user.currentRole === UserRole.NATIONAL_ADMIN) {
            return { scopedProjects: projects, scopedAssignments: assignments };
        }

        const filteredProjects = (projects ?? []).filter(p => {
            if (user.currentRole === UserRole.REGIONAL_ADMIN) return p.region === user.region;
            if (user.currentRole === UserRole.COUNTY_ADMIN) return p.county === user.county && p.region === user.region;
            if (user.currentRole === UserRole.SUB_COUNTY_ADMIN) return p.subCounty === user.subCounty && p.county === user.county && p.region === user.region;
            return false;
        });
        
        const projectIds = new Set((filteredProjects ?? []).map(p => p.id));
        const filteredAssignments = (assignments ?? []).filter(a => projectIds.has(a.projectId));

        return { scopedProjects: filteredProjects, scopedAssignments: filteredAssignments };
    }, [user, projects, assignments]);

    const projectsWithStatus = useMemo(() => {
        return (scopedProjects ?? []).map(project => {
            const projectAssignments = (scopedAssignments ?? []).filter(a => a.projectId === project.id);
            const completedAssignments = (projectAssignments ?? []).filter(a => a.status === ProjectStatus.COMPLETED).length;
            const percentage = projectAssignments.length > 0 ? (completedAssignments / projectAssignments.length) * 100 : 0;
            
            let status: { text: string; icon: React.ReactNode; color: string };
            
            if (percentage === 100) {
                status = { text: 'Completed', icon: <CheckCircle className="w-4 h-4" />, color: 'text-green-500' };
            } else if (percentage > 0) {
                status = { text: 'In Progress', icon: <Clock className="w-4 h-4" />, color: 'text-yellow-500' };
            } else {
                status = { text: 'Not Started', icon: <Hourglass className="w-4 h-4" />, color: 'text-blue-500' };
            }

            return {
                ...project,
                completion: percentage,
                judgingStatus: status, // FIX: Renamed from 'status'
            };
        });
    }, [scopedProjects, scopedAssignments]);
    
    const handleManageClick = (project: Project) => {
        setSelectedProject(project);
        setIsModalOpen(true);
    };

    const handleDeadlineSave = () => {
        if (newDeadline) {
            setSubmissionDeadline(newDeadline);
        }
    };
    
    return (
        <div className="space-y-6">
            <Card>
                <h1 className="text-2xl font-bold text-text-light dark:text-text-dark">Manage Projects</h1>
                <p className="text-text-muted-light dark:text-text-muted-dark mt-1">
                    View project status, judge assignments, and competition progress.
                </p>
            </Card>

            {user?.currentRole === UserRole.NATIONAL_ADMIN && (
                <Card>
                    <h2 className="text-lg font-semibold mb-2">Set Project Submission Deadline</h2>
                     <div className="flex items-center gap-4">
                        <input
                            type="datetime-local"
                            value={newDeadline}
                            onChange={(e) => setNewDeadline(e.target.value)}
                            className="p-2 rounded-md bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark border border-gray-300 dark:border-gray-600"
                        />
                        <Button onClick={handleDeadlineSave}>Save Deadline</Button>
                    </div>
                    {submissionDeadline && <p className="mt-2 text-sm text-green-600 dark:text-green-400">Current deadline is set to: {new Date(submissionDeadline).toLocaleString()}</p>}
                </Card>
            )}

            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-text-muted-light dark:text-text-muted-dark uppercase bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Title</th>
                                <th className="px-4 py-3">Category</th>
                                <th className="px-4 py-3">School</th>
                                <th className="px-4 py-3">Progress</th>
                                <th className="px-4 py-3 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(projectsWithStatus ?? []).map(project => (
                                <tr key={project.id} className="border-b dark:border-gray-700">
                                    <td className="px-4 py-3">
                                        <span className={`flex items-center gap-1 ${project.judgingStatus.color}`}> {/* FIX: Changed to judgingStatus */}
                                            {project.judgingStatus.icon} {/* FIX: Changed to judgingStatus */}
                                            {project.judgingStatus.text} {/* FIX: Changed to judgingStatus */}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 font-medium text-text-light dark:text-text-dark">{project.title}</td>
                                    <td className="px-4 py-3">{project.category}</td>
                                    <td className="px-4 py-3">{project.school}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                                <div className="bg-primary h-2 rounded-full" style={{ width: `${project.completion}%` }}></div>
                                            </div>
                                            <span className="text-xs">{project.completion.toFixed(0)}%</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <Button variant="ghost" size="sm" onClick={() => handleManageClick(project)}>
                                            <Settings className="w-4 h-4" />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {isModalOpen && selectedProject && (
                <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`Manage: ${selectedProject.title}`} size="lg">
                    <ManageProjectModal project={selectedProject} onClose={() => setIsModalOpen(false)} />
                </Modal>
            )}
        </div>
    );
};

export default ProjectsPage;
