import { route, json } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { allProviders } from "@/lib/news/providers";

export const dynamic = "force-dynamic";

export const GET = route({ name: "admin-stats", limit: 60 }, async () => {
  await requireAdmin();
  const [articles, hidden, users, sources, state, errors24h, byRegion] = await Promise.all([
    db.newsArticle.count(),
    db.newsArticle.count({ where: { hidden: true } }),
    db.user.count(),
    db.newsSource.findMany({ orderBy: { key: "asc" } }),
    db.refreshState.findUnique({ where: { id: "singleton" } }),
    db.appError.count({ where: { createdAt: { gte: new Date(Date.now() - 86400_000) } } }),
    db.newsArticle.groupBy({ by: ["region"], _count: true }),
  ]);
  const configured = new Map(allProviders().map((p) => [p.key, p.isConfigured()]));
  return json({
    articles, hidden, users, errors24h,
    byRegion: Object.fromEntries(byRegion.map((r) => [r.region, r._count])),
    refresh: { lastSuccessAt: state?.lastSuccessAt ?? null, lastAttemptAt: state?.lastAttemptAt ?? null, running: state?.running ?? false },
    sources: sources.map((s) => ({
      id: s.id, key: s.key, name: s.name, type: s.type, active: s.active, configured: configured.get(s.key) ?? false,
      lastSuccessAt: s.lastSuccessAt, lastErrorAt: s.lastErrorAt, lastError: s.lastError, lastCount: s.lastCount,
      status: !s.active ? "disabled" : s.lastErrorAt && (!s.lastSuccessAt || s.lastErrorAt > s.lastSuccessAt) ? "failing" : s.lastSuccessAt ? "healthy" : "unknown",
    })),
    providersMissingKeys: [...configured.entries()].filter(([, ok]) => !ok).map(([k]) => k),
  });
});
