// pipeline/rules/trigger.creature_dies.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';
import { THEME_TRIBES, tribePattern } from '../themes';

export const tagDef: TagDef = {
  tagId: 'trigger.creature_dies',
  axis: 'trigger',
  label: 'Triggers on creature death',
  description: 'Has an ability that triggers when a creature dies.',
  pairsWith: ['effect.sacrifice_permanent', 'effect.deals_damage', 'effect.exile_from_battlefield'],
};

// FIX 15 (BR-10) — Crossway Troublemakers: tribal-subtype dies trigger
// ("whenever a Vampire you control dies"). The subject is a known creature
// tribe rather than the generic "creature" noun. Restricted to THEME_TRIBES
// alternation so unrelated nouns can't fire this arm.
const TRIBE_ALT = THEME_TRIBES.map(tribePattern).join('|');
const TRIBAL_DIES = new RegExp(
  `\\bwhen(?:ever)?\\s+(?:a|an|another)\\s+(?:${TRIBE_ALT})\\s+you control(?:s)?\\s+dies\\b`,
);

export const rule: Rule = {
  id: 'trigger.creature_dies',
  axis: 'trigger',
  match: (t) => {
    // Accepts board-wide ("Whenever a creature dies"), self-dies
    // ("When this creature dies" / "When __SELF__ dies"), and delayed
    // ("Whenever a nontoken creature you control dies THIS TURN, …")
    // forms. The `[\w\- ]{0,30}?` filler before "creature" admits adjectives
    // like "nontoken", "tapped", "attacking", "white", and qualifiers like
    // "you control"/"an opponent controls" appearing between "a/another/this"
    // and "creature". Capped at 30 chars to avoid spanning sentence boundaries.
    // v0.13.4: post-creature filler bumped from {0,4} to {0,10} and the token
    // character class expanded to allow +, /, - so phrases like "with a +1/+1
    // counter on it" can sit between "creature" and "dies" (Explorer's Cache).
    //
    // v0.14.1: noun bumped to `creatures?` plural and verb to `(?:dies|die)`
    // so "one or more creatures you control die" (The Skullspore Nexus,
    // mass-death triggers) matches.
    const m = t.match(
      /(?:when|whenever) (?:a |another |this |one or more )?(?:[\w\- ]{0,30}?\s+)?(?:creatures?|__self__)(?:\s+[\w'+\/\-]+){0,10}\s+(?:dies|die)\b/,
    );
    if (m) return { evidence: m[0] };
    // v0.20.0 — Come Back Wrong: "if a creature card is put into a graveyard
    // this way, return it to the battlefield". The "this way" / "from the
    // battlefield" anaphor binds back to a prior destroy/wipe clause —
    // semantically a death trigger conditioned on the card being a creature.
    // Tight scope: requires the explicit "this way" / "from the battlefield"
    // anaphor so a generic "card is put into a graveyard" frame doesn't FP.
    const anaphor = t.match(
      /\bif (?:a |any |one or more )?creatures? cards? (?:is|are) put into (?:a |your |its owner's )?graveyards? (?:this way|from the battlefield)\b/,
    );
    if (anaphor) return { evidence: anaphor[0] };
    // v0.22.0 — Turn Inside Out: anaphoric "when it/that creature dies this
    // turn" after a `target creature` antecedent (the +N/+0 pump clause).
    // Backward 120-char window guard requires `target creature` to be in
    // scope so the "it" anaphor has something to bind to. The `this turn`
    // tail keeps the arm bounded; bare "when it dies" is too generic.
    const itDies = t.match(/\bwhen\s+(?:it|that creature)\s+dies\s+this turn\b/);
    if (itDies && itDies.index !== undefined) {
      const before = t.substring(Math.max(0, itDies.index - 120), itDies.index);
      if (/\btarget\s+creature\b/.test(before)) {
        return { evidence: itDies[0] };
      }
    }
    // v0.23 — RAW "is put into <X> graveyard from the battlefield" templating
    // (Colfenor's Urn). Per CR 700.4, this phrasing is semantically equivalent
    // to "dies" — both refer to a creature going from battlefield to
    // graveyard. The leaves_battlefield rule already handles the broader LtB
    // axis; this arm makes creature_dies fire on cards that use the rules-
    // speak frame so the dies-payoff graph edge forms.
    const putGraveyard = t.match(
      /\bwhen(?:ever)?\s+(?:a |an |another |this |one or more )?(?:[\w\- ]{0,30}?\s+)?creatures?(?:\s+[\w'+\/\-]+){0,10}\s+(?:is|are) put into (?:a|your|an opponent's|its owner's|that player's) graveyard from the battlefield\b/,
    );
    if (putGraveyard) return { evidence: putGraveyard[0] };
    // FIX 15 (BR-10) — tribal-subtype dies trigger (Crossway Troublemakers).
    const tribal = t.match(TRIBAL_DIES);
    if (tribal) return { evidence: tribal[0] };
    return false;
  },
};
