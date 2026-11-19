export default function Loading() {
  return (
    <div className="container py-10" role="status" aria-label="Loading">
      <div className="mx-auto h-14 w-64 animate-pulse rounded bg-muted" />
      <div className="mt-8 h-80 animate-pulse rounded-xl bg-muted" />
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-72 animate-pulse rounded-lg bg-muted" />)}
      </div>
    </div>
  );
}
