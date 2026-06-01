// pipeline/rules/trigger.damage_dealt.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'trigger.damage_dealt',
  axis: 'trigger',
  label: 'Triggers on damage dealt',
  description: 'Triggers when damage is dealt.',
  pairsWith: ['effect.deals_damage'],
};

export const rule: Rule = {
  id: 'trigger.damage_dealt',
  axis: 'trigger',
  match: (t) => {
    // Subject must be a noun phrase WITHOUT intervening commas — otherwise a
    // different trigger clause ("whenever an opponent casts a spell ..., __self__
    // deals 1 damage") matches because "deals damage" is the effect, not the
    // trigger. Using `[^,.]*?` keeps the match within a single clause.
    // v0.14.9 — quantifier slot relaxed from `(?:\w+ )?` (one word) to
    // `(?:[\w\s]+?\s)?` (any whitespace-separated quantifier inside the
    // clause). Innocent Bystander: "is dealt 3 or more damage" — three
    // words in the quantifier slot. Recurring family ("N or more damage").
    // v0.14.36 — verb `deals` relaxed to `deal(?:s)?` so plural-subject
    // active-voice triggers ("one or more creatures you control deal combat
    // damage to a player", Yarus, Roar of the Old Gods) also match. Common
    // in face-down / token go-wide payoffs.
    // v0.20.0 — `when(?:ever)?` admits single-fire `when` triggers
    // (Cracked Skull aura: "when enchanted creature is dealt damage").
    const m = t.match(/when(?:ever)? (?:[^,.]*?)(?:deal(?:s)? (?:[\w\s]+?\s)?damage|(?:is|are) dealt (?:[\w\s]+?\s)?damage)/);
    return m ? { evidence: m[0] } : false;
  },
};
