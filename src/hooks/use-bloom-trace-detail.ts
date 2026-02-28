import { useEffect, useState } from "react";
import type { BloomTranscriptDetail } from "@/types/bloom";

interface UseBloomTraceDetailResult {
  data: BloomTranscriptDetail | null;
  loading: boolean;
  error: string | null;
}

export function useBloomTraceDetail(
  batchId: string | null,
  traceId: string | null,
): UseBloomTraceDetailResult {
  const [data, setData] = useState<BloomTranscriptDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!batchId || !traceId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/bloom/${batchId}/traces/${traceId}`);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to fetch transcript");
        }

        const result = await response.json();

        if (!cancelled) {
          setData(result);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unknown error");
          setData(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [batchId, traceId]);

  return { data, loading, error };
}
