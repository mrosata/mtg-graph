import { describe, it, expect } from 'vitest';
import { rule } from './effect.discover';

describe('effect.discover', () => {
  it.each([
    // A-Geological Appraiser
    ['when __self__ enters, if you cast it, discover 3.'],
    // Trumpeting Carnosaur
    ['trample when this creature enters, discover 5.'],
    // Chimil, the Inner Sun
    ['at the beginning of your end step, discover 5.'],
    // Buried Treasure-style activated discover
    ['{5}, exile this card from your graveyard: discover 5. activate only as a sorcery.'],
    // Etali's Favor — discover on ETB of an Aura
    ['enchant creature you control when this aura enters, discover 3.'],
    // Zoyowa's Justice — variable amount "discovers X"
    ['then that player discovers x, where x is its mana value.'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Flavor / unrelated — the word "discovered" as a non-keyword verb shouldn't match
    ['they discovered an ancient ruin.'],
    // No discover keyword anywhere
    ['draw a card.'],
    // "discover" appearing without a numeric argument is not the keyword action
    ['the discover ability resolves later.'],
    // scry (different keyword)
    ['scry 2, then draw a card.'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
