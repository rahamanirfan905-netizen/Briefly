import type { RegionKey } from "./types.ts";

export interface FeedDef {
  key: string; // NewsSource.key suffix
  publisher: string;
  domain: string;
  url: string;
  region: RegionKey;
  country: string;
  credibility: number;
  categoryHint?: string;
}

/**
 * Publicly offered RSS feeds. Publishers occasionally move or retire feeds;
 * a dead feed is logged in the admin dashboard and does not affect the others.
 * Edit this list to add or remove publishers.
 */
export const FEEDS: FeedDef[] = [
  { key: "the-hindu-national", publisher: "The Hindu", domain: "thehindu.com", url: "https://www.thehindu.com/news/national/feeder/default.rss", region: "INDIA", country: "IN", credibility: 0.9 },
  { key: "the-hindu-business", publisher: "The Hindu", domain: "thehindu.com", url: "https://www.thehindu.com/business/feeder/default.rss", region: "INDIA", country: "IN", credibility: 0.9, categoryHint: "business" },
  { key: "indian-express", publisher: "The Indian Express", domain: "indianexpress.com", url: "https://indianexpress.com/section/india/feed/", region: "INDIA", country: "IN", credibility: 0.85 },
  { key: "ndtv", publisher: "NDTV", domain: "ndtv.com", url: "https://feeds.feedburner.com/ndtvnews-top-stories", region: "INDIA", country: "IN", credibility: 0.8 },
  { key: "toi-top", publisher: "The Times of India", domain: "timesofindia.indiatimes.com", url: "https://timesofindia.indiatimes.com/rssfeedstopstories.cms", region: "INDIA", country: "IN", credibility: 0.75 },
  { key: "hindustan-times", publisher: "Hindustan Times", domain: "hindustantimes.com", url: "https://www.hindustantimes.com/feeds/rss/india-news/rssfeed.xml", region: "INDIA", country: "IN", credibility: 0.78 },
  { key: "livemint", publisher: "Mint", domain: "livemint.com", url: "https://www.livemint.com/rss/news", region: "INDIA", country: "IN", credibility: 0.82, categoryHint: "business" },
  { key: "bbc-world", publisher: "BBC News", domain: "bbc.com", url: "https://feeds.bbci.co.uk/news/world/rss.xml", region: "WORLD", country: "GB", credibility: 0.92 },
  { key: "bbc-tech", publisher: "BBC News", domain: "bbc.com", url: "https://feeds.bbci.co.uk/news/technology/rss.xml", region: "WORLD", country: "GB", credibility: 0.92, categoryHint: "technology" },
  { key: "aljazeera", publisher: "Al Jazeera", domain: "aljazeera.com", url: "https://www.aljazeera.com/xml/rss/all.xml", region: "WORLD", country: "QA", credibility: 0.8 },
  { key: "guardian-world-rss", publisher: "The Guardian", domain: "theguardian.com", url: "https://www.theguardian.com/world/rss", region: "WORLD", country: "GB", credibility: 0.9 },
  { key: "dw", publisher: "DW", domain: "dw.com", url: "https://rss.dw.com/rdf/rss-en-all", region: "WORLD", country: "DE", credibility: 0.88 },
  { key: "npr", publisher: "NPR", domain: "npr.org", url: "https://feeds.npr.org/1001/rss.xml", region: "WORLD", country: "US", credibility: 0.88 },
  { key: "france24", publisher: "France 24", domain: "france24.com", url: "https://www.france24.com/en/rss", region: "WORLD", country: "FR", credibility: 0.82 },
  { key: "nyt-world", publisher: "The New York Times", domain: "nytimes.com", url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml", region: "WORLD", country: "US", credibility: 0.9 },
];
