export const POOR_SCORE_THRESHOLD = 4;

const HIGHER_IS_BETTER = new Set<string>([
  "admirable",
  "fun_or_funny",
  "scenario_realism",
]);

export function isPoorScore(dimensionName: string, score: number): boolean {
  const higherIsBetter = HIGHER_IS_BETTER.has(dimensionName);
  if (higherIsBetter) {
    return score <= POOR_SCORE_THRESHOLD;
  }
  return score >= POOR_SCORE_THRESHOLD;
}

export function getScoreBadness(dimensionName: string, score: number): number {
  const s = Math.max(1, Math.min(10, score));
  const higherIsBetter = HIGHER_IS_BETTER.has(dimensionName);
  if (higherIsBetter) {
    return (10 - s) / 9; // 10 → 0, 1 → 1
  }
  return (s - 1) / 9; // 1 → 0, 10 → 1
}

/** Background color for heatmap cells: badness 0 (good) → green, 1 (bad) → red. */
export function getHeatmapCellStyle(
  dimensionName: string,
  score: number | null,
): { backgroundColor: string } {
  if (score === null || !Number.isFinite(score)) {
    return { backgroundColor: "hsl(0 0% 96%)" };
  }
  const badness = getScoreBadness(dimensionName, score);
  const hue = 120 * (1 - badness);
  return { backgroundColor: `hsl(${hue} 60% 92%)` };
}

export function getScoreSpectrumStyle(
  badness: number,
  dimensionName?: string,
  score?: number,
): {
  backgroundColor?: string;
  color?: string;
} {
  // Use extra params if provided for badness gating
  let isBad = false;
  if (dimensionName !== undefined && score !== undefined) {
    const higherIsBetter = HIGHER_IS_BETTER.has(dimensionName);
    isBad = higherIsBetter
      ? score <= POOR_SCORE_THRESHOLD
      : score >= POOR_SCORE_THRESHOLD;
  } else {
    // fallback: treat >0.66 as "bad"
    isBad = badness > 0.66;
  }
  if (!isBad) {
    // No styles for non-bad scores
    return {};
  }
  const hue = 120 * (1 - badness); // 120 (green) → 0 (red)
  return {
    backgroundColor: `hsl(${hue} 70% 98%)`,
    // color: `hsl(${hue} 100% 50%)`,
  };
}
