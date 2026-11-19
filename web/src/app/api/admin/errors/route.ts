import { route, json, assertSameOrigin } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export const GET = route({ name: "admin-errors", limit: 60 }, async () => {
  await requireAdmin();
  const errors = await db.appError.findMany({ orderBy: { createdAt: "desc" }, take: 100, select: { id: true, scope: true, message: true, createdAt: true } });
  return json({ errors });
});

export const DELETE = route({ name: "admin-errors-clear", limit: 10 }, async (req) => {
  assertSameOrigin(req);
  await requireAdmin();
  await db.appError.deleteMany({});
  return json({ ok: true });
});
