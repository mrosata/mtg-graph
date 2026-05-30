import { describe, it, expect } from 'vitest';
import { rules } from './effect.tutors_subtype';

function ruleFor(id: string) {
  const r = rules.find((r) => r.id === id);
  if (!r) throw new Error(`rule ${id} not found`);
  return r;
}

describe('effect.tutors_subtype', () => {
  it('shrine matches Aang\'s Journey-style chained tutor', () => {
    const r = ruleFor('effect.tutors_subtype.shrine');
    expect(r.match('search your library for a basic land card and a shrine card')).toBeTruthy();
  });

  it('shrine matches direct subtype tutor', () => {
    const r = ruleFor('effect.tutors_subtype.shrine');
    expect(r.match('search your library for a shrine card')).toBeTruthy();
  });

  it('saga matches "search ... a saga card"', () => {
    const r = ruleFor('effect.tutors_subtype.saga');
    expect(r.match('search your library for a saga enchantment card, reveal it')).toBeTruthy();
  });

  it('equipment matches "search ... equipment card"', () => {
    const r = ruleFor('effect.tutors_subtype.equipment');
    expect(r.match('search your library for an equipment card and put it onto the battlefield')).toBeTruthy();
  });

  it('shrine does not match an unrelated effect', () => {
    const r = ruleFor('effect.tutors_subtype.shrine');
    expect(r.match('draw a card')).toBe(false);
    expect(r.match('a shrine you control enters')).toBe(false);
  });

  it('does not cross-match — saga rule on shrine text', () => {
    const r = ruleFor('effect.tutors_subtype.saga');
    expect(r.match('search your library for a shrine card')).toBe(false);
  });

  it('exposes one rule per theme subtype', () => {
    expect(rules.length).toBeGreaterThan(5);
    for (const r of rules) {
      expect(r.id).toMatch(/^effect\.tutors_subtype\./);
      expect(r.axis).toBe('effect');
    }
  });
});
