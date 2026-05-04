// @ts-ignore
const AI_WORKER_URL = import.meta.env.VITE_AI_WORKER_URL;
// @ts-ignore
const RESEARCH_WORKER_URL = import.meta.env.VITE_RESEARCH_WORKER_URL;
// @ts-ignore
const OLLAMA_URL = import.meta.env.VITE_OLLAMA_URL || 'http://localhost:11434';
// @ts-ignore
const OLLAMA_MODEL = import.meta.env.VITE_OLLAMA_MODEL || 'llama3.2-vision:11b';
// @ts-ignore
const USE_OLLAMA = import.meta.env.VITE_USE_OLLAMA === 'true';

const languagePrompts = {
    en: 'Respond in English.',
    nl: 'Antwoord in het Nederlands.',
    de: 'Antworten Sie auf Deutsch.',
    fr: 'Répondez en français.',
    es: 'Responda en español.'
};

const callOllama = async (prompt, images = []) => {
    const messages = [];
    
    if (images.length > 0) {
        messages.push({
            role: 'user',
            content: prompt,
            images: images
        });
    } else {
        messages.push({
            role: 'user',
            content: prompt
        });
    }
    
    const requestBody = {
        model: OLLAMA_MODEL,
        messages: messages,
        stream: false,
        format: 'json'
    };
    
    console.log('=== F12 DEBUG: HTTP Request to Ollama ===');
    console.log('URL:', `${OLLAMA_URL}/api/chat`);
    console.log('Method: POST');
    console.log('Headers:', { 'Content-Type': 'application/json' });
    console.log('Body:', JSON.stringify(requestBody, null, 2));
    console.log('=== END DEBUG ===');
    
    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama error: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    return JSON.parse(result.message.content);
};

export const analyzeArtifact = async (imageUrls, context = {}, language = 'en') => {
    const { depth_found, soil_type, condition, detection_method, material, latitude, longitude } = context;

    try {
        if (USE_OLLAMA) {
            console.log('Calling Ollama at:', OLLAMA_URL);
            
            const contextText = `Depth found: ${depth_found || 'unknown'}, Soil type: ${soil_type || 'unknown'}, Condition: ${condition || 'unknown'}, Detection method: ${detection_method || 'unknown'}, Material: ${material || 'unknown'}${latitude && longitude ? `, Location: ${latitude}, ${longitude}` : ''}`;
            
            const prompt = `Analyze this archaeological artifact image. Context: ${contextText}. ${languagePrompts[language] || languagePrompts.en}
            
Return a JSON object with: name, period, origin, material, description, historical_context, similar_finds, confidence`;

            const messages = [{
                role: 'user',
                content: prompt,
                images: imageUrls
            }];
            
            const requestBody = {
                model: OLLAMA_MODEL,
                messages: messages,
                stream: false,
                format: 'json'
            };
            
            console.log('=== F12 DEBUG: HTTP Request to Ollama ===');
            console.log('URL:', `${OLLAMA_URL}/api/chat`);
            console.log('Method: POST');
            console.log('Headers:', { 'Content-Type': 'application/json' });
            console.log('Body:', JSON.stringify(requestBody, null, 2));
            console.log('=== END DEBUG ===');
            
            const result = await callOllama(prompt, imageUrls);
            return result;
        }
        
        console.log('Calling AI Worker at:', AI_WORKER_URL);
        console.log('Image URLs:', imageUrls);
        
        const requestBody = {
            image_urls: imageUrls,
            context: { depth_found, soil_type, condition, detection_method, material, latitude, longitude },
            action: 'scan'
        };
        
        console.log('=== F12 DEBUG: HTTP Request to AI Worker ===');
        console.log('URL:', AI_WORKER_URL);
        console.log('Method: POST');
        console.log('Headers:', { 'Content-Type': 'application/json' });
        console.log('Body:', JSON.stringify(requestBody, null, 2));
        console.log('=== END DEBUG ===');
        
        const response = await fetch(AI_WORKER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
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
