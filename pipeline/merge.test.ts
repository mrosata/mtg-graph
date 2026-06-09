import { describe, it, expect } from 'vitest';
import { mergeCardsAcrossSets } from './merge';
import type { Card } from '../shared/types';

function card(oracleId: string, set: string, opts: { cn?: string; mtgoId?: number } = {}): Card {
  const collectorNumber = opts.cn ?? '1';
  const detail: { set: string; collectorNumber: string; mtgoId?: number } = { set, collectorNumber };
  if (opts.mtgoId !== undefined) detail.mtgoId = opts.mtgoId;
  return {
    oracleId, name: oracleId, set, printings: [set], collectorNumber,
    manaCost: null, cmc: 0, colors: [], colorIdentity: [],
    typeLine: '', types: [], subtypes: [], supertypes: [],
    oracleText: '', keywords: [], power: null, toughness: null,
    rarity: 'common', imageUrl: '', printingDetails: [detail], tags: [],
  };
}

describe('mergeCardsAcrossSets', () => {
  it('keeps a single card unchanged', () => {
    const out = mergeCardsAcrossSets([card('a', 'blb')]);
    expect(out).toHaveLength(1);
    expect(out[0]!.printings).toEqual(['blb']);
  });

  it('merges duplicate oracleId entries, accumulating printings', () => {
    const out = mergeCardsAcrossSets([card('a', 'blb'), card('a', 'fdn')]);
    expect(out).toHaveLength(1);
    expect(out[0]!.printings).toEqual(['blb', 'fdn']);
  });

  it('preserves first-seen primary set + image data', () => {
    const out = mergeCardsAcrossSets([card('a', 'blb'), card('a', 'fdn')]);
    expect(out[0]!.set).toBe('blb');
  });

  it('deduplicates printings within the merged list', () => {
    const out = mergeCardsAcrossSets([card('a', 'blb'), card('a', 'blb')]);
    expect(out[0]!.printings).toEqual(['blb']);
  });

  it('does not mutate input cards', () => {
    const a1 = card('a', 'blb');
    const a2 = card('a', 'fdn');
    mergeCardsAcrossSets([a1, a2]);
    expect(a1.printings).toEqual(['blb']);
    expect(a2.printings).toEqual(['fdn']);
  });

  it('accumulates per-printing details across sets, preserving mtgoId per printing', () => {
    const out = mergeCardsAcrossSets([
      card('a', 'blb', { cn: '1', mtgoId: 129247 }),
      card('a', 'eoe', { cn: '6', mtgoId: 142625 }),
      card('a', 'fdn', { cn: '138', mtgoId: 133302 }),
    ]);
    expect(out[0]!.printingDetails).toEqual([
      { set: 'blb', collectorNumber: '1', mtgoId: 129247 },
      { set: 'eoe', collectorNumber: '6', mtgoId: 142625 },
      { set: 'fdn', collectorNumber: '138', mtgoId: 133302 },
    ]);
  });

  it('deduplicates printing details on (set, collectorNumber)', () => {
    const out = mergeCardsAcrossSets([
      card('a', 'blb', { cn: '1', mtgoId: 129247 }),
      card('a', 'blb', { cn: '1', mtgoId: 129247 }),
    ]);
    expect(out[0]!.printingDetails).toHaveLength(1);
  });

  it('preserves printedName/flavorName from the first-seen printing across merge', () => {
    const first: Card = { ...card('a', 'om1'), printedName: 'Kavaero, Mind-Bitten' };
    const second = card('a', 'fdn');
    const out = mergeCardsAcrossSets([first, second]);
    expect(out).toHaveLength(1);
    expect(out[0]!.printedName).toBe('Kavaero, Mind-Bitten');
    expect(out[0]!.printings).toEqual(['om1', 'fdn']);
  });

  it('fills in printedName from a later printing when the first-seen lacks one', () => {
    // Real-world case: `spm` (Marvel-flavor name, no printed_name) ships before
    // `om1` (same canonical name, with the Magic-flavor `printed_name`). The
    // merged card must end up with the om1 printedName so importers can find
    // it via the Magic-flavor name.
    const first = card('a', 'spm');
    const second: Card = { ...card('a', 'om1'), printedName: 'Kavaero, Mind-Bitten' };
    const out = mergeCardsAcrossSets([first, second]);
    expect(out[0]!.printedName).toBe('Kavaero, Mind-Bitten');
  });

  it('fills in flavorName from a later printing when the first-seen lacks one', () => {
    const first = card('a', 'blb');
    const second: Card = { ...card('a', 'xxx'), flavorName: 'Godzilla, King of Monsters' };
    const out = mergeCardsAcrossSets([first, second]);
    expect(out[0]!.flavorName).toBe('Godzilla, King of Monsters');
  });

  it('keeps printingDetails when a later printing has no mtgoId (paper-only)', () => {
    const out = mergeCardsAcrossSets([
      card('a', 'blb', { cn: '1', mtgoId: 129247 }),
      card('a', 'tle', { cn: '162' }),
    ]);
    expect(out[0]!.printingDetails).toEqual([
      { set: 'blb', collectorNumber: '1', mtgoId: 129247 },
      { set: 'tle', collectorNumber: '162' },
    ]);
  });
});
