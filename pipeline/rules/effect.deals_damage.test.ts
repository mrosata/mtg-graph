import { describe, it, expect } from 'vitest';
import { rule } from './effect.deals_damage';
import type { Card } from '../../shared/types';

function card(name: string, oracleText: string): Card {
  return {
    oracleId: 'x', name, set: 's', printings: ['s'], collectorNumber: '1',
    manaCost: null, cmc: 0, colors: [], colorIdentity: [], typeLine: 'Creature',
    types: ['Creature'], subtypes: [], supertypes: [], oracleText,
    keywords: [], power: null, toughness: null, rarity: 'common', imageUrl: '',
    tags: [],
  };
}

describe('effect.deals_damage', () => {
  it.each([
    ['__self__ deals 2 damage to any target'],
    ['__self__ deals 3 damage to target creature or player'],
    ['__self__ deals 1 damage to each opponent'],
  ])('matches __self__ + literal damage: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  // The card uses "this <type>" as its self-reference instead of being
  // name-substituted. Modern oracle templating ("this creature deals 1
  // damage") and Rooms ("this Room deals damage equal to...") both produce
  // this shape. We accept it for the same self-ref types the trigger.self_etb
  // rule does, plus 'room' (added in Duskmourn).
  it.each([
    ['{t}: this creature deals 1 damage to each opponent'],
    ['{1}{r}: this creature deals 1 damage to any target'],
    ['this artifact deals 2 damage to target creature'],
    ['this room deals damage equal to the number of cards in your hand to target creature an opponent controls'],
    ['this creature deals x damage to each creature and planeswalker'],
    ['this creature deals damage equal to its power to any other target'],
    // v0.23 — subjunctive "may have <SELF> deal N damage" (Requiem Monolith,
    // Kederekt Parasite).
    ["that creature's controller may have this artifact deal 1 damage to it."],
  ])('matches "this <type>" self-references: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    ['whenever __self__ deals damage'],
    ['whenever __self__ deals combat damage to a player'],
    ['whenever this creature deals combat damage to a player, put a counter on it'],
    ['if __self__ would deal damage'],
    ['if __self__ would deal damage to a creature you control'],
    ['target creature deals 2 damage to any target'], // other creature, not self
    ['create a 2/2 creature token. it deals 2 damage'], // token, not self
    // v0.20.0 — Valley Flamecaller FP: "would deal ... it deals that much
    // damage plus N instead" is a damage-replacement effect, not a damage
    // source on this card. The G26 mask suppresses the "it deals that much
    // damage" span before PATTERNS runs.
    ['if a lizard, mouse, otter, or raccoon you control would deal damage to a permanent or player, it deals that much damage plus 1 instead.'],
  ])('does not match (triggers, prevented damage, other creatures): %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });

  // Regression: Food Fight — grants an activated ability whose effect is "it
  // deals damage...". The "it" refers to the host artifact, scoped via the
  // ": " separator that follows the activated-ability cost.
  it.each([
    ['artifacts you control have "{2}, sacrifice this artifact: it deals damage to any target equal to 1 plus the number of permanents you control"'],
    ['{t}, sacrifice this artifact: it deals 2 damage to any target'],
    ['{r}: it deals x damage to target creature'],
  ])('matches granted-ability "it deals damage" inside quoted text: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  // Regression (Idol of the Deep King, Magmatic Galleon): modern ETB
  // templating uses "When this <type> enters, it deals N damage" — the
  // ", it" lookbehind captures the host reference (distinct from the
  // ". it" token reference).
  it.each([
    ['when this artifact enters, it deals 2 damage to any target.'],
    ['when this vehicle enters, it deals 5 damage to target creature an opponent controls.'],
  ])('matches comma-it ETB self-references: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  // v0.20.0 — "and it" antecedent (Cursed Recording, Vivi Ornitier). The
  // IT lookbehind admits `and ` (in addition to `: ` and `, `) so chained
  // damage-effect lists like "remove those counters and it deals 20 damage"
  // bind correctly. Paired with the G26 mask, this does not introduce a
  // Valley Flamecaller FP (no `and` precedes `it` in Valley Flamecaller).
  it.each([
    ['whenever you cast an instant or sorcery spell, put a time counter on this artifact. then if there are seven or more time counters on it, remove those counters and it deals 20 damage to you.'],
    ["{0}: add x mana in any combination of {u} and/or {r}, where x is __self__'s power. activate only during your turn and only once each turn. whenever you cast a noncreature spell, put a +1/+1 counter on __self__ and it deals 1 damage to each opponent."],
  ])('matches "and it deals" chained-list antecedent: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  // v0.12.9 regression — variable-amount damage that's been previously bound.
  // Imodane the Pyrohammer: "Imodane deals that much damage to each opponent"
  // (after normalization: "__self__ deals that much damage to each opponent").
  // The amount is referenced as "that much" / "that many" earlier in the
  // ability — still a damage-dealing effect.
  it.each([
    ['__self__ deals that much damage to each opponent'],
    ['this creature deals that much damage to any target'],
  ])('matches __self__ + variable bound damage: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  // Regression (Torch the Witness): multiplier prefix between `deals` and the
  // amount — "deals twice X damage", "deals thrice X damage", "deals N times
  // X damage" forms. The literal/variable-amount patterns didn't admit a
  // multiplier word.
  it.each([
    ['__self__ deals twice x damage to target creature'],
    ['__self__ deals thrice x damage to any target'],
    ['this creature deals twice 2 damage to target creature'],
  ])('matches __self__ + multiplier-prefixed damage: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  // 2026-06-02 audit batch — gendered/plural anaphoric pronoun subjects.
  // Electro, Assaulting Battery — "he deals X damage" after "when __self__
  // leaves the battlefield" antecedent.
  // Morlun, Devourer of Spiders — "he deals X damage" after self-ETB.
  // Shocker, Unshakable — "he deals 2 damage" after self-ETB.
  // The IT lookbehind admits `he|she|they` in addition to `it`.
  it.each([
    ["lifelink __self__ enters with x +1/+1 counters on him. when __self__ enters, he deals x damage to target opponent."],
    ["flying you don't lose unspent red mana as steps and phases end. whenever you cast an instant or sorcery spell, add {r}. when __self__ leaves the battlefield, you may pay {x}. when you do, he deals x damage to target player."],
    ["during your turn, __self__ has first strike. vibro-shock gauntlets — when __self__ enters, he deals 2 damage to target creature and 2 damage to that creature's controller."],
    // Avatar Aang // Aang, Master of Elements: list-chained "and he deals N
    // damage to each opponent" in a multi-clause upkeep trigger.
    ['at the beginning of each upkeep, you may transform aang, master of elements. if you do, you gain 4 life, draw four cards, put four +1/+1 counters on him, and he deals 4 damage to each opponent.'],
  ])('matches gendered/plural anaphoric subject: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  // v0.14.6 — Regression (Zoyowa Lava-Tongue): multi-word legendary card
  // name with no comma/of/the separators doesn't get __SELF__-substituted
  // for its short-name self-reference. The matchCard branch recognizes the
  // card's first name word as a self-reference subject.
  it('matchCard: fires on short-name self-reference for multi-word legendary', () => {
    const c = card(
      'Zoyowa Lava-Tongue',
      'deathtouch at the beginning of your end step, if you descended this turn, each opponent may discard a card or sacrifice a permanent of their choice. zoyowa deals 3 damage to each opponent who didn\'t.',
    );
    expect(rule.matchCard!(c, c.oracleText)).toBeTruthy();
  });

  it('matchCard: does NOT fire when short-name does not appear with damage', () => {
    const c = card('Zoyowa Lava-Tongue', 'deathtouch. {b}: target creature gets -1/-1 until end of turn.');
    expect(rule.matchCard!(c, c.oracleText)).toBe(false);
  });

  it('matchCard: does NOT double-fire when __SELF__ already in text', () => {
    // In production, normalize.ts substitutes the full name → __SELF__ first,
    // so a post-normalize text always contains __self__ when the card refs
    // itself. The matchCard short-name path must skip in that case to avoid
    // double-tagging via the dynamic regex.
    const c = card('Big Mole', 'when __self__ enters, __self__ deals 2 damage.');
    expect(rule.matchCard!(c, c.oracleText)).toBe(false);
  });
});
