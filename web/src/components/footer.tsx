import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-foreground/20">
      <div className="container flex flex-col gap-4 py-10 text-sm text-muted-foreground sm:flex-row sm:items-start sm:justify-between">
        <p>
          <span className="font-serif text-lg font-bold text-foreground">briefly<span className="text-accent">.</span></span><br />The daily briefing, considered.
        </p>
        <p className="max-w-xl">
          Briefly summarises and links to stories from independent publishers. Every card credits and links to the original article;
          summaries are built from the publisher&apos;s own description and are not quotations.
        </p>
        <Link href="/search" className="hover:text-foreground">Search</Link>
      </div>
    </footer>
  );
}
