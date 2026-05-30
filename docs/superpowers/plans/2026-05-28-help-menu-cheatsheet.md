# Help Menu Cheatsheet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Cheatsheet" entry to the existing "?" help menu that opens a modal explaining the 12 tag families, how to read a card's tags, and what an "interaction" is, using real cards from the current artifact as worked examples.

**Architecture:** One new modal component (`CheatsheetModal`) opened from `HelpMenu` via local state. Three scrollable sections inside the modal: families grid (data-driven from `FAMILIES` in `tagFamilies.ts`), an annotated example card, and a worked effect→consumer pair. Example cards are referenced by hardcoded `oracleId` and looked up at render time from `useGraphStore`. Card clicks set `?card=<oracleId>` and navigate to `/`, opening the existing `CardDetailDrawer`. Missing examples render a small placeholder.

**Tech Stack:** React 18, TypeScript, Tailwind, Zustand (`useGraphStore`), react-router-dom (`useNavigate`), Vitest + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-05-28-help-menu-cheatsheet-design.md`

---

## File Structure

**New files:**
- `app/src/components/CheatsheetModal.tsx` — the modal component, including the `CHEATSHEET_EXAMPLES` constant and the three section sub-components inlined in the same file.
- `app/src/components/CheatsheetModal.test.tsx` — component tests.

**Modified files:**
- `app/src/wizard/HelpMenu.tsx` — adds the "Cheatsheet" menu item, local `cheatsheetOpen` state, and conditional render of `<CheatsheetModal />`.
- `app/src/wizard/HelpMenu.test.tsx` — adds one test for menu → modal open.

No store changes, no route changes, no `wizardStore` changes.

---

## Task 1: Pick example cards from the current artifact

**Files:**
- Read: `app/public/data/cards-standard.json` (gitignored — must be built first; see commands below)

**Purpose:** Find three concrete `oracleId`s to hardcode into `CHEATSHEET_EXAMPLES` so subsequent tasks have real data to work against.

### Constraints

- `readingCard`: one card whose `tags` array contains at least one tag of each `axis`: `'effect'`, `'trigger'`, `'condition'`. Prefer a recognizable name and a short oracle text. A common pattern is "When [this card] enters" + an ETB effect + a "matters" condition.
- `interactionPair.effect`: a card whose `tags` array contains the chosen `effectTag`.
- `interactionPair.consumer`: a card whose `tags` array contains the chosen `consumerTag`, AND which appears in the graph's edges as the target of an edge from the effect card. The pair `(effect, consumer, effectTag, consumerTag)` must exist as an `InteractionEdge` in `artifact.edges`.

- [ ] **Step 1: Build the artifact if not present**

```bash
ls app/public/data/cards-standard.json 2>/dev/null || npm run build:cards -- --standard
```

Expected: file exists after this step.

- [ ] **Step 2: Find a `readingCard` candidate**

Run the helper below from the repo root. It scans the artifact for cards with all three axes present in their tags and prints the first ten matches.

```bash
node -e "
const fs = require('fs');
const a = JSON.parse(fs.readFileSync('app/public/data/cards-standard.json', 'utf8'));
const hits = a.cards.filter(c => {
  const axes = new Set(c.tags.map(t => t.axis));
  return axes.has('effect') && axes.has('trigger') && axes.has('condition');
}).slice(0, 10);
for (const c of hits) {
  console.log(c.oracleId, '|', c.name, '|', c.tags.map(t => t.tagId).join(','));
}
"
```

Expected: one or more lines. Pick the first card whose name and tag mix would make a clean example (avoid niche/obscure cards). Record its `oracleId` and `name`.

- [ ] **Step 3: Find an `interactionPair` candidate**

Run the helper below to find a clean effect→consumer pair. It prefers `effect.deals_damage` ↔ `trigger.damage_dealt` (recognizable mechanic) but falls back to any pair if those aren't present.

```bash
node -e "
const fs = require('fs');
const a = JSON.parse(fs.readFileSync('app/public/data/cards-standard.json', 'utf8'));
const byId = Object.fromEntries(a.cards.map(c => [c.oracleId, c]));
const candidates = a.edges.filter(e =>
  e.reason.sourceTagId === 'effect.deals_damage' &&
  e.reason.targetTagId === 'trigger.damage_dealt'
);
const list = candidates.length ? candidates : a.edges;
for (const e of list.slice(0, 10)) {
  const s = byId[e.source], t = byId[e.target];
  if (!s || !t) continue;
  console.log(s.name, '(' + e.reason.sourceTagId + ')', '→', t.name, '(' + e.reason.targetTagId + ')');
  console.log('  ', e.source, e.target);
}
"
```

Expected: at least one printed pair. Pick the first pair where both names are recognizable. Record `effect.oracleId`, `consumer.oracleId`, `effectTag`, `consumerTag`.

- [ ] **Step 4: Record the chosen IDs**

Write the three chosen oracle IDs and tag IDs to a scratch file or note them — they will be hardcoded in Task 2, Step 2.

No commit at this step (no files changed yet).

---

## Task 2: Stub out `CheatsheetModal` with the examples constant

**Files:**
- Create: `app/src/components/CheatsheetModal.tsx`

- [ ] **Step 1: Create the file with the constant and a no-op default export**

```tsx
// app/src/components/CheatsheetModal.tsx

