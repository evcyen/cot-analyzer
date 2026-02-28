import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { uploadPetriBatch, uploadBloomBatch } from "@/lib/batches/upload";
import { validateUploadForm } from "@/helpers/upload-batch";

/**
 * POST /api/batches/upload
 * Accepts multipart/form-data: name (string), sourceType (string), files (JSON files).
 * Supports both Petri (eval files) and Bloom (directory) uploads.
 */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const name = formData.get("name");
    const sourceType = formData.get("sourceType");
    const files = formData.getAll("files");

    const validation = validateUploadForm(name, files);
    if (!validation.ok) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status },
      );
    }

    // Route to appropriate upload handler
    if (sourceType === "bloom") {
      const result = await uploadBloomBatch(supabase, {
        batchName: validation.batchName,
        files: validation.files,
      });
      return NextResponse.json(result);
    } else {
      // Default to Petri
      const result = await uploadPetriBatch(supabase, {
        batchName: validation.batchName,
        files: validation.files,
      });
      return NextResponse.json(result);
    }
  } catch (err) {
    console.error("[POST /api/batches/upload]", err);
    const message =
      err instanceof Error ? err.message : "Internal server error";
    const status =
      message.startsWith("Invalid Petri") ||
      message.startsWith("No valid samples") ||
      message.startsWith("Missing required Bloom") ||
      message.startsWith("Invalid JSON")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
