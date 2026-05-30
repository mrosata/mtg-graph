import { describe, it, expect } from 'vitest';
import { rule } from './effect.collect_evidence';

describe('effect.collect_evidence', () => {
  it.each([
    // Analyze the Pollen — additional-cost form
    ['as an additional cost to cast this spell, you may collect evidence 8.'],
    // Cryptex — activated cost with {T} prefix
    ['{t}, collect evidence 3: add one mana of any color.'],
    // Conspiracy Unraveler — alt-cost form
    ['you may collect evidence 10 rather than pay the mana cost for spells you cast.'],
    // Urgent Necropsy — variable X form
    ['as an additional cost to cast this spell, collect evidence x, where x is the total mana value of the permanents this spell targets.'],
    // Lamplight Phoenix — optional trigger consequent ("may exile it and collect evidence 4")
    ['when this creature dies, you may exile it and collect evidence 4.'],
    // Kylox's Voltstrider — bare colon-cost without {T}
    ['collect evidence 6: this vehicle becomes an artifact creature until end of turn.'],
    // Sample Collector — combat trigger optional cost
    ['whenever this creature attacks, you may collect evidence 3.'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Axebane Ferox — opponent-side ward cost; the (?<!ward—) lookbehind must block this
    ['deathtouch, haste ward—collect evidence 4.'],
    // Modal gate phrasing — not the producer
    ['if evidence was collected, instead search your library for a creature or land card.'],
    // Per-collect trigger phrase — no digit/x suffix; producer must not fire
    ['whenever you collect evidence, investigate.'],
    // Bare reference without a digit/x
    ['the detective examines the evidence carefully.'],
    // Unrelated
    ['draw a card.'],
    ['destroy target creature.'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
