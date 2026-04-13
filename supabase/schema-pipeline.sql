-- ArcheOS Pipeline Schema - Multi-source archaeological object recognition
-- Run this in your Supabase SQL Editor AFTER the main schema.sql
-- This adds support for Europeana, PAN, and other external datasets

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pghttp";

-- =============================================
-- ARTIFACTS TABLE (unified archaeological objects)
-- =============================================
CREATE TABLE IF NOT EXISTS artifacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source TEXT NOT NULL CHECK (source IN ('europeana', 'pan', 'pas', 'british_museum', 'met', 'idai', 'local', 'user')),
    source_id TEXT NOT NULL,
    source_type TEXT NOT NULL CHECK (source_type IN ('field_find', 'museum_reference')),
    title TEXT,
    description TEXT,
    type TEXT,
    period TEXT,
    culture TEXT,
    material TEXT,
    location_found TEXT,
    image_urls TEXT[] DEFAULT '{}',
    thumbnail_url TEXT,
    metadata_raw JSONB DEFAULT '{}',
    embedding_status TEXT DEFAULT 'pending',
    is_fragment BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(source, source_id)
);

-- Indexes for artifacts
CREATE INDEX IF NOT EXISTS idx_artifacts_source ON artifacts(source);
CREATE INDEX IF NOT EXISTS idx_artifacts_type ON artifacts(type);
CREATE INDEX IF NOT EXISTS idx_artifacts_period ON artifacts(period);
CREATE INDEX IF NOT EXISTS idx_artifacts_culture ON artifacts(culture);
CREATE INDEX IF NOT EXISTS idx_artifacts_embedding_status ON artifacts(embedding_status);

-- =============================================
-- EMBEDDINGS TABLE (vector embeddings for similarity search)
-- =============================================
CREATE TABLE IF NOT EXISTS embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    artifact_id UUID NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
    embedding vector(768),
    model TEXT NOT NULL CHECK (model IN ('clip', 'dinov2', 'sentence-transformers')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(artifact_id, model)
);

-- IMAGE EMBEDDINGS TABLE (one embedding per image)
CREATE TABLE IF NOT EXISTS image_embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    artifact_id UUID NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    embedding vector(768),
    model TEXT NOT NULL CHECK (model IN ('clip', 'dinov2')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for vector similarity search (cosine distance)
CREATE INDEX IF NOT EXISTS idx_embeddings_clip_cosine ON embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100) WHERE model = 'clip';
CREATE INDEX IF NOT EXISTS idx_embeddings_dinov2_cosine ON embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100) WHERE model = 'dinov2';

CREATE INDEX IF NOT EXISTS idx_image_embeddings_artifact ON image_embeddings(artifact_id);
CREATE INDEX IF NOT EXISTS idx_image_embeddings_status ON image_embeddings(status);
CREATE INDEX IF NOT EXISTS idx_image_embeddings_model ON image_embeddings(model);

-- =============================================
-- FEATURES TABLE (normalized key-value attributes for filtering)
-- =============================================
CREATE TABLE IF NOT EXISTS artifact_features (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    artifact_id UUID NOT NULL REFERENCES artifacts(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    value TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(artifact_id, key)
);

CREATE INDEX IF NOT EXISTS idx_artifact_features_key ON artifact_features(key);
CREATE INDEX IF NOT EXISTS idx_artifact_features_artifact_id ON artifact_features(artifact_id);

-- =============================================
-- INGESTION QUEUE TABLE (for async background jobs)
-- =============================================
CREATE TABLE IF NOT EXISTS ingestion_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source TEXT NOT NULL,
    source_id TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    retry_count INT DEFAULT 0,
    last_error TEXT,
    priority INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ingestion_queue_status ON ingestion_queue(status, priority DESC);

-- =============================================
-- NORMALIZATION MAPPINGS (for Dutch->English etc.)
-- =============================================
CREATE TABLE IF NOT EXISTS normalization_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category TEXT NOT NULL,
    raw_value TEXT NOT NULL,
    normalized_value TEXT NOT NULL,
    language TEXT DEFAULT 'nl',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(category, raw_value, language)
);

