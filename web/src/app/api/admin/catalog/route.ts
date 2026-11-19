import { z } from "zod";
import { route, json, assertSameOrigin } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { cacheClear } from "@/lib/cache";

export const dynamic = "force-dynamic";

/** Categories, publishers and sources in one payload for the admin "Manage" tabs. */
export const GET = route({ name: "admin-catalog", limit: 60 }, async () => {
  await requireAdmin();
  const [categories, publishers] = await Promise.all([
    db.category.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { articles: true } } } }),
    db.publisher.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { articles: true } } } }),
  ]);
  return json({ categories, publishers });
});

const schema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("category"), id: z.string(), name: z.string().trim().min(1).max(60).optional(), active: z.boolean().optional(), keywords: z.array(z.string().trim().min(1).max(40)).max(80).optional() }),
  z.object({ kind: z.literal("publisher"), id: z.string(), credibility: z.number().min(0).max(1).optional(), active: z.boolean().optional() }),
  z.object({ kind: z.literal("source"), id: z.string(), active: z.boolean() }),
  z.object({ kind: z.literal("new-category"), name: z.string().trim().min(2).max(60), keywords: z.array(z.string().trim().min(1).max(40)).max(80).default([]) }),
]);

export const PATCH = route({ name: "admin-catalog-patch", limit: 60 }, async (req) => {
  assertSameOrigin(req);
  await requireAdmin();
  const b = schema.parse(await req.json().catch(() => ({})));
  switch (b.kind) {
    case "category": {
      const { kind: _k, id, ...data } = b;
      await db.category.update({ where: { id }, data });
      break;
    }
    case "publisher": {
      const { kind: _k, id, ...data } = b;
      await db.publisher.update({ where: { id }, data });
      break;
    }
    case "source":
      await db.newsSource.update({ where: { id: b.id }, data: { active: b.active } });
      break;
    case "new-category": {
      const slug = b.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const max = await db.category.aggregate({ _max: { sortOrder: true } });
      await db.category.create({ data: { slug, name: b.name, keywords: b.keywords, sortOrder: (max._max.sortOrder ?? 0) + 1 } });
      break;
    }
  }
  cacheClear();
  return json({ ok: true });
});
