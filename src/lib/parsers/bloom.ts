/**
 * Bloom parser: parses Bloom directory structure into database-ready format
 */

import type {
  BloomDirectoryFiles,
  BloomIndexFile,
  BloomUnderstandingFile,
  BloomIdeationFile,
  BloomRolloutFile,
  ParsedBloomBatch,
  BloomTranscriptEvent,
} from "@/types/bloom";

/**
 * Parse Bloom directory files into a structured batch ready for database insertion
 */
export function parseBloomDirectory(
  files: BloomDirectoryFiles,
): ParsedBloomBatch {
  const indexData = files.index as BloomIndexFile;
  const understandingData = files.understanding as BloomUnderstandingFile;
  const ideationData = files.ideation as BloomIdeationFile;
  const rolloutData = files.rollout as BloomRolloutFile;

  // Extract diversity score from metajudge response
  const diversityMatch = indexData.metajudge.response.match(
    /<diversity_score>(\d+)<\/diversity_score>/,
  );
  const diversityScore = diversityMatch
    ? parseInt(diversityMatch[1], 10)
    : null;

  // Parse batch-level data
  const batch = {
    behavior_name: indexData.config.name,
    target_model: indexData.config.target_model,
    auditor_model: indexData.config.auditor_model,
    modality: rolloutData.metadata.modality,
    transcript_count: indexData.config.transcript_count,
    generated_at: indexData.generated_at,
    elicitation_rate: indexData.summary_statistics.elicitation_rate,
    avg_behavior_presence:
      indexData.summary_statistics.average_behavior_presence_score,
    min_behavior_presence:
      indexData.summary_statistics.min_behavior_presence_score,
    max_behavior_presence:
      indexData.summary_statistics.max_behavior_presence_score,
    metajudge_response: indexData.metajudge.response,
    metajudge_justification: indexData.metajudge.justification,
    diversity_score: diversityScore,
  };

  // Parse understanding
  const understanding = {
    understanding_text: understandingData.understanding,
    scientific_motivation: understandingData.scientific_motivation,
    model: understandingData.model,
  };

  // Parse scenarios from ideation
  const scenarios = ideationData.variations.map((variation, idx) => {
    // Extract variation dimension from description if present
    const dimensionMatch = variation.description.match(
      /<dimension>(.*?)<\/dimension>/,
    );
    const dimensions = dimensionMatch
      ? [dimensionMatch[1]]
      : ideationData.variation_dimensions;

    return {
      scenario_number: idx + 1,
      description: variation.description.replace(
        /<dimension>.*?<\/dimension>\s*/,
        "",
      ),
      variation_dimensions: dimensions,
    };
  });

  // Parse traces
  const traces = indexData.transcripts.map((transcript) => {
    // Extract variation and repetition numbers from filename (e.g., transcript_v1r1.json)
    const filenameMatch = transcript._filePath.match(/v(\d+)r(\d+)/);
    const variationNumber = filenameMatch ? parseInt(filenameMatch[1], 10) : 1;
    const repetitionNumber = filenameMatch ? parseInt(filenameMatch[2], 10) : 1;

    // Load full transcript if available
    const fullTranscript = files.transcripts[transcript.id] as {
      events?: unknown[];
      metadata?: {
        target_model?: string;
      };
    };

    // Extract messages from events array (Bloom stores conversation as events)
    const events = fullTranscript?.events || [];
    const messages = Array.isArray(events)
      ? (events as BloomTranscriptEvent[])
          .filter(
            (event) =>
              event.type === "transcript_event" &&
              event.edit?.operation === "add" &&
              event.edit?.message,
          )
          .map((event) => event.edit!.message!)
      : [];

    return {
      transcript_id: transcript.transcript_id,
      scenario_number: variationNumber,
      variation_number: variationNumber,
      repetition_number: repetitionNumber,
      modality: rolloutData.metadata.modality,
      target_model:
        fullTranscript?.metadata?.target_model || rolloutData.metadata.target,
      messages,
      scores: transcript.scores,
      summary: transcript.summary,
    };
  });

  return {
    batch,
    understanding,
    scenarios,
    traces,
  };
}

/**
 * Validate that required Bloom files are present
 */
export function validateBloomFiles(fileNames: string[]): {
  valid: boolean;
  missing: string[];
} {
  const required = [
    "_index.json",
    "understanding.json",
    "ideation.json",
    "judgment.json",
    "rollout.json",
  ];
  const missing = required.filter((name) => !fileNames.includes(name));
  return {
    valid: missing.length === 0,
    missing,
  };
}