-- Insert default type mappings (Dutch -> English)
INSERT INTO normalization_mappings (category, raw_value, normalized_value, language) VALUES
-- Types
('type', 'munt', 'coin', 'nl'),
('type', 'munit', 'coin', 'nl'),
('type', 'munten', 'coin', 'nl'),
('type', 'schaal', 'scale', 'nl'),
('type', 'pot', 'pot', 'nl'),
('type', 'vaas', 'vase', 'nl'),
('type', 'bord', 'plate', 'nl'),
('type', 'beker', 'beaker', 'nl'),
('type', 'fibula', 'fibula', 'nl'),
('type', 'spinne', 'spindle', 'nl'),
('type', 'gordel', 'belt', 'nl'),
('type', 'hanger', 'pendant', 'nl'),
('type', 'ring', 'ring', 'nl'),
-- Materials
('material', 'brons', 'bronze', 'nl'),
('material', 'goud', 'gold', 'nl'),
('material', 'zilver', 'silver', 'nl'),
('material', 'ijzer', 'iron', 'nl'),
('material', 'staal', 'steel', 'nl'),
('material', 'keramiek', 'ceramic', 'nl'),
('material', 'aarde', 'clay', 'nl'),
('material', 'glas', 'glass', 'nl'),
('material', 'steen', 'stone', 'nl'),
('material', 'bot', 'bone', 'nl'),
-- Periods
('period', 'Romeins', 'Roman', 'nl'),
('period', 'Romeinse', 'Roman', 'nl'),
('period', 'Middeleeuws', 'Medieval', 'nl'),
('period', 'Middeleeuwse', 'Medieval', 'nl'),
('period', 'Bronstijd', 'Bronze Age', 'nl'),
('period', 'IJzertijd', 'Iron Age', 'nl'),
('period', 'Neolithicum', 'Neolithic', 'nl'),
-- Cultures
('culture', 'Nederlands', 'Dutch', 'nl'),
('culture', 'Romeins', 'Roman', 'nl'),
('culture', 'Germaans', 'Germanic', 'nl'),
('culture', 'Viking', 'Viking', 'nl')
ON CONFLICT (category, raw_value, language) DO NOTHING;

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE image_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE artifact_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingestion_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE normalization_mappings ENABLE ROW LEVEL SECURITY;

-- Public read access to artifacts (metadata)
CREATE POLICY "Anyone can view artifacts"
    ON artifacts FOR SELECT USING (true);

-- Service role can insert/update artifacts (for ingestion workers)
CREATE POLICY "Service can manage artifacts"
    ON artifacts FOR ALL USING (true);

CREATE POLICY "Anyone can view embeddings"
    ON embeddings FOR SELECT USING (true);

CREATE POLICY "Anyone can view image_embeddings"
    ON image_embeddings FOR SELECT USING (true);

CREATE POLICY "Service can manage image_embeddings"
    ON image_embeddings FOR ALL USING (true);

CREATE POLICY "Anyone can view features"
    ON artifact_features FOR SELECT USING (true);

CREATE POLICY "Service can manage features"
    ON artifact_features FOR ALL USING (true);

-- Queue policies
CREATE POLICY "Anyone can read queue"
    ON ingestion_queue FOR SELECT USING (true);

CREATE POLICY "Service can manage queue"
    ON ingestion_queue FOR ALL USING (true);

CREATE POLICY "Anyone can read mappings"
    ON normalization_mappings FOR SELECT USING (true);

