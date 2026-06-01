import { describe, it, expect } from 'vitest';
import { rule } from './condition.cares_instant_sorcery_in_graveyard';

describe('condition.cares_instant_sorcery_in_graveyard', () => {
  it.each([
    // Eddymurk Crab / Tolarian Terror / The Dawning Archaic — cost reduction
    ['this spell costs {1} less to cast for each instant and sorcery card in your graveyard'],
    // Melek / Enigma Drake / Ghitu Lavarunner — P/T scaling
    ["melek's power and toughness are each equal to twice the number of instant and sorcery cards in your graveyard"],
    ['this creature\'s power is equal to the number of instant and sorcery cards in your graveyard'],
    ['as long as there are two or more instant and/or sorcery cards in your graveyard'],
    // Recasting from graveyard — these care about the I/S card being there
    ['return target instant or sorcery card from your graveyard to your hand'],
    ['target instant or sorcery card in your graveyard gains flashback until end of turn'],
    ['you may cast target instant or sorcery card from your graveyard'],
    // Flow State — branches on having one of each in yard
    ['if there is an instant card and a sorcery card in your graveyard, instead'],
    // Fugitive Codebreaker variant
    ['this cost is reduced by {1} for each instant and sorcery card in your graveyard'],
    // Frantic Firebolt / Hearth Elemental — "cards in graveyard that are instant cards, sorcery cards"
    ['x is 2 plus the number of cards in your graveyard that are instant cards, sorcery cards, and/or have an adventure'],
    ['this spell costs {x} less to cast, where x is the number of cards in your graveyard that are instant cards, sorcery cards, and/or have an adventure'],
    // Daring Waverider — "target instant or sorcery card WITH mana value 4
    // or less FROM your graveyard". The "with <qualifier>" slot between the
    // card noun and the "from <zone>" anchor breaks pattern 4 of the original
    // rule; pattern 6 admits the qualifier but requires "an/any/each", not
    // "target".
    ['cast target instant or sorcery card with mana value 4 or less from your graveyard without paying its mana cost'],
    ['target instant or sorcery card with mana value 3 or less in your graveyard'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Generic graveyard-cares with no instant/sorcery scope
    ['return target creature card from your graveyard to the battlefield'],
    ['for each card in your graveyard, this creature gets +1/+0'],
    // Mill (producer, not consumer of I/S yard)
    ['target player mills four cards'],
    // Bounce a creature
    ["return target creature to its owner's hand"],
    // Mentions sorcery only as a timing rule (flash)
    ['flash (you may cast this spell any time you could cast an instant.)'],
    // Mentions instant card in exile, not graveyard
    ['cast target instant card from exile'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
