import { XMLParser } from "fast-xml-parser";
import type { NewsProvider, RawArticle } from "../types.ts";
import type { FeedDef } from "../feeds.ts";
import { getText } from "./http.ts";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  processEntities: true,
  trimValues: true,
});

const arr = <T>(v: T | T[] | undefined): T[] => (v === undefined ? [] : Array.isArray(v) ? v : [v]);
const text = (v: unknown): string => {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  if (typeof v === "object" && "#text" in (v as object)) return String((v as Record<string, unknown>)["#text"]);
  return "";
};

function pickImage(item: Record<string, any>): string | null {
  const media = arr(item["media:content"] ?? item["media:thumbnail"])[0];
  if (media?.["@_url"]) return media["@_url"];
  const enc = item.enclosure;
  if (enc?.["@_url"] && /image/i.test(enc["@_type"] ?? "image")) return enc["@_url"];
  const html = text(item["content:encoded"]) || text(item.description);
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m?.[1] ?? null;
}

export function parseFeed(xml: string, feed: FeedDef): RawArticle[] {
  const doc = parser.parse(xml);
  const items: Record<string, any>[] = doc?.rss?.channel?.item
    ? arr(doc.rss.channel.item)
    : doc?.["rdf:RDF"]?.item
      ? arr(doc["rdf:RDF"].item)
      : doc?.feed?.entry
        ? arr(doc.feed.entry)
        : [];

  const out: RawArticle[] = [];
  for (const it of items) {
    const link = typeof it.link === "string" ? it.link : (it.link?.["@_href"] ?? text(it.guid));
    const title = text(it.title);
    const when = text(it.pubDate) || text(it["dc:date"]) || text(it.published) || text(it.updated);
    const date = when ? new Date(when) : new Date();
    if (!link || !title || Number.isNaN(date.getTime())) continue;
    out.push({
      headline: title,
      description: text(it.description) || text(it.summary),
      content: null, // publisher full text is never stored
      url: link,
      imageUrl: pickImage(it),
      author: text(it["dc:creator"]) || text(it.author?.name ?? it.author) || null,
      publishedAt: date,
      publisherName: feed.publisher,
      publisherDomain: feed.domain,
      region: feed.region,
      country: feed.country,
      categoryHint: feed.categoryHint ?? null,
    });
  }
  return out;
}

export function rssProvider(feed: FeedDef): NewsProvider {
  return {
    key: `rss:${feed.key}`,
    name: `${feed.publisher} RSS (${feed.key})`,
    type: "RSS",
    isConfigured: () => true,
    async fetch() {
      return parseFeed(await getText(feed.url), feed).slice(0, 40);
    },
  };
}
