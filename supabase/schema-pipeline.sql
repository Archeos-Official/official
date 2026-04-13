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
    source TEXT NOT NULL CHECK (source IN ('europeana', 'pan', 'local', 'user')),
    source_id TEXT NOT NULL,
    title TEXT,
    description TEXT,
    type TEXT,
    period TEXT,
    culture TEXT,
    material TEXT,
    location_found TEXT,
    image_url TEXT,
    thumbnail_url TEXT,
    metadata_raw JSONB DEFAULT '{}',
    embedding_status TEXT DEFAULT 'pending',
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

-- Index for vector similarity search (cosine distance)
CREATE INDEX IF NOT EXISTS idx_embeddings_clip_cosine ON embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100) WHERE model = 'clip';
CREATE INDEX IF NOT EXISTS idx_embeddings_dinov2_cosine ON embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100) WHERE model = 'dinov2';

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
-- HELPER FUNCTIONS
-- =============================================

-- Normalize a value using mappings
CREATE OR REPLACE FUNCTION normalize_value(
    p_category TEXT,
    p_value TEXT,
    p_language TEXT DEFAULT 'nl'
)
RETURNS TEXT AS $$
DECLARE
    v_normalized TEXT;
BEGIN
    IF p_value IS NULL OR p_value = '' THEN
        RETURN p_value;
    END IF;
    
    SELECT nm.normalized_value INTO v_normalized
    FROM normalization_mappings nm
    WHERE nm.category = p_category
      AND LOWER(nm.raw_value) = LOWER(p_value)
      AND nm.language = p_language
    LIMIT 1;
    
    RETURN COALESCE(v_normalized, p_value);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Search similar artifacts by image embedding (returns top matches)
CREATE OR REPLACE FUNCTION search_similar_artifacts(
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
    image_url TEXT,
    similarity FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.title,
        a.type,
        a.period,
        a.image_url,
        1 - (e.embedding <=> p_embedding) AS similarity
    FROM embeddings e
    JOIN artifacts a ON a.id = e.artifact_id
    WHERE e.model = p_model
      AND a.image_url IS NOT NULL
    ORDER BY e.embedding <=> p_embedding
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