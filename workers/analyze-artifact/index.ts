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

    const scanPrompt = `You are looking at an image. DESCRIBE ONLY WHAT YOU SEE. Do not guess what it is.

Look at the object and write detailed observations:

**Shape:** Describe the exact shape - is it round, square, triangular, irregular, flat, curved, elongated, etc? Any flat sides?

**Size:** Is it smaller than a coin? Coin-sized? Larger? Fill the frame?

**Colors:** List every color you see - main colors and any accents, marks, or variations.

**Texture:** Describe the surface - is it smooth, rough, bumpy, wrinkled, cracked, corroded, shiny, dull, dirty, clean?

**Marks:** Any holes, lines, letters, numbers, scratches, decorations, patterns, stamps, or wear marks? Describe them exactly.

**Material appearance:** What does the surface look like it's made of?
- Shiny/metallic = metal
- Dull/hard = ceramic or stone
- Transparent/shiny = glass
- Rough/grainy = wood or bone
- Soft/flexible = fabric or leather

Write each section with detailed observations. Be specific.`;

    const scanResult = await callAI(scanPrompt, `data:image/jpeg;base64,${base64Image}`, 250);
    
    return new Response(JSON.stringify({
      identification: {
        name: 'Object',
        period: 'Unknown',
        origin: 'Unknown',
        material: extractField(scanResult, 'Material appearance') || material,
        confidence: 30,
        observations: {
          shape: extractField(scanResult, 'Shape') || '',
          colors: extractField(scanResult, 'Colors') || '',
          surface: extractField(scanResult, 'Texture') || '',
          features: extractField(scanResult, 'Marks') || '',
          material: extractField(scanResult, 'Material appearance') || '',
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
    
    const researchPrompt = `You analyzed this image and observed:

SHAPE: ${obs.shape || 'not described'}
COLORS: ${obs.colors || 'not described'}
TEXTURE: ${obs.surface || 'not described'}
MARKS/FEATURES: ${obs.features || 'none visible'}
MATERIAL LOOKS LIKE: ${obs.material || material || 'not determined'}

Now write a brief summary:
**Type:** Give ONE name for this object (bead, coin, pottery shard, button, bullet, tool, toy, jewelry, etc). If completely unsure, write "Unknown object".
**Description:** One sentence describing what you see. Example: "A small round orange-red glass bead about 1cm, smooth surface, with a hole through the center."
**Storage:** One sentence on safe storage.`;



    const researchResult = await callAI(researchPrompt, `data:image/jpeg;base64,${base64Image}`, 250);
    
    const description = extractField(researchResult, 'Description') || obs.shape + ' ' + obs.material || 'Could not generate description.';
    const objType = extractField(researchResult, 'Type') || obs.shape + ' ' + obs.material || 'Unknown object';
    const storageAdvice = extractField(researchResult, 'Storage') || 'Store in a dry, cool place.';
    
    return new Response(JSON.stringify({
      identification: {
        name: objType,
        period: 'Unknown',
        origin: 'Unknown',
        material: obs.material || material,
        description: {
          en: obs.colors + ' ' + obs.material + ' ' + obs.shape + '. ' + description + ' Features: ' + obs.features
        },
        historical_context: {
          en: ''
        },
        confidence: 50,
        rarity: 'unknown',
        similar_finds: '',
        reference_links: []
      },
      storage_instructions: {
        en: storageAdvice
      },
      is_coin: objType.toLowerCase().includes('coin'),
      is_pipe: objType.toLowerCase().includes('pipe'),
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
