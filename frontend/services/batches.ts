import type { SupabaseClient } from "@supabase/supabase-js";

export async function createBatch(
  supabase: SupabaseClient,
  name: string,
  originalFilenames: string[],
): Promise<string> {
  const { data, error } = await supabase
    .from("batches")
    .insert({
      name: name.trim(),
      metadata: {
        original_filenames: originalFilenames,
        ingest_source: "petri",
      },
    })
    .select("id")
    .single();

  if (error) throw error;
  if (!data?.id) throw new Error("Failed to create batch");
  return data.id;
}
