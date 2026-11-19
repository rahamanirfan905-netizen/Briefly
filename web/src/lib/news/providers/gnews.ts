import type { NewsProvider, RawArticle } from "../types.ts";
import { getJson } from "./http.ts";

interface GNewsResponse {
  articles?: {
    title: string;
    description?: string;
    content?: string;
    url: string;
    image?: string;
    publishedAt: string;
    source: { name: string; url?: string };
  }[];
}

const TOPICS = ["general", "nation", "business", "technology", "science", "sports", "entertainment", "health"];

export const gnewsProvider: NewsProvider = {
  key: "gnews",
  name: "GNews API",
  type: "API",
  isConfigured: () => Boolean(process.env.GNEWS_API_KEY),
  async fetch() {
    const apikey = process.env.GNEWS_API_KEY!;
    const out: RawArticle[] = [];
    // Free-tier friendly: a handful of requests per refresh (India top + world top + a few topics).
    const jobs: { country: "in" | "us"; region: "INDIA" | "WORLD"; topic: string }[] = [
      { country: "in", region: "INDIA", topic: "general" },
      { country: "in", region: "INDIA", topic: "nation" },
      { country: "in", region: "INDIA", topic: "business" },
      { country: "us", region: "WORLD", topic: "world" },
      { country: "us", region: "WORLD", topic: "general" },
    ];
    for (const t of TOPICS.slice(3, 6)) jobs.push({ country: "in", region: "INDIA", topic: t });

    const errors: string[] = [];
    for (const j of jobs) {
      try {
        const u = new URL("https://gnews.io/api/v4/top-headlines");
        u.searchParams.set("category", j.topic);
        u.searchParams.set("lang", "en");
        // World stories come from the worldwide index; India uses the Indian edition.
        if (j.region === "INDIA") u.searchParams.set("country", "in");
        u.searchParams.set("max", "25");
        u.searchParams.set("apikey", apikey);
        const data = await getJson<GNewsResponse>(u.toString());
        for (const a of data.articles ?? []) {
          out.push({
            headline: a.title,
            description: a.description,
            content: a.content,
            url: a.url,
            imageUrl: a.image,
            publishedAt: new Date(a.publishedAt),
            publisherName: a.source.name,
            publisherDomain: a.source.url ? safeHost(a.source.url) : null,
            region: j.region,
            country: j.region === "INDIA" ? "IN" : null,
            categoryHint: ["business", "technology", "science", "sports", "entertainment", "health"].includes(j.topic) ? j.topic : null,
          });
        }
      } catch (e) {
        errors.push((e as Error).message);
      }
    }
    if (!out.length && errors.length) throw new Error(errors[0]);
    return out;
  },
};

function safeHost(u: string): string | null {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}
