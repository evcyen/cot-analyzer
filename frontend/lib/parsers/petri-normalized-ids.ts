/**
 * Citation / normalized ID attachment for Petri (petri/audit) EvalLog.
 * Attaches event-stream and transcript_event IDs to the correct auditor messages
 * so citations resolve to the right message (Auditor by ordinal, Target by content).
 */

/** Normalize content for matching: trim, collapse whitespace, take first N chars. */
function contentSignature(text: string, maxLen: number): string {
  const normalized = text.trim().replace(/\s+/g, " ").slice(0, maxLen);
  return normalized;
}

const SIGNATURE_LEN = 400;

/** Source label for matching raw messages to event-stream decision_events. */
type MessageSource = "Auditor" | "Target";

/**
 * Collect normalized message ids from AuditStore:events (decision_events with object content),
 * in order. Skips decision_events whose content is a string (e.g. seed instruction).
 * Exported for diagnostic scripts (citation message_id resolution).
 */
export function getNormalizedIdsFromEvents(
  sample: Record<string, unknown>,
): { id: string; source: MessageSource }[] {
  const store = sample.store as Record<string, unknown> | undefined;
  const events = store?.["AuditStore:events"] as unknown[] | undefined;
  if (!Array.isArray(events)) return [];

  const result: { id: string; source: MessageSource }[] = [];
  for (const ev of events) {
    const e = ev as Record<string, unknown>;
    if (e.type !== "decision_event") continue;
    const content = e.content;
    if (!content || typeof content !== "object" || Array.isArray(content))
      continue;
    const c = content as Record<string, unknown>;
    const id = typeof c.id === "string" ? c.id : null;
    if (!id) continue;
    const meta = c.metadata as Record<string, unknown> | undefined;
    const source = meta?.source;
    const src =
      source === "Auditor" ? "Auditor" : source === "Target" ? "Target" : null;
    if (src) result.push({ id, source: src });
  }
  return result;
}

/**
 * Build content signatures for event-stream Target messages (decision_events with object content).
 * Uses only the visible .text parts (not reasoning) so we match auditor content after </thinking>.
 */
function getEventTargetContentSignatures(
  sample: Record<string, unknown>,
): { id: string; signature: string }[] {
  const store = sample.store as Record<string, unknown> | undefined;
  const events = store?.["AuditStore:events"] as unknown[] | undefined;
  if (!Array.isArray(events)) return [];

  const result: { id: string; signature: string }[] = [];
  for (const ev of events) {
    const e = ev as Record<string, unknown>;
    if (e.type !== "decision_event") continue;
    const content = e.content;
    if (!content || typeof content !== "object" || Array.isArray(content))
      continue;
    const c = content as Record<string, unknown>;
    const meta = c.metadata as Record<string, unknown> | undefined;
    if (meta?.source !== "Target") continue;
    const id = typeof c.id === "string" ? c.id : null;
    if (!id) continue;
    const parts = c.content as
      | Array<{ text?: string; reasoning?: string }>
      | undefined;
    let visibleText = "";
    if (Array.isArray(parts)) {
      for (const p of parts) {
        if (p?.text) visibleText += p.text;
      }
    }
    result.push({
      id,
      signature: contentSignature(visibleText, SIGNATURE_LEN),
    });
  }
  return result;
}

/**
 * Full text of a raw message for content matching (e.g. Target tool message with long string).
 * For Target tool messages with <target_response> / <thinking> wrappers, strips those so we
 * compare the same visible content as the event stream (reasoning + text, no XML).
 */
function getMessageFullText(msg: unknown): string {
  const m = msg as Record<string, unknown>;
  const content = m.content;
  let raw = "";
  if (typeof content === "string") raw = content;
  else if (Array.isArray(content)) {
    raw = (content as unknown[])
      .map((p) => {
        const part = p as Record<string, unknown>;
        return String(part?.text ?? part?.reasoning ?? "");
      })
      .join("\n");
  } else {
    const toolCalls = m.tool_calls as
      | Array<{ arguments?: { message?: string } }>
      | undefined;
    const firstCall = Array.isArray(toolCalls) ? toolCalls[0] : undefined;
    if (firstCall?.arguments?.message)
      raw = String(firstCall.arguments.message);
  }
  if (!raw) return "";
  // Strip <target_response ...> and <thinking>...</thinking> so signature matches event stream
  if (raw.includes("</thinking>")) {
    const after = raw.indexOf("</thinking>") + "</thinking>".length;
    raw = raw.slice(after).trim();
  }
  if (raw.replace(/\s+/g, " ").startsWith("<target_response")) {
    const close = raw.indexOf(">");
    if (close >= 0) raw = raw.slice(close + 1).trim();
  }
  return raw;
}

