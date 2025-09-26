import React, { useContext, useMemo, useState } from 'react';
import { FileDown, Users, CheckCircle, AlertTriangle, FileText, BarChart, ExternalLink, Shield, UserCheck, UserCircle, Send, Clock, Edit, Trophy, ListChecks, Award } from 'lucide-react';
import DashboardCard from '../components/DashboardCard';
import Card from '../components/ui/Card';
import CategoryPieChart from '../components/charts/CategoryPieChart';
import RegionBarChart from '../components/charts/RegionBarChart';
import Button from '../components/ui/Button';
// FIX: Replaced namespace import for react-router-dom with a named import to resolve module export errors.
import { Link } from 'react-router-dom';
import { AppContext, ProjectScores } from '../context/AppContext';
import { User, UserRole, ProjectStatus, CompetitionLevel, Project, ProjectWithRank, RankedEntity, AuditLog } from '../types';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import TieBreakerModal from '../components/admin/TieBreakerModal';

const ADMIN_ROLES = [
    UserRole.SUPER_ADMIN, UserRole.NATIONAL_ADMIN, UserRole.REGIONAL_ADMIN, 
    UserRole.COUNTY_ADMIN, UserRole.SUB_COUNTY_ADMIN
];

const JUDGE_ROLES = [UserRole.JUDGE, UserRole.COORDINATOR];

const ROLE_HIERARCHY_MAP: Record<UserRole, number> = {
  [UserRole.SUPER_ADMIN]: 0,
  [UserRole.NATIONAL_ADMIN]: 1,
  [UserRole.REGIONAL_ADMIN]: 2,
  [UserRole.COUNTY_ADMIN]: 3,
  [UserRole.SUB_COUNTY_ADMIN]: 4,
  [UserRole.COORDINATOR]: 5,
  [UserRole.JUDGE]: 6,
  [UserRole.PATRON]: 7,
};

// Helper to format time since an event
const timeSince = (date: Date): string => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "mo ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m ago";
    return Math.floor(seconds) + "s ago";
};

// --- START: NEW AND MOVED COMPONENTS ---

const RecentActivityCard: React.FC<{ notifications: AuditLog[]; onRead: (logId: string) => void }> = ({ notifications, onRead }) => (
    <Card>
        <h3 className="text-lg font-semibold text-text-light dark:text-text-dark mb-4">Recent Activity</h3>
        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
            {notifications.length > 0 ? (notifications ?? []).map(log => (
                <div key={log.id} className={`p-3 rounded-lg border-l-4 ${log.isRead ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-300 dark:border-gray-600' : 'bg-blue-50 dark:bg-blue-900/40 border-primary'}`} onClick={() => !log.isRead && onRead(log.id)}>
                    <p className="text-sm font-medium">{log.action}</p>
                    <div className="flex items-center gap-2 text-xs text-text-muted-light dark:text-text-muted-dark mt-1">
                        <UserCircle size={14}/> <span>{log.performingAdminName}</span>
                        <Clock size={14}/> <span>{timeSince(new Date(log.timestamp))}</span>
                    </div>
                </div>
            )) : (
                <p className="text-center text-text-muted-light dark:text-text-muted-dark py-4">No recent activity from your managed administrators.</p>
            )}
        </div>
    </Card>
);

