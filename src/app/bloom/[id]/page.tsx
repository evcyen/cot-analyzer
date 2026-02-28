"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Spinner } from "@/components/ui/spinner";
import type { BloomBatchDetail } from "@/types/bloom";
import { BatchBreadcrumb } from "@/components/BatchBreadcrumb";
import { OverviewTab } from "./components/OverviewTab";
import { UnderstandingTab } from "./components/UnderstandingTab";
import { ScenariosTab } from "./components/ScenariosTab";

export default function BloomBatchPage() {
  const params = useParams();
  const batchId = params?.id as string;

  const [data, setData] = useState<BloomBatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!batchId) return;

    const fetchBatchDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/bloom/${batchId}`);
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(json.error ?? "Failed to load Bloom batch");
        }
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load batch");
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchBatchDetail();
  }, [batchId]);

  if (loading) {
    return (
      <div className="min-h-screen p-6">
        <div className="mx-auto w-full">
          <div className="mb-6 min-h-6">
            <BatchBreadcrumb
              batchId={batchId}
              batchName="..."
              sourceType="bloom"
            />
          </div>
          <div className="flex items-center justify-center py-12">
            <Spinner className="size-8" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen p-6">
        <div className="mx-auto w-full">
          <div className="mb-6 min-h-6">
            <BatchBreadcrumb
              batchId={batchId}
              batchName="..."
              sourceType="bloom"
            />
          </div>
          <Card>
            <CardContent className="pt-6">
              <p className="text-destructive text-sm">
                {error ?? "Batch not found"}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col p-6">
      <div className="mx-auto w-full flex-1 flex flex-col min-h-0">
        <div className="mb-4 min-h-6 shrink-0">
          <BatchBreadcrumb
            batchId={batchId}
            batchName={data.batch.name}
            sourceType="bloom"
          />
        </div>

        <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0">
          <TabsList className="shrink-0">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="understanding">Understanding</TabsTrigger>
            <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="flex-1 min-h-0 mt-2">
            <OverviewTab data={data} batchId={batchId} />
          </TabsContent>

          <TabsContent value="understanding" className="flex-1 min-h-0 mt-2">
            <UnderstandingTab data={data} />
          </TabsContent>

          <TabsContent value="scenarios" className="flex-1 min-h-0 mt-2">
            <ScenariosTab data={data} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
