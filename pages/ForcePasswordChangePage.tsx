
import React, { useState, useContext, FormEvent } from 'react';
import { Lock, Sun, Moon, KeyRound, Eye, EyeOff } from 'lucide-react';
import { AppContext } from '../context/AppContext';
import ToggleSwitch from '../components/ui/ToggleSwitch';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const ForcePasswordChangePage: React.FC = () => {
  const { user, theme, toggleTheme, changePassword, logout } = useContext(AppContext);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if(user) {
        setIsLoading(true);
        const { error: changeError } = await changePassword(user.id, newPassword);
        setIsLoading(false);
        
        if (changeError) {
          setError(changeError);
        } else {
            setSuccess('Password changed successfully! You will be logged out in 4 seconds. Please log in with your new credentials.');
            setTimeout(() => {
                logout(); // onAuthStateChange will redirect to /login
            }, 4000);
        }
    } else {
        setError('An unexpected error occurred. Please try logging in again.');
    }
  };
  
  const backgroundSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 810">
      <path fill="#0A192F" d="M0 0h1440v810H0z"/>
      <path fill-opacity="0.1" fill="#00A8E8" d="M366 181h-24v24h24v-24zm-12 120a12 12 0 1 1 0-24 12 12 0 0 1 0 24zm-48 108a12 12 0 1 1 0-24 12 12 0 0 1 0 24zm132-24a12 12 0 1 1 0-24 12 12 0 0 1 0 24zm-24-120a12 12 0 1 1 0-24 12 12 0 0 1 0 24zm5-137L226 72l-11 19 91 53zm-21 213l-91-53-11 19 91 53z M1082 625a12 12 0 1 1 0-24 12 12 0 0 1 0 24zm-48 108a12 12 0 1 1 0-24 12 12 0 0 1 0 24zm132-24a12 12 0 1 1 0-24 12 12 0 0 1 0 24zm-24-120a12 12 0 1 1 0-24 12 12 0 0 1 0 24z m108-84h-24v24h24v-24zm-12 120a12 12 0 1 1 0-24 12 12 0 0 1 0 24zm-48 108a12 12 0 1 1 0-24 12 12 0 0 1 0 24zm132-24a12 12 0 1 1 0-24 12 12 0 0 1 0 24zm-24-120a12 12 0 1 1 0-24 12 12 0 0 1 0 24zm5-137l-91-53-11 19 91 53zm-21 213l-91-53-11 19 91 53z"/>
    </svg>
  `;
  const bgUrl = `url("data:image/svg+xml,${encodeURIComponent(backgroundSvg)}")`;

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{backgroundImage: bgUrl, backgroundSize: 'cover'}}>
      <div className="w-full max-w-md">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-2xl font-bold text-white">Set Your New Password</h3>
                    <p className="text-gray-300">This is a one-time setup for security.</p>
                </div>
                 <div className="flex items-center space-x-2">
                    <Sun className="h-5 w-5 text-yellow-300" />
                    <ToggleSwitch checked={theme === 'dark'} onChange={toggleTheme} ariaLabel='Dark Mode Toggle' />
                    <Moon className="h-5 w-5 text-gray-400" />
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                {error && <p className="bg-red-500/50 text-white p-3 rounded-lg mb-4 text-sm">{error}</p>}
                {success && <p className="bg-green-500/50 text-white p-3 rounded-lg mb-4 text-sm">{success}</p>}
                <div className="relative mb-4">
                    <KeyRound className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" />
                    <input
                        type={showNewPassword ? 'text' : 'password'}
                        placeholder="New Password"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        className="w-full bg-white/20 text-white placeholder-gray-300 border-2 border-transparent focus:border-primary focus:ring-0 rounded-lg py-3 pl-12 pr-12 transition"
                        required
                        disabled={isLoading || !!success}
                    />
                    <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-white"
                        aria-label={showNewPassword ? "Hide password" : "Show password"}
                    >
                        {showNewPassword ? <EyeOff /> : <Eye />}
                    </button>
                </div>
                <div className="relative mb-6">
                    <Lock className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" />
                    <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Confirm New Password"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        className="w-full bg-white/20 text-white placeholder-gray-300 border-2 border-transparent focus:border-primary focus:ring-0 rounded-lg py-3 pl-12 pr-12 transition"
                        required
                        disabled={isLoading || !!success}
                    />
                    <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-white"
                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                        {showConfirmPassword ? <EyeOff /> : <Eye />}
                    </button>
                </div>
                 <Button type="submit" className="w-full flex items-center justify-center" disabled={isLoading || !!success}>
                    {isLoading ? <LoadingSpinner/> : 'Set Password & Continue'}
                </Button>
            </form>
        </div>
      </div>
    </div>
  );
};

export default ForcePasswordChangePage;
