import type { SupabaseClient } from "@supabase/supabase-js";
import type { TraceRow } from "@/types/batches";

export interface TraceRecord {
  id: string;
  model: string | null;
  scenario_id: number | null;
  scenario_summary: string | null;
  total_time: number | null;
  working_time: number | null;
  model_usage: unknown | null;
}

export interface AnalysisRecord {
  id: string;
  trace_id: string;
}

export interface ScoreRecord {
  id: string;
  analysis_id: string;
  dimension_id: string;
  value: number;
}

export interface DimensionRecord {
  id: string;
  name: string;
  group: string | null;
  display_name: string | null;
  rubric: string | null;
}

async function loadTraces(
  supabase: SupabaseClient,
  batchId: string,
): Promise<TraceRecord[]> {
  const { data, error } = await supabase
    .from("traces")
    .select(
      "id, model, scenario_id, scenario_summary, total_time, working_time, model_usage",
    )
    .eq("petri_batch_id", batchId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

async function loadAnalyses(
  supabase: SupabaseClient,
  traceIds: string[],
): Promise<AnalysisRecord[]> {
  if (traceIds.length === 0) return [];
  const { data, error } = await supabase
    .from("analyses")
    .select("id, trace_id")
    .in("trace_id", traceIds);
  if (error) throw error;
  return data ?? [];
}

async function loadScores(
  supabase: SupabaseClient,
  analysisIds: string[],
): Promise<ScoreRecord[]> {
  if (analysisIds.length === 0) return [];
  const { data, error } = await supabase
    .from("scores")
    .select("id, analysis_id, dimension_id, value")
    .in("analysis_id", analysisIds);
  if (error) throw error;
  return data ?? [];
}

async function loadDimensions(
  supabase: SupabaseClient,
  dimensionIds: string[],
): Promise<
  Map<
    string,
    {
      name: string;
      group: string | null;
      display_name: string | null;
      rubric: string | null;
    }
  >
> {
  if (dimensionIds.length === 0) return new Map();
  const { data, error } = await supabase
    .from("dimensions")
    .select("id, name, group, display_name, rubric")
    .in("id", dimensionIds);
  if (error) throw error;
  const rows = (data ?? []) as DimensionRecord[];
  return new Map(
    rows.map((d) => [
      d.id,
      {
        name: d.name,
        group: d.group ?? null,
        display_name: d.display_name ?? null,
        rubric: d.rubric ?? null,
      },
    ]),
  );
}

async function loadCitationCountsByAnalysis(
  supabase: SupabaseClient,
  analysisIds: string[],
): Promise<Map<string, number>> {
  if (analysisIds.length === 0) return new Map();

  // Query for citations linked to analyses (general evidence)
  const { data: analysisCitations, error: analysisError } = await supabase
    .from("citations")
    .select("analysis_id")
    .in("analysis_id", analysisIds)
    .not("analysis_id", "is", null);
  if (analysisError) throw analysisError;

  // Query for citations linked to scores (dimension-specific evidence)
  // First get scores for these analyses
  const { data: scores, error: scoresError } = await supabase
    .from("scores")
    .select("id, analysis_id")
    .in("analysis_id", analysisIds);
  if (scoresError) throw scoresError;

  const scoreIds = (scores ?? []).map((s: { id: string }) => s.id);
  const scoreToAnalysis = new Map(
    (scores ?? []).map((s: { id: string; analysis_id: string }) => [
      s.id,
      s.analysis_id,
    ]),
  );

  let scoreCitations: { score_id: string }[] = [];
  if (scoreIds.length > 0) {
    const { data, error: scoreError } = await supabase
      .from("citations")
      .select("score_id")
      .in("score_id", scoreIds)
      .not("score_id", "is", null);
    if (scoreError) throw scoreError;
    scoreCitations = data ?? [];
  }

  // Aggregate counts by analysis_id
  const countMap = new Map<string, number>();
  for (const c of analysisCitations ?? []) {
    countMap.set(c.analysis_id, (countMap.get(c.analysis_id) ?? 0) + 1);
  }
  for (const c of scoreCitations) {
    const analysisId = scoreToAnalysis.get(c.score_id);
    if (analysisId) {
      countMap.set(analysisId, (countMap.get(analysisId) ?? 0) + 1);
    }
  }

  return countMap;
}

export interface DimensionInfo {
  name: string;
  group: string | null;
  display_name: string | null;
  rubric: string | null;
}

function buildTraceRows(
  traces: TraceRecord[],
  analyses: AnalysisRecord[],
  scores: ScoreRecord[],
  dimIdToInfo: Map<
    string,
    {
      name: string;
      group: string | null;
      display_name: string | null;
      rubric: string | null;
    }
  >,
  citationCountsByAnalysis: Map<string, number>,
): { rows: TraceRow[]; dimensions: DimensionInfo[] } {
  const analysisIdToTraceId = new Map(analyses.map((a) => [a.id, a.trace_id]));
  const traceScores = new Map<string, Map<string, number>>();
  const traceCitationCounts = new Map<string, number>();

  // Map citation counts from analysis to trace
  for (const analysis of analyses) {
    const citationCount = citationCountsByAnalysis.get(analysis.id) ?? 0;
    if (citationCount > 0) {
      traceCitationCounts.set(analysis.trace_id, citationCount);
    }
  }

  for (const s of scores) {
    const traceId = analysisIdToTraceId.get(s.analysis_id);
    if (!traceId) continue;
    const info = dimIdToInfo.get(s.dimension_id);
    const name = info?.name ?? s.dimension_id;
    if (!traceScores.has(traceId)) traceScores.set(traceId, new Map());
    traceScores.get(traceId)!.set(name, s.value);
  }
  const dimensions: DimensionInfo[] = Array.from(dimIdToInfo.values()).sort(
    (a, b) => a.name.localeCompare(b.name),
  );
  const rows: TraceRow[] = traces.map((t) => {
    const scoreMap = traceScores.get(t.id);
    const scoresObj: Record<string, number> = {};
    if (scoreMap) {
      for (const [name, value] of scoreMap) scoresObj[name] = value;
    }
    return {
      trace_id: t.id,
      model: t.model ?? null,
      scenario_id: t.scenario_id ?? null,
      scenario_summary: t.scenario_summary ?? null,
      scores: scoresObj,
      total_time: t.total_time ?? null,
      working_time: t.working_time ?? null,
      citation_count: traceCitationCounts.get(t.id) ?? 0,
      model_usage: t.model_usage as Record<
        string,
        import("@/types/shared").ModelUsageEntry
      > | null,
    };
  });
  return { rows, dimensions };
}

/**
 * Fetch all traces for a batch with scores keyed by dimension name.
 * Throws on DB error.
 */
export async function getBatchTraces(
  supabase: SupabaseClient,
  batchId: string,
): Promise<{ traces: TraceRow[]; dimensions: DimensionInfo[] }> {
  const traces = await loadTraces(supabase, batchId);
  if (traces.length === 0) {
    return { traces: [], dimensions: [] };
  }

  const traceIds = traces.map((t) => t.id);
  const analyses = await loadAnalyses(supabase, traceIds);
  if (analyses.length === 0) {
    const rows: TraceRow[] = traces.map((t) => ({
      trace_id: t.id,
      model: t.model ?? null,
      scenario_id: t.scenario_id ?? null,
      scenario_summary: t.scenario_summary ?? null,
      scores: {},
      total_time: t.total_time ?? null,
      working_time: t.working_time ?? null,
      citation_count: 0,
      model_usage: t.model_usage as Record<
        string,
        import("@/types/shared").ModelUsageEntry
      > | null,
    }));
    return { traces: rows, dimensions: [] };
  }

  const analysisIds = analyses.map((a) => a.id);
  const scores = await loadScores(supabase, analysisIds);
  const citationCounts = await loadCitationCountsByAnalysis(
    supabase,
    analysisIds,
  );
  const dimensionIds = [...new Set(scores.map((s) => s.dimension_id))];
  const dimIdToInfo = await loadDimensions(supabase, dimensionIds);
  const { rows, dimensions } = buildTraceRows(
    traces,
    analyses,
    scores,
    dimIdToInfo,
    citationCounts,
  );
  return { traces: rows, dimensions };
}
