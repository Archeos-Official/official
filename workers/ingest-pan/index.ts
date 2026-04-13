const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const SUPABASE_URL = 'https://yrffgxgijyhjlknmupko.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kYW1sIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1am1l-fW65CYSW4xjI6N5W8WlCPgpykGNMv5vT4A';

interface PANObject {
  objectnummer: string;
  titel?: string;
  beschrijving?: string;
  categorie?: string;
  periode?: string;
  cultuur?: string;
  materiaal?: string;
  vindplaats?: string;
  provincie?: string;
  gemeentecode?: string;
  coordinaat_x?: number;
  coordinaat_y?: number;
  afbeelding_url?: string;
  thumbnails?: string[];
  metadata?: Record<string, unknown>;
}

interface IngestionRequest {
  action: 'ingest' | 'search' | 'status';
  categorie?: string;
  periode?: string;
  materiaal?: string;
  limit?: number;
  offset?: number;
}

function normalizeValue(category: string, value: string | null): string {
  if (!value) return '';
  
  const typeMappings: Record<string, string> = {
    'munt': 'coin',
    'munit': 'coin',
    'munten': 'coin',
    'schaal': 'scale',
    'weegschaal': 'scale',
    'pot': 'pot',
    'vaas': 'vase',
    'aardewerk': 'ceramic',
    'glas': 'glass',
    'fibula': 'fibula',
    'gordelspeld': 'pin',
    'hanger': 'pendant',
    'armband': 'bracelet',
    'ring': 'ring',
    'torq': 'torque',
    'dolk': 'dagger',
    'zwaard': 'sword',
    'pijlpunt': 'arrowhead',
    'speerpunt': 'spearhead',
    'bijl': 'axe',
    'speer': 'spear',
    'mes': 'knife',
    'schrabber': 'scraper',
    'bijl artefact': 'axe',
    'fragment': 'fragment',
  };
  
  const materialMappings: Record<string, string> = {
    'brons': 'bronze',
    'goud': 'gold',
    'zilver': 'silver',
    'ijzer': 'iron',
    'staal': 'steel',
    'keramiek': 'ceramic',
    'aardewerk': 'ceramic',
    'glas': 'glass',
    'steen': 'stone',
    'vuursteen': 'flint',
    'leisteen': 'slate',
    'bot': 'bone',
    'ivoor': 'ivory',
    'hout': 'wood',
    'leer': 'leather',
    'textiel': 'textile',
    'koper': 'copper',
    'lood': 'lead',
    'tin': 'tin',
  };
  
  const periodMappings: Record<string, string> = {
    'paleolithicum': 'Palaeolithic',
    'mesolithicum': 'Mesolithic',
    'neolithicum': 'Neolithic',
    'bronstijd': 'Bronze Age',
    'ijzertijd': 'Iron Age',
    'romeins': 'Roman',
    'romeinse tijd': 'Roman',
    'middeleeuwen': 'Medieval',
    'middeleeuwse': 'Medieval',
    'nieuwe tijd': 'Post Medieval',
    'nieuwe tijd (na 1500)': 'Post Medieval',
    '20e eeuw': 'Modern',
    '21e eeuw': 'Modern',
    'onbekend': 'Unknown',
    'onbepaald': 'Unknown',
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
  const fragmentTerms = ['fragment', 'breuk', 'broken', 'defect', 'beschadigd', 'onvolledig'];
  const descLower = (description || '').toLowerCase();
  const typeLower = (type || '').toLowerCase();
  
  if (fragmentTerms.some(term => descLower.includes(term) || typeLower.includes(term))) {
    return true;
  }
  return false;
}

async function fetchPANData(categorie?: string, periode?: string, materiaal?: string, limit: number = 50, offset: number = 0): Promise<PANObject[]> {
  try {
    const response = await fetch('https://portable-antiquities.nl/cgi/list.cgi', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        start: String(offset),
        max: String(limit),
        ...(categorie && { categorie }),
        ...(periode && {}),
        ...(materiaal && {}),
      }).toString(),
    });

    if (!response.ok) {
      throw new Error(`PAN fetch error: ${response.status}`);
    }

    const html = await response.text();
    const objects: PANObject[] = [];
    
    const idRegex = /objectnummer=(\d+)/g;
    const titleRegex = /<h1[^>]*>([^<]+)<\/h1>/gi;
    
    let match;
    while ((match = idRegex.exec(html)) !== null) {
      objects.push({
        objectnummer: match[1],
        titel: 'PAN Object',
        beschrijving: '',
      });
    }

    return objects;
  } catch (error) {
    console.error('PAN fetch failed:', error);
    return [];
  }
}

function parsePANObject(item: any): {
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
    const id = item.objectnummer;
    if (!id) return null;

    const title = item.titel || item.categorie || 'Nederlandse Vondst';
    const description = item.beschrijving || '';
    const type = normalizeValue('type', item.categorie);
    const period = normalizeValue('period', item.periode);
    const material = normalizeValue('material', item.materiaal);
    
    const location = [item.vindplaats, item.provincie].filter(Boolean).join(', ');
    
    const images: string[] = [];
    if (item.afbeelding_url) {
      images.push(item.afbeelding_url);
    }
    if (item.thumbnails) {
      images.push(...item.thumbnails);
    }

    return {
      source: 'pan',
      source_id: `pan:${id}`,
      source_type: 'field_find',
      title,
      description,
      type,
      period,
      material,
      culture: item.cultuur || 'Dutch',
      location_found: location,
      image_urls: images,
      metadata_raw: item,
      is_fragment: isFragment(description, type),
    };
  } catch (error) {
    console.error('Failed to parse PAN item:', error);
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
        JSON.stringify({ status: 'ok', worker: 'ingest-pan' }),
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
      const { action, categorie, periode, materiaal, limit = 50, offset = 0 } = body;

      if (action === 'search') {
        const items = await fetchPANData(categorie, periode, materiaal, limit, offset);
        
        return new Response(
          JSON.stringify({
            action: 'search',
            query: { categorie, periode, materiaal },
            count: items.length,
            items: items.map(i => ({
              id: i.objectnummer,
              title: i.titel,
              categorie: i.categorie,
            })),
          }),
          {
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          }
        );
      }

      if (action === 'ingest') {
        const items = await fetchPANData(categorie, periode, materiaal, limit, offset);
        let inserted = 0;
        let queued = 0;

        for (const item of items) {
          const parsed = parsePANObject(item);
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
            query: { categorie, periode, materiaal },
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