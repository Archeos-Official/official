import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, Loader2, AlertTriangle, CheckCircle2, XCircle, ExternalLink, ChevronRight, Copy, Check } from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';
import { useAuth } from '@/lib/AuthContext';
import { projectsApi, reportsApi } from '@/api/supabaseApi';

function mapPeriodToRCE(period) {
    if (!period) return { begin: 'XXX', end: 'XXX' };
    const p = period.toLowerCase();
    if (p.includes('paleolith') || p.includes('old stone') || p.includes('oude steentijd')) return { begin: 'PALEO', end: 'PALEO' };
    if (p.includes('mesolith') || p.includes('midden-steentijd')) return { begin: 'MESO', end: 'MESO' };
    if (p.includes('neolith') || p.includes('jonge steentijd') || p.includes('new stone')) return { begin: 'NEO', end: 'NEO' };
    if (p.includes('bronze') || p.includes('brons')) return { begin: 'BRONS', end: 'BRONS' };
    if (p.includes('iron age') || p.includes('ijzertijd')) return { begin: 'IJZ', end: 'IJZ' };
    if (p.includes('roman') || p.includes('romein')) return { begin: 'ROM', end: 'ROM' };
    if (p.includes('early medieval') || p.includes('vroege middeleeuwen') || (p.includes('medieval') && (p.includes('early') || p.includes('450')))) return { begin: 'VME', end: 'VME' };
    if (p.includes('late medieval') || p.includes('late middeleeuwen') || p.includes('middeleeuwen')) return { begin: 'LME', end: 'LME' };
    if (p.includes('early modern') || p.includes('nieuwe tijd') || p.includes('1500') || p.includes('1650') || p.includes('1800')) return { begin: 'NT', end: 'NT' };
    if (p.includes('modern') || p.includes('1800') || p.includes('1850') || p.includes('present') || p.includes('heden')) return { begin: 'NTC', end: 'NTC' };
    return { begin: 'XXX', end: 'XXX' };
}

function mapMaterialToRCE(material) {
    if (!material) return '';
    const m = material.toLowerCase();
    if (m.includes('glas') || m.includes('glass')) return 'Glas';
    if (m.includes('keramiek') || m.includes('ceramic') || m.includes('pottery') || m.includes('clay') || m.includes('aardewerk')) return 'Keramiek';
    if (m.includes('brons') || m.includes('bronze')) return 'Brons';
    if (m.includes('goud') || m.includes('gold')) return 'Goud';
    if (m.includes('ijzer') || m.includes('iron')) return 'IJzer';
    if (m.includes('koper') || m.includes('copper')) return 'Koper';
    if (m.includes('lood') || m.includes('lead')) return 'Lood';
    if (m.includes('messing') || m.includes('brass')) return 'Messing';
    if (m.includes('tin') || m.includes('pewter')) return 'Tin of lood-tin legering';
    if (m.includes('zilver') || m.includes('silver')) return 'Zilver';
    if (m.includes('metaal') || m.includes('metal')) return 'Metaal';
    if (m.includes('bot') || m.includes('bone')) return 'Bot, dierlijk';
    if (m.includes('hout') || m.includes('wood')) return 'Hout/houtskool';
    if (m.includes('leer') || m.includes('leather')) return 'Leer/huid/bont';
    if (m.includes('steen') || m.includes('stone')) return 'Steen';
    if (m.includes('vuursteen') || m.includes('flint')) return 'Vuursteen';
    if (m.includes('barnst') || m.includes('amber')) return 'Barnsteen';
    return 'Onbekend';
}

function mapDetectionMethod(method) {
    if (!method) return 'onbekend';
    const m = method.toLowerCase();
    if (m.includes('metal')) return 'metaaldetector';
    if (m.includes('digg') || m.includes('graaf')) return 'graafwerk';
    if (m.includes('surface') || m.includes('kartering')) return 'kartering';
    if (m.includes('construction') || m.includes('bagger')) return 'baggerwerk';
    return 'onbekend';
}

