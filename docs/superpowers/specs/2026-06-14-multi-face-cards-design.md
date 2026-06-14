# Multi-face cards (transform / modal_dfc / meld / split / adventure)

**Status:** design  
**Date:** 2026-06-14  
**Scope:** dataset, rule pipeline, graph consumers, and UI for cards that have two faces — flipping permanents (Peter Parker // Amazing Spider-Man, werewolves, meld pairs) and dual-text-block cards (Fire // Ice, adventure creatures).

## Motivation

A canonical case: Peter Parker is a `modal_dfc` legendary creature with a `Transform` ability whose back face is Amazing Spider-Man. Today the pipeline concatenates both faces' oracle text with `\n\n`, stores the joined blob in `card.oracleText`, keeps only the front image in `card.imageUrl`, and tags the merged text with no idea which face an ability came from. The UI shows one image and one text block; users have no way to see Amazing Spider-Man at all in the app.

Coverage in the current Standard cache (`.cache/scryfall/*.json`):

| Layout | Count | Two images? | Both text on one physical card? |
|---|---|---|---|
| `transform` | 82 | yes | no |
| `modal_dfc` | 15 | yes | no |
| `meld` | 3 | yes | no |
| `split` | 43 | no | yes |
| `adventure` | 88 | no | yes |

~231 cards across five layouts. Out of scope: `prepare` (47 — newer mechanic, deferred), `flip` (none in Standard), and stateful single-object layouts (`saga`, `class`, `case`, `leveler`) which already render fine as one text block.

## Goals

1. **Dataset:** carry per-face data through the artifact so consumers can render either side.
2. **Rule pipeline:** run tag rules per face and attribute each tag to the face it came from.
3. **Graph:** existing edges keep working unchanged at the card level; the `InteractionsPanel` can show which face an edge fires from by reading the source tag's `face` attribution.
4. **UI:** `CardDetailDrawer` flips between faces for transform/modal_dfc/meld, and shows both text blocks under one image for split/adventure.
5. **Search:** typing the back face's name (e.g. "Amazing Spider-Man") resolves to the card's `oracleId` via `cardNameIndex`.

## Non-goals

- Per-face edges. The pairing rules stay card-level. (We deliberately picked "tag per-face, edges card-level" over "split edges so X→Y back-face-only is a distinct edge.")
- Including `prepare` in this round.
- True meld-pair joining (two `meld` parts share back-face art but Scryfall surfaces them as separate cards with `all_parts` linkage — for v1 each meld-parent surfaces its own faces, the back-face image we expose is the one Scryfall associates with the parent).
- Reworking DEK export. Multi-face cards are still exported by combined name + first printing's `mtgoId`; round-trip behaviour doesn't change.

## Decisions taken during brainstorming

1. **Scope:** transform + modal_dfc + meld + split + adventure (no `prepare`).
2. **Tagging:** rules run per face; each `CardTag` carries `face: 'front' | 'back'`. Edges stay card-level.
3. **Drawer UI — flippable cards:** flip button overlaid on the card image; clicking swaps image + oracle text + type line; tag chips re-filter to the visible face.
4. **Drawer UI — split/adventure:** one image, both text blocks stacked beneath. No flip button.
5. **Search:** index back-face names in `cardNameIndex` so they resolve to the same `oracleId`.
6. **Interactions:** label edges with the source face when the source card is multi-face and the source tag has a `face` attribution.

## Data model

`shared/types.ts`:

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
  // Present for transform/modal_dfc/meld (each face has its own art).
  // Undefined for split/adventure (one shared physical card; use card.imageUrl).
  imageUrl?: string;
};

export type Card = {
  // ... existing fields unchanged ...
  layout: CardLayout;
  // Two entries when the card is multi-face; absent for layout='normal'.
  faces?: Face[];
  // ... existing fields unchanged ...
};

