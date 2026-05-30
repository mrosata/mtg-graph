# Mana symbols in card text — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render every `{...}` mana token in the app — card oracle text, deck row costs, and active-deck color pills — as proper MTG mana icons using the `mana-font` package.

**Architecture:** One global CSS import (`mana-font/css/mana.css`), a small `ManaSymbol` component that maps a single token (`{R}`, `{4}`, `{W/U}`, `{T}`, ...) to a Mana-font `<i class="ms ms-* ms-cost ms-shadow">` glyph, and an `OracleText` component that splits arbitrary text on `/(\{[^}]+\})/g` and renders the runs. `ManaCost` is rewritten as a thin wrapper that walks the same regex over a cost string — its public API is unchanged, so `DeckPanel` and `DecksPage` call sites upgrade automatically.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind, Vitest + React Testing Library, `mana-font@^1.18.0`.

**Spec:** `docs/superpowers/specs/2026-05-22-mana-symbols-design.md`

---

## File structure

| File | Role |
|---|---|
| `app/src/components/ManaSymbol.tsx` | (new) Single-token renderer. Maps one `{...}` to a Mana-font `<i>` with proper `aria-label`, or a small gray fallback pill for unknown tokens. |
| `app/src/components/ManaSymbol.test.tsx` | (new) Unit tests for `ManaSymbol`. |
| `app/src/components/OracleText.tsx` | (new) Splits a string into text + token runs, renders text as `<span>` and tokens via `<ManaSymbol>`. |
| `app/src/components/OracleText.test.tsx` | (new) Unit tests for `OracleText`. |
| `app/src/components/ManaCost.tsx` | (rewrite) Thin wrapper — walks `/\{[^}]+\}/g` over `cost` and emits `<ManaSymbol>` per match. Public API `{ cost: string \| null }` unchanged. |
| `app/src/components/CardDetailDrawer.tsx` | (modify line 44) Replace `{card.oracleText}` with `<OracleText text={card.oracleText} />`. |
| `app/src/main.tsx` | (modify) Add `import 'mana-font/css/mana.css';`. |
| `app/package.json` | (modify) Add `mana-font` dependency. |

Validation messages (`app/src/lib/legality.ts`) verified: messages never contain `{...}` tokens — no work needed there. Scope item (b) from the spec collapses to a no-op.

---

## Task 1: Install `mana-font` and load its CSS

**Files:**
- Modify: `app/package.json`
- Modify: `app/src/main.tsx`

- [ ] **Step 1: Install the package**

Run from repo root:

```bash
cd app && npm install mana-font@^1.18.0
```

Expected: `package.json` and `package-lock.json` update with `"mana-font": "^1.18.0"`.

- [ ] **Step 2: Import the CSS once at app entry**

In `app/src/main.tsx`, add the import right after the existing `./index.css` import. The block should read:

```ts
import App from './App';
import './index.css';
import 'mana-font/css/mana.css';
import { useGraphStore } from './stores/graphStore';
```

- [ ] **Step 3: Verify the app still builds**

```bash
cd app && npm run build
```

Expected: PASS. No TypeScript errors, no missing-asset errors. Vite resolves `mana-font/css/mana.css` and bundles the woff2 referenced from inside it.

- [ ] **Step 4: Commit**

```bash
git add app/package.json app/package-lock.json app/src/main.tsx
git commit -m "feat(app): add mana-font dependency and load its CSS"
```

---

## Task 2: `ManaSymbol` component (TDD)

**Files:**
- Create: `app/src/components/ManaSymbol.tsx`
- Test: `app/src/components/ManaSymbol.test.tsx`

### Background

A token looks like `{R}`, `{4}`, `{X}`, `{T}`, `{W/U}`, `{W/P}`, `{2/G}`, `{S}`, `{C}`, `{E}`. We strip the braces, then map to a Mana-font CSS class:

- single color/utility letter → lowercase: `R` → `ms-r`, `W` → `ms-w`, `C` → `ms-c`, `S` → `ms-s`, `E` → `ms-e`, `X` → `ms-x`, `Y` → `ms-y`, `Z` → `ms-z`.
- `T` (tap) → `ms-tap`, `Q` (untap) → `ms-untap`.
- numeric `0`–`20` → `ms-0` … `ms-20`.
- two-color hybrid `W/U` → `ms-wu`. Phyrexian `W/P` → `ms-wp`. Generic hybrid `2/G` → `ms-2g`. (Pattern: lowercase, drop the slash.)
- everything else → fallback gray pill with the raw inner text and `aria-label={inner}`.