/**
 * Determine the citable source for a raw message (Auditor vs Target) for matching to events.
 * Returns null if this message is not one that has a normalized id in the event stream.
 */
function getRawMessageSource(msg: unknown): MessageSource | null {
  const m = msg as Record<string, unknown>;
  const role = typeof m.role === "string" ? m.role : "";
  const metadata = m.metadata as Record<string, unknown> | undefined;
  const metaSource = metadata?.source;

  if (
    role === "assistant" &&
    (metaSource === "Auditor" || metaSource === "Target")
  )
    return metaSource as MessageSource;

  if (role === "tool") {
    const content = m.content;
    const str =
      typeof content === "string"
        ? content
        : Array.isArray(content)
          ? (content as unknown[])
              .map((p) => (p as Record<string, unknown>)?.text ?? "")
              .join("")
          : "";
    if (
      str.includes("<target_response") ||
      (str.includes("<thinking>") && str.includes("</thinking>"))
    )
      return "Target";
  }
  return null;
}

/**
 * Build ordered list of (raw message index, source) for messages that correspond to
 * event-stream decision_events (Auditor or Target).
 */
function getCitableRawIndices(
  messages: unknown[],
): { index: number; source: MessageSource }[] {
  const result: { index: number; source: MessageSource }[] = [];
  for (let i = 0; i < messages.length; i++) {
    const source = getRawMessageSource(messages[i]);
    if (source) result.push({ index: i, source });
  }
  return result;
}

/**
 * Build content signatures for auditor Target messages (same normalization as event stream).
 * getMessageFullText already strips <thinking> so we get visible response only.
 */
function getAuditorTargetContentSignatures(
  messages: unknown[],
): { index: number; signature: string }[] {
  const citable = getCitableRawIndices(messages);
  const targetIndices = citable
    .filter(({ source }) => source === "Target")
    .map(({ index }) => index);
  const result: { index: number; signature: string }[] = [];
  for (const index of targetIndices) {
    const msg = messages[index];
    const fullText = getMessageFullText(msg);
    result.push({
      index,
      signature: contentSignature(fullText, SIGNATURE_LEN),
    });
  }
  return result;
}

/** Content preview for matching transcript_event patch value to a raw message. */
function getMessageContentPreview(msg: unknown): string {
  const m = msg as Record<string, unknown>;
  // Prefer sent message (tool_calls) over content so we match transcript_event patches
  // that store the user message as seen by the target.
  const toolCalls = m.tool_calls as
    | Array<{ arguments?: { message?: string } }>
    | undefined;
  const firstCall = Array.isArray(toolCalls) ? toolCalls[0] : undefined;
  if (firstCall?.arguments?.message)
    return String(firstCall.arguments.message).slice(0, 500);
  const content = m.content;
  if (typeof content === "string") return content.slice(0, 500);
  if (Array.isArray(content)) {
    const first = content[0] as Record<string, unknown> | undefined;
    if (first?.text) return String(first.text).slice(0, 500);
    if (first?.reasoning) return String(first.reasoning).slice(0, 500);
  }
  return "";
}

/**
 * Collect normalized ids from transcript_events (edit patches) and add them to messages
 * that match by content, so citation ids like WiYQPcfdftozhwBEH6kS9U (target-view user message)
 * resolve to the auditor message that sent that content.
 */
