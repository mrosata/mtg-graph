import { describe, it, expect } from 'vitest';
import { rule } from './condition.opus';

describe('condition.opus', () => {
  it.each([
    // Expressive Firedancer
    ['opus — whenever you cast an instant or sorcery spell, this creature gets +1/+1 until end of turn. if five or more mana was spent to cast that spell, this creature also gains double strike until end of turn.'],
    // Colorstorm Stallion
    ['opus — whenever you cast an instant or sorcery spell, this creature gets +1/+1 until end of turn.'],
    // Deluge Virtuoso (same family)
    ['opus — whenever you cast an instant or sorcery spell, this creature gets +1/+1 until end of turn.'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Bare spell-cast trigger without opus marker
    ['whenever you cast an instant or sorcery spell, this creature gets +1/+1 until end of turn.'],
    // Flavor noun
    ['the wizard composed her magnum opus over many years.'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
