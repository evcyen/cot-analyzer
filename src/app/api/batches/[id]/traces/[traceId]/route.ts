import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getTraceDetail } from "@/services/trace-detail";

/**
 * GET /api/batches/[id]/traces/[traceId]
 * Returns one trace with messages, analysis (overall justification, scores with dimension names and justifications), and citations.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; traceId: string }> },
) {
  try {
    const { id: batchId, traceId } = await params;

    const { data: batch } = await supabase
      .from("petri_batches")
      .select("id")
      .eq("id", batchId)
      .maybeSingle();
    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    const detail = await getTraceDetail(supabase, batchId, traceId);
    if (!detail) {
      return NextResponse.json({ error: "Trace not found" }, { status: 404 });
    }

    return NextResponse.json(detail);
  } catch (err) {
    console.error("[GET /api/batches/[id]/traces/[traceId]]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
