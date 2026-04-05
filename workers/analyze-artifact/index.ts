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
      
      if (action === 'scan' || action === 'identify') {
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

    // ONE STEP: Full identification + research in single AI call
    const scanPrompt = `You are an expert archaeologist analyzing this find. 

Look carefully at the OBJECT ONLY - ignore background, case, display.

Identify the object AND research its history in ONE response:

1. Name: [what the object IS - be specific, e.g. "WWII German steel helmet", "Roman bronze coin"]
2. Period: [specific time period - e.g. "1550-1700 BCE", "1940s WWII", "17th century"]
3. Origin: [region/country - e.g. "Egypt", "Northern Europe", "Japan"]
4. Material: [what it's made of - e.g. "steel", "bronze", "ceramic"]
5. Description: [detailed description - 4-6 sentences]
6. Historical Context: [2-3 sentences about significance]
7. Similar Finds: [1-2 sentences about similar artifacts]
8. Storage: [ONE simple sentence for home storage]
9. Confidence: [70-95 - based on how clearly identifiable the object is]

Be accurate. A WWII helmet is NOT a medieval knight helmet.`;

    const scanResult = await callAI(scanPrompt, `data:image/jpeg;base64,${base64Image}`, 2000);
    
    // Robust extraction - find text after field name and colon
    const extractField = (text: string, field: string, maxLen = 0): string => {
      const regex = new RegExp(`${field}:\\s*(.+?)(?:\\n|$)`, 'i');
      const match = text.match(regex);
      if (match) {
        // Clean: remove ** prefixes and trim
        let val = match[1].replace(/^\*+\s*/g, '').replace(/\*+$/g, '').trim();
        if (maxLen > 0 && val.length > maxLen) val = val.substring(0, maxLen) + '...';
        return val;
      }
      return '';
    };
    
    let name = extractField(scanResult, 'Name', 100) || extractField(scanResult, 'name', 100) || '';
    let period = extractField(scanResult, 'Period', 100) || extractField(scanResult, 'period', 100) || 'Unknown period';
    let origin = extractField(scanResult, 'Origin', 100) || extractField(scanResult, 'origin', 100) || 'Unknown origin';
    let extractedMaterial = extractField(scanResult, 'Material', 100) || extractField(scanResult, 'material', 100) || material;
    let confidenceStr = extractField(scanResult, 'Confidence') || extractField(scanResult, 'confidence') || '30';
    let storage = extractField(scanResult, 'Storage', 100) || extractField(scanResult, 'storage', 100) || 'Store in a dry, cool place.';
    // Clean up storage - remove any "Next Step:" or similar garbage
    storage = storage.replace(/Next Step:.*/gi, '').replace(/Continue:.*/gi, '').trim();
    // Limit storage to first sentence, max 100 chars
    const storageParts = storage.split(/[.!?]/);
    storage = storageParts[0].trim().substring(0, 100);
    if (!storage) storage = 'Store in a dry, cool place.';
    let visual = extractField(scanResult, 'Description') || extractField(scanResult, 'description') || '';
    let historicalContext = extractField(scanResult, 'Historical Context') || extractField(scanResult, 'Historical') || '';
    let similarFinds = extractField(scanResult, 'Similar Finds') || extractField(scanResult, 'Similar') || '';
    
    // Allow much longer text - up to 1500 chars
    if (visual.length > 1500) visual = visual.substring(0, 1500) + '...';
    if (historicalContext.length > 1000) historicalContext = historicalContext.substring(0, 1000) + '...';
    if (similarFinds.length > 500) similarFinds = similarFinds.substring(0, 500) + '...';
    
    if (visual.length < 10) visual = 'Object requires further analysis';
    if (!historicalContext) historicalContext = 'No historical context available.';
    if (!similarFinds) similarFinds = '';
    if (!name) {
      const nameLine = scanResult.split('\n').find(l => l.toLowerCase().includes('name:'));
      if (nameLine) name = nameLine.replace(/.*name:/i, '').trim();
    }
    if (!name) name = 'Unknown object';
    
    const confidence = parseInt(confidenceStr.replace(/\D/g, '')) || 30;
    
    const isCoin = name.toLowerCase().includes('coin');
    const isPipe = name.toLowerCase().includes('pipe');
    const isArch = !name.toLowerCase().includes('unknown') && !name.toLowerCase().includes('modern') && confidence > 20;
    
    return new Response(JSON.stringify({
      identification: {
        name: name,
        period: period,
        origin: origin,
        material: extractedMaterial || material,
        description: { en: visual },
        historical_context: { en: historicalContext },
        confidence: confidence,
        rarity: 'unknown',
        similar_finds: similarFinds,
        reference_links: []
      },
      storage_instructions: { en: storage },
      is_coin: isCoin,
      is_pipe: isPipe,
      is_archaeological: isArch
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
