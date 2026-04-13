import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, MapPin, ArrowLeft, ArrowRight, Check, Database, Plus, X, Navigation, ExternalLink, AlertTriangle, CheckCircle2 } from 'lucide-react';
import ImageUpload from '@/components/ui/ImageUpload';
import DiscoveryMap from '@/components/discovery/DiscoveryMap';
import AIAnalysisCard from '@/components/discovery/AIAnalysisCard';
import { useLanguage } from '@/components/LanguageContext';
import { useAuth } from '@/lib/AuthContext';
import { projectsApi, creditLogsApi } from '@/api/supabaseApi';
import { uploadImage } from '@/api/storage';
import { analyzeArtifact, deepResearchArtifact, translateDiscovery } from '@/api/aiService';
import { supabase } from '@/api/supabaseClient';

const StepItem = ({ status, step, darkMode, label }) => {
    const steps = ['upload', 'analyze', 'translating', 'complete'];
    const currentIndex = steps.indexOf(status);
    const stepIndex = steps.indexOf(step);
    
    const isCompleted = currentIndex > stepIndex;
    const isActive = currentIndex === stepIndex;
    
    const textColor = isCompleted ? 'text-green-500' : isActive ? (darkMode ? 'text-[#f4d0a8]' : 'text-[#8f5428]') : (darkMode ? 'text-gray-500' : 'text-[#c98a54]');
    
    const circleBg = isCompleted ? 'bg-green-500 text-white' : isActive ? 'bg-[#b66c34] text-white animate-pulse' : (darkMode ? 'bg-gray-700 text-gray-500' : 'bg-[#e5b889] text-[#c98a54]');
    
    return (
        <div className={`flex items-center gap-3 text-sm ${textColor}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${circleBg}`}>
                {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : stepIndex + 1}
            </div>
            <span>{label}</span>
        </div>
    );
};

