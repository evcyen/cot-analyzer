"use client";

import { useParams } from "next/navigation";
import { useCallback, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getMessageParts } from "@/lib/trace-message-parts";
import type { TraceMessage } from "@/types/trace-detail";
import { BatchBreadcrumb } from "@/components/BatchBreadcrumb";
import {
  BloomTraceDetailProvider,
  useBloomTraceDetailContext,
} from "@/contexts/BloomTraceDetailContext";
import { BloomTranscriptTabContent } from "./components";
import { formatTranscriptDisplayId } from "@/lib/formatters/bloom";

export default function BloomTracePage() {
  const params = useParams();
  const batchId = (params?.id as string) ?? null;
  const traceId = (params?.traceId as string) ?? null;

  return (
    <BloomTraceDetailProvider batchId={batchId} traceId={traceId}>
      <TooltipProvider delayDuration={200}>
        <BloomTracePageInner />
      </TooltipProvider>
    </BloomTraceDetailProvider>
  );
}

function BloomTracePageInner() {
  const {
    batchId,
    batchName,
    trace,
    loading,
    error,
    variationNumber,
    repetitionNumber,
  } = useBloomTraceDetailContext();
  const [citationNotFoundMessageId, setCitationNotFoundMessageId] = useState<
    string | null
  >(null);

  const transcriptDisplayId = formatTranscriptDisplayId(
    variationNumber,
    repetitionNumber,
  );

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
              <BatchBreadcrumb
                batchId={batchId}
                batchName="..."
                sourceType="bloom"
              />
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
            <BatchBreadcrumb
              batchId={batchId}
              batchName={batchName ?? "..."}
              sourceType="bloom"
            />
          )}
          <p className="text-destructive text-sm" role="alert">
            {error ?? "Transcript not found"}
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
            traceModel={transcriptDisplayId}
            sourceType="bloom"
          />
        </div>

        <BloomTranscriptTabContent
          citationNotFoundMessageId={citationNotFoundMessageId}
          onDismissCitation={() => setCitationNotFoundMessageId(null)}
          scrollToMessage={scrollToMessage}
        />
      </div>
    </div>
  );
}
