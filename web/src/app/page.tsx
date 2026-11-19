import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getUser } from "@/lib/auth";
import { getForYou, getTop60 } from "@/lib/queries";
import { formatDateTime, formatLongDate } from "@/lib/utils";
import { FeedSection } from "@/components/feed-section";
import { EmptyState, Labels, NewsCard } from "@/components/news-card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

const STALE_MS = 3 * 3600_000;

export default async function HomePage() {
  const user = await getUser().catch(() => null);
  const [top, forYou] = await Promise.all([getTop60(user?.id), user ? getForYou(user.id) : Promise.resolve(null)]);
  const { featured, india, world, total, lastUpdated } = top;
  const stale = lastUpdated ? Date.now() - new Date(lastUpdated).getTime() > STALE_MS : false;

  return (
    <div className="container pb-8">
      <header className="pt-8 text-center">
        <h1 className="font-serif text-5xl font-black tracking-tight sm:text-7xl">BRIEFLY</h1>
        <p className="mt-2 text-lg text-muted-foreground">Your daily briefing, all in one place.</p>
        <p className="mx-auto mt-4 flex max-w-2xl flex-wrap items-center justify-center gap-x-4 gap-y-1 border-y py-2 text-sm text-muted-foreground">
          <span>{formatLongDate()}</span>
          <span>{lastUpdated ? <>Last updated {formatDateTime(lastUpdated)} IST</> : "Not yet updated"}</span>
          <span><strong className="text-foreground">{total}</strong> stories available</span>
        </p>
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
          <section aria-label="Top story" className="group mt-8 grid overflow-hidden rounded-xl border bg-card lg:grid-cols-2">
            <Link href={`/article/${featured.id}`} className="relative block min-h-64 bg-muted lg:min-h-[26rem]" aria-label={featured.headline}>
              {featured.imageUrl && <Image src={featured.imageUrl} alt="" fill priority sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" />}
            </Link>
            <div className="flex flex-col justify-center gap-4 p-6 sm:p-10">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge>Top story</Badge><Badge>{featured.category.name}</Badge><Labels a={featured} />
              </div>
              <h2 className="text-3xl font-bold leading-tight sm:text-4xl">
                <Link href={`/article/${featured.id}`} className="hover:underline">{featured.headline}</Link>
              </h2>
              <p className="leading-relaxed text-muted-foreground">{featured.summary}</p>
              <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground">{featured.publisher.name}</span> · {formatDateTime(featured.publishedAt)}</p>
              <div>
                <Link href={`/article/${featured.id}`} className="inline-flex h-11 items-center gap-2 rounded-md bg-accent px-6 text-sm font-medium text-accent-foreground hover:opacity-90">
                  Read full story <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </section>

          {forYou && forYou.length > 0 && (
            <section aria-labelledby="foryou-h" className="mt-12">
              <div className="section-rule items-baseline justify-between">
                <h2 id="foryou-h" className="text-2xl font-bold">For you</h2>
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
