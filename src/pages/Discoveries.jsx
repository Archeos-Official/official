import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Plus, Search, Filter, MapPin, Calendar, Loader2, User, Users } from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';
import { useAuth } from '@/lib/AuthContext';
import { projectsApi } from '@/api/supabaseApi';

export default function Discoveries() {
    const { t, darkMode } = useLanguage();
    const { user } = useAuth();
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [periodFilter, setPeriodFilter] = useState('all');
    const [materialFilter, setMaterialFilter] = useState('all');
    const [rarityFilter, setRarityFilter] = useState('all');

    const { data: projects = [], isLoading } = useQuery({
        queryKey: ['publicProjects'],
        queryFn: () => projectsApi.getPublicProjects()
    });

    const filteredProjects = projects.filter(p => {
        if (p.is_archaeological === false) return false;
        const matchesSearch = !search || 
            p.ai_identification?.name?.toLowerCase().includes(search.toLowerCase()) ||
            p.name?.toLowerCase().includes(search.toLowerCase()) ||
            p.location_name?.toLowerCase().includes(search.toLowerCase()) ||
            p.finder_name?.toLowerCase().includes(search.toLowerCase()) ||
            p.ai_identification?.origin?.toLowerCase().includes(search.toLowerCase()) ||
            p.ai_identification?.material?.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
        const matchesPeriod = periodFilter === 'all' || p.ai_identification?.period?.toLowerCase().includes(periodFilter.toLowerCase());
        const matchesMaterial = materialFilter === 'all' || p.ai_identification?.material?.toLowerCase().includes(materialFilter.toLowerCase());
        const matchesRarity = rarityFilter === 'all' || p.ai_identification?.rarity === rarityFilter;
        return matchesSearch && matchesStatus && matchesPeriod && matchesMaterial && matchesRarity;
    });

    const rarityColors = {
        common: 'bg-[#e5b889] text-[#6b5344]',
        uncommon: 'bg-[#c98a54] text-white',
        rare: 'bg-[#b66c34] text-white',
        very_rare: 'bg-[#8f5428] text-white',
        legendary: 'bg-gradient-to-r from-[#b66c34] to-[#8f5428] text-white'
    };

    return (
        <div className={`min-h-screen p-4 md:p-8 ${darkMode ? 'bg-gray-900' : 'bg-[#fdf6ef]'}`}>
            <div className="max-w-6xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className={`text-3xl font-bold flex items-center gap-3 ${darkMode ? 'text-white' : 'text-[#8f5428]'}`}>
                            <Users className="w-8 h-8 text-[#b66c34]" />
                            {t('community')}
                        </h1>
                        <p className={darkMode ? 'text-gray-400' : 'text-[#8f7a6a]'}>{t('discoveries')} from all users</p>
                    </div>
                    <Link to={createPageUrl('NewDiscovery')}>
                        <Button className="bg-[#b66c34] hover:bg-[#8f5428] rounded-xl">
                            <Plus className="w-4 h-4 mr-2" /> {t('newDiscovery')}
                        </Button>
                    </Link>
                </div>

                <Card className={`p-4 mb-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'border-[#e5b889]'}`}>
                    <div className="flex flex-col gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#b66c34]" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={t('search') + '...'}
                                className={`pl-10 rounded-xl ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-[#e5b889]'}`}
                            />
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className={`rounded-xl ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-[#e5b889]'}`}>
                                    <SelectValue placeholder={t('filterByStatus')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('allStatus')}</SelectItem>
                                    <SelectItem value="pending_analysis">{t('pendingAnalysis')}</SelectItem>
                                    <SelectItem value="identified">{t('identified')}</SelectItem>
                                    <SelectItem value="reported">{t('reported')}</SelectItem>
                                    <SelectItem value="verified">{t('verified')}</SelectItem>
                                </SelectContent>
                            </Select>
                            
                            <Select value={periodFilter} onValueChange={setPeriodFilter}>
                                <SelectTrigger className={`rounded-xl ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-[#e5b889]'}`}>
                                    <SelectValue placeholder="Period" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Periods</SelectItem>
                                    <SelectItem value="roman">Roman</SelectItem>
                                    <SelectItem value="medieval">Medieval</SelectItem>
                                    <SelectItem value="bronze">Bronze Age</SelectItem>
                                    <SelectItem value="iron">Iron Age</SelectItem>
                                    <SelectItem value="neolithic">Neolithic</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={materialFilter} onValueChange={setMaterialFilter}>
                                <SelectTrigger className={`rounded-xl ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-[#e5b889]'}`}>
                                    <SelectValue placeholder="Material" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Materials</SelectItem>
                                    <SelectItem value="bronze">Bronze</SelectItem>
                                    <SelectItem value="silver">Silver</SelectItem>
                                    <SelectItem value="gold">Gold</SelectItem>
                                    <SelectItem value="ceramic">Ceramic</SelectItem>
                                    <SelectItem value="stone">Stone</SelectItem>
                                    <SelectItem value="iron">Iron</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={rarityFilter} onValueChange={setRarityFilter}>
                                <SelectTrigger className={`rounded-xl ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-[#e5b889]'}`}>
                                    <SelectValue placeholder="Rarity" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Rarities</SelectItem>
                                    <SelectItem value="common">Common</SelectItem>
                                    <SelectItem value="uncommon">Uncommon</SelectItem>
                                    <SelectItem value="rare">Rare</SelectItem>
                                    <SelectItem value="very_rare">Very Rare</SelectItem>
                                    <SelectItem value="legendary">Legendary</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </Card>

                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-[#b66c34]" />
                    </div>
                ) : filteredProjects.length === 0 ? (
                    <Card className={`p-12 text-center ${darkMode ? 'bg-gray-800 border-gray-700' : 'border-[#e5b889]'}`}>
                        <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 ${darkMode ? 'bg-gray-700' : 'bg-[#f4d0a8]'}`}>
                            <Sparkles className={`w-10 h-10 ${darkMode ? 'text-[#f4d0a8]' : 'text-[#b66c34]'}`} />
                        </div>
                        <h3 className={`text-lg font-medium mb-2 ${darkMode ? 'text-white' : 'text-[#6b5344]'}`}>{t('noDiscoveries')}</h3>
                    </Card>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredProjects.map((project) => (
                            <Link key={project.id} to={createPageUrl(`DiscoveryDetail?id=${project.id}`)}>
                                <Card className={`overflow-hidden hover:shadow-xl transition-all hover:-translate-y-1 cursor-pointer h-full ${darkMode ? 'bg-gray-800 border-gray-700' : 'border-[#e5b889]'}`}>
                                    <div className={`aspect-video overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-[#f4d0a8]'}`}>
                                        {project.image_url ? (
                                            <img src={project.image_url} alt="Discovery" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Sparkles className={`w-12 h-12 ${darkMode ? 'text-gray-500' : 'text-[#c98a54]'}`} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-4">
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <h3 className={`font-semibold text-lg ${darkMode ? 'text-white' : 'text-[#6b5344]'}`}>
                                                {project.ai_identification?.name || project.name || t('pendingAnalysis')}
                                            </h3>
                                            {project.ai_identification?.rarity && (
                                                <Badge className={`${rarityColors[project.ai_identification.rarity]} text-xs`}>
                                                    {project.ai_identification.rarity.replace('_', ' ')}
                                                </Badge>
                                            )}
                                        </div>
                                        
                                        {project.ai_identification?.period && (
                                            <p className="text-sm text-[#b66c34] font-medium mb-2">{project.ai_identification.period}</p>
                                        )}
                                        
                                        <div className={`flex items-center gap-2 text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-[#6b5344]'}`}>
                                            <User className="w-3 h-3" />
                                            <span>{project.finder_name || project.created_by?.split('@')[0] || 'Unknown'}</span>
                                        </div>
                                        
                                        <div className={`flex items-center gap-4 text-sm ${darkMode ? 'text-gray-400' : 'text-[#8f7a6a]'}`}>
                                            {project.location_name && (
                                                <div className="flex items-center gap-1">
                                                    <MapPin className="w-3 h-3" />
                                                    <span className="truncate">{project.location_name}</span>
                                                </div>
                                            )}
                                            {project.discovery_date && (
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    <span>{new Date(project.discovery_date).toLocaleDateString()}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
