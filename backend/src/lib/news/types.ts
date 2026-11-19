export type RegionKey = "INDIA" | "WORLD";

/** What every provider must return. Providers know nothing about the database. */
export interface RawArticle {
  headline: string;
  description?: string | null;
  content?: string | null;
  url: string;
  imageUrl?: string | null;
  author?: string | null;
  publishedAt: Date;
  publisherName: string;
  publisherDomain?: string | null;
  region: RegionKey;
  country?: string | null;
  /** Category hint from the provider (e.g. Guardian section); optional. */
  categoryHint?: string | null;
}

export interface NewsProvider {
  /** Stable key stored in NewsSource.key */
  key: string;
  name: string;
  type: "API" | "RSS";
  /** True when the provider has the credentials it needs. */
  isConfigured(): boolean;
  fetch(): Promise<RawArticle[]>;
}

export interface ProcessedArticle extends RawArticle {
  categorySlug: string;
  summary: string;
  summaryBy: "extractive" | "ai";
  readMinutes: number;
  titleTokens: string[];
}
