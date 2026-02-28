/**
 * Batch upload use case: parse uploaded files and persist batch + traces + analyses.
 * Orchestrates parsers and entity services; supports both Petri and Bloom formats.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { parsePetriEvalLog, mergeEvalLogStats } from "@/lib/parsers/petri";
import { parseBloomDirectory, validateBloomFiles } from "@/lib/parsers/bloom";
import { createBatch } from "@/services/batches";
import { createTrace } from "@/services/traces";
import { createAnalysis } from "@/services/analyses";
import { createScoresForAnalysis } from "@/services/scores";
import { createCitationsForAnalysis } from "@/services/citations";
import { createBloomBatch } from "@/services/bloom-batches";
import type {
  ParsedEvalLogStats,
  ParsedSample,
  UploadBatchParams,
  UploadBatchResult,
} from "@/types/petri";

export type { UploadBatchParams, UploadBatchResult } from "@/types/petri";

export interface UploadBloomBatchParams {
  batchName: string;
  files: File[];
}

export interface UploadBloomBatchResult {
  batch_id: string;
  trace_count: number;
}

/** Parsed files ready to persist (before DB write). */
export interface ParsedUpload {
  samples: ParsedSample[];
  stats: ParsedEvalLogStats | null;
}

/**
 * Parse uploaded files as Petri EvalLogs. Skips non-JSON files.
 * Throws on first file that is JSON but not a valid Petri EvalLog.
 * Merges stats across files for batch-level storage.
 */
export async function parsePetriFiles(files: File[]): Promise<ParsedUpload> {
  const samples: ParsedSample[] = [];
  const allStats: (ParsedEvalLogStats | null)[] = [];

  for (const file of files) {
    if (!(file instanceof File)) continue;

    let json: unknown;
    try {
      json = JSON.parse(await file.text());
    } catch {
      continue;
    }

    try {
      const parsed = parsePetriEvalLog(json);
      samples.push(...parsed.samples);
      allStats.push(parsed.stats ?? null);
    } catch (e) {
      const message = e instanceof Error ? e.message : "parse error";
      throw new Error(`Invalid Petri EvalLog in ${file.name}: ${message}`);
    }
  }

  const stats = mergeEvalLogStats(allStats);
  return { samples, stats };
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
export async function uploadPetriBatch(
  supabase: SupabaseClient,
  params: UploadBatchParams,
): Promise<UploadBatchResult> {
  const { batchName, files } = params;

  const { samples, stats } = await parsePetriFiles(files);

  if (samples.length === 0) {
    throw new Error("No valid samples in the provided files");
  }

  const getScenarioId = buildScenarioIdAssigner();
  const batchId = await createBatch(supabase, batchName, {
    stats,
  });
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

/**
 * Upload a Bloom batch: parse directory files, create batch and all related data
 */
export async function uploadBloomBatch(
  supabase: SupabaseClient,
  params: UploadBloomBatchParams,
): Promise<UploadBloomBatchResult> {
  const { batchName, files } = params;

  // Parse all files
  const fileMap: Record<string, unknown> = {};
  const transcripts: Record<string, unknown> = {};

  for (const file of files) {
    if (!(file instanceof File)) continue;

    let json: unknown;
    try {
      json = JSON.parse(await file.text());
    } catch {
      throw new Error(`Invalid JSON in file: ${file.name}`);
    }

    // Categorize files
    if (file.name === "_index.json") {
      fileMap.index = json;
    } else if (file.name === "understanding.json") {
      fileMap.understanding = json;
    } else if (file.name === "ideation.json") {
      fileMap.ideation = json;
    } else if (file.name === "judgment.json") {
      fileMap.judgment = json;
    } else if (file.name === "rollout.json") {
      fileMap.rollout = json;
    } else if (file.name.startsWith("transcript_")) {
      // Extract transcript ID from filename (e.g., transcript_v1r1.json)
      const transcriptId = file.name.replace(".json", "");
      transcripts[transcriptId] = json;
    }
  }

  // Validate required files
  const fileNames = files.map((f) => f.name);
  const validation = validateBloomFiles(fileNames);
  if (!validation.valid) {
    throw new Error(
      `Missing required Bloom files: ${validation.missing.join(", ")}`,
    );
  }

  // Parse Bloom directory
  const parsed = parseBloomDirectory({
    index: fileMap.index,
    understanding: fileMap.understanding,
    ideation: fileMap.ideation,
    judgment: fileMap.judgment,
    rollout: fileMap.rollout,
    transcripts,
  });

  // Create batch in database
  const result = await createBloomBatch(supabase, batchName, parsed);

  return result;
}
