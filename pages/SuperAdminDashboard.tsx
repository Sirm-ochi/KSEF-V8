
import React from 'react';
import { Users, KeyRound, ShieldCheck } from 'lucide-react';
import Card from '../components/ui/Card';
// FIX: Replaced namespace import for react-router-dom with a named import to resolve module export errors.
import { Link } from 'react-router-dom';

const SuperAdminDashboard: React.FC = () => {
    return (
        <div className="space-y-6">
            <Card>
                <div className="flex items-center gap-4">
                    <ShieldCheck className="w-12 h-12 text-primary" />
                    <div>
                        <h1 className="text-3xl font-bold text-text-light dark:text-text-dark">Super Administrator Panel</h1>
                        <p className="text-text-muted-light dark:text-text-muted-dark mt-1">
                            Platform management and user administration tools.
                        </p>
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* FIX: Replaced ReactRouterDOM.Link with Link from named import. */}
                <Link to="/users">
                    <Card className="hover:shadow-lg transition-shadow duration-300 h-full">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary/10 rounded-lg">
                                <Users className="w-8 h-8 text-primary" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-text-light dark:text-text-dark">User Management</h2>
                                <p className="text-text-muted-light dark:text-text-muted-dark text-sm mt-1">Add, edit, or remove any user on the platform.</p>
                            </div>
                        </div>
                    </Card>
                </Link>
                {/* FIX: Replaced ReactRouterDOM.Link with Link from named import. */}
                <Link to="/initial-passwords">
                     <Card className="hover:shadow-lg transition-shadow duration-300 h-full">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-secondary/10 rounded-lg">
                                <KeyRound className="w-8 h-8 text-secondary" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-text-light dark:text-text-dark">User Passwords</h2>
                                <p className="text-text-muted-light dark:text-text-muted-dark text-sm mt-1">View temporary passwords for new users.</p>
                            </div>
                        </div>
                    </Card>
                </Link>
            </div>
             <Card>
                <h2 className="text-xl font-bold text-text-light dark:text-text-dark">Platform Overview</h2>
                 <p className="text-text-muted-light dark:text-text-muted-dark mt-2">
                    As the Super Administrator, you have the highest level of access. Your primary responsibilities include:
                </p>
                <ul className="list-disc list-inside mt-2 text-text-muted-light dark:text-text-muted-dark space-y-1">
                    <li>Creating and managing National Administrator accounts.</li>
                    <li>Overseeing the entire user hierarchy.</li>
                    <li>Troubleshooting system-level issues.</li>
                    <li>Ensuring the platform's smooth operation.</li>
                </ul>
                <p className="text-text-muted-light dark:text-text-muted-dark mt-2">
                    Project management, judging, and reporting functions are handled by lower-level administrators.
                </p>
            </Card>
        </div>
    );
};

export default SuperAdminDashboard;
