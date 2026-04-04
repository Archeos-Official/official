import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Map } from 'lucide-react';
import DiscoveryMap from '@/components/discovery/DiscoveryMap';
import { useLanguage } from '@/components/LanguageContext';
import { useAuth } from '@/lib/AuthContext';
import { projectsApi } from '@/api/supabaseApi';

function getCategories(t) {
    return [
        { label: t('catAll'), value: 'all' },
        { label: t('catCoins'), value: 'coin' },
        { label: t('catPipes'), value: 'pipe' },
        { label: t('catJewelry'), value: 'jewel' },
        { label: t('catWeapons'), value: 'weapon' },
        { label: t('catTools'), value: 'tool' },
        { label: t('catPottery'), value: 'potter' },
        { label: t('catOther'), value: 'other' },
    ];
}

function matchesCategory(project, cat) {
    if (cat === 'all') return true;
    const name = (project.ai_identification?.name || project.name || '').toLowerCase();
    const desc = (project.ai_identification?.description || project.description || '').toLowerCase();
    const text = name + ' ' + desc;
    const nonOtherValues = ['coin', 'pipe', 'jewel', 'weapon', 'tool', 'potter'];
    if (cat === 'other') {
        return !nonOtherValues.some(c => text.includes(c));
    }
    return text.includes(cat);
}

export default function DiscoveryMapPage() {
    const { t, darkMode } = useLanguage();
    const { user, isAdmin, profile, navigateToLogin } = useAuth();
    const [selectedCategory, setSelectedCategory] = useState('all');
    const CATEGORIES = getCategories(t);

    const canSeeAllDiscoveries = isAdmin || profile?.role === 'archeologist';

    const { data: projects = [], isLoading } = useQuery({
        queryKey: ['mapProjects', user?.email, profile?.role],
        queryFn: async () => {
            if (!user) return [];
            if (canSeeAllDiscoveries) {
                return projectsApi.filter({ is_private: false, is_archaeological: true });
            } else {
                return projectsApi.getMyProjects(100);
            }
        },
        enabled: !!user
    });

    const projectsWithLocation = projects
        .filter(p => p.latitude && p.longitude)
        .filter(p => matchesCategory(p, selectedCategory));

    const btnBase = `px-3 py-1.5 rounded-full text-sm font-medium transition-all`;
    const btnActive = darkMode ? 'bg-[#b66c34] text-white' : 'bg-[#b66c34] text-white';
    const btnInactive = darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-[#f4d0a8] text-[#8f5428] hover:bg-[#e5b889]';

    return (
        <div className={`min-h-screen p-4 md:p-8 ${darkMode ? 'bg-gray-900' : 'bg-[#fdf6ef]'}`}>
            <div className="max-w-6xl mx-auto">
                <div className="mb-6">
                    <h1 className={`text-3xl font-bold flex items-center gap-3 ${darkMode ? 'text-white' : 'text-[#8f5428]'}`}>
                        <Map className="w-8 h-8 text-[#b66c34]" />
                        {t('map')}
                    </h1>
                    <p className={darkMode ? 'text-gray-400' : 'text-[#8f7a6a]'}>
                        {canSeeAllDiscoveries ? t('fromAllUsers') : 'Your discoveries on the map'}
                    </p>
                </div>

                <div className="flex flex-wrap gap-2 mb-6">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat.value}
                            onClick={() => setSelectedCategory(cat.value)}
                            className={`${btnBase} ${selectedCategory === cat.value ? btnActive : btnInactive}`}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>

                {!user ? (
                    <Card className={`p-12 text-center ${darkMode ? 'bg-gray-800 border-gray-700' : 'border-[#e5b889]'}`}>
                        <h3 className={`text-lg font-medium mb-2 ${darkMode ? 'text-white' : 'text-[#6b5344]'}`}>{t('loginRequired')}</h3>
                        <Button onClick={navigateToLogin} className="bg-[#b66c34] hover:bg-[#8f5428] rounded-xl mt-2">{t('signIn')}</Button>
                    </Card>
                ) : isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-[#b66c34]" />
                    </div>
                ) : projectsWithLocation.length === 0 ? (
                    <Card className={`p-12 text-center ${darkMode ? 'bg-gray-800 border-gray-700' : 'border-[#e5b889]'}`}>
                        <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 ${darkMode ? 'bg-gray-700' : 'bg-[#f4d0a8]'}`}>
                            <Map className={`w-10 h-10 ${darkMode ? 'text-[#f4d0a8]' : 'text-[#b66c34]'}`} />
                        </div>
                        <h3 className={`text-lg font-medium mb-2 ${darkMode ? 'text-white' : 'text-[#6b5344]'}`}>{t('noDiscoveries')}</h3>
                    </Card>
                ) : (
                    <Card className={`overflow-hidden ${darkMode ? 'bg-gray-800 border-gray-700' : 'border-[#e5b889]'}`}>
                        <div className={`p-4 border-b ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-[#e5b889]'}`}>
                            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-[#8f7a6a]'}`}>
                                {projectsWithLocation.length} {t('discoveries').toLowerCase()}
                            </p>
                        </div>
                        <DiscoveryMap
                            discoveries={projectsWithLocation}
                            height="600px"
                            interactive={true}
                            zoom={8}
                        />
                    </Card>
                )}
            </div>
        </div>
    );
}
