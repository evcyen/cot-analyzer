/**
 * Validation and top-level extraction for Petri (petri/audit) EvalLog.
 * Used by the main parser to check shape and read eval/samples.
 */

export function isPetriEvalLog(obj: unknown): obj is Record<string, unknown> {
  if (!obj || typeof obj !== "object") return false;
  const o = obj as Record<string, unknown>;
  const task =
    (o.eval as Record<string, unknown>)?.task ??
    (o.eval as Record<string, unknown>)?.task_registry_name;
  if (typeof task === "string" && task.includes("petri/audit")) return true;
  const samples = (o.samples ?? (o.log as Record<string, unknown>)?.samples) as
    | unknown[]
    | undefined;
  if (Array.isArray(samples) && samples.length > 0) {
    const first = samples[0] as Record<string, unknown>;
    const scores = first.scores as Record<string, unknown> | undefined;
    if (scores && typeof scores.alignment_judge === "object") return true;
  }
  return false;
}

export function getSamples(obj: Record<string, unknown>): unknown[] {
  const list = obj.samples ?? (obj.log as Record<string, unknown>)?.samples;
  return Array.isArray(list) ? list : [];
}

export function getEval(
  obj: Record<string, unknown>,
): Record<string, unknown> | null {
  const e = obj.eval;
  return e && typeof e === "object" ? (e as Record<string, unknown>) : null;
}

export function getModelRoles(
  evalObj: Record<string, unknown>,
): Record<string, { model?: string }> | null {
  const roles = evalObj.model_roles;
  return roles && typeof roles === "object"
    ? (roles as Record<string, { model?: string }>)
    : null;
}

export function firstLine(s: string, maxLen: number): string {
  const line = s.trim().split(/\n/)[0] ?? "";
  return line.length > maxLen ? line.slice(0, maxLen) + "…" : line;
}
