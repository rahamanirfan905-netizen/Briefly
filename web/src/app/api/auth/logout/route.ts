import { route, json, assertSameOrigin } from "@/lib/api";
import { destroySession } from "@/lib/auth";

export const POST = route({ name: "logout", limit: 30 }, async (req) => {
  assertSameOrigin(req);
  await destroySession();
  return json({ ok: true });
});
