"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { DimensionInfo } from "@/types/batches";
import { useBatchDetailContext } from "./BatchDetailContext";

interface DimensionSelectionContextValue {
  selectedDimensions: Set<string>;
  toggleDimension: (name: string) => void;
  toggleGroup: (groupDims: DimensionInfo[]) => void;
  selectAll: () => void;
  hideAll: () => void;
  showOnlyDimensionsWithIssues: boolean;
  setShowOnlyDimensionsWithIssues: (value: boolean) => void;
  columnVisibility: Record<string, boolean>;
  visibleDimCount: number;
}

const DimensionSelectionContext =
  createContext<DimensionSelectionContextValue | null>(null);

export function useDimensionSelectionContext(): DimensionSelectionContextValue {
  const value = useContext(DimensionSelectionContext);
  if (value === null) {
    throw new Error(
      "useDimensionSelectionContext must be used within a DimensionSelectionProvider (and inside BatchDetailProvider)",
    );
  }
  return value;
}

interface DimensionSelectionProviderProps {
  children: ReactNode;
}

/** Stable key for dimension list to avoid re-initializing when array reference changes. */
function dimensionNamesKey(names: string[]): string {
  return names.length === 0 ? "" : names.join("\0");
}

export function DimensionSelectionProvider({
  children,
}: DimensionSelectionProviderProps) {
  const { dimensionsSorted, dimensionNames, dimensionNamesWithIssues } =
    useBatchDetailContext();

  const [selectedDimensions, setSelectedDimensions] = useState<Set<string>>(
    () => new Set(),
  );
  const [showOnlyDimensionsWithIssues, setShowOnlyDimensionsWithIssues] =
    useState(false);

  const prevNamesKeyRef = useRef<string>("");

  useEffect(() => {
    const namesKey = dimensionNamesKey(dimensionNames);
    if (dimensionNames.length === 0) {
      prevNamesKeyRef.current = "";
      return;
    }
    if (namesKey === prevNamesKeyRef.current) return;
    prevNamesKeyRef.current = namesKey;
    const next = new Set(dimensionNames);
    queueMicrotask(() => setSelectedDimensions(next));
  }, [dimensionNames]);

  const toggleDimension = useCallback((name: string) => {
    setSelectedDimensions((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  const toggleGroup = useCallback((groupDims: DimensionInfo[]) => {
    setSelectedDimensions((prev) => {
      const next = new Set(prev);
      const allSelected = groupDims.every((d) => next.has(d.name));
      for (const d of groupDims) {
        if (allSelected) next.delete(d.name);
        else next.add(d.name);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedDimensions(new Set(dimensionNames));
  }, [dimensionNames]);

  const hideAll = useCallback(() => {
    setSelectedDimensions(new Set());
  }, []);

  const columnVisibility = useMemo((): Record<string, boolean> => {
    const vis: Record<string, boolean> = {};
    vis.model = true;
    vis.scenario_summary = true;
    for (const d of dimensionsSorted) {
      vis[d.name] =
        selectedDimensions.has(d.name) &&
        (!showOnlyDimensionsWithIssues ||
          dimensionNamesWithIssues.includes(d.name));
    }
    vis.actions = true;
    return vis;
  }, [
    dimensionsSorted,
    selectedDimensions,
    showOnlyDimensionsWithIssues,
    dimensionNamesWithIssues,
  ]);

  const visibleDimCount = useMemo(
    () => dimensionsSorted.filter((d) => selectedDimensions.has(d.name)).length,
    [dimensionsSorted, selectedDimensions],
  );

  const value = useMemo<DimensionSelectionContextValue>(
    () => ({
      selectedDimensions,
      toggleDimension,
      toggleGroup,
      selectAll,
      hideAll,
      showOnlyDimensionsWithIssues,
      setShowOnlyDimensionsWithIssues,
      columnVisibility,
      visibleDimCount,
    }),
    [
      selectedDimensions,
      toggleDimension,
      toggleGroup,
      selectAll,
      hideAll,
      showOnlyDimensionsWithIssues,
      columnVisibility,
      visibleDimCount,
    ],
  );

  return (
    <DimensionSelectionContext.Provider value={value}>
      {children}
    </DimensionSelectionContext.Provider>
  );
}
