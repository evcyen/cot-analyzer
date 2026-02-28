import type {
  BloomDirectoryFiles,
  BloomIndexFile,
  BloomUnderstandingFile,
  BloomIdeationFile,
  BloomRolloutFile,
  ParsedBloomBatch,
  BloomTranscriptEvent,
  ParsedHighlight,
  ParsedCitationPart,
} from "@/types/bloom";

interface ParsedMessage {
  id: string;
  content: string | unknown;
  role?: string;
}

interface HighlightData {
  index?: number;
  description?: string;
  parts?: Array<{
    message_id?: string;
    quoted_text?: string;
    position?: number[];
  }>;
}

function resolveMessageIdFromQuote(
  quotedText: string,
  messages: ParsedMessage[],
): { message_id: string; message_index: number } | null {
  const normalizedQuote = quotedText.trim().replace(/\s+/g, " ");
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    // Ensure content is a string (could be object or other type)
    const content =
      typeof msg.content === "string"
        ? msg.content
        : JSON.stringify(msg.content || "");
    const normalizedContent = content.trim().replace(/\s+/g, " ");

    if (normalizedContent.includes(normalizedQuote)) {
      return {
        message_id: msg.id,
        message_index: i,
      };
    }
  }

  return null;
}

function parseHighlights(
  highlightsData: unknown[],
  messages: ParsedMessage[],
): ParsedHighlight[] {
  if (!Array.isArray(highlightsData)) {
    return [];
  }

  return highlightsData.map((item) => {
    const highlight = item as HighlightData;
    const parts: ParsedCitationPart[] = [];

    // Collect all quoted text from parts for the top-level quoted_text field
    let combinedQuotedText = "";

    if (Array.isArray(highlight.parts)) {
      highlight.parts.forEach((part, partIndex) => {
        const msgId = part.message_id;
        const quotedText = part.quoted_text || "";

        // Accumulate quoted text
        if (quotedText) {
          if (combinedQuotedText) combinedQuotedText += "\n\n";
          combinedQuotedText += quotedText;
        }

        let resolvedId: string | null = null;
        let messageIndex: number | null = null;
        let resolutionMethod: "direct" | "resolved_from_quote" | "unknown" =
          "unknown";

        if (msgId === "unknown" && quotedText) {
          // Try to resolve from quoted text
          const resolved = resolveMessageIdFromQuote(quotedText, messages);
          if (resolved) {
            resolvedId = resolved.message_id;
            messageIndex = resolved.message_index;
            resolutionMethod = "resolved_from_quote";
          }
        } else if (msgId && msgId !== "unknown") {
          resolvedId = msgId;
          // Find message index
          const msgIdx = messages.findIndex((m) => m.id === msgId);
          messageIndex = msgIdx >= 0 ? msgIdx : null;
          resolutionMethod = "direct";
        }

        parts.push({
          part_index: partIndex,
          message_id: resolvedId,
          message_index: messageIndex,
          tool_call_id: null,
          tool_arg: null,
          resolution_method: resolutionMethod,
        });
      });
    }

    return {
      highlight_index: highlight.index ?? 0,
      quoted_text: combinedQuotedText,
      reasoning: highlight.description || "",
      parts,
    };
  });
}

export function parseBloomDirectory(
  files: BloomDirectoryFiles,
): ParsedBloomBatch {
  const indexData = files.index as BloomIndexFile;
  const understandingData = files.understanding as BloomUnderstandingFile;
  const ideationData = files.ideation as BloomIdeationFile;
  const rolloutData = files.rollout as BloomRolloutFile;
  const judgmentData = files.judgment as {
    judgments: Array<{
      variation_number: number;
      repetition_number: number;
      summary: string;
    }>;
  };

  const diversityMatch = indexData.metajudge.response.match(
    /<diversity_score>(\d+)<\/diversity_score>/,
  );
  const diversityScore = diversityMatch
    ? parseInt(diversityMatch[1], 10)
    : null;

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
    variation_dimensions: ideationData.variation_dimensions || [],
    metajudge_model: understandingData.model,
  };

  const understanding = {
    understanding_text: understandingData.understanding,
    understanding_reasoning: understandingData.understanding_reasoning,
    scientific_motivation: understandingData.scientific_motivation,
    model: understandingData.model,
    temperature: understandingData.temperature,
    evaluator_reasoning_effort: understandingData.evaluator_reasoning_effort,
  };

  const scenarios = ideationData.variations.map((variation, idx) => {
    const dimensionMatch = variation.description.match(
      /<dimension>(.*?)<\/dimension>/,
    );
    const dimensions = dimensionMatch ? [dimensionMatch[1]] : [];

    return {
      scenario_number: idx + 1,
      description: variation.description.replace(
        /<dimension>.*?<\/dimension>\s*/,
        "",
      ),
      variation_dimensions: dimensions,
    };
  });

  const traces = indexData.transcripts.map((transcript) => {
    const filenameMatch = transcript._filePath.match(/v(\d+)r(\d+)/);
    const variationNumber = filenameMatch ? parseInt(filenameMatch[1], 10) : 1;
    const repetitionNumber = filenameMatch ? parseInt(filenameMatch[2], 10) : 1;

    const fullTranscript = files.transcripts[transcript.id] as {
      events?: unknown[];
      metadata?: {
        target_model?: string;
        updated_at?: string;
        version?: string;
        target_tools?: unknown[];
        target_system_prompt?: string;
        judge_output?: {
          highlights?: unknown[];
          justification?: string;
        };
      };
    };

    const events = fullTranscript?.events || [];
    const messages: ParsedMessage[] = Array.isArray(events)
      ? (events as BloomTranscriptEvent[])
          .filter(
            (event) =>
              event.type === "transcript_event" &&
              event.edit?.operation === "add" &&
              event.edit?.message,
          )
          .map((event) => {
            const msg = event.edit!.message!;
            return {
              id: msg.id,
              content: msg.content,
              role: msg.role,
            };
          })
      : [];

    const highlights = parseHighlights(
      fullTranscript?.metadata?.judge_output?.highlights || [],
      messages,
    );

    // Get full summary from judgment.json (not truncated like in _index.json)
    const fullSummary =
      judgmentData.judgments.find(
        (j) =>
          j.variation_number === variationNumber &&
          j.repetition_number === repetitionNumber,
      )?.summary || transcript.summary;

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
      summary: fullSummary,
      updated_at: fullTranscript?.metadata?.updated_at || null,
      version: fullTranscript?.metadata?.version || null,
      target_tools: fullTranscript?.metadata?.target_tools || null,
      target_system_prompt:
        fullTranscript?.metadata?.target_system_prompt || null,
      judge_justification:
        fullTranscript?.metadata?.judge_output?.justification || null,
      highlights,
    };
  });

  return {
    batch,
    understanding,
    scenarios,
    traces,
  };
}

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
