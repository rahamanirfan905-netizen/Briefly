import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getUser } from "@/lib/auth";
import { getForYou, getTop60 } from "@/lib/queries";
import { formatDateTime, formatLongDate } from "@/lib/utils";
import { FeedSection } from "@/components/feed-section";
import { EmptyState, Labels, NewsCard, Thumb } from "@/components/news-card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

const STALE_MS = 3 * 3600_000;

export default async function HomePage() {
  const user = await getUser().catch(() => null);
  const [top, forYou] = await Promise.all([getTop60(user?.id), user ? getForYou(user.id) : Promise.resolve(null)]);
  const { featured, india, world, total, lastUpdated } = top;
  const stale = lastUpdated ? Date.now() - new Date(lastUpdated).getTime() > STALE_MS : false;

  return (
    <div className="container pb-12">
      <header className="border-b border-foreground py-8 sm:py-12">
        <p className="eyebrow">Independent news, edited for your attention</p>
        <div className="mt-3 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div><h1 className="font-serif text-5xl font-black leading-none tracking-[-0.065em] sm:text-7xl">The daily<br />briefing.</h1><p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">The stories shaping India and the world, ranked and distilled without the noise.</p></div>
          <p className="max-w-xs border-l border-accent pl-4 text-sm leading-relaxed text-muted-foreground"><span className="block font-semibold text-foreground">{formatLongDate()}</span>{lastUpdated ? <>Updated {formatDateTime(lastUpdated)} IST</> : "Awaiting the first refresh"}<br /><strong className="text-foreground">{total}</strong> stories in today&apos;s edition</p>
        </div>
      </header>

      {stale && (
        <p role="status" className="mt-4 rounded-md border border-accent/40 bg-muted px-4 py-3 text-sm">
          Some news sources have not responded recently, so you are seeing stories from the last successful update ({lastUpdated && formatDateTime(lastUpdated)} IST).
        </p>
      )}

      {!featured ? (
        <div className="mt-10">
          <EmptyState
            title="No stories yet"
            body="The news database is empty. Add at least one provider key (or just use the built-in RSS feeds), then run `npm run refresh` or press “Refresh news” in the admin dashboard. See the README for details."
          />
        </div>
      ) : (
        <>
          <section aria-label="Top story" className="group mt-8 grid overflow-hidden rounded-sm border bg-card shadow-sm lg:grid-cols-2">
            <Link href={`/article/${featured.id}`} className="block min-h-72 lg:min-h-[32rem]" aria-label={featured.headline}>
              <Thumb a={featured} className="h-full min-h-72 lg:min-h-[32rem]" priority />
            </Link>
            <div className="flex flex-col justify-center gap-5 p-6 sm:p-10 lg:p-12">
              <div className="flex flex-wrap items-center gap-2 text-xs"><span className="eyebrow">Lead story</span>
                <Badge>{featured.category.name}</Badge><Labels a={featured} />
              </div>
              <h2 className="font-serif text-4xl font-bold leading-[1.02] tracking-tight sm:text-5xl">
                <Link href={`/article/${featured.id}`} className="editorial-link">{featured.headline}</Link>
              </h2>
              <p className="leading-relaxed text-muted-foreground">{featured.summary}</p>
              <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground">{featured.publisher.name}</span> · {formatDateTime(featured.publishedAt)}</p>
              <div>
                <Link href={`/article/${featured.id}`} className="inline-flex h-11 items-center gap-2 rounded-sm bg-accent px-6 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90">
                  Read summary <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </section>

          {forYou && forYou.length > 0 && (
            <section aria-labelledby="foryou-h" className="mt-16">
              <div className="section-rule items-baseline justify-between">
                <div><p className="eyebrow">Your reading</p><h2 id="foryou-h" className="mt-1 text-3xl font-bold">For you</h2></div>
                <Link href="/profile" className="text-sm text-muted-foreground hover:text-foreground">Edit preferences</Link>
              </div>
              <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{forYou.map((a) => <NewsCard key={a.id} a={a} />)}</div>
            </section>
          )}

          <FeedSection id="india" title="Top India news" subtitle={`${india.length} ranked stories`} items={india} />
          <FeedSection id="world" title="Top world news" subtitle={`${world.length} ranked stories`} items={world} />
        </>
      )}
    </div>
  );
}
