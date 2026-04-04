import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '@/api/supabaseApi';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Eye, Trash2, Pencil } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const STATUS_OPTIONS = ['pending_analysis', 'identified', 'reported', 'verified'];
const STATUS_COLORS = {
    pending_analysis: 'bg-yellow-100 text-yellow-800',
    identified: 'bg-blue-100 text-blue-800',
    reported: 'bg-purple-100 text-purple-800',
    verified: 'bg-green-100 text-green-800',
};

export default function AdminDiscoveries({ darkMode }) {
    const navigate = useNavigate();
    const qc = useQueryClient();
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [editDialog, setEditDialog] = useState(null);
    const [deleteDialog, setDeleteDialog] = useState(null);

    const { data: projects = [] } = useQuery({
        queryKey: ['allProjects'],
        queryFn: () => projectsApi.list('-created_at')
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => projectsApi.update(id, data),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['allProjects'] }); setEditDialog(null); }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => projectsApi.delete(id),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['allProjects'] }); setDeleteDialog(null); }
    });

    const filtered = projects.filter(p => {
        const matchSearch = !search ||
            p.name?.toLowerCase().includes(search.toLowerCase()) ||
            p.ai_identification?.name?.toLowerCase().includes(search.toLowerCase()) ||
            p.created_by?.toLowerCase().includes(search.toLowerCase()) ||
            p.finder_name?.toLowerCase().includes(search.toLowerCase());
        const matchStatus = statusFilter === 'all' || p.status === statusFilter;
        return matchSearch && matchStatus;
    });

    const cardClass = darkMode ? 'bg-gray-800 border-gray-700' : 'border-[#e5b889]';
    const inputClass = darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-[#e5b889]';

    return (
        <div>
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#b66c34]" />
                    <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search discoveries..." className={`pl-10 rounded-xl ${inputClass}`} />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className={`w-48 rounded-xl ${inputClass}`}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            <Card className={cardClass}>
                <Table>
                    <TableHeader>
                        <TableRow className={darkMode ? 'border-gray-700' : ''}>
                            <TableHead className={darkMode ? 'text-gray-300' : ''}>Discovery</TableHead>
                            <TableHead className={darkMode ? 'text-gray-300' : ''}>Finder</TableHead>
                            <TableHead className={darkMode ? 'text-gray-300' : ''}>Status</TableHead>
                            <TableHead className={darkMode ? 'text-gray-300' : ''}>Private</TableHead>
                            <TableHead className={darkMode ? 'text-gray-300' : ''}>Date</TableHead>
                            <TableHead className={darkMode ? 'text-gray-300' : ''}>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.map((p) => (
                            <TableRow key={p.id} className={darkMode ? 'border-gray-700' : ''}>
                                <TableCell className={`font-medium max-w-[160px] truncate ${darkMode ? 'text-white' : 'text-[#6b5344]'}`}>
                                    {p.ai_identification?.name || p.name}
                                </TableCell>
                                <TableCell className={`text-sm ${darkMode ? 'text-gray-300' : ''}`}>{p.finder_name || p.created_by}</TableCell>
                                <TableCell>
                                    <Badge className={`capitalize text-xs ${STATUS_COLORS[p.status] || ''}`}>{p.status?.replace('_', ' ')}</Badge>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className={`text-xs ${p.is_private ? 'border-orange-400 text-orange-600' : 'border-green-400 text-green-600'}`}>
                                        {p.is_private ? 'Private' : 'Public'}
                                    </Badge>
                                </TableCell>
                                <TableCell className={`text-sm ${darkMode ? 'text-gray-300' : ''}`}>{new Date(p.created_at).toLocaleDateString()}</TableCell>
                                <TableCell>
                                    <div className="flex gap-1">
                                        <Button size="sm" variant="ghost" onClick={() => navigate(createPageUrl(`DiscoveryDetail?id=${p.id}`))}><Eye className="w-4 h-4" /></Button>
                                        <Button size="sm" variant="ghost" onClick={() => setEditDialog({ ...p })}><Pencil className="w-4 h-4" /></Button>
                                        <Button size="sm" variant="ghost" className="text-red-500" onClick={() => setDeleteDialog(p.id)}><Trash2 className="w-4 h-4" /></Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>

            <Dialog open={!!editDialog} onOpenChange={() => setEditDialog(null)}>
                <DialogContent className={darkMode ? 'bg-gray-800 border-gray-700 text-white' : ''}>
                    <DialogHeader>
                        <DialogTitle className={darkMode ? 'text-white' : 'text-[#6b5344]'}>Edit Discovery</DialogTitle>
                    </DialogHeader>
                    {editDialog && (
                        <div className="space-y-3 mt-2">
                            <div>
                                <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-[#6b5344]'}`}>Name</label>
                                <Input value={editDialog.name || ''} onChange={(e) => setEditDialog({ ...editDialog, name: e.target.value })} className={`mt-1 rounded-xl ${inputClass}`} />
                            </div>
                            <div>
                                <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-[#6b5344]'}`}>Status</label>
                                <Select value={editDialog.status} onValueChange={(v) => setEditDialog({ ...editDialog, status: v })}>
                                    <SelectTrigger className={`mt-1 rounded-xl ${inputClass}`}><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-[#6b5344]'}`}>Finder Name</label>
                                <Input value={editDialog.finder_name || ''} onChange={(e) => setEditDialog({ ...editDialog, finder_name: e.target.value })} className={`mt-1 rounded-xl ${inputClass}`} />
                            </div>
                            <div>
                                <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-[#6b5344]'}`}>Visibility</label>
                                <Select value={editDialog.is_private ? 'private' : 'public'} onValueChange={(v) => setEditDialog({ ...editDialog, is_private: v === 'private' })}>
                                    <SelectTrigger className={`mt-1 rounded-xl ${inputClass}`}><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="public">Public</SelectItem>
                                        <SelectItem value="private">Private</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex gap-3 justify-end pt-2">
                                <Button variant="outline" onClick={() => setEditDialog(null)} className={darkMode ? 'border-gray-600 text-white' : ''}>Cancel</Button>
                                <Button className="bg-[#b66c34] hover:bg-[#8f5428] rounded-xl"
                                    onClick={() => updateMutation.mutate({ id: editDialog.id, data: { name: editDialog.name, status: editDialog.status, finder_name: editDialog.finder_name, is_private: editDialog.is_private } })}>
                                    Save
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
                <DialogContent className={darkMode ? 'bg-gray-800 border-gray-700' : ''}>
                    <DialogHeader><DialogTitle className="text-red-600">Delete Discovery?</DialogTitle></DialogHeader>
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
