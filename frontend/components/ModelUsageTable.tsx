"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ModelUsageEntry } from "@/types/shared";

interface ModelUsageTableProps {
  modelUsage: Record<string, ModelUsageEntry> | null | undefined;
}

function formatNumber(value: number | undefined): string {
  if (value === undefined || value === null) return "—";
  return value.toLocaleString();
}

export function ModelUsageTable({ modelUsage }: ModelUsageTableProps) {
  const entries =
    modelUsage && Object.keys(modelUsage).length > 0
      ? Object.entries(modelUsage)
      : null;

  if (!entries) {
    return (
      <p className="text-muted-foreground text-sm py-4">
        No token data available.
      </p>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Model</TableHead>
            <TableHead className="text-right">Input tokens</TableHead>
            <TableHead className="text-right">Output tokens</TableHead>
            <TableHead className="text-right">Reasoning tokens</TableHead>
            <TableHead className="text-right">Total tokens</TableHead>
            <TableHead className="text-right">Total cost</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map(([model, usage]) => (
            <TableRow key={model}>
              <TableCell className="font-medium">{model}</TableCell>
              <TableCell className="text-right">
                {formatNumber(usage.input_tokens)}
              </TableCell>
              <TableCell className="text-right">
                {formatNumber(usage.output_tokens)}
              </TableCell>
              <TableCell className="text-right">
                {formatNumber(usage.reasoning_tokens)}
              </TableCell>
              <TableCell className="text-right">
                {formatNumber(usage.total_tokens)}
              </TableCell>
              <TableCell className="text-right">
                {usage.total_cost != null
                  ? typeof usage.total_cost === "number"
                    ? usage.total_cost.toFixed(4)
                    : "—"
                  : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
