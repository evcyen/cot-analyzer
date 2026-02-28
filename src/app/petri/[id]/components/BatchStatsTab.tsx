"use client";

import { useBatchDetailContext } from "@/contexts/BatchDetailContext";
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
  usePoorScoreStats,
  useTokenByModelData,
  useTokensPerTraceData,
  useTimeVsScoreData,
} from "@/hooks/use-batch-stats";

export type {
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

export function BatchStatsTab() {
  const { batch, traces, dimensionsSorted } = useBatchDetailContext();

  const overview = useBatchOverviewStats(traces);
  const dimensionStats = useDimensionScoreStats(traces, dimensionsSorted);
  const dimensionsWithPoorScores = dimensionStats.filter((d) => d.poorPct > 0);
  const poorScoreStats = usePoorScoreStats(dimensionStats);
  const { rows: heatmapRows, columns: heatmapColumns } = useHeatmapData(
    traces,
    dimensionsSorted,
  );
  const citationStats = useCitationStats(traces);
  const citationHistogram = useCitationHistogram(traces);
  const durationBins = useDurationHistogram(traces, 10);
  const tokenByModelData = useTokenByModelData(batch);
  const tokensPerTraceData = useTokensPerTraceData(traces);
  const timeVsScoreData = useTimeVsScoreData(traces);

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

      <TraceScoreHeatmap rows={heatmapRows} columns={heatmapColumns} />

      <TraceRadarChart traces={traces} dimensions={dimensionsSorted} />

      <div className="grid grid-cols-3 gap-4">
        <TokenUsageByModelChart data={tokenByModelData} />
        <TokensPerTraceScatterChart data={tokensPerTraceData} />
        <DurationDistributionChart data={durationBins} />
      </div>

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
