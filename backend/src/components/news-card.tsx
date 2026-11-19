import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Clock } from "lucide-react";
import type { ArticleDTO } from "@/lib/queries";
import { formatDateTime } from "@/lib/utils";
import { Badge } from "./ui/badge";
import { BookmarkButton } from "./bookmark-button";
import { cn } from "@/lib/utils";

export function Labels({ a }: { a: ArticleDTO }) {
  return (
    <>
      {a.isBreaking && <Badge variant="breaking">Breaking</Badge>}
      {!a.isBreaking && a.isTrending && <Badge variant="trending">Trending</Badge>}
    </>
  );
}

/** Real photo when the publisher supplied one; otherwise a plain typographic block, never a stock image. */
export function Thumb({ a, className, priority }: { a: ArticleDTO; className?: string; priority?: boolean }) {
  return (
    <div className={cn("relative overflow-hidden bg-muted", className)}>
      {a.imageUrl ? (
        <Image src={a.imageUrl} alt="" fill sizes="(min-width:1024px) 33vw, 100vw" priority={priority} loading={priority ? undefined : "lazy"} className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
      ) : (
        <div className="flex h-full items-end p-3">
          <span className="font-serif text-sm font-semibold uppercase tracking-widest text-muted-foreground/70">{a.publisher.name}</span>
        </div>
      )}
    </div>
  );
}

export function NewsCard({ a, rank, userAware = true }: { a: ArticleDTO; rank?: number; userAware?: boolean }) {
  return (
    <article className="group relative flex animate-fade-up flex-col overflow-hidden rounded-lg border bg-card transition-shadow hover:shadow-md">
      <Link href={`/article/${a.id}`} className="block" aria-label={a.headline}>
        <Thumb a={a} className="aspect-[16/9]" />
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {rank && <span className="font-serif text-base font-bold text-foreground">{rank}</span>}
          <Badge>{a.category.name}</Badge>
          <Labels a={a} />
        </div>
        <h3 className="text-lg font-semibold leading-snug">
          <Link href={`/article/${a.id}`} className="hover:underline">{a.headline}</Link>
        </h3>
        <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">{a.summary}</p>
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{a.publisher.name}</span>
          <time dateTime={a.publishedAt}>{formatDateTime(a.publishedAt)}</time>
          <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{a.readMinutes} min read</span>
        </div>
        <div className="flex items-center justify-between border-t pt-3">
          <a href={a.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline">
            Read full article <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
          {userAware && <BookmarkButton articleId={a.id} initial={a.bookmarked} />}
        </div>
      </div>
    </article>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-dashed p-10 text-center">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

export function Pagination({ page, totalPages, hrefFor }: { page: number; totalPages: number; hrefFor: (p: number) => string }) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label="Pagination" className="mt-8 flex items-center justify-between text-sm">
      {page > 1 ? <Link className="rounded-md border px-4 py-2 hover:bg-muted" href={hrefFor(page - 1)}>← Newer</Link> : <span />}
      <span className="text-muted-foreground">Page {page} of {totalPages}</span>
      {page < totalPages ? <Link className="rounded-md border px-4 py-2 hover:bg-muted" href={hrefFor(page + 1)}>Older →</Link> : <span />}
    </nav>
  );
}
