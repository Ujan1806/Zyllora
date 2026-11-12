-- ==============================================================================
-- ZYLLORA — Migration 002: Private Storage Bucket & Document Indexing (Week 2)
-- Description: Configures private Supabase Storage for academic PDFs with RLS,
--              plus optimized indexes for chunk ordering and page searches.
-- ==============================================================================

-- 1. Create Private Storage Bucket for Academic Documents
-- 50MB limit per PDF, restricted strictly to application/pdf
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'documents',
    'documents',
    false,
    52428800, -- 50 MB in bytes
    ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 52428800,
    allowed_mime_types = ARRAY['application/pdf']::text[];

-- 2. Storage Object RLS Policies (Private User Folders)
-- Files stored at: {user_id}/{unique_doc_id}_{filename}.pdf
CREATE POLICY "Users can upload their own PDF documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can read their own PDF documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own PDF documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. Composite Index on document_chunks for sequential reading and pagination
CREATE INDEX IF NOT EXISTS idx_document_chunks_order
ON public.document_chunks(document_id, chunk_index ASC);

-- 4. Index on page range for page-level retrieval
CREATE INDEX IF NOT EXISTS idx_document_chunks_pages
ON public.document_chunks(document_id, page_start, page_end);

-- 5. Cascade cleanup trigger or helper function to verify integrity
COMMENT ON TABLE public.documents IS 'Tracks academic PDF uploads and processing lifecycle';
COMMENT ON TABLE public.document_chunks IS 'Extracted text chunks with preserved page boundaries for search and AI context';
