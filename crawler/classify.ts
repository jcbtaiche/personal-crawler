import type { Kind } from "./types.ts";

const PODCAST_HOSTS = [
  "podcasts.apple.com",
  "open.spotify.com",
  "spotify.com",
  "overcast.fm",
  "pca.st",
  "pocketcasts.com",
  "firstprinciples.fm",
  "transistor.fm",
  "anchor.fm",
  "podcasts.google.com",
];

const RESEARCH_HOSTS = [
  "doi.org",
  "nature.com",
  "sciencedirect.com",
  "iopscience.iop.org",
  "arxiv.org",
  "semanticscholar.org",
  "acm.org",
  "ieee.org",
  "aps.org",
  "springer.com",
  "wiley.com",
];

const VIDEO_HOSTS = ["youtube.com", "youtu.be", "vimeo.com", "foxbusiness.com"];

export function classify(url: string, title: string, kindHint?: Kind): Kind {
  let host = "";
  try {
    host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    host = "";
  }

  const path = url.toLowerCase();
  const isVideoUrl =
    VIDEO_HOSTS.some((h) => host === h || host.endsWith(`.${h}`)) ||
    host.includes("youtube.com") ||
    host === "youtu.be" ||
    /\/videos?\//.test(path);

  if (isVideoUrl) return "video";
  if (PODCAST_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) return "podcast";
  if (RESEARCH_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) return "research";

  if (kindHint) return kindHint;

  const blob = `${title} ${url}`.toLowerCase();
  if (/\b(podcast|episode)\b/.test(blob) && !host.includes("youtube")) return "podcast";
  if (/\b(arxiv|doi\.org|peer-reviewed)\b/.test(blob)) return "research";

  return "press";
}
