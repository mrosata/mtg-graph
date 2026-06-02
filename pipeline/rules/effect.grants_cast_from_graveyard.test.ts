// pipeline/rules/effect.grants_cast_from_graveyard.test.ts
import { describe, it, expect } from 'vitest';
import { rule } from './effect.grants_cast_from_graveyard';

describe('effect.grants_cast_from_graveyard', () => {
  it.each([
    // Muldrotha — permanent-spell license.
    ['during each of your turns, you may play a land and cast a permanent spell of each permanent type from your graveyard.'],
    // Counterpoint — typed-spell cast-from-grave (creature, instant, sorcery,
    // or planeswalker spell).
    ['counter target spell. you may cast a creature, instant, sorcery, or planeswalker spell from your graveyard with mana value less than or equal to that spell\'s mana value without paying its mana cost.'],
    // Bilbo, Thief in the Night — attack-triggered cast-from-grave.
    ['whenever __self__ attacks, you may cast an artifact, instant, or sorcery spell from your graveyard.'],
    // Daring Waverider — ETB-triggered typed cast-from-grave.
    ['when this creature enters, you may cast target instant or sorcery card with mana value 4 or less from your graveyard without paying its mana cost.'],
    // Conduit of Worlds — bare "you may cast that card" referencing a
    // graveyard target. Distinctive "play lands from your graveyard" too.
    ['you may play lands from your graveyard.'],
    // Edgar, Master Machinist — once-per-turn artifact cast-from-grave.
    ['once during each of your turns, you may cast an artifact spell from your graveyard.'],
    // 2026-06-01 audit Group 6 — Sphinx of Forgotten Lore: grants Flashback
    // to a target graveyard card. Granting a graveyard-cast keyword IS the
    // license axis — same semantic as Snapcaster Mage's classic frame.
    ['target instant or sorcery card in your graveyard gains flashback until end of turn'],
    // Cursecloth Wrappings — grants Embalm.
    ['target creature card in your graveyard gains embalm until end of turn'],
    // Snapcaster-style frame.
    ['target instant or sorcery card in your graveyard gains flashback. the flashback cost is equal to its mana cost.'],
    // 2026-06-01 audit batch — Songcrafter Mage: "gains harmonize" license
    // grant. Harmonize is the FIN/TDM graveyard-cast keyword; same license
    // axis as Flashback / Disturb / Embalm.
    ['target instant or sorcery card in your graveyard gains harmonize until end of turn. its harmonize cost is equal to its mana cost.'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Self-keyword cast — Flashback/Disturb/Mayhem reminder text uses "you
    // may cast this card from your graveyard"; that's the keyword axis
    // (condition.cast_from_graveyard), NOT a grant.
    ['you may cast this card from your graveyard for its flashback cost. then exile it.'],
    ['you may cast this spell from your graveyard.'],
    // Cards-in-graveyard reference without permission.
    ['for each card in your graveyard, this creature gets +1/+0.'],
    // Exile from graveyard (different verb).
    ['exile target card from your graveyard.'],
    // Generic.
    ['draw a card.'],
    ['put a +1/+1 counter on target creature.'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
