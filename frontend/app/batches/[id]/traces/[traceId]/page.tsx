"use client";

import { useParams } from "next/navigation";
import { useCallback, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getMessageParts } from "@/lib/trace-message-parts";
import type { TraceMessage } from "@/types/trace-detail";
import { BatchBreadcrumb } from "../../components/BatchBreadcrumb";
import {
  TraceDetailProvider,
  useTraceDetailContext,
} from "@/contexts/TraceDetailContext";
import { useTabFromUrl } from "@/hooks/use-tab-from-url";
import { TranscriptTabContent, TraceStatsTab } from "./components";

const TRACE_TABS = ["transcript", "stats"] as const;

export default function TracePage() {
  const params = useParams();
  const batchId = (params?.id as string) ?? null;
  const traceId = (params?.traceId as string) ?? null;

  return (
    <TraceDetailProvider batchId={batchId} traceId={traceId}>
      <TooltipProvider delayDuration={200}>
        <TracePageInner />
      </TooltipProvider>
    </TraceDetailProvider>
  );
}

function TracePageInner() {
  const { batchId, batchName, trace, loading, error } = useTraceDetailContext();
  const [activeTab, handleTabChange] = useTabFromUrl(TRACE_TABS, "transcript");
  const [citationNotFoundMessageId, setCitationNotFoundMessageId] = useState<
    string | null
  >(null);

  const resolveRawId = useCallback(
    (messageId: string): string => {
      const messages = (trace?.messages ?? []) as TraceMessage[];
      const msg = messages.find(
        (m) =>
          m.id === messageId ||
          m.normalized_id === messageId ||
          m.normalized_ids?.includes(messageId),
      );
      return msg?.id ?? messageId;
    },
    [trace?.messages],
  );

  const scrollToMessage = useCallback(
    (messageId: string, quotedText?: string | null) => {
      setCitationNotFoundMessageId(null);
      const messages = (trace?.messages ?? []) as TraceMessage[];
      const rawId = resolveRawId(messageId);
      const msg = messages.find(
        (m) =>
          m.id === rawId ||
          m.normalized_id === messageId ||
          m.normalized_ids?.includes(messageId),
      );

      const trimmedQuote = quotedText?.trim();
      if (trimmedQuote && msg) {
        const parts = getMessageParts(msg);
        const partIndex = parts.findIndex((p) => p.text.includes(trimmedQuote));
        if (partIndex >= 0) {
          const partId =
            partIndex === 0 ? `msg-${rawId}` : `msg-${rawId}-part-${partIndex}`;
          const partEl = document.getElementById(partId);
          if (partEl) {
            partEl.scrollIntoView({ behavior: "smooth", block: "start" });
            return;
          }
        }
      }

      const byRawId = document.getElementById(`msg-${rawId}`);
      const el =
        byRawId ??
        document.querySelector<HTMLElement>(
          `[data-normalized-message-id="${messageId}"]`,
        );
      if (!el) {
        setCitationNotFoundMessageId(messageId);
        return;
      }
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    [trace?.messages, resolveRawId],
  );

  if (loading) {
    return (
      <div className="min-h-screen p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          {batchId && (
            <div className="mb-6">
              <BatchBreadcrumb batchId={batchId} batchName="..." />
            </div>
          )}
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (error || !trace) {
    return (
      <div className="min-h-screen p-6">
        <div className="mx-auto max-w-2xl space-y-4">
          {batchId && (
            <BatchBreadcrumb batchId={batchId} batchName={batchName ?? "..."} />
          )}
          <p className="text-destructive text-sm" role="alert">
            {error ?? "Trace not found"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="mb-6 min-h-6">
          <BatchBreadcrumb
            batchId={batchId ?? ""}
            batchName={batchName ?? "..."}
            traceModel={trace.model}
          />
        </div>

        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="w-full"
        >
          <TabsList aria-label="Trace view">
            <TabsTrigger value="transcript">Transcript</TabsTrigger>
            <TabsTrigger value="stats">Stats</TabsTrigger>
          </TabsList>
          <TabsContent value="transcript" className="mt-4 space-y-4">
            <TranscriptTabContent
              citationNotFoundMessageId={citationNotFoundMessageId}
              onDismissCitation={() => setCitationNotFoundMessageId(null)}
              scrollToMessage={scrollToMessage}
            />
          </TabsContent>
          <TabsContent value="stats" className="mt-4">
            <TraceStatsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
