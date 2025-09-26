
import React, { useContext, useState, ReactNode, useMemo } from 'react';
// FIX: Replaced namespace import for react-router-dom with a named import to resolve module export errors.
import { useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { AppContext } from '../context/AppContext';
import { Project, ProjectStatus } from '../types';
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { CheckCircle, Clock, X, Info, AlertTriangle } from 'lucide-react';

// --- START of inlined NotificationCard component ---
// NOTE: This component is duplicated here and in CoordinatorDashboard.tsx to avoid creating new files.
interface NotificationCardProps {
    type: 'info' | 'warning';
    title: string;
    message: ReactNode;
    onDismiss: () => void;
    action?: {
        label: string;
        onClick: () => void;
    };
}

const NotificationCard: React.FC<NotificationCardProps> = ({ type, title, message, onDismiss, action }) => {
    const typeStyles = {
        info: {
            card: 'bg-blue-100 dark:bg-blue-900/40 border-blue-400',
            iconContainer: 'text-blue-500',
            title: 'text-blue-800 dark:text-blue-300',
            message: 'text-blue-700 dark:text-blue-400',
        },
        warning: {
            card: 'bg-yellow-100 dark:bg-yellow-900/40 border-yellow-400',
            iconContainer: 'text-yellow-500',
            title: 'text-yellow-800 dark:text-yellow-300',
            message: 'text-yellow-700 dark:text-yellow-400',
        },
    };

    const styles = typeStyles[type];
    const Icon = type === 'info' ? Info : AlertTriangle;

    return (
        <Card className={`${styles.card} border flex items-start gap-4 p-4 relative`}>
            <div className={`flex-shrink-0 ${styles.iconContainer}`}>
                <Icon className="w-6 h-6" />
            </div>
            <div className="flex-grow">
                <h3 className={`text-lg font-semibold ${styles.title}`}>{title}</h3>
                <p className={`text-sm ${styles.message} mt-1`}>{message}</p>
                {action && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={action.onClick}
                        className="mt-2 !px-3 !py-1 text-sm font-semibold border border-current hover:bg-black/10 dark:hover:bg-white/10"
                    >
                        {action.label}
                    </Button>
                )}
            </div>
            <button
                onClick={onDismiss}
                className="absolute top-2 right-2 p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10"
                aria-label="Dismiss notification"
            >
                <X className="w-5 h-5" />
            </button>
        </Card>
    );
};
// --- END of inlined NotificationCard component ---


