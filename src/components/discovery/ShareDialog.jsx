import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Share2, Copy, Check, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '@/components/LanguageContext';

const rarityColors = {
    common: 'bg-[#e5b889] text-[#6b5344]',
    uncommon: 'bg-[#c98a54] text-white',
    rare: 'bg-[#b66c34] text-white',
    very_rare: 'bg-[#8f5428] text-white',
    legendary: 'bg-gradient-to-r from-[#b66c34] to-[#8f5428] text-white'
};

export default function ShareDialog({ open, onClose, discovery, username }) {
    const { t, darkMode } = useLanguage();
    const [copied, setCopied] = React.useState(false);

    const shareUrl = window.location.href;
    const shareText = `Check out this archaeological find: ${discovery?.ai_identification?.name || discovery?.name} - Found by ${username}`;

    const handleCopyLink = () => {
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleWhatsApp = () => {
        window.open(`https://wa.me/?text=${encodeURIComponent(shareText + '\n' + shareUrl)}`, '_blank');
    };

    const handleTwitter = () => {
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
    };

    const handleFacebook = () => {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
    };

    const handleNativeShare = async () => {
        if (navigator.share) {
            await navigator.share({
                title: `ArcheOS: ${discovery?.ai_identification?.name || discovery?.name}`,
                text: shareText,
                url: shareUrl
            });
        }
    };

    if (!discovery) return null;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className={`sm:max-w-md ${darkMode ? 'bg-gray-800 border-gray-700' : ''}`}>
                <DialogHeader>
                    <DialogTitle className={`flex items-center gap-2 ${darkMode ? 'text-white' : 'text-[#8f5428]'}`}>
                        <Share2 className="w-5 h-5" />
                        {t('shareDiscovery')}
                    </DialogTitle>
                </DialogHeader>
                
                {/* Share Card Preview */}
                <div className={`rounded-2xl p-4 border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gradient-to-br from-[#f4d0a8] to-[#e5b889] border-[#c98a54]'}`}>
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-[#b66c34] flex items-center justify-center">
                                <span className="text-white font-bold text-sm">A</span>
                            </div>
                            <span className={`font-bold ${darkMode ? 'text-white' : 'text-[#8f5428]'}`}>ArcheOS</span>
                        </div>
                        {discovery.ai_identification?.rarity && (
                            <Badge className={`${rarityColors[discovery.ai_identification.rarity]} text-xs`}>
                                {discovery.ai_identification.rarity.replace('_', ' ')}
                            </Badge>
                        )}
                    </div>

                    {discovery.image_url && (
                        <div className="rounded-xl overflow-hidden mb-3">
                            <img src={discovery.image_url} alt="Discovery" className="w-full h-48 object-cover" />
                        </div>
                    )}

                    <div className="space-y-1">
                        <h3 className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-[#6b5344]'}`}>
                            {discovery.ai_identification?.name || discovery.name}
                        </h3>
                        {discovery.ai_identification?.period && (
                            <p className="text-sm text-[#b66c34] font-medium">{discovery.ai_identification.period}</p>
                        )}
                        <div className={`flex items-center justify-between pt-2 border-t mt-2 ${darkMode ? 'border-gray-600' : 'border-[#c98a54]/50'}`}>
                            <p className={`text-xs ${darkMode ? 'text-gray-300' : 'text-[#6b5344]'}`}>
                                {t('foundBy')} <span className="font-semibold">{username || 'User'}</span>
                            </p>
                            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-[#8f7a6a]'}`}>
                                {discovery.discovery_date ? format(new Date(discovery.discovery_date), 'MMM d, yyyy') : ''}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Share Buttons */}
                <div className="space-y-3 mt-4">
                    <p className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-[#6b5344]'}`}>{t('shareVia')}</p>
                    <div className="grid grid-cols-4 gap-2">
                        <Button variant="outline" onClick={handleWhatsApp} className={`flex-col h-auto py-3 rounded-xl ${darkMode ? 'border-gray-600 hover:bg-gray-700' : 'border-[#e5b889] hover:bg-[#f4d0a8]'}`}>
                            <MessageCircle className="w-5 h-5 text-green-500 mb-1" />
                            <span className={`text-xs ${darkMode ? 'text-gray-300' : 'text-[#6b5344]'}`}>WhatsApp</span>
                        </Button>
                        <Button variant="outline" onClick={handleTwitter} className={`flex-col h-auto py-3 rounded-xl ${darkMode ? 'border-gray-600 hover:bg-gray-700' : 'border-[#e5b889] hover:bg-[#f4d0a8]'}`}>
                            <svg className="w-5 h-5 text-black mb-1" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                            <span className={`text-xs ${darkMode ? 'text-gray-300' : 'text-[#6b5344]'}`}>X</span>
                        </Button>
                        <Button variant="outline" onClick={handleFacebook} className={`flex-col h-auto py-3 rounded-xl ${darkMode ? 'border-gray-600 hover:bg-gray-700' : 'border-[#e5b889] hover:bg-[#f4d0a8]'}`}>
                            <svg className="w-5 h-5 text-blue-600 mb-1" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                            <span className={`text-xs ${darkMode ? 'text-gray-300' : 'text-[#6b5344]'}`}>Facebook</span>
                        </Button>
                        <Button variant="outline" onClick={handleNativeShare} className={`flex-col h-auto py-3 rounded-xl ${darkMode ? 'border-gray-600 hover:bg-gray-700' : 'border-[#e5b889] hover:bg-[#f4d0a8]'}`}>
                            <Share2 className="w-5 h-5 text-[#b66c34] mb-1" />
                            <span className={`text-xs ${darkMode ? 'text-gray-300' : 'text-[#6b5344]'}`}>More</span>
                        </Button>
                    </div>
                </div>

                {/* Copy Link */}
                <Button 
                    variant="outline" 
                    className={`w-full mt-2 rounded-xl ${darkMode ? 'border-gray-600 text-white hover:bg-gray-700' : 'border-[#b66c34] text-[#b66c34] hover:bg-[#f4d0a8]'}`}
                    onClick={handleCopyLink}
                >
                    {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                    {copied ? t('copied') : t('copyLink')}
                </Button>
            </DialogContent>
        </Dialog>
    );
}