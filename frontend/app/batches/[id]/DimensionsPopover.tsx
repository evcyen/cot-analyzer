"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronDownIcon } from "lucide-react";
import { GROUP_DISPLAY_NAMES } from "@/lib/dimension-groups";
import { useBatchDetailContext } from "@/contexts/BatchDetailContext";
import { useDimensionSelectionContext } from "@/contexts/DimensionSelectionContext";

export function DimensionsPopover() {
  const { dimensionsByGroup, dimensionsSorted } = useBatchDetailContext();
  const {
    selectedDimensions,
    toggleDimension,
    toggleGroup,
    selectAll,
    hideAll,
    showOnlyDimensionsWithIssues,
    setShowOnlyDimensionsWithIssues,
    visibleDimCount,
  } = useDimensionSelectionContext();

  const totalDimCount = dimensionsSorted.length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="text-xs">
          Dimensions
          {visibleDimCount < totalDimCount && (
            <span className="text-muted-foreground ml-1">
              ({visibleDimCount}/{totalDimCount})
            </span>
          )}
          <ChevronDownIcon className="ml-1 size-3.5 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="max-h-96 overflow-y-auto w-full">
        {/* Select all / Hide all */}
        <div className="flex gap-2 mb-2 pb-2 border-b">
          <button
            type="button"
            onClick={selectAll}
            className="text-xs text-primary hover:underline cursor-pointer"
          >
            Select all
          </button>
          <button
            type="button"
            onClick={hideAll}
            className="text-xs text-primary hover:underline cursor-pointer"
          >
            Hide all
          </button>
        </div>

        {/* Show only dimensions with issues - own section */}
        <div className="py-2 border-b">
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <Checkbox
              checked={showOnlyDimensionsWithIssues}
              onCheckedChange={(checked) =>
                setShowOnlyDimensionsWithIssues(checked === true)
              }
            />
            Show only dimensions with issues
          </label>
        </div>

        {/* Grouped dimensions */}
        <div className="space-y-3 pt-2">
          {dimensionsByGroup.map(({ group, dims }) => {
            const allInGroupSelected = dims.every((d) =>
              selectedDimensions.has(d.name),
            );
            const someInGroupSelected =
              !allInGroupSelected &&
              dims.some((d) => selectedDimensions.has(d.name));
            return (
              <div key={group}>
                <label className="flex items-center gap-2 px-1 py-0.5 text-xs cursor-pointer">
                  <Checkbox
                    checked={
                      allInGroupSelected
                        ? true
                        : someInGroupSelected
                          ? "indeterminate"
                          : false
                    }
                    onCheckedChange={() => toggleGroup(dims)}
                  />
                  {GROUP_DISPLAY_NAMES[group] ?? group}
                </label>
                <div className="ml-4 space-y-0.5 mt-0.5">
                  {dims.map((d) => (
                    <label
                      key={d.name}
                      className="flex items-center gap-2 px-1 py-0.5 text-xs cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedDimensions.has(d.name)}
                        onCheckedChange={() => toggleDimension(d.name)}
                      />
                      {d.name}
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
