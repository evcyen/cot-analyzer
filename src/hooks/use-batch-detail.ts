"use client";

import { useState, useEffect, useCallback } from "react";
import type { BatchDetail } from "@/types/batches";

export function useBatchDetail(batchId: string | null): {
  batch: BatchDetail | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} {
  const [batch, setBatch] = useState<BatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBatch = useCallback(async () => {
    if (!batchId) {
      setBatch(null);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/petri/${batchId}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Batch not found");
      setBatch(data as BatchDetail);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load batch");
      setBatch(null);
    } finally {
      setLoading(false);
    }
  }, [batchId]);

  useEffect(() => {
    fetchBatch();
  }, [fetchBatch]);

  return { batch, loading, error, refetch: fetchBatch };
}
