import type { NewsProvider } from "../types.ts";
import { FEEDS } from "../feeds.ts";
import { gnewsProvider } from "./gnews.ts";
import { guardianProvider } from "./guardian.ts";
import { newsApiProvider } from "./newsapi.ts";
import { rssProvider } from "./rss.ts";

/**
 * Add a new provider by implementing NewsProvider and listing it here.
 * Nothing else in the codebase knows which providers exist.
 */
export function allProviders(): NewsProvider[] {
  return [gnewsProvider, guardianProvider, newsApiProvider, ...FEEDS.map(rssProvider)];
}
