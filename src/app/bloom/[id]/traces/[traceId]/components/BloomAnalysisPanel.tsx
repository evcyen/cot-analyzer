"use client";

import Markdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useBloomTraceDetailContext } from "@/contexts/BloomTraceDetailContext";
import {
  formatScoreDimension,
  getBloomScoreColorStyle,
} from "@/lib/formatters/bloom";

interface BloomAnalysisPanelProps {
  scrollToMessage: (messageId: string, quotedText?: string | null) => void;
}

export function BloomAnalysisPanel({
  scrollToMessage,
}: BloomAnalysisPanelProps) {
  const { summary, scores, judgeJustification, citations, targetSystemPrompt } =
    useBloomTraceDetailContext();

  if (
    !summary &&
    !judgeJustification &&
    (!scores || Object.keys(scores).length === 0)
  ) {
    return (
      <aside className="w-[380px] shrink-0 flex flex-col min-h-0 rounded-md border overflow-hidden min-w-0">
        <h2 className="text-sm font-semibold text-muted-foreground shrink-0 px-4 py-2 border-b bg-muted/30">
          Judge Analysis
        </h2>
        <div className="p-4">
          <p className="text-sm text-muted-foreground">No analysis available</p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-[380px] shrink-0 flex flex-col min-h-0 rounded-md border overflow-hidden min-w-0">
      <h2 className="text-sm font-semibold text-muted-foreground shrink-0 px-4 py-2 border-b bg-muted/30">
        Judge Analysis
      </h2>
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 space-y-6 min-w-0 wrap-break-word">
          {/* Scores Section */}
          {scores && Object.keys(scores).length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2">Scores</h4>
              <div className="space-y-1.5">
                {Object.entries(scores).map(([key, value]) => {
                  const colorStyle = getBloomScoreColorStyle(value);
                  return (
                    <div
                      key={key}
                      className="flex justify-between items-center text-sm"
                    >
                      <span className="text-muted-foreground">
                        {formatScoreDimension(key)}
                      </span>
                      <span
                        className="font-mono tabular-nums"
                        style={colorStyle}
                      >
                        {value}/10
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Target System Prompt Section */}
          {targetSystemPrompt && (
            <div>
              <h4 className="text-sm font-semibold mb-2">
                Target System Prompt
              </h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {targetSystemPrompt}
              </p>
            </div>
          )}

          {/* Summary Section */}
          {summary && (
            <div>
              <h4 className="text-sm font-semibold mb-2">Summary</h4>
              <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
                <Markdown rehypePlugins={[rehypeRaw]}>{summary}</Markdown>
              </div>
            </div>
          )}

          {/* Justification Section */}
          {judgeJustification && (
            <div>
              <h4 className="text-sm font-semibold mb-2">Justification</h4>
              <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
                <Markdown rehypePlugins={[rehypeRaw]}>
                  {judgeJustification}
                </Markdown>
              </div>
            </div>
          )}

          {/* Highlights Section */}
          {citations.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2">
                Highlights ({citations.length})
              </h4>
              <div className="space-y-3">
                {citations.map((citation) => (
                  <div
                    key={citation.id}
                    className="text-sm border-l-2 border-primary/30 pl-3 py-1 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() =>
                      scrollToMessage(citation.message_id, citation.quoted_text)
                    }
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        scrollToMessage(
                          citation.message_id,
                          citation.quoted_text,
                        );
                      }
                    }}
                  >
                    <div className="text-sm">{citation.note}</div>
                    {citation.quoted_text && (
                      <p className="mt-2 text-xs text-muted-foreground italic">
                        &quot;{citation.quoted_text}&quot;
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}