export type CardTag<TagId extends string = string> = {
  tagId: TagId;
  axis: TagAxis;
  evidence: string;
  // Present iff the source card is multi-face. Identifies which face's
  // oracle text the rule matched against. faces[0]→'front', faces[1]→'back'.
  face?: 'front' | 'back';
  metadata?: TagId extends keyof TagMetadataMap
    ? TagMetadataMap[TagId]
    : Record<string, unknown>;
};
```

Top-level fields kept for back-compat (no consumer breakage):

- `card.name` — the combined display name (e.g. `"Peter Parker // Amazing Spider-Man"`).
- `card.oracleText` — concatenated face text (today's behaviour). Consumers that don't care about faces continue to work; `rule:coverage`'s denominator and `coverage.isTaggable` keep their current semantics.
- `card.imageUrl` — front-face image for transform/modal_dfc/meld, single shared image for split/adventure.
- `card.typeLine`, `card.types`, `card.subtypes`, `card.supertypes`, `card.colors`, `card.manaCost`, `card.power`, `card.toughness` — unchanged top-level values come from Scryfall's top-level fields, which are derived from the combined card (Scryfall already provides a synthesized top-level type line like `"Legendary Creature — Human Scientist Hero // Legendary Creature — Spider Human Hero"`). UI that wants per-face data reads `card.faces[i]`.

## Pipeline changes

### `pipeline/fetch.ts` — `stripScryfallCard`

Set `card.layout = (raw.layout as CardLayout) ?? 'normal'`. When `raw.card_faces` exists AND `raw.layout` ∈ {`transform`, `modal_dfc`, `meld`, `split`, `adventure`}, build a `faces[]` array. Per face:

- `name`, `oracle_text`, `mana_cost`, `power`, `toughness`, `colors` — direct copies from `raw.card_faces[i]`.
- `typeLine` → run through the existing `parseTypeLine` to populate `types`, `subtypes`, `supertypes`.
- `imageUrl` — for transform/modal_dfc/meld, take `raw.card_faces[i].image_uris?.normal ?? large`. For split/adventure, leave undefined; the top-level `card.imageUrl` (sourced from `raw.image_uris.normal`) is the shared image.

Top-level `card.imageUrl`:

- transform/modal_dfc/meld: prefer `raw.card_faces[0].image_uris?.normal` (front).
- split/adventure: prefer `raw.image_uris?.normal` (shared).
- normal: unchanged.

Top-level `card.oracleText` concatenation logic stays exactly as it is today. The rule application step is what changes (next section), not this serialization.

### Rule application

In the tag-application step (where rules currently run against `normalize(card.oracleText, card.name, ...)`), branch per card:

- If `card.faces` is present: for each face index `i`:
  - Normalize that face's `oracleText` with that face's `name`.
  - Run all rules; for each emitted tag, set `tag.face = i === 0 ? 'front' : 'back'`.
- If absent: run rules once on the joined `card.oracleText` (today's behaviour); do not set `tag.face`.

Duplicate tags across faces (e.g. both faces have `effect.has_flying`) stay as two separate `CardTag` entries with different `face` values. The graph builder dedupes edges by `(source, target, effectTag, consumerTag)` so this does not multiply edges.

### `pipeline/normalize.ts`

No structural change. `replaceSelfReferences` already splits `Front // Back` on `//` so per-face normalization will see only one face's name segment matter for that face's text. Negative-test: ensure that normalizing front-face text with `cardName: "Peter Parker"` still self-references correctly (no `//` to split — works the same as a normal legendary card).

### `pipeline/catalog.ts`

Bump `RULE_VERSION` to `v0.15.0` (or the next minor) so the app invalidates its Dexie hydration cache on first load with the new artifact.

### `pipeline/coverage.ts`

`isTaggable(card)` reads from `card.types`, `card.oracleText`, etc. — top-level fields stay populated. No change. Coverage % should be approximately unchanged: rules cover the same text, just chunked per face.

