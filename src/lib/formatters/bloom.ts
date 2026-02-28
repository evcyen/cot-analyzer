export function formatScoreDimension(dimension: string): string {
  return dimension
    .replace(/[-_]/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function formatScore(score: number | null | undefined): string {
  return score == null ? "—" : Math.round(score).toString();
}

export function formatPercent(value: number | null | undefined): string {
  return value == null ? "—" : `${Math.round(value * 100)}%`;
}

export function cleanMetajudgeResponse(text: string | null): string {
  if (!text) return "";
  return text
    .replace(/<diversity_score>[\s\S]*?<\/diversity_score>/g, "")
    .replace(/<justification>[\s\S]*?<\/justification>/g, "")
    .trim();
}

export function formatTranscriptDisplayId(
  variationNumber: number | null,
  repetitionNumber: number | null,
): string {
  if (variationNumber == null || repetitionNumber == null) {
    return "—";
  }
  return `v${variationNumber}r${repetitionNumber}`;
}

export function isBloomScorePoor(score: number): boolean {
  return score >= 4;
}

export function getBloomScoreBadness(score: number): number {
  const s = Math.max(1, Math.min(10, score));
  return (s - 1) / 9;
}

export function getBloomScoreColorStyle(score: number | null | undefined): {
  color?: string;
  fontWeight?: string;
} {
  if (score == null) return {};

  const badness = getBloomScoreBadness(score);
  const hue = 30 * (1 - badness);

  if (score >= 4) {
    return {
      color: `hsl(${hue} 90% 45%)`,
      fontWeight: "700",
    };
  }

  return { fontWeight: "500" };
}