`aria-label` should be human-readable so screen readers don't say "ms r":
- colors: `white`/`blue`/`black`/`red`/`green`
- `C` → `colorless`, `S` → `snow`, `E` → `energy`, `T` → `tap`, `Q` → `untap`
- numerics → the digits (e.g. `"4"`)
- `X`/`Y`/`Z` → `"X"`/`"Y"`/`"Z"`
- hybrids `W/U` → `"white or blue"`
- Phyrexian `W/P` → `"Phyrexian white"`

- [ ] **Step 1: Write the failing test**

Create `app/src/components/ManaSymbol.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ManaSymbol from './ManaSymbol';

describe('ManaSymbol', () => {
  it('renders {R} as red mana with ms-r class', () => {
    const { container } = render(<ManaSymbol token="{R}" />);
    const el = screen.getByLabelText('red');
    expect(el.className).toMatch(/\bms-r\b/);
    expect(el.className).toMatch(/\bms\b/);
    expect(el.className).toMatch(/\bms-cost\b/);
    expect(container.querySelector('i')).toBe(el);
  });

  it('renders {2} as numeric two', () => {
    render(<ManaSymbol token="{2}" />);
    const el = screen.getByLabelText('2');
    expect(el.className).toMatch(/\bms-2\b/);
  });

  it('renders {X} as ms-x', () => {
    render(<ManaSymbol token="{X}" />);
    const el = screen.getByLabelText('X');
    expect(el.className).toMatch(/\bms-x\b/);
  });

  it('renders {T} as ms-tap labelled tap', () => {
    render(<ManaSymbol token="{T}" />);
    const el = screen.getByLabelText('tap');
    expect(el.className).toMatch(/\bms-tap\b/);
  });

  it('renders {Q} as ms-untap labelled untap', () => {
    render(<ManaSymbol token="{Q}" />);
    const el = screen.getByLabelText('untap');
    expect(el.className).toMatch(/\bms-untap\b/);
  });

  it('renders {W/U} as ms-wu labelled "white or blue"', () => {
    render(<ManaSymbol token="{W/U}" />);
    const el = screen.getByLabelText('white or blue');
    expect(el.className).toMatch(/\bms-wu\b/);
  });

  it('renders {W/P} as ms-wp labelled "Phyrexian white"', () => {
    render(<ManaSymbol token="{W/P}" />);
    const el = screen.getByLabelText('Phyrexian white');
    expect(el.className).toMatch(/\bms-wp\b/);
  });

  it('renders {2/G} as ms-2g', () => {
    render(<ManaSymbol token="{2/G}" />);
    const el = screen.getByLabelText('two or green');
    expect(el.className).toMatch(/\bms-2g\b/);
  });

  it('renders {S} as ms-s labelled snow', () => {
    render(<ManaSymbol token="{S}" />);
    const el = screen.getByLabelText('snow');
    expect(el.className).toMatch(/\bms-s\b/);
  });

  it('falls back to a pill for unknown tokens', () => {
    render(<ManaSymbol token="{ZZZ}" />);
    const el = screen.getByLabelText('ZZZ');
    expect(el.textContent).toBe('ZZZ');
    // Fallback is not an <i> with ms classes
    expect(el.className).not.toMatch(/\bms\b/);
  });
});
```

- [ ] **Step 2: Run the tests and verify they fail**

```bash
cd app && npm test -- ManaSymbol --run
```

Expected: FAIL — module `./ManaSymbol` not found.

- [ ] **Step 3: Implement `ManaSymbol`**

Create `app/src/components/ManaSymbol.tsx`:

```tsx
type Props = { token: string };

const COLOR_NAME: Record<string, string> = {
  w: 'white',
  u: 'blue',
  b: 'black',
  r: 'red',
  g: 'green',
  c: 'colorless',
  s: 'snow',
  e: 'energy',
  t: 'tap',
  q: 'untap',
  x: 'X',
  y: 'Y',
  z: 'Z',
};

function nameForHalf(half: string): string {
  if (COLOR_NAME[half]) return COLOR_NAME[half];
  if (half === '2') return 'two';
  return half;
}

function ariaLabel(inner: string): string {
  const lower = inner.toLowerCase();
  if (COLOR_NAME[lower]) return COLOR_NAME[lower];
  if (/^\d+$/.test(inner)) return inner;
  if (lower.endsWith('/p')) {
    const c = lower.slice(0, -2);
    return `Phyrexian ${nameForHalf(c)}`;
  }
  if (lower.includes('/')) {
    const [a, b] = lower.split('/');
    return `${nameForHalf(a ?? '')} or ${nameForHalf(b ?? '')}`;
  }
  return inner;
}

function msClass(inner: string): string {
  const lower = inner.toLowerCase();
  if (lower === 't') return 'ms-tap';
  if (lower === 'q') return 'ms-untap';
  if (lower.includes('/')) return `ms-${lower.replace('/', '')}`;
  return `ms-${lower}`;
}

const KNOWN = /^(?:[wubrgcsexyzqt]|\d+|[wubrg]\/[wubrg]|[wubrg]\/p|2\/[wubrg])$/i;

export default function ManaSymbol({ token }: Props) {
  const inner = token.replace(/^\{|\}$/g, '');
  if (!KNOWN.test(inner)) {
    return (
      <span
        className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-neutral-700 px-1 text-[9px] font-bold text-neutral-100"
        aria-label={inner}
      >
        {inner}
      </span>
    );
  }
  return (
    <i
      className={`ms ${msClass(inner)} ms-cost ms-shadow`}
      aria-label={ariaLabel(inner)}
      role="img"
    />
  );
}
```

