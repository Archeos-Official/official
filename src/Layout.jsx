import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
    Home, Sparkles, Map, Users, 
    FileText, Menu, X, Settings, Shield, User
} from 'lucide-react';
import VaseLogo from '@/components/VaseLogo';
import { Button } from "@/components/ui/button";
import { useAuth } from '@/lib/AuthContext';
import { useLanguage } from '@/components/LanguageContext';

export default function Layout({ children, currentPageName }) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const { t, darkMode } = useLanguage();
    const { user, isAdmin } = useAuth();

    const navItems = [
        { name: t('home'), icon: Home, page: 'Home' },
        ...(user ? [{ name: t('myDiscoveries'), icon: User, page: 'MyDiscoveries' }] : []),
        { name: t('community'), icon: Sparkles, page: 'Discoveries' },
        { name: t('map'), icon: Map, page: 'DiscoveryMap' },
        { name: t('experts'), icon: Users, page: 'Experts' },
        ...(user ? [{ name: t('reports'), icon: FileText, page: 'Reports' }] : []),
        { name: t('settings'), icon: Settings, page: 'Settings' },
    ];

    if (isAdmin) {
        navItems.push({ name: t('admin'), icon: Shield, page: 'Admin' });
    }

    const bgColor = darkMode ? 'bg-gray-900' : 'bg-[#fdf6ef]';
    const sidebarBg = darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-[#e5b889]';
    const textColor = darkMode ? 'text-white' : 'text-[#8f5428]';
    const textMuted = darkMode ? 'text-gray-400' : 'text-[#6b5344]';
    const activeClass = darkMode ? 'bg-gray-700 text-[#f4d0a8]' : 'bg-[#f4d0a8] text-[#8f5428]';
    const hoverClass = darkMode ? 'hover:bg-gray-700' : 'hover:bg-[#f9e4cc]';

    return (
        <div className={`min-h-screen ${bgColor}`}>
            <aside className={`hidden lg:flex fixed left-0 top-0 bottom-0 w-64 ${sidebarBg} border-r flex-col z-50`}>
                <div className={`p-6 border-b ${darkMode ? 'border-gray-700' : 'border-[#f4d0a8]'}`}>
                    <Link to={createPageUrl('Home')} className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#b66c34] to-[#8f5428] flex items-center justify-center">
                            <VaseLogo className="w-7 h-7" color="white" />
                        </div>
                        <span className={`font-bold text-xl ${textColor}`}>Archeos</span>
                    </Link>
                </div>
                
                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    {navItems.map((item) => {
                        const isActive = currentPageName === item.page;
                        return (
                            <Link
                                key={item.page}
                                to={createPageUrl(item.page)}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                                    isActive ? activeClass + ' font-medium' : textMuted + ' ' + hoverClass
                                }`}
                            >
                                <item.icon className={`w-5 h-5 ${isActive ? (darkMode ? 'text-[#f4d0a8]' : 'text-[#b66c34]') : ''}`} />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>
            </aside>

            <header className={`lg:hidden fixed top-0 left-0 right-0 h-16 ${sidebarBg} border-b flex items-center justify-between px-4 z-50`}>
                <Link to={createPageUrl('Home')} className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#b66c34] to-[#8f5428] flex items-center justify-center">
                        <VaseLogo className="w-6 h-6" color="white" />
                    </div>
                    <span className={`font-bold text-lg ${textColor}`}>Archeos</span>
                </Link>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className={darkMode ? 'text-[#f4d0a8]' : 'text-[#b66c34]'}
                >
                    {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </Button>
            </header>

            {mobileMenuOpen && (
                <div className={`lg:hidden fixed inset-0 top-16 ${darkMode ? 'bg-gray-900' : 'bg-[#fdf6ef]'} z-40 overflow-y-auto`}>
                    <nav className="p-4 space-y-1">
                        {navItems.map((item) => {
                            const isActive = currentPageName === item.page;
                            return (
                                <Link
                                    key={item.page}
                                    to={createPageUrl(item.page)}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={`flex items-center gap-3 px-4 py-4 rounded-xl transition-all ${
                                        isActive ? activeClass + ' font-medium' : textMuted + ' ' + hoverClass
                                    }`}
                                >
                                    <item.icon className={`w-5 h-5 ${isActive ? (darkMode ? 'text-[#f4d0a8]' : 'text-[#b66c34]') : ''}`} />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>
                </div>
            )}

            <main className="lg:ml-64 pt-16 lg:pt-0 min-h-screen flex flex-col">
                <div className="flex-1">
                    {children}
                </div>
                <footer className={`lg:ml-0 text-center py-4 text-xs ${darkMode ? 'text-gray-500 border-t border-gray-800' : 'text-[#a08060] border-t border-[#e5b889]'}`}>
                    © 2026 Archeos
                </footer>
            </main>
        </div>
    );
}
