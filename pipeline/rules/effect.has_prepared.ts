// pipeline/rules/effect.has_prepared.ts
//
// Strixhaven's Prepared mechanic: a creature with a back-face instant or
// sorcery; while the creature is "prepared," you may cast a copy of the
// back-face spell from the battlefield (which unprepares it).
//
// Synthesized from `keywords` because the parenthetical reminder text gates
// the mechanic but isn't a reliable text-only signal — Scryfall surfaces it
// as an explicit keyword. This is a thematic filter tag (category=theme); the
// back-face spell's own type/effect tags already carry the rules-text edges,
// so this tag is the discovery hook ("show me all Prepared cards") rather
// than an edge source. No "Prepared matters" payoff cards exist in Standard
// yet — when they do, add a `condition.prepared_matters` rule paired here.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.has_prepared',
  axis: 'effect',
  label: 'Has Prepared',
  description:
    "Strixhaven keyword. This creature enters prepared (or becomes prepared on a trigger). While prepared, you may cast a copy of its back-face instant or sorcery.",
  pairsWith: [],
  category: 'theme',
};

export const rule: Rule = {
  id: 'effect.has_prepared',
  axis: 'effect',
  // v0.35.0 — Batch 9: AND-guard the keywords check with a self-signal in
  // oracle text. Scryfall over-populates `keywords` to include 'Prepared' on
  // cards that GRANT Prepared (Skycoach Waypoint, Biblioplex Tomekeeper)
  // rather than ones that themselves enter/become prepared. Self-keyword
  // axis violation. Require either:
  //   (a) MFC name ("X // Y") — the Prepared back-face is the spell side,
  //       which is the canonical Strixhaven Prepared frame; OR
  //   (b) oracle text says "this creature/permanent enters/becomes prepared"
  //       (single-faced cards that are themselves Prepared at ETB).
  // Verified all 47 cards in cards-standard.json with Prepared keyword
  // satisfy one of these guards EXCEPT Skycoach Waypoint and Biblioplex
  // Tomekeeper, which are the FPs being corrected.
  matchCard: (card) => {
    if (!card.keywords.includes('Prepared')) return false;
    if (card.name.includes('//')) return { evidence: 'Prepared' };
    const text = (card.oracleText || '').toLowerCase();
    if (/this (?:creature|permanent) enters prepared/.test(text)) return { evidence: 'Prepared' };
    if (/this (?:creature|permanent) becomes prepared/.test(text)) return { evidence: 'Prepared' };
    return false;
  },
};