function addNormalizedIdsFromTranscriptEvents(
  messages: unknown[],
  sample: Record<string, unknown>,
): unknown[] {
  const store = sample.store as Record<string, unknown> | undefined;
  const events = store?.["AuditStore:events"] as unknown[] | undefined;
  if (!Array.isArray(events)) return messages;

  const out = messages.map((m) =>
    typeof m === "object" && m !== null ? { ...m } : m,
  );
  const previewToIndices = new Map<string, number[]>();
  for (let i = 0; i < out.length; i++) {
    const pre = getMessageContentPreview(out[i]).trim();
    if (!pre) continue;
    const key = pre.length > 400 ? pre.slice(0, 400) : pre;
    const list = previewToIndices.get(key) ?? [];
    list.push(i);
    previewToIndices.set(key, list);
  }

  for (const ev of events) {
    const e = ev as Record<string, unknown>;
    if (e.type !== "transcript_event") continue;
    const edit = e.edit as Record<string, unknown> | undefined;
    const patch = Array.isArray(edit?.patch) ? edit.patch : [];
    for (const p of patch) {
      const op = (p as Record<string, unknown>).op;
      if (op !== "add") continue;
      const value = (p as Record<string, unknown>).value as
        | { id?: string; content?: string | unknown[] }
        | undefined;
      const id = typeof value?.id === "string" ? value.id : null;
      if (!id) continue;
      let contentPreview = "";
      if (typeof value?.content === "string")
        contentPreview = value.content.slice(0, 500).trim();
      else if (Array.isArray(value?.content)) {
        const first = value.content[0] as Record<string, unknown> | undefined;
        if (first?.text)
          contentPreview = String(first.text).slice(0, 500).trim();
        else if (first?.reasoning)
          contentPreview = String(first.reasoning).slice(0, 500).trim();
      }
      if (!contentPreview) continue;
      const key =
        contentPreview.length > 400
          ? contentPreview.slice(0, 400)
          : contentPreview;
      const indices = previewToIndices.get(key);
      if (!indices?.length) continue;
      const msg = out[indices[0]] as Record<string, unknown>;
      if (msg && typeof msg === "object") {
        const existing = (msg.normalized_ids as string[] | undefined) ?? [];
        if (!existing.includes(id)) {
          msg.normalized_ids = [...existing, id];
        }
      }
    }
  }
  return out;
}

/**
 * Enrich raw messages with normalized_id from the event stream.
 * - Target: match by content signature so event id is attached to the auditor message
 *   that has the same content (fixes ordinal mismatch when event and auditor order differ).
 * - Auditor: match by ordinal (1st Auditor event → 1st Auditor message, etc.).
 */
export function enrichMessagesWithNormalizedIds(
  messages: unknown[],
  sample: Record<string, unknown>,
): unknown[] {
  const eventEntries = getNormalizedIdsFromEvents(sample);
  const citableRaw = getCitableRawIndices(messages);
  if (eventEntries.length === 0 || citableRaw.length === 0) return messages;

  const eventBySource: { Auditor: string[]; Target: string[] } = {
    Auditor: [],
    Target: [],
  };
  for (const { id, source } of eventEntries) {
    eventBySource[source].push(id);
  }

  const rawBySource: { Auditor: number[]; Target: number[] } = {
    Auditor: [],
    Target: [],
  };
  for (const { index, source } of citableRaw) {
    rawBySource[source].push(index);
  }

  const out = messages.map((m) =>
    typeof m === "object" && m !== null ? { ...m } : m,
  );

  // Auditor: ordinal match
  const auditorIds = eventBySource.Auditor;
  const auditorIndices = rawBySource.Auditor;
  for (let i = 0; i < auditorIds.length && i < auditorIndices.length; i++) {
    const msg = out[auditorIndices[i]] as Record<string, unknown>;
    if (msg && typeof msg === "object") {
      msg.normalized_id = auditorIds[i];
      const existing = msg.normalized_ids as string[] | undefined;
      msg.normalized_ids = existing?.includes(auditorIds[i])
        ? existing
        : [...(existing ?? []), auditorIds[i]];
    }
  }

  // Target: content-based match (event id → auditor message whose content matches).
  const eventTargetSigs = getEventTargetContentSignatures(sample);
  const auditorTargetSigs = getAuditorTargetContentSignatures(messages);
  const assignedAuditorTarget = new Set<number>();
  const assignedEventTargetIds = new Set<string>();
  for (const { id, signature } of eventTargetSigs) {
    let chosen: number | null = null;
    for (const { index, signature: sig } of auditorTargetSigs) {
      if (assignedAuditorTarget.has(index)) continue;
      if (signature === sig) {
        chosen = index;
        break;
      }
    }
    if (chosen === null) continue;
    assignedAuditorTarget.add(chosen);
    assignedEventTargetIds.add(id);
    const msg = out[chosen] as Record<string, unknown>;
    if (msg && typeof msg === "object") {
      msg.normalized_id = id;
      const existing = msg.normalized_ids as string[] | undefined;
      msg.normalized_ids = existing?.includes(id)
        ? existing
        : [...(existing ?? []), id];
    }
  }

  // Fallback: event Target IDs that didn't match by signature (e.g. whitespace/content
  // difference) are assigned by ordinal to remaining Target messages so citations
  // that reference those IDs still resolve.
  const unassignedTargetIds = eventTargetSigs
    .map((e) => e.id)
    .filter((id) => !assignedEventTargetIds.has(id));
  const unassignedAuditorTargetIndices = auditorTargetSigs
    .map((a) => a.index)
    .filter((index) => !assignedAuditorTarget.has(index));
  for (
    let i = 0;
    i < unassignedTargetIds.length && i < unassignedAuditorTargetIndices.length;
    i++
  ) {
    const id = unassignedTargetIds[i];
    const index = unassignedAuditorTargetIndices[i];
    const msg = out[index] as Record<string, unknown>;
    if (msg && typeof msg === "object") {
      msg.normalized_id = id;
      const existing = msg.normalized_ids as string[] | undefined;
      msg.normalized_ids = existing?.includes(id)
        ? existing
        : [...(existing ?? []), id];
    }
  }

  return addNormalizedIdsFromTranscriptEvents(out, sample);
}

