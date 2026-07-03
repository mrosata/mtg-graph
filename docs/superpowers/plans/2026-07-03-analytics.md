# Analytics & Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add free, no-hosting analytics to mtg-graph.com — Cloudflare Web Analytics for passive page stats plus GA4 custom events for feature usage.

**Architecture:** Cloudflare Web Analytics is enabled in the dashboard (zero code, auto-injected beacon). GA4 loads via a `gtag.js` snippet in `app/index.html` with automatic page views disabled; all events flow through a thin wrapper `app/src/lib/analytics.ts` that silently no-ops when `window.gtag` is absent (ad blocker, dev without ID). Components import typed helpers from the wrapper and never call `gtag` directly.

**Tech Stack:** GA4 (`gtag.js` from Google CDN), Cloudflare Web Analytics (dashboard toggle), Vitest + React Testing Library, existing React/Vite SPA.

**Spec:** `docs/superpowers/specs/2026-07-03-analytics-design.md`

## Global Constraints

- Never send user-entered strings (search text, deck names) as event params — only counts, types, and card names (public Scryfall data).
- No consent banner. A privacy note in the HelpMenu dropdown discloses analytics use.
- The wrapper guards every call with `typeof window.gtag !== 'function'` → silent no-op. No other error handling (repo convention: don't handle impossible scenarios).
- GA4 measurement ID placeholder is `G-XXXXXXXXXX` until the user supplies the real one (Task 1). All code tasks work with the placeholder.
- TypeScript `noUncheckedIndexedAccess: true` is on. Run app tests from `app/` with `npm test`; full repo gate is `npm test` from root.
- Commit messages end with the Co-Authored-By/Claude-Session trailer used in this repo's recent commits.

---

### Task 1: Manual dashboard setup (USER ACTION — not implementable by an agent)

**Files:** none.

**Interfaces:**
- Produces: the real GA4 measurement ID (`G-…`), which Task 2 substitutes for `G-XXXXXXXXXX`.

These steps are done by the user in browser dashboards. The implementer should ask the user to do them (or confirm they're done) but must NOT block on them — all code tasks proceed with the placeholder ID.

- [ ] **Step 1: Enable Cloudflare Web Analytics.** In the Cloudflare dashboard for the `mtg-graph.com` zone: left sidebar → **Analytics & Logs → Web Analytics** (on some plans it appears under **Speed → Optimization**). Click **Enable**, choose **automatic setup** (Cloudflare injects the beacon at the edge — no code change). Done; stats appear within minutes of the next visit.
- [ ] **Step 2: Create the GA4 property.** At analytics.google.com → Admin → **Create Property**. Name: `MTG Graph`. Timezone/currency: user's choice. Platform: **Web**, stream URL `https://mtg-graph.com`. Copy the **Measurement ID** (`G-…`) from the stream details page.
- [ ] **Step 3: Link Search Console.** GA4 Admin → Product links → **Search Console links** → Link, pick the existing `mtg-graph.com` Search Console property and the web stream from Step 2.
- [ ] **Step 4: Give the measurement ID to the implementer** (or edit `app/index.html` yourself after Task 2 lands, replacing both `G-XXXXXXXXXX` occurrences).

### Task 2: gtag.js snippet in index.html

**Files:**
- Modify: `app/index.html` (insert in `<head>`, right after the `<meta name="application-name" …>` line, ~line 8)

**Interfaces:**
- Produces: `window.gtag` (function) and `window.dataLayer` on page load, unless an ad blocker strips the script. `send_page_view: false` — SPA route tracking is manual (Task 4).

- [ ] **Step 1: Add the snippet.** In `app/index.html`, after the `<meta name="application-name" content="MTG Graph" />` line, insert:

```html
    <!-- Google tag (gtag.js) — SPA page_views are sent manually; see src/lib/analytics.ts -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag() {
        dataLayer.push(arguments);
      }
      gtag('js', new Date());
      gtag('config', 'G-XXXXXXXXXX', { send_page_view: false });
    </script>
```

If the user has already provided the real measurement ID, use it in both places instead of `G-XXXXXXXXXX`.

- [ ] **Step 2: Verify the build still passes.**

Run: `cd /Users/Dada/mtg-graph/app && npm run build`
Expected: build succeeds (the snippet is plain HTML; nothing imports it).

- [ ] **Step 3: Commit.**

```bash
git add app/index.html
git commit -m "feat(app): add GA4 gtag snippet (manual page_view mode)"
```

### Task 3: analytics.ts wrapper (TDD)

**Files:**
- Create: `app/src/lib/analytics.ts`
- Test: `app/src/lib/analytics.test.ts`

**Interfaces:**
- Consumes: `window.gtag` if present (Task 2).
- Produces (all later tasks import from `../lib/analytics` or `./lib/analytics`):
  - `trackEvent(name: string, params?: Record<string, string | number>): void`
  - `trackPageView(path: string): void`
  - `trackCardViewed(cardName: string): void`
  - `trackFilterApplied(filterType: 'color' | 'set' | 'tag' | 'rarity'): void`
  - `trackSearchDebounced(field: 'name' | 'text', queryLength: number): void`
  - `trackInteractionExplored(): void`
  - `trackDeckCreated(): void`
  - `trackDeckCardAdded(deckSize: number): void`
  - `trackDeckExported(format: 'arena' | 'dek'): void`
  - `trackMtgaImportUsed(): void`

- [ ] **Step 1: Write the failing tests.** Create `app/src/lib/analytics.test.ts`:

```ts
import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  trackEvent,
  trackPageView,
  trackCardViewed,
  trackDeckExported,
  trackSearchDebounced,
} from './analytics';

describe('analytics', () => {
  afterEach(() => {
    delete window.gtag;
    vi.useRealTimers();
  });

  it('no-ops without throwing when window.gtag is absent', () => {
    expect(() => trackEvent('card_viewed', { card_name: 'Llanowar Elves' })).not.toThrow();
  });

  it('forwards event name and params to gtag', () => {
    const gtag = vi.fn();
    window.gtag = gtag;
    trackEvent('deck_created');
    expect(gtag).toHaveBeenCalledWith('event', 'deck_created', {});
  });

  it('trackPageView sends page_path', () => {
    const gtag = vi.fn();
    window.gtag = gtag;
    trackPageView('/decks');
    expect(gtag).toHaveBeenCalledWith('event', 'page_view', { page_path: '/decks' });
  });

  it('trackCardViewed sends card_name', () => {
    const gtag = vi.fn();
    window.gtag = gtag;
    trackCardViewed('Doctor Doom');
    expect(gtag).toHaveBeenCalledWith('event', 'card_viewed', { card_name: 'Doctor Doom' });
  });

  it('trackDeckExported sends export_format', () => {
    const gtag = vi.fn();
    window.gtag = gtag;
    trackDeckExported('arena');
    expect(gtag).toHaveBeenCalledWith('event', 'deck_exported', { export_format: 'arena' });
  });

  it('debounces search: only the last call fires, 1500ms after typing stops', () => {
    vi.useFakeTimers();
    const gtag = vi.fn();
    window.gtag = gtag;
    trackSearchDebounced('name', 3);
    trackSearchDebounced('name', 5);
    expect(gtag).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1500);
    expect(gtag).toHaveBeenCalledTimes(1);
    expect(gtag).toHaveBeenCalledWith('event', 'search_performed', {
      field: 'name',
      query_length: 5,
    });
  });

  it('clearing the search box cancels the pending event', () => {
    vi.useFakeTimers();
    const gtag = vi.fn();
    window.gtag = gtag;
    trackSearchDebounced('text', 4);
    trackSearchDebounced('text', 0);
    vi.advanceTimersByTime(3000);
    expect(gtag).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail.**

Run: `cd /Users/Dada/mtg-graph/app && npx vitest run src/lib/analytics.test.ts`
Expected: FAIL — cannot resolve `./analytics`.

- [ ] **Step 3: Write the implementation.** Create `app/src/lib/analytics.ts`:

```ts
// Thin wrapper around GA4's gtag. Components never call gtag directly; if the
// script is blocked or absent, every helper silently no-ops.
type EventParams = Record<string, string | number>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackEvent(name: string, params: EventParams = {}): void {
  if (typeof window.gtag !== 'function') return;
  window.gtag('event', name, params);
}

export function trackPageView(path: string): void {
  trackEvent('page_view', { page_path: path });
}

export function trackCardViewed(cardName: string): void {
  trackEvent('card_viewed', { card_name: cardName });
}

export type FilterType = 'color' | 'set' | 'tag' | 'rarity';

export function trackFilterApplied(filterType: FilterType): void {
  trackEvent('filter_applied', { filter_type: filterType });
}

const SEARCH_DEBOUNCE_MS = 1500;
let searchTimer: ReturnType<typeof setTimeout> | undefined;

// Search inputs fire onChange per keystroke; only report a search once typing
// stops, and never report the (private) query text — only its length.
export function trackSearchDebounced(field: 'name' | 'text', queryLength: number): void {
  clearTimeout(searchTimer);
  if (queryLength === 0) return;
  searchTimer = setTimeout(() => {
    trackEvent('search_performed', { field, query_length: queryLength });
  }, SEARCH_DEBOUNCE_MS);
}

export function trackInteractionExplored(): void {
  trackEvent('interaction_explored');
}

export function trackDeckCreated(): void {
  trackEvent('deck_created');
}

export function trackDeckCardAdded(deckSize: number): void {
  trackEvent('deck_card_added', { deck_size: deckSize });
}

export function trackDeckExported(format: 'arena' | 'dek'): void {
  trackEvent('deck_exported', { export_format: format });
}

export function trackMtgaImportUsed(): void {
  trackEvent('mtga_import_used');
}
```

- [ ] **Step 4: Run tests to verify they pass.**

Run: `cd /Users/Dada/mtg-graph/app && npx vitest run src/lib/analytics.test.ts`
Expected: 7 passed.

- [ ] **Step 5: Commit.**

```bash
git add app/src/lib/analytics.ts app/src/lib/analytics.test.ts
git commit -m "feat(app): analytics wrapper with gtag no-op guard and search debounce"
```

### Task 4: SPA page_view on route change

**Files:**
- Modify: `app/src/App.tsx`

**Interfaces:**
- Consumes: `trackPageView` from Task 3; `useLocation` from react-router-dom (already a dependency).

No new test — `App.test.tsx` exercises full-app rendering and the wrapper is already unit-tested; the spec designates the CardDetailDrawer test (Task 5) as the sole wiring pattern-proof.

- [ ] **Step 1: Wire it.** In `app/src/App.tsx`:

Change the react-router-dom import (top of file) from:

```tsx
import { Routes, Route, NavLink, Link } from 'react-router-dom';
```

to:

```tsx
import { Routes, Route, NavLink, Link, useLocation } from 'react-router-dom';
```

Add the import:

```tsx
import { trackPageView } from './lib/analytics';
```

Inside `App()`, after the `const activeDeck = useActiveDeck();` line, add:

```tsx
  const location = useLocation();

  useEffect(() => {
    trackPageView(location.pathname);
  }, [location.pathname]);
```

- [ ] **Step 2: Verify existing tests still pass.**

Run: `cd /Users/Dada/mtg-graph/app && npx vitest run src/App.test.tsx`
Expected: PASS (analytics no-ops in jsdom — no `window.gtag`).

- [ ] **Step 3: Commit.**

```bash
git add app/src/App.tsx
git commit -m "feat(app): manual GA4 page_view on SPA route change"
```

### Task 5: card_viewed in CardDetailDrawer (wiring pattern-proof test)

**Files:**
- Modify: `app/src/components/CardDetailDrawer.tsx`
- Test: `app/src/components/CardDetailDrawer.test.tsx` (append one test)

**Interfaces:**
- Consumes: `trackCardViewed` from Task 3.

- [ ] **Step 1: Write the failing test.** In `app/src/components/CardDetailDrawer.test.tsx`, the existing file already defines `dfcCard()` and `renderDrawer(card)` helpers and imports `vi`. Append a new describe block at the end of the file:

```tsx
describe('analytics wiring', () => {
  it('fires card_viewed with the card name when the drawer opens', () => {
    const gtag = vi.fn();
    window.gtag = gtag;
    renderDrawer(dfcCard());
    expect(gtag).toHaveBeenCalledWith('event', 'card_viewed', {
      card_name: 'Peter Parker // Amazing Spider-Man',
    });
    delete window.gtag;
  });
});
```

- [ ] **Step 2: Run test to verify it fails.**

Run: `cd /Users/Dada/mtg-graph/app && npx vitest run src/components/CardDetailDrawer.test.tsx`
Expected: the new test FAILS (gtag never called); existing tests pass.

- [ ] **Step 3: Wire it.** In `app/src/components/CardDetailDrawer.tsx`:

Add the import:

```tsx
import { trackCardViewed } from '../lib/analytics';
```

There is an existing effect keyed on the card identity at ~line 57:

```tsx
  useEffect(() => {
```

(the one whose dependency array is `[card.oracleId]`). Immediately after that effect, add a sibling effect:

```tsx
  useEffect(() => {
    trackCardViewed(card.name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.oracleId]);
```

(Keyed on `oracleId` so face-flips of the same card don't re-fire.)

- [ ] **Step 4: Run test to verify it passes.**

Run: `cd /Users/Dada/mtg-graph/app && npx vitest run src/components/CardDetailDrawer.test.tsx`
Expected: all PASS.

- [ ] **Step 5: Commit.**

```bash
git add app/src/components/CardDetailDrawer.tsx app/src/components/CardDetailDrawer.test.tsx
git commit -m "feat(app): fire card_viewed when card detail drawer opens"
```

### Task 6: filter_applied + search_performed in FilterPanel

**Files:**
- Modify: `app/src/components/FilterPanel.tsx`

**Interfaces:**
- Consumes: `trackFilterApplied`, `trackSearchDebounced` from Task 3.

No new test (pattern proven in Task 5; both helpers unit-tested in Task 3).

- [ ] **Step 1: Wire the four toggle handlers.** In `app/src/components/FilterPanel.tsx`, add the import:

```tsx
import { trackFilterApplied, trackSearchDebounced } from '../lib/analytics';
```

The component defines four toggles near the top of the function body (~lines 65–95): `toggleColor`, `toggleSet`, `toggleTag`, `toggleRarity`. Add one tracking call as the first line of each:

```tsx
  const toggleColor = (c: Color) => {
    trackFilterApplied('color');
    // …existing body unchanged
```

```tsx
  const toggleSet = (code: string) => {
    trackFilterApplied('set');
    // …existing body unchanged
```

```tsx
  const toggleTag = (id: string) => {
    trackFilterApplied('tag');
    // …existing body unchanged
```

```tsx
  const toggleRarity = (r: Rarity) => {
    trackFilterApplied('rarity');
    // …existing body unchanged
```

- [ ] **Step 2: Wire the two search inputs.** In the "Search" section (~lines 240–280) there are two text inputs. Change the card-name input's onChange from:

```tsx
              onChange={(e) => onChange({ ...value, name: e.target.value || undefined })}
```

to:

```tsx
              onChange={(e) => {
                trackSearchDebounced('name', e.target.value.length);
                onChange({ ...value, name: e.target.value || undefined });
              }}
```

and the oracle-text input's onChange from:

```tsx
              onChange={(e) => onChange({ ...value, text: e.target.value || undefined })}
```

to:

```tsx
              onChange={(e) => {
                trackSearchDebounced('text', e.target.value.length);
                onChange({ ...value, text: e.target.value || undefined });
              }}
```

- [ ] **Step 3: Verify existing tests still pass.**

Run: `cd /Users/Dada/mtg-graph/app && npx vitest run src/components/FilterPanel.test.tsx`
Expected: PASS.

- [ ] **Step 4: Commit.**

```bash
git add app/src/components/FilterPanel.tsx
git commit -m "feat(app): fire filter_applied and debounced search_performed from FilterPanel"
```

### Task 7: remaining event wirings (interactions, decks, export, MTGA import)

**Files:**
- Modify: `app/src/components/InteractionsPanel.tsx`
- Modify: `app/src/pages/DecksPage.tsx`
- Modify: `app/src/components/DeckPanel.tsx`
- Modify: `app/src/stores/deckStore.ts`
- Modify: `app/src/components/MtgaImportPanel.tsx`

**Interfaces:**
- Consumes: `trackInteractionExplored`, `trackDeckCreated`, `trackDeckCardAdded`, `trackDeckExported`, `trackMtgaImportUsed` from Task 3.

No new tests (pattern proven in Task 5; helpers unit-tested in Task 3). Existing test files for these components must stay green.

- [ ] **Step 1: interaction_explored.** In `app/src/components/InteractionsPanel.tsx`, add the import:

```tsx
import { trackInteractionExplored } from '../lib/analytics';
```

There is exactly one `onFocusCard(…)` call inside the component (~line 297), in a neighbor-list button:

```tsx
                onClick={() => {
                  setHoverUrl(null);
                  onFocusCard(n.oracleId);
                }}
```

Change it to:

```tsx
                onClick={() => {
                  setHoverUrl(null);
                  trackInteractionExplored();
                  onFocusCard(n.oracleId);
                }}
```

- [ ] **Step 2: deck_created and deck_exported (DecksPage).** In `app/src/pages/DecksPage.tsx`, add the import:

```tsx
import { trackDeckCreated, trackDeckExported } from '../lib/analytics';
```

In `handleCreate` (~line 94):

```tsx
  const handleCreate = async () => {
    await createDeck(`Untitled Deck ${decks.length + 1}`);
    trackDeckCreated();
    navigate('/');
  };
```

In `exportDeck` (~line 110), add tracking after the successful clipboard write:

```tsx
  const exportDeck = async (deck: Deck) => {
    const text = deckToArenaText(deck, cards);
    try {
      await navigator.clipboard.writeText(text);
      trackDeckExported('arena');
      const total = deck.workingCards.reduce((s, c) => s + c.count, 0);
      showToast(`Copied "${deck.name}" (${total} cards)`);
    } catch {
      showToast('Copy failed. Select the text and copy manually.');
    }
  };
```

- [ ] **Step 3: deck_exported (DeckPanel).** In `app/src/components/DeckPanel.tsx`, add the import:

```tsx
import { trackDeckExported } from '../lib/analytics';
```

Two export buttons (~lines 192–215). In the Arena-text button, after `await navigator.clipboard.writeText(text);` add:

```tsx
                    trackDeckExported('arena');
```

In the .dek button, after `await navigator.clipboard.writeText(xml);` add:

```tsx
                    trackDeckExported('dek');
```

(Both go inside the `try`, before the `showToast` call, mirroring Step 2.)

- [ ] **Step 4: deck_card_added.** In `app/src/stores/deckStore.ts`, add the import:

```ts
import { trackDeckCardAdded } from '../lib/analytics';
```

In the `addCard` action (~line 138), the body ends with:

```ts
    const updated = decks.find((d) => d.id === id);
    if (updated) await persist(updated);
    set({ decks });
```

Change to:

```ts
    const updated = decks.find((d) => d.id === id);
    if (updated) {
      await persist(updated);
      trackDeckCardAdded(updated.workingCards.reduce((s, c) => s + c.count, 0));
    }
    set({ decks });
```

Wiring in the store (rather than each button) covers every add path — AddToDeckButton, import flows, etc. — with one call site.

- [ ] **Step 5: mtga_import_used.** In `app/src/components/MtgaImportPanel.tsx`, add the import:

```tsx
import { trackMtgaImportUsed } from '../lib/analytics';
```

In `handleConfirm` (~line 300), after the `await importLibrary(state.libraryResult, state.filename);` line (~310), add:

```tsx
        trackMtgaImportUsed();
```

- [ ] **Step 6: Run the affected test files.**

Run: `cd /Users/Dada/mtg-graph/app && npx vitest run src/components/InteractionsPanel.test.tsx src/pages/DecksPage.test.tsx src/components/DeckPanel.test.tsx src/stores/deckStore.test.ts src/components/MtgaImportPanel.test.tsx`
Expected: all PASS (analytics no-ops without `window.gtag`).

- [ ] **Step 7: Commit.**

```bash
git add app/src/components/InteractionsPanel.tsx app/src/pages/DecksPage.tsx app/src/components/DeckPanel.tsx app/src/stores/deckStore.ts app/src/components/MtgaImportPanel.tsx
git commit -m "feat(app): wire interaction, deck, export, and MTGA import analytics events"
```

### Task 8: privacy note + full gate

**Files:**
- Modify: `app/src/wizard/HelpMenu.tsx`

**Interfaces:** none consumed or produced.

- [ ] **Step 1: Add the privacy note.** In `app/src/wizard/HelpMenu.tsx`, the dropdown (`role="menu"` div) currently ends with the optional page-tour button block:

```tsx
          {pageTour && (
            <button
              …
            </button>
          )}
        </div>
```

Immediately before that closing `</div>`, add:

```tsx
          <hr className="border-ink-line" />
          <p className="px-3 py-2 text-[11px] leading-snug text-vellum-dim">
            Usage is measured with Google Analytics and Cloudflare Web Analytics. No
            account, no deck contents, no search text is collected.
          </p>
```

- [ ] **Step 2: Run the full repo gate.**

Run: `cd /Users/Dada/mtg-graph && npm test`
Expected: pipeline tests, app vitest, and `app` build (tsc + vite) all pass. The build step is the one that catches TS errors vitest misses.

- [ ] **Step 3: Commit.**

```bash
git add app/src/wizard/HelpMenu.tsx
git commit -m "feat(app): analytics disclosure note in help menu"
```

- [ ] **Step 4: Deploy reminder (manual).** After deploying, verify in GA4's Realtime view that `page_view` and `card_viewed` events arrive, and that the Cloudflare Web Analytics dashboard shows visits. If the measurement ID is still `G-XXXXXXXXXX`, GA4 events silently go nowhere — swap in the real ID from Task 1 first.