-- =============================================
-- SEARCH FUNCTION with source type ranking
-- =============================================
CREATE OR REPLACE FUNCTION search_by_image(
    p_embedding vector(768),
    p_model TEXT DEFAULT 'clip',
    p_limit INT DEFAULT 10,
    p_threshold FLOAT DEFAULT 0.3
)
RETURNS TABLE (
    artifact_id UUID,
    title TEXT,
    type TEXT,
    period TEXT,
    source TEXT,
    source_type TEXT,
    image_url TEXT,
    similarity FLOAT,
    final_score FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.title,
        a.type,
        a.period,
        a.source,
        a.source_type,
        CASE WHEN array_length(a.image_urls, 1) > 0 THEN a.image_urls[1] ELSE NULL END as image_url,
        1 - (e.embedding <=> p_embedding) AS similarity,
        (
            (1 - (e.embedding <=> p_embedding)) * 0.7 +
            CASE WHEN a.source_type = 'field_find' THEN 0.2 ELSE 0.0 END +
            CASE WHEN a.metadata_raw->>'has_metadata' = 'true' THEN 0.1 ELSE 0.0 END
        ) AS final_score
    FROM embeddings e
    JOIN artifacts a ON a.id = e.artifact_id
    WHERE e.model = p_model
      AND a.image_urls IS NOT NULL
      AND array_length(a.image_urls, 1) > 0
    ORDER BY 
        final_score DESC,
        e.embedding <=> p_embedding
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Search across multiple images per artifact
CREATE OR REPLACE FUNCTION search_by_image_multi(
    p_embedding vector(768),
    p_model TEXT DEFAULT 'clip',
    p_limit INT DEFAULT 10,
    p_threshold FLOAT DEFAULT 0.3
)
RETURNS TABLE (
    artifact_id UUID,
    title TEXT,
    type TEXT,
    period TEXT,
    source TEXT,
    source_type TEXT,
    image_url TEXT,
    similarity FLOAT,
    final_score FLOAT,
    image_index INT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.title,
        a.type,
        a.period,
        a.source,
        a.source_type,
        ie.image_url,
        1 - (ie.embedding <=> p_embedding) AS similarity,
        (
            (1 - (ie.embedding <=> p_embedding)) * 0.7 +
            CASE WHEN a.source_type = 'field_find' THEN 0.2 ELSE 0.0 END +
            CASE WHEN a.metadata_raw->>'has_metadata' = 'true' THEN 0.1 ELSE 0.0 END
        ) AS final_score,
        ie.id::text::int as image_index
    FROM image_embeddings ie
    JOIN artifacts a ON a.id = ie.artifact_id
    WHERE ie.model = p_model
      AND ie.status = 'completed'
      AND (1 - (ie.embedding <=> p_embedding)) >= p_threshold
    ORDER BY final_score DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Update artifact with normalized fields
CREATE OR REPLACE FUNCTION normalize_artifact(p_artifact_id UUID)
RETURNS VOID AS $$
DECLARE
    v_artifact RECORD;
BEGIN
    SELECT * INTO v_artifact FROM artifacts WHERE id = p_artifact_id;
    
    IF v_artifact IS NULL THEN
        RETURN;
    END IF;
    
    UPDATE artifacts SET
        type = normalize_value('type', v_artifact.type, 'nl'),
        material = normalize_value('material', v_artifact.material, 'nl'),
        period = normalize_value('period', v_artifact.period, 'nl'),
        culture = normalize_value('culture', v_artifact.culture, 'nl'),
        updated_at = NOW()
    WHERE id = p_artifact_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- UPDATED AT TRIGGER
-- =============================================
CREATE OR REPLACE FUNCTION update_artifacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_artifacts_updated_at ON artifacts;
CREATE TRIGGER update_artifacts_updated_at
    BEFORE UPDATE ON artifacts
    FOR EACH ROW EXECUTE FUNCTION update_artifacts_updated_at();

-- =============================================
-- STORAGE BUCKET for artifacts
-- =============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('artifacts', 'artifacts', true)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- CREDIT/QUOTA TABLE (rate limiting for AI)
-- =============================================
CREATE TABLE IF NOT EXISTS api_quotas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    operation TEXT NOT NULL,
    quota_used INT DEFAULT 0,
    quota_limit INT DEFAULT 100,
    period_start TIMESTAMPTZ DEFAULT NOW(),
    period_end TIMESTAMPTZ DEFAULT NOW() + INTERVAL '1 day',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_quotas_user_period ON api_quotas(user_id, period_start);