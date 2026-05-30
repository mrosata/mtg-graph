import { describe, it, expect } from 'vitest';
import { ngrams, topNgrams } from './mine';

describe('ngrams', () => {
  it('produces 2-grams', () => {
    expect(ngrams('add one mana to your pool', 2, new Set())).toEqual([
      'add one', 'one mana', 'mana to', 'to your', 'your pool',
    ]);
  });
  it('filters stopword-bordered ngrams', () => {
    const stop = new Set(['the', 'a']);
    expect(ngrams('the red card', 2, stop)).toEqual(['red card']);
  });
});

describe('topNgrams', () => {
  it('counts and sorts by frequency descending', () => {
    const out = topNgrams(['add one mana', 'add one mana', 'mill three cards'], 2, new Set(), 1);
    expect(out[0]).toEqual({ ngram: 'add one', count: 2 });
  });
});