### `pipeline/rules/*`

No rule file changes for v1. If a rule wants to be face-aware in the future (e.g. "this trigger only matters if the back face has it"), it can read `card.faces` directly — the framework provides everything needed without altering the rule signature.

### `pipeline/merge.ts`

When a card has printings in multiple Standard sets, the merge step keeps the first-seen printing's `set` / `collectorNumber` / `imageUrl`. Apply the same rule to `card.faces`: keep the first-seen printing's per-face `imageUrl` values. Other face fields (name, oracleText, manaCost, types, P/T, colors) are oracle-level and identical across printings — assert equality across printings during merge or just keep the first.

### `pipeline/emit.ts`

Mechanical: `Card` and `CardTag` serialize through JSON; the new optional fields land in the artifact automatically.

## App / UI changes

### `app/src/lib/cardNameIndex.ts`

For each card with `faces`, in addition to the existing entries (combined name, printedName, flavorName), add an entry per face: `faces[i].name → oracleId`. The combined-name entry remains for legacy lookups. Make sure duplicate face names (extremely unlikely but theoretically possible) follow the same conflict resolution as today.

### `app/src/components/CardDetailDrawer.tsx`

Add local state `const [face, setFace] = useState<'front' | 'back'>('front')`. Reset to `'front'` on `card.oracleId` change (extend the existing scroll-reset effect).

Render branches:

