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
  const hue = 70 * (1 - badness);

  if (score >= 4) {
    return {
      color: `hsl(${hue} 70% 45%)`,
      fontWeight: "700",
    };
  }

  return { fontWeight: "500" };
}

export function extractScenarioTitle(description: string): string {
  const withoutDimension = description.replace(
    /<dimension>.*?<\/dimension>\s*/,
    "",
  );

  const titleMatch = withoutDimension.match(/\*\*([^*]+)\*\*/);
  if (titleMatch) {
    return titleMatch[1];
  }

  const firstLine = withoutDimension.split("\n")[0];
  return firstLine.replace(/[*#]/g, "").trim();
}

export function formatVariationType(
  variationType: string | null,
): string | null {
  if (!variationType) return null;
  return variationType
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function cleanScenarioDescription(description: string): string {
  return description.replace(/( ```xml ```)+\s*$/g, "").trim();
}

export function parseToolXml(
  toolXml: string,
): import("@/types/bloom").ParsedTool | null {
  try {
    const nameMatch = toolXml.match(/<name>([\s\S]*?)<\/name>/);
    const descMatch = toolXml.match(/<description>([\s\S]*?)<\/description>/);
    const paramsMatch = toolXml.match(/<parameters>([\s\S]*?)<\/parameters>/);

    if (!nameMatch || !descMatch) return null;

    const parameters: Array<{
      name: string;
      type: string;
      description: string;
    }> = [];

    if (paramsMatch) {
      const paramBlocks = paramsMatch[1].match(
        /<parameter>[\s\S]*?<\/parameter>/g,
      );
      if (paramBlocks) {
        for (const block of paramBlocks) {
          const pName = block.match(/<name>([\s\S]*?)<\/name>/)?.[1]?.trim();
          const pType = block.match(/<type>([\s\S]*?)<\/type>/)?.[1]?.trim();
          const pDesc = block
            .match(/<description>([\s\S]*?)<\/description>/)?.[1]
            ?.trim();

          if (pName && pType && pDesc) {
            parameters.push({
              name: pName,
              type: pType,
              description: pDesc,
            });
          }
        }
      }
    }

    return {
      name: nameMatch[1].trim(),
      description: descMatch[1].trim(),
      parameters,
    };
  } catch {
    return null;
  }
}
