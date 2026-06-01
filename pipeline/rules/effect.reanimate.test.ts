import { describe, it, expect } from 'vitest';
import { rule } from './effect.reanimate';

describe('effect.reanimate', () => {
  it.each([
    ['return target creature card from a graveyard to the battlefield'],
    ['return target creature card from your graveyard to the battlefield'],
    ['return target card from a graveyard to the battlefield'],
    ['return a creature card that was in a graveyard to the battlefield'],
    // mass reanimate (Bringer of the Last Gift)
    ["each player returns all creature cards from their graveyard that weren't put there this way to the battlefield"],
    // plural-object variants
    ['return all creature cards from your graveyard to the battlefield'],
    // opponent's graveyard
    ["return target creature card from an opponent's graveyard to the battlefield"],
    // "any graveyard"
    ['return target creature card from any graveyard to the battlefield'],
    // Regression (Return Triumphant): modifiers between "card" and "from"
    // ("with mana value 3 or less", "with power 3 or less", etc.)
    ['return target creature card with mana value 3 or less from your graveyard to the battlefield'],
    ['return target creature card with power 2 or less from your graveyard to the battlefield'],
    // Regression (Virtue of Persistence): "put ... onto the battlefield" form
    // (verb `put` instead of `return`, preposition `onto` instead of `to`).
    // The canonical reanimator phrasing on many staples and saga abilities.
    ['put target creature card from a graveyard onto the battlefield under your control'],
    ['put target creature card from your graveyard onto the battlefield'],
    // v0.12.9 — modal reanimation following a return-to-hand clause
    // (Back for Seconds). Cards being put-to-battlefield were just named as
    // "those cards" in the prior sentence about returning from graveyard.
    ['return up to two target creature cards from your graveyard to your hand. if this spell was bargained, you may put one of those cards with mana value 4 or less onto the battlefield instead of putting it into your hand'],
    // v0.12.9 — mill-and-recur (Bramble Familiar // Fetch Quest, also Beluna
    // Grandsquall variants). Cards are in graveyard immediately after the
    // mill, so "from among the milled cards onto the battlefield" is a
    // reanimation effect.
    ['mill seven cards. then put a creature, enchantment, or land card from among the milled cards onto the battlefield'],
    ['mill four cards. then put a creature card from among the milled cards onto the battlefield'],
    // v0.14.1 — reversed-clause order. Squirming Emergence: "return to the
    // battlefield target nonland permanent card in your graveyard ...".
    ['return to the battlefield target nonland permanent card in your graveyard with mana value less than or equal to the number of permanent cards in your graveyard'],
    ['put onto the battlefield target creature card in your graveyard'],
    // v0.18 — anaphoric "return that card to the battlefield" after a
    // graveyard-source antecedent (Shepherd of the Clouds) or after a
    // dies-trigger antecedent (Vraska, the Silencer). The "that card"
    // refers back to the graveyard-derived antecedent across a sentence
    // boundary.
    ['return target permanent card with mana value 3 or less from your graveyard to your hand. return that card to the battlefield instead if you control a mount'],
    ['whenever a nontoken creature an opponent controls dies, you may pay {1}. if you do, return that card to the battlefield tapped under your control'],
  ])('matches: %s', (text) => {
    expect(rule.match(text)).toBeTruthy();
  });

  // v0.12.9 — granted self-reanimation triggers (Not Dead After All gives a
  // creature "when this creature dies, return it to the battlefield"). The
  // "it" antecedent is the creature that just died (in graveyard).
  it.each([
    ['until end of turn, target creature you control gains "when this creature dies, return it to the battlefield tapped under its owner\'s control, then create a wicked role token attached to it."'],
    ['when this creature dies, return it to the battlefield under its owner\'s control'],
  ])('matches granted dies-then-reanimate triggers: %s', (text) => {
    expect(rule.match(text)).toBeTruthy();
  });
  // v0.14.x — search-graveyard-as-source variant (Agency Outfitter). The card
  // searches the graveyard (among other zones) and puts cards from there onto
  // the battlefield. The graveyard must be listed as one of the searched zones.
  it.each([
    // Agency Outfitter: "search your graveyard, hand and/or library for a card
    // named X ... and put them onto the battlefield"
    ['you may search your graveyard, hand and/or library for a card named magnifying glass and/or a card named thinking cap and put them onto the battlefield'],
    // Simpler graveyard-first search variant
    ['search your graveyard and/or library for a creature card and put it onto the battlefield'],
    // Graveyard trailing in a multi-zone search
    ['search your library and/or graveyard for a creature card and put it onto the battlefield'],
  ])('matches search-graveyard-as-source: %s', (text) => {
    expect(rule.match(text)).toBeTruthy();
  });

  it.each([
    ["return target creature to its owner's hand"],
    ['return target permanent to the battlefield'],
    // recursion-to-hand must not be confused with reanimation (P1.3 axis)
    ['return target creature card from your graveyard to your hand'],
    // unrelated graveyard mention with a battlefield-return token
    ['whenever a card is put into a graveyard, return target creature token to the battlefield'],
    // tutor only — no graveyard as search zone
    ['search your library for a creature card and put it onto the battlefield'],
    // return-to-hand from graveyard — not a battlefield effect
    ["return target creature card from your graveyard to its owner's hand"],
    // search library for land — no graveyard, no battlefield put
    ['search your library for a basic land card and put it onto the battlefield tapped'],
  ])('does not match: %s', (text) => {
    expect(rule.match(text)).toBe(false);
  });
});
