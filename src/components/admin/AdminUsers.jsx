import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { profilesApi } from '@/api/supabaseApi';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Shield, User, Loader2 } from 'lucide-react';

export default function AdminUsers({ darkMode }) {
    const qc = useQueryClient();
    const [search, setSearch] = useState('');
    const [roleDialog, setRoleDialog] = useState(null);

    const { data: users = [], isLoading, error } = useQuery({
        queryKey: ['users'],
        queryFn: () => profilesApi.list()
    });

    const updateRoleMutation = useMutation({
        mutationFn: ({ id, role }) => profilesApi.update(id, { role }),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setRoleDialog(null); }
    });

    const filtered = users.filter(u => !search ||
        u.email?.toLowerCase().includes(search.toLowerCase()) ||
        u.full_name?.toLowerCase().includes(search.toLowerCase())
    );

    const cardClass = darkMode ? 'bg-gray-800 border-gray-700' : 'border-[#e5b889]';
    const inputClass = darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-[#e5b889]';

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className={`w-8 h-8 animate-spin ${darkMode ? 'text-[#f4d0a8]' : 'text-[#b66c34]'}`} />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center p-8">
                <p className={darkMode ? 'text-red-400' : 'text-red-600'}>Failed to load users</p>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-[#8f7a6a]'}`}>{error.message}</p>
            </div>
        );
    }

    return (
        <div>
            <div className="mb-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#b66c34]" />
                    <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users..." className={`pl-10 rounded-xl ${inputClass}`} />
                </div>
            </div>

            <Card className={cardClass}>
                <Table>
                    <TableHeader>
                        <TableRow className={darkMode ? 'border-gray-700' : ''}>
                            <TableHead className={darkMode ? 'text-gray-300' : ''}>Name</TableHead>
                            <TableHead className={darkMode ? 'text-gray-300' : ''}>Email</TableHead>
                            <TableHead className={darkMode ? 'text-gray-300' : ''}>Role</TableHead>
                            <TableHead className={darkMode ? 'text-gray-300' : ''}>Joined</TableHead>
                            <TableHead className={darkMode ? 'text-gray-300' : ''}>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.map((u) => (
                            <TableRow key={u.id} className={darkMode ? 'border-gray-700' : ''}>
                                <TableCell className={`font-medium ${darkMode ? 'text-white' : 'text-[#6b5344]'}`}>{u.full_name || 'Unknown'}</TableCell>
                                <TableCell className={darkMode ? 'text-gray-300' : ''}>{u.email}</TableCell>
                                <TableCell>
                                    <Badge className={u.role === 'admin' ? 'bg-[#b66c34] text-white' : darkMode ? 'bg-gray-700 text-gray-300' : 'bg-[#f4d0a8] text-[#8f5428]'}>
                                        {u.role === 'admin' ? <Shield className="w-3 h-3 mr-1 inline" /> : <User className="w-3 h-3 mr-1 inline" />}
                                        {u.role || 'user'}
                                    </Badge>
                                </TableCell>
                                <TableCell className={darkMode ? 'text-gray-300' : ''}>{new Date(u.created_at).toLocaleDateString()}</TableCell>
                                <TableCell>
                                    <Button size="sm" variant="outline" onClick={() => setRoleDialog({ id: u.id, role: u.role || 'user', name: u.full_name || u.email })}
                                        className={darkMode ? 'border-gray-600 text-white text-xs' : 'text-xs border-[#b66c34] text-[#b66c34]'}>
                                        Change Role
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>

            <Dialog open={!!roleDialog} onOpenChange={() => setRoleDialog(null)}>
                <DialogContent className={darkMode ? 'bg-gray-800 border-gray-700 text-white' : ''}>
                    <DialogHeader>
                        <DialogTitle className={darkMode ? 'text-white' : 'text-[#6b5344]'}>Change Role — {roleDialog?.name}</DialogTitle>
                    </DialogHeader>
                    <div className="mt-2">
                        <Select value={roleDialog?.role} onValueChange={(v) => setRoleDialog({ ...roleDialog, role: v })}>
                            <SelectTrigger className={darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-[#e5b889]'}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="user">User</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex gap-3 justify-end mt-4">
                        <Button variant="outline" onClick={() => setRoleDialog(null)} className={darkMode ? 'border-gray-600 text-white' : ''}>Cancel</Button>
                        <Button className="bg-[#b66c34] hover:bg-[#8f5428] rounded-xl"
                            onClick={() => roleDialog && updateRoleMutation.mutate({ id: roleDialog.id, role: roleDialog.role })}>
                            Save
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
