// pipeline/rules/trigger.life_changed.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'trigger.life_changed',
  axis: 'trigger',
  label: 'Triggers on life total change',
  description: 'Triggers when a player gains or loses life.',
  pairsWith: ['effect.life_changed', 'effect.deals_damage'],
};

export const rule: Rule = {
  id: 'trigger.life_changed',
  axis: 'trigger',
  match: (t) => {
    // v0.20 — admit "gains or loses life" / "loses or gains life" disjunction
    // (Moonstone Harbinger). The disjunction interrupts the gain/lose to
    // life adjacency the base pattern requires.
    const m = t.match(
      /whenever (?:you|an opponent|a player) (?:gains? or loses?|loses? or gains?|gains?|loses?) life/,
    );
    return m ? { evidence: m[0] } : false;
  },
};
