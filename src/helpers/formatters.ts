/**
 * Format a duration between two ISO date strings as "Xh Ym Zs".
 * Returns "—" if either date is missing or invalid.
 */
export function formatDuration(
  startedAt: string | null | undefined,
  completedAt: string | null | undefined,
): string {
  if (!startedAt || !completedAt) return "—";
  const start = Date.parse(startedAt);
  const end = Date.parse(completedAt);
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return "—";
  const ms = end - start;
  const seconds = Math.floor(ms / 1000) % 60;
  const minutes = Math.floor(ms / 60000) % 60;
  const hours = Math.floor(ms / 3600000);
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);
  return parts.join(" ");
}

/**
 * Format a duration in seconds as "Xh Ym Zs" or "—" if missing/invalid.
 */
export function formatDurationSeconds(
  seconds: number | null | undefined,
): string {
  if (seconds == null || typeof seconds !== "number" || seconds < 0) return "—";
  const sec = Math.floor(seconds) % 60;
  const minutes = Math.floor(seconds / 60) % 60;
  const hours = Math.floor(seconds / 3600);
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${sec}s`);
  return parts.join(" ");
}
