import React, { useState, useContext, useEffect, FormEvent, useMemo } from 'react';
import { AppContext } from '../../context/AppContext';
import Button from '../ui/Button';
import { SchoolLocation, User } from '../../types';

interface CompleteProfileModalProps {
    isOpen: boolean;
    onSave: (updatedUser: User) => void;
    isForced?: boolean;
}

// Helper function to format strings to Title Case
const toTitleCase = (str: string): string => {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const CompleteProfileModal: React.FC<CompleteProfileModalProps> = ({ isOpen, onSave, isForced = false }) => {
    const { user, schoolData, addSchoolData, geographicalData } = useContext(AppContext);

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
            let d = { ...prev, [name]: value };
            if (name === 'region') {
                d = {...d, county: '', subCounty: '', zone: ''};
                setCounties(Object.keys(geographicalData[value] || {}).sort());
                setSubCounties([]); setZones([]); setSelectedZone('');
            } else if (name === 'county') {
                d = {...d, subCounty: '', zone: ''};
                if (d.region) setSubCounties(Object.keys(geographicalData[d.region]?.[value] || {}).sort());
                setZones([]); setSelectedZone('');
            } else if (name === 'subCounty') {
                d = {...d, zone: ''};
                if (d.region && d.county) {
                     const staticZones = geographicalData[d.region]?.[d.county]?.[value] || [];
                    const dynamicZones = schoolData
                        .filter(s => s.region === d.region && s.county === d.county && s.subCounty === value)
                        .map(s => s.zone);
                    const allZones = [...new Set([...staticZones, ...dynamicZones])].sort();
                    setZones(allZones);
                }
                setSelectedZone('');
            }
            return d;
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
        onSave(updatedUser);
    };

    if (!isOpen || !formData) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
            <div className="bg-card-light dark:bg-card-dark rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="p-4 border-b dark:border-gray-700 flex-shrink-0">
                    <h2 className="text-xl font-bold text-secondary dark:text-accent-green">Complete Your Profile</h2>
                    <p className="text-sm text-text-muted-light dark:text-text-muted-dark">Please provide your details to continue.</p>
                </div>
                <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-6">
                    <fieldset className="space-y-4 border p-4 rounded-md dark:border-gray-700">
                        <legend className="px-2 font-semibold text-lg text-text-light dark:text-text-dark">Personal Information</legend>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="name" className="block mb-1 font-medium text-text-light dark:text-text-dark">Full Name</label>
                                <input type="text" name="name" id="name" value={formData.name || ''} onChange={handleTextChange} onBlur={handleTextBlur} required className="w-full p-2 rounded-md bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark border border-gray-300 dark:border-gray-600" />
                            </div>
                             <div>
                                <label htmlFor="idNumber" className="block mb-1 font-medium text-text-light dark:text-text-dark">ID Number</label>
                                <input type="text" name="idNumber" id="idNumber" value={formData.idNumber || ''} onChange={handleTextChange} required className="w-full p-2 rounded-md bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark border border-gray-300 dark:border-gray-600" />
                            </div>
                            <div>
                                <label htmlFor="tscNumber" className="block mb-1 font-medium text-text-light dark:text-text-dark">TSC/Service Number</label>
                                <input type="text" name="tscNumber" id="tscNumber" value={formData.tscNumber || ''} onChange={handleTextChange} required className="w-full p-2 rounded-md bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark border border-gray-300 dark:border-gray-600" />
                            </div>
                            <div>
                                <label htmlFor="phoneNumber" className="block mb-1 font-medium text-text-light dark:text-text-dark">Phone Number</label>
                                <input type="tel" name="phoneNumber" id="phoneNumber" value={formData.phoneNumber || ''} onChange={handleTextChange} required className="w-full p-2 rounded-md bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark border border-gray-300 dark:border-gray-600" />
                            </div>
                        </div>
                    </fieldset>

                    <fieldset className="space-y-4 border p-4 rounded-md dark:border-gray-700">
                        <legend className="px-2 font-semibold text-lg text-text-light dark:text-text-dark">School & Location</legend>
                        <div>
                            <label htmlFor="school-input" className="block mb-1 font-medium text-text-light dark:text-text-dark">School/Institution Name</label>
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
                    <div className="flex justify-end pt-4">
                        <Button type="submit">Save and Continue</Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CompleteProfileModal;
