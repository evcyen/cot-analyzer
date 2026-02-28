import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getBatchTraces } from "@/services/batch-traces";

export type { TraceRow } from "@/types/batches";

/**
 * GET /api/petri/[id]/traces
 * Returns traces for the Petri batch with scores keyed by dimension name.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: batchId } = await params;

    const { data: batch } = await supabase
      .from("petri_batches")
      .select("id")
      .eq("id", batchId)
      .maybeSingle();
    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    const { traces, dimensions } = await getBatchTraces(supabase, batchId);
    return NextResponse.json({ traces, dimensions });
  } catch (err) {
    console.error("[GET /api/petri/[id]/traces]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
