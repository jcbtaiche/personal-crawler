import type { CrawlerConfig, Mention } from "./types.ts";

export interface FilterResult {
  keep: boolean;
  status: "published" | "inbox";
  mentions: Mention[];
  reason: string;
}

function haystack(parts: string[]): string {
  return parts.join(" ").toLowerCase();
}

function hasAny(text: string, needles: string[]): boolean {
  return needles.some((n) => text.includes(n.toLowerCase()));
}

function nameMatched(text: string, names: string[]): boolean {
  const compact = text.replace(/[.\-']/g, " ").replace(/\s+/g, " ");
  return (
    names.some((name) => {
      const n = name.toLowerCase().replace(/[.\-']/g, " ").replace(/\s+/g, " ").trim();
      return compact.includes(n);
    }) ||
    /\bj\.?\s*c\.?\s*btaiche\b/.test(text) ||
    (/\bjean\s*christoph/.test(text) && /\bbtaiche\b/.test(text))
  );
}

export function filterCandidate(
  config: CrawlerConfig,
  title: string,
  source: string,
  snippet: string,
  url: string,
): FilterResult {
  const text = haystack([title, source, snippet, url]);

  try {
    const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    if (
      host === "f.energy" ||
      host.endsWith(".f.energy") ||
      host === "prnewswire.com" ||
      host.endsWith(".prnewswire.com")
    ) {
      return { keep: false, status: "inbox", mentions: [], reason: "company_release" };
    }
  } catch {
    // ignore invalid URLs and fall through to other checks
  }

  if (/\bpr newswire\b/i.test(source)) {
    return { keep: false, status: "inbox", mentions: [], reason: "company_release" };
  }

  if (hasAny(text, config.exclude_patterns)) {
    return { keep: false, status: "inbox", mentions: [], reason: "exclude_pattern" };
  }

  const mentions: Mention[] = [];
  const named = nameMatched(text, config.person_names);
  if (named) mentions.push("name");

  const companyHit = hasAny(text, config.company_names.map((c) => c.toLowerCase()));
  const fuseEnergy = /\bfuse energy\b/.test(text);
  const bareFuse = /\bfuse\b/.test(text);
  const strong = hasAny(text, config.fuse_context);
  const fusionWord = /\bfusion\b/.test(text);

  if (companyHit || (fuseEnergy && strong) || (bareFuse && strong && named)) {
    mentions.push("fuse");
  }

  if (named && (mentions.includes("fuse") || strong || fusionWord)) {
    return { keep: true, status: "published", mentions: mentions.length ? mentions : ["name"], reason: "name_and_context" };
  }
  if (named) {
    return { keep: true, status: "published", mentions, reason: "name" };
  }
  if (companyHit) {
    return { keep: true, status: "published", mentions, reason: "company" };
  }
  if ((fuseEnergy || bareFuse) && strong) {
    return { keep: true, status: "published", mentions, reason: "fuse_with_context" };
  }
  if (fuseEnergy && fusionWord) {
    return { keep: true, status: "inbox", mentions: [], reason: "fuse_energy_fusion_only" };
  }
  if (fuseEnergy) {
    return { keep: true, status: "inbox", mentions: [], reason: "fuse_energy_no_context" };
  }

  return { keep: false, status: "inbox", mentions: [], reason: "no_match" };
}
