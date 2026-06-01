// pipeline/rules/effect.grants_flash.ts
//
// Grants flash to other spells — Vedalken Orrery / Leyline of Anticipation /
// Emergence Zone / High Fae Trickster / Valley Floodcaller / Alchemist's
// Refuge family. The "license" form: "you may cast <spells> as though they
// had flash" / "as though it had flash" (single-spell or specific-type).
//
// Distinct from `effect.has_flash` (printed Flash keyword on the card itself)
// AND from the "you may cast THIS spell as though it had flash" self-cost
// frame (Asinine Antics, Mystical Tether) which is a conditional flash on
// the card being cast and is covered semantically by has_flash / cost rules.
//
// Why "this spell" must be excluded: Scryfall's `keywords` array doesn't add
// Flash for these cards because the flash is conditional, and the effect is
// scoped to the card itself — not a grant to other spells.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.grants_flash',
  axis: 'effect',
  label: 'Grants flash',
  description:
    'Grants flash to spells or permanents — Vedalken Orrery / Leyline of Anticipation / High Fae Trickster family. License form ("you may cast <spells> as though they had flash"). Distinct from `effect.has_flash` (printed keyword on the card itself).',
  pairsWith: [],
  category: 'theme',
};

// License form (a): "you may cast <subject> as though (they|it) had flash"
// where <subject> is anything OTHER than "this spell".
//   Subject can be "spells", "<type> spells", "<type> spells and <type>
//   spells", "spells this turn", "sorcery spells", etc.
// Negative lookahead `(?!this spell)` prevents the self-cost frame.
// Allow up to 80 chars of subject material (type-list "sorcery spells and
// dragon spells", time qualifier "spells this turn", scope "spells of any
// color") between "cast" and "as though".
const LICENSE_PLURAL = /\byou may cast (?!this spell\b)[\w\s,\-]{0,80}?spells?[\w\s,\-]{0,40}? as though they had flash\b/;
// (b) Singular subject: "<some specific spell> ... can be cast as though it
// had flash" — Progenitor's Icon's "the next spell of the chosen type you
// cast this turn can be cast as though it had flash".
const LICENSE_SINGULAR = /\b(?:the next spell|that spell)[\w\s,]{0,80}?can be cast as though it had flash\b/;
// (c) Anthem form: "<creatures|spells> you control have flash". Currently no
// known Standard card uses this exact phrasing but the family is canonical.
const ANTHEM = /\b(?:creatures|spells|permanents)\s+you control\s+(?:have|has|gain)\s+flash\b/;

export const rule: Rule = {
  id: 'effect.grants_flash',
  axis: 'effect',
  match: (t) => {
    const m = t.match(LICENSE_PLURAL) ?? t.match(LICENSE_SINGULAR) ?? t.match(ANTHEM);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['flash', 'as though'], proximity: ['cast', 'spells', 'may'], window: 8 },
};
