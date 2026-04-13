const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const SUPABASE_URL = 'https://yrffgxgijyhjlknmupko.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kYW1sIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1am1l-fW65CYSW4xjI6N5W8WlCPgpykGNMv5vT4A';

const IDAI_API_URL = 'https://idai.world/api';

interface IDAIObject {
  id: string;
  title: string;
  description?: string;
  type?: string;
  category?: string;
  material?: string;
  period?: string;
  culture?: string;
  locality?: string;
  country?: string;
  images?: Array<{
    id: string;
    url: string;
    thumbnail?: string;
  }>;
  metadata?: Record<string, unknown>;
}

interface IngestionRequest {
  action: 'ingest' | 'search' | 'status';
  query?: string;
  category?: string;
  period?: string;
  material?: string;
  limit?: number;
  offset?: number;
}

function normalizeValue(category: string, value: string | null): string {
  if (!value) return '';
  
  const typeMappings: Record<string, string> = {
    'münze': 'coin',
    'münzen': 'coin',
    'fibel': 'fibula',
    'nadel': 'pin',
    'ring': 'ring',
    'armband': 'bracelet',
    'halsring': 'necklace',
    'anhänger': 'pendant',
    'schnalle': 'buckle',
    'gürtelhaken': 'belt hook',
    'messerschließe': 'belt fitting',
    'beschlag': 'mount',
    'gerät': 'tool',
    'waffe': 'weapon',
    'schwert': 'sword',
    'dolch': 'dagger',
    'axt': 'axe',
    'pfeilspitze': 'arrowhead',
    'lanze': 'spear',
    'topf': 'pot',
    'vase': 'vase',
    'schale': 'bowl',
    'becher': 'beaker',
    'kanne': 'jug',
    'teller': 'plate',
    'figur': 'figurine',
    'statue': 'statue',
    'relief': 'relief',
    ' GEMÄCHER': 'chamber',
    'architectural': 'architectural',
    'ceramic': 'ceramic',
    'glass': 'glass',
  };
  
  const materialMappings: Record<string, string> = {
    'gold': 'gold',
    'silber': 'silver',
    'bronze': 'bronze',
    'kupfer': 'copper',
    'kupferlegierung': 'copper alloy',
    'blei': 'lead',
    'zinn': 'tin',
    'eisen': 'iron',
    'stahl': 'steel',
    'keramik': 'ceramic',
    'ton': 'clay',
    'glas': 'glass',
    'stein': 'stone',
    'marmor': 'marble',
    'kalkstein': 'limestone',
    'sandstein': 'sandstone',
    'feuerstein': 'flint',
    'obsidian': 'obsidian',
    'bein': 'bone',
    'elfenbein': 'ivory',
    'holz': 'wood',
    'leder': 'leather',
    'textil': 'textile',
  };
  
  const periodMappings: Record<string, string> = {
    'paläolithikum': 'Palaeolithic',
    'mesolithikum': 'Mesolithic',
    'neolithikum': 'Neolithic',
    'bronzezeit': 'Bronze Age',
    'eisenzeit': 'Iron Age',
    'römisch': 'Roman',
    'kaiserzeit': 'Roman Imperial',
    'völkerwanderung': 'Migration Period',
    'frühmittelalter': 'Early Medieval',
    'mittelalter': 'Medieval',
    'hochmittelalter': 'High Medieval',
    'spätmittelalter': 'Late Medieval',
    'nachmittelalter': 'Post Medieval',
    'modern': 'Modern',
    '19th century': '19th Century',
    '20th century': '20th Century',
  };
  
  if (category === 'type') {
    return typeMappings[value.toLowerCase()] || value;
  }
  if (category === 'material') {
    return materialMappings[value.toLowerCase()] || value;
  }
  if (category === 'period') {
    return periodMappings[value.toLowerCase()] || value;
  }
  return value;
}

function isFragment(description: string, type: string): boolean {
  const fragmentTerms = ['fragment', 'bruchstück', 'defekt', 'beschädigt', 'unvollständig'];
  const descLower = (description || '').toLowerCase();
  const typeLower = (type || '').toLowerCase();
  
  if (fragmentTerms.some(term => descLower.includes(term) || typeLower.includes(term))) {
    return true;
  }
  return false;
}

