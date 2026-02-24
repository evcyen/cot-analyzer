/**
 * Seed or update Supabase dimensions from Petri rubric text.
 *
 * 1. Generate the dimensions JSON (from cot-analyzer repo root):
 *      python scripts/export_petri_dimensions.py
 *    This writes frontend/scripts/petri-dimensions.json from the petri repo.
 *
 * 2. Set Supabase env vars (e.g. in .env, .env.local, or export):
 *      SUPABASE_PROJECT_URL  (or NEXT_PUBLIC_SUPABASE_URL)
 *      SUPABASE_API_KEY      (or NEXT_PUBLIC_SUPABASE_ANON_KEY)
 *
 * 3. Run from frontend directory:
 *      npx tsx scripts/seed-petri-dimensions.ts
 *
 * For each dimension: if it exists, the script updates its rubric (normalized);
 * if not, it inserts a new row with name, display_name, rubric, is_core: false.
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf-8");
  for (const line of content.split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m) {
      const value = m[2].replace(/^["']|["']$/g, "").trim();
      if (!process.env[m[1]]) process.env[m[1]] = value;
    }
  }
}
const cwd = process.cwd();
loadEnvFile(path.join(cwd, ".env"));
loadEnvFile(path.join(cwd, ".env.local"));

const supabaseUrl =
  process.env.SUPABASE_PROJECT_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_API_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error(
    "Set SUPABASE_PROJECT_URL and SUPABASE_API_KEY (or NEXT_PUBLIC_* variants) in .env, .env.local, or env.",
  );
  process.exit(1);
}

/** Normalize rubric: trim lines, remove empty lines, single newlines. */
function normalizeRubric(text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n")
    .trim();
}

function displayName(name: string): string {
  return name
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

async function main() {
  const jsonPath = path.join(process.cwd(), "scripts", "petri-dimensions.json");
  if (!fs.existsSync(jsonPath)) {
    console.error(
      `Missing ${jsonPath}. Run from cot-analyzer root: python scripts/export_petri_dimensions.py`,
    );
    process.exit(1);
  }
  const dimensions = JSON.parse(fs.readFileSync(jsonPath, "utf-8")) as Record<
    string,
    string
  >;

  const supabase = createClient(supabaseUrl!, supabaseKey!);
  let inserted = 0;
  let updated = 0;

  for (const [name, rubricRaw] of Object.entries(dimensions)) {
    const rubric = normalizeRubric(rubricRaw);
    if (!rubric) continue;

    const { data: existing } = await supabase
      .from("dimensions")
      .select("id")
      .eq("name", name)
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      const { error } = await supabase
        .from("dimensions")
        .update({ rubric })
        .eq("id", existing.id);
      if (error) {
        console.error(`Update failed for ${name}:`, error.message);
        continue;
      }
      updated++;
    } else {
      const { error } = await supabase.from("dimensions").insert({
        name,
        display_name: displayName(name),
        rubric,
        is_core: false,
      });
      if (error) {
        console.error(`Insert failed for ${name}:`, error.message);
        continue;
      }
      inserted++;
    }
  }

  console.log(`Done. Inserted: ${inserted}, updated: ${updated}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
