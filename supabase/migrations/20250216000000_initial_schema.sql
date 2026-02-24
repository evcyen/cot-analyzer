-- Enable pgvector (required for chunks.embedding)
CREATE EXTENSION IF NOT EXISTS vector;

-- MVP tables (populated during MVP)
CREATE TABLE batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    model_id TEXT,
    dataset_name TEXT,
    source_format TEXT NOT NULL,
    trace_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata JSONB DEFAULT '{}'
);

CREATE TABLE traces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    messages JSONB NOT NULL,
    model_id TEXT,
    scenario_id TEXT,
    scenario_type TEXT,
    total_tokens INTEGER,
    input_tokens INTEGER,
    output_tokens INTEGER,
    reasoning_tokens INTEGER,
    response_tokens INTEGER,
    thinking_to_response_ratio FLOAT,
    turn_count INTEGER,
    has_thinking_content BOOLEAN,
    has_tool_calls BOOLEAN,
    reasoning_effort TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata JSONB DEFAULT '{}',
    tags TEXT[] DEFAULT '{}'
);

CREATE TABLE dimensions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    description TEXT,
    rubric TEXT NOT NULL,
    is_builtin BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE analysis_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    judge_model TEXT NOT NULL,
    dimensions TEXT[] NOT NULL,
    config JSONB DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'pending',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE classification_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trace_id UUID NOT NULL REFERENCES traces(id) ON DELETE CASCADE,
    analysis_run_id UUID NOT NULL REFERENCES analysis_runs(id) ON DELETE CASCADE,
    dimension_name TEXT NOT NULL,
    score INTEGER NOT NULL,
    justification TEXT,
    raw_response TEXT,
    citations JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(trace_id, analysis_run_id, dimension_name)
);

CREATE TABLE anomaly_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trace_id UUID NOT NULL REFERENCES traces(id) ON DELETE CASCADE,
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    anomaly_type TEXT NOT NULL,
    severity FLOAT NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trace_id UUID NOT NULL REFERENCES traces(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    message_index INTEGER,
    start_char INTEGER,
    end_char INTEGER,
    content_type TEXT,
    token_count INTEGER,
    embedding vector(384),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE annotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trace_id UUID NOT NULL REFERENCES traces(id) ON DELETE CASCADE,
    user_id TEXT,
    label TEXT,
    dimension_name TEXT,
    notes TEXT,
    highlighted_text TEXT,
    message_index INTEGER,
    start_char INTEGER,
    end_char INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_traces_batch ON traces(batch_id);
CREATE INDEX idx_traces_scenario ON traces(batch_id, scenario_type);
CREATE INDEX idx_traces_model ON traces(batch_id, model_id);
CREATE INDEX idx_classification_trace ON classification_results(trace_id);
CREATE INDEX idx_classification_run ON classification_results(analysis_run_id);
CREATE INDEX idx_classification_dimension ON classification_results(dimension_name);
CREATE INDEX idx_anomaly_trace ON anomaly_flags(trace_id);
CREATE INDEX idx_anomaly_batch ON anomaly_flags(batch_id);
CREATE INDEX idx_chunks_trace ON chunks(trace_id);
CREATE INDEX idx_annotations_trace ON annotations(trace_id);
