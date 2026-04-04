const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const ACCOUNT_ID = 'a0aea21f8b422b03ea28d79829060046';
const API_TOKEN = 'cfut_WS2J372BIQpzpCiyTG3gChdyVWnSZ1mozJXp1lz6a754da42';

function extractField(text: string, field: string): string {
  const regex = new RegExp(`\\*\\*${field}:\\*\\*\\s*(.+?)(?:\\n\\*\\*|$)`, 'i');
  const match = text.match(regex);
  return match ? match[1].trim() : '';
}

async function callAI(prompt: string, image?: string, maxTokens: number = 4096): Promise<string> {
  const body: any = {
    stream: false,
    prompt: prompt,
    max_tokens: maxTokens
  };
  
  if (image) {
    body.image = image;
  }
  
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run/@cf/meta/llama-3.2-11b-vision-instruct`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    }
  );
  
  const data = await response.json();
  let result = data.result?.response || '';
  
  if (typeof result !== 'string') {
    result = JSON.stringify(result);
  }
  
  return result;
}

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method === 'GET') {
      return new Response(JSON.stringify({ status: 'ok', worker: 'analyze-artifact' }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed. Use POST.' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    try {
      const body = await request.json();
      const { action } = body;
      
      if (action === 'scan') {
        return handleScan(body);
      }
      
      if (action === 'research') {
        return handleResearch(body);
      }
      
      if (action === 'translate') {
        return handleTranslate(body);
      }
      
      return handleScan(body);
    } catch (error) {
      return new Response(JSON.stringify({ error: String(error) }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
  },
};

async function handleScan(body: any): Promise<Response> {
  try {
    const { image_urls, context } = body;
    const material = context?.material || '';

    let base64Image = '';
    
    if (image_urls && image_urls.length > 0) {
      try {
        const imgRes = await fetch(image_urls[0]);
        const blob = await imgRes.arrayBuffer();
        const uint8 = new Uint8Array(blob);
        
        let binary = '';
        for (let i = 0; i < uint8.length; i++) {
          binary += String.fromCharCode(uint8[i]);
        }
        base64Image = btoa(binary);
      } catch (e) {
        return new Response(JSON.stringify({ error: 'Failed to fetch image' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
    }

    const materialContext = material ? `The user confirmed: object is made from ${material}.` : '';

    const scanPrompt = `DESCRIBE EXACTLY WHAT YOU SEE. DO NOT GUESS WHAT IT IS.

Look at this image carefully and answer these questions:

1. SHAPE: What shape is it? (rectangular, square, round, irregular, flat, curved, elongated?)
   - Are edges straight, curved, or broken?
   - Is it thick or thin?

2. SIZE: Compare to: smaller than coin | coin-sized | larger than coin | fills frame

3. COLORS: List ALL colors you see (main color, any marks, dirt, patterns)

4. SURFACE: What does the surface look like?
   - smooth, rough, bumpy, cracked, wrinkled, dusty, muddy, clean?
   - Is it shiny, dull, or matte?

5. MARKS: Any of these?
   - scratches, cracks, holes, lines, dots
   - symbols, letters, drawings, patterns
   - wear spots, rust, corrosion, patina

6. MATERIAL LOOK: Based on appearance:
   - Hard and shiny = probably metal
   - Hard and dull = probably ceramic/stone/glass
   - Soft or grainy = probably wood/bone/cloth

Answer each question. Be specific. Example: "Color: brown with dark brown marks on surface. Surface: rough, dusty, some cracks along edges."`;

    const scanResult = await callAI(scanPrompt, `data:image/jpeg;base64,${base64Image}`, 400);
    
    return new Response(JSON.stringify({
      identification: {
        name: 'Object being analyzed',
        period: 'Unknown',
        origin: 'Unknown',
        material: extractField(scanResult, 'MATERIAL LOOK') || material,
        confidence: 30,
        observations: {
          shape: extractField(scanResult, 'SHAPE') || '',
          size: extractField(scanResult, 'SIZE') || '',
          colors: extractField(scanResult, 'COLORS') || '',
          surface: extractField(scanResult, 'SURFACE') || '',
          features: extractField(scanResult, 'MARKS') || '',
          material: extractField(scanResult, 'MATERIAL LOOK') || '',
          raw: scanResult
        }
      }
    }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

async function handleResearch(body: any): Promise<Response> {
  try {
    const { identification, image_urls } = body;
    
    let base64Image = '';
    
    if (image_urls && image_urls.length > 0) {
      try {
        const imgRes = await fetch(image_urls[0]);
        const blob = await imgRes.arrayBuffer();
        const uint8 = new Uint8Array(blob);
        
        let binary = '';
        for (let i = 0; i < uint8.length; i++) {
          binary += String.fromCharCode(uint8[i]);
        }
        base64Image = btoa(binary);
      } catch {}
    }

    const obs = identification?.observations || {};
    const material = obs.material || identification?.material || '';
    
    // Generate description from observations directly (no need to call AI again)
    const shape = obs.shape || 'Unknown shape';
    const size = obs.size || 'Unknown size';
    const colors = obs.colors || 'Unknown color';
    const surface = obs.surface || 'Unknown surface';
    const features = obs.features || 'No visible marks';

    // Create a simple, factual description
    const description = `${colors}. ${surface} surface. ${features}. ${size}.`;
    const objType = 'Object';
    
    const storageAdvice = surface.toLowerCase().includes('dusty') || surface.toLowerCase().includes('dirty')
      ? 'Gently brush off loose dirt. Store in a dry box away from moisture.'
      : surface.toLowerCase().includes('metal') || surface.toLowerCase().includes('shiny')
      ? 'Store in a dry place. Avoid moisture to prevent rust.'
      : 'Store in a cool, dry environment.';

    return new Response(JSON.stringify({
      identification: {
        name: objType,
        period: 'Unknown',
        origin: 'Unknown',
        material: material,
        description: {
          en: description
        },
        historical_context: {
          en: ''
        },
        confidence: 40,
        rarity: 'unknown',
        similar_finds: '',
        reference_links: []
      },
      storage_instructions: {
        en: storageAdvice
      },
      is_coin: false,
      is_pipe: false,
      is_archaeological: true
    }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

async function handleTranslate(body: any): Promise<Response> {
  try {
    const { identification, storage_instructions, targetLanguage } = body;
    
    const descriptionEn = identification?.description?.en || '';
    const storageEn = storage_instructions?.en || '';
    
    if (!descriptionEn && !storageEn) {
      return new Response(JSON.stringify({
        identification: { description: {}, historical_context: {} },
        storage_instructions: {}
      }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    
    const langMap: Record<string, string> = {
      'nl': 'Dutch',
      'de': 'German', 
      'fr': 'French',
      'es': 'Spanish',
      'el': 'Greek'
    };
    
    const targetLang = langMap[targetLanguage] || 'Dutch';
    
    const transPrompt = `Translate to ${targetLang}. Return ONLY JSON:
{"desc":"[description]","storage":"[storage]"}
Description: ${descriptionEn}
Storage: ${storageEn}`;
    
    const transResult = await callAI(transPrompt, '', 1024);
    
    let translations: any = {};
    const firstBrace = transResult.indexOf('{');
    const lastBrace = transResult.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1) {
      try {
        translations = JSON.parse(transResult.substring(firstBrace, lastBrace + 1));
      } catch {}
    }
    
    const langKey = targetLanguage || 'nl';
    
    return new Response(JSON.stringify({
      identification: {
        description: {
          [langKey]: translations.desc || ''
        },
        historical_context: {}
      },
      storage_instructions: {
        [langKey]: translations.storage || ''
      }
    }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}
