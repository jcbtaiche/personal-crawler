import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse, stringify } from "yaml";
import type { CrawlerConfig, Item } from "./types.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

export const paths = {
  root,
  config: join(root, "data/config.yaml"),
  items: join(root, "data/items.yaml"),
};

export function loadConfig(): CrawlerConfig {
  return parse(readFileSync(paths.config, "utf8")) as CrawlerConfig;
}

export function loadItems(): Item[] {
  const parsed = parse(readFileSync(paths.items, "utf8"));
  return Array.isArray(parsed) ? (parsed as Item[]) : [];
}

export function saveItems(items: Item[]): void {
  const yaml = stringify(items, {
    lineWidth: 0,
    defaultStringType: "QUOTE_DOUBLE",
    defaultKeyType: "PLAIN",
  });
  writeFileSync(paths.items, `${yaml.startsWith("#") ? "" : "# Archive of published writing, press, talks, and papers.\n# kind: press | essay | podcast | video | research\n# status: published (shown on the site) | inbox (held for review)\n# Essays are added by hand; the crawler never writes kind: essay.\n\n"}${yaml}`);
}
