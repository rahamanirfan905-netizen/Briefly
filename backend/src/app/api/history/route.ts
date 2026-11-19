import { z } from "zod";
import { route, json, assertSameOrigin } from "@/lib/api";
import { getUser, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { toDTO } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const GET = route({ name: "history-list" }, async () => {
  const user = await requireUser();
  const rows = await db.readingHistory.findMany({
    where: { userId: user.id },
    orderBy: { readAt: "desc" },
    take: 50,
    select: {
      readAt: true,
      article: {
        select: {
          id: true, headline: true, summary: true, summaryBy: true, imageUrl: true, url: true, author: true, publishedAt: true,
          region: true, country: true, score: true, isBreaking: true, isTrending: true, readMinutes: true, clusterSize: true,
          category: { select: { slug: true, name: true } }, publisher: { select: { id: true, name: true, domain: true } },
        },
      },
    },
  });
  return json({ items: rows.map((r) => ({ readAt: r.readAt.toISOString(), article: toDTO(r.article) })) }, { cache: "private, no-store" });
});

/** Records that the signed-in user opened an article. Silent no-op for guests. */
export const POST = route({ name: "history-add", limit: 120 }, async (req) => {
  assertSameOrigin(req);
  const user = await getUser();
  if (!user) return json({ recorded: false });
  const { articleId } = z.object({ articleId: z.string().min(10).max(40) }).parse(await req.json().catch(() => ({})));
  const exists = await db.newsArticle.findUnique({ where: { id: articleId }, select: { id: true } });
  if (!exists) return json({ recorded: false });
  await db.readingHistory.upsert({
    where: { userId_articleId: { userId: user.id, articleId } },
    create: { userId: user.id, articleId },
    update: { readAt: new Date() },
  });
  return json({ recorded: true });
});

export const DELETE = route({ name: "history-clear", limit: 10 }, async (req) => {
  assertSameOrigin(req);
  const user = await requireUser();
  await db.readingHistory.deleteMany({ where: { userId: user.id } });
  return json({ ok: true });
});
