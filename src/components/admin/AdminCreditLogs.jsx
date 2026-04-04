import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { creditLogsApi } from '@/api/supabaseApi';
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function AdminCreditLogs({ darkMode }) {
    const { data: logs = [], isLoading } = useQuery({
        queryKey: ['creditLogs'],
        queryFn: () => creditLogsApi.list('-created_at')
    });

    const textClass = darkMode ? 'text-white' : 'text-[#8f5428]';
    const mutedClass = darkMode ? 'text-gray-400' : 'text-[#8f7a6a]';

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-[#b66c34]" />
            </div>
        );
    }

    const totalCredits = logs.reduce((sum, log) => sum + (log.credits_used || 0), 0);
    const overLimitLogs = logs.filter(log => log.credits_used > 1);

    return (
        <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <Card className={`p-4 ${darkMode ? 'bg-gray-800 border-gray-700' : 'border-[#e5b889]'}`}>
                    <p className={`text-sm ${mutedClass}`}>Total Credits Used</p>
                    <p className={`text-2xl font-bold ${textClass}`}>{totalCredits.toFixed(1)}</p>
                    <p className={`text-xs ${mutedClass} mt-1`}>Across {logs.length} discoveries</p>
                </Card>
                <Card className={`p-4 ${darkMode ? 'bg-gray-800 border-gray-700' : 'border-[#e5b889]'}`}>
                    <p className={`text-sm ${mutedClass}`}>Over Limit Discoveries</p>
                    <p className={`text-2xl font-bold text-red-500`}>{overLimitLogs.length}</p>
                    <p className={`text-xs ${mutedClass} mt-1`}>Used more than 1 credit</p>
                </Card>
            </div>

            <div className="mb-4">
                <h3 className={`text-lg font-semibold ${textClass}`}>Discovery Credit Logs</h3>
                <p className={`text-sm ${mutedClass}`}>Tracked credits per discovery (for monitoring)</p>
            </div>

            {logs.length === 0 ? (
                <Card className={`p-12 text-center ${darkMode ? 'bg-gray-800 border-gray-700' : 'border-[#e5b889]'}`}>
                    <p className={mutedClass}>No credit logs yet</p>
                </Card>
            ) : (
                <Card className={darkMode ? 'bg-gray-800 border-gray-700' : 'border-[#e5b889]'}>
                    <Table>
                        <TableHeader>
                            <TableRow className={darkMode ? 'border-gray-700' : ''}>
                                <TableHead className={textClass}>Discovery</TableHead>
                                <TableHead className={textClass}>User</TableHead>
                                <TableHead className={textClass}>Credits</TableHead>
                                <TableHead className={textClass}>Date</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {logs.map((log) => (
                                <TableRow 
                                    key={log.id} 
                                    className={`${darkMode ? 'border-gray-700' : ''} ${
                                        log.credits_used > 1 
                                            ? 'bg-red-500/10 animate-pulse' 
                                            : ''
                                    }`}
                                >
                                    <TableCell className={textClass}>
                                        <Link 
                                            to={createPageUrl(`DiscoveryDetail?id=${log.discovery_id}`)}
                                            className="hover:underline"
                                        >
                                            {log.discovery_name || 'Unknown'}
                                        </Link>
                                    </TableCell>
                                    <TableCell className={mutedClass}>
                                        {log.user_email || 'Anonymous'}
                                    </TableCell>
                                    <TableCell className={log.credits_used > 1 ? 'text-red-500 font-bold' : textClass}>
                                        <div className="flex items-center gap-2">
                                            {log.credits_used > 1 && <AlertCircle className="w-4 h-4" />}
                                            {log.credits_used.toFixed(1)}
                                        </div>
                                    </TableCell>
                                    <TableCell className={mutedClass}>
                                        {new Date(log.created_at).toLocaleDateString()}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>
            )}
        </div>
    );
}
