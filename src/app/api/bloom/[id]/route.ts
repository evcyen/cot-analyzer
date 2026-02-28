import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import type { BloomBatchDetail } from "@/types/bloom";

/**
 * GET /api/bloom/[id]
 * Returns complete Bloom batch data including understanding, scenarios, and transcripts
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // Fetch bloom_batches data
    const { data: batchData, error: batchError } = await supabase
      .from("bloom_batches")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (batchError) {
      console.error("[GET /api/bloom/[id]] batch error:", batchError);
      return NextResponse.json({ error: batchError.message }, { status: 500 });
    }

    if (!batchData) {
      return NextResponse.json(
        { error: "Bloom batch not found" },
        { status: 404 },
      );
    }

    // Fetch bloom_understanding
    const { data: understandingData, error: understandingError } =
      await supabase
        .from("bloom_understanding")
        .select("*")
        .eq("batch_id", id)
        .maybeSingle();

    if (understandingError) {
      console.error(
        "[GET /api/bloom/[id]] understanding error:",
        understandingError,
      );
      return NextResponse.json(
        { error: understandingError.message },
        { status: 500 },
      );
    }

    // Fetch bloom_scenarios
    const { data: scenariosData, error: scenariosError } = await supabase
      .from("bloom_scenarios")
      .select("*")
      .eq("batch_id", id)
      .order("variation_number", { ascending: true });

    if (scenariosError) {
      console.error("[GET /api/bloom/[id]] scenarios error:", scenariosError);
      return NextResponse.json(
        { error: scenariosError.message },
        { status: 500 },
      );
    }

    // Fetch transcripts for this Bloom batch
    const { data: tracesData, error: tracesError } = await supabase
      .from("bloom_transcripts")
      .select(
        "id, transcript_id, summary, behavior_presence, unrealism, evaluation_awareness, evaluation_invalidity, messages, variation_number, repetition_number",
      )
      .eq("batch_id", id)
      .order("variation_number", { ascending: true })
      .order("repetition_number", { ascending: true });

    if (tracesError) {
      console.error("[GET /api/bloom/[id]] traces error:", tracesError);
      return NextResponse.json({ error: tracesError.message }, { status: 500 });
    }

    const result: BloomBatchDetail = {
      batch: batchData,
      understanding: understandingData ?? null,
      scenarios: scenariosData ?? [],
      transcripts: tracesData ?? [],
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error("[GET /api/bloom/[id]]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
