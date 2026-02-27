"use client";

import { useState, useEffect, useCallback } from "react";
import type { TraceDetail } from "@/types/trace-detail";

export function useTraceDetail(
  batchId: string | null,
  traceId: string | null,
): {
  data: TraceDetail | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} {
  const [data, setData] = useState<TraceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!batchId || !traceId) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/batches/${batchId}/traces/${traceId}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Trace not found");
      setData(json as TraceDetail);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load trace");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [batchId, traceId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  return { data, loading, error, refetch: fetchDetail };
}
