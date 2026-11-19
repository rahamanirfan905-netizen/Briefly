"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Optimistic toggle backed by /api/bookmarks. Guests are sent to sign in
 * (bookmarks live in the account so they follow the user across devices).
 */
export function BookmarkButton({ articleId, initial, label = false, className }: { articleId: string; initial?: boolean; label?: boolean; className?: string }) {
  const router = useRouter();
  const [on, setOn] = useState(Boolean(initial));
  const [busy, setBusy] = useState(false);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    const next = !on;
    setOn(next);
    try {
      const res = await fetch("/api/bookmarks", {
        method: next ? "POST" : "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ articleId }),
      });
      if (res.status === 401) {
        setOn(!next);
        router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      } else if (!res.ok) {
        setOn(!next);
      } else {
        router.refresh();
      }
    } catch {
      setOn(!next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={toggle}
      aria-pressed={on}
      aria-label={on ? "Remove bookmark" : "Bookmark this story"}
      className={cn("inline-flex items-center gap-1.5 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground", on && "text-accent", className)}
    >
      <Bookmark className={cn("h-4 w-4", on && "fill-current")} />
      {label && <span className="text-sm">{on ? "Saved" : "Save"}</span>}
    </button>
  );
}
