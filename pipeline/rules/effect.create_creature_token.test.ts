import { describe, it, expect } from 'vitest';
import { rule } from './effect.create_creature_token';

describe('effect.create_creature_token', () => {
  it.each([
    ['create a 1/1 white soldier creature token'],
    ['create two 2/2 green wolf creature tokens'],
    ['create a 1/1 colorless thopter artifact creature token'],
    ['create three 1/1 white spirit creature tokens with flying'],
    ['create a 1/1 token copy of it'],
    ['create a 4/4 angel creature token with flying and vigilance'],
    ['create a 2/2 colorless cat artifact creature token named pet'],
    // Regression (Stroke of Midnight): third-person "creates" form.
    ['its controller creates a 1/1 white human creature token'],
    // v0.12.9 — copy-token frame where the source is implicitly a creature
    // (Gruff Triplets: "create two tokens that are copies of it" — "it" is
    // the host creature). The token IS a creature token because the copy
    // source is a creature.
    ['create two tokens that are copies of it'],
    ['create a token that is a copy of __self__'],
    ['create a token that\'s a copy of target creature you control'],
    ['create two tokens that are copies of this creature'],
  ])('matches: %s', (text) => {
    expect(rule.match(text)).toBeTruthy();
  });

  it.each([
    ['create a treasure token'],
    ['create a monster role token attached to target creature you control'],
    ['create a food token'],
    ['create a clue token'],
    ['create a tapped colorless artifact token named meteorite'],
    ['create a powerstone token'],
    ['draw a card'],
    // v0.14.9 — Regression (Hunted Bonebrute): opponent-side token-creation.
    ['when this creature enters, target opponent creates two 1/1 white dog creature tokens'],
    ['each opponent creates a 2/2 black zombie creature token'],
  ])('does not match: %s', (text) => {
    expect(rule.match(text)).toBe(false);
  });

  it('populates metadata.creatureTypes for a humans token', () => {
    const out = rule.match('create a 1/1 white human soldier creature token');
    expect(out).toBeTruthy();
    expect((out as { metadata?: { creatureTypes?: string[] } }).metadata?.creatureTypes).toEqual(
      expect.arrayContaining(['human']),
    );
  });

  it('populates metadata.creatureTypes for an elves token (plural form)', () => {
    // unlikely token text, but tests the plural pluralization fallback path
    const out = rule.match('create two 1/1 green elf druid creature tokens');
    expect((out as { metadata?: { creatureTypes?: string[] } }).metadata?.creatureTypes).toEqual(
      expect.arrayContaining(['elf']),
    );
  });

  it('omits metadata when no known tribe in the token type-line', () => {
    // v0.17: "demon" is now a known tribe; use a creature type not in
    // THEME_TRIBES to test the metadata-omitted path.
    const out = rule.match('create a 4/4 black treefolk creature token');
    expect(out).toBeTruthy();
    expect((out as { metadata?: unknown }).metadata).toBeUndefined();
  });
});
