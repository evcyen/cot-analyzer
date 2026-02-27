import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { uploadBatch } from "@/lib/batches/upload";
import { validateUploadForm } from "@/helpers/upload-batch";

/**
 * POST /api/batches/upload
 * Accepts multipart/form-data: name (string), files (Petri EvalLog JSON files).
 * Delegates to uploadBatch for parsing and DB writes.
 */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const name = formData.get("name");
    const files = formData.getAll("files");

    const validation = validateUploadForm(name, files);
    if (!validation.ok) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status },
      );
    }

    const result = await uploadBatch(supabase, {
      batchName: validation.batchName,
      files: validation.files,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[POST /api/batches/upload]", err);
    const message =
      err instanceof Error ? err.message : "Internal server error";
    const status =
      message.startsWith("Invalid Petri") ||
      message.startsWith("No valid samples")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
