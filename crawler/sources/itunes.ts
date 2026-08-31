import { USER_AGENT, parseDate, sleep } from "../util.ts";
import type { Candidate } from "../types.ts";

interface ItunesResult {
  trackName?: string;
  collectionName?: string;
  artistName?: string;
  trackViewUrl?: string;
  collectionViewUrl?: string;
  releaseDate?: string;
  description?: string;
}

interface ItunesResponse {
  results?: ItunesResult[];
}

export async function fetchItunes(queries: string[]): Promise<Candidate[]> {
  const out: Candidate[] = [];
  for (const query of queries) {
    const params = new URLSearchParams({
      term: query,
      entity: "podcastEpisode",
      limit: "25",
    });
    try {
      const res = await fetch(`https://itunes.apple.com/search?${params}`, {
        headers: { "User-Agent": USER_AGENT },
      });
      if (!res.ok) {
        console.warn(`iTunes search failed (${res.status}) for "${query}"`);
        continue;
      }
      const data = (await res.json()) as ItunesResponse;
      for (const item of data.results ?? []) {
        const url = item.trackViewUrl || item.collectionViewUrl;
        const title = item.trackName;
        if (!url || !title) continue;
        out.push({
          title,
          url,
          source: item.collectionName || item.artistName || "Podcast",
          date: parseDate(item.releaseDate),
          snippet: item.description || "",
          kindHint: "podcast",
        });
      }
    } catch (err) {
      console.warn(`iTunes search failed for "${query}":`, (err as Error).message);
    }
    await sleep(300);
  }
  return out;
}
