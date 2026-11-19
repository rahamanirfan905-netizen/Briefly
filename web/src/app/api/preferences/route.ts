import { z } from "zod";
import { route, json, assertSameOrigin } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export const GET = route({ name: "prefs-get" }, async () => {
  const user = await requireUser();
  const p = await db.userPreference.findUnique({ where: { userId: user.id } });
  return json({ categories: p?.categories ?? [], region: p?.region ?? "BOTH" }, { cache: "private, no-store" });
});

const schema = z.object({
  categories: z.array(z.string().regex(/^[a-z-]{2,30}$/)).max(12),
  region: z.enum(["INDIA", "WORLD", "BOTH"]),
  name: z.string().trim().min(1).max(80).optional(),
});

export const PUT = route({ name: "prefs-put", limit: 30 }, async (req) => {
  assertSameOrigin(req);
  const user = await requireUser();
  const body = schema.parse(await req.json().catch(() => ({})));
  const valid = new Set((await db.category.findMany({ select: { slug: true } })).map((c) => c.slug));
  const categories = body.categories.filter((c) => valid.has(c));
  await db.userPreference.upsert({
    where: { userId: user.id },
    create: { userId: user.id, categories, region: body.region },
    update: { categories, region: body.region },
  });
  if (body.name) await db.user.update({ where: { id: user.id }, data: { name: body.name } });
  return json({ categories, region: body.region });
});
