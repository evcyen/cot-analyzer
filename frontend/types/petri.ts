export interface ParsedTrace {
  model: string | null;
  scenario_summary: string | null;
  raw_input: string | null;
  messages: unknown[];
}

export interface ParsedScore {
  dimension_name: string;
  value: number;
  justification: string | null;
}

export interface ParsedCitation {
  message_id: string;
  quoted_text: string | null;
  position_start: number | null;
  position_end: number | null;
  note: string;
}

export interface ParsedAnalysis {
  overall_justification: string;
  judge_model: string | null;
  scores: ParsedScore[];
  citations: ParsedCitation[];
}

export interface ParsedSample {
  trace: ParsedTrace;
  analysis: ParsedAnalysis | null;
}

export interface ParsedEvalLog {
  evalTask: string | null;
  judgeModel: string | null;
  targetModel: string | null;
  samples: ParsedSample[];
}

export interface UploadBatchResult {
  batch_id: string;
  trace_count: number;
}

export interface UploadBatchParams {
  batchName: string;
  files: File[];
}
