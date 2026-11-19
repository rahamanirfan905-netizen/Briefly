import { jaccard } from "./text.ts";

export interface ClusterCandidate {
  id: string;
  clusterId: string;
  titleTokens: string[];
  region: string;
  publishedAt: Date;
}

const SIMILARITY = 0.5; // Jaccard over meaningful title tokens
const MIN_SHARED = 3; // …and at least this many shared tokens
const WINDOW_MS = 48 * 3600_000;

/**
 * Finds the cluster an incoming article belongs to, or null if it is a new event.
 * Compares only against recent articles from the same region so that unrelated
 * stories with common words don't merge.
 */
export function findCluster(
  tokens: string[],
  region: string,
  publishedAt: Date,
  existing: ClusterCandidate[],
): string | null {
  let best: { clusterId: string; sim: number } | null = null;
  const set = new Set(tokens);
  for (const e of existing) {
    if (e.region !== region) continue;
    if (Math.abs(e.publishedAt.getTime() - publishedAt.getTime()) > WINDOW_MS) continue;
    const sim = jaccard(tokens, e.titleTokens);
    if (sim < SIMILARITY) continue;
    let shared = 0;
    for (const t of e.titleTokens) if (set.has(t)) shared++;
    if (shared < MIN_SHARED) continue;
    if (!best || sim > best.sim) best = { clusterId: e.clusterId, sim };
  }
  return best?.clusterId ?? null;
}
