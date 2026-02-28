"use client";

import React, { useCallback, useMemo, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getCitationRangesWithCitations } from "@/lib/trace-citations";
import { getMessageParts } from "@/lib/trace-message-parts";
import type { CitationEntry } from "@/types/trace-detail";
import { useTraceDetailContext } from "@/contexts/TraceDetailContext";
import { CitationHighlight } from "./CitationHighlight";
import { TranscriptPart, type TranscriptPartData } from "./TranscriptPart";
import {
  TranscriptToolbar,
  type TranscriptToolbarHandlers,
  type TranscriptToolbarState,
} from "./TranscriptToolbar";

export function TranscriptPanel() {
  const { trace, citations, citedMessageIds, citationsByMessageId } =
    useTraceDetailContext();
  const [hiddenRoles, setHiddenRoles] = useState<Set<string>>(new Set());
  const [showCitationsOnly, setShowCitationsOnly] = useState(false);
  const [markdownEnabled, setMarkdownEnabled] = useState(false);
  const [toolbarVisible, setToolbarVisible] = useState(true);
  const [allMinimized, setAllMinimized] = useState(false);
  // Per-part overrides on top of allMinimized. Cleared when allMinimized toggles.
  const [minimizedOverrides, setMinimizedOverrides] = useState<
    Map<string, boolean>
  >(new Map());

  const partsData = useMemo((): TranscriptPartData[] => {
    const messages = trace?.messages ?? [];
    return messages.flatMap((msg) => {
      const parts = getMessageParts(msg);
      const allIds = [
        msg.id,
        msg.normalized_id,
        ...(msg.normalized_ids ?? []),
      ].filter(Boolean) as string[];
      const isCited = allIds.some((id) => citedMessageIds.has(id));
      const citationsForThisMessage = allIds.flatMap(
        (id) => citationsByMessageId.get(id) ?? [],
      );
      return parts.map((part, partIndex) => {
        const isFirstPart = partIndex === 0;
        const citationRanges = getCitationRangesWithCitations(
          part.text,
          citationsForThisMessage,
          isFirstPart && citationsForThisMessage.length > 0,
        );
        const partId = isFirstPart
          ? `msg-${msg.id}`
          : `msg-${msg.id}-part-${partIndex}`;
        return {
          msg,
          part,
          partIndex,
          isFirstPart,
          citationRanges,
          partId,
          isCited,
        };
      });
    });
  }, [trace?.messages, citedMessageIds, citationsByMessageId]);

  const roleLabels = useMemo(() => {
    const seen = new Set<string>();
    const labels: string[] = [];
    for (const { part } of partsData) {
      if (!seen.has(part.label)) {
        seen.add(part.label);
        labels.push(part.label);
      }
    }
    return labels;
  }, [partsData]);

  const citationById = useMemo(() => {
    const map = new Map<string, CitationEntry>();
    for (const c of citations) {
      map.set(c.id, c);
    }
    return map;
  }, [citations]);

  const markdownComponents = useMemo(
    () => ({
      mark: ({
        children,
        ...props
      }: {
        children?: React.ReactNode;
        "data-citation-ids"?: string;
      }) => {
        const idsStr = props["data-citation-ids"];
        const citationEntries = idsStr
          ? (idsStr
              .split(",")
              .map((id) => citationById.get(id))
              .filter(Boolean) as CitationEntry[])
          : [];
        return (
          <CitationHighlight citations={citationEntries}>
            {children}
          </CitationHighlight>
        );
      },
    }),
    [citationById],
  );

  const toggleRole = (label: string) => {
    setHiddenRoles((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const handleToggleAllMinimized = useCallback(() => {
    setAllMinimized((prev) => !prev);
    setMinimizedOverrides(new Map());
  }, []);

  const handleTogglePartMinimized = useCallback(
    (partId: string) => {
      setMinimizedOverrides((prev) => {
        const next = new Map(prev);
        const current = next.get(partId) ?? allMinimized;
        next.set(partId, !current);
        return next;
      });
    },
    [allMinimized],
  );

  const toolbarState: TranscriptToolbarState = {
    roleLabels,
    hiddenRoles,
    showCitationsOnly,
    toolbarVisible,
    markdownEnabled,
    allMinimized,
  };
  const toolbarHandlers: TranscriptToolbarHandlers = {
    onToggleRole: toggleRole,
    onShowCitationsOnlyChange: setShowCitationsOnly,
    onToolbarVisibleChange: setToolbarVisible,
    onMarkdownEnabledChange: setMarkdownEnabled,
    onToggleAllMinimized: handleToggleAllMinimized,
  };

  return (
    <div className="flex-1 min-w-0 min-h-0 flex flex-col rounded-md border overflow-hidden">
      <TranscriptToolbar state={toolbarState} handlers={toolbarHandlers} />

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 space-y-3">
          {partsData.map((partData) => {
            if (hiddenRoles.has(partData.part.label)) return null;
            if (showCitationsOnly && partData.citationRanges.length === 0)
              return null;

            return (
              <TranscriptPart
                key={`${partData.msg.id}-${partData.partIndex}`}
                partData={partData}
                markdownEnabled={markdownEnabled}
                markdownComponents={markdownComponents}
                isMinimized={
                  minimizedOverrides.get(partData.partId) ?? allMinimized
                }
                onToggleMinimized={handleTogglePartMinimized}
              />
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
