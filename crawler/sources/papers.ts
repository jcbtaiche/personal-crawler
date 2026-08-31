import { USER_AGENT, parseDate, sleep } from "../util.ts";
import type { Candidate } from "../types.ts";

interface CrossrefWork {
  title?: string[];
  URL?: string;
  DOI?: string;
  issued?: { "date-parts"?: number[][] };
  publisher?: string;
  "container-title"?: string[];
  abstract?: string;
  author?: Array<{ given?: string; family?: string }>;
}

interface CrossrefResponse {
  message?: { items?: CrossrefWork[] };
}

interface SemanticScholarPaper {
  title?: string;
  url?: string;
  externalIds?: { DOI?: string };
  year?: number;
  venue?: string;
  abstract?: string;
  authors?: Array<{ name?: string }>;
}

interface SemanticScholarResponse {
  data?: SemanticScholarPaper[];
}

export async function fetchCrossref(authors: string[]): Promise<Candidate[]> {
  const out: Candidate[] = [];
  for (const author of authors) {
    const params = new URLSearchParams({
      "query.author": author,
      rows: "20",
      sort: "published",
      order: "desc",
    });
    try {
      const res = await fetch(`https://api.crossref.org/works?${params}`, {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "application/json",
        },
      });
      if (!res.ok) {
        console.warn(`Crossref failed (${res.status}) for "${author}"`);
        continue;
      }
      const data = (await res.json()) as CrossrefResponse;
      for (const work of data.message?.items ?? []) {
        const title = work.title?.[0];
        const url = work.URL || (work.DOI ? `https://doi.org/${work.DOI}` : undefined);
        if (!title || !url) continue;
        const parts = work.issued?.["date-parts"]?.[0];
        const date = parts
          ? `${parts[0]}-${String(parts[1] ?? 1).padStart(2, "0")}-${String(parts[2] ?? 1).padStart(2, "0")}`
          : parseDate(undefined);
        const authors = (work.author ?? [])
          .map((a) => [a.given, a.family].filter(Boolean).join(" "))
          .join(", ");
        out.push({
          title,
          url,
          source: work["container-title"]?.[0] || work.publisher || "Journal",
          date,
          snippet: `${authors} ${work.abstract || ""}`.trim(),
          kindHint: "research",
        });
      }
    } catch (err) {
      console.warn(`Crossref failed for "${author}":`, (err as Error).message);
    }
    await sleep(400);
  }
  return out;
}

export async function fetchSemanticScholar(queries: string[]): Promise<Candidate[]> {
  const out: Candidate[] = [];
  for (const query of queries) {
    const params = new URLSearchParams({
      query,
      limit: "15",
      fields: "title,url,externalIds,year,venue,abstract,authors",
    });
    try {
      const res = await fetch(`https://api.semanticscholar.org/graph/v1/paper/search?${params}`, {
        headers: { "User-Agent": USER_AGENT },
      });
      if (!res.ok) {
        console.warn(`Semantic Scholar failed (${res.status}) for "${query}"`);
        continue;
      }
      const data = (await res.json()) as SemanticScholarResponse;
      for (const paper of data.data ?? []) {
        const url = paper.url || (paper.externalIds?.DOI ? `https://doi.org/${paper.externalIds.DOI}` : undefined);
        if (!paper.title || !url) continue;
        const year = paper.year ? `${paper.year}-01-01` : parseDate(undefined);
        const authors = (paper.authors ?? []).map((a) => a.name).filter(Boolean).join(", ");
        out.push({
          title: paper.title,
          url,
          source: paper.venue || "Semantic Scholar",
          date: year,
          snippet: `${authors} ${paper.abstract || ""}`.trim(),
          kindHint: "research",
        });
      }
    } catch (err) {
      console.warn(`Semantic Scholar failed for "${query}":`, (err as Error).message);
    }
    await sleep(400);
  }
  return out;
}
