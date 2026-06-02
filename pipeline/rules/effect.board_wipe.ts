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

// "destroy|exile|sacrifice all|each [adjectives ...] (creatures|permanents|artifacts|enchantments|...)"
// Allow commas and "and"/"or" between adjective tokens so "artifacts and enchantments" matches.
// 2026-06-01 audit Group 7 — Steel Hellkite: "destroy each nonland permanent
// ... whose controller was dealt combat damage by this creature this turn" is
// combat-damage-gated targeted removal of a narrow subset, NOT a wipe. The
// negative lookahead on the specific "whose controller/owner was dealt|lost|
// taken (damage)" tail suppresses this template without affecting genuine
// wipes (Wrath of God, Cyclonic Rift, etc.).
// 2026-06-02 audit batch — admit `sacrifices?` alongside `destroy|exile`
// (Destined Confrontation: "each player ... sacrifices all other creatures
// they control"). Forced-edict sweeps in the sacrifice form are
// semantically board wipes.
const PATTERN =
  /\b(?:destroy|exile|sacrifices?)\s+(?:all|each)\s+(?:[\w\-]+[,\s]+){0,6}?(?:creatures?|permanents?|artifacts?|enchantments?|planeswalkers?|nonland\s+permanents?|nontoken\s+permanents?|nontoken\s+creatures?)\b(?![^.]{0,150}\bwhose\s+(?:controller|owner)\s+(?:was|has)\s+(?:dealt|lost|taken)\b)/;

// 2026-06-02 audit batch — Day of Black Sun: "each creature ... destroy
// those creatures." Anaphoric verb + "those creatures" referent gated on
// a preceding "each creature" / "all creatures" antecedent in the same
// sentence (period boundary). Distinct from a bare "destroy those
// creatures" — needs the wipe-scope antecedent to qualify.
const PATTERN_ANAPHORIC_THOSE =
  /\b(?:each|all)\s+(?:[\w\-]+\s+){0,6}?creatures?\b[^.]*\.\s*(?:destroy|exile|sacrifices?)\s+those\s+creatures\b/;

// v0.14.9 — red-sweeper frame: "deals N damage to each (nontoken )?creature
// [and planeswalker]". Same axis as destroy/exile-all-creatures (sweeps the
// whole battlefield) but with damage as the verb. Ill-Timed Explosion,
// Pyroclasm, Anger of the Gods, Sweltering Suns, Brotherhood's End.
const PATTERN_DAMAGE_SWEEP =
  /\bdeals\s+(?:\d+|x)\s+damage\s+to\s+each\s+(?:nontoken\s+|nonland\s+)?(?:creature|permanent)(?:\s+and\s+(?:planeswalker|player))?\b/;

// v0.30 Group 20 — mass -N/-N debuff frame: "all (other )?creatures get
// -N/-N until end of turn" (Shefet Archfiend). Functionally a wipe (any
// creature with toughness ≤ N dies). Anchored on "all" so single-target
// -N/-N debuffs stay outside this rule (those go to effect.debuff_minus_n).
const PATTERN_MASS_DEBUFF =
  /\ball\s+(?:other\s+)?creatures\s+[^.]{0,40}?gets?\s+-\d+\/-\d+\b/;

export const rule: Rule = {
  id: 'effect.board_wipe',
  axis: 'effect',
  match: (t) => {
    const m =
      t.match(PATTERN) ??
      t.match(PATTERN_DAMAGE_SWEEP) ??
      t.match(PATTERN_MASS_DEBUFF) ??
      t.match(PATTERN_ANAPHORIC_THOSE);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['all', 'each'], proximity: ['destroy', 'exile'], window: 6 },
};
