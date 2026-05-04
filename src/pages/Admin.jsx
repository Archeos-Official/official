import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Users, Sparkles, FileText, BookUser, Loader2, DollarSign, BarChart3, Cloud } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useLanguage } from '@/components/LanguageContext';
import { useAuth } from '@/lib/AuthContext';
import { projectsApi, reportsApi, expertsApi, profilesApi } from '@/api/supabaseApi';
import AdminUsers from '@/components/admin/AdminUsers';
import AdminDiscoveries from '@/components/admin/AdminDiscoveries';
import AdminExperts from '@/components/admin/AdminExperts';
import AdminReports from '@/components/admin/AdminReports';
import AdminCreditLogs from '@/components/admin/AdminCreditLogs';
import AdminAnalytics from '@/components/admin/AdminAnalytics';

export default function Admin() {
    const { t, darkMode } = useLanguage();
    const { user, isAdmin, isLoadingAuth } = useAuth();
    const [useCloudfareFallback, setUseCloudfareFallback] = useState(false);

    const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: () => profilesApi.list(), enabled: isAdmin });
    const { data: projects = [] } = useQuery({ queryKey: ['allProjects'], queryFn: () => projectsApi.list('-created_at'), enabled: isAdmin });
    const { data: reports = [] } = useQuery({ queryKey: ['allReports'], queryFn: () => reportsApi.list('-created_at'), enabled: isAdmin });
    const { data: experts = [] } = useQuery({ queryKey: ['experts'], queryFn: () => expertsApi.list(), enabled: isAdmin });

    if (isLoadingAuth) return (
        <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-[#fdf6ef]'}`}>
            <Loader2 className="w-8 h-8 animate-spin text-[#b66c34]" />
        </div>
    );

    if (!isAdmin) return (
        <div className={`min-h-screen p-8 ${darkMode ? 'bg-gray-900' : 'bg-[#fdf6ef]'}`}>
            <Card className={`max-w-md mx-auto p-8 text-center ${darkMode ? 'bg-gray-800 border-gray-700' : 'border-[#e5b889]'}`}>
                <div className="w-16 h-16 mx-auto rounded-full bg-red-100 flex items-center justify-center mb-4">
                    <Shield className="w-8 h-8 text-red-500" />
                </div>
                <h2 className={`text-xl font-semibold mb-2 ${darkMode ? 'text-white' : 'text-[#6b5344]'}`}>Access Denied</h2>
                <p className={`mb-4 ${darkMode ? 'text-gray-400' : 'text-[#8f7a6a]'}`}>Administrator access required.</p>
                <Link to={createPageUrl('Home')}>
                    <Button className="bg-[#b66c34] hover:bg-[#8f5428] rounded-xl">{t('home')}</Button>
                </Link>
            </Card>
        </div>
    );

    const stats = [
        { label: 'Users', value: users.length, icon: Users },
        { label: 'Discoveries', value: projects.length, icon: Sparkles },
        { label: 'Reports', value: reports.length, icon: FileText },
        { label: 'Experts', value: experts.length, icon: BookUser },
    ];

    return (
        <div className={`min-h-screen p-4 md:p-8 ${darkMode ? 'bg-gray-900' : 'bg-[#fdf6ef]'}`}>
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className={`text-3xl font-bold flex items-center gap-3 ${darkMode ? 'text-white' : 'text-[#8f5428]'}`}>
                        <Shield className="w-8 h-8 text-[#b66c34]" />
                        Admin Panel
                    </h1>
                    <div className="mt-4 flex items-center gap-4">
                        <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-[#8f7a6a]'}`}>
                            AI Backend: {useCloudfareFallback ? 'Cloudflare AI' : 'Custom Backend'}
                        </span>
                        <Button
                            onClick={() => setUseCloudfareFallback(!useCloudfareFallback)}
                            className={`rounded-xl ${useCloudfareFallback ? 'bg-orange-500 hover:bg-orange-600' : 'bg-[#b66c34] hover:bg-[#8f5428]'}`}
                        >
                            <Cloud className="w-4 h-4 mr-2" />
                            {useCloudfareFallback ? 'Switch to Custom Backend' : 'Use Cloudflare AI Fallback'}
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {stats.map(({ label, value, icon: Icon }) => (
                        <Card key={label} className={`p-4 ${darkMode ? 'bg-gray-800 border-gray-700' : 'border-[#e5b889]'}`}>
                            <div className="flex items-center gap-3">
                                <Icon className="w-7 h-7 text-[#b66c34]" />
                                <div>
                                    <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-[#6b5344]'}`}>{value}</p>
                                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-[#8f7a6a]'}`}>{label}</p>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>

                <Tabs defaultValue="analytics">
                    <TabsList className={`mb-6 ${darkMode ? 'bg-gray-800' : ''}`}>
                        <TabsTrigger value="analytics">Analytics</TabsTrigger>
                        <TabsTrigger value="users">Users</TabsTrigger>
                        <TabsTrigger value="discoveries">Discoveries</TabsTrigger>
                        <TabsTrigger value="experts">Experts</TabsTrigger>
                        <TabsTrigger value="reports">Reports</TabsTrigger>
                        <TabsTrigger value="credits">Credits</TabsTrigger>
                    </TabsList>

                    <TabsContent value="analytics">
                        <AdminAnalytics darkMode={darkMode} />
                    </TabsContent>

                    <TabsContent value="users">
                        <AdminUsers darkMode={darkMode} />
                    </TabsContent>

                    <TabsContent value="discoveries">
                        <AdminDiscoveries darkMode={darkMode} />
                    </TabsContent>

                    <TabsContent value="experts">
                        <AdminExperts darkMode={darkMode} />
                    </TabsContent>

                    <TabsContent value="reports">
                        <AdminReports darkMode={darkMode} />
                    </TabsContent>

                    <TabsContent value="credits">
                        <AdminCreditLogs darkMode={darkMode} />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
