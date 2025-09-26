
import React, { useContext } from 'react';
// FIX: Replaced namespace import for react-router-dom with a named import to resolve module export errors.
import { Link } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import Button from '../components/ui/Button';
import { FileUp, BarChart2, ShieldCheck, Award, UserPlus, ClipboardList, Users as UsersIcon, Sun, Moon, Check, School, UserCog, CheckCircle } from 'lucide-react';
import ToggleSwitch from '../components/ui/ToggleSwitch';
import Card from '../components/ui/Card';
import Logo from '../components/ui/Logo';

// Add animations to the document head
const style = document.createElement('style');
style.textContent = `
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes slide-up {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
.animate-fade-in {
  animation: fade-in 0.6s ease-out forwards;
}
.animate-slide-up {
  animation: slide-up 0.6s ease-out forwards;
}
`;
document.head.appendChild(style);


const LandingPageHeader: React.FC = () => {
    const { theme, toggleTheme } = useContext(AppContext);
    return (
        <header className="absolute top-0 left-0 right-0 z-20 p-4 bg-transparent">
            <div className="container mx-auto flex justify-between items-center">
                {/* FIX: Replaced ReactRouterDOM.Link with Link from named import. */}
                <Link to="/" className="flex items-center gap-3">
                    <div className="bg-white p-1 rounded-lg">
                        <Logo width={32} height={32} />
                    </div>
                    <span className="font-bold text-xl text-white tracking-wider">KSEF</span>
                </Link>
                <div className="flex items-center gap-4">
                    <div className="hidden sm:flex items-center space-x-2">
                        <Sun className="h-5 w-5 text-yellow-300" />
                        <ToggleSwitch checked={theme === 'dark'} onChange={toggleTheme} ariaLabel="Toggle theme" />
                        <Moon className="h-5 w-5 text-gray-400" />
                    </div>
                    {/* FIX: Replaced ReactRouterDOM.Link with Link from named import. */}
                    <Link to="/login">
                        <Button variant="ghost" className="text-white hover:bg-white/20 hidden md:inline-flex">Login</Button>
                    </Link>
                    {/* FIX: Replaced ReactRouterDOM.Link with Link from named import. */}
                    <Link to="/signup">
                        <Button className="bg-accent-green text-secondary hover:bg-opacity-80">Create Account</Button>
                    </Link>
                </div>
            </div>
        </header>
    );
};

const FeatureCard: React.FC<{ icon: React.ReactNode, title: string, description: string }> = ({ icon, title, description }) => (
    <Card className="text-center flex flex-col items-center transition-transform transform hover:-translate-y-2 duration-300">
        <div className="p-4 bg-primary/10 rounded-full text-primary mb-4">{icon}</div>
        <h3 className="text-xl font-bold mb-2 text-text-light dark:text-text-dark">{title}</h3>
        <p className="text-text-muted-light dark:text-text-muted-dark flex-grow">{description}</p>
    </Card>
);

const Step: React.FC<{ icon: React.ReactNode, title: string, description: string, stepNumber: number }> = ({ icon, title, description, stepNumber }) => (
    <div className="flex items-start gap-6">
        <div className="relative flex flex-col items-center">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-secondary text-white font-bold text-2xl z-10 ring-4 ring-background-light dark:ring-card-dark">{stepNumber}</div>
            <div className="absolute top-16 w-0.5 h-full bg-gray-300 dark:bg-gray-700"></div>
        </div>
        <div className="pt-4">
            <div className="flex items-center gap-3 mb-2">
                <span className="text-primary">{icon}</span>
                <h4 className="text-xl font-semibold text-text-light dark:text-text-dark">{title}</h4>
            </div>
            <p className="text-text-muted-light dark:text-text-muted-dark">{description}</p>
        </div>
    </div>
);


