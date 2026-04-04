import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Map, Users, FileText, Plus, ArrowRight, Sparkles, Camera } from 'lucide-react';
import StatCard from '@/components/stats/StatCard';
import { useLanguage } from '@/components/LanguageContext';
import { useAuth } from '@/lib/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { projectsApi, reportsApi } from '@/api/supabaseApi';

export default function Home() {
    const { t, darkMode } = useLanguage();
    const { user, isAuthenticated } = useAuth();

    const { data: projects = [] } = useQuery({
        queryKey: ['myProjects'],
        queryFn: () => projectsApi.getMyProjects(10),
        enabled: isAuthenticated
    });

    const { data: reports = [] } = useQuery({
        queryKey: ['myReports'],
        queryFn: () => reportsApi.getMyReports(),
        enabled: isAuthenticated
    });

    const quickActions = [
        { label: t('newDiscovery'), icon: Camera, href: createPageUrl('NewDiscovery'), color: 'bg-[#b66c34]' },
        { label: t('viewMap'), icon: Map, href: createPageUrl('DiscoveryMap'), color: 'bg-[#8f5428]' },
        { label: t('contactExpert'), icon: Users, href: createPageUrl('Experts'), color: 'bg-[#c98a54]' },
    ];

    const identifiedCount = projects.filter(p => p.status === 'identified' || p.status === 'reported' || p.status === 'verified').length;

    return (
        <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-[#fdf6ef]'}`}>
            <div className="relative overflow-hidden bg-gradient-to-r from-[#b66c34] via-[#c98a54] to-[#b66c34] text-white">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1599930464891-f1bcd1275e23?w=1600')] bg-cover bg-center opacity-20" />
                <div className="relative max-w-7xl mx-auto px-4 py-16 md:py-24">
                    <div className="flex items-center gap-3 mb-4">
                        <Sparkles className={`w-10 h-10 ${darkMode ? 'text-[#f4d0a8]' : 'text-white'}`} />
                        <h1 className="text-4xl md:text-5xl font-bold">{t('welcome')}</h1>
                    </div>
                    <p className="text-xl md:text-2xl text-[#f4d0a8] max-w-2xl">{t('tagline')}</p>
                    <div className="mt-8 flex flex-wrap gap-4">
                        {quickActions.map((action) => (
                            <Link key={action.label} to={action.href}>
                                <Button className={`${action.color} hover:opacity-90 text-white rounded-xl px-6 py-6 h-auto border-0`}>
                                    <action.icon className="w-5 h-5 mr-2" />
                                    {action.label}
                                </Button>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 mb-8">
                    <StatCard title={t('totalDiscoveries')} value={projects.length} icon={Sparkles} color="primary" darkMode={darkMode} />
                    <StatCard title={t('identified')} value={identifiedCount} icon={Sparkles} color="secondary" darkMode={darkMode} />
                    <StatCard title={t('reportsFiled')} value={reports.length} icon={FileText} color="primary" darkMode={darkMode} />
                </div>

                <section className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-[#8f5428]'}`}>{t('recentDiscoveries')}</h2>
                        <Link to={createPageUrl('MyDiscoveries')}>
                            <Button variant="ghost" className={darkMode ? 'text-[#f4d0a8] hover:bg-gray-800' : 'text-[#b66c34] hover:bg-[#f4d0a8]'}>
                                {t('viewAll')} <ArrowRight className="w-4 h-4 ml-1" />
                            </Button>
                        </Link>
                    </div>
                    
                    {projects.length === 0 ? (
                        <Card className={`p-12 text-center ${darkMode ? 'bg-gray-800 border-gray-700' : 'border-[#e5b889]'}`}>
                            <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 ${darkMode ? 'bg-gray-700' : 'bg-[#f4d0a8]'}`}>
                                <Camera className={`w-10 h-10 ${darkMode ? 'text-[#f4d0a8]' : 'text-[#b66c34]'}`} />
                            </div>
                            <h3 className={`text-lg font-medium mb-2 ${darkMode ? 'text-white' : 'text-[#6b5344]'}`}>{t('noDiscoveries')}</h3>
                            <p className={`mb-4 ${darkMode ? 'text-gray-400' : 'text-[#8f7a6a]'}`}>{t('startBy')}</p>
                            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                <Link to={createPageUrl('NewDiscovery')}>
                                    <Button className="bg-[#b66c34] hover:bg-[#8f5428] rounded-xl">
                                        <Plus className="w-4 h-4 mr-2" /> {t('addFirst')}
                                    </Button>
                                </Link>
                                {!user && (
                                    <Link to={createPageUrl('Login')}>
                                        <Button variant="outline" className="border-[#b66c34] text-[#b66c34] hover:bg-[#f4d0a8] rounded-xl">
                                            {t('signIn')} voor meer mogelijkheden
                                        </Button>
                                    </Link>
                                )}
                            </div>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {projects.slice(0, 4).map((project) => (
                                <Link key={project.id} to={createPageUrl(`DiscoveryDetail?id=${project.id}`)}>
                                    <Card className={`overflow-hidden hover:shadow-lg transition-shadow group cursor-pointer ${darkMode ? 'bg-gray-800 border-gray-700' : 'border-[#e5b889]'}`}>
                                        <div className={`aspect-square overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-[#f4d0a8]'}`}>
                                            {project.image_url ? (
                                                <img src={project.image_url} alt="Discovery" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <Sparkles className={`w-8 h-8 ${darkMode ? 'text-gray-500' : 'text-[#c98a54]'}`} />
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-3">
                                            <p className={`font-medium truncate ${darkMode ? 'text-white' : 'text-[#6b5344]'}`}>
                                                {project.ai_identification?.name || project.name || t('pendingAnalysis')}
                                            </p>
                                            <p className={`text-sm truncate ${darkMode ? 'text-gray-400' : 'text-[#8f7a6a]'}`}>
                                                {project.location_name || 'Unknown location'}
                                            </p>
                                        </div>
                                    </Card>
                                </Link>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
