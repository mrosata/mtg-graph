// pipeline/rules/effect.cast_from_exile.ts
//
// Cards that cast (or play) a spell directly from the exile zone — distinct
// from `effect.cast_for_free` (which is about cost-bypass via "without paying
// its mana cost") and from `effect.cast_from_library_top` (Future Sight,
// Vivien Champion — library-top permission).
//
// SCOPE: this rule deliberately covers the non-keyword cast-from-exile shape.
// The keyword-bearing forms have their own dedicated tags:
//   - Plot → effect.has_plot
//   - Discover → effect.discover
//   - Adventure DFC → effect.adventure_card
//   - Foretell/Suspend/Encore — Scryfall keyword tags
// Cards in those families typically use templating like "cast the creature
// later from exile" or "cast it from exile". Those phrasings are intentionally
// excluded here so we don't double-tag.
//
// PATTERNS:
//   (1) Theft / temporary control of opponent's exiled cards —
//       "for as long as (they|it) remains? exiled" (Outrageous Robbery, Gonti,
//       Cruelclaw's Heist, Decadent Dragon, Extraordinary Journey).
//   (2) Anaphoric "cast a spell this way" — back-reference to an exile clause
//       earlier in the same ability (Intrepid Paleontologist, Osteomancer
//       Adept, Valgavoth, Gonti, Outrageous Robbery).
//   (3) Explicit "cast ... from among (the )?(cards exiled|exiled cards)" —
//       cast from the exile pile rooted to this permanent or the spell's own
//       exile (Voltstrider, Kylox, Visionary Inventor).
//
// PAIRS WITH: condition.cares_exile_pile — these effects produce or fuel the
// exile-as-resource axis. Many of these cards also self-tag cares_exile_pile
// since they reference the pile internally; that's fine — the graph edge
// forms between this card's effect and OTHER cards' cares_exile_pile.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.cast_from_exile',
  axis: 'effect',
  label: 'Casts a spell from exile',
  description:
    'Casts (or plays) a spell directly from the exile zone — theft, anaphoric "cast a spell this way", or from-among-exiled-cards recasting. Distinct from `effect.cast_for_free` (cost-bypass axis) and the keyword-specific tags (effect.has_plot, effect.discover, effect.adventure_card).',
  pairsWith: ['condition.cares_exile_pile'],
};

// Pattern 2 ("cast a spell this way") is anaphoric — it back-references an
// exile clause earlier in the same ability. v0.20: guard with a backward
// 200-char window check requiring `exile|exiled|from exile`, otherwise the
// phrase FPs on graveyard-recast templating (Osteomancer Adept: "you may
// cast that card from your graveyard ... cast a spell this way").
const PATTERN_2 = /\b(?:you may )?cast (?:a |an )?spells? this way\b/;

// v0.22.0 — Painter's Studio / Defaced Gallery: anaphoric "play them/it/those
// cards" follows an exile-top-N clause. Same backward exile-window guard as
// PATTERN_2 keeps it from FPing on graveyard reanimation.
const PATTERN_PLAY_ANAPHOR =
  /\b(?:you may )?play (?:it|them|those cards)(?:\s+(?:this turn|until end of turn|until the end of your next turn))?\b/;

const PATTERNS = [
  // (1) Theft / opponent's exiled cards remain available
  /\bfor as long as (?:they|it) remains? exiled\b/,
  // (3) Explicit cast from the exile pile. Filler accepts up to 12 tokens
  // between "cast" and "from among" (handles "any number of instant and/or
  // sorcery spells" — 7 tokens of qualifier plus headroom).
  //
  // v0.33+ — extend the trailing alternation to admit Goliath Daydreamer
  // shapes: "from among cards you own in exile with dream counters on them"
  // (counter-keyed) and "from among cards you own in exile" (bare).
  /\bcast (?:[\w\-'/]+\s+){0,12}?from among (?:the )?(?:cards exiled|exiled cards|cards (?:you own )?(?:in )?exiled? with [\w\s']+? on them|cards (?:you own )?in exile)\b/,
  // (4) v0.14.41 — anaphoric "from among those cards" where "those cards"
  // binds to a preceding `exile the top X cards of …` clause in the same
  // effect (Laughing Jasper Flint, Dack Fayden, Knowledge Pool, Etali
  // family). Same cast-from-exile semantic — opponent-library theft is
  // the canonical hit. The phrase is distinctive enough on its own
  // (MTG oracle templating only uses "from among those cards" after an
  // exile clause).
  /\bcast (?:[\w\-'/]+\s+){0,12}?from among those cards\b/,
  // (5) v0.21.0 — Norin, Swift Survivalist: explicit impulse-cast permission
  // "play that card from exile (this turn)?". The "play that card" verb
  // covers both creature and land plays; "from exile" anchors to the source
  // zone — distinct phrasing from the existing anaphoric forms.
  /\bplay that card from exile(?:\s+this turn)?\b/,
  // (6) v0.33+ — Dream Harvest / Sanar: "cast the exiled cards" / "cast (any
  // number of )?cards exiled this way". Both are explicit cast verbs binding
  // to a prior exile-cards clause; the phrase is distinctive on its own.
  /\bcast (?:the exiled cards|(?:any number of )?cards exiled this way)\b/,
  // (7) v0.33+ — Taster of Wares: anchored "exile ... you may cast it/that
  // card for as long as you control this creature". Tight anchor required
  // because the bare "you may cast it" template appears in many contexts.
  /\bexile(?:d)?\b[^.]{0,120}?\byou may cast (?:it|that card|the exiled cards?) for as long as you control (?:__self__|this creature)\b/,
];

export const rule: Rule = {
  id: 'effect.cast_from_exile',
  axis: 'effect',
  match: (t) => {
    for (const re of PATTERNS) {
      const m = t.match(re);
      if (m) return { evidence: m[0] };
    }
    // Pattern 2 — anaphoric, requires a backward exile-token within 200 chars
    // to disambiguate from graveyard-recast templating (Osteomancer Adept).
    const m2 = t.match(PATTERN_2);
    if (m2 && m2.index !== undefined) {
      const before = t.substring(Math.max(0, m2.index - 200), m2.index);
      if (/\b(?:exile|exiles|exiled|exiling|from exile)\b/.test(before)) {
        return { evidence: m2[0] };
      }
    }
    // v0.22.0 — "play them/it/those cards" anaphoric arm. Same 200-char
    // backward exile-window guard as PATTERN_2. Disambiguates from graveyard
    // reanimation ("return ... to your hand. you may play them this turn").
    const mPlay = t.match(PATTERN_PLAY_ANAPHOR);
    if (mPlay && mPlay.index !== undefined) {
      const before = t.substring(Math.max(0, mPlay.index - 200), mPlay.index);
      if (/\b(?:exile|exiles|exiled|exiling|from exile)\b/.test(before)) {
        return { evidence: mPlay[0] };
      }
    }
    return false;
  },
  nearMiss: { anchors: ['exile', 'exiled'], proximity: ['cast', 'play', 'this way', 'remain'], window: 6 },
};
