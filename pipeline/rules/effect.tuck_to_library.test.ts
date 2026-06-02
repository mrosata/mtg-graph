import { describe, it, expect } from 'vitest';
import { rule } from './effect.tuck_to_library';

describe('effect.tuck_to_library', () => {
  it.each([
    // Horned Loch-Whale's Lagoon Breach — soft-bounce-to-library.
    ['the owner of target attacking creature you don\'t control puts it on their choice of the top or bottom of their library'],
    // Memory Lapse / Sudden Setback shape — owner-puts-spell.
    ['the owner of target spell or nonland permanent puts it on their choice of the top or bottom of their library'],
    // Graveyard-tuck — Tomb Trawler, Hoverstone Pilgrim, Malevolent Chandelier.
    ['put target card from a graveyard on the bottom of its owner\'s library'],
    ['put target card from your graveyard on the bottom of your library'],
    ['put target creature card from your graveyard on top of your library'],
    // Permanent tuck — The Spot's Portal.
    ['put target creature on the bottom of its owner\'s library'],
    // Adventure-card tuck — Aquatic Alchemist's Bubble Up.
    ['put target instant or sorcery card from your graveyard on top of your library'],
    // v0.14.1 — possessive Frame A2: "target X's owner puts it on ...".
    // Unlucky Drop: "target artifact or creature's owner puts it on their
    // choice of the top or bottom of their library".
    ['target artifact or creature\'s owner puts it on their choice of the top or bottom of their library'],
    ['target creature\'s owner puts it on their choice of the top or bottom of their library'],
    // Frame D: "shuffles it into their library" — Zoyowa's Justice.
    // "the owner of target X shuffles it into their library"
    ['the owner of target artifact or creature with mana value 1 or greater shuffles it into their library'],
    // Direct shuffle-into-library forms (Reality Shift style).
    ['shuffles that card into its owner\'s library'],
    ['shuffles target creature into its owner\'s library'],
    // Dramatic Accusation — Aura tucks its enchanted creature.
    ["{u}{u}: shuffle enchanted creature into its owner's library"],
    // Equipment analog.
    ["shuffle equipped creature into its owner's library"],
    // Attached creature variant.
    ["shuffle attached creature into its owner's library"],
    // v0.21.0 — Floodpits Drowner: multi-subject shuffle ("this creature
    // and target creature with a stun counter on it") tucked into multiple
    // owners' libraries ("their owners' libraries"). Frame D3 — anchored on
    // possessive/multi-owner phrasing to avoid self-shuffle FPs.
    ["shuffle this creature and target creature with a stun counter on it into their owners' libraries"],
    // v0.30 — Group 19 — Riptide Gearhulk: "put ... into its owner's
    // library third from the top". Nth-from-the-top is a soft-tuck variant
    // distinct from the bare top/bottom; structurally a battlefield-to-
    // library tuck removal.
    ["double strike prowess when this creature enters, for each opponent, put up to one target nonland permanent that player controls into its owner's library third from the top."],
    ["put target creature into its owner's library second from the top"],
    ["put target permanent into its owner's library fourth from the top"],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Scry-style: "look at the top N, put the rest on the bottom" — cards
    // never left the library, so it's not a tuck removal.
    ['look at the top four cards of your library, then put up to two of them back on top of your library in any order and the rest into your graveyard'],
    ['put the rest on the bottom of your library'],
    // Bounce to hand — different removal axis.
    ['return target creature to its owner\'s hand'],
    // Mill — graveyard, not library.
    ['mill three cards'],
    // Tutor (search-then-shuffle).
    ['search your library for a card, reveal it, put it into your hand, then shuffle'],
    // Scry — no zone change.
    ['scry 2'],
    // Counter — counters in spell-stack sense.
    ['counter target spell'],
    // Shuffling your own library — not a tuck of a target permanent.
    ['then shuffle your library'],
    // Multi-card no-target library shuffle (search/dig effect).
    ['reveal cards until you reveal a land card. shuffle the rest into your library'],
    // FIX 3 (FP-5) — Darksteel Colossus: "if __self__ would be put into a
    // graveyard from anywhere, reveal __self__ and shuffle it into its owner's
    // library instead". This is a self-replacement (death-replacement) clause
    // — the card replaces its own graveyard-bound move with a tuck. The card
    // does NOT tuck another permanent; it's a self-only protective ability.
    ["trample\nindestructible\nif __self__ would be put into a graveyard from anywhere, reveal __self__ and shuffle it into its owner's library instead."],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
