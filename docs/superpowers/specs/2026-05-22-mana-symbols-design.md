# Mana symbols in card text

**Date:** 2026-05-22
**Status:** Design

## Problem

Card oracle text and deck-validation messages render mana tokens as literal braces — e.g. `{X}`, `{4}{R}{G}`, `{B}{B}{B}` appear in the UI as raw text. The existing `ManaCost` component (`app/src/components/ManaCost.tsx`) is only wired into deck rows and the active-deck pill, and it renders symbols as small tailwind-styled colored circles with single letters inside, which doesn't match how MTG mana looks anywhere else in the ecosystem.

## Goal

Render mana tokens as proper MTG mana icons everywhere they appear in the app: card oracle text, deck-validation messages, deck-row cost columns, and active-deck color pills.

## Approach

Adopt **`mana-font`** (Andrew Gioia, SIL OFL), the community-standard mana icon font used by EDHREC, MTGGoldfish, Archidekt, and others. It ships every symbol (W/U/B/R/G/C, generics, X/Y/Z, hybrids, Phyrexian, snow, energy, tap/untap, planeswalker loyalty) as a single woff2 with CSS classes of the form `ms ms-<id> ms-cost ms-shadow`.

Wizards does not publish an official mana symbol kit; Mana font is the de-facto standard.

## Components

### `ManaSymbol` (new)

Renders a single `{...}` token as one font glyph.

- **Input:** a token string like `R`, `4`, `X`, `T`, `W/U`, `W/P`, `S`, `C`.
- **Output:** `<i class="ms ms-<id> ms-cost ms-shadow" aria-label="<readable>" />` where:
  - Solid colors: `R`/`U`/`B`/`G`/`W`/`C` → `ms-r`, `ms-u`, etc.
  - Generics: `0`–`20`, `X`/`Y`/`Z` → `ms-0`, `ms-x`, etc.
  - Hybrid: `W/U` → `ms-wu`; Phyrexian: `W/P` → `ms-wp`.
  - Tap/untap: `T` → `ms-tap`, `Q` → `ms-untap`.
  - Snow: `S` → `ms-s`.
- **Fallback for unknown tokens:** a small inline gray pill containing the raw inner text. Never silently drop a symbol.
- **`aria-label`** uses human-readable names (`"red"`, `"two"`, `"tap"`, `"white or blue"`) so screen readers don't say "ms-r".

### `OracleText` (new)

Renders a string with embedded `{...}` tokens.

- Splits on `/\{[^}]+\}/`, mapping non-token runs to text and token runs through `ManaSymbol`.
- Preserves whitespace via the parent's `whitespace-pre-wrap` (caller's responsibility — the same as today's drawer).
- Newlines inside the input are preserved (no special handling needed; React renders `\n` correctly under `whitespace-pre-wrap`).

### `ManaCost.tsx` (rewrite)

Becomes a thin wrapper. Today it custom-builds tailwind circles; after this change it walks the same `/\{[^}]+\}/` regex and emits `<ManaSymbol>` per token. The existing call signature `<ManaCost cost={string | null} />` is preserved so call sites don't change.

The previous `colorMap` / `symbolClass` helpers and tailwind circle classes are deleted.

## Call sites

| Site | File:line | Change |
|---|---|---|
| Card oracle text in drawer | `app/src/components/CardDetailDrawer.tsx:44` | Replace `{card.oracleText}` with `<OracleText text={card.oracleText} />` |
| Deck validation messages | `app/src/components/DeckPanel.tsx` (validation render path) | Wrap message render in `<OracleText>` if validation returns strings with `{...}` literals (most likely). To be verified during implementation. |
| Deck row cost column | `app/src/components/DeckPanel.tsx:137` | No call-site change — `<ManaCost>` upgrades automatically. |
| Active-deck color pill | `app/src/pages/DecksPage.tsx:121` | No call-site change — `<ManaCost>` upgrades automatically. |

## Styling

- Add `import 'mana-font/css/mana.css';` to `app/src/main.tsx` (one global load).
- Symbols inline in text use `ms ms-cost ms-shadow` at `1em`, riding the text baseline.
- Cost-column and pill symbols use the same classes; the parent controls size via Tailwind text-size utilities (`text-sm`, etc.).
- The font's CSS gives symbols `vertical-align: middle`. Eyeball alignment in the drawer; nudge with a small inline style only if necessary.
- The existing tailwind circle styling in `ManaCost.tsx` is removed entirely.

## Testing

**Unit (Vitest + RTL), new files alongside components:**

- `ManaSymbol.test.tsx`
  - `{R}` produces an element with class `ms-r` and `aria-label="red"`.
  - `{2}` produces `ms-2`.
  - `{W/U}` produces `ms-wu`.
  - `{T}` produces `ms-tap`.
  - Unknown token `{ZZZ}` renders a fallback element containing `ZZZ`.
- `OracleText.test.tsx`
  - `"{T}: Add {G}. Draw a card."` renders three mana-symbol elements (T, G — and the colon/period stay as text). Verify by querying for `[aria-label="tap"]`, `[aria-label="green"]`, and the literal strings `": Add "`, `". Draw a card."`.
  - Empty string renders nothing without crashing.
  - String with no tokens renders as a single text run.

**Manual visual:**

- Load `/cards/agatha-of-the-vile-cauldron` (or open via drawer): `{X}` and `{4}{R}{G}` show as icons.
- Open a deck with the Hollowmurk Siege violation: `{B}{B}{B}` in the validation message shows as icons.
- Active-deck pill on `/decks`: W/U/B/R/G show as the real icons, not letter bubbles.

## Out of scope

- Set symbols (Keyrune font) — separate package; the screenshots didn't flag set symbols.
- Planeswalker loyalty markers like `[+1]`/`[-3]` — these are `[...]` not `{...}`; leave as plain text.
- Adventure/MDFC split-face rendering — deferred to v0.8 per `CLAUDE.md`.
- LLM verification pass — unrelated; tracked in `pipeline/reports/v0.7-coverage-gap.md`.

## Risks

- **Font load on initial paint.** woff2 is ~30KB. Acceptable; one-time load on the SPA entry, cached after.
- **Token coverage gaps.** If oracle text contains a symbol form Mana font doesn't have (rare — e.g. half-mana from un-sets, which Standard doesn't include), the fallback pill keeps the symbol visible. No silent drop.
- **Validation message format.** The plan assumes deck-validation returns strings with literal `{B}{B}{B}`. If it instead returns structured React, the wrap point shifts but the components don't change. Verified during implementation.
