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
        <div className="flex h-full flex-col justify-between bg-[linear-gradient(135deg,hsl(var(--muted)),hsl(var(--background)))] p-4">
          <span className="eyebrow">Briefly / {a.category.name}</span>
          <span className="font-serif text-lg font-bold leading-tight text-foreground/80">{a.publisher.name}</span>
        </div>
      )}
    </div>
  );
}

export function NewsCard({ a, rank, userAware = true }: { a: ArticleDTO; rank?: number; userAware?: boolean }) {
  return (
    <article className="group relative flex min-w-0 animate-fade-up flex-col overflow-hidden rounded-sm border bg-card transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      <Link href={`/article/${a.id}`} className="block" aria-label={a.headline}>
        <Thumb a={a} className="aspect-[16/9]" />
      </Link>
      <div className="flex flex-1 flex-col gap-2.5 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {rank && <span className="font-serif text-xl font-black leading-none text-accent">{String(rank).padStart(2, "0")}</span>}
          <Badge>{a.category.name}</Badge>
          <Labels a={a} />
        </div>
        <h3 className="font-serif text-xl font-bold leading-[1.12] tracking-tight">
          <Link href={`/article/${a.id}`} className="editorial-link">{a.headline}</Link>
        </h3>
        <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">{a.summary}</p>
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{a.publisher.name}</span>
          <time dateTime={a.publishedAt}>{formatDateTime(a.publishedAt)}</time>
          <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{a.readMinutes} min read</span>
        </div>
        <div className="flex items-center justify-between border-t pt-3">
          <a href={a.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline">
            Original <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
          {userAware && <BookmarkButton articleId={a.id} initial={a.bookmarked} />}
        </div>
      </div>
    </article>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-sm border border-dashed border-accent/40 bg-card/60 p-10 text-center">
      <p className="eyebrow">Briefly</p>
      <h2 className="mt-2 font-serif text-2xl font-bold">{title}</h2>
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
