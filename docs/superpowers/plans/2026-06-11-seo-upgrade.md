# SEO Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship per-route titles, canonical/OG/JSON-LD upgrades to `index.html`, a `sitemap.xml`, and a robots.txt `Sitemap:` directive so mtg-graph.com is properly indexed and shares richly on social platforms.

**Architecture:** Tiny in-house `useDocumentMeta` hook (no external dep) wired into the three route components. Static head upgrades in `index.html`. Two new/edited static files in `app/public/`. No backend, no prerendering.

**Tech Stack:** Vite, React 18, TypeScript, Vitest + React Testing Library, jsdom.

**Spec:** `docs/superpowers/specs/2026-06-11-seo-design.md`

---

## File Structure

| File | Purpose | Op |
|------|---------|-----|
| `app/src/lib/seo.ts` | Exports `SITE_URL`, `SITE_NAME`, `useDocumentMeta(title, description?)` hook | Create |
| `app/src/lib/seo.test.ts` | Unit tests for the hook (title set/restore, description set/restore, missing-meta no-op) | Create |
| `app/src/pages/WorkspacePage.tsx` | Call `useDocumentMeta('Browse — MTG Graph')` | Modify |
| `app/src/pages/DecksPage.tsx` | Call `useDocumentMeta('Decks — MTG Graph', '…')` | Modify |
| `app/src/pages/DeckGraphPage.tsx` | Call `useDocumentMeta('Deck Graph — MTG Graph', '…')` | Modify |
| `app/index.html` | Add canonical, robots, og:url/site_name/locale, absolute og/twitter image URLs, application-name, JSON-LD, `<noscript>` body content | Modify |
| `app/public/sitemap.xml` | Three-URL sitemap | Create |
| `app/public/robots.txt` | Append `Sitemap:` line | Modify |

---

## Task 1: `useDocumentMeta` hook (TDD)

**Files:**
- Create: `app/src/lib/seo.ts`
- Test: `app/src/lib/seo.test.ts`

