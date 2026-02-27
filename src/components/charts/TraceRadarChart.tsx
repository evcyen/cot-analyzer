"use client";

import { useMemo, useState } from "react";
import { PolarAngleAxis, PolarGrid, Radar, RadarChart } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { DimensionInfo, TraceRow } from "@/types/batches";

interface TraceRadarChartProps {
  traces: TraceRow[];
  dimensions: DimensionInfo[];
  maxTraces?: number;
  className?: string;
}

function generateChartConfig(
  selectedTraces: Array<{ trace: TraceRow; originalIndex: number }>,
) {
  const config: Record<string, { label: string; color: string }> = {};
  const colors = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
  ];

  selectedTraces.forEach(({ originalIndex }, idx) => {
    const traceKey = `trace_${idx}`;
    config[traceKey] = {
      label: `Trace #${originalIndex + 1}`,
      color: colors[idx % colors.length],
    };
  });

  return config;
}

export function TraceRadarChart({
  traces,
  dimensions,
  maxTraces = 5,
  className,
}: TraceRadarChartProps) {
  const [selectedTraceIds, setSelectedTraceIds] = useState<Set<string>>(() => {
    return new Set(traces.slice(0, maxTraces).map((t) => t.trace_id));
  });

  const toggleTrace = (traceId: string) => {
    setSelectedTraceIds((prev) => {
      const next = new Set(prev);
      if (next.has(traceId)) {
        next.delete(traceId);
      } else if (next.size < maxTraces) {
        next.add(traceId);
      }
      return next;
    });
  };

  const { radarData, chartConfig, visibleTraces } = useMemo(() => {
    const selectedTracesWithIndex = traces
      .map((trace, originalIndex) => ({ trace, originalIndex }))
      .filter(({ trace }) => selectedTraceIds.has(trace.trace_id));

    const data = dimensions.map((dim) => {
      const dataPoint: Record<string, string | number> = {
        dimension: dim.display_name ?? dim.name,
      };

      selectedTracesWithIndex.forEach(({ trace }, idx) => {
        const traceKey = `trace_${idx}`;
        dataPoint[traceKey] = trace.scores[dim.name] ?? 0;
      });

      return dataPoint;
    });

    const config = generateChartConfig(selectedTracesWithIndex);

    return {
      radarData: data,
      chartConfig: config,
      visibleTraces: selectedTracesWithIndex.map(({ trace }) => trace),
    };
  }, [traces, dimensions, selectedTraceIds]);

  if (dimensions.length === 0 || traces.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex gap-4", className)}>
      <Card className="w-1/4">
        <CardHeader>
          <CardTitle>Select Traces</CardTitle>
          <CardDescription>
            Choose up to {maxTraces} traces to display
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea>
            <div className="space-y-3">
              {traces.map((trace, idx) => {
                const isSelected = selectedTraceIds.has(trace.trace_id);
                const isDisabled =
                  !isSelected && selectedTraceIds.size >= maxTraces;

                return (
                  <div
                    key={trace.trace_id}
                    className="flex items-start space-x-2"
                  >
                    <Checkbox
                      className="mt-0.5 cursor-pointer"
                      id={`trace-${trace.trace_id}`}
                      checked={isSelected}
                      disabled={isDisabled}
                      onCheckedChange={() => toggleTrace(trace.trace_id)}
                    />
                    <Label
                      htmlFor={`trace-${trace.trace_id}`}
                      className={`cursor-pointer ${
                        isDisabled ? "text-muted-foreground" : ""
                      } flex flex-col gap-0 items-start`}
                    >
                      <span className="font-medium text-sm">#{idx + 1}</span>
                      {trace.model && (
                        <span className="text-muted-foreground text-xs">
                          {trace.model}
                        </span>
                      )}
                      {trace.scenario_summary && (
                        <span className="text-muted-foreground text-xs truncate">
                          {trace.scenario_summary}
                        </span>
                      )}
                    </Label>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="w-3/4">
        <CardHeader>
          <CardTitle>Trace Score Profiles</CardTitle>
          <CardDescription>
            How do the scores for each trace compare to each other across all
            dimensions?
          </CardDescription>
        </CardHeader>
        <CardContent>
          {visibleTraces.length > 0 ? (
            <ChartContainer config={chartConfig}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="dimension" tickLine={false} />
                {visibleTraces.map((_, idx) => {
                  const traceKey = `trace_${idx}`;
                  return (
                    <Radar
                      key={traceKey}
                      dataKey={traceKey}
                      stroke={`var(--color-${traceKey})`}
                      fill={`var(--color-${traceKey})`}
                      fillOpacity={0.2}
                    />
                  );
                })}
                <ChartTooltip content={<ChartTooltipContent />} />
              </RadarChart>
            </ChartContainer>
          ) : (
            <div className="h-[500px] flex items-center justify-center text-muted-foreground">
              Select at least one trace to display
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
