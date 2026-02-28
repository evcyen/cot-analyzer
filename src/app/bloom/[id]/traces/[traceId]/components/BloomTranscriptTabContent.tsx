"use client";

import { BloomTranscriptPanel } from "./BloomTranscriptPanel";
import { BloomAnalysisPanel } from "./BloomAnalysisPanel";

interface BloomTranscriptTabContentProps {
  citationNotFoundMessageId: string | null;
  onDismissCitation: () => void;
  scrollToMessage: (messageId: string, quotedText?: string | null) => void;
}

export function BloomTranscriptTabContent({
  citationNotFoundMessageId,
  onDismissCitation,
  scrollToMessage,
}: BloomTranscriptTabContentProps) {
  return (
    <div className="space-y-4">
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
            onClick={onDismissCitation}
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
        <BloomTranscriptPanel />
        <BloomAnalysisPanel scrollToMessage={scrollToMessage} />
      </div>
    </div>
  );
}
