export function formatScore(score: number | null | undefined): string {
  if (score == null) return "—";
  return Math.round(score).toString();
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null) return "—";
  return `${(value * 100).toFixed(1)}%`;
}

export function cleanMetajudgeResponse(
  response: string | null | undefined,
): string {
  if (!response) return "No response available";
  return response
    .replace(/<diversity_score>[\s\S]*?<\/diversity_score>\s*/g, "")
    .replace(/<justification>[\s\S]*?<\/justification>\s*/g, "")
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
