import { db } from "../db";
import { logError } from "../errors";
import { CATEGORIES } from "./categories";
import { classify } from "./classify";
import { findCluster, type ClusterCandidate } from "./dedupe";
import { allProviders } from "./providers";
import { FEEDS } from "./feeds";
import { rankArticle } from "./rank";
import { aiSummary, extractiveSummary } from "./summarize";
import { cleanDescription, cleanHeadline, normalizeUrl, readMinutes, tokenize } from "./text";
import type { RawArticle } from "./types";
import { cacheClear } from "../cache";

const MAX_AGE_MS = 72 * 3600_000;
const MAX_AI_SUMMARIES_PER_RUN = 40;
const RETENTION_DAYS = 14;

const KNOWN_CREDIBILITY = new Map<string, number>([
  ...FEEDS.map((f) => [f.publisher.toLowerCase(), f.credibility] as [string, number]),
  ["reuters", 0.95], ["associated press", 0.95], ["ap news", 0.95], ["pti", 0.9], ["press trust of india", 0.9],
  ["ani", 0.75], ["the economic times", 0.82], ["business standard", 0.83], ["financial times", 0.9],
  ["bloomberg", 0.9], ["the wall street journal", 0.9], ["the washington post", 0.88], ["cnn", 0.78],
  ["the telegraph", 0.78], ["sky news", 0.8], ["abc news", 0.82], ["cbs news", 0.82], ["nature", 0.95],
]);

export interface RefreshReport {
  ok: boolean;
  skipped?: string;
  providers: { key: string; ok: boolean; fetched: number; error?: string }[];
  created: number;
  total: number;
  durationMs: number;
}

export async function ensureCatalog() {
  for (const [i, c] of CATEGORIES.entries()) {
    await db.category.upsert({
      where: { slug: c.slug },
      create: { slug: c.slug, name: c.name, keywords: c.keywords, sortOrder: i },
      update: {}, // admin edits win
    });
  }
}

