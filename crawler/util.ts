export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

export function makeId(source: string, date: string, title: string): string {
  const year = date.slice(0, 4) || "undated";
  return slugify(`${source}-${year}-${title}`) || `item-${Date.now()}`;
}

export function canonicalizeUrl(raw: string): string {
  try {
    const url = new URL(raw);
    url.hash = "";
    const drop = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid", "gclid", "si"];
    for (const key of drop) url.searchParams.delete(key);

    if (url.hostname.replace(/^www\./, "") === "youtu.be") {
      const id = url.pathname.replace(/^\//, "");
      return `https://www.youtube.com/watch?v=${id}`;
    }
    if (url.hostname.includes("youtube.com") && url.searchParams.get("v")) {
      return `https://www.youtube.com/watch?v=${url.searchParams.get("v")}`;
    }
    if (url.hostname.includes("youtube.com") && url.pathname.startsWith("/shorts/")) {
      const id = url.pathname.split("/")[2];
      return `https://www.youtube.com/watch?v=${id}`;
    }

    url.hostname = url.hostname.replace(/^www\./, "");
    let href = url.toString();
    if (href.endsWith("/") && url.pathname !== "/") href = href.slice(0, -1);
    return href;
  } catch {
    return raw.trim();
  }
}

export function fingerprint(title: string, source: string): string {
  return slugify(`${source}-${title}`);
}

export function titleKey(title: string): string {
  return slugify(title.replace(/\s*[|–—•].*$/, "").replace(/\s+/g, " "));
}

export function parseDate(raw: string | undefined): string {
  if (!raw) return new Date().toISOString().slice(0, 10);
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  return d.toISOString().slice(0, 10);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const USER_AGENT =
  "personal-crawler/1.0 (+https://github.com/jcbtaiche/personal-crawler)";
