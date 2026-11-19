import { route, json } from "@/lib/api";
import { getUser } from "@/lib/auth";
import { getTop60 } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const GET = route({ name: "news-top" }, async () => {
  const user = await getUser();
  return json(await getTop60(user?.id), { cache: user ? "private, no-store" : "public, s-maxage=60, stale-while-revalidate=300" });
});