const LandingPage: React.FC = () => {
    const heroBgStyle = {
        backgroundImage: `linear-gradient(rgba(10, 25, 47, 0.8), rgba(10, 25, 47, 0.95)), url('https://images.unsplash.com/photo-1616463920342-f6155452a201?q=80&w=1932&auto=format&fit=crop')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
    };

    return (
        <div className="bg-background-light dark:bg-background-dark">
            <LandingPageHeader />

            {/* Hero Section */}
            <section className="relative min-h-screen flex items-center justify-center text-white text-center p-4 overflow-hidden" style={heroBgStyle}>
                <div className="relative z-10 max-w-4xl mx-auto">
                    <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight animate-slide-up">
                        <span className="block">Empowering Innovation</span>
                        <span className="block text-accent-green mt-2">Judge the Future of Kenyan Science</span>
                    </h1>
                    <p className="mt-6 max-w-2xl mx-auto text-lg md:text-xl text-gray-300 animate-slide-up" style={{ animationDelay: '0.2s' }}>
                        Welcome to the official online platform for the Kenya Science and Engineering Fair. Your expertise shapes the next generation of innovators.
                    </p>
                    <div className="mt-8 flex justify-center gap-4 animate-fade-in" style={{ animationDelay: '0.4s' }}>
                        {/* FIX: Replaced ReactRouterDOM.Link with Link from named import. */}
                        <Link to="/signup">
                            <Button size="lg" className="bg-accent-green text-secondary hover:bg-opacity-80">
                                Get Started
                            </Button>
                        </Link>
                         {/* FIX: Replaced ReactRouterDOM.Link with Link from named import. */}
                         <Link to="/login">
                            <Button size="lg" variant="ghost" className="text-white border-2 border-white hover:bg-white/20">
                                Enter Judging Portal
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>

            {/* Advantages Section */}
            <section className="py-20 px-4">
                <div className="container mx-auto">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <span className="text-primary font-semibold uppercase tracking-wider">A Seamless Experience</span>
                        <h2 className="text-4xl font-bold mt-2 mb-4 text-text-light dark:text-text-dark">Powerful Impact, Intuitive Platform</h2>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        <FeatureCard icon={<ClipboardList size={32} />} title="Intuitive Interface" description="Navigate through with ease, access judging criteria, and submit your evaluations effortlessly." />
                        <FeatureCard icon={<FileUp size={32} />} title="Comprehensive Details" description="Review detailed project summaries, videos, and presentations all in one place." />
                        <FeatureCard icon={<CheckCircle size={32} />} title="Impactful Feedback" description="Constructive feedback helps to grow, inspires future scientific endeavors." />
                    </div>
                </div>
            </section>
            
            {/* For Everyone Section */}
            <section className="py-20 px-4 bg-gray-100 dark:bg-card-dark">
                <div className="container mx-auto">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <span className="text-primary font-semibold uppercase tracking-wider">Built for Everyone</span>
                        <h2 className="text-4xl font-bold mt-2 mb-4 text-text-light dark:text-text-dark">Tailored for Every Role</h2>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8">
                        <Card className="p-8">
                            <School size={32} className="text-primary mb-4" />
                            <h3 className="text-2xl font-bold mb-3">For Patrons</h3>
                            <ul className="space-y-2 text-text-muted-light dark:text-text-muted-dark">
                                <li className="flex gap-2"><Check size={18} className="text-green-500 mt-1 flex-shrink-0" /><span>Effortless project registration.</span></li>
                                <li className="flex gap-2"><Check size={18} className="text-green-500 mt-1 flex-shrink-0" /><span>Track judging status in real-time.</span></li>
                                <li className="flex gap-2"><Check size={18} className="text-green-500 mt-1 flex-shrink-0" /><span>Access final scores and rankings.</span></li>
                            </ul>
                        </Card>
                        <Card className="p-8">
                            <UsersIcon size={32} className="text-primary mb-4" />
                            <h3 className="text-2xl font-bold mb-3">For Judges</h3>
                            <ul className="space-y-2 text-text-muted-light dark:text-text-muted-dark">
                                <li className="flex gap-2"><Check size={18} className="text-green-500 mt-1 flex-shrink-0" /><span>Access assigned projects online.</span></li>
                                <li className="flex gap-2"><Check size={18} className="text-green-500 mt-1 flex-shrink-0" /><span>Use a standardized digital scoresheet.</span></li>
                                <li className="flex gap-2"><Check size={18} className="text-green-500 mt-1 flex-shrink-0" /><span>View marking guides and resources.</span></li>
                            </ul>
                        </Card>
                        <Card className="p-8">
                             <UserCog size={32} className="text-primary mb-4" />
                            <h3 className="text-2xl font-bold mb-3">For Administrators</h3>
                            <ul className="space-y-2 text-text-muted-light dark:text-text-muted-dark">
                                <li className="flex gap-2"><Check size={18} className="text-green-500 mt-1 flex-shrink-0" /><span>Hierarchical user and project management.</span></li>
                                <li className="flex gap-2"><Check size={18} className="text-green-500 mt-1 flex-shrink-0" /><span>Automated ranking and broadsheet generation.</span></li>
                                <li className="flex gap-2"><Check size={18} className="text-green-500 mt-1 flex-shrink-0" /><span>Monitor progress across all competition levels.</span></li>
                            </ul>
                        </Card>
                    </div>
                </div>
            </section>

            {/* How It Works Section */}
            <section className="py-20 px-4">
                <div className="container mx-auto">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                         <span className="text-primary font-semibold uppercase tracking-wider">Our Process</span>
                        <h2 className="text-4xl font-bold mt-2 mb-4 text-text-light dark:text-text-dark">Simple Steps to Success</h2>
                    </div>
                    <div className="max-w-md mx-auto">
                       <Step icon={<UserPlus size={28} />} title="Patron Sign-Up" description="School patrons create a secure account to get started on the platform." stepNumber={1} />
                       <Step icon={<ClipboardList size={28} />} title="Project Submission" description="Patrons register their students' innovative projects before the official deadline." stepNumber={2} />
                       <Step icon={<UsersIcon size={28} />} title="Judging Process" description="Assigned judges evaluate projects using the official KSEF digital marking guide." stepNumber={3} />
                       <div className="flex items-start gap-6">
                          <div className="relative flex flex-col items-center">
                              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-secondary text-white font-bold text-2xl z-10 ring-4 ring-background-light dark:ring-card-dark">4</div>
                          </div>
                          <div className="pt-4">
                              <div className="flex items-center gap-3 mb-2">
                                  <span className="text-primary"><Award size={28} /></span>
                                  <h4 className="text-xl font-semibold text-text-light dark:text-text-dark">Results & Rankings</h4>
                              </div>
                              <p className="text-text-muted-light dark:text-text-muted-dark">Results are automatically calculated, and rankings are generated for all levels of the fair, from zone to national.</p>
                          </div>
                      </div>
                    </div>
                </div>
            </section>
            
            {/* CTA Section */}
            <section className="py-20 px-4">
                 <div className="container mx-auto">
                    <div className="relative rounded-xl p-10 md:p-16 text-center text-white overflow-hidden bg-gradient-to-r from-primary to-secondary">
                        <h2 className="text-4xl font-bold mb-4">Ready to Shape the Future of Science in Kenya?</h2>
                        <p className="max-w-2xl mx-auto text-lg text-gray-200 mb-8">Join the KSEF platform today and be part of a revolutionary step forward for science and engineering fairs in the nation.</p>
                        <div className="flex justify-center gap-4">
                            {/* FIX: Replaced ReactRouterDOM.Link with Link from named import. */}
                            <Link to="/signup">
                                <Button size="lg" className="bg-accent-green text-secondary hover:bg-opacity-80">
                                    Get Started Now
                                </Button>
                            </Link>
                             {/* FIX: Replaced ReactRouterDOM.Link with Link from named import. */}
                             <Link to="/login">
                                <Button size="lg" variant="ghost" className="text-white border-2 border-white hover:bg-white/20">
                                    Login
                                </Button>
                            </Link>
                        </div>
                    </div>
                 </div>
            </section>


            {/* Footer */}
            <footer className="bg-secondary text-white py-8 px-4">
                <div className="container mx-auto text-center text-gray-400">
                    <div className="flex justify-center items-center gap-2 mb-4">
                        <div className="bg-white p-1 rounded-md">
                            <Logo width={24} height={24} />
                        </div>
                        <span className="font-semibold text-white">KSEF Online Platform</span>
                    </div>
                    <p>&copy; {new Date().getFullYear()} Ministry of Education | Kenya Science and Engineering Fair. All Rights Reserved.</p>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
