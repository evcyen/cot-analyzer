export interface TraceMessage {
  id: string;
  role: string;
  content: unknown;
  normalized_id?: string;
  normalized_ids?: string[];
  [key: string]: unknown;
}

export interface TraceDetailTrace {
  id: string;
  model: string | null;
  scenario_summary: string | null;
  raw_input: string | null;
  messages: TraceMessage[];
}

export interface ScoreWithDimension {
  dimension_id: string;
  dimension_name: string;
  dimension_display_name: string | null;
  value: number;
  justification: string | null;
}

export interface CitationEntry {
  id: string;
  message_id: string;
  quoted_text: string | null;
  note: string;
  score_id: string | null;
  dimension_name?: string | null;
  position_start: number | null;
  position_end: number | null;
}

export interface TraceDetailAnalysis {
  overall_justification: string;
  judge_model: string | null;
  scores: ScoreWithDimension[];
  citations: CitationEntry[];
}

export interface TraceDetail {
  trace: TraceDetailTrace;
  analysis: TraceDetailAnalysis | null;
}
