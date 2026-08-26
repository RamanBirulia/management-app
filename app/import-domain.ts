import { z } from "zod";
import type { LogType } from "./log-domain";

const httpUrl = z.string().trim().url().refine((value) => /^https?:\/\//i.test(value), "URL должен использовать http или https");
export const importSuggestionSchema = z.object({
  type: z.enum(["decision", "task", "question"]), content: z.string().trim().min(1).max(5000),
  description: z.string().trim().max(20000).optional().default(""), occurredAt: z.iso.datetime({ offset: true }).optional(),
  externalKey: z.string().trim().min(1).max(200).optional(), externalUrl: httpUrl.optional(),
});
export const importContractSchema = z.object({
  formatVersion: z.literal("1"), title: z.string().trim().min(1).max(200),
  sourceSystem: z.string().trim().toLowerCase().min(1).max(50).regex(/^[a-z0-9_-]+$/), suggestions: z.array(importSuggestionSchema).min(1).max(500),
});
export type ImportSuggestionDraft = z.infer<typeof importSuggestionSchema>;
export type ImportContract = z.infer<typeof importContractSchema>;

export function parseImportText(text: string): ImportSuggestionDraft[] {
  return text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).flatMap((line) => {
    const match = line.match(/^(decision|task|question)\s*:\s*(.+)$/i);
    return match ? [{ type: match[1].toLowerCase() as LogType, content: match[2].trim(), description: "" }] : [];
  });
}

export function parseImportContract(value: unknown): ImportContract { return importContractSchema.parse(value); }
export function contractFromText(value: { title: unknown; sourceSystem: unknown; text: unknown }): ImportContract {
  return parseImportContract({ formatVersion: "1", title: value.title, sourceSystem: value.sourceSystem, suggestions: parseImportText(String(value.text ?? "")) });
}
