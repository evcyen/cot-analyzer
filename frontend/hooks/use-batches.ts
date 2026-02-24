"use client";

import { useState, useEffect, useCallback } from "react";
import type { BatchListItem } from "@/types/batches";

export function useBatches(): {
  batches: BatchListItem[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} {
  const [batches, setBatches] = useState<BatchListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBatches = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/batches");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to load batches");
      setBatches(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load batches");
      setBatches([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  return { batches, loading, error, refetch: fetchBatches };
}
