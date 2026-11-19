"use client";
import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "./ui/button";
import { cn, formatDateTime } from "@/lib/utils";

type Tab = "overview" | "stories" | "catalog" | "users" | "errors";

async function api<T>(url: string, method = "GET", body?: unknown): Promise<T> {
  const res = await fetch(url, { method, headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data as T;
}

export function AdminDashboard() {
  const [tab, setTab] = useState<Tab>("overview");
  const tabs: [Tab, string][] = [["overview", "Overview"], ["stories", "Stories"], ["catalog", "Categories & publishers"], ["users", "Users"], ["errors", "Errors"]];
  return (
    <div className="mt-6">
      <div role="tablist" className="flex flex-wrap gap-1 border-b">
        {tabs.map(([k, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            className={cn("-mb-px border-b-2 px-4 py-2 text-sm", tab === k ? "border-accent font-semibold" : "border-transparent text-muted-foreground hover:text-foreground")}>
            {label}
          </button>
        ))}
      </div>
      <div className="mt-6">
        {tab === "overview" && <Overview />}
        {tab === "stories" && <Stories />}
        {tab === "catalog" && <Catalog />}
        {tab === "users" && <Users />}
        {tab === "errors" && <Errors />}
      </div>
    </div>
  );
}

function useLoad<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => {
    try {
      setData(await api<T>(url));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [url]);
  useEffect(() => { reload(); }, [reload]);
  return { data, error, reload };
}

const Err = ({ m }: { m: string | null }) => (m ? <p role="alert" className="mb-4 rounded-md border border-accent/40 bg-muted px-3 py-2 text-sm">{m}</p> : null);
const Stat = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="rounded-lg border bg-card p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 font-serif text-3xl font-bold">{value}</p></div>
);

interface Stats {
  articles: number; hidden: number; users: number; errors24h: number; byRegion: Record<string, number>;
  refresh: { lastSuccessAt: string | null; lastAttemptAt: string | null; running: boolean };
  sources: { id: string; key: string; name: string; type: string; active: boolean; configured: boolean; status: string; lastSuccessAt: string | null; lastError: string | null; lastCount: number }[];
  providersMissingKeys: string[];
}

function Overview() {
  const { data, error, reload } = useLoad<Stats>("/api/admin/stats");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function refresh() {
    setBusy(true);
    setMsg(null);
    try {
      const r = await api<{ ok: boolean; skipped?: string; created: number; total: number; providers: { key: string; ok: boolean; error?: string }[] }>("/api/admin/refresh", "POST");
      const failed = r.providers.filter((p) => !p.ok).length;
      setMsg(r.skipped ?? (r.ok ? `Refresh complete: ${r.created} new stories, ${r.total} stored${failed ? `, ${failed} source(s) failed` : ""}.` : "Every source failed. Cached stories are still being served."));
    } catch (e) {
      setMsg((e as Error).message);
    }
    setBusy(false);
    reload();
  }

  async function toggle(id: string, active: boolean) {
    await api("/api/admin/catalog", "PATCH", { kind: "source", id, active });
    reload();
  }

  if (!data) return <><Err m={error} />{!error && <p className="text-sm text-muted-foreground">Loading…</p>}</>;
  const dot = (s: string) => (s === "healthy" ? "bg-green-600" : s === "failing" ? "bg-red-600" : "bg-muted-foreground");
  return (
    <div>
      <Err m={error} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Articles" value={data.articles} />
        <Stat label="India / World" value={`${data.byRegion.INDIA ?? 0} / ${data.byRegion.WORLD ?? 0}`} />
        <Stat label="Hidden" value={data.hidden} />
        <Stat label="Users" value={data.users} />
        <Stat label="Errors (24h)" value={data.errors24h} />
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <Button onClick={refresh} disabled={busy || data.refresh.running}><RefreshCw className={cn("h-4 w-4", busy && "animate-spin")} />{busy ? "Refreshing…" : "Refresh news now"}</Button>
        <p className="text-sm text-muted-foreground">Last success: {data.refresh.lastSuccessAt ? formatDateTime(data.refresh.lastSuccessAt) : "never"}</p>
      </div>
      {msg && <p role="status" className="mt-3 text-sm">{msg}</p>}
      {data.providersMissingKeys.length > 0 && (
        <p className="mt-4 rounded-md border bg-muted px-3 py-2 text-sm">Not configured (no API key in the environment): {data.providersMissingKeys.join(", ")}.</p>
      )}
      <h2 className="mt-8 text-xl font-bold">News sources &amp; API status</h2>
      <div className="mt-3 overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs uppercase text-muted-foreground"><tr><th className="p-3">Source</th><th>Type</th><th>Status</th><th>Last stories</th><th>Last success</th><th>Active</th></tr></thead>
          <tbody>
            {data.sources.length === 0 && <tr><td colSpan={6} className="p-4 text-muted-foreground">No refresh has run yet.</td></tr>}
            {data.sources.map((s) => (
              <tr key={s.id} className="border-t align-top">
                <td className="p-3"><p className="font-medium">{s.name}</p>{s.lastError && s.status === "failing" && <p className="mt-0.5 max-w-md text-xs text-muted-foreground">{s.lastError}</p>}</td>
                <td>{s.type}</td>
                <td><span className="inline-flex items-center gap-1.5"><span className={cn("h-2 w-2 rounded-full", dot(s.status))} />{s.status}</span></td>
                <td>{s.lastCount}</td>
                <td>{s.lastSuccessAt ? formatDateTime(s.lastSuccessAt) : "—"}</td>
                <td><input type="checkbox" aria-label={`Toggle ${s.name}`} checked={s.active} onChange={(e) => toggle(s.id, e.target.checked)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface AdminArticle { id: string; headline: string; url: string; hidden: boolean; isClusterPrimary: boolean; clusterSize: number; score: number; publishedAt: string; region: string; publisher: { name: string }; category: { name: string } }

function Stories() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "hidden" | "duplicates">("all");
  const [page, setPage] = useState(1);
  const url = `/api/admin/articles?q=${encodeURIComponent(q)}&filter=${filter}&page=${page}`;
  const { data, error, reload } = useLoad<{ items: AdminArticle[]; total: number; totalPages: number }>(url);

  const setHidden = async (id: string, hidden: boolean) => { await api("/api/admin/articles", "PATCH", { id, hidden }); reload(); };
  const del = async (id: string) => { if (confirm("Permanently delete this story? It may be re-fetched on the next refresh; hiding is usually better.")) { await api("/api/admin/articles", "DELETE", { id }); reload(); } };

  return (
    <div>
      <Err m={error} />
      <div className="mb-4 flex flex-wrap gap-2">
        <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search headline or publisher" aria-label="Search stories" className="h-10 w-72 rounded-md border bg-card px-3 text-sm" />
        <select value={filter} onChange={(e) => { setFilter(e.target.value as typeof filter); setPage(1); }} aria-label="Filter" className="h-10 rounded-md border bg-card px-3 text-sm">
          <option value="all">All stories</option><option value="duplicates">Grouped duplicates</option><option value="hidden">Hidden</option>
        </select>
      </div>
      <div className="divide-y rounded-lg border bg-card">
        {data?.items.map((a) => (
          <div key={a.id} className="flex flex-wrap items-start justify-between gap-3 p-3">
            <div className="min-w-0 flex-1">
              <a href={a.url} target="_blank" rel="noopener noreferrer" className={cn("font-medium hover:underline", a.hidden && "text-muted-foreground line-through")}>{a.headline}</a>
              <p className="mt-0.5 text-xs text-muted-foreground">{a.publisher.name} · {a.category.name} · {a.region} · {formatDateTime(a.publishedAt)} · score {a.score}{!a.isClusterPrimary && " · duplicate coverage"}{a.clusterSize > 1 && ` · ${a.clusterSize} in group`}</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setHidden(a.id, !a.hidden)}>{a.hidden ? "Restore" : "Remove"}</Button>
              <Button size="sm" variant="ghost" onClick={() => del(a.id)}>Delete</Button>
            </div>
          </div>
        ))}
        {data && data.items.length === 0 && <p className="p-4 text-sm text-muted-foreground">No stories match.</p>}
      </div>
      {data && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
          <span className="text-muted-foreground">{data.total} stories · page {page} of {data.totalPages}</span>
          <Button size="sm" variant="outline" disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}

interface Catalog {
  categories: { id: string; slug: string; name: string; active: boolean; keywords: string[]; _count: { articles: number } }[];
  publishers: { id: string; name: string; credibility: number; active: boolean; _count: { articles: number } }[];
}

function Catalog() {
  const { data, error, reload } = useLoad<Catalog>("/api/admin/catalog");
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const run = async (body: unknown) => { try { await api("/api/admin/catalog", "PATCH", body); setErr(null); reload(); } catch (e) { setErr((e as Error).message); } };
  if (!data) return <Err m={error} />;
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <Err m={err ?? error} />
      <section>
        <h2 className="text-xl font-bold">Categories</h2>
        <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (name.trim()) { run({ kind: "new-category", name: name.trim() }); setName(""); } }}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New category name" aria-label="New category name" className="h-10 flex-1 rounded-md border bg-card px-3 text-sm" />
          <Button type="submit">Add</Button>
        </form>
        <ul className="mt-3 divide-y rounded-lg border bg-card">
          {data.categories.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 p-3 text-sm">
              <div><p className="font-medium">{c.name} <span className="text-xs text-muted-foreground">/{c.slug} · {c._count.articles} stories</span></p></div>
              <label className="flex items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" checked={c.active} onChange={(e) => run({ kind: "category", id: c.id, active: e.target.checked })} />Active</label>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-muted-foreground">Rename a category by editing it in the database or via PATCH /api/admin/catalog; slugs stay stable so links never break.</p>
      </section>
      <section>
        <h2 className="text-xl font-bold">Publishers</h2>
        <p className="mt-1 text-xs text-muted-foreground">Credibility (0–1) feeds the ranking score. Deactivating a publisher hides all of its stories immediately.</p>
        <ul className="mt-3 max-h-[32rem] divide-y overflow-auto rounded-lg border bg-card">
          {data.publishers.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 p-3 text-sm">
              <p className="font-medium">{p.name} <span className="text-xs text-muted-foreground">{p._count.articles} stories</span></p>
              <div className="flex items-center gap-3">
                <input type="number" min={0} max={1} step={0.05} defaultValue={p.credibility} aria-label={`Credibility for ${p.name}`} className="h-8 w-20 rounded border bg-background px-2"
                  onBlur={(e) => { const v = Number(e.target.value); if (v >= 0 && v <= 1 && v !== p.credibility) run({ kind: "publisher", id: p.id, credibility: v }); }} />
                <label className="flex items-center gap-1 text-xs text-muted-foreground"><input type="checkbox" checked={p.active} onChange={(e) => run({ kind: "publisher", id: p.id, active: e.target.checked })} />Active</label>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Users() {
  const { data, error } = useLoad<{ users: { id: string; email: string; name: string | null; role: string; createdAt: string; _count: { bookmarks: number; history: number } }[] }>("/api/admin/users");
  if (!data) return <Err m={error} />;
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted text-left text-xs uppercase text-muted-foreground"><tr><th className="p-3">User</th><th>Role</th><th>Joined</th><th>Bookmarks</th><th>Read</th></tr></thead>
        <tbody>
          {data.users.map((u) => (
            <tr key={u.id} className="border-t"><td className="p-3"><p className="font-medium">{u.name ?? "—"}</p><p className="text-xs text-muted-foreground">{u.email}</p></td><td>{u.role}</td><td>{formatDateTime(u.createdAt)}</td><td>{u._count.bookmarks}</td><td>{u._count.history}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Errors() {
  const { data, error, reload } = useLoad<{ errors: { id: string; scope: string; message: string; createdAt: string }[] }>("/api/admin/errors");
  if (!data) return <Err m={error} />;
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Most recent {data.errors.length} errors</p>
        {data.errors.length > 0 && <Button size="sm" variant="outline" onClick={async () => { await api("/api/admin/errors", "DELETE"); reload(); }}>Clear all</Button>}
      </div>
      <div className="divide-y rounded-lg border bg-card">
        {data.errors.length === 0 && <p className="p-4 text-sm text-muted-foreground">No errors recorded.</p>}
        {data.errors.map((e) => (
          <div key={e.id} className="p-3 text-sm"><p className="text-xs text-muted-foreground">{formatDateTime(e.createdAt)} · {e.scope}</p><p className="mt-0.5 break-words">{e.message}</p></div>
        ))}
      </div>
    </div>
  );
}
