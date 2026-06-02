import { describe, it, expect } from 'vitest';
import { rule } from './effect.exile_from_graveyard';

describe('effect.exile_from_graveyard', () => {
  it.each([
    // Targeted graveyard-hate, foreign-graveyard form.
    ['exile target card from a graveyard'],
    ['exile target creature card from a graveyard'],
    ["exile target card from target opponent's graveyard"],
    // Regression (Lord Skitter, Sewer King): "from an opponent's graveyard"
    // (indefinite "an" rather than "target") — surrogate for exile-each.
    ["exile up to one target card from an opponent's graveyard"],
    // "from your graveyard" only counts as an effect when `target` qualifies it.
    ['exile up to two target cards from your graveyard'],
    ['exile target nonland card with mana value 3 or less from your graveyard'],
    // Regression (Specter of Mortality): "exile one or more X cards from your
    // graveyard" — variable-scope graveyard exile that scales an effect by the
    // count chosen. Not a cost form (no colon), so admissible.
    ['you may exile one or more creature cards from your graveyard'],
    // Mass-wipe form (e.g. Soul-Guide Lantern's sacrifice ability).
    ['exile each opponent\'s graveyard'],
    // Regression (Sentinel of Lost Lore): singular "target player's graveyard"
    // (bulk single-graveyard exile).
    ["exile target player's graveyard"],
    // Regression (Digsite Conservator): "from a single graveyard" — targeted
    // multi-card exile that picks one graveyard out of many.
    ['sacrifice this creature: exile up to four target cards from a single graveyard. activate only as a sorcery.'],
    // v0.14.22 — "exile target X card IN a graveyard" — modern templating
    // (Reenact the Crime). Semantically the same as "from a graveyard":
    // the card is the target, the graveyard is the source zone.
    ['exile target nonland card in a graveyard that was put there from anywhere this turn'],
    ['exile target creature card in a graveyard'],
    // v0.15 — mass graveyard wipe "exile all graveyards" (Rest in Peace's ETB).
    // The broadest possible graveyard-exile effect — every card in every
    // graveyard removed at once.
    ['when this enchantment enters, exile all graveyards'],
    ['exile all graveyards'],
    // v0.20.0 — Abhorrent Oculus: "as an additional cost to cast this spell,
    // exile six cards from your graveyard". Numeric-count additional-cost
    // graveyard exile. Distinct from Renew-style activation costs (which
    // exile __self__ from graveyard); here the controller's whole graveyard
    // pays a constant N-card price.
    ['as an additional cost to cast this spell, exile six cards from your graveyard. flying at the beginning of each opponent\'s upkeep, manifest dread.'],
    // v0.23 — Containment Construct: anaphoric "exile that card from your
    // graveyard" after a "whenever you discard a card" antecedent.
    ['whenever you discard a card, you may exile that card from your graveyard. if you do, you may play that card this turn.'],
    // 2026-06-01 audit Group 13 — Ancient Vendetta: multi-zone "search target
    // opponent's graveyard, hand, and library for up to four cards with that
    // name and exile them". The search includes the graveyard, then exiles
    // the matched cards — semantically a graveyard exile (and library exile,
    // both rules should fire).
    ["search target opponent's graveyard, hand, and library for up to four cards with that name and exile them"],
    // 2026-06-01 audit batch — Tersa Lightshatter: "exile a card at random
    // from your graveyard". The triggered effect targets the controller's
    // own graveyard with a random pick; not a cost (no colon).
    ['whenever __self__ attacks, if there are seven or more cards in your graveyard, exile a card at random from your graveyard. you may play that card this turn.'],
    // 2026-06-01 audit batch — Strategic Betrayal: "target opponent exiles
    // a creature they control and their graveyard". The "their graveyard"
    // half is a whole-graveyard wipe; forced-edict on the opponent.
    ['target opponent exiles a creature they control and their graveyard.'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    ['exile target creature'],
    ['exile target artifact from the battlefield'],
    ['exile cards from your hand'],
    // Self-exile activation costs (Renew-style) — paying a cost, not producing
    // a graveyard-hate effect another card can interact with.
    ['{1}{g}, exile __self__ from your graveyard: search your library for a desert card.'],
    ['renew — {1}{g}, exile __self__ from your graveyard: put a +1/+1 counter on target creature.'],
    ['{5}, exile __self__ from your graveyard: discover 5.'],
    // Generic untargeted cost-form on the activator's own graveyard.
    ['{t}, exile a card from your graveyard: add one mana of any color.'],
    ['exile two cards from your graveyard: draw a card.'],
    // Regression (Fabrication Foundry): OWN_QUANTIFIED used to span across
    // the colon — "exile one or more other artifacts you control with total
    // mana value x: return target artifact card with mana value x or less
    // from your graveyard". The forbid-colon filler prevents this; the cost
    // half has no "from your graveyard", the effect half is reanimation.
    ['{2}{w}, {t}, exile one or more other artifacts you control with total mana value x: return target artifact card with mana value x or less from your graveyard to the battlefield. activate only as a sorcery.'],
    // Regression (Aven Interrupter): FOREIGN_OR_GENERIC's `.+?` filler used
    // to span across sentence terminators. Aven exiles a SPELL on the stack
    // ("exile target spell. it becomes plotted.") — no graveyard touched —
    // but the rule walked past two periods to reach a later cost-tax clause
    // ("spells your opponents cast from graveyards or from exile cost {2}
    // more to cast") and tagged the card as graveyard-hate. The fix:
    // `[^.]+?` (forbid `.` in the filler) keeps the match within one sentence.
    ['when this creature enters, exile target spell. it becomes plotted. spells your opponents cast from graveyards or from exile cost {2} more to cast.'],
    ['exile target nonland permanent. it becomes a copy of a forest. spells from graveyards cost more to cast.'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
