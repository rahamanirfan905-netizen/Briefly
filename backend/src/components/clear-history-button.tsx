"use client";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";

export function ClearHistoryButton() {
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={async () => {
        if (!confirm("Clear your entire reading history?")) return;
        await fetch("/api/history", { method: "DELETE" });
        router.refresh();
      }}
    >
      Clear history
    </Button>
  );
}
