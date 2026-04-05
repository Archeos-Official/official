// @ts-ignore
const AI_WORKER_URL = import.meta.env.VITE_AI_WORKER_URL;
// @ts-ignore
const RESEARCH_WORKER_URL = import.meta.env.VITE_RESEARCH_WORKER_URL;

const languagePrompts = {
    en: 'Respond in English.',
    nl: 'Antwoord in het Nederlands.',
    de: 'Antworten Sie auf Deutsch.',
    fr: 'Répondez en français.',
    es: 'Responda en español.'
};

export const analyzeArtifact = async (imageUrls, context = {}, language = 'en') => {
    const { depth_found, soil_type, condition, detection_method, material } = context;

    try {
        console.log('Calling AI Worker at:', AI_WORKER_URL);
        console.log('Image URLs:', imageUrls);
        
        const response = await fetch(AI_WORKER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                image_urls: imageUrls,
                context: { depth_found, soil_type, condition, detection_method, material },
                action: 'scan'
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`AI analysis error: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        
        if (result.error) {
            throw new Error(result.error);
        }

        return result;
    } catch (error) {
        console.error('AI analysis failed:', error);
        throw error;
    }
};

export const deepResearchArtifact = async (scanResult, language = 'en', imageUrls = []) => {
    try {
        console.log('Analyzing artifact with full research...', scanResult);
        
        const response = await fetch(AI_WORKER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'identify',
                image_urls: imageUrls
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Analysis error: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        
        console.log('Analysis result:', result);
        
        if (result.error) {
            throw new Error(result.error);
        }

        return result;
    } catch (error) {
        console.error('Deep research failed:', error);
        // Return original result if research fails
        return scanResult;
    }
};

export const sendEmail = async ({ to, subject, body }) => {
    const mailtoLink = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoLink, '_blank');
    return { fallback: true };
};

export const translateDiscovery = async (identification, storage_instructions, targetLanguage) => {
    if (targetLanguage === 'en') {
        return { identification, storage_instructions };
    }

    try {
        const langMap = {
            'nl': 'nl',
            'de': 'de',
            'fr': 'fr',
            'es': 'es',
            'el': 'el'
        };
        const langCode = langMap[targetLanguage] || 'nl';
        
        const fieldsToTranslate = {
            description: identification?.description?.en || '',
            historical_context: identification?.historical_context?.en || '',
            similar_finds: identification?.similar_finds || '',
            name: identification?.name || '',
            period: identification?.period || '',
            origin: identification?.origin || '',
            material: identification?.material || ''
        };
        
        const translateText = async (text) => {
            if (!text) return '';
            try {
                const response = await fetch(
                    `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${langCode}`
                );
                const data = await response.json();
                return data.responseData?.translatedText || text;
            } catch {
                return text;
            }
        };
        
        const results = await Promise.all(
            Object.values(fieldsToTranslate).map(t => translateText(t))
        );
        
        const translated = {
            description: results[0],
            historical_context: results[1],
            similar_finds: results[2],
            name: results[3],
            period: results[4],
            origin: results[5],
            material: results[6]
        };
        
        const storageEn = storage_instructions?.en || '';
        const storageTrans = await translateText(storageEn);
        
        return {
            identification: {
                ...identification,
                name: translated.name,
                period: translated.period,
                origin: translated.origin,
                material: translated.material,
                description: {
                    ...identification.description,
                    [targetLanguage]: translated.description
                },
                historical_context: {
                    ...identification.historical_context,
                    [targetLanguage]: translated.historical_context
                },
                similar_finds: translated.similar_finds
            },
            storage_instructions: {
                ...storage_instructions,
                [targetLanguage]: storageTrans
            }
        };
    } catch (error) {
        console.error('Translation failed:', error);
        return { identification, storage_instructions };
    }
};
