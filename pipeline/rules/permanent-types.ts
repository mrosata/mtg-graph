// pipeline/rules/permanent-types.ts
//
// Shared list of permanent card types used by typed effect/trigger rules.
// Battle (introduced in MOM) is intentionally excluded — current Standard
// has no battles. Add it here and to the relevant parent.children lists
// when a future set re-introduces battles.

export const PERMANENT_TYPES = ['creature', 'artifact', 'enchantment', 'planeswalker', 'land'] as const;

export type PermanentType = (typeof PERMANENT_TYPES)[number];

// Alternation string used in regex negative lookaheads, e.g.
//   "destroy target (?!.*(?:noncreature|nonartifact|...) ) permanents?"
export const PERMANENT_TYPE_EXCLUDERS = PERMANENT_TYPES.map((t) => `non${t}`).join('|');
