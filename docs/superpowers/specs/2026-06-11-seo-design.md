# SEO upgrade — design

Status: approved
Date: 2026-06-11
Target version: v0.15

## Goal

Make mtg-graph.com discoverable in search and shareable on social platforms. The baseline (`<title>`, description, OG tags, Twitter card, favicons, og-image at 1200×630, PWA manifest via `vite-plugin-pwa`) is already in `app/index.html`. This pass closes the remaining gaps that affect indexing, rich results, and share previews.

## Non-goals

- **Server-side rendering / build-time prerendering.** Modern Google indexes JS-rendered SPAs and we have no per-entity URLs (no `/card/<slug>`, no `/deck/<slug>`) where prerendering would unlock meaningful long-tail traffic. Revisit when entity-deep-links land.
- **Per-card or per-deck dynamic OG images.** Static og-image is sufficient until entity routes exist.
- **`hreflang` / multi-language SEO.** Single-language site.
- **`<meta name="keywords">`.** Ignored by all major engines since ~2009.
- **Backlink strategy, content marketing, blog.** Out of scope for this pass.

## Production URL

`https://mtg-graph.com` is the canonical host. All absolute URLs (canonical, `og:url`, sitemap entries, JSON-LD `url`) use this origin without trailing slash, except the root which uses `https://mtg-graph.com/`.

## Changes

### 1. `app/index.html` — static head upgrades

Additions to the existing `<head>` (preserving everything that's already there):

- `<link rel="canonical" href="https://mtg-graph.com/">`
- `<meta name="robots" content="index, follow">`
- `<meta property="og:url" content="https://mtg-graph.com/">`
- `<meta property="og:site_name" content="MTG Graph">`
- `<meta property="og:locale" content="en_US">`
- `<meta property="og:image"` absolute URL: change `/og-image.png` → `https://mtg-graph.com/og-image.png` (Facebook/LinkedIn scrapers reject root-relative)
- `<meta name="twitter:image"` absolute URL: same treatment
- `<meta name="application-name" content="MTG Graph">`
- JSON-LD `<script type="application/ld+json">`:
  ```json
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "MTG Graph",
    "description": "Browse every Magic: The Gathering Standard card as a searchable interaction graph. Find synergies, build decks, and explore mechanics.",
    "url": "https://mtg-graph.com/",
    "applicationCategory": "GameApplication",
    "operatingSystem": "Web",
    "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" }
  }
  ```
- `<noscript>` block immediately inside `<body>`, before `#root`. One paragraph in plain HTML describing what the site does, with one `<a>` to the project README on GitHub. Crawlers and social-share scrapers that don't run JS will at least see substantive content rather than an empty `<div id="root">`.

### 2. Per-route browser titles — `app/src/lib/seo.ts`

New module exporting:

```ts
export const SITE_URL = 'https://mtg-graph.com';
export const SITE_NAME = 'MTG Graph';

export function useDocumentMeta(title: string, description?: string): void;
```

`useDocumentMeta` is a tiny `useEffect`-based hook. On mount it sets `document.title` and (if `description` given) the content of `<meta name="description">`. On unmount it restores the previous values. No external dependency (don't pull in `react-helmet-async` — we have three routes and one hook fits in ~25 lines).

Title format: `"<Page> — MTG Graph"`. Em-dash, not hyphen.

Route assignments:

| Route    | Title                       | Description |
|----------|-----------------------------|-------------|
| `/`      | `Browse — MTG Graph`        | (inherits the existing index.html description — pass `undefined` so the hook doesn't touch the tag) |
| `/decks` | `Decks — MTG Graph`         | `Build, import, and manage Magic: The Gathering decks. Import from MTG Arena, ManaBox, or paste a decklist.` |
| `/graph` | `Deck Graph — MTG Graph`    | `Visualize card interactions and synergies in your Magic: The Gathering deck.` |

Each page component calls `useDocumentMeta(...)` at the top.

### 3. `app/public/sitemap.xml`

New file, three URLs:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://mtg-graph.com/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>
  <url><loc>https://mtg-graph.com/decks</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>
  <url><loc>https://mtg-graph.com/graph</loc><changefreq>weekly</changefreq><priority>0.6</priority></url>
</urlset>
```

No `<lastmod>` — keeping it omitted avoids stale dates and the rebuild churn of pinning a build-time stamp into a static file. Engines handle missing `lastmod` fine.

### 4. `app/public/robots.txt`

Add a `Sitemap:` directive. Final content:

```
User-agent: *
Allow: /

Sitemap: https://mtg-graph.com/sitemap.xml
```

## Testing

- **Unit:** one test for `useDocumentMeta` in `app/src/lib/seo.test.ts`. Asserts (a) `document.title` updates on mount, (b) the existing `<meta name="description">` content updates when description provided, (c) both restore on unmount.
- **Build:** existing `npm test` covers TS + the new unit test.
- **Manual post-deploy:**
  - https://search.google.com/test/rich-results — should detect the `WebApplication` schema
  - https://cards-dev.twitter.com/validator — should show the large image card
  - https://developers.facebook.com/tools/debug/ — should pull the absolute og-image URL cleanly
  - `view-source:https://mtg-graph.com/` — should show the noscript content
  - `curl https://mtg-graph.com/sitemap.xml` and `curl https://mtg-graph.com/robots.txt` — should both 200

## Risk and mitigation

- **Absolute og-image URL during preview deploys.** If `mtg-graph.com` isn't reachable yet when a preview build is scraped, social previews fail. Mitigation: the production URL is already configured and the og-image is already at `/og-image.png` — preview deploys can keep showing nothing, since they shouldn't be scraped anyway.
- **`useDocumentMeta` race with rapid navigation.** React unmount/mount ordering already restores values in the right order; no extra coordination needed for three routes.
- **Stale sitemap entries** if routes change. Three routes are easy to keep in sync manually. A future automation isn't worth building yet.
