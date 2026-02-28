"use client";

import Link from "next/link";
import { useMemo } from "react";
import Markdown from "react-markdown";
import rehypeRaw from "rehype-raw";
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
} from "@/lib/formatters/bloom";
import type { BloomBatchDetail } from "@/types/bloom";

interface OverviewTabProps {
  data: BloomBatchDetail;
  batchId: string;
}

export function OverviewTab({ data, batchId }: OverviewTabProps) {
  const { batch, transcripts } = data;

  const avgScores = useMemo(() => {
    if (!transcripts || transcripts.length === 0) {
      return {
        unrealism: 0,
        evaluation_awareness: 0,
        evaluation_invalidity: 0,
      };
    }

    const sums = {
      unrealism: 0,
      evaluation_awareness: 0,
      evaluation_invalidity: 0,
    };
    const counts = {
      unrealism: 0,
      evaluation_awareness: 0,
      evaluation_invalidity: 0,
    };

    transcripts.forEach((t) => {
      if (typeof t.unrealism === "number") {
        sums.unrealism += t.unrealism;
        counts.unrealism++;
      }
      if (typeof t.evaluation_awareness === "number") {
        sums.evaluation_awareness += t.evaluation_awareness;
        counts.evaluation_awareness++;
      }
      if (typeof t.evaluation_invalidity === "number") {
        sums.evaluation_invalidity += t.evaluation_invalidity;
        counts.evaluation_invalidity++;
      }
    });

    return {
      unrealism: counts.unrealism > 0 ? sums.unrealism / counts.unrealism : 0,
      evaluation_awareness:
        counts.evaluation_awareness > 0
          ? sums.evaluation_awareness / counts.evaluation_awareness
          : 0,
      evaluation_invalidity:
        counts.evaluation_invalidity > 0
          ? sums.evaluation_invalidity / counts.evaluation_invalidity
          : 0,
    };
  }, [transcripts]);

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
          />
          <ScoreStatCard title="Avg Unrealism" score={avgScores.unrealism} />
          <ScoreStatCard
            title="Avg Eval Awareness"
            score={avgScores.evaluation_awareness}
          />
          <ScoreStatCard
            title="Avg Eval Invalidity"
            score={avgScores.evaluation_invalidity}
          />
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
          <CardContent className="flex-1 min-h-0 overflow-y-auto">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Summary</TableHead>
                    <TableHead className="text-right">Behavior</TableHead>
                    <TableHead className="text-right">Unrealism</TableHead>
                    <TableHead className="text-right">Eval Aware</TableHead>
                    <TableHead className="text-right">Eval Invalid</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transcripts.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center text-muted-foreground"
                      >
                        No transcripts found
                      </TableCell>
                    </TableRow>
                  ) : (
                    transcripts.map((transcript) => (
                      <TableRow key={transcript.id}>
                        <TableCell className="font-mono text-xs">
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
                        <TableCell className="text-right tabular-nums">
                          {formatScore(transcript.behavior_presence)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatScore(transcript.unrealism)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatScore(transcript.evaluation_awareness)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatScore(transcript.evaluation_invalidity)}
                        </TableCell>
                        <TableCell>
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
