-- Rollback: Complete Bloom Schema Update
-- Date: 2025-02-28
-- Description: Reverts all changes from 20250228000030_bloom_complete_schema.sql

-- ============================================================================
-- PART 1: Drop bloom_citation_parts table
-- ============================================================================

DROP TABLE IF EXISTS bloom_citation_parts CASCADE;

-- ============================================================================
-- PART 2: Drop bloom_highlights table
-- ============================================================================

DROP TABLE IF EXISTS bloom_highlights CASCADE;

-- ============================================================================
-- PART 3: Revert bloom_transcripts table changes
-- ============================================================================

-- Re-add individual score columns
ALTER TABLE bloom_transcripts
  ADD COLUMN behavior_presence NUMERIC(4,2),
  ADD COLUMN unrealism NUMERIC(4,2),
  ADD COLUMN evaluation_awareness NUMERIC(4,2),
  ADD COLUMN evaluation_invalidity NUMERIC(4,2);

-- Migrate scores back from JSONB to individual columns
UPDATE bloom_transcripts
SET 
  behavior_presence = CAST(scores->>'behavior_presence' AS NUMERIC(4,2)),
  unrealism = CAST(scores->>'unrealism' AS NUMERIC(4,2)),
  evaluation_awareness = CAST(scores->>'evaluation_awareness' AS NUMERIC(4,2)),
  evaluation_invalidity = CAST(scores->>'evaluation_invalidity' AS NUMERIC(4,2));

-- Drop the scores JSONB column
ALTER TABLE bloom_transcripts
  DROP COLUMN scores;

-- Drop new metadata columns
ALTER TABLE bloom_transcripts
  DROP COLUMN updated_at,
  DROP COLUMN version,
  DROP COLUMN target_tools,
  DROP COLUMN target_system_prompt,
  DROP COLUMN judge_justification;
