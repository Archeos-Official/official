import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, Calendar, FileText, Loader2, ExternalLink, Share2, Lock, Unlock, User, Users, Mail, AlertTriangle, Clock, CheckCircle, Trash2, Edit } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AIAnalysisCard from '@/components/discovery/AIAnalysisCard';
import DiscoveryMap from '@/components/discovery/DiscoveryMap';
import ShareDialog from '@/components/discovery/ShareDialog';
import { useLanguage } from '@/components/LanguageContext';
import { useAuth } from '@/lib/AuthContext';
import { projectsApi, expertsApi } from '@/api/supabaseApi';
import { sendEmail } from '@/api/aiService';

export default function DiscoveryDetail() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { t, darkMode } = useLanguage();
    const { user, isAdmin, isAuthenticated } = useAuth();
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('id');
    const [shareOpen, setShareOpen] = useState(false);
    const [expertDialogOpen, setExpertDialogOpen] = useState(false);
    const [selectedExpertId, setSelectedExpertId] = useState('');
    const [expertSubject, setExpertSubject] = useState('');
    const [expertMessage, setExpertMessage] = useState('');
    const [appealMessage, setAppealMessage] = useState('');
    const [appealSent, setAppealSent] = useState(false);

    const { data: experts = [] } = useQuery({
        queryKey: ['experts'],
        queryFn: () => expertsApi.list()
    });

    const { data: project, isLoading } = useQuery({
        queryKey: ['project', projectId],
        queryFn: () => projectsApi.getById(projectId),
        enabled: !!projectId
    });

    const togglePrivateMutation = useMutation({
        mutationFn: () => projectsApi.update(projectId, { is_private: !project?.is_private }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['project', projectId] })
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => projectsApi.delete(id),
        onSuccess: () => {
            navigate(createPageUrl('Discoveries'));
        }
    });

    const discoveryUrl = `${window.location.origin}${window.location.pathname}?id=${projectId}`;

    const sortedExperts = React.useMemo(() => {
        if (!experts.length) return experts;
        const period = project?.ai_identification?.period?.toLowerCase() || '';
        const origin = project?.ai_identification?.origin?.toLowerCase() || '';
        const material = project?.ai_identification?.material?.toLowerCase() || '';
        const keywords = [period, origin, material, project?.ai_identification?.name?.toLowerCase() || ''].filter(Boolean);
        return [...experts].sort((a, b) => {
            const spec = (s) => s.specialization?.toLowerCase() || '';
            const scoreA = keywords.filter(k => spec(a).includes(k) || k.split(' ').some(w => w.length > 3 && spec(a).includes(w))).length;
            const scoreB = keywords.filter(k => spec(b).includes(k) || k.split(' ').some(w => w.length > 3 && spec(b).includes(w))).length;
            return scoreB - scoreA;
        });
    }, [experts, project]);

    const openExpertDialog = () => {
        const name = project?.ai_identification?.name || project?.name || 'Unknown Object';
        setExpertSubject(`Question about archaeological find: ${name}`);
        setExpertMessage(`Please find the details here:\n${discoveryUrl}`);
        setSelectedExpertId('');
        setExpertDialogOpen(true);
    };

    const sendToExpert = () => {
        const expert = experts.find(e => e.id === selectedExpertId);
        if (!expert) return;
        const mailtoLink = `mailto:${expert.email}?subject=${encodeURIComponent(expertSubject)}&body=${encodeURIComponent(expertMessage)}`;
        window.open(mailtoLink, '_blank');
        setExpertDialogOpen(false);
    };

    const isOwner = user?.email === project?.created_by;
    const canEdit = isOwner || isAdmin;
    const isNonArchaeological = project?.is_archaeological === false;

    const approveAppealMutation = useMutation({
        mutationFn: () => projectsApi.update(projectId, { 
            is_archaeological: true, 
            appeal_status: 'approved',
            is_private: false 
        }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['project', projectId] })
    });

    const sendAppeal = async () => {
        const subject = `Bezwaar niet-archeologisch: ${project?.ai_identification?.name || project?.name}`;
        const body = `Beste team ArcheOS,\n\nIk dien een bezwaar in voor de volgende vondst:\n\nNaam: ${project?.ai_identification?.name || project?.name}\nLink: ${discoveryUrl}\n\nMijn toelichting:\n${appealMessage}\n\nMet vriendelijke groet,\n${user?.full_name || user?.email}`;
        await projectsApi.update(projectId, { appeal_status: 'pending' });
        await sendEmail({
            to: 'team@archeos.nl',
            subject,
            body
        });
        await queryClient.invalidateQueries({ queryKey: ['project', projectId] });
        setAppealSent(true);
    };

    if (isLoading) {
        return (
            <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-[#fdf6ef]'}`}>
                <Loader2 className="w-8 h-8 animate-spin text-[#b66c34]" />
            </div>
        );
    }

    if (!project) {
        return (
            <div className={`min-h-screen p-8 ${darkMode ? 'bg-gray-900' : 'bg-[#fdf6ef]'}`}>
                <Card className={`max-w-md mx-auto p-8 text-center ${darkMode ? 'bg-gray-800 border-gray-700' : 'border-[#e5b889]'}`}>
                    <h2 className={`text-xl font-semibold mb-2 ${darkMode ? 'text-white' : 'text-[#6b5344]'}`}>Discovery not found</h2>
                    <Link to={createPageUrl('Discoveries')}>
                        <Button className="rounded-xl bg-[#b66c34] hover:bg-[#8f5428]">{t('viewAll')}</Button>
                    </Link>
                </Card>
            </div>
        );
    }

    if (project.is_private && !canEdit) {
        return (
            <div className={`min-h-screen p-8 ${darkMode ? 'bg-gray-900' : 'bg-[#fdf6ef]'}`}>
                <Card className={`max-w-md mx-auto p-8 text-center ${darkMode ? 'bg-gray-800 border-gray-700' : 'border-[#e5b889]'}`}>
                    <Lock className="w-12 h-12 mx-auto mb-4 text-[#b66c34]" />
                    <h2 className={`text-xl font-semibold mb-2 ${darkMode ? 'text-white' : 'text-[#6b5344]'}`}>{t('private')}</h2>
                    <p className={darkMode ? 'text-gray-400' : 'text-[#8f7a6a]'}>This discovery is private</p>
                </Card>
            </div>
        );
    }

    return (
        <div className={`min-h-screen p-4 md:p-8 ${darkMode ? 'bg-gray-900' : 'bg-[#fdf6ef]'}`}>
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-4">
                    <Button variant="ghost" onClick={() => navigate(-1)} className={darkMode ? 'text-[#f4d0a8] hover:bg-gray-800' : 'text-[#b66c34] hover:bg-[#f4d0a8]'}>
                        <ArrowLeft className="w-4 h-4 mr-2" /> {t('back')}
                    </Button>
                    <div className="flex gap-2">
                        {canEdit && user && (
                            <Button variant="outline" onClick={() => togglePrivateMutation.mutate()} className={`rounded-xl ${darkMode ? 'border-gray-600 text-white hover:bg-gray-800' : 'border-[#b66c34] text-[#b66c34] hover:bg-[#f4d0a8]'}`}>
                                {project.is_private ? <><Unlock className="w-4 h-4 mr-2" />{t('makePublic')}</> : <><Lock className="w-4 h-4 mr-2" />{t('makePrivate')}</>}
                            </Button>
                        )}
                        <Button variant="outline" onClick={openExpertDialog} className={`rounded-xl ${darkMode ? 'border-gray-600 text-white hover:bg-gray-800' : 'border-[#b66c34] text-[#b66c34] hover:bg-[#f4d0a8]'}`}>
                            <Users className="w-4 h-4 mr-2" /> {t('contactExpert')}
                        </Button>
                        <Button variant="outline" onClick={() => setShareOpen(true)} className={`rounded-xl ${darkMode ? 'border-gray-600 text-white hover:bg-gray-800' : 'border-[#b66c34] text-[#b66c34] hover:bg-[#f4d0a8]'}`}>
                            <Share2 className="w-4 h-4 mr-2" /> {t('share')}
                        </Button>
                    </div>
                </div>

                {isNonArchaeological && (
                    <div className="mb-6 p-4 rounded-xl bg-orange-50 border border-orange-200">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="font-semibold text-orange-800">Niet-archeologisch object</p>
                                <p className="text-sm text-orange-700 mt-0.5">Dit object is niet zichtbaar in de community en kan niet worden gemeld bij de overheid.</p>
                                {isOwner && !appealSent && project?.appeal_status === 'none' && (
                                    <div className="mt-3 space-y-2">
                                        <textarea
                                            value={appealMessage}
                                            onChange={e => setAppealMessage(e.target.value)}
                                            placeholder="Licht toe waarom je denkt dat dit wel een archeologisch object is..."
                                            className="w-full text-sm border border-orange-300 rounded-lg p-2 bg-white resize-none focus:outline-none focus:border-orange-500"
                                            rows={3}
                                        />
                                        <button
                                            onClick={sendAppeal}
                                            disabled={!appealMessage.trim()}
                                            className="px-4 py-2 text-sm bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
                                        >
                                            Bezwaar indienen bij team ArcheOS
                                        </button>
                                    </div>
                                )}
                                {(appealSent || project?.appeal_status === 'pending') && (
                                    <div className="mt-3 flex items-center gap-2 text-sm text-orange-700">
                                        <Clock className="w-4 h-4" />
                                        Bezwaar ingediend — team ArcheOS bekijkt dit.
                                    </div>
                                )}
                                {project?.appeal_status === 'approved' && (
                                    <div className="mt-3 flex items-center gap-2 text-sm text-green-700">
                                        <CheckCircle className="w-4 h-4" />
                                        Bezwaar goedgekeurd — vondst is nu zichtbaar in de community.
                                    </div>
                                )}
                                {isAdmin && project?.appeal_status === 'pending' && (
                                    <button
                                        onClick={() => approveAppealMutation.mutate()}
                                        className="mt-3 px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                                    >
                                        Bezwaar goedkeuren (Admin)
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid lg:grid-cols-2 gap-6">
                    <Card className={`overflow-hidden ${darkMode ? 'bg-gray-800 border-gray-700' : 'border-[#e5b889]'}`}>
                        {project.is_private && (
                            <div className="absolute top-2 left-2 z-10">
                                <Badge className="bg-gray-800 text-white"><Lock className="w-3 h-3 mr-1" />{t('private')}</Badge>
                            </div>
                        )}
                        {project.image_url ? (
                            <img src={project.image_url} alt="Discovery" className="w-full aspect-square object-cover" />
                        ) : (
                            <div className={`w-full aspect-square flex items-center justify-center ${darkMode ? 'bg-gray-700' : 'bg-[#f4d0a8]'}`}>
                                <p className={darkMode ? 'text-gray-400' : 'text-[#8f7a6a]'}>No image</p>
                            </div>
                        )}
                    </Card>

                    <div className="space-y-4">
                        <Card className={`p-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'border-[#e5b889]'}`}>
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-[#6b5344]'}`}>
                                        {project.ai_identification?.name || project.name || 'Unknown Object'}
                                    </h1>
                                    {project.ai_identification?.period && (
                                        <p className="text-[#b66c34] font-medium mt-1">{project.ai_identification.period}</p>
                                    )}
                                </div>
                                <Badge variant="outline" className="capitalize border-[#b66c34] text-[#b66c34]">
                                    {project.status?.replace('_', ' ')}
                                </Badge>
                            </div>

                            <div className={`flex items-center gap-2 mb-3 p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-[#f4d0a8]/50'}`}>
                                <User className="w-4 h-4 text-[#b66c34]" />
                                <span className={darkMode ? 'text-gray-300' : 'text-[#6b5344]'}>
                                    {t('foundBy')} <strong>{project.finder_name || project.created_by?.split('@')[0] || 'Unknown'}</strong>
                                </span>
                            </div>

                            <div className="space-y-3 text-sm">
                                {project.location_name && (
                                    <div className={`flex items-center gap-2 ${darkMode ? 'text-gray-300' : 'text-[#6b5344]'}`}>
                                        <MapPin className="w-4 h-4 text-[#b66c34]" />
                                        {project.location_name}
                                    </div>
                                )}
                                {project.discovery_date && (
                                    <div className={`flex items-center gap-2 ${darkMode ? 'text-gray-300' : 'text-[#6b5344]'}`}>
                                        <Calendar className="w-4 h-4 text-[#b66c34]" />
                                        {t('foundOn')} {new Date(project.discovery_date).toLocaleDateString()}
                                    </div>
                                )}
                            </div>

                            {project.notes && (
                                <div className={`mt-4 pt-4 border-t ${darkMode ? 'border-gray-700' : 'border-[#e5b889]'}`}>
                                    <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-[#6b5344]'}`}>{project.notes}</p>
                                </div>
                            )}
                        </Card>

                        {project.ai_identification?.reference_links?.length > 0 && (
                            <Card className={`p-4 ${darkMode ? 'bg-gray-800 border-gray-700' : 'border-[#e5b889]'}`}>
                                <h3 className={`font-medium mb-3 text-sm ${darkMode ? 'text-white' : 'text-[#8f5428]'}`}>{t('databaseReferences')}</h3>
                                <div className="space-y-2">
                                    {project.ai_identification.reference_links.map((link, idx) => (
                                        <a key={idx} href={link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-[#b66c34] hover:text-[#8f5428]">
                                            <ExternalLink className="w-3 h-3" />
                                            {link.includes('portable-antiquities') ? 'PAN Database' : link.includes('cultureelerfgoed') ? 'RCE Beeldbank' : 'Reference'}
                                        </a>
                                    ))}
                                </div>
                            </Card>
                        )}

                        {!project.reported_to_government && user && !isNonArchaeological && (
                            <Link to={createPageUrl(`GovernmentReport?discoveryId=${project.id}`)}>
                                <Button className="w-full bg-[#8f5428] hover:bg-[#6b5344] rounded-xl py-6">
                                    <FileText className="w-5 h-5 mr-2" />
                                    {t('reportToGov')}
                                </Button>
                            </Link>
                        )}
                    </div>
                </div>

                {project.ai_identification && (
                    <div className="mt-6">
                        <AIAnalysisCard analysis={project.ai_identification} storageInstructions={project.storage_instructions} darkMode={darkMode} />
                    </div>
                )}

                {project.latitude && project.longitude && (
                    <Card className={`mt-6 p-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'border-[#e5b889]'}`}>
                        <h3 className={`font-semibold text-lg mb-4 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-[#8f5428]'}`}>
                            <MapPin className="w-5 h-5 text-[#b66c34]" />
                            Discovery Location
                        </h3>
                        <DiscoveryMap discoveries={[project]} center={[project.latitude, project.longitude]} zoom={13} interactive={false} />
                    </Card>
                )}

                {isAdmin && (
                    <Card className={`mt-6 p-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'border-[#e5b889]'}`}>
                        <h3 className={`font-semibold text-lg mb-4 ${darkMode ? 'text-white' : 'text-[#8f5428]'}`}>
                            Admin Actions
                        </h3>
                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                onClick={() => navigate(createPageUrl(`NewDiscovery?edit=${projectId}`))}
                                className={`flex-1 rounded-xl ${darkMode ? 'border-gray-600 text-white hover:bg-gray-700' : 'border-[#b66c34] text-[#b66c34] hover:bg-[#f9e4cc]'}`}
                            >
                                <Edit className="w-4 h-4 mr-2" />
                                Edit Discovery
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    if (confirm('Are you sure you want to delete this discovery? This action cannot be undone.')) {
                                        deleteMutation.mutate(projectId);
                                    }
                                }}
                                className="flex-1 rounded-xl border-red-500 text-red-500 hover:bg-red-50"
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Discovery
                            </Button>
                        </div>
                    </Card>
                )}
            </div>

            <ShareDialog open={shareOpen} onClose={() => setShareOpen(false)} discovery={project} username={project.finder_name || project.created_by?.split('@')[0]} />

            <Dialog open={expertDialogOpen} onOpenChange={setExpertDialogOpen}>
                <DialogContent className={darkMode ? 'bg-gray-800 border-gray-700' : ''}>
                    <DialogHeader>
                        <DialogTitle className={darkMode ? 'text-white' : 'text-[#8f5428]'}>
                            {t('contactExpert')}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-2">
                        <div>
                            <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-[#6b5344]'}`}>Select Expert</label>
                            <Select value={selectedExpertId} onValueChange={setSelectedExpertId}>
                                <SelectTrigger className={`mt-1 rounded-xl ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-[#e5b889]'}`}>
                                    <SelectValue placeholder="Choose an expert..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {sortedExperts.map(e => (
                                        <SelectItem key={e.id} value={e.id}>{e.name} — {e.specialization}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-[#6b5344]'}`}>Subject</label>
                            <Input value={expertSubject} onChange={e => setExpertSubject(e.target.value)} className={`mt-1 rounded-xl ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-[#e5b889]'}`} />
                        </div>
                        <div>
                            <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-[#6b5344]'}`}>Message</label>
                            <Textarea value={expertMessage} onChange={e => setExpertMessage(e.target.value)} rows={6} className={`mt-1 rounded-xl ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-[#e5b889]'}`} />
                        </div>
                        <Button onClick={sendToExpert} disabled={!selectedExpertId || !expertMessage} className="w-full bg-[#b66c34] hover:bg-[#8f5428] rounded-xl">
                            <Mail className="w-4 h-4 mr-2" /> Open in Email App
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