- [ ] **Step 4: Run tests and verify they pass**

```bash
cd app && npm test -- ManaSymbol --run
```

Expected: PASS (all 10 cases).

- [ ] **Step 5: Commit**

```bash
git add app/src/components/ManaSymbol.tsx app/src/components/ManaSymbol.test.tsx
git commit -m "feat(app): add ManaSymbol component backed by mana-font"
```

---

## Task 3: `OracleText` component (TDD)

**Files:**
- Create: `app/src/components/OracleText.tsx`
- Test: `app/src/components/OracleText.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `app/src/components/OracleText.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import OracleText from './OracleText';

describe('OracleText', () => {
  it('renders plain text unchanged when there are no tokens', () => {
    render(<OracleText text="Draw a card." />);
    expect(screen.getByText('Draw a card.')).toBeInTheDocument();
  });

  it('renders nothing for empty input', () => {
    const { container } = render(<OracleText text="" />);
    expect(container.textContent).toBe('');
  });

  it('replaces {...} tokens with mana symbols and keeps surrounding text', () => {
    render(<OracleText text="{T}: Add {G}. Draw a card." />);
    expect(screen.getByLabelText('tap')).toBeInTheDocument();
    expect(screen.getByLabelText('green')).toBeInTheDocument();
    // The literal braces never reach the DOM
    const root = screen.getByText(/Draw a card\./).parentElement!;
    expect(root.textContent).not.toMatch(/\{[A-Z]\}/);
    expect(root.textContent).toContain(': Add ');
    expect(root.textContent).toContain('. Draw a card.');
  });

  it('renders multi-symbol activated cost like {4}{R}{G}', () => {
    render(<OracleText text="{4}{R}{G}: Do a thing." />);
    expect(screen.getByLabelText('4')).toBeInTheDocument();
    expect(screen.getByLabelText('red')).toBeInTheDocument();
    expect(screen.getByLabelText('green')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests and verify they fail**

```bash
cd app && npm test -- OracleText --run
```

Expected: FAIL — module `./OracleText` not found.

- [ ] **Step 3: Implement `OracleText`**

Create `app/src/components/OracleText.tsx`:

```tsx
import ManaSymbol from './ManaSymbol';

type Props = { text: string };

export default function OracleText({ text }: Props) {
  if (!text) return null;
  const parts = text.split(/(\{[^}]+\})/g);
  return (
    <>
      {parts.map((p, i) => {
        if (!p) return null;
        if (/^\{[^}]+\}$/.test(p)) return <ManaSymbol key={i} token={p} />;
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}
```

- [ ] **Step 4: Run tests and verify they pass**

```bash
cd app && npm test -- OracleText --run
```

Expected: PASS (all 4 cases).

- [ ] **Step 5: Commit**

```bash
git add app/src/components/OracleText.tsx app/src/components/OracleText.test.tsx
git commit -m "feat(app): add OracleText component to render text with mana symbols"
```

---

## Task 4: Rewrite `ManaCost` to delegate to `ManaSymbol`

**Files:**
- Modify: `app/src/components/ManaCost.tsx` (full rewrite)

The public API `{ cost: string | null }` stays the same. Existing callers in `DeckPanel.tsx` and `DecksPage.tsx` need no changes.

- [ ] **Step 1: Rewrite `ManaCost.tsx`**

Replace the entire contents of `app/src/components/ManaCost.tsx` with:

```tsx
import ManaSymbol from './ManaSymbol';

type Props = { cost: string | null };

export default function ManaCost({ cost }: Props) {
  if (!cost) return null;
  const symbols = cost.match(/\{[^}]+\}/g) ?? [];
  if (symbols.length === 0) return null;
  return (
    <span className="inline-flex shrink-0 gap-0.5">
      {symbols.map((sym, i) => (
        <ManaSymbol key={i} token={sym} />
      ))}
    </span>
  );
}
```

- [ ] **Step 2: Run the existing app test suite**

```bash
cd app && npm test -- --run
```

Expected: PASS. `DeckPanel.test.tsx` and `DecksPage.test.tsx` use `<ManaCost>` indirectly via the rendered tree; they should still pass because the `<ManaCost>` API is unchanged and existing assertions don't depend on the inner DOM structure (they assert on card names, counts, and visible text). If a test fails because it asserts on the old tailwind circle classes, the assertion is wrong — update it to query the new structure (`getByLabelText("red")`, etc.) and report in the PR description.

- [ ] **Step 3: Commit**

```bash
git add app/src/components/ManaCost.tsx
git commit -m "refactor(app): ManaCost delegates to ManaSymbol; drop custom circles"
```

---

## Task 5: Wire `OracleText` into `CardDetailDrawer`

**Files:**
- Modify: `app/src/components/CardDetailDrawer.tsx` (line 44 and the import block)

- [ ] **Step 1: Add the import**

At the top of `app/src/components/CardDetailDrawer.tsx`, add to the existing imports:

```tsx
import OracleText from './OracleText';
```

- [ ] **Step 2: Replace the raw oracle-text render**

Find line 44:

```tsx
      <p className="mt-2 whitespace-pre-wrap text-sm">{card.oracleText}</p>
```

Replace with:

```tsx
      <p className="mt-2 whitespace-pre-wrap text-sm">
        <OracleText text={card.oracleText} />
      </p>
```

- [ ] **Step 3: Run app tests**

```bash
cd app && npm test -- --run
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/src/components/CardDetailDrawer.tsx
git commit -m "feat(app): render mana symbols inside oracle text in card drawer"
```

---

## Task 6: Manual visual verification

**Files:** none (manual check).

This task does not produce a commit. It exists to make sure the end-to-end appearance matches the spec before declaring done.

- [ ] **Step 1: Ensure the artifact is built**

```bash
ls app/public/data/cards-standard.json >/dev/null 2>&1 || npm run build:cards -- --standard
```

If the artifact is missing, the second command runs (may take a few minutes).

- [ ] **Step 2: Start the dev server**

```bash
cd app && npm run dev
```

Open `http://localhost:5173` in a browser.

- [ ] **Step 3: Verify the card detail drawer**

- Navigate to `/browser`.
- Search for "Agatha of the Vile Cauldron".
- Click the card. The right-side drawer opens.
- Confirm the oracle text shows the **`{X}`** in "cost `{X}` less to activate, where X is Agatha's power" as a mana symbol (X), and **`{4}{R}{G}`** in "`{4}{R}{G}`: Other creatures you control get +1/+1…" as four mana symbols (4, red, green).
- Confirm no literal `{` or `}` characters appear in the oracle text body.

- [ ] **Step 4: Verify the deck row costs**

- Navigate to `/decks`.
- Open any deck (or create one and add a few colored cards like Hollowmurk Siege, Auroral Procession, Skewer Slinger).
- Confirm each row in the deck list shows the card's mana cost as proper Mana-font icons (not the old flat tailwind circles).

- [ ] **Step 5: Verify the active-deck pill**

- On `/decks`, the active-deck card at the top should show its color identity (W/U/B/R/G) as proper mana icons rather than letter bubbles.

- [ ] **Step 6: Visual regression scan**

- Browse a handful of other pages: filter panel, interactions panel, deck builder. Confirm the mana-font CSS hasn't bled into anything unintended (no broken layouts, no oversized icons, baseline alignment looks right in oracle paragraphs).

- [ ] **Step 7: If anything looks off, file a follow-up**

Common nudge points if needed:
- Vertical alignment in oracle paragraphs: add `vertical-align: -0.1em` via a class on the `<i>` if the icons sit too high relative to the text.
- Icon size in deck rows: parent already controls size via `text-sm`/`text-base`; adjust the parent if needed.

If a tweak is required, make it now and commit it as a separate "polish" commit. If everything looks right, this task is done with no commit.

---

## Self-review notes

- **Spec coverage:**
  - `ManaSymbol` and `OracleText` — Tasks 2 and 3. ✓
  - `ManaCost` rewrite — Task 4. ✓
  - `CardDetailDrawer` wiring — Task 5. ✓
  - Deck validation messages — confirmed N/A during planning; called out at the top of this plan. ✓
  - Deck row cost column / active-deck pill — automatic via Task 4 (no call-site change). ✓
  - Styling: `ms ms-* ms-cost ms-shadow` + global CSS load — Tasks 1, 2, 4. ✓
  - Tests: `ManaSymbol.test.tsx` and `OracleText.test.tsx` — Tasks 2, 3. ✓
  - Manual visual: drawer, deck rows, active pill — Task 6. ✓
- **No placeholders:** every code step includes complete, copy-pasteable code.
- **Type consistency:** `Props = { token: string }` in `ManaSymbol`, `Props = { text: string }` in `OracleText`, `Props = { cost: string | null }` in `ManaCost`. Each is used consistently in callers.
