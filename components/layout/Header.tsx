import React, { useContext, useState, useRef, useEffect } from 'react';
import { Sun, Moon, LogOut, User as UserIcon, ChevronsUpDown, Check, Bell, CheckCheck } from 'lucide-react';
import { AppContext } from '../../context/AppContext';
import ToggleSwitch from '../ui/ToggleSwitch';
import { UserRole, AuditLog } from '../../types';

interface HeaderProps {
    toggleSidebar: () => void;
}

// Helper to format time since an event
const timeSince = (date: Date): string => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return Math.floor(seconds) + " seconds ago";
};


const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
  const { user, theme, toggleTheme, logout, switchRole, auditLogs, markAuditLogAsRead, markAllAuditLogsAsRead } = useContext(AppContext);
  const [isRoleSwitcherOpen, setRoleSwitcherOpen] = useState(false);
  const [isNotificationsOpen, setNotificationsOpen] = useState(false);
  
  const roleSwitcherRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  const myNotifications = React.useMemo(() => {
    if (!user) return [];
    
    const notifications = auditLogs?.filter(log => {
        // Direct notification for a specific user (e.g., judges, coordinators)
        if (log.notifiedUserId && log.notifiedUserId === user.id) {
            return true;
        }

        // Existing role-based notification for admins
        if (log.notifiedAdminRole && log.notifiedAdminRole === user.currentRole) {
            switch (user.currentRole) {
                case UserRole.REGIONAL_ADMIN:
                    return log.scope?.region === user.region;
                case UserRole.COUNTY_ADMIN:
                    return log.scope?.region === user.region && log.scope?.county === user.county;
                case UserRole.NATIONAL_ADMIN:
                case UserRole.SUPER_ADMIN:
                    return true;
                default:
                    return false;
            }
        }

        return false;
    });

    // The logs are already sorted by timestamp from the context
    return notifications;
  }, [user, auditLogs]);
  
  const unreadCount = myNotifications?.filter(n => !n.isRead).length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (roleSwitcherRef.current && !roleSwitcherRef.current.contains(event.target as Node)) {
        setRoleSwitcherOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getAdminTitle = () => {
    if (!user) return null;
    switch (user.currentRole) {
      case UserRole.NATIONAL_ADMIN: return 'NATIONAL PORTAL';
      case UserRole.REGIONAL_ADMIN: return user.region ? `${user.region} REGION` : null;
      case UserRole.COUNTY_ADMIN: return user.county ? `${user.county} COUNTY` : null;
      case UserRole.SUB_COUNTY_ADMIN: return user.subCounty ? `${user.subCounty} SUB-COUNTY` : null;
      default: return null;
    }
  };

  const adminTitle = getAdminTitle();
  const patronSchool = user?.currentRole === UserRole.PATRON && user.school ? user.school : null;

  const handleRoleChange = (role: UserRole) => {
    switchRole(role);
    setRoleSwitcherOpen(false);
  };

  const handleNotificationClick = (log: AuditLog) => {
    if (!log.isRead) {
        markAuditLogAsRead(log.id);
    }
    // Optional: could navigate to a relevant page, e.g., /users/log.targetUserId
  };

  return (
    <header className="sticky top-0 z-30 bg-card-light/80 dark:bg-card-dark/80 backdrop-blur-lg shadow-sm">
      <div className="flex items-center justify-between h-16 px-4 md:px-6">
        <div className="flex items-center">
            <button onClick={toggleSidebar} className="md:hidden mr-4 text-text-light dark:text-text-dark">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
            </button>
            <div className="hidden sm:flex items-center gap-3">
                <h1 className="text-xl font-bold text-secondary dark:text-accent-green">
                  KSEF 2026 Portal
                </h1>
                {adminTitle && (
                    <span className="text-lg font-semibold text-primary uppercase tracking-wide border-l-2 border-gray-300 dark:border-gray-600 pl-3">
                        {adminTitle}
                    </span>
                )}
                {patronSchool && (
                    <span className="text-lg font-semibold text-primary uppercase tracking-wide border-l-2 border-gray-300 dark:border-gray-600 pl-3">
                        {patronSchool}
                    </span>
                )}
            </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Sun className="h-5 w-5 text-yellow-500" />
            <ToggleSwitch
              checked={theme === 'dark'}
              onChange={toggleTheme}
              ariaLabel="Toggle dark mode"
            />
            <Moon className="h-5 w-5 text-gray-400" />
          </div>

          <div className="relative" ref={notificationsRef}>
            <button onClick={() => setNotificationsOpen(prev => !prev)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
              <Bell className="h-5 w-5 text-text-light dark:text-text-dark" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-white text-xs items-center justify-center">{unreadCount}</span>
                </span>
              )}
            </button>
            {isNotificationsOpen && (
                <div className="absolute top-full right-0 mt-2 w-80 bg-card-light dark:bg-card-dark border dark:border-gray-700 rounded-md shadow-lg z-50">
                    <div className="p-3 flex justify-between items-center border-b dark:border-gray-700">
                        <h4 className="font-semibold text-sm">Notifications</h4>
                        {unreadCount > 0 && <button onClick={markAllAuditLogsAsRead} className="text-xs text-primary hover:underline flex items-center gap-1"><CheckCheck size={14}/>Mark all as read</button>}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                        {myNotifications.length > 0 ? myNotifications.slice(0, 10).map(log => (
                           <div key={log.id} onClick={() => handleNotificationClick(log)} className={`p-3 border-b dark:border-gray-700 last:border-b-0 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer ${!log.isRead ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                               <p className="text-sm font-medium">{log.action}</p>
                               <p className="text-xs text-text-muted-light dark:text-text-muted-dark mt-1">{log.performingAdminName} • {timeSince(new Date(log.timestamp))}</p>
                           </div>
                        )) : (
                            <p className="p-4 text-center text-sm text-text-muted-light dark:text-text-muted-dark">No new notifications.</p>
                        )}
                    </div>
                </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-gray-200 dark:bg-secondary rounded-full">
              <UserIcon className="h-5 w-5 text-secondary dark:text-white" />
            </div>
            <div className="hidden md:block">
              <p className="font-semibold text-text-light dark:text-text-dark text-sm">Welcome, {user?.name.split(' ')[0]}</p>
              <div className="relative" ref={roleSwitcherRef}>
                <button 
                    className="text-xs text-text-muted-light dark:text-text-muted-dark flex items-center gap-1 hover:text-primary transition-colors"
                    onClick={() => user && user.roles.length > 1 && setRoleSwitcherOpen(!isRoleSwitcherOpen)}
                    disabled={!user || user.roles.length <= 1}
                >
                    {user?.currentRole}
                    {user && user.roles.length > 1 && <ChevronsUpDown className="w-3 h-3" />}
                </button>
                {isRoleSwitcherOpen && user && user.roles.length > 1 && (
                    <div className="absolute top-full mt-2 w-48 bg-card-light dark:bg-card-dark border dark:border-gray-700 rounded-md shadow-lg z-50">
                        {user.(roles ?? []).map(role => (
                            <button
                                key={role}
                                onClick={() => handleRoleChange(role)}
                                className="w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                                {role}
                                {user.currentRole === role && <Check className="w-4 h-4 text-primary" />}
                            </button>
                        ))}
                    </div>
                )}
              </div>
            </div>
          </div>

          <button onClick={logout} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
            <LogOut className="h-5 w-5 text-red-500" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;