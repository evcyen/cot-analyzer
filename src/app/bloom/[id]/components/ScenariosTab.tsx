"use client";

import { useState } from "react";
import Markdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { BloomBatchDetail } from "@/types/bloom";

interface ScenariosTabProps {
  data: BloomBatchDetail;
}

/**
 * Extract the scenario title from the description markdown
 * E.g., "**Scenario 1: Research Grant Proposal Review**" -> "Scenario 1: Research Grant Proposal Review"
 */
function extractScenarioTitle(description: string): string {
  // Remove the <dimension> tag if present
  const withoutDimension = description.replace(
    /<dimension>.*?<\/dimension>\s*/,
    "",
  );

  // Extract text between first ** markers (bolded title)
  const titleMatch = withoutDimension.match(/\*\*([^*]+)\*\*/);
  if (titleMatch) {
    return titleMatch[1];
  }

  // Fallback: use first line without markdown
  const firstLine = withoutDimension.split("\n")[0];
  return firstLine.replace(/[*#]/g, "").trim();
}

/**
 * Format variation type for display
 * E.g., "emotional_pressure" -> "Emotional Pressure"
 */
function formatVariationType(variationType: string | null): string | null {
  if (!variationType) return null;
  return variationType
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function ScenariosTab({ data }: ScenariosTabProps) {
  const { scenarios } = data;
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(
    scenarios[0]?.id ?? null,
  );

  if (!scenarios || scenarios.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            No scenarios available
          </p>
        </CardContent>
      </Card>
    );
  }

  const activeScenario = scenarios.find((s) => s.id === activeScenarioId);

  return (
    <div className="flex gap-4 h-full">
      {/* Sidebar */}
      <Card className="w-108 shrink-0">
        <CardContent className="px-4">
          <nav className="space-y-2">
            {scenarios.map((scenario) => {
              const title = extractScenarioTitle(scenario.description);
              const formattedVariation = formatVariationType(
                scenario.variation_type,
              );

              return (
                <button
                  key={scenario.id}
                  onClick={() => setActiveScenarioId(scenario.id)}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                    activeScenarioId === scenario.id
                      ? "bg-primary text-primary-foreground font-medium"
                      : "hover:bg-muted",
                  )}
                >
                  <div className="flex flex-col gap-0.5">
                    <span
                      className={cn(
                        activeScenarioId === scenario.id
                          ? "text-primary-foreground"
                          : "text-foreground",
                      )}
                    >
                      {title}
                    </span>
                    {formattedVariation && (
                      <span
                        className={cn(
                          "text-xs",
                          activeScenarioId === scenario.id
                            ? "text-primary-foreground/70"
                            : "text-muted-foreground",
                        )}
                      >
                        {formattedVariation}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </nav>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Card className="flex-1 flex flex-col min-h-0">
        <CardContent className="flex-1 min-h-0 overflow-y-auto px-6">
          {activeScenario ? (
            <div className="prose prose-sm dark:prose-invert max-w-none [&_strong]:block [&_strong]:mt-4 [&_strong:first-child]:mt-0">
              <Markdown rehypePlugins={[rehypeRaw]}>
                {activeScenario.description}
              </Markdown>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Select a scenario to view its details
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
