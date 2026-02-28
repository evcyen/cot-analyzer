import type { BloomHighlight, BloomCitationPart } from "@/types/bloom";
import type { CitationEntry } from "@/types/trace-detail";

/**
 * Transform Bloom's hierarchical highlight structure into Petri's flat citation format
 * This allows reuse of all Petri citation components unchanged
 */
export function transformBloomHighlightsToCitations(
  highlights: (BloomHighlight & { parts: BloomCitationPart[] })[],
): CitationEntry[] {
  const citations: CitationEntry[] = [];

  highlights.forEach((highlight) => {
    highlight.parts.forEach((part) => {
      // Skip parts without resolved message IDs
      if (!part.message_id) return;

      citations.push({
        id: part.id,
        message_id: part.message_id,
        quoted_text: highlight.quoted_text,
        note: highlight.reasoning,
        score_id: null,
        dimension_name: null,
        position_start: null,
        position_end: null,
      });
    });
  });

  return citations;
}