export default function NewDiscovery() {
    const navigate = useNavigate();
    const { t, darkMode, language } = useLanguage();
    const { user, isAuthenticated } = useAuth();
    const [step, setStep] = useState(1);
    const [imageUrl, setImageUrl] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [additionalImages, setAdditionalImages] = useState([]);
    const [uploads, setUploads] = useState([]);
    const [analysis, setAnalysis] = useState(null);
    const [storageInstructions, setStorageInstructions] = useState(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [analyzeStatus, setAnalyzeStatus] = useState('');
    const [location, setLocation] = useState(null);
    const [gettingLocation, setGettingLocation] = useState(false);
    const [isPrivate, setIsPrivate] = useState(false);
    const [referenceLinks, setReferenceLinks] = useState([]);
    const [isArchaeological, setIsArchaeological] = useState(true);
    const [form, setForm] = useState({
        name: '',
        location_name: '',
        notes: '',
        discovery_date: new Date().toISOString().split('T')[0],
        depth_found: '',
        soil_type: '',
        condition: '',
        detection_method: '',
        material: ''
    });

    const isGuest = !isAuthenticated;

    const createMutation = useMutation({
        mutationFn: (data) => projectsApi.create(data),
        onSuccess: (data) => {
            navigate(createPageUrl(`DiscoveryDetail?id=${data.id}`));
        }
    });

    const getCurrentLocation = () => {
        setGettingLocation(true);
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
                    setGettingLocation(false);
                },
                () => setGettingLocation(false)
            );
        } else {
            setGettingLocation(false);
        }
    };

    useEffect(() => {
        if (step === 2 && !location) {
            getCurrentLocation();
        }
    }, [step]);

    const analyzeImage = async () => {
        if (!imageUrl) return;
        setAnalyzing(true);
        setAnalyzeStatus(t('uploadingImages'));

        try {
            const allImages = [imageUrl, ...additionalImages].filter(Boolean);
            
            const { data: { user: supabaseUser } } = await supabase.auth.getUser();
            
            let uploadedUrls = [];
            for (const img of allImages) {
                try {
                    if (typeof img === 'string' && img.startsWith('data:')) {
                        const blob = await fetch(img).then(r => r.blob());
                        const file = new File([blob], 'image.jpg', { type: 'image/jpeg' });
                        const url = await uploadImage(file, supabaseUser?.id);
                        uploadedUrls.push(url);
                    } else if (typeof img === 'object') {
                        const url = await uploadImage(img, supabaseUser?.id);
                        uploadedUrls.push(url);
                    } else {
                        uploadedUrls.push(img);
                    }
                } catch (uploadError) {
                    console.error('Image upload failed:', uploadError);
                    alert('Image upload failed. Please check if the storage bucket exists and you have permission.');
                    setAnalyzing(false);
                    setAnalyzeStatus('');
                    return;
                }
            }
            setUploads(uploadedUrls);

setAnalyzeStatus('upload');
            
            // Small delay then start analysis
            await new Promise(r => setTimeout(r, 500));
            setAnalyzeStatus('ai_initial_scan');
            
            const result = await analyzeArtifact(uploadedUrls, form, language);
            
            console.log('Initial Analysis result:', result);

            if (form.material && result.identification) {
                result.identification.material = form.material;
            }

            // Check if we need more processing
            if (result.identification?.confidence > 60) {
                setAnalyzeStatus('ai_self_check');
                // The AI already does self-check in the worker
                await new Promise(r => setTimeout(r, 500));
            }

            const links = [];
            if (result.is_coin) links.push({ label: 'Duiten.nl – Dutch Coin Reference', url: 'https://www.duiten.nl' });
            if (result.is_pipe) links.push({ label: 'Kleipijpen.nl – Clay Pipe Reference', url: 'https://www.kleipijpen.nl' });
            // Add research links based on identified type
            if (result.identification?.name?.toLowerCase().includes('roman')) {
                links.push({ label: 'Roman Britain Database', url: 'https://roman-britain.org' });
            }
            if (result.identification?.name?.toLowerCase().includes('medieval')) {
                links.push({ label: 'Medieval Archaeology Database', url: 'https://adsabs.harvard.edu' });
            }
            setReferenceLinks(links);

            const archaeological = result.is_archaeological !== false;
            setIsArchaeological(archaeological);

            let finalIdentification = result.identification;
            let finalStorage = result.storage_instructions;
            
            // Auto-translate if not English
            if (language !== 'en') {
                setAnalyzeStatus('translating');
                const translated = await translateDiscovery(result.identification, result.storage_instructions, language);
                finalIdentification = translated.identification;
                finalStorage = translated.storage_instructions;
            }
            
            setAnalyzeStatus('complete');
            
            // Set results
            setAnalysis(finalIdentification);
            setStorageInstructions(finalStorage);
            setForm(prev => ({ ...prev, name: finalIdentification?.name || prev.name }));
            
            await new Promise(r => setTimeout(r, 800));
            
            setAnalyzing(false);
            setAnalyzeStatus('');
            setStep(2);
        } catch (error) {
            console.error('Analysis failed:', error);
            setAnalyzing(false);
            setAnalyzeStatus('');
            alert('AI analysis failed. Please try again.');
        }
    };

    const handleLocationSelect = (latlng) => setLocation({ lat: latlng.lat, lng: latlng.lng });

    const handleSubmit = async () => {
        const userEmail = user?.email || 'anonymous';
        const finderName = isGuest ? 'Anoniem' : (user?.full_name || user?.email?.split('@')[0] || 'Anoniem');

        const payload = {
            ...form,
            image_url: uploads[0],
            additional_images: uploads.slice(1),
            ai_identification: analysis,
            storage_instructions: storageInstructions,
            latitude: location?.lat,
            longitude: location?.lng,
            status: 'identified',
            finder_name: finderName,
            is_private: isArchaeological ? (isGuest ? false : isPrivate) : true,
            is_archaeological: isArchaeological,
            appeal_status: 'none'
        };

        createMutation.mutate(payload, {
            onSuccess: async (data) => {
                if (!isArchaeological) {
                    navigate(createPageUrl('Home'));
                    return;
                }
                
                await creditLogsApi.create({
                    discovery_id: data.id,
                    discovery_name: data.name,
                    credits_used: 1,
                    operation_type: 'ai_analysis',
                    user_email: userEmail
                }).catch(() => {});

                if (isGuest) {
                    navigate(createPageUrl(`GovernmentReport?discoveryId=${data.id}`));
                }
            }
        });
    };

    const cardClass = darkMode ? 'bg-gray-800 border-gray-700' : 'border-[#e5b889]';
    const textClass = darkMode ? 'text-white' : 'text-[#8f5428]';
    const mutedClass = darkMode ? 'text-gray-400' : 'text-[#8f7a6a]';
    const inputClass = darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-[#e5b889] focus:border-[#b66c34]';
    const labelClass = `text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-[#6b5344]'}`;

    return (
        <div className={`min-h-screen p-4 md:p-8 ${darkMode ? 'bg-gray-900' : 'bg-[#fdf6ef]'}`}>
            <div className="max-w-3xl mx-auto">
                <Button variant="ghost" onClick={() => navigate(-1)} className={`mb-4 ${darkMode ? 'text-[#f4d0a8] hover:bg-gray-800' : 'text-[#b66c34] hover:bg-[#f4d0a8]'}`}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> {t('back')}
                </Button>

                <div className="mb-8">
                    <h1 className={`text-3xl font-bold ${textClass}`}>{t('newDiscovery')}</h1>
                </div>

                <div className="flex items-center gap-4 mb-8">
                    {[1, 2, 3].map((s) => (
                        <React.Fragment key={s}>
                            <div className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold transition-all ${step >= s ? 'bg-[#b66c34] text-white' : darkMode ? 'bg-gray-700 text-gray-400' : 'bg-[#e5b889] text-[#8f7a6a]'}`}>
                                {step > s ? <Check className="w-5 h-5" /> : s}
                            </div>
                            {s < 3 && <div className={`flex-1 h-1 rounded-full ${step > s ? 'bg-[#b66c34]' : darkMode ? 'bg-gray-700' : 'bg-[#e5b889]'}`} />}
                        </React.Fragment>
                    ))}
                    <span className={`ml-2 text-sm ${mutedClass}`}>{t(`step${step}`)}</span>
                </div>

                {step === 1 && (
                    <Card className={`p-6 ${cardClass}`}>
                        <h2 className={`text-xl font-semibold mb-4 ${textClass}`}>Step 1: {t('uploadPhoto')}</h2>

                        <ImageUpload onImageUploaded={(file) => {
                            setImageUrl(file);
                            setImagePreview(file ? URL.createObjectURL(file) : null);
                        }} darkMode={darkMode} />

                        {imageUrl && (
                            <div className="mt-4">
                                <p className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-[#6b5344]'}`}>{t('additionalPhotos')} <span className={mutedClass}>(optional)</span></p>
                                <div className="grid grid-cols-4 gap-2">
                                    {additionalImages.map((img, idx) => (
                                       <div key={idx} className="relative aspect-square rounded-lg overflow-hidden">
                                           <img src={URL.createObjectURL(img)} alt="" className="w-full h-full object-cover" />
                                           <button onClick={() => setAdditionalImages(prev => prev.filter((_, i) => i !== idx))} className="absolute top-1 right-1 p-1 bg-black/50 rounded-full">
                                               <X className="w-3 h-3 text-white" />
                                           </button>
                                       </div>
                                    ))}
                                    {additionalImages.length < 4 && (
                                        <label className={`aspect-square rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer ${darkMode ? 'border-gray-600 hover:border-[#b66c34]' : 'border-[#c98a54] hover:border-[#b66c34]'}`}>
                                            <Plus className="w-6 h-6 text-[#b66c34]" />
                                            <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    setAdditionalImages(prev => [...prev, file]);
                                                }
                                            }} />
                                        </label>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="mt-6">
                            <p className={`text-sm font-semibold mb-3 ${textClass}`}>Optional details <span className={`font-normal ${mutedClass}`}>— helps AI identify more accurately</span></p>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}>{t('depthFound')} <span className={mutedClass}>(optional)</span></label>
                                    <Select value={form.depth_found} onValueChange={(v) => setForm({...form, depth_found: v})}>
                                        <SelectTrigger className={`mt-1 rounded-xl ${inputClass}`}>
                                            <SelectValue placeholder="Select..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="surface">Surface (0-5cm)</SelectItem>
                                            <SelectItem value="shallow">Shallow (5-15cm)</SelectItem>
                                            <SelectItem value="medium">Medium (15-30cm)</SelectItem>
                                            <SelectItem value="deep">Deep (30cm+)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <label className={labelClass}>{t('soilType')} <span className={mutedClass}>(optional)</span></label>
                                    <Select value={form.soil_type} onValueChange={(v) => setForm({...form, soil_type: v})}>
                                        <SelectTrigger className={`mt-1 rounded-xl ${inputClass}`}>
                                            <SelectValue placeholder="Select..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="sandy">Sandy</SelectItem>
                                            <SelectItem value="clay">Clay</SelectItem>
                                            <SelectItem value="loam">Loam</SelectItem>
                                            <SelectItem value="peat">Peat</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <label className={labelClass}>{t('condition')} <span className={mutedClass}>(optional)</span></label>
                                    <Select value={form.condition} onValueChange={(v) => setForm({...form, condition: v})}>
                                        <SelectTrigger className={`mt-1 rounded-xl ${inputClass}`}>
                                            <SelectValue placeholder="Select..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="excellent">Excellent</SelectItem>
                                            <SelectItem value="good">Good</SelectItem>
                                            <SelectItem value="fair">Fair</SelectItem>
                                            <SelectItem value="poor">Poor</SelectItem>
                                            <SelectItem value="fragmentary">Fragmentary</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <label className={labelClass}>{t('detectionMethod')} <span className={mutedClass}>(optional)</span></label>
                                    <Select value={form.detection_method} onValueChange={(v) => setForm({...form, detection_method: v})}>
                                        <SelectTrigger className={`mt-1 rounded-xl ${inputClass}`}>
                                            <SelectValue placeholder="Select..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="metal_detector">Metal Detector</SelectItem>
                                            <SelectItem value="digging">Digging</SelectItem>
                                            <SelectItem value="surface_find">Surface Find</SelectItem>
                                            <SelectItem value="construction">Construction</SelectItem>
                                            <SelectItem value="other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="mt-4">
                                <label className={labelClass}>Material <span className={mutedClass}>(optional — only fill if you know for sure)</span></label>
                                <Input
                                    value={form.material}
                                    onChange={(e) => setForm({...form, material: e.target.value})}
                                    placeholder="e.g. Bronze, Silver, Clay..."
                                    className={`mt-1 rounded-xl ${inputClass}`}
                                />
                            </div>
                        </div>

                        <div className={`mt-4 p-4 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-[#f4d0a8]/50'}`}>
                            <div className={`flex items-center gap-2 mb-2 ${textClass}`}>
                                <Database className="w-4 h-4" />
                                <span className="font-medium text-sm">AI uses Dutch Archeological Databases</span>
                            </div>
                        </div>

                        {imageUrl && (
                            <Button onClick={analyzeImage} disabled={analyzing} className="w-full mt-6 bg-[#b66c34] hover:bg-[#8f5428] rounded-xl py-6">
                                {analyzing ? (
                                    <div className="flex items-center">
                                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                        <span>{analyzeStatus || t('analyzing')}</span>
                                    </div>
                                ) : (
                                    <><Sparkles className="w-5 h-5 mr-2" />{t('analyzeWithAI')}</>
                                )}
                            </Button>
                        )}
                    </Card>
                )}

                {step === 2 && (
                    <div className="space-y-6">
                        {!isArchaeological && (
                            <Card className="p-5 border-orange-300 bg-orange-50">
                                <div className="flex gap-3">
                                    <AlertTriangle className="w-6 h-6 text-orange-500 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h3 className="font-semibold text-orange-800 mb-1">Geen archeologisch object</h3>
                                        <p className="text-sm text-orange-700 mb-3">
                                            De AI heeft vastgesteld dat dit object waarschijnlijk geen archeologische vondst is. 
                                            Het wordt niet zichtbaar in de community en kan niet worden gemeld bij de overheid.
                                        </p>
                                        <p className="text-sm text-orange-700 font-medium">
                                            Ben je het niet eens? Je kunt na het opslaan een bezwaar indienen bij team Archeos.
                                        </p>
                                    </div>
                                </div>
                            </Card>
                        )}
                        <AIAnalysisCard analysis={analysis} storageInstructions={storageInstructions} darkMode={darkMode} />

                        {referenceLinks.length > 0 && (
                            <Card className={`p-4 ${cardClass}`}>
                                <p className={`text-sm font-semibold mb-3 ${textClass}`}>Useful references for your find:</p>
                                <div className="space-y-2">
                                    {referenceLinks.map((link, i) => (
                                        <a
                                            key={i}
                                            href={link.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 text-sm text-[#b66c34] hover:text-[#8f5428] hover:underline"
                                        >
                                            <ExternalLink className="w-4 h-4 flex-shrink-0" />
                                            {link.label}
                                        </a>
                                    ))}
                                </div>
                            </Card>
                        )}

                        <Card className={`p-6 ${cardClass}`}>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className={`text-xl font-semibold flex items-center gap-2 ${textClass}`}>
                                    <MapPin className="w-5 h-5 text-[#b66c34]" />
                                    {t('markLocation')}
                                </h2>
                                <Button variant="outline" size="sm" onClick={getCurrentLocation} disabled={gettingLocation} className={`rounded-xl ${darkMode ? 'border-gray-600 text-white' : 'border-[#b66c34] text-[#b66c34]'}`}>
                                    {gettingLocation ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4 mr-1" />}
                                    GPS
                                </Button>
                            </div>
                            <p className={`text-sm mb-4 ${mutedClass}`}>{t('clickMap')}</p>
                            <DiscoveryMap onLocationSelect={handleLocationSelect} selectedPosition={location ? [location.lat, location.lng] : null} height="350px" />
                            {location && <p className={`text-sm mt-2 ${mutedClass}`}>Selected: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}</p>}
                        </Card>

                        <div className="flex gap-4">
                            <Button variant="outline" onClick={() => setStep(1)} className={`flex-1 rounded-xl ${darkMode ? 'border-gray-600 text-white' : 'border-[#b66c34] text-[#b66c34]'}`}>
                                <ArrowLeft className="w-4 h-4 mr-2" /> {t('back')}
                            </Button>
                            <Button onClick={() => setStep(3)} className="flex-1 bg-[#b66c34] hover:bg-[#8f5428] rounded-xl">
                                {t('continue')} <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <Card className={`p-6 ${cardClass}`}>
                        <h2 className={`text-xl font-semibold mb-4 ${textClass}`}>Stap 3: {t('addDetails')}</h2>

                        {isGuest && (
                            <div className="mb-5 p-4 rounded-xl bg-amber-50 border border-amber-200">
                                <div className="flex gap-3 items-start">
                                    <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-semibold text-amber-800 text-sm">Je bent een gast</p>
                                        <p className="text-sm text-amber-700 mt-0.5">
                                            Je vondst wordt anoniem opgeslagen en is alleen zichtbaar in de community. 
                                            Na het opslaan word je <strong>direct doorgestuurd naar het overheidsformulier</strong> — dit is verplicht.
                                        </p>
                                        <button onClick={() => navigate(createPageUrl('Login'))} className="mt-2 text-sm text-amber-800 underline font-medium">
                                            Maak een account aan voor meer mogelijkheden →
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className={labelClass}>{t('discoveryName')}</label>
                                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={`mt-1 rounded-xl ${inputClass}`} />
                            </div>
                            <div>
                                <label className={labelClass}>{t('locationName')}</label>
                                <Input value={form.location_name} onChange={(e) => setForm({ ...form, location_name: e.target.value })} placeholder="bijv. Veld bij Maastricht" className={`mt-1 rounded-xl ${inputClass}`} />
                            </div>
                            <div>
                                <label className={labelClass}>{t('discoveryDate')}</label>
                                <Input type="date" value={form.discovery_date} onChange={(e) => setForm({ ...form, discovery_date: e.target.value })} className={`mt-1 rounded-xl ${inputClass}`} />
                            </div>
                            <div>
                                <label className={labelClass}>{t('notes')} <span className={mutedClass}>(optioneel)</span></label>
                                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={`mt-1 rounded-xl ${inputClass}`} rows={3} />
                            </div>
                            {!isGuest && (
                                <div className={`flex items-center justify-between p-4 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-[#f4d0a8]/50'}`}>
                                    <div>
                                        <p className={`font-medium text-sm ${darkMode ? 'text-white' : 'text-[#6b5344]'}`}>{t('makePrivate')}</p>
                                        <p className={`text-xs mt-0.5 ${mutedClass}`}>{t('private')} — alleen jij kan deze vondst zien</p>
                                    </div>
                                    <Switch checked={isPrivate} onCheckedChange={setIsPrivate} />
                                </div>
                            )}
                        </div>

                        <div className="flex gap-4 mt-6">
                            <Button variant="outline" onClick={() => setStep(2)} className={`flex-1 rounded-xl ${darkMode ? 'border-gray-600 text-white' : 'border-[#b66c34] text-[#b66c34]'}`}>
                                <ArrowLeft className="w-4 h-4 mr-2" /> {t('back')}
                            </Button>
                            <Button onClick={handleSubmit} disabled={createMutation.isPending} className="flex-1 bg-[#b66c34] hover:bg-[#8f5428] rounded-xl">
                                {createMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                                {isGuest ? 'Opslaan & Direct Melden' : t('saveDiscovery')}
                            </Button>
                        </div>
                    </Card>
                )}
            </div>

            {analyzing && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gradient-to-br from-[#f4d0a8] to-[#e5b889] border-[#c98a54]'} rounded-2xl p-8 shadow-2xl border-2 max-w-sm mx-4 text-center`}>
                        <div className="relative w-20 h-20 mx-auto mb-6">
                            <div className="absolute inset-0 border-4 border-[#e5b889] rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-transparent border-t-[#b66c34] rounded-full animate-spin"></div>
                            <div className="absolute inset-2 flex items-center justify-center">
                                <Sparkles className="w-8 h-8 text-[#b66c34]" />
                            </div>
                        </div>
                        <h3 className={`text-xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-[#6b5344]'}`}>
                            {t('aiAnalysis')}
                        </h3>
                        <p className={`text-sm animate-pulse ${darkMode ? 'text-gray-400' : 'text-[#8f7a6a]'}`}>
                            {analyzeStatus === 'upload' ? t('uploadingImages') : analyzeStatus === 'analyze' ? t('analyzing') : analyzeStatus === 'translating' ? t('translating') : t('analyzing')}
                        </p>
                        <div className="mt-6 space-y-2">
                            <StepItem status={analyzeStatus} step="upload" darkMode={darkMode} label={t('uploadPhoto')} />
                            <StepItem status={analyzeStatus} step="analyze" darkMode={darkMode} label={t('scanning')} />
                            <StepItem status={analyzeStatus} step="translating" darkMode={darkMode} label={t('translating')} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
