"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { Button } from "./ui/button";

interface Suggestions {
  categories: { slug: string; name: string }[];
  publishers: { name: string }[];
  headlines: { id: string; headline: string }[];
}

export function NavSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [s, setS] = useState<Suggestions | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  useEffect(() => {
    if (q.trim().length < 2) return setS(null);
    const ctl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(q.trim())}`, { signal: ctl.signal });
        if (res.ok) setS(await res.json());
      } catch {
        /* aborted or offline: suggestions are optional */
      }
    }, 200);
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [q]);

  const go = (url: string) => {
    setOpen(false);
    setS(null);
    router.push(url);
  };

  if (!open) {
    return (
      <Button variant="ghost" size="icon" aria-label="Search" onClick={() => setOpen(true)}>
        <Search className="h-4 w-4" />
      </Button>
    );
  }

  const has = s && (s.categories.length || s.publishers.length || s.headlines.length);
  return (
    <div className="fixed inset-x-0 top-0 z-50 border-b bg-background p-3 shadow-md sm:absolute sm:inset-auto sm:right-0 sm:top-0 sm:w-[28rem] sm:rounded-md sm:border">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim()) go(`/search?q=${encodeURIComponent(q.trim())}`);
        }}
        role="search"
        className="flex items-center gap-2"
      >
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          ref={input}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
          placeholder="Search headlines, topics, countries, publishers"
          aria-label="Search news"
          maxLength={100}
          className="h-9 flex-1 bg-transparent text-sm outline-none"
        />
        <Button type="button" variant="ghost" size="icon" aria-label="Close search" onClick={() => setOpen(false)}>
          <X className="h-4 w-4" />
        </Button>
      </form>
      {has && (
        <ul className="mt-2 max-h-80 overflow-auto border-t pt-2 text-sm">
          {s.categories.map((c) => (
            <li key={c.slug}>
              <button className="w-full rounded px-2 py-1.5 text-left hover:bg-muted" onClick={() => go(`/category/${c.slug}`)}>
                <span className="mr-2 text-xs uppercase text-muted-foreground">Topic</span>{c.name}
              </button>
            </li>
          ))}
          {s.publishers.map((p) => (
            <li key={p.name}>
              <button className="w-full rounded px-2 py-1.5 text-left hover:bg-muted" onClick={() => go(`/search?q=${encodeURIComponent(p.name)}`)}>
                <span className="mr-2 text-xs uppercase text-muted-foreground">Publisher</span>{p.name}
              </button>
            </li>
          ))}
          {s.headlines.map((h) => (
            <li key={h.id}>
              <button className="line-clamp-2 w-full rounded px-2 py-1.5 text-left hover:bg-muted" onClick={() => go(`/article/${h.id}`)}>
                {h.headline}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