type Props = {
  onClose: () => void;
};

export const CHEATSHEET_EXAMPLES = {
  readingCard: 'REPLACE_WITH_ORACLE_ID_FROM_TASK_1',
  interactionPair: {
    effect: 'REPLACE_WITH_EFFECT_ORACLE_ID',
    consumer: 'REPLACE_WITH_CONSUMER_ORACLE_ID',
    effectTag: 'effect.deals_damage',
    consumerTag: 'trigger.damage_dealt',
  },
} as const;

export default function CheatsheetModal(_props: Props) {
  return null;
}
```

- [ ] **Step 2: Replace the placeholders with the IDs picked in Task 1**

Substitute the three oracle IDs and (if Task 1 fell back to a different pair) the two tag IDs.

- [ ] **Step 3: Verify the file type-checks**

Run from `app/`:

```bash
npm run build
```

Expected: build succeeds (the file isn't used yet but it must compile).

- [ ] **Step 4: Commit**

```bash
git add app/src/components/CheatsheetModal.tsx
git commit -m "feat(cheatsheet): scaffold CheatsheetModal with examples constant"
```

---

## Task 3: Test — modal renders all 12 family labels

**Files:**
- Create: `app/src/components/CheatsheetModal.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// app/src/components/CheatsheetModal.test.tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CheatsheetModal, { CHEATSHEET_EXAMPLES } from './CheatsheetModal';
import { useGraphStore } from '../stores/graphStore';
import { FAMILIES } from '../lib/tagFamilies';
import type { Card, TagDef } from '@shared/types';

function card(id: string, name: string, tags: Card['tags'] = []): Card {
  return {
    oracleId: id, name, set: 't', printings: ['t'], collectorNumber: '1',
    manaCost: null, cmc: 0, colors: [], colorIdentity: [],
    typeLine: '', types: [], subtypes: [], supertypes: [],
    oracleText: '', keywords: [], power: null, toughness: null,
    rarity: 'common', imageUrl: '', tags,
  };
}