**Behavior contract:**
- `useDocumentMeta(title)` — on mount, cache the current `document.title` and set it to the new value. On unmount, restore the cached value.
- `useDocumentMeta(title, description)` — same as above for title; additionally, if `<meta name="description">` exists in the DOM, cache its `content` and set it to `description`. On unmount, restore. If the meta tag does NOT exist, do nothing for description (don't create one — production `index.html` always has it; tests assert the no-op).

### - [ ] Step 1.1: Write the failing tests

Create `app/src/lib/seo.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDocumentMeta, SITE_URL, SITE_NAME } from './seo';

describe('SITE_URL / SITE_NAME', () => {
  it('exposes the canonical site URL without trailing slash', () => {
    expect(SITE_URL).toBe('https://mtg-graph.com');
  });

  it('exposes the site name', () => {
    expect(SITE_NAME).toBe('MTG Graph');
  });
});

describe('useDocumentMeta', () => {
  let originalTitle: string;

  beforeEach(() => {
    originalTitle = document.title;
    document.title = 'Original Title';
    // Ensure no leftover meta from a previous test
    document.querySelectorAll('meta[name="description"]').forEach((el) => el.remove());
  });

  afterEach(() => {
    document.title = originalTitle;
    document.querySelectorAll('meta[name="description"]').forEach((el) => el.remove());
  });

  it('sets document.title on mount', () => {
    renderHook(() => useDocumentMeta('New Title'));
    expect(document.title).toBe('New Title');
  });

  it('restores document.title on unmount', () => {
    const { unmount } = renderHook(() => useDocumentMeta('New Title'));
    expect(document.title).toBe('New Title');
    unmount();
    expect(document.title).toBe('Original Title');
  });

  it('updates meta description when one exists', () => {
    const meta = document.createElement('meta');
    meta.setAttribute('name', 'description');
    meta.setAttribute('content', 'Original description.');
    document.head.appendChild(meta);

    renderHook(() => useDocumentMeta('New Title', 'New description.'));
    expect(meta.getAttribute('content')).toBe('New description.');
  });

  it('restores meta description on unmount', () => {
    const meta = document.createElement('meta');
    meta.setAttribute('name', 'description');
    meta.setAttribute('content', 'Original description.');
    document.head.appendChild(meta);

    const { unmount } = renderHook(() =>
      useDocumentMeta('New Title', 'New description.'),
    );
    unmount();
    expect(meta.getAttribute('content')).toBe('Original description.');
  });

  it('does not touch description tag when description arg is omitted', () => {
    const meta = document.createElement('meta');
    meta.setAttribute('name', 'description');
    meta.setAttribute('content', 'Original description.');
    document.head.appendChild(meta);

    renderHook(() => useDocumentMeta('New Title'));
    expect(meta.getAttribute('content')).toBe('Original description.');
  });

  it('no-ops on description when meta tag does not exist', () => {
    // No <meta name="description"> in the DOM
    expect(() =>
      renderHook(() => useDocumentMeta('New Title', 'Whatever.')),
    ).not.toThrow();
    expect(document.querySelector('meta[name="description"]')).toBeNull();
  });
});
```

### - [ ] Step 1.2: Run the tests, verify they fail

```bash
cd app && npx vitest run src/lib/seo.test.ts
```

Expected: FAIL with `Failed to resolve import "./seo"` or similar — the module doesn't exist yet.

### - [ ] Step 1.3: Implement the hook

Create `app/src/lib/seo.ts`:

```ts
import { useEffect } from 'react';

export const SITE_URL = 'https://mtg-graph.com';
export const SITE_NAME = 'MTG Graph';

export function useDocumentMeta(title: string, description?: string): void {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;

    const metaDescription = description
      ? document.querySelector<HTMLMetaElement>('meta[name="description"]')
      : null;
    const previousDescription = metaDescription?.getAttribute('content') ?? null;
    if (metaDescription && description !== undefined) {
      metaDescription.setAttribute('content', description);
    }

    return () => {
      document.title = previousTitle;
      if (metaDescription && previousDescription !== null) {
        metaDescription.setAttribute('content', previousDescription);
      }
    };
  }, [title, description]);
}
```

### - [ ] Step 1.4: Run the tests, verify they pass

```bash
cd app && npx vitest run src/lib/seo.test.ts
```

Expected: All 8 tests PASS.

### - [ ] Step 1.5: Commit

```bash
git add app/src/lib/seo.ts app/src/lib/seo.test.ts
git commit -m "$(cat <<'EOF'
feat(seo): useDocumentMeta hook with SITE_URL/SITE_NAME exports

Tiny in-house hook (no react-helmet dep) that sets document.title
on mount and restores on unmount. If a description is passed AND
a <meta name="description"> tag exists, updates and restores that
too. No-op on description when the tag is absent.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Wire `useDocumentMeta` into the three pages

**Files:**
- Modify: `app/src/pages/WorkspacePage.tsx` (top of the `WorkspacePage` function body)
- Modify: `app/src/pages/DecksPage.tsx` (top of the `DecksPage` function body)
- Modify: `app/src/pages/DeckGraphPage.tsx` (top of the `DeckGraphPage` function body)

### - [ ] Step 2.1: Edit WorkspacePage

In `app/src/pages/WorkspacePage.tsx`:

Add this import alongside the existing imports near the top of the file:

```ts
import { useDocumentMeta } from '../lib/seo';
```

Then, as the **first line inside the `WorkspacePage` function body** (immediately after `export default function WorkspacePage() {`), add:

```ts
  useDocumentMeta('Browse — MTG Graph');
```

(No description override — `/` inherits the existing `index.html` description so search results match the OG tags.)

### - [ ] Step 2.2: Edit DecksPage

In `app/src/pages/DecksPage.tsx`:

Add this import:

```ts
import { useDocumentMeta } from '../lib/seo';
```

As the first line inside the `DecksPage` function body (right after `export default function DecksPage() {`), add:

```ts
  useDocumentMeta(
    'Decks — MTG Graph',
    'Build, import, and manage Magic: The Gathering decks. Import from MTG Arena, ManaBox, or paste a decklist.',
  );
```

### - [ ] Step 2.3: Edit DeckGraphPage

In `app/src/pages/DeckGraphPage.tsx`:

Add this import:

```ts
import { useDocumentMeta } from '../lib/seo';
```

As the first line inside the `DeckGraphPage` function body (right after `export default function DeckGraphPage() {`), add:

```ts
  useDocumentMeta(
    'Deck Graph — MTG Graph',
    'Visualize card interactions and synergies in your Magic: The Gathering deck.',
  );
```

### - [ ] Step 2.4: Run the app test suite to verify nothing broke

```bash
cd app && npm test
```

Expected: all tests PASS (including the new `seo.test.ts`).

### - [ ] Step 2.5: Commit

```bash
git add app/src/pages/WorkspacePage.tsx app/src/pages/DecksPage.tsx app/src/pages/DeckGraphPage.tsx
git commit -m "$(cat <<'EOF'
feat(seo): per-route document titles and descriptions

Workspace ("Browse"), DecksPage ("Decks"), and DeckGraphPage
("Deck Graph") now set their own document.title and (where
applicable) override the meta description for richer SERP
snippets.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: `app/index.html` static head upgrades

**Files:**
- Modify: `app/index.html`

### - [ ] Step 3.1: Replace `index.html` with the upgraded version

Replace the entire contents of `app/index.html` with:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#0c0a0d" />
    <meta name="robots" content="index, follow" />
    <meta name="application-name" content="MTG Graph" />

    <title>MTG Graph</title>
    <meta
      name="description"
      content="Browse every Magic: The Gathering Standard card as a searchable interaction graph. Find synergies, build decks, and explore mechanics across 6k+ cards."
    />

    <link rel="canonical" href="https://mtg-graph.com/" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon.ico" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700&family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Manrope:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600&display=swap"
    />

    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="MTG Graph" />
    <meta property="og:locale" content="en_US" />
    <meta property="og:url" content="https://mtg-graph.com/" />
    <meta property="og:title" content="MTG Graph — Standard card interactions & deck builder" />
    <meta
      property="og:description"
      content="Browse every MTG Standard card as a searchable interaction graph. Find synergies, build decks, and explore mechanics."
    />
    <meta property="og:image" content="https://mtg-graph.com/og-image.png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="MTG Graph — a card interaction graph for Magic: The Gathering Standard" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="MTG Graph" />
    <meta
      name="twitter:description"
      content="Browse every MTG Standard card as a searchable interaction graph."
    />
    <meta name="twitter:image" content="https://mtg-graph.com/og-image.png" />

    <script type="application/ld+json">
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
    </script>
  </head>
  <body>
    <noscript>
      <div style="max-width: 640px; margin: 4rem auto; padding: 0 1.5rem; font-family: system-ui, -apple-system, sans-serif; color: #e8e0d0; background: #0c0a0d;">
        <h1 style="font-size: 1.75rem; margin-bottom: 1rem;">MTG Graph</h1>
        <p style="line-height: 1.6;">
          MTG Graph is a browser-based tool for exploring Magic: The Gathering's
          Standard format as a searchable interaction graph. It indexes every
          Standard-legal card, tags their mechanics and abilities, and surfaces
          the synergies between them so you can build smarter decks and discover
          combos you'd otherwise miss.
        </p>
        <p style="line-height: 1.6; margin-top: 1rem;">
          The full experience requires JavaScript. Please enable it, or visit
          the project on
          <a href="https://github.com/mrosata/mtg-graph" style="color: #d4a44a;">GitHub</a>.
        </p>
      </div>
    </noscript>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Notes on the changes:
- New: `<meta name="robots">`, `<meta name="application-name">`, `<link rel="canonical">`, `og:site_name`, `og:locale`, `og:url`, `og:image:alt`, JSON-LD script, `<noscript>` block.
- Changed: `og:image` and `twitter:image` are now absolute URLs (`https://mtg-graph.com/og-image.png`).
- Preserved: charset, viewport, theme-color, title, existing description, all icon/font links, all existing OG/Twitter tags by content.

### - [ ] Step 3.2: Run the full project test gate

From repo root:

```bash
npm test
```

Expected: all pipeline + app tests PASS, vite build succeeds. (The build step in `npm test` catches any HTML/TS issues.)

### - [ ] Step 3.3: Verify the noscript content shows in the built bundle

```bash
grep -c "MTG Graph is a browser-based tool" app/dist/index.html
```

Expected: `1`.

### - [ ] Step 3.4: Commit

```bash
git add app/index.html
git commit -m "$(cat <<'EOF'
feat(seo): canonical URL, JSON-LD, absolute OG image, noscript fallback

Adds the missing static head pieces for proper indexing and rich
social previews:
- <link rel="canonical">, <meta name="robots">
- og:url, og:site_name, og:locale, og:image:alt
- absolute URLs for og:image and twitter:image
- JSON-LD WebApplication schema for rich-results eligibility
- <noscript> body content so JS-less crawlers see substance
- application-name meta

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: `sitemap.xml` and `robots.txt`

**Files:**
- Create: `app/public/sitemap.xml`
- Modify: `app/public/robots.txt`

### - [ ] Step 4.1: Create `sitemap.xml`

Create `app/public/sitemap.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://mtg-graph.com/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://mtg-graph.com/decks</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://mtg-graph.com/graph</loc>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>
</urlset>
```

### - [ ] Step 4.2: Update `robots.txt`

Replace the entire contents of `app/public/robots.txt` with:

```
User-agent: *
Allow: /

Sitemap: https://mtg-graph.com/sitemap.xml
```

### - [ ] Step 4.3: Build and verify both files end up in `dist/`

```bash
cd app && npm run build
ls dist/sitemap.xml dist/robots.txt
grep "mtg-graph.com/sitemap.xml" dist/robots.txt
grep "https://mtg-graph.com/decks" dist/sitemap.xml
```

Expected: both `ls` lines succeed; both `grep` lines emit one match.

### - [ ] Step 4.4: Commit

```bash
git add app/public/sitemap.xml app/public/robots.txt
git commit -m "$(cat <<'EOF'
feat(seo): sitemap.xml and robots.txt Sitemap directive

Three-URL sitemap (Browse, Decks, Deck Graph) and Sitemap:
pointer from robots.txt so search engines can discover all
routes from a single fetch.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Final verification

### - [ ] Step 5.1: Run the full gate one more time

From repo root:

```bash
npm test
```

Expected: all green.

### - [ ] Step 5.2: Inspect the built `index.html` once

```bash
grep -E '(canonical|og:url|application/ld\+json|noscript)' app/dist/index.html | wc -l
```

Expected: `>= 4` (one each for canonical, og:url, JSON-LD type, noscript opener).

### - [ ] Step 5.3: Manual post-deploy checks (after the next deploy)

These are the human-driven steps you'll run AFTER `mtg-graph.com` serves the new build. They cannot be automated from this plan.

- https://search.google.com/test/rich-results — paste `https://mtg-graph.com/` — should detect the `WebApplication` schema with zero errors.
- https://cards-dev.twitter.com/validator — paste `https://mtg-graph.com/` — should show a `summary_large_image` card with the og-image.
- https://developers.facebook.com/tools/debug/ — paste `https://mtg-graph.com/` — should pull the absolute og-image cleanly. If it shows a cached old version, click "Scrape Again".
- `curl -sI https://mtg-graph.com/sitemap.xml` — `HTTP/2 200`.
- `curl -sI https://mtg-graph.com/robots.txt` — `HTTP/2 200`.
- `curl -s 'view-source:https://mtg-graph.com/'` or browser View Source — confirm the `<noscript>` block is present.

(Optional follow-up after a few days: submit the sitemap in Google Search Console at `https://search.google.com/search-console`.)
