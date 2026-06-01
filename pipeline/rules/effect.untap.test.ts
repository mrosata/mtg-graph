import { describe, it, expect } from 'vitest';
import { rule } from './effect.untap';

describe('effect.untap', () => {
  it.each([
    ['untap target creature'],
    ['untap target permanent'],
    ['untap up to two target creatures'],
    ['untap all creatures you control'],
    ['untap target artifact'],
    ['untap target nonland permanent'],
    // Regression (Yenna, Redtooth Regent): self-untap via card-name reference
    // ("untap Yenna" → "untap __self__" post-normalization). Self-untap is a
    // meaningful effect (lets a tap-cost activation be re-used).
    ['untap __self__, then scry 2'],
    // v0.12.9 — pronoun form: "Untap it." / "Untap them." after a prior
    // "target creature" referent (Leaping Ambush, Acrobatic Leap).
    ['target creature gets +1/+3 and gains reach until end of turn. untap it'],
    ['target creature gets +1/+3 and gains flying until end of turn. untap it.'],
    ['target creatures you control get +1/+1 until end of turn. untap them.'],
    // Essence of Antiquity — anaphoric "untap them" referencing "creatures you control" antecedent.
    ['creatures you control gain hexproof until end of turn. untap them'],
    // v0.20 — chained "gain control + untap" (Reptilian Recruiter): the
    // untap rides on a comma-clause within the same sentence rather than
    // across a sentence boundary.
    ["gain control of that creature until end of turn, untap it, and it gains haste until end of turn"],
    // v0.20.0 — tribal-list antecedent (Valley Floodcaller): plural tribal
    // nouns + "you control" + buff clause + "untap them".
    ['flash you may cast noncreature spells as though they had flash. whenever you cast a noncreature spell, birds, frogs, otters, and rats you control get +1/+1 until end of turn. untap them.'],
  ])('matches: %s', (text) => {
    expect(rule.match(text)).toBeTruthy();
  });

  it.each([
    ["doesn't untap during your untap step"],   // steady-state, not effect
    ['draw a card'],                             // unrelated
    ['tap target creature'],                     // opposite tag
    ['destroy target creature'],                 // unrelated
    ['flying'],                                  // unrelated
    // v0.14.1 — trigger-frame leak. The Millennium Calendar: "whenever you
    // untap one or more permanents" — TRIGGER observing an untap event, not
    // an effect that untaps. trigger.tapped_or_untapped covers it.
    ['whenever you untap one or more permanents during your untap step, put that many time counters on __self__'],
    // v0.14.1 — vigilance-style static self-untap rider. Thousand Moons
    // Infantry: "untap this creature during each other player's untap step"
    // is a static modifier on combat untap, not an active untap effect.
    ['untap this creature during each other player\'s untap step'],
    // v0.14.9 — Regression (Hedge Whisperer): negated rider — "you may choose
    // not to untap this creature during your untap step." Vigilance-inverse
    // (supports tap-to-animate-land combo) — not an active untap effect.
    ['you may choose not to untap this creature during your untap step'],
    ['may choose not to untap this creature during each other player\'s untap step'],
  ])('does not match: %s', (text) => {
    expect(rule.match(text)).toBe(false);
  });
});
