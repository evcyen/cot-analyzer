import type { SupabaseClient } from "@supabase/supabase-js";
import type { ParsedBloomBatch } from "@/types/bloom";

export interface CreateBloomBatchResult {
  batch_id: string;
  trace_count: number;
}

export async function createBloomBatch(
  supabase: SupabaseClient,
  batchName: string,
  parsed: ParsedBloomBatch,
): Promise<CreateBloomBatchResult> {
  const { data: batchData, error: batchError } = await supabase
    .from("bloom_batches")
    .insert({
      name: batchName.trim(),
      behavior_name: parsed.batch.behavior_name,
      target_model: parsed.batch.target_model,
      auditor_model: parsed.batch.auditor_model,
      modality: parsed.batch.modality,
      transcript_count: parsed.batch.transcript_count,
      generated_at: parsed.batch.generated_at,
      elicitation_rate: parsed.batch.elicitation_rate,
      avg_behavior_presence: parsed.batch.avg_behavior_presence,
      min_behavior_presence: parsed.batch.min_behavior_presence,
      max_behavior_presence: parsed.batch.max_behavior_presence,
      metajudge_response: parsed.batch.metajudge_response,
      metajudge_justification: parsed.batch.metajudge_justification,
      diversity_score: parsed.batch.diversity_score,
      variation_dimensions: parsed.batch.variation_dimensions,
      metajudge_model: parsed.batch.metajudge_model,
    })
    .select("id")
    .single();

  if (batchError) throw batchError;
  if (!batchData?.id) throw new Error("Failed to create Bloom batch");

  const batchId = batchData.id;

  const { error: understandingError } = await supabase
    .from("bloom_understanding")
    .insert({
      batch_id: batchId,
      understanding: parsed.understanding.understanding_text,
      understanding_reasoning: parsed.understanding.understanding_reasoning,
      scientific_motivation: parsed.understanding.scientific_motivation,
      model: parsed.understanding.model,
      temperature: parsed.understanding.temperature,
      evaluator_reasoning_effort:
        parsed.understanding.evaluator_reasoning_effort,
    });

  if (understandingError) throw understandingError;

  if (parsed.scenarios.length > 0) {
    const { error: scenariosError } = await supabase
      .from("bloom_scenarios")
      .insert(
        parsed.scenarios.map((scenario) => ({
          batch_id: batchId,
          scenario_number: scenario.scenario_number,
          variation_number: scenario.scenario_number,
          variation_type:
            scenario.variation_dimensions.length > 0
              ? scenario.variation_dimensions[0]
              : null,
          description: scenario.description,
          tools: scenario.tools,
        })),
      );

    if (scenariosError) throw scenariosError;
  }

  let traceCount = 0;
  for (const trace of parsed.traces) {
    const { data: transcriptData, error: traceError } = await supabase
      .from("bloom_transcripts")
      .insert({
        batch_id: batchId,
        model: trace.target_model,
        scenario_id: trace.scenario_number,
        variation_number: trace.variation_number,
        repetition_number: trace.repetition_number,
        messages: trace.messages,
        transcript_id: trace.transcript_id,
        summary: trace.summary,
        scores: trace.scores,
        updated_at: trace.updated_at,
        version: trace.version,
        target_tools: trace.target_tools,
        target_system_prompt: trace.target_system_prompt,
        judge_justification: trace.judge_justification,
      })
      .select("id")
      .single();

    if (traceError) throw traceError;
    if (!transcriptData?.id) throw new Error("Failed to create transcript");

    traceCount++;

    // Insert highlights and citation parts for this transcript
    if (trace.highlights && trace.highlights.length > 0) {
      for (const highlight of trace.highlights) {
        const { data: highlightData, error: highlightError } = await supabase
          .from("bloom_highlights")
          .insert({
            transcript_id: transcriptData.id,
            highlight_index: highlight.highlight_index,
            quoted_text: highlight.quoted_text,
            reasoning: highlight.reasoning,
          })
          .select("id")
          .single();

        if (highlightError) {
          console.error("Failed to insert highlight:", highlightError);
          continue;
        }

        if (!highlightData?.id) continue;

        // Insert citation parts for this highlight
        if (highlight.parts && highlight.parts.length > 0) {
          const partsData = highlight.parts.map((part) => ({
            highlight_id: highlightData.id,
            part_index: part.part_index,
            message_id: part.message_id,
            message_index: part.message_index,
            tool_call_id: part.tool_call_id,
            tool_arg: part.tool_arg,
            resolution_method: part.resolution_method,
          }));

          const { error: partsError } = await supabase
            .from("bloom_citation_parts")
            .insert(partsData);

          if (partsError) {
            console.error("Failed to insert citation parts:", partsError);
          }
        }
      }
    }
  }

  return {
    batch_id: batchId,
    trace_count: traceCount,
  };
}
