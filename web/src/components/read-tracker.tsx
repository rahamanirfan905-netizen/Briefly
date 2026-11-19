"use client";
import { useEffect } from "react";

/** Records the visit in the signed-in user's reading history (no-op for guests). */
export function ReadTracker({ articleId }: { articleId: string }) {
  useEffect(() => {
    fetch("/api/history", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ articleId }) }).catch(() => {});
  }, [articleId]);
  return null;
}
