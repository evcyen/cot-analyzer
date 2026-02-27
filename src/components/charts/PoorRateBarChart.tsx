"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  XAxis,
  YAxis,
} from "recharts";
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
  poorPct: { label: "Poor %", color: "var(--chart-2)" },
  label: { color: "var(--background)" },
};

interface PoorRateBarChartProps {
  data: DimensionScoreStats[];
  className?: string;
}

export function PoorRateBarChart({ data, className }: PoorRateBarChartProps) {
  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle>Poor Rate by Dimension</CardTitle>
        <CardDescription>
          What percentage of traces were poor for each dimension? Only
          dimensions with at least one poor score are shown.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <ChartContainer config={CHART_CONFIG}>
            <BarChart
              accessibilityLayer
              data={data}
              layout="vertical"
              margin={{ right: 25 }}
            >
              <CartesianGrid horizontal={false} />
              <YAxis
                dataKey="label"
                type="category"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                hide
              />
              <XAxis dataKey="poorPct" type="number" hide />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="line" />}
              />
              <Bar dataKey="poorPct" fill="var(--color-poorPct)" radius={4}>
                <LabelList
                  dataKey="label"
                  position="insideLeft"
                  offset={8}
                  className="fill-secondary"
                  fontSize={12}
                />
                <LabelList
                  dataKey="poorPct"
                  position="right"
                  className="fill-foreground"
                  fontSize={12}
                  formatter={(value: number) => `${value.toFixed(1)}%`}
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        ) : (
          <p className="text-sm text-muted-foreground py-4">
            All dimensions have 0% poor rate.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
