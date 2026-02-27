"use client";

import { useMemo } from "react";
import { isPoorScore } from "@/lib/dimension-score-direction";
import type { DimensionInfo, TraceRow } from "@/types/batches";
import type { ModelUsageEntry } from "@/types/shared";
import type {
  BatchOverviewStats,
  DimensionScoreStats,
  HeatmapRow,
  PoorScoreStats,
  TokenByModelData,
  TokensPerTraceData,
  TimeVsScoreData,
  DurationBin,
  CitationStats,
  CitationBin,
} from "@/types/batch-stats";

// =============================================================================
// OVERVIEW HOOKS
// =============================================================================

export function useBatchOverviewStats(traces: TraceRow[]): BatchOverviewStats {
  return useMemo(() => {
    const n = traces.length;
    const uniqueModels = new Set(
      traces
        .map((t) => t.model)
        .filter((m): m is string => m != null && m !== ""),
    ).size;
    const uniqueScenarios = new Set(
      traces
        .map((t) => t.scenario_summary)
        .filter((s): s is string => s != null && s !== ""),
    ).size;

    return {
      traceCount: n,
      uniqueModels,
      uniqueScenarios,
    };
  }, [traces]);
}

// =============================================================================
// DIMENSION & SCORE HOOKS
// =============================================================================

export function useDimensionScoreStats(
  traces: TraceRow[],
  dimensions: DimensionInfo[],
): DimensionScoreStats[] {
  return useMemo(() => {
    return dimensions.map((dim) => {
      const name = dim.name;
      const label = dim.display_name ?? name;
      const scores = traces
        .map((t) => t.scores[name])
        .filter(
          (s): s is number => typeof s === "number" && Number.isFinite(s),
        );
      const n = scores.length;
      const mean = n > 0 ? scores.reduce((a, b) => a + b, 0) / n : 0;
      const variance =
        n > 1 ? scores.reduce((sum, s) => sum + (s - mean) ** 2, 0) / n : 0;
      const stdDev = Math.sqrt(variance);
      const stderr = n > 0 ? stdDev / Math.sqrt(n) : 0;
      const poorCount =
        n > 0
          ? traces.filter(
              (t) =>
                typeof t.scores[name] === "number" &&
                isPoorScore(name, t.scores[name] as number),
            ).length
          : 0;
      const poorPct = n > 0 ? (poorCount / n) * 100 : 0;
      return {
        dimension: name,
        label,
        mean: Math.round(mean * 100) / 100,
        stderr: Math.round(stderr * 100) / 100,
        poorCount,
        poorPct: Math.round(poorPct * 10) / 10,
        n,
      };
    });
  }, [traces, dimensions]);
}

export function usePoorScoreStats(
  dimensionStats: DimensionScoreStats[],
): PoorScoreStats {
  return useMemo(() => {
    const totalScoreCount = dimensionStats.reduce((sum, d) => sum + d.n, 0);
    const poorScoreCount = dimensionStats.reduce(
      (sum, d) => sum + d.poorCount,
      0,
    );
    const poorScorePct =
      totalScoreCount > 0 ? (poorScoreCount / totalScoreCount) * 100 : 0;

    return { poorScoreCount, poorScorePct, totalScoreCount };
  }, [dimensionStats]);
}

export function useHeatmapData(
  traces: TraceRow[],
  dimensions: DimensionInfo[],
): { rows: HeatmapRow[]; columns: { name: string; label: string }[] } {
  return useMemo(() => {
    const columns = dimensions.map((d) => ({
      name: d.name,
      label: d.display_name ?? d.name,
    }));
    const rows: HeatmapRow[] = traces.map((t, i) => ({
      traceId: t.trace_id,
      label: `#${i + 1}`,
      model: t.model,
      scenario_summary: t.scenario_summary,
      scores: Object.fromEntries(
        dimensions.map((d) => [d.name, t.scores[d.name] ?? null]),
      ),
    }));
    return { rows, columns };
  }, [traces, dimensions]);
}

// =============================================================================
// DURATION HOOKS
// =============================================================================

export function useDurationHistogram(
  traces: TraceRow[],
  binSizeSeconds: number = 10,
): DurationBin[] {
  return useMemo(() => {
    const durations = traces
      .map((t) => t.working_time ?? t.total_time)
      .filter((d): d is number => d != null && d > 0);

    if (durations.length === 0) return [];

    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);
    const startBin = Math.floor(minDuration / binSizeSeconds);
    const endBin = Math.ceil(maxDuration / binSizeSeconds);
    const bins: DurationBin[] = [];

    for (let i = startBin; i < endBin; i++) {
      const minSeconds = i * binSizeSeconds;
      const maxSeconds = (i + 1) * binSizeSeconds;
      const count = durations.filter(
        (d) => d >= minSeconds && d < maxSeconds,
      ).length;
      bins.push({
        range: `${minSeconds}-${maxSeconds}s`,
        count,
        minSeconds,
      });
    }

    return bins;
  }, [traces, binSizeSeconds]);
}

