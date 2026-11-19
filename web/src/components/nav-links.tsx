"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const MAIN = [
  { href: "/", label: "Home" },
  { href: "/category/india", label: "India" },
  { href: "/category/world", label: "World" },
  { href: "/category/business", label: "Business" },
  { href: "/category/technology", label: "Technology" },
  { href: "/category/politics", label: "Politics" },
  { href: "/category/science", label: "Science" },
  { href: "/category/sports", label: "Sports" },
  { href: "/category/entertainment", label: "Entertainment" },
];
const MORE = [
  { href: "/category/defence", label: "Defence & Security" },
  { href: "/category/health", label: "Health" },
  { href: "/category/education", label: "Education" },
  { href: "/category/environment", label: "Environment" },
];

export function NavLinks() {
  const path = usePathname();
  const link = (l: { href: string; label: string }) => (
    <Link
      key={l.href}
      href={l.href}
      aria-current={path === l.href ? "page" : undefined}
      className={cn("whitespace-nowrap rounded px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground", path === l.href && "font-semibold text-foreground")}
    >
      {l.label}
    </Link>
  );
  return (
    <nav aria-label="Sections" className="ml-2 flex min-w-0 flex-1 items-center overflow-x-auto [scrollbar-width:none]">
      {MAIN.map(link)}
      <details className="relative">
        <summary className="cursor-pointer list-none whitespace-nowrap rounded px-2.5 py-1.5 text-sm text-muted-foreground hover:text-foreground">More ▾</summary>
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[11rem] rounded-md border bg-card p-1 shadow-lg">
          {MORE.map((l) => (
            <Link key={l.href} href={l.href} className="block rounded px-3 py-2 text-sm hover:bg-muted">
              {l.label}
            </Link>
          ))}
        </div>
      </details>
    </nav>
  );
}
