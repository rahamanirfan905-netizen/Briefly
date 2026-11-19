"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "./ui/button";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // only same-site relative paths, to avoid open redirects
  const raw = params.get("next") ?? "/";
  const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const f = new FormData(e.currentTarget);
    const body = Object.fromEntries(f.entries());
    const res = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    if (res?.ok) {
      router.push(next);
      router.refresh();
      return;
    }
    const data = await res?.json().catch(() => null);
    setError(data?.error ?? "Could not reach the server. Please try again.");
    setBusy(false);
  }

  const input = "h-10 w-full rounded-md border bg-card px-3 text-sm";
  return (
    <div className="mx-auto max-w-sm py-16">
      <h1 className="text-3xl font-bold">{mode === "login" ? "Sign in" : "Create your account"}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{mode === "login" ? "Welcome back to Briefly." : "Save stories and personalise your briefing."}</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        {mode === "signup" && (
          <label className="block text-sm"><span className="mb-1 block font-medium">Name</span><input name="name" autoComplete="name" maxLength={80} className={input} /></label>
        )}
        <label className="block text-sm"><span className="mb-1 block font-medium">Email</span><input name="email" type="email" required autoComplete="email" className={input} /></label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Password</span>
          <input name="password" type="password" required minLength={mode === "signup" ? 10 : 1} autoComplete={mode === "login" ? "current-password" : "new-password"} className={input} />
          {mode === "signup" && <span className="mt-1 block text-xs text-muted-foreground">At least 10 characters.</span>}
        </label>
        {error && <p role="alert" className="rounded-md border border-accent/40 bg-muted px-3 py-2 text-sm">{error}</p>}
        <Button type="submit" className="w-full" disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}</Button>
      </form>
      <p className="mt-4 text-sm text-muted-foreground">
        {mode === "login" ? <>New here? <Link className="text-accent hover:underline" href="/signup">Create an account</Link></> : <>Already registered? <Link className="text-accent hover:underline" href="/login">Sign in</Link></>}
      </p>
    </div>
  );
}