function seedStoreWithExamples() {
  // Reading-card tags use IDs that are *distinct* from the pair's tag IDs so
  // section C's text assertions (which look up the pair's tag IDs) don't
  // accidentally also match section B's bullets.
  const readingTags: Card['tags'] = [
    { tagId: 'effect.create_token', axis: 'effect', evidence: '' },
    { tagId: 'trigger.creature_etb', axis: 'trigger', evidence: '' },
    { tagId: 'condition.cares_artifacts', axis: 'condition', evidence: '' },
  ];
  const pairEffectTag: Card['tags'][number] = {
    tagId: CHEATSHEET_EXAMPLES.interactionPair.effectTag, axis: 'effect', evidence: '',
  };
  const pairConsumerTag: Card['tags'][number] = {
    tagId: CHEATSHEET_EXAMPLES.interactionPair.consumerTag, axis: 'trigger', evidence: '',
  };
  const tagDefs: TagDef[] = [
    { tagId: 'effect.create_token', axis: 'effect', label: 'Creates tokens', description: '', pairsWith: [] },
    { tagId: 'trigger.creature_etb', axis: 'trigger', label: 'On creature ETB', description: '', pairsWith: [] },
    { tagId: 'condition.cares_artifacts', axis: 'condition', label: 'Cares about artifacts', description: '', pairsWith: [] },
    { tagId: pairEffectTag.tagId, axis: 'effect', label: 'Pair effect', description: '', pairsWith: [] },
    { tagId: pairConsumerTag.tagId, axis: 'trigger', label: 'Pair consumer', description: '', pairsWith: [] },
  ];
  useGraphStore.setState({
    cards: new Map([
      [CHEATSHEET_EXAMPLES.readingCard, card(CHEATSHEET_EXAMPLES.readingCard, 'ReadingExample', readingTags)],
      [CHEATSHEET_EXAMPLES.interactionPair.effect, card(CHEATSHEET_EXAMPLES.interactionPair.effect, 'EffectExample', [pairEffectTag])],
      [CHEATSHEET_EXAMPLES.interactionPair.consumer, card(CHEATSHEET_EXAMPLES.interactionPair.consumer, 'ConsumerExample', [pairConsumerTag])],
    ]),
    edges: new Map(),
    edgesInbound: new Map(),
    tagCatalog: new Map(tagDefs.map((t) => [t.tagId, t])),
    ruleVersion: 't',
    status: 'ready',
  });
}

function renderModal(onClose = vi.fn()) {
  return render(
    <MemoryRouter>
      <CheatsheetModal onClose={onClose} />
    </MemoryRouter>,
  );
}

