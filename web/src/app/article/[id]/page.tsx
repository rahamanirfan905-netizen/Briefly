import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowUpRight, Clock } from "lucide-react";
import { getUser } from "@/lib/auth";
import { getArticle } from "@/lib/queries";
import { formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { BookmarkButton } from "@/components/bookmark-button";
import { ShareButton } from "@/components/share-button";
import { Labels, NewsCard } from "@/components/news-card";
import { ReadTracker } from "@/components/read-tracker";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  if (!/^[a-z0-9]{10,40}$/i.test(id)) return { title: "Story not found" };
  const data = await getArticle(id);
  if (!data) return { title: "Story not found" };
  return { title: data.article.headline, description: data.article.summary.slice(0, 200), openGraph: { title: data.article.headline, images: data.article.imageUrl ? [data.article.imageUrl] : undefined } };
}

export default async function ArticlePage({ params }: Props) {
  const { id } = await params;
  if (!/^[a-z0-9]{10,40}$/i.test(id)) notFound();
  const user = await getUser().catch(() => null);
  const data = await getArticle(id, user?.id);
  if (!data) notFound();
  const { article: a, coverage, more } = data;

  // Facts come only from stored metadata, never from inference.
  const facts: [string, string][] = [
    ["Reported by", a.publisher.name],
    ["Published", `${formatDateTime(a.publishedAt)} IST`],
    ["Section", a.category.name],
    ["Edition", a.region === "INDIA" ? "India" : "World"],
    ...(a.country ? ([["Country of source", a.country]] as [string, string][]) : []),
    ["Coverage", a.clusterSize > 1 ? `${a.clusterSize} articles on this event in our feed` : "Single report in our feed"],
  ];

  return (
    <article className="container max-w-4xl py-8">
      <ReadTracker articleId={a.id} />
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Home</Link> / <Link href={`/category/${a.category.slug}`} className="hover:text-foreground">{a.category.name}</Link>
      </nav>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs"><Badge>{a.category.name}</Badge><Labels a={a} /></div>
      <h1 className="mt-3 text-3xl font-bold leading-tight sm:text-5xl">{a.headline}</h1>
      <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{a.publisher.name}</span>
        {a.author && <span>By {a.author}</span>}
        <time dateTime={a.publishedAt}>{formatDateTime(a.publishedAt)} IST</time>
        <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{a.readMinutes} min read (original)</span>
      </p>

      {a.imageUrl && (
        <div className="relative mt-6 aspect-[16/9] overflow-hidden rounded-lg bg-muted">
          <Image src={a.imageUrl} alt="" fill priority sizes="(min-width:1024px) 896px, 100vw" className="object-cover" />
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <a href={a.url} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-md bg-accent px-5 text-sm font-medium text-accent-foreground hover:opacity-90">
          Read the original on {a.publisher.name} <ArrowUpRight className="h-4 w-4" />
        </a>
        <BookmarkButton articleId={a.id} initial={a.bookmarked} label className="border" />
        <ShareButton title={a.headline} path={`/article/${a.id}`} />
      </div>

      <section aria-labelledby="sum-h" className="mt-10">
        <h2 id="sum-h" className="section-rule text-2xl font-bold">Summary</h2>
        <p className="mt-4 text-lg leading-relaxed">{a.summary}</p>
        <p className="mt-3 text-xs text-muted-foreground">
          {a.summaryBy === "ai"
            ? "AI-written summary based only on the publisher’s own headline and description. It is not a quotation."
            : "Taken from the publisher’s own description of the story. It is not a quotation."}{" "}
          Briefly does not reproduce full articles; the complete story is at the original publisher.
        </p>
      </section>

      <section aria-labelledby="facts-h" className="mt-10">
        <h2 id="facts-h" className="section-rule text-2xl font-bold">Key facts</h2>
        <dl className="mt-4 grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2">
          {facts.map(([k, v]) => (
            <div key={k} className="bg-card p-3">
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">{k}</dt>
              <dd className="mt-0.5 text-sm font-medium">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      {coverage.length > 0 && (
        <section aria-labelledby="cov-h" className="mt-10">
          <h2 id="cov-h" className="section-rule text-2xl font-bold">Related coverage</h2>
          <p className="mt-2 text-sm text-muted-foreground">The same event as reported by other publishers.</p>
          <ul className="mt-4 divide-y rounded-lg border bg-card">
            {coverage.map((c) => (
              <li key={c.id} className="flex items-start justify-between gap-4 p-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{c.publisher.name} · {formatDateTime(c.publishedAt)}</p>
                  <Link href={`/article/${c.id}`} className="mt-1 block font-semibold hover:underline">{c.headline}</Link>
                </div>
                <a href={c.url} target="_blank" rel="noopener noreferrer" aria-label={`Open on ${c.publisher.name}`} className="shrink-0 text-accent"><ArrowUpRight className="h-4 w-4" /></a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {more.length > 0 && (
        <section aria-labelledby="more-h" className="mt-12">
          <h2 id="more-h" className="section-rule text-2xl font-bold">More in {a.category.name}</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">{more.map((m) => <NewsCard key={m.id} a={m} userAware={false} />)}</div>
        </section>
      )}
    </article>
  );
}
