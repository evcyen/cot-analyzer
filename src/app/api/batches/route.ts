import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export interface BatchListItem {
  id: string;
  name: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  trace_count: number;
  models: string[];
}

/**
 * GET /api/batches
 * Returns all batches with name, metadata, trace count, and distinct models.
 */
export async function GET() {
  try {
    const { data, error } = await supabase
      .from("batches")
      .select(
        `
        id,
        name,
        metadata,
        created_at,
        traces ( id, model )
      `,
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[GET /api/batches]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    type Row = {
      id: string;
      name: string;
      metadata: Record<string, unknown> | null;
      created_at: string;
      traces?: Array<{ id: string; model?: string | null }>;
    };
    const batches: BatchListItem[] = ((data ?? []) as Row[]).map((row) => {
      const traces = Array.isArray(row.traces) ? row.traces : [];
      const models = [
        ...new Set(
          traces
            .map((t) => t.model)
            .filter((m): m is string => typeof m === "string" && m.length > 0),
        ),
      ].sort();
      return {
        id: row.id,
        name: row.name,
        metadata: row.metadata as Record<string, unknown> | null,
        created_at: row.created_at,
        trace_count: traces.length,
        models,
      };
    });

    return NextResponse.json(batches);
  } catch (err) {
    console.error("[GET /api/batches]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
