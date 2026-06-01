import { describe, it, expect } from 'vitest';
import { rules, tagDefs } from './condition.cares_tribe';

describe('condition.cares_tribe parametric', () => {
  it('exports a rule per tribe', () => {
    expect(rules.length).toBe(31);
    const ids = new Set(rules.map((r) => r.id));
    expect(ids.has('condition.cares_tribe.human')).toBe(true);
    expect(ids.has('condition.cares_tribe.merfolk')).toBe(true);
    expect(ids.has('condition.cares_tribe.elemental')).toBe(true);
    expect(ids.has('condition.cares_tribe.rat')).toBe(true);
    expect(ids.has('condition.cares_tribe.pirate')).toBe(true);
    expect(ids.has('condition.cares_tribe.skeleton')).toBe(true);
    expect(ids.has('condition.cares_tribe.detective')).toBe(true);
    // v0.16 — BLB animal tribes.
    expect(ids.has('condition.cares_tribe.rabbit')).toBe(true);
    expect(ids.has('condition.cares_tribe.raccoon')).toBe(true);
    expect(ids.has('condition.cares_tribe.mouse')).toBe(true);
    expect(ids.has('condition.cares_tribe.bat')).toBe(true);
    // v0.17 — backlog tribes (spirit / demon / angel / cat / dog / wolf).
    expect(ids.has('condition.cares_tribe.spirit')).toBe(true);
    expect(ids.has('condition.cares_tribe.wolf')).toBe(true);
  });

  it('exports a tagDef per tribe with theme category', () => {
    expect(tagDefs.length).toBe(31);
    for (const def of tagDefs) {
      expect(def.axis).toBe('condition');
      expect(def.category).toBe('theme');
      expect(def.pairsWith).toEqual(['effect.create_creature_token']);
    }
  });

  it('matches plural and singular forms', () => {
    const humanRule = rules.find((r) => r.id === 'condition.cares_tribe.human')!;
    expect(humanRule.match('humans you control gain lifelink')).toBeTruthy();
    expect(humanRule.match('this human gains +1/+1')).toBeTruthy();
    expect(humanRule.match('whenever an elf enters')).toBe(false);
  });

  it('matches on the tribe word with word boundaries', () => {
    const elfRule = rules.find((r) => r.id === 'condition.cares_tribe.elf')!;
    expect(elfRule.match('elf creatures you control')).toBeTruthy();
    expect(elfRule.match('elves you control')).toBeTruthy();
    expect(elfRule.match('elfin gnome enters')).toBe(false); // word boundary
  });

  it('elemental tribe matches Sunderflock-style payoffs', () => {
    const ele = rules.find((r) => r.id === 'condition.cares_tribe.elemental')!;
    expect(ele.match('this spell costs {x} less to cast, where x is the greatest mana value among elementals you control')).toBeTruthy();
    expect(ele.match('if a triggered ability of another elemental you control triggers')).toBeTruthy();
    expect(ele.match('spend this mana only to cast elemental spells')).toBeTruthy();
    // word boundary — "elementally" or "complemental" would be false positives
    expect(ele.match('this creature gains menace')).toBe(false);
  });

  // Regression: Brave the Wilds — "target land becomes a 3/3 Elemental creature with haste"
  // is token/animate framing, not an Elemental-tribal payoff. Same for Devouring Sugarmaw
  // "Create a 1/1 white Human creature token". The rule should not fire on these alone.
  it('elemental does NOT match "becomes a [...] elemental creature" framing alone', () => {
    const ele = rules.find((r) => r.id === 'condition.cares_tribe.elemental')!;
    expect(ele.match('target land becomes a 3/3 elemental creature with haste')).toBe(false);
  });

  it('human does NOT match "create a [N/N] [color] human creature token" framing alone', () => {
    const h = rules.find((r) => r.id === 'condition.cares_tribe.human')!;
    expect(h.match('create a 1/1 white human creature token and a food token')).toBe(false);
    expect(h.match('create three 1/1 white human creature tokens')).toBe(false);
  });

  it('zombie does NOT match "create a [N/N] zombie creature token" framing alone', () => {
    const z = rules.find((r) => r.id === 'condition.cares_tribe.zombie')!;
    expect(z.match('create a 2/2 black zombie creature token')).toBe(false);
  });

  // Regression (Canonized in Blood): long multi-color, multi-type token
  // template — "create a 4/3 white and black vampire demon creature token
  // with flying" has 9 words between "create" and "token", exceeding the
  // old {1,7} window. The bump to {1,12} strips the framing so the rule
  // doesn't FP on the token type word.
  it('vampire does NOT match long multi-color multi-type token template alone', () => {
    const v = rules.find((r) => r.id === 'condition.cares_tribe.vampire')!;
    expect(v.match('create a 4/3 white and black vampire demon creature token with flying')).toBe(false);
  });

  // But genuine tribal references in the same card should still match after the strip.
  it('human still matches payoff references after token-strip', () => {
    const h = rules.find((r) => r.id === 'condition.cares_tribe.human')!;
    expect(h.match('if you control four or more humans, this creature gets +1/+1. create a 1/1 white human creature token.')).toBeTruthy();
    expect(h.match('humans you control gain lifelink')).toBeTruthy();
  });

  // Regression (Burden of Proof, MKM): Detective tribal payoff with two
  // distinct references in one card — gating anthem and blocker-restriction.
  it('detective matches MKM tribal references', () => {
    const d = rules.find((r) => r.id === 'condition.cares_tribe.detective')!;
    expect(d.match("enchanted creature gets +2/+2 as long as it's a detective you control")).toBeTruthy();
    expect(d.match("can't block detectives")).toBeTruthy();
  });

  // v0.16 — Bloomburrow tribes. Mouse uses irregular plural "mice".
  it('mouse matches both "mouse" and "mice" plural', () => {
    const m = rules.find((r) => r.id === 'condition.cares_tribe.mouse')!;
    expect(m.match('mice you control gain +1/+1')).toBeTruthy();
    expect(m.match('this mouse gains haste')).toBeTruthy();
    expect(m.match('create a 1/1 white mouse creature token')).toBe(false); // strip
  });

  it('bat does not false-match on "battle" or "combat"', () => {
    const b = rules.find((r) => r.id === 'condition.cares_tribe.bat')!;
    expect(b.match('whenever this creature attacks during combat, draw a card')).toBe(false);
    expect(b.match('whenever a battle enters')).toBe(false);
    expect(b.match('bats you control have flying')).toBeTruthy();
  });

  it('raccoon and squirrel match BLB tribal payoffs', () => {
    const r = rules.find((r) => r.id === 'condition.cares_tribe.raccoon')!;
    expect(r.match('raccoons you control get +1/+1 and gain vigilance until end of turn')).toBeTruthy();
    const s = rules.find((r) => r.id === 'condition.cares_tribe.squirrel')!;
    expect(s.match('whenever another squirrel you control enters, you gain 1 life')).toBeTruthy();
  });

  // v0.17 — wolf irregular plural and wolf-tribe payoffs (Tolsimir, Voja).
  it('wolf matches both "wolf" and "wolves" plural', () => {
    const w = rules.find((r) => r.id === 'condition.cares_tribe.wolf')!;
    expect(w.match('wolves you control get +1/+1')).toBeTruthy();
    expect(w.match('whenever a wolf you control attacks, draw a card')).toBeTruthy();
    // Token framing strip — "create a Wolf creature token" alone should not match.
    expect(w.match('create a 5/5 green wolf creature token')).toBe(false);
  });

  it('spirit / cat / dog / angel / demon FP-resistant on substrings', () => {
    const sp = rules.find((r) => r.id === 'condition.cares_tribe.spirit')!;
    expect(sp.match('this creature has spiritual energy')).toBe(false); // 'spiritual'
    expect(sp.match('spirits you control have flying')).toBeTruthy();
    const c = rules.find((r) => r.id === 'condition.cares_tribe.cat')!;
    expect(c.match('this card is in the cathedral category')).toBe(false); // 'cathedral' / 'category'
    expect(c.match('cats you control gain lifelink')).toBeTruthy();
    const dg = rules.find((r) => r.id === 'condition.cares_tribe.dog')!;
    expect(dg.match('a dogged pursuit reveals dogma')).toBe(false); // 'dogged' / 'dogma'
    expect(dg.match('dogs you control get +1/+1')).toBeTruthy();
    const an = rules.find((r) => r.id === 'condition.cares_tribe.angel')!;
    expect(an.match('this creature has angelic grace')).toBe(false); // 'angelic'
    expect(an.match('angels you control have vigilance')).toBeTruthy();
    const dm = rules.find((r) => r.id === 'condition.cares_tribe.demon')!;
    expect(dm.match('a demonic display of power')).toBe(false); // 'demonic'
    expect(dm.match('demons you control have menace')).toBeTruthy();
  });
});
