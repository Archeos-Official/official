const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const ACCOUNT_ID = 'a0aea21f8b422b03ea28d79829060046';
const API_TOKEN = 'cfut_WS2J372BIQpzpCiyTG3gChdyVWnSZ1mozJXp1lz6a754da42';

const SUPABASE_URL = 'https://yrffgxgijyhjlknmupko.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kYW1sIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1am1l-fW65CYSW4xjI6N5W8WlCPgpykGNMv5vT4A';

interface SearchRequest {
  image_url?: string;
  image_base64?: string;
  model?: string;
  limit?: number;
  threshold?: number;
}

async function fetchImageAsBase64(imageUrl: string): Promise<string> {
  const response = await fetch(imageUrl);
  const buffer = await response.arrayBuffer();
  const uint8 = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < uint8.length; i++) {
    binary += String.fromCharCode(uint8[i]);
  }
  return btoa(binary);
}

async function generateEmbedding(imageBase64: string, model: string): Promise<number[]> {
  let modelName = '@cf/clip/vit-base-patch32';
  
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
        image: `data:image/jpeg;base64,${imageBase64}`,
      }),
    }
  );

  const data = await response.json();
  if (!data.result) {
    throw new Error('Failed to generate embedding');
  }
  return data.result;
}

async function searchSimilar(
  embedding: number[],
  model: string,
  limit: number,
  threshold: number
): Promise<Array<{
  artifact_id: string;
  title: string | null;
  type: string | null;
  period: string | null;
  source: string | null;
  source_type: string | null;
  image_url: string | null;
  similarity: number;
  final_score: number;
}>> {
  const embeddingStr = `[${embedding.join(',')}]`;
  
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/rpc/search_similar_artifacts`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'params=silent-failure',
      },
      body: JSON.stringify({
        p_embedding: embeddingStr,
        p_model: model,
        p_limit: limit,
        p_threshold: threshold,
      }),
    }
  );

  if (!response.ok) {
    const fallback = await searchFallback(embedding, model, limit);
    return fallback;
  }

  const data = await response.json();
  
  const results = data || [];
  return results.map((r: any) => ({
    ...r,
    similarity: r.similarity || 0,
    final_score: (r.similarity * 0.7) + ((r.source_type === 'field_find') ? 0.2 : 0),
  }));
}

async function searchFallback(
  embedding: number[],
  model: string,
  limit: number
): Promise<Array<{
  artifact_id: string;
  title: string | null;
  type: string | null;
  period: string | null;
  source: string | null;
  source_type: string | null;
  image_url: string | null;
  similarity: number;
  final_score: number;
}>> {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/embeddings?select=artifact_id,model&model=eq.${model}&limit=100`,
    {
      headers: {
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
    }
  );

  const embeddings = await response.json();
  if (!embeddings || embeddings.length === 0) {
    return [];
  }

  let bestMatches: Array<{
    artifact_id: string;
    title: string | null;
    type: string | null;
    period: string | null;
    source: string | null;
    source_type: string | null;
    image_url: string | null;
    similarity: number;
    final_score: number;
  }> = [];

  for (const e of embeddings.slice(0, 20)) {
    const sim = cosineSimilarity(embedding, e.embedding);
    if (sim > 0.3) {
      const artifactRes = await fetch(
        `${SUPABASE_URL}/rest/v1/artifacts?id=eq.${e.artifact_id}&select=id,title,type,period,source,source_type,image_urls`,
        {
          headers: {
            'Authorization': `Bearer ${SUPABASE_KEY}`,
          },
        }
      );
      const artifacts = await artifactRes.json();
      if (artifacts && artifacts.length > 0) {
        const a = artifacts[0];
        const sourcePriority = a.source_type === 'field_find' ? 0.2 : 0;
        const finalScore = (sim * 0.7) + sourcePriority;
        bestMatches.push({
          artifact_id: e.artifact_id,
          title: a.title,
          type: a.type,
          period: a.period,
          source: a.source,
          source_type: a.source_type,
          image_url: a.image_urls ? a.image_urls[0] : null,
          similarity: sim,
          final_score: finalScore,
        });
      }
    }
  }

  return bestMatches.sort((a, b) => b.final_score - a.final_score).slice(0, limit);
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method === 'GET') {
      return new Response(
        JSON.stringify({ status: 'ok', worker: 'search' }),
        {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    if (request.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed. Use POST.' }),
        {
          status: 405,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    const startTime = Date.now();

    try {
      const body: SearchRequest = await request.json();
      const {
        image_url,
        image_base64,
        model = 'clip',
        limit = 10,
        threshold = 0.3,
      } = body;

      if (!image_url && !image_base64) {
        return new Response(
          JSON.stringify({ error: 'image_url or image_base64 is required' }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          }
        );
      }

      let base64Image = image_base64;
      if (!base64Image && image_url) {
        base64Image = await fetchImageAsBase64(image_url);
      }

      const embedding = await generateEmbedding(base64Image as string, model);
      const matches = await searchSimilar(embedding, model, limit, threshold);

      const searchTime = Date.now() - startTime;

      return new Response(
        JSON.stringify({
          matches,
          query_embedding_model: model,
          total_found: matches.length,
          search_time_ms: searchTime,
        }),
        {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({ error: String(error) }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }
  },
};