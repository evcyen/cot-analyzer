import type { ModelUsageEntry } from "./shared";

export interface BatchListItem {
  id: string;
  name: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  trace_count: number;
  models: string[];
}

export interface BatchDetail {
  id: string;
  name: string;
  created_at: string;
  ingest_source?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  model_usage?: Record<string, ModelUsageEntry> | null;
}

export interface TraceRow {
  trace_id: string;
  model: string | null;
  scenario_id: number | null;
  scenario_summary: string | null;
  scores: Record<string, number>;
}

export interface DimensionInfo {
  name: string;
  group: string | null;
  display_name: string | null;
  rubric: string | null;
}

export interface BatchTracesResponse {
  traces: TraceRow[];
  dimensions: DimensionInfo[];
}
