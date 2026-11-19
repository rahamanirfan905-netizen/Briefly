import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getUser } from "@/lib/auth";
import { getCategoryFeed } from "@/lib/queries";
import { EmptyState, NewsCard, Pagination } from "@/components/news-card";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: slug.charAt(0).toUpperCase() + slug.slice(1) };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  if (!/^[a-z-]{2,30}$/.test(slug)) notFound();
  const page = Math.min(50, Math.max(1, Number((await searchParams).page) || 1));
  const user = await getUser().catch(() => null);
  const feed = await getCategoryFeed(slug, page, 18, user?.id);
  if (!feed.category || !(feed.category as { active: boolean }).active) notFound();

  return (
    <div className="container py-8">
      <div className="section-rule items-baseline justify-between">
        <h1 className="text-4xl font-bold">{feed.category.name}</h1>
        <p className="text-sm text-muted-foreground">{feed.total} stories, ranked by importance and recency</p>
      </div>
      <div className="mt-6">
        {feed.items.length === 0 ? (
          <EmptyState title="Nothing here yet" body="No recent stories were classified under this topic. Check back after the next refresh." />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {feed.items.map((a, i) => <NewsCard key={a.id} a={a} rank={(page - 1) * 18 + i + 1} />)}
          </div>
        )}
      </div>
      <Pagination page={page} totalPages={feed.totalPages} hrefFor={(p) => `/category/${slug}?page=${p}`} />
    </div>
  );
}
