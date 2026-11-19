import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { ArticleDTO } from "@/lib/queries";
import { formatDateTime } from "@/lib/utils";
import { Badge } from "./ui/badge";
import { BookmarkButton } from "./bookmark-button";
import { Labels, NewsCard } from "./news-card";

/** One featured lead followed by a responsive grid; single column on mobile. */
export function FeedSection({ id, title, subtitle, items }: { id: string; title: string; subtitle: string; items: ArticleDTO[] }) {
  if (!items.length) return null;
  const [lead, ...rest] = items;
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="mt-12">
      <div className="section-rule items-baseline justify-between">
        <h2 id={`${id}-h`} className="text-2xl font-bold">{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <article className="group mt-5 grid gap-5 overflow-hidden rounded-lg border bg-card md:grid-cols-5">
        <Link href={`/article/${lead.id}`} className="relative block min-h-56 bg-muted md:col-span-3" aria-label={lead.headline}>
          {lead.imageUrl && <Image src={lead.imageUrl} alt="" fill sizes="(min-width:768px) 60vw, 100vw" className="object-cover" />}
        </Link>
        <div className="flex flex-col gap-3 p-5 md:col-span-2">
          <div className="flex flex-wrap items-center gap-2 text-xs"><span className="font-serif text-lg font-bold">1</span><Badge>{lead.category.name}</Badge><Labels a={lead} /></div>
          <h3 className="text-2xl font-bold leading-tight"><Link href={`/article/${lead.id}`} className="hover:underline">{lead.headline}</Link></h3>
          <p className="text-sm leading-relaxed text-muted-foreground">{lead.summary}</p>
          <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">{lead.publisher.name}</span> · {formatDateTime(lead.publishedAt)} · {lead.readMinutes} min read</p>
          <div className="mt-auto flex items-center justify-between border-t pt-3">
            <a href={lead.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline">Read full article <ArrowUpRight className="h-3.5 w-3.5" /></a>
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
