// pipeline/e2e.test.ts
import { describe, it, expect } from 'vitest';
import { applyRules } from './rules/runner';
import { getAllRules } from './rules';
import { getTagCatalog, RULE_VERSION } from './catalog';
import { buildEdges } from './graph';
import { normalizeOracleText } from './normalize';
import { expandChildren } from './tag-expansion';
import { stripScryfallCard } from './fetch';
import fixture from './fixtures/scryfall-tdm-sample.json' with { type: 'json' };
import type { Artifact } from '../shared/types';

const tagDefById = Object.fromEntries(getTagCatalog().map((d) => [d.tagId, d]));

describe('pipeline end-to-end (fixture)', () => {
  it('produces a stable artifact from the fixture set', () => {
    const rules = getAllRules();
    const catalog = getTagCatalog();
    const cards = fixture.data
      .map((raw: any) => stripScryfallCard(raw))
      .map((c) => ({ ...c, tags: expandChildren(applyRules(normalizeOracleText(c.oracleText, c.name), c, rules), tagDefById) }));
    const edges = buildEdges(cards, catalog);

    // assertions against known shapes
    const tokenMaker = cards.find((c) => c.name === 'Token Maker')!;
    const tokenMakerTagIds = tokenMaker.tags.map((t) => t.tagId);
    expect(tokenMakerTagIds).toContain('effect.create_token');
    expect(tokenMakerTagIds).toContain('effect.create_creature_token');

    const etbWatcher = cards.find((c) => c.name === 'ETB Watcher')!;
    expect(etbWatcher.tags.map((t) => t.tagId)).toContain('trigger.another_creature_etb');

    const reanimator = cards.find((c) => c.name === 'Reanimator')!;
    expect(reanimator.tags.map((t) => t.tagId)).toContain('effect.reanimate');

    const deathTriggerer = cards.find((c) => c.name === 'Death Triggerer')!;
    expect(deathTriggerer.tags.map((t) => t.tagId)).toContain('trigger.creature_dies');

    // edges: Token Maker → ETB Watcher (effect.create_creature_token → trigger.another_creature_etb)
    const tokenToWatcher = edges.find(
      (e) => e.source === tokenMaker.oracleId && e.target === etbWatcher.oracleId,
    );
    expect(tokenToWatcher).toBeDefined();
    expect(tokenToWatcher!.reason.sourceTagId).toBe('effect.create_creature_token');
    expect(tokenToWatcher!.reason.targetTagId).toBe('trigger.another_creature_etb');

    // shape sanity: serializable
    expect(() => JSON.stringify({ cards, edges, tagCatalog: catalog, generatedAt: 'frozen', sourceSet: 'tdm', sourceSets: ['tdm'], ruleVersion: RULE_VERSION } satisfies Artifact))
      .not.toThrow();
  });

  describe('typed permanent tags', () => {
    it('Disenchant does not produce an edge to a creature-LTB trigger', () => {
      const rules = getAllRules();
      const catalog = getTagCatalog();
      const cards = fixture.data
        .map((raw: any) => stripScryfallCard(raw))
        .map((c) => ({ ...c, tags: expandChildren(applyRules(normalizeOracleText(c.oracleText, c.name), c, rules), tagDefById) }));
      const edges = buildEdges(cards, catalog);
      const fromDisenchant = edges.filter((e) => e.source === 'fixture-disenchant');
      const creatureLtbTargets = fromDisenchant.filter(
        (e) => e.target === 'fixture-creature-ltb',
      );
      expect(creatureLtbTargets, 'Disenchant must not pair with a creature-LTB trigger').toEqual([]);
    });

    it('Vindicate pairs with both the broad and the creature-LTB triggers', () => {
      const rules = getAllRules();
      const catalog = getTagCatalog();
      const cards = fixture.data
        .map((raw: any) => stripScryfallCard(raw))
        .map((c) => ({ ...c, tags: expandChildren(applyRules(normalizeOracleText(c.oracleText, c.name), c, rules), tagDefById) }));
      const edges = buildEdges(cards, catalog);
      const fromVindicate = edges.filter((e) => e.source === 'fixture-vindicate');
      const targets = new Set(fromVindicate.map((e) => e.target));
      expect(targets.has('fixture-broad-ltb')).toBe(true);
      expect(targets.has('fixture-creature-ltb')).toBe(true);
    });
  });
});
