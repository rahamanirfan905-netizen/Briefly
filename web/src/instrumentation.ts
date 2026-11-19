/**
 * Self-hosted scheduler. When ENABLE_INTERNAL_CRON=true the Node server refreshes
 * news every REFRESH_INTERVAL_MINUTES, plus once shortly after boot so a fresh
 * deployment fills itself. On Vercel use vercel.json cron instead (leave this off).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.ENABLE_INTERNAL_CRON !== "true") return;

  const minutes = Math.max(5, Number(process.env.REFRESH_INTERVAL_MINUTES) || 30);
  const { refreshNews } = await import("./lib/news/ingest");
  const { logError } = await import("./lib/errors");

  const tick = async () => {
    try {
      const r = await refreshNews();
      console.log(`[briefly] refresh: ${r.skipped ?? `${r.created} new, ${r.total} stored`}`);
    } catch (e) {
      await logError("internal-cron", e);
    }
  };
  setTimeout(tick, 15_000);
  const timer = setInterval(tick, minutes * 60_000) as unknown as { unref?: () => void };
  timer.unref?.();
}
