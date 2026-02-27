"use client";

import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface BatchBreadcrumbProps {
  batchId: string;
  batchName: string;
  traceModel?: string | null;
}

export function BatchBreadcrumb({
  batchId,
  batchName,
  traceModel,
}: BatchBreadcrumbProps) {
  const showTrace = traceModel != null && traceModel !== "";

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/">Home</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          {showTrace ? (
            <BreadcrumbLink asChild>
              <Link href={`/batches/${batchId}`}>{batchName}</Link>
            </BreadcrumbLink>
          ) : (
            <BreadcrumbPage>{batchName}</BreadcrumbPage>
          )}
        </BreadcrumbItem>
        {showTrace && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{traceModel}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
