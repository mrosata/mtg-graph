import { describe, it, expect } from 'vitest';
import { rule } from './condition.cares_exile_pile';

describe('condition.cares_exile_pile', () => {
  it.each([
    // Ashiok −7 — scales by exiled mana value.
    ['where x is the total mana value of cards you own in exile'],
    // Cosmogoyf / Slime Against Humanity — "cards you own in exile" as a counter.
    ['__self__\'s power and toughness are each equal to the number of cards you own in exile'],
    // "cards exiled with __self__" — Soul Cauldron, Valgavoth, Maralen.
    ['for each card exiled with __self__'],
    ['as long as a card exiled with __self__ is in exile'],
    ['cards exiled with __self__'],
    // Regression (Intrepid Paleontologist): "cards you own exiled with this
    // creature" — uses "this creature" rather than __self__, with an
    // intervening "you own" qualifier.
    ['you may cast dinosaur creature spells from among cards you own exiled with this creature.'],
    ['for each card exiled with this artifact'],
    // "card was put into exile this turn" — Ashiok's Nightmare tokens.
    ['if a card was put into exile this turn'],
    // v0.14.1 — possessive form. Pit of Offerings: "any of the exiled cards'
    // colors". The exile pile is a per-card scaling resource.
    ['add one mana of any of the exiled cards\' colors'],
    ["any of the exiled cards' types"],
    ["any of the exiled cards' mana values"],
    ["any of the exiled cards' names"],
    // v0.14.1 — Craft-pile rooted via "used to craft (it|this <type>)".
    // Sunbird Effigy, Locus of Enlightenment.
    ['the number of colors among the exiled cards used to craft it'],
    ['the exiled cards used to craft this creature'],
    ['locus of enlightenment has each activated ability of the exiled cards used to craft it'],
    // v0.14.1 — cast-from-exile payoff. Quintorius Kand.
    ['whenever you cast a spell from exile, __self__ deals 2 damage to each opponent'],
    ['whenever you cast a noncreature spell from exile'],
    // v0.14.1 — "each card exiled this way" — anaphoric exile-pile reference
    // tied to a prior exile clause. Quintorius Kand -6.
    ['add {r} for each card exiled this way'],
    // v0.14.7 — pronoun "with it" subject for anaphoric exile-pile.
    // Kylox's Voltstrider: "cards exiled with it".
    ['you may cast an instant or sorcery spell from among cards exiled with it'],
    // v0.14.7 — Lazav, Wearer of Faces: noun-qualified card + "with it".
    // The pattern must anchor on "card" preceded by a type qualifier.
    ['you may have __self__ become a copy of a creature card exiled with it until end of turn'],
    // v0.14.7 — "from among (the) exiled cards" without explicit "with X"
    // anchor. The exile pile is the recasting source. Kylox, Visionary Inventor.
    ['cast any number of instant and/or sorcery spells from among the exiled cards without paying their mana costs'],
    // v0.14.7 — duration framing — the exile pile is the persistence anchor
    // for a recasting permission. Outrageous Robbery.
    ['you may look at and play those cards for as long as they remain exiled'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Different zones.
    ['return target card from your graveyard'],
    ['cards in your hand'],
    ['exile target creature'],
    // Mere act of exiling without referring to the pile.
    ['exile the top card of your library'],
    // "exile zone" reference but no scaling/gating.
    ['this card is exiled'],
    // v0.14.7 — guard against "for as long as it remains <other status>" forms
    // — only "remains exiled" should match Pattern (9).
    ['this creature has hexproof for as long as it remains tapped'],
    // v0.14.7 — guard against "with its" possessive (word boundary on "it"
    // must reject the 's continuation).
    ['exile target creature, then return it to the battlefield with its abilities intact'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
