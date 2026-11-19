import type { Metadata } from "next";
import { z } from "zod";
import { Search } from "lucide-react";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { searchArticles } from "@/lib/queries";
import { EmptyState, NewsCard, Pagination } from "@/components/news-card";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Search" };

const schema = z.object({
  q: z.string().trim().max(100).catch(""),
  category: z.string().regex(/^[a-z-]{2,30}$/).optional().catch(undefined),
  region: z.enum(["INDIA", "WORLD"]).optional().catch(undefined),
  range: z.enum(["24h", "7d", "30d", "all"]).catch("all"),
  sort: z.enum(["relevance", "latest"]).catch("relevance"),
  page: z.coerce.number().int().min(1).max(50).catch(1),
});

const field = "h-10 rounded-md border bg-card px-3 text-sm";

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const p = schema.parse(await searchParams);
  const user = await getUser().catch(() => null);
  const [categories, res] = await Promise.all([
    db.category.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, select: { slug: true, name: true } }),
    p.q || p.category || p.region ? searchArticles({ ...p, pageSize: 18 }, user?.id) : Promise.resolve(null),
  ]);

  const qs = (page: number) => {
    const u = new URLSearchParams();
    if (p.q) u.set("q", p.q);
    if (p.category) u.set("category", p.category);
    if (p.region) u.set("region", p.region);
    if (p.range !== "all") u.set("range", p.range);
    if (p.sort !== "relevance") u.set("sort", p.sort);
    u.set("page", String(page));
    return `/search?${u}`;
  };

  return (
    <div className="container py-8">
      <h1 className="text-4xl font-bold">Search</h1>
      <form method="get" action="/search" role="search" className="mt-5 grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-6">
        <div className="relative sm:col-span-6">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <input name="q" defaultValue={p.q} maxLength={100} aria-label="Search query" placeholder="Headlines, keywords, countries, publishers…" className={`${field} w-full pl-9`} />
        </div>
        <select name="category" defaultValue={p.category ?? ""} aria-label="Category" className={`${field} sm:col-span-2`}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
        <select name="region" defaultValue={p.region ?? ""} aria-label="Region" className={field}>
          <option value="">India + World</option>
          <option value="INDIA">India</option>
          <option value="WORLD">World</option>
        </select>
        <select name="range" defaultValue={p.range} aria-label="Date range" className={field}>
          <option value="all">Any time</option>
          <option value="24h">Past 24 hours</option>
          <option value="7d">Past week</option>
          <option value="30d">Past month</option>
        </select>
        <select name="sort" defaultValue={p.sort} aria-label="Sort by" className={field}>
          <option value="relevance">Most relevant</option>
          <option value="latest">Latest</option>
        </select>
        <button className="h-10 rounded-md bg-foreground px-4 text-sm font-medium text-background hover:bg-foreground/85 sm:col-span-6 sm:col-start-1 sm:w-32">Search</button>
      </form>

      <div className="mt-8">
        {!res ? (
          <EmptyState title="Find a story" body="Search by headline, keyword, topic, country (try “Japan” or “India”) or publisher (try “BBC News”)." />
        ) : res.items.length === 0 ? (
          <EmptyState title="No matching stories" body={`Nothing found${p.q ? ` for “${p.q}”` : ""}. Try fewer keywords, a wider date range, or a different category.`} />
        ) : (
          <>
            <p className="mb-4 text-sm text-muted-foreground" role="status">{res.total} {res.total === 1 ? "story" : "stories"}{p.q && <> for “{p.q}”</>}</p>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{res.items.map((a) => <NewsCard key={a.id} a={a} />)}</div>
            <Pagination page={res.page} totalPages={res.totalPages} hrefFor={qs} />
          </>
        )}
      </div>
    </div>
  );
}
