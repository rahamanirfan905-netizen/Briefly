import { cleanDescription, splitSentences } from "./text.ts";

export interface SummaryInput {
  headline: string;
  description?: string | null;
  content?: string | null;
  publisherName: string;
}

export interface SummaryResult {
  summary: string;
  by: "extractive" | "ai";
}

/**
 * Extractive fallback: uses only the publisher's own description (and body snippet
 * if the provider supplied one). Nothing is added, so nothing can be invented.
 * Returns 2-4 sentences, or whatever exists if the source gave less.
 */
export function extractiveSummary(i: SummaryInput): string {
  const desc = cleanDescription(i.description);
  const body = cleanDescription(i.content);
  const pool = [desc, body].filter(Boolean).join(" ");
  const sentences = splitSentences(pool);
  const seen = new Set<string>();
  const picked: string[] = [];
  for (const s of sentences) {
    const key = s.toLowerCase().slice(0, 60);
    if (seen.has(key)) continue;
    seen.add(key);
    picked.push(s);
    if (picked.length >= 4) break;
  }
  if (picked.length) return picked.join(" ");
  if (desc) return desc;
  return `${i.publisherName} reports: ${i.headline}. Read the original article for details.`;
}

const SYSTEM = `You write neutral news summaries. Use ONLY facts present in the supplied headline and text.
Write 2 to 4 sentences covering: what happened, where, who or which organisations are involved, and why it matters
ONLY if the text says so. If the text does not state a detail, omit it. Do not speculate, add background from your own
knowledge, use quotation marks, or write opinions. Output the summary only.`;

/** Optional Claude-backed summary. Any failure returns null and the caller uses the extractive fallback. */
export async function aiSummary(i: SummaryInput): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  const text = [cleanDescription(i.description), cleanDescription(i.content)].filter(Boolean).join("\n");
  if (text.length < 80) return null; // not enough source material to summarise honestly
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-haiku-4-5",
        max_tokens: 300,
        system: SYSTEM,
        messages: [{ role: "user", content: `Publisher: ${i.publisherName}\nHeadline: ${i.headline}\n\nText:\n${text.slice(0, 3000)}` }],
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { content?: { type: string; text?: string }[] };
    const out = data.content?.find((c) => c.type === "text")?.text?.trim();
    return out && out.length > 40 ? out : null;
  } catch {
    return null;
  }
}

export async function summarize(i: SummaryInput): Promise<SummaryResult> {
  const ai = await aiSummary(i);
  if (ai) return { summary: ai, by: "ai" };
  return { summary: extractiveSummary(i), by: "extractive" };
}
