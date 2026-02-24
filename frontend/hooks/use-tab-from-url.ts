"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

/**
 * Sync tab state with URL search param `tab`.
 * Returns [activeTab, handleTabChange]. Invalid or missing param falls back to defaultTab.
 */
export function useTabFromUrl<T extends string>(
  validValues: readonly T[],
  defaultTab: T,
): [T, (value: string) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams?.get("tab");
  const activeTab =
    tabParam != null && (validValues as readonly string[]).includes(tabParam)
      ? (tabParam as T)
      : defaultTab;

  const handleTabChange = useCallback(
    (value: string) => {
      if (!pathname) return;
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      params.set("tab", value);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, router, searchParams],
  );

  return [activeTab, handleTabChange];
}
