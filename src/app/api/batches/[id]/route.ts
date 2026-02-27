import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import type { BatchDetail } from "@/types/batches";

/**
 * GET /api/batches/[id]
 * Returns batch metadata including eval-level stats when present.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { data, error } = await supabase
      .from("batches")
      .select(
        "id, name, created_at, ingest_source, started_at, completed_at, model_usage",
      )
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("[GET /api/batches/[id]]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }
    return NextResponse.json(data as BatchDetail);
  } catch (err) {
    console.error("[GET /api/batches/[id]]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