function valid(a: RawArticle, now: number): boolean {
  if (!a.headline || a.headline.length < 15) return false;
  if (!/^https?:\/\//i.test(a.url)) return false;
  const t = a.publishedAt.getTime();
  if (Number.isNaN(t) || t > now + 3600_000 || now - t > MAX_AGE_MS) return false;
  return true;
}

export async function refreshNews(): Promise<RefreshReport> {
  const started = Date.now();
  const now = Date.now();

  // ---- lock (stale after 10 minutes) ----
  await db.refreshState.upsert({ where: { id: "singleton" }, create: { id: "singleton" }, update: {} });
  const lock = await db.refreshState.updateMany({
    where: { id: "singleton", OR: [{ running: false }, { lastAttemptAt: { lt: new Date(now - 10 * 60_000) } }] },
    data: { running: true, lastAttemptAt: new Date() },
  });
  if (lock.count === 0) {
    return { ok: false, skipped: "A refresh is already running", providers: [], created: 0, total: 0, durationMs: 0 };
  }

  try {
    await ensureCatalog();

    // ---- fetch every configured provider; one failing never stops the others ----
    const providers = allProviders().filter((p) => p.isConfigured());
    const settled = await Promise.allSettled(providers.map((p) => p.fetch()));
    const report: RefreshReport["providers"] = [];
    const raws: { raw: RawArticle; sourceKey: string; sourceName: string; sourceType: string }[] = [];

    for (const [i, res] of settled.entries()) {
      const p = providers[i];
      const source = await db.newsSource.upsert({
        where: { key: p.key },
        create: { key: p.key, name: p.name, type: p.type },
        update: { name: p.name, type: p.type },
      });
      if (!source.active) {
        report.push({ key: p.key, ok: true, fetched: 0, error: "disabled by admin" });
        continue;
      }
      if (res.status === "fulfilled") {
        const good = res.value.filter((a) => valid(a, now));
        await db.newsSource.update({
          where: { key: p.key },
          data: { lastSuccessAt: new Date(), lastCount: good.length, lastError: null },
        });
        report.push({ key: p.key, ok: true, fetched: good.length });
        for (const raw of good) raws.push({ raw, sourceKey: p.key, sourceName: p.name, sourceType: p.type });
      } else {
        const msg = (res.reason as Error)?.message ?? String(res.reason);
        await db.newsSource.update({ where: { key: p.key }, data: { lastErrorAt: new Date(), lastError: msg.slice(0, 500) } });
        await logError(`ingest:${p.key}`, res.reason);
        report.push({ key: p.key, ok: false, fetched: 0, error: msg });
      }
    }

    const anyOk = report.some((r) => r.ok && !r.error);
    if (!anyOk) {
      // Keep serving cached stories; the UI shows the last successful update time.
      return { ok: false, providers: report, created: 0, total: await db.newsArticle.count(), durationMs: Date.now() - started };
    }

    // ---- collapse identical URLs; prefer the entry that has an image ----
    const byUrl = new Map<string, (typeof raws)[number]>();
    for (const r of raws) {
      const k = normalizeUrl(r.raw.url);
      const prev = byUrl.get(k);
      if (!prev || (!prev.raw.imageUrl && r.raw.imageUrl)) byUrl.set(k, r);
    }
    const candidates = [...byUrl.entries()];

    const existingUrls = new Set(
      (await db.newsArticle.findMany({ where: { url: { in: candidates.map(([u]) => u) } }, select: { url: true } })).map((a) => a.url),
    );

    const recent: ClusterCandidate[] = (
      await db.newsArticle.findMany({
        where: { publishedAt: { gte: new Date(now - 48 * 3600_000) } },
        select: { id: true, clusterId: true, titleTokens: true, region: true, publishedAt: true },
      })
    ).map((a) => ({ ...a, region: a.region as string }));

    const cats = new Map((await db.category.findMany()).map((c) => [c.slug, c.id]));
    const publisherCache = new Map<string, string>();
    let aiBudget = MAX_AI_SUMMARIES_PER_RUN;
    let created = 0;

    const sourceIds = new Map((await db.newsSource.findMany()).map((s) => [s.key, s.id]));

    for (const [normUrl, { raw, sourceKey }] of candidates) {
      if (existingUrls.has(normUrl)) continue;
      const headline = cleanHeadline(raw.headline, raw.publisherName);
      const description = cleanDescription(raw.description);
      const tokens = tokenize(headline);
      if (tokens.length < 3) continue;

      const slug = classify({ headline, description, region: raw.region, categoryHint: raw.categoryHint });
      const categoryId = cats.get(slug) ?? cats.get(raw.region === "INDIA" ? "india" : "world")!;

      const pubKey = raw.publisherName.trim();
      let publisherId = publisherCache.get(pubKey.toLowerCase());
      if (!publisherId) {
        const p = await db.publisher.upsert({
          where: { name: pubKey },
          create: {
            name: pubKey,
            domain: raw.publisherDomain ?? null,
            credibility: KNOWN_CREDIBILITY.get(pubKey.toLowerCase()) ?? 0.6,
          },
          update: {},
        }).catch(async () => db.publisher.upsert({ where: { name: pubKey }, create: { name: pubKey, credibility: 0.6 }, update: {} }));
        publisherId = p.id;
        publisherCache.set(pubKey.toLowerCase(), publisherId);
      }

      let summary = extractiveSummary({ headline, description, content: raw.content, publisherName: raw.publisherName });
      let summaryBy: "ai" | "extractive" = "extractive";
      if (aiBudget > 0 && process.env.ANTHROPIC_API_KEY) {
        aiBudget--;
        const ai = await aiSummary({ headline, description, content: raw.content, publisherName: raw.publisherName });
        if (ai) {
          summary = ai;
          summaryBy = "ai";
        }
      }

      const clusterId = findCluster(tokens, raw.region, raw.publishedAt, recent) ?? `c_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;

      try {
        const row = await db.newsArticle.create({
          data: {
            headline,
            description: description || null,
            summary,
            summaryBy,
            imageUrl: raw.imageUrl && /^https:\/\//i.test(raw.imageUrl) ? raw.imageUrl : null,
            url: normUrl,
            author: raw.author?.slice(0, 200) || null,
            publishedAt: raw.publishedAt,
            region: raw.region,
            country: raw.country ?? null,
            readMinutes: readMinutes(`${description} ${summary}`),
            clusterId,
            titleTokens: tokens,
            categoryId,
            publisherId,
            sourceId: sourceIds.get(sourceKey)!,
          },
        });
        recent.push({ id: row.id, clusterId, titleTokens: tokens, region: raw.region, publishedAt: raw.publishedAt });
        created++;
      } catch (e) {
        // unique-url race or one bad row must not abort the batch
        if (!(e as { code?: string }).code?.startsWith("P2002")) await logError("ingest:create", e);
      }
    }

    await rescoreAll();

    // retention: keep bookmarked stories, drop old ones
    await db.newsArticle.deleteMany({
      where: { publishedAt: { lt: new Date(now - RETENTION_DAYS * 86400_000) }, bookmarks: { none: {} } },
    });

    await db.refreshState.update({ where: { id: "singleton" }, data: { lastSuccessAt: new Date() } });
    cacheClear();

    return { ok: true, providers: report, created, total: await db.newsArticle.count(), durationMs: Date.now() - started };
  } catch (e) {
    await logError("ingest:refresh", e);
    throw e;
  } finally {
    await db.refreshState.update({ where: { id: "singleton" }, data: { running: false } }).catch(() => {});
  }
}

/** Recompute cluster membership stats and scores for everything in the live window. */
export async function rescoreAll() {
  const since = new Date(Date.now() - MAX_AGE_MS);
  const rows = await db.newsArticle.findMany({
    where: { publishedAt: { gte: since } },
    select: {
      id: true, headline: true, description: true, imageUrl: true, publishedAt: true, region: true,
      clusterId: true, publisherId: true, publisher: { select: { credibility: true } },
    },
  });

  const clusters = new Map<string, typeof rows>();
  for (const r of rows) {
    const list = clusters.get(r.clusterId) ?? [];
    list.push(r);
    clusters.set(r.clusterId, list);
  }

  const updates: ReturnType<typeof db.newsArticle.update>[] = [];
  for (const members of clusters.values()) {
    const byPub = new Map<string, number>();
    for (const m of members) byPub.set(m.publisherId, m.publisher.credibility);
    const creds = [...byPub.values()];

    const scored = members.map((m) => ({
      m,
      r: rankArticle({
        headline: m.headline,
        description: m.description,
        hasImage: Boolean(m.imageUrl),
        publishedAt: m.publishedAt,
        region: m.region,
        publisherCredibility: m.publisher.credibility,
        clusterPublisherCredibilities: creds,
      }),
    }));
    // the cluster's face is the best-scoring member
    scored.sort((a, b) => b.r.score - a.r.score);
    scored.forEach(({ m, r }, idx) => {
      updates.push(
        db.newsArticle.update({
          where: { id: m.id },
          data: {
            score: r.score,
            isBreaking: r.isBreaking,
            isTrending: r.isTrending,
            isClusterPrimary: idx === 0,
            clusterSize: members.length,
          },
        }),
      );
    });
  }
  for (let i = 0; i < updates.length; i += 100) await db.$transaction(updates.slice(i, i + 100));
}
