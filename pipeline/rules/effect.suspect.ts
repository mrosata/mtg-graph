// pipeline/rules/effect.suspect.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.suspect',
  axis: 'effect',
  label: 'Suspect',
  description:
    'MKM keyword action. Targets a creature and gives it suspect status (menace, can\'t block). Producer for `condition.cares_suspected` payoffs and acts as a menace-grant feeder for `condition.cares_evasion` (suspected creatures count as menace creatures).',
  pairsWith: ['condition.cares_suspected', 'condition.cares_evasion'],
};

// Match the keyword action `suspect <object>` where the object is a
// creature target reference. Frame variants:
//   1. "suspect it" — most common, after a punctuation break establishing
//      the antecedent (Agrus Kos, Caught Red-Handed, Person of Interest, …)
//   2. "and/then/may suspect <obj>" — chained or modal clause
//      (Case of the Stashed Skeleton "and suspect it"; Rubblebelt Braggart
//      "you may suspect it")
//   3. "suspect enchanted creature" — aura form (Convenient Target)
//   4. "suspect one of (the) (other) creatures" — transfer frame
//      (Frantic Scapegoat)
//   5. "suspect up to N other target creature(s) (you control)" — generic
//      target form (Absolving Lammasu, Clandestine Meddler, Reasonable
//      Doubt, Rune-Brand Juggler, J. Jonah Jameson)
//
// The leading word-boundary `\b` keeps the verb form distinct from the
// adjective "suspected".
const PATTERN =
  /\b(?:(?:and|then|may) )?suspect (?:it|enchanted creature|one of (?:the )?(?:other )?creatures?|(?:up to (?:one|two|three)\s+)?(?:other\s+)?target creatures?)\b/;

export const rule: Rule = {
  id: 'effect.suspect',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: {
    anchors: ['suspect'],
    proximity: ['target creature', 'it', 'enchanted creature', 'creature you control'],
    window: 8,
  },
};
