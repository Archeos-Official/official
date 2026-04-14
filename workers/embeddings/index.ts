const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const SUPABASE_URL = 'https://kooxgauxbvsontylfoyv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtvb3hnYXV4YnZzb250eWxmb3l2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMDU1ODMsImV4cCI6MjA5MDc4MTU4M30.wNLv15u2cRVKuGEWbvbD6Ec0AhygxYeEV8jimceGQTA';

interface Env {
  AI?: any;
}

interface EmbeddingRequest {
  image_url?: string;
  image_base64?: string;
  artifact_id?: string;
  models?: Array<'clip' | 'dinov2'>;
}

async function fetchImageAsBase64(imageUrl: string): Promise<string> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }
    const buffer = await response.arrayBuffer();
    const uint8 = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < uint8.length; i++) {
      binary += String.fromCharCode(uint8[i]);
    }
    return btoa(binary);
  } catch (error) {
    throw new Error(`Failed to fetch image: ${error}`);
  }
}

async function generateEmbeddingCLIP(imageBase64: string, env?: Env): Promise<number[]> {
  if (env?.AI) {
    const result: any = await env.AI.run('@cf/clip/vit-base-patch32', {
      image: `data:image/jpeg;base64,${imageBase64}`,
    });
    if (result && Array.isArray(result)) return result;
    if (result?.result && Array.isArray(result.result)) return result.result;
    throw new Error('Invalid CLIP embedding result');
  }
  throw new Error('AI binding not configured');
}

async function generateEmbeddingDINOv2(imageBase64: string, env?: Env): Promise<number[]> {
  if (env?.AI) {
    const result: any = await env.AI.run('@cf/meta/dinov2-base', {
      image: `data:image/jpeg;base64,${imageBase64}`,
    });
    if (result && Array.isArray(result)) return result;
    if (result?.result && Array.isArray(result.result)) return result.result;
    throw new Error('Invalid DINOv2 embedding result');
  }
  throw new Error('AI binding not configured');
}

async function storeEmbedding(
  artifactId: string,
  embedding: number[],
  model: string
): Promise<boolean> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/embeddings`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({
      artifact_id: artifactId,
      embedding: `[${embedding.join(',')}]`,
      model: model,
    }),
  });

  return response.ok;
}

async function updateArtifactStatus(
  artifactId: string,
  status: string
): Promise<boolean> {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/artifacts?id=eq.${artifactId}`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        embedding_status: status,
        updated_at: new Date().toISOString(),
      }),
    }
  );

  return response.ok;
}

export default {
  async fetch(request: Request, env?: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method === 'GET') {
      return new Response(
        JSON.stringify({ status: 'ok', worker: 'embeddings' }),
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
      const body: EmbeddingRequest = await request.json();
      const { image_url, image_base64, artifact_id, models = ['clip', 'dinov2'] } = body;

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

      const embeddings: Array<{
        model: string;
        embedding: number[];
        status: string;
        error?: string;
      }> = [];

      for (const model of models) {
        try {
          let embedding: number[] | null = null;

          if (model === 'clip') {
            embedding = await generateEmbeddingCLIP(base64Image as string, env);
          } else if (model === 'dinov2') {
            embedding = await generateEmbeddingDINOv2(base64Image as string, env);
          }

          if (embedding) {
            embeddings.push({
              model,
              embedding,
              status: 'success',
            });

            if (artifact_id) {
              await storeEmbedding(artifact_id, embedding, model);
            }
          }
        } catch (error) {
          embeddings.push({
            model,
            embedding: [],
            status: 'failed',
            error: String(error),
          });
        }
      }

      if (artifact_id) {
        const allSuccess = embeddings.every((e) => e.status === 'success');
        await updateArtifactStatus(
          artifact_id as string,
          allSuccess ? 'completed' : 'failed'
        );
      }

      const processingTime = Date.now() - startTime;

      return new Response(
        JSON.stringify({
          artifact_id,
          embeddings,
          processing_time_ms: processingTime,
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