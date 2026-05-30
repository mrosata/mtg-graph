import { describe, it, expect } from 'vitest';
import { rule } from './condition.cares_graveyard';
import type { Card } from '../../shared/types';

function mk(opts: { keywords?: string[]; oracle?: string }): Card {
  return {
    oracleId: 'x',
    name: 'X',
    set: 'tst',
    printings: ['tst'],
    collectorNumber: '1',
    typeLine: 'Sorcery',
    types: ['Sorcery'],
    subtypes: [],
    manaCost: '{2}{U}',
    keywords: opts.keywords ?? [],
    colors: [],
    colorIdentity: [],
    oracleText: opts.oracle ?? '',
    imageUrl: '',
    legalities: {},
  } as unknown as Card;
}

describe('condition.cares_graveyard', () => {
  // Scope: scales-on or gated-by graveyard contents (delirium, threshold,
  // "for each X in your graveyard"). Does NOT include cards that merely
  // touch the graveyard zone — those are graveyard-affecting effects, not
  // graveyard-cares conditions.
  it.each([
    ['for each card in your graveyard, this creature gets +1/+0'],
    ['this creature\'s power is equal to the number of creature cards in your graveyard'],
    ['as long as there are five or more cards in your graveyard, this creature has menace'],
    ['if there are ten or more cards in your graveyard, draw a card'],
    ['whenever a creature card is put into a graveyard from anywhere, scry 1'],
    ['this creature\'s power equals the number of creature cards in all graveyards'],
    ['cards in your graveyard'],
    // v0.14.7 — Regression (Flotsam // Jetsam): graveyard as a casting
    // source. Casting from a graveyard is a graveyard-cares reference —
    // the card uses graveyard contents as the resource for an effect.
    ["you may cast a spell from each opponent's graveyard without paying its mana cost"],
    ['you may cast this card from your graveyard'],
    ['cast a creature spell from your graveyard this turn'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    ['target player mills four cards'],
    ['put the top three cards of your library into your graveyard'],
    ['draw a card'],
    ['return target creature to its owner\'s hand'],
    // Targeted graveyard-affecting effects no longer count as "cares" — they
    // are themselves the effect, not the payoff that scales on graveyard size.
    ['exile target card from a graveyard'],
    ['return target creature card from your graveyard to the battlefield'],
    ['return target creature card from your graveyard to your hand'],
    ['each player returns all creature cards from their graveyard to the battlefield'],
    // Self-exile activation costs (Renew-style, escape-style abilities). The
    // card is paying its own graveyard exile as a cost, not caring about a
    // populated graveyard.
    ['renew — {1}{g}, exile __self__ from your graveyard: put a +1/+1 counter and a trample counter on target creature.'],
    ['{1}{g}, exile __self__ from your graveyard: search your library for a desert card, put it onto the battlefield tapped, then shuffle.'],
    // Mass shuffle / self-graveyard recycling (e.g. Cathartic Parting) — the
    // graveyard cards are the object of the effect, not what the card scales
    // upon.
    ['you may shuffle up to four target cards from your graveyard into your library.'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });

  // Cast-from-graveyard keywords (Harmonize, Flashback, etc.) used to fall
  // through to this rule. They now live on the dedicated
  // `condition.cast_from_graveyard` tag — see its rule + tests.
  it('does not match cards solely by cast-from-graveyard keywords', () => {
    expect(rule.matchCard?.(mk({ keywords: ['Harmonize'] }), '') ?? false).toBe(false);
    expect(rule.matchCard?.(mk({ keywords: ['Flashback'] }), '') ?? false).toBe(false);
  });
});
