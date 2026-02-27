"use client";

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
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { cn } from "@/lib/utils";

const CHART_CONFIG = {
  count: {
    label: "Traces",
    color: "var(--chart-2)",
  },
} satisfies Record<string, { label: string; color: string }>;

interface DurationBin {
  range: string;
  count: number;
}

interface DurationDistributionChartProps {
  data: DurationBin[];
  className?: string;
}

export function DurationDistributionChart({
  data,
  className,
}: DurationDistributionChartProps) {
  if (data.length === 0) return null;

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle>Trace Duration Distribution</CardTitle>
        <CardDescription>How are trace durations distributed?</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={CHART_CONFIG}>
          <AreaChart data={data} margin={{ bottom: 40 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="range"
              tickLine={false}
              axisLine={false}
              angle={-90}
              textAnchor="end"
            />
            <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent labelKey="range" />}
            />
            <Area
              dataKey="count"
              type="step"
              fill="var(--color-count)"
              fillOpacity={0.4}
              stroke="var(--color-count)"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
