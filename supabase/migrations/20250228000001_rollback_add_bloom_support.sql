-- Rollback migration for 20250228000000_add_bloom_support.sql
-- WARNING: This will delete all Bloom data and revert to Petri-only schema

-- ============================================================================
-- STEP 1: Remove Bloom dimensions
-- ============================================================================

DELETE FROM public.dimensions WHERE "group" IN ('bloom_core', 'bloom_quality', 'bloom_behavior');

-- ============================================================================
-- STEP 2: Remove Bloom columns from analyses
-- ============================================================================

ALTER TABLE public.analyses
DROP COLUMN IF EXISTS judge_summary;

-- ============================================================================
-- STEP 3: Remove Bloom-specific columns from traces
-- ============================================================================

ALTER TABLE public.traces DROP CONSTRAINT IF EXISTS traces_one_batch_type;
DROP INDEX IF EXISTS idx_traces_bloom_batch;
DROP INDEX IF EXISTS idx_traces_source_type;

ALTER TABLE public.traces
DROP COLUMN IF EXISTS bloom_batch_id,
DROP COLUMN IF EXISTS source_type,
DROP COLUMN IF EXISTS variation_number,
DROP COLUMN IF EXISTS repetition_number;

-- Make petri_batch_id NOT NULL again (will fail if there were Bloom traces)
ALTER TABLE public.traces 
ALTER COLUMN petri_batch_id SET NOT NULL;

-- ============================================================================
-- STEP 4: Drop Bloom-specific tables
-- ============================================================================

DROP TABLE IF EXISTS public.bloom_scenarios CASCADE;
DROP TABLE IF EXISTS public.bloom_understanding CASCADE;
DROP TABLE IF EXISTS public.bloom_batches CASCADE;

-- ============================================================================
-- STEP 5: Rename petri_batches back to batches
-- ============================================================================

ALTER TABLE public.traces RENAME CONSTRAINT traces_petri_batch_id_fkey TO traces_batch_id_fkey;
ALTER TABLE public.traces RENAME COLUMN petri_batch_id TO batch_id;
ALTER TABLE public.petri_batches RENAME TO batches;

-- Re-add ingest_source column
ALTER TABLE public.batches
ADD COLUMN ingest_source TEXT;

-- ============================================================================
-- Done
-- ============================================================================

COMMENT ON TABLE public.batches IS 'Reverted to original batches table (Petri-only)';
