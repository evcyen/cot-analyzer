"use client";

import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { isPoorScore, getScoreBadness } from "@/lib/dimension-score-direction";
import { useTraceDetailContext } from "@/contexts/TraceDetailContext";
import { JustificationWithCitationLinks } from "./JustificationWithCitationLinks";

interface AnalysisPanelProps {
  scrollToMessage: (messageId: string, quotedText?: string | null) => void;
}

export function AnalysisPanel({ scrollToMessage }: AnalysisPanelProps) {
  const { trace, analysis } = useTraceDetailContext();

  if (!trace) return null;
  return (
    <aside className="w-[380px] shrink-0 flex flex-col min-h-0 rounded-md border overflow-hidden min-w-0">
      <h2 className="text-sm font-semibold text-muted-foreground shrink-0 px-4 py-2 border-b bg-muted/30">
        Scores &amp; analysis
      </h2>
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 space-y-6 min-w-0 wrap-break-word">
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-foreground">
              Target model
            </h2>
            <p className="text-sm text-muted-foreground">
              {trace.model ?? "—"}
            </p>
            <h2 className="text-sm font-semibold text-foreground pt-2">
              Judge model
            </h2>
            <p className="text-sm text-muted-foreground">
              {analysis?.judge_model ?? "—"}
            </p>
            <h2 className="text-sm font-semibold text-foreground pt-2">
              Input
            </h2>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap wrap-break-word">
              {trace.raw_input ?? "—"}
            </p>
          </div>

          {analysis && (
            <>
              {analysis.scores.length > 0 && (
                <div className="space-y-1">
                  <h2 className="text-sm font-semibold text-foreground">
                    Scores
                  </h2>
                  <div className="text-sm min-w-0">
                    {analysis.scores.map((s) => {
                      const label =
                        s.dimension_display_name || s.dimension_name;
                      const badness = getScoreBadness(
                        s.dimension_name,
                        s.value,
                      );
                      const hue = 120 * (1 - badness);
                      const scoreColor = `hsl(${hue} 65% 38%)`;
                      return (
                        <div
                          key={s.dimension_id}
                          className="flex justify-between gap-4 py-0.5 min-w-0"
                          style={{ color: scoreColor }}
                        >
                          <span className="min-w-0 wrap-break-word">
                            {label}
                          </span>
                          <span className="shrink-0 tabular-nums">
                            {s.value}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  {analysis.scores.some(
                    (s) =>
                      isPoorScore(s.dimension_name, s.value) && s.justification,
                  ) && (
                    <div className="pt-2 space-y-1 min-w-0">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Score justifications
                      </p>
                      {analysis.scores.map(
                        (s) =>
                          isPoorScore(s.dimension_name, s.value) &&
                          s.justification && (
                            <div
                              key={s.dimension_id}
                              className="text-xs text-muted-foreground wrap-break-word"
                            >
                              <span className="font-medium text-foreground">
                                {s.dimension_display_name || s.dimension_name}:
                              </span>{" "}
                              {s.justification}
                            </div>
                          ),
                      )}
                    </div>
                  )}
                </div>
              )}

              {analysis.overall_justification && (
                <div className="space-y-1 min-w-0">
                  <h2 className="text-sm font-semibold text-foreground">
                    Overall Justification
                  </h2>
                  <p className="text-sm whitespace-pre-wrap wrap-break-word">
                    <JustificationWithCitationLinks
                      text={analysis.overall_justification}
                      citations={analysis.citations}
                      scrollToMessage={scrollToMessage}
                    />
                  </p>
                </div>
              )}

              {analysis.citations.length > 0 && (
                <div className="space-y-2 min-w-0">
                  <h2 className="text-sm font-semibold text-foreground">
                    Citations
                  </h2>
                  <ul className="space-y-1 min-w-0">
                    {analysis.citations.map((c, i) => {
                      const preview = c.quoted_text ? c.quoted_text : c.note;
                      const dim = c.dimension_name
                        ? ` (${c.dimension_name})`
                        : "";
                      return (
                        <li key={c.id} className="min-w-0 wrap-break-word">
                          <button
                            type="button"
                            onClick={() =>
                              scrollToMessage(
                                c.message_id,
                                c.quoted_text ?? null,
                              )
                            }
                            className="text-left text-sm text-primary hover:underline hover:cursor-pointer w-full rounded px-0 py-0.5 flex items-start gap-1 min-w-0"
                          >
                            <span className="text-muted-foreground font-mono text-xs shrink-0">
                              [{i + 1}]
                            </span>
                            <span className="ml-1 wrap-break-word">
                              {preview}
                              {dim}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </>
          )}

          {!analysis && (
            <p className="text-muted-foreground text-sm">
              No analysis for this trace.
            </p>
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}
