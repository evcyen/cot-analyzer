"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string;
  className?: string;
}

export function StatCard({ title, value, className }: StatCardProps) {
  return (
    <Card className={cn(className, "w-full")}>
      <CardHeader className="pb-1">
        <CardTitle className="text-xs font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <span className="text-2xl font-semibold tabular-nums">{value}</span>
      </CardContent>
    </Card>
  );
}

interface ScoreStatCardProps {
  title: string;
  score: number | null | undefined;
  className?: string;
}

export function ScoreStatCard({ title, score, className }: ScoreStatCardProps) {
  return (
    <Card className={cn(className, "w-full")}>
      <CardHeader className="pb-1">
        <CardTitle className="text-xs font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-semibold tabular-nums">
            {score == null ? "—" : Math.round(score)}
          </span>
          <span className="text-sm text-muted-foreground"> / 10</span>
        </div>
      </CardContent>
    </Card>
  );
}
