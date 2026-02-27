/**
 * Parse Petri (petri/audit) Inspect EvalLog JSON into trace + analysis + scores + citations DTOs.
 * EvalLog has top-level: eval, samples (or log.samples). Each sample has input, messages, scores.alignment_judge.
 *
 * Orchestrates: validation (petri-validation), normalized ID attachment (petri-normalized-ids),
 * and analysis extraction (below).
 */

import type {
  ModelUsageEntry,
  ParsedAnalysis,
  ParsedCitation,
  ParsedEvalLog,
  ParsedEvalLogStats,
  ParsedSample,
  ParsedScore,
  ParsedTrace,
} from "@/types/petri";
import { enrichMessagesWithNormalizedIds } from "./petri-normalized-ids";
import {
  firstLine,
  getEval,
  getModelRoles,
  getSamples,
  isPetriEvalLog,
} from "./petri-validation";

export type {
  ModelUsageEntry,
  ParsedAnalysis,
  ParsedCitation,
  ParsedEvalLog,
  ParsedEvalLogStats,
  ParsedSample,
  ParsedScore,
  ParsedTrace,
} from "@/types/petri";

function parseModelUsage(raw: unknown): Record<string, ModelUsageEntry> | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const result: Record<string, ModelUsageEntry> = {};
  for (const [modelName, val] of Object.entries(obj)) {
    if (!val || typeof val !== "object") continue;
    const v = val as Record<string, unknown>;
    result[modelName] = {
      input_tokens:
        typeof v.input_tokens === "number" ? v.input_tokens : undefined,
      output_tokens:
        typeof v.output_tokens === "number" ? v.output_tokens : undefined,
      total_tokens:
        typeof v.total_tokens === "number" ? v.total_tokens : undefined,
      input_tokens_cache_write:
        typeof v.input_tokens_cache_write === "number"
          ? v.input_tokens_cache_write
          : undefined,
      input_tokens_cache_read:
        typeof v.input_tokens_cache_read === "number"
          ? v.input_tokens_cache_read
          : undefined,
      reasoning_tokens:
        typeof v.reasoning_tokens === "number" ? v.reasoning_tokens : undefined,
      total_cost: typeof v.total_cost === "number" ? v.total_cost : undefined,
    };
  }
  return Object.keys(result).length > 0 ? result : null;
}

function extractEvalLogStats(
  obj: Record<string, unknown>,
): ParsedEvalLogStats | null {
  const stats = obj.stats as Record<string, unknown> | undefined;
  if (!stats || typeof stats !== "object") return null;
  const started_at =
    typeof stats.started_at === "string" ? stats.started_at : null;
  const completed_at =
    typeof stats.completed_at === "string" ? stats.completed_at : null;
  const model_usage = parseModelUsage(stats.model_usage);
  if (started_at === null && completed_at === null && !model_usage) return null;
  return { started_at, completed_at, model_usage };
}

/** Merge stats from multiple EvalLogs (earliest started_at, latest completed_at, sum model_usage per model). */
export function mergeEvalLogStats(
  statsList: (ParsedEvalLogStats | null | undefined)[],
): ParsedEvalLogStats | null {
  const valid = statsList.filter(
    (s): s is ParsedEvalLogStats => s != null && typeof s === "object",
  );
  if (valid.length === 0) return null;
  const startedAtList: string[] = [];
  const completedAtList: string[] = [];
  const model_usage_merged: Record<string, ModelUsageEntry> = {};
  for (const s of valid) {
    if (s.started_at != null) startedAtList.push(s.started_at);
    if (s.completed_at != null) completedAtList.push(s.completed_at);
    if (s.model_usage && typeof s.model_usage === "object") {
      for (const [model, usage] of Object.entries(s.model_usage)) {
        const cur = model_usage_merged[model] ?? {};
        model_usage_merged[model] = {
          input_tokens: (cur.input_tokens ?? 0) + (usage.input_tokens ?? 0),
          output_tokens: (cur.output_tokens ?? 0) + (usage.output_tokens ?? 0),
          total_tokens: (cur.total_tokens ?? 0) + (usage.total_tokens ?? 0),
          input_tokens_cache_write:
            (cur.input_tokens_cache_write ?? 0) +
            (usage.input_tokens_cache_write ?? 0),
          input_tokens_cache_read:
            (cur.input_tokens_cache_read ?? 0) +
            (usage.input_tokens_cache_read ?? 0),
          reasoning_tokens:
            (cur.reasoning_tokens ?? 0) + (usage.reasoning_tokens ?? 0),
          total_cost: (cur.total_cost ?? 0) + (usage.total_cost ?? 0),
        };
      }
    }
  }
  const started_at =
    startedAtList.length > 0
      ? startedAtList.reduce((a, b) => (a < b ? a : b))
      : null;
  const completed_at =
    completedAtList.length > 0
      ? completedAtList.reduce((a, b) => (a > b ? a : b))
      : null;
  return {
    started_at,
    completed_at,
    model_usage:
      Object.keys(model_usage_merged).length > 0 ? model_usage_merged : null,
  };
}

