"use client";

import { useState } from "react";
import Markdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { BloomBatchDetail } from "@/types/bloom";
import {
  extractScenarioTitle,
  formatVariationType,
  cleanScenarioDescription,
  parseToolXml,
} from "@/lib/formatters/bloom";

interface ScenariosTabProps {
  data: BloomBatchDetail;
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
      <Card className="w-108 shrink-0 overflow-y-auto">
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
      <Card>
        <CardContent className="px-4 overflow-y-auto pb-2">
          {activeScenario ? (
            <div className="space-y-6">
              <div className="prose prose-sm dark:prose-invert max-w-none [&_strong]:block [&_strong]:mt-4 [&_strong:first-child]:mt-0">
                <Markdown rehypePlugins={[rehypeRaw]}>
                  {cleanScenarioDescription(activeScenario.description)}
                </Markdown>
              </div>

              {Array.isArray(activeScenario.tools) &&
                activeScenario.tools.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-foreground">
                      Tools Available
                    </h3>
                    <div className="space-y-2">
                      {activeScenario.tools.map((toolXml, idx) => {
                        const tool =
                          typeof toolXml === "string"
                            ? parseToolXml(toolXml)
                            : null;
                        if (!tool) return null;

                        return (
                          <Card key={idx}>
                            <CardContent>
                              <div className="space-y-1">
                                <h4 className="text-sm font-mono font-medium text-foreground">
                                  {tool.name}
                                </h4>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                  {tool.description}
                                </p>
                                {tool.parameters.length > 0 && (
                                  <div className="mt-2 space-y-2">
                                    <p className="text-xs font-medium text-foreground">
                                      Parameters:
                                    </p>
                                    <div className="space-y-2">
                                      {tool.parameters.map((param, pidx) => (
                                        <div key={pidx} className="pl-3">
                                          <div className="flex items-baseline gap-2">
                                            <code className="text-xs font-mono text-foreground">
                                              {param.name}
                                            </code>
                                            <span className="text-xs text-muted-foreground">
                                              ({param.type})
                                            </span>
                                          </div>
                                          <p className="text-xs text-muted-foreground mt-0.5">
                                            {param.description}
                                          </p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}
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
