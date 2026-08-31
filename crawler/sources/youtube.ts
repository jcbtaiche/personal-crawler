import { USER_AGENT, parseDate, sleep } from "../util.ts";
import type { Candidate } from "../types.ts";

interface YoutubeSearchResponse {
  items?: Array<{
    id?: { videoId?: string };
    snippet?: {
      title?: string;
      channelTitle?: string;
      description?: string;
      publishedAt?: string;
    };
  }>;
}

export async function fetchYouTube(queries: string[], apiKey: string): Promise<Candidate[]> {
  const out: Candidate[] = [];
  for (const query of queries) {
    const params = new URLSearchParams({
      part: "snippet",
      q: query,
      type: "video",
      maxResults: "15",
      key: apiKey,
    });
    try {
      const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`, {
        headers: { "User-Agent": USER_AGENT },
      });
      if (!res.ok) {
        console.warn(`YouTube search failed (${res.status}) for "${query}"`);
        continue;
      }
      const data = (await res.json()) as YoutubeSearchResponse;
      for (const item of data.items ?? []) {
        const id = item.id?.videoId;
        const snippet = item.snippet;
        if (!id || !snippet?.title) continue;
        out.push({
          title: snippet.title,
          url: `https://www.youtube.com/watch?v=${id}`,
          source: snippet.channelTitle || "YouTube",
          date: parseDate(snippet.publishedAt),
          snippet: snippet.description || "",
          kindHint: "video",
        });
      }
    } catch (err) {
      console.warn(`YouTube search failed for "${query}":`, (err as Error).message);
    }
    await sleep(300);
  }
  return out;
}
