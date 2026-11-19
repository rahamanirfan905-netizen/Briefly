import type { NewsProvider, RawArticle } from "../types.ts";
import { getJson } from "./http.ts";

interface GuardianResponse {
  response?: {
    results?: {
      webTitle: string;
      webUrl: string;
      webPublicationDate: string;
      sectionId: string;
      fields?: { trailText?: string; thumbnail?: string; byline?: string; bodyText?: string };
    }[];
  };
}

export const guardianProvider: NewsProvider = {
  key: "guardian",
  name: "The Guardian Open Platform",
  type: "API",
  isConfigured: () => Boolean(process.env.GUARDIAN_API_KEY),
  async fetch() {
    const key = process.env.GUARDIAN_API_KEY!;
    const queries: { q?: string; section?: string; region: "INDIA" | "WORLD" }[] = [
      { section: "world", region: "WORLD" },
      { section: "business", region: "WORLD" },
      { section: "technology", region: "WORLD" },
      { section: "science", region: "WORLD" },
      { section: "environment", region: "WORLD" },
      { q: "India", region: "INDIA" },
    ];
    const out: RawArticle[] = [];
    let firstError: string | null = null;
    for (const qy of queries) {
      try {
        const u = new URL("https://content.guardianapis.com/search");
        if (qy.q) u.searchParams.set("q", qy.q);
        if (qy.section) u.searchParams.set("section", qy.section);
        u.searchParams.set("order-by", "newest");
        u.searchParams.set("page-size", "30");
        u.searchParams.set("show-fields", "trailText,thumbnail,byline");
        u.searchParams.set("api-key", key);
        const data = await getJson<GuardianResponse>(u.toString());
        for (const r of data.response?.results ?? []) {
          out.push({
            headline: r.webTitle,
            description: r.fields?.trailText,
            url: r.webUrl,
            imageUrl: r.fields?.thumbnail,
            author: r.fields?.byline,
            publishedAt: new Date(r.webPublicationDate),
            publisherName: "The Guardian",
            publisherDomain: "theguardian.com",
            region: qy.region,
            country: qy.region === "INDIA" ? "IN" : "GB",
            categoryHint: r.sectionId,
          });
        }
      } catch (e) {
        firstError ??= (e as Error).message;
      }
    }
    if (!out.length && firstError) throw new Error(firstError);
    return out;
  },
};
