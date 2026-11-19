import { test } from "node:test";
import assert from "node:assert/strict";
import { tokenize, jaccard, normalizeUrl, stripHtml, cleanHeadline, splitSentences } from "../src/lib/news/text.ts";
import { findCluster } from "../src/lib/news/dedupe.ts";
import { rankArticle } from "../src/lib/news/rank.ts";
import { classify } from "../src/lib/news/classify.ts";
import { extractiveSummary } from "../src/lib/news/summarize.ts";

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000);

test("normalizeUrl strips tracking params, fragments, www and trailing slash", () => {
  assert.equal(normalizeUrl("https://www.example.com/a/b/?utm_source=x&id=7#top"), "https://example.com/a/b?id=7");
});

test("stripHtml removes tags and decodes entities", () => {
  assert.equal(stripHtml("<p>Tom &amp; Jerry&#39;s <b>show</b></p><script>x()</script>"), "Tom & Jerry's show");
});

test("cleanHeadline drops a trailing publisher suffix", () => {
  assert.equal(cleanHeadline("Rupee closes higher - The Hindu", "The Hindu"), "Rupee closes higher");
});

test("same event from different outlets clusters together; unrelated stories do not", () => {
  const a = tokenize("RBI keeps repo rate unchanged at 6.5 per cent in policy review");
  const existing = [{ id: "1", clusterId: "c1", titleTokens: a, region: "INDIA", publishedAt: hoursAgo(2) }];
  const sameEvent = tokenize("RBI keeps repo rate unchanged at 6.5% in monetary policy review");
  const different = tokenize("Cyclone warning issued for Odisha coast as rain lashes region");
  assert.equal(findCluster(sameEvent, "INDIA", hoursAgo(1), existing), "c1");
  assert.equal(findCluster(different, "INDIA", hoursAgo(1), existing), null);
});

test("clustering never crosses regions or a 48h window", () => {
  const t = tokenize("Prime minister meets president to discuss trade agreement talks");
  const existing = [{ id: "1", clusterId: "c1", titleTokens: t, region: "WORLD", publishedAt: hoursAgo(2) }];
  assert.equal(findCluster(t, "INDIA", hoursAgo(1), existing), null);
  const old = [{ id: "1", clusterId: "c1", titleTokens: t, region: "INDIA", publishedAt: hoursAgo(100) }];
  assert.equal(findCluster(t, "INDIA", hoursAgo(1), old), null);
});

const base = { headline: "Parliament passes new bill after debate", description: "x".repeat(150), hasImage: true, region: "INDIA" as const, publisherCredibility: 0.8 };

test("fresher stories outrank older ones, all else equal", () => {
  const fresh = rankArticle({ ...base, publishedAt: hoursAgo(1), clusterPublisherCredibilities: [0.8] });
  const old = rankArticle({ ...base, publishedAt: hoursAgo(30), clusterPublisherCredibilities: [0.8] });
  assert.ok(fresh.score > old.score);
});

test("wider coverage across publishers raises the score", () => {
  const one = rankArticle({ ...base, publishedAt: hoursAgo(2), clusterPublisherCredibilities: [0.8] });
  const many = rankArticle({ ...base, publishedAt: hoursAgo(2), clusterPublisherCredibilities: [0.8, 0.9, 0.85, 0.7] });
  assert.ok(many.score > one.score);
});

test("scores stay within 0..100", () => {
  const best = rankArticle({ headline: "War ceasefire talks: killed in attack, historic summit", description: "x".repeat(300), hasImage: true, publishedAt: new Date(), region: "WORLD", publisherCredibility: 1, clusterPublisherCredibilities: Array(12).fill(1) });
  const worst = rankArticle({ headline: "Minor note", hasImage: false, publishedAt: hoursAgo(200), region: "WORLD", publisherCredibility: 0, clusterPublisherCredibilities: [0] });
  assert.ok(best.score <= 100 && worst.score >= 0);
});

test("Breaking / Trending labels only appear when the data supports them", () => {
  const lone = rankArticle({ ...base, publishedAt: hoursAgo(1), clusterPublisherCredibilities: [0.8] });
  assert.equal(lone.isBreaking, false); // single outlet, no explicit marker
  assert.equal(lone.isTrending, false);
  const marked = rankArticle({ ...base, headline: "BREAKING: Parliament passes new bill", publishedAt: hoursAgo(1), clusterPublisherCredibilities: [0.8] });
  assert.equal(marked.isBreaking, true); // credible outlet + explicit marker + fresh
  const lowCred = rankArticle({ ...base, headline: "BREAKING: Parliament passes new bill", publisherCredibility: 0.5, publishedAt: hoursAgo(1), clusterPublisherCredibilities: [0.5] });
  assert.equal(lowCred.isBreaking, false);
  const wide = rankArticle({ ...base, publishedAt: hoursAgo(5), clusterPublisherCredibilities: [0.8, 0.9, 0.7] });
  assert.equal(wide.isTrending, true);
  assert.equal(wide.isBreaking, false); // older than 3h
});

test("classifier picks categories from evidence and falls back to region", () => {
  assert.equal(classify({ headline: "Sensex and Nifty rally as RBI holds interest rate", region: "INDIA" }), "business");
  assert.equal(classify({ headline: "India beat Australia in thrilling cricket match", region: "INDIA" }), "sports");
  assert.equal(classify({ headline: "Local council meets on Tuesday", region: "WORLD" }), "world");
  assert.equal(classify({ headline: "Local council meets on Tuesday", region: "INDIA" }), "india");
  assert.equal(classify({ headline: "Something", region: "WORLD", categoryHint: "science" }), "science");
});

test("extractive summary uses only source text, caps at 4 sentences, never invents", () => {
  const description = "The Reserve Bank of India kept rates unchanged on Friday. Governor said inflation is easing. Growth forecast was held at 6.8 per cent. Markets reacted calmly to the move. Analysts expect a cut later in the year.";
  const s = extractiveSummary({ headline: "RBI holds rates", description, publisherName: "Test" });
  assert.equal(splitSentences(s).length, 4);
  for (const sentence of splitSentences(s)) assert.ok(description.includes(sentence.replace(/\.$/, "")));
  const empty = extractiveSummary({ headline: "RBI holds rates", description: "", publisherName: "Test" });
  assert.match(empty, /Read the original article/);
});

test("jaccard basics", () => {
  assert.equal(jaccard(["a", "b"], ["a", "b"]), 1);
  assert.equal(jaccard(["a"], ["b"]), 0);
});