async function searchIDAI(query?: string, category?: string, period?: string, material?: string, limit: number = 50, offset: number = 0): Promise<IDAIObject[]> {
  try {
    const params = new URLSearchParams({
      q: query || '',
      limit: String(limit),
      offset: String(offset),
    });
    
    if (category) params.set('category', category);
    if (period) params.set('period', period);
    if (material) params.set('material', material);

    const response = await fetch(`${IDAI_API_URL}/objects?${params}`, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`iDAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.results || data.items || [];
  } catch (error) {
    console.error('iDAI search failed:', error);
    return [];
  }
}

function parseIDAIObject(item: any): {
  source: string;
  source_id: string;
  source_type: string;
  title: string;
  description: string;
  type: string;
  period: string;
  material: string;
  culture: string;
  location_found: string;
  image_urls: string[];
  metadata_raw: Record<string, unknown>;
  is_fragment: boolean;
} | null {
  try {
    const id = item.id;
    if (!id) return null;

    const title = item.title || item.type || 'iDAI Object';
    const description = item.description || '';
    const type = normalizeValue('type', item.type || item.category);
    const period = normalizeValue('period', item.period);
    const material = normalizeValue('material', item.material);
    const culture = item.culture || '';
    
    const location = [item.locality, item.country].filter(Boolean).join(', ');
    
    const images: string[] = [];
    if (item.images && item.images.length > 0) {
      for (const img of item.images) {
        if (img && img.url) {
          images.push(img.thumbnail || img.url);
        }
      }
    }

    return {
      source: 'idai',
      source_id: `idai:${id}`,
      source_type: 'museum_reference',
      title,
      description,
      type,
      period,
      material,
      culture,
      location_found: location,
      image_urls: images,
      metadata_raw: item,
      is_fragment: isFragment(description, type),
    };
  } catch (error) {
    console.error('Failed to parse iDAI item:', error);
    return null;
  }
}

async function insertArtifact(artifact: any): Promise<boolean> {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/artifacts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=ignore-duplicates',
      },
      body: JSON.stringify(artifact),
    });

    return response.ok || response.status === 409;
  } catch (error) {
    console.error('Failed to insert artifact:', error);
    return false;
  }
}

async function queueForEmbedding(artifactId: string, imageUrl: string): Promise<boolean> {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/image_embeddings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        artifact_id: artifactId,
        image_url: imageUrl,
        status: 'pending',
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to queue for embedding:', error);
    return false;
  }
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method === 'GET') {
      return new Response(
        JSON.stringify({ status: 'ok', worker: 'ingest-idai' }),
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

    try {
      const body: IngestionRequest = await request.json();
      const { action, query, category, period, material, limit = 50, offset = 0 } = body;

      if (action === 'search') {
        const items = await searchIDAI(query, category, period, material, limit, offset);
        
        return new Response(
          JSON.stringify({
            action: 'search',
            query: { query, category, period, material },
            count: items.length,
            items: items.map(i => ({
              id: i.id,
              title: i.title,
              type: i.type,
              period: i.period,
            })),
          }),
          {
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          }
        );
      }

      if (action === 'ingest') {
        const items = await searchIDAI(query, category, period, material, limit, offset);
        let inserted = 0;
        let queued = 0;

        for (const item of items) {
          const parsed = parseIDAIObject(item);
          if (parsed && parsed.image_urls.length > 0) {
            const success = await insertArtifact(parsed);
            if (success) {
              inserted++;
              const artifactId = parsed.source_id;
              for (const imgUrl of parsed.image_urls.slice(0, 3)) {
                await queueForEmbedding(artifactId, imgUrl);
                queued++;
              }
            }
          }
        }

        return new Response(
          JSON.stringify({
            action: 'ingest',
            query: { query, category, period, material },
            processed: items.length,
            inserted,
            queued,
          }),
          {
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Invalid action. Use search or ingest.' }),
        {
          status: 400,
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