const LeaderboardCard: React.FC<{
    groupedProjects: { [category: string]: ProjectWithRank[] };
    relevantEntities: RankedEntity[];
    entityType: string;
}> = ({ groupedProjects, relevantEntities, entityType }) => {
    const [tab, setTab] = useState<'projects' | 'rankings'>('projects');

    return (
        <Card className="lg:col-span-2">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-text-light dark:text-text-dark">Live Leaderboard</h3>
                <div className="flex border border-gray-200 dark:border-gray-700 rounded-lg p-1">
                    <Button size="sm" variant={tab === 'projects' ? 'secondary' : 'ghost'} onClick={() => setTab('projects')} className="flex items-center gap-1"><ListChecks size={16}/> Top Projects</Button>
                    <Button size="sm" variant={tab === 'rankings' ? 'secondary' : 'ghost'} onClick={() => setTab('rankings')} className="flex items-center gap-1"><Trophy size={16}/> {entityType} Ranking</Button>
                </div>
            </div>
            <div className="overflow-y-auto max-h-96 pr-2">
                {tab === 'projects' && (
                    Object.keys(groupedProjects).length > 0 ? (
                        <div className="space-y-4">
                            {/* FIX: Cast the result of Object.entries to resolve a type inference error where 'projects' was treated as 'unknown'. This ensures the 'slice' method is recognized. */}
                            {(Object.entries(groupedProjects) as [string, ProjectWithRank[]][]).map(([category, projects]) => (
                                <div key={category}>
                                    <h4 className="font-semibold text-primary">{category}</h4>
                                    <ul className="space-y-1 mt-1">
                                        {projects.slice(0, 3).map(p => (
                                            <li key={p.id} className="flex justify-between items-center p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800/50">
                                                <div>
                                                    <p className="font-medium text-sm">{p.title}</p>
                                                    <p className="text-xs text-text-muted-light dark:text-text-muted-dark">{p.school}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-sm">{p.totalScore.toFixed(2)} pts</p>
                                                    <p className="text-xs text-text-muted-light dark:text-text-muted-dark">Rank #{p.categoryRank}</p>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10 text-text-muted-light dark:text-text-muted-dark">
                            <ListChecks className="mx-auto w-10 h-10 mb-2"/>
                            <p>No projects have been fully judged yet.</p>
                        </div>
                    )
                )}
                {tab === 'rankings' && (
                     relevantEntities.length > 0 ? (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-text-muted-light dark:text-text-muted-dark">
                                    <th className="p-2">Rank</th>
                                    <th className="p-2">{entityType}</th>
                                    <th className="p-2 text-right">Total Points</th>
                                </tr>
                            </thead>
                            <tbody>
                                {relevantEntities.slice(0, 10).map(entity => (
                                    <tr key={entity.name} className="border-t dark:border-gray-700">
                                        <td className="p-2 font-bold text-lg text-primary">{entity.rank}</td>
                                        <td className="p-2 font-medium">{entity.name}</td>
                                        <td className="p-2 text-right font-semibold">{entity.totalPoints.toFixed(0)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                         <div className="text-center py-10 text-text-muted-light dark:text-text-muted-dark">
                            <Trophy className="mx-auto w-10 h-10 mb-2"/>
                            <p>No ranking data available yet.</p>
                        </div>
                    )
                )}
            </div>
        </Card>
    );
};

// --- END: NEW AND MOVED COMPONENTS ---


const AdminDashboard: React.FC = () => {
    const { user, users, projects, assignments, calculateProjectScores, calculateRankingsAndPoints, publishResults, auditLogs, markAuditLogAsRead, updateProject, showNotification, schoolData } = useContext(AppContext);
    const [isConfirmModalOpen, setConfirmModalOpen] = useState(false);
    const [publishMessage, setPublishMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [tieBreakState, setTieBreakState] = useState<{isOpen: boolean, project: Project | null, scores: ProjectScores | null}>({ isOpen: false, project: null, scores: null });

    const myNotifications = useMemo(() => {
        if (!user) return [];
        return (auditLogs ?? []).filter(log => {
            if (log.notifiedAdminRole !== user.currentRole) return false;
            switch (user.currentRole) {
                case UserRole.REGIONAL_ADMIN:
                    return log.scope.region === user.region;
                case UserRole.COUNTY_ADMIN:
                    return log.scope.region === user.region && log.scope.county === user.county;
                case UserRole.NATIONAL_ADMIN:
                case UserRole.SUPER_ADMIN:
                    return true;
                default:
                    return false;
            }
        });
    }, [user, auditLogs]);

    const {
        scopedProjects,
        scopedAssignments,
        scopedUsers,
        projectsAtMyLevel,
        areAllProjectsJudged,
        patronsInScope,
    } = useMemo(() => {
        if (!user) {
            return { scopedProjects: [], scopedAssignments: [], scopedUsers: [], projectsAtMyLevel: [], areAllProjectsJudged: false, patronsInScope: [] };
        }

        const currentUserLevel = ROLE_HIERARCHY_MAP[user.currentRole];
        
        // --- FIX 1: Correct User Scoping for Judge/Coordinator Counts ---
        const filteredUsers = (users ?? []).filter(u => {
            if (u.id === user.id) return true;
            let userHighestRoleLevel = Math.min(...u.(roles ?? []).map(r => ROLE_HIERARCHY_MAP[r]));
            if (userHighestRoleLevel < currentUserLevel) return false;
            
            // Hide sub-county scoped judges/coordinators from higher admins
            const isSubCountyScopedJudgeOrCoordinator = u.subCounty && u.roles.some(r => [UserRole.JUDGE, UserRole.COORDINATOR].includes(r));
            if (isSubCountyScopedJudgeOrCoordinator) {
                if (user.currentRole === UserRole.SUB_COUNTY_ADMIN && user.subCounty === u.subCounty && user.county === u.county && user.region === user.region) {
                    return true;
                }
                if (user.currentRole === UserRole.SUPER_ADMIN) {
                    return true;
                }
                return false;
            }

            // Standard geographical scoping for all other users
            switch (user.currentRole) {
                case UserRole.SUPER_ADMIN:
                case UserRole.NATIONAL_ADMIN:
                    return true;
                case UserRole.REGIONAL_ADMIN:
                    return u.region === user.region;
                case UserRole.COUNTY_ADMIN:
                    return u.county === user.county && u.region === user.region;
                case UserRole.SUB_COUNTY_ADMIN:
                    return u.subCounty === user.subCounty && u.county === user.county && u.region === user.region;
                default:
                    return false;
            }
        });

        const roleToLevelMap: { [key in UserRole]?: CompetitionLevel } = {
            [UserRole.SUB_COUNTY_ADMIN]: CompetitionLevel.SUB_COUNTY,
            [UserRole.COUNTY_ADMIN]: CompetitionLevel.COUNTY,
            [UserRole.REGIONAL_ADMIN]: CompetitionLevel.REGIONAL,
            [UserRole.NATIONAL_ADMIN]: CompetitionLevel.NATIONAL,
        };
        const adminLevel = roleToLevelMap[user.currentRole];

        // --- FIX 2: Correct Project Scoping for Dashboard Cards & Views ---
        const filteredProjects = (projects ?? []).filter(p => {
            // First, filter by geographical scope
            let geoMatch = false;
            switch (user.currentRole) {
                case UserRole.SUPER_ADMIN:
                case UserRole.NATIONAL_ADMIN:
                    geoMatch = true;
                    break;
                case UserRole.REGIONAL_ADMIN:
                    geoMatch = p.region === user.region;
                    break;
                case UserRole.COUNTY_ADMIN:
                    geoMatch = p.county === user.county && p.region === user.region;
                    break;
                case UserRole.SUB_COUNTY_ADMIN:
                    geoMatch = p.subCounty === user.subCounty && p.county === user.county && p.region === user.region;
                    break;
            }
            if (!geoMatch) return false;

            // Second, filter by competition level
            // Sub-county admin sees all projects in their scope
            if (user.currentRole === UserRole.SUB_COUNTY_ADMIN) {
                return true;
            }
            // Higher admins see only non-eliminated projects AT their level
            if (adminLevel) {
                return p.currentLevel === adminLevel && !p.isEliminated;
            }
            return false;
        });

        const filteredProjectIds = new Set((filteredProjects ?? []).map(p => p.id));
        const filteredAssignments = (assignments ?? []).filter(a => filteredProjectIds.has(a.projectId));
        
        // This list is used for the "Publish" action.
        const projectsAtAdminLevel = user.currentRole === UserRole.SUB_COUNTY_ADMIN
            ? (filteredProjects ?? []).filter(p => p.currentLevel === adminLevel && !p.isEliminated)
            : filteredProjects;
        
        const allJudged = projectsAtAdminLevel.length > 0 && projectsAtAdminLevel.every(p => {
            const scores = calculateProjectScores(p.id);
            return scores.isFullyJudged && !scores.needsArbitration;
        });
        
        let filteredPatrons: User[];
        if (user.currentRole === UserRole.SUB_COUNTY_ADMIN) {
            filteredPatrons = (filteredUsers ?? []).filter(u => u.roles.includes(UserRole.PATRON));
        } else {
            const activePatronIds = new Set((projectsAtAdminLevel ?? []).map(p => p.patronId).filter(Boolean));
            filteredPatrons = (filteredUsers ?? []).filter(
                u => u.roles.includes(UserRole.PATRON) && activePatronIds.has(u.id)
            );
        }

        return { 
            scopedProjects: filteredProjects, 
            scopedAssignments: filteredAssignments,
            scopedUsers: filteredUsers,
            projectsAtMyLevel: projectsAtAdminLevel,
            areAllProjectsJudged: allJudged,
            patronsInScope: filteredPatrons,
        };
    }, [user, users, projects, assignments, calculateProjectScores]);

    const rankingData = useMemo(() => calculateRankingsAndPoints(), [calculateRankingsAndPoints]);

    const scopedRankingData = useMemo(() => {
        if (!user || !rankingData) return { groupedProjects: {}, relevantEntities: [], entityType: '' };

        const { projectsWithPoints, schoolRanking, subCountyRanking, countyRanking, regionRanking } = rankingData;

        let filteredProjects = projectsWithPoints;
        let relevantEntities: RankedEntity[] = [];
        let entityType = '';

        switch (user.currentRole) {
            case UserRole.REGIONAL_ADMIN:
                filteredProjects = (projectsWithPoints ?? []).filter(p => p.region === user.region);
                relevantEntities = countyRanking[user.region!] || [];
                entityType = 'County';
                break;
            case UserRole.COUNTY_ADMIN:
                filteredProjects = (projectsWithPoints ?? []).filter(p => p.county === user.county);
                relevantEntities = subCountyRanking[user.county!] || [];
                entityType = 'Sub-County';
                break;
            case UserRole.SUB_COUNTY_ADMIN:
                filteredProjects = (projectsWithPoints ?? []).filter(p => p.subCounty === user.subCounty);
                relevantEntities = (schoolRanking ?? []).filter(s => {
                    const schoolInfo = schoolData.find(sd => sd.school === s.name);
                    return schoolInfo?.subCounty === user.subCounty;
                });
                entityType = 'School';
                break;
            default: // National Admin
                relevantEntities = regionRanking;
                entityType = 'Region';
                break;
        }
        
        const groupedProjects = (filteredProjects ?? []).reduce((acc, p) => {
            if (!acc[p.category]) acc[p.category] = [];
            acc[p.category].push(p);
            return acc;
        }, {} as { [category: string]: ProjectWithRank[] });

        return { groupedProjects, relevantEntities, entityType };
    }, [user, rankingData, schoolData]);
    
    const tiesToResolve = useMemo(() => {
        const { projectsWithPoints } = rankingData;
        const projectsInCategory = new Map<string, (typeof projectsWithPoints)>();

        projectsWithPoints.forEach(p => {
            if (!projectsInCategory.has(p.category)) {
                projectsInCategory.set(p.category, []);
            }
            projectsInCategory.get(p.category)!.push(p);
        });

        const ties: { category: string; score: number; projects: (typeof projectsWithPoints) }[] = [];

        projectsInCategory.forEach((categoryProjects, category) => {
            const projectsByScore = new Map<number, (typeof projectsWithPoints)>();
            categoryProjects.forEach(p => {
                if (!projectsByScore.has(p.totalScore)) {
                    projectsByScore.set(p.totalScore, []);
                }
                projectsByScore.get(p.totalScore)!.push(p);
            });
            
            projectsByScore.forEach((tiedProjects, score) => {
                if (tiedProjects.length > 1) {
                    const rank = tiedProjects[0].categoryRank;
                    if (rank <= 4) {
                        ties.push({ category, score, projects: tiedProjects });
                    }
                }
            });
        });

        return ties;
    }, [rankingData]);

    const handlePublish = async () => {
        if (!user) return;
        setPublishMessage(null);
        // FIX: The 'publishResults' function is asynchronous. It must be awaited to get the result object containing 'success' and 'message' properties.
        const result = await publishResults(user);
        if (result.success) {
            setPublishMessage({ type: 'success', text: result.message });
        } else {
            setPublishMessage({ type: 'error', text: result.message });
        }
        setConfirmModalOpen(false);
    };
    
    const handleTieBreakSave = (projectToUpdate: Project, newScoreA: number) => {
        updateProject({ ...projectToUpdate, overrideScoreA: newScoreA });
        setTieBreakState({ isOpen: false, project: null, scores: null });
        showNotification(`Tie resolved for "${projectToUpdate.title}". Scores updated.`, 'success');
    };

    const userStats = useMemo(() => ({
        all: scopedUsers.length,
        admins: (scopedUsers ?? []).filter(u => u.roles.some(r => ADMIN_ROLES.includes(r))).length,
        judges: (scopedUsers ?? []).filter(u => u.roles.some(r => JUDGE_ROLES.includes(r))).length,
        patrons: patronsInScope.length,
    }), [scopedUsers, patronsInScope]);

    const totalProjects = scopedProjects.length;

    const { completionPercentage, projectsInReview } = useMemo(() => {
        const totalAssignments = (scopedAssignments ?? []).filter(a => !a.isArchived).length;
        const completedAssignments = (scopedAssignments ?? []).filter(a => a.status === ProjectStatus.COMPLETED && !a.isArchived).length;
        const percentage = totalAssignments > 0 ? Math.round((completedAssignments / totalAssignments) * 100) : 0;
        
        const reviewProjectsCount = (scopedProjects ?? []).filter(project => {
            const scores = calculateProjectScores(project.id);
            return scores.needsArbitration;
        }).length;

        return { completionPercentage: percentage, projectsInReview: reviewProjectsCount };
    }, [scopedProjects, scopedAssignments, calculateProjectScores]);

    const categoryChartData = useMemo(() => {
        const counts = (scopedProjects ?? []).reduce((acc, p) => {
            acc[p.category] = (acc[p.category] || 0) + 1;
            return acc;
        }, {} as { [key: string]: number });
        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }, [scopedProjects]);

    const regionChartData = useMemo(() => {
        if (user?.currentRole === UserRole.REGIONAL_ADMIN) {
            const counts = (scopedProjects ?? []).reduce((acc, p) => {
                acc[p.county] = (acc[p.county] || 0) + 1;
                return acc;
            }, {} as { [key: string]: number });
            return Object.entries(counts).map(([name, projectCount]) => ({ name, projects: projectCount }));
        }

        const counts = (scopedProjects ?? []).reduce((acc, p) => {
            acc[p.region] = (acc[p.region] || 0) + 1;
            return acc;
        }, {} as { [key: string]: number });
        return Object.entries(counts).map(([name, projectCount]) => ({ name, projects: projectCount }));
    }, [scopedProjects, user]);
    
    const barChartTitle = user?.currentRole === UserRole.REGIONAL_ADMIN ? 'Project Counts by County' : 'Project Counts by Region';

    const handleDownloadMarksheetsPDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text('KSEF Project Marksheets', 105, 20, { align: 'center' });
        let isFirstPage = true;

        scopedProjects.forEach(project => {
            const scores = calculateProjectScores(project.id);
            if (!scores.isFullyJudged) return;

            if (!isFirstPage) {
                doc.addPage();
            }
            isFirstPage = false;

            doc.setFontSize(14);
            doc.text(`Project: ${project.title}`, 14, 40);
            doc.setFontSize(12);
            doc.text(`Category: ${project.category} | School: ${project.school}`, 14, 48);

            const body = [
                ['Part A (Written Communication)', '30', scores.scoreA?.toFixed(2) || 'N/A'],
                ['Part B & C (Oral & Scientific)', '50', scores.scoreBC?.toFixed(2) || 'N/A'],
                [{ content: 'Total Score', styles: { fontStyle: 'bold' } }, { content: '80', styles: { fontStyle: 'bold' } }, { content: scores.totalScore.toFixed(2), styles: { fontStyle: 'bold' } }],
            ];

            (doc as any).autoTable({
                startY: 55,
                head: [['Section', 'Max Score', 'Final Score']],
                body: body,
                theme: 'grid',
                headStyles: { fillColor: [0, 52, 89] },
            });

            if (scores.needsArbitration) {
                doc.setTextColor(255, 0, 0);
                doc.setFontSize(10);
                doc.text('This project required coordinator arbitration due to high score variance.', 14, (doc as any).lastAutoTable.finalY + 10);
                doc.setTextColor(0, 0, 0);
            }
        });
        
        if (isFirstPage) {
            doc.setFontSize(12);
            doc.text('No projects have been fully judged yet.', 105, 40, { align: 'center' });
        }

        doc.save('KSEF_All_Marksheets.pdf');
    };

    const handleExportRankingsPDF = () => {
        const doc = new jsPDF();
        const { schoolRanking, regionRanking } = calculateRankingsAndPoints();

        doc.setFontSize(18);
        doc.text("KSEF School & Regional Rankings", 105, 20, { align: 'center' });

        doc.setFontSize(14);
        doc.text("School Rankings", 14, 40);

        (doc as any).autoTable({
            startY: 45,
            head: [['Rank', 'School', 'Total Points']],
            body: (schoolRanking ?? []).map(s => [s.rank, s.name, s.totalPoints.toFixed(0)]),
            theme: 'grid',
            headStyles: { fillColor: [0, 52, 89] },
        });
        
        let finalY = (doc as any).lastAutoTable.finalY + 15;

        if (finalY > 250) {
            doc.addPage();
            finalY = 20;
        }

        doc.setFontSize(14);
        doc.text("Regional Rankings", 14, finalY);

        (doc as any).autoTable({
            startY: finalY + 5,
            head: [['Rank', 'Region', 'Total Points']],
            body: (regionRanking ?? []).map(r => [r.rank, r.name, r.totalPoints.toFixed(0)]),
            theme: 'grid',
            headStyles: { fillColor: [0, 52, 89] },
        });

        doc.save('KSEF_Rankings.pdf');
    };

    const canPublish = user && [UserRole.SUB_COUNTY_ADMIN, UserRole.COUNTY_ADMIN, UserRole.REGIONAL_ADMIN].includes(user.currentRole);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* FIX: Replaced ReactRouterDOM.Link with Link from named import. */}
                <Link to="/projects">
                    <DashboardCard title="Total Projects" value={totalProjects.toString()} icon={<FileText />} />
                </Link>
                {/* FIX: Replaced ReactRouterDOM.Link with Link from named import. */}
                <Link to="/projects">
                    <DashboardCard title="Completed Judging" value={`${completionPercentage}%`} icon={<CheckCircle />} />
                </Link>
                {/* FIX: Replaced ReactRouterDOM.Link with Link from named import. */}
                <Link to="/projects">
                     <DashboardCard title="Projects in Review" value={projectsInReview.toString()} icon={<AlertTriangle />} />
                </Link>
            </div>
            
            {tiesToResolve.length > 0 && (
                <Card className="bg-amber-50 dark:bg-amber-900/30 border border-amber-400">
                    <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-300 mb-2 flex items-center gap-2">
                        <AlertTriangle /> Ties to Resolve
                    </h3>
                    <p className="text-sm text-amber-700 dark:text-amber-400 mb-4">
                        The following projects are tied for a top 4 position. Please adjust the Section A score for one or more projects to break the tie before publishing results.
                    </p>
                    <div className="space-y-3">
                        {(tiesToResolve ?? []).map(({ category, score, projects: tiedProjects }) => (
                            <div key={category + score}>
                                <h4 className="font-semibold text-text-light dark:text-text-dark">{category} - Tied at {score.toFixed(2)} pts</h4>
                                <ul className="list-disc list-inside ml-4 text-sm">
                                    {(tiedProjects ?? []).map(p => (
                                        <li key={p.id} className="flex justify-between items-center py-1">
                                            <span>{p.title} ({p.school}) - Rank #{p.categoryRank}</span>
                                            <Button size="sm" variant="secondary" onClick={() => {
                                                const projectScores = calculateProjectScores(p.id);
                                                setTieBreakState({ isOpen: true, project: p, scores: projectScores });
                                            }} className="flex items-center gap-1"><Edit size={14}/> Resolve</Button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {canPublish && (
                <Card>
                    <h3 className="text-lg font-semibold text-text-light dark:text-text-dark mb-2">Publish & Promote Projects</h3>
                    <p className="text-sm text-text-muted-light dark:text-text-muted-dark mb-4">
                        Once all {projectsAtMyLevel.length} projects at your level are fully judged and all ties are resolved, you can publish the results. This will automatically promote the top 4 projects from each category to the next level. This action is irreversible for the current competition level.
                    </p>
                    {publishMessage && (
                        <div className={`p-3 rounded-md mb-4 text-sm flex items-center gap-2 ${publishMessage.type === 'success' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'}`}>
                           {publishMessage.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                           {publishMessage.text}
                        </div>
                    )}
                    <Button 
                        onClick={() => setConfirmModalOpen(true)}
                        disabled={!areAllProjectsJudged || tiesToResolve.length > 0}
                        title={!areAllProjectsJudged ? "All projects must be fully judged before publishing" : (tiesToResolve.length > 0 ? "You must resolve all ties before publishing" : "Publish results and promote top projects")}
                        className="w-full sm:w-auto flex items-center gap-2"
                    >
                        <Send className="w-4 h-4"/> Publish {user?.currentRole.replace(' Admin', '')} Results
                    </Button>
                </Card>
            )}

            <Card>
                <h3 className="text-lg font-semibold text-text-light dark:text-text-dark mb-4">User Statistics</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* FIX: Replaced ReactRouterDOM.Link with Link from named import. */}
                    <Link to="/users?filter=ALL">
                        <DashboardCard title="All Users" value={userStats.all.toString()} icon={<Users />} />
                    </Link>
                    {/* FIX: Replaced ReactRouterDOM.Link with Link from named import. */}
                    <Link to="/users?filter=ADMINS">
                        <DashboardCard title="Administrators" value={userStats.admins.toString()} icon={<Shield />} />
                    </Link>
                    {/* FIX: Replaced ReactRouterDOM.Link with Link from named import. */}
                    <Link to="/users?filter=JUDGES">
                        <DashboardCard title="Judges & Coordinators" value={userStats.judges.toString()} icon={<UserCheck />} />
                    </Link>
                    {/* FIX: Replaced ReactRouterDOM.Link with Link from named import. */}
                    <Link to="/users?filter=PATRONS">
                        <DashboardCard title="Patrons" value={userStats.patrons.toString()} icon={<UserCircle />} />
                    </Link>
                </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <LeaderboardCard 
                    groupedProjects={scopedRankingData.groupedProjects} 
                    relevantEntities={scopedRankingData.relevantEntities} 
                    entityType={scopedRankingData.entityType} 
                />
                <Card>
                    <h3 className="text-lg font-semibold text-text-light dark:text-text-dark mb-4">{barChartTitle}</h3>
                    <RegionBarChart data={regionChartData} />
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 <Card>
                    <h3 className="text-lg font-semibold text-text-light dark:text-text-dark mb-4">Projects by Category</h3>
                    <CategoryPieChart data={categoryChartData} />
                </Card>
                <Card>
                    <h3 className="text-lg font-semibold text-text-light dark:text-text-dark mb-4">Reporting & Exports</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Button onClick={handleDownloadMarksheetsPDF} variant="secondary" className="flex items-center justify-center gap-2"><FileDown /> Download Marksheets (PDF)</Button>
                        {/* FIX: Replaced ReactRouterDOM.Link with Link from named import. */}
                        <Link to="/reporting">
                             <Button variant="secondary" className="w-full flex items-center justify-center gap-2"><FileText /> Generate Broadsheets (PDF)</Button>
                        </Link>
                        <Button onClick={handleExportRankingsPDF} variant="secondary" className="w-full flex items-center justify-center gap-2"><BarChart /> Export School Rankings (PDF)</Button>
                    </div>
                </Card>
                 <RecentActivityCard notifications={myNotifications} onRead={markAuditLogAsRead} />
            </div>
            
             {isConfirmModalOpen && (
                <ConfirmationModal
                    isOpen={isConfirmModalOpen}
                    onClose={() => setConfirmModalOpen(false)}
                    onConfirm={handlePublish}
                    title="Confirm Publication"
                    confirmText="Yes, Publish"
                >
                    Are you sure you want to publish the results? This will finalize scores and promote qualifying projects to the next level. This action cannot be undone for this level.
                </ConfirmationModal>
            )}

            {tieBreakState.isOpen && tieBreakState.project && tieBreakState.scores && (
                <TieBreakerModal
                    isOpen={tieBreakState.isOpen}
                    onClose={() => setTieBreakState({ isOpen: false, project: null, scores: null })}
                    project={tieBreakState.project}
                    scores={tieBreakState.scores}
                    onSave={handleTieBreakSave}
                />
            )}
        </div>
    );
};

export default AdminDashboard;