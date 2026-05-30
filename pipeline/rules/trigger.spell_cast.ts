// pipeline/rules/trigger.spell_cast.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'trigger.spell_cast',
  axis: 'trigger',
  label: 'Triggers on spell cast',
  description: 'Triggers when a spell is cast.',
  pairsWith: [],
};

export const rule: Rule = {
  id: 'trigger.spell_cast',
  axis: 'trigger',
  match: (t) => {
    // Accept "you cast", "an opponent casts", or "a player casts" — the latter
    // two are the pingback / punisher shape (Scalding Viper et al.). The
    // optional qualifier group between a/an and "spell" handles single
    // categories (noncreature/instant/sorcery), multi-type lists ("instant or
    // sorcery"), and subtype filters (Adventure, etc.).
    //
    // v0.12.9: also accept ordinal qualifiers ("your first", "your second",
    // "the next") between "cast" and the spell descriptor — Aquatic
    // Alchemist // Bubble Up's "whenever you cast your first instant or
    // sorcery spell each turn".
    const m = t.match(
      /whenever (?:you cast|an opponent casts|a player casts) (?:a |an |(?:your|the) (?:first|second|third|fourth|fifth|next) )?(?:[\w-]+(?: or [\w-]+)? )?spell\b/,
    );
    return m ? { evidence: m[0] } : false;
  },
};
