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

const CHART_CONFIG = {
  input: { label: "Input", color: "var(--chart-1)" },
  output: { label: "Output", color: "var(--chart-2)" },
  reasoning: { label: "Reasoning", color: "var(--chart-3)" },
} satisfies Record<string, { label: string; color: string }>;

export interface TokenByModelData {
  model: string;
  input: number;
  output: number;
  reasoning: number;
}

interface TokenUsageByModelChartProps {
  data: TokenByModelData[];
  className?: string;
}

export function TokenUsageByModelChart({
  data,
  className,
}: TokenUsageByModelChartProps) {
  if (data.length === 0) return null;

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle>Token Usage by Model</CardTitle>
        <CardDescription>
          How many tokens were used by each model?
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={CHART_CONFIG}>
          <BarChart data={data} margin={{ bottom: 50 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="model"
              tickLine={false}
              axisLine={false}
              angle={-20}
              textAnchor="end"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="input" stackId="tokens" fill="var(--color-input)" />
            <Bar dataKey="output" stackId="tokens" fill="var(--color-output)" />
            <Bar
              dataKey="reasoning"
              stackId="tokens"
              fill="var(--color-reasoning)"
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