const REQUIRED_FIELDS = [
    { key: 'finder_name', label: 'Your name', source: 'user' },
    { key: 'finder_email', label: 'Your email', source: 'user' },
    { key: 'location_x', label: 'X-coordinate (longitude area)', source: 'map' },
    { key: 'location_y', label: 'Y-coordinate (latitude area)', source: 'map' },
    { key: 'toponiem', label: 'Toponiem (field/street name)', source: 'user_input' },
    { key: 'vondstverwerving', label: 'Detection method', source: 'discovery' },
    { key: 'aantal', label: 'Number of finds', source: 'user_input' },
    { key: 'toestand', label: 'Condition of the find', source: 'discovery' },
    { key: 'materiaal', label: 'Material', source: 'discovery' },
    { key: 'determinatie', label: 'Object identification', source: 'ai' },
    { key: 'datering_begin', label: 'Start period (datering begin)', source: 'ai' },
    { key: 'datering_eind', label: 'End period (datering eind)', source: 'ai' },
    { key: 'toelichting', label: 'Description/notes (toelichting)', source: 'ai_or_user' },
];

export default function GovernmentReport() {
    const navigate = useNavigate();
    const { t, darkMode } = useLanguage();
    const { user, isAuthenticated, navigateToLogin } = useAuth();
    const queryClient = useQueryClient();

    const urlParams = new URLSearchParams(window.location.search);
    const preselectedId = urlParams.get('discoveryId');

    const [step, setStep] = useState(preselectedId ? 'review' : 'select');
    const [selectedDiscoveryId, setSelectedDiscoveryId] = useState(preselectedId || null);
    const [extraFields, setExtraFields] = useState({
        toponiem: '',
        aantal: '1',
        toelichting: '',
        current_storage: '',
        plaats: '',
        finder_name: '',
        finder_email: '',
    });
    const [copiedField, setCopiedField] = useState(null);

    const { data: guestProject, isLoading: loadingGuestProject } = useQuery({
        queryKey: ['guestProject', preselectedId],
        queryFn: async () => {
            if (!preselectedId) return null;
            return projectsApi.getById(preselectedId);
        },
        enabled: !user && !!preselectedId
    });

    const { data: myProjects = [], isLoading: loadingProjects } = useQuery({
        queryKey: ['myProjects', user?.email],
        queryFn: () => projectsApi.getMyProjects(100),
        enabled: !!user
    });

    const selectedProject = user 
        ? myProjects.find(p => p.id === selectedDiscoveryId)
        : guestProject;

    useEffect(() => {
        if (selectedProject?.location_name && !extraFields.toponiem) {
            setExtraFields(f => ({ ...f, toponiem: selectedProject.location_name }));
        }
    }, [selectedProject?.id]);

    const saveMutation = useMutation({
        mutationFn: async () => {
            const report = await reportsApi.create({
                discovery_id: selectedDiscoveryId,
                finder_name: user?.full_name || extraFields.finder_name || '',
                finder_email: user?.email || extraFields.finder_email || '',
                find_date: selectedProject?.discovery_date || '',
                location_description: selectedProject?.location_name || extraFields.toponiem || '',
                object_description: buildDeterminatie(),
                circumstances: extraFields.vondstverwerving || mapDetectionMethod(selectedProject?.detection_method),
                current_storage: extraFields.current_storage,
                latitude: selectedProject?.latitude,
                longitude: selectedProject?.longitude,
                status: 'submitted',
                reference_number: `ARCH-${Date.now().toString(36).toUpperCase()}`
            });
            if (selectedDiscoveryId) {
                await projectsApi.update(selectedDiscoveryId, {
                    reported_to_government: true,
                    report_date: new Date().toISOString().split('T')[0],
                    status: 'reported'
                });
            }
            return report;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['myReports'] });
            setStep('copy');
        }
    });

    function copyToClipboard(text, key) {
        navigator.clipboard.writeText(text);
        setCopiedField(key);
        setTimeout(() => setCopiedField(null), 2000);
    }

    function buildFormData() {
        const ai = selectedProject?.ai_identification;
        const periods = mapPeriodToRCE(ai?.period);
        const material = mapMaterialToRCE(extraFields.materiaal || selectedProject?.material || ai?.material);
        const detection = extraFields.vondstverwerving || mapDetectionMethod(selectedProject?.detection_method);
        const toelichting = buildToelichting();
        const determinatie = buildDeterminatie();
        const toponiem = extraFields.toponiem || selectedProject?.location_name || '';

        const dateStr = selectedProject?.discovery_date
            ? (() => { const d = new Date(selectedProject.discovery_date); return `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`; })()
            : '';

        return [
            { label: 'Naam', value: user?.full_name || extraFields.finder_name || 'Vul hier uw naam in' },
            { label: 'E-mailadres', value: user?.email || extraFields.finder_email || '' },
            { label: 'Datum vondst', value: dateStr },
            { label: 'X-coördinaat (longitude)', value: selectedProject?.longitude ? selectedProject.longitude.toFixed(6) : '' },
            { label: 'Y-coördinaat (latitude)', value: selectedProject?.latitude ? selectedProject.latitude.toFixed(6) : '' },
            { label: 'Toponiem', value: toponiem },
            { label: 'Plaats', value: extraFields.plaats || '' },
            { label: 'Vondstverwerving', value: detection },
            { label: 'Aantal', value: extraFields.aantal || '1' },
            { label: 'Toestand', value: extraFields.toestand || selectedProject?.condition || '' },
            { label: 'Materiaal', value: material },
            { label: 'Determinatie (vondst/grondspoor)', value: determinatie },
            { label: 'Datering beginperiode', value: periods.begin },
            { label: 'Datering eindperiode', value: periods.end },
            { label: 'Toelichting', value: toelichting },
        ];
    }

    function buildDeterminatie() {
        const ai = selectedProject?.ai_identification;
        if (!ai) return selectedProject?.name || '';
        return ai.name || selectedProject?.name || '';
    }

    function buildToelichting() {
        const ai = selectedProject?.ai_identification;
        const parts = [];
        if (ai?.description) parts.push(ai.description);
        if (ai?.similar_finds) parts.push(`Similar finds: ${ai.similar_finds}`);
        if (selectedProject?.notes) parts.push(`Notes: ${selectedProject.notes}`);
        if (extraFields.toelichting) parts.push(extraFields.toelichting);
        return parts.join(' | ');
    }

    function getMissingFields() {
        const missing = [];
        const ai = selectedProject?.ai_identification;

        if (!user?.full_name && !extraFields.finder_name) missing.push('finder_name');
        if (!user?.email && !extraFields.finder_email) missing.push('finder_email');
        if (!selectedProject?.latitude || !selectedProject?.longitude) missing.push('location_x');
        if (!extraFields.toponiem) missing.push('toponiem');
        if (!selectedProject?.detection_method) missing.push('vondstverwerving');
        if (!selectedProject?.condition) missing.push('toestand');
        if (!selectedProject?.material && !ai?.material) missing.push('materiaal');
        if (!ai?.name && !selectedProject?.name) missing.push('determinatie');
        if (!ai?.period) missing.push('datering_begin');
        if (!ai?.description && !selectedProject?.notes && !extraFields.toelichting) missing.push('toelichting');

        return missing;
    }

    const missingFields = selectedProject ? getMissingFields() : [];
    const hasMissing = missingFields.length > 0;

    const inputClass = darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-[#e5b889] focus:border-[#b66c34]';
    const cardClass = darkMode ? 'bg-gray-800 border-gray-700' : 'border-[#e5b889]';
    const textClass = darkMode ? 'text-white' : 'text-[#8f5428]';
    const mutedClass = darkMode ? 'text-gray-400' : 'text-[#8f7a6a]';
    const labelClass = `text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-[#6b5344]'}`;
    const isGuest = !user;

    return (
        <div className={`min-h-screen p-4 md:p-8 ${darkMode ? 'bg-gray-900' : 'bg-[#fdf6ef]'}`}>
            <div className="max-w-3xl mx-auto">
                <Button variant="ghost" onClick={() => navigate(-1)} className={`mb-4 ${darkMode ? 'text-[#f4d0a8] hover:bg-gray-800' : 'text-[#b66c34] hover:bg-[#f4d0a8]'}`}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> {t('back')}
                </Button>

                <div className="mb-6">
                    <h1 className={`text-3xl font-bold flex items-center gap-3 ${textClass}`}>
                        <FileText className="w-8 h-8 text-[#b66c34]" />
                        Report to Government
                    </h1>
                    <p className={`mt-1 ${mutedClass}`}>Report your find to Rijksdienst voor het Cultureel Erfgoed (RCE)</p>
                </div>

                {step === 'copy' && selectedProject && (
                    <div className="space-y-6">
                        <Card className={`p-4 ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-green-50 border-green-200'}`}>
                            <div className="flex gap-3">
                                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                                <p className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-green-700'}`}>
                                    Report saved! Now open the government form and copy each value below. Click any value to copy it.
                                </p>
                            </div>
                        </Card>

                        <Card className={`p-6 ${cardClass}`}>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className={`font-semibold text-lg ${textClass}`}>Values to fill in on the government form</h2>
                                <Button
                                    onClick={() => window.open('https://formulier.cultureelerfgoed.nl/archis/vondstmeldingsformulier', '_blank')}
                                    className="bg-[#b66c34] hover:bg-[#8f5428] rounded-xl text-sm"
                                >
                                    <ExternalLink className="w-4 h-4 mr-2" /> Open Form
                                </Button>
                            </div>

                            <div className="space-y-3">
                                {buildFormData().map((item) => (
                                    <div key={item.label} className={`rounded-xl border p-3 ${darkMode ? 'border-gray-600 bg-gray-700' : 'border-[#e5b889] bg-white'}`}>
                                        <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${mutedClass}`}>{item.label}</p>
                                        {item.value ? (
                                            <button
                                                onClick={() => copyToClipboard(item.value, item.label)}
                                                className={`w-full text-left flex items-center justify-between gap-2 group`}
                                            >
                                                <span className={`text-sm font-medium ${textClass}`}>{item.value}</span>
                                                <span className={`flex-shrink-0 ${copiedField === item.label ? 'text-green-500' : (darkMode ? 'text-gray-500 group-hover:text-gray-300' : 'text-gray-400 group-hover:text-[#b66c34]')}`}>
                                                    {copiedField === item.label ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                                </span>
                                            </button>
                                        ) : (
                                            <p className="text-sm text-red-400 italic">— not available —</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </Card>

                        <Card className={`p-4 ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-amber-50 border-amber-200'}`}>
                            <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-amber-700'}`}>
                                ⚠️ <strong>Note:</strong> The X and Y coordinates are in decimal degrees (WGS84). The form uses RD New (Rijksdriehoek) — you may need to convert them. Use <a href="https://epsg.io/transform#s_srs=4326&t_srs=28992" target="_blank" rel="noopener noreferrer" className="underline">epsg.io/transform</a> to convert.
                                Also don't forget to upload photos of the front, back, and side.
                            </p>
                        </Card>

                        <Button onClick={() => navigate(createPageUrl('Reports'))} className="w-full bg-[#b66c34] hover:bg-[#8f5428] rounded-xl">
                            Done — Go to Reports
                        </Button>
                    </div>
                )}

                {step === 'select' && !preselectedId && (
                    <div className="space-y-4">
                        <Card className={`p-4 ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-[#f4d0a8]/50 border-[#c98a54]'}`}>
                            <div className="flex gap-3">
                                <AlertTriangle className="w-5 h-5 text-[#b66c34] flex-shrink-0 mt-0.5" />
                                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-[#6b5344]'}`}>
                                    Select which discovery you want to report. We'll check if all required information is available and help you fill in the government form.
                                </p>
                            </div>
                        </Card>

                        {isGuest ? (
                            <Card className={`p-12 text-center ${cardClass}`}>
                                <p className={mutedClass}>Please provide a discovery ID or sign in to select from your discoveries.</p>
                                <Button onClick={navigateToLogin} className="mt-4 bg-[#b66c34] hover:bg-[#8f5428] rounded-xl">{t('signIn')}</Button>
                            </Card>
                        ) : loadingProjects ? (
                            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-[#b66c34]" /></div>
                        ) : myProjects.length === 0 ? (
                            <Card className={`p-12 text-center ${cardClass}`}>
                                <p className={mutedClass}>You have no discoveries yet. Add one first.</p>
                            </Card>
                        ) : (
                            <div className="space-y-3">
                                {myProjects.map(project => (
                                    <Card
                                        key={project.id}
                                        className={`p-4 cursor-pointer hover:shadow-md transition-all ${cardClass} ${selectedDiscoveryId === project.id ? (darkMode ? 'ring-2 ring-[#b66c34]' : 'ring-2 ring-[#b66c34]') : ''}`}
                                        onClick={() => setSelectedDiscoveryId(project.id)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                {project.image_url && (
                                                    <img src={project.image_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
                                                )}
                                                <div>
                                                    <p className={`font-medium ${textClass}`}>{project.ai_identification?.name || project.name}</p>
                                                    <p className={`text-sm ${mutedClass}`}>{project.location_name || 'No location'} · {project.discovery_date || 'No date'}</p>
                                                    {project.reported_to_government && (
                                                        <Badge className="mt-1 bg-green-100 text-green-700 text-xs">Already reported</Badge>
                                                    )}
                                                </div>
                                            </div>
                                            <ChevronRight className={`w-5 h-5 ${darkMode ? 'text-gray-500' : 'text-[#b66c34]'}`} />
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        )}

                        {selectedDiscoveryId && (
                            <Button
                                onClick={() => setStep('review')}
                                className="w-full bg-[#b66c34] hover:bg-[#8f5428] rounded-xl py-6 mt-4"
                            >
                                Review & Check Information <ChevronRight className="w-5 h-5 ml-2" />
                            </Button>
                        )}
                    </div>
                )}

                {step === 'review' && selectedProject && (
                    <div className="space-y-6">
                        <Card className={`p-6 ${cardClass}`}>
                            <h2 className={`font-semibold text-lg mb-4 ${textClass}`}>Information check for: <span className="text-[#b66c34]">{selectedProject.ai_identification?.name || selectedProject.name}</span></h2>

                            <div className="space-y-2">
                                {REQUIRED_FIELDS.map(field => {
                                    const isMissing = missingFields.includes(field.key);
                                    return (
                                        <div key={field.key} className="flex items-center gap-3">
                                            {isMissing
                                                ? <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                                                : <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                                            }
                                            <span className={`text-sm ${isMissing ? 'text-red-500 font-medium' : (darkMode ? 'text-gray-300' : 'text-[#6b5344]')}`}>
                                                {field.label}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>

                        {hasMissing && (
                            <Card className={`p-6 ${cardClass}`}>
                                <div className="flex items-start gap-3 mb-4">
                                    <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className={`font-semibold ${textClass}`}>Some information is missing</p>
                                        <p className={`text-sm ${mutedClass}`}>Please fill in the missing fields below so the government form can be completed properly.</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {missingFields.includes('finder_name') && (
                                        <div>
                                            <label className={labelClass}>Your name *</label>
                                            <Input value={extraFields.finder_name} onChange={e => setExtraFields({...extraFields, finder_name: e.target.value})} placeholder="e.g. Jan de Vries" className={`mt-1 rounded-xl ${inputClass}`} />
                                        </div>
                                    )}

                                    {missingFields.includes('finder_email') && (
                                        <div>
                                            <label className={labelClass}>Your email *</label>
                                            <Input value={extraFields.finder_email} onChange={e => setExtraFields({...extraFields, finder_email: e.target.value})} placeholder="e.g. jan@example.com" type="email" className={`mt-1 rounded-xl ${inputClass}`} />
                                        </div>
                                    )}

                                    {missingFields.includes('location_x') && (
                                        <div className={`p-3 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-red-50'} border border-red-200`}>
                                            <p className="text-sm text-red-600 font-medium">⚠️ No location coordinates found</p>
                                            <p className="text-xs text-red-500 mt-1">Go back to this discovery and add a map location.</p>
                                        </div>
                                    )}

                                    {missingFields.includes('toponiem') && (
                                        <div>
                                            <label className={labelClass}>Toponiem * <span className={mutedClass}>(field/street/water name where found)</span></label>
                                            <Input value={extraFields.toponiem} onChange={e => setExtraFields({...extraFields, toponiem: e.target.value})} placeholder="e.g. Binnenveld, Maas, Dorpsstraat" className={`mt-1 rounded-xl ${inputClass}`} />
                                        </div>
                                    )}

                                    {missingFields.includes('vondstverwerving') && (
                                        <div>
                                            <label className={labelClass}>Detection method (Vondstverwerving) *</label>
                                            <Select onValueChange={v => setExtraFields({...extraFields, vondstverwerving: v})}>
                                                <SelectTrigger className={`mt-1 rounded-xl ${inputClass}`}><SelectValue placeholder="Select..." /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="metaaldetector">Metal detector</SelectItem>
                                                    <SelectItem value="graafwerk">Digging (graafwerk)</SelectItem>
                                                    <SelectItem value="kartering">Surface find (kartering)</SelectItem>
                                                    <SelectItem value="baggerwerk">Dredging (baggerwerk)</SelectItem>
                                                    <SelectItem value="boring">Borehole (boring)</SelectItem>
                                                    <SelectItem value="duikactiviteiten">Diving</SelectItem>
                                                    <SelectItem value="onbekend">Unknown</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}

                                    {missingFields.includes('toestand') && (
                                        <div>
                                            <label className={labelClass}>Condition (Toestand) *</label>
                                            <Select onValueChange={v => setExtraFields({...extraFields, toestand: v})}>
                                                <SelectTrigger className={`mt-1 rounded-xl ${inputClass}`}><SelectValue placeholder="Select..." /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="compleet">Complete</SelectItem>
                                                    <SelectItem value="fragment">Fragment</SelectItem>
                                                    <SelectItem value="n.v.t.">N/A</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}

                                    {missingFields.includes('materiaal') && (
                                        <div>
                                            <label className={labelClass}>Material (Materiaal) *</label>
                                            <Input value={extraFields.materiaal || ''} onChange={e => setExtraFields({...extraFields, materiaal: e.target.value})} placeholder="e.g. Bronze, Silver, Clay..." className={`mt-1 rounded-xl ${inputClass}`} />
                                        </div>
                                    )}

                                    {missingFields.includes('toelichting') && (
                                        <div>
                                            <label className={labelClass}>Description / notes (Toelichting) *</label>
                                            <Textarea value={extraFields.toelichting} onChange={e => setExtraFields({...extraFields, toelichting: e.target.value})} placeholder="Describe the find in more detail: dimensions, markings, condition details, etc." className={`mt-1 rounded-xl ${inputClass}`} rows={4} />
                                        </div>
                                    )}
                                </div>
                            </Card>
                        )}

                        <Card className={`p-6 ${cardClass}`}>
                            <h3 className={`font-semibold mb-4 ${textClass}`}>Additional details <span className={`font-normal text-sm ${mutedClass}`}>(optional but helpful)</span></h3>
                            <div className="space-y-4">
                                {!missingFields.includes('toponiem') && (
                                    <div>
                                        <label className={labelClass}>Toponiem <span className={mutedClass}>(field/street name)</span></label>
                                        <Input value={extraFields.toponiem} onChange={e => setExtraFields({...extraFields, toponiem: e.target.value})} placeholder="e.g. Binnenveld, Maas" className={`mt-1 rounded-xl ${inputClass}`} />
                                    </div>
                                )}
                                <div>
                                    <label className={labelClass}>Plaats <span className={mutedClass}>(nearest city/town)</span></label>
                                    <Input value={extraFields.plaats} onChange={e => setExtraFields({...extraFields, plaats: e.target.value})} placeholder="e.g. Utrecht, Amsterdam" className={`mt-1 rounded-xl ${inputClass}`} />
                                </div>
                                <div>
                                    <label className={labelClass}>Aantal <span className={mutedClass}>(number of finds)</span></label>
                                    <Input value={extraFields.aantal} onChange={e => setExtraFields({...extraFields, aantal: e.target.value})} placeholder="1" className={`mt-1 rounded-xl ${inputClass}`} />
                                </div>
                                <div>
                                    <label className={labelClass}>Current storage <span className={mutedClass}>(where is the find now?)</span></label>
                                    <Input value={extraFields.current_storage} onChange={e => setExtraFields({...extraFields, current_storage: e.target.value})} placeholder="e.g. At home, in a box" className={`mt-1 rounded-xl ${inputClass}`} />
                                </div>
                                {!missingFields.includes('toelichting') && (
                                    <div>
                                        <label className={labelClass}>Extra notes for toelichting <span className={mutedClass}>(optional)</span></label>
                                        <Textarea value={extraFields.toelichting} onChange={e => setExtraFields({...extraFields, toelichting: e.target.value})} placeholder="Any extra details about the find..." className={`mt-1 rounded-xl ${inputClass}`} rows={3} />
                                    </div>
                                )}
                            </div>
                        </Card>

                        <Card className={`p-4 ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-[#f4d0a8]/50 border-[#c98a54]'}`}>
                            <div className="flex gap-3">
                                <ExternalLink className="w-5 h-5 text-[#b66c34] flex-shrink-0 mt-0.5" />
                                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-[#6b5344]'}`}>
                                    When you click "Open Government Form", we'll open the official RCE form with all your information pre-filled. You may still need to upload photos and check the coordinate format manually.
                                </p>
                            </div>
                        </Card>

                        <div className="flex gap-4">
                            <Button variant="outline" onClick={() => setStep('select')} className={`flex-1 rounded-xl ${darkMode ? 'border-gray-600 text-white' : 'border-[#b66c34] text-[#b66c34]'}`}>
                                <ArrowLeft className="w-4 h-4 mr-2" /> Back
                            </Button>
                            <Button
                                onClick={() => saveMutation.mutate()}
                                disabled={saveMutation.isPending}
                                className="flex-1 bg-[#b66c34] hover:bg-[#8f5428] rounded-xl"
                            >
                                {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ChevronRight className="w-4 h-4 mr-2" />}
                                Continue to Copy Checklist
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
