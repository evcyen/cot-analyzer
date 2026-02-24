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
