import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  TraceDetail,
  TraceDetailAnalysis,
  TraceDetailTrace,
  TraceMessage,
  ScoreWithDimension,
  CitationEntry,
} from "@/types/trace-detail";
import type { ModelUsageEntry } from "@/types/shared";

interface TraceRow {
  id: string;
  model: string | null;
  scenario_summary: string | null;
  raw_input: string | null;
  messages: unknown;
  model_usage: Record<string, unknown> | null;
  total_time: number | null;
  working_time: number | null;
  started_at: string | null;
  completed_at: string | null;
}

interface AnalysisRow {
  id: string;
  trace_id: string;
  overall_justification: string;
  judge_model: string | null;
}

interface ScoreRow {
  id: string;
  analysis_id: string;
  dimension_id: string;
  value: number;
  justification: string | null;
}

interface DimensionRow {
  id: string;
  name: string;
  display_name: string | null;
}

interface CitationRow {
  id: string;
  score_id: string | null;
  message_id: string;
  quoted_text: string | null;
  note: string;
  position_start: number | null;
  position_end: number | null;
}

export async function getTraceDetail(
  supabase: SupabaseClient,
  batchId: string,
  traceId: string,
): Promise<TraceDetail | null> {
  const { data: traceRow, error: traceErr } = await supabase
    .from("traces")
    .select(
      "id, model, scenario_summary, raw_input, messages, model_usage, total_time, working_time, started_at, completed_at",
    )
    .eq("id", traceId)
    .eq("batch_id", batchId)
    .maybeSingle();

  if (traceErr) throw traceErr;
  if (!traceRow) return null;

  const t = traceRow as TraceRow;
  const messages = Array.isArray(t.messages) ? t.messages : [];
  const trace: TraceDetailTrace = {
    id: t.id,
    model: t.model,
    scenario_summary: t.scenario_summary,
    raw_input: t.raw_input,
    messages: messages.map((m) => ({
      id: (m as TraceMessage).id ?? "",
      role: (m as TraceMessage).role ?? "unknown",
      content: (m as TraceMessage).content,
      ...(typeof m === "object" && m !== null
        ? (m as Record<string, unknown>)
        : {}),
    })),
    model_usage:
      (t.model_usage as Record<string, ModelUsageEntry> | null) ?? undefined,
    total_time: t.total_time ?? undefined,
    working_time: t.working_time ?? undefined,
    started_at: t.started_at ?? undefined,
    completed_at: t.completed_at ?? undefined,
  };

  const { data: analysisRows, error: analysisErr } = await supabase
    .from("analyses")
    .select("id, trace_id, overall_justification, judge_model")
    .eq("trace_id", traceId)
    .limit(1);

  if (analysisErr) throw analysisErr;
  const analysisRow = (analysisRows ?? [])[0] as AnalysisRow | undefined;
  if (!analysisRow) {
    return { trace, analysis: null };
  }

  const analysisId = analysisRow.id;

  const [scoresRes, citationsRes] = await Promise.all([
    supabase
      .from("scores")
      .select("id, analysis_id, dimension_id, value, justification")
      .eq("analysis_id", analysisId),
    supabase
      .from("citations")
      .select(
        "id, score_id, message_id, quoted_text, note, position_start, position_end",
      )
      .eq("analysis_id", analysisId),
  ]);

  if (scoresRes.error) throw scoresRes.error;
  if (citationsRes.error) throw citationsRes.error;

  const scoreRows = (scoresRes.data ?? []) as ScoreRow[];
  const citationRows = (citationsRes.data ?? []) as CitationRow[];
  const dimensionIds = [...new Set(scoreRows.map((s) => s.dimension_id))];

  const { data: dimRows, error: dimErr } = await supabase
    .from("dimensions")
    .select("id, name, display_name")
    .in("id", dimensionIds);
  if (dimErr) throw dimErr;

  const dimMap = new Map<string, DimensionRow>();
  for (const d of (dimRows ?? []) as DimensionRow[]) {
    dimMap.set(d.id, d);
  }

  const scoreIdToDimensionName = new Map<string, string>();
  const scores: ScoreWithDimension[] = scoreRows.map((s) => {
    const dim = dimMap.get(s.dimension_id);
    const name = dim?.name ?? s.dimension_id;
    const displayName = dim?.display_name ?? null;
    scoreIdToDimensionName.set(s.id, name);
    return {
      dimension_id: s.dimension_id,
      dimension_name: name,
      dimension_display_name: displayName,
      value: s.value,
      justification: s.justification,
    };
  });

  const citations: CitationEntry[] = citationRows.map((c) => ({
    id: c.id,
    message_id: c.message_id,
    quoted_text: c.quoted_text,
    note: c.note,
    score_id: c.score_id,
    dimension_name: c.score_id
      ? (scoreIdToDimensionName.get(c.score_id) ?? null)
      : null,
    position_start: c.position_start ?? null,
    position_end: c.position_end ?? null,
  }));

  const analysis: TraceDetailAnalysis = {
    overall_justification: analysisRow.overall_justification,
    judge_model: analysisRow.judge_model,
    scores,
    citations,
  };

  return { trace, analysis };
}
