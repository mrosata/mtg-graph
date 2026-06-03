import { describe, it, expect } from 'vitest';
import { rule } from './effect.cheat_into_play';

describe('effect.cheat_into_play', () => {
  it.each([
    // Pattern A — search library + put onto battlefield (non-land)
    ['search your library for a creature card with mana value x or less, put it onto the battlefield, then shuffle.'],
    ['search your library for an artifact card, put it onto the battlefield, then shuffle.'],
    // Pattern B — look at top + put onto battlefield (across sentence boundaries)
    ['look at the top six cards of your library. you may reveal a creature card from among them. if that card has mana value 2 or less, you may put it onto the battlefield.'],
    ['look at the top six cards of your library. you may reveal a creature card with mana value less than or equal to the number of lands you control from among them and put it onto the battlefield.'],
    // Pattern C — exiled cards → battlefield
    ['put any number of exiled cards with that name onto the battlefield.'],
    ['you may put an exiled creature card used to craft __self__ onto the battlefield.'],
    // v0.20.0 — Pattern D: hand → battlefield with explicit permanent type
    // (A-Kona, Rescue Beastie). Gate on explicit permanent type — NOT bare
    // "card" — to avoid the land-play templating "play a land from your hand".
    ['survival — at the beginning of your second main phase, if kona is tapped, you may put a permanent card from your hand onto the battlefield.'],
    ['you may put a creature card from your hand onto the battlefield'],
    ['put an artifact card from your hand onto the battlefield'],
    // Kinscaer Sentry — "from your hand onto the battlefield tapped and attacking"
    ['whenever this creature attacks, you may put a creature card with mana value x or less from your hand onto the battlefield tapped and attacking, where x is the number of attacking creatures you control.'],
    // Aang, at the Crossroads — Pattern B (look at top + put onto battlefield).
    ['when aang enters, look at the top five cards of your library. you may put a creature card with mana value 4 or less from among them onto the battlefield. put the rest on the bottom of your library in a random order.'],
    // Genesis Wave — "Reveal the top X cards..." is parallel to "Look at top".
    // The reveal-put arm anchors on the same "from among them onto the battlefield" templating.
    ['reveal the top x cards of your library. you may put any number of permanent cards with mana value x or less from among them onto the battlefield. then put all cards revealed this way that weren\'t put onto the battlefield into your graveyard.'],
    // FIX 10 (BR-5) — Wickerfolk Thresher: singular "look at the top card of
    // your library. ... if it's a land card, you may put it onto the
    // battlefield." The previous LOOK_PUT required a word-quantifier before
    // "card" ("top six cards", "top five cards"); the singular form ("top
    // card") didn't reach the put-onto-battlefield anchor.
    ['delirium — whenever __self__ attacks, if there are four or more card types among cards in your graveyard, look at the top card of your library. if it\'s a land card, you may put it onto the battlefield. if you don\'t put the card onto the battlefield, put it into your hand.'],
    // v0.30 — Group 28 — Guidelight Pathmaker: SEARCH_PUT filler crosses
    // ONE sentence boundary ("...search your library for an artifact card
    // and reveal it. Put it onto the battlefield if its mana value is 2
    // or less."). Allow `[\s\S]{0,200}?` with bounded gate that admits one
    // sentence break followed by "Put it onto the battlefield (if|tapped)".
    ['vigilance when this vehicle enters, you may search your library for an artifact card and reveal it. put it onto the battlefield if its mana value is 2 or less. otherwise, put it into your hand. if you search your library this way, shuffle. crew 2'],
    ['search your library for an artifact card and reveal it. put it onto the battlefield tapped'],
    // 2026-06-01 audit batch — United Battlefront: look-at-top-N + multi-
    // typed "noncreature, nonland permanent cards" cheat-into-play. The
    // pre-noun filler must admit "up to two" count slot AND comma-separated
    // typed-restrictor tokens.
    ['look at the top seven cards of your library. put up to two noncreature, nonland permanent cards with mana value 3 or less from among them onto the battlefield. put the rest on the bottom of your library in a random order.'],
    // HIGH-17 (Aurora Awakener): "reveal cards from the top of your library
    // until you reveal X permanent cards ... put any number of those
    // permanent cards onto the battlefield".
    ['when this creature enters, reveal cards from the top of your library until you reveal x permanent cards, where x is the number of colors among permanents you control. put any number of those permanent cards onto the battlefield, then put the rest of the revealed cards on the bottom of your library in a random order.'],
    // v0.35.0 — Batch 1: HAND_PUT admit "and/or <type> card" disjunction.
    // Michelangelo, Improviser — combat-damage trigger lets you put both a
    // creature card AND a land card from hand onto the battlefield.
    ['whenever __self__ deals combat damage to a player, you may put a creature card and/or a land card from your hand onto the battlefield.'],
    // v0.35.0 — Batch 1: REVEAL_UNTIL_PUT admit anaphoric "put that card".
    // Raph & Mikey, Troublemakers — reveal-until + put-that-card pattern.
    ['trample, haste whenever __self__ attack, reveal cards from the top of your library until you reveal a creature card. put that card onto the battlefield tapped and attacking and the rest on the bottom of your library in a random order.'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Pattern A negatives — land tutors must NOT fire
    ['search your library for a basic forest card, put that card onto the battlefield, then shuffle.'],
    ['search your library for a plains card and put it onto the battlefield tapped.'],
    ['search your library for a cave card, put it onto the battlefield tapped, then shuffle.'],
    // Plural land tutors must NOT fire
    ['search your library for up to two basic land cards, put them onto the battlefield.'],
    ['search your library for three basic land cards and put them onto the battlefield.'],
    ['search your library for up to that many basic land cards, put them onto the battlefield.'],
    // Reanimate
    ['return target creature card from your graveyard to the battlefield.'],
    // Cloak/manifest
    ['manifest dread.'],
    // Pattern B negative — look at top + face-down put-onto-battlefield (filter rejects this)
    ['look at the top three cards of your library. you may put that card face down onto the battlefield.'],
    // Generic land card search — non-basic land ramp, NOT cheat_into_play
    ['search your library for a land card, put it onto the battlefield tapped.'],
    // Unrelated
    ['draw a card.'],
    ['destroy target creature.'],
    // v0.20.0 — bare "card from your hand" must NOT match the new Pattern D
    // (would FP on basic-land-play and card-draw templating).
    ['you may put a card from your hand onto the battlefield'],
    // Tutor-to-hand (Hoarding Dragon style) is NOT cheat-into-play.
    ['when this creature dies, search your library for an artifact card, reveal it, put it into your hand, then shuffle.'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
