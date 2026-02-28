-- Migration: Split shared traces table into petri_traces and bloom_transcripts
--
-- This migration separates Petri and Bloom data into dedicated tables for cleaner schema
-- and better type safety. The shared "traces" table with discriminator column is replaced
-- with two specialized tables.
--
-- Changes:
-- 1. Create bloom_transcripts table with Bloom-specific columns
-- 2. Migrate any existing Bloom data from traces to bloom_transcripts
-- 3. Rename traces → petri_traces and drop Bloom-specific columns
-- 4. Update FK constraints in analyses, scores, citations tables

-- ============================================================================
-- STEP 1: Create bloom_transcripts table
-- ============================================================================

CREATE TABLE public.bloom_transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES public.bloom_batches(id) ON DELETE CASCADE,
  
  -- Transcript identification
  transcript_id TEXT NOT NULL,
  variation_number INTEGER NOT NULL,
  repetition_number INTEGER NOT NULL,
  
  -- Transcript content
  messages JSONB NOT NULL,
  summary TEXT,
  
  -- Scores from _index.json (all on 1-10 scale)
  behavior_presence NUMERIC(4,2),
  unrealism NUMERIC(4,2),
  evaluation_awareness NUMERIC(4,2),
  evaluation_invalidity NUMERIC(4,2),
  
  -- Metadata
  model TEXT,
  scenario_id INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bloom_transcripts_batch ON public.bloom_transcripts(batch_id);
CREATE INDEX idx_bloom_transcripts_transcript_id ON public.bloom_transcripts(transcript_id);
CREATE INDEX idx_bloom_transcripts_variation ON public.bloom_transcripts(batch_id, variation_number, repetition_number);

-- ============================================================================
-- STEP 2: Migrate existing Bloom data from traces to bloom_transcripts
-- ============================================================================

-- Only migrate if there's actually Bloom data
-- Note: This assumes bloom columns (transcript_id, summary, scores, etc.) exist in traces
-- If they don't exist yet, this migration will be a no-op (which is fine for initial setup)

DO $$
BEGIN
  -- Check if bloom columns exist in traces table
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'traces' 
    AND column_name = 'bloom_batch_id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'traces' 
    AND column_name = 'transcript_id'
  ) THEN
    -- Migrate existing Bloom data
    INSERT INTO public.bloom_transcripts (
      id,
      batch_id,
      transcript_id,
      variation_number,
      repetition_number,
      messages,
      summary,
      behavior_presence,
      unrealism,
      evaluation_awareness,
      evaluation_invalidity,
      model,
      scenario_id,
      created_at
    )
    SELECT 
      id,
      bloom_batch_id,
      COALESCE(transcript_id, id::text),
      COALESCE(variation_number, 1),
      COALESCE(repetition_number, 1),
      messages,
      summary,
      (scores->>'behavior_presence')::numeric(4,2),
      (scores->>'unrealism')::numeric(4,2),
      (scores->>'evaluation_awareness')::numeric(4,2),
      (scores->>'evaluation_invalidity')::numeric(4,2),
      model,
      scenario_id,
      created_at
    FROM public.traces
    WHERE source_type = 'bloom' AND bloom_batch_id IS NOT NULL;
  END IF;
END $$;

-- ============================================================================
-- STEP 3: Delete Bloom records from traces table (if any exist)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'traces' 
    AND column_name = 'source_type'
  ) THEN
    DELETE FROM public.traces WHERE source_type = 'bloom';
  END IF;
END $$;

-- ============================================================================
-- STEP 4: Rename traces → petri_traces and clean up Bloom columns
-- ============================================================================

-- Drop Bloom-specific constraints and indexes
DROP INDEX IF EXISTS public.idx_traces_bloom_batch;
DROP INDEX IF EXISTS public.idx_traces_source_type;
ALTER TABLE public.traces DROP CONSTRAINT IF EXISTS traces_one_batch_type;

-- Drop Bloom-specific columns (if they exist)
ALTER TABLE public.traces
DROP COLUMN IF EXISTS source_type,
DROP COLUMN IF EXISTS bloom_batch_id,
DROP COLUMN IF EXISTS variation_number,
DROP COLUMN IF EXISTS repetition_number,
DROP COLUMN IF EXISTS transcript_id,
DROP COLUMN IF EXISTS summary,
DROP COLUMN IF EXISTS scores,
DROP COLUMN IF EXISTS behavior_presence,
DROP COLUMN IF EXISTS unrealism,
DROP COLUMN IF EXISTS evaluation_awareness,
DROP COLUMN IF EXISTS evaluation_invalidity;

-- Make petri_batch_id (or batch_id) NOT NULL again
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'traces' 
    AND column_name = 'petri_batch_id'
  ) THEN
    ALTER TABLE public.traces ALTER COLUMN petri_batch_id SET NOT NULL;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'traces' 
    AND column_name = 'batch_id'
  ) THEN
    -- If it's still called batch_id, rename it first
    ALTER TABLE public.traces RENAME COLUMN batch_id TO petri_batch_id;
    ALTER TABLE public.traces RENAME CONSTRAINT traces_batch_id_fkey TO traces_petri_batch_id_fkey;
    ALTER TABLE public.traces ALTER COLUMN petri_batch_id SET NOT NULL;
  END IF;
END $$;

-- Rename the table
ALTER TABLE public.traces RENAME TO petri_traces;

-- Rename the FK constraint for clarity (handle both possible names)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
    AND table_name = 'petri_traces'
    AND constraint_name = 'traces_petri_batch_id_fkey'
  ) THEN
    ALTER TABLE public.petri_traces 
    RENAME CONSTRAINT traces_petri_batch_id_fkey TO petri_traces_batch_id_fkey;
  END IF;
END $$;

-- Update index names
ALTER INDEX IF EXISTS idx_traces_batch_id RENAME TO idx_petri_traces_batch_id;
ALTER INDEX IF EXISTS idx_traces_model RENAME TO idx_petri_traces_model;
ALTER INDEX IF EXISTS idx_traces_scenario_id RENAME TO idx_petri_traces_scenario_id;

-- ============================================================================
-- STEP 5: Update foreign key references in related tables
-- ============================================================================

-- analyses table: trace_id → petri_trace_id for clarity
DO $$
BEGIN
  -- Only rename if column is currently called trace_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'analyses'
    AND column_name = 'trace_id'
  ) THEN
    ALTER TABLE public.analyses RENAME COLUMN trace_id TO petri_trace_id;
    
    -- Rename constraint if it exists
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_schema = 'public'
      AND table_name = 'analyses'
      AND constraint_name = 'analyses_trace_id_fkey'
    ) THEN
      ALTER TABLE public.analyses 
      RENAME CONSTRAINT analyses_trace_id_fkey TO analyses_petri_trace_id_fkey;
    END IF;
    
    -- Rename index if it exists
    IF EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE schemaname = 'public'
      AND tablename = 'analyses'
      AND indexname = 'idx_analyses_trace_id'
    ) THEN
      ALTER INDEX idx_analyses_trace_id RENAME TO idx_analyses_petri_trace_id;
    END IF;
  END IF;
END $$;
