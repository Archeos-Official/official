import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Calendar, MapPin, Gem, Package, Database, ExternalLink, Languages } from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';
import { translateDiscovery } from '@/api/aiService';

const SUPPORTED_LANGUAGES = {
    en: 'English',
    nl: 'Nederlands',
    de: 'Deutsch',
    fr: 'Français',
    es: 'Español',
    el: 'Ελληνικά'
};

export default function AIAnalysisCard({ analysis, storageInstructions, darkMode: propDarkMode, showTranslateButton = true }) {
    const { t, darkMode: contextDarkMode, language } = useLanguage();
    const darkMode = propDarkMode !== undefined ? propDarkMode : contextDarkMode;
    const [translating, setTranslating] = useState(false);
    const [translatedData, setTranslatedData] = useState(null);
    
    if (!analysis) return null;
    
    // Helper to get localized text from object or string
    const getLocalized = (field, useTranslated = true) => {
        if (!field) return '';
        if (typeof field === 'object') {
            // Check translated data first
            if (useTranslated && translatedData) {
                const translatedField = translatedData.identification?.description === field ? 
                    translatedData.identification?.description : null;
            }
            // Use current language, then English, then first available
            return field[language] || field.en || Object.values(field).find(v => typeof v === 'string') || '';
        }
        return field;
    };
    
    // Check if current language is available
    const hasLocalTranslation = analysis.description?.[language] && analysis.description[language].length > 10;
    const currentDescription = translatedData?.identification?.description?.[language] || analysis.description?.[language] || analysis.description?.en || '';
    const currentContext = translatedData?.identification?.historical_context?.[language] || analysis.historical_context?.[language] || analysis.historical_context?.en || '';
    const currentStorage = translatedData?.storage_instructions?.[language] || storageInstructions?.[language] || storageInstructions?.en || '';
    
    const handleTranslate = async () => {
        if (language === 'en' || translating) return;
        
        setTranslating(true);
        try {
            const result = await translateDiscovery(analysis, storageInstructions, language);
            setTranslatedData(result);
        } catch (error) {
            console.error('Translation failed:', error);
        } finally {
            setTranslating(false);
        }
    };

    const confidenceColor = analysis.confidence >= 80 ? 'bg-green-100 text-green-700' :
                           analysis.confidence >= 60 ? 'bg-[#f4d0a8] text-[#8f5428]' :
                           'bg-red-100 text-red-700';

    const rarityColor = {
        'common': 'bg-[#e5b889] text-[#6b5344]',
        'uncommon': 'bg-[#c98a54] text-white',
        'rare': 'bg-[#b66c34] text-white',
        'very_rare': 'bg-[#8f5428] text-white',
        'legendary': 'bg-gradient-to-r from-[#b66c34] to-[#8f5428] text-white'
    }[analysis.rarity] || 'bg-[#e5b889] text-[#6b5344]';

    const cardBg = darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gradient-to-br from-[#f4d0a8]/50 to-[#e5b889]/30 border-[#c98a54]';
    const textMain = darkMode ? 'text-white' : 'text-[#6b5344]';
    const textMuted = darkMode ? 'text-gray-400' : 'text-[#8f7a6a]';
    const subBg = darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white/60 border-[#c98a54]';

    return (
        <Card className={`p-6 ${cardBg}`}>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-[#f4d0a8]'}`}>
                        <Sparkles className="w-5 h-5 text-[#b66c34]" />
                    </div>
                    <h3 className={`font-semibold text-lg ${textMain}`}>{t('aiAnalysis')}</h3>
                </div>
                {showTranslateButton && language !== 'en' && !translatedData && (
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleTranslate}
                        disabled={translating}
                        className={`rounded-xl text-xs ${darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-[#b66c34] text-[#b66c34] hover:bg-[#f4d0a8]'}`}
                    >
                        {translating ? (
                            <>
                                <Sparkles className="w-3 h-3 mr-1 animate-spin" />
                                Translating...
                            </>
                        ) : (
                            <>
                                <Languages className="w-3 h-3 mr-1" />
                                Translate to {SUPPORTED_LANGUAGES[language]}
                            </>
                        )}
                    </Button>
                )}
                {translatedData && (
                    <Badge variant="outline" className={`text-xs ${darkMode ? 'border-gray-600 text-gray-400' : 'border-[#b66c34] text-[#b66c34]'}`}>
                        <Languages className="w-3 h-3 mr-1" />
                        {SUPPORTED_LANGUAGES[language]}
                    </Badge>
                )}
            </div>

            <div className="space-y-4">
                <div>
                    <h4 className={`text-2xl font-bold ${darkMode ? 'text-[#f4d0a8]' : 'text-[#8f5428]'}`}>{analysis.name}</h4>
                    <div className="flex flex-wrap gap-2 mt-2">
                        <Badge variant="default" className={confidenceColor}>{analysis.confidence}% {t('confidence')}</Badge>
                        <Badge variant="default" className={rarityColor}>{analysis.rarity?.replace('_', ' ')}</Badge>
                    </div>
                </div>

                {currentDescription && (
                    <div className={`p-3 rounded-lg ${subBg}`}>
                        <p className={`text-sm ${textMain}`}>{currentDescription}</p>
                    </div>
                )}

                {currentContext && (
                    <p className={`text-sm italic ${textMain}`}>{currentContext}</p>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-start gap-3">
                        <Calendar className="w-4 h-4 text-[#b66c34] mt-1" />
                        <div>
                            <p className={`text-xs uppercase tracking-wide ${textMuted}`}>{t('period')}</p>
                            <p className={`font-medium ${textMain}`}>{analysis.period}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <MapPin className="w-4 h-4 text-[#b66c34] mt-1" />
                        <div>
                            <p className={`text-xs uppercase tracking-wide ${textMuted}`}>{t('origin')}</p>
                            <p className={`font-medium ${textMain}`}>{analysis.origin}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <Gem className="w-4 h-4 text-[#b66c34] mt-1" />
                        <div>
                            <p className={`text-xs uppercase tracking-wide ${textMuted}`}>{t('material')}</p>
                            <p className={`font-medium ${textMain}`}>{analysis.material}</p>
                        </div>
                    </div>
                </div>

                {analysis.similar_finds && (
                    <div className={`p-4 rounded-xl border ${subBg}`}>
                        <div className="flex items-center gap-2 mb-2">
                            <Database className="w-4 h-4 text-[#b66c34]" />
                            <p className={`font-medium ${darkMode ? 'text-[#f4d0a8]' : 'text-[#8f5428]'}`}>{t('similarFinds')}</p>
                        </div>
                        <p className={`text-sm ${textMain}`}>{analysis.similar_finds}</p>
                    </div>
                )}

                {currentStorage && (
                    <div className={`p-4 rounded-xl border ${subBg}`}>
                        <div className="flex items-center gap-2 mb-2">
                            <Package className="w-4 h-4 text-[#b66c34]" />
                            <p className={`font-medium ${darkMode ? 'text-[#f4d0a8]' : 'text-[#8f5428]'}`}>{t('howToStore')}</p>
                        </div>
                        <p className={`text-sm ${textMain}`}>{currentStorage}</p>
                    </div>
                )}
            </div>
        </Card>
    );
}