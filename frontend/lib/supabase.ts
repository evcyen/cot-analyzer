import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.SUPABASE_PROJECT_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_API_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing Supabase env: set SUPABASE_PROJECT_URL and SUPABASE_API_KEY (or NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY) in .env.local",
  );
}

/** Server-side Supabase client for API routes. */
export const supabase = createClient(supabaseUrl, supabaseKey);
