import { z } from "zod";
import { route, json } from "@/lib/api";
import { suggest } from "@/lib/queries";
import { cached } from "@/lib/cache";

export const dynamic = "force-dynamic";

export const GET = route({ name: "suggest", limit: 90 }, async (req) => {
  const { q } = z.object({ q: z.string().trim().max(60).default("") }).parse(Object.fromEntries(new URL(req.url).searchParams));
  return json(await cached(`suggest:${q.toLowerCase()}`, 30, () => suggest(q)), { cache: "public, s-maxage=30" });
});
