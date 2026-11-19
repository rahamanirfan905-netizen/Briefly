import { route, json } from "@/lib/api";
import { HttpError, getUser } from "@/lib/auth";
import { getArticle } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const GET = route({ name: "article" }, async (_req, ctx) => {
  const { id } = await ctx.params;
  if (!/^[a-z0-9]{10,40}$/i.test(id)) throw new HttpError(404, "Article not found");
  const user = await getUser();
  const data = await getArticle(id, user?.id);
  if (!data) throw new HttpError(404, "Article not found");
  return json(data);
});
