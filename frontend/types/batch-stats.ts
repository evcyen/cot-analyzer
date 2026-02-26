/** Per-dimension aggregate stats for batch Stats tab. */
export interface DimensionScoreStats {
  dimension: string;
  label: string;
  mean: number;
  stderr: number;
  poorCount: number;
  poorPct: number;
  n: number;
}

/** One row of the trace×dimension heatmap. */
export interface HeatmapRow {
  traceId: string;
  label: string;
  model: string | null;
  scenario_summary: string | null;
  scores: Record<string, number | null>;
}

/** Result of useBatchOverviewStats. */
export interface BatchOverviewStats {
  traceCount: number;
  uniqueModels: number;
  uniqueScenarios: number;
}
