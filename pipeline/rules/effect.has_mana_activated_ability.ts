// pipeline/rules/effect.has_mana_activated_ability.ts
//
// Narrower sibling of effect.has_activated_ability — restricted to activations
// whose cost contains mana, i.e. activations that are reducible by
// Training-Grounds / Heartstone / Agatha-style payoffs.
//
// Why split this out? Crew is technically an activated ability (rule 702.122),
// but its cost is "tap any number of creatures with total power N+" — there
// is no mana component, so mana-cost reducers cannot affect Crew. The broad
// effect.has_activated_ability tag matches Crew via keyword short-circuit
// (correct for Pithing-Needle / "whenever you activate"-style payoffs), but
// pairing it with cost-reducer-of-activations payoffs creates ~216 false
// edges in Standard against 54 pure-Crew vehicles. This tag covers the
// reducer-pairing side without that noise.
//
// Equip IS included via keyword short-circuit: Equip's cost is mana
// ("Equip {2}") and Training Grounds does reduce it.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';
import { normalizeOracleText } from '../normalize';

export const tagDef: TagDef = {
  tagId: 'effect.has_mana_activated_ability',
  axis: 'effect',
  label: 'Has a mana-cost activated ability',
  description:
    'This permanent has at least one activated ability whose cost includes mana (and is therefore reducible by Training-Grounds-style cost reducers). Excludes Crew (cost is creatures, not mana).',
  pairsWith: ['condition.reduces_activated_mana_cost'],
};

const SYMBOL_ACTIVATED_PATTERN = /\{[wubrgcxstq0-9](?:\/[wubrgcps])?\}[^.\n]{0,60}?:\s/;

const PROSE_ACTIVATED_PATTERN =
  /(?:^|\.\s|\n|—\s)(?:sacrifice|discard|exile|pay|tap|untap|reveal|remove|return) [^.\n]{0,80}?:\s/i;

const PERMANENT_TYPES = ['Creature', 'Artifact', 'Enchantment', 'Land', 'Planeswalker', 'Battle'];

// Only Equip — Crew is deliberately excluded; see header comment.
const BATTLEFIELD_MANA_ACTIVATED_KEYWORDS = new Set(['Equip']);

export const rule: Rule = {
  id: 'effect.has_mana_activated_ability',
  axis: 'effect',
  matchCard: (card) => {
    if (!card.types.some((t) => PERMANENT_TYPES.includes(t))) return false;
    const kw = card.keywords.find((k) => BATTLEFIELD_MANA_ACTIVATED_KEYWORDS.has(k));
    if (kw) return { evidence: kw.toLowerCase() };
    const normalized = normalizeOracleText(card.oracleText, card.name);
    const m = normalized.match(SYMBOL_ACTIVATED_PATTERN) ?? normalized.match(PROSE_ACTIVATED_PATTERN);
    return m ? { evidence: m[0].trim() } : false;
  },
};
