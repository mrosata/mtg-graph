import { describe, it, expect } from 'vitest';
import { rule } from './effect.animate_land';

describe('effect.animate_land', () => {
  it.each([
    // Brave the Wilds (bargained) — animates land into elemental
    ['target land you control becomes a 3/3 elemental creature with haste that\'s still a land'],
    // Awaken / Nissa, Worldwaker style
    ['target land you control becomes a 4/4 creature'],
    ['each land you control becomes a 1/1 creature until end of turn'],
    // With type added
    ['target land becomes a 2/2 white knight creature with first strike'],
    // v0.14.1 — pronoun-form anaphor. Tendril of the Mycotyrant: "put seven
    // +1/+1 counters on target noncreature land you control. it becomes a 0/0
    // fungus creature with haste".
    ['put seven +1/+1 counters on target noncreature land you control. it becomes a 0/0 fungus creature with haste. it\'s still a land.'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Self-animate via activated ability — that's effect.is_manland, not animate_land
    ['{2}{r}: __self__ becomes a 4/4 creature with haste until end of turn'],
    // Regression (Restless cycle — Restless Bivouac, Restless Cottage, etc.):
    // manlands templating uses "this land becomes" rather than __self__. Still
    // self-animation, still belongs to effect.is_manland, not animate_land.
    ['{1}{r}{w}: this land becomes a 2/2 red and white ox creature until end of turn. it\'s still a land'],
    ['{2}{b}{g}: this land becomes a 4/4 black and green horror creature until end of turn. it\'s still a land'],
    // Tutor
    ['search your library for a land card'],
    // Land destruction
    ['destroy target land'],
    // Normal mana production
    ['{t}: add {g}'],
    ['flying'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
