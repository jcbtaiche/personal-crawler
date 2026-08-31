# JC Btaiche — personal archive

A personal archive site plus a daily crawler that watches for mentions of JC Btaiche and Fuse Energy Technologies.

The YAML archive in [`data/items.yaml`](data/items.yaml) is the source of truth. The site only renders items with `status: published`.

## Site

```bash
npm install
npm run dev
```

Then open [http://localhost:4321](http://localhost:4321).

Production build (GitHub Pages project URL `/personal-crawler`):

```bash
GITHUB_PAGES=1 npm run build
```

## Crawler

```bash
npm run crawl:dry   # fetch and print new items, do not write
npm run crawl       # write new items to data/items.yaml and email
```

It searches:

- Google News RSS
- Apple Podcasts (iTunes Search)
- Crossref and Semantic Scholar
- YouTube Search (if `YOUTUBE_API_KEY` is set)
- Google Alerts RSS (if `GOOGLE_ALERTS_RSS_URL` is set)

**High confidence** hits (your name, or Fuse Energy Technologies / Fuse + fusion context) are saved as `published`. Ambiguous Fuse Energy hits go to `inbox` and stay off the public page.

The crawler never writes `kind: essay`. Add essays by hand.

### Queries and filters

Edit [`data/config.yaml`](data/config.yaml) for names, company strings, search queries, fusion context words, and exclude patterns (UK energy retailer, electrical “fuse”, etc.).

## Email alerts

1. Create a [Resend](https://resend.com) account and API key.
2. In the GitHub repo: **Settings → Secrets and variables → Actions**, add:

| Secret | Required | Purpose |
| --- | --- | --- |
| `NOTIFY_EMAIL` | yes, for mail | Where digests go |
| `RESEND_API_KEY` | yes, for mail | Sends the digest |
| `NOTIFY_FROM` | no | Verified Resend from-address. Defaults to Resend’s onboarding sender. |
| `YOUTUBE_API_KEY` | no | YouTube Data API v3 search |
| `GOOGLE_ALERTS_RSS_URL` | no | Comma-separated Google Alerts RSS URLs |

Without mail secrets the crawler still updates the archive; it just skips email.

### Google Alerts (recommended)

1. Open [Google Alerts](https://www.google.com/alerts).
2. Create alerts for `"JC Btaiche"` and `"Fuse Energy Technologies"`.
3. Deliver to **RSS feed**.
4. Paste the feed URL(s) into the `GOOGLE_ALERTS_RSS_URL` secret.

## Adding or reviewing items

Open [`data/items.yaml`](data/items.yaml).

```yaml
- id: my-essay-2026
  kind: essay
  title: Title of the piece
  url: https://example.com/essay
  source: Personal
  date: 2026-08-30
  status: published
  mentions: [name]
```

To promote a crawler inbox item, change `status: inbox` to `status: published`. To drop it, delete the entry.

`kind` is one of `press`, `essay`, `podcast`, `video`, `research`.

## Deploy (auto-update on push)

Push to `main` rebuilds the live site. The crawler commits to `data/items.yaml` on the same branch, so new mentions go live automatically.

### Cloudflare Pages

Import this GitHub repo in [Cloudflare Pages](https://dash.cloudflare.com/?to=/:account/pages). Use the **repository root** (not `site/`):

| Setting | Value |
| --- | --- |
| Build command | `npm run build` |
| Output directory | `dist` |
| Node | 22 |

Do not set `GITHUB_PAGES`. After the first deploy, add these GitHub Actions secrets so pushes to `main` also ship from CI: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.

Point `site` in [`site/astro.config.mjs`](site/astro.config.mjs) at your live URL once you have it.

GitHub Actions [`pages.yml`](.github/workflows/pages.yml) deploys `dist/` to the Cloudflare Pages project `jcbtaiche`.

## GitHub Actions

- [`crawl.yml`](.github/workflows/crawl.yml) runs daily at 08:00 Pacific (`15:00 UTC`) and on **Actions → Crawl mentions → Run workflow**. New items are committed back to `data/items.yaml`.
- [`pages.yml`](.github/workflows/pages.yml) builds and deploys the site on push to `main`.
