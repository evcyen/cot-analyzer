-- Migration: Complete Bloom Schema Update
-- Date: 2025-02-28
-- Description: 
--   1. Change bloom_transcripts scores from individual columns to JSONB
--   2. Add new metadata fields (updated_at, version, target_tools, target_system_prompt, judge_justification)
--   3. Create bloom_highlights and bloom_citation_parts tables for citations

-- ============================================================================
-- PART 1: Update bloom_transcripts table
-- ============================================================================

-- Add new metadata columns
ALTER TABLE bloom_transcripts
  ADD COLUMN updated_at TIMESTAMPTZ,
  ADD COLUMN version TEXT,
  ADD COLUMN target_tools JSONB,
  ADD COLUMN target_system_prompt TEXT,
  ADD COLUMN judge_justification TEXT;

-- Add scores JSONB column (initially nullable for migration)
ALTER TABLE bloom_transcripts
  ADD COLUMN scores JSONB;

-- Migrate existing score data to JSONB format
UPDATE bloom_transcripts
SET scores = jsonb_build_object(
  'behavior_presence', behavior_presence,
  'unrealism', unrealism,
  'evaluation_awareness', evaluation_awareness,
  'evaluation_invalidity', evaluation_invalidity
);

-- Make scores NOT NULL now that data is migrated
ALTER TABLE bloom_transcripts
  ALTER COLUMN scores SET NOT NULL,
  ALTER COLUMN scores SET DEFAULT '{}';

-- Drop old individual score columns
ALTER TABLE bloom_transcripts
  DROP COLUMN behavior_presence,
  DROP COLUMN unrealism,
  DROP COLUMN evaluation_awareness,
  DROP COLUMN evaluation_invalidity;

-- ============================================================================
-- PART 2: Create bloom_highlights table
-- ============================================================================

CREATE TABLE bloom_highlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcript_id UUID NOT NULL REFERENCES bloom_transcripts(id) ON DELETE CASCADE,
  highlight_index INTEGER NOT NULL,
  quoted_text TEXT NOT NULL,
  reasoning TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT bloom_highlights_transcript_index_unique UNIQUE (transcript_id, highlight_index)
);

CREATE INDEX idx_bloom_highlights_transcript_id ON bloom_highlights(transcript_id);

-- ============================================================================
-- PART 3: Create bloom_citation_parts table
-- ============================================================================

CREATE TABLE bloom_citation_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  highlight_id UUID NOT NULL REFERENCES bloom_highlights(id) ON DELETE CASCADE,
  part_index INTEGER NOT NULL,
  message_id TEXT,
  message_index INTEGER,
  tool_call_id TEXT,
  tool_arg TEXT,
  resolution_method TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT bloom_citation_parts_highlight_part_unique UNIQUE (highlight_id, part_index),
  CONSTRAINT bloom_citation_parts_resolution_check CHECK (
    resolution_method IN ('direct', 'resolved_from_quote', 'unknown')
  )
);

CREATE INDEX idx_bloom_citation_parts_highlight_id ON bloom_citation_parts(highlight_id);
CREATE INDEX idx_bloom_citation_parts_message_id ON bloom_citation_parts(message_id);