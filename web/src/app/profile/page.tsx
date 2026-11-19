import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";
import { PreferencesForm } from "@/components/preferences-form";
import { ClearHistoryButton } from "@/components/clear-history-button";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await getUser().catch(() => null);
  if (!user) redirect("/login?next=/profile");
  const [prefs, categories, history] = await Promise.all([
    db.userPreference.findUnique({ where: { userId: user.id } }),
    db.category.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, select: { slug: true, name: true } }),
    db.readingHistory.findMany({
      where: { userId: user.id }, orderBy: { readAt: "desc" }, take: 30,
      select: { readAt: true, article: { select: { id: true, headline: true, publisher: { select: { name: true } } } } },
    }),
  ]);

  return (
    <div className="container max-w-3xl py-8">
      <h1 className="text-4xl font-bold">Your profile</h1>
      <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>

      <section className="mt-8" aria-labelledby="pref-h">
        <h2 id="pref-h" className="section-rule text-2xl font-bold">News preferences</h2>
        <p className="mt-2 text-sm text-muted-foreground">Pick the topics you care about. They power the “For you” section on the home page.</p>
        <PreferencesForm name={user.name ?? ""} categories={categories} selected={prefs?.categories ?? []} region={(prefs?.region as "INDIA" | "WORLD" | "BOTH") ?? "BOTH"} />
      </section>

      <section className="mt-12" id="history" aria-labelledby="hist-h">
        <div className="section-rule items-baseline justify-between">
          <h2 id="hist-h" className="text-2xl font-bold">Reading history</h2>
          {history.length > 0 && <ClearHistoryButton />}
        </div>
        {history.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Stories you open will appear here. <Link href="/" className="text-accent hover:underline">Start reading</Link></p>
        ) : (
          <ul className="mt-4 divide-y rounded-lg border bg-card">
            {history.map((h) => (
              <li key={h.article.id} className="flex items-baseline justify-between gap-4 p-3">
                <Link href={`/article/${h.article.id}`} className="font-medium hover:underline">{h.article.headline}</Link>
                <span className="shrink-0 text-xs text-muted-foreground">{h.article.publisher.name} · {formatDateTime(h.readAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
