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
    //
    // v0.14.41: added an optional leading adjective slot before the existing
    // qualifier group — handles Lilah Undefeated Slickshot's "a multicolored
    // instant or sorcery spell" (adj + or-pair). The existing single
    // qualifier slot couldn't span an adjective AND a two-token "or" pair.
    // v0.23 — both qualifier slots admit an "or"-pair so the multi-type
    // alternation can sit in either position (Lilah: "a multicolored instant
    // or sorcery spell"; Archmage of Echoes: "a faerie or wizard permanent
    // spell"). Either slot may also be a bare adjective.
    const m = t.match(
      /whenever (?:you cast|an opponent casts|a player casts) (?:a |an |(?:your|the) (?:first|second|third|fourth|fifth|next) )?(?:[\w-]+(?: or [\w-]+)? )?(?:[\w-]+(?: or [\w-]+)? )?spell\b/,
    );
    return m ? { evidence: m[0] } : false;
  },
};
