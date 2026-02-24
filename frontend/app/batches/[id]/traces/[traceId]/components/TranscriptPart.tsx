"use client";

import React from "react";
import Markdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import {
  insertCitationMarks,
  sanitizeCustomTagsForMarkdown,
  segmentizeWithCitations,
  type RangeWithCitations,
} from "@/lib/trace-citations";
import type { MessagePart } from "@/lib/trace-message-parts";
import type { TraceMessage } from "@/types/trace-detail";
import { CitationHighlight } from "./CitationHighlight";

export interface TranscriptPartData {
  msg: TraceMessage;
  part: MessagePart;
  partIndex: number;
  isFirstPart: boolean;
  citationRanges: RangeWithCitations[];
  partId: string;
  isCited: boolean;
}

interface TranscriptPartProps {
  partData: TranscriptPartData;
  markdownEnabled: boolean;
  markdownComponents: React.ComponentProps<typeof Markdown>["components"];
  isMinimized: boolean;
  onToggleMinimized: (partId: string) => void;
}

export function TranscriptPart({
  partData,
  markdownEnabled,
  markdownComponents,
  isMinimized,
  onToggleMinimized,
}: TranscriptPartProps) {
  const { msg, part, isFirstPart, citationRanges, partId, isCited } = partData;
  const isReasoning = part.type === "reasoning";
  const segments = segmentizeWithCitations(part.text, citationRanges);
  const sanitizedText = sanitizeCustomTagsForMarkdown(part.text);
  const markdownContent = insertCitationMarks(sanitizedText, citationRanges);

  return (
    <div>
      <div
        id={partId}
        {...(isFirstPart && (msg.normalized_id ?? msg.normalized_ids?.[0])
          ? {
              "data-normalized-message-id":
                msg.normalized_id ?? msg.normalized_ids?.[0],
            }
          : {})}
        className={`group/part rounded-md border-l-4 px-3 py-2 text-sm scroll-mt-4 ${part.color} ${isCited ? "ring-2 ring-primary/40" : ""}`}
      >
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-semibold text-foreground">{part.label}</p>
          <button
            type="button"
            onClick={() => onToggleMinimized(partId)}
            className="text-[10px] text-muted-foreground hover:text-foreground opacity-0 group-hover/part:opacity-100 transition-opacity cursor-pointer"
          >
            {isMinimized ? "Expand" : "Collapse"}
          </button>
        </div>
        {markdownEnabled ? (
          <div
            className={`prose prose-sm dark:prose-invert max-w-none wrap-break-word leading-normal **:leading-normal ${isReasoning ? "text-muted-foreground" : ""} ${isMinimized ? "line-clamp-4" : ""}`}
          >
            <Markdown
              rehypePlugins={[rehypeRaw]}
              components={markdownComponents}
            >
              {markdownContent}
            </Markdown>
          </div>
        ) : (
          <div
            className={`whitespace-pre-wrap wrap-break-word text-sm ${isReasoning ? "text-muted-foreground" : ""} ${isMinimized ? "line-clamp-4" : ""}`}
          >
            {segments.map((seg, i) =>
              seg.highlight ? (
                <CitationHighlight key={i} citations={seg.citations}>
                  {seg.text}
                </CitationHighlight>
              ) : (
                <span key={i}>{seg.text}</span>
              ),
            )}
          </div>
        )}
      </div>
    </div>
  );
}
