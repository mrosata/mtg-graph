// pipeline/rules/effect.board_wipe.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.board_wipe',
  axis: 'effect',
  label: 'Sweeps the board',
  description: 'Destroys or exiles all creatures (or all of a category) at once.',
  pairsWith: ['trigger.creature_dies', 'trigger.creature_leaves_battlefield', 'trigger.permanent_leaves_battlefield'],
};

// "destroy|exile all|each [adjectives ...] (creatures|permanents|artifacts|enchantments|...)"
// Allow commas and "and"/"or" between adjective tokens so "artifacts and enchantments" matches.
// 2026-06-01 audit Group 7 — Steel Hellkite: "destroy each nonland permanent
// ... whose controller was dealt combat damage by this creature this turn" is
// combat-damage-gated targeted removal of a narrow subset, NOT a wipe. The
// negative lookahead on the specific "whose controller/owner was dealt|lost|
// taken (damage)" tail suppresses this template without affecting genuine
// wipes (Wrath of God, Cyclonic Rift, etc.).
const PATTERN =
  /\b(?:destroy|exile)\s+(?:all|each)\s+(?:[\w\-]+[,\s]+){0,6}?(?:creatures?|permanents?|artifacts?|enchantments?|planeswalkers?|nonland\s+permanents?|nontoken\s+permanents?|nontoken\s+creatures?)\b(?![^.]{0,150}\bwhose\s+(?:controller|owner)\s+(?:was|has)\s+(?:dealt|lost|taken)\b)/;

// v0.14.9 — red-sweeper frame: "deals N damage to each (nontoken )?creature
// [and planeswalker]". Same axis as destroy/exile-all-creatures (sweeps the
// whole battlefield) but with damage as the verb. Ill-Timed Explosion,
// Pyroclasm, Anger of the Gods, Sweltering Suns, Brotherhood's End.
const PATTERN_DAMAGE_SWEEP =
  /\bdeals\s+(?:\d+|x)\s+damage\s+to\s+each\s+(?:nontoken\s+|nonland\s+)?(?:creature|permanent)(?:\s+and\s+(?:planeswalker|player))?\b/;

export const rule: Rule = {
  id: 'effect.board_wipe',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN) ?? t.match(PATTERN_DAMAGE_SWEEP);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['all', 'each'], proximity: ['destroy', 'exile'], window: 6 },
};
