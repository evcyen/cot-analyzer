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

export interface TokensPerTraceData {
  traceNum: number;
  input: number;
  output: number;
  total: number;
}

interface TokensPerTraceScatterChartProps {
  data: TokensPerTraceData[];
  className?: string;
}

export function TokensPerTraceScatterChart({
  data,
  className,
}: TokensPerTraceScatterChartProps) {
  if (data.length === 0) return null;

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle>Output vs Input Tokens per Trace</CardTitle>
        <CardDescription>
          For each trace, how does the number of input tokens compare to the
          number of output tokens?
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={CHART_CONFIG}>
          <ScatterChart>
            <CartesianGrid />
            <XAxis
              type="number"
              dataKey="input"
              name="Input tokens"
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              label={{
                value: "Input tokens",
                position: "insideBottom",
                offset: -5,
              }}
            />
            <YAxis
              type="number"
              dataKey="output"
              name="Output tokens"
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              label={{
                value: "Output tokens",
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
                        <span className="text-muted-foreground">Input:</span>
                        <span className="font-medium">
                          {Number(data.input).toLocaleString()} tokens
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: "var(--chart-4)" }}
                        />
                        <span className="text-muted-foreground">Output:</span>
                        <span className="font-medium">
                          {Number(data.output).toLocaleString()} tokens
                        </span>
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
