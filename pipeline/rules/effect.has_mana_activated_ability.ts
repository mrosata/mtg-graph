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

// A cost segment qualifies as mana-bearing only if it contains a W/U/B/R/G/C
// or X symbol, or a generic-mana digit symbol. Tap ({T}), untap ({Q}), and
// snow ({S}) symbols do NOT count — Training Grounds and other activated-
// mana-cost reducers cannot reduce them. Hybrid / Phyrexian / 2-or-mana
// pip variants ({W/U}, {W/P}, {2/W}) all begin with a qualifying char.
const MANA_BEARING_SYMBOL = /\{[wubrgcx0-9]/;

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
    // Walk every match of the activation patterns (not just the first) — a
    // card can have a tap-only mana ability followed later by a mana-bearing
    // ability, and we need to fire on the latter even if the former precedes.
    const symbolMatches = normalized.matchAll(new RegExp(SYMBOL_ACTIVATED_PATTERN, 'g'));
    for (const m of symbolMatches) {
      if (MANA_BEARING_SYMBOL.test(m[0])) return { evidence: m[0].trim() };
    }
    const proseMatches = normalized.matchAll(new RegExp(PROSE_ACTIVATED_PATTERN, 'gi'));
    for (const m of proseMatches) {
      if (MANA_BEARING_SYMBOL.test(m[0])) return { evidence: m[0].trim() };
    }
    return false;
  },
};
