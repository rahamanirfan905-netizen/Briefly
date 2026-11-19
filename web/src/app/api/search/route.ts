import { z } from "zod";
import { route, json } from "@/lib/api";
import { getUser } from "@/lib/auth";
import { searchArticles } from "@/lib/queries";

export const dynamic = "force-dynamic";

const searchSchema = z.object({
  q: z.string().trim().max(100).default(""),
  category: z.string().regex(/^[a-z-]{2,30}$/).optional(),
  publisher: z.preprocess((value) => value === "" ? undefined : value, z.string().cuid().optional()),
  region: z.enum(["INDIA", "WORLD"]).optional(),
  range: z.enum(["24h", "7d", "30d", "all"]).default("all"),
  sort: z.enum(["relevance", "latest"]).default("relevance"),
  page: z.coerce.number().int().min(1).max(50).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export const GET = route({ name: "search", limit: 60 }, async (req) => {
  const p = searchSchema.parse(Object.fromEntries(new URL(req.url).searchParams));
  const user = await getUser();
  return json(await searchArticles(p, user?.id), { cache: "private, no-store" });
});
