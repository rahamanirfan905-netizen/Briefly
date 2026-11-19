import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { ArticleDTO } from "@/lib/queries";
import { formatDateTime } from "@/lib/utils";
import { Badge } from "./ui/badge";
import { BookmarkButton } from "./bookmark-button";
import { Labels, NewsCard, Thumb } from "./news-card";

/** One featured lead followed by a responsive grid; single column on mobile. */
export function FeedSection({ id, title, subtitle, items }: { id: string; title: string; subtitle: string; items: ArticleDTO[] }) {
  if (!items.length) return null;
  const [lead, ...rest] = items;
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="mt-16 sm:mt-20">
      <div className="section-rule items-baseline justify-between">
        <div><p className="eyebrow">The briefing</p><h2 id={`${id}-h`} className="mt-1 text-3xl font-bold sm:text-4xl">{title}</h2></div>
        <p className="hidden text-sm text-muted-foreground sm:block">{subtitle}</p>
      </div>
      <article className="group mt-6 grid overflow-hidden rounded-sm border bg-card shadow-sm md:grid-cols-5">
        <Link href={`/article/${lead.id}`} className="block min-h-64 md:col-span-3" aria-label={lead.headline}>
          <Thumb a={lead} className="h-full min-h-64" priority />
        </Link>
        <div className="flex flex-col gap-3 p-5 sm:p-7 md:col-span-2">
          <div className="flex flex-wrap items-center gap-2 text-xs"><span className="font-serif text-2xl font-black leading-none text-accent">01</span><Badge>{lead.category.name}</Badge><Labels a={lead} /></div>
          <h3 className="font-serif text-3xl font-bold leading-[1.05] tracking-tight"><Link href={`/article/${lead.id}`} className="editorial-link">{lead.headline}</Link></h3>
          <p className="text-sm leading-relaxed text-muted-foreground">{lead.summary}</p>
          <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">{lead.publisher.name}</span> · {formatDateTime(lead.publishedAt)} · {lead.readMinutes} min read</p>
          <div className="mt-auto flex items-center justify-between border-t pt-3">
            <a href={lead.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline">Original <ArrowUpRight className="h-3.5 w-3.5" /></a>
            <BookmarkButton articleId={lead.id} initial={lead.bookmarked} />
          </div>
        </div>
      </article>
      <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {rest.map((a, i) => <NewsCard key={a.id} a={a} rank={i + 2} />)}
      </div>
    </section>
  );
}
