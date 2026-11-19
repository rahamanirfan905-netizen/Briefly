import { db } from "./db";

/** Persist an application error for the admin dashboard. Never throws. */
export async function logError(scope: string, err: unknown): Promise<void> {
  const e = err instanceof Error ? err : new Error(String(err));
  console.error(`[${scope}]`, e.message);
  try {
    await db.appError.create({
      data: { scope: scope.slice(0, 120), message: e.message.slice(0, 1000), stack: e.stack?.slice(0, 4000) ?? null },
    });
  } catch {
    /* the database itself may be the problem */
  }
}
