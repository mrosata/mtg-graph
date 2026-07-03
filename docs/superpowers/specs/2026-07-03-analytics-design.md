# Analytics & Tracking Design

**Date:** 2026-07-03
**Status:** Approved

## Goal

Understand how people use mtg-graph.com — traffic volume and sources, which features get used (browser vs. deck builder), and engagement depth (card views, interaction exploration, deck building). Zero cost, zero hosting, no backend.

## Decision

Hybrid of two free hosted services:

1. **Cloudflare Web Analytics** — passive page-level stats. The site's traffic already routes through Cloudflare; enabling Web Analytics in the dashboard auto-injects a cookieless 1 KB beacon. No code changes, no consent banner needed, not blocked by ad blockers. Covers: page views, unique visitors, referrers, geography, devices.

2. **GA4 (Google Analytics 4)** — custom feature-usage events. One `gtag.js` snippet in `app/index.html`, property linked to the existing Search Console property. Covers: funnels, retention, event parameters, Search Console query integration.

Rationale: Cloudflare gives honest baseline numbers (immune to ad blockers, cookieless); GA4 gives behavioral depth and Search Console integration. Alternatives considered: GA4-only (loses ~30% of traffic to ad blockers, weaker baseline) and Cloudflare-only (custom events too shallow — counts, no funnels).

## Privacy posture

- User preference: mild privacy lean, no consent banner.
- GA4 sets cookies on load; EU GDPR technically applies. Accepted as low-risk for a niche, primarily-US MTG tool.
- A short privacy note in the site footer/About area disclosing GA4 + Cloudflare analytics.
- Never send user-entered strings (search text, deck names) as event params — only counts, types, and card names (public Scryfall data).

## Architecture

### Infrastructure (no code)

- Enable Cloudflare Web Analytics for `mtg-graph.com` in the Cloudflare dashboard (auto-injection).
- Create GA4 property; link to Search Console.

### Code

- `app/index.html`: add the two-line `gtag.js` snippet with the GA4 measurement ID.
- `app/src/lib/analytics.ts`: thin wrapper module. Exports typed helpers (e.g. `trackEvent(name, params)` plus per-event convenience functions). Guards every call with `typeof window.gtag === 'function'` — if GA is blocked or absent, calls silently no-op. Components never call `gtag` directly.

### Custom events

| Event | Fired when | Params |
|---|---|---|
| `page_view` | SPA route change (GA4 needs manual page_view for client-side routing) | page path |
| `card_viewed` | CardDetailDrawer opens | card name |
| `filter_applied` | FilterPanel filter changes | filter type (tag/color/set/…) |
| `search_performed` | search box submit | query length only |
| `interaction_explored` | InteractionsPanel expanded / interaction clicked | — |
| `deck_created` | new deck created in DecksPage | — |
| `deck_card_added` | card added to a deck | deck size after add |
| `deck_exported` | deck export action | export format |
| `mtga_import_used` | MTGA import panel used | — |

### Resilience

- Ad blocker removes `gtag.js` → wrapper no-ops, app unaffected. No further error handling (repo convention: don't handle impossible scenarios).
- PWA: `gtag.js` loads from Google's CDN; existing Workbox runtime caching doesn't touch it. No service-worker changes.

## Testing

- Unit tests for `analytics.ts`: no-ops when `window.gtag` is absent; forwards name/params when present.
- One component test asserting CardDetailDrawer fires `card_viewed` (pattern proof; the other wirings follow the same shape and aren't exhaustively tested).
- E2E untouched.

## Out of scope

- Consent banner / cookie management.
- Self-hosted or paid analytics (Plausible, Umami, PostHog).
- Server-side or proxy-based event collection.
