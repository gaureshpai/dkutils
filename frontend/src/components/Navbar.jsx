import { useState, useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext'; // Adjusted path
import { Button } from './ui/button';

import { Menu, X, Image as ImageIcon, FileText, Type, Globe, LogIn, LogOut, Package2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { ModeToggle } from './mode-toggle';

const Navbar = () => {
    const { state, dispatch } = useContext(AuthContext);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const location = useLocation();

    const handleLogout = () => {
        dispatch({ type: 'LOGOUT' }); // App.jsx normally handles the logic but here we just dispatch
        // The App.jsx had setAuthToken(null) and localStorage removal.
        // I should probably pass a logout handler or context should handle it.
        // In App.jsx handleLogout did: setAuthToken(null), dispatch LOGOUT, localStorage.removeItem.
        // The reducer does localStorage.removeItem, but setAuthToken needs to be called.
        // For now I'll just replicate the logic or assume context handles it better (it doesn't fully).
        // I'll restart the logic from App.jsx here to be safe.
        localStorage.removeItem('token');
        dispatch({ type: 'LOGOUT' });
        // setAuthToken is not imported here, but reducer sets it to null on LOGOUT? 
        // Wait, reducer calls setAuthToken(null) in LOGOUT case! So dispatching LOGOUT is enough.
    };

    const navItems = [
        { to: '/images', label: 'Images', icon: <ImageIcon className="h-4 w-4 mr-2" /> },
        { to: '/pdfs', label: 'PDFs', icon: <FileText className="h-4 w-4 mr-2" /> },
        { to: '/text', label: 'Text', icon: <Type className="h-4 w-4 mr-2" /> },
        { to: '/web', label: 'Web', icon: <Globe className="h-4 w-4 mr-2" /> },
    ];

    return (
        <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-14 max-w-7xl items-center justify-between mx-auto md:px-8 px-4">
                {/* Left: Logo */}
                <div className="flex items-center">
                    <Link to="/" className="flex items-center space-x-2">
                        <Package2 className="h-6 w-6" />
                        <span className="font-bold sm:inline-block">Utility Hub</span>
                    </Link>
                </div>

                {/* Center: Navigation */}
                <nav className="hidden md:flex gap-6">
                    {navItems.map((item) => (
                        <Link
                            key={item.to}
                            to={item.to}
                            className={cn(
                                "transition-colors hover:text-primary flex items-center text-sm font-medium text-muted-foreground",
                                location.pathname.startsWith(item.to) && "text-primary font-semibold"
                            )}
                        >
                            {item.icon}
                            {item.label}
                        </Link>
                    ))}
                </nav>

                {/* Right: Auth & Mobile Menu */}
                <div className="flex items-center gap-2">
                    <ModeToggle />
                    <div className="hidden md:flex">
                        {state.isAuthenticated ? (
                            <Button variant="destructive" size="sm" onClick={handleLogout}>
                                <LogOut className="h-4 w-4 mr-2" /> Logout
                            </Button>
                        ) : (
                            <Button asChild variant="default" size="sm">
                                <Link to="/login">
                                    <LogIn className="h-4 w-4 mr-2" /> Login
                                </Link>
                            </Button>
                        )}
                    </div>
                    {/* Mobile Menu Trigger */}
                    <div className="md:hidden">
                        <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu Content (Simple overlay for now to avoid Sheet dependency first) */}
            {mobileMenuOpen && (
                <div className="md:hidden border-b bg-background p-4">
                    <nav className="flex flex-col space-y-4">
                        {navItems.map((item) => (
                            <Link
                                key={item.to}
                                to={item.to}
                                className="flex items-center text-sm font-medium text-foreground hover:text-foreground/80"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                {item.icon}
                                {item.label}
                            </Link>
                        ))}
                        {state.isAuthenticated ? (
                            <Button variant="destructive" size="sm" onClick={() => { handleLogout(); setMobileMenuOpen(false); }} className="w-full justify-start">
                                <LogOut className="h-4 w-4 mr-2" /> Logout
                            </Button>
                        ) : (
                            <Button asChild variant="default" size="sm" className="w-full justify-start" onClick={() => setMobileMenuOpen(false)}>
                                <Link to="/login">
                                    <LogIn className="h-4 w-4 mr-2" /> Login
                                </Link>
                            </Button>
                        )}
                    </nav>
                </div>
            )}
        </header>
    );
};

export default Navbar;
