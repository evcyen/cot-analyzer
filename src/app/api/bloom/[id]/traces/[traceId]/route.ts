import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import type {
  BloomTranscriptDetail,
  BloomCitationPart,
  BloomHighlight,
} from "@/types/bloom";

/**
 * GET /api/bloom/[id]/traces/[traceId]
 * Returns complete Bloom transcript data including batch info, highlights, and citation parts
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; traceId: string }> },
) {
  try {
    const { id: batchId, traceId } = await params;

    // Fetch transcript
    const { data: transcriptData, error: transcriptError } = await supabase
      .from("bloom_transcripts")
      .select("*")
      .eq("id", traceId)
      .eq("batch_id", batchId)
      .single();

    if (transcriptError) {
      console.error(
        "[GET /api/bloom/[id]/traces/[traceId]] transcript error:",
        transcriptError,
      );
      return NextResponse.json(
        { error: transcriptError.message },
        { status: 500 },
      );
    }

    if (!transcriptData) {
      return NextResponse.json(
        { error: "Transcript not found" },
        { status: 404 },
      );
    }

    // Fetch batch info
    const { data: batchData, error: batchError } = await supabase
      .from("bloom_batches")
      .select("id, name, behavior_name")
      .eq("id", batchId)
      .single();

    if (batchError) {
      console.error(
        "[GET /api/bloom/[id]/traces/[traceId]] batch error:",
        batchError,
      );
      return NextResponse.json({ error: batchError.message }, { status: 500 });
    }

    // Fetch highlights with citation parts
    const { data: highlightsData, error: highlightsError } = await supabase
      .from("bloom_highlights")
      .select("*, bloom_citation_parts(*)")
      .eq("transcript_id", traceId)
      .order("highlight_index", { ascending: true });

    if (highlightsError) {
      console.error(
        "[GET /api/bloom/[id]/traces/[traceId]] highlights error:",
        highlightsError,
      );
      return NextResponse.json(
        { error: highlightsError.message },
        { status: 500 },
      );
    }

    // Assemble result
    const result: BloomTranscriptDetail = {
      id: transcriptData.id,
      transcript_id: transcriptData.transcript_id,
      batch_id: transcriptData.batch_id,
      variation_number: transcriptData.variation_number,
      repetition_number: transcriptData.repetition_number,
      summary: transcriptData.summary,
      scores: transcriptData.scores,
      messages: transcriptData.messages,
      judge_justification: transcriptData.judge_justification,
      created_at: transcriptData.created_at,
      batch: batchData,
      highlights: (highlightsData ?? []).map(
        (
          highlight: BloomHighlight & {
            bloom_citation_parts?: BloomCitationPart[];
          },
        ) => ({
          id: highlight.id,
          transcript_id: highlight.transcript_id,
          highlight_index: highlight.highlight_index,
          quoted_text: highlight.quoted_text,
          reasoning: highlight.reasoning,
          created_at: highlight.created_at,
          parts: (highlight.bloom_citation_parts ?? []).sort(
            (a, b) => a.part_index - b.part_index,
          ),
        }),
      ),
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error("[GET /api/bloom/[id]/traces/[traceId]]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
