import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { toDTO } from "@/lib/queries";
import { EmptyState, NewsCard } from "@/components/news-card";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Bookmarks" };

export default async function BookmarksPage() {
  const user = await getUser().catch(() => null);
  if (!user) redirect("/login?next=/bookmarks");

  const rows = await db.bookmark.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      article: {
        select: {
          id: true, headline: true, summary: true, summaryBy: true, imageUrl: true, url: true, author: true, publishedAt: true,
          region: true, country: true, score: true, isBreaking: true, isTrending: true, readMinutes: true, clusterSize: true,
          category: { select: { slug: true, name: true } }, publisher: { select: { id: true, name: true, domain: true } },
        },
      },
    },
  });

  return (
    <div className="container py-8">
      <div className="section-rule items-baseline justify-between">
        <h1 className="text-4xl font-bold">Your bookmarks</h1>
        <p className="text-sm text-muted-foreground">Saved to your account, so they follow you across devices</p>
      </div>
      <div className="mt-6">
        {rows.length === 0 ? (
          <EmptyState title="No bookmarks yet" body="Tap the bookmark icon on any story to save it here." />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{rows.map((r) => <NewsCard key={r.article.id} a={toDTO(r.article, true)} />)}</div>
        )}
      </div>
      <p className="mt-8 text-sm text-muted-foreground">Looking for what you read? See your <Link href="/profile#history" className="text-accent hover:underline">reading history</Link>.</p>
    </div>
  );
}
