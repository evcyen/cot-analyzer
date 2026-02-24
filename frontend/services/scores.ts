import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureDimension } from "@/services/dimensions";
import type { ParsedScore } from "@/types/petri";

export async function createScoresForAnalysis(
  supabase: SupabaseClient,
  analysisId: string,
  scores: ParsedScore[],
): Promise<void> {
  for (const score of scores) {
    const dimensionId = await ensureDimension(supabase, score.dimension_name);
    const { error } = await supabase.from("scores").insert({
      analysis_id: analysisId,
      dimension_id: dimensionId,
      value: score.value,
      justification: score.justification,
    });
    if (error) throw error;
  }
}
