-- dimensions: safety/audit dimensions for scoring (seed from Petri DIMENSIONS)
CREATE TABLE dimensions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    display_name TEXT,
    rubric TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- batches: one per upload (batch name + optional metadata)
CREATE TABLE batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- traces: one per conversation/sample; scenario_id = per-batch scenario index (1, 2, 3...)
-- assigned by matching seeds (e.g. raw_input hash) then numbering distinct scenarios in the batch
CREATE TABLE traces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    model TEXT,
    scenario_id INTEGER,
    scenario_summary TEXT,
    raw_input TEXT,
    messages JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- analyses: one per trace (overall justification + judge model)
CREATE TABLE analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trace_id UUID NOT NULL REFERENCES traces(id) ON DELETE CASCADE UNIQUE,
    overall_justification TEXT NOT NULL,
    judge_model TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- scores: per dimension per analysis (1–10, justification when value >= 4)
CREATE TABLE scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
    dimension_id UUID NOT NULL REFERENCES dimensions(id) ON DELETE CASCADE,
    value INTEGER NOT NULL,
    justification TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- citations: evidence for a score (message span + note)
CREATE TABLE citations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    score_id UUID NOT NULL REFERENCES scores(id) ON DELETE CASCADE,
    message_id TEXT NOT NULL,
    quoted_text TEXT,
    position_start INTEGER,
    position_end INTEGER,
    note TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common filters and joins
CREATE INDEX idx_traces_batch_id ON traces(batch_id);
CREATE INDEX idx_traces_model ON traces(batch_id, model);
CREATE INDEX idx_traces_scenario_id ON traces(batch_id, scenario_id);
CREATE INDEX idx_analyses_trace_id ON analyses(trace_id);
CREATE INDEX idx_scores_analysis_id ON scores(analysis_id);
CREATE INDEX idx_scores_dimension_id ON scores(dimension_id);
CREATE INDEX idx_citations_score_id ON citations(score_id);
