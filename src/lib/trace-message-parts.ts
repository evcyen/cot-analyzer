import type { TraceMessage } from "@/types/trace-detail";

export type MessagePartType =
  | "reasoning"
  | "message_to_target"
  | "tool_result"
  | "content";

export interface MessagePart {
  type: MessagePartType;
  label: string;
  color: string;
  text: string;
  messageId: string;
}

export function getAssistantSource(msg: TraceMessage): string {
  if (
    msg.metadata &&
    typeof msg.metadata === "object" &&
    "source" in msg.metadata
  ) {
    return String((msg.metadata as { source?: string }).source);
  }
  return "";
}

/**
 * Extract a single text string from a content part (object with text/thought/reasoning/content).
 * Used for both display and citation matching so reasoning/thinking is included.
 */
export function getTextFromPart(part: unknown): string {
  if (!part || typeof part !== "object") return "";
  const p = part as Record<string, unknown>;
  const text =
    (typeof p.text === "string" ? p.text : null) ??
    (typeof p.thought === "string" ? p.thought : null) ??
    (typeof p.reasoning === "string" ? p.reasoning : null) ??
    (typeof p.content === "string" ? p.content : null) ??
    "";
  return text;
}

/**
 * Get full message text for display and citation matching. Includes all content parts:
 * text, thought, reasoning (e.g. Gemini-style thinking/reasoning so citations to that content work).
 */
export function getMessageText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map(getTextFromPart).filter(Boolean).join("\n");
  }
  if (content && typeof content === "object") {
    const c = content as Record<string, unknown>;
    if (typeof c.text === "string") return c.text;
    const parts = c.parts as unknown[] | undefined;
    if (Array.isArray(parts)) {
      return parts.map(getTextFromPart).filter(Boolean).join("\n");
    }
  }
  return "";
}

function isReasoningPart(part: unknown): boolean {
  if (!part || typeof part !== "object") return false;
  const p = part as Record<string, unknown>;
  const type = typeof p.type === "string" ? p.type.toLowerCase() : "";
  if (
    type === "thinking" ||
    type === "thought" ||
    type === "reasoning" ||
    ("thought" in p && p.thought) ||
    ("reasoning" in p && p.reasoning)
  )
    return true;
  return false;
}

/**
 * For assistant (Target) messages, split content into reasoning vs main so we can show
 * "Target (reasoning)" when the model has thinking/reasoning (e.g. Gemini).
 */
export function getTargetContentParts(content: unknown): {
  main: string;
  reasoning: string;
} {
  const mainParts: string[] = [];
  const reasoningParts: string[] = [];
  const items = Array.isArray(content)
    ? content
    : content &&
        typeof content === "object" &&
        Array.isArray((content as Record<string, unknown>).parts)
      ? ((content as Record<string, unknown>).parts as unknown[])
      : [];
  for (const part of items) {
    const text = getTextFromPart(part);
    if (!text) continue;
    if (isReasoningPart(part)) reasoningParts.push(text);
    else mainParts.push(text);
  }
  return {
    main: mainParts.join("\n"),
    reasoning: reasoningParts.join("\n"),
  };
}

/** Extract text from a send_message tool call (arguments.message or view.content) */
export function getSentMessageText(tc: Record<string, unknown>): string {
  const args = tc.arguments as Record<string, unknown> | undefined;
  if (args && typeof args.message === "string") return args.message;
  const view = tc.view as Record<string, unknown> | undefined;
  if (view && typeof view.content === "string") return view.content;
  return "";
}

const AUDITOR_STYLE = "border-l-violet-600 bg-violet-500/10";
const TARGET_STYLE = "border-l-emerald-600 bg-emerald-500/10";

/**
 * Split a trace message into display parts. For Auditor assistants this yields
 * "Auditor (reasoning)" from content and "Auditor (message to Target)" from each send_message tool call.
 * For Petri/Gemini, tool messages with <target_response>/<thinking> are shown as Target (reasoning) + Target.
 */
export function getMessageParts(msg: TraceMessage): MessagePart[] {
  const role = msg.role || "unknown";
  const source = getAssistantSource(msg);
  const parts: MessagePart[] = [];

  if (role === "assistant") {
    if (source === "Auditor") {
      const contentText = getMessageText(msg.content);
      if (contentText.trim()) {
        parts.push({
          type: "reasoning",
          label: "Auditor (reasoning)",
          color: AUDITOR_STYLE,
          text: contentText,
          messageId: msg.id,
        });
      }
      const toolCalls = msg.tool_calls as unknown[] | undefined;
      if (Array.isArray(toolCalls)) {
        for (const tc of toolCalls) {
          const t = tc as Record<string, unknown>;
          const fn = typeof t.function === "string" ? t.function : "";
          const view = t.view as Record<string, unknown> | undefined;
          const viewTitle =
            view && typeof view.title === "string" ? view.title : "";
          const isSendMessage =
            fn === "send_message" || viewTitle === "Sent User Message";
          if (isSendMessage) {
            const text = getSentMessageText(t);
            parts.push({
              type: "message_to_target",
              label: "Auditor (message to Target)",
              color: AUDITOR_STYLE,
              text: text || "(no message text)",
              messageId: msg.id,
            });
          }
        }
      }
      if (parts.length === 0) {
        parts.push({
          type: "content",
          label: "Auditor",
          color: AUDITOR_STYLE,
          text: getMessageText(msg.content) || "(empty)",
          messageId: msg.id,
        });
      }
      return parts;
    }

    if (source === "Target") {
      const { main, reasoning } = getTargetContentParts(msg.content);
      if (reasoning.trim()) {
        parts.push({
          type: "reasoning",
          label: "Target (reasoning)",
          color: TARGET_STYLE,
          text: reasoning,
          messageId: msg.id,
        });
      }
      parts.push({
        type: "content",
        label: "Target",
        color: TARGET_STYLE,
        text: main.trim() || getMessageText(msg.content) || "(empty)",
        messageId: msg.id,
      });
      return parts;
    }

    parts.push({
      type: "content",
      label: "Assistant",
      color: "border-l-emerald-600 bg-emerald-500/5",
      text: getMessageText(msg.content) || "(empty)",
      messageId: msg.id,
    });
    return parts;
  }

  if (role === "tool") {
    const raw = getMessageText(msg.content) || "";
    if (
      raw.includes("<target_response") ||
      (raw.includes("<thinking>") && raw.includes("</thinking>"))
    ) {
      const thinkingMatch = raw.match(/<thinking>([\s\S]*?)<\/thinking>/i);
      const reasoning = thinkingMatch ? thinkingMatch[1].trim() : "";
      const withoutThinking = raw
        .replace(/<thinking>[\s\S]*?<\/thinking>/gi, "")
        .replace(/<target_response[^>]*>/gi, "")
        .replace(/<\/target_response>/gi, "")
        .trim();
      const main = withoutThinking
        .replace(/\n*Target did not make any tool calls\.[\s\S]*$/i, "")
        .replace(/\n*Remember:[\s\S]*$/i, "")
        .trim();
      if (reasoning) {
        parts.push({
          type: "reasoning",
          label: "Target (reasoning)",
          color: TARGET_STYLE,
          text: reasoning,
          messageId: msg.id,
        });
      }
      parts.push({
        type: "content",
        label: "Target",
        color: TARGET_STYLE,
        text: main || "(empty)",
        messageId: msg.id,
      });
      return parts;
    }
    parts.push({
      type: "tool_result",
      label: "Tool (result)",
      color: "border-l-amber-600 bg-amber-500/10",
      text: raw || "(empty)",
      messageId: msg.id,
    });
    return parts;
  }

  const styles: Record<string, string> = {
    user: "border-l-blue-500 bg-blue-500/10",
    system: "border-l-slate-500 bg-slate-500/10",
  };
  const labels: Record<string, string> = {
    user: "User",
    system: "System",
  };
  parts.push({
    type: "content",
    label: labels[role] ?? role,
    color: styles[role] ?? "border-l-gray-500 bg-gray-500/10",
    text: getMessageText(msg.content) || "(empty)",
    messageId: msg.id,
  });
  return parts;
}
