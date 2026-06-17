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
import facesFixture from './fixtures/scryfall-faces-sample.json' with { type: 'json' };
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
    expect(tokenToWatcher!.sourceTagId).toBe('effect.create_creature_token');
    expect(tokenToWatcher!.targetTagId).toBe('trigger.another_creature_etb');

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

  it('multi-face fixture cards round-trip layout and faces through tagging', () => {
    const rules = getAllRules();
    const cards = (facesFixture as any).data.map((raw: any) => stripScryfallCard(raw));
    expect(cards.find((c: any) => c.layout === 'modal_dfc')).toBeDefined();
    expect(cards.find((c: any) => c.layout === 'transform')).toBeDefined();
    expect(cards.find((c: any) => c.layout === 'meld')).toBeDefined();
    expect(cards.find((c: any) => c.layout === 'split')).toBeDefined();
    expect(cards.find((c: any) => c.layout === 'adventure')).toBeDefined();

    const werewolf = cards.find((c: any) => c.oracleId === 'fixture-werewolf')!;
    // Per-face tagging: text-based rules per face, then card-level matchCard rules.
    // Front face has no flying; back face does. Dedup prefers face-attributed tags
    // when both exist, so effect.has_flying (matchCard-only) shows face='back' for
    // the back face's oracle text, and no face for card-level keywords.
    const frontFaceNorm = normalizeOracleText(werewolf.faces![0]!.oracleText, werewolf.faces![0]!.name);
    const backFaceNorm = normalizeOracleText(werewolf.faces![1]!.oracleText, werewolf.faces![1]!.name);

    const frontFaceTags = applyRules(frontFaceNorm, werewolf, rules, { textOnly: true })
      .map((t) => ({ ...t, face: 'front' as const }));
    const backFaceTags = applyRules(backFaceNorm, werewolf, rules, { textOnly: true })
      .map((t) => ({ ...t, face: 'back' as const }));
    const cardLevelTags = applyRules('', werewolf, rules, { matchCardOnly: true });

    // Expand children and dedup: face-attributed tags win over card-level no-face tags.
    const expandedFrontBack = expandChildren([...frontFaceTags, ...backFaceTags], tagDefById);
    const byTagId = new Map<string, (typeof expandedFrontBack)[0]>();
    for (const t of expandedFrontBack) {
      if (!byTagId.has(t.tagId)) byTagId.set(t.tagId, t);
    }
    const expandedCardLevel = expandChildren(cardLevelTags, tagDefById);
    for (const t of expandedCardLevel) {
      if (!byTagId.has(t.tagId)) byTagId.set(t.tagId, t);
    }

    const tagged = {
      ...werewolf,
      tags: [...byTagId.values()],
    };
    // effect.has_flying is a matchCard rule that matches Flying keyword.
    // The werewolf has Flying in its keywords, so it fires at card level (no face).
    // This test documents that matchCard-only keyword rules don't get per-face attribution.
    const flying = tagged.tags.find((t) => t.tagId === 'effect.has_flying');
    expect(flying).toBeDefined();
    expect(flying?.face).toBeUndefined();
  });
});
