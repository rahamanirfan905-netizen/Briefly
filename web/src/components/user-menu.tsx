"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User } from "lucide-react";
import type { SessionUser } from "@/lib/auth";

export function UserMenu({ user }: { user: SessionUser | null }) {
  const router = useRouter();
  if (!user) {
    return (
      <Link href="/login" className="ml-1 inline-flex h-9 items-center rounded-md bg-foreground px-3 text-sm font-medium text-background hover:bg-foreground/85">
        Sign in
      </Link>
    );
  }
  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };
  return (
    <details className="relative">
      <summary aria-label="Account menu" className="inline-flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-full bg-muted hover:bg-border">
        <User className="h-4 w-4" />
      </summary>
      <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-md border bg-card p-1 text-sm shadow-lg">
        <p className="truncate px-3 py-2 text-xs text-muted-foreground">{user.name ?? user.email}</p>
        <Link href="/profile" className="block rounded px-3 py-2 hover:bg-muted">Profile &amp; preferences</Link>
        <Link href="/bookmarks" className="block rounded px-3 py-2 hover:bg-muted">Bookmarks</Link>
        {user.role === "ADMIN" && <Link href="/admin" className="block rounded px-3 py-2 hover:bg-muted">Admin dashboard</Link>}
        <button onClick={logout} className="block w-full rounded px-3 py-2 text-left hover:bg-muted">Sign out</button>
      </div>
    </details>
  );
}
