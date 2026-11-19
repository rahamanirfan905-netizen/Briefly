"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

export function PreferencesForm({ name: initialName, categories, selected, region: initialRegion }: { name: string; categories: { slug: string; name: string }[]; selected: string[]; region: "INDIA" | "WORLD" | "BOTH" }) {
  const router = useRouter();
  const [picked, setPicked] = useState(new Set(selected));
  const [region, setRegion] = useState(initialRegion);
  const [name, setName] = useState(initialName);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const toggle = (slug: string) =>
    setPicked((s) => {
      const n = new Set(s);
      n.has(slug) ? n.delete(slug) : n.add(slug);
      return n;
    });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setState("saving");
    const res = await fetch("/api/preferences", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ categories: [...picked], region, ...(name.trim() ? { name: name.trim() } : {}) }),
    }).catch(() => null);
    if (res?.ok) {
      setState("saved");
      router.refresh();
    } else setState("error");
  }

  return (
    <form onSubmit={save} className="mt-4 space-y-5">
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Display name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} className="h-10 w-full rounded-md border bg-card px-3 sm:w-72" />
      </label>
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Topics</legend>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button type="button" key={c.slug} aria-pressed={picked.has(c.slug)} onClick={() => toggle(c.slug)}
              className={cn("rounded-full border px-3 py-1.5 text-sm transition-colors", picked.has(c.slug) ? "border-foreground bg-foreground text-background" : "hover:bg-muted")}>
              {c.name}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Edition</legend>
        <div className="flex gap-4 text-sm">
          {(["BOTH", "INDIA", "WORLD"] as const).map((r) => (
            <label key={r} className="flex items-center gap-2">
              <input type="radio" name="region" checked={region === r} onChange={() => setRegion(r)} />
              {r === "BOTH" ? "India + World" : r === "INDIA" ? "India only" : "World only"}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={state === "saving"}>{state === "saving" ? "Saving…" : "Save preferences"}</Button>
        <span role="status" className="text-sm text-muted-foreground">{state === "saved" && "Saved."}{state === "error" && "Could not save. Try again."}</span>
      </div>
    </form>
  );
}
