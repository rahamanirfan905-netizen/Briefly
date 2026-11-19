import Link from "next/link";
import { Bookmark } from "lucide-react";
import { getUser } from "@/lib/auth";
import { ThemeToggle } from "./theme-toggle";
import { NavSearch } from "./nav-search";
import { UserMenu } from "./user-menu";
import { NavLinks } from "./nav-links";

export async function Navbar() {
  const user = await getUser().catch(() => null);
  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="container flex h-14 items-center gap-3">
        <Link href="/" className="font-serif text-2xl font-bold tracking-tight" aria-label="Briefly home">
          Briefly<span className="text-accent">.</span>
        </Link>
        <NavLinks />
        <div className="ml-auto flex items-center gap-1">
          <NavSearch />
          <Link href="/bookmarks" aria-label="Bookmarks" className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted">
            <Bookmark className="h-4 w-4" />
          </Link>
          <ThemeToggle />
          <UserMenu user={user} />
        </div>
      </div>
    </header>
  );
}
