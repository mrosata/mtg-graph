// pipeline/rules/effect.has_prepared.test.ts
import { describe, it, expect } from 'vitest';
import { rule } from './effect.has_prepared';
import type { Card } from '../../shared/types';

function card(opts: { keywords: string[]; name?: string; oracleText?: string; typeLine?: string }): Card {
  return {
    oracleId: 'x',
    name: opts.name ?? 'Test Front // Test Back',
    set: 's',
    printings: ['s'],
    collectorNumber: '1',
    manaCost: null,
    cmc: 0,
    colors: [],
    colorIdentity: [],
    typeLine: opts.typeLine ?? 'Creature — Wizard // Sorcery',
    types: ['Creature'],
    subtypes: [],
    supertypes: [],
    oracleText: opts.oracleText ?? '',
    keywords: opts.keywords,
    power: null,
    toughness: null,
    rarity: 'common',
    imageUrl: '',
    tags: [],
  };
}

describe('effect.has_prepared', () => {
  // v0.35.0 — Batch 9: matches require Prepared keyword AND either an MFC
  // name (`//`) or self-signal oracle text ("this creature enters/becomes
  // prepared"). The MFC name is the canonical Prepared frame (back-face is
  // the spell side); the text-side guard handles potential single-faced
  // Prepared cards.
  it.each([
    [{ keywords: ['Prepared'], name: 'Front // Back' }],
    [{ keywords: ['Flying', 'Prepared'], name: 'Front // Back' }],
    [{ keywords: ['First strike', 'Prepared'], name: 'Front // Back' }],
    // Self-signal via oracle text (single-faced hypothetical)
    [{ keywords: ['Prepared'], name: 'Solo Card', oracleText: 'this creature enters prepared.' }],
    [{ keywords: ['Prepared'], name: 'Solo Card', oracleText: 'this creature becomes prepared.' }],
  ])('matches cards with Prepared keyword + self-signal: %j', (opts) => {
    expect(rule.matchCard!(card(opts), opts.oracleText ?? '')).toBeTruthy();
  });

  it.each([
    [{ keywords: ['Flying'], name: 'Front // Back' }],
    [{ keywords: ['Adventure'], name: 'Front // Back' }],
    [{ keywords: ['Plot'], name: 'Front // Back' }],
    [{ keywords: [], name: 'Front // Back' }],
  ])('does not match cards without Prepared keyword: %j', (opts) => {
    expect(rule.matchCard!(card(opts), '')).toBe(false);
  });

  // v0.35.0 — Batch 9: FP narrows. Skycoach Waypoint is a Land that GRANTS
  // Prepared to a target creature; Biblioplex Tomekeeper is an artifact
  // creature that grants the toggle. Neither becomes Prepared itself, so
  // the self-keyword axis shouldn't fire.
  it.each([
    [{
      keywords: ['Prepared'],
      name: 'Skycoach Waypoint',
      typeLine: 'Land',
      oracleText: '{t}: add {c}. {3}, {t}: target creature becomes prepared.',
    }],
    [{
      keywords: ['Prepared'],
      name: 'Biblioplex Tomekeeper',
      typeLine: 'Artifact Creature — Construct',
      oracleText: 'when this creature enters, choose up to one — • target creature becomes prepared. • target creature becomes unprepared.',
    }],
  ])('does not match non-MFC cards that only GRANT Prepared: %j', (opts) => {
    expect(rule.matchCard!(card(opts), opts.oracleText ?? '')).toBe(false);
  });

  it('returns Prepared as evidence', () => {
    const result = rule.matchCard!(card({ keywords: ['Prepared'], name: 'Front // Back' }), '');
    expect(result).toMatchObject({ evidence: 'Prepared' });
  });
});
