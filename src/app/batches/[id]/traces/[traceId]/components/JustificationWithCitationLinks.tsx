"use client";

import React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { CitationEntry } from "@/types/trace-detail";

interface JustificationWithCitationLinksProps {
  text: string;
  citations: CitationEntry[];
  scrollToMessage: (messageId: string, quotedText?: string | null) => void;
}

/**
 * Renders overall justification text with [1], [2], [4, 6, 7] as clickable citation links.
 * Each number is a separate link with its own tooltip (1-based).
 */
export function JustificationWithCitationLinks({
  text,
  citations,
  scrollToMessage,
}: JustificationWithCitationLinksProps) {
  const re = /\[(\d+(?:\s*,\s*\d+)*)\]/g;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    nodes.push(text.slice(lastIndex, match.index));
    const numStr = match[1];
    const nums = numStr.split(/\s*,\s*/).map((s) => parseInt(s.trim(), 10));
    const valid = nums.filter((n) => n >= 1 && n <= citations.length);
    if (valid.length > 0) {
      nodes.push("[");
      valid.forEach((oneBased, i) => {
        const citation = citations[oneBased - 1];
        const tooltipText = citation.quoted_text ?? citation.note;
        if (i > 0) nodes.push(", ");
        nodes.push(
          <Tooltip key={`${match!.index}-${oneBased}-${i}`}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() =>
                  scrollToMessage(
                    citation.message_id,
                    citation.quoted_text ?? null,
                  )
                }
                className="text-primary hover:underline hover:cursor-pointer font-medium align-baseline"
              >
                {oneBased}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-sm">
              <p className="text-xs whitespace-pre-wrap wrap-break-word">
                {tooltipText}
              </p>
            </TooltipContent>
          </Tooltip>,
        );
      });
      nodes.push("]");
    } else {
      nodes.push(match[0]);
    }
    lastIndex = match.index + match[0].length;
  }
  nodes.push(text.slice(lastIndex));
  return <>{nodes}</>;
}
