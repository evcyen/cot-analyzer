/**
 * Dimension group slugs in display order (matches migration backfill).
 */
export const GROUP_ORDER = [
  "faithfulness",
  "harmful_conduct",
  "deception",
  "unprompted_behavior",
  "compliance",
  "audit_context",
  "quality",
  "other",
] as const;

export type DimensionGroupSlug = (typeof GROUP_ORDER)[number];

export const GROUP_DISPLAY_NAMES: Record<string, string> = {
  faithfulness: "Faithfulness",
  harmful_conduct: "Harmful conduct",
  deception: "Deception",
  unprompted_behavior: "Unprompted behavior",
  compliance: "Compliance",
  audit_context: "Audit context",
  quality: "Quality",
  other: "Other",
};

/**
 * Tailwind classes for group header/toggle background and text.
 * Same colors used for dimension column headers and group toggle chips.
 */
export const GROUP_COLOR_CLASSES: Record<string, string> = {
  faithfulness:
    "bg-blue-100 text-blue-900 dark:bg-blue-950/50 dark:text-blue-200",
  harmful_conduct:
    "bg-rose-100 text-rose-900 dark:bg-rose-950/50 dark:text-rose-200",
  deception:
    "bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200",
  unprompted_behavior:
    "bg-violet-100 text-violet-900 dark:bg-violet-950/50 dark:text-violet-200",
  compliance:
    "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200",
  audit_context:
    "bg-cyan-100 text-cyan-900 dark:bg-cyan-950/50 dark:text-cyan-200",
  quality: "bg-teal-100 text-teal-900 dark:bg-teal-950/50 dark:text-teal-200",
  other: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

export function getGroupColorClass(group: string | null): string {
  if (!group) return "bg-muted text-muted-foreground";
  return GROUP_COLOR_CLASSES[group] ?? "bg-muted text-muted-foreground";
}

export function sortDimensionsByGroup<
  T extends { name: string; group: string | null },
>(dimensions: T[]): T[] {
  return [...dimensions].sort((a, b) => {
    const ai = GROUP_ORDER.indexOf(a.group as (typeof GROUP_ORDER)[number]);
    const bi = GROUP_ORDER.indexOf(b.group as (typeof GROUP_ORDER)[number]);
    const orderA = ai === -1 ? GROUP_ORDER.length : ai;
    const orderB = bi === -1 ? GROUP_ORDER.length : bi;
    if (orderA !== orderB) return orderA - orderB;
    return a.name.localeCompare(b.name);
  });
}
