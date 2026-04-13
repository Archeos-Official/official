const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const SUPABASE_URL = 'https://yrffgxgijyhjlknmupko.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kYW1sIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1am1l-fW65CYSW4xjI6N5W8WlCPgpykGNMv5vT4A';

const BM_API_URL = 'https://collection.britishmuseum.org.uk/api';

interface BMObject {
  objectId: number;
  objectName: string;
  objectType: string;
  title: string;
  description: string;
  materials: string[];
  techniques: string[];
  styles: string[];
  periods: string[];
  cultures: string[];
  dateText: string;
  dimensions: string;
  creditLine: string;
  provenances: string[];
  images: Array<{
    identifier: string;
    type: string;
    baseUrl: string;
    iscroll: string;
  }>;
  museumNumber: string;
  registrationNumber: string;
}

interface IngestionRequest {
  action: 'ingest' | 'search' | 'status';
  query?: string;
  queryType?: string;
  material?: string;
  period?: string;
  limit?: number;
  offset?: number;
}

function normalizeValue(category: string, value: string | null): string {
  if (!value) return '';
  
  const typeMappings: Record<string, string> = {
    'coin': 'coin',
    'medal': 'medal',
    'seal': 'seal',
    'die': 'die',
    'brooch': 'brooch',
    'pin': 'pin',
    'pendant': 'pendant',
    'ring': 'ring',
    'bracelet': 'bracelet',
    'necklace': 'necklace',
    'torc': 'torque',
    'armlet': 'armlet',
    'earring': 'earring',
    'amulet': 'amulet',
    'belt': 'belt',
    'buckle': 'buckle',
    'belt fitting': 'belt fitting',
    'strap end': 'strap end',
    'mount': 'mount',
    'harness': 'harness',
    'weapon': 'weapon',
    'sword': 'sword',
    'dagger': 'dagger',
    'axe': 'axe',
    'spearhead': 'spearhead',
    'arrowhead': 'arrowhead',
    'armour': 'armour',
    'helmet': 'helmet',
    'shield': 'shield',
    'vessel': 'vessel',
    'pot': 'pot',
    'bowl': 'bowl',
    'cup': 'cup',
    'beaker': 'beaker',
    'vase': 'vase',
    'flagon': 'flagon',
    'jar': 'jar',
    'dish': 'dish',
    'plate': 'plate',
    'tray': 'tray',
    'jug': 'jug',
    'lamp': 'lamp',
    'candlestick': 'candlestick',
    'mirror': 'mirror',
    'comb': 'comb',
    'toilet article': 'toilet article',
    'textile': 'textile',
    'furniture': 'furniture',
    'architectural': 'architectural',
    'building': 'building',
    'statue': 'statue',
    'bust': 'bust',
    'figurine': 'figurine',
    'relief': 'relief',
    'mosaic': 'mosaic',
    'painting': 'painting',
    'drawing': 'drawing',
    'print': 'print',
    'manuscript': 'manuscript',
    'book': 'book',
    'sculputre': 'sculpture',
  };
  
  const materialMappings: Record<string, string> = {
    'gold': 'gold',
    'silver': 'silver',
    'copper alloy': 'copper alloy',
    'bronze': 'bronze',
    'brass': 'copper alloy',
    'pewter': 'pewter',
    'lead': 'lead',
    'tin': 'tin',
    'iron': 'iron',
    'steel': 'steel',
    'pottery': 'ceramic',
    'ceramic': 'ceramic',
    'stone': 'stone',
    'marble': 'stone',
    'limestone': 'stone',
    'sandstone': 'stone',
    'granite': 'stone',
    'slate': 'stone',
    'flint': 'flint',
    'obsidian': 'obsidian',
    'glass': 'glass',
    'enamel': 'enamel',
    'bone': 'bone',
    'ivory': 'ivory',
    'shell': 'shell',
    'wood': 'wood',
    'leather': 'leather',
    'textile': 'textile',
    'wax': 'wax',
    'paper': 'paper',
    'parchment': 'parchment',
    'ink': 'ink',
    'paint': 'paint',
    'gilt': 'gilt',
    'gilded': 'gilt',
  };
  
  const periodMappings: Record<string, string> = {
    'neolithic': 'Neolithic',
    'bronze age': 'Bronze Age',
    'iron age': 'Iron Age',
    'early iron age': 'Iron Age',
    'late iron age': 'Iron Age',
    'helladic': 'Bronze Age',
    'minoan': 'Bronze Age',
    'mycenaean': 'Bronze Age',
    'roman': 'Roman',
    'late roman': 'Roman',
    'byzantine': 'Byzantine',
    'early medieval': 'Early Medieval',
    'medieval': 'Medieval',
    'high medieval': 'Medieval',
    'late medieval': 'Medieval',
    'post medieval': 'Post Medieval',
    '16th century': 'Post Medieval',
    '17th century': 'Post Medieval',
    '18th century': 'Post Medieval',
    '19th century': 'Post Medieval',
    '20th century': 'Modern',
    '21st century': 'Modern',
    'contemporary': 'Modern',
    'ancient': 'Ancient',
    'historic': 'Historic',
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

async function searchBM(query?: string, queryType?: string, material?: string, period?: string, limit: number = 50, offset: number = 0): Promise<BMObject[]> {
  try {
    const params = new URLSearchParams({
      query: query || '',
      limit: String(limit),
      offset: String(offset),
    });
    
    if (queryType) params.set('objectType', queryType);
    if (material) params.set('material', material);
    if (period) params.set('period', period);

    const response = await fetch(`${BM_API_URL}/search?${params}`, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`British Museum API error: ${response.status}`);
    }

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error('British Museum search failed:', error);
    return [];
  }
}

function parseBMObject(item: any): {
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
    const id = item.objectId || item.museumNumber;
    if (!id) return null;

    const title = item.title || item.objectName || item.objectType || 'British Museum Object';
    const description = item.description || '';
    const type = normalizeValue('type', item.objectType);
    const period = normalizeValue('period', item.periods?.[0] || item.dateText);
    const material = normalizeValue('material', item.materials?.[0]);
    const culture = item.cultures?.[0] || '';
    
    const location = item.provenances?.[0] || '';

    const images: string[] = [];
    if (item.images && item.images.length > 0) {
      for (const img of item.images) {
        if (img && img.baseUrl) {
          images.push(`${img.baseUrl}${img.identifier}`);
        }
      }
    }

    if (images.length === 0) return null;

    return {
      source: 'british_museum',
      source_id: `british_museum:${id}`,
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
      is_fragment: false,
    };
  } catch (error) {
    console.error('Failed to parse British Museum item:', error);
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
        JSON.stringify({ status: 'ok', worker: 'ingest-british-museum' }),
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
      const { action, query, queryType, material, period, limit = 50, offset = 0 } = body;

      if (action === 'search') {
        const items = await searchBM(query, queryType, material, period, limit, offset);
        
        return new Response(
          JSON.stringify({
            action: 'search',
            query: { query, queryType, material, period },
            count: items.length,
            items: items.map(i => ({
              id: i.objectId,
              title: i.title,
              type: i.objectType,
              period: i.periods,
            })),
          }),
          {
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          }
        );
      }

      if (action === 'ingest') {
        const items = await searchBM(query, queryType, material, period, limit, offset);
        let inserted = 0;
        let queued = 0;

        for (const item of items) {
          const parsed = parseBMObject(item);
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
            query: { query, queryType, material, period },
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