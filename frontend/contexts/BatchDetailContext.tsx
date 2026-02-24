"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useBatchDetail } from "@/hooks/use-batch-detail";
import { useBatchTraces } from "@/hooks/use-batch-traces";
import { GROUP_ORDER, sortDimensionsByGroup } from "@/lib/dimension-groups";
import { isPoorScore } from "@/lib/dimension-score-direction";
import type { BatchDetail, DimensionInfo, TraceRow } from "@/types/batches";

export interface DimensionsByGroupItem {
  group: string;
  dims: DimensionInfo[];
}

interface BatchDetailContextValue {
  batchId: string | null;
  batch: BatchDetail | null;
  traces: TraceRow[];
  dimensions: DimensionInfo[];
  dimensionNames: string[];
  dimensionsSorted: DimensionInfo[];
  dimensionsByGroup: DimensionsByGroupItem[];
  dimensionNamesWithIssues: string[];
  loading: boolean;
  error: string | null;
}

const BatchDetailContext = createContext<BatchDetailContextValue | null>(null);

export function useBatchDetailContext(): BatchDetailContextValue {
  const value = useContext(BatchDetailContext);
  if (value === null) {
    throw new Error(
      "useBatchDetailContext must be used within a BatchDetailProvider",
    );
  }
  return value;
}

interface BatchDetailProviderProps {
  batchId: string | null;
  children: ReactNode;
}

export function BatchDetailProvider({
  batchId,
  children,
}: BatchDetailProviderProps) {
  const {
    batch,
    loading: batchLoading,
    error: batchError,
  } = useBatchDetail(batchId);
  const {
    traces,
    dimensions,
    dimensionNames,
    loading: tracesLoading,
    error: tracesError,
  } = useBatchTraces(batchId);

  const loading = batchLoading || tracesLoading;
  const error = batchError ?? tracesError;

  const dimensionsSorted = useMemo(
    () => sortDimensionsByGroup(dimensions),
    [dimensions],
  );

  const dimensionsByGroup = useMemo((): DimensionsByGroupItem[] => {
    const grouped = new Map<string, DimensionInfo[]>();
    for (const d of dimensionsSorted) {
      const group = d.group ?? "other";
      if (!grouped.has(group)) grouped.set(group, []);
      grouped.get(group)!.push(d);
    }
    const sortedGroups: DimensionsByGroupItem[] = [];
    for (const g of GROUP_ORDER) {
      const dims = grouped.get(g);
      if (dims) sortedGroups.push({ group: g, dims });
    }
    for (const [g, dims] of grouped) {
      if (!GROUP_ORDER.includes(g as (typeof GROUP_ORDER)[number])) {
        sortedGroups.push({ group: g, dims });
      }
    }
    return sortedGroups;
  }, [dimensionsSorted]);

  const dimensionNamesWithIssues = useMemo(() => {
    return dimensionNames.filter((dim) =>
      traces.some((t) => {
        const score = t.scores[dim];
        return typeof score === "number" && isPoorScore(dim, score);
      }),
    );
  }, [dimensionNames, traces]);

  const value = useMemo<BatchDetailContextValue>(
    () => ({
      batchId,
      batch: batch ?? null,
      traces,
      dimensions,
      dimensionNames,
      dimensionsSorted,
      dimensionsByGroup,
      dimensionNamesWithIssues,
      loading,
      error,
    }),
    [
      batchId,
      batch,
      traces,
      dimensions,
      dimensionNames,
      dimensionsSorted,
      dimensionsByGroup,
      dimensionNamesWithIssues,
      loading,
      error,
    ],
  );

  return (
    <BatchDetailContext.Provider value={value}>
      {children}
    </BatchDetailContext.Provider>
  );
}
