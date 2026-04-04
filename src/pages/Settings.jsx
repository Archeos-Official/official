import React from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Settings as SettingsIcon, User, Bell, LogOut, LogIn, Moon, Sun, Palette, Globe } from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';
import { useAuth } from '@/lib/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Settings() {
    const { t, darkMode, toggleDarkMode, language, setLanguage } = useLanguage();
    const { user, isAuthenticated, logout, navigateToLogin } = useAuth();

    const languages = [
        { code: 'en', name: 'English' },
        { code: 'nl', name: 'Nederlands' },
        { code: 'de', name: 'Deutsch' },
        { code: 'fr', name: 'Français' },
        { code: 'es', name: 'Español' },
        { code: 'el', name: 'Ελληνικά' },
    ];

    return (
        <div className={`min-h-screen p-4 md:p-8 ${darkMode ? 'bg-gray-900' : 'bg-[#fdf6ef]'}`}>
            <div className="max-w-2xl mx-auto">
                <div className="mb-8">
                    <h1 className={`text-3xl font-bold flex items-center gap-3 ${darkMode ? 'text-white' : 'text-[#8f5428]'}`}>
                        <SettingsIcon className={`w-8 h-8 ${darkMode ? 'text-[#f4d0a8]' : 'text-[#b66c34]'}`} />
                        {t('settings')}
                    </h1>
                </div>

                <div className="space-y-6">
                    <Card className={`p-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'border-[#e5b889]'}`}>
                        <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-[#8f5428]'}`}>
                            <User className="w-5 h-5" />
                            {t('account')}
                        </h2>
                        {isAuthenticated && user ? (
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${darkMode ? 'bg-gray-700 text-[#f4d0a8]' : 'bg-[#f4d0a8] text-[#b66c34]'}`}>
                                        {user.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}
                                    </div>
                                    <div>
                                        <p className={`font-medium ${darkMode ? 'text-white' : 'text-[#6b5344]'}`}>{user.full_name || 'User'}</p>
                                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-[#8f7a6a]'}`}>{user.email}</p>
                                    </div>
                                </div>
                                <Button 
                                    variant="outline" 
                                    onClick={logout}
                                    className={`w-full rounded-xl ${darkMode ? 'border-gray-600 text-white hover:bg-gray-700' : 'border-[#b66c34] text-[#b66c34] hover:bg-[#f4d0a8]'}`}
                                >
                                    <LogOut className="w-4 h-4 mr-2" />
                                    {t('signOut')}
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <p className={darkMode ? 'text-gray-400' : 'text-[#8f7a6a]'}>
                                    {t('loginToAccess')}
                                </p>
                                <Button 
                                    onClick={navigateToLogin}
                                    className="w-full bg-[#b66c34] hover:bg-[#8f5428] rounded-xl"
                                >
                                    <LogIn className="w-4 h-4 mr-2" />
                                    {t('signIn')}
                                </Button>
                            </div>
                        )}
                    </Card>

                    <Card className={`p-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'border-[#e5b889]'}`}>
                        <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-[#8f5428]'}`}>
                            <Palette className="w-5 h-5" />
                            {t('appearance')}
                        </h2>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className={`font-medium ${darkMode ? 'text-white' : 'text-[#6b5344]'}`}>{t('language')}</p>
                                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-[#8f7a6a]'}`}>{t('selectLanguage')}</p>
                                </div>
                                <Select value={language} onValueChange={setLanguage}>
                                    <SelectTrigger className={`w-40 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-[#b66c34]'}`}>
                                        <Globe className={`w-4 h-4 mr-2 ${darkMode ? 'text-gray-400' : 'text-[#b66c34]'}`} />
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {languages.map(lang => (
                                            <SelectItem key={lang.code} value={lang.code}>{lang.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className={`font-medium ${darkMode ? 'text-white' : 'text-[#6b5344]'}`}>{t('darkMode')}</p>
                                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-[#8f7a6a]'}`}>{t('toggleTheme')}</p>
                                </div>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={toggleDarkMode}
                                    className={`rounded-xl ${darkMode ? 'border-gray-600 hover:bg-gray-700' : 'border-[#b66c34] hover:bg-[#f4d0a8]'}`}
                                >
                                    {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                                </Button>
                            </div>
                        </div>
                    </Card>

                    <Card className={`p-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'border-[#e5b889]'}`}>
                        <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-[#8f5428]'}`}>
                            <Bell className="w-5 h-5" />
                            {t('notifications')}
                        </h2>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className={`font-medium ${darkMode ? 'text-white' : 'text-[#6b5344]'}`}>{t('emailNotifications')}</p>
                            </div>
                            <Switch defaultChecked />
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
