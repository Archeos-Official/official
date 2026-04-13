const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const SUPABASE_URL = 'https://yrffgxgijyhjlknmupko.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kYW1sIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1am1l-fW65CYSW4xjI6N5W8WlCPgpykGNMv5vT4A';

const PAS_API_URL = 'https://finds.org.uk/database';

interface PASObject {
  id: string;
  uniqueId: string;
  objectType: string;
  dateFromYear: number | null;
  dateToYear: number | null;
  period: string;
  material: string;
  description: string;
  notes: string;
  discoveryMethod: string;
  findspot: {
    latitude: number | null;
    longitude: number | null;
    knownSite: string;
    county: string;
    parish: string;
  };
  images: Array<{
    filename: string;
    thumbnail: string;
    license: string;
  }>;
  recordCheck: string;
  created: string;
  updated: string;
}

interface IngestionRequest {
  action: 'ingest' | 'search' | 'status' | 'stats';
  query?: string;
  objectType?: string;
  period?: string;
  material?: string;
  limit?: number;
  offset?: number;
}

function normalizeValue(category: string, value: string | null): string {
  if (!value) return '';
  
  const typeMappings: Record<string, string> = {
    'coin': 'coin',
    'base metal coin': 'coin',
    'silver coin': 'coin',
    'gold coin': 'coin',
    'copper alloy coin': 'coin',
    'brooch': 'brooch',
    'thumb tab brooch': 'brooch',
    'annular brooch': 'brooch',
    'cross bow brooch': 'brooch',
    'plate brooch': 'brooch',
    'pin': 'pin',
    'button': 'button',
    'strap end': 'strap end',
    'buckle': 'buckle',
    'belt hook': 'belt hook',
    'pouch': 'pouch',
    'lock plate': 'lock plate',
    'key': 'key',
    'vessel': 'vessel',
    'pot': 'pot',
    'weapon': 'weapon',
    'armour': 'armour',
    'tool': 'tool',
    'furniture': 'furniture',
    'household': 'household',
    'textile': 'textile',
    'structure': 'structure',
    'human remains': 'human remains',
    'animal remains': 'animal remains',
    'environmental': 'environmental',
    'unstratified': 'unstratified',
    'mixed': 'mixed',
  };
  
  const materialMappings: Record<string, string> = {
    'gold': 'gold',
    'silver': 'silver',
    'copper alloy': 'copper alloy',
    'copper alloy, gilt': 'copper alloy',
    'lead': 'lead',
    'tin': 'tin',
    'iron': 'iron',
    'bronze': 'bronze',
    'pewter': 'pewter',
    'pottery': 'ceramic',
    'pottery, coarse': 'ceramic',
    'pottery, medieval': 'ceramic',
    'pottery, late medieval': 'ceramic',
    'pottery, post medieval': 'ceramic',
    'stone': 'stone',
    'slate': 'stone',
    ' chalk': 'stone',
    'jet': 'stone',
    'shale': 'stone',
    'flint': 'stone',
    'obsidian': 'stone',
    'glass': 'glass',
    'bone': 'bone',
    'ivory': 'bone',
    'antler': 'bone',
    'shell': 'shell',
    'ceramic': 'ceramic',
    'wood': 'wood',
    'leather': 'leather',
    'textile': 'textile',
  };
  
  const periodMappings: Record<string, string> = {
    'late neolithic': 'Neolithic',
    'early neolithic': 'Neolithic',
    'middle neolithic': 'Neolithic',
    'neolithic': 'Neolithic',
    'early bronze age': 'Bronze Age',
    'middle bronze age': 'Bronze Age',
    'late bronze age': 'Bronze Age',
    'bronze age': 'Bronze Age',
    'early iron age': 'Iron Age',
    'late iron age': 'Iron Age',
    'iron age': 'Iron Age',
    'late bronze age/early iron age': 'Bronze Age',
    'roman': 'Roman',
    'late roman': 'Roman',
    'early medieval': 'Early Medieval',
    'medieval': 'Medieval',
    'late medieval': 'Medieval',
    'post medieval': 'Post Medieval',
    '17th century': 'Post Medieval',
    '18th century': 'Post Medieval',
    '19th century': 'Post Medieval',
    '20th century': 'Modern',
    '21st century': 'Modern',
    'unknown': 'Unknown',
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

function isFragment(description: string, objectType: string): boolean {
  const fragmentTerms = ['fragment', 'broken', 'partial', 'incomplete', 'distorted', 'corroded', 'abraded', 'worn', 'slightly', 'very'];
  const descLower = description.toLowerCase();
  const typeLower = objectType.toLowerCase();
  
  if (fragmentTerms.some(term => descLower.includes(term) || typeLower.includes(term))) {
    return true;
  }
  return false;
}

async function searchPAS(objectType?: string, period?: string, material?: string, limit: number = 50, offset: number = 0): Promise<PASObject[]> {
  try {
    const params = new URLSearchParams({
      format: 'json',
      byr: '500',
      bmn: '0',
      includeimagesin: 'true',
      rgroup: 'true',
    });
    
    if (objectType) params.set('objectType', objectType);
    if (period) params.set('period', period);
    if (material) params.set('material', material);
    params.set('page', String(Math.floor(offset / limit) + 1));
    params.set('perpage', String(limit));

    const response = await fetch(`${PAS_API_URL}/search.json?${params}`, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`PAS API error: ${response.status}`);
    }

    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('PAS search failed:', error);
    return [];
  }
}

function parsePASObject(item: any): {
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
    const id = item.id || item.uniqueId;
    if (!id) return null;

    const title = item.objectType || 'Archaeological Find';
    const description = item.description || item.notes || '';
    const type = normalizeValue('type', item.objectType);
    const period = normalizeValue('period', item.period);
    const material = normalizeValue('material', item.material);
    
    const findspot = item.findspot || {};
    const location = [findspot.county, findspot.parish, findspot.knownSite].filter(Boolean).join(', ');
    
    const images: string[] = [];
    if (item.images && item.images.length > 0) {
      for (const img of item.images) {
        if (img && (img.filename || img.thumbnail)) {
          images.push(`https://finds.org.uk/images/${img.filename || img.thumbnail}`);
        }
      }
    }

    return {
      source: 'pas',
      source_id: `pas:${id}`,
      source_type: 'field_find',
      title,
      description,
      type,
      period,
      material,
      culture: item.culture || '',
      location_found: location,
      image_urls: images,
      metadata_raw: item,
      is_fragment: isFragment(description, type),
    };
  } catch (error) {
    console.error('Failed to parse PAS item:', error);
    return null;
  }
}

