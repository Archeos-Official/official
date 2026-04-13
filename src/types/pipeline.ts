// ArcheOS Pipeline Types
// TypeScript definitions for the multi-source artifact recognition system

export type DataSource = 'europeana' | 'pan' | 'pas' | 'british_museum' | 'met' | 'idai' | 'local' | 'user';
export type SourceType = 'field_find' | 'museum_reference';

export interface Artifact {
  id: string;
  source: DataSource;
  source_id: string;
  source_type: SourceType;
  title: string | null;
  description: string | null;
  type: string | null;
  period: string | null;
  culture: string | null;
  material: string | null;
  location_found: string | null;
  image_urls: string[];
  thumbnail_url: string | null;
  metadata_raw: Record<string, unknown>;
  embedding_status: 'pending' | 'processing' | 'completed' | 'failed';
  is_fragment: boolean;
  created_at: string;
  updated_at: string;
}

export interface Embedding {
  id: string;
  artifact_id: string;
  embedding: number[];
  model: EmbeddingModel;
  created_at: string;
}

export interface ImageEmbedding {
  id: string;
  artifact_id: string;
  image_url: string;
  embedding: number[];
  model: EmbeddingModel;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
}

export type EmbeddingModel = 'clip' | 'dinov2' | 'sentence-transformers';

export interface ArtifactFeature {
  id: string;
  artifact_id: string;
  key: string;
  value: string | null;
  created_at: string;
}

export interface IngestionQueueItem {
  id: string;
  source: DataSource;
  source_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  retry_count: number;
  last_error: string | null;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface NormalizationMapping {
  id: string;
  category: 'type' | 'material' | 'period' | 'culture';
  raw_value: string;
  normalized_value: string;
  language: string;
  created_at: string;
}

export interface SimilaritySearchResult {
  artifact_id: string;
  title: string | null;
  type: string | null;
  period: string | null;
  source: DataSource | null;
  source_type: SourceType | null;
  image_url: string | null;
  similarity: number;
  final_score: number;
}

export interface SearchQueryRequest {
  image_url?: string;
  image_base64?: string;
  model?: EmbeddingModel;
  limit?: number;
  threshold?: number;
  filter?: {
    source?: DataSource[];
    type?: string[];
    period?: string[];
    culture?: string[];
  };
}

export interface SearchQueryResponse {
  matches: SimilaritySearchResult[];
  query_embedding_model: EmbeddingModel;
  total_found: number;
  search_time_ms: number;
}

export interface IngestionRequest {
  source: DataSource;
  items: EuropeanaItem[] | PANItem[];
}

export interface EuropeanaItem {
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

export interface PANItem {
  objectnummer: string;
  titel?: string;
  beschrijving?: string;
  categorie?: string;
  periode?: string;
  cultuur?: string;
  materiaal?: string;
  vindplaats?: string;
  afbeelding_url?: string;
  thumbnail_url?: string;
  metadata?: Record<string, unknown>;
}

export interface EmbeddingGenerationRequest {
  artifact_id: string;
  image_url?: string;
  image_base64?: string;
  models?: EmbeddingModel[];
}

export interface EmbeddingGenerationResponse {
  artifact_id: string;
  embeddings: {
    model: EmbeddingModel;
    embedding: number[];
    status: 'success' | 'failed';
    error?: string;
  }[];
  processing_time_ms: number;
}

export interface ApiError {
  error: string;
  code?: string;
  details?: Record<string, unknown>;
}

export interface HealthCheckResponse {
  status: 'ok' | 'degraded' | 'error';
  version: string;
  timestamp: string;
  services: {
    database: 'ok' | 'error';
    ai: 'ok' | 'error';
    storage: 'ok' | 'error';
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  has_more: boolean;
}