import { existsSync, readFileSync } from "node:fs";
import { classify } from "./classify.ts";
import { sendDigest } from "./email.ts";
import { filterCandidate } from "./filter.ts";
import { fetchItunes } from "./sources/itunes.ts";
import { fetchCrossref, fetchSemanticScholar } from "./sources/papers.ts";
import { fetchGoogleNews, fetchRssFeeds } from "./sources/rss.ts";
import { fetchYouTube } from "./sources/youtube.ts";
import { loadConfig, loadItems, paths, saveItems } from "./store.ts";
import type { Candidate, CrawlerConfig, Item } from "./types.ts";
import { canonicalizeUrl, fingerprint, makeId, titleKey } from "./util.ts";

function loadDotEnv(): void {
  const file = `${paths.root}/.env`;
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function uniqueCandidates(candidates: Candidate[]): Candidate[] {
  const seen = new Set<string>();
  const out: Candidate[] = [];
  for (const c of candidates) {
    const key = canonicalizeUrl(c.url);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ ...c, url: key });
  }
  return out;
}

async function gather(config: ReturnType<typeof loadConfig>): Promise<Candidate[]> {
  const batches: Candidate[][] = [];
  batches.push(await fetchGoogleNews(config.google_news_queries));
  batches.push(await fetchItunes(config.itunes_queries));
  batches.push(await fetchCrossref(config.crossref_authors));
  batches.push(await fetchSemanticScholar(config.semantic_scholar_queries));

  const youtubeKey = process.env.YOUTUBE_API_KEY;
  if (youtubeKey) {
    batches.push(await fetchYouTube(config.youtube_queries, youtubeKey));
  } else {
    console.log("Skipping YouTube (set YOUTUBE_API_KEY to enable).");
  }

  const alertFeeds = (process.env.GOOGLE_ALERTS_RSS_URL || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (alertFeeds.length) {
    batches.push(await fetchRssFeeds(alertFeeds));
  }

  return uniqueCandidates(batches.flat());
}

function toItem(candidate: Candidate, config: CrawlerConfig): Item | null {
  const verdict = filterCandidate(config, candidate.title, candidate.source, candidate.snippet, candidate.url);
  if (!verdict.keep) return null;

  const url = canonicalizeUrl(candidate.url);
  const id = makeId(candidate.source, candidate.date, candidate.title);
  const kind = classify(url, candidate.title, candidate.kindHint);
  if ((kind === "podcast" || kind === "video") && verdict.status === "inbox") return null;

  return {
    id,
    kind,
    title: candidate.title.replace(/\s+/g, " ").trim(),
    url,
    source: candidate.source.replace(/\s+/g, " ").trim(),
    date: candidate.date,
    status: verdict.status,
    mentions: verdict.mentions.length ? verdict.mentions : [],
  };
}

function isDuplicate(item: Item, existing: Item[]): boolean {
  const url = canonicalizeUrl(item.url);
  const fp = fingerprint(item.title, item.source);
  const tk = titleKey(item.title);
  return existing.some(
    (e) =>
      canonicalizeUrl(e.url) === url ||
      e.id === item.id ||
      fingerprint(e.title, e.source) === fp ||
      titleKey(e.title) === tk,
  );
}

async function main(): Promise<void> {
  loadDotEnv();
  const dryRun = process.argv.includes("--dry-run");
  const config = loadConfig();
  const existing = loadItems();
  const candidates = await gather(config);

  const added: Item[] = [];
  const pool = [...existing];
  for (const candidate of candidates) {
    const item = toItem(candidate, config);
    if (!item) continue;
    if (isDuplicate(item, pool)) continue;
    pool.unshift(item);
    added.push(item);
  }

  added.sort((a, b) => b.date.localeCompare(a.date));

  console.log(`Fetched ${candidates.length} candidates, ${added.length} new.`);
  for (const item of added) {
    console.log(`  + [${item.status}] ${item.kind} · ${item.source} · ${item.title}`);
  }

  if (dryRun) {
    console.log("Dry run — archive not written.");
    return;
  }

  if (!added.length) {
    console.log("No new items.");
    return;
  }

  const merged = [...added, ...existing];
  saveItems(merged);
  await sendDigest(added);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
