// pipeline/rules/runner.test.ts
import { describe, it, expect } from 'vitest';
import { applyRules } from './runner';
import type { Rule } from './types';
import type { Card } from '../../shared/types';

const stubEtb: Rule = {
  id: 'trigger.creature_etb',
  axis: 'trigger',
  match: (text) => text.includes('whenever a creature enters'),
};

const stubToken: Rule = {
  id: 'effect.create_token',
  axis: 'effect',
  match: (text) => {
    const m = text.match(/create a [^.]*token/);
    return m ? { evidence: m[0], metadata: { matched: true } } : false;
  },
};

const stubFlyer: Rule = {
  id: 'effect.has_flying',
  axis: 'effect',
  matchCard: (c) => c.keywords.includes('Flying') ? { evidence: 'Flying' } : false,
};

function makeCard(over: Partial<Card> = {}): Card {
  return {
    oracleId: 'x', name: 'X', set: 's', printings: ['s'], collectorNumber: '1',
    manaCost: null, cmc: 0, colors: [], colorIdentity: [], typeLine: 'Creature',
    types: ['Creature'], subtypes: [], supertypes: [], oracleText: '',
    keywords: [], power: null, toughness: null, rarity: 'common', imageUrl: '',
    tags: [], ...over,
  };
}

describe('applyRules', () => {
  it('returns tags for every rule that matches', () => {
    const tags = applyRules(
      'whenever a creature enters, create a 1/1 token.',
      makeCard(),
      [stubEtb, stubToken],
    );
    expect(tags).toHaveLength(2);
    expect(tags.map((t) => t.tagId)).toEqual([
      'trigger.creature_etb',
      'effect.create_token',
    ]);
  });

  it('captures TagMatch metadata when a rule returns an object', () => {
    const tags = applyRules('create a 1/1 token.', makeCard(), [stubToken]);
    expect(tags[0]?.evidence).toBe('create a 1/1 token');
    expect(tags[0]?.metadata).toEqual({ matched: true });
  });

  it('returns empty array when no rule matches', () => {
    const tags = applyRules('do nothing useful.', makeCard(), [stubEtb, stubToken]);
    expect(tags).toEqual([]);
  });

  it('fires matchCard-only rules from structured card fields', () => {
    const tags = applyRules('', makeCard({ keywords: ['Flying'] }), [stubFlyer]);
    expect(tags).toHaveLength(1);
    expect(tags[0]?.tagId).toBe('effect.has_flying');
    expect(tags[0]?.evidence).toBe('Flying');
  });

  it('does not fire matchCard rule when keyword is absent', () => {
    const tags = applyRules('', makeCard({ keywords: ['Trample'] }), [stubFlyer]);
    expect(tags).toEqual([]);
  });
});
