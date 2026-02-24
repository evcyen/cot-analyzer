"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Field, FieldLabel, FieldContent } from "@/components/ui/field";
import { UploadIcon, XIcon, FileIcon } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

export interface UploadBatchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UploadBatchModal({
  open,
  onOpenChange,
}: UploadBatchModalProps) {
  const [files, setFiles] = React.useState<File[]>([]);
  const [batchName, setBatchName] = React.useState("");
  const [status, setStatus] = React.useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const reset = React.useCallback(() => {
    setFiles([]);
    setBatchName("");
    setStatus("idle");
    setErrorMessage(null);
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      if (!next) reset();
      onOpenChange(next);
    },
    [onOpenChange, reset],
  );

  const handleAddFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected?.length) return;
    setFiles((prev) => [...prev, ...Array.from(selected)]);
    e.target.value = "";
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (files.length === 0) {
      setErrorMessage("Add at least one file.");
      setStatus("error");
      return;
    }
    const name =
      batchName.trim() || `Batch from ${new Date().toLocaleDateString()}`;
    setStatus("submitting");
    setErrorMessage(null);

    const formData = new FormData();
    formData.set("name", name);
    files.forEach((f) => formData.append("files", f));

    try {
      const res = await fetch("/api/batches/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErrorMessage(
          data.error ?? data.message ?? `Upload failed (${res.status})`,
        );
        setStatus("error");
        return;
      }
      setStatus("success");
      setTimeout(() => handleOpenChange(false), 800);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Network error");
      setStatus("error");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton>
        <DialogHeader>
          <DialogTitle>Upload batch</DialogTitle>
          <DialogDescription>
            Add Petri eval files. You can select multiple files; they will be
            uploaded as one batch.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <Field>
            <FieldLabel htmlFor="batch-name">Batch name</FieldLabel>
            <FieldContent>
              <Input
                id="batch-name"
                placeholder={`e.g. Batch from ${new Date().toLocaleDateString()}`}
                value={batchName}
                onChange={(e) => setBatchName(e.target.value)}
                disabled={status === "submitting"}
              />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel>Files</FieldLabel>
            <FieldContent className="gap-2">
              <input
                ref={inputRef}
                type="file"
                multiple
                accept=".json,application/json"
                className="hidden"
                onChange={handleAddFiles}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => inputRef.current?.click()}
                disabled={status === "submitting"}
              >
                <UploadIcon className="size-4" />
                Add files
              </Button>

              {files.length > 0 && (
                <ScrollArea className="h-40 w-full rounded-md border border-border">
                  <ul className="p-2 space-y-1">
                    {files.map((file, index) => (
                      <li
                        key={`${file.name}-${index}`}
                        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs bg-muted/50"
                      >
                        <FileIcon className="size-4 shrink-0 text-muted-foreground" />
                        <span
                          className="min-w-0 truncate flex-1"
                          title={file.name}
                        >
                          {file.name}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          className="shrink-0"
                          onClick={() => removeFile(index)}
                          disabled={status === "submitting"}
                          aria-label={`Remove ${file.name}`}
                        >
                          <XIcon className="size-3.5" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              )}
              {files.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No files added yet.
                </p>
              )}
            </FieldContent>
          </Field>

          {status === "error" && errorMessage && (
            <p className="text-xs text-destructive" role="alert">
              {errorMessage}
            </p>
          )}
          {status === "success" && (
            <p
              className="text-xs text-green-600 dark:text-green-500"
              role="status"
            >
              Upload complete.
            </p>
          )}
        </div>

        <DialogFooter showCloseButton={false}>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={status === "submitting"}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={status === "submitting"}>
            {status === "submitting" ? (
              <>
                <Spinner className="size-4" />
                Uploading…
              </>
            ) : (
              "Upload"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
