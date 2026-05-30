import { describe, it, expect } from 'vitest';
import { rule } from './condition.descend';

describe('condition.descend', () => {
  it.each([
    // Coati Scavenger — `descend N —` ability-word with count
    ['descend 4 — when this creature enters, if there are four or more permanent cards in your graveyard, return target permanent card from your graveyard to your hand.'],
    // Bare `descend —` ability-word (no count)
    ['descend — whenever this creature attacks, scry 1.'],
    // Canonized in Blood / Corpses of the Lost — gated trigger phrasing
    ['at the beginning of your end step, if you descended this turn, put a +1/+1 counter on target creature you control.'],
    // Fathomless descent — keyword variant
    ['fathomless descent — for each permanent card in your graveyard, this creature gets +1/+1.'],
    // v0.14.1 — descend scaling: "number of times you descended this turn"
    // (The Mycotyrant).
    ['create x 1/1 black fungus creature tokens, where x is the number of times you descended this turn'],
    ['each time you descended this turn'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // No descend marker — bare graveyard reference
    ['return target permanent card from your graveyard to your hand.'],
    // "descended" appearing in flavor without the gating "if" or em-dash
    ['the explorers descended into the depths.'],
    // Unrelated
    ['draw a card.'],
    ['put a +1/+1 counter on target creature.'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
