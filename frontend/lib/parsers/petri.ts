/**
 * Parse Petri (petri/audit) Inspect EvalLog JSON into trace + analysis + scores + citations DTOs.
 * EvalLog has top-level: eval, samples (or log.samples). Each sample has input, messages, scores.alignment_judge.
 *
 * Orchestrates: validation (petri-validation), normalized ID attachment (petri-normalized-ids),
 * and analysis extraction (below).
 */

import type {
  ParsedAnalysis,
  ParsedCitation,
  ParsedEvalLog,
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
  ParsedAnalysis,
  ParsedCitation,
  ParsedEvalLog,
  ParsedSample,
  ParsedScore,
  ParsedTrace,
} from "@/types/petri";

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
    };

    const analysis = extractAlignmentJudge(sample);
    if (analysis && judgeModel) {
      analysis.judge_model = judgeModel;
    }

    samples.push({ trace, analysis });
  }

  return {
    evalTask,
    judgeModel: typeof judgeModel === "string" ? judgeModel : null,
    targetModel: typeof targetModel === "string" ? targetModel : null,
    samples,
  };
}
