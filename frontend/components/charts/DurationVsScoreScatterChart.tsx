"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import {
  CartesianGrid,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { cn } from "@/lib/utils";

const CHART_CONFIG = {
  trace: { label: "Trace", color: "var(--chart-4)" },
} satisfies Record<string, { label: string; color: string }>;

export interface TimeVsScoreData {
  traceNum: number;
  duration: number;
  meanScore: number;
}

interface DurationVsScoreScatterChartProps {
  data: TimeVsScoreData[];
  className?: string;
}

export function DurationVsScoreScatterChart({
  data,
  className,
}: DurationVsScoreScatterChartProps) {
  if (data.length === 0) return null;

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle>Duration vs. Mean Score</CardTitle>
        <CardDescription>
          Does the length of a trace affect its average evaluation score?
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={CHART_CONFIG}>
          <ScatterChart>
            <CartesianGrid />
            <XAxis
              type="number"
              dataKey="duration"
              name="Duration (s)"
              tickLine={false}
              axisLine={false}
              label={{
                value: "Duration (seconds)",
                position: "insideBottom",
                offset: -10,
              }}
            />
            <YAxis
              type="number"
              dataKey="meanScore"
              name="Mean score"
              tickLine={false}
              axisLine={false}
              label={{
                value: "Mean score",
                angle: -90,
                position: "center",
              }}
            />
            <ZAxis type="number" dataKey="traceNum" range={[50, 50]} />
            <ChartTooltip
              cursor={{ strokeDasharray: "3 3" }}
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                const data = payload[0].payload;
                return (
                  <div className="rounded-lg border bg-background p-2 shadow-sm">
                    <div className="font-semibold mb-1">
                      Trace #{data.traceNum}
                    </div>
                    <div className="flex flex-col gap-1 text-xs">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: "var(--chart-4)" }}
                        />
                        <span className="text-muted-foreground">Duration:</span>
                        <span className="font-medium">
                          {Number(data.duration).toFixed(1)}s
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: "var(--chart-4)" }}
                        />
                        <span className="text-muted-foreground">
                          Mean score:
                        </span>
                        <span className="font-medium">{data.meanScore}</span>
                      </div>
                    </div>
                  </div>
                );
              }}
            />
            <Scatter data={data} fill="var(--color-trace)" fillOpacity={0.6} />
          </ScatterChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
