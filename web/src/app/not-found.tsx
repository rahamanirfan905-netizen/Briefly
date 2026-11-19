import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container py-24 text-center">
      <p className="font-serif text-6xl font-black">404</p>
      <h1 className="mt-4 text-2xl font-bold">We couldn’t find that page</h1>
      <p className="mt-2 text-muted-foreground">The story may have aged out of the feed or the link is wrong.</p>
      <Link href="/" className="mt-6 inline-block text-accent hover:underline">Back to the briefing</Link>
    </div>
  );
}
