import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Mail, Phone, MapPin, Building, Search, Loader2, Pin } from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';
import { useAuth } from '@/lib/AuthContext';
import { expertsApi } from '@/api/supabaseApi';

export default function Experts() {
    const { t, darkMode } = useLanguage();
    const { user, isAdmin } = useAuth();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [contactDialogOpen, setContactDialogOpen] = useState(false);
    const [selectedExpert, setSelectedExpert] = useState(null);
    const [search, setSearch] = useState('');
    const [form, setForm] = useState({
        name: '', specialization: '', institution: '', 
        email: '', phone: '', location: '', bio: ''
    });
    const [message, setMessage] = useState('');
    const [subject, setSubject] = useState('Archaeological Consultation Request');
    const queryClient = useQueryClient();

    const { data: experts = [], isLoading } = useQuery({
        queryKey: ['experts'],
        queryFn: () => expertsApi.list('-created_at')
    });

    const createMutation = useMutation({
        mutationFn: (data) => expertsApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['experts'] });
            setDialogOpen(false);
            setForm({ name: '', specialization: '', institution: '', email: '', phone: '', location: '', bio: '' });
        }
    });

    const filteredExperts = experts
        .filter(e => 
            !search || 
            e.name?.toLowerCase().includes(search.toLowerCase()) ||
            e.specialization?.toLowerCase().includes(search.toLowerCase())
        )
        .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

    const togglePin = (expert) => {
        expertsApi.update(expert.id, { pinned: !expert.pinned })
            .then(() => queryClient.invalidateQueries({ queryKey: ['experts'] }));
    };

    const handleContact = (expert) => {
        setSelectedExpert(expert);
        setMessage('');
        setSubject('Archaeological Consultation Request');
        setContactDialogOpen(true);
    };

    const handleSend = () => {
        const body = encodeURIComponent(message);
        const mailtoLink = `mailto:${selectedExpert.email}?subject=${encodeURIComponent(subject)}&body=${body}`;
        window.open(mailtoLink, '_blank');
        setContactDialogOpen(false);
        setMessage('');
        setSelectedExpert(null);
    };

    const inputClass = darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-[#e5b889]';

    return (
        <div className={`min-h-screen p-4 md:p-8 ${darkMode ? 'bg-gray-900' : 'bg-[#fdf6ef]'}`}>
            <div className="max-w-6xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className={`text-3xl font-bold flex items-center gap-3 ${darkMode ? 'text-white' : 'text-[#8f5428]'}`}>
                            <Users className="w-8 h-8 text-[#b66c34]" />
                            {t('experts')}
                        </h1>
                    </div>
                    {isAdmin && (
                        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                            <DialogTrigger asChild>
                                <Button className="bg-[#b66c34] hover:bg-[#8f5428] rounded-xl">
                                    <Plus className="w-4 h-4 mr-2" /> Add Expert
                                </Button>
                            </DialogTrigger>
                            <DialogContent className={darkMode ? 'bg-gray-800 border-gray-700' : ''}>
                                <DialogHeader>
                                    <DialogTitle className={darkMode ? 'text-white' : 'text-[#8f5428]'}>Add New Expert</DialogTitle>
                                </DialogHeader>
                                <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form); }} className="space-y-4 mt-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-[#6b5344]'}`}>Name *</label>
                                            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={`mt-1 rounded-xl ${inputClass}`} required />
                                        </div>
                                        <div>
                                            <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-[#6b5344]'}`}>Specialization *</label>
                                            <Input value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} className={`mt-1 rounded-xl ${inputClass}`} required />
                                        </div>
                                    </div>
                                    <div>
                                        <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-[#6b5344]'}`}>Institution</label>
                                        <Input value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} className={`mt-1 rounded-xl ${inputClass}`} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-[#6b5344]'}`}>Email *</label>
                                            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={`mt-1 rounded-xl ${inputClass}`} required />
                                        </div>
                                        <div>
                                            <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-[#6b5344]'}`}>Phone</label>
                                            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={`mt-1 rounded-xl ${inputClass}`} />
                                        </div>
                                    </div>
                                    <Button type="submit" className="w-full bg-[#b66c34] hover:bg-[#8f5428] rounded-xl" disabled={createMutation.isPending}>
                                        {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                        Add Expert
                                    </Button>
                                </form>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>

                <Card className={`p-4 mb-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'border-[#e5b889]'}`}>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#b66c34]" />
                        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('search') + '...'} className={`pl-10 rounded-xl ${inputClass}`} />
                    </div>
                </Card>

                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-[#b66c34]" />
                    </div>
                ) : filteredExperts.length === 0 ? (
                    <Card className={`p-12 text-center ${darkMode ? 'bg-gray-800 border-gray-700' : 'border-[#e5b889]'}`}>
                        <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 ${darkMode ? 'bg-gray-700' : 'bg-[#f4d0a8]'}`}>
                            <Users className={`w-10 h-10 ${darkMode ? 'text-[#f4d0a8]' : 'text-[#b66c34]'}`} />
                        </div>
                        <h3 className={`text-lg font-medium mb-2 ${darkMode ? 'text-white' : 'text-[#6b5344]'}`}>{t('noDiscoveries')}</h3>
                    </Card>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredExperts.map((expert) => (
                            <Card key={expert.id} className={`p-6 hover:shadow-lg transition-shadow ${darkMode ? 'bg-gray-800 border-gray-700' : 'border-[#e5b889]'}`}>
                                <div className="flex items-start gap-4 mb-4">
                                    <div className={`w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold ${darkMode ? 'bg-gray-700 text-[#f4d0a8]' : 'bg-[#f4d0a8] text-[#b66c34]'}`}>
                                        {expert.name?.[0]?.toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className={`font-semibold text-lg ${darkMode ? 'text-white' : 'text-[#6b5344]'}`}>{expert.name}</h3>
                                        <Badge className={`mt-1 ${darkMode ? 'bg-gray-700 text-[#f4d0a8]' : 'bg-[#f4d0a8] text-[#8f5428]'}`}>
                                            {expert.specialization}
                                        </Badge>
                                    </div>
                                </div>

                                <div className={`space-y-2 text-sm mb-4 ${darkMode ? 'text-gray-300' : 'text-[#6b5344]'}`}>
                                    {expert.institution && (
                                        <div className="flex items-center gap-2">
                                            <Building className="w-4 h-4 text-[#b66c34]" />
                                            {expert.institution}
                                        </div>
                                    )}
                                    {expert.location && (
                                        <div className="flex items-center gap-2">
                                            <MapPin className="w-4 h-4 text-[#b66c34]" />
                                            {expert.location}
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" className={`flex-1 rounded-xl ${darkMode ? 'border-gray-600 text-white hover:bg-gray-700' : 'border-[#b66c34] text-[#b66c34] hover:bg-[#f4d0a8]'}`} onClick={() => handleContact(expert)}>
                                        <Mail className="w-4 h-4 mr-1" /> Email
                                    </Button>
                                    {expert.phone && (
                                        <Button variant="outline" size="sm" className={`rounded-xl ${darkMode ? 'border-gray-600 text-white hover:bg-gray-700' : 'border-[#b66c34] text-[#b66c34] hover:bg-[#f4d0a8]'}`} onClick={() => window.open(`tel:${expert.phone}`)}>
                                            <Phone className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            </Card>
                        ))}
                    </div>
                )}

                <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
                    <DialogContent className={darkMode ? 'bg-gray-800 border-gray-700' : ''}>
                        <DialogHeader>
                            <DialogTitle className={darkMode ? 'text-white' : 'text-[#8f5428]'}>
                                Contact {selectedExpert?.name}
                            </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 mt-2">
                            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-[#6b5344]'}`}>
                                To: <span className="font-medium">{selectedExpert?.email}</span>
                            </p>
                            <div>
                                <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-[#6b5344]'}`}>Subject</label>
                                <Input
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    className={`mt-1 rounded-xl ${inputClass}`}
                                />
                            </div>
                            <div>
                                <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-[#6b5344]'}`}>Message</label>
                                <Textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Write your message here..."
                                    className={`mt-1 rounded-xl ${inputClass}`}
                                    rows={5}
                                />
                            </div>
                            <Button
                                onClick={handleSend}
                                disabled={!message}
                                className="w-full bg-[#b66c34] hover:bg-[#8f5428] rounded-xl"
                            >
                                <Mail className="w-4 h-4 mr-2" />
                                Open in Email App
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}
