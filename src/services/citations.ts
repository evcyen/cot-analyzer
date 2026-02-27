import type { SupabaseClient } from "@supabase/supabase-js";
import type { ParsedCitation } from "@/types/petri";

export async function createCitationsForAnalysis(
  supabase: SupabaseClient,
  analysisId: string,
  citations: ParsedCitation[],
): Promise<void> {
  for (const cit of citations) {
    const { error } = await supabase.from("citations").insert({
      analysis_id: analysisId,
      score_id: null,
      message_id: cit.message_id,
      quoted_text: cit.quoted_text,
      position_start: cit.position_start,
      position_end: cit.position_end,
      note: cit.note,
    });
    if (error) throw error;
  }
}
