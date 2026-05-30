// pipeline/rules/effect.land_becomes_island.ts
//
// Flood-counter / land-type-change axis. The mono-blue "Sea" theme — Eluge
// drops flood counters on lands turning them into Islands, and Avatar Kyoshi
// converts your whole board. Pairs with condition.cares_islands (manufacturing
// fresh Islands feeds anything that counts them) and with effect.add_mana
// (the lands being mutated are mana producers).
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.land_becomes_island',
  axis: 'effect',
  label: 'Land becomes an Island',
  description: 'Mutates an existing land into an Island (flood counter, type-change clause) without creating a new land.',
  pairsWith: [
    // Cross-axis only — effect→effect (e.g. to effect.add_mana) violates the
    // catalog invariant. The Islands-matter side carries the relationship.
    'condition.cares_islands',
  ],
};

const PATTERNS = [
  // Eluge's flood counter clause
  /\bflood counters?\b/,
  // Direct "becomes an Island" — but only when applied to an existing land,
  // not a token. Excludes "create ... Island ... token" via the negative test
  // case in the test file (regex below relies on "land" subject context).
  /\b(?:that |this |target |each )land(?: you control)? becomes an island\b/,
  // Broader "lands you control become Islands" / "becomes an island in addition"
  /\blands? you control becomes? an island\b/,
  /\bbecomes? an island in addition to its other types\b/,
];

export const rule: Rule = {
  id: 'effect.land_becomes_island',
  axis: 'effect',
  match: (t) => {
    for (const re of PATTERNS) {
      const m = t.match(re);
      if (m) return { evidence: m[0] };
    }
    return false;
  },
  nearMiss: {
    anchors: ['island'],
    proximity: ['flood', 'becomes', 'land'],
    window: 6,
  },
};
