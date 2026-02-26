"use client";

import { useMemo } from "react";
import { ScatterChart, XAxis, YAxis, Scatter, Rectangle } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import type { HeatmapRow } from "@/types/batch-stats";

interface TraceScoreHeatmapProps {
  rows: HeatmapRow[];
  columns: { name: string; label: string }[];
  className?: string;
}

interface HeatmapDataPoint {
  traceIndex: number;
  dimensionIndex: number;
  traceLabel: string;
  dimensionLabel: string;
  score: number | null;
}

const CELL_SIZE = 24;

const CustomCell = (props: any) => {
  const { xAxis, yAxis } = props;
  const xScale = xAxis?.scale;
  const yScale = yAxis?.scale;

  const cellWidth = xScale ? Math.abs(xScale(1) - xScale(0)) : 24;
  const cellHeight = yScale ? Math.abs(yScale(1) - yScale(0)) : 24;

  return (
    <Rectangle
      {...props}
      width={cellWidth}
      height={cellHeight}
      x={props.cx - cellWidth / 2}
      y={props.cy - cellHeight / 2}
      stroke="blue"
      strokeWidth={0.5}
    />
  );
};

const getScoreColor = (score: number | null) => {
  if (score === null) return "var(--muted)";
  if (score >= 9) {
    return "var(--chart-5)";
  } else if (score >= 8) {
    return "var(--chart-4)";
  } else if (score >= 6) {
    return "var(--chart-3)";
  } else if (score >= 5) {
    return "var(--chart-2)";
  } else if (score >= 4) {
    return "var(--chart-1)";
  } else {
    return "var(--primary-foreground)";
  }
};

const groupByColor = (dataset: HeatmapDataPoint[]) => {
  const groups = new Map<string, HeatmapDataPoint[]>();

  dataset.forEach((point) => {
    const color = getScoreColor(point.score);
    if (!groups.has(color)) {
      groups.set(color, []);
    }
    groups.get(color)!.push(point);
  });

  return Array.from(groups.entries()).map(([color, data]) => ({
    color,
    data,
  }));
};

export function TraceScoreHeatmap({
  rows,
  columns,
  className,
}: TraceScoreHeatmapProps) {
  const { colorGroups } = useMemo(() => {
    const data: HeatmapDataPoint[] = [];

    rows.forEach((row, traceIndex) => {
      columns.forEach((col, dimensionIndex) => {
        data.push({
          traceIndex,
          dimensionIndex,
          traceLabel: row.label,
          dimensionLabel: col.label,
          score: row.scores[col.name] ?? null,
        });
      });
    });

    return {
      colorGroups: groupByColor(data),
    };
  }, [rows, columns]);

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle>Score Heatmap</CardTitle>
        <CardDescription>
          Visual representation of scores across traces and dimensions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-auto">
          <ChartContainer config={{}}>
            <ScatterChart margin={{ bottom: 180 }}>
              <XAxis
                dataKey="dimensionIndex"
                type="number"
                domain={[-0.5, columns.length - 0.5]}
                ticks={columns.map((_, i) => i)}
                tickFormatter={(value) => columns[value]?.label ?? ""}
                angle={-45}
                textAnchor="end"
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                dataKey="traceIndex"
                type="number"
                domain={[-0.5, rows.length - 0.5]}
                ticks={rows.map((_, i) => i)}
                tickFormatter={(value) => rows[value]?.label ?? ""}
                tickLine={false}
                axisLine={false}
              />
              <ChartTooltip
                content={({ payload }) => {
                  const data = payload && payload[0] && payload[0].payload;
                  if (!data) return null;

                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                      <p className="font-semibold">
                        {data.traceLabel} — {data.dimensionLabel}
                      </p>
                      <p className="text-xs">
                        <span className="text-muted-foreground">Score:</span>{" "}
                        {data.score !== null ? data.score : "—"}
                      </p>
                    </div>
                  );
                }}
              />
              {colorGroups.map((group, idx) => (
                <Scatter
                  key={idx}
                  data={group.data}
                  fill={group.color}
                  shape={CustomCell}
                />
              ))}
            </ScatterChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}
