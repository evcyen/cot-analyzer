import type { SupabaseClient } from "@supabase/supabase-js";

export async function createAnalysis(
  supabase: SupabaseClient,
  traceId: string,
  overallJustification: string,
  judgeModel: string | null,
): Promise<string> {
  const { data, error } = await supabase
    .from("analyses")
    .insert({
      petri_trace_id: traceId,
      overall_justification: overallJustification,
      judge_model: judgeModel,
    })
    .select("id")
    .single();

  if (error) throw error;
  if (!data?.id) throw new Error("Failed to create analysis");
  return data.id;
}
