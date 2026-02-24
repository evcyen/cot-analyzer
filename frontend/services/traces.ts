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
    })
    .select("id")
    .single();

  if (error) throw error;
  if (!data?.id) throw new Error("Failed to create trace");
  return data.id;
}
