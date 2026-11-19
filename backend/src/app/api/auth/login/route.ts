import { z } from "zod";
import { route, json, assertSameOrigin } from "@/lib/api";
import { HttpError, createSession, dummyHash, verifyPassword } from "@/lib/auth";
import { db } from "@/lib/db";

const schema = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1).max(200) });

export const POST = route({ name: "login", limit: 10 }, async (req) => {
  assertSameOrigin(req);
  const { email, password } = schema.parse(await req.json().catch(() => ({})));
  const user = await db.user.findUnique({ where: { email } });
  const ok = await verifyPassword(password, user?.passwordHash ?? (await dummyHash()));
  if (!user || !ok) throw new HttpError(401, "Incorrect email or password");
  await createSession(user.id);
  return json({ user: { id: user.id, email: user.email, name: user.name, role: user.role } });
});
