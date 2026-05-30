// pipeline/rules/effect.pacify.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.pacify',
  axis: 'effect',
  label: 'Locks down a creature',
  description: 'Prevents a creature from attacking/blocking ("can\'t attack or block") — the Pacifism / Arrest family.',
  pairsWith: ['condition.cares_subtype.aura'],
};

// "Enchanted/Equipped/Target creature can't attack" or "can't attack or block"
// or "can't block" — the lockdown family (Pacifism, Cooped Up, Arrest, Imprisoned).
// Negative lookahead `(?![^.]{0,40}?(?:this turn|until end of turn))` excludes
// one-shot combat tricks like "target creature can't block this turn"
// (Breeches, Eager Pillager / Falter) — those are not permanent lockdowns.
// v0.14.1: noun alternation also accepts "permanent" — Petrify enchants any
// artifact-or-creature and its lockdown text uses "permanent".
const PATTERN =
  /\b(?:enchanted|equipped|target|that|each) (?:creatures?|permanents?) (?:can'?t|cannot|can not) (?:attack(?: or block)?|block(?: or attack)?|attack, block)\b(?![^.]{0,40}?(?:this turn|until end of turn))/;

export const rule: Rule = {
  id: 'effect.pacify',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ["can't attack", "can't block"], proximity: ['enchanted', 'equipped', 'target'], window: 4 },
};
