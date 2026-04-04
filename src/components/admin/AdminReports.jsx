import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reportsApi } from '@/api/supabaseApi';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2 } from 'lucide-react';

export default function AdminReports({ darkMode }) {
    const qc = useQueryClient();
    const [deleteDialog, setDeleteDialog] = useState(null);

    const { data: reports = [] } = useQuery({
        queryKey: ['allReports'],
        queryFn: () => reportsApi.list('-created_at')
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => reportsApi.delete(id),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['allReports'] }); setDeleteDialog(null); }
    });

    const cardClass = darkMode ? 'bg-gray-800 border-gray-700' : 'border-[#e5b889]';

    return (
        <div>
            <Card className={cardClass}>
                <Table>
                    <TableHeader>
                        <TableRow className={darkMode ? 'border-gray-700' : ''}>
                            <TableHead className={darkMode ? 'text-gray-300' : ''}>Reference</TableHead>
                            <TableHead className={darkMode ? 'text-gray-300' : ''}>Finder</TableHead>
                            <TableHead className={darkMode ? 'text-gray-300' : ''}>Status</TableHead>
                            <TableHead className={darkMode ? 'text-gray-300' : ''}>Date</TableHead>
                            <TableHead className={darkMode ? 'text-gray-300' : ''}>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {reports.map((r) => (
                            <TableRow key={r.id} className={darkMode ? 'border-gray-700' : ''}>
                                <TableCell className={`font-mono text-sm ${darkMode ? 'text-white' : ''}`}>{r.reference_number || '—'}</TableCell>
                                <TableCell className={darkMode ? 'text-gray-300' : ''}>{r.finder_name}</TableCell>
                                <TableCell>
                                    <Badge variant="outline" className={`capitalize ${darkMode ? 'border-gray-600 text-gray-300' : ''}`}>
                                        {r.status?.replace('_', ' ')}
                                    </Badge>
                                </TableCell>
                                <TableCell className={darkMode ? 'text-gray-300' : ''}>{new Date(r.created_at).toLocaleDateString()}</TableCell>
                                <TableCell>
                                    <Button size="sm" variant="ghost" className="text-red-500" onClick={() => setDeleteDialog(r.id)}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>

            <Dialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
                <DialogContent className={darkMode ? 'bg-gray-800 border-gray-700' : ''}>
                    <DialogHeader><DialogTitle className="text-red-600">Delete Report?</DialogTitle></DialogHeader>
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
