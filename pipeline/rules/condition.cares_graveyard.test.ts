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
    // v0.39.0 — 200-card audit Ship 11 (Batch 2): Pattern 3 narrowed.
    // The bare phrase "cards in your graveyard" without a payoff-frame
    // antecedent (for-each, number-of, threshold) was previously matched
    // by Pattern 3 but is now a producer/zone phrase — see negatives.
    // The patterns 1, 2, 4 still cover legitimate payoff frames:
    // "for each card in your graveyard", "the number of cards in your
    // graveyard", "if there are five or more cards in your graveyard".
    // v0.14.7 — Regression (Flotsam // Jetsam): graveyard as a casting
    // source. Casting from a graveyard is a graveyard-cares reference —
    // the card uses graveyard contents as the resource for an effect.
    ["you may cast a spell from each opponent's graveyard without paying its mana cost"],
    ['you may cast this card from your graveyard'],
    ['cast a creature spell from your graveyard this turn'],
    // Huskburster Swarm — "for each creature card YOU OWN in <zone> and in
    // your graveyard". The "you own" possessive between "card" and "in"
    // broke the contiguous "cards? in <zone>?graveyards?" anchor of
    // pattern 1.
    ['this spell costs {1} less to cast for each creature card you own in exile and in your graveyard'],
    ['for each card you own in your graveyard, this creature gets +1/+0'],
    // FIX 13 (BR-8) — Consuming Aberration: power/toughness equal to "the
    // number of cards in your opponents' graveyards" — possessive plural
    // form. The inner filler char class needed to admit `'` so the
    // apostrophe in `opponents'` doesn't break the regex anchor on
    // "graveyards".
    ["__self__'s power and toughness are each equal to the number of cards in your opponents' graveyards."],
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
    // v0.39.0 — 200-card audit Ship 11 (Batch 2): Pattern 3 narrowing.
    // Previously a positive (the broad Pattern 3 fired); now a negative
    // — the bare phrase doesn't establish a payoff-frame antecedent
    // (for-each, number-of, threshold). Genuine payoffs go via Patterns
    // 1, 2, or 4. FLIP: previously positive → now negative per the
    // 200-card audit tiebreaker.
    ['cards in your graveyard'],
    // Animate Dead enchant clause — "enchant creature card in a graveyard"
    // is a producer-frame target qualifier, not a graveyard-scaling payoff.
    ["enchant creature card in a graveyard when this aura enters, if it's on the battlefield, it loses   and gains   return enchanted creature card to the battlefield under your control"],
    // Archmage's Newt — "target instant or sorcery card in your graveyard
    // gains flashback" — the "target ... card in your graveyard" is a
    // producer-frame target (an enabling effect, not a graveyard-care payoff).
    ['whenever this creature deals combat damage to a player, target instant or sorcery card in your graveyard gains flashback until end of turn.'],
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
