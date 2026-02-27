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
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { cn } from "@/lib/utils";
import type { CitationBin } from "@/hooks/use-batch-stats";

const CHART_CONFIG = {
  count: {
    label: "Traces",
    color: "var(--chart-3)",
  },
} satisfies Record<string, { label: string; color: string }>;

interface CitationDistributionChartProps {
  data: CitationBin[];
  className?: string;
}

export function CitationDistributionChart({
  data,
  className,
}: CitationDistributionChartProps) {
  if (data.length === 0) return null;

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle>Citations per Trace</CardTitle>
        <CardDescription>
          What is the distribution of citations per trace?
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={CHART_CONFIG}>
          <BarChart accessibilityLayer data={data}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="range"
              tickLine={false}
              axisLine={false}
              label={{
                value: "Citations per trace",
                position: "bottom",
                offset: -5,
              }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              domain={[0, "auto"]}
              label={{
                value: "Number of traces",
                angle: -90,
                position: "center",
              }}
            />
            <ChartTooltip content={<ChartTooltipContent labelKey="range" />} />
            <Bar dataKey="count" fill="var(--color-count)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
