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

const VISION_MODEL = '@cf/meta/llama-3.2-11b-vision-instruct';

async function callAI(prompt: string, image?: string, maxTokens: number = 4096): Promise<string> {
  const body: any = {
    stream: false,
    prompt: prompt,
    max_tokens: maxTokens
  };
  
  if (image) {
    body.image = image;
  }
  
  console.log('Calling AI with model:', VISION_MODEL, 'image provided:', !!image);
  
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run/${VISION_MODEL}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    }
  );
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('AI API error:', response.status, errorText);
    throw new Error(`AI API error: ${response.status}`);
  }
  
  const data = await response.json();
  console.log('AI response structure:', Object.keys(data));
  
  if (data.error) {
    console.error('AI error:', data.error);
    throw new Error(data.error.message || data.error);
  }
  
  let result = data.result?.response || '';
  
  if (typeof result !== 'string') {
    result = JSON.stringify(result);
  }
  
  console.log('AI raw result length:', result.length);
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
    console.error('FINAL ERROR:', error);
    return new Response(JSON.stringify({ 
      error: 'Analysis failed: ' + error,
      debug: {
        message: String(error),
        stack: error.stack || 'no stack'
      }
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}
  },
};

async function handleScan(body: any): Promise<Response> {
  try {
    console.log('=== HANDLE SCAN START ===');
    console.log('Full body received:', JSON.stringify(body).substring(0, 500));
    
    const { image_urls, context } = body;
    const material = context?.material || '';
    console.log('image_urls:', image_urls);
    console.log('context material:', material);

    let base64Image = '';
    
    if (image_urls && image_urls.length > 0) {
      try {
        const imageUrl = image_urls[0];
        console.log('Step 1: Fetching image from URL:', imageUrl);
        
        const imgRes = await fetch(imageUrl);
        console.log('Step 2: Image fetch status:', imgRes.status, imgRes.statusText);
        
        if (!imgRes.ok) {
          console.error('Step 2 FAILED: Image fetch failed with status:', imgRes.status);
          return new Response(JSON.stringify({ error: 'Failed to fetch image: ' + imgRes.status }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }
        
        const blob = await imgRes.blob();
        console.log('Step 3: Got blob, type:', blob.type, 'size:', blob.size);
        
        const arrayBuffer = await blob.arrayBuffer();
        console.log('Step 4: Got arrayBuffer, length:', arrayBuffer.byteLength);
        
        const uint8 = new Uint8Array(arrayBuffer);
        
        let binary = '';
        for (let i = 0; i < uint8.length; i++) {
          binary += String.fromCharCode(uint8[i]);
        }
        base64Image = btoa(binary);
        console.log('Step 5: Converted to base64, length:', base64Image.length, 'First 100 chars:', base64Image.substring(0, 100));
      } catch (e) {
        console.error('Step ERROR: Image processing error:', e);
        return new Response(JSON.stringify({ error: 'Failed to process image: ' + e }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
    } else {
      console.log('WARNING: No image_urls provided or empty array');
    }

    if (!base64Image) {
      console.log('ERROR: No base64Image generated - returning error');
      return new Response(JSON.stringify({ error: 'No image provided - image_urls was empty or image fetch failed' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // ONE STEP: Full identification + research in single AI call
    const scanPrompt = `You are an expert archaeologist analyzing archaeological finds. 

Look carefully at the OBJECT in this image. Focus ONLY on the artifact itself - ignore any background, case, display stand, or modern context.

Analyze this artifact and provide detailed identification:

**Name:** [What the object is - be specific, e.g. "Roman bronze fibula", "Medieval copper alloy buckle", "Prehistoric flint arrowhead"]

**Period:** [The historical time period based on the object's style and features - if uncertain specify "Unknown period"]

**Origin:** [The likely region of manufacture - if uncertain say "Unknown origin"]

**Material:** [What the object is made of based on appearance - bronze, iron, ceramic, glass, stone, etc.]

**Description:** [2-3 sentences describing the object's physical features, size indicators, wear patterns, decoration]

**Historical Context:** [1-2 sentences about the significance of this type of artifact in history]

**Similar Finds:** [Mention any similar known artifacts or leave blank if unknown]

**Storage:** [Brief advice for proper home storage]

**Confidence:** [60-95 if you can identify the object, 20-50 if uncertain]

**Rarity:** [common, uncommon, rare, or very_rare based on how frequently this type is found]

Provide your response using these exact field names. If you truly cannot identify the object, say "Unknown object" but still provide the confidence level.`;

    let scanResult = '';
    try {
      scanResult = await callAI(scanPrompt, `data:image/jpeg;base64,${base64Image}`, 2000);
    } catch (aiError) {
      console.error('AI CALL FAILED:', aiError);
      scanResult = 'AI Error: ' + aiError;
    }
    
    console.log('Step 7: AI call complete');
    console.log('=== RAW AI RESPONSE START ===');
    console.log(scanResult);
    console.log('=== RAW AI RESPONSE END ===');
    
    if (!scanResult || scanResult.length < 10) {
      console.log('WARNING: AI returned empty or very short response');
    }
    
    // Debug: show raw result
    console.log('Raw scan result:', scanResult.substring(0, 500));
    
    // Robust extraction - find text after field name and colon
    const extractField = (text: string, field: string, maxLen = 0): string => {
      // Try various formats: **Name:**, Name:, name:, etc.
      const patterns = [
        new RegExp(`\\*\\*${field}:\\*\\*\\s*(.+?)(?:\\n|$)`, 'i'),
        new RegExp(`${field}:\\s*(.+?)(?:\\n|$)`, 'i'),
        new RegExp(`${field}\\.\\s*(.+?)(?:\\n|$)`, 'i'),
      ];
      
      for (const regex of patterns) {
        const match = text.match(regex);
        if (match && match[1]) {
          let val = match[1].replace(/^\*+\s*/g, '').replace(/\*+$/g, '').trim();
          if (maxLen > 0 && val.length > maxLen) val = val.substring(0, maxLen) + '...';
          if (val.length > 0) return val;
        }
      }
      return '';
    };
    
    let name = extractField(scanResult, 'Name', 100) || extractField(scanResult, 'name', 100) || '';
    let period = extractField(scanResult, 'Period', 100) || extractField(scanResult, 'period', 100) || 'Unknown period';
    let origin = extractField(scanResult, 'Origin', 100) || extractField(scanResult, 'origin', 100) || 'Unknown origin';
    let extractedMaterial = extractField(scanResult, 'Material', 100) || extractField(scanResult, 'material', 100) || material;
    let confidenceStr = extractField(scanResult, 'Confidence') || extractField(scanResult, 'confidence') || '30';
    let rarityStr = extractField(scanResult, 'Rarity') || extractField(scanResult, 'rarity') || 'unknown';
    let storage = extractField(scanResult, 'Storage', 150) || extractField(scanResult, 'storage', 150) || 'Store in a dry, cool place.';
    
    console.log('Extracted - Name:', name, 'Confidence:', confidenceStr);
    
    let confidence = parseInt(confidenceStr.replace(/\D/g, '')) || 30;
    
    // If confidence is low, be conservative - override period and origin to Unknown
    // This prevents the AI from making up specific dates/places when unsure
    if (confidence < 50) {
      period = 'Unknown period';
      origin = 'Unknown origin';
    }
    
    // Clean up storage - remove any "Next Step:" or similar garbage
    storage = storage.replace(/Next Step:.*/gi, '').replace(/Continue:.*/gi, '').trim();
    // Keep full storage text, no truncation
    if (!storage) storage = 'Store in a dry, cool place.';
    let visual = extractField(scanResult, 'Description', 500) || extractField(scanResult, 'description', 500) || '';
    let historicalContext = extractField(scanResult, 'Historical Context', 400) || extractField(scanResult, 'Historical', 400) || extractField(scanResult, 'Context', 400) || '';
    let similarFinds = extractField(scanResult, 'Similar Finds', 300) || extractField(scanResult, 'Similar', 300) || '';
    
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
    
    // Normalize rarity to valid values
    let rarity = 'unknown';
    const rarityLower = rarityStr.toLowerCase();
    if (rarityLower.includes('common')) rarity = 'common';
    else if (rarityLower.includes('uncommon')) rarity = 'uncommon';
    else if (rarityLower.includes('rare')) rarity = 'rare';
    else if (rarityLower.includes('very') || rarityLower.includes('legendary')) rarity = 'very_rare';
    
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
        rarity: rarity,
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
    const historicalContextEn = identification?.historical_context?.en || '';
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
{"desc":"[description]","context":"[historical context]","storage":"[storage]"}
Description: ${descriptionEn}
Context: ${historicalContextEn}
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
        historical_context: {
          [langKey]: translations.context || ''
        }
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
