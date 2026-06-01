import { describe, it, expect } from 'vitest';
import type { Card } from '../../shared/types';
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
    // v0.22.0 — third-person "manifests dread" (Unidentified Hovership,
    // Unwanted Remake). The subject is an opponent or "the exiled card's owner",
    // not "you" — same keyword action, conjugated form.
    ["when this vehicle leaves the battlefield, the exiled card's owner manifests dread."],
    ['destroy target creature. its controller manifests dread.'],
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
    // v0.22.0 — observer-side trigger (Paranormal Analyst). "Whenever you
    // manifest dread" observes the keyword action; the card doesn't perform
    // it. Trigger.manifest_dread (deferred) would cover this side; this rule
    // must not double-fire.
    ['whenever you manifest dread, put a card you put into your graveyard this way into your hand.'],
    ['when you manifest dread, draw a card.'],
    ['each time you manifest dread, scry 1.'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });

  // v0.21.0 — Manifest Dread (the sorcery itself, not the keyword action).
  // The card name lowercased equals the keyword "manifest dread", and the
  // case-insensitive name-substitution in pipeline/normalize.ts clobbers it
  // to `__SELF__`, so the regex-based `match` can never fire. A `matchCard`
  // gate keyed on `card.name === 'Manifest Dread'` is the minimal targeted
  // fix.
  describe('matchCard gate — Manifest Dread (card name)', () => {
    it('fires on Manifest Dread via matchCard', () => {
      const card = { name: 'Manifest Dread' } as Card;
      const result = rule.matchCard!(card, '__self__.');
      expect(result).toBeTruthy();
    });

    it('does NOT fire on other cards via matchCard', () => {
      const card = { name: 'Lightning Bolt' } as Card;
      const result = rule.matchCard!(card, 'lightning bolt deals 3 damage');
      expect(result).toBe(false);
    });
  });
});
