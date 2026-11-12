-- ==============================================================================
-- ZYLLORA — Migration 003: pgvector Extension & Semantic Retrieval (Week 3)
-- Description: Enables pgvector, creates vector embedding column & HNSW index on
--              document_chunks, and provides RPC function for similarity search.
-- ==============================================================================

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Add vector embedding column (768 dimensions for Gemini text-embedding-004)
ALTER TABLE public.document_chunks
ADD COLUMN IF NOT EXISTS embedding vector(768);

-- 3. Create HNSW (Hierarchical Navigable Small World) index for sub-second cosine search
CREATE INDEX IF NOT EXISTS idx_chunks_embedding_hnsw
ON public.document_chunks
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 4. Secure RPC function for cosine similarity retrieval filtered by document
CREATE OR REPLACE FUNCTION public.match_document_chunks(
    query_embedding vector(768),
    match_document_id UUID,
    match_threshold FLOAT DEFAULT 0.3,
    match_count INT DEFAULT 5
)
RETURNS TABLE (
    id UUID,
    document_id UUID,
    page_start INT,
    page_end INT,
    chunk_index INT,
    content TEXT,
    similarity FLOAT
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.document_id,
        c.page_start,
        c.page_end,
        c.chunk_index,
        c.content,
        (1 - (c.embedding <=> query_embedding))::FLOAT AS similarity
    FROM public.document_chunks c
    WHERE c.document_id = match_document_id
      AND c.embedding IS NOT NULL
      AND (1 - (c.embedding <=> query_embedding)) >= match_threshold
    ORDER BY c.embedding <=> query_embedding ASC
    LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION public.match_document_chunks IS 'Performs cosine similarity search over chunks strictly constrained to a single document';
