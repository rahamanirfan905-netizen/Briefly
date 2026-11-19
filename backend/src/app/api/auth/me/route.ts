import { route, json } from "@/lib/api";
import { getUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const GET = route({ name: "me" }, async () => json({ user: await getUser() }, { cache: "private, no-store" }));
