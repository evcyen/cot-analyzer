import type { SupabaseClient } from "@supabase/supabase-js";
import type { ParsedSample } from "@/types/petri";

export async function createTrace(
  supabase: SupabaseClient,
  batchId: string,
  sample: ParsedSample,
  scenarioId: number,
): Promise<string> {
  const { data, error } = await supabase
    .from("traces")
    .insert({
      batch_id: batchId,
      model: sample.trace.model,
      scenario_id: scenarioId,
      scenario_summary: sample.trace.scenario_summary,
      raw_input: sample.trace.raw_input,
      messages: sample.trace.messages,
      model_usage: sample.trace.model_usage ?? null,
      total_time: sample.trace.total_time ?? null,
      working_time: sample.trace.working_time ?? null,
      started_at: sample.trace.started_at ?? null,
      completed_at: sample.trace.completed_at ?? null,
    })
    .select("id")
    .single();

  if (error) throw error;
  if (!data?.id) throw new Error("Failed to create trace");
  return data.id;
}
