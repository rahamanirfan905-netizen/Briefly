import type { NewsProvider, RawArticle } from "../types.ts";
import { getJson } from "./http.ts";

interface NewsApiResponse {
  status: string;
  message?: string;
  articles?: {
    source: { name: string };
    author?: string;
    title: string;
    description?: string;
    content?: string;
    url: string;
    urlToImage?: string;
    publishedAt: string;
  }[];
}

export const newsApiProvider: NewsProvider = {
  key: "newsapi",
  name: "NewsAPI.org",
  type: "API",
  isConfigured: () => Boolean(process.env.NEWSAPI_KEY),
  async fetch() {
    const key = process.env.NEWSAPI_KEY!;
    const jobs: { country: string; region: "INDIA" | "WORLD"; category?: string }[] = [
      { country: "in", region: "INDIA" },
      { country: "in", region: "INDIA", category: "business" },
      { country: "in", region: "INDIA", category: "technology" },
      { country: "us", region: "WORLD" },
      { country: "gb", region: "WORLD" },
    ];
    const out: RawArticle[] = [];
    let firstError: string | null = null;
    for (const j of jobs) {
      try {
        const u = new URL("https://newsapi.org/v2/top-headlines");
        u.searchParams.set("country", j.country);
        if (j.category) u.searchParams.set("category", j.category);
        u.searchParams.set("pageSize", "30");
        const data = await getJson<NewsApiResponse>(u.toString(), { headers: { "X-Api-Key": key } });
        if (data.status !== "ok") throw new Error(data.message ?? "NewsAPI error");
        for (const a of data.articles ?? []) {
          if (!a.title || a.title === "[Removed]") continue;
          out.push({
            headline: a.title,
            description: a.description,
            content: a.content,
            url: a.url,
            imageUrl: a.urlToImage,
            author: a.author,
            publishedAt: new Date(a.publishedAt),
            publisherName: a.source.name,
            region: j.region,
            country: j.country.toUpperCase(),
            categoryHint: j.category,
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
