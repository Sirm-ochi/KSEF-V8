import React, { useState, useContext, useMemo, FormEvent, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import { AppContext } from '../context/AppContext';
import { User, UserRole } from '../types';
import { UserPlus, Edit, Trash2, Settings, Search, AlertCircle, Info, KeyRound, Eye } from 'lucide-react';
import BulkAddAdminsModal from '../components/admin/BulkAddAdminsModal';
import BulkAddJudgesModal from '../components/admin/BulkAddJudgesModal';
import JudgeCategoryAssignmentModal from '../components/admin/JudgeCategoryAssignmentModal';
import JudgeAssignmentsViewModal from '../components/admin/JudgeAssignmentsViewModal'; // --- NEW IMPORT ---

const ADMIN_ROLES = [UserRole.SUPER_ADMIN, UserRole.NATIONAL_ADMIN, UserRole.REGIONAL_ADMIN, UserRole.COUNTY_ADMIN, UserRole.SUB_COUNTY_ADMIN];
const JUDGE_ROLES = [UserRole.JUDGE, UserRole.COORDINATOR];

const getCreatableRoles = (adminRole: UserRole): UserRole[] => {
    const roleHierarchy = [
        UserRole.SUPER_ADMIN, UserRole.NATIONAL_ADMIN, UserRole.REGIONAL_ADMIN,
        UserRole.COUNTY_ADMIN, UserRole.SUB_COUNTY_ADMIN, UserRole.COORDINATOR,
        UserRole.JUDGE, UserRole.PATRON
    ];
    const adminIndex = roleHierarchy.indexOf(adminRole);
    if (adminIndex === -1) return [];
    return roleHierarchy.slice(adminIndex + 1);
};

const toTitleCase = (str: string): string => {
  if (!str) return '';
  return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

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

// --- NEW, IMPROVED ADD/EDIT USER MODAL ---
const AddEditUserModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    userToEdit: User | null;
}> = ({ isOpen, onClose, userToEdit }) => {
    const { user: currentUser, users, addUserToList, updateUserInList, geographicalData } = useContext(AppContext);

    const [formData, setFormData] = useState<Partial<User>>({ roles: [] });
    const [validationError, setValidationError] = useState('');
    
    const creatableRoles = useMemo(() => currentUser ? getCreatableRoles(currentUser.currentRole) : [], [currentUser]);
    
    const isSelfEditing = useMemo(() => userToEdit && currentUser && userToEdit.id === currentUser.id, [userToEdit, currentUser]);

    // Determine the geographical scope and available options based on the logged-in admin.
    const { regionsForSelect, countiesForSelect, subCountiesForSelect, isRegionLocked, isCountyLocked, isSubCountyLocked } = useMemo(() => {
        if (!currentUser) return { regionsForSelect: [], countiesForSelect: [], subCountiesForSelect: [], isRegionLocked: true, isCountyLocked: true, isSubCountyLocked: true };
        
        let regions = Object.keys(geographicalData).sort();
        let counties: string[] = [];
        let subCounties: string[] = [];
        
        let regionLocked = false;
        let countyLocked = false;
        let subCountyLocked = false;

        switch(currentUser.currentRole) {
            case UserRole.REGIONAL_ADMIN:
                regions = currentUser.region ? [currentUser.region] : [];
                counties = formData.region ? Object.keys(geographicalData[formData.region] || {}).sort() : [];
                subCounties = (formData.region && formData.county) ? Object.keys(geographicalData[formData.region][formData.county] || {}).sort() : [];
                regionLocked = true;
                break;
            case UserRole.COUNTY_ADMIN:
                regions = currentUser.region ? [currentUser.region] : [];
                counties = currentUser.county ? [currentUser.county] : [];
                subCounties = (formData.region && formData.county) ? Object.keys(geographicalData[formData.region][formData.county] || {}).sort() : [];
                regionLocked = true;
                countyLocked = true;
                break;
            case UserRole.SUB_COUNTY_ADMIN:
                regions = currentUser.region ? [currentUser.region] : [];
                counties = currentUser.county ? [currentUser.county] : [];
                subCounties = currentUser.subCounty ? [currentUser.subCounty] : [];
                regionLocked = true;
                countyLocked = true;
                subCountyLocked = true;
                break;
            default: // National or Super Admin
                 counties = formData.region ? Object.keys(geographicalData[formData.region] || {}).sort() : [];
                 subCounties = (formData.region && formData.county) ? Object.keys(geographicalData[formData.region][formData.county] || {}).sort() : [];
        }

        return { 
            regionsForSelect: regions, 
            countiesForSelect: counties, 
            subCountiesForSelect: subCounties,
            isRegionLocked: regionLocked,
            isCountyLocked: countyLocked,
            isSubCountyLocked: subCountyLocked
        };
    }, [currentUser, geographicalData, formData.region, formData.county]);

    useEffect(() => {
        if (isOpen) {
            let initialData: Partial<User> = userToEdit || { roles: [], name: '', email: '' };

            // When adding a new user, pre-fill with the admin's scope
            if (!userToEdit && currentUser) {
                if (isRegionLocked) initialData.region = currentUser.region;
                if (isCountyLocked) initialData.county = currentUser.county;
                if (isSubCountyLocked) initialData.subCounty = currentUser.subCounty;
            }

            setFormData(initialData);
            setValidationError('');

        }
    }, [isOpen, userToEdit, currentUser, isRegionLocked, isCountyLocked, isSubCountyLocked]);

    // Real-time validation for role conflicts
    useEffect(() => {
        const roles = formData.roles || [];
        const hasAdminRole = roles.some(r => ADMIN_ROLES.includes(r));
        const hasJudgeRole = roles.some(r => JUDGE_ROLES.includes(r));
        
        let conflict = false;
        if (hasAdminRole && hasJudgeRole) {
            if (roles.includes(UserRole.REGIONAL_ADMIN) && formData.region) conflict = true;
            if (roles.includes(UserRole.COUNTY_ADMIN) && formData.county) conflict = true;
            if (roles.includes(UserRole.SUB_COUNTY_ADMIN) && formData.subCounty) conflict = true;
        }

        if (conflict) {
            setValidationError('A user cannot be an Admin and a Judge/Coordinator for the same geographical area.');
        } else {
            setValidationError('');
        }
    }, [formData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => {
            let newState = { ...prev, [name]: value };
            if (name === 'region') {
                newState = { ...newState, county: '', subCounty: '' };
            } else if (name === 'county') {
                newState = { ...newState, subCounty: '' };
            }
            return newState;
        });
    };

    const handleRoleChange = (role: UserRole, isChecked: boolean) => {
        setFormData(prev => {
            const currentRoles = prev.roles || [];
            const newRoles = isChecked
                ? [...currentRoles, role]
                : (currentRoles ?? []).filter(r => r !== role);
            return { ...prev, roles: newRoles };
        });
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (validationError) return;

        if (!formData.name || !formData.email || !formData.roles || formData.roles.length === 0) {
             setValidationError('Name, email, and at least one role are required.');
            return;
        }
        
        const isDuplicateEmail = users.some(u => u.email.toLowerCase() === formData.email?.toLowerCase() && u.id !== userToEdit?.id);
        if(isDuplicateEmail) {
            setValidationError('An account with this email already exists.');
            return;
        }

        const userPayload = { ...formData, name: toTitleCase(formData.name || '') };

        if (userToEdit) {
            updateUserInList(userPayload as User);
        } else {
            addUserToList(userPayload as Omit<User, 'id'>);
        }
        onClose();
    };
    
    if (!currentUser) return null;
    
    const showGeoFields = formData.roles && formData.roles.some(r => r !== UserRole.PATRON && r !== UserRole.NATIONAL_ADMIN && r !== UserRole.SUPER_ADMIN);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={userToEdit ? 'Edit User' : 'Add New User'} size="lg">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="name" className="block mb-1 font-medium text-text-light dark:text-text-dark">Full Name</label>
                    <input type="text" name="name" id="name" value={formData.name || ''} onChange={handleChange} required className="w-full p-2 rounded-md bg-background-light dark:bg-background-dark border border-gray-300 dark:border-gray-600" />
                </div>
                <div>
                    <label htmlFor="email" className="block mb-1 font-medium text-text-light dark:text-text-dark">Email Address</label>
                    <input type="email" name="email" id="email" value={formData.email || ''} onChange={handleChange} required className="w-full p-2 rounded-md bg-background-light dark:bg-background-dark border border-gray-300 dark:border-gray-600" />
                </div>
                <fieldset className="border dark:border-gray-700 p-3 rounded-md">
                    <legend className="px-1 text-sm font-medium text-text-light dark:text-text-dark">Roles *</legend>
                    {isSelfEditing && (
                        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 p-2 bg-blue-500/10 rounded-md text-sm mb-3">
                            <Info className="w-5 h-5 flex-shrink-0" />
                            <p>You cannot change your own roles, except for assigning yourself as a Patron.</p>
                        </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 mt-1">
                        {(creatableRoles ?? []).map(role => {
                            const isDisabled = isSelfEditing && role !== UserRole.PATRON;
                            return (
                                <div key={role} className={`flex items-center gap-2 ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                    <input
                                        type="checkbox"
                                        id={`role-${role}`}
                                        value={role}
                                        checked={(formData.roles || []).includes(role)}
                                        onChange={(e) => handleRoleChange(role, e.target.checked)}
                                        disabled={isDisabled}
                                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary disabled:cursor-not-allowed"
                                    />
                                    <label htmlFor={`role-${role}`} className="text-sm text-text-light dark:text-text-dark">
                                        {role}
                                    </label>
                                </div>
                            );
                        })}
                    </div>
                </fieldset>
                {showGeoFields && (
                     <fieldset className="border dark:border-gray-700 p-3 rounded-md">
                        <legend className="px-1 text-sm font-medium text-text-light dark:text-text-dark">Geographical Scope</legend>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                            <div>
                                <label htmlFor="region" className="block mb-1 text-sm text-text-light dark:text-text-dark">Region</label>
                                <select name="region" value={formData.region || ''} onChange={handleChange} disabled={isRegionLocked} className="w-full p-2 rounded-md bg-background-light dark:bg-background-dark border border-gray-300 dark:border-gray-600 disabled:opacity-70 disabled:cursor-not-allowed">
                                    <option value="">Select Region...</option>
                                    {(regionsForSelect ?? []).map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                            </div>
                             <div>
                                <label htmlFor="county" className="block mb-1 text-sm text-text-light dark:text-text-dark">County</label>
                                <select name="county" value={formData.county || ''} onChange={handleChange} disabled={isCountyLocked || !formData.region} className="w-full p-2 rounded-md bg-background-light dark:bg-background-dark border border-gray-300 dark:border-gray-600 disabled:opacity-70 disabled:cursor-not-allowed">
                                     <option value="">Select County...</option>
                                     {(countiesForSelect ?? []).map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="subCounty" className="block mb-1 text-sm text-text-light dark:text-text-dark">Sub-County</label>
                                <select name="subCounty" value={formData.subCounty || ''} onChange={handleChange} disabled={isSubCountyLocked || !formData.county} className="w-full p-2 rounded-md bg-background-light dark:bg-background-dark border border-gray-300 dark:border-gray-600 disabled:opacity-70 disabled:cursor-not-allowed">
                                    <option value="">Select Sub-County...</option>
                                    {(subCountiesForSelect ?? []).map(sc => <option key={sc} value={sc}>{sc}</option>)}
                                </select>
                            </div>
                        </div>
                    </fieldset>
                )}
                 {validationError && (
                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400 p-2 bg-red-500/10 rounded-md text-sm">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <p>{validationError}</p>
                    </div>
                 )}
                <div className="flex justify-end gap-4 pt-4">
                    <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button type="submit" disabled={!!validationError}>
                        {userToEdit ? 'Save Changes' : 'Create User'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};


const UserManagementPage: React.FC = () => {
    const { user: currentUser, users, deleteUserFromList } = useContext(AppContext);
    const location = useLocation();

    const [modalState, setModalState] = useState({
        addEdit: false,
        bulkAdmin: false,
        bulkJudge: false,
        assignment: false,
        confirmDelete: false,
        viewAssignments: false, // --- NEW STATE ---
    });
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [userToEdit, setUserToEdit] = useState<User | null>(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const filter = params.get('filter');
        if (filter) {
            setRoleFilter(filter.toUpperCase());
        }
    }, [location.search]);

    const scopedUsers = useMemo(() => {
        if (!currentUser) return [];

        const currentUserLevel = ROLE_HIERARCHY_MAP[currentUser.currentRole];

        return (users ?? []).filter(u => {
            if (u.id === currentUser.id) return true;

            let userHighestRoleLevel = Math.min(...u.(roles ?? []).map(r => ROLE_HIERARCHY_MAP[r]));
            if (userHighestRoleLevel < currentUserLevel) return false;
            
            // --- NEW LOGIC: Restrict visibility of sub-county scoped judges/coordinators ---
            const isSubCountyScopedJudgeOrCoordinator = u.subCounty && u.roles.some(r => [UserRole.JUDGE, UserRole.COORDINATOR].includes(r));
            if (isSubCountyScopedJudgeOrCoordinator) {
                // Only visible to their direct Sub-County Admin and Super Admin
                if (currentUser.currentRole === UserRole.SUB_COUNTY_ADMIN &&
                    currentUser.subCounty === u.subCounty &&
                    currentUser.county === u.county &&
                    currentUser.region === u.region) {
                    return true;
                }
                if (currentUser.currentRole === UserRole.SUPER_ADMIN) {
                    return true;
                }
                // Not visible to County, Regional, or National Admins
                return false;
            }
            // --- END NEW LOGIC ---

            // Geographical scope filtering for all other users
            switch (currentUser.currentRole) {
                case UserRole.SUPER_ADMIN:
                case UserRole.NATIONAL_ADMIN:
                    return true;
                case UserRole.REGIONAL_ADMIN:
                    return u.region === currentUser.region;
                case UserRole.COUNTY_ADMIN:
                    return u.county === currentUser.county && u.region === currentUser.region;
                case UserRole.SUB_COUNTY_ADMIN:
                    return u.subCounty === currentUser.subCounty && u.county === currentUser.county && u.region === currentUser.region;
                default:
                    return false;
            }
        });
    }, [currentUser, users]);

    const usersWithInitialPasswordsCount = useMemo(() => {
        return (scopedUsers ?? []).filter(u => !!u.initialPassword && u.id !== currentUser?.id).length;
    }, [scopedUsers, currentUser]);

    const filteredUsers = useMemo(() => {
        return (scopedUsers ?? []).filter(u => {
            const searchMatch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase());
            const roleMatch = (() => {
                if (!roleFilter || roleFilter === 'ALL') return true;
                if (roleFilter === 'ADMINS') return u.roles.some(r => ADMIN_ROLES.includes(r));
                if (roleFilter === 'JUDGES') return u.roles.some(r => JUDGE_ROLES.includes(r));
                if (roleFilter === 'PATRONS') return u.roles.includes(UserRole.PATRON);
                return u.roles.includes(roleFilter as UserRole);
            })();
            return searchMatch && roleMatch;
        });
    }, [scopedUsers, searchTerm, roleFilter]);
    
    const handleOpenModal = (modal: keyof typeof modalState, user?: User | null) => {
        setSelectedUser(user || null);
        setUserToEdit(modal === 'addEdit' && user ? user : null);
        setModalState(prev => ({ ...prev, [modal]: true }));
    };

    const handleCloseModal = (modal: keyof typeof modalState) => {
        setModalState(prev => ({ ...prev, [modal]: false }));
        setSelectedUser(null);
        setUserToEdit(null);
    };

    const handleConfirmDelete = () => {
        if (selectedUser) {
            deleteUserFromList(selectedUser.id);
        }
        handleCloseModal('confirmDelete');
    };

    if (!currentUser) return null;

    const creatableRoles = getCreatableRoles(currentUser.currentRole);
    
    const canCreateAdmins = creatableRoles.some(r => ADMIN_ROLES.includes(r));
    const canCreateJudges = creatableRoles.includes(UserRole.JUDGE);

    return (
        <div className="space-y-6">
            <Card>
                <div className="flex flex-wrap justify-between items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-text-light dark:text-text-dark">User Management</h1>
                        <p className="text-text-muted-light dark:text-text-muted-dark">Add, edit, and manage users within your jurisdiction.</p>
                    </div>
                     <div className="flex gap-2 flex-wrap">
                        <Button onClick={() => handleOpenModal('addEdit')} className="flex items-center gap-2"><UserPlus className="w-4 h-4" /> Add User</Button>
                        {canCreateAdmins && <Button variant="secondary" onClick={() => handleOpenModal('bulkAdmin')}>Bulk Add Admins</Button>}
                        {canCreateJudges && <Button variant="secondary" onClick={() => handleOpenModal('bulkJudge')}>Bulk Add Judges</Button>}
                    </div>
                </div>
            </Card>

            {usersWithInitialPasswordsCount > 0 && (
                <Card className="bg-blue-50 dark:bg-blue-900/30 border border-blue-400">
                    <div className="flex flex-wrap justify-between items-center gap-4">
                        <div className="flex items-center gap-3">
                            <KeyRound className="w-8 h-8 text-blue-500" />
                            <div>
                                <h3 className="font-semibold text-blue-800 dark:text-blue-200">
                                    {usersWithInitialPasswordsCount} New User Credential{usersWithInitialPasswordsCount > 1 ? 's' : ''} Ready
                                </h3>
                                <p className="text-sm text-blue-700 dark:text-blue-400">
                                    Share the temporary passwords with new users who haven't received their welcome email.
                                </p>
                            </div>
                        </div>
                        <Link to="/initial-passwords">
                            <Button variant="secondary">View Passwords</Button>
                        </Link>
                    </div>
                </Card>
            )}

            <Card>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full p-2 pl-10 rounded-md bg-background-light dark:bg-background-dark border border-gray-300 dark:border-gray-600"
                        />
                    </div>
                     <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="w-full p-2 rounded-md bg-background-light dark:bg-background-dark border border-gray-300 dark:border-gray-600"
                    >
                        <option value="ALL">All Roles</option>
                        <option value="ADMINS">All Administrators</option>
                        <option value="JUDGES">Judges & Coordinators</option>
                        <option value="PATRONS">Patrons</option>
                    </select>
                </div>
                 <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-text-muted-light dark:text-text-muted-dark uppercase bg-gray-50 dark:bg-gray-700">
                             <tr>
                                <th className="px-4 py-3">Name</th>
                                <th className="px-4 py-3">Email</th>
                                <th className="px-4 py-3">Roles</th>
                                <th className="px-4 py-3">Scope</th>
                                <th className="px-4 py-3 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(filteredUsers ?? []).map(user => {
                                const scope = [user.region, user.county, user.subCounty].filter(Boolean).join(' > ') || 'National';
                                const isJudgeOrCoordinator = user.roles.some(r => JUDGE_ROLES.includes(r));
                                return (
                                    <tr key={user.id} className="border-b dark:border-gray-700">
                                        <td className="px-4 py-3 font-medium text-text-light dark:text-text-dark">{user.name}</td>
                                        <td className="px-4 py-3 text-text-light dark:text-text-dark">{user.email}</td>
                                        <td className="px-4 py-3 text-text-light dark:text-text-dark">{user.roles.join(', ')}</td>
                                        <td className="px-4 py-3 text-text-light dark:text-text-dark">{scope}</td>
                                        <td className="px-4 py-3 flex items-center justify-center gap-1">
                                            {isJudgeOrCoordinator && (
                                                <>
                                                    <Button variant="ghost" size="sm" onClick={() => handleOpenModal('viewAssignments', user)} title="View Assignments">
                                                        <Eye className="w-4 h-4 text-green-500"/>
                                                    </Button>
                                                    <Button variant="ghost" size="sm" onClick={() => handleOpenModal('assignment', user)} title="Manage Assignments">
                                                        <Settings className="w-4 h-4"/>
                                                    </Button>
                                                </>
                                            )}
                                            <Button variant="ghost" size="sm" onClick={() => handleOpenModal('addEdit', user)} title="Edit User">
                                                <Edit className="w-4 h-4 text-blue-500"/>
                                            </Button>
                                            {user.id !== currentUser.id && (
                                                <Button variant="ghost" size="sm" onClick={() => handleOpenModal('confirmDelete', user)} title="Delete User">
                                                    <Trash2 className="w-4 h-4 text-red-500"/>
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>

            <AddEditUserModal isOpen={modalState.addEdit} onClose={() => handleCloseModal('addEdit')} userToEdit={userToEdit} />
            
            <BulkAddAdminsModal isOpen={modalState.bulkAdmin} onClose={() => handleCloseModal('bulkAdmin')} />
            
            {currentUser && <BulkAddJudgesModal isOpen={modalState.bulkJudge} onClose={() => handleCloseModal('bulkJudge')} adminUser={currentUser} />}

            {selectedUser && (
                <>
                    <JudgeCategoryAssignmentModal isOpen={modalState.assignment} onClose={() => handleCloseModal('assignment')} judge={selectedUser} />
                    <JudgeAssignmentsViewModal isOpen={modalState.viewAssignments} onClose={() => handleCloseModal('viewAssignments')} judge={selectedUser} />
                    <ConfirmationModal
                        isOpen={modalState.confirmDelete}
                        onClose={() => handleCloseModal('confirmDelete')}
                        onConfirm={handleConfirmDelete}
                        title="Delete User"
                    >
                        Are you sure you want to delete {selectedUser.name}? This action cannot be undone.
                    </ConfirmationModal>
                </>
            )}
        </div>
    );
};

export default UserManagementPage;