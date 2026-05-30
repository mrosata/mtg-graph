// pipeline/rules/condition.cares_activated_abilities.ts
//
// Payoff side of the "activated abilities matter" theme — Agatha of the Vile
// Cauldron, Training Grounds, Heartstone, Biomancer's Familiar, Pithing
// Needle, Phyrexian Revoker. We require structural context ("activated
// abilities of ...", "whenever ... activates an ability", "activated ability
// resolves") rather than the bare phrase "activated ability" so a card that
// merely *has* an activated ability doesn't tag itself as a payoff.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'condition.cares_activated_abilities',
  axis: 'condition',
  label: 'Cares about activated abilities',
  description: 'References activated abilities of other permanents — cost reducers, activate triggers, or activation restrictions.',
  pairsWith: ['effect.has_activated_ability'],
  category: 'theme',
};

// Payoff scoping: ability-grant ("has all activated abilities of"),
// restriction ("activated abilities of X can't be activated"), Pithing Needle.
const SCOPE_PATTERN = /\bactivated abilities? of\b/;
// Activate triggers: "whenever you activate an ability" / "whenever a
// creature activates an ability". Allow up to ~30 chars of subject between
// "whenever" and the verb so phrases like "whenever an opponent" work.
const TRIGGER_PATTERN = /\bwhenever (?:you|[a-z' ]{0,30}?)\s+activates?\s+an?\s+ability\b/;
// Resolve/trigger references to an activated ability.
const RESOLVE_PATTERN = /\bactivated abilit(?:y|ies)\s+(?:resolves?|triggers?)/;

// Pure mana-cost reducers (Agatha, Training Grounds, Heartstone, Blossoming
// Tortoise, Forensic Gadgeteer, Mutagen Man) match SCOPE_PATTERN but their
// payoff is reducing the mana cost — they're handled by
// condition.reduces_activated_mana_cost, which pairs narrowly with
// effect.has_mana_activated_ability (excludes Crew). If a card's only "cares"
// frame is the scope phrase AND it has the cost-reducer template, suppress
// the broad match so it doesn't create false-positive edges to Crew vehicles.
const COST_REDUCER_TEMPLATE =
  /\bcosts?\s+(?:up to\s+)?\{[\dx]+\}\s+less to activate\b/;

export const rule: Rule = {
  id: 'condition.cares_activated_abilities',
  axis: 'condition',
  match: (t) => {
    const triggerMatch = t.match(TRIGGER_PATTERN);
    if (triggerMatch) return { evidence: triggerMatch[0] };
    const resolveMatch = t.match(RESOLVE_PATTERN);
    if (resolveMatch) return { evidence: resolveMatch[0] };
    const scopeMatch = t.match(SCOPE_PATTERN);
    if (scopeMatch && !COST_REDUCER_TEMPLATE.test(t)) {
      return { evidence: scopeMatch[0] };
    }
    return false;
  },
  nearMiss: {
    anchors: ['activated'],
    proximity: ['ability', 'abilities', 'cost', 'activate', 'whenever'],
    window: 6,
  },
};
