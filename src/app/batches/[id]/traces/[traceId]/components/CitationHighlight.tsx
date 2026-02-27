"use client";

import React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { CitationEntry } from "@/types/trace-detail";

const markClassName =
  "bg-amber-200/80 dark:bg-amber-400/30 text-foreground rounded px-0.5";

interface CitationHighlightProps {
  citations: CitationEntry[];
  children: React.ReactNode;
  className?: string;
}

/**
 * Renders highlighted text with optional tooltip listing citation notes.
 * Used for both plain-text segments and markdown citation marks.
 */
export function CitationHighlight({
  citations,
  children,
  className,
}: CitationHighlightProps) {
  const classes =
    `${markClassName} ${citations.length > 0 ? "cursor-help" : ""} ${className ?? ""}`.trim();

  if (citations.length > 0) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <mark className={classes}>{children}</mark>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-sm">
          <ul className="space-y-1 text-xs">
            {citations.map((c) => (
              <li key={c.id}>
                {c.dimension_name && (
                  <span className="font-medium">[{c.dimension_name}] </span>
                )}
                {c.note}
              </li>
            ))}
          </ul>
        </TooltipContent>
      </Tooltip>
    );
  }

  return <mark className={classes}>{children}</mark>;
}
