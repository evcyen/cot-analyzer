"use client";

import { useMemo } from "react";
import { useBatchDetailContext } from "@/contexts/BatchDetailContext";
import { formatDuration } from "@/helpers/formatters";
import { isPoorScore } from "@/lib/dimension-score-direction";
import { ModelUsageTable } from "@/components/ModelUsageTable";
import {
  StatCard,
  MeanScoreBarChart,
  PoorRateBarChart,
  TraceRadarChart,
  TraceScoreHeatmap,
  TokenUsageByModelChart,
  TokensPerTraceScatterChart,
  DurationVsScoreScatterChart,
  DurationDistributionChart,
  CitationDistributionChart,
} from "@/components/charts";
import {
  useBatchOverviewStats,
  useDimensionScoreStats,
  useHeatmapData,
  useCitationStats,
  useCitationHistogram,
  useDurationHistogram,
} from "@/hooks/use-batch-stats";

export { type DimensionScoreStats, type HeatmapRow } from "@/types/batch-stats";

export function BatchStatsTab() {
  const { batch, batchId, traces, dimensionsSorted } = useBatchDetailContext();

  const overview = useBatchOverviewStats(traces);
  const dimensionStats = useDimensionScoreStats(traces, dimensionsSorted);
  const { rows: heatmapRows, columns: heatmapColumns } = useHeatmapData(
    traces,
    dimensionsSorted,
  );
  const citationStats = useCitationStats(traces);
  const citationHistogram = useCitationHistogram(traces);
  const durationBins = useDurationHistogram(traces, 10);

  const dimensionsWithPoorScores = dimensionStats.filter((d) => d.poorPct > 0);

  const poorScoreStats = useMemo(() => {
    const dimensionNames = dimensionsSorted.map((d) => d.name);
    let totalScoreCount = 0;
    let poorScoreCount = 0;
    const poorCountByDimension = new Map<string, number>();

    for (const trace of traces) {
      for (const dim of dimensionNames) {
        const score = trace.scores[dim];
        if (typeof score === "number") {
          totalScoreCount += 1;
          if (isPoorScore(dim, score)) {
            poorScoreCount += 1;
            poorCountByDimension.set(
              dim,
              (poorCountByDimension.get(dim) ?? 0) + 1,
            );
          }
        }
      }
    }

    const poorScorePct =
      totalScoreCount > 0 ? (poorScoreCount / totalScoreCount) * 100 : 0;

    return { poorScoreCount, poorScorePct, totalScoreCount };
  }, [traces, dimensionsSorted]);

  const tokenByModelData = useMemo(() => {
    if (!batch?.model_usage) return [];
    return Object.entries(batch.model_usage).map(([model, usage]) => ({
      model: model.split("/").pop() ?? model,
      input: usage.input_tokens ?? 0,
      output: usage.output_tokens ?? 0,
      reasoning: usage.reasoning_tokens ?? 0,
    }));
  }, [batch]);

  const tokensPerTraceData = useMemo(() => {
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

  const timeVsScoreData = useMemo(() => {
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

  if (!batch) return null;

  return (
    <div className="space-y-6">
      <div className="flex w-full gap-4">
        <StatCard title="Num Traces" value={String(overview.traceCount)} />
        <StatCard title="Num Models" value={String(overview.uniqueModels)} />
        <StatCard
          title="Num Scenarios"
          value={String(overview.uniqueScenarios)}
        />
      </div>

      {/* Row 1: Mean Scores Chart + Poor Rate Chart + Overview Stats */}
      <div className="flex flex-col space-y-4">
        {dimensionStats.length > 0 && (
          <>
            <MeanScoreBarChart
              data={dimensionStats}
              poorScoreCount={poorScoreStats.poorScoreCount}
              poorScorePct={poorScoreStats.poorScorePct}
            />
            <PoorRateBarChart
              className="w-2/3"
              data={dimensionsWithPoorScores}
            />
          </>
        )}
      </div>

      {/* Row 2: Score Heatmap */}
      <TraceScoreHeatmap rows={heatmapRows} columns={heatmapColumns} />

      {/* Row 3: Trace Score Profiles Radar */}
      <TraceRadarChart traces={traces} dimensions={dimensionsSorted} />

      {/* Row 4: Token Usage + Output vs Input */}
      <div className="grid grid-cols-3 gap-4">
        <TokenUsageByModelChart data={tokenByModelData} />
        <TokensPerTraceScatterChart data={tokensPerTraceData} />
        <DurationDistributionChart data={durationBins} />
      </div>

      {/* Row 6: Token Usage Table */}
      <div className="grid grid-cols-3 gap-4">
        <DurationVsScoreScatterChart
          className="col-span-1"
          data={timeVsScoreData}
        />
        <ModelUsageTable
          className="col-span-2"
          modelUsage={batch.model_usage}
        />
      </div>

      {/* Row 7: Citations Chart + Citation Stats */}
      <div className="flex gap-4">
        <CitationDistributionChart data={citationHistogram} className="w-2/3" />
        <div className="flex flex-col gap-4 w-1/3">
          <StatCard
            title="Mean citations"
            value={citationStats.mean.toFixed(1)}
          />
          <StatCard
            title="Median citations"
            value={citationStats.median.toFixed(1)}
          />
          <StatCard title="Max citations" value={String(citationStats.max)} />
        </div>
      </div>
    </div>
  );
}
