import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { expertsApi } from '@/api/supabaseApi';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Star } from 'lucide-react';

const empty = { name: '', specialization: '', institution: '', email: '', phone: '', location: '', bio: '', image_url: '', available: true, pinned: false };

export default function AdminExperts({ darkMode }) {
    const qc = useQueryClient();
    const [dialog, setDialog] = useState(false);
    const [form, setForm] = useState(empty);
    const [editing, setEditing] = useState(null);
    const [deleteDialog, setDeleteDialog] = useState(null);

    const { data: experts = [] } = useQuery({
        queryKey: ['experts'],
        queryFn: () => expertsApi.list()
    });

    const saveMutation = useMutation({
        mutationFn: (data) => editing ? expertsApi.update(editing, data) : expertsApi.create(data),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['experts'] }); setDialog(false); setForm(empty); setEditing(null); }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => expertsApi.delete(id),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['experts'] }); setDeleteDialog(null); }
    });

    const openEdit = (e) => { setForm({ ...e }); setEditing(e.id); setDialog(true); };
    const openNew = () => { setForm(empty); setEditing(null); setDialog(true); };

    const cardClass = darkMode ? 'bg-gray-800 border-gray-700' : 'border-[#e5b889]';
    const inputClass = darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-[#e5b889]';
    const textClass = darkMode ? 'text-white' : 'text-[#6b5344]';

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-[#8f7a6a]'}`}>{experts.length} experts</p>
                <Button onClick={openNew} className="bg-[#b66c34] hover:bg-[#8f5428] rounded-xl">
                    <Plus className="w-4 h-4 mr-2" /> Add Expert
                </Button>
            </div>

            <Card className={cardClass}>
                <Table>
                    <TableHeader>
                        <TableRow className={darkMode ? 'border-gray-700' : ''}>
                            <TableHead className={darkMode ? 'text-gray-300' : ''}>Name</TableHead>
                            <TableHead className={darkMode ? 'text-gray-300' : ''}>Specialization</TableHead>
                            <TableHead className={darkMode ? 'text-gray-300' : ''}>Institution</TableHead>
                            <TableHead className={darkMode ? 'text-gray-300' : ''}>Status</TableHead>
                            <TableHead className={darkMode ? 'text-gray-300' : ''}>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {experts.map((e) => (
                            <TableRow key={e.id} className={darkMode ? 'border-gray-700' : ''}>
                                <TableCell className={`font-medium ${textClass}`}>
                                    <div className="flex items-center gap-2">
                                        {e.pinned && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />}
                                        {e.name}
                                    </div>
                                </TableCell>
                                <TableCell className={darkMode ? 'text-gray-300' : ''}>{e.specialization}</TableCell>
                                <TableCell className={darkMode ? 'text-gray-300' : ''}>{e.institution}</TableCell>
                                <TableCell>
                                    <Badge className={e.available ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}>
                                        {e.available ? 'Available' : 'Unavailable'}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <div className="flex gap-2">
                                        <Button size="sm" variant="ghost" onClick={() => openEdit(e)}><Pencil className="w-4 h-4" /></Button>
                                        <Button size="sm" variant="ghost" className="text-red-500" onClick={() => setDeleteDialog(e.id)}><Trash2 className="w-4 h-4" /></Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>

            <Dialog open={dialog} onOpenChange={setDialog}>
                <DialogContent className={`max-w-lg max-h-[90vh] overflow-y-auto ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : ''}`}>
                    <DialogHeader>
                        <DialogTitle className={textClass}>{editing ? 'Edit Expert' : 'Add Expert'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 mt-2">
                        {[
                            { key: 'name', label: 'Name *' },
                            { key: 'specialization', label: 'Specialization *' },
                            { key: 'institution', label: 'Institution' },
                            { key: 'email', label: 'Email *' },
                            { key: 'phone', label: 'Phone' },
                            { key: 'location', label: 'Location' },
                            { key: 'image_url', label: 'Image URL' },
                        ].map(({ key, label }) => (
                            <div key={key}>
                                <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-[#6b5344]'}`}>{label}</label>
                                <Input value={form[key] || ''} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className={`mt-1 rounded-xl ${inputClass}`} />
                            </div>
                        ))}
                        <div>
                            <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-[#6b5344]'}`}>Bio</label>
                            <Textarea value={form.bio || ''} onChange={(e) => setForm({ ...form, bio: e.target.value })} className={`mt-1 rounded-xl ${inputClass}`} rows={3} />
                        </div>
                        <div className="flex items-center justify-between">
                            <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-[#6b5344]'}`}>Available</label>
                            <Switch checked={form.available} onCheckedChange={(v) => setForm({ ...form, available: v })} />
                        </div>
                        <div className="flex items-center justify-between">
                            <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-[#6b5344]'}`}>Pinned (shows at top)</label>
                            <Switch checked={form.pinned} onCheckedChange={(v) => setForm({ ...form, pinned: v })} />
                        </div>
                        <div className="flex gap-3 justify-end pt-2">
                            <Button variant="outline" onClick={() => setDialog(false)} className={darkMode ? 'border-gray-600 text-white' : ''}>Cancel</Button>
                            <Button onClick={() => saveMutation.mutate(form)} className="bg-[#b66c34] hover:bg-[#8f5428] rounded-xl">Save</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
                <DialogContent className={darkMode ? 'bg-gray-800 border-gray-700' : ''}>
                    <DialogHeader><DialogTitle className="text-red-600">Delete Expert?</DialogTitle></DialogHeader>
                    <p className={darkMode ? 'text-gray-300' : 'text-[#6b5344]'}>This cannot be undone.</p>
                    <div className="flex gap-3 justify-end mt-4">
                        <Button variant="outline" onClick={() => setDeleteDialog(null)} className={darkMode ? 'border-gray-600 text-white' : ''}>Cancel</Button>
                        <Button className="bg-red-500 hover:bg-red-600" onClick={() => deleteMutation.mutate(deleteDialog)}>Delete</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
