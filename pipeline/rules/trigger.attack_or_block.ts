// pipeline/rules/trigger.attack_or_block.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'trigger.attack_or_block',
  axis: 'trigger',
  label: 'Triggers on attack or block',
  description: 'Triggers when a creature attacks or blocks.',
  pairsWith: [],
};

export const rule: Rule = {
  id: 'trigger.attack_or_block',
  axis: 'trigger',
  match: (t) => {
    // Negative lookbehind blocks "can't|cannot|won't|doesn't|may not|will not|
    // do not|would not " preceding the verb — that's a static restriction
    // inside quoted token text (Experimental Confectioner) or a self-modifier,
    // not a trigger. Trailing \b on the verbs requires a word boundary so we
    // don't match the participle inside "the attacking player" / "the blocking
    // creature" (Contested Game Ball).
    // v0.22.0 — Stalked Researcher: "this creature can attack this turn as
    // though it didn't have defender" is a static permission inside a
    // triggered ability body, not a trigger on attacking. Add `can` to the
    // negative-lookbehind alternation so the modal is excluded.
    // v0.39.0 — 200-card audit Ship 13. Evidence-window tightening: filler
    // shrunk from `[^.]*?` to `[^,.]{0,80}?` so the captured evidence
    // doesn't spill across adjacent commas / ETB clauses (Angelic Sell-Sword's
    // token-body trigger). The rule still fires on the inner trigger; only
    // the evidence display is cleaner. No graph impact.
    const m = t.match(
      /whenever (?:[^,.]{0,80}?)(?<!(?:can't|cannot|can|won't|doesn't|may not|will not|do not|would not) )(?:attacks?\b|blocks?\b|becomes blocked\b)/,
    );
    return m ? { evidence: m[0] } : false;
  },
};
