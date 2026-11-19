import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { refreshNews } from "@/lib/news/ingest";
import { logError } from "@/lib/errors";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorised(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // refuse to run unauthenticated
  const got = req.headers.get("authorization") ?? "";
  const want = `Bearer ${secret}`;
  const a = Buffer.from(got), b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function run(req: Request) {
  if (!authorised(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await refreshNews());
  } catch (e) {
    await logError("cron:refresh", e);
    return NextResponse.json({ ok: false, error: "Refresh failed; cached stories remain available" }, { status: 500 });
  }
}

// Vercel Cron issues GET; external schedulers can use POST.
export const GET = run;
export const POST = run;
