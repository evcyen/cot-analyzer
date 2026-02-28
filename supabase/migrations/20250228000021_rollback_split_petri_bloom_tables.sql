-- Rollback: Merge petri_traces and bloom_transcripts back into shared traces table
--
-- This reverses the table split by:
-- 1. Reverting analyses FK column name
-- 2. Renaming petri_traces back to traces
-- 3. Re-adding Bloom-specific columns
-- 4. Migrating bloom_transcripts data back into traces
-- 5. Dropping bloom_transcripts table

-- ============================================================================
-- STEP 1: Revert analyses FK column name
-- ============================================================================

ALTER TABLE public.analyses RENAME COLUMN petri_trace_id TO trace_id;
ALTER TABLE public.analyses 
RENAME CONSTRAINT analyses_petri_trace_id_fkey TO analyses_trace_id_fkey;
ALTER INDEX IF EXISTS idx_analyses_petri_trace_id RENAME TO idx_analyses_trace_id;

-- ============================================================================
-- STEP 2: Rename petri_traces back to traces
-- ============================================================================

ALTER TABLE public.petri_traces RENAME TO traces;
ALTER TABLE public.traces 
RENAME CONSTRAINT petri_traces_batch_id_fkey TO traces_petri_batch_id_fkey;

ALTER INDEX IF EXISTS idx_petri_traces_batch_id RENAME TO idx_traces_batch_id;
ALTER INDEX IF EXISTS idx_petri_traces_model RENAME TO idx_traces_model;
ALTER INDEX IF EXISTS idx_petri_traces_scenario_id RENAME TO idx_traces_scenario_id;

-- ============================================================================
-- STEP 3: Re-add Bloom-specific columns to traces
-- ============================================================================

ALTER TABLE public.traces
ADD COLUMN source_type TEXT NOT NULL DEFAULT 'petri' CHECK (source_type IN ('petri', 'bloom')),
ADD COLUMN bloom_batch_id UUID REFERENCES public.bloom_batches(id) ON DELETE CASCADE,
ADD COLUMN variation_number INTEGER,
ADD COLUMN repetition_number INTEGER,
ADD COLUMN transcript_id TEXT,
ADD COLUMN summary TEXT,
ADD COLUMN scores JSONB DEFAULT '{}'::jsonb;

-- Make petri_batch_id nullable again
ALTER TABLE public.traces ALTER COLUMN petri_batch_id DROP NOT NULL;

-- Re-add constraint
ALTER TABLE public.traces
ADD CONSTRAINT traces_one_batch_type CHECK (
  (petri_batch_id IS NOT NULL AND bloom_batch_id IS NULL AND source_type = 'petri') OR
  (petri_batch_id IS NULL AND bloom_batch_id IS NOT NULL AND source_type = 'bloom')
);

-- ============================================================================
-- STEP 4: Migrate bloom_transcripts data back into traces
-- ============================================================================

INSERT INTO public.traces (
  id,
  petri_batch_id,
  bloom_batch_id,
  source_type,
  transcript_id,
  variation_number,
  repetition_number,
  messages,
  summary,
  scores,
  model,
  scenario_id,
  created_at,
  model_usage,
  total_time,
  working_time,
  started_at,
  completed_at,
  raw_input,
  scenario_summary
)
SELECT 
  id,
  NULL,
  batch_id,
  'bloom',
  transcript_id,
  variation_number,
  repetition_number,
  messages,
  summary,
  jsonb_build_object(
    'behavior_presence', behavior_presence,
    'unrealism', unrealism,
    'evaluation_awareness', evaluation_awareness,
    'evaluation_invalidity', evaluation_invalidity
  ),
  model,
  scenario_id,
  created_at,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL
FROM public.bloom_transcripts;

-- ============================================================================
-- STEP 5: Drop bloom_transcripts table
-- ============================================================================

DROP TABLE IF EXISTS public.bloom_transcripts CASCADE;

-- Re-create indexes
CREATE INDEX idx_traces_bloom_batch ON public.traces(bloom_batch_id) WHERE source_type = 'bloom';
CREATE INDEX idx_traces_source_type ON public.traces(source_type);
