import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { cached } from "./cache";

const LIVE_WINDOW_MS = 72 * 3600_000;

const articleSelect = {
  id: true, headline: true, summary: true, summaryBy: true, imageUrl: true, url: true, author: true,
  publishedAt: true, region: true, country: true, score: true, isBreaking: true, isTrending: true,
  readMinutes: true, clusterSize: true,
  category: { select: { slug: true, name: true } },
  publisher: { select: { id: true, name: true, domain: true } },
} satisfies Prisma.NewsArticleSelect;

type Row = Prisma.NewsArticleGetPayload<{ select: typeof articleSelect }>;

export interface ArticleDTO {
  id: string; headline: string; summary: string; summaryBy: string; imageUrl: string | null; url: string;
  author: string | null; publishedAt: string; region: "INDIA" | "WORLD"; country: string | null; score: number;
  isBreaking: boolean; isTrending: boolean; readMinutes: number; clusterSize: number;
  category: { slug: string; name: string }; publisher: { id: string; name: string; domain: string | null };
  bookmarked?: boolean;
}

export const toDTO = (r: Row, bookmarked?: boolean): ArticleDTO => ({
  ...r,
  publishedAt: r.publishedAt.toISOString(),
  bookmarked,
});

const live = (): Prisma.NewsArticleWhereInput => ({
  hidden: false,
  publisher: { active: true }, // admin can switch a publisher off
  isClusterPrimary: true,
  publishedAt: { gte: new Date(Date.now() - LIVE_WINDOW_MS) },
});

export async function bookmarkedSet(userId: string | undefined, ids: string[]): Promise<Set<string>> {
  if (!userId || !ids.length) return new Set();
  const rows = await db.bookmark.findMany({ where: { userId, articleId: { in: ids } }, select: { articleId: true } });
  return new Set(rows.map((r) => r.articleId));
}

export async function withBookmarks(rows: Row[], userId?: string): Promise<ArticleDTO[]> {
  const set = await bookmarkedSet(userId, rows.map((r) => r.id));
  return rows.map((r) => toDTO(r, userId ? set.has(r.id) : undefined));
}

export async function lastUpdated(): Promise<Date | null> {
  const s = await db.refreshState.findUnique({ where: { id: "singleton" } });
  return s?.lastSuccessAt ?? null;
}

/** The 60: top 30 India + top 30 World, by score. Fewer are shown if fewer exist; we never pad. */
export async function getTop60(userId?: string) {
  const data = await cached("top60", 60, async () => {
    const [india, world] = await Promise.all([
      db.newsArticle.findMany({ where: { ...live(), region: "INDIA" }, orderBy: [{ score: "desc" }, { publishedAt: "desc" }], take: 30, select: articleSelect }),
      db.newsArticle.findMany({ where: { ...live(), region: "WORLD" }, orderBy: [{ score: "desc" }, { publishedAt: "desc" }], take: 30, select: articleSelect }),
    ]);
    return { india, world };
  });
  const all = [...data.india, ...data.world];
  const set = await bookmarkedSet(userId, all.map((a) => a.id));
  const map = (rows: Row[]) => rows.map((r) => toDTO(r, userId ? set.has(r.id) : undefined));
  const india = map(data.india);
  const world = map(data.world);
  const featured = [...india, ...world].sort((a, b) => b.score - a.score)[0] ?? null;
  return { india, world, featured, total: india.length + world.length, lastUpdated: (await lastUpdated())?.toISOString() ?? null };
}

