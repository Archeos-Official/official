import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { FileText, Calendar, MapPin, Hash, Loader2, Plus, ExternalLink, Trash2 } from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';
import { useAuth } from '@/lib/AuthContext';
import { reportsApi, projectsApi } from '@/api/supabaseApi';

export default function Reports() {
    const { t, darkMode } = useLanguage();
    const { user, isAuthenticated, navigateToLogin } = useAuth();
    const queryClient = useQueryClient();

    const { data: reports = [], isLoading } = useQuery({
        queryKey: ['myReports', user?.email],
        queryFn: () => reportsApi.getMyReports(),
        enabled: !!user
    });

    const deleteMutation = useMutation({
        mutationFn: async (report) => {
            await reportsApi.delete(report.id);
            if (report.discovery_id) {
                await projectsApi.update(report.discovery_id, {
                    reported_to_government: false,
                    report_date: null,
                    status: 'identified'
                });
            }
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['myReports'] })
    });

    const statusColors = {
        draft: darkMode ? 'bg-gray-600 text-gray-300' : 'bg-[#e5b889] text-[#6b5344]',
        submitted: 'bg-[#c98a54] text-white',
        acknowledged: 'bg-green-100 text-green-700',
        under_review: 'bg-[#f4d0a8] text-[#8f5428]',
        closed: 'bg-[#8f5428] text-white'
    };

    if (!isAuthenticated) {
        return (
            <div className={`min-h-screen p-8 ${darkMode ? 'bg-gray-900' : 'bg-[#fdf6ef]'}`}>
                <Card className={`max-w-md mx-auto p-8 text-center ${darkMode ? 'bg-gray-800 border-gray-700' : 'border-[#e5b889]'}`}>
                    <h2 className={`text-xl font-semibold mb-2 ${darkMode ? 'text-white' : 'text-[#6b5344]'}`}>{t('loginRequired')}</h2>
                    <p className={`mb-4 ${darkMode ? 'text-gray-400' : 'text-[#8f7a6a]'}`}>{t('loginToAccess')}</p>
                    <Button onClick={navigateToLogin} className="bg-[#b66c34] hover:bg-[#8f5428] rounded-xl">
                        {t('signIn')}
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className={`min-h-screen p-4 md:p-8 ${darkMode ? 'bg-gray-900' : 'bg-[#fdf6ef]'}`}>
            <div className="max-w-6xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className={`text-3xl font-bold flex items-center gap-3 ${darkMode ? 'text-white' : 'text-[#8f5428]'}`}>
                            <FileText className="w-8 h-8 text-[#b66c34]" />
                            {t('reports')}
                        </h1>
                    </div>
                    <Link to={createPageUrl('GovernmentReport')}>
                        <Button className="bg-[#b66c34] hover:bg-[#8f5428] rounded-xl">
                            <Plus className="w-4 h-4 mr-2" /> New Report
                        </Button>
                    </Link>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-[#b66c34]" />
                    </div>
                ) : reports.length === 0 ? (
                    <Card className={`p-12 text-center ${darkMode ? 'bg-gray-800 border-gray-700' : 'border-[#e5b889]'}`}>
                        <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 ${darkMode ? 'bg-gray-700' : 'bg-[#f4d0a8]'}`}>
                            <FileText className={`w-10 h-10 ${darkMode ? 'text-[#f4d0a8]' : 'text-[#b66c34]'}`} />
                        </div>
                        <h3 className={`text-lg font-medium mb-2 ${darkMode ? 'text-white' : 'text-[#6b5344]'}`}>{t('noDiscoveries')}</h3>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {reports.map((report) => (
                            <Card key={report.id} className={`p-6 hover:shadow-lg transition-shadow ${darkMode ? 'bg-gray-800 border-gray-700' : 'border-[#e5b889]'}`}>
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className={`p-2 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-[#f4d0a8]'}`}>
                                                <FileText className="w-5 h-5 text-[#b66c34]" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <Hash className="w-4 h-4 text-[#b66c34]" />
                                                    <span className={`font-mono font-medium ${darkMode ? 'text-white' : 'text-[#6b5344]'}`}>
                                                        {report.reference_number || 'Pending'}
                                                    </span>
                                                </div>
                                                <Badge className={`${statusColors[report.status]} mt-1 capitalize`}>
                                                    {report.status?.replace('_', ' ')}
                                                </Badge>
                                            </div>
                                        </div>

                                        <p className={`mt-3 line-clamp-2 ${darkMode ? 'text-gray-300' : 'text-[#6b5344]'}`}>
                                            {report.object_description}
                                        </p>

                                        <div className={`flex flex-wrap items-center gap-4 mt-3 text-sm ${darkMode ? 'text-gray-400' : 'text-[#8f7a6a]'}`}>
                                            {report.find_date && (
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="w-4 h-4" />
                                                    {new Date(report.find_date).toLocaleDateString()}
                                                </div>
                                            )}
                                            {report.location_description && (
                                                <div className="flex items-center gap-1">
                                                    <MapPin className="w-4 h-4" />
                                                    <span className="truncate max-w-[200px]">{report.location_description}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        {report.discovery_id && (
                                            <Link to={createPageUrl(`DiscoveryDetail?id=${report.discovery_id}`)}>
                                                <Button variant="outline" className={`rounded-xl ${darkMode ? 'border-gray-600 text-white hover:bg-gray-700' : 'border-[#b66c34] text-[#b66c34] hover:bg-[#f4d0a8]'}`}>
                                                    View <ExternalLink className="w-4 h-4 ml-2" />
                                                </Button>
                                            </Link>
                                        )}
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="outline" size="icon" className={`rounded-xl ${darkMode ? 'border-gray-600 text-red-400 hover:bg-gray-700' : 'border-red-200 text-red-500 hover:bg-red-50'}`}>
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent className={darkMode ? 'bg-gray-800 border-gray-700 text-white' : ''}>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle className={darkMode ? 'text-white' : ''}>Delete report?</AlertDialogTitle>
                                                    <AlertDialogDescription className={darkMode ? 'text-gray-400' : ''}>
                                                        This will delete the report and mark the discovery as "not yet reported". This cannot be undone.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel className={darkMode ? 'bg-gray-700 text-white border-gray-600' : ''}>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => deleteMutation.mutate(report)} className="bg-red-500 hover:bg-red-600">Delete</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