1. **`card.layout` ∈ {`transform`, `modal_dfc`, `meld`}** — render a "flip" button overlaid on the card image (top-right corner; absolute-positioned). The image src is `card.faces?.[face === 'front' ? 0 : 1]?.imageUrl ?? card.imageUrl` (fall back to the shared image if face-specific is missing). Title (`h2`) shows `card.faces[i].name`; subtitle shows `faces[i].typeLine`; `OracleText` is fed `faces[i].oracleText`. Tag chips filter to `tag.face === face`. On a multi-face card, every tag should have a `face` field; if a face-less tag is encountered (shouldn't happen, but defensively), show it regardless of which face is visible.
2. **`card.layout` ∈ {`split`, `adventure`}** — render a single image (`card.imageUrl`), then below it render `card.faces[0]` and `card.faces[1]` stacked: each face's name as a small heading, then its type line, then `<OracleText>`. No flip button. Tag chips show every tag with their face label (e.g. small "front"/"back" badge on the chip).
3. **`card.layout === 'normal'`** — unchanged.

The flip button is a small icon button with `aria-label="Flip to back face"` / `"Flip to front face"` and `title` set to the other face's name for hover discoverability. Keyboard: bind `f` to flip when a flippable card is open.

### `app/src/components/InteractionsPanel.tsx`

When rendering an edge whose source card is multi-face, look up the source card's tags. If exactly one tag matches `edge.sourceTagId` and has a `face`, append " · *<face name>*" to the row's display (e.g. row label becomes `"Peter Parker · Amazing Spider-Man — web-slinging"`). If multiple matching tags exist on different faces (both faces emit the same tag id), no face annotation (the interaction fires from "either side").

### Browse grid

Add a small badge ("↻" glyph) in the corner of `CardTile` (or wherever cards render in the grid) for any card with `card.layout` ∈ {`transform`, `modal_dfc`, `meld`}. Pure visual indicator, no interaction.

### Wizard / deck importers

`WizardProvider.tsx` already routes through `cardNameIndex`, so back-face lookups come for free once the index includes those entries. Verify the goldfish import flow (paste a decklist with "Amazing Spider-Man") resolves to the right card.

## Migration & rollout

- **Artifact:** all new fields are additive. Bump `RULE_VERSION` so the app's Dexie cache rehydrates.
- **Rebuild:** `npm run build:cards -- --standard` regenerates the artifact. No cache invalidation needed at the Scryfall layer (the new logic reads from the same cached JSON).
- **Backwards compat:** legacy artifacts produced by older pipeline versions (where `faces` and `layout` are absent) still load. The drawer treats absent `layout` as `'normal'`.
- **No backend, no DB schema changes** (the app is a SPA over the artifact, by repo convention).

## Testing

### Pipeline

- `pipeline/fetch.test.ts` — extend with fixtures for one card per multi-face layout. Assert:
  - `card.layout` matches.
  - `card.faces.length === 2`.
  - For transform/modal_dfc/meld: both `face.imageUrl` populated; `card.imageUrl` matches `faces[0].imageUrl`.
  - For split/adventure: `face.imageUrl` undefined for both faces; `card.imageUrl` matches `raw.image_uris.normal`.
  - Per-face `name`, `oracleText`, `manaCost`, `power`, `toughness`, parsed `types`/`subtypes`/`supertypes` are correct.
- `pipeline/tag-per-face.test.ts` — new file. Synthesize a fixture multi-face card (front oracle: "Flying. ~ deals 1 damage to any target."; back oracle: "Trample. When ~ enters, draw a card.") and assert:
  - Front face's tags carry `face: 'front'`.
  - Back face's tags carry `face: 'back'`.
  - A single-face card's tags have no `face` field.
- `pipeline/e2e.test.ts` — after building a Standard artifact (existing fixture), assert nonzero counts for `layout: 'transform'`, `'modal_dfc'`, `'meld'`, `'split'`, `'adventure'`.
- Regression: run `npm run rule:coverage -- --all` before and after the pipeline change. Aggregate "taggable %" should not drop. Per-rule counts may shift slightly because rules now run on smaller text chunks (a rule whose regex spans two faces' text via the join would lose those hits — verify none of the current rules do this).

### App

- `app/src/components/CardDetailDrawer.test.tsx` — render Peter Parker fixture; assert front face shown initially; click flip button; assert image src changed to back image, oracle text changed to Amazing Spider-Man's, tag chips filtered to back-face tags.
- `app/src/components/InteractionsPanel.test.tsx` — render an edge whose source is Peter Parker with `sourceTagId` matching a back-face tag; assert " · Amazing Spider-Man" appears in the row label.
- `app/src/lib/cardNameIndex.test.ts` — add Peter Parker fixture; assert lookup by "Peter Parker", "Amazing Spider-Man", and the combined name all return the same oracleId.
- `app/tests/e2e/*.spec.ts` (Playwright) — extend smoke test: navigate to Peter Parker, click flip, assert back-face name and oracle text appear in the DOM.

## Open questions

None blocking. A few minor implementation choices left to the plan:

- Exact icon for the flip button (rotate-arrow vs. card-flip glyph) — implementer's call, match existing iconography.
- Whether the browse-grid badge needs a tooltip ("This card has two faces") — small, can be added if it tests poorly.
- Whether to also surface a face label inside tag chips on split/adventure cards (where both faces' tags are shown together). Default to yes for clarity.

## Files touched (approximate)

Pipeline:
- `shared/types.ts` — `CardLayout`, `Face`, `Card.layout`, `Card.faces`, `CardTag.face`.
- `pipeline/fetch.ts` — `stripScryfallCard` builds `faces[]` and sets `layout`.
- `pipeline/graph.ts` (or wherever tag rules run) — per-face rule application.
- `pipeline/catalog.ts` — `RULE_VERSION` bump.
- `pipeline/fetch.test.ts`, `pipeline/tag-per-face.test.ts` (new), `pipeline/e2e.test.ts`.

App:
- `app/src/components/CardDetailDrawer.tsx` — flip state, branched rendering.
- `app/src/components/InteractionsPanel.tsx` — face annotation on edge labels.
- `app/src/components/CardTile.tsx` (or equivalent) — multi-face badge.
- `app/src/lib/cardNameIndex.ts` — index back-face names.
- Component + e2e tests as listed above.
