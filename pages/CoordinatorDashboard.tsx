
import React, { useContext, useMemo, useState, ReactNode } from 'react';
import { AppContext } from '../context/AppContext';
// FIX: Replaced namespace import for react-router-dom with a named import to resolve module export errors.
import { useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Project, UserRole, ProjectStatus, User } from '../types';
import { AlertTriangle, User as UserIcon, ShieldAlert, Scale, Info, X } from 'lucide-react';
import DashboardCard from '../components/DashboardCard';

const CoordinatorDashboard: React.FC = () => {
    const { user, users, projects, assignments, submissionDeadline } = useContext(AppContext);
    // FIX: Replaced ReactRouterDOM.useNavigate with useNavigate from named import.
    const navigate = useNavigate();

    const [isDeadlineNotificationVisible, setDeadlineNotificationVisible] = useState(true);

    const arbitrationTasks = useMemo(() => {
        if (!user || !user.coordinatedCategory) return [];
    
        const userMap = new Map((users ?? []).map(u => [u.id, u]));
    
        const tasks: { project: Project; reason: string; section: 'Part A' | 'Part B & C'; icon: React.ReactNode }[] = [];
    
        const relevantProjects = (projects ?? []).filter(p => p.category === user.coordinatedCategory);
    
        for (const project of relevantProjects) {
            const projectAssignments = (assignments ?? []).filter(a => a.projectId === project.id);
    
            // Check for Conflict of Interest
            for (const assignment of projectAssignments) {
                // FIX: Cast map lookup to User to resolve type inference error.
                const judge = userMap.get(assignment.judgeId) as User | undefined;
                if (judge && judge.school && project.school && judge.school === project.school) {
                    const hasCoordinatorJudged = projectAssignments.some(a => 
                        a.judgeId === user.id && 
                        a.assignedSection === assignment.assignedSection && 
                        a.status === ProjectStatus.COMPLETED
                    );
                    if (!hasCoordinatorJudged) {
                        tasks.push({ 
                            project, 
                            // FIX: Correctly access property on typed object.
                            reason: `Conflict of Interest: ${judge.name}`, 
                            section: assignment.assignedSection,
                            icon: <ShieldAlert className="w-5 h-5 text-orange-500" />
                        });
                    }
                }
            }
    
            // Check for Mark Variance
            for (const section of ['Part A', 'Part B & C'] as const) {
                const sectionAssignments = (projectAssignments ?? []).filter(a => a.assignedSection === section && a.status === ProjectStatus.COMPLETED);
                // FIX: Cast map lookup to User to resolve type inference error.
                const regularJudges = (sectionAssignments ?? []).filter(a => (userMap.get(a.judgeId) as User | undefined)?.currentRole !== UserRole.COORDINATOR);
                
                if (regularJudges.length >= 2) {
                    if (Math.abs(regularJudges[0].score! - regularJudges[1].score!) > 5) {
                        // FIX: Cast map lookup to User to resolve type inference error.
                        const hasCoordinatorJudged = sectionAssignments.some(a => (userMap.get(a.judgeId) as User | undefined)?.currentRole === UserRole.COORDINATOR);
                        if (!hasCoordinatorJudged) {
                            tasks.push({ 
                                project, 
                                reason: `Mark Variance (>5 points)`, 
                                section,
                                icon: <Scale className="w-5 h-5 text-red-500" />
                            });
                        }
                    }
                }
            }
        }
        
        return Array.from(new Map((tasks ?? []).map(t => [`${t.project.id}-${t.section}`, t])).values());
    
    }, [projects, assignments, users, user]);

    const stats = {
        conflict: (arbitrationTasks ?? []).filter(t => t.reason.startsWith('Conflict')).length,
        variance: (arbitrationTasks ?? []).filter(t => t.reason.startsWith('Mark')).length,
        total: arbitrationTasks.length
    };

    return (
        <div className="space-y-6">
            {submissionDeadline && isDeadlineNotificationVisible && (
                <Card className="bg-blue-100 dark:bg-blue-900/40 border border-blue-400 flex items-start gap-4 p-4 relative">
                    <Info className="w-6 h-6 text-blue-500 flex-shrink-0" />
                    <div>
                        <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-300">Upcoming Deadline</h3>
                        <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                            Please be advised that the final deadline for all judging activities is {new Date(submissionDeadline).toLocaleString()}.
                        </p>
                    </div>
                    <button onClick={() => setDeadlineNotificationVisible(false)} className="absolute top-2 right-2 p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10" aria-label="Dismiss notification">
                        <X className="w-5 h-5" />
                    </button>
                </Card>
            )}

            <div>
                <h2 className="text-2xl font-bold text-text-light dark:text-text-dark">Coordinator Arbitration Dashboard</h2>
                {user?.coordinatedCategory && (
                    <p className="text-lg text-text-muted-light dark:text-text-muted-dark">
                        Managing: <span className="font-semibold text-primary">{user.coordinatedCategory} Category</span>
                    </p>
                )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <DashboardCard title="Total Arbitration Tasks" value={stats.total.toString()} icon={<AlertTriangle />} />
                <DashboardCard title="Conflicts of Interest" value={stats.conflict.toString()} icon={<ShieldAlert />} />
                <DashboardCard title="Score Variances" value={stats.variance.toString()} icon={<Scale />} />
            </div>

            <Card>
                <h3 className="text-lg font-semibold text-text-light dark:text-text-dark mb-4">My Arbitration Tasks</h3>
                {arbitrationTasks.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="text-xs uppercase bg-gray-100 dark:bg-gray-800/50 text-text-muted-light dark:text-text-muted-dark">
                                <tr>
                                    <th className="px-4 py-3 text-left">Project Title</th>
                                    <th className="px-4 py-3 text-left">Section</th>
                                    <th className="px-4 py-3 text-left">Reason for Review</th>
                                    <th className="px-4 py-3 text-left">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(arbitrationTasks ?? []).map(task => (
                                    <tr key={`${task.project.id}-${task.section}`} className="border-b dark:border-gray-700">
                                        <td className="px-4 py-3 font-medium">{task.project.title}</td>
                                        <td className="px-4 py-3 font-semibold">{task.section}</td>
                                        <td className="px-4 py-3">
                                            <span className="flex items-center gap-2">
                                                {task.icon}
                                                {task.reason}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <Button 
                                                variant="secondary" 
                                                size="sm"
                                                onClick={() => navigate(`/judge/project/${task.project.id}?review=true&section=${encodeURIComponent(task.section)}`)}
                                            >
                                                Arbitrate Score
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-12">
                         <div className="mx-auto w-16 h-16 flex items-center justify-center bg-green-100 dark:bg-green-900/40 rounded-full text-green-500">
                            <UserIcon className="w-8 h-8"/>
                        </div>
                        <h4 className="mt-4 text-lg font-semibold text-text-light dark:text-text-dark">All Clear!</h4>
                        <p className="mt-1 text-text-muted-light dark:text-text-muted-dark">
                            There are currently no projects in your category that require arbitration.
                        </p>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default CoordinatorDashboard;
