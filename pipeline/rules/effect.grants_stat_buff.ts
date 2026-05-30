// pipeline/rules/effect.grants_stat_buff.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.grants_stat_buff',
  axis: 'effect',
  label: 'Grants stat buff',
  description: 'Grants an anthem-style +N/+N buff to one or more creatures (no counter involved).',
  pairsWith: [],
};

// Matches anthem-style stat buffs: "[creatures|target X] get(s) +N/+N".
// Only positive buffs — negative pumps (e.g. "-3/-3") read as combat tricks/removal.
// `(?:\d+|x)` accepts variable-anthem buffs like Moonshaker Cavalry's "+X/+X
// until end of turn, where X is the number of creatures you control" — same
// anthem axis, just scaled by a count.
const PATTERN =
  /(?:creatures?|permanents?|attackers?|blockers?|target [a-z]+(?: [a-z]+)?)[^.]{0,40}? gets? \+(?:\d+|x)\/\+(?:\d+|x)/;

// v0.12.9: tribal-anthem frame — "<tribe>s you control get +N/+N" (Goddric,
// Cloaked Reveler grants "Dragons you control get +1/+0" through a nested
// quoted ability). The subject is a plural noun + "you control" but the noun
// isn't the literal word "creatures". Bounded to keep this from false-
// positiving on prose ("foods you control get …" wouldn't be a stat buff in
// practice because Foods can't have +N/+N applied, so this is acceptably
// narrow). The noun must end in -s/-en to gate on plurals.
const TRIBAL_PATTERN =
  /\b(?:[a-z]+(?:s|en)|merfolk)\s+you\s+control[^.]{0,40}? gets? \+(?:\d+|x)\/\+(?:\d+|x)/;

export const rule: Rule = {
  id: 'effect.grants_stat_buff',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN) ?? t.match(TRIBAL_PATTERN);
    return m ? { evidence: m[0] } : false;
  },
};
