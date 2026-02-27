export type UploadBatchValidation =
  | { ok: true; batchName: string; files: File[] }
  | { ok: false; error: string; status: number };

/**
 * Validate name and files from multipart form data for batch upload.
 */
export function validateUploadForm(
  name: FormDataEntryValue | null,
  files: FormDataEntryValue[],
): UploadBatchValidation {
  if (!name || typeof name !== "string") {
    return { ok: false, error: "Missing or invalid batch name", status: 400 };
  }

  const batchName = name.trim();
  const fileList = files.filter((f): f is File => f instanceof File);

  if (fileList.length === 0) {
    return { ok: false, error: "No files provided", status: 400 };
  }

  return { ok: true, batchName, files: fileList };
}