export function useTimeVsScoreData(traces: TraceRow[]): TimeVsScoreData[] {
  return useMemo(() => {
    return traces
      .map((trace, idx) => {
        const scores = Object.values(trace.scores).filter((s) =>
          Number.isFinite(s),
        );
        if (scores.length === 0) return null;
        const meanScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        const duration = trace.working_time ?? trace.total_time;
        if (!duration || duration <= 0) return null;
        return {
          traceNum: idx + 1,
          duration,
          meanScore: Math.round(meanScore * 100) / 100,
        };
      })
      .filter((d): d is NonNullable<typeof d> => d !== null);
  }, [traces]);
}

// =============================================================================
// TOKEN HOOKS
// =============================================================================

export function useTokenByModelData(
  batch: { model_usage?: Record<string, ModelUsageEntry> | null } | null,
): TokenByModelData[] {
  return useMemo(() => {
    if (!batch?.model_usage) return [];
    return Object.entries(batch.model_usage).map(([model, usage]) => ({
      model: model.split("/").pop() ?? model,
      input: usage.input_tokens ?? 0,
      output: usage.output_tokens ?? 0,
      reasoning: usage.reasoning_tokens ?? 0,
    }));
  }, [batch]);
}

export function useTokensPerTraceData(
  traces: TraceRow[],
): TokensPerTraceData[] {
  return useMemo(() => {
    return traces
      .map((trace, idx) => {
        if (!trace.model_usage) return null;
        const usage = Object.values(trace.model_usage)[0];
        if (!usage) return null;
        return {
          traceNum: idx + 1,
          input: usage.input_tokens ?? 0,
          output: usage.output_tokens ?? 0,
          total: (usage.input_tokens ?? 0) + (usage.output_tokens ?? 0),
        };
      })
      .filter((d): d is NonNullable<typeof d> => d !== null);
  }, [traces]);
}

// =============================================================================
// CITATION HOOKS
// =============================================================================

export function useCitationStats(traces: TraceRow[]): CitationStats {
  return useMemo(() => {
    const counts = traces.map((t) => t.citation_count);
    const totalTraces = counts.length;

    if (totalTraces === 0) {
      return {
        mean: 0,
        median: 0,
        max: 0,
        tracesWithCitations: 0,
        totalTraces: 0,
      };
    }

    const sum = counts.reduce((acc, c) => acc + c, 0);
    const mean = sum / totalTraces;
    const tracesWithCitations = counts.filter((c) => c > 0).length;
    const max = Math.max(...counts);

    const sorted = [...counts].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median =
      sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid];

    return { mean, median, max, tracesWithCitations, totalTraces };
  }, [traces]);
}

export function useCitationHistogram(traces: TraceRow[]): CitationBin[] {
  return useMemo(() => {
    const counts = traces.map((t) => t.citation_count);
    if (counts.length === 0) return [];

    // Create bins: 0, 1, 2, 3-5, 6-10, 11-15, 16-20, 21-30, 31+
    const bins: CitationBin[] = [];

    // Bin 0: exactly 0 citations
    const count0 = counts.filter((c) => c === 0).length;
    if (count0 > 0) {
      bins.push({ range: "0", count: count0, minCitations: 0 });
    }

    // Bin 1: exactly 1 citation
    const count1 = counts.filter((c) => c === 1).length;
    if (count1 > 0) {
      bins.push({ range: "1", count: count1, minCitations: 1 });
    }

    // Bin 2: exactly 2 citations
    const count2 = counts.filter((c) => c === 2).length;
    if (count2 > 0) {
      bins.push({ range: "2", count: count2, minCitations: 2 });
    }

    // Bin 3-5
    const count3_5 = counts.filter((c) => c >= 3 && c <= 5).length;
    if (count3_5 > 0) {
      bins.push({ range: "3-5", count: count3_5, minCitations: 3 });
    }

    // Bin 6-10
    const count6_10 = counts.filter((c) => c >= 6 && c <= 10).length;
    if (count6_10 > 0) {
      bins.push({ range: "6-10", count: count6_10, minCitations: 6 });
    }

    // Bin 11-15
    const count11_15 = counts.filter((c) => c >= 11 && c <= 15).length;
    if (count11_15 > 0) {
      bins.push({ range: "11-15", count: count11_15, minCitations: 11 });
    }

    // Bin 16-20
    const count16_20 = counts.filter((c) => c >= 16 && c <= 20).length;
    if (count16_20 > 0) {
      bins.push({ range: "16-20", count: count16_20, minCitations: 16 });
    }

    // Bin 21-30
    const count21_30 = counts.filter((c) => c >= 21 && c <= 30).length;
    if (count21_30 > 0) {
      bins.push({ range: "21-30", count: count21_30, minCitations: 21 });
    }

    // Bin 31+
    const count31plus = counts.filter((c) => c >= 31).length;
    if (count31plus > 0) {
      bins.push({ range: "31+", count: count31plus, minCitations: 31 });
    }

    return bins;
  }, [traces]);
}
