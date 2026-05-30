import { describe, it, expect } from 'vitest';
import { aggregateRules, aggregateTagDefs, collectModule } from './aggregator';

describe('aggregateRules', () => {
  it('collects all rules from rule files', async () => {
    const rules = await aggregateRules();
    const ids = new Set(rules.map((r) => r.id));
    expect(ids.has('effect.bounce_or_blink')).toBe(true);
    expect(ids.has('trigger.creature_dies')).toBe(true);
  });

  it('includes parametric rules expanded from THEME_SUBTYPES', async () => {
    const rules = await aggregateRules();
    const ids = new Set(rules.map((r) => r.id));
    expect(ids.has('effect.tutors_subtype.shrine')).toBe(true);
    expect(ids.has('condition.cares_subtype.aura')).toBe(true);
  });

  it('returns rules in stable sorted order', async () => {
    const a = (await aggregateRules()).map((r) => r.id);
    const b = (await aggregateRules()).map((r) => r.id);
    expect(a).toEqual(b);
    expect(a).toEqual([...a].sort());
  });
});

describe('aggregateTagDefs', () => {
  it('every rule has a matching tagDef', async () => {
    const rules = await aggregateRules();
    const defs = await aggregateTagDefs();
    const defIds = new Set(defs.map((d) => d.tagId));
    for (const r of rules) {
      expect(defIds.has(r.id), `rule ${r.id} missing tagDef`).toBe(true);
    }
  });
});

describe('collectModule', () => {
  it('throws when a module has no rule and no tagDef', () => {
    expect(() => collectModule('effect.broken.ts', {}, [], [])).toThrow(
      /effect\.broken\.ts.*neither 'rule'\/'rules' nor 'tagDef'\/'tagDefs'/,
    );
  });

  it('throws when a module has empty rules array and empty tagDefs array', () => {
    expect(() =>
      collectModule('effect.empty.ts', { rules: [], tagDefs: [] }, [], []),
    ).toThrow(/effect\.empty\.ts/);
  });

  it('accepts a module with only a rule (no tagDef yet)', () => {
    const rules: Parameters<typeof collectModule>[2] = [];
    const tagDefs: Parameters<typeof collectModule>[3] = [];
    collectModule(
      'effect.x.ts',
      { rule: { id: 'effect.x', axis: 'effect', match: () => false } },
      rules,
      tagDefs,
    );
    expect(rules).toHaveLength(1);
    expect(tagDefs).toHaveLength(0);
  });
});
