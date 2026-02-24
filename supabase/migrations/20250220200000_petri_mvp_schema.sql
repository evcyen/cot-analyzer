-- 1. Mark platform core dimensions (seed the 7 with is_core = true)
ALTER TABLE dimensions
ADD COLUMN IF NOT EXISTS is_core BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN dimensions.is_core IS 'True for the platform''s 7 core shared dimensions; false for upserted or extra dimensions.';

-- 2. Analysis-level citations: allow citations to belong to an analysis (e.g. Petri highlights) or to a score
ALTER TABLE citations
ADD COLUMN IF NOT EXISTS analysis_id UUID REFERENCES analyses(id) ON DELETE CASCADE;

ALTER TABLE citations
ALTER COLUMN score_id DROP NOT NULL;

-- At least one of score_id or analysis_id must be set
ALTER TABLE citations
ADD CONSTRAINT citations_score_or_analysis CHECK (
  (score_id IS NOT NULL) OR (analysis_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_citations_analysis_id ON citations(analysis_id);

COMMENT ON COLUMN citations.analysis_id IS 'When set, this citation is evidence for the whole analysis (e.g. Petri highlights); score_id is null. When score_id is set, citation is evidence for that dimension score.';
