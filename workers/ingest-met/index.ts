const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const SUPABASE_URL = 'https://yrffgxgijyhjlknmupko.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kYW1sIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1am1l-fW65CYSW4xjI6N5W8WlCPgpykGNMv5vT4A';

const MET_API_URL = 'https://collectionapi.metmuseum.org/api/v1';

interface METObject {
  objectID: number;
  isHighlight: boolean;
  primaryImage: string;
  primaryImageSmall: string;
  additionalImages: string[];
  department: string;
  objectName: string;
  title: string;
  culture: string;
  period: string;
  dynasty: string;
  portfolio: string;
  objectDate: string;
  objectBeginDate: number;
  objectEndDate: number;
  medium: string;
  dimensions: string;
  credits: string;
  Geography: {
    type: string;
    city: string;
    state: string;
    country: string;
    region: string;
  };
 Classification: string;
  artworkDescriptionText: string;
  artistDisplayName: string;
  artistDisplayBio: string;
  artistNationality: string;
  artistPrefix: string;
  artistSuffix: string;
  artistAlphaSort: string;
  artistWikidata_URL: string;
  objectWikidata_URL: string;
  Gallery: number | null;
  constituents: Array<{
    constituentID: number;
    role: string;
    name: string;
    constituentWiki_URL: string;
    gender: string;
  }>;
  objectIDSearch: string;
}

interface IngestionRequest {
  action: 'ingest' | 'search' | 'status';
  query?: string;
  department?: string;
  hasImages?: boolean;
  isHighlight?: boolean;
  limit?: number;
}

function normalizeValue(category: string, value: string | null): string {
  if (!value) return '';
  
  const typeMappings: Record<string, string> = {
    'coin': 'coin',
    'medal': 'medal',
    'seal': 'seal',
    'ring': 'ring',
    'earring': 'earring',
    'bracelet': 'bracelet',
    'necklace': 'necklace',
    'brooch': 'brooch',
    'pin': 'pin',
    'pendant': 'pendant',
    'armlet': 'armlet',
    'buckle': 'buckle',
    'belt': 'belt',
    'mount': 'mount',
    'sword': 'sword',
    'dagger': 'dagger',
    'axe': 'axe',
    'spearhead': 'spearhead',
    'helmet': 'helmet',
    'shield': 'shield',
    'armour': 'armour',
    'vessel': 'vessel',
    'pot': 'pot',
    'bowl': 'bowl',
    'cup': 'cup',
    'beaker': 'beaker',
    'vase': 'vase',
    'jug': 'jug',
    'jar': 'jar',
    'plate': 'plate',
    'dish': 'dish',
    'lamps': 'lamp',
    'candlestick': 'candlestick',
    'mirror': 'mirror',
    'comb': 'comb',
    'textile': 'textile',
    'figurine': 'figurine',
    'statue': 'statue',
    'bust': 'bust',
    'sculpture': 'sculpture',
    'relief': 'relief',
    'painting': 'painting',
    'drawing': 'drawing',
    'print': 'print',
    'manuscript': 'manuscript',
    'photograph': 'photograph',
    'book': 'book',
    'furniture': 'furniture',
  };
  
  const materialMappings: Record<string, string> = {
    'gold': 'gold',
    'silver': 'silver',
    'bronze': 'bronze',
    'copper': 'copper',
    'copper alloy': 'copper alloy',
    'brass': 'copper alloy',
    'pewter': 'pewter',
    'lead': 'lead',
    'tin': 'tin',
    'iron': 'iron',
    'steel': 'steel',
    'ceramic': 'ceramic',
    'pottery': 'ceramic',
    'terracotta': 'ceramic',
    'porcelain': 'ceramic',
    'stone': 'stone',
    'marble': 'stone',
    'limestone': 'stone',
    'sandstone': 'stone',
    'granite': 'stone',
    'basalt': 'stone',
    'slate': 'stone',
    'flint': 'flint',
    'obsidian': 'obsidian',
    'glass': 'glass',
    'enamel': 'enamel',
    'bone': 'bone',
    'ivory': 'ivory',
    'shell': 'shell',
    'wood': 'wood',
    'oak': 'wood',
    'pine': 'wood',
    'ebony': 'wood',
    'leather': 'leather',
    'textile': 'textile',
    'silk': 'textile',
    'wool': 'textile',
    'linen': 'textile',
    'paper': 'paper',
    'ink': 'ink',
    'paint': 'paint',
    'oil': 'oil',
    'watercolor': 'watercolor',
    'gilt': 'gilt',
    'gilded': 'gilt',
  };
  
  const periodMappings: Record<string, string> = {
    'neolithic': 'Neolithic',
    'bronze age': 'Bronze Age',
    'iron age': 'Iron Age',
    'ancient': 'Ancient',
    'egyptian': 'Ancient Egyptian',
    'greek': 'Greek',
    'etruscan': 'Etruscan',
    'roman': 'Roman',
    'byzantine': 'Byzantine',
    'early medieval': 'Early Medieval',
    'medieval': 'Medieval',
    'got hic': 'Medieval',
    'romanesque': 'Medieval',
    'gothic': 'Medieval',
    'renaissance': 'Renaissance',
    'baroque': 'Baroque',
    'rococo': 'Rococo',
    'neoclassical': 'Neoclassical',
    'imperial': 'Imperial',
    'han': 'Han',
    'tang': 'Tang',
    'song': 'Song',
    'ming': 'Ming',
    'qing': 'Qing',
    'edo': 'Edo',
    'meiji': 'Meiji',
    'edwardian': 'Edwardian',
    'victorian': 'Victorian',
    'georgian': 'Georgian',
    '19th century': '19th Century',
    '20th century': '20th Century',
    '21st century': '21st Century',
    'modern': 'Modern',
    'contemporary': 'Contemporary',
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

async function searchMET(query?: string, department?: string, hasImages: boolean = true, isHighlight?: boolean, limit: number = 20): Promise<number[]> {
  try {
    const params = new URLSearchParams({
      q: query || '*',
      hasImages: String(hasImages),
    });
    
    if (department) params.set('departmentId', department);
    if (isHighlight !== undefined) params.set('isHighlight', String(isHighlight));

    const response = await fetch(`${MET_API_URL}/search?${params}`, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`MET API error: ${response.status}`);
    }

    const data = await response.json();
    return (data.objectIDs || []).slice(0, limit);
  } catch (error) {
    console.error('MET search failed:', error);
    return [];
  }
}

async function fetchMETObject(objectId: number): Promise<METObject | null> {
  try {
    const response = await fetch(`${MET_API_URL}/objects/${objectId}`, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(`Failed to fetch MET object ${objectId}:`, error);
    return null;
  }
}

function parseMETObject(item: METObject): {
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
    const id = item.objectID;
    if (!id) return null;

    const title = item.title || item.objectName || 'MET Object';
    const description = item.artworkDescriptionText || '';
    const type = normalizeValue('type', item.objectName);
    const period = normalizeValue('period', item.period || item.objectDate);
    const material = normalizeValue('material', item.medium);
    const culture = item.culture || '';
    
    const location = [item.Geography?.city, item.Geography?.state, item.Geography?.country].filter(Boolean).join(', ');

    const images: string[] = [];
    if (item.primaryImage) {
      images.push(item.primaryImage);
    }
    if (item.additionalImages) {
      for (const img of item.additionalImages) {
        if (img && !images.includes(img)) {
          images.push(img);
        }
      }
    }

    if (images.length === 0) return null;

    return {
      source: 'met',
      source_id: `met:${id}`,
      source_type: 'museum_reference',
      title,
      description,
      type,
      period,
      material,
      culture,
      location_found: location,
      image_urls: images,
      metadata_raw: item as any,
      is_fragment: false,
    };
  } catch (error) {
    console.error('Failed to parse MET item:', error);
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
        JSON.stringify({ status: 'ok', worker: 'ingest-met' }),
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
      const { action, query, department, hasImages = true, isHighlight, limit = 20 } = body;

      if (action === 'search') {
        const objectIds = await searchMET(query, department, hasImages, isHighlight, limit);
        
        return new Response(
          JSON.stringify({
            action: 'search',
            query: { query, department },
            objectCount: objectIds.length,
            objectIds: objectIds.slice(0, 10),
          }),
          {
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          }
        );
      }

      if (action === 'ingest') {
        const objectIds = await searchMET(query, department, hasImages, isHighlight, limit);
        
        let inserted = 0;
        let queued = 0;
        let processed = 0;

        for (const objectId of objectIds) {
          const item = await fetchMETObject(objectId);
          if (!item) continue;
          
          processed++;
          
          const parsed = parseMETObject(item);
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
          
          if (processed >= 10) break;
        }

        return new Response(
          JSON.stringify({
            action: 'ingest',
            query: { query, department },
            processed,
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