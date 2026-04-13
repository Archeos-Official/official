const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const SUPABASE_URL = 'https://yrffgxgijyhjlknmupko.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kYW1sIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1am1l-fW65CYSW4xjI6N5W8WlCPgpykGNMv5vT4A';

const EUROPEANA_API_KEY = 'YOUR_EUROPEANA_API_KEY';
const EUROPEANA_API_URL = 'https://www.europeana.eu/api/v2';

interface EuropeanaItem {
  id: string;
  title: string;
  description?: string;
  type?: string;
  period?: string;
  culture?: string;
  material?: string;
  location?: string;
  image_url?: string;
  thumbnail_url?: string;
  provider?: string;
  rights?: string;
  data?: Record<string, unknown>;
}

interface IngestionRequest {
  action: 'ingest' | 'search' | 'status';
  query?: string;
  limit?: number;
  offset?: number;
  collection?: string;
}

function normalizeValue(category: string, value: string | null): string {
  if (!value) return '';
  
  const mappings: Record<string, Record<string, string>> = {
    type: {
      'munt': 'coin', 'munit': 'coin', 'munten': 'coin',
      'schaal': 'scale', 'pot': 'pot', 'vaas': 'vase',
      'bord': 'plate', 'beker': 'beaker', 'fibula': 'fibula',
    },
    material: {
      'brons': 'bronze', 'goud': 'gold', 'zilver': 'silver',
      'ijzer': 'iron', 'staal': 'steel', 'keramiek': 'ceramic',
      'aarde': 'clay', 'glas': 'glass', 'steen': 'stone',
    },
    period: {
      'romeins': 'roman', 'romeinse': 'roman',
      'middeleeuws': 'medieval', 'middeleeuwse': 'medieval',
      'bronstijd': 'bronze age', 'ijzertijd': 'iron age',
    },
  };
  
  if (mappings[category]) {
    const normalized = mappings[category][value.toLowerCase()];
    return normalized || value;
  }
  return value;
}

function extractEuropeanaItem(apiItem: any): EuropeanaItem | null {
  try {
    const id = apiItem.id || apiItem['@id'];
    if (!id) return null;

    const title = apiItem.title?.[0] || apiItem.dcTitle?.[0] || 'Untitled';
    
    const description = apiItem.description?.[0] 
      || apiItem.dcDescription?.[0]
      || '';

    const type = apiItem.type?.[0] || apiItem.dcType?.[0] || '';

    const dates = apiItem.temporal?.[0] || apiItem.dcDate?.[0] || '';
    
    const coverage = apiItem.coverage?.[0] || apiItem.dcCoverage?.[0] || '';
    
    const materials = apiItem.material || apiItem.dcSubject || [];
    const material = Array.isArray(materials) ? materials.join(', ') : materials;

    const rights = apiItem.rights?.[0] || apiItem.dcRights?.[0] || '';
    
    const provider = apiItem.dataProvider?.[0] 
      || apiItem.provider?.[0] 
      || '';

    let imageUrl = '';
    const edmPreview = apiItem.edmPreview;
    if (edmPreview && edmPreview[0]) {
      imageUrl = edmPreview[0];
    }

    return {
      id: `europeana:${id}`,
      title,
      description,
      type: normalizeValue('type', type),
      period: normalizeValue('period', dates),
      culture: normalizeValue('culture', coverage),
      material: normalizeValue('material', material),
      location: coverage,
      image_url: imageUrl,
      thumbnail_url: imageUrl ? imageUrl.replace('/full/', '/thumb/') : '',
      provider,
      rights,
      data: apiItem,
    };
  } catch (error) {
    console.error('Failed to parse Europeana item:', error);
    return null;
  }
}

async function searchEuropeana(
  query: string,
  limit: number = 10,
  offset: number = 0
): Promise<EuropeanaItem[]> {
  try {
    const params = new URLSearchParams({
      wskey: EUROPEANA_API_KEY,
      query: query,
      rows: String(limit),
      start: String(offset + 1),
      profile: 'rich',
      reusability: 'open',
      'images_only': 'true',
    });

    const response = await fetch(
      `${EUROPEANA_API_URL}/search.json?${params}`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Europeana API error: ${response.status}`);
    }

    const data = await response.json();
    const items: EuropeanaItem[] = [];

    if (data.items) {
      for (const item of data.items) {
        const parsed = extractEuropeanaItem(item);
        if (parsed && parsed.image_url) {
          items.push(parsed);
        }
      }
    }

    return items;
  } catch (error) {
    console.error('Europeana search failed:', error);
    return [];
  }
}

async function insertArtifact(item: EuropeanaItem): Promise<boolean> {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/artifacts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=ignore-duplicates',
      },
      body: JSON.stringify({
        source: 'europeana',
        source_id: item.id,
        title: item.title,
        description: item.description,
        type: item.type,
        period: item.period,
        culture: item.culture,
        material: item.material,
        location_found: item.location,
        image_url: item.image_url,
        thumbnail_url: item.thumbnail_url,
        metadata_raw: item.data,
        embedding_status: 'pending',
      }),
    });

    return response.ok || response.status === 409;
  } catch (error) {
    console.error('Failed to insert artifact:', error);
    return false;
  }
}

async function queueForEmbedding(artifactId: string): Promise<boolean> {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/ingestion_queue`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: 'europeana',
        source_id: artifactId,
        status: 'pending',
        priority: 5,
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
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method === 'GET') {
      return new Response(
        JSON.stringify({ status: 'ok', worker: 'ingest-europeana' }),
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
      const { action, query, limit = 50, offset = 0 } = body;

      if (action === 'search') {
        if (!query) {
          return new Response(
            JSON.stringify({ error: 'query is required for search action' }),
            {
              status: 400,
              headers: { 'Content-Type': 'application/json', ...corsHeaders },
            }
          );
        }

        const items = await searchEuropeana(query, limit, offset);
        
        return new Response(
          JSON.stringify({
            action: 'search',
            query,
            count: items.length,
            items: items.map(i => ({
              id: i.id,
              title: i.title,
              type: i.type,
              image_url: i.image_url,
            })),
          }),
          {
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          }
        );
      }

      if (action === 'ingest') {
        if (!query) {
          return new Response(
            JSON.stringify({ error: 'query is required for ingest action' }),
            {
              status: 400,
              headers: { 'Content-Type': 'application/json', ...corsHeaders },
            }
          );
        }

        const items = await searchEuropeana(query, limit, offset);
        let inserted = 0;
        let queued = 0;

        for (const item of items) {
          const success = await insertArtifact(item);
          if (success) {
            inserted++;
            const artifactId = item.id.replace('europeana:', '');
            await queueForEmbedding(artifactId);
            queued++;
          }
        }

        return new Response(
          JSON.stringify({
            action: 'ingest',
            query,
            inserted,
            queued,
            total: items.length,
          }),
          {
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          }
        );
      }

      if (action === 'status') {
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/artifacts?source=eq.europeana&select=id,title,embedding_status&limit=20`,
          {
            headers: {
              'Authorization': `Bearer ${SUPABASE_KEY}`,
            },
          }
        );

        const artifacts = await response.json();

        return new Response(
          JSON.stringify({
            action: 'status',
            source: 'europeana',
            total_ingested: artifacts?.length || 0,
            artifacts,
          }),
          {
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Invalid action. Use search, ingest, or status.' }),
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