export type Kind = "press" | "essay" | "podcast" | "video" | "research";
export type Status = "published" | "inbox";
export type Mention = "name" | "fuse";

export interface Item {
  id: string;
  kind: Kind;
  title: string;
  url: string;
  source: string;
  date: string;
  status: Status;
  mentions: Mention[];
}

export interface CrawlerConfig {
  person_names: string[];
  company_names: string[];
  google_news_queries: string[];
  youtube_queries: string[];
  itunes_queries: string[];
  crossref_authors: string[];
  semantic_scholar_queries: string[];
  fuse_context: string[];
  exclude_patterns: string[];
}

export interface Candidate {
  title: string;
  url: string;
  source: string;
  date: string;
  snippet: string;
  kindHint?: Kind;
}
