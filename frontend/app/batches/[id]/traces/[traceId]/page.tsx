"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ChevronLeftIcon } from "lucide-react";
import { getMessageParts } from "@/lib/trace-message-parts";
import type { TraceMessage } from "@/types/trace-detail";
import { AnalysisPanel, TranscriptPanel } from "./components";
import {
  TraceDetailProvider,
  useTraceDetailContext,
} from "@/contexts/TraceDetailContext";

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
  const { batchId, trace, loading, error } = useTraceDetailContext();
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
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (error || !trace) {
    return (
      <div className="min-h-screen p-6">
        <div className="mx-auto max-w-2xl">
          <Button variant="ghost" size="sm" asChild>
            <Link href={batchId ? `/batches/${batchId}` : "/"}>
              <ChevronLeftIcon className="size-4" />
              Back to batch
            </Link>
          </Button>
          <p className="mt-6 text-destructive text-sm">
            {error ?? "Trace not found"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={batchId ? `/batches/${batchId}` : "/"}>
            <ChevronLeftIcon className="size-4" />
            Back to batch
          </Link>
        </Button>

        {citationNotFoundMessageId && (
          <div
            className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive"
            role="alert"
          >
            <p className="font-medium">Cited message not found</p>
            <p className="mt-1 font-mono text-xs break-all">
              {citationNotFoundMessageId}
            </p>
            <p className="mt-1 text-muted-foreground text-xs">
              This may indicate a data mismatch. You can flag this for review.
            </p>
            <button
              type="button"
              onClick={() => setCitationNotFoundMessageId(null)}
              className="mt-2 text-xs text-primary hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        <div
          className="flex gap-6 h-[calc(100vh-8rem)] min-h-0"
          style={{ maxHeight: "calc(100vh - 8rem)" }}
        >
          <TranscriptPanel />

          <AnalysisPanel scrollToMessage={scrollToMessage} />
        </div>
      </div>
    </div>
  );
}
