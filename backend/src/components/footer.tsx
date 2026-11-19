import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-16 border-t">
      <div className="container flex flex-col gap-2 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>
          <span className="font-serif font-semibold text-foreground">Briefly</span> · Stay Informed. Stay Ahead. Briefly.
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
