import { describe, it, expect } from 'vitest';
import { rules } from './condition.cares_subtype';

function ruleFor(id: string) {
  const r = rules.find((r) => r.id === id);
  if (!r) throw new Error(`rule ${id} not found`);
  return r;
}

describe('condition.cares_subtype', () => {
  it('shrine matches "whenever a shrine you control enters"', () => {
    const r = ruleFor('condition.cares_subtype.shrine');
    expect(r.match('whenever a shrine you control enters the battlefield')).toBeTruthy();
  });

  it('shrine matches plural "shrines"', () => {
    const r = ruleFor('condition.cares_subtype.shrine');
    expect(r.match('you gain 1 life for each shrine you control')).toBeTruthy();
  });

  it('saga matches "cast a saga spell"', () => {
    const r = ruleFor('condition.cares_subtype.saga');
    expect(r.match('whenever you cast a saga spell, draw a card')).toBeTruthy();
  });

  it('dragon matches plural', () => {
    const r = ruleFor('condition.cares_subtype.dragon');
    expect(r.match('dragons you control get +1/+1')).toBeTruthy();
  });

  it('shrine does not match unrelated text', () => {
    const r = ruleFor('condition.cares_subtype.shrine');
    expect(r.match('draw a card')).toBe(false);
    expect(r.match('put a +1/+1 counter on target creature')).toBe(false);
  });

  it('does not cross-match — saga rule on shrine text', () => {
    const r = ruleFor('condition.cares_subtype.saga');
    expect(r.match('whenever a shrine you control enters')).toBe(false);
  });

  it('exposes one rule per theme subtype', () => {
    expect(rules.length).toBeGreaterThan(5);
    for (const r of rules) {
      expect(r.id).toMatch(/^condition\.cares_subtype\./);
      expect(r.axis).toBe('condition');
    }
  });

  // Regression: Bitter Chill — "When this Aura enters" / "When this Aura is put into
  // a graveyard from the battlefield" are SELF-references. Tagging cares_subtype.aura
  // pulls the card into Aura-tribal payoff graph edges where it shouldn't appear.
  it('aura does NOT match self-references like "this aura"', () => {
    const r = ruleFor('condition.cares_subtype.aura');
    expect(r.match('when this aura enters, tap enchanted creature')).toBe(false);
    expect(r.match('when this aura is put into a graveyard from the battlefield, draw a card')).toBe(false);
  });

  it('saga does NOT match self-reference "this saga"', () => {
    const r = ruleFor('condition.cares_subtype.saga');
    expect(r.match('when this saga gets a lore counter, do x')).toBe(false);
  });

  it('aura still matches external references after self-strip', () => {
    const r = ruleFor('condition.cares_subtype.aura');
    expect(r.match('whenever an aura enters the battlefield under your control')).toBeTruthy();
    expect(r.match('when this aura enters and another aura you control enters, draw two cards')).toBeTruthy();
  });

  // Regression (Syr Armont, the Redeemer): "Enchanted creatures you control"
  // is the canonical Aura-tribal anthem phrasing — populationally-scoped,
  // distinct from an Aura's own "enchanted creature gets" singular self-ref.
  it('aura matches "enchanted creatures you control" (Aura-tribal anthem)', () => {
    const r = ruleFor('condition.cares_subtype.aura');
    expect(r.match('enchanted creatures you control get +1/+1')).toBeTruthy();
  });

  // Singular "enchanted creature" is an Aura's OWN ability (about the one
  // creature this Aura is attached to). Should NOT fire — that's a self-ref.
  it('aura does NOT match singular "enchanted creature" (own-aura phrasing)', () => {
    const r = ruleFor('condition.cares_subtype.aura');
    expect(r.match('enchanted creature gets +1/+1')).toBe(false);
    expect(r.match('enchanted creature has flying')).toBe(false);
  });

  // Regression: Become Brutes / Curse of the Werefox / Besotted Knight — Role tokens
  // are CREATED by the card; the "role" mention is the token type, not a payoff. The
  // rule should not fire on token-creation framing alone.
  it('role does NOT match token-creation framing alone', () => {
    const r = ruleFor('condition.cares_subtype.role');
    expect(r.match('create a wicked role token attached to target creature')).toBe(false);
    expect(r.match('create a 1/1 white human creature token')).toBe(false);
  });

  it('role still matches genuine payoff references after token-strip', () => {
    const r = ruleFor('condition.cares_subtype.role');
    expect(r.match('whenever a role enters under your control, draw a card')).toBeTruthy();
    expect(r.match('roles you control have indestructible')).toBeTruthy();
  });

  // Regression (Abuelo's Awakening): "non-Aura enchantment card" is an
  // exclusion clause — the card RESTRICTS away from Auras. It does not "care
  // about" Auras as a payoff group. Same pattern applies across all cares_subtype
  // rules: "non-<SUBTYPE>" should never satisfy the rule.
  it('aura does NOT match "non-aura" restriction frames', () => {
    const r = ruleFor('condition.cares_subtype.aura');
    expect(r.match('return target artifact or non-aura enchantment card from your graveyard')).toBe(false);
    expect(r.match('non-aura permanents you control')).toBe(false);
  });

  it('saga does NOT match "non-saga" restriction frames', () => {
    const r = ruleFor('condition.cares_subtype.saga');
    expect(r.match('target non-saga enchantment')).toBe(false);
  });

  // Cave is a LAND subtype, not a creature/permanent subtype, but the parametric
  // framing ("Cave you control", "search for a Cave card", count payoffs) is
  // identical. Bat Colony, Spelunking, Gargantuan Leech, Cosmium Confluence.
  it('cave matches "a Cave you control" trigger framing', () => {
    const r = ruleFor('condition.cares_subtype.cave');
    expect(r.match('whenever a cave you control enters, put a +1/+1 counter on target creature you control')).toBeTruthy();
  });

  it('cave matches count-based payoff framing', () => {
    const r = ruleFor('condition.cares_subtype.cave');
    expect(r.match('this spell costs {1} less to cast for each cave you control and each cave card in your graveyard')).toBeTruthy();
    expect(r.match('create a 1/1 black bat creature token with flying for each mana from a cave spent to cast it')).toBeTruthy();
  });

  // v0.14.19 — Clue / Treasure / Food are always-artifact TOKEN subtypes
  // with distinct micro-archetypes. The cares_subtype rule's token-creation
  // strip prevents create-only cards (e.g. Investigate payoffs) from
  // mis-firing — only cards that REFERENCE the subtype as a resource match.
  it('clue matches "sacrifice a Clue" observer (Persuasive Interrogators)', () => {
    const r = ruleFor('condition.cares_subtype.clue');
    expect(r.match('whenever you sacrifice a clue, target opponent gets two poison counters')).toBeTruthy();
  });

  it('clue matches "a creature card exiled with it" + clue payoff (Lazav shape)', () => {
    const r = ruleFor('condition.cares_subtype.clue');
    // Lazav has the Clue trigger via "Whenever you sacrifice a Clue, ..."
    expect(r.match('whenever you sacrifice a clue, you may have __self__ become a copy')).toBeTruthy();
  });

  it('clue does NOT match token-creation framing alone (Novice Inspector shape)', () => {
    const r = ruleFor('condition.cares_subtype.clue');
    // "investigate" expands to "create a Clue token" — both token-create
    // forms are stripped before the rule sees the text.
    expect(r.match('when this creature enters, create a clue token')).toBe(false);
    expect(r.match('investigate')).toBe(false);
  });

  it('treasure matches "sacrifice a Treasure" ramp payoff', () => {
    const r = ruleFor('condition.cares_subtype.treasure');
    expect(r.match('sacrifice a treasure: add one mana of any color')).toBeTruthy();
    expect(r.match('whenever you sacrifice a treasure, draw a card')).toBeTruthy();
  });

  it('treasure does NOT match token-creation alone', () => {
    const r = ruleFor('condition.cares_subtype.treasure');
    expect(r.match('create a treasure token')).toBe(false);
  });

  it('food matches "sacrifice a Food" lifegain payoff', () => {
    const r = ruleFor('condition.cares_subtype.food');
    expect(r.match('sacrifice a food: you gain 3 life')).toBeTruthy();
    expect(r.match('whenever you sacrifice a food, scry 1')).toBeTruthy();
    expect(r.match('foods you control')).toBeTruthy();
  });

  it('food does NOT match token-creation alone', () => {
    const r = ruleFor('condition.cares_subtype.food');
    expect(r.match('create a food token')).toBe(false);
  });
});
