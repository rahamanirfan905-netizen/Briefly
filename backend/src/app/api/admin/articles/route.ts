import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { route, json, assertSameOrigin } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { cacheClear } from "@/lib/cache";

export const dynamic = "force-dynamic";

export const GET = route({ name: "admin-articles", limit: 90 }, async (req) => {
  await requireAdmin();
  const q = z
    .object({
      q: z.string().trim().max(100).default(""),
      filter: z.enum(["all", "hidden", "duplicates"]).default("all"),
      page: z.coerce.number().int().min(1).default(1),
    })
    .parse(Object.fromEntries(new URL(req.url).searchParams));
  const where: Prisma.NewsArticleWhereInput = {};
  if (q.q) where.OR = [{ headline: { contains: q.q, mode: "insensitive" } }, { publisher: { name: { contains: q.q, mode: "insensitive" } } }];
  if (q.filter === "hidden") where.hidden = true;
  if (q.filter === "duplicates") where.isClusterPrimary = false;
  const [items, total] = await Promise.all([
    db.newsArticle.findMany({
      where, orderBy: { publishedAt: "desc" }, skip: (q.page - 1) * 25, take: 25,
      select: { id: true, headline: true, url: true, hidden: true, isClusterPrimary: true, clusterSize: true, score: true, publishedAt: true, region: true, publisher: { select: { name: true } }, category: { select: { name: true } } },
    }),
    db.newsArticle.count({ where }),
  ]);
  return json({ items, total, page: q.page, totalPages: Math.max(1, Math.ceil(total / 25)) });
});

const patch = z.object({ id: z.string().min(10).max(40), hidden: z.boolean() });

/** "Remove" hides a story everywhere (it stays in the DB so re-fetching doesn't bring it back). */
export const PATCH = route({ name: "admin-articles-patch", limit: 60 }, async (req) => {
  assertSameOrigin(req);
  await requireAdmin();
  const { id, hidden } = patch.parse(await req.json().catch(() => ({})));
  await db.newsArticle.update({ where: { id }, data: { hidden } });
  cacheClear();
  return json({ ok: true });
});

export const DELETE = route({ name: "admin-articles-delete", limit: 30 }, async (req) => {
  assertSameOrigin(req);
  await requireAdmin();
  const { id } = z.object({ id: z.string().min(10).max(40) }).parse(await req.json().catch(() => ({})));
  // Permanent delete. If the publisher still lists the story, the next refresh can re-create it;
  // "Remove" (hide) is the durable way to keep a story out of the feed.
  await db.newsArticle.delete({ where: { id } });
  cacheClear();
  return json({ ok: true });
});
