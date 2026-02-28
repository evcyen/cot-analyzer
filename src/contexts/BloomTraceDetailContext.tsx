"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useBloomTraceDetail } from "@/hooks/use-bloom-trace-detail";
import { transformBloomHighlightsToCitations } from "@/lib/adapters/bloom-to-petri-citations";
import type {
  CitationEntry,
  TraceDetailAnalysis,
  TraceDetailTrace,
  TraceMessage,
} from "@/types/trace-detail";

interface BloomTraceDetailContextValue {
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
  summary: string | null;
  scores: Record<string, number>;
  judgeJustification: string | null;
  targetSystemPrompt: string | null;
  variationNumber: number | null;
  repetitionNumber: number | null;
}

const BloomTraceDetailContext =
  createContext<BloomTraceDetailContextValue | null>(null);

export function useBloomTraceDetailContext(): BloomTraceDetailContextValue {
  const value = useContext(BloomTraceDetailContext);
  if (value === null) {
    throw new Error(
      "useBloomTraceDetailContext must be used within a BloomTraceDetailProvider",
    );
  }
  return value;
}

interface BloomTraceDetailProviderProps {
  batchId: string | null;
  traceId: string | null;
  children: ReactNode;
}

export function BloomTraceDetailProvider({
  batchId,
  traceId,
  children,
}: BloomTraceDetailProviderProps) {
  const { data, loading, error } = useBloomTraceDetail(batchId, traceId);

  // Transform Bloom highlights to Petri citation format
  const citations = useMemo(() => {
    if (!data?.highlights) return [];
    return transformBloomHighlightsToCitations(data.highlights);
  }, [data]);

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

  // Adapt Bloom data to match Petri's TraceDetailTrace interface
  const trace = useMemo<TraceDetailTrace | null>(() => {
    if (!data) return null;
    return {
      id: data.id,
      model: data.batch.behavior_name,
      scenario_summary: data.summary,
      raw_input: null,
      messages: data.messages as TraceMessage[],
      created_at: data.created_at,
    };
  }, [data]);

  // Adapt Bloom data to match Petri's TraceDetailAnalysis interface
  const analysis = useMemo<TraceDetailAnalysis | null>(() => {
    if (!data) return null;
    return {
      overall_justification: data.judge_justification ?? "",
      judge_model: null,
      scores: [],
      citations,
    };
  }, [data, citations]);

  const value = useMemo<BloomTraceDetailContextValue>(
    () => ({
      batchId,
      traceId,
      batchName: data?.batch.name ?? null,
      trace,
      analysis,
      loading,
      error,
      citations,
      citedMessageIds,
      citationsByMessageId,
      summary: data?.summary ?? null,
      scores: data?.scores ?? {},
      judgeJustification: data?.judge_justification ?? null,
      targetSystemPrompt: data?.target_system_prompt ?? null,
      variationNumber: data?.variation_number ?? null,
      repetitionNumber: data?.repetition_number ?? null,
    }),
    [
      batchId,
      traceId,
      data?.batch.name,
      data?.summary,
      data?.scores,
      data?.judge_justification,
      data?.target_system_prompt,
      data?.variation_number,
      data?.repetition_number,
      trace,
      analysis,
      loading,
      error,
      citations,
      citedMessageIds,
      citationsByMessageId,
    ],
  );

  return (
    <BloomTraceDetailContext.Provider value={value}>
      {children}
    </BloomTraceDetailContext.Provider>
  );
}
