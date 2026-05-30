import { describe, it, expect } from 'vitest';
import { rule } from './effect.suspect';

describe('effect.suspect', () => {
  it.each([
    // Absolving Lammasu — bare "suspect up to one target creature"
    ['when this creature dies, you gain 3 life and suspect up to one target creature an opponent controls.'],
    // Agrus Kos — "suspect it" after a punctuation break
    ["if it's suspected, exile it. otherwise, suspect it."],
    // Case of the Stashed Skeleton — chained "and suspect it"
    ['when this case enters, create a 2/1 black skeleton creature token and suspect it.'],
    // Rubblebelt Braggart — "you may suspect it"
    ["whenever this creature attacks, if it's not suspected, you may suspect it."],
    // Convenient Target — "suspect enchanted creature"
    ['when this aura enters, suspect enchanted creature.'],
    // Frantic Scapegoat — transfer frame "suspect one of the other creatures"
    ['if this creature is suspected, you may suspect one of the other creatures.'],
    // Clandestine Meddler — "suspect up to one other target creature you control"
    ['when this creature enters, suspect up to one other target creature you control.'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Carer phrasing — the adjective form, not the verb
    ['put a +1/+1 counter on target suspected creature you control.'],
    // Gate, not producer — "is suspected" alone (no "suspect <obj>")
    ["if it's suspected, exile it."],
    // Reminder text — stripped pre-tag, but a regression guard
    ["a suspected creature has menace and can't block."],
    // Unrelated mechanic
    ['draw a card.'],
    ['destroy target creature.'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
