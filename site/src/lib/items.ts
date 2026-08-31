import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";

export type Kind = "press" | "essay" | "podcast" | "video" | "research";
export type Status = "published" | "inbox";

export interface Item {
  id: string;
  kind: Kind;
  title: string;
  url: string;
  source: string;
  date: string;
  status: Status;
  mentions?: string[];
}

const itemsPath = join(process.cwd(), "data/items.yaml");

export function loadPublishedItems(): Item[] {
  const parsed = parse(readFileSync(itemsPath, "utf8"));
  const items = Array.isArray(parsed) ? (parsed as Item[]) : [];
  return items
    .filter((item) => item.status === "published")
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function yearOf(item: Item): string {
  return item.date.slice(0, 4);
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function displayDate(item: Item): string {
  const parts = item.date.split("-");
  const year = parts[0] ?? "";
  const month = MONTHS[Number(parts[1]) - 1];
  return month ? `${month} ${year}` : year;
}

export const sections: { kind: Kind; title: string }[] = [
  { kind: "press", title: "Press" },
  { kind: "essay", title: "Essays" },
  { kind: "podcast", title: "Podcasts" },
  { kind: "video", title: "Videos" },
  { kind: "research", title: "Research Papers" },
];
