import { CATEGORIES, HINT_MAP } from "./categories.ts";
import type { RawArticle } from "./types.ts";

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const compiled = new Map<string, RegExp>();
/** Whole-word / whole-phrase match, so "loc" never fires inside "local". */
function wordRe(kw: string): RegExp {
  const k = kw.trim().toLowerCase();
  let re = compiled.get(k);
  if (!re) {
    re = new RegExp(`(?<![\\p{L}\\p{N}])${escape(k)}(?![\\p{L}\\p{N}])`, "u");
    compiled.set(k, re);
  }
  return re;
}

/**
 * Returns a category slug. Order of trust:
 *   1. a provider/section hint (Guardian sections, feed-level category)
 *   2. keyword scoring: whole-word hits in the headline (weight 3) + description (weight 1)
 *   3. fallback to the article's region ("india" or "world")
 */
export function classify(a: Pick<RawArticle, "headline" | "description" | "region" | "categoryHint">): string {
  if (a.categoryHint) {
    const hint = HINT_MAP[a.categoryHint.toLowerCase()];
    if (hint && hint !== "world") return hint;
  }

  const head = a.headline.toLowerCase();
  const desc = (a.description ?? "").toLowerCase();
  let best = { slug: "", score: 0 };

  for (const c of CATEGORIES) {
    if (!c.keywords.length) continue;
    let score = 0;
    for (const kw of c.keywords) {
      const re = wordRe(kw);
      if (re.test(head)) score += 3;
      if (re.test(desc)) score += 1;
    }
    if (score > best.score) best = { slug: c.slug, score };
  }

  // Require real evidence so generic stories aren't mislabelled.
  if (best.score >= 3) return best.slug;
  return a.region === "INDIA" ? "india" : "world";
}
