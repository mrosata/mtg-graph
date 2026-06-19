import { describe, it, expect } from 'vitest';
import { rule } from './effect.cast_from_exile';

describe('effect.cast_from_exile', () => {
  it.each([
    // Theft / temporary control of opponent's exiled cards
    ['target opponent exiles the top x cards of their library face down. you may look at and play those cards for as long as they remain exiled. if you cast a spell this way, you may spend mana as though it were mana of any type to cast it'],
    ['its controller looks at the top card of that opponent\'s library and exiles it face down. they may play that card for as long as it remains exiled. mana of any type can be spent to cast a spell this way'],
    // Anaphoric "cast a spell this way" (Intrepid Paleontologist, Valgavoth,
    // Gonti, Outrageous Robbery — they all follow an exile clause earlier in
    // the same ability). v0.20: now guarded by a 200-char backward
    // exile-token check, so test rows include the preceding exile context.
    ['exile target card. you may cast a spell this way'],
    ['target opponent exiles the top three cards of their library. if you cast a spell this way, you may spend mana as though it were mana of any type to cast it'],
    // From-among-exiled-cards cast (Voltstrider, Kylox)
    ['you may cast an instant or sorcery spell from among cards exiled with it'],
    ['cast any number of instant and/or sorcery spells from among the exiled cards without paying their mana costs'],
    ['you may cast a creature spell from among cards exiled with __self__'],
    // Regression (Laughing Jasper Flint, Dack Fayden / Knowledge Pool /
    // Etali family): "from among those cards" — anaphoric reference where
    // "those cards" binds to a preceding `exile the top X cards of …`
    // clause in the same effect. Same cast-from-exile semantic as the
    // "from among the exiled cards" form.
    ['at the beginning of your upkeep, exile the top x cards of target opponent\'s library. until end of turn, you may cast spells from among those cards, and mana of any type can be spent to cast those spells.'],
    ['you may cast spells from among those cards'],
    // v0.21.0 — Norin, Swift Survivalist: "play that card from exile this
    // turn" — explicit impulse-cast permission. Distinct phrasing from the
    // existing anaphoric "cast a spell this way" / from-among-exiled forms.
    ['__self__ can\'t block. whenever a creature you control becomes blocked, you may exile it. you may play that card from exile this turn.'],
    ['you may play that card from exile'],
    ['you may play that card from exile this turn'],
    // v0.22.0 — Painter's Studio / Defaced Gallery: anaphoric "play them" with
    // backward exile context. Same impulse-cast semantic as "play that card
    // from exile"; the "them/it" antecedent binds to the prior exile clause.
    ['when you unlock this door, exile the top two cards of your library. you may play them until the end of your next turn.'],
    ['exile the top three cards of your library. you may play them until the end of your next turn.'],
    ['exile the top card of your library. you may play it this turn.'],
    // HIGH-5a (Goliath Daydreamer): "from among cards you own in exile with dream counters on them" — counter-keyed.
    ['whenever this creature attacks, you may cast a spell from among cards you own in exile with dream counters on them without paying its mana cost.'],
    // HIGH-5a (Goliath Daydreamer bare form): "from among cards you own in exile" without counter qualifier.
    ['you may cast a spell from among cards you own in exile'],
    // HIGH-5a (Dream Harvest): "cast cards exiled this way".
    ['until end of turn, you may cast cards exiled this way without paying their mana costs.'],
    // HIGH-5a (anchored Taster of Wares): "exile ... you may cast (it|that card) for as long as you control this creature".
    ['that player exiles it. if an instant or sorcery card is exiled this way, you may cast it for as long as you control this creature, and mana of any type can be spent to cast that spell.'],
    // v0.35.0 — Batch 30: anaphoric "you may cast it/that card" after an
    // exile clause. Nita, Forum Conciliator ("Exile target ... You may
    // cast it this turn") and Practiced Scrollsmith ("Exile target ...
    // Until the end of your next turn, you may cast that card"). The
    // backward exile-window guard prevents FPs on bare "you may cast it"
    // templates outside an exile context.
    ["exile target instant or sorcery card from an opponent's graveyard. you may cast it this turn, and mana of any type can be spent to cast that spell."],
    ['when this creature enters, exile target noncreature, nonland card from your graveyard. until the end of your next turn, you may cast that card.'],
    // v0.38.0 — Batch 12b: anaphoric "from among them" form. Abstract
    // Performance: "exile the top four cards of your library. ... you may
    // cast a spell from among them without paying its mana cost." The
    // arm is gated on a preceding `exile` clause within ~200 chars
    // (mirrors PATTERN_2 / PATTERN_PLAY_ANAPHOR backward-window guard).
    ['exile the top four cards of your library in a face-down pile, then exile the top four cards of your library in a face-up pile. an opponent chooses one of those piles. put that pile into your graveyard. look at the cards in the other pile. you may cast a spell from among them without paying its mana cost. put the rest into your hand.'],
    // v0.43.0 — "play that card" anaphoric arm (Moonstone, Thor shapes).
    // "that card" binds to an earlier exile clause; same impulse-cast semantic.
    ['exile that creature. you may play that card.'],
    ['exile target equipment, instant, or sorcery card from your graveyard. until the end of your next turn, you may play that card.'],
    // v0.46.0 — Azula: "cast cards exiled with __self__" — controller casts
    // from own exile pile keyed to this permanent.
    ['you may cast cards exiled with __self__ from exile without paying their mana costs.'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Adventure DFC templating MUST NOT match — already covered by
    // effect.adventure_card via subtype.
    ['exile this card. you may cast the creature later from exile'],
    ['cast the creature later from exile'],
    // Lazav: "become a copy of a creature card exiled with it" — clone, NOT
    // a cast. The "cards exiled with" substring shouldn't fire without a
    // leading "cast" verb.
    ['you may have __self__ become a copy of a creature card exiled with it until end of turn'],
    // Passive exile-pile reference without a cast verb
    ['cards you own in exile'],
    ['for each card exiled with __self__'],
    // Unrelated text
    ['exile target creature'],
    ['draw a card'],
    ['flying'],
    // v0.20 — Osteomancer Adept: anaphoric "cast a spell this way" with NO
    // exile token in the preceding 200 chars. The earlier clause references
    // graveyard, not exile, so this is graveyard-recast and must not match.
    ['deathtouch {t}: until end of turn, you may cast creature spells from your graveyard by foraging in addition to paying their other costs. if you cast a spell this way, that creature enters with a finality counter on it.'],
    // v0.22.0 — "play them" without a backward exile clause must not fire.
    // Bare "you may play them" with no exile anaphor is generic/ambiguous.
    ['return target creature card from your graveyard to your hand. you may play them this turn.'],
    ['you may play them this turn.'],
    // v0.38.0 — Batch 12b: bare "from among them" without backward exile
    // context must NOT fire. Mirrors PATTERN_2's anaphor guard.
    ['return target creature card from your graveyard. you may cast a spell from among them.'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
