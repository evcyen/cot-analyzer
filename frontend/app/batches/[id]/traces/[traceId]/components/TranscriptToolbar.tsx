"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Toggle } from "@/components/ui/toggle";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ChevronDown,
  ChevronDownIcon,
  ChevronUp,
  ChevronsDown,
  ChevronsUp,
  Quote,
  Type,
} from "lucide-react";

export interface TranscriptToolbarState {
  roleLabels: string[];
  hiddenRoles: Set<string>;
  showCitationsOnly: boolean;
  toolbarVisible: boolean;
  markdownEnabled: boolean;
  allMinimized: boolean;
}

export interface TranscriptToolbarHandlers {
  onToggleRole: (label: string) => void;
  onShowCitationsOnlyChange: (value: boolean) => void;
  onToolbarVisibleChange: (value: boolean) => void;
  onMarkdownEnabledChange: (value: boolean) => void;
  onToggleAllMinimized: () => void;
}

interface TranscriptToolbarProps {
  state: TranscriptToolbarState;
  handlers: TranscriptToolbarHandlers;
}

export function TranscriptToolbar({ state, handlers }: TranscriptToolbarProps) {
  const {
    roleLabels,
    hiddenRoles,
    showCitationsOnly,
    toolbarVisible,
    markdownEnabled,
    allMinimized,
  } = state;
  const {
    onToggleRole,
    onShowCitationsOnlyChange,
    onToolbarVisibleChange,
    onMarkdownEnabledChange,
    onToggleAllMinimized,
  } = handlers;
  const visibleCount = roleLabels.length - hiddenRoles.size;

  return (
    <div className="shrink-0 border-b bg-muted/30 px-4 py-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Transcript
        </h2>
        <button
          type="button"
          onClick={() => onToolbarVisibleChange(!toolbarVisible)}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label={toolbarVisible ? "Hide toolbar" : "Show toolbar"}
        >
          {toolbarVisible ? (
            <ChevronUp className="size-4" />
          ) : (
            <ChevronDown className="size-4" />
          )}
        </button>
      </div>

      {toolbarVisible && (
        <div className="flex items-center gap-3 mt-2">
          {/* Role multi-select */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="text-xs">
                Roles
                {hiddenRoles.size > 0 && (
                  <span className="text-muted-foreground text-xs">
                    ({visibleCount}/{roleLabels.length})
                  </span>
                )}
                <ChevronDownIcon className="size-3 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start">
              <div className="space-y-1">
                {roleLabels.map((label) => {
                  const checked = !hiddenRoles.has(label);
                  return (
                    <label
                      key={label}
                      className="flex items-center gap-2 px-2 py-1 text-xs cursor-pointer"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => onToggleRole(label)}
                      />
                      {label}
                    </label>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>

          {/* Show citations only */}
          <Toggle
            variant="outline"
            size="sm"
            pressed={showCitationsOnly}
            onPressedChange={onShowCitationsOnlyChange}
          >
            <Quote className="size-4" />
            Citations only
          </Toggle>

          {/* Markdown */}
          <Toggle
            variant="outline"
            size="sm"
            pressed={markdownEnabled}
            onPressedChange={onMarkdownEnabledChange}
          >
            <Type className="size-4" />
            Markdown
          </Toggle>

          {/* Expand/collapse all */}
          <Toggle
            variant="outline"
            size="sm"
            pressed={allMinimized}
            onPressedChange={onToggleAllMinimized}
          >
            {allMinimized ? (
              <>
                <ChevronsDown className="size-4" />
                Expand all
              </>
            ) : (
              <>
                <ChevronsUp className="size-4" />
                Collapse all
              </>
            )}
          </Toggle>
        </div>
      )}
    </div>
  );
}
