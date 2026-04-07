import React, { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Info, Edit3, Save, X, Upload, Loader2 } from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/api/supabaseClient';
import { uploadImage } from '@/api/storage';

export default function AboutUs() {
    const { t, darkMode } = useLanguage();
    const { isAdmin } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    
    const [content, setContent] = useState({
        hero_image: '',
        hero_title: '',
        hero_subtitle: '',
        mission_title: '',
        mission_text: '',
        vision_title: '',
        vision_text: '',
        team_title: '',
        team_text: '',
        contact_title: '',
        contact_email: '',
        contact_phone: '',
        contact_address: '',
    });

    useEffect(() => {
        loadContent();
    }, []);

    const loadContent = async () => {
        try {
            const { data, error } = await supabase
                .from('about_page')
                .select('*')
                .limit(1)
                .single();
            
            if (data) {
                setContent({
                    hero_image: data.hero_image || '',
                    hero_title: data.hero_title || '',
                    hero_subtitle: data.hero_subtitle || '',
                    mission_title: data.mission_title || '',
                    mission_text: data.mission_text || '',
                    vision_title: data.vision_title || '',
                    vision_text: data.vision_text || '',
                    team_title: data.team_title || '',
                    team_text: data.team_text || '',
                    contact_title: data.contact_title || '',
                    contact_email: data.contact_email || '',
                    contact_phone: data.contact_phone || '',
                    contact_address: data.contact_address || '',
                });
            }
        } catch (err) {
            console.log('No about page content found');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const { data: existing } = await supabase
                .from('about_page')
                .select('id')
                .limit(1)
                .single();

            if (existing) {
                await supabase
                    .from('about_page')
                    .update(content)
                    .eq('id', existing.id);
            } else {
                await supabase
                    .from('about_page')
                    .insert(content);
            }
            setIsEditing(false);
        } catch (err) {
            console.error('Error saving:', err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        setIsUploading(true);
        try {
            const url = await uploadImage(file, 'about-page');
            setContent(prev => ({ ...prev, hero_image: url }));
        } catch (err) {
            console.error('Error uploading image:', err);
        } finally {
            setIsUploading(false);
        }
    };

    const handleChange = (field, value) => {
        setContent(prev => ({ ...prev, [field]: value }));
    };

    if (isLoading) {
        return (
            <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-[#fdf6ef]'}`}>
                <Loader2 className={`w-8 h-8 animate-spin ${darkMode ? 'text-[#f4d0a8]' : 'text-[#b66c34]'}`} />
            </div>
        );
    }

    return (
        <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-[#fdf6ef]'}`}>
            <div className="max-w-4xl mx-auto p-4 md:p-8">
                <div className="flex items-center justify-between mb-8">
                    <h1 className={`text-3xl font-bold flex items-center gap-3 ${darkMode ? 'text-white' : 'text-[#8f5428]'}`}>
                        <Info className={`w-8 h-8 ${darkMode ? 'text-[#f4d0a8]' : 'text-[#b66c34]'}`} />
                        {t('aboutUs')}
                    </h1>
                    {isAdmin && !isEditing && (
                        <Button
                            onClick={() => setIsEditing(true)}
                            variant="outline"
                            className={`rounded-xl ${darkMode ? 'border-gray-600 text-white hover:bg-gray-700' : 'border-[#b66c34] text-[#b66c34] hover:bg-[#f4d0a8]'}`}
                        >
                            <Edit3 className="w-4 h-4 mr-2" />
                            {t('edit')}
                        </Button>
                    )}
                </div>

                {isEditing ? (
                    <Card className={`p-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'border-[#e5b889]'}`}>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-[#8f5428]'}`}>
                                {t('editAboutPage')}
                            </h2>
                            <div className="flex gap-2">
                                <Button
                                    onClick={() => setIsEditing(false)}
                                    variant="outline"
                                    className={darkMode ? 'border-gray-600 text-white hover:bg-gray-700' : 'border-[#b66c34]'}
                                >
                                    <X className="w-4 h-4 mr-2" />
                                    {t('cancel')}
                                </Button>
                                <Button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="bg-[#b66c34] hover:bg-[#8f5428]"
                                >
                                    <Save className="w-4 h-4 mr-2" />
                                    {isSaving ? t('saving') : t('save')}
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className={`block mb-2 font-medium ${darkMode ? 'text-white' : 'text-[#8f5428]'}`}>
                                    {t('heroImage')}
                                </label>
                                {content.hero_image && (
                                    <img src={content.hero_image} alt="Hero" className="w-full h-48 object-cover rounded-lg mb-4" />
                                )}
                                <div className="flex gap-2">
                                    <Input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        disabled={isUploading}
                                        className={darkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}
                                    />
                                    {isUploading && <Loader2 className="w-4 h-4 animate-spin" />}
                                </div>
                                <Input
                                    value={content.hero_image}
                                    onChange={(e) => handleChange('hero_image', e.target.value)}
                                    placeholder={t('imageUrlPlaceholder')}
                                    className={`mt-2 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                                />
                            </div>

                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label className={`block mb-2 font-medium ${darkMode ? 'text-white' : 'text-[#8f5428]'}`}>
                                        {t('heroTitle')}
                                    </label>
                                    <Input
                                        value={content.hero_title}
                                        onChange={(e) => handleChange('hero_title', e.target.value)}
                                        className={darkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}
                                    />
                                </div>
                                <div>
                                    <label className={`block mb-2 font-medium ${darkMode ? 'text-white' : 'text-[#8f5428]'}`}>
                                        {t('heroSubtitle')}
                                    </label>
                                    <Input
                                        value={content.hero_subtitle}
                                        onChange={(e) => handleChange('hero_subtitle', e.target.value)}
                                        className={darkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}
                                    />
                                </div>
                            </div>

                            <div className="border-t border-[#e5b889] dark:border-gray-700 pt-6">
                                <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-[#8f5428]'}`}>
                                    {t('missionSection')}
                                </h3>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                        <label className={`block mb-2 font-medium ${darkMode ? 'text-white' : 'text-[#8f5428]'}`}>
                                            {t('title')}
                                        </label>
                                        <Input
                                            value={content.mission_title}
                                            onChange={(e) => handleChange('mission_title', e.target.value)}
                                            className={darkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}
                                        />
                                    </div>
                                    <div>
                                        <label className={`block mb-2 font-medium ${darkMode ? 'text-white' : 'text-[#8f5428]'}`}>
                                            {t('text')}
                                        </label>
                                        <Textarea
                                            value={content.mission_text}
                                            onChange={(e) => handleChange('mission_text', e.target.value)}
                                            rows={3}
                                            className={darkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-[#e5b889] dark:border-gray-700 pt-6">
                                <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-[#8f5428]'}`}>
                                    {t('visionSection')}
                                </h3>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                        <label className={`block mb-2 font-medium ${darkMode ? 'text-white' : 'text-[#8f5428]'}`}>
                                            {t('title')}
                                        </label>
                                        <Input
                                            value={content.vision_title}
                                            onChange={(e) => handleChange('vision_title', e.target.value)}
                                            className={darkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}
                                        />
                                    </div>
                                    <div>
                                        <label className={`block mb-2 font-medium ${darkMode ? 'text-white' : 'text-[#8f5428]'}`}>
                                            {t('text')}
                                        </label>
                                        <Textarea
                                            value={content.vision_text}
                                            onChange={(e) => handleChange('vision_text', e.target.value)}
                                            rows={3}
                                            className={darkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-[#e5b889] dark:border-gray-700 pt-6">
                                <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-[#8f5428]'}`}>
                                    {t('teamSection')}
                                </h3>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                        <label className={`block mb-2 font-medium ${darkMode ? 'text-white' : 'text-[#8f5428]'}`}>
                                            {t('title')}
                                        </label>
                                        <Input
                                            value={content.team_title}
                                            onChange={(e) => handleChange('team_title', e.target.value)}
                                            className={darkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}
                                        />
                                    </div>
                                    <div>
                                        <label className={`block mb-2 font-medium ${darkMode ? 'text-white' : 'text-[#8f5428]'}`}>
                                            {t('text')}
                                        </label>
                                        <Textarea
                                            value={content.team_text}
                                            onChange={(e) => handleChange('team_text', e.target.value)}
                                            rows={3}
                                            className={darkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-[#e5b889] dark:border-gray-700 pt-6">
                                <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-[#8f5428]'}`}>
                                    {t('contactSection')}
                                </h3>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                        <label className={`block mb-2 font-medium ${darkMode ? 'text-white' : 'text-[#8f5428]'}`}>
                                            {t('title')}
                                        </label>
                                        <Input
                                            value={content.contact_title}
                                            onChange={(e) => handleChange('contact_title', e.target.value)}
                                            className={darkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}
                                        />
                                    </div>
                                    <div>
                                        <label className={`block mb-2 font-medium ${darkMode ? 'text-white' : 'text-[#8f5428]'}`}>
                                            {t('email')}
                                        </label>
                                        <Input
                                            value={content.contact_email}
                                            onChange={(e) => handleChange('contact_email', e.target.value)}
                                            className={darkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}
                                        />
                                    </div>
                                    <div>
                                        <label className={`block mb-2 font-medium ${darkMode ? 'text-white' : 'text-[#8f5428]'}`}>
                                            {t('phone')}
                                        </label>
                                        <Input
                                            value={content.contact_phone}
                                            onChange={(e) => handleChange('contact_phone', e.target.value)}
                                            className={darkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}
                                        />
                                    </div>
                                    <div>
                                        <label className={`block mb-2 font-medium ${darkMode ? 'text-white' : 'text-[#8f5428]'}`}>
                                            {t('address')}
                                        </label>
                                        <Input
                                            value={content.contact_address}
                                            onChange={(e) => handleChange('contact_address', e.target.value)}
                                            className={darkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>
                ) : (
                    <div className="space-y-8">
                        {content.hero_image && (
                            <div className="relative rounded-2xl overflow-hidden">
                                <img 
                                    src={content.hero_image} 
                                    alt={content.hero_title || t('aboutUs')} 
                                    className="w-full h-64 md:h-96 object-cover"
                                />
                                {(content.hero_title || content.hero_subtitle) && (
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex flex-col justify-end p-8">
                                        <h2 className="text-3xl md:text-4xl font-bold text-white">
                                            {content.hero_title || t('aboutUs')}
                                        </h2>
                                        {content.hero_subtitle && (
                                            <p className="text-white/90 mt-2 text-lg">
                                                {content.hero_subtitle}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="grid md:grid-cols-2 gap-8">
                            {(content.mission_title || content.mission_text) && (
                                <Card className={`p-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'border-[#e5b889]'}`}>
                                    <h3 className={`text-xl font-bold mb-3 ${darkMode ? 'text-[#f4d0a8]' : 'text-[#b66c34]'}`}>
                                        {content.mission_title || t('ourMission')}
                                    </h3>
                                    <p className={darkMode ? 'text-gray-300' : 'text-[#6b5344]'}>
                                        {content.mission_text || t('missionDefaultText')}
                                    </p>
                                </Card>
                            )}

                            {(content.vision_title || content.vision_text) && (
                                <Card className={`p-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'border-[#e5b889]'}`}>
                                    <h3 className={`text-xl font-bold mb-3 ${darkMode ? 'text-[#f4d0a8]' : 'text-[#b66c34]'}`}>
                                        {content.vision_title || t('ourVision')}
                                    </h3>
                                    <p className={darkMode ? 'text-gray-300' : 'text-[#6b5344]'}>
                                        {content.vision_text || t('visionDefaultText')}
                                    </p>
                                </Card>
                            )}
                        </div>

                        {(content.team_title || content.team_text) && (
                            <Card className={`p-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'border-[#e5b889]'}`}>
                                <h3 className={`text-xl font-bold mb-3 ${darkMode ? 'text-[#f4d0a8]' : 'text-[#b66c34]'}`}>
                                    {content.team_title || t('ourTeam')}
                                </h3>
                                <p className={darkMode ? 'text-gray-300' : 'text-[#6b5344]'}>
                                    {content.team_text || t('teamDefaultText')}
                                </p>
                            </Card>
                        )}

                        {(content.contact_title || content.contact_email || content.contact_phone || content.contact_address) && (
                            <Card className={`p-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'border-[#e5b889]'}`}>
                                <h3 className={`text-xl font-bold mb-4 ${darkMode ? 'text-[#f4d0a8]' : 'text-[#b66c34]'}`}>
                                    {content.contact_title || t('contactUs')}
                                </h3>
                                <div className="space-y-2">
                                    {content.contact_email && (
                                        <p className={darkMode ? 'text-gray-300' : 'text-[#6b5344]'}>
                                            <span className="font-medium">{t('email')}:</span> {content.contact_email}
                                        </p>
                                    )}
                                    {content.contact_phone && (
                                        <p className={darkMode ? 'text-gray-300' : 'text-[#6b5344]'}>
                                            <span className="font-medium">{t('phone')}:</span> {content.contact_phone}
                                        </p>
                                    )}
                                    {content.contact_address && (
                                        <p className={darkMode ? 'text-gray-300' : 'text-[#6b5344]'}>
                                            <span className="font-medium">{t('address')}:</span> {content.contact_address}
                                        </p>
                                    )}
                                </div>
                            </Card>
                        )}

                        {!content.hero_image && !content.mission_title && !content.vision_title && !content.team_title && (
                            <Card className={`p-8 text-center ${darkMode ? 'bg-gray-800 border-gray-700' : 'border-[#e5b889]'}`}>
                                <Info className={`w-12 h-12 mx-auto mb-4 ${darkMode ? 'text-gray-500' : 'text-[#b66c34]'}`} />
                                <p className={darkMode ? 'text-gray-400' : 'text-[#6b5344]'}>
                                    {t('noContentYet')}
                                </p>
                                {isAdmin && (
                                    <Button
                                        onClick={() => setIsEditing(true)}
                                        className="mt-4 bg-[#b66c34] hover:bg-[#8f5428]"
                                    >
                                        <Edit3 className="w-4 h-4 mr-2" />
                                        {t('addContent')}
                                    </Button>
                                )}
                            </Card>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
