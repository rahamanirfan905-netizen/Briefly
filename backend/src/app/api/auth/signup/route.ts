import { z } from "zod";
import { route, json, assertSameOrigin } from "@/lib/api";
import { HttpError, createSession, hashPassword } from "@/lib/auth";
import { db } from "@/lib/db";

const schema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(10, "Use at least 10 characters").max(200),
});

export const POST = route({ name: "signup", limit: 10 }, async (req) => {
  assertSameOrigin(req);
  const body = schema.parse(await req.json().catch(() => ({})));
  const exists = await db.user.findUnique({ where: { email: body.email }, select: { id: true } });
  if (exists) throw new HttpError(409, "An account with this email already exists");
  const user = await db.user.create({
    data: { email: body.email, name: body.name ?? null, passwordHash: await hashPassword(body.password), preferences: { create: { categories: [] } } },
    select: { id: true, email: true, name: true, role: true },
  });
  await createSession(user.id);
  return json({ user }, { status: 201 });
});
