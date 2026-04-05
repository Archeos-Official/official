const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const ACCOUNT_ID = 'a0aea21f8b422b03ea28d79829060046';
const API_TOKEN = 'cfut_WS2J372BIQpzpCiyTG3gChdyVWnSZ1mozJXp1lz6a754da42';

async function callAI(prompt: string, image?: string, maxTokens: number = 1000): Promise<string> {
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
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method === 'GET') {
      return new Response(JSON.stringify({ status: 'ok', worker: 'research-artifact' }), {
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
      const { description, observations, image_urls, name: existingName, material: existingMaterial } = body;
      
      const obs = observations || {};
      const desc = description || '';
      
      // Get the image for deeper analysis
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
      
      const shortDesc = desc.length > 300 ? desc.substring(0, 300) + '...' : desc;
      
      // Research prompt focuses on period, origin, historical context - main focus is description
      const researchPrompt = `You are an archaeologist. Your MAIN TASK is to analyze the visual description to determine period and origin.

FOCUS ON DESCRIPTION: ${shortDesc || 'Unknown object'}

KNOWN INFO: Name="${existingName || 'Unknown'}", Material="${existingMaterial || 'Unknown'}"

Respond with ONLY:
Period: [estimated era - be specific if possible]
Origin: [likely region]
Context: [1-2 sentences about historical significance]
Similar: [brief mention of similar known finds or "None found"]

If unclear from description, say "Unknown".`;

      const result = base64Image 
        ? await callAI(researchPrompt, `data:image/jpeg;base64,${base64Image}`, 600)
        : await callAI(researchPrompt, undefined, 600);
      
      // Extract period, origin, context, similar
      const periodMatch = result.match(/Period:\s*(.+?)(?:\n|$)/i);
      const originMatch = result.match(/Origin:\s*(.+?)(?:\n|$)/i);
      const contextMatch = result.match(/Context:\s*(.+?)(?:\n|Similar|$)/i);
      const similarMatch = result.match(/Similar:\s*(.+?)(?:\n|$)/i);
      
      // Clean period - allow specific dates/eras
      let period = periodMatch ? periodMatch[1].trim() : 'Unknown';
      // Allow full origin text without truncation
      const origin = originMatch ? originMatch[1].trim() : 'Unknown';
      const context = contextMatch ? contextMatch[1].trim() : 'No historical context available.';
      const similar = similarMatch ? similarMatch[1].trim() : '';
      
      // Calculate confidence
      let confidence = 50;
      if (period && !period.toLowerCase().includes('unknown')) confidence += 15;
      if (origin && !origin.toLowerCase().includes('unknown')) confidence += 15;
      if (context && !context.toLowerCase().includes('no historical')) confidence += 10;
      
      return new Response(JSON.stringify({
        period: period,
        origin: origin,
        historical_context: context,
        similar_finds: similar,
        confidence: Math.min(confidence, 85)
      }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
      
    } catch (error) {
      return new Response(JSON.stringify({ error: String(error) }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
  },
};
