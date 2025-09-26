import React, { useState, useContext, useEffect, FormEvent, useMemo } from 'react';
// FIX: Replaced namespace import for react-router-dom with a named import to resolve module export errors.
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { SchoolLocation, User } from '../types';

// Helper function to format strings to Title Case
const toTitleCase = (str: string): string => {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const ProfilePage: React.FC = () => {
    const { user, updateUser, schoolData, addSchoolData, geographicalData, showNotification } = useContext(AppContext);
    // FIX: Replaced ReactRouterDOM.useNavigate with useNavigate from named import.
    const navigate = useNavigate();

    const [formData, setFormData] = useState<User | null>(user);
    const [counties, setCounties] = useState<string[]>([]);
    const [subCounties, setSubCounties] = useState<string[]>([]);
    const [zones, setZones] = useState<string[]>([]);
    
    // New state for the combobox
    const [schoolInput, setSchoolInput] = useState('');
    const [isSchoolDropdownOpen, setIsSchoolDropdownOpen] = useState(false);
    const [isGeoLocked, setIsGeoLocked] = useState(false);

    const [selectedZone, setSelectedZone] = useState('');
    const [otherZoneName, setOtherZoneName] = useState('');

    const knownSchools = useMemo(() => [...new Set((schoolData ?? []).map(s => s.school))].sort(), [schoolData]);
    
    const filteredSchools = useMemo(() => {
        if (!schoolInput) {
            return [];
        }
        // Don't show the dropdown if the input is an exact match
        if (knownSchools.some(s => s.toLowerCase() === schoolInput.toLowerCase())) {
            return [];
        }
        return (knownSchools ?? []).filter(school =>
            school.toLowerCase().includes(schoolInput.toLowerCase())
        );
    }, [schoolInput, knownSchools]);

    useEffect(() => {
        if (user) {
            setFormData({ ...user, subjects: user.subjects || [] });
            setSchoolInput(user.school || '');
            
            const isKnownSchool = knownSchools.includes(user.school || '');
            setIsGeoLocked(isKnownSchool);

            if (user.region) {
                setCounties(Object.keys(geographicalData[user.region] || {}).sort());
                if (user.county) {
                    setSubCounties(Object.keys(geographicalData[user.region]?.[user.county] || {}).sort());
                    if (user.subCounty) {
                        const staticZones = geographicalData[user.region]?.[user.county]?.[user.subCounty] || [];
                        const dynamicZones = schoolData
                            .filter(s => s.region === user.region && s.county === user.county && s.subCounty === user.subCounty)
                            .map(s => s.zone);
                        const allZones = [...new Set([...staticZones, ...dynamicZones])].sort();
                        setZones(allZones);
                        const isKnownZone = allZones.includes(user.zone || '');
                        setSelectedZone(isKnownZone ? (user.zone || '') : 'Other');
                        if (!isKnownZone) setOtherZoneName(user.zone || '');
                    }
                }
            }
        }
    }, [user, geographicalData, knownSchools, schoolData]);

    const handleSchoolSelect = (schoolName: string) => {
        setSchoolInput(schoolName);
        setIsSchoolDropdownOpen(false);
        const schoolInfo = schoolData.find(s => s.school === schoolName);
        if (schoolInfo && formData) {
            const newGeoData = {
                region: schoolInfo.region, county: schoolInfo.county,
                subCounty: schoolInfo.subCounty, zone: schoolInfo.zone
            };
            setFormData({ ...formData, ...newGeoData, school: schoolName });
            setCounties(Object.keys(geographicalData[newGeoData.region] || {}).sort());
            setSubCounties(Object.keys(geographicalData[newGeoData.region]?.[newGeoData.county] || {}).sort());
            const newZones = (geographicalData[newGeoData.region]?.[newGeoData.county]?.[newGeoData.subCounty] || []).sort();
            setZones(newZones);
            setSelectedZone(schoolInfo.zone);
            setOtherZoneName('');
            setIsGeoLocked(true);
        }
    };

    const handleSchoolInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSchoolInput(value);
        setIsGeoLocked(false);
        setFormData(prev => prev ? { ...prev, school: value, region: '', county: '', subCounty: '', zone: '' } : null);
        setCounties(Object.keys(geographicalData).sort());
        setSubCounties([]);
        setZones([]);
        setSelectedZone('');
    };

    const handleSchoolInputBlur = () => {
        setTimeout(() => {
            setIsSchoolDropdownOpen(false);
            const formattedSchool = toTitleCase(schoolInput);
            setSchoolInput(formattedSchool);
            if (formData) {
                setFormData({ ...formData, school: formattedSchool });
            }
        }, 200);
    };

    const handleGeoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
        
        setFormData(prev => {
            if (!prev) return null;
            let newFormData = { ...prev, [name]: value };
            if (name === 'region') {
                newFormData = {...newFormData, county: '', subCounty: '', zone: ''};
                setCounties(Object.keys(geographicalData[value] || {}).sort());
                setSubCounties([]); setZones([]); setSelectedZone('');
            } else if (name === 'county') {
                newFormData = {...newFormData, subCounty: '', zone: ''};
                if (newFormData.region) setSubCounties(Object.keys(geographicalData[newFormData.region]?.[value] || {}).sort());
                setZones([]); setSelectedZone('');
            } else if (name === 'subCounty') {
                newFormData = {...newFormData, zone: ''};
                if (newFormData.region && newFormData.county) {
                    const staticZones = geographicalData[newFormData.region]?.[newFormData.county]?.[value] || [];
                    const dynamicZones = schoolData
                        .filter(s => s.region === newFormData.region && s.county === newFormData.county && s.subCounty === value)
                        .map(s => s.zone);
                    const allZones = [...new Set([...staticZones, ...dynamicZones])].sort();
                    setZones(allZones);
                }
                setSelectedZone('');
            }
            return newFormData;
        });
    };

    const handleZoneChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        setSelectedZone(value);
        if (value !== 'Other') {
            setFormData(prev => prev ? { ...prev, zone: value } : null);
            setOtherZoneName('');
        } else {
            setFormData(prev => prev ? { ...prev, zone: '' } : null);
        }
    };


    const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => prev ? { ...prev, [name]: value } : null);
    };

    const handleTextBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => prev ? { ...prev, [name]: toTitleCase(value) } : null);
    };
    
    const handleSubjectsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const subjects = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
        setFormData(prev => prev ? { ...prev, subjects } : null);
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (!formData) return;
        
        const finalSchoolName = (formData.school || '').trim();
        const finalZoneName = selectedZone === 'Other' ? toTitleCase(otherZoneName.trim()) : selectedZone;

        const schoolLocationToSave: SchoolLocation = {
            school: finalSchoolName,
            region: formData.region || '',
            county: formData.county || '',
            subCounty: formData.subCounty || '',
            zone: finalZoneName,
        };

        if (schoolLocationToSave.school && schoolLocationToSave.region && schoolLocationToSave.county && schoolLocationToSave.subCounty && schoolLocationToSave.zone) {
            addSchoolData(schoolLocationToSave);
        }
        
        const updatedUser = { ...formData, school: finalSchoolName, zone: finalZoneName };
        updateUser(updatedUser);
        showNotification('Profile updated successfully!', 'success');
        navigate('/dashboard');
    };

    if (!formData) return <Card><p>Loading user profile...</p></Card>;

    return (
        <Card>
            <h2 className="text-2xl font-bold text-text-light dark:text-text-dark mb-6">Edit My Profile</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
                <fieldset className="space-y-4 border p-4 rounded-md dark:border-gray-700">
                    <legend className="px-2 font-semibold text-lg text-text-light dark:text-text-dark">Personal Information</legend>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="name" className="block mb-1 font-medium text-text-light dark:text-text-dark">Full Name</label>
                            <input type="text" name="name" id="name" value={formData.name} onChange={handleTextChange} onBlur={handleTextBlur} required className="w-full p-2 rounded-md bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark border border-gray-300 dark:border-gray-600" />
                        </div>
                        <div>
                            <label htmlFor="email" className="block mb-1 font-medium text-text-light dark:text-text-dark">Email Address</label>
                            <input type="email" name="email" id="email" value={formData.email} readOnly className="w-full p-2 rounded-md bg-gray-100 dark:bg-gray-700/50 text-text-light dark:text-text-dark border border-gray-300 dark:border-gray-600 cursor-not-allowed" />
                        </div>
                        <div>
                            <label htmlFor="idNumber" className="block mb-1 font-medium text-text-light dark:text-text-dark">ID Number</label>
                            <input type="text" name="idNumber" id="idNumber" value={formData.idNumber || ''} onChange={handleTextChange} className="w-full p-2 rounded-md bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark border border-gray-300 dark:border-gray-600" />
                        </div>
                        <div>
                            <label htmlFor="phoneNumber" className="block mb-1 font-medium text-text-light dark:text-text-dark">Phone Number</label>
                            <input type="tel" name="phoneNumber" id="phoneNumber" value={formData.phoneNumber || ''} onChange={handleTextChange} className="w-full p-2 rounded-md bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark border border-gray-300 dark:border-gray-600" />
                        </div>
                    </div>
                </fieldset>
                
                <fieldset className="space-y-4 border p-4 rounded-md dark:border-gray-700">
                    <legend className="px-2 font-semibold text-lg text-text-light dark:text-text-dark">Professional Information</legend>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="tscNumber" className="block mb-1 font-medium text-text-light dark:text-text-dark">TSC Number</label>
                            <input type="text" name="tscNumber" id="tscNumber" value={formData.tscNumber || ''} onChange={handleTextChange} className="w-full p-2 rounded-md bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark border border-gray-300 dark:border-gray-600" />
                        </div>
                         <div>
                            <label htmlFor="subjects" className="block mb-1 font-medium text-text-light dark:text-text-dark">Teaching Subjects</label>
                            <input type="text" name="subjects" id="subjects" value={(formData.subjects || []).join(', ')} onChange={handleSubjectsChange} placeholder="e.g. Physics, Mathematics" className="w-full p-2 rounded-md bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark border border-gray-300 dark:border-gray-600" />
                        </div>
                    </div>
                </fieldset>

                <fieldset className="space-y-4 border p-4 rounded-md dark:border-gray-700">
                     <legend className="px-2 font-semibold text-lg text-text-light dark:text-text-dark">School & Location</legend>
                     <div>
                        <label htmlFor="school-input" className="block mb-1 font-medium text-text-light dark:text-text-dark">School Name</label>
                        <div className="relative">
                            <input
                                id="school-input"
                                type="text"
                                value={schoolInput}
                                onChange={handleSchoolInputChange}
                                onFocus={() => setIsSchoolDropdownOpen(true)}
                                onBlur={handleSchoolInputBlur}
                                placeholder="Type to search or add a new school"
                                autoComplete="off"
                                required
                                className="w-full p-2 rounded-md bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark border border-gray-300 dark:border-gray-600"
                            />
                            {isSchoolDropdownOpen && filteredSchools.length > 0 && (
                                <ul className="absolute z-10 w-full bg-card-light dark:bg-card-dark border dark:border-gray-600 rounded-md mt-1 max-h-48 overflow-y-auto shadow-lg">
                                    {(filteredSchools ?? []).map(school => (
                                        <li
                                            key={school}
                                            className="px-4 py-2 hover:bg-primary/10 cursor-pointer text-text-light dark:text-text-dark"
                                            onMouseDown={() => handleSchoolSelect(school)}
                                        >
                                            {school}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-4">
                         <div>
                            <label htmlFor="region" className="block mb-1 font-medium text-text-light dark:text-text-dark">Region</label>
                            <select name="region" id="region" value={formData.region || ''} onChange={handleGeoChange} required disabled={isGeoLocked} className="w-full p-2 rounded-md bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark border border-gray-300 dark:border-gray-600 disabled:opacity-70 disabled:cursor-not-allowed">
                                <option value="">Select Region</option>
                                {Object.keys(geographicalData).sort().map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="county" className="block mb-1 font-medium text-text-light dark:text-text-dark">County</label>
                            <select name="county" id="county" value={formData.county || ''} onChange={handleGeoChange} required disabled={isGeoLocked || !formData.region} className="w-full p-2 rounded-md bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark border border-gray-300 dark:border-gray-600 disabled:opacity-70 disabled:cursor-not-allowed">
                                <option value="">Select County</option>
                                {(counties ?? []).map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                         <div>
                            <label htmlFor="subCounty" className="block mb-1 font-medium text-text-light dark:text-text-dark">Sub-County</label>
                            <select name="subCounty" id="subCounty" value={formData.subCounty || ''} onChange={handleGeoChange} required disabled={isGeoLocked || !formData.county} className="w-full p-2 rounded-md bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark border border-gray-300 dark:border-gray-600 disabled:opacity-70 disabled:cursor-not-allowed">
                                <option value="">Select Sub-County</option>
                                {(subCounties ?? []).map(sc => <option key={sc} value={sc}>{sc}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="zone" className="block mb-1 font-medium text-text-light dark:text-text-dark">Zone</label>
                            <select name="zone" id="zone" value={selectedZone} onChange={handleZoneChange} required disabled={isGeoLocked || !formData.subCounty} className="w-full p-2 rounded-md bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark border border-gray-300 dark:border-gray-600 disabled:opacity-70 disabled:cursor-not-allowed">
                                <option value="">Select Zone</option>
                                {(zones ?? []).map(z => <option key={z} value={z}>{z}</option>)}
                                {!isGeoLocked && <option value="Other">-- Other (Please specify) --</option>}
                            </select>
                        </div>
                        {selectedZone === 'Other' && !isGeoLocked && (
                             <div className="md:col-span-2">
                                <label htmlFor="otherZoneName" className="block mb-1 font-medium text-text-light dark:text-text-dark">Specify Zone Name</label>
                                <input type="text" id="otherZoneName" value={otherZoneName} onChange={(e) => setOtherZoneName(e.target.value)} onBlur={(e) => setOtherZoneName(toTitleCase(e.target.value))} required placeholder="Enter zone name" className="w-full p-2 rounded-md bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark border border-gray-300 dark:border-gray-600" />
                            </div>
                        )}
                     </div>
                </fieldset>
                
                <div className="flex justify-end gap-4 pt-4">
                    <Button type="button" variant="ghost" onClick={() => navigate(-1)}>Cancel</Button>
                    <Button type="submit">Save Changes</Button>
                </div>
            </form>
        </Card>
    );
};

export default ProfilePage;
