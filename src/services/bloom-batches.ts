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
        })),
      );

    if (scenariosError) throw scenariosError;
  }

  let traceCount = 0;
  for (const trace of parsed.traces) {
    const { error: traceError } = await supabase
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
        behavior_presence: trace.scores.behavior_presence ?? null,
        unrealism: trace.scores.unrealism ?? null,
        evaluation_awareness: trace.scores.evaluation_awareness ?? null,
        evaluation_invalidity: trace.scores.evaluation_invalidity ?? null,
      });

    if (traceError) throw traceError;
    traceCount++;
  }

  return {
    batch_id: batchId,
    trace_count: traceCount,
  };
}
