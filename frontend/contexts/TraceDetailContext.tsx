"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useBatchDetail } from "@/hooks/use-batch-detail";
import { useTraceDetail } from "@/hooks/use-trace-detail";
import type {
  CitationEntry,
  TraceDetailAnalysis,
  TraceDetailTrace,
} from "@/types/trace-detail";

interface TraceDetailContextValue {
  batchId: string | null;
  traceId: string | null;
  batchName: string | null;
  trace: TraceDetailTrace | null;
  analysis: TraceDetailAnalysis | null;
  loading: boolean;
  error: string | null;
  citations: CitationEntry[];
  citedMessageIds: Set<string>;
  citationsByMessageId: Map<string, CitationEntry[]>;
}

const TraceDetailContext = createContext<TraceDetailContextValue | null>(null);

export function useTraceDetailContext(): TraceDetailContextValue {
  const value = useContext(TraceDetailContext);
  if (value === null) {
    throw new Error(
      "useTraceDetailContext must be used within a TraceDetailProvider",
    );
  }
  return value;
}

interface TraceDetailProviderProps {
  batchId: string | null;
  traceId: string | null;
  children: ReactNode;
}

export function TraceDetailProvider({
  batchId,
  traceId,
  children,
}: TraceDetailProviderProps) {
  const { batch } = useBatchDetail(batchId);
  const { data, loading, error } = useTraceDetail(batchId, traceId);

  const citations = data?.analysis?.citations ?? [];

  const citedMessageIds = useMemo(() => {
    if (!citations.length) return new Set<string>();
    return new Set(citations.map((c) => c.message_id));
  }, [citations]);

  const citationsByMessageId = useMemo(() => {
    const map = new Map<string, CitationEntry[]>();
    for (const c of citations) {
      const list = map.get(c.message_id) ?? [];
      list.push(c);
      map.set(c.message_id, list);
    }
    return map;
  }, [citations]);

  const value = useMemo<TraceDetailContextValue>(
    () => ({
      batchId,
      traceId,
      batchName: batch?.name ?? null,
      trace: data?.trace ?? null,
      analysis: data?.analysis ?? null,
      loading,
      error,
      citations,
      citedMessageIds,
      citationsByMessageId,
    }),
    [
      batchId,
      traceId,
      batch?.name,
      data?.trace,
      data?.analysis,
      loading,
      error,
      citations,
      citedMessageIds,
      citationsByMessageId,
    ],
  );

  return (
    <TraceDetailContext.Provider value={value}>
      {children}
    </TraceDetailContext.Provider>
  );
}
