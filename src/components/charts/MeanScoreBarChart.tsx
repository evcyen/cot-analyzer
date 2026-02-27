"use client";

import { Bar, BarChart, CartesianGrid, ErrorBar, XAxis, YAxis } from "recharts";
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
import { cn } from "@/lib/utils";
import type { DimensionScoreStats } from "@/types/batch-stats";

const CHART_CONFIG = {
  mean: { label: "Mean Score", color: "var(--chart-1)" },
  stderr: { label: "Std. Error", color: "var(--chart-1)" },
};

interface MeanScoreBarChartProps {
  data: DimensionScoreStats[];
  poorScoreCount: number;
  poorScorePct: number;
  className?: string;
}

export function MeanScoreBarChart({
  data,
  poorScoreCount,
  poorScorePct,
  className,
}: MeanScoreBarChartProps) {
  return (
    <Card className={cn("py-0", className)}>
      <CardHeader className="flex flex-col items-stretch border-b p-0! sm:flex-row">
        <div className="flex flex-1 flex-col justify-center px-6 pt-4 pb-3">
          <CardTitle>Mean Scores by Dimension</CardTitle>
          <CardDescription>
            Which dimensions have the highest and lowest mean scores?
          </CardDescription>
        </div>
        <div className="flex">
          <button className="relative z-30 flex flex-1 flex-col justify-center gap-1 text-left even:border-l sm:border-l sm:px-6 sm:py-4 w-48">
            <span className="text-muted-foreground text-xs"># Poor Scores</span>
            <span className="text-lg leading-none font-bold sm:text-2xl">
              {poorScoreCount}
            </span>
          </button>
          <button className="relative z-30 flex flex-1 flex-col justify-center gap-1 text-left even:border-l sm:border-l sm:px-6 sm:py-4 w-48">
            <span className="text-muted-foreground text-xs">% Poor Scores</span>
            <span className="text-lg leading-none font-bold sm:text-2xl">
              {poorScorePct.toFixed(1)}%
            </span>
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={CHART_CONFIG}>
          <BarChart accessibilityLayer data={data} margin={{ bottom: 250 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              angle={-70}
              textAnchor="end"
            />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} />
            <ChartTooltip
              content={<ChartTooltipContent className="w-[200px]" />}
            />
            <Bar dataKey="mean" fill="var(--color-mean)" radius={4}>
              <ErrorBar
                dataKey="stderr"
                stroke="var(--color-mean)"
                direction="y"
                width={6}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
