import { z } from "zod";
import { route, json } from "@/lib/api";
import { getUser } from "@/lib/auth";
import { getCategoryFeed } from "@/lib/queries";

export const dynamic = "force-dynamic";

const schema = z.object({
  category: z.string().regex(/^[a-z-]{2,30}$/).default("india"),
  page: z.coerce.number().int().min(1).max(50).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export const GET = route({ name: "news-list" }, async (req) => {
  const q = schema.parse(Object.fromEntries(new URL(req.url).searchParams));
  const user = await getUser();
  return json(await getCategoryFeed(q.category, q.page, q.pageSize, user?.id), { cache: user ? "private, no-store" : "public, s-maxage=60" });
});
