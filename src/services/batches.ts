import type { SupabaseClient } from "@supabase/supabase-js";
import type { ParsedEvalLogStats } from "@/types/petri";

export interface CreateBatchOptions {
  stats?: ParsedEvalLogStats | null;
}

export async function createBatch(
  supabase: SupabaseClient,
  name: string,
  options: CreateBatchOptions,
): Promise<string> {
  const { stats } = options;
  const { data, error } = await supabase
    .from("petri_batches")
    .insert({
      name: name.trim(),
      started_at: stats?.started_at ?? null,
      completed_at: stats?.completed_at ?? null,
      model_usage: stats?.model_usage ?? null,
    })
    .select("id")
    .single();

  if (error) throw error;
  if (!data?.id) throw new Error("Failed to create batch");
  return data.id;
}
