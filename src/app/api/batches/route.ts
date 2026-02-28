import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import type { BatchListItem } from "@/types/batches";

/**
 * GET /api/batches
 * Returns all batches (Petri + Bloom) with name, trace count, and distinct models.
 */
export async function GET() {
  try {
    const { data: petriData, error: petriError } = await supabase
      .from("petri_batches")
      .select(
        `
        id,
        name,
        created_at,
        petri_traces!petri_traces_batch_id_fkey ( id, model )
      `,
      )
      .order("created_at", { ascending: false });

    if (petriError) {
      console.error("[GET /api/batches] Petri error:", petriError);
      return NextResponse.json({ error: petriError.message }, { status: 500 });
    }

    const { data: bloomData, error: bloomError } = await supabase
      .from("bloom_batches")
      .select(
        `
        id,
        name,
        created_at,
        target_model,
        transcript_count
      `,
      )
      .order("created_at", { ascending: false });

    if (bloomError) {
      console.error("[GET /api/batches] Bloom error:", bloomError);
      return NextResponse.json({ error: bloomError.message }, { status: 500 });
    }

    type PetriRow = {
      id: string;
      name: string;
      created_at: string;
      petri_traces?: Array<{ id: string; model?: string | null }>;
    };
    const petriBatches: BatchListItem[] = ((petriData ?? []) as PetriRow[]).map(
      (row) => {
        const traces = Array.isArray(row.petri_traces) ? row.petri_traces : [];
        const models = [
          ...new Set(
            traces
              .map((t) => t.model)
              .filter(
                (m): m is string => typeof m === "string" && m.length > 0,
              ),
          ),
        ].sort();
        return {
          id: row.id,
          name: row.name,
          created_at: row.created_at,
          trace_count: traces.length,
          models,
          source_type: "petri" as const,
        };
      },
    );

    type BloomRow = {
      id: string;
      name: string;
      created_at: string;
      target_model: string;
      transcript_count: number | null;
    };
    const bloomBatches: BatchListItem[] = ((bloomData ?? []) as BloomRow[]).map(
      (row) => {
        return {
          id: row.id,
          name: row.name,
          created_at: row.created_at,
          trace_count: row.transcript_count ?? 0,
          models: [row.target_model],
          source_type: "bloom" as const,
        };
      },
    );

    const allBatches = [...petriBatches, ...bloomBatches].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    return NextResponse.json(allBatches);
  } catch (err) {
    console.error("[GET /api/batches]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
