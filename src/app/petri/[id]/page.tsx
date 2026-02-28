"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BatchBreadcrumb } from "@/components/BatchBreadcrumb";
import { BatchStatsTab } from "./components/BatchStatsTab";
import { BatchTracesTable } from "./components/BatchTracesTable";
import {
  BatchDetailProvider,
  useBatchDetailContext,
} from "@/contexts/BatchDetailContext";
import { DimensionSelectionProvider } from "@/contexts/DimensionSelectionContext";
import { useTabFromUrl } from "@/hooks/use-tab-from-url";

const BATCH_TABS = ["traces", "stats"] as const;

export default function BatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [batchId, setBatchId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    params.then((p) => {
      if (!cancelled) setBatchId(p.id);
    });
    return () => {
      cancelled = true;
    };
  }, [params]);

  if (batchId === null) return null;

  return (
    <TooltipProvider>
      <BatchDetailProvider batchId={batchId}>
        <DimensionSelectionProvider>
          <div className="min-h-screen p-6">
            <div className="mx-auto max-w-full">
              <div className="mb-6 min-h-6">
                <BatchPageBreadcrumb batchId={batchId} />
              </div>
              <BatchLoadingOrError />
              <BatchContentOrTabs />
            </div>
          </div>
        </DimensionSelectionProvider>
      </BatchDetailProvider>
    </TooltipProvider>
  );
}

function BatchPageBreadcrumb({ batchId }: { batchId: string }) {
  const { batch } = useBatchDetailContext();
  return <BatchBreadcrumb batchId={batchId} batchName={batch?.name ?? "..."} />;
}

function BatchLoadingOrError() {
  const { loading, error } = useBatchDetailContext();
  if (loading) {
    return <p className="text-muted-foreground text-sm">Loading traces...</p>;
  }
  if (error) {
    return (
      <p className="text-destructive text-sm" role="alert">
        {error}
      </p>
    );
  }
  return null;
}

function BatchContentOrTabs() {
  const { loading, error } = useBatchDetailContext();
  const [activeTab, handleTabChange] = useTabFromUrl(BATCH_TABS, "traces");

  if (loading || error) return null;

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <TabsList aria-label="Batch view">
        <TabsTrigger value="traces">Traces</TabsTrigger>
        <TabsTrigger value="stats">Stats</TabsTrigger>
      </TabsList>
      <TabsContent value="traces" className="mt-4">
        <BatchTracesTable />
      </TabsContent>
      <TabsContent value="stats" className="mt-4">
        <BatchStatsTab />
      </TabsContent>
    </Tabs>
  );
}
