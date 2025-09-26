import React, { useState, useContext, useEffect, FormEvent, useMemo } from 'react';
// FIX: Replaced namespace import for react-router-dom with named imports to resolve module export errors.
import { useParams, useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
// FIX: Add ProjectStatus import to resolve missing property error.
import { Project, ProjectStatus } from '../types';
import { AlertTriangle, Plus, Trash2 } from 'lucide-react';

// Helper function to generate 3-letter school initials
const getSchoolInitials = (schoolName: string): string => {
    if (!schoolName) return 'XXX';
    const words = schoolName.trim().split(/\s+/).filter(Boolean);
    
    if (words.length === 0) return 'XXX';

    let initials = '';
    if (words.length >= 3) {
        initials = (words[0][0] || '') + (words[1][0] || '') + (words[2][0] || '');
    } else if (words.length === 2) {
        initials = (words[0][0] || '') + (words[1].substring(0, 2) || '');
    } else { // 1 word
        initials = words[0].substring(0, 3);
    }
    
    // Ensure it's always 3 characters, padding with 'X' if too short
    return initials.toUpperCase().padEnd(3, 'X').substring(0,3);
};

// Helper function to format strings to Title Case
const toTitleCase = (str: string): string => {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};


const ProjectForm: React.FC = () => {
    // FIX: Replaced ReactRouterDOM.useParams with useParams from named import.
    const { projectId } = useParams<{ projectId: string }>();
    // FIX: Replaced ReactRouterDOM.useNavigate with useNavigate from named import.
    const navigate = useNavigate();
    const { user, projects, addProject, updateProject, geographicalData, submissionDeadline } = useContext(AppContext);

    const isEditing = Boolean(projectId);
    const isPastDeadline = useMemo(() => submissionDeadline && new Date() > new Date(submissionDeadline), [submissionDeadline]);
    const [isLocked, setIsLocked] = useState(false);

    // FIX: Property 'status' is missing. Added it to the initial form data.
    const initialFormData: Omit<Project, 'id' | 'currentLevel' | 'isEliminated'> = {
        title: '',
        category: '',
        projectRegistrationNumber: 'Select category and school to generate',
        region: '',
        county: '',
        subCounty: '',
        zone: '',
        school: user?.school || '',
        students: [''],
        patronId: user?.id || '',
        status: ProjectStatus.NOT_STARTED,
    };

    const [formData, setFormData] = useState<Omit<Project, 'id' | 'currentLevel' | 'isEliminated'>>(initialFormData);
    const [counties, setCounties] = useState<string[]>([]);
    const [subCounties, setSubCounties] = useState<string[]>([]);
    const [zones, setZones] = useState<string[]>([]);
    const [error, setError] = useState('');
    const [selectedCategoryDescription, setSelectedCategoryDescription] = useState('');

    const categoriesWithDescriptions = [
      { name: "Mathematical Science", description: "Encompasses areas like Algebra, Analysis, Applied Mathematics, Geometry, Probability & Statistics, and related topics." },
      { name: "Physics", description: "Covers Astronomy, Atoms, Molecules, Solids, Instrumentation & Electronics, Magnetism & Electromagnetism, Particle Physics, Optics, Lasers, and Theoretical Physics." },
      { name: "Computer Science", description: "Includes Algorithms, Databases, Artificial Intelligence, Networking & Communications, Computational Science, Graphics, Computer Systems, Operating Systems, Programming, and Software Engineering." },
      { name: "Chemistry", description: "Involves Analytical, General, Inorganic, Organic, and Physical Chemistry." },
      { name: "Biology and Biotechnology", description: "Covers Cellular Biology, Molecular Genetics, Immunology, Antibiotics, Antimicrobials, Bacteriology, Virology, Medicine & Health Sciences, and Photosynthesis." },
      { name: "Energy and Transportation", description: "Encompasses Aerospace, Alternative Fuels, Fossil Fuel Energy, Renewable Energy, Space, Air & Marine, Solar, Energy Conservation, and similar sustainability topics." },
      { name: "Environmental Science and Management", description: "Focuses on Bioremediation, Ecosystems Management, Environmental Engineering, Land Resource Management, Recycling, Waste Management, Pollution, Blue Economy, Soil Conservation, and Landscaping." },
      { name: "Agriculture", description: "Covers Agronomy, Plant Science & Systematics, Plant Evolution, Animal Sciences (e.g., Animal Husbandry), and Ecology." },
      { name: "Food Technology, Textiles & Home Economics", description: "Includes Food Product Development, Process Design, Food Engineering, Food Microbiology, Food Packaging & Preservation, Food Safety, Diet, Textile Design, Interior Design, and Decoration." },
      { name: "Engineering", description: "Involves Design, Building, Engine & Machine Use, Structures, Apparatus, Manufacturing Processes, Aeronautical Engineering, Vehicle Development, and New Product Development." },
      { name: "Technology and Applied Technology", description: "Focuses on Appropriate Technology, Innovations in Science & Industry, Knowledge Economy, and Research & Development." },
      { name: "Behavioral Science", description: "Encompasses Psychology, Animal Conservation, Behavior Change, and Disaster & Stress Response Management." },
      { name: "Robotics", description: "Involves the conception, engineering, design, manufacture, and operation of robots, including automation and AI integration." }
    ].sort((a, b) => a.name.localeCompare(b.name));

    useEffect(() => {
        if (isEditing) {
            const projectToEdit = projects.find(p => p.id === projectId);
            if (projectToEdit) {
                if (projectToEdit.status !== ProjectStatus.NOT_STARTED && projectToEdit.status !== ProjectStatus.WAITING) {
                    setIsLocked(true);
                } else {
                    setIsLocked(false);
                }
                setFormData(projectToEdit);
                const description = categoriesWithDescriptions.find(c => c.name === projectToEdit.category)?.description || '';
                setSelectedCategoryDescription(description);
                // Pre-populate dropdowns on edit
                if (projectToEdit.region) {
                    setCounties(Object.keys(geographicalData[projectToEdit.region] || {}).sort());
                }
                if (projectToEdit.region && projectToEdit.county) {
                    setSubCounties(Object.keys(geographicalData[projectToEdit.region][projectToEdit.county] || {}).sort());
                }
                 if (projectToEdit.region && projectToEdit.county && projectToEdit.subCounty) {
                    setZones((geographicalData[projectToEdit.region][projectToEdit.county][projectToEdit.subCounty] || []).sort());
                }
            }
        } else if (user) {
            // If creating a new project, pre-fill with patron's data
            const patronGeoData = {
                region: user.region || '',
                county: user.county || '',
                subCounty: user.subCounty || '',
                zone: user.zone || '',
                school: user.school || '',
            };
            setFormData(prev => ({
                ...prev,
                ...patronGeoData,
            }));

            // Pre-populate dropdown lists based on patron data
            if (patronGeoData.region) {
                setCounties(Object.keys(geographicalData[patronGeoData.region] || {}).sort());
            }
            if (patronGeoData.region && patronGeoData.county) {
                setSubCounties(Object.keys(geographicalData[patronGeoData.region][patronGeoData.county] || {}).sort());
            }
            if (patronGeoData.region && patronGeoData.county && patronGeoData.subCounty) {
                const existingZones = geographicalData[patronGeoData.region]?.[patronGeoData.county]?.[patronGeoData.subCounty] || [];
                // FIX: If the user's saved zone (e.g., an 'Other' zone) isn't in the static list, add it to the dropdown options to ensure it's correctly selected.
                if (patronGeoData.zone && !existingZones.includes(patronGeoData.zone)) {
                    setZones([patronGeoData.zone, ...existingZones].sort());
                } else {
                    setZones(existingZones.sort());
                }
            }
        }
    }, [isEditing, projectId, projects, user, geographicalData]);

    // Auto-generate registration number for new projects
    useEffect(() => {
        if (!isEditing && formData.category && formData.school) {
            const categoryMap: { [key: string]: string } = {
                "Mathematical Science": "MTH",
                "Physics": "PHY",
                "Computer Science": "CSC",
                "Chemistry": "CHM",
                "Biology and Biotechnology": "BIO",
                "Energy and Transportation": "ENT",
                "Environmental Science and Management": "EVS",
                "Agriculture": "AGR",
                "Food Technology, Textiles & Home Economics": "FTH",
                "Engineering": "ENG",
                "Technology and Applied Technology": "TEC",
                "Behavioral Science": "BEH",
                "Robotics": "RBT"
            };
            const code = categoryMap[formData.category] || 'GEN';
            const year = new Date().getFullYear() + 2; // Simulating KSEF 2026
            const schoolInitials = getSchoolInitials(formData.school);

            const existingCount = (projects ?? []).filter(p =>
                p.school.toLowerCase() === formData.school.toLowerCase() &&
                p.category === formData.category
            ).length;

            const projectNumber = existingCount + 1;
            const regNumber = `${code}-${year}-${schoolInitials}-${projectNumber}`;
            setFormData(prev => ({ ...prev, projectRegistrationNumber: regNumber }));
        }
    }, [formData.category, formData.school, isEditing, projects]);

    // Validation for project limit
    useEffect(() => {
        if (!formData.school || !formData.category) {
            setError('');
            return;
        }

        const projectsForSchoolAndCategory = (projects ?? []).filter(p =>
            p.school.toLowerCase() === formData.school.toLowerCase() &&
            p.category === formData.category &&
            p.id !== projectId // Exclude the current project if editing
        );

        if (projectsForSchoolAndCategory.length >= 4) {
            setError(`Limit reached: This school has already registered 4 projects in the "${formData.category}" category.`);
        } else {
            setError('');
        }
    }, [formData.category, formData.school, projects, projectId]);


    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
    
        setFormData(prev => {
            if (!prev) return initialFormData;
            
            const newFormData = { ...prev, [name]: value };
    
            if (name === 'region') {
                newFormData.county = '';
                newFormData.subCounty = '';
                newFormData.zone = '';
                setCounties(Object.keys(geographicalData[value] || {}).sort());
                setSubCounties([]);
                setZones([]);
            } else if (name === 'county') {
                newFormData.subCounty = '';
                newFormData.zone = '';
                if (newFormData.region) {
                    setSubCounties(Object.keys(geographicalData[newFormData.region]?.[value] || {}).sort());
                } else {
                    setSubCounties([]);
                }
                setZones([]);
            } else if (name === 'subCounty') {
                newFormData.zone = '';
                if (newFormData.region && newFormData.county) {
                    setZones((geographicalData[newFormData.region]?.[newFormData.county]?.[value] || []).sort());
                } else {
                    setZones([]);
                }
            } else if (name === 'category') {
                const description = categoriesWithDescriptions.find(c => c.name === value)?.description || '';
                setSelectedCategoryDescription(description);
            }
            
            return newFormData;
        });
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: toTitleCase(value) }));
    };

    const handleStudentChange = (index: number, value: string) => {
        const newStudents = [...formData.students];
        newStudents[index] = value;
        setFormData(prev => ({ ...prev, students: newStudents }));
    };

    const handleStudentBlur = (index: number, value: string) => {
        const newStudents = [...formData.students];
        newStudents[index] = toTitleCase(value);
        setFormData(prev => ({ ...prev, students: newStudents }));
    };

    const addStudentInput = () => {
        setFormData(prev => ({...prev, students: [...prev.students, '']}));
    }

    const removeStudentInput = (index: number) => {
        if (formData.students.length > 1) {
            const newStudents = formData.(students ?? []).filter((_, i) => i !== index);
            setFormData(prev => ({...prev, students: newStudents}));
        }
    }

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (error) {
            alert(`Error: Cannot save. ${error}`);
            return;
        }
        if (isEditing && projectId) {
            updateProject({ ...(formData as Project), id: projectId });
        } else {
            addProject(formData);
        }
        navigate('/dashboard');
    };
    
    const regions = Object.keys(geographicalData).sort();

    return (
        <Card>
            <h2 className="text-2xl font-bold text-text-light dark:text-text-dark mb-6">
                {isEditing ? 'Edit Project' : 'Create New Project'}
            </h2>
            {isLocked && (
                <div className="p-4 rounded-md mb-6 bg-yellow-100 dark:bg-yellow-900/40 border border-yellow-400 flex items-center gap-3">
                    <AlertTriangle className="w-6 h-6 text-yellow-500 flex-shrink-0" />
                    <div>
                        <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">Project Locked</h3>
                        <p className="text-sm text-yellow-700 dark:text-yellow-400">
                            This project cannot be edited because judging is in progress or has been completed.
                        </p>
                    </div>
                </div>
            )}
            {submissionDeadline && !isLocked && (
                <div className={`p-4 rounded-md mb-6 ${isPastDeadline ? 'bg-red-100 dark:bg-red-900/40 border border-red-400' : 'bg-blue-100 dark:bg-blue-900/40 border border-blue-400'}`}>
                    <p className="font-semibold text-center">
                        {isPastDeadline
                            ? 'The deadline for project submissions has passed. You can no longer create or edit projects.'
                            : `Please note: The deadline for project submissions is ${new Date(submissionDeadline).toLocaleString()}`
                        }
                    </p>
                </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-6">
                <fieldset disabled={isPastDeadline || isLocked}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="title" className="block mb-1 font-medium text-text-light dark:text-text-dark">Project Title</label>
                            <input type="text" name="title" id="title" value={formData.title} onChange={handleChange} onBlur={handleBlur} required className="w-full p-2 rounded-md bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark border border-gray-300 dark:border-gray-600" />
                        </div>
                        <div>
                            <label htmlFor="category" className="block mb-1 font-medium text-text-light dark:text-text-dark">Category</label>
                            <select name="category" id="category" value={formData.category} onChange={handleChange} required className="w-full p-2 rounded-md bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark border border-gray-300 dark:border-gray-600">
                                <option value="" disabled>Select a category</option>
                                {(categoriesWithDescriptions ?? []).map(cat => <option key={cat.name} value={cat.name}>{cat.name}</option>)}
                            </select>
                            {selectedCategoryDescription && (
                                <div className="mt-2 p-3 bg-primary/10 text-primary-dark dark:text-primary rounded-md border border-primary/30">
                                    <p className="font-semibold text-sm">Category Description:</p>
                                    <p className="text-sm">{selectedCategoryDescription}</p>
                                </div>
                            )}
                            {error && (
                                <div className="flex items-center gap-2 text-red-500 text-sm mt-2 p-2 bg-red-500/10 rounded-md">
                                    <AlertTriangle className="w-4 h-4" />
                                    <p>{error}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <label htmlFor="projectRegistrationNumber" className="block mb-1 font-medium text-text-light dark:text-text-dark">Project Registration Number</label>
                        <input type="text" name="projectRegistrationNumber" id="projectRegistrationNumber" value={formData.projectRegistrationNumber} readOnly className="w-full p-2 rounded-md bg-gray-100 dark:bg-gray-700/50 text-text-light dark:text-text-dark border border-gray-300 dark:border-gray-600 cursor-not-allowed" />
                    </div>
                    
                    <div className="border-t dark:border-gray-700 pt-6 space-y-4">
                         <h3 className="text-lg font-semibold text-text-light dark:text-text-dark">Project Location & School</h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div>
                                <label htmlFor="school" className="block mb-1 font-medium">School Name</label>
                                <input type="text" name="school" id="school" value={formData.school} onChange={handleChange} onBlur={handleBlur} required className="w-full p-2 rounded-md bg-background-light dark:bg-background-dark border border-gray-300 dark:border-gray-600" />
                            </div>
                            <div>
                                <label htmlFor="region" className="block mb-1 font-medium">Region</label>
                                <select name="region" id="region" value={formData.region} onChange={handleChange} required className="w-full p-2 rounded-md bg-background-light dark:bg-background-dark border border-gray-300 dark:border-gray-600">
                                    <option value="">Select Region</option>
                                    {(regions ?? []).map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="county" className="block mb-1 font-medium">County</label>
                                <select name="county" id="county" value={formData.county} onChange={handleChange} required disabled={!formData.region} className="w-full p-2 rounded-md bg-background-light dark:bg-background-dark border border-gray-300 dark:border-gray-600 disabled:opacity-70">
                                    <option value="">Select County</option>
                                    {(counties ?? []).map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="subCounty" className="block mb-1 font-medium">Sub-County</label>
                                <select name="subCounty" id="subCounty" value={formData.subCounty} onChange={handleChange} required disabled={!formData.county} className="w-full p-2 rounded-md bg-background-light dark:bg-background-dark border border-gray-300 dark:border-gray-600 disabled:opacity-70">
                                    <option value="">Select Sub-County</option>
                                    {(subCounties ?? []).map(sc => <option key={sc} value={sc}>{sc}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="zone" className="block mb-1 font-medium">Zone</label>
                                <select name="zone" id="zone" value={formData.zone} onChange={handleChange} required disabled={!formData.subCounty} className="w-full p-2 rounded-md bg-background-light dark:bg-background-dark border border-gray-300 dark:border-gray-600 disabled:opacity-70">
                                    <option value="">Select Zone</option>
                                    {(zones ?? []).map(z => <option key={z} value={z}>{z}</option>)}
                                </select>
                            </div>
                         </div>
                    </div>

                    <div className="border-t dark:border-gray-700 pt-6">
                        <h3 className="text-lg font-semibold text-text-light dark:text-text-dark mb-4">Student Participants</h3>
                        <div className="space-y-4">
                            {formData.(students ?? []).map((student, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        placeholder={`Student ${index + 1} Full Name`}
                                        value={student}
                                        onChange={(e) => handleStudentChange(index, e.target.value)}
                                        onBlur={(e) => handleStudentBlur(index, e.target.value)}
                                        required
                                        className="w-full p-2 rounded-md bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark border border-gray-300 dark:border-gray-600"
                                    />
                                    {formData.students.length > 1 && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeStudentInput(index)}
                                            className="text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 p-2"
                                            aria-label="Remove student"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={addStudentInput}
                            className="mt-4 flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" /> Add Another Student
                        </Button>
                    </div>
                </fieldset>
                <div className="flex justify-end gap-4">
                    <Button type="button" variant="ghost" onClick={() => navigate(-1)}>Cancel</Button>
                    <Button type="submit" disabled={isPastDeadline || !!error || isLocked}>
                        {isEditing ? 'Save Changes' : 'Create Project'}
                    </Button>
                </div>
            </form>
        </Card>
    );
};

export default ProjectForm;
