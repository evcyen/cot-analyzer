import type { ModelUsageEntry } from "./shared";

export interface BatchListItem {
  id: string;
  name: string;
  created_at: string;
  trace_count: number;
  models: string[];
  source_type: "petri" | "bloom";
}

export interface BatchDetail {
  id: string;
  name: string;
  created_at: string;
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
  total_time: number | null;
  working_time: number | null;
  citation_count: number;
  model_usage: Record<string, ModelUsageEntry> | null;
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
