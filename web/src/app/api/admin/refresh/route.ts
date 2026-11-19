import { route, json, assertSameOrigin } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { refreshNews } from "@/lib/news/ingest";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export const POST = route({ name: "admin-refresh", limit: 6 }, async (req) => {
  assertSameOrigin(req);
  await requireAdmin();
  return json(await refreshNews());
});
