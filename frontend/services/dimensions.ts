import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Resolve dimension id by name. If the dimension does not exist, insert it with is_core = false
 * and optional rubric (e.g. from Petri score_descriptions).
 * Data access (repository-style); lives in services per Overview.
 */
export async function ensureDimension(
  supabase: SupabaseClient,
  name: string,
  options?: { rubric?: string; display_name?: string },
): Promise<string> {
  const { data: existing } = await supabase
    .from("dimensions")
    .select("id")
    .eq("name", name)
    .limit(1)
    .maybeSingle();

  if (existing?.id) return existing.id;

  const displayName =
    options?.display_name ??
    name
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");

  const { data: inserted, error } = await supabase
    .from("dimensions")
    .insert({
      name,
      display_name: displayName,
      rubric: null,
      is_core: false,
    })
    .select("id")
    .single();

  if (error) throw error;
  if (!inserted?.id) throw new Error("Failed to insert dimension");
  return inserted.id;
}
