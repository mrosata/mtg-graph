import { describe, it, expect } from 'vitest';
import { rule } from './effect.has_web_slinging';
import type { Card } from '../../shared/types';

function mk(opts: { keywords?: string[]; oracle?: string }): Card {
  return {
    oracleId: 'x',
    name: 'X',
    set: 'tst',
    printings: ['tst'],
    collectorNumber: '1',
    typeLine: 'Creature — Spider',
    types: ['Creature'],
    subtypes: ['Spider'],
    manaCost: '{2}{U}',
    keywords: opts.keywords ?? [],
    colors: [],
    colorIdentity: [],
    oracleText: opts.oracle ?? '',
    imageUrl: '',
    legalities: {},
  } as unknown as Card;
}

describe('effect.has_web_slinging', () => {
  it('matches via Scryfall keyword array', () => {
    expect(rule.matchCard!(mk({ keywords: ['Web-slinging'] }), '')).toBeTruthy();
  });

  it('matches multi-face back-face web-slinging via oracle text fallback (Peter Parker case)', () => {
    // Peter Parker // Amazing Spider-Man — top-level keywords = [Reach, Vigilance, Transform]
    // but the back face has Web-slinging in its reminder/cost text.
    const text = 'web-slinging (you may cast this spell for {u} if you also return a tapped creature you control to its hand.)';
    expect(rule.matchCard!(mk({ keywords: ['Reach', 'Vigilance', 'Transform'], oracle: text }), text)).toBeTruthy();
  });

  it('does not match plain creatures', () => {
    expect(rule.matchCard!(mk({ keywords: ['Flying'] }), 'flying')).toBe(false);
  });

  it('does not match unrelated text mentioning "web"', () => {
    expect(rule.matchCard!(mk({ oracle: 'this creature gets +1/+1 for each web token' }), 'this creature gets +1/+1 for each web token')).toBe(false);
  });
});
