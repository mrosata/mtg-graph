// pipeline/rules/effect.grants_cast_from_graveyard.ts
//
// Grants permission to cast (or play) cards from a graveyard — the
// non-keyword license axis. Muldrotha, Karador, The Gitrog Monster (older
// printings), Bilbo Thief in the Night, Counterpoint, Daring Waverider,
// Conduit of Worlds, Edgar Master Machinist, Past in Flames-style.
//
// Distinct from `condition.cast_from_graveyard`, which fires on the keyword
// family (Flashback, Disturb, Escape, Jump-start, Unearth, Mayhem). Those
// cards SELF-cast from the graveyard via a printed keyword; this tag fires
// on the static / triggered permission to cast OTHER cards from a graveyard.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.grants_cast_from_graveyard',
  axis: 'effect',
  label: 'Grants cast from graveyard',
  description:
    'Grants permission to cast or play cards from a graveyard — license-style (Muldrotha / Karador / Conduit of Worlds / Past in Flames family). Distinct from `condition.cast_from_graveyard` (Flashback/Escape/Disturb keyword cards self-casting from grave).',
  // The natural producers are graveyard-cares triggers and mill effects
  // (filling the graveyard with castable cards). Mirror the
  // condition.cast_from_graveyard pairings.
  pairsWith: ['trigger.card_drawn_discarded', 'condition.cares_graveyard'],
  category: 'theme',
};

// Self-keyword forms — "you may cast this card/spell from your graveyard"
// shows up in Flashback / Disturb / Mayhem reminder text and on the
// transform-cards-style "you may cast it from your graveyard" referring to
// the host itself. These are NOT a grant — they're a self-cast license tied
// to a keyword. Match-and-skip first.
const SELF_KEYWORD_PATTERNS = [
  /\byou may cast this (?:card|spell) from (?:your|a) graveyard\b/,
];

const POSITIVE_PATTERNS = [
  // "you may cast <subject> from (your|a|an opponent's) graveyard"
  // <subject> is typed and ranges over "a/an/the/target/up to N/<count> X
  // (card|cards|spell|spells|permanent spell|creature spell|...)" — common
  // permission frames. Anchor on "you may cast" + a noun-headed object
  // before "from your graveyard".
  /\byou may cast\s+(?:a|an|the|target|up to|one|two|three|any number of|[\w\-,'\s]+? )?(?:cards?|spells?|permanent spells?|creature spells?|artifact spells?|instant(?: or sorcery)?(?: spells?| cards?)?|sorcery spells?|enchantment spells?|planeswalker spells?|that card|the top card)\b[\w\-,'\s{}\d+/=]*?\s+from (?:your|a|an opponent's|target opponent's|each opponent's|each player's) graveyards?\b/,
  // "you may play <subject> from (your|a) graveyard" — land / permanent
  // play permission (Conduit of Worlds, Crucible of Worlds, Ramunap
  // Excavator, Muldrotha-style "you may play a land … from your graveyard").
  /\byou may play\s+(?:a |an |the |target |[\w\-,'\s]+? )?(?:land|lands|card|cards|permanent|permanents)\b[\w\-,'\s{}\d+/=]*?\s+from (?:your|a|an opponent's|target opponent's) graveyards?\b/,
  // "cast a <kind> spell … from your graveyard" — Muldrotha's clause uses
  // "you may play a land AND cast a permanent spell of each permanent type
  // from your graveyard". The "you may" governs the whole clause but the
  // "cast" verb sits in a coordinated clause; anchor on the verb directly.
  /\bcast a (?:permanent|creature|artifact|enchantment|instant|sorcery|planeswalker|noncreature)(?: spell)?(?: of each permanent type)? from (?:your|a) graveyards?\b/,
  // 2026-06-01 audit Group 6 — Sphinx of Forgotten Lore (flashback grant),
  // Cursecloth Wrappings (embalm grant), Snapcaster Mage-style frames.
  // Granting a graveyard-cast keyword IS the license axis — semantically
  // equivalent to "you may cast that card from your graveyard". The
  // condition.cast_from_graveyard axis is for PRINTED keywords; this is
  // the GRANT side.
  // 2026-06-01 audit batch — Songcrafter Mage: "target instant or sorcery
  // card in your graveyard gains harmonize". Harmonize is the FIN/TDM
  // graveyard-cast keyword; same license axis as Flashback.
  // v0.35.0 — Batch 32: `__self__` admitted in the keyword alternation.
  // Cards literally named after a graveyard-cast keyword (Flashback the
  // instant, Harmonize the sorcery) get the keyword in their grant clause
  // re-written to `__self__` by `normalize.replaceSelfReferences`. The
  // strong frame anchor ("card in your graveyard gains") keeps this safe
  // — only the two cards literally named after these keywords match.
  /\bcards?\s+in\s+(?:your|a|an opponent's|target opponent's)\s+graveyards?\s+gains?\s+(?:flashback|jump-start|disturb|escape|unearth|embalm|eternalize|aftermath|mayhem|harmonize|__self__)\b/,
];

export const rule: Rule = {
  id: 'effect.grants_cast_from_graveyard',
  axis: 'effect',
  match: (t) => {
    for (const re of SELF_KEYWORD_PATTERNS) {
      if (re.test(t)) return false;
    }
    for (const re of POSITIVE_PATTERNS) {
      const m = t.match(re);
      if (m) return { evidence: m[0] };
    }
    return false;
  },
  nearMiss: { anchors: ['you may cast', 'you may play'], proximity: ['graveyard', 'from your'], window: 12 },
};
