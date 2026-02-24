import type { SupabaseClient } from "@supabase/supabase-js";
import type { TraceRow } from "@/types/batches";

export interface TraceRecord {
  id: string;
  model: string | null;
  scenario_id: number | null;
  scenario_summary: string | null;
}

export interface AnalysisRecord {
  id: string;
  trace_id: string;
}

export interface ScoreRecord {
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
    .select("id, model, scenario_id, scenario_summary")
    .eq("batch_id", batchId)
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
    .select("analysis_id, dimension_id, value")
    .in("analysis_id", analysisIds);
  if (error) throw error;
  return data ?? [];
}

async function loadDimensions(
  supabase: SupabaseClient,
  dimensionIds: string[],
): Promise<Map<string, { name: string; group: string | null; display_name: string | null; rubric: string | null }>> {
  if (dimensionIds.length === 0) return new Map();
  const { data, error } = await supabase
    .from("dimensions")
    .select("id, name, group, display_name, rubric")
    .in("id", dimensionIds);
  if (error) throw error;
  const rows = (data ?? []) as DimensionRecord[];
  return new Map(
    rows.map((d) => [d.id, { name: d.name, group: d.group ?? null, display_name: d.display_name ?? null, rubric: d.rubric ?? null }]),
  );
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
  dimIdToInfo: Map<string, { name: string; group: string | null; display_name: string | null; rubric: string | null }>,
): { rows: TraceRow[]; dimensions: DimensionInfo[] } {
  const analysisIdToTraceId = new Map(analyses.map((a) => [a.id, a.trace_id]));
  const traceScores = new Map<string, Map<string, number>>();
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
    }));
    return { traces: rows, dimensions: [] };
  }

  const analysisIds = analyses.map((a) => a.id);
  const scores = await loadScores(supabase, analysisIds);
  const dimensionIds = [...new Set(scores.map((s) => s.dimension_id))];
  const dimIdToInfo = await loadDimensions(supabase, dimensionIds);
  const { rows, dimensions } = buildTraceRows(
    traces,
    analyses,
    scores,
    dimIdToInfo,
  );
  return { traces: rows, dimensions };
}