const JudgeDashboard: React.FC = () => {
    const { user, projects, assignments, activeJudgingInfo, submissionDeadline } = useContext(AppContext);
    // FIX: Replaced ReactRouterDOM.useNavigate with useNavigate from named import.
    const navigate = useNavigate();
    const [isDeadlineNotificationVisible, setDeadlineNotificationVisible] = useState(true);

    const myAssignments = useMemo(() => {
        if (!user) return [];
    
        const projectMap = new Map((projects ?? []).map(p => [p.id, p]));
    
        const allAssignmentsForUser = (assignments ?? []).filter(a => a.judgeId === user.id);
    
        const nonConflictedAssignments = (allAssignmentsForUser ?? []).filter(a => {
            // FIX: Cast map lookup to Project to resolve type inference error.
            const project = projectMap.get(a.projectId) as Project | undefined;
            if (project && user.school && user.school === project.school) {
                return false; 
            }
            return true;
        });
    
        if (!user.region) {
            return nonConflictedAssignments;
        }
    
        return (nonConflictedAssignments ?? []).filter(assignment => {
            // FIX: Cast map lookup to Project to resolve type inference error.
            const project = projectMap.get(assignment.projectId) as Project | undefined;
            if (!project) return false;
    
            if (user.subCounty) {
                return project.region === user.region && project.county === user.county && project.subCounty === user.subCounty;
            }
            if (user.county) {
                return project.region === user.region && project.county === user.county;
            }
            return project.region === user.region;
        });
    
    }, [user, assignments, projects]);

    const completedCount = (myAssignments ?? []).filter(a => a.status === ProjectStatus.COMPLETED).length;
    const progress = myAssignments.length > 0 ? (completedCount / myAssignments.length) * 100 : 0;

    const pieData = [
        { name: 'Completed', value: completedCount },
        { name: 'Pending', value: myAssignments.length - completedCount }
    ];
    const COLORS = ['#00C49F', '#FFBB28'];

    const categoryChartData = useMemo(() => {
        const assignmentsByProject = (myAssignments ?? []).reduce((acc, assignment) => {
            if (!acc[assignment.projectId]) {
                acc[assignment.projectId] = [];
            }
            acc[assignment.projectId].push(assignment);
            return acc;
        }, {} as { [projectId: string]: typeof myAssignments });

        const categoryCounts: { [key: string]: number } = {};

        for (const projectId in assignmentsByProject) {
            const projectAssignments = assignmentsByProject[projectId];
            const allCompleteForProject = projectAssignments.every(a => a.status === ProjectStatus.COMPLETED);
            
            if (allCompleteForProject) {
                const project = projects.find(p => p.id === projectId);
                if (project) {
                    categoryCounts[project.category] = (categoryCounts[project.category] || 0) + 1;
                }
            }
        }
        
        return Object.entries(categoryCounts).map(([name, value]) => ({ name, value }));
    }, [myAssignments, projects]);


    return (
        <div className="space-y-6">
            {submissionDeadline && isDeadlineNotificationVisible && (
                <NotificationCard
                    type="info"
                    title="Upcoming Deadline"
                    message={`Please be advised that the final deadline for all judging activities is ${new Date(submissionDeadline).toLocaleString()}.`}
                    onDismiss={() => setDeadlineNotificationVisible(false)}
                />
            )}
            <h2 className="text-2xl font-bold text-text-light dark:text-text-dark">My Judging Assignments</h2>
            
            <Card className="sticky top-0 z-20">
                <h4 className="font-semibold mb-3">Overall Progress</h4>
                <div className="flex items-center gap-4">
                    <span className="font-bold text-2xl text-primary">{progress.toFixed(0)}%</span>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                        <div className="bg-primary h-4 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                    </div>
                    <span className="text-text-muted-light dark:text-text-muted-dark whitespace-nowrap">{completedCount} / {myAssignments.length} assignments done</span>
                </div>
            </Card>

            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-text-muted-light dark:text-text-muted-dark uppercase bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th scope="col" className="px-6 py-3">Project Title</th>
                                <th scope="col" className="px-6 py-3">Category</th>
                                <th scope="col" className="px-6 py-3">Assigned Section</th>
                                <th scope="col" className="px-6 py-3">Status</th>
                                <th scope="col" className="px-6 py-3">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(myAssignments ?? []).map(assignment => {
                                const project = projects.find(p => p.id === assignment.projectId);
                                if (!project) return null;

                                const isLocked = activeJudgingInfo && activeJudgingInfo.projectId !== assignment.projectId;

                                const renderStatus = () => {
                                    switch (assignment.status) {
                                        case ProjectStatus.COMPLETED:
                                            return <span className="flex items-center gap-1 text-green-500"><CheckCircle className="w-4 h-4"/> Completed</span>;
                                        case ProjectStatus.IN_PROGRESS:
                                            return <span className="flex items-center gap-1 text-yellow-500"><Clock className="w-4 h-4"/> In Progress</span>;
                                        default:
                                            return <span className="text-blue-500">{assignment.status}</span>;
                                    }
                                };
                                
                                return (
                                    <tr key={`${assignment.projectId}-${assignment.assignedSection}`} className="border-b dark:border-gray-700">
                                        <td className="px-6 py-4 font-medium text-text-light dark:text-text-dark">{project.title}</td>
                                        <td className="px-6 py-4">{project.category}</td>
                                        <td className="px-6 py-4">{assignment.assignedSection}</td>
                                        <td className="px-6 py-4">
                                            {renderStatus()}
                                        </td>
                                        <td className="px-6 py-4">
                                            {assignment.status !== ProjectStatus.COMPLETED ? 
                                             <Button 
                                                onClick={() => navigate(`/judge/project/${project.id}?section=${encodeURIComponent(assignment.assignedSection)}`)}
                                                disabled={isLocked}
                                                title={isLocked ? 'Please complete your active judging session first' : 'Start Judging'}
                                              >
                                                {assignment.status === ProjectStatus.IN_PROGRESS ? 'Continue Judging' : 'Start Judging'}
                                              </Button> : 
                                             <Button variant="ghost">View Marks</Button>}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>

            <h3 className="text-xl font-bold text-text-light dark:text-text-dark pt-4">Judging Statistics</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <h4 className="font-semibold mb-2">Assignments Status</h4>
                     <div className="w-full h-60">
                        <ResponsiveContainer>
                           <RechartsPieChart>
                                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#8884d8" label>
                                    {(pieData ?? []).map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{
                                        backgroundColor: 'rgba(30, 41, 59, 0.8)',
                                        borderColor: '#00A8E8',
                                        color: '#E2E8F0'
                                    }}
                                />
                                <Legend />
                            </RechartsPieChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
                <Card>
                    <h4 className="font-semibold mb-2">Completed Projects by Category</h4>
                    {categoryChartData.length > 0 ? (
                        <div className="w-full h-60">
                            <ResponsiveContainer>
                                <BarChart data={categoryChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.2)" />
                                    <XAxis dataKey="name" tick={{ fill: '#94A3B8' }} />
                                    <YAxis tick={{ fill: '#94A3B8' }} allowDecimals={false} />
                                    <Tooltip 
                                        cursor={{fill: 'rgba(128, 128, 128, 0.1)'}}
                                        contentStyle={{
                                            backgroundColor: 'rgba(30, 41, 59, 0.8)',
                                            borderColor: '#00A8E8',
                                            color: '#E2E8F0'
                                        }}
                                    />
                                    <Bar dataKey="value" fill="#00A8E8" name="Completed Projects" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="w-full h-60 flex items-center justify-center">
                            <p className="text-text-muted-light dark:text-text-muted-dark">No completed projects to show.</p>
                        </div>
                    )}
                </Card>
            </div>
             <Card>
                <h4 className="font-semibold mb-4">Help & Resources</h4>
                <div className="flex flex-col sm:flex-row gap-4">
                    <a href="#" className="text-primary hover:underline">Marking Scheme Guidelines (PDF)</a>
                    <a href="#" className="text-primary hover:underline">FAQ & Technical Support</a>
                </div>
            </Card>
        </div>
    );
};

export default JudgeDashboard;