async function insertArtifact(artifact: {
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
}): Promise<boolean> {
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
        JSON.stringify({ status: 'ok', worker: 'ingest-pas' }),
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
      const { action, objectType, period, material, limit = 100, offset = 0 } = body;

      if (action === 'stats') {
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/artifacts?source=eq.pas&select=id,source_type&limit=1`,
          {
            headers: {
              'Authorization': `Bearer ${SUPABASE_KEY}`,
            },
          }
        );
        
        return new Response(
          JSON.stringify({
            action: 'stats',
            source: 'pas',
            message: 'PAS database statistics endpoint ready',
          }),
          {
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          }
        );
      }

      if (action === 'search') {
        const items = await searchPAS(objectType, period, material, limit, offset);
        
        return new Response(
          JSON.stringify({
            action: 'search',
            query: { objectType, period, material },
            count: items.length,
            items: items.map(i => ({
              id: i.id,
              title: i.objectType,
              period: i.period,
              material: i.material,
            })),
          }),
          {
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          }
        );
      }

      if (action === 'ingest') {
        const items = await searchPAS(objectType, period, material, limit, offset);
        let inserted = 0;
        let queued = 0;

        for (const item of items) {
          const parsed = parsePASObject(item);
          if (parsed && parsed.image_urls.length > 0) {
            const success = await insertArtifact(parsed);
            if (success) {
              inserted++;
              const artifactId = parsed.source_id;
              for (const imgUrl of parsed.image_urls.slice(0, 5)) {
                await queueForEmbedding(artifactId, imgUrl);
                queued++;
              }
            }
          }
        }

        return new Response(
          JSON.stringify({
            action: 'ingest',
            query: { objectType, period, material },
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
        JSON.stringify({ error: 'Invalid action. Use search, ingest, or stats.' }),
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