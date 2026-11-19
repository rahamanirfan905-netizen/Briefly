/**
 * Weighted story score in [0, 100].
 *
 *   recency      30  exponential decay, half-life 8h
 *   coverage     25  distinct credible publishers covering the same event (log scale)
 *   importance   20  keyword signal for consequential events (see IMPORTANT_TERMS)
 *   credibility  10  publisher credibility rating set in the admin dashboard
 *   relevance    10  region fit: Indian outlets for India, global wires for World
 *   interest      5  has an image + a substantial description (proxy for editorial effort)
 *
 * Labels are derived only from data we hold:
 *   isBreaking  published < 3h ago AND (>= 2 distinct publishers OR credibility >= 0.8
 *               AND headline carries an explicit breaking marker)
 *   isTrending  >= 3 distinct publishers in the cluster AND published < 24h ago
 */

export const WEIGHTS = {
  recency: 30,
  coverage: 25,
  importance: 20,
  credibility: 10,
  relevance: 10,
  interest: 5,
} as const;

const IMPORTANT_TERMS = [
  "killed", "dead", "death toll", "attack", "blast", "earthquake", "cyclone", "flood", "war", "ceasefire",
  "election result", "wins election", "verdict", "supreme court", "rbi", "repo rate", "budget", "resigns",
  "arrested", "summit", "treaty", "sanction", "launch", "record", "crash", "outbreak", "protest", "strike",
  "bill passed", "agreement", "talks", "invasion", "collapse", "historic",
];

const BREAKING_MARKER = /\b(breaking|just in|developing|live updates?)\b/i;

export interface RankInput {
  headline: string;
  description?: string | null;
  hasImage: boolean;
  publishedAt: Date;
  region: "INDIA" | "WORLD";
  publisherCredibility: number; // 0..1
  /** Credibility values of the DISTINCT publishers covering this event (including this one). */
  clusterPublisherCredibilities: number[];
  now?: Date;
}

export interface RankResult {
  score: number;
  isBreaking: boolean;
  isTrending: boolean;
  parts: Record<keyof typeof WEIGHTS, number>;
}

export function recencyFactor(publishedAt: Date, now: Date): number {
  const hours = Math.max(0, (now.getTime() - publishedAt.getTime()) / 3600_000);
  return Math.pow(0.5, hours / 8);
}

export function importanceFactor(headline: string, description?: string | null): number {
  const text = `${headline} ${description ?? ""}`.toLowerCase();
  let hits = 0;
  for (const t of IMPORTANT_TERMS) if (text.includes(t)) hits++;
  return Math.min(1, hits / 3);
}

export function rankArticle(i: RankInput): RankResult {
  const now = i.now ?? new Date();
  const pubs = i.clusterPublisherCredibilities.length || 1;

  const recency = recencyFactor(i.publishedAt, now);
  // Each distinct publisher contributes 0.5-1.0 depending on credibility. A lone publisher
  // scores 0 (never negative); roughly 2 → 0.3, 4 → 0.6, 8+ → 1.
  const coverageWeighted = Math.max(1, i.clusterPublisherCredibilities.reduce((s, c) => s + 0.5 + 0.5 * c, 0));
  const coverage = Math.min(1, Math.log2(coverageWeighted) / 3);
  const importance = importanceFactor(i.headline, i.description);
  const credibility = i.publisherCredibility;
  const relevance = 0.6 + 0.4 * i.publisherCredibility;
  const interest = (i.hasImage ? 0.5 : 0) + ((i.description?.length ?? 0) > 120 ? 0.5 : 0);

  const parts = {
    recency: recency * WEIGHTS.recency,
    coverage: coverage * WEIGHTS.coverage,
    importance: importance * WEIGHTS.importance,
    credibility: credibility * WEIGHTS.credibility,
    relevance: relevance * WEIGHTS.relevance,
    interest: interest * WEIGHTS.interest,
  };
  const score = Object.values(parts).reduce((a, b) => a + b, 0);

  const ageH = (now.getTime() - i.publishedAt.getTime()) / 3600_000;
  const isBreaking =
    ageH >= 0 && ageH < 3 && (pubs >= 2 || (i.publisherCredibility >= 0.8 && BREAKING_MARKER.test(i.headline)));
  const isTrending = pubs >= 3 && ageH < 24;

  return { score: Math.round(score * 100) / 100, isBreaking, isTrending, parts };
}
