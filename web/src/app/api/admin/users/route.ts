import { route, json } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export const GET = route({ name: "admin-users", limit: 60 }, async () => {
  await requireAdmin();
  const users = await db.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: { id: true, email: true, name: true, role: true, createdAt: true, _count: { select: { bookmarks: true, history: true } } },
  });
  return json({ users }); // password hashes are never selected
});
