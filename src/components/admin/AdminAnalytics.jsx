import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { projectsApi } from '@/api/supabaseApi';
import { Card } from "@/components/ui/card";
import { Loader2, TrendingUp, MapPin, Calendar, Clock, Users } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function AdminAnalytics({ darkMode }) {
    const { data: projects = [], isLoading } = useQuery({
        queryKey: ['allProjectsAnalytics'],
        queryFn: () => projectsApi.list('-created_at', 1000)
    });

    const textClass = darkMode ? 'text-white' : 'text-[#8f5428]';
    const mutedClass = darkMode ? 'text-gray-400' : 'text-[#8f7a6a]';
    const cardClass = darkMode ? 'bg-gray-800 border-gray-700' : 'border-[#e5b889]';

    const analytics = useMemo(() => {
        if (!projects.length) return null;

        const discoveriesOverTime = {};
        projects.forEach(p => {
            const date = new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            discoveriesOverTime[date] = (discoveriesOverTime[date] || 0) + 1;
        });
        const discoveriesOverTimeArray = Object.entries(discoveriesOverTime)
            .map(([date, count]) => ({ date, count }))
            .slice(-30);

        const artifactCounts = {};
        projects.forEach(p => {
            const type = p.ai_identification?.name || 'Unknown';
            artifactCounts[type] = (artifactCounts[type] || 0) + 1;
        });
        const topArtifactTypes = Object.entries(artifactCounts)
            .map(([type, count]) => ({ type, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        const periodCounts = {};
        projects.forEach(p => {
            const period = p.ai_identification?.historical_period || 'Unknown';
            periodCounts[period] = (periodCounts[period] || 0) + 1;
        });
        const periodDistribution = Object.entries(periodCounts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        const locationCounts = {};
        projects.forEach(p => {
            const location = p.finder_location || p.location || 'Unknown';
            locationCounts[location] = (locationCounts[location] || 0) + 1;
        });
        const topLocations = Object.entries(locationCounts)
            .map(([location, count]) => ({ location, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        const materialCounts = {};
        projects.forEach(p => {
            const material = p.ai_identification?.material || 'Unknown';
            materialCounts[material] = (materialCounts[material] || 0) + 1;
        });
        const materialDistribution = Object.entries(materialCounts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        const methodCounts = {};
        projects.forEach(p => {
            const method = p.detection_method || 'Unknown';
            methodCounts[method] = (methodCounts[method] || 0) + 1;
        });
        const detectionMethods = Object.entries(methodCounts)
            .map(([method, count]) => ({ method, count }))
            .sort((a, b) => b.count - a.count);

        const statusCounts = projects.reduce((acc, p) => {
            const status = p.status || 'unknown';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {});

        return {
            totalVisits: projects.length,
            avgTimeMinutes: Math.round(projects.length * 2.5),
            conversionRate: projects.length > 0 ? Math.round((statusCounts.verified || 0) / projects.length * 100) : 0,
            discoveriesOverTime: discoveriesOverTimeArray,
            topArtifactTypes,
            periodDistribution,
            topLocations,
            materialDistribution,
            detectionMethods,
            totalProjects: projects.length,
            verifiedProjects: statusCounts.verified || 0,
            pendingProjects: statusCounts.pending_analysis || 0
        };
    }, [projects]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-[#b66c34]" />
            </div>
        );
    }

    const COLORS = ['#b66c34', '#8f5428', '#f4d0a8', '#c98a54', '#e5b889', '#a08060'];

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className={`p-4 ${cardClass}`}>
                    <div className="flex items-center gap-3">
                        <Users className="w-6 h-6 text-[#b66c34]" />
                        <div>
                            <p className={`text-xs ${mutedClass}`}>Total Discoveries</p>
                            <p className={`text-2xl font-bold ${textClass}`}>{analytics?.totalProjects || 0}</p>
                        </div>
                    </div>
                </Card>
                <Card className={`p-4 ${cardClass}`}>
                    <div className="flex items-center gap-3">
                        <TrendingUp className="w-6 h-6 text-[#b66c34]" />
                        <div>
                            <p className={`text-xs ${mutedClass}`}>Verified</p>
                            <p className={`text-2xl font-bold ${textClass}`}>{analytics?.verifiedProjects || 0}</p>
                        </div>
                    </div>
                </Card>
                <Card className={`p-4 ${cardClass}`}>
                    <div className="flex items-center gap-3">
                        <Clock className="w-6 h-6 text-[#b66c34]" />
                        <div>
                            <p className={`text-xs ${mutedClass}`}>Pending Analysis</p>
                            <p className={`text-2xl font-bold ${textClass}`}>{analytics?.pendingProjects || 0}</p>
                        </div>
                    </div>
                </Card>
            </div>

            <Card className={`p-6 ${cardClass}`}>
                <h3 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${textClass}`}>
                    <Calendar className="w-5 h-5 text-[#b66c34]" />
                    Discoveries Over Time
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={analytics?.discoveriesOverTime || []}>
                        <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#444' : '#e5b889'} />
                        <XAxis dataKey="date" stroke={darkMode ? '#999' : '#6b5344'} />
                        <YAxis stroke={darkMode ? '#999' : '#6b5344'} />
                        <Tooltip 
                            contentStyle={{ 
                                backgroundColor: darkMode ? '#374151' : '#fff', 
                                border: `1px solid ${darkMode ? '#4b5563' : '#e5b889'}`,
                                borderRadius: '8px'
                            }} 
                        />
                        <Legend />
                        <Line type="monotone" dataKey="count" stroke="#b66c34" strokeWidth={2} name="Discoveries" />
                    </LineChart>
                </ResponsiveContainer>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className={`p-6 ${cardClass}`}>
                    <h3 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${textClass}`}>
                        <TrendingUp className="w-5 h-5 text-[#b66c34]" />
                        Top Artifact Types
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={analytics?.topArtifactTypes || []}>
                            <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#444' : '#e5b889'} />
                            <XAxis dataKey="type" stroke={darkMode ? '#999' : '#6b5344'} />
                            <YAxis stroke={darkMode ? '#999' : '#6b5344'} />
                            <Tooltip 
                                contentStyle={{ 
                                    backgroundColor: darkMode ? '#374151' : '#fff', 
                                    border: `1px solid ${darkMode ? '#4b5563' : '#e5b889'}`,
                                    borderRadius: '8px'
                                }} 
                            />
                            <Bar dataKey="count" fill="#b66c34" name="Count" />
                        </BarChart>
                    </ResponsiveContainer>
                </Card>

                <Card className={`p-6 ${cardClass}`}>
                    <h3 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${textClass}`}>
                        <Clock className="w-5 h-5 text-[#b66c34]" />
                        Historical Periods
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={analytics?.periodDistribution || []}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {(analytics?.periodDistribution || []).map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </Card>
            </div>

            <Card className={`p-6 ${cardClass}`}>
                <h3 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${textClass}`}>
                    <MapPin className="w-5 h-5 text-[#b66c34]" />
                    Geographic Distribution (Top Locations)
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analytics?.topLocations || []} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#444' : '#e5b889'} />
                        <XAxis type="number" stroke={darkMode ? '#999' : '#6b5344'} />
                        <YAxis dataKey="location" type="category" stroke={darkMode ? '#999' : '#6b5344'} width={150} />
                        <Tooltip 
                            contentStyle={{ 
                                backgroundColor: darkMode ? '#374151' : '#fff', 
                                border: `1px solid ${darkMode ? '#4b5563' : '#e5b889'}`,
                                borderRadius: '8px'
                            }} 
                        />
                        <Bar dataKey="count" fill="#8f5428" name="Discoveries" />
                    </BarChart>
                </ResponsiveContainer>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className={`p-6 ${cardClass}`}>
                    <h3 className={`text-lg font-semibold mb-4 ${textClass}`}>Materials Found</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={analytics?.materialDistribution || []}
                                cx="50%"
                                cy="50%"
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                                label
                            >
                                {(analytics?.materialDistribution || []).map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </Card>

                <Card className={`p-6 ${cardClass}`}>
                    <h3 className={`text-lg font-semibold mb-4 ${textClass}`}>Detection Methods</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={analytics?.detectionMethods || []}>
                            <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#444' : '#e5b889'} />
                            <XAxis dataKey="method" stroke={darkMode ? '#999' : '#6b5344'} />
                            <YAxis stroke={darkMode ? '#999' : '#6b5344'} />
                            <Tooltip 
                                contentStyle={{ 
                                    backgroundColor: darkMode ? '#374151' : '#fff', 
                                    border: `1px solid ${darkMode ? '#4b5563' : '#e5b889'}`,
                                    borderRadius: '8px'
                                }} 
                            />
                            <Bar dataKey="count" fill="#f4d0a8" name="Count" />
                        </BarChart>
                    </ResponsiveContainer>
                </Card>
            </div>
        </div>
    );
}
