/**
 * Batch upload use case: parse uploaded files and persist batch + traces + analyses.
 * Orchestrates parsers and entity services; format (e.g. Petri) is an implementation detail.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { parsePetriEvalLog } from "@/lib/parsers/petri";
import { createBatch } from "@/services/batches";
import { createTrace } from "@/services/traces";
import { createAnalysis } from "@/services/analyses";
import { createScoresForAnalysis } from "@/services/scores";
import { createCitationsForAnalysis } from "@/services/citations";
import type {
  ParsedSample,
  UploadBatchParams,
  UploadBatchResult,
} from "@/types/petri";

export type { UploadBatchParams, UploadBatchResult } from "@/types/petri";

/** Parsed files ready to persist (before DB write). */
export interface ParsedUpload {
  samples: ParsedSample[];
  originalFilenames: string[];
}

/**
 * Parse uploaded files as Petri EvalLogs. Skips non-JSON files.
 * Throws on first file that is JSON but not a valid Petri EvalLog.
 */
export async function parsePetriFiles(files: File[]): Promise<ParsedUpload> {
  const samples: ParsedSample[] = [];
  const originalFilenames: string[] = [];

  for (const file of files) {
    if (!(file instanceof File)) continue;
    originalFilenames.push(file.name);

    let json: unknown;
    try {
      json = JSON.parse(await file.text());
    } catch {
      continue;
    }

    try {
      const parsed = parsePetriEvalLog(json);
      samples.push(...parsed.samples);
    } catch (e) {
      const message = e instanceof Error ? e.message : "parse error";
      throw new Error(`Invalid Petri EvalLog in ${file.name}: ${message}`);
    }
  }

  return { samples, originalFilenames };
}

/**
 * Return a function that assigns scenario_id (1, 2, 3, …) by distinct raw_input within a batch.
 */
export function buildScenarioIdAssigner(): (rawInput: string | null) => number {
  const map = new Map<string, number>();
  let next = 1;
  return (rawInput: string | null) => {
    const key = rawInput ?? "";
    if (!map.has(key)) map.set(key, next++);
    return map.get(key)!;
  };
}

/**
 * Upload a batch: parse files, create batch and all traces, analyses, scores, and citations.
 * Currently supports Petri EvalLog format only.
 */
export async function uploadBatch(
  supabase: SupabaseClient,
  params: UploadBatchParams,
): Promise<UploadBatchResult> {
  const { batchName, files } = params;

  const { samples, originalFilenames } = await parsePetriFiles(files);

  if (samples.length === 0) {
    throw new Error("No valid samples in the provided files");
  }

  const getScenarioId = buildScenarioIdAssigner();
  const batchId = await createBatch(supabase, batchName, originalFilenames);
  let traceCount = 0;

  for (const sample of samples) {
    const scenarioId = getScenarioId(sample.trace.raw_input);
    const traceId = await createTrace(supabase, batchId, sample, scenarioId);
    traceCount++;

    if (sample.analysis) {
      const analysisId = await createAnalysis(
        supabase,
        traceId,
        sample.analysis.overall_justification,
        sample.analysis.judge_model,
      );
      await createScoresForAnalysis(
        supabase,
        analysisId,
        sample.analysis.scores,
      );
      await createCitationsForAnalysis(
        supabase,
        analysisId,
        sample.analysis.citations,
      );
    }
  }

  return { batch_id: batchId, trace_count: traceCount };
}
