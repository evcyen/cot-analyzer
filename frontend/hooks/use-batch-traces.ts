"use client";

import { useState, useEffect, useCallback } from "react";
import type { DimensionInfo, TraceRow } from "@/types/batches";

export function useBatchTraces(batchId: string | null): {
  traces: TraceRow[];
  dimensionNames: string[];
  dimensions: DimensionInfo[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} {
  const [traces, setTraces] = useState<TraceRow[]>([]);
  const [dimensionNames, setDimensionNames] = useState<string[]>([]);
  const [dimensions, setDimensions] = useState<DimensionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTraces = useCallback(async () => {
    if (!batchId) {
      setTraces([]);
      setDimensionNames([]);
      setDimensions([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/batches/${batchId}/traces`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to load traces");
      const dims = data.dimensions ?? [];
      setTraces(data.traces ?? []);
      setDimensions(dims);
      setDimensionNames(dims.map((d: DimensionInfo) => d.name));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load traces");
      setTraces([]);
      setDimensionNames([]);
      setDimensions([]);
    } finally {
      setLoading(false);
    }
  }, [batchId]);

  useEffect(() => {
    fetchTraces();
  }, [fetchTraces]);

  return {
    traces,
    dimensionNames,
    dimensions,
    loading,
    error,
    refetch: fetchTraces,
  };
}
