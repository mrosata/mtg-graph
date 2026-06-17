# Multi-face cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Carry per-face data through the artifact, run tag rules per face, let search find back-face names, and add UI for flipping (transform/modal_dfc/meld) or showing both text blocks (split/adventure) in the card detail drawer.

**Architecture:** Additive shape change to `Card`: new `layout` field (discriminator) and optional `faces[]`. Tags grow an optional `face: 'front' | 'back'`. Edges remain card-level — the InteractionsPanel reads the face attribution off the source tag. UI branches on `card.layout`: flip button for the three flippable layouts, stacked text for the two share-one-image layouts, unchanged for `normal`.

**Tech Stack:** TypeScript (`noUncheckedIndexedAccess: true`), Vite + React, Vitest, React Testing Library, Playwright, Tailwind, Zustand.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-06-14-multi-face-cards-design.md`. Every requirement in that file must be covered by a task.
- Five in-scope layouts: `transform`, `modal_dfc`, `meld`, `split`, `adventure`. `prepare` and others are out of scope.
- All new schema fields are additive and optional. Legacy artifacts (without `layout`/`faces`/`face`) must keep loading.
- Edges stay card-level. Do NOT add face-aware edge fields.
- `RULE_VERSION` (`shared/version.ts`) must bump in this batch so the app invalidates Dexie hydration cache on first load.
- Follow the repo's TDD discipline for pipeline + pure logic (test → red → impl → green → commit). Component tests for UI changes use React Testing Library; don't snapshot whole DOMs.
- After all tasks, run the full gate: `npm test` (root) plus `npm run rule:coverage -- --all` and confirm aggregate "taggable %" did not drop.

---

## File Structure

**Created**
- `pipeline/fixtures/scryfall-faces-sample.json` — five hand-crafted Scryfall records, one per multi-face layout.
- `pipeline/tag-per-face.test.ts` — verifies per-face tag attribution.
- `app/src/components/CardDetailDrawer.test.tsx` — verifies flip and stacked rendering.
- `app/src/components/CardGrid.test.tsx` — verifies multi-face badge.

**Modified**
- `shared/types.ts` — add `CardLayout`, `Face`, `Card.layout`, `Card.faces`, `CardTag.face`.
- `shared/version.ts` — bump `RULE_VERSION`.
- `pipeline/fetch.ts` — `stripScryfallCard` builds `faces[]` and sets `layout`.
- `pipeline/fetch.test.ts` — fixture-driven assertions per layout.
- `pipeline/merge.ts` — preserve first-seen `faces` array.
- `pipeline/merge.test.ts` — multi-face merge invariant.
- `pipeline/index.ts` — `tagCards` runs rules per face with `face` attribution.
- `pipeline/e2e.test.ts` — assert multi-face counts in fixture artifact.
- `app/src/lib/cardNameIndex.ts` — index back-face name; new `backFace` map; extend `lookupByName` precedence.
- `app/src/lib/cardNameIndex.test.ts` — back-face lookup assertions.
- `app/src/components/CardDetailDrawer.tsx` — `face` state + flip button (flippable) and stacked block (split/adventure).
- `app/src/components/CardGrid.tsx` — multi-face badge.
- `app/src/components/InteractionsPanel.tsx` — face annotation on edge labels.

---

## Task 1: Shared types — `CardLayout`, `Face`, optional `Card.layout`/`Card.faces`, optional `CardTag.face`

**Files:**
- Modify: `shared/types.ts`
- Modify: `shared/types.test.ts` (the existing structural-types test file)

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type CardLayout = 'normal' | 'transform' | 'modal_dfc' | 'meld' | 'split' | 'adventure';`
  - `type Face = { name; typeLine; types; subtypes; supertypes; oracleText; manaCost; colors; power; toughness; imageUrl? }`
  - `Card.layout?: CardLayout` — **optional**; consumers default to `'normal'` when absent.
  - `Card.faces?: Face[]`
  - `CardTag.face?: 'front' | 'back'`

- [ ] **Step 1: Write the failing structural test**

In `shared/types.test.ts` add:

```ts
import type { Card, CardTag, Face, CardLayout } from './types';

it('Face contains per-face fields', () => {
  const f: Face = {
    name: 'Peter Parker',
    typeLine: 'Legendary Creature — Human Scientist Hero',
    types: ['Creature'],
    subtypes: ['Human', 'Scientist', 'Hero'],
    supertypes: ['Legendary'],
    oracleText: 'When Peter Parker enters...',
    manaCost: '{1}{W}',
    colors: ['W'],
    power: '0',
    toughness: '1',
    imageUrl: 'https://example.test/front.jpg',
  };
  expect(f.name).toBe('Peter Parker');
});

it('Card.layout and Card.faces are both optional and compile together', () => {
  const c: Card = {
    oracleId: 'x', name: 'Peter Parker // Amazing Spider-Man',
    set: 'spm', printings: ['spm'], collectorNumber: '10',
    manaCost: '{1}{W}', cmc: 2, colors: ['W'], colorIdentity: ['G','U','W'],
    typeLine: 'Legendary Creature', types: ['Creature'],
    subtypes: ['Human'], supertypes: ['Legendary'],
    oracleText: 'front\n\nback', keywords: ['Transform'],
    power: '0', toughness: '1', rarity: 'mythic',
    imageUrl: 'https://example.test/front.jpg',
    layout: 'modal_dfc',
    faces: [
      // shape only — minimal Face
      { name: 'Peter Parker', typeLine: '', types: [], subtypes: [], supertypes: [], oracleText: '', manaCost: null, colors: [], power: null, toughness: null },
      { name: 'Amazing Spider-Man', typeLine: '', types: [], subtypes: [], supertypes: [], oracleText: '', manaCost: null, colors: [], power: null, toughness: null },
    ],
    tags: [],
  };
  const layout: CardLayout | undefined = c.layout;
  expect(layout).toBe('modal_dfc');
  expect(c.faces?.length).toBe(2);
});

it('CardTag.face is an optional front/back marker', () => {
  const t: CardTag = { tagId: 'effect.has_flying', axis: 'effect', evidence: 'flying', face: 'back' };
  expect(t.face).toBe('back');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:pipeline -- shared/types.test.ts`
Expected: TS compile failures (`Property 'layout' is missing`, `Property 'face' does not exist`, `Cannot find name 'CardLayout'`, `Cannot find name 'Face'`).

- [ ] **Step 3: Add the types to `shared/types.ts`**

Insert above the existing `Card` declaration:

```ts
export type CardLayout =
  | 'normal'
  | 'transform'
  | 'modal_dfc'
  | 'meld'
  | 'split'
  | 'adventure';

export type Face = {
  name: string;
  typeLine: string;
  types: string[];
  subtypes: string[];
  supertypes: string[];
  oracleText: string;
  manaCost: string | null;
  colors: Color[];
  power: string | null;
  toughness: string | null;
  // Present for transform/modal_dfc/meld (per-face art).
  // Undefined for split/adventure (single shared image lives on Card.imageUrl).
  imageUrl?: string;
};
```

Add `layout?: CardLayout;` and `faces?: Face[];` to the existing `Card` type (place near `typeLine` for readability). Optional so existing `Card` literals in tests don't need updating — `stripScryfallCard` will always populate `layout` in real data (Task 2), and read-sites default to `'normal'` when reading (Tasks 7, 9).

Add `face?: 'front' | 'back';` to `CardTag` (place after `evidence`, before `metadata?`).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:pipeline -- shared/types.test.ts`
Expected: PASS, no TS errors.

Also run the full pipeline test suite to confirm no regression:

Run: `npm run test:pipeline`
Expected: PASS — all 19 existing `Card` literals compile because `layout` is optional.

- [ ] **Step 5: Commit**

```bash
git add shared/types.ts shared/types.test.ts
git commit -m "feat(types): add CardLayout, Face, Card.faces, CardTag.face

