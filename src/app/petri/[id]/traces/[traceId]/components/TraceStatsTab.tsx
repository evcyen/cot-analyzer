"use client";

import { ModelUsageTable } from "@/components/ModelUsageTable";
import { useTraceDetailContext } from "@/contexts/TraceDetailContext";
import { formatDurationSeconds } from "@/helpers/formatters";

export function TraceStatsTab() {
  const { trace } = useTraceDetailContext();

  if (!trace) return null;

  const totalTime = formatDurationSeconds(trace.total_time ?? null);
  const workingTime = formatDurationSeconds(trace.working_time ?? null);

  return (
    <div className="space-y-6">
      <div>
        <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Total time</dt>
            <dd>{totalTime}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Working time</dt>
            <dd>{workingTime}</dd>
          </div>
        </dl>
      </div>
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-2">
          Token usage per model
        </h3>
        <ModelUsageTable modelUsage={trace.model_usage} />
      </div>
    </div>
  );
}