function extractAlignmentJudge(
  sample: Record<string, unknown>,
): ParsedAnalysis | null {
  const scores = sample.scores as Record<string, unknown> | undefined;
  const aj = scores?.alignment_judge as Record<string, unknown> | undefined;
  if (!aj || typeof aj.value !== "object") return null;

  const value = aj.value as Record<string, number>;
  const overallJustification =
    (typeof aj.explanation === "string" ? aj.explanation : null) ||
    (typeof aj.answer === "string" ? aj.answer : "") ||
    "";

  const scoreList: ParsedScore[] = [];
  for (const [dimName, v] of Object.entries(value)) {
    if (typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 10) {
      scoreList.push({
        dimension_name: dimName,
        value: v,
        justification: null,
      });
    }
  }

  const citations: ParsedCitation[] = [];
  const metadata = aj.metadata as Record<string, unknown> | undefined;
  const highlights = metadata?.highlights as
    | Array<{
        parts?: Array<{
          message_id?: string;
          quoted_text?: string;
          position?: [number, number];
        }>;
        description?: string;
      }>
    | undefined;
  if (Array.isArray(highlights)) {
    for (const h of highlights) {
      const note = typeof h.description === "string" ? h.description : "";
      const parts = Array.isArray(h.parts) ? h.parts : [];
      for (const p of parts) {
        const messageId = typeof p.message_id === "string" ? p.message_id : "";
        const position = Array.isArray(p.position) ? p.position : null;
        citations.push({
          message_id: messageId,
          quoted_text: typeof p.quoted_text === "string" ? p.quoted_text : null,
          position_start: position?.[0] ?? null,
          position_end: position?.[1] ?? null,
          note,
        });
      }
    }
  }

  return {
    overall_justification: overallJustification,
    judge_model: null,
    scores: scoreList,
    citations,
  };
}

/**
 * Parse a Petri EvalLog (JSON object). Returns parsed DTOs or throws if invalid.
 */
export function parsePetriEvalLog(json: unknown): ParsedEvalLog {
  if (!isPetriEvalLog(json)) {
    throw new Error(
      "Not a Petri EvalLog: missing eval.task petri/audit or sample scores.alignment_judge",
    );
  }

  const obj = json as Record<string, unknown>;
  const evalObj = getEval(obj);
  const roles = evalObj ? getModelRoles(evalObj) : null;
  const targetModel = roles?.target?.model ?? null;
  const judgeModel = roles?.judge?.model ?? null;
  const evalTask =
    (evalObj?.task as string) ??
    (evalObj?.task_registry_name as string) ??
    null;

  const rawSamples = getSamples(obj);
  const samples: ParsedSample[] = [];

  for (const s of rawSamples) {
    const sample = s as Record<string, unknown>;
    const input = sample.input as string | undefined;
    const rawInput = typeof input === "string" ? input : null;
    const scenarioSummary = rawInput ? firstLine(rawInput, 80) : null;

    const store = sample.store as Record<string, unknown> | undefined;
    const auditorStore = store?.["AuditStore:auditor"] as
      | { messages?: unknown[] }
      | undefined;
    const auditorMessages = Array.isArray(auditorStore?.messages)
      ? auditorStore.messages
      : null;
    let messages: unknown[] = auditorMessages
      ? [...auditorMessages]
      : Array.isArray(sample.messages)
        ? sample.messages
        : [];
    messages = enrichMessagesWithNormalizedIds(messages, sample);

    const trace: ParsedTrace = {
      model: typeof targetModel === "string" ? targetModel : null,
      scenario_summary: scenarioSummary,
      raw_input: rawInput,
      messages,
      model_usage: parseModelUsage(sample.model_usage),
      total_time:
        typeof sample.total_time === "number" ? sample.total_time : null,
      working_time:
        typeof sample.working_time === "number" ? sample.working_time : null,
      started_at:
        typeof sample.started_at === "string" ? sample.started_at : null,
      completed_at:
        typeof sample.completed_at === "string" ? sample.completed_at : null,
    };

    const analysis = extractAlignmentJudge(sample);
    if (analysis && judgeModel) {
      analysis.judge_model = judgeModel;
    }

    samples.push({ trace, analysis });
  }

  const stats = extractEvalLogStats(obj);

  return {
    evalTask,
    judgeModel: typeof judgeModel === "string" ? judgeModel : null,
    targetModel: typeof targetModel === "string" ? targetModel : null,
    samples,
    stats: stats ?? undefined,
  };
}
