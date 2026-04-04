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
        console.log('Deep researching artifact...', scanResult);
        
        const identification = scanResult.identification || {};
        const observations = identification.observations || {};
        const description = identification.description?.en || '';
        
        const response = await fetch(RESEARCH_WORKER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                description: description,
                observations: observations
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Research error: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        
        console.log('Research result:', result);
        
        if (result.error) {
            throw new Error(result.error);
        }

        // Merge research results with scan results
        return {
            identification: {
                ...identification,
                name: result.name || identification.name,
                period: result.period || 'Unknown',
                origin: result.origin || 'Unknown',
                historical_context: { en: result.historical_context || '' },
                confidence: result.confidence || identification.confidence || 50,
                rarity: result.rarity || 'unknown',
                similar_finds: result.similar_finds || '',
                reference_links: result.reference_links || []
            },
            storage_instructions: {
                en: result.storage_instructions || identification.storage_instructions?.en || 'Store in a dry, cool place.'
            },
            is_coin: (result.name || '').toLowerCase().includes('coin'),
            is_pipe: (result.name || '').toLowerCase().includes('pipe'),
            is_archaeological: true
        };
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
        const response = await fetch(AI_WORKER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'translate',
                identification,
                storage_instructions,
                targetLanguage
            })
        });

        if (!response.ok) {
            throw new Error('Translation failed');
        }

        const translations = await response.json();
        
        return {
            identification: {
                ...identification,
                description: {
                    ...identification.description,
                    ...translations.identification?.description
                },
                historical_context: {
                    ...identification.historical_context,
                    ...translations.identification?.historical_context
                }
            },
            storage_instructions: {
                ...storage_instructions,
                ...translations.storage_instructions
            }
        };
    } catch (error) {
        console.error('Translation failed:', error);
        return { identification, storage_instructions };
    }
};
