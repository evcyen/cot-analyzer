"use client";

import { ModelUsageTable } from "@/components/ModelUsageTable";
import { useBatchDetailContext } from "@/contexts/BatchDetailContext";
import { formatDuration } from "@/helpers/formatters";

export function BatchStatsTab() {
  const { batch } = useBatchDetailContext();

  if (!batch) return null;

  const duration = formatDuration(
    batch.started_at ?? null,
    batch.completed_at ?? null,
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-1">
          Batch duration
        </h3>
        <p className="text-sm">{duration}</p>
      </div>
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-2">
          Token usage per model
        </h3>
        <ModelUsageTable modelUsage={batch.model_usage} />
      </div>
    </div>
  );
}
