import { z } from "zod";
import { route, json, assertSameOrigin } from "@/lib/api";
import { HttpError, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { toDTO } from "@/lib/queries";

export const dynamic = "force-dynamic";

const body = z.object({ articleId: z.string().min(10).max(40) });

export const GET = route({ name: "bookmarks-list" }, async () => {
  const user = await requireUser();
  const rows = await db.bookmark.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      article: {
        select: {
          id: true, headline: true, summary: true, summaryBy: true, imageUrl: true, url: true, author: true, publishedAt: true,
          region: true, country: true, score: true, isBreaking: true, isTrending: true, readMinutes: true, clusterSize: true,
          category: { select: { slug: true, name: true } }, publisher: { select: { id: true, name: true, domain: true } },
        },
      },
    },
  });
  return json({ items: rows.map((r) => toDTO(r.article, true)) }, { cache: "private, no-store" });
});

/** Idempotent: adding twice is fine. */
export const POST = route({ name: "bookmarks-add", limit: 60 }, async (req) => {
  assertSameOrigin(req);
  const user = await requireUser();
  const { articleId } = body.parse(await req.json().catch(() => ({})));
  const article = await db.newsArticle.findUnique({ where: { id: articleId }, select: { id: true } });
  if (!article) throw new HttpError(404, "Article not found");
  await db.bookmark.upsert({ where: { userId_articleId: { userId: user.id, articleId } }, create: { userId: user.id, articleId }, update: {} });
  return json({ bookmarked: true }, { status: 201 });
});

export const DELETE = route({ name: "bookmarks-remove", limit: 60 }, async (req) => {
  assertSameOrigin(req);
  const user = await requireUser();
  const { articleId } = body.parse(await req.json().catch(() => ({})));
  await db.bookmark.deleteMany({ where: { userId: user.id, articleId } });
  return json({ bookmarked: false });
});
