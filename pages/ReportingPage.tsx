import React, { useContext, useMemo, useState } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { AppContext } from '../context/AppContext';
import { Project, UserRole, RankedEntity, User, SchoolLocation } from '../types';
import { Download, Search } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Helper to format strings to Title Case
const toTitleCase = (str: string): string => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

type RankingType = 'school' | 'zone' | 'subCounty' | 'county' | 'region';


const ReportingPage: React.FC = () => {
    const { user, projects, users, assignments, calculateProjectScoresWithBreakdown, calculateRankingsAndPoints, schoolData, geographicalData } = useContext(AppContext);
    const [activeTab, setActiveTab] = useState('broadsheet');
    const [broadsheetCategory, setBroadsheetCategory] = useState('All');
    const [marksheetCategory, setMarksheetCategory] = useState('All');
    const [rankingType, setRankingType] = useState<RankingType>('school');
    const [rankingSearchTerm, setRankingSearchTerm] = useState('');

    const competitionTitle = useMemo(() => {
        if (!user) return "KSEF Competitions 2026";
        const year = "2026"; // As per system design
        switch(user.currentRole) {
            case UserRole.NATIONAL_ADMIN: return `National Competitions ${year}`;
            case UserRole.REGIONAL_ADMIN: return `${user.region} Regional Competitions ${year}`;
            case UserRole.COUNTY_ADMIN: return `${user.county} County Competitions ${year}`;
            case UserRole.SUB_COUNTY_ADMIN: return `${user.subCounty} Sub-County Competitions ${year}`;
            case UserRole.PATRON: return `${user.school} School Report ${year}`;
            default: return `KSEF Competitions ${year}`;
        }
    }, [user]);

    const broadsheetDataByCategory = useMemo(() => {
        let relevantProjects = projects;
        if (user?.currentRole === UserRole.PATRON) {
            const patronProjects = (projects ?? []).filter(p => p.patronId === user.id);
            const pCats = [...new Set((patronProjects ?? []).map(p => p.category))];
            const patronProjectLevels = [...new Set((patronProjects ?? []).map(p => p.currentLevel))];
            relevantProjects = (projects ?? []).filter(p => 
                pCats.includes(p.category) &&
                patronProjectLevels.includes(p.currentLevel)
            );
        } else if (user && user.currentRole !== UserRole.NATIONAL_ADMIN && user.currentRole !== UserRole.SUPER_ADMIN) {
             relevantProjects = (projects ?? []).filter(p => {
                if (user.currentRole === UserRole.REGIONAL_ADMIN) return p.region === user.region;
                if (user.currentRole === UserRole.COUNTY_ADMIN) return p.county === user.county;
                if (user.currentRole === UserRole.SUB_COUNTY_ADMIN) return p.subCounty === user.subCounty;
                return false;
            });
        }

        const groupedByCategory = (relevantProjects ?? []).reduce((acc, p) => {
            if (!acc[p.category]) acc[p.category] = [];
            acc[p.category].push(p);
            return acc;
        }, {} as Record<string, Project[]>);

        const result: Record<string, {
            team: {
                judgesA: (User | undefined)[];
                judgesBC: (User | undefined)[];
                coordinator?: User;
            };
            projects: any[];
        }> = {};

        for (const category in groupedByCategory) {
            const projectsInCategory = groupedByCategory[category];
            const projectIdsInCategory = new Set((projectsInCategory ?? []).map(p => p.id));
            const allAssignmentsForCategory = (assignments ?? []).filter(a => projectIdsInCategory.has(a.projectId) && !a.isArchived);
            
            const getJudgesForSection = (section: 'Part A' | 'Part B & C'): User[] => {
                const judgeUsers = allAssignmentsForCategory
                    .filter(a => a.assignedSection === section)
                    .map(a => users.find(u => u.id === a.judgeId && u.roles.includes(UserRole.JUDGE)))
                    .filter((u): u is User => u !== undefined);
                // FIX: Explicitly typed the Map generic to resolve incorrect type inference on its values.
                return [...new Map<string, User>((judgeUsers ?? []).map(u => [u.id, u])).values()];
            };
            
            let judgesA = getJudgesForSection('Part A');
            let judgesBC = getJudgesForSection('Part B & C');
            
            while (judgesA.length < 2) judgesA.push(undefined);
            while (judgesBC.length < 2) judgesBC.push(undefined);

            const coordinator = users.find(u => 
                allAssignmentsForCategory.some(a => a.judgeId === u.id) && u.roles.includes(UserRole.COORDINATOR)
            );

            const processedProjects = (projectsInCategory ?? []).map(p => {
                const projectAssignments = (assignments ?? []).filter(a => a.projectId === p.id && !a.isArchived);
                
                const getScores = (judgeId?: string) => {
                    if (!judgeId) return { a: undefined, b: undefined, c: undefined };
                    
                    const assignmentA = projectAssignments.find(a => a.judgeId === judgeId && a.assignedSection === 'Part A');
                    const assignmentBC = projectAssignments.find(a => a.judgeId === judgeId && a.assignedSection === 'Part B & C');
                    
                    const scoreA = assignmentA?.score;
                    let scoreB, scoreC;
                    if (assignmentBC?.score !== undefined) {
                        scoreB = (assignmentBC.score / 50) * 15;
                        scoreC = (assignmentBC.score / 50) * 35;
                    }
                    return { a: scoreA, b: scoreB, c: scoreC };
                };
                
                const scoresA = (judgesA ?? []).map(j => getScores(j?.id).a).filter((s): s is number => s !== undefined);
                const scoresB = (judgesBC ?? []).map(j => getScores(j?.id).b).filter((s): s is number => s !== undefined);
                const scoresC = (judgesBC ?? []).map(j => getScores(j?.id).c).filter((s): s is number => s !== undefined);

                const avgA = scoresA.length >= 2 ? (scoresA[0] + scoresA[1]) / 2 : (scoresA[0] || 0);
                const avgB = scoresB.length >= 2 ? (scoresB[0] + scoresB[1]) / 2 : (scoresB[0] || 0);
                const avgC = scoresC.length >= 2 ? (scoresC[0] + scoresC[1]) / 2 : (scoresC[0] || 0);
                
                return {
                    ...p,
                    judgeScores: {
                        judgeA1: getScores(judgesA[0]?.id).a,
                        judgeA2: getScores(judgesA[1]?.id).a,
                        judgeBC1: { b: getScores(judgesBC[0]?.id).b, c: getScores(judgesBC[0]?.id).c },
                        judgeBC2: { b: getScores(judgesBC[1]?.id).b, c: getScores(judgesBC[1]?.id).c },
                        coordinator: getScores(coordinator?.id)
                    },
                    averages: {
                        a: avgA,
                        b: avgB,
                        c: avgC,
                        total: avgA + avgB + avgC
                    }
                };
            });
            
            processedProjects.sort((a, b) => b.averages.total - a.averages.total);
            
            result[category] = {
                team: { judgesA, judgesBC, coordinator },
                projects: (processedProjects ?? []).map((p, i) => ({ ...p, rank: i + 1 }))
            };
        }
        
        return result;
    }, [projects, users, assignments, user]);

    const allBroadsheetCategories = useMemo(() => Object.keys(broadsheetDataByCategory).sort(), [broadsheetDataByCategory]);

    const rankingData = useMemo(() => calculateRankingsAndPoints(), [calculateRankingsAndPoints]);

    const marksheetData = useMemo(() => {
        const { projectsWithPoints } = rankingData;
        return (projectsWithPoints ?? []).map(p => {
            const scores = calculateProjectScoresWithBreakdown(p.id);
            return {
                ...p,
                ...scores
            };
        }).sort((a, b) => a.categoryRank - b.categoryRank);
    }, [rankingData, calculateProjectScoresWithBreakdown]);
    
    const marksheetDataByCategory = useMemo(() => {
        return (marksheetData ?? []).reduce((acc, p) => {
            if (!acc[p.category]) acc[p.category] = [];
            acc[p.category].push(p);
            return acc;
        }, {} as Record<string, typeof marksheetData>);
    }, [marksheetData]);

    const allMarksheetCategories = useMemo(() => Object.keys(marksheetDataByCategory).sort(), [marksheetDataByCategory]);
    
    // --- NEW LOGIC FOR RANKING TAB ---
    const filteredRankingData = useMemo(() => {
        if (!user) return [];

        const { schoolRanking, zoneRanking, subCountyRanking, countyRanking, regionRanking } = rankingData;
        const schoolLocationMap = new Map((schoolData ?? []).map(s => [s.school, s]));

        let dataToFilter: RankedEntity[] = [];

        // Flatten nested ranking data
        switch (rankingType) {
            case 'school':
                dataToFilter = schoolRanking;
                break;
            case 'zone':
                // FIX: Cast result of Object.values to resolve type inference error.
                dataToFilter = (Object.values(zoneRanking) as RankedEntity[][]).flat();
                break;
            case 'subCounty':
                // FIX: Cast result of Object.values to resolve type inference error.
                dataToFilter = (Object.values(subCountyRanking) as RankedEntity[][]).flat();
                break;
            case 'county':
                // FIX: Cast result of Object.values to resolve type inference error.
                dataToFilter = (Object.values(countyRanking) as RankedEntity[][]).flat();
                break;
            case 'region':
                dataToFilter = regionRanking;
                break;
        }

        // Create lookup maps for filtering
        const countyToRegionMap = new Map<string, string>();
        const subCountyToCountyMap = new Map<string, string>();
        for (const region in geographicalData) {
            for (const county in geographicalData[region]) {
                countyToRegionMap.set(county, region);
                for (const subCounty in geographicalData[region][county]) {
                    subCountyToCountyMap.set(subCounty, county);
                }
            }
        }
        
        // Filter based on admin scope
        const scopedData = (dataToFilter ?? []).filter(entity => {
            if ([UserRole.SUPER_ADMIN, UserRole.NATIONAL_ADMIN].includes(user.currentRole)) return true;
            
            switch (rankingType) {
                case 'school':
                    // FIX: Cast map lookup to SchoolLocation to resolve type inference error.
                    const loc = schoolLocationMap.get(entity.name) as SchoolLocation | undefined;
                    if (!loc) return false;
                    if (user.currentRole === UserRole.REGIONAL_ADMIN) return loc.region === user.region;
                    if (user.currentRole === UserRole.COUNTY_ADMIN) return loc.county === user.county;
                    if (user.currentRole === UserRole.SUB_COUNTY_ADMIN) return loc.subCounty === user.subCounty;
                    if (user.currentRole === UserRole.PATRON) return loc.school === user.school;
                    return false;
                case 'zone':
                    const subCountyParent = entity.parent; // parent is subCounty
                    const countyOfSubCounty = subCountyParent ? subCountyToCountyMap.get(subCountyParent) : null;
                    const regionOfCounty = countyOfSubCounty ? countyToRegionMap.get(countyOfSubCounty) : null;
                    if (user.currentRole === UserRole.REGIONAL_ADMIN) return regionOfCounty === user.region;
                    if (user.currentRole === UserRole.COUNTY_ADMIN) return countyOfSubCounty === user.county;
                    if (user.currentRole === UserRole.SUB_COUNTY_ADMIN) return subCountyParent === user.subCounty;
                    if (user.currentRole === UserRole.PATRON) return (schoolLocationMap.get(user.school!) as SchoolLocation | undefined)?.zone === entity.name;
                    return false;
                case 'subCounty':
                    const countyParent = entity.parent; // parent is county
                    const regionOfCounty2 = countyParent ? countyToRegionMap.get(countyParent) : null;
                    if (user.currentRole === UserRole.REGIONAL_ADMIN) return regionOfCounty2 === user.region;
                    if (user.currentRole === UserRole.COUNTY_ADMIN) return countyParent === user.county;
                    if (user.currentRole === UserRole.SUB_COUNTY_ADMIN) return entity.name === user.subCounty;
                     if (user.currentRole === UserRole.PATRON) return (schoolLocationMap.get(user.school!) as SchoolLocation | undefined)?.subCounty === entity.name;
                    return false;
                case 'county':
                    const regionParent = entity.parent; // parent is region
                    if (user.currentRole === UserRole.REGIONAL_ADMIN) return regionParent === user.region;
                    if (user.currentRole === UserRole.COUNTY_ADMIN) return entity.name === user.county;
                    if (user.currentRole === UserRole.PATRON) return (schoolLocationMap.get(user.school!) as SchoolLocation | undefined)?.county === entity.name;
                    return false;
                case 'region':
                    if (user.currentRole === UserRole.REGIONAL_ADMIN) return entity.name === user.region;
                    if (user.currentRole === UserRole.PATRON) return (schoolLocationMap.get(user.school!) as SchoolLocation | undefined)?.region === entity.name;
                    return false;
                default:
                    return false;
            }
        });

        // Filter by search term
        if (rankingSearchTerm) {
            return (scopedData ?? []).filter(entity => entity.name.toLowerCase().includes(rankingSearchTerm.toLowerCase()));
        }

        return scopedData;
    }, [user, rankingData, rankingType, rankingSearchTerm, schoolData, geographicalData]);

    const handleExportBroadsheetPDF = () => {
        if (!user) return;
        const doc = new jsPDF({ orientation: 'landscape' });
        
        const addHeader = () => {
            doc.setFontSize(16);
            doc.text("THE KENYA SCIENCE AND ENGINEERING FAIR (KSEF)", 148, 12, { align: 'center' });
            doc.setFontSize(12);
            doc.text(competitionTitle.toUpperCase(), 148, 18, { align: 'center' });
            doc.text("RESULTS BROADHEET", 148, 24, { align: 'center' });
        };

        addHeader();
        let startY = 35;
        
        const categoriesToExport = broadsheetCategory === 'All' ? allBroadsheetCategories : [broadsheetCategory];

        categoriesToExport.forEach((category, index) => {
            const data = broadsheetDataByCategory[category];
            if (!data) return;

            const { team, projects: rankedProjects } = data;
            const getLastName = (name: string | undefined) => name ? name.split(' ').slice(-1)[0] : 'N/A';
            
            const head = [
                [
                    { content: 'Student name(s)', rowSpan: 3 }, { content: 'School', rowSpan: 3 }, { content: 'Project Title', rowSpan: 3 },
                    { content: 'Section A', colSpan: 2 }, { content: 'Section B & C', colSpan: 4 },
                    { content: `Coordinator (${getLastName(team.coordinator?.name)})`, colSpan: 3 },
                    { content: 'Averages', colSpan: 3 }, { content: 'Total', rowSpan: 3 }, { content: 'Rank', rowSpan: 3 },
                ],
                [
                    { content: getLastName(team.judgesA[0]?.name), rowSpan: 2 }, { content: getLastName(team.judgesA[1]?.name), rowSpan: 2 },
                    { content: getLastName(team.judgesBC[0]?.name), colSpan: 2 }, { content: getLastName(team.judgesBC[1]?.name), colSpan: 2 },
                    { content: 'Sec A', rowSpan: 2 }, { content: 'Sec B', rowSpan: 2 }, { content: 'Sec C', rowSpan: 2 },
                    { content: 'Sec A/30', rowSpan: 2 }, { content: 'Sec B/15', rowSpan: 2 }, { content: 'Sec C/35', rowSpan: 2 },
                ],
                [
                    'Sec B', 'Sec C', 'Sec B', 'Sec C',
                ],
            ];
            
            const body = (rankedProjects ?? []).map((p) => [
                p.students.join('\n'), p.school, p.title,
                p.judgeScores.judgeA1?.toFixed(1) ?? '-',
                p.judgeScores.judgeA2?.toFixed(1) ?? '-',
                p.judgeScores.judgeBC1.b?.toFixed(1) ?? '-',
                p.judgeScores.judgeBC1.c?.toFixed(1) ?? '-',
                p.judgeScores.judgeBC2.b?.toFixed(1) ?? '-',
                p.judgeScores.judgeBC2.c?.toFixed(1) ?? '-',
                p.judgeScores.coordinator.a?.toFixed(1) ?? '-',
                p.judgeScores.coordinator.b?.toFixed(1) ?? '-',
                p.judgeScores.coordinator.c?.toFixed(1) ?? '-',
                p.averages.a.toFixed(2),
                p.averages.b.toFixed(2),
                p.averages.c.toFixed(2),
                p.averages.total.toFixed(2),
                p.rank,
            ]);
            
            if (startY > 180) { // Check if we need a new page
                 doc.addPage();
                 addHeader();
                 startY = 35;
            }

            doc.setFontSize(14);
            doc.text(`Category: ${category}`, 14, startY);
            
            (doc as any).autoTable({
                startY: startY + 2,
                head: head,
                body: body,
                theme: 'grid',
                headStyles: { fillColor: [220, 220, 220], textColor: 0, halign: 'center', valign: 'middle', fontStyle: 'bold', fontSize: 7, cellPadding: 1 },
                styles: { fontSize: 7, cellPadding: 1, overflow: 'linebreak' },
                columnStyles: {
                    0: { cellWidth: 25 }, 1: { cellWidth: 25 }, 2: { cellWidth: 40 },
                    15: { fontStyle: 'bold' }, 16: { halign: 'center', fontStyle: 'bold' },
                },
                didDrawPage: (data: any) => {
                    startY = data.cursor.y + 10;
                }
            });
        });
        
        doc.save('KSEF_Broadsheet_Report.pdf');
    };

    const handleExportMarksheetPDF = () => {
        if (!user) return;
        const doc = new jsPDF({ orientation: 'landscape' });

        const addHeader = (category: string) => {
            doc.setFontSize(16);
            doc.text("THE KENYA SCIENCE AND ENGINEERING FAIR (KSEF)", 148, 12, { align: 'center' });
            doc.setFontSize(12);
            doc.text(competitionTitle.toUpperCase(), 148, 18, { align: 'center' });
            doc.text("RESULTS MARKSHEET", 148, 24, { align: 'center' });
            doc.setFontSize(14);
            doc.text(`CATEGORY: ${category.toUpperCase()}`, 148, 32, { align: 'center' });
        };
        
        const categoriesToExport = marksheetCategory === 'All' ? allMarksheetCategories : [marksheetCategory];

        categoriesToExport.forEach((category, index) => {
            if (index > 0) doc.addPage();
            addHeader(category);

            const projectsInCategory = marksheetDataByCategory[category] || [];

            const head = [
                [
                    { content: 'Project', colSpan: 2, styles: { halign: 'center' } },
                    { content: 'School', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
                    { content: 'Presenters', colSpan: 2, styles: { halign: 'center' } },
                    { content: 'Score Averages', colSpan: 3, styles: { halign: 'center' } },
                    { content: 'Total Score', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
                    { content: 'Points', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
                    { content: 'Rank', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
                ],
                ['Reg. No', 'Title', 'Student 1', 'Student 2', 'Sec A', 'Sec B', 'Sec C']
            ];

            const body = (projectsInCategory ?? []).map(p => [
                p.projectRegistrationNumber,
                p.title,
                p.school,
                p.students[0] || '',
                p.students[1] || '',
                p.scoreA?.toFixed(2) ?? 'N/A',
                p.scoreB?.toFixed(2) ?? 'N/A',
                p.scoreC?.toFixed(2) ?? 'N/A',
                p.totalScore.toFixed(2),
                p.points,
                p.categoryRank
            ]);

            (doc as any).autoTable({
                startY: 40,
                head: head,
                body: body,
                theme: 'grid',
                headStyles: { fillColor: [220, 220, 220], textColor: 0, fontStyle: 'bold' },
            });
        });

        doc.save('KSEF_Marksheet_Report.pdf');
    };

    const handleExportRankingsPDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.text("THE KENYA SCIENCE AND ENGINEERING FAIR (KSEF)", 105, 12, { align: 'center' });
        doc.setFontSize(12);
        doc.text(competitionTitle.toUpperCase(), 105, 18, { align: 'center' });
        doc.setFontSize(14);
        doc.text(`${toTitleCase(rankingType)} Rankings`, 105, 26, { align: 'center' });

        const head = [[toTitleCase(rankingType), 'Total Points', 'Rank']];
        const body = (filteredRankingData ?? []).map(entity => [entity.name, entity.totalPoints.toFixed(0), entity.rank]);
        
        (doc as any).autoTable({
            startY: 35,
            head: head,
            body: body,
            theme: 'grid',
            headStyles: { fillColor: [0, 52, 89] },
        });

        doc.save(`KSEF_${toTitleCase(rankingType)}_Rankings.pdf`);
    };

    return (
        <div className="space-y-6">
            <Card>
                <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-text-light dark:text-text-dark">Reporting & Analytics</h1>
                        <p className="text-text-muted-light dark:text-text-muted-dark mt-1">Generate broadsheets, view rankings, and export final results.</p>
                    </div>
                </div>
                <div className="border-b dark:border-gray-700 flex">
                    <button onClick={() => setActiveTab('broadsheet')} className={`px-4 py-2 font-semibold transition-colors ${activeTab === 'broadsheet' ? 'border-b-2 border-primary text-primary' : 'text-text-muted-light hover:text-primary'}`}>
                        Detailed Broadsheet
                    </button>
                    <button onClick={() => setActiveTab('marksheet')} className={`px-4 py-2 font-semibold transition-colors ${activeTab === 'marksheet' ? 'border-b-2 border-primary text-primary' : 'text-text-muted-light hover:text-primary'}`}>
                        Summary Marksheet
                    </button>
                     <button onClick={() => setActiveTab('rankings')} className={`px-4 py-2 font-semibold transition-colors ${activeTab === 'rankings' ? 'border-b-2 border-primary text-primary' : 'text-text-muted-light hover:text-primary'}`}>
                        Rankings
                    </button>
                </div>
            </Card>

            {activeTab === 'broadsheet' && (
                 <Card>
                    <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
                        <h2 className="text-2xl font-bold text-secondary dark:text-accent-green">Results Broadsheet</h2>
                        <div className="flex items-center gap-4">
                            <select value={broadsheetCategory} onChange={e => setBroadsheetCategory(e.target.value)} className="p-2 rounded-md bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark border border-gray-300 dark:border-gray-600">
                                <option value="All">All Categories</option>
                                {(allBroadsheetCategories ?? []).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                            <Button onClick={handleExportBroadsheetPDF} variant="secondary" className="flex items-center gap-2"><Download className="w-4 h-4"/> Export PDF</Button>
                        </div>
                    </div>
                    {Object.keys(broadsheetDataByCategory).length > 0 ? Object.entries(broadsheetDataByCategory).filter(([cat, _]) => broadsheetCategory === 'All' || cat === broadsheetCategory).map(([category, data]) => {
                        // FIX: Cast data to 'any' to resolve destructuring error on an implicitly typed object.
                        const { team, projects: rankedProjects } = data as any;
                        const getLastName = (name: string | undefined) => name ? name.split(' ').slice(-1)[0] : 'N/A';
                        return (
                        <div key={category} className="mb-8 overflow-x-auto">
                            <h3 className="text-xl font-bold text-text-light dark:text-text-dark mb-3 p-2 bg-gray-100 dark:bg-gray-800 rounded-md sticky left-0">{category}</h3>
                            <table className="w-full text-xs border-collapse">
                                <thead className="text-center font-bold bg-gray-100 dark:bg-gray-800 text-text-muted-light dark:text-text-muted-dark">
                                    <tr>
                                        <th rowSpan={3} className="border dark:border-gray-600 p-1 min-w-[120px]">Student name(s)</th>
                                        <th rowSpan={3} className="border dark:border-gray-600 p-1 min-w-[120px]">School</th>
                                        <th rowSpan={3} className="border dark:border-gray-600 p-1 min-w-[150px]">Project Title</th>
                                        <th colSpan={2} className="border dark:border-gray-600 p-1">Section A</th>
                                        <th colSpan={4} className="border dark:border-gray-600 p-1">Section B & C</th>
                                        <th colSpan={3} className="border dark:border-gray-600 p-1">Coordinator ({getLastName(team.coordinator?.name)})</th>
                                        <th colSpan={3} className="border dark:border-gray-600 p-1">Averages</th>
                                        <th rowSpan={3} className="border dark:border-gray-600 p-1">Total</th>
                                        <th rowSpan={3} className="border dark:border-gray-600 p-1">Rank</th>
                                    </tr>
                                    <tr>
                                        <th rowSpan={2} className="border dark:border-gray-600 p-1">{getLastName(team.judgesA[0]?.name)}</th>
                                        <th rowSpan={2} className="border dark:border-gray-600 p-1">{getLastName(team.judgesA[1]?.name)}</th>
                                        <th colSpan={2} className="border dark:border-gray-600 p-1">{getLastName(team.judgesBC[0]?.name)}</th>
                                        <th colSpan={2} className="border dark:border-gray-600 p-1">{getLastName(team.judgesBC[1]?.name)}</th>
                                        <th rowSpan={2} className="border dark:border-gray-600 p-1">Sec A</th>
                                        <th rowSpan={2} className="border dark:border-gray-600 p-1">Sec B</th>
                                        <th rowSpan={2} className="border dark:border-gray-600 p-1">Sec C</th>
                                        <th rowSpan={2} className="border dark:border-gray-600 p-1">Sec A/30</th>
                                        <th rowSpan={2} className="border dark:border-gray-600 p-1">Sec B/15</th>
                                        <th rowSpan={2} className="border dark:border-gray-600 p-1">Sec C/35</th>
                                    </tr>
                                    <tr>
                                        <th className="border dark:border-gray-600 p-1">Sec B</th>
                                        <th className="border dark:border-gray-600 p-1">Sec C</th>
                                        <th className="border dark:border-gray-600 p-1">Sec B</th>
                                        <th className="border dark:border-gray-600 p-1">Sec C</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(rankedProjects ?? []).map((p: any) => (
                                        <tr key={p.id} className="border-b dark:border-gray-700 even:bg-gray-50 dark:even:bg-gray-800/50">
                                            <td className="border dark:border-gray-600 p-1 text-text-light dark:text-text-dark">{p.students.join(', ')}</td>
                                            <td className="border dark:border-gray-600 p-1 text-text-light dark:text-text-dark">{p.school}</td>
                                            <td className="border dark:border-gray-600 p-1 font-medium text-text-light dark:text-text-dark">{p.title}</td>
                                            <td className="border dark:border-gray-600 p-1 text-center text-text-light dark:text-text-dark">{p.judgeScores.judgeA1?.toFixed(1) ?? '-'}</td>
                                            <td className="border dark:border-gray-600 p-1 text-center text-text-light dark:text-text-dark">{p.judgeScores.judgeA2?.toFixed(1) ?? '-'}</td>
                                            <td className="border dark:border-gray-600 p-1 text-center text-text-light dark:text-text-dark">{p.judgeScores.judgeBC1.b?.toFixed(1) ?? '-'}</td>
                                            <td className="border dark:border-gray-600 p-1 text-center text-text-light dark:text-text-dark">{p.judgeScores.judgeBC1.c?.toFixed(1) ?? '-'}</td>
                                            <td className="border dark:border-gray-600 p-1 text-center text-text-light dark:text-text-dark">{p.judgeScores.judgeBC2.b?.toFixed(1) ?? '-'}</td>
                                            <td className="border dark:border-gray-600 p-1 text-center text-text-light dark:text-text-dark">{p.judgeScores.judgeBC2.c?.toFixed(1) ?? '-'}</td>
                                            <td className="border dark:border-gray-600 p-1 text-center text-text-light dark:text-text-dark">{p.judgeScores.coordinator.a?.toFixed(1) ?? '-'}</td>
                                            <td className="border dark:border-gray-600 p-1 text-center text-text-light dark:text-text-dark">{p.judgeScores.coordinator.b?.toFixed(1) ?? '-'}</td>
                                            <td className="border dark:border-gray-600 p-1 text-center text-text-light dark:text-text-dark">{p.judgeScores.coordinator.c?.toFixed(1) ?? '-'}</td>
                                            <td className="border dark:border-gray-600 p-1 text-center font-semibold text-text-light dark:text-text-dark">{p.averages.a.toFixed(2)}</td>
                                            <td className="border dark:border-gray-600 p-1 text-center font-semibold text-text-light dark:text-text-dark">{p.averages.b.toFixed(2)}</td>
                                            <td className="border dark:border-gray-600 p-1 text-center font-semibold text-text-light dark:text-text-dark">{p.averages.c.toFixed(2)}</td>
                                            <td className="border dark:border-gray-600 p-1 text-center font-bold text-primary">{p.averages.total.toFixed(2)}</td>
                                            <td className="border dark:border-gray-600 p-1 text-center font-bold text-lg text-text-light dark:text-text-dark">{p.rank}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    );
                }) : (
                    <p className="text-center text-text-muted-light dark:text-text-muted-dark py-8">
                        No projects with completed judging scores are available to report on yet.
                    </p>
                )}
                </Card>
            )}

            {activeTab === 'marksheet' && (
                <Card>
                    <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
                        <h2 className="text-2xl font-bold text-secondary dark:text-accent-green">Results Marksheet</h2>
                        <div className="flex items-center gap-4">
                            <select value={marksheetCategory} onChange={e => setMarksheetCategory(e.target.value)} className="p-2 rounded-md bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark border border-gray-300 dark:border-gray-600">
                                <option value="All">All Categories</option>
                                {(allMarksheetCategories ?? []).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                            <Button onClick={handleExportMarksheetPDF} variant="secondary" className="flex items-center gap-2"><Download className="w-4 h-4"/> Export PDF</Button>
                        </div>
                    </div>
                    {Object.keys(marksheetDataByCategory).length > 0 ? (
                         <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-text-muted-light dark:text-text-muted-dark uppercase bg-gray-50 dark:bg-gray-700">
                                    <tr>
                                        <th className="px-2 py-3 text-center">Rank</th>
                                        <th className="px-2 py-3">Reg. No</th>
                                        <th className="px-2 py-3">Title</th>
                                        <th className="px-2 py-3">School</th>
                                        <th className="px-2 py-3">Presenters</th>
                                        <th className="px-2 py-3 text-center">Sec A</th>
                                        <th className="px-2 py-3 text-center">Sec B</th>
                                        <th className="px-2 py-3 text-center">Sec C</th>
                                        <th className="px-2 py-3 text-center">Total</th>
                                        <th className="px-2 py-3 text-center">Points</th>
                                    </tr>
                                </thead>
                                {/* FIX: Cast result of Object.entries to resolve type inference error. */}
                                {(Object.entries(marksheetDataByCategory) as [string, any[]][])
                                    .filter(([cat, _]) => marksheetCategory === 'All' || cat === marksheetCategory)
                                    .map(([category, projectsInCategory]) => (
                                        <tbody key={category}>
                                            <tr>
                                                <th colSpan={10} className="px-2 py-2 text-left bg-gray-100 dark:bg-gray-800 font-semibold text-text-light dark:text-text-dark">
                                                    {category}
                                                </th>
                                            </tr>
                                            {(projectsInCategory ?? []).map(p => (
                                                <tr key={p.id} className="border-b dark:border-gray-700">
                                                    <td className="px-2 py-2 font-bold text-lg text-center text-primary">{p.categoryRank}</td>
                                                    <td className="px-2 py-2 font-mono text-xs">{p.projectRegistrationNumber}</td>
                                                    <td className="px-2 py-2 font-medium text-text-light dark:text-text-dark">{p.title}</td>
                                                    <td className="px-2 py-2">{p.school}</td>
                                                    <td className="px-2 py-2 text-xs">{p.students.join(', ')}</td>
                                                    <td className="px-2 py-2 text-center">{p.scoreA?.toFixed(2) ?? 'N/A'}</td>
                                                    <td className="px-2 py-2 text-center">{p.scoreB?.toFixed(2) ?? 'N/A'}</td>
                                                    <td className="px-2 py-2 text-center">{p.scoreC?.toFixed(2) ?? 'N/A'}</td>
                                                    <td className="px-2 py-2 text-center font-bold text-primary">{p.totalScore.toFixed(2)}</td>
                                                    <td className="px-2 py-2 text-center font-semibold">{p.points}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    ))
                                }
                            </table>
                        </div>
                    ) : (
                         <p className="text-center text-text-muted-light dark:text-text-muted-dark py-8">
                            No fully ranked projects are available to generate a marksheet.
                        </p>
                    )}
                </Card>
            )}

            {activeTab === 'rankings' && (
                <Card>
                    <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg mb-6">
                        <h2 className="text-xl font-bold text-center text-secondary dark:text-accent-green">THE KENYA SCIENCE AND ENGINEERING FAIR (KSEF)</h2>
                        <p className="text-center font-semibold text-text-light dark:text-text-dark">{competitionTitle.toUpperCase()}</p>
                    </div>
                     <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
                        <h3 className="text-2xl font-bold text-secondary dark:text-accent-green">Competition Rankings</h3>
                        <div className="flex items-center gap-4 flex-wrap">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input 
                                    type="text"
                                    placeholder="Filter by name..."
                                    value={rankingSearchTerm}
                                    onChange={e => setRankingSearchTerm(e.target.value)}
                                    className="p-2 pl-9 rounded-md bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark border border-gray-300 dark:border-gray-600"
                                />
                            </div>
                            <select value={rankingType} onChange={e => setRankingType(e.target.value as RankingType)} className="p-2 rounded-md bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark border border-gray-300 dark:border-gray-600">
                                <option value="school">School Rankings</option>
                                <option value="zone">Zone Rankings</option>
                                <option value="subCounty">Sub-County Rankings</option>
                                <option value="county">County Rankings</option>
                                <option value="region">Region Rankings</option>
                            </select>
                            <Button onClick={handleExportRankingsPDF} variant="secondary" className="flex items-center gap-2"><Download className="w-4 h-4"/> Export PDF</Button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-text-muted-light dark:text-text-muted-dark uppercase bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-4 py-3">{toTitleCase(rankingType)}</th>
                                    <th className="px-4 py-3 text-center">Total Points</th>
                                    <th className="px-4 py-3 text-center">Rank</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRankingData.length > 0 ? (
                                    (filteredRankingData ?? []).map(entity => (
                                        <tr key={entity.name} className="border-b dark:border-gray-700">
                                            <td className="px-4 py-3 font-medium text-text-light dark:text-text-dark">{entity.name}</td>
                                            <td className="px-4 py-3 text-center text-text-light dark:text-text-dark">{entity.totalPoints.toFixed(0)}</td>
                                            <td className="px-4 py-3 text-center font-bold text-lg text-primary">{entity.rank}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={3} className="text-center py-8 text-text-muted-light dark:text-text-muted-dark">
                                            No ranking data available for this selection.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}
        </div>
    );
};

export default ReportingPage;