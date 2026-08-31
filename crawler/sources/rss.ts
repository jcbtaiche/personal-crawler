import Parser from "rss-parser";
import { USER_AGENT, parseDate, sleep } from "../util.ts";
import type { Candidate } from "../types.ts";

const parser = new Parser({
  headers: { "User-Agent": USER_AGENT },
  timeout: 20_000,
});

function newsSearchUrl(query: string): string {
  const params = new URLSearchParams({
    q: query,
    hl: "en-US",
    gl: "US",
    ceid: "US:en",
  });
  return `https://news.google.com/rss/search?${params.toString()}`;
}

function rssSource(item: Parser.Item): string | undefined {
  const raw = (item as Parser.Item & { source?: { name?: string } | string }).source;
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  if (raw && typeof raw === "object" && raw.name) return raw.name;
  return undefined;
}

function stripSourceSuffix(title: string): { title: string; source?: string } {
  const parts = title.split(" - ");
  if (parts.length < 2) return { title };
  return { title: parts.slice(0, -1).join(" - ").trim(), source: parts.at(-1)?.trim() };
}

export async function fetchGoogleNews(queries: string[]): Promise<Candidate[]> {
  const out: Candidate[] = [];
  for (const query of queries) {
    try {
      const feed = await parser.parseURL(newsSearchUrl(query));
      for (const item of feed.items) {
        if (!item.link || !item.title) continue;
        const split = stripSourceSuffix(item.title);
        out.push({
          title: split.title,
          url: item.link,
          source: rssSource(item) || split.source || "Google News",
          date: parseDate(item.isoDate || item.pubDate),
          snippet: item.contentSnippet || item.content || "",
          kindHint: "press",
        });
      }
    } catch (err) {
      console.warn(`Google News failed for "${query}":`, (err as Error).message);
    }
    await sleep(400);
  }
  return out;
}

export async function fetchRssFeeds(urls: string[]): Promise<Candidate[]> {
  const out: Candidate[] = [];
  for (const url of urls) {
    if (!url) continue;
    try {
      const feed = await parser.parseURL(url);
      for (const item of feed.items) {
        if (!item.link || !item.title) continue;
        out.push({
          title: item.title,
          url: item.link,
          source: feed.title || "Google Alerts",
          date: parseDate(item.isoDate || item.pubDate),
          snippet: item.contentSnippet || item.content || "",
        });
      }
    } catch (err) {
      console.warn(`RSS feed failed (${url}):`, (err as Error).message);
    }
    await sleep(300);
  }
  return out;
}
