import { describe, it, expect } from 'vitest';
import { rule } from './effect.play_extra_land';

describe('effect.play_extra_land', () => {
  it.each([
    // Plant Beans / Exploration / Beanstalk Wurm adventure
    ['you may play an additional land this turn'],
    ['you may play two additional lands this turn'],
    ['play an additional land each turn'],
    ['you may play three additional lands on each of your turns'],
    ['play one additional land on your turn'],
    // v0.35.0 — Batch 14: hand → play extra-land template (Lessons from
    // Life, Embrace the Paradox, Michelangelo's combat trigger). The
    // "put a land card from your hand onto the battlefield" frame is the
    // canonical Exploration/Arboreal Grazer extra-land-drop.
    ['draw three cards. you may put a land card from your hand onto the battlefield tapped.'],
    ['you may put a land card from your hand onto the battlefield'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // Normal land play, not extra
    ['you may play a land from your graveyard'],
    ['search your library for a basic land card'],
    ['destroy target land'],
    ['this land enters tapped'],
    ['flying'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
