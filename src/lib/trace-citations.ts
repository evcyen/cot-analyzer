import type { CitationEntry } from "@/types/trace-detail";

export interface RangeWithCitations {
  start: number;
  end: number;
  citations: CitationEntry[];
}

/** Merge overlapping [start, end) ranges and combine their citations */
export function mergeRangesWithCitations(
  ranges: RangeWithCitations[],
): RangeWithCitations[] {
  if (ranges.length === 0) return [];
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const out: RangeWithCitations[] = [{ ...sorted[0] }];
  for (let i = 1; i < sorted.length; i++) {
    const last = out[out.length - 1];
    if (sorted[i].start <= last.end) {
      last.end = Math.max(last.end, sorted[i].end);
      const seen = new Set(last.citations.map((c) => c.id));
      for (const c of sorted[i].citations) {
        if (!seen.has(c.id)) {
          seen.add(c.id);
          last.citations.push(c);
        }
      }
    } else {
      out.push({ ...sorted[i] });
    }
  }
  return out;
}

/**
 * Find start index of a quote in text using exact match only (no fuzzy/whitespace flexibility).
 * Tries exact match, then trimmed quote. Returns null if not found.
 */
export function findQuoteInText(
  quote: string,
  text: string,
): { start: number; end: number } | null {
  if (!quote || !text) return null;
  const idx = text.indexOf(quote);
  if (idx !== -1) return { start: idx, end: idx + quote.length };
  const trimmed = quote.trim();
  if (trimmed.length === 0) return null;
  const idxTrimmed = text.indexOf(trimmed);
  if (idxTrimmed !== -1)
    return { start: idxTrimmed, end: idxTrimmed + trimmed.length };
  return null;
}

/** Get character ranges in text that should be highlighted (cited), with citation(s) per range. */
export function getCitationRangesWithCitations(
  text: string,
  citations: CitationEntry[],
  usePosition: boolean,
): RangeWithCitations[] {
  const ranges: RangeWithCitations[] = [];
  for (const c of citations) {
    if (c.position_start != null && c.position_end != null && usePosition) {
      if (c.position_start >= 0 && c.position_end <= text.length) {
        ranges.push({
          start: c.position_start,
          end: c.position_end,
          citations: [c],
        });
      }
    }
    if (c.quoted_text && c.quoted_text.length > 0) {
      const found = findQuoteInText(c.quoted_text, text);
      if (found) {
        ranges.push({
          start: found.start,
          end: found.end,
          citations: [c],
        });
      }
    }
  }
  return mergeRangesWithCitations(ranges);
}

export interface CitationSegment {
  text: string;
  highlight: boolean;
  citations: CitationEntry[];
}

/** Split text into segments: plain and highlighted (with citations for tooltip) */
export function segmentizeWithCitations(
  text: string,
  ranges: RangeWithCitations[],
): CitationSegment[] {
  if (ranges.length === 0) return [{ text, highlight: false, citations: [] }];
  const out: CitationSegment[] = [];
  let last = 0;
  for (const r of ranges) {
    if (r.start > last) {
      out.push({
        text: text.slice(last, r.start),
        highlight: false,
        citations: [],
      });
    }
    out.push({
      text: text.slice(r.start, r.end),
      highlight: true,
      citations: r.citations,
    });
    last = r.end;
  }
  if (last < text.length) {
    out.push({ text: text.slice(last), highlight: false, citations: [] });
  }
  return out;
}

/** Custom XML-style tags that React would treat as unknown elements; render as divs. */
const CUSTOM_TAGS = [
  "thinking",
  "seed_instructions",
  "end",
  "dimension",
  "diversity_score",
  "justification",
  "name",
  "parameter",
  "parameters",
  "type",
  "description",
  "tool_signature",
];

/**
 * Replace custom XML-style tags (e.g. &lt;thinking&gt;) with &lt;div data-tag="..."&gt;
 * so react-markdown + rehype-raw do not pass unknown elements to React.
 */
export function sanitizeCustomTagsForMarkdown(text: string): string {
  let out = text;
  for (const tag of CUSTOM_TAGS) {
    const open = new RegExp(`<${tag}(\\s[^>]*)?>`, "gi");
    const close = new RegExp(`</${tag}>`, "gi");
    out = out.replace(open, `<div data-tag="${tag}">`);
    out = out.replace(close, "</div>");
  }
  return out;
}

/**
 * Insert <mark data-citation-ids="..."> tags into raw text at citation ranges.
 * Used for markdown mode so ReactMarkdown + rehype-raw can render highlights.
 */
export function insertCitationMarks(
  text: string,
  ranges: RangeWithCitations[],
): string {
  if (ranges.length === 0) return text;
  let result = "";
  let last = 0;
  for (const r of ranges) {
    if (r.start > last) {
      result += text.slice(last, r.start);
    }
    const ids = r.citations.map((c) => c.id).join(",");
    const cited = text.slice(r.start, r.end);
    result += `<mark data-citation-ids="${ids}">${cited}</mark>`;
    last = r.end;
  }
  if (last < text.length) {
    result += text.slice(last);
  }
  return result;
}