/**
 * Diagnostic: why might citation message_ids fail to resolve?
 * Call after parsePetriEvalLog so messages are already enriched.
 * Pass the same raw sample and its parsed trace.messages and analysis.citations.
 */
export function diagnoseCitationMessageIdResolution(
  rawSample: Record<string, unknown>,
  parsedMessages: unknown[],
  citations: { message_id: string }[],
): {
  eventStreamEventCount: number;
  eventStreamIds: string[];
  citableRawMessageCount: number;
  messagesWithNormalizedId: number;
  resolvableIds: string[];
  unmatchedCitationMessageIds: string[];
  summary: string;
} {
  const eventEntries = getNormalizedIdsFromEvents(rawSample);
  const citableRaw = getCitableRawIndices(parsedMessages);
  const eventStreamIds = eventEntries.map((e) => e.id);
  const resolvableIds: string[] = [];
  for (const m of parsedMessages) {
    if (typeof m !== "object" || m === null) continue;
    const rec = m as Record<string, unknown>;
    const id = typeof rec.id === "string" ? rec.id : null;
    if (id) resolvableIds.push(id);
    const nid =
      typeof rec.normalized_id === "string" ? rec.normalized_id : null;
    if (nid) resolvableIds.push(nid);
    const nids = rec.normalized_ids as string[] | undefined;
    if (Array.isArray(nids)) resolvableIds.push(...nids);
  }
  const resolvableSet = new Set(resolvableIds);
  const unmatchedCitationMessageIds = citations
    .map((c) => c.message_id)
    .filter((id) => id && !resolvableSet.has(id));
  const messagesWithNormalizedId = parsedMessages.filter(
    (m) =>
      typeof m === "object" &&
      m !== null &&
      typeof (m as Record<string, unknown>).normalized_id === "string",
  ).length;
  let summary = "";
  if (eventEntries.length === 0)
    summary +=
      "Event stream empty (sample.store['AuditStore:events'] missing or no decision_events). ";
  if (citableRaw.length === 0)
    summary +=
      "No citable raw messages (no Auditor/Target assistant or tool messages). ";
  if (
    eventEntries.length > 0 &&
    citableRaw.length > 0 &&
    messagesWithNormalizedId === 0
  )
    summary +=
      "Enrichment ran but no message got normalized_id (ordinal or content signature mismatch?). ";
  if (unmatchedCitationMessageIds.length > 0)
    summary += `Citation message_ids not on any message: ${unmatchedCitationMessageIds.join(", ")}.`;
  if (!summary) summary = "All citation message_ids resolved.";
  return {
    eventStreamEventCount: eventEntries.length,
    eventStreamIds,
    citableRawMessageCount: citableRaw.length,
    messagesWithNormalizedId,
    resolvableIds: [...new Set(resolvableIds)],
    unmatchedCitationMessageIds,
    summary,
  };
}
