# Logo, Favicon, and SEO Metadata

**Date:** 2026-05-28
**Status:** Approved direction (Option A — WUBRG pentagon-as-graph)

## Purpose

Replace the placeholder 1×1 PNG icons in `app/public/` and the bare-bones `app/index.html` with a real visual identity and SEO-ready metadata. The site is currently anonymous on social previews, in browser tabs, and in search results.

## Visual concept

The logo is the canonical MTG color-pie pentagon: five colored nodes (W, U, B, R, G) at the vertices, connected by edges. The image *is* a graph (5 nodes, edges forming the inner pentagram plus the outer pentagon), which collapses both meanings of the project name into one mark:

- **Outer pentagon** — 5 vertices, 5 edges connecting adjacent colors in WUBRG order.
- **Inner pentagram** — 5 edges connecting each color to its two "enemies" (the canonical color-pie diagram).
- **Nodes** — solid filled circles in MTG's standard color-pie palette: white `#FFFBD5`, blue `#AAE0FA`, black `#CBC2BF`, red `#F9AA8F`, green `#9BD3AE`. (These are Scryfall's pastel mana-symbol fill colors — already familiar to players and they survive dark backgrounds.)
- **Edges** — thin neutral strokes (`#525252`, matches the app's `neutral-600`).
- **Background** — transparent in the SVG; rendered against `#0a0a0a` (`neutral-950`) in the app.

The node positions follow the standard color-pie orientation: white at top, then clockwise blue → black → red → green.

## Deliverables

**Files to create/replace in `app/public/`:**

| File | Purpose | Notes |
|---|---|---|
| `logo.svg` | Master logo, used inline if needed | ViewBox `0 0 64 64`, no fixed size |
| `favicon.svg` | Modern browser favicon | Same artwork, optimized (no `<title>`, minimal precision) |
| `favicon.ico` | Legacy fallback (IE, old Safari) | 32×32, rasterized from SVG |
| `icon-192.png` | PWA / Android home screen | **Replaces** existing 1×1 placeholder |
| `icon-512.png` | PWA splash / large display | **Replaces** existing 1×1 placeholder |
| `apple-touch-icon.png` | iOS home screen | 180×180, no transparency (iOS adds its own background) |
| `manifest.webmanifest` | PWA manifest | `name`, `short_name`, `theme_color: #0a0a0a`, `background_color: #0a0a0a`, icon refs |
| `og-image.png` | Social card preview | 1200×630, logo + wordmark on dark bg, no compositing tricks |
| `robots.txt` | Crawler hints | `User-agent: *` + `Allow: /` |

**Files to modify:**

- `app/index.html` — add full SEO meta block (see below) and update `<title>`.

## `index.html` meta block

Replace the current 5-line head with:

```html
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="theme-color" content="#0a0a0a" />

  <title>MTG Graph — Standard card interactions & deck builder</title>
  <meta name="description" content="Browse every Magic: The Gathering Standard card as a searchable interaction graph. Find synergies, build decks, and explore mechanics across 4,400+ cards." />

  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon.ico" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  <link rel="manifest" href="/manifest.webmanifest" />

  <!-- OpenGraph -->
  <meta property="og:type" content="website" />
  <meta property="og:title" content="MTG Graph — Standard card interactions & deck builder" />
  <meta property="og:description" content="Browse every MTG Standard card as a searchable interaction graph. Find synergies, build decks, and explore mechanics." />
  <meta property="og:image" content="/og-image.png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="MTG Graph" />
  <meta name="twitter:description" content="Browse every MTG Standard card as a searchable interaction graph." />
  <meta name="twitter:image" content="/og-image.png" />
</head>
```

Note: no `og:url` or `<link rel="canonical">` because the site has no production URL committed to yet. Easy to add when one exists.

## Generation approach

- **SVG logo**: hand-written. Five `<circle>` nodes + ten `<line>` edges. Total < 1.5 KB. No build step.
- **PNG rasterization**: use macOS-built-in `qlmanage` or `sips`, or `rsvg-convert` (Homebrew) if available, to render the SVG to PNG at the target sizes. Fall back to hand-authoring small PNGs with `sips` resizing if needed. Check what's available before picking.
- **`favicon.ico`**: most browsers accept a PNG renamed `.ico`, but for correctness use `png2ico` or `ImageMagick` if installed; otherwise ship `favicon.png` and skip `.ico`.
- **OG image**: a second SVG (logo + "MTG Graph" wordmark in a clean monospace, plus a one-line tagline) rasterized to 1200×630 PNG.

If none of the rasterization tools are available, fall back to: ship SVG favicon only (modern browsers handle it), and write small placeholder PNGs that point users to view the SVG. Surface this to the user before shipping degraded PNGs.

## Out of scope

- Wordmark / display font choice beyond the OG image (the app's nav still just uses text links).
- Light-mode variant of the logo (the app is dark-only).
- Animated favicon, dynamic OG image generation, sitemap.xml.
- Replacing the nav with a logo image (separate UX decision).

## Testing

- Visual: open `app/index.html` in browser, confirm favicon appears in tab; open `/og-image.png` directly, confirm it looks right.
- Run `npm run build` in `app/` — confirm no Vite warnings about missing referenced assets.
- Spot-check `app/dist/index.html` after build — meta tags should be preserved verbatim.
- Manual: paste a local dev URL into a social preview debugger (e.g., opengraph.xyz) only if the user wants to verify before deploy.
