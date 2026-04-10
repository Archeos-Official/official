import React, { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Info, Edit3, Save, X, Loader2 } from 'lucide-react';
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
        title: '',
        description: '',
        contact_email: '',
        contact_phone: '',
    });

    useEffect(() => {
        loadContent();
    }, []);

    const loadContent = async () => {
        try {
            const { data } = await supabase
                .from('about_page')
                .select('*')
                .limit(1)
                .single();
            
            if (data) {
                setContent({
                    hero_image: data.hero_image || '',
                    title: data.title || '',
                    description: data.description || '',
                    contact_email: data.contact_email || '',
                    contact_phone: data.contact_phone || '',
                });
            }
        } catch (err) {
            console.log('No about page yet');
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

            let error;
            if (existing) {
                const result = await supabase.from('about_page').update(content).eq('id', existing.id);
                error = result.error;
            } else {
                const result = await supabase.from('about_page').insert(content);
                error = result.error;
            }
            
            if (error) throw error;
            
            await loadContent();
            setIsEditing(false);
        } catch (err) {
            console.error('Error saving:', err);
            alert('Failed to save: ' + err.message);
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
            console.error('Error uploading:', err);
        } finally {
            setIsUploading(false);
        }
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
            <div className="max-w-3xl mx-auto p-4 md:p-8">
                <div className="flex items-center justify-between mb-8">
                    <h1 className={`text-3xl font-bold flex items-center gap-3 ${darkMode ? 'text-white' : 'text-[#8f5428]'}`}>
                        <Info className={`w-8 h-8 ${darkMode ? 'text-[#f4d0a8]' : 'text-[#b66c34]'}`} />
                        {t('aboutUs')}
                    </h1>
                    {isAdmin && !isEditing && (
                        <Button
                            onClick={() => setIsEditing(true)}
                            className={`rounded-xl ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-[#b66c34] hover:bg-[#8f5428]'}`}
                        >
                            <Edit3 className="w-4 h-4 mr-2" />
                            {t('edit')}
                        </Button>
                    )}
                </div>

                {isEditing ? (
                    <Card className={`p-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-[#e5b889]'}`}>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-[#8f5428]'}`}>
                                Edit About Page
                            </h2>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => setIsEditing(false)} className={darkMode ? 'border-gray-600 text-white' : ''}>
                                    <X className="w-4 h-4 mr-1" /> Cancel
                                </Button>
                                <Button onClick={handleSave} disabled={isSaving} className="bg-[#b66c34] hover:bg-[#8f5428]">
                                    <Save className="w-4 h-4 mr-1" /> {isSaving ? 'Saving...' : 'Save'}
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-5">
                            <div>
                                <label className={`block mb-2 font-medium ${darkMode ? 'text-gray-300' : 'text-[#6b5344]'}`}>
                                    Cover Image
                                </label>
                                {content.hero_image && (
                                    <img src={content.hero_image} alt="Cover" className="w-full h-40 object-cover rounded-lg mb-3" />
                                )}
                                <Input type="file" accept="image/*" onChange={handleImageUpload} disabled={isUploading} className={darkMode ? 'bg-gray-700 border-gray-600 mb-2' : 'mb-2'} />
                                <Input value={content.hero_image} onChange={(e) => setContent(p => ({ ...p, hero_image: e.target.value }))} placeholder="Or paste image URL here" className={darkMode ? 'bg-gray-700 border-gray-600 text-white' : ''} />
                            </div>

                            <div>
                                <label className={`block mb-2 font-medium ${darkMode ? 'text-gray-300' : 'text-[#6b5344]'}`}>
                                    Page Title
                                </label>
                                <Input value={content.title} onChange={(e) => setContent(p => ({ ...p, title: e.target.value }))} placeholder="e.g. About Archeos" className={darkMode ? 'bg-gray-700 border-gray-600 text-white' : ''} />
                            </div>

                            <div>
                                <label className={`block mb-2 font-medium ${darkMode ? 'text-gray-300' : 'text-[#6b5344]'}`}>
                                    About Text (supports multiple paragraphs)
                                </label>
                                <Textarea value={content.description} onChange={(e) => setContent(p => ({ ...p, description: e.target.value }))} rows={10} placeholder="Write your about text here. Use blank lines for new paragraphs." className={darkMode ? 'bg-gray-700 border-gray-600 text-white' : ''} />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className={`block mb-2 font-medium ${darkMode ? 'text-gray-300' : 'text-[#6b5344]'}`}>
                                        Email
                                    </label>
                                    <Input value={content.contact_email} onChange={(e) => setContent(p => ({ ...p, contact_email: e.target.value }))} placeholder="teamarcheos@outlook.com" className={darkMode ? 'bg-gray-700 border-gray-600 text-white' : ''} />
                                </div>
                                <div>
                                    <label className={`block mb-2 font-medium ${darkMode ? 'text-gray-300' : 'text-[#6b5344]'}`}>
                                        Phone
                                    </label>
                                    <Input value={content.contact_phone} onChange={(e) => setContent(p => ({ ...p, contact_phone: e.target.value }))} placeholder="+31 6 12345678" className={darkMode ? 'bg-gray-700 border-gray-600 text-white' : ''} />
                                </div>
                            </div>
                        </div>
                    </Card>
                ) : (
                    <div className="space-y-6">
                        {content.hero_image && (
                            <img src={content.hero_image} alt={content.title} className="w-full h-64 object-cover rounded-xl" />
                        )}

                        {content.title && (
                            <h2 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-[#8f5428]'}`}>
                                {content.title}
                            </h2>
                        )}

                        {content.description && (
                            <div className={`prose ${darkMode ? 'text-gray-300' : 'text-[#6b5344]'}`}>
                                {content.description.split('\n').map((paragraph, i) => (
                                    paragraph.trim() ? <p key={i} className="mb-4">{paragraph}</p> : <br key={i} />
                                ))}
                            </div>
                        )}

                        {(content.contact_email || content.contact_phone) && (
                            <Card className={`p-5 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-[#e5b889]'}`}>
                                <h3 className={`font-semibold mb-3 ${darkMode ? 'text-[#f4d0a8]' : 'text-[#b66c34]'}`}>Contact</h3>
                                {content.contact_email && <p className={darkMode ? 'text-gray-300' : 'text-[#6b5344]'}>Email: {content.contact_email}</p>}
                                {content.contact_phone && <p className={darkMode ? 'text-gray-300' : 'text-[#6b5344]'}>Phone: {content.contact_phone}</p>}
                            </Card>
                        )}

                        {!content.hero_image && !content.title && !content.description && (
                            <Card className={`p-8 text-center ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-[#e5b889]'}`}>
                                <Info className={`w-10 h-10 mx-auto mb-3 ${darkMode ? 'text-gray-500' : 'text-[#b66c34]'}`} />
                                <p className={darkMode ? 'text-gray-400' : 'text-[#6b5344]'}>No content yet. Click Edit to add content.</p>
                                {isAdmin && (
                                    <Button onClick={() => setIsEditing(true)} className="mt-4 bg-[#b66c34] hover:bg-[#8f5428]">
                                        <Edit3 className="w-4 h-4 mr-2" /> Add Content
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