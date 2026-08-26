import type { LogType } from "./log-domain";

export type ImportSuggestionDraft = { type: LogType; content: string; description?: string; occurredAt?: string; externalKey?: string; externalUrl?: string };

export function parseImportText(text: string): ImportSuggestionDraft[] {
  return text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).flatMap((line) => {
    const match = line.match(/^(decision|task|question)\s*:\s*(.+)$/i);
    return match ? [{ type: match[1].toLowerCase() as LogType, content: match[2].trim() }] : [];
  });
}

export function normalizeSuggestions(value: unknown): ImportSuggestionDraft[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>; const type = String(row.type ?? "").toLowerCase(); const content = String(row.content ?? "").trim();
    if (!["decision", "task", "question"].includes(type) || !content || content.length > 5000) return [];
    return [{ type: type as LogType, content, description: String(row.description ?? "").trim().slice(0, 20000), occurredAt: typeof row.occurredAt === "string" ? row.occurredAt : undefined, externalKey: typeof row.externalKey === "string" ? row.externalKey.trim() : undefined, externalUrl: typeof row.externalUrl === "string" ? row.externalUrl.trim() : undefined }];
  });
}
