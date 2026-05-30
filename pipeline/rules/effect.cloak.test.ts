import { describe, it, expect } from 'vitest';
import { rule } from './effect.cloak';

describe('effect.cloak', () => {
  it.each([
    // Cryptic Coat — "cloak the top card of your library"
    ['{2}{u}: cloak the top card of your library.'],
    // Hide in Plain Sight — "cloak two of them" (anaphoric, after a look-at-top intro)
    ['look at the top five cards of your library, cloak two of them, and put the rest on the bottom.'],
    // Etrata, Deadly Fugitive — "cloak the top card of that player's library"
    ['cloak the top card of that player\'s library.'],
    // Manifest dread — bare keyword (reminder strips the "cloak one of those cards" detail)
    ['when this creature dies, manifest dread.'],
    // Manifest dread in mid-clause
    ['{2}{u}, {t}: manifest dread.'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Noun form — the resulting permanent, not the producer
    ['whenever a cloaked creature you control attacks, you gain 1 life.'],
    // "Manifest" alone (old-Khans Manifest, not Manifest Dread)
    ['manifest the top card of your library.'],
    // Bare "cloak" with no target/object — degenerate, must not fire
    ['cloak.'],
    // Unrelated
    ['draw a card.'],
    ['destroy target creature.'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
