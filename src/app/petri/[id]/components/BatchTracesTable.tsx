"use client";

import { useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnFiltersState,
  type SortingState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBatchDetailContext } from "@/contexts/BatchDetailContext";
import { useDimensionSelectionContext } from "@/contexts/DimensionSelectionContext";
import { getBatchTracesColumns } from "../columns";
import { DimensionsPopover } from "../DimensionsPopover";

export function BatchTracesTable() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const { batchId, traces, dimensionsSorted } = useBatchDetailContext();
  const { columnVisibility } = useDimensionSelectionContext();

  const columns = useMemo(
    () => getBatchTracesColumns(dimensionsSorted, batchId),
    [dimensionsSorted, batchId],
  );

  const table = useReactTable({
    data: traces,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    state: { sorting, columnFilters, columnVisibility },
  });

  const models = useMemo(
    () => [...new Set(traces.map((t) => t.model ?? "").filter(Boolean))].sort(),
    [traces],
  );
  const scenarios = useMemo(
    () =>
      [
        ...new Set(traces.map((t) => t.scenario_summary ?? "").filter(Boolean)),
      ].sort(),
    [traces],
  );

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <Select
          value={
            (table.getColumn("model")?.getFilterValue() as string) || "all"
          }
          onValueChange={(value) =>
            table
              .getColumn("model")
              ?.setFilterValue(value === "all" ? "" : value)
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Model" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All models</SelectItem>
            {models.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={
            (table.getColumn("scenario_summary")?.getFilterValue() as
              | string
              | undefined) || "all"
          }
          onValueChange={(value) =>
            table
              .getColumn("scenario_summary")
              ?.setFilterValue(value === "all" ? "" : value)
          }
        >
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Scenario" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All scenarios</SelectItem>
            {scenarios.slice(0, 50).map((s) => (
              <SelectItem key={s} value={s}>
                {s.length > 40 ? s.slice(0, 37) + "..." : s}
              </SelectItem>
            ))}
            {scenarios.length > 50 && (
              <SelectItem value="all" disabled>
                +{scenarios.length - 50} more
              </SelectItem>
            )}
          </SelectContent>
        </Select>
        <DimensionsPopover />
      </div>
      <div className="rounded-md border overflow-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const colId = header.column.id;
                  const isModel = colId === "model";
                  const isScenario = colId === "scenario_summary";
                  const isActions = colId === "actions";
                  const stickyLeft = isModel || isScenario;
                  return (
                    <TableHead
                      key={header.id}
                      className={
                        stickyLeft
                          ? "sticky z-10 bg-background"
                          : isActions
                            ? "sticky right-0 z-10 bg-background"
                            : undefined
                      }
                      style={
                        isModel
                          ? { left: 0, minWidth: 150, maxWidth: 150 }
                          : isScenario
                            ? {
                                left: 150,
                                minWidth: 200,
                                maxWidth: 200,
                                boxShadow:
                                  "inset -4px 0 3px -4px rgba(0,0,0,0.15)",
                              }
                            : isActions
                              ? {
                                  boxShadow:
                                    "inset 4px 0 3px -4px rgba(0,0,0,0.15)",
                                }
                              : undefined
                      }
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={
                        cell.column.id === "model" ||
                        cell.column.id === "scenario_summary"
                          ? "sticky z-10 bg-background"
                          : cell.column.id === "actions"
                            ? "sticky right-0 z-10 bg-background"
                            : undefined
                      }
                      style={
                        cell.column.id === "model"
                          ? { left: 0, minWidth: 150, maxWidth: 150 }
                          : cell.column.id === "scenario_summary"
                            ? {
                                left: 150,
                                minWidth: 200,
                                maxWidth: 200,
                                boxShadow:
                                  "inset -4px 0 3px -4px rgba(0,0,0,0.15)",
                              }
                            : cell.column.id === "actions"
                              ? {
                                  boxShadow:
                                    "inset 4px 0 3px -4px rgba(0,0,0,0.15)",
                                }
                              : undefined
                      }
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={table.getVisibleLeafColumns().length}
                  className="h-24 text-center text-muted-foreground text-sm"
                >
                  No traces match the filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
