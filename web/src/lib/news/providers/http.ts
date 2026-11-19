export async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { accept: "application/json", "user-agent": "BrieflyBot/1.0 (+news aggregator)", ...(init?.headers ?? {}) },
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  if (!res.ok) {
    const body = (await res.text().catch(() => "")).slice(0, 200);
    throw new Error(`HTTP ${res.status} from ${new URL(url).hostname}: ${body}`);
  }
  return (await res.json()) as T;
}

export async function getText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { accept: "application/rss+xml, application/xml, text/xml, */*", "user-agent": "BrieflyBot/1.0 (+news aggregator)" },
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${new URL(url).hostname}`);
  return res.text();
}