Additive shape for multi-face card support. All new fields are optional;
stripScryfallCard will populate Card.layout in real data, and UI read
sites default to 'normal' when absent."
```

---

## Task 2: `stripScryfallCard` populates `layout` and `faces[]`

**Files:**
- Modify: `pipeline/fetch.ts`
- Modify: `pipeline/fetch.test.ts`
- Create: `pipeline/fixtures/scryfall-faces-sample.json`

**Interfaces:**
- Consumes: types from Task 1.
- Produces: `stripScryfallCard(raw)` returns a `Card` with `layout` always set and `faces` populated iff layout ∈ {transform, modal_dfc, meld, split, adventure}.

- [ ] **Step 1: Create the fixture**

Create `pipeline/fixtures/scryfall-faces-sample.json` with five entries — one per in-scope layout. Use these (all shapes are real Scryfall structure; values are minimal):

```json
{
  "data": [
    {
      "object": "card",
      "oracle_id": "fixture-peter-parker",
      "name": "Peter Parker // Amazing Spider-Man",
      "layout": "modal_dfc",
      "set": "spm", "collector_number": "10",
      "cmc": 2,
      "type_line": "Legendary Creature — Human // Legendary Creature — Spider",
      "color_identity": ["G","U","W"],
      "keywords": ["Transform"],
      "rarity": "mythic",
      "card_faces": [
        {
          "name": "Peter Parker",
          "mana_cost": "{1}{W}",
          "type_line": "Legendary Creature — Human Scientist Hero",
          "oracle_text": "When Peter Parker enters, create a 2/1 green Spider creature token with reach.",
          "colors": ["W"], "power": "0", "toughness": "1",
          "image_uris": { "normal": "https://example.test/peter-front.jpg" }
        },
        {
          "name": "Amazing Spider-Man",
          "mana_cost": "{1}{G}{W}{U}",
          "type_line": "Legendary Creature — Spider Human Hero",
          "oracle_text": "Vigilance, reach\nEach legendary spell you cast that's one or more colors has web-slinging {G}{W}{U}.",
          "colors": ["G","U","W"], "power": "4", "toughness": "4",
          "image_uris": { "normal": "https://example.test/peter-back.jpg" }
        }
      ]
    },
    {
      "object": "card",
      "oracle_id": "fixture-werewolf",
      "name": "Were Front // Were Back",
      "layout": "transform",
      "set": "tdm", "collector_number": "1",
      "cmc": 3,
      "type_line": "Creature — Human Werewolf // Creature — Werewolf",
      "color_identity": ["R"],
      "rarity": "rare",
      "card_faces": [
        {
          "name": "Were Front",
          "mana_cost": "{2}{R}",
          "type_line": "Creature — Human Werewolf",
          "oracle_text": "At the beginning of each upkeep, if no spells were cast last turn, transform Were Front.",
          "colors": ["R"], "power": "2", "toughness": "2",
          "image_uris": { "normal": "https://example.test/were-front.jpg" }
        },
        {
          "name": "Were Back",
          "mana_cost": "",
          "type_line": "Creature — Werewolf",
          "oracle_text": "Flying. At the beginning of each upkeep, if a player cast two or more spells last turn, transform Were Back.",
          "colors": ["R"], "power": "3", "toughness": "3",
          "image_uris": { "normal": "https://example.test/were-back.jpg" }
        }
      ]
    },
    {
      "object": "card",
      "oracle_id": "fixture-meld",
      "name": "Meld Parent // Melded Form",
      "layout": "meld",
      "set": "tdm", "collector_number": "2",
      "cmc": 4,
      "type_line": "Legendary Creature — Hero // Legendary Creature — Hero",
      "color_identity": ["W"],
      "rarity": "mythic",
      "card_faces": [
        { "name": "Meld Parent", "mana_cost": "{3}{W}", "type_line": "Legendary Creature — Hero",
          "oracle_text": "Vigilance.", "colors": ["W"], "power": "3", "toughness": "3",
          "image_uris": { "normal": "https://example.test/meld-front.jpg" } },
        { "name": "Melded Form", "mana_cost": "", "type_line": "Legendary Creature — Hero",
          "oracle_text": "Flying, vigilance, trample.", "colors": ["W"], "power": "8", "toughness": "8",
          "image_uris": { "normal": "https://example.test/meld-back.jpg" } }
      ]
    },
    {
      "object": "card",
      "oracle_id": "fixture-split",
      "name": "Fire // Ice",
      "layout": "split",
      "set": "tdm", "collector_number": "3",
      "cmc": 2,
      "type_line": "Instant // Instant",
      "color_identity": ["R","U"],
      "rarity": "uncommon",
      "image_uris": { "normal": "https://example.test/fire-ice.jpg" },
      "card_faces": [
        { "name": "Fire", "mana_cost": "{1}{R}", "type_line": "Instant",
          "oracle_text": "Fire deals 2 damage divided as you choose among one or two targets.",
          "colors": ["R"], "power": null, "toughness": null },
        { "name": "Ice", "mana_cost": "{1}{U}", "type_line": "Instant",
          "oracle_text": "Tap target permanent. Draw a card.",
          "colors": ["U"], "power": null, "toughness": null }
      ]
    },
    {
      "object": "card",
      "oracle_id": "fixture-adventure",
      "name": "Brave Knight // Heroic Charge",
      "layout": "adventure",
      "set": "tdm", "collector_number": "4",
      "cmc": 2,
      "type_line": "Creature — Human Knight // Instant — Adventure",
      "color_identity": ["W"],
      "rarity": "uncommon",
      "image_uris": { "normal": "https://example.test/adventure.jpg" },
      "card_faces": [
        { "name": "Brave Knight", "mana_cost": "{1}{W}", "type_line": "Creature — Human Knight",
          "oracle_text": "First strike.", "colors": ["W"], "power": "2", "toughness": "2" },
        { "name": "Heroic Charge", "mana_cost": "{W}", "type_line": "Instant — Adventure",
          "oracle_text": "Creatures you control get +1/+1 until end of turn.",
          "colors": ["W"], "power": null, "toughness": null }
      ]
    }
  ]
}
```

Commit fixture separately so it's not bundled with code changes:

```bash
git add pipeline/fixtures/scryfall-faces-sample.json
git commit -m "test(pipeline): add Scryfall fixture covering five multi-face layouts"
```

- [ ] **Step 2: Write the failing tests**

In `pipeline/fetch.test.ts` add a new `describe` block at the bottom:

```ts
import facesFixture from './fixtures/scryfall-faces-sample.json' with { type: 'json' };

