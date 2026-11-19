import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { HttpError } from "./auth";
import { logError } from "./errors";
import { clientIp, rateLimit } from "./rate-limit";

type Handler = (req: Request, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>;

interface Options {
  /** requests per minute per IP; default 120 */
  limit?: number;
  name: string;
}

/** Wraps a route handler with rate limiting, validation-error mapping and error logging. */
export function route(opts: Options, handler: Handler): Handler {
  return async (req, ctx) => {
    const ip = clientIp(req);
    if (!rateLimit(`${opts.name}:${ip}`, opts.limit ?? 120, 60_000)) {
      return NextResponse.json({ error: "Too many requests. Please slow down." }, { status: 429, headers: { "Retry-After": "60" } });
    }
    try {
      return await handler(req, ctx);
    } catch (e) {
      if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
      if (e instanceof ZodError) {
        return NextResponse.json({ error: e.issues[0]?.message ?? "Invalid input", issues: e.issues }, { status: 400 });
      }
      await logError(`api:${opts.name}`, e);
      return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }
  };
}

export const json = (data: unknown, init?: { status?: number; cache?: string }) =>
  NextResponse.json(data, { status: init?.status ?? 200, headers: init?.cache ? { "Cache-Control": init.cache } : undefined });

/** Cross-site request guard for state-changing routes (cookies are SameSite=Lax; this is defence in depth). */
export function assertSameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (host && new URL(origin).host !== host) throw new HttpError(403, "Cross-origin request blocked");
}
