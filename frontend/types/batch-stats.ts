export interface BatchOverviewStats {
  traceCount: number;
  uniqueModels: number;
  uniqueScenarios: number;
}

export interface DimensionScoreStats {
  dimension: string;
  label: string;
  mean: number;
  stderr: number;
  poorCount: number;
  poorPct: number;
  n: number;
}

export interface PoorScoreStats {
  poorScoreCount: number;
  poorScorePct: number;
  totalScoreCount: number;
}

export interface HeatmapRow {
  traceId: string;
  label: string;
  model: string | null;
  scenario_summary: string | null;
  scores: Record<string, number | null>;
}

export interface TokenByModelData {
  model: string;
  input: number;
  output: number;
  reasoning: number;
}

export interface TokensPerTraceData {
  traceNum: number;
  input: number;
  output: number;
  total: number;
}

export interface DurationBin {
  range: string;
  count: number;
  minSeconds: number;
}

export interface TimeVsScoreData {
  traceNum: number;
  duration: number;
  meanScore: number;
}

export interface CitationStats {
  mean: number;
  median: number;
  max: number;
  tracesWithCitations: number;
  totalTraces: number;
}

export interface CitationBin {
  range: string;
  count: number;
  minCitations: number;
}