export async function getCategoryFeed(slug: string, page: number, pageSize: number, userId?: string) {
  const where: Prisma.NewsArticleWhereInput = { ...live() };
  if (slug === "india") where.region = "INDIA";
  else if (slug === "world") where.region = "WORLD";
  else where.category = { slug };
  const [rows, total, cat] = await Promise.all([
    db.newsArticle.findMany({ where, orderBy: [{ score: "desc" }, { publishedAt: "desc" }], skip: (page - 1) * pageSize, take: pageSize, select: articleSelect }),
    db.newsArticle.count({ where }),
    db.category.findUnique({ where: { slug } }),
  ]);
  return { category: cat, items: await withBookmarks(rows, userId), page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

const COUNTRY_ALIASES: Record<string, string> = {
  india: "IN", indian: "IN", usa: "US", america: "US", "united states": "US", uk: "GB", britain: "GB", "united kingdom": "GB",
  france: "FR", germany: "DE", qatar: "QA", china: "CN", russia: "RU", japan: "JP", pakistan: "PK",
};

export interface SearchParams {
  q: string; category?: string; publisher?: string; region?: "INDIA" | "WORLD"; range?: "24h" | "7d" | "30d" | "all";
  sort: "relevance" | "latest"; page: number; pageSize: number;
}

export async function searchArticles(p: SearchParams, userId?: string) {
  const terms = p.q.toLowerCase().split(/\s+/).filter((t) => t.length > 1).slice(0, 6);
  const and: Prisma.NewsArticleWhereInput[] = [{ hidden: false, publisher: { active: true } }];
  for (const t of terms) {
    const or: Prisma.NewsArticleWhereInput[] = [
      { headline: { contains: t, mode: "insensitive" } },
      { description: { contains: t, mode: "insensitive" } },
      { publisher: { name: { contains: t, mode: "insensitive" } } },
      { category: { name: { contains: t, mode: "insensitive" } } },
    ];
    const cc = COUNTRY_ALIASES[t];
    if (cc) or.push({ country: cc });
    if (t === "india" || t === "indian") or.push({ region: "INDIA" });
    and.push({ OR: or });
  }
  if (p.category) and.push(p.category === "india" ? { region: "INDIA" } : p.category === "world" ? { region: "WORLD" } : { category: { slug: p.category } });
  if (p.publisher) and.push({ publisherId: p.publisher });
  if (p.region) and.push({ region: p.region });
  const hours = p.range === "24h" ? 24 : p.range === "7d" ? 168 : p.range === "30d" ? 720 : 0;
  if (hours) and.push({ publishedAt: { gte: new Date(Date.now() - hours * 3600_000) } });
  // collapse duplicate coverage into one result unless the user is searching for a specific outlet
  and.push({ isClusterPrimary: true });

  const where: Prisma.NewsArticleWhereInput = { AND: and };
  const total = await db.newsArticle.count({ where });

  let rows: Row[];
  if (p.sort === "latest" || !terms.length) {
    rows = await db.newsArticle.findMany({ where, orderBy: { publishedAt: "desc" }, skip: (p.page - 1) * p.pageSize, take: p.pageSize, select: articleSelect });
  } else {
    // relevance: pull a bounded candidate set, rank in memory (headline > publisher > summary), then page
    const candidates = await db.newsArticle.findMany({ where, orderBy: { publishedAt: "desc" }, take: 300, select: articleSelect });
    const rel = (r: Row) => {
      let s = 0;
      const h = r.headline.toLowerCase(), sm = r.summary.toLowerCase(), pub = r.publisher.name.toLowerCase();
      for (const t of terms) {
        if (h.includes(t)) s += 5;
        if (pub.includes(t)) s += 3;
        if (sm.includes(t)) s += 1.5;
        if (r.category.name.toLowerCase().includes(t)) s += 2;
      }
      return s + r.score / 25;
    };
    rows = candidates.sort((a, b) => rel(b) - rel(a)).slice((p.page - 1) * p.pageSize, p.page * p.pageSize);
  }
  return { items: await withBookmarks(rows, userId), page: p.page, pageSize: p.pageSize, total, totalPages: Math.max(1, Math.ceil(total / p.pageSize)) };
}

export async function suggest(q: string) {
  const term = q.trim();
  if (term.length < 2) return { categories: [], publishers: [], headlines: [] };
  const [categories, publishers, headlines] = await Promise.all([
    db.category.findMany({ where: { active: true, name: { contains: term, mode: "insensitive" } }, select: { slug: true, name: true }, take: 3 }),
    db.publisher.findMany({ where: { active: true, name: { contains: term, mode: "insensitive" } }, select: { name: true }, take: 4 }),
    db.newsArticle.findMany({ where: { hidden: false, isClusterPrimary: true, headline: { contains: term, mode: "insensitive" } }, orderBy: { score: "desc" }, select: { id: true, headline: true }, take: 5 }),
  ]);
  return { categories, publishers, headlines };
}

export async function getArticle(id: string, userId?: string) {
  const r = await db.newsArticle.findFirst({ where: { id, hidden: false }, select: { ...articleSelect, clusterId: true, description: true } });
  if (!r) return null;
  const related = await db.newsArticle.findMany({
    where: { clusterId: r.clusterId, id: { not: r.id }, hidden: false },
    orderBy: { publishedAt: "desc" },
    take: 8,
    select: articleSelect,
  });
  // distinct publishers only, so "coverage" means different outlets
  const seen = new Set([r.publisher.id]);
  const coverage = related.filter((x) => (seen.has(x.publisher.id) ? false : (seen.add(x.publisher.id), true)));
  const more = await db.newsArticle.findMany({
    where: { category: { slug: r.category.slug }, hidden: false, isClusterPrimary: true, id: { not: r.id }, clusterId: { not: r.clusterId } },
    orderBy: { score: "desc" },
    take: 4,
    select: articleSelect,
  });
  const set = await bookmarkedSet(userId, [r.id]);
  return {
    article: { ...toDTO(r, userId ? set.has(r.id) : undefined) },
    coverage: coverage.map((c) => toDTO(c)),
    more: more.map((c) => toDTO(c)),
  };
}

/** "For you": top stories in the user's preferred categories/region, or null if they haven't set any. */
export async function getForYou(userId: string, limit = 6) {
  const prefs = await db.userPreference.findUnique({ where: { userId } });
  if (!prefs || !prefs.categories.length) return null;
  const where: Prisma.NewsArticleWhereInput = { ...live() };
  const regionCats = prefs.categories.filter((c) => c === "india" || c === "world");
  const topicCats = prefs.categories.filter((c) => c !== "india" && c !== "world");
  const or: Prisma.NewsArticleWhereInput[] = [];
  if (topicCats.length) or.push({ category: { slug: { in: topicCats } } });
  if (regionCats.includes("india")) or.push({ region: "INDIA" });
  if (regionCats.includes("world")) or.push({ region: "WORLD" });
  where.OR = or;
  if (prefs.region === "INDIA" || prefs.region === "WORLD") where.region = prefs.region;
  const rows = await db.newsArticle.findMany({ where, orderBy: [{ score: "desc" }, { publishedAt: "desc" }], take: limit, select: articleSelect });
  return withBookmarks(rows, userId);
}
