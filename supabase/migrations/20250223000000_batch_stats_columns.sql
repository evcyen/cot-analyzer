-- Batches: add columns for ingest_source and eval-level stats (no longer use metadata for these).
-- Keeps metadata column for backward compatibility; new code writes to dedicated columns.
ALTER TABLE batches
ADD COLUMN IF NOT EXISTS ingest_source TEXT,
ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS model_usage JSONB;