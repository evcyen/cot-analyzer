"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import Markdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatCard, ScoreStatCard } from "@/components/charts/StatCard";
import {
  formatScore,
  formatPercent,
  cleanMetajudgeResponse,
  formatTranscriptDisplayId,
  formatScoreDimension,
  getBloomScoreColorStyle,
} from "@/lib/formatters/bloom";
import type { BloomBatchDetail } from "@/types/bloom";

interface OverviewTabProps {
  data: BloomBatchDetail;
  batchId: string;
}

export function OverviewTab({ data, batchId }: OverviewTabProps) {
  const { batch, transcripts } = data;
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Dynamically detect all score dimensions from transcripts
  const scoreDimensions = useMemo(() => {
    const dimensionsSet = new Set<string>();
    transcripts.forEach((t) => {
      if (t.scores) {
        Object.keys(t.scores).forEach((key) => dimensionsSet.add(key));
      }
    });
    // Put behavior_presence first, then sort others alphabetically
    const dimensions = Array.from(dimensionsSet);
    return dimensions.sort((a, b) => {
      if (a === "behavior_presence") return -1;
      if (b === "behavior_presence") return 1;
      return a.localeCompare(b);
    });
  }, [transcripts]);

  // Calculate average scores for all dimensions
  const avgScores = useMemo(() => {
    if (!transcripts || transcripts.length === 0) {
      return {};
    }

    const sums: Record<string, number> = {};
    const counts: Record<string, number> = {};

    transcripts.forEach((t) => {
      if (t.scores) {
        Object.entries(t.scores).forEach(([key, value]) => {
          if (typeof value === "number") {
            sums[key] = (sums[key] || 0) + value;
            counts[key] = (counts[key] || 0) + 1;
          }
        });
      }
    });

    const averages: Record<string, number> = {};
    Object.keys(sums).forEach((key) => {
      averages[key] = counts[key] > 0 ? sums[key] / counts[key] : 0;
    });

    return averages;
  }, [transcripts]);

  // Sort transcripts
  const sortedTranscripts = useMemo(() => {
    if (!sortColumn) return transcripts;

    return [...transcripts].sort((a, b) => {
      const aValue = a.scores?.[sortColumn] ?? 0;
      const bValue = b.scores?.[sortColumn] ?? 0;

      if (sortDirection === "asc") {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    });
  }, [transcripts, sortColumn, sortDirection]);

  const handleSort = (dimension: string) => {
    if (sortColumn === dimension) {
      // Toggle direction
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      // New column, default to descending
      setSortColumn(dimension);
      setSortDirection("desc");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
      <div className="flex flex-col gap-4 min-h-0">
        <div className="grid grid-cols-2 gap-4 shrink-0">
          <StatCard
            title="Elicitation Rate"
            value={formatPercent(batch.elicitation_rate)}
          />
          <ScoreStatCard
            title="Diversity Score"
            score={batch.diversity_score}
            getColorStyle={getBloomScoreColorStyle}
          />
        </div>

        <Tabs defaultValue="response" className="flex-1 flex flex-col min-h-0">
          <TabsList className="w-full shrink-0">
            <TabsTrigger value="response" className="flex-1">
              Response
            </TabsTrigger>
            <TabsTrigger value="justification" className="flex-1">
              Diversity
            </TabsTrigger>
          </TabsList>
          <TabsContent
            value="response"
            className="flex-1 min-h-0 data-[state=active]:flex data-[state=active]:flex-col"
          >
            <Card className="flex-1 flex flex-col min-h-0">
              <CardContent className="flex-1 min-h-0 overflow-y-auto">
                <div className="prose prose-sm dark:prose-invert max-w-none [&_strong]:block [&_strong]:mt-4 [&_strong:first-child]:mt-0">
                  <Markdown rehypePlugins={[rehypeRaw]}>
                    {cleanMetajudgeResponse(batch.metajudge_response)}
                  </Markdown>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent
            value="justification"
            className="flex-1 min-h-0 data-[state=active]:flex data-[state=active]:flex-col"
          >
            <Card className="flex-1 flex flex-col min-h-0">
              <CardContent className="flex-1 min-h-0 overflow-y-auto">
                <div className="prose prose-sm dark:prose-invert max-w-none [&_strong]:block [&_strong]:mt-4 [&_strong:first-child]:mt-0">
                  <Markdown rehypePlugins={[rehypeRaw]}>
                    {batch.metajudge_justification ??
                      "No justification available"}
                  </Markdown>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <div className="lg:col-span-2 flex flex-col gap-4 min-h-0">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
          <ScoreStatCard
            title="Avg Behavior Presence"
            score={batch.avg_behavior_presence}
            getColorStyle={getBloomScoreColorStyle}
          />
          {scoreDimensions
            .filter((dim) => dim !== "behavior_presence")
            .slice(0, 3)
            .map((dimension) => (
              <ScoreStatCard
                key={dimension}
                title={`Avg ${formatScoreDimension(dimension)}`}
                score={avgScores[dimension] ?? null}
                getColorStyle={getBloomScoreColorStyle}
              />
            ))}
        </div>
        <Card className="flex-1 flex flex-col min-h-0">
          <CardHeader className="shrink-0">
            <CardTitle>
              Transcripts ({batch.transcript_count?.toString() ?? "0"})
            </CardTitle>
            <CardDescription>
              Target:{" "}
              <span className="font-mono font-semibold">
                {batch.target_model}
              </span>{" "}
              <br /> Auditor:{" "}
              <span className="font-mono font-semibold">
                {batch.auditor_model}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 relative">
            <div className="relative w-full h-full rounded-md border overflow-auto">
              <Table>
                <TableHeader
                  className="sticky top-0 bg-background z-30"
                  style={{
                    boxShadow: "0 1px 3px -1px rgba(0,0,0,0.15)",
                  }}
                >
                  <TableRow>
                    <TableHead
                      className="sticky left-0 bg-background"
                      style={{
                        boxShadow: "inset -4px 0 3px -4px rgba(0,0,0,0.15)",
                      }}
                    >
                      ID
                    </TableHead>
                    <TableHead className="bg-background">Summary</TableHead>
                    {scoreDimensions.map((dimension) => {
                      const isSorted = sortColumn === dimension;
                      const SortIcon = isSorted
                        ? sortDirection === "asc"
                          ? ArrowUp
                          : ArrowDown
                        : ArrowUpDown;
                      return (
                        <TableHead
                          key={dimension}
                          className="text-right bg-background"
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 -my-2 hover:bg-muted"
                            onClick={() => handleSort(dimension)}
                          >
                            {formatScoreDimension(dimension)}
                            <SortIcon
                              className={`ml-2 h-3 w-3 ${isSorted ? "text-primary" : ""}`}
                            />
                          </Button>
                        </TableHead>
                      );
                    })}
                    <TableHead
                      className="sticky right-0 bg-background z-20"
                      style={{
                        boxShadow: "inset 4px 0 3px -4px rgba(0,0,0,0.15)",
                      }}
                    ></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedTranscripts.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={scoreDimensions.length + 3}
                        className="text-center text-muted-foreground"
                      >
                        No transcripts found
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedTranscripts.map((transcript) => (
                      <TableRow key={transcript.id}>
                        <TableCell
                          className="font-mono text-xs sticky left-0 bg-background z-10"
                          style={{
                            boxShadow: "inset -4px 0 3px -4px rgba(0,0,0,0.15)",
                          }}
                        >
                          <span className="font-mono text-xs truncate">
                            {formatTranscriptDisplayId(
                              transcript.variation_number,
                              transcript.repetition_number,
                            )}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-md truncate">
                          {transcript.summary ?? "—"}
                        </TableCell>
                        {scoreDimensions.map((dimension) => {
                          const score = transcript.scores?.[dimension];
                          const colorStyle = getBloomScoreColorStyle(score);
                          return (
                            <TableCell
                              key={dimension}
                              className="text-right tabular-nums"
                              style={colorStyle}
                            >
                              {formatScore(score)}
                            </TableCell>
                          );
                        })}
                        <TableCell
                          className="sticky right-0 bg-background z-10"
                          style={{
                            boxShadow: "inset 4px 0 3px -4px rgba(0,0,0,0.15)",
                          }}
                        >
                          <Button variant="ghost" size="sm" asChild>
                            <Link
                              href={`/bloom/${batchId}/traces/${transcript.id}`}
                            >
                              View
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
