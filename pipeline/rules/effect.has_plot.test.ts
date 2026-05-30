import { describe, it, expect } from 'vitest';
import { rule } from './effect.has_plot';
import type { Card } from '../../shared/types';

function card(keywords: string[], oracleText = ''): Card {
  return {
    oracleId: 'x', name: 'X', set: 's', printings: ['s'], collectorNumber: '1',
    manaCost: null, cmc: 0, colors: [], colorIdentity: [], typeLine: 'Creature',
    types: ['Creature'], subtypes: [], supertypes: [], oracleText,
    keywords, power: null, toughness: null, rarity: 'common', imageUrl: '',
    tags: [],
  };
}

describe('effect.has_plot', () => {
  // Positive: card has Plot as a printed alternate cast cost — the keywords
  // array includes 'Plot' AND the normalized oracle text contains a literal
  // `plot {<mana>}` line.
  it.each([
    [['Plot'], 'when this creature enters, draw a card. plot {3}{u}'],
    [['Plot', 'Flying'], 'flying. plot {1}{r}'],
    [['Flying', 'Plot', 'Haste'], 'flying, haste. plot {2}{w}{w}'],
  ])('matches when keywords include Plot AND oracle has printed plot {N} cost: %j / %s', (kw, text) => {
    expect(rule.matchCard!(card(kw, text), text)).toBeTruthy();
  });

  it.each([
    [[]],
    [['Flying']],
    [['Kicker']],
    [['Foretell']],
  ])('does not match without Plot in keywords: %j', (kw) => {
    expect(rule.matchCard!(card(kw, ''), '')).toBe(false);
  });

  // Regression (Kellan Joins Up, Lilah Undefeated Slickshot, Make Your Own
  // Luck, Aven Interrupter): Scryfall populates the `keywords` array with
  // "Plot" on any card that *uses* the plot action (grants `plotted` status
  // to another card), even when the card itself does NOT have a printed
  // `Plot {cost}` line. Such cards are plot ENABLERS / PAYOFFS, not plotted
  // cards themselves. The rule must require both signals.
  it.each([
    // Kellan Joins Up shape — ETB plots another card from hand.
    ['when this enchantment enters, you may exile a nonland card with mana value 3 or less from your hand. if you do, it becomes plotted. whenever a legendary creature you control enters, put a +1/+1 counter on each creature you control.'],
    // Make Your Own Luck shape — look-at-top filter that plots one of the cards.
    ['look at the top three cards of your library. you may exile a nonland card from among them. if you do, it becomes plotted. put the rest into your hand.'],
    // Aven Interrupter shape — exiles a spell, that spell becomes plotted.
    ['flash flying when this creature enters, exile target spell. it becomes plotted. spells your opponents cast from graveyards or from exile cost {2} more to cast.'],
  ])('does NOT match plot-enabler cards (Scryfall keywords array trap): %s', (text) => {
    expect(rule.matchCard!(card(['Plot'], text), text)).toBe(false);
  });
});
