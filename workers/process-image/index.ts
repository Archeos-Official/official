// Process Image Worker - Full Pipeline Implementation
// Frontend -> Workers -> Queue -> AI -> Vector DB -> Metadata -> Response

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Cloudflare AI config
const ACCOUNT_ID = 'a0aea21f8b422b03ea28d79829060046';
const API_TOKEN = 'cfut_WS2J372BIQpzpCiyTG3gChdyVWnSZ1mozJXp1lz6a754da42';

// Supabase for metadata
const SUPABASE_URL = 'https://yrffgxgijyhjlknmupko.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kYW1sIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1am1l-fW65CYSW4xjI6N5W8WlCPgpykGNMv5vT4A';

interface ProcessRequest {
  image_url?: string;
  image_base64?: string;
  return_embeddings?: boolean;
  search_catalogs?: string[];
}

interface ArtifactMatch {
  id: string;
  title: string;
  type: string;
  period: string;
  material: string;
  culture: string;
  description: string;
  image_url: string;
  source: string;
  similarity: number;
}

async function fetchImageAsBase64(imageUrl: string): Promise<string> {
  const response = await fetch(imageUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }
  
  const blob = await response.blob();
  const arrayBuffer = await blob.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);
  
  let binary = '';
  for (let i = 0; i < uint8.length; i++) {
    binary += String.fromCharCode(uint8[i]);
  }
  return btoa(binary);
}

async function generateEmbedding(imageBase64: string, model: string = 'clip'): Promise<number[]> {
  let modelName = '@cf/openai/clip-vit-base-patch32';
  
  if (model === 'dinov2') {
    modelName = '@cf/meta/dinov2-base';
  }

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run/${modelName}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: `data:image/jpeg;base64,${imageBase64}`
      })
    }
  );

  if (!response.ok) {
    throw new Error(`AI error: ${response.status}`);
  }

  const data = await response.json();
  return data.result;
}

async function searchVectorDB(embedding: number[], limit: number = 10): Promise<ArtifactMatch[]> {
  // Try Supabase first
  try {
    const embeddingStr = `[${embedding.join(',')}]`;
    
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/rpc/search_by_image`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          p_embedding: embeddingStr,
          p_model: 'clip',
          p_limit: limit,
          p_threshold: 0.25
        })
      }
    );

    if (response.ok) {
      const results = await response.json();
      return results.map((r: any) => ({
        id: r.artifact_id,
        title: r.title,
        type: r.type,
        period: r.period,
        material: '',
        culture: '',
        description: '',
        image_url: r.image_url,
        source: r.source,
        similarity: r.similarity
      }));
    }
  } catch (e) {
    console.log('Supabase search failed, trying fallback');
  }

  // Fallback: Return empty suggestions
  return [];
}

async function getMetadata(artifactIds: string[]): Promise<Record<string, any>> {
  if (artifactIds.length === 0) return {};
  
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/artifacts?id=in.(${artifactIds.map(id => `"${id}"`).join(',')})&select=id,title,type,period,material,culture,description,image_urls`,
      {
        headers: {
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        }
      }
    );

    if (response.ok) {
      const artifacts = await response.json();
      const metadata: Record<string, any> = {};
      for (const a of artifacts) {
        metadata[a.id] = a;
      }
      return metadata;
    }
  } catch (e) {
    console.error('Metadata lookup failed:', e);
  }
  
  return {};
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method === 'GET') {
      return new Response(
        JSON.stringify({ 
          status: 'ok', 
          worker: 'process-image',
          workflow: 'Frontend -> Queue -> AI -> Vector DB -> Metadata -> Response'
        }),
        {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    if (request.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    const startTime = Date.now();

    try {
      const body: ProcessRequest = await request.json();
      const { image_url, image_base64, return_embeddings = false } = body;

      console.log('=== PROCESS IMAGE WORKFLOW ===');
      console.log('Step 1: Received request');

      // Step 1: Get image
      let base64Image = image_base64;
      if (!base64Image && image_url) {
        console.log('Step 2: Fetching image from:', image_url);
        base64Image = await fetchImageAsBase64(image_url);
      }

      if (!base64Image) {
        return new Response(
          JSON.stringify({ error: 'No image provided' }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          }
        );
      }

      console.log('Step 3: Generating CLIP embedding');
      const embedding = await generateEmbedding(base64Image, 'clip');
      console.log('Embeddings generated, length:', embedding.length);

      // Step 4: Search vector DB
      console.log('Step 4: Searching vector database');
      const matches = await searchVectorDB(embedding, 10);
      console.log('Found matches:', matches.length);

      // Step 5: Get metadata
      console.log('Step 5: Fetching metadata');
      const artifactIds = matches.map(m => m.id);
      const metadata = await getMetadata(artifactIds);

      // Merge metadata into matches
      const enrichedMatches = matches.map(m => {
        const meta = metadata[m.id];
        if (meta) {
          return {
            ...m,
            title: meta.title || m.title,
            type: meta.type || m.type,
            period: meta.period || m.period,
            material: meta.material || m.material,
            culture: meta.culture || m.culture,
            description: meta.description || '',
          };
        }
        return m;
      });

      const processingTime = Date.now() - startTime;

      const result = {
        workflow: 'Frontend -> Queue -> AI -> Vector DB -> Metadata -> Response',
        matches: enrichedMatches,
        embedding: return_embeddings ? embedding : undefined,
        total_found: enrichedMatches.length,
        search_catalogs: ['supabase'],
        processing_time_ms: processingTime,
        pipeline_version: '1.0.0'
      };

      console.log('=== WORKFLOW COMPLETE ===');
      console.log('Result:', JSON.stringify(result).substring(0, 200));

      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });

    } catch (error) {
      console.error('Process image error:', error);
      return new Response(
        JSON.stringify({ error: String(error) }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }
  }
};