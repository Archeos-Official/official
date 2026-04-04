const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const ACCOUNT_ID = 'a0aea21f8b422b03ea28d79829060046';
const API_TOKEN = 'cfut_WS2J372BIQpzpCiyTG3gChdyVWnSZ1mozJXp1lz6a754da42';

async function callAI(prompt: string, maxTokens: number = 1000): Promise<string> {
  const body = {
    stream: false,
    prompt: prompt,
    max_tokens: maxTokens
  };
  
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
      const { description, observations } = body;
      
      const obs = observations || {};
      const desc = description || '';
      
      const researchPrompt = `You are an archaeologist researching a find.

OBJECT DESCRIPTION:
${desc || 'Unknown object'}

OBSERVATIONS:
- Shape: ${obs.shape || 'unknown'}
- Size: ${obs.size || 'unknown'}
- Colors: ${obs.colors || 'unknown'}
- Surface: ${obs.surface || 'unknown'}
- Features: ${obs.features || 'none'}
- Material: ${obs.material || 'unknown'}

Based on this, provide:

**Name:** What type of object is this? Be honest if unsure. Use a short descriptive name like "Bronze button" or "Clay pipe fragment" or "Unknown object".

**Period:** Best guess at age. If unclear, say "Unknown period". Keep it simple: "17th century" or "Roman era" or "Unknown".

**Origin:** Best guess at origin region. If unclear, say "Unknown origin".

**Historical Context:** 2 sentences about what this type of object tells us about its time period and use. If truly unknown, say "No historical context available."

**Similar Finds:** 2 sentences mentioning similar known objects. If none known, say "No well-documented similar finds available."

**Storage:** 1 sentence on proper storage and handling.

Keep responses factual. Do not invent specific details.`;

      const result = await callAI(researchPrompt, 600);
      
      // Simple extraction
      const nameMatch = result.match(/\*\*Name:\*\*[\s\n]*(.+?)(?:\n|$)/i);
      const periodMatch = result.match(/\*\*Period:\*\*[\s\n]*(.+?)(?:\n|$)/i);
      const originMatch = result.match(/\*\*Origin:\*\*[\s\n]*(.+?)(?:\n|$)/i);
      const contextMatch = result.match(/\*\*Historical Context:\*\*[\s\n]*(.+?)(?:\*\*Similar|$)/i);
      const similarMatch = result.match(/\*\*Similar Finds:\*\*[\s\n]*(.+?)(?:\*\*Storage|$)/i);
      const storageMatch = result.match(/\*\*Storage:\*\*[\s\n]*(.+?)(?:\n\n|$)/i);
      
      const name = nameMatch ? nameMatch[1].trim() : desc.substring(0, 50) || 'Unknown object';
      const period = periodMatch ? periodMatch[1].trim() : 'Unknown period';
      const origin = originMatch ? originMatch[1].trim() : 'Unknown origin';
      const context = contextMatch ? contextMatch[1].trim() : '';
      const similar = similarMatch ? similarMatch[1].trim() : '';
      const storage = storageMatch ? storageMatch[1].trim() : 'Store in a dry, cool place.';
      
      // Calculate confidence based on how much we found
      let confidence = 40;
      if (name && !name.includes('Unknown')) confidence += 15;
      if (period && !period.includes('Unknown')) confidence += 15;
      if (origin && !origin.includes('Unknown')) confidence += 15;
      if (context) confidence += 10;
      
      return new Response(JSON.stringify({
        name: name,
        period: period,
        origin: origin,
        historical_context: context,
        similar_finds: similar,
        storage_instructions: storage,
        confidence: Math.min(confidence, 85),
        rarity: 'unknown',
        reference_links: []
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
