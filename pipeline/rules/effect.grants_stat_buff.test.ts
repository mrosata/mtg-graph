import { describe, it, expect } from 'vitest';
import { rule } from './effect.grants_stat_buff';

describe('effect.grants_stat_buff', () => {
  it.each([
    ['other creatures you control get +1/+1 until end of turn'],
    ['creatures you control get +2/+2 and gain trample'],
    ['creatures get +1/+0 until end of turn'],
    ['target creature gets +3/+3 until end of turn'],
    ['all creatures get +1/+1 and gain flying'],
    ['attacking creatures get +1/+0 until end of turn'],
    ['target attacking creature gets +2/+2 until end of turn'],
    // Regression (Moonshaker Cavalry, Night of the Sweets' Revenge): X/X
    // variable anthem — scales with a count.
    ['creatures you control gain flying and get +x/+x until end of turn, where x is the number of creatures you control'],
    ['creatures you control get +x/+x until end of turn, where x is the number of foods you control'],
    // v0.12.9 — tribal anthem (Goddric, Cloaked Reveler grants this through
    // a nested-quoted ability — "{R}: Dragons you control get +1/+0 until end
    // of turn."). The subject is a tribal subtype rather than the literal
    // word "creatures".
    ['dragons you control get +1/+0 until end of turn'],
    ['knights you control get +1/+1 until end of turn'],
    ['merfolk you control get +1/+1'],
    // Flowerfoot Swordmaster / Mabel, Heir to Cragflame — Mice tribal anthem.
    // "Mice" is an irregular plural (no -s/-en suffix); the v0.12.9 tribal
    // pattern only admitted -s/-en plurals plus the literal "merfolk".
    ['mice you control get +1/+0 until end of turn'],
    ['other mice you control get +1/+1'],
    // Other Bloomburrow-era irregular plurals.
    ['geese you control get +1/+1 until end of turn'],
    // Might of the Meek — "it" subject as anaphoric reference to a previously-
    // mentioned target creature. The current PATTERN's subject alternation
    // excludes pure pronoun subjects.
    ['target creature gains trample until end of turn. it also gets +1/+0 until end of turn if you control a mouse'],
    // v0.30 — Group 18 — Reckless Velocitaur: "that Mount or Vehicle gets
    // +2/+0". The SUBJECT slot needs to admit "that <type> or <type>"
    // (anaphoric reference established by a prior trigger clause).
    ['whenever this creature saddles a mount or crews a vehicle during your main phase, that mount or vehicle gets +2/+0 and gains trample until end of turn.'],
    ['that mount or vehicle gets +1/+0 until end of turn'],
    // 2026-06-01 audit batch — Adelbert Steiner: self-buff "for each X"
    // scaling. The self-anaphor "__self__" wasn't in the SUBJECT slot.
    ['__self__ gets +1/+1 for each equipment you control'],
    // 2026-06-02 audit batch — Fancy Footwork: "they each get +2/+2" after
    // a "two target creatures" antecedent. The SUBJECT slot needs to admit
    // the "they each" anaphor.
    ['untap one or two target creatures. they each get +2/+2 until end of turn.'],
    ['they each get +2/+2 until end of turn'],
    ['they each get +1/+0'],
    // HIGH-10 (Champion of the Clachan): "other Kithkin you control get +1/+1". "Kithkin" is an irregular plural (no -s/-en suffix).
    ['other kithkin you control get +1/+1'],
  ])('matches: %s', (text) => {
    expect(rule.match(text)).toBeTruthy();
  });

  it.each([
    ['put a +1/+1 counter on target creature'],
    ['__self__ enters with a +1/+1 counter on it'],
    ['target creature gets -3/-3 until end of turn'],
    ['draw a card'],
    ['creatures you control have flying'],
  ])('does not match: %s', (text) => {
    expect(rule.match(text)).toBe(false);
  });
});
