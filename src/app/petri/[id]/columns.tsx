"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { isPoorScore } from "@/lib/dimension-score-direction";
import type { DimensionInfo, TraceRow } from "@/types/batches";

function sortableHeader(label: string) {
  return function SortableHeader({
    column,
  }: {
    column: {
      toggleSorting: (asc: boolean) => void;
      getIsSorted: () => false | "asc" | "desc";
    };
  }) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2 font-medium"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        {label}
        <ArrowUpDown className="ml-1 size-3.5 opacity-70" />
      </Button>
    );
  };
}

function exactFilter(
  row: { getValue: (id: string) => unknown },
  id: string,
  value: unknown,
): boolean {
  return !value || (row.getValue(id) as string) === value;
}

/** Model column: sortable, filterable by exact value. */
function modelColumn(): ColumnDef<TraceRow> {
  return {
    accessorKey: "model",
    header: sortableHeader("Model"),
    cell: ({ row }) => (
      <span className="font-mono text-xs">{row.getValue("model") ?? "—"}</span>
    ),
    filterFn: exactFilter,
  };
}

/** Scenario column: sortable, filterable by exact value, with full-text tooltip. */
function scenarioColumn(): ColumnDef<TraceRow> {
  return {
    accessorKey: "scenario_summary",
    header: sortableHeader("Scenario"),
    cell: ({ row }) => {
      const text = row.getValue("scenario_summary") as string | null;
      if (!text) return <span className="text-xs block">—</span>;
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="max-w-[200px] truncate text-xs block cursor-help">
              {text}
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-md">
            <p className="text-xs whitespace-pre-wrap">{text}</p>
          </TooltipContent>
        </Tooltip>
      );
    },
    filterFn: exactFilter,
  };
}

/** One dimension column: score value, numeric sort. Poor scores shown bold and red. */
function dimensionColumn(dim: DimensionInfo): ColumnDef<TraceRow> {
  const header = sortableHeader(dim.name);

  return {
    id: dim.name,
    meta: { group: dim.group },
    accessorFn: (row) => row.scores[dim.name] ?? null,
    header,
    cell: ({ row }) => {
      const score = row.original.scores[dim.name];
      const value = score ?? "—";
      const poor = typeof score === "number" && isPoorScore(dim.name, score);
      return (
        <span
          className={cn(
            "text-center block",
            poor ? "text-destructive font-bold" : "font-medium",
          )}
        >
          {value}
        </span>
      );
    },
    sortingFn: (rowA, rowB) => {
      const a = rowA.original.scores[dim.name] ?? 0;
      const b = rowB.original.scores[dim.name] ?? 0;
      return a - b;
    },
  };
}

/** Actions column: link to trace detail. Sticky on the right when table scrolls. */
function actionsColumn(batchId: string | null): ColumnDef<TraceRow> {
  return {
    id: "actions",
    header: () => null,
    cell: ({ row }) =>
      batchId ? (
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/petri/${batchId}/traces/${row.original.trace_id}`}>
            View
          </Link>
        </Button>
      ) : null,
    enableSorting: false,
    enableColumnFilter: false,
  };
}

/**
 * Column definitions for the batch traces table (TanStack Table).
 * Order: Model, Scenario, then one column per dimension (in dimensions order), then Actions.
 * Dimensions should be pre-sorted by group (e.g. via sortDimensionsByGroup).
 */
export function getBatchTracesColumns(
  dimensions: DimensionInfo[],
  batchId: string | null,
): ColumnDef<TraceRow>[] {
  return [
    modelColumn(),
    scenarioColumn(),
    ...dimensions.map((d) => dimensionColumn(d)),
    actionsColumn(batchId),
  ];
}