describe('stripScryfallCard multi-face handling', () => {
  const byOracle: Record<string, any> = Object.fromEntries(
    (facesFixture.data as any[]).map((r) => [r.oracle_id, r]),
  );

  it('sets layout=normal when Scryfall layout is missing', () => {
    const card = stripScryfallCard({
      oracle_id: 'x', name: 'Plain', set: 's', collector_number: '1',
      cmc: 0, type_line: 'Land', rarity: 'common',
    } as any);
    expect(card.layout).toBe('normal');
    expect(card.faces).toBeUndefined();
  });

  it('modal_dfc: builds two faces with per-face image, front-face image as top-level', () => {
    const card = stripScryfallCard(byOracle['fixture-peter-parker'] as any);
    expect(card.layout).toBe('modal_dfc');
    expect(card.faces?.length).toBe(2);
    expect(card.faces?.[0]?.name).toBe('Peter Parker');
    expect(card.faces?.[1]?.name).toBe('Amazing Spider-Man');
    expect(card.faces?.[0]?.imageUrl).toBe('https://example.test/peter-front.jpg');
    expect(card.faces?.[1]?.imageUrl).toBe('https://example.test/peter-back.jpg');
    expect(card.imageUrl).toBe('https://example.test/peter-front.jpg');
    expect(card.faces?.[0]?.manaCost).toBe('{1}{W}');
    expect(card.faces?.[1]?.manaCost).toBe('{1}{G}{W}{U}');
    expect(card.faces?.[0]?.types).toContain('Creature');
    expect(card.faces?.[0]?.subtypes).toEqual(['Human', 'Scientist', 'Hero']);
    expect(card.faces?.[1]?.subtypes).toEqual(['Spider', 'Human', 'Hero']);
    expect(card.faces?.[1]?.power).toBe('4');
    expect(card.faces?.[1]?.toughness).toBe('4');
  });

  it('transform: same shape as modal_dfc (per-face images)', () => {
    const card = stripScryfallCard(byOracle['fixture-werewolf'] as any);
    expect(card.layout).toBe('transform');
    expect(card.faces?.length).toBe(2);
    expect(card.faces?.[0]?.imageUrl).toBe('https://example.test/were-front.jpg');
    expect(card.faces?.[1]?.imageUrl).toBe('https://example.test/were-back.jpg');
    expect(card.imageUrl).toBe('https://example.test/were-front.jpg');
  });

  it('meld: per-face images on both sides', () => {
    const card = stripScryfallCard(byOracle['fixture-meld'] as any);
    expect(card.layout).toBe('meld');
    expect(card.faces?.[0]?.imageUrl).toBe('https://example.test/meld-front.jpg');
    expect(card.faces?.[1]?.imageUrl).toBe('https://example.test/meld-back.jpg');
  });

  it('split: faces have no per-face imageUrl; top-level image is the shared physical image', () => {
    const card = stripScryfallCard(byOracle['fixture-split'] as any);
    expect(card.layout).toBe('split');
    expect(card.faces?.length).toBe(2);
    expect(card.faces?.[0]?.imageUrl).toBeUndefined();
    expect(card.faces?.[1]?.imageUrl).toBeUndefined();
    expect(card.imageUrl).toBe('https://example.test/fire-ice.jpg');
    expect(card.faces?.[0]?.name).toBe('Fire');
    expect(card.faces?.[1]?.name).toBe('Ice');
  });

  it('adventure: same shape as split (single shared image)', () => {
    const card = stripScryfallCard(byOracle['fixture-adventure'] as any);
    expect(card.layout).toBe('adventure');
    expect(card.faces?.length).toBe(2);
    expect(card.faces?.[0]?.imageUrl).toBeUndefined();
    expect(card.faces?.[1]?.imageUrl).toBeUndefined();
    expect(card.imageUrl).toBe('https://example.test/adventure.jpg');
  });

  it('oracleText stays the concatenated form for back-compat', () => {
    const card = stripScryfallCard(byOracle['fixture-peter-parker'] as any);
    expect(card.oracleText).toContain('When Peter Parker enters');
    expect(card.oracleText).toContain('web-slinging');
    // Concatenated with \n\n
    expect(card.oracleText.split('\n\n').length).toBe(2);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm run test:pipeline -- pipeline/fetch.test.ts`
Expected: FAIL — `card.layout` is undefined, `card.faces` is undefined, image routing wrong for split/adventure.

- [ ] **Step 4: Implement in `pipeline/fetch.ts`**

Update `ScryfallFace` and `ScryfallCard` types and the `stripScryfallCard` function.

Add to `ScryfallFace`:

```ts
type ScryfallFace = {
  name?: string;
  type_line?: string;
  mana_cost?: string | null;
  oracle_text?: string;
  colors?: string[];
  power?: string | null;
  toughness?: string | null;
  image_uris?: { normal?: string; large?: string };
};
```

Add to `ScryfallCard`:

```ts
layout?: string;
```

Add the layout set used for face population, near the top of the file:

```ts
const MULTI_FACE_LAYOUTS: ReadonlySet<string> = new Set([
  'transform',
  'modal_dfc',
  'meld',
  'split',
  'adventure',
]);

const PER_FACE_IMAGE_LAYOUTS: ReadonlySet<string> = new Set([
  'transform',
  'modal_dfc',
  'meld',
]);

function asCardLayout(raw?: string): import('../shared/types').CardLayout {
  if (raw === 'transform' || raw === 'modal_dfc' || raw === 'meld' || raw === 'split' || raw === 'adventure') return raw;
  return 'normal';
}
```

Replace the existing `stripScryfallCard` image-routing + `oracleText` block with face-aware logic. Concretely, after `const { types, subtypes, supertypes } = parseTypeLine(raw.type_line);`:

```ts
const rawLayout = raw.layout;
const layout = asCardLayout(rawLayout);

const buildFace = (f: ScryfallFace): Face => {
  const { types: ft, subtypes: fs, supertypes: fp } = parseTypeLine(f.type_line ?? '');
  const face: Face = {
    name: f.name ?? '',
    typeLine: f.type_line ?? '',
    types: ft, subtypes: fs, supertypes: fp,
    oracleText: f.oracle_text ?? '',
    manaCost: f.mana_cost ?? null,
    colors: (f.colors ?? []).filter((c): c is Color => COLORS.has(c)),
    power: f.power ?? null,
    toughness: f.toughness ?? null,
  };
  if (rawLayout && PER_FACE_IMAGE_LAYOUTS.has(rawLayout)) {
    const img = f.image_uris?.normal ?? f.image_uris?.large;
    if (img) face.imageUrl = img;
  }
  return face;
};

const faces: Face[] | undefined =
  rawLayout && MULTI_FACE_LAYOUTS.has(rawLayout) && raw.card_faces && raw.card_faces.length === 2
    ? raw.card_faces.map(buildFace)
    : undefined;

const image =
  raw.image_uris?.normal ??
  raw.image_uris?.large ??
  faces?.[0]?.imageUrl ??
  raw.card_faces?.[0]?.image_uris?.normal ??
  raw.card_faces?.[0]?.image_uris?.large ??
  '';

const oracleText =
  raw.oracle_text && raw.oracle_text.length > 0
    ? raw.oracle_text
    : (raw.card_faces ?? [])
        .map((f) => f.oracle_text ?? '')
        .filter((t) => t.length > 0)
        .join('\n\n');
```

Also import `Face` at the top: change the existing `import type { Card, Color, Rarity } from '../shared/types';` to `import type { Card, Color, Face, Rarity } from '../shared/types';`.

Finally, in the `const card: Card = { ... }` construction, add:

```ts
layout,
...(faces ? { faces } : {}),
```

(Place `layout` near `typeLine` or after `mtgoId`; place `faces` right after `layout`.)

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test:pipeline -- pipeline/fetch.test.ts`
Expected: PASS.

Also confirm the existing tests still pass (the existing `Card` construction in `stripScryfallCard` was missing `layout` — your edit adds it):

Run: `npm run test:pipeline -- pipeline/fetch.test.ts`
Expected: all existing assertions still PASS.

- [ ] **Step 6: Commit**

```bash
git add pipeline/fetch.ts pipeline/fetch.test.ts
git commit -m "feat(pipeline): stripScryfallCard builds faces[] and sets layout

Five multi-face layouts (transform, modal_dfc, meld, split, adventure) now
get a populated Card.faces array. Top-level imageUrl prefers per-face front
art for transform/modal_dfc/meld, single shared image for split/adventure.
Top-level oracleText concatenation is unchanged for back-compat."
```

---

## Task 3: `mergeCardsAcrossSets` preserves first-seen `faces`

**Files:**
- Modify: `pipeline/merge.ts`
- Modify: `pipeline/merge.test.ts`

**Interfaces:**
- Consumes: `Card.faces` from Task 1; multi-face shape from Task 2.
- Produces: merged `Card` whose `faces` (when present) come from the first-seen printing.

The current shallow-spread (`{...c, printings: [...c.printings], ...}`) already preserves `faces` on the first-seen card. This task makes that explicit and adds a regression test so a future refactor of `merge.ts` can't silently drop the field.

- [ ] **Step 1: Write the failing test**

Add to `pipeline/merge.test.ts`:

```ts
it('preserves the first-seen printing\'s faces array', () => {
  const front: Face = { name: 'Front', typeLine: '', types: [], subtypes: [], supertypes: [], oracleText: 'F', manaCost: null, colors: [], power: null, toughness: null, imageUrl: 'http://first/front.jpg' };
  const back: Face = { name: 'Back', typeLine: '', types: [], subtypes: [], supertypes: [], oracleText: 'B', manaCost: null, colors: [], power: null, toughness: null, imageUrl: 'http://first/back.jpg' };
  const firstSeen: Card = {
    oracleId: 'o1', name: 'Front // Back', set: 'a', printings: ['a'],
    collectorNumber: '1', manaCost: null, cmc: 0, colors: [], colorIdentity: [],
    typeLine: '', types: [], subtypes: [], supertypes: [],
    oracleText: 'F\n\nB', keywords: [], power: null, toughness: null,
    rarity: 'common', imageUrl: 'http://first/front.jpg',
    layout: 'transform', faces: [front, back], tags: [],
  };
  const reprint: Card = { ...firstSeen, set: 'b', printings: ['b'], imageUrl: 'http://later/front.jpg',
    faces: [{ ...front, imageUrl: 'http://later/front.jpg' }, { ...back, imageUrl: 'http://later/back.jpg' }] };

  const merged = mergeCardsAcrossSets([firstSeen, reprint]);
  expect(merged.length).toBe(1);
  expect(merged[0]!.faces?.[0]?.imageUrl).toBe('http://first/front.jpg');
  expect(merged[0]!.faces?.[1]?.imageUrl).toBe('http://first/back.jpg');
  expect(merged[0]!.layout).toBe('transform');
  expect(merged[0]!.printings).toEqual(['a', 'b']);
});
```

Add `Face` to the existing type import at the top of `pipeline/merge.test.ts`.

- [ ] **Step 2: Run test to verify it passes (already works via `{...c}` spread)**

Run: `npm run test:pipeline -- pipeline/merge.test.ts`
Expected: PASS already (no code change needed; the spread carries `faces` and `layout` through).

If it fails because of TS errors at the existing test-file Card constructions (they're missing `layout`), add `layout: 'normal'` to each so the file compiles.

- [ ] **Step 3: Commit**

```bash
git add pipeline/merge.ts pipeline/merge.test.ts
git commit -m "test(pipeline): regression test for first-seen faces preservation"
```

---

## Task 4: `tagCards` runs rules per face with `face` attribution

**Files:**
- Modify: `pipeline/index.ts` (the `tagCards` function)
- Create: `pipeline/tag-per-face.test.ts`

**Interfaces:**
- Consumes: `Card.faces`, `CardTag.face` from Task 1; populated faces from Task 2.
- Produces: each `CardTag` on a multi-face card carries `face: 'front' | 'back'`. Single-face cards' tags remain face-less.

- [ ] **Step 1: Write the failing test**

Create `pipeline/tag-per-face.test.ts`:

```ts
import { describe, it, expect, beforeAll } from 'vitest';
import type { Card, Face } from '../shared/types';
import { ensureWarmed } from './rules';
import { getAllRules } from './rules';
import { getTagCatalog } from './catalog';
import { normalizeOracleText, stripReminderText } from './normalize';
import { extractGrantedInnerTexts, normalizeInnerGrantText } from './grant-extraction';
import { applyRules } from './rules/runner';
import { expandChildren } from './tag-expansion';

// Mirror tagCards() from pipeline/index.ts. We re-implement here because
// the production tagCards is an internal helper; this test instead asserts
// the FACE attribution shape that tagCards must produce.

function makeFace(name: string, oracleText: string): Face {
  return { name, typeLine: 'Creature — X', types: ['Creature'], subtypes: ['X'], supertypes: [],
    oracleText, manaCost: '{1}', colors: [], power: '1', toughness: '1' };
}

beforeAll(async () => { await ensureWarmed(); });

describe('per-face tag attribution', () => {
  it('tags from front-face oracle text get face=front', () => {
    const front = makeFace('Front', 'Flying');
    const back = makeFace('Back', 'Trample');
    const card: Card = {
      oracleId: 'f1', name: 'Front // Back', set: 's', printings: ['s'],
      collectorNumber: '1', manaCost: '{1}', cmc: 1, colors: [], colorIdentity: [],
      typeLine: 'Creature', types: ['Creature'], subtypes: [], supertypes: [],
      oracleText: 'Flying\n\nTrample', keywords: ['Flying','Trample'],
      power: '1', toughness: '1', rarity: 'common', imageUrl: '',
      layout: 'transform', faces: [front, back], tags: [],
    };
    const tagged = tagCardsForTest(card);
    const flyingTag = tagged.tags.find((t) => t.tagId === 'effect.has_flying');
    const trampleTag = tagged.tags.find((t) => t.tagId === 'effect.has_trample');
    expect(flyingTag?.face).toBe('front');
    expect(trampleTag?.face).toBe('back');
  });

  it('single-face cards do not get a face field', () => {
    const card: Card = {
      oracleId: 'p1', name: 'Plain', set: 's', printings: ['s'],
      collectorNumber: '1', manaCost: '{1}', cmc: 1, colors: [], colorIdentity: [],
      typeLine: 'Creature — X', types: ['Creature'], subtypes: ['X'], supertypes: [],
      oracleText: 'Flying', keywords: ['Flying'],
      power: '1', toughness: '1', rarity: 'common', imageUrl: '',
      layout: 'normal', tags: [],
    };
    const tagged = tagCardsForTest(card);
    const flyingTag = tagged.tags.find((t) => t.tagId === 'effect.has_flying');
    expect(flyingTag).toBeDefined();
    expect(flyingTag?.face).toBeUndefined();
  });
});

// Inline replica of the per-face tagging pipeline; kept tight on purpose so
// the test surfaces shape changes loudly. Lift to a shared helper later if
// other tests need it.
function tagCardsForTest(c: Card): Card {
  const catalog = getTagCatalog();
  const rules = getAllRules();
  const tagDefById = Object.fromEntries(catalog.map((d) => [d.tagId, d]));

  const runFace = (text: string, name: string, face: 'front' | 'back' | undefined) => {
    const isLegendary = c.supertypes?.includes('Legendary') ?? false;
    const normalized = normalizeOracleText(text, name, isLegendary);
    const hostTags = applyRules(normalized, c, rules);
    const hostTagIds = new Set(hostTags.map((t) => t.tagId));
    const grantedTags = [];
    for (const inner of extractGrantedInnerTexts(stripReminderText(text))) {
      const innerNorm = normalizeInnerGrantText(inner);
      for (const innerTag of applyRules(innerNorm, c, rules)) {
        if (hostTagIds.has(innerTag.tagId)) continue;
        hostTagIds.add(innerTag.tagId);
        grantedTags.push({ ...innerTag, evidence: `granted: ${innerTag.evidence}` });
      }
    }
    return [...hostTags, ...grantedTags].map((t) => face ? { ...t, face } : t);
  };

  let all;
  if (c.faces && c.faces.length === 2) {
    all = [...runFace(c.faces[0]!.oracleText, c.faces[0]!.name, 'front'),
           ...runFace(c.faces[1]!.oracleText, c.faces[1]!.name, 'back')];
  } else {
    all = runFace(c.oracleText, c.name, undefined);
  }
  const tags = expandChildren(all, tagDefById);
  return { ...c, tags };
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:pipeline -- pipeline/tag-per-face.test.ts`
Expected: FAIL — the production `tagCards` in `pipeline/index.ts` doesn't yet do per-face tagging, but the test uses its own `tagCardsForTest`. So the test currently FAILS only if `tagCardsForTest` mis-mirrors production. **This test asserts the shape we want; production must match it.** Verify the test's expected behaviour first — if `tagCardsForTest` is correct, the test should PASS as-is. (We're using the test to PIN the contract before refactoring production.)

If the test passes immediately (because `tagCardsForTest` is self-consistent), continue — we still need to make production match.

- [ ] **Step 3: Update production `tagCards` in `pipeline/index.ts`**

Replace the existing `tagCards` function body (lines 90–126) with:

```ts
function tagCards(cards: Card[]): Card[] {
  const catalog = getTagCatalog();
  const rules = getAllRules();
  const tagDefById: Record<string, TagDef> = Object.fromEntries(
    catalog.map((d) => [d.tagId, d]),
  );
  return cards.map((c) => {
    const isLegendary = c.supertypes?.includes('Legendary') ?? false;

    const runOnText = (
      text: string,
      name: string,
      face: 'front' | 'back' | undefined,
    ): CardTag[] => {
      const normalized = normalizeOracleText(text, name, isLegendary);
      const hostTags = applyRules(normalized, c, rules);
      const hostTagIds = new Set(hostTags.map((t) => t.tagId));
      const grantedTags: CardTag[] = [];
      for (const inner of extractGrantedInnerTexts(stripReminderText(text))) {
        const innerNorm = normalizeInnerGrantText(inner);
        for (const innerTag of applyRules(innerNorm, c, rules)) {
          if (!isForwardable(innerTag, hostTagIds)) continue;
          if (hostTagIds.has(innerTag.tagId)) continue;
          hostTagIds.add(innerTag.tagId);
          grantedTags.push({ ...innerTag, evidence: `granted: ${innerTag.evidence}` });
        }
      }
      const merged = [...hostTags, ...grantedTags];
      return face ? merged.map((t) => ({ ...t, face })) : merged;
    };

    let collected: CardTag[];
    if (c.faces && c.faces.length === 2) {
      collected = [
        ...runOnText(c.faces[0]!.oracleText, c.faces[0]!.name, 'front'),
        ...runOnText(c.faces[1]!.oracleText, c.faces[1]!.name, 'back'),
      ];
    } else {
      collected = runOnText(c.oracleText, c.name, undefined);
    }

    const tags = expandChildren(collected, tagDefById);
    return { ...c, tags };
  });
}
```

- [ ] **Step 4: Run tests to verify both pass**

Run: `npm run test:pipeline`
Expected: full pipeline test suite PASSES. Inspect any failure carefully — a rule that previously fired only because its regex spanned the `\n\n` join between two faces will now miss. None of the current rules are expected to depend on cross-face text, but verify.

- [ ] **Step 5: Verify coverage didn't drop**

Run: `npm run rule:coverage -- --all > /tmp/coverage-after.txt && cat /tmp/coverage-after.txt | tail -5`
Expected: aggregate "taggable %" still ≥ the pre-change baseline (~99.0% per CLAUDE.md). If it drops, the regression is most likely a rule whose regex required text from both faces simultaneously — record which one in your task notes and either widen the rule or accept the (likely tiny) loss.

- [ ] **Step 6: Commit**

```bash
git add pipeline/index.ts pipeline/tag-per-face.test.ts
git commit -m "feat(pipeline): per-face tag application with face attribution

tagCards branches on Card.faces. For multi-face cards, runs the rule
extractor + grant forwarder on each face separately and tags each emitted
CardTag with face: 'front' | 'back'. Single-face cards keep today's
behaviour (no face field)."
```

---

## Task 5: Bump `RULE_VERSION`; assert multi-face counts in pipeline e2e

**Files:**
- Modify: `shared/version.ts`
- Modify: `pipeline/e2e.test.ts`

**Interfaces:**
- Consumes: Tasks 1–4.
- Produces: incremented `RULE_VERSION` so the app drops its hydration cache on next load.

- [ ] **Step 1: Bump version**

Edit `shared/version.ts` and change `RULE_VERSION = 'v0.41.0'` to `RULE_VERSION = 'v0.42.0'`.

- [ ] **Step 2: Add a failing e2e check**

In `pipeline/e2e.test.ts`, add a new `it()`:

```ts
it('multi-face fixture cards round-trip layout and faces through tagging', async () => {
  const facesFixture = (await import('./fixtures/scryfall-faces-sample.json', { with: { type: 'json' } })).default as any;
  const rules = getAllRules();
  const cards = facesFixture.data.map((raw: any) => stripScryfallCard(raw));
  expect(cards.find((c: any) => c.layout === 'modal_dfc')).toBeDefined();
  expect(cards.find((c: any) => c.layout === 'transform')).toBeDefined();
  expect(cards.find((c: any) => c.layout === 'meld')).toBeDefined();
  expect(cards.find((c: any) => c.layout === 'split')).toBeDefined();
  expect(cards.find((c: any) => c.layout === 'adventure')).toBeDefined();

  const werewolf = cards.find((c: any) => c.oracleId === 'fixture-werewolf')!;
  // Front face has no flying; back face does. Per-face tagging surfaces the
  // back-face flying tag with face='back'.
  const tagged = {
    ...werewolf,
    tags: expandChildren(
      [
        ...applyRules(normalizeOracleText(werewolf.faces![0]!.oracleText, werewolf.faces![0]!.name), werewolf, rules)
          .map((t) => ({ ...t, face: 'front' as const })),
        ...applyRules(normalizeOracleText(werewolf.faces![1]!.oracleText, werewolf.faces![1]!.name), werewolf, rules)
          .map((t) => ({ ...t, face: 'back' as const })),
      ],
      tagDefById,
    ),
  };
  const flying = tagged.tags.find((t) => t.tagId === 'effect.has_flying');
  expect(flying?.face).toBe('back');
});
```

- [ ] **Step 3: Run e2e test**

Run: `npm run test:pipeline -- pipeline/e2e.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add shared/version.ts pipeline/e2e.test.ts
git commit -m "chore(pipeline): bump RULE_VERSION to v0.42.0; e2e covers multi-face layouts

Forces app Dexie hydration to refresh on first load with the multi-face
artifact. e2e test pins per-face attribution on the werewolf fixture."
```

---

## Task 6: Index back-face names in `cardNameIndex`

**Files:**
- Modify: `app/src/lib/cardNameIndex.ts`
- Modify: `app/src/lib/cardNameIndex.test.ts`

**Interfaces:**
- Consumes: combined `card.name` (e.g. "Peter Parker // Amazing Spider-Man") which already exists; optionally `card.faces[1].name` when present.
- Produces: `CardNameLookup.backFace: Map<string, NameLookupEntry>`. `lookupByName` checks it after `frontFace`, before `alternate`.

- [ ] **Step 1: Write the failing test**

In `app/src/lib/cardNameIndex.test.ts`, add (or extend an existing `describe`):

```ts
import { buildCardNameLookup, lookupByName } from './cardNameIndex';
import type { Card } from '@shared/types';

function dfcCard(): Card {
  return {
    oracleId: 'peter', name: 'Peter Parker // Amazing Spider-Man',
    set: 'spm', printings: ['spm'], collectorNumber: '10',
    manaCost: '{1}{W}', cmc: 2, colors: ['W'], colorIdentity: ['G','U','W'],
    typeLine: 'Legendary Creature', types: ['Creature'],
    subtypes: ['Human'], supertypes: ['Legendary'],
    oracleText: '', keywords: [], power: '0', toughness: '1',
    rarity: 'mythic', imageUrl: '',
    layout: 'modal_dfc',
    faces: [
      { name: 'Peter Parker', typeLine: '', types: [], subtypes: [], supertypes: [], oracleText: '', manaCost: '{1}{W}', colors: ['W'], power: '0', toughness: '1' },
      { name: 'Amazing Spider-Man', typeLine: '', types: [], subtypes: [], supertypes: [], oracleText: '', manaCost: '{1}{G}{W}{U}', colors: ['G','U','W'], power: '4', toughness: '4' },
    ],
    tags: [],
  };
}

it('resolves back face name to the same oracleId as the combined and front name', () => {
  const lookup = buildCardNameLookup(new Map([['peter', dfcCard()]]));
  const front = lookupByName(lookup, 'Peter Parker');
  const back = lookupByName(lookup, 'Amazing Spider-Man');
  const combined = lookupByName(lookup, 'Peter Parker // Amazing Spider-Man');
  expect(front?.oracleId).toBe('peter');
  expect(back?.oracleId).toBe('peter');
  expect(combined?.oracleId).toBe('peter');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && npm test -- cardNameIndex.test.ts`
Expected: FAIL — `lookupByName(lookup, 'Amazing Spider-Man')` returns `undefined`.

- [ ] **Step 3: Implement**

In `app/src/lib/cardNameIndex.ts`, add a `backFace` map to `CardNameLookup`:

```ts
export type CardNameLookup = {
  exact: Map<string, NameLookupEntry>;
  frontFace: Map<string, NameLookupEntry>;
  backFace: Map<string, NameLookupEntry>;
  alternate: Map<string, NameLookupEntry>;
};
```

In `buildCardNameLookup`, add `const backFace = new Map<string, NameLookupEntry>();` next to the others and populate inside the loop. Replace the existing front-face split block with:

```ts
const sepIdx = card.name.indexOf(DFC_SEPARATOR);
if (sepIdx !== -1) {
  const front = card.name.slice(0, sepIdx).toLowerCase();
  const back = card.name.slice(sepIdx + DFC_SEPARATOR.length).toLowerCase();
  if (!frontFace.has(front)) frontFace.set(front, entry);
  if (!backFace.has(back)) backFace.set(back, entry);
}
```

Also support back-face indexing from `card.faces[1]` (covers cases where a future card omits the `// Back` form from `name` but has faces, e.g. flip layout if added later):

```ts
const backName = card.faces?.[1]?.name?.toLowerCase();
if (backName && !backFace.has(backName)) backFace.set(backName, entry);
```

Update the return:

```ts
return { exact, frontFace, backFace, alternate };
```

Update `lookupByName`:

```ts
export function lookupByName(lk: CardNameLookup, name: string): NameLookupEntry | undefined {
  const lower = name.toLowerCase();
  return lk.exact.get(lower) ?? lk.frontFace.get(lower) ?? lk.backFace.get(lower) ?? lk.alternate.get(lower);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app && npm test -- cardNameIndex.test.ts`
Expected: PASS.

- [ ] **Step 5: Run all app tests to catch regressions**

Run: `cd app && npm test`
Expected: PASS. If a test that constructed a `Card` literal fails to compile because `layout` is now required, add `layout: 'normal'` to that literal.

- [ ] **Step 6: Commit**

```bash
git add app/src/lib/cardNameIndex.ts app/src/lib/cardNameIndex.test.ts
git commit -m "feat(app): index back-face names in cardNameIndex

Adds CardNameLookup.backFace so 'Amazing Spider-Man' resolves to Peter
Parker. Lookup precedence: exact > front > back > alternate. Sourced from
both 'Front // Back' name splitting and card.faces[1].name."
```

---

## Task 7: `CardDetailDrawer` flip support for transform/modal_dfc/meld

**Files:**
- Modify: `app/src/components/CardDetailDrawer.tsx`
- Create: `app/src/components/CardDetailDrawer.test.tsx`

**Interfaces:**
- Consumes: `Card.layout`, `Card.faces`, `CardTag.face` from Tasks 1, 2, 4.
- Produces: a drawer that for flippable layouts shows a face-flip button, swaps image + name + typeLine + oracleText + filtered tag chips when toggled, and binds `f` to flip.

- [ ] **Step 1: Write the failing test**

Create `app/src/components/CardDetailDrawer.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CardDetailDrawer from './CardDetailDrawer';
import { useGraphStore } from '../stores/graphStore';
import type { Card } from '@shared/types';

function dfcCard(): Card {
  return {
    oracleId: 'peter', name: 'Peter Parker // Amazing Spider-Man',
    set: 'spm', printings: ['spm'], collectorNumber: '10',
    manaCost: '{1}{W}', cmc: 2, colors: ['W'], colorIdentity: ['G','U','W'],
    typeLine: 'Legendary Creature', types: ['Creature'],
    subtypes: ['Human'], supertypes: ['Legendary'],
    oracleText: 'When Peter Parker enters...\n\nVigilance, reach', keywords: ['Transform'],
    power: '0', toughness: '1', rarity: 'mythic',
    imageUrl: 'http://test/front.jpg',
    layout: 'modal_dfc',
    faces: [
      { name: 'Peter Parker', typeLine: 'Legendary Creature — Human Scientist Hero',
        types: ['Creature'], subtypes: ['Human','Scientist','Hero'], supertypes: ['Legendary'],
        oracleText: 'When Peter Parker enters, create a 2/1 green Spider creature token with reach.',
        manaCost: '{1}{W}', colors: ['W'], power: '0', toughness: '1',
        imageUrl: 'http://test/front.jpg' },
      { name: 'Amazing Spider-Man', typeLine: 'Legendary Creature — Spider Human Hero',
        types: ['Creature'], subtypes: ['Spider','Human','Hero'], supertypes: ['Legendary'],
        oracleText: 'Vigilance, reach. Web-slinging granted.',
        manaCost: '{1}{G}{W}{U}', colors: ['G','U','W'], power: '4', toughness: '4',
        imageUrl: 'http://test/back.jpg' },
    ],
    tags: [
      { tagId: 'effect.create_creature_token', axis: 'effect', evidence: 'spider token', face: 'front' },
      { tagId: 'effect.has_vigilance', axis: 'effect', evidence: 'vigilance', face: 'back' },
    ],
  };
}

beforeEach(() => {
  useGraphStore.setState({
    cards: new Map([['peter', dfcCard()]]),
    edges: new Map(), edgesInbound: new Map(),
    tagCatalog: new Map([
      ['effect.create_creature_token', { tagId: 'effect.create_creature_token', axis: 'effect', label: 'Create token', description: '', pairsWith: [] }],
      ['effect.has_vigilance', { tagId: 'effect.has_vigilance', axis: 'effect', label: 'Has vigilance', description: '', pairsWith: [] }],
    ]) as any,
  });
});

function renderDrawer(card: Card) {
  return render(
    <MemoryRouter>
      <CardDetailDrawer card={card} onFocusCard={vi.fn()} onBack={vi.fn()}
        onForward={vi.fn()} canBack={false} canForward={false} />
    </MemoryRouter>
  );
}

describe('CardDetailDrawer multi-face', () => {
  it('flippable: shows front face initially, flip button is rendered', () => {
    renderDrawer(dfcCard());
    expect(screen.getByRole('heading', { name: /Peter Parker/i })).toBeInTheDocument();
    expect(screen.getByText(/create a 2\/1 green Spider/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Flip to back face/i)).toBeInTheDocument();
  });

  it('flip button swaps to back face: image, name, type line, oracle text', () => {
    renderDrawer(dfcCard());
    fireEvent.click(screen.getByLabelText(/Flip to back face/i));
    expect(screen.getByRole('heading', { name: /Amazing Spider-Man/i })).toBeInTheDocument();
    expect(screen.getByText(/Web-slinging granted/i)).toBeInTheDocument();
    const img = screen.getByRole('img') as HTMLImageElement;
    expect(img.src).toContain('back.jpg');
  });

  it('keyboard "f" flips the card', () => {
    renderDrawer(dfcCard());
    fireEvent.keyDown(window, { key: 'f' });
    expect(screen.getByRole('heading', { name: /Amazing Spider-Man/i })).toBeInTheDocument();
  });

  it('tag chips filter to the visible face', () => {
    renderDrawer(dfcCard());
    // front: Create-token chip visible, vigilance chip hidden
    expect(screen.getByText(/Create token/i)).toBeInTheDocument();
    expect(screen.queryByText(/Has vigilance/i)).toBeNull();
    fireEvent.click(screen.getByLabelText(/Flip to back face/i));
    expect(screen.queryByText(/Create token/i)).toBeNull();
    expect(screen.getByText(/Has vigilance/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && npm test -- CardDetailDrawer.test.tsx`
Expected: FAIL — drawer has no flip button, doesn't switch image/text, tags don't filter.

- [ ] **Step 3: Implement in `app/src/components/CardDetailDrawer.tsx`**

Add `useState`/`useEffect` for flip state and key binding. Branch the render by `card.layout`. The following diff replaces the existing JSX body of the function:

```tsx
import { useEffect, useRef, useState } from 'react';
// ... existing imports ...

const FLIPPABLE: ReadonlySet<string> = new Set(['transform', 'modal_dfc', 'meld']);

export default function CardDetailDrawer({
  card, onFocusCard, onBack, onForward, canBack, canForward,
}: Props) {
  const tagCatalog = useGraphStore((s) => s.tagCatalog);
  const scrollRef = useRef<HTMLElement | null>(null);
  const [face, setFace] = useState<'front' | 'back'>('front');

  const isFlippable = FLIPPABLE.has(card.layout ?? 'normal') && (card.faces?.length ?? 0) === 2;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && canBack) onBack();
      if (e.key === 'f' && isFlippable) setFace((f) => (f === 'front' ? 'back' : 'front'));
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onBack, canBack, isFlippable]);

  useEffect(() => {
    setFace('front');
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [card.oracleId]);

  const activeFace = isFlippable ? card.faces![face === 'front' ? 0 : 1]! : null;
  const displayName = activeFace?.name ?? card.name;
  const displayTypeLine = activeFace?.typeLine ?? card.typeLine;
  const displayOracleText = activeFace?.oracleText ?? card.oracleText;
  const displayImage = activeFace?.imageUrl ?? card.imageUrl;

  const visibleTags = isFlippable
    ? card.tags.filter((t) => t.face === face || t.face === undefined)
    : card.tags;

  return (
    <aside ref={scrollRef} className="h-full w-full overflow-y-auto border-l border-ink-line bg-ink-panel p-4 text-vellum">
      {/* nav buttons unchanged */}
      <div className="inline-flex overflow-hidden rounded-md border border-ink-line bg-ink-raised/60">
        <NavButton direction="back" disabled={!canBack} onClick={onBack} ariaLabel="Previous card" />
        <div className="h-8 w-px bg-ink-line" aria-hidden="true" />
        <NavButton direction="forward" disabled={!canForward} onClick={onForward} ariaLabel="Next card" />
      </div>

      <div className="foil-edge mt-3 overflow-hidden rounded-md relative" style={{ transitionDuration: '320ms' }}>
        <img src={displayImage} alt={displayName} className="w-full" />
        {isFlippable && (
          <button
            type="button"
            onClick={() => setFace((f) => (f === 'front' ? 'back' : 'front'))}
            aria-label={face === 'front' ? 'Flip to back face' : 'Flip to front face'}
            title={card.faces![face === 'front' ? 1 : 0]!.name}
            className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full border border-brass/50 bg-ink-bg/80 text-brass-hi shadow-md backdrop-blur transition-colors hover:bg-brass/20 focus-brass"
          >
            ↻
          </button>
        )}
      </div>

      <h2 className="mt-4 font-head text-3xl leading-tight text-vellum">{displayName}</h2>
      <p className="font-head italic text-sm text-vellum-mute">{displayTypeLine}</p>
      <div className="brass-hairline-soft mt-3" aria-hidden="true" />
      <div className="mt-3 flex items-center gap-3">
        <AddToDeckButton oracleId={card.oracleId} />
      </div>
      <div className="mt-3 whitespace-pre-wrap">
        <OracleText text={displayOracleText} />
      </div>
      <div className="mt-3 flex flex-wrap gap-1">
        {collapseParentChildChips(visibleTags, tagCatalog).map((t, i) => (
          <TagChip key={`${t.tagId}-${i}`} tag={t} def={tagCatalog.get(t.tagId)} />
        ))}
      </div>
      <InteractionsPanel oracleId={card.oracleId} onFocusCard={onFocusCard} />
    </aside>
  );
}
```

Keep the `NavButton` helper and the `ChevronLeft`/`ChevronRight` unchanged.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd app && npm test -- CardDetailDrawer.test.tsx`
Expected: PASS for all four assertions.

- [ ] **Step 5: Commit**

```bash
git add app/src/components/CardDetailDrawer.tsx app/src/components/CardDetailDrawer.test.tsx
git commit -m "feat(app): CardDetailDrawer flip support for transform/modal_dfc/meld

Adds a face-flip button overlaid on the card image. Clicking (or pressing
f) swaps image + name + type line + oracle text and filters tag chips to
the visible face. Single-face cards and split/adventure cards are not
flippable; their rendering is unchanged here (split/adventure handled in
the next task)."
```

---

## Task 8: `CardDetailDrawer` stacked rendering for split/adventure

**Files:**
- Modify: `app/src/components/CardDetailDrawer.tsx`
- Modify: `app/src/components/CardDetailDrawer.test.tsx`

**Interfaces:**
- Consumes: same as Task 7.
- Produces: for `split`/`adventure`, the drawer renders one image + two stacked text blocks, each labeled with the face's name and type line. Tag chips show every tag, each badged with its face.

- [ ] **Step 1: Extend the test file**

Add to `app/src/components/CardDetailDrawer.test.tsx`:

```tsx
function splitCard(): Card {
  return {
    oracleId: 'fire-ice', name: 'Fire // Ice',
    set: 'tdm', printings: ['tdm'], collectorNumber: '3',
    manaCost: '{1}{R}', cmc: 2, colors: ['R','U'], colorIdentity: ['R','U'],
    typeLine: 'Instant // Instant', types: ['Instant'],
    subtypes: [], supertypes: [],
    oracleText: 'Fire deals 2 damage...\n\nTap target permanent. Draw a card.',
    keywords: [], power: null, toughness: null,
    rarity: 'uncommon', imageUrl: 'http://test/fire-ice.jpg',
    layout: 'split',
    faces: [
      { name: 'Fire', typeLine: 'Instant', types: ['Instant'], subtypes: [], supertypes: [],
        oracleText: 'Fire deals 2 damage divided as you choose among one or two targets.',
        manaCost: '{1}{R}', colors: ['R'], power: null, toughness: null },
      { name: 'Ice', typeLine: 'Instant', types: ['Instant'], subtypes: [], supertypes: [],
        oracleText: 'Tap target permanent. Draw a card.',
        manaCost: '{1}{U}', colors: ['U'], power: null, toughness: null },
    ],
    tags: [
      { tagId: 'effect.deal_damage', axis: 'effect', evidence: 'fire', face: 'front' },
      { tagId: 'effect.tap_permanent', axis: 'effect', evidence: 'ice', face: 'back' },
    ],
  };
}

describe('CardDetailDrawer split/adventure', () => {
  beforeEach(() => {
    useGraphStore.setState({
      cards: new Map([['fire-ice', splitCard()]]),
      edges: new Map(), edgesInbound: new Map(),
      tagCatalog: new Map([
        ['effect.deal_damage', { tagId: 'effect.deal_damage', axis: 'effect', label: 'Deal damage', description: '', pairsWith: [] }],
        ['effect.tap_permanent', { tagId: 'effect.tap_permanent', axis: 'effect', label: 'Tap permanent', description: '', pairsWith: [] }],
      ]) as any,
    });
  });

  it('split: shows one image, both face names + both oracle text blocks, no flip button', () => {
    renderDrawer(splitCard());
    expect(screen.queryByLabelText(/Flip to back face/i)).toBeNull();
    expect(screen.getByText(/^Fire$/)).toBeInTheDocument();
    expect(screen.getByText(/^Ice$/)).toBeInTheDocument();
    expect(screen.getByText(/Fire deals 2 damage/i)).toBeInTheDocument();
    expect(screen.getByText(/Tap target permanent/i)).toBeInTheDocument();
    const imgs = screen.getAllByRole('img');
    expect(imgs.length).toBe(1);
  });

  it('split: tag chips show face badge', () => {
    renderDrawer(splitCard());
    // Two chips visible (no filtering), each tagged with its face
    expect(screen.getByText(/Deal damage/i)).toBeInTheDocument();
    expect(screen.getByText(/Tap permanent/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && npm test -- CardDetailDrawer.test.tsx`
Expected: FAIL — split rendering shows only `card.name` and `card.oracleText`, not the per-face decomposition.

- [ ] **Step 3: Implement**

In `CardDetailDrawer.tsx`, just below the `FLIPPABLE` constant add:

```ts
const STACKED: ReadonlySet<string> = new Set(['split', 'adventure']);
```

In the JSX body, branch after the image block. Replace the title/type/oracle-text section with this conditional structure:

```tsx
const isStacked = STACKED.has(card.layout ?? 'normal') && (card.faces?.length ?? 0) === 2;
// ...
{isStacked ? (
  <>
    <h2 className="mt-4 font-head text-3xl leading-tight text-vellum">{card.name}</h2>
    <p className="font-head italic text-sm text-vellum-mute">{card.typeLine}</p>
    <div className="brass-hairline-soft mt-3" aria-hidden="true" />
    <div className="mt-3 flex items-center gap-3">
      <AddToDeckButton oracleId={card.oracleId} />
    </div>
    {card.faces!.map((f, i) => (
      <div key={i} className="mt-4 border-t border-ink-line pt-3">
        <h3 className="font-head text-xl text-vellum">{f.name}</h3>
        <p className="font-head italic text-xs text-vellum-mute">{f.typeLine}</p>
        <div className="mt-2 whitespace-pre-wrap"><OracleText text={f.oracleText} /></div>
      </div>
    ))}
  </>
) : (
  <>
    <h2 className="mt-4 font-head text-3xl leading-tight text-vellum">{displayName}</h2>
    <p className="font-head italic text-sm text-vellum-mute">{displayTypeLine}</p>
    <div className="brass-hairline-soft mt-3" aria-hidden="true" />
    <div className="mt-3 flex items-center gap-3">
      <AddToDeckButton oracleId={card.oracleId} />
    </div>
    <div className="mt-3 whitespace-pre-wrap">
      <OracleText text={displayOracleText} />
    </div>
  </>
)}
<div className="mt-3 flex flex-wrap gap-1">
  {collapseParentChildChips(visibleTags, tagCatalog).map((t, i) => (
    <TagChip key={`${t.tagId}-${i}`} tag={t} def={tagCatalog.get(t.tagId)} />
  ))}
</div>
<InteractionsPanel oracleId={card.oracleId} onFocusCard={onFocusCard} />
```

Adjust `visibleTags`:

```ts
const visibleTags = isStacked
  ? card.tags
  : isFlippable
  ? card.tags.filter((t) => t.face === face || t.face === undefined)
  : card.tags;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd app && npm test -- CardDetailDrawer.test.tsx`
Expected: all assertions PASS (Task 7's tests and Task 8's tests both green).

- [ ] **Step 5: Commit**

```bash
git add app/src/components/CardDetailDrawer.tsx app/src/components/CardDetailDrawer.test.tsx
git commit -m "feat(app): CardDetailDrawer stacked rendering for split/adventure

For split (Fire // Ice) and adventure cards, render one image plus two
stacked text blocks (one per face) under the shared name + type line. No
flip button — the physical card is one object. All tags shown."
```

---

## Task 9: Multi-face badge on `CardGrid` tiles

**Files:**
- Modify: `app/src/components/CardGrid.tsx`
- Create: `app/src/components/CardGrid.test.tsx`

**Interfaces:**
- Consumes: `Card.layout` from Task 1.
- Produces: a small "↻" badge in the top-right corner of every tile whose `layout` ∈ {`transform`, `modal_dfc`, `meld`}.

- [ ] **Step 1: Write the failing test**

Create `app/src/components/CardGrid.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import CardGrid from './CardGrid';
import type { Card, CardLayout } from '@shared/types';

function makeCard(oracleId: string, layout: CardLayout): Card {
  return {
    oracleId, name: oracleId, set: 's', printings: ['s'], collectorNumber: '1',
    manaCost: '{1}', cmc: 1, colors: [], colorIdentity: [],
    typeLine: 'Creature', types: ['Creature'], subtypes: [], supertypes: [],
    oracleText: '', keywords: [], power: '1', toughness: '1',
    rarity: 'common', imageUrl: '',
    layout, tags: [],
  };
}

describe('CardGrid multi-face badge', () => {
  it('renders a multi-face badge for transform/modal_dfc/meld; none for normal/split/adventure', () => {
    const cards: Card[] = [
      makeCard('mfc', 'modal_dfc'),
      makeCard('tx', 'transform'),
      makeCard('me', 'meld'),
      makeCard('sp', 'split'),
      makeCard('ad', 'adventure'),
      makeCard('nm', 'normal'),
    ];
    render(<CardGrid cards={cards} onCardClick={vi.fn()} width={2000} height={800} />);
    const badges = screen.getAllByLabelText(/Has two faces/i);
    expect(badges.length).toBe(3); // modal_dfc + transform + meld
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && npm test -- CardGrid.test.tsx`
Expected: FAIL — no badge in DOM.

- [ ] **Step 3: Implement in `app/src/components/CardGrid.tsx`**

Add a constant and a badge inside the cell renderer:

```tsx
const FLIPPABLE_LAYOUTS: ReadonlySet<string> = new Set(['transform', 'modal_dfc', 'meld']);
```

Inside the cell-renderer JSX, after the `<img>` and before `<OwnedBadge>`, add:

```tsx
{FLIPPABLE_LAYOUTS.has(card.layout ?? 'normal') && (
  <span
    aria-label="Has two faces"
    title={`Two-faced card (${card.layout})`}
    className="absolute right-2 top-2 inline-flex h-5 w-5 items-center justify-center rounded-full border border-brass/60 bg-ink-bg/80 text-[11px] text-brass-hi shadow-sm"
  >
    ↻
  </span>
)}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd app && npm test -- CardGrid.test.tsx`
Expected: PASS (3 badges).

- [ ] **Step 5: Commit**

```bash
git add app/src/components/CardGrid.tsx app/src/components/CardGrid.test.tsx
git commit -m "feat(app): multi-face badge on card grid tiles

Small '↻' indicator in the top-right corner of every transform/modal_dfc/
meld tile. Split/adventure get no badge — the physical card has only one
side, so there's nothing to flip from the browse grid."
```

---

## Task 10: `InteractionsPanel` face annotation on edge labels

**Files:**
- Modify: `app/src/components/InteractionsPanel.tsx`

**Interfaces:**
- Consumes: `CardTag.face`, `Card.faces` from Tasks 1 + 4.
- Produces: when the source card of an edge is multi-face and exactly one source-card tag matches `edge.sourceTagId` with a `face` field, append " · *<face name>*" to the row's reason line.

> No new test file — extend the existing app test suite if one already covers `InteractionsPanel`; otherwise this is a small visual annotation that's covered transitively by manual verification. The risk surface is small (a string concatenation), so a unit test is optional. If you want to add one, mirror Task 7's `dfcCard` fixture and check that "Amazing Spider-Man" appears in the reason row when the matching tag has `face: 'back'`.

- [ ] **Step 1: Add a helper above the `InteractionsPanel` component**

```ts
function faceLabelForEdge(
  sourceCard: Card | undefined,
  sourceTagId: string,
): string | null {
  if (!sourceCard?.faces) return null;
  const matches = sourceCard.tags.filter((t) => t.tagId === sourceTagId && t.face);
  if (matches.length !== 1) return null;
  const idx = matches[0]!.face === 'front' ? 0 : 1;
  return sourceCard.faces[idx]?.name ?? null;
}
```

- [ ] **Step 2: Use the helper in the reason renderer**

Replace the inner `n.reasons.map(...)` block (currently lines 309–319) with:

```tsx
{n.reasons.map((r, i) => {
  const src = tagCatalog.get(r.sourceTagId)?.label ?? r.sourceTagId;
  const tgt = tagCatalog.get(r.targetTagId)?.label ?? r.targetTagId;
  const arrow = r.direction === 'outbound' ? '→' : '←';
  // For outbound edges, the SELECTED card is the source. For inbound, the
  // NEIGHBOR card is the source. Pull the face label from the right side.
  const sourceCard = r.direction === 'outbound'
    ? cards.get(oracleId)
    : cards.get(n.oracleId);
  const faceLabel = faceLabelForEdge(sourceCard, r.sourceTagId);
  return (
    <span key={i}>
      {i > 0 && '; '}
      {src} {arrow} {tgt}
      {faceLabel && <em className="text-vellum-dim"> · {faceLabel}</em>}
    </span>
  );
})}
```

- [ ] **Step 3: Run app tests to confirm no regression**

Run: `cd app && npm test`
Expected: PASS. The InteractionsPanel render path doesn't have a unit test today; failures would surface as compile or render errors only.

- [ ] **Step 4: Commit**

```bash
git add app/src/components/InteractionsPanel.tsx
git commit -m "feat(app): annotate InteractionsPanel rows with source face

When the source side of an edge is multi-face and exactly one of its tags
matches the edge's sourceTagId with a face attribution, append the face
name (e.g. 'Amazing Spider-Man') to the reason line. Multiple matches
suppress the annotation — the interaction fires from either side."
```

---

## Task 11: Run the full gate; rebuild artifact; smoke-test the app

**Files:** none modified — verification only.

- [ ] **Step 1: Root-level full gate**

Run: `npm test`
Expected: PASS — pipeline + shared types + app vitest + app build (tsc + vite).

- [ ] **Step 2: Coverage baseline check**

Run: `npm run rule:coverage -- --all | tail -3`
Expected: aggregate "taggable %" ≥ baseline (~99.0%). Note the new aggregate in the commit message.

- [ ] **Step 3: Rebuild the artifact**

Run: `npm run build:cards -- --standard`
Expected: writes `app/public/data/cards-standard.json`. Count multi-face cards in it:

```bash
node -e "const a = require('./app/public/data/cards-standard.json'); const ct = {}; for (const c of a.cards) ct[c.layout] = (ct[c.layout]||0)+1; console.table(ct);"
```

Expected: nonzero counts for `transform`, `modal_dfc`, `meld`, `split`, `adventure`.

- [ ] **Step 4: Manual smoke test (UI verification skill)**

Per CLAUDE.md: "For UI or frontend changes, start the dev server and use the feature in a browser before reporting the task as complete."

Run: `cd app && npm run dev` and open `http://localhost:5173`. Find Peter Parker (search "Amazing Spider-Man" — should resolve), open the drawer, click the flip button (and try the `f` key), verify image + text + tag chips swap correctly. Find a split card (Fire // Ice, if present in current Standard — otherwise pick any `layout: 'split'` card from the count above), verify both text blocks render under one image. Find a transform card, verify the browse-grid badge appears.

If anything fails, fix and recommit before moving on.

- [ ] **Step 5: (Optional) Playwright smoke**

Run: `cd app && npm run e2e`
Expected: existing smoke test passes. If the smoke test happens to render a flippable card, optionally extend it to assert the flip button is present.

- [ ] **Step 6: Final commit (if any fixes)**

Only commit if Step 4 surfaced an actual bug. Otherwise skip.

```bash
git add <changed files>
git commit -m "fix(app): <specific fix> from manual multi-face smoke"
```

---

## Self-review

**Spec coverage:**
- "Add per-face data to Card" → Tasks 1, 2.
- "Run tag rules per face, attribute on each tag" → Task 4.
- "Edges stay card-level" → no task changes `graph.ts` or edges — explicitly preserved.
- "UI flip for transform/modal_dfc/meld" → Task 7.
- "Stacked text for split/adventure" → Task 8.
- "Browse-grid badge" → Task 9.
- "Search resolves back face" → Task 6.
- "Interactions panel face annotation" → Task 10.
- "Bump RULE_VERSION" → Task 5.
- "Coverage shouldn't drop" → Task 4 step 5 + Task 11 step 2.

**Placeholder scan:** no TBD/TODO/implement-later strings; every step has either the exact code or an exact command + expected output.

**Type/signature consistency:**
- `Face.imageUrl?` declared in Task 1, used as undefined for split/adventure in Task 2, fallback in Task 7's `displayImage`. Consistent.
- `CardTag.face` declared as `'front' | 'back'` everywhere.
- `CardLayout` discriminant is the same six-value union everywhere.
- `tagCardsForTest` in Task 4 mirrors the production change in the same step — names match.
- `lookupByName` precedence (exact → front → back → alternate) is consistent across Task 6 and Tasks 7+ that depend on it via `WizardProvider`.

No gaps. Ready for execution.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-14-multi-face-cards.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

**Which approach?**
