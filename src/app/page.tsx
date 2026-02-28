"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { UploadBatchModal } from "@/components/upload-batch-modal";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { UploadIcon, ChevronRightIcon } from "lucide-react";
import { useBatches } from "@/hooks/use-batches";
import { Badge } from "@/components/ui/badge";

export default function Page() {
  const [uploadOpen, setUploadOpen] = useState(false);
  const { batches, loading, error, refetch } = useBatches();

  const handleUploadClose = (open: boolean) => {
    setUploadOpen(open);
    if (!open) refetch();
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        dateStyle: "medium",
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">Batches</h1>
          <Button onClick={() => setUploadOpen(true)}>
            <UploadIcon className="size-4" />
            Upload batch
          </Button>
        </div>

        {loading && (
          <p className="text-muted-foreground text-sm">Loading batches…</p>
        )}
        {error && (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        )}
        {!loading && !error && batches.length === 0 && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-sm">
                No batches yet. Upload Petri or Bloom files to create one.
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setUploadOpen(true)}
              >
                <UploadIcon className="size-4" />
                Upload batch
              </Button>
            </CardContent>
          </Card>
        )}
        {!loading && !error && batches.length > 0 && (
          <ul className="space-y-3">
            {batches.map((batch) => (
              <li key={batch.id}>
                <Link
                  href={
                    batch.source_type === "bloom"
                      ? `/bloom/${batch.id}`
                      : `/petri/${batch.id}`
                  }
                >
                  <Card
                    className={`transition-colors hover:bg-muted/50 ${
                      batch.source_type === "bloom"
                        ? "border-l-4 border-l-purple-500"
                        : "border-l-4 border-l-blue-500"
                    }`}
                  >
                    <CardHeader>
                      <div className="space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle>{batch.name}</CardTitle>
                          <Badge
                            variant={
                              batch.source_type === "bloom"
                                ? "secondary"
                                : "default"
                            }
                            className={
                              batch.source_type === "bloom"
                                ? "bg-purple-100 text-purple-900 dark:bg-purple-900 dark:text-purple-100"
                                : "bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100"
                            }
                          >
                            {batch.source_type === "bloom" ? "Bloom" : "Petri"}
                          </Badge>
                        </div>
                        <CardDescription className="text-xs">
                          {formatDate(batch.created_at)} · {batch.trace_count}{" "}
                          trace{batch.trace_count !== 1 ? "s" : ""}
                        </CardDescription>
                        {batch.models.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {batch.models.map((model) => (
                              <Badge key={model} variant="outline">
                                {model}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardHeader>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      <UploadBatchModal open={uploadOpen} onOpenChange={handleUploadClose} />
    </div>
  );
}
