import { describe, it, expect } from 'vitest';
import { rule } from './effect.sacrifice_artifact';
import type { Card } from '../../shared/types';

function card(types: string[], oracleText: string): Card {
  return {
    oracleId: 'x', name: 'X', set: 's', printings: ['s'], collectorNumber: '1',
    manaCost: null, cmc: 0, colors: [], colorIdentity: [], typeLine: types.join(' '),
    types, subtypes: [], supertypes: [], oracleText,
    keywords: [], power: null, toughness: null, rarity: 'common', imageUrl: '',
    tags: [],
  };
}

describe('effect.sacrifice_artifact', () => {
  it.each([
    ['sacrifice an artifact'],
    ['sacrifice another artifact'],
    ['sacrifice target artifact'],
    ['sacrifice two artifacts'],
    ['sacrifice a permanent'],
    ['sacrifice a nonland permanent'],
    ['sacrifice a noncreature permanent'],
    // Artifact-subtype sacrifice — Greta, Hollow Scavenger, etc.
    ['sacrifice a food'],
    ['sacrifice a treasure'],
    ['sacrifice three treasures'],
    ['sacrifice a clue'],
    ['sacrifice target equipment'],
    ['sacrifice a vehicle'],
    ['sacrifice a blood'],
    ['sacrifice a map'],
    ['sacrifice a powerstone'],
    // v0.14.9 — Regression (Knife): "this <subtype>" determiner for self-sac
    // on a card whose printed phrasing uses the subtype noun rather than
    // __SELF__. Equipment / Vehicle / Food / Treasure / Map / Blood / Clue
    // self-sac costs all share this shape.
    ['{2}, sacrifice this equipment: draw a card'],
    ['sacrifice this food: you gain 3 life'],
    ['sacrifice this treasure: add one mana of any color'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    ['sacrifice a nonartifact permanent'],
    ['sacrifice a creature'],
    ['sacrifice a land'],
    ['destroy target artifact'],
    // v0.14.1 — edict leak. "Each opponent sacrifices a nonland permanent"
    // (Throne of the Grim Captain) is an edict, not a typed artifact sac.
    ['whenever the grim captain attacks, each opponent sacrifices a nonland permanent of their choice'],
    // v0.14.1 — aristocrats trigger leak. Vito: "whenever you sacrifice
    // another permanent" is a trigger frame; this card observes sacs.
    ['whenever you sacrifice another permanent, you gain 2 life'],
    // v0.14.6 — punisher edict frame leak (Zoyowa Lava-Tongue). "Each
    // opponent may discard a card or sacrifice a permanent of their choice"
    // — same edict semantics, just phrased as a choice the opponent makes.
    ['each opponent may discard a card or sacrifice a permanent of their choice'],
    // Regression (Ward—Sacrifice an artifact pattern): Ward cost is paid by
    // the OPPONENT targeting this card, not by the controller. Same
    // exclusion shape as edicts — handled via NEGATIVE_WARD span.
    ['ward—sacrifice an artifact.'],
    ['ward—sacrifice a treasure, then draw a card.'],
    // Wave-2 Win 6 (2026-06-01 audit) — Pox Plague: multi-clause "each
    // player ... sacrifices ... permanents" edict. The verb is detached from
    // the subject by intermediate clauses; NEGATIVE_EDICT span must bridge.
    ['each player loses half their life, then discards half the cards in their hand, then sacrifices half the permanents they control of their choice. round down each time.'],
    // Wave-2 Win 6 — observer trigger frames. "whenever a player / an
    // opponent sacrifices X" — the controller observes, doesn't cause.
    ['whenever a player sacrifices another artifact, draw a card.'],
    ['whenever an opponent sacrifices an artifact, you gain 1 life.'],
    // Plain `target player` / `each player` edicts (parallel to the existing
    // `target opponent` / `each opponent` cases above).
    ['target player sacrifices an artifact.'],
    ['each player sacrifices a permanent.'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });

  // Regression: Eriette's Tempting Apple — Artifact-Food whose oracle has
  // "{2}, {T}, Sacrifice __SELF__: ..." as an activation cost. The self-sac
  // doesn't say "sacrifice an artifact", so text-only matching misses it; the
  // matchCard branch fills the gap by combining type_line with self-sac text.
  it('matchCard: fires on self-sac when card type includes Artifact', () => {
    const c = card(['Artifact'], '{2}, {t}, sacrifice __self__: you gain 3 life');
    expect(rule.matchCard!(c, c.oracleText)).toBeTruthy();
  });

  it('matchCard: does not fire on self-sac when card is not an Artifact', () => {
    const c = card(['Creature'], '{2}, {t}, sacrifice __self__: you gain 3 life');
    expect(rule.matchCard!(c, c.oracleText)).toBe(false);
  });

  it('matchCard: does not fire on Artifact without self-sac', () => {
    const c = card(['Artifact'], '{t}: add one mana of any color');
    expect(rule.matchCard!(c, c.oracleText)).toBe(false);
  });

  // Regression (The Millennium Calendar): pronoun-anaphor self-sac. After
  // __SELF__ is established earlier in the text, a later "sacrifice it" refers
  // back to __SELF__. On an Artifact card this is self-sac.
  it('matchCard: fires on anaphoric "sacrifice it" when __SELF__ established and card is Artifact', () => {
    const c = card(
      ['Artifact'],
      'when there are 1,000 or more time counters on __self__, sacrifice it and each opponent loses 1,000 life',
    );
    expect(rule.matchCard!(c, c.oracleText)).toBeTruthy();
  });

  it('matchCard: does NOT fire on "sacrifice it" when card is not Artifact', () => {
    const c = card(
      ['Creature'],
      'when __self__ enters, sacrifice it and gain 1 life',
    );
    expect(rule.matchCard!(c, c.oracleText)).toBe(false);
  });

  it('matchCard: does NOT fire on "sacrifice it" when __SELF__ not in text', () => {
    const c = card(['Artifact'], 'target opponent sacrifices an artifact. then sacrifice it');
    // Without a __SELF__ anchor earlier, "it" is ambiguous; refuse to fire.
    expect(rule.matchCard!(c, c.oracleText)).toBe(false);
  });
});