describe('CheatsheetModal', () => {
  beforeEach(() => {
    seedStoreWithExamples();
  });

  it('renders all 12 family labels', () => {
    renderModal();
    for (const fam of FAMILIES) {
      expect(screen.getByText(fam.label)).toBeInTheDocument();
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

From `app/`:

```bash
npm test -- CheatsheetModal
```

Expected: FAIL (the component returns `null` so no labels render).

- [ ] **Step 3: Implement the modal shell with section A only**

Replace `app/src/components/CheatsheetModal.tsx` with:

```tsx
// app/src/components/CheatsheetModal.tsx
import { useEffect } from 'react';
import { FAMILIES } from '../lib/tagFamilies';

type Props = {
  onClose: () => void;
};

export const CHEATSHEET_EXAMPLES = {
  readingCard: 'REPLACE_WITH_ORACLE_ID_FROM_TASK_1',
  interactionPair: {
    effect: 'REPLACE_WITH_EFFECT_ORACLE_ID',
    consumer: 'REPLACE_WITH_CONSUMER_ORACLE_ID',
    effectTag: 'effect.deals_damage',
    consumerTag: 'trigger.damage_dealt',
  },
} as const;

export default function CheatsheetModal({ onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-neutral-700 bg-neutral-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cheatsheet-title"
      >
        <header className="flex items-center justify-between border-b border-neutral-800 px-5 py-3">
          <h2 id="cheatsheet-title" className="text-lg font-semibold">Cheatsheet</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close cheatsheet"
            className="rounded p-1 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100"
          >
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4 text-sm text-neutral-200">
          <section aria-labelledby="cs-families">
            <h3 id="cs-families" className="mb-1 text-base font-semibold">Tag families</h3>
            <p className="mb-3 text-neutral-400">
              Tags throughout the app are colored by family. Here's what each one means.
            </p>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {FAMILIES.map((fam) => (
                <li key={fam.id} className="flex items-start gap-2 rounded border border-neutral-800 p-2">
                  <span
                    aria-hidden="true"
                    className="mt-1 inline-block h-3 w-3 shrink-0 rounded-sm"
                    style={{ background: fam.color }}
                  />
                  <div className="min-w-0">
                    <div className="font-medium">{fam.label}</div>
                    <div className="text-xs text-neutral-400">{fam.description}</div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- CheatsheetModal
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/src/components/CheatsheetModal.tsx app/src/components/CheatsheetModal.test.tsx
git commit -m "feat(cheatsheet): modal shell + family-grid section"
```

---

## Task 4: Test — Esc and backdrop click close the modal

**Files:**
- Modify: `app/src/components/CheatsheetModal.test.tsx`

- [ ] **Step 1: Add failing tests**

Append inside `describe('CheatsheetModal', ...)`:

```tsx
  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn();
    renderModal(onClose);
    // Use fireEvent.keyDown on window via document
    const ev = new KeyboardEvent('keydown', { key: 'Escape' });
    window.dispatchEvent(ev);
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when the backdrop is clicked', () => {
    const onClose = vi.fn();
    renderModal(onClose);
    // The dialog's parent (backdrop) is the element with bg-black/60.
    const dialog = screen.getByRole('dialog');
    const backdrop = dialog.parentElement!;
    backdrop.click();
    expect(onClose).toHaveBeenCalled();
  });
```

- [ ] **Step 2: Run tests to verify both pass**

```bash
npm test -- CheatsheetModal
```

Expected: PASS (the shell from Task 3 already wires Esc and backdrop click).

- [ ] **Step 3: Commit**

```bash
git add app/src/components/CheatsheetModal.test.tsx
git commit -m "test(cheatsheet): Esc + backdrop dismissal"
```

---

## Task 5: Test — section B renders the example card with annotated bullets

**Files:**
- Modify: `app/src/components/CheatsheetModal.test.tsx`
- Modify: `app/src/components/CheatsheetModal.tsx`

- [ ] **Step 1: Add failing test for section B**

Append inside `describe('CheatsheetModal', ...)`:

```tsx
  it('renders the "Reading a card" section with the example card name and the three prefix bullets', () => {
    renderModal();
    expect(screen.getByRole('heading', { name: /reading a card/i })).toBeInTheDocument();
    expect(screen.getByText('ReadingExample')).toBeInTheDocument();
    // Three bullets keyed by the three axis labels:
    expect(screen.getByText(/things this card does/i)).toBeInTheDocument();
    expect(screen.getByText(/fires? when something happens/i)).toBeInTheDocument();
    expect(screen.getByText(/what this card cares about/i)).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- CheatsheetModal
```

Expected: FAIL — "Reading a card" heading not found.

- [ ] **Step 3: Implement section B**

In `app/src/components/CheatsheetModal.tsx`, add imports at the top:

```tsx
import { useGraphStore } from '../stores/graphStore';
import ManaCost from './ManaCost';
import type { Card, CardTag } from '@shared/types';
```

Then add a helper component below the `CHEATSHEET_EXAMPLES` constant:

```tsx
function findTagByAxis(tags: CardTag[], axis: CardTag['axis']): CardTag | undefined {
  return tags.find((t) => t.axis === axis);
}

function MissingExample() {
  return (
    <p className="italic text-neutral-500">Example card unavailable in this set.</p>
  );
}

function ExampleCardRow({ card }: { card: Card }) {
  return (
    <div className="flex items-center gap-2 rounded border border-neutral-800 bg-neutral-950 px-2 py-1">
      <ManaCost cost={card.manaCost} />
      <span className="font-medium">{card.name}</span>
    </div>
  );
}
```

Then add a new section inside the scrollable body, after the families section:

```tsx
          <hr className="my-5 border-neutral-800" />

          <section aria-labelledby="cs-reading">
            <h3 id="cs-reading" className="mb-1 text-base font-semibold">Reading a card</h3>
            <p className="mb-3 text-neutral-400">
              Every card carries one or more tags. The prefix tells you what kind of thing the tag represents.
            </p>
            <ReadingCardBlock />
          </section>
```

Add the `ReadingCardBlock` component:

```tsx
function ReadingCardBlock() {
  const card = useGraphStore((s) => s.cards.get(CHEATSHEET_EXAMPLES.readingCard));
  if (!card) return <MissingExample />;
  const effectTag = findTagByAxis(card.tags, 'effect');
  const triggerTag = findTagByAxis(card.tags, 'trigger');
  const conditionTag = findTagByAxis(card.tags, 'condition');
  return (
    <div className="space-y-3">
      <ExampleCardRow card={card} />
      <ul className="space-y-2 text-neutral-300">
        {effectTag && (
          <li>
            <code className="rounded bg-amber-950 px-1 text-amber-200">{effectTag.tagId}</code>
            {' — Things this card does.'}
          </li>
        )}
        {triggerTag && (
          <li>
            <code className="rounded bg-sky-950 px-1 text-sky-200">{triggerTag.tagId}</code>
            {' — Fires when something happens.'}
          </li>
        )}
        {conditionTag && (
          <li>
            <code className="rounded bg-violet-950 px-1 text-violet-200">{conditionTag.tagId}</code>
            {' — What this card cares about.'}
          </li>
        )}
      </ul>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- CheatsheetModal
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/src/components/CheatsheetModal.tsx app/src/components/CheatsheetModal.test.tsx
git commit -m "feat(cheatsheet): 'Reading a card' section with annotated example"
```

---

## Task 6: Test — section C renders the worked interaction pair

**Files:**
- Modify: `app/src/components/CheatsheetModal.test.tsx`
- Modify: `app/src/components/CheatsheetModal.tsx`

- [ ] **Step 1: Add failing test for section C**

Append inside `describe('CheatsheetModal', ...)`:

```tsx
  it('renders the "What\'s an interaction?" section with both pair card names and the tag labels', () => {
    renderModal();
    expect(screen.getByRole('heading', { name: /what's an interaction/i })).toBeInTheDocument();
    expect(screen.getByText('EffectExample')).toBeInTheDocument();
    expect(screen.getByText('ConsumerExample')).toBeInTheDocument();
    expect(screen.getByText(CHEATSHEET_EXAMPLES.interactionPair.effectTag)).toBeInTheDocument();
    expect(screen.getByText(CHEATSHEET_EXAMPLES.interactionPair.consumerTag)).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- CheatsheetModal
```

Expected: FAIL — "What's an interaction?" heading not found.

- [ ] **Step 3: Implement section C**

Add imports at the top of `CheatsheetModal.tsx`:

```tsx
import { useNavigate } from 'react-router-dom';
```

Add the section to the scrollable body, after the section B block:

```tsx
          <hr className="my-5 border-neutral-800" />

          <section aria-labelledby="cs-interaction">
            <h3 id="cs-interaction" className="mb-1 text-base font-semibold">What's an interaction?</h3>
            <p className="mb-3 text-neutral-400">
              Cards interact when one card's effect matches what another card cares about.
              The graph builder links every such pair into an edge.
            </p>
            <InteractionPairBlock onClose={onClose} />
            <p className="mt-3 text-xs text-neutral-500">
              Browse any card's detail panel and you'll see all of its interactions listed under Interactions.
            </p>
          </section>
```

Add the `InteractionPairBlock` component (keep it in the same file):

```tsx
function InteractionPairBlock({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const effectCard = useGraphStore((s) => s.cards.get(CHEATSHEET_EXAMPLES.interactionPair.effect));
  const consumerCard = useGraphStore((s) => s.cards.get(CHEATSHEET_EXAMPLES.interactionPair.consumer));
  if (!effectCard || !consumerCard) return <MissingExample />;

  const open = (oracleId: string) => {
    onClose();
    navigate(`/?card=${encodeURIComponent(oracleId)}`);
  };

  return (
    <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
      <button
        type="button"
        onClick={() => open(effectCard.oracleId)}
        className="flex-1 rounded border border-neutral-800 bg-neutral-950 px-2 py-2 text-left hover:border-amber-700"
      >
        <ExampleCardRow card={effectCard} />
        <div className="mt-1 text-xs text-amber-200">
          {CHEATSHEET_EXAMPLES.interactionPair.effectTag}
        </div>
      </button>
      <div className="flex flex-col items-center text-xs text-neutral-500">
        <span aria-hidden="true">→</span>
        <span>pairs with</span>
      </div>
      <button
        type="button"
        onClick={() => open(consumerCard.oracleId)}
        className="flex-1 rounded border border-neutral-800 bg-neutral-950 px-2 py-2 text-left hover:border-amber-700"
      >
        <ExampleCardRow card={consumerCard} />
        <div className="mt-1 text-xs text-sky-200">
          {CHEATSHEET_EXAMPLES.interactionPair.consumerTag}
        </div>
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- CheatsheetModal
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/src/components/CheatsheetModal.tsx app/src/components/CheatsheetModal.test.tsx
git commit -m "feat(cheatsheet): worked interaction pair section"
```

---

## Task 7: Test — clicking an example card closes the modal and navigates to the drawer URL

**Files:**
- Modify: `app/src/components/CheatsheetModal.test.tsx`

- [ ] **Step 1: Add the navigate mock at the top of the test file**

Above the `describe(...)` block, add:

```tsx
const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});
```

(Place it after the existing imports.)

In `beforeEach`, add a reset:

```tsx
  beforeEach(() => {
    navigateMock.mockClear();
    seedStoreWithExamples();
  });
```

- [ ] **Step 2: Add failing test for the card-click flow**

Append inside `describe('CheatsheetModal', ...)`:

```tsx
  it('clicking the effect example closes the modal and navigates to /?card=<id>', () => {
    const onClose = vi.fn();
    renderModal(onClose);
    fireEvent.click(screen.getByRole('button', { name: /EffectExample/ }));
    expect(onClose).toHaveBeenCalled();
    expect(navigateMock).toHaveBeenCalledWith(
      `/?card=${encodeURIComponent(CHEATSHEET_EXAMPLES.interactionPair.effect)}`,
    );
  });

  it('clicking the consumer example closes the modal and navigates to /?card=<id>', () => {
    const onClose = vi.fn();
    renderModal(onClose);
    fireEvent.click(screen.getByRole('button', { name: /ConsumerExample/ }));
    expect(onClose).toHaveBeenCalled();
    expect(navigateMock).toHaveBeenCalledWith(
      `/?card=${encodeURIComponent(CHEATSHEET_EXAMPLES.interactionPair.consumer)}`,
    );
  });
```

Add `fireEvent` to the existing testing-library import at the top of the file:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
```

- [ ] **Step 3: Run tests to verify both pass**

```bash
npm test -- CheatsheetModal
```

Expected: PASS (the component already wires navigate + onClose).

- [ ] **Step 4: Commit**

```bash
git add app/src/components/CheatsheetModal.test.tsx
git commit -m "test(cheatsheet): card click navigates to drawer URL and closes modal"
```

---

## Task 8: Test — missing example renders the placeholder

**Files:**
- Modify: `app/src/components/CheatsheetModal.test.tsx`

- [ ] **Step 1: Add failing test**

Append inside `describe('CheatsheetModal', ...)`:

```tsx
  it('renders the placeholder when an example card is missing from the graph', () => {
    // Re-seed without the readingCard.
    useGraphStore.setState({
      cards: new Map([
        [CHEATSHEET_EXAMPLES.interactionPair.effect, card(CHEATSHEET_EXAMPLES.interactionPair.effect, 'EffectExample')],
        [CHEATSHEET_EXAMPLES.interactionPair.consumer, card(CHEATSHEET_EXAMPLES.interactionPair.consumer, 'ConsumerExample')],
      ]),
      edges: new Map(),
      edgesInbound: new Map(),
      tagCatalog: new Map(),
      ruleVersion: 't',
      status: 'ready',
    });
    renderModal();
    expect(screen.getByText(/example card unavailable in this set/i)).toBeInTheDocument();
    // Other sections still render.
    expect(screen.getByText('EffectExample')).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run test to verify it passes**

```bash
npm test -- CheatsheetModal
```

Expected: PASS (the `MissingExample` fallback is already wired in `ReadingCardBlock`).

- [ ] **Step 3: Commit**

```bash
git add app/src/components/CheatsheetModal.test.tsx
git commit -m "test(cheatsheet): missing example falls back to placeholder"
```

---

## Task 9: Wire the modal into HelpMenu

**Files:**
- Modify: `app/src/wizard/HelpMenu.tsx`
- Modify: `app/src/wizard/HelpMenu.test.tsx`

- [ ] **Step 1: Add failing test in HelpMenu.test.tsx**

Append inside the `describe('HelpMenu', ...)` block:

```tsx
  it('clicking "Cheatsheet" opens the cheatsheet modal', () => {
    renderAt('/');
    fireEvent.click(screen.getByRole('button', { name: /help/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /cheatsheet/i }));
    expect(screen.getByRole('dialog', { name: /cheatsheet/i })).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run test to verify it fails**

From `app/`:

```bash
npm test -- HelpMenu
```

Expected: FAIL — no menuitem named "Cheatsheet" exists.

- [ ] **Step 3: Modify `HelpMenu.tsx` to add the menu entry and modal**

Replace the contents of `app/src/wizard/HelpMenu.tsx` with:

```tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useWizardStore } from './wizardStore';
import { TOUR_IDS, tourForPathname, tourLabel, type TourId } from './selectors';
import CheatsheetModal from '../components/CheatsheetModal';

export default function HelpMenu() {
  const [open, setOpen] = useState(false);
  const [cheatsheetOpen, setCheatsheetOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pathname = useLocation().pathname;
  const pageTour: TourId | null = tourForPathname(pathname);
  const openTour = useWizardStore((s) => s.openTour);

  // Close popover on Esc.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  // Close popover on outside click.
  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open]);

  const launch = useCallback(
    (id: TourId) => {
      openTour(id, { reset: true });
      setOpen(false);
    },
    [openTour],
  );

  const openCheatsheet = useCallback(() => {
    setCheatsheetOpen(true);
    setOpen(false);
  }, []);

  return (
    <div ref={containerRef} className="relative ml-auto">
      <button
        type="button"
        aria-label="Help"
        aria-haspopup="menu"
        aria-expanded={open}
        data-tour-id={TOUR_IDS.navHelp}
        onClick={() => setOpen((o) => !o)}
        className="flex h-7 w-7 items-center justify-center rounded-full border border-neutral-700 text-sm text-neutral-300 hover:border-neutral-500 hover:text-neutral-100"
      >
        ?
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-9 z-50 w-56 overflow-hidden rounded border border-neutral-700 bg-neutral-900 text-sm shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            onClick={openCheatsheet}
            className="block w-full px-3 py-2 text-left text-neutral-200 hover:bg-neutral-800"
          >
            Cheatsheet
          </button>
          <hr className="border-neutral-800" />
          <button
            type="button"
            role="menuitem"
            onClick={() => launch('global')}
            className="block w-full px-3 py-2 text-left text-neutral-200 hover:bg-neutral-800"
          >
            Show {tourLabel('global')}
          </button>
          {pageTour && (
            <button
              type="button"
              role="menuitem"
              onClick={() => launch(pageTour)}
              className="block w-full px-3 py-2 text-left text-neutral-200 hover:bg-neutral-800"
            >
              Show {tourLabel(pageTour)}
            </button>
          )}
        </div>
      )}
      {cheatsheetOpen && <CheatsheetModal onClose={() => setCheatsheetOpen(false)} />}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify HelpMenu passes**

```bash
npm test -- HelpMenu
```

Expected: PASS (all existing tests + the new one).

- [ ] **Step 5: Run the full app test suite to confirm nothing else regressed**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add app/src/wizard/HelpMenu.tsx app/src/wizard/HelpMenu.test.tsx
git commit -m "feat(cheatsheet): add Cheatsheet entry to help menu"
```

---

## Task 10: Type-check, build, and manual verification in the dev server

**Files:** none modified.

- [ ] **Step 1: Run the root gate**

From the repo root:

```bash
npm test
```

Expected: pipeline + shared types pass, app vitest passes, `app/npm run build` (tsc + vite) succeeds.

- [ ] **Step 2: Start the dev server**

From `app/`:

```bash
npm run dev
```

Expected: server starts on http://localhost:5173.

- [ ] **Step 3: Open the cheatsheet manually**

In a browser, navigate to http://localhost:5173/, click the "?" button in the nav, then click "Cheatsheet".

Verify:
- Modal opens centered with a dimmed backdrop.
- All 12 family chips render with their colored swatches.
- "Reading a card" section shows the example card name and three bullets, each with one of its actual tag IDs.
- "What's an interaction?" section shows both pair cards and the tag IDs on each side.
- Pressing Esc closes the modal.
- Clicking outside the modal closes it.
- Clicking the × button closes it.

- [ ] **Step 4: Verify the card-click flow**

Reopen the cheatsheet. Click the effect card in section C.

Verify:
- The modal closes.
- The URL becomes `/?card=<effectOracleId>`.
- The card detail drawer opens on the right with that card.

Repeat with the consumer card.

- [ ] **Step 5: Verify the menu ordering and divider**

Reopen the help popover. Verify the items appear in this order:
1. Cheatsheet
2. (horizontal divider line)
3. Show app intro
4. Show {page} tour (when on `/`, `/decks`, `/deck`, or `/deck/graph`)

- [ ] **Step 6: If everything verifies, stop the dev server**

No commit at this step (no files changed). If any verification fails, fix and commit before continuing.

---

## Self-review notes

**Spec coverage check:**
- Goal (modal from "?" menu, three sections, real examples): Tasks 2–9.
- Section A (12 families grid): Task 3.
- Section B (reading a card with axis bullets): Task 5.
- Section C (worked pair, both clickable): Tasks 6, 7.
- Data lookup via `useGraphStore.cards.get`: Tasks 5, 6.
- Missing-example placeholder: Task 8.
- HelpMenu integration (menu item + divider + local state + conditional modal): Task 9.
- Esc, backdrop click, × button close: Task 3 (Esc + backdrop in shell), Task 4 (tests for both), close button rendered in shell.
- `aria-modal`, `role="dialog"`, `aria-labelledby`, close button `aria-label`: Task 3.
- Card click → `?card=<id>` then navigate: Task 6 implementation, Task 7 test.
- Tests: 1 (families), 2 (Esc), 3 (backdrop), 4 (section B render), 5 (section C render), 6 (effect click navigates), 7 (consumer click navigates), 8 (missing placeholder), 9 (menu opens modal). Spec lists 6 tests; this plan has 9 (it splits Esc/backdrop and effect/consumer click into separate tests for clarity — no spec violation).
- Non-goals respected: no auto-open, no keyboard shortcut, no route, no seen-state, no i18n, no other content sections.

**Placeholder scan:** None.

**Type consistency:**
- `CHEATSHEET_EXAMPLES` shape is defined once in Task 2 and referenced by the same property names throughout (`readingCard`, `interactionPair.effect`, `interactionPair.consumer`, `interactionPair.effectTag`, `interactionPair.consumerTag`).
- `Props = { onClose: () => void }` is declared in Task 2 and used unchanged in Tasks 3, 5, 6, 7, 9.
- `useGraphStore.setState` shape in the test seed matches `GraphState` in `app/src/stores/graphStore.ts` (`cards`, `edges`, `edgesInbound`, `tagCatalog`, `ruleVersion`, `status`).
