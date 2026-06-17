import { describe, it, expect, beforeAll } from 'vitest';
import type { Card, Face } from '../shared/types';
import { ensureWarmed } from './rules';
import { getAllRules } from './rules';
import { getTagCatalog } from './catalog';
import { normalizeOracleText, stripReminderText } from './normalize';
import { extractGrantedInnerTexts, normalizeInnerGrantText } from './grant-extraction';
import { applyRules } from './rules/runner';
import { expandChildren } from './tag-expansion';

// Mirror tagCards() from pipeline/index.ts. We re-implement here because
// the production tagCards is an internal helper; this test instead asserts
// the FACE attribution shape that tagCards must produce.

function makeFace(name: string, oracleText: string): Face {
  return { name, typeLine: 'Creature — X', types: ['Creature'], subtypes: ['X'], supertypes: [],
    oracleText, manaCost: '{1}', colors: [], power: '1', toughness: '1' };
}

beforeAll(async () => { await ensureWarmed(); });

describe('per-face tag attribution', () => {
  it('tags from front-face oracle text get face=front', () => {
    // Use purely text-based rules (match: only, no matchCard) so each tag fires
    // only on the face whose oracle text contains the pattern.
    // Front: trigger.another_creature_etb fires on "whenever another creature enters".
    // Back:  effect.has_offspring fires on "offspring {2}".
    const front = makeFace('Front', 'Whenever another creature enters the battlefield, draw a card.');
    const back = makeFace('Back', 'Offspring {2}');
    const card: Card = {
      oracleId: 'f1', name: 'Front // Back', set: 's', printings: ['s'],
      collectorNumber: '1', manaCost: '{1}', cmc: 1, colors: [], colorIdentity: [],
      typeLine: 'Creature', types: ['Creature'], subtypes: [], supertypes: [],
      oracleText: 'Whenever another creature enters the battlefield, draw a card.\n\nOffspring {2}',
      keywords: [],
      power: '1', toughness: '1', rarity: 'common', imageUrl: '',
      layout: 'transform', faces: [front, back], tags: [],
    };
    const tagged = tagCardsForTest(card);
    const frontTag = tagged.tags.find((t) => t.tagId === 'trigger.another_creature_etb');
    const backTag = tagged.tags.find((t) => t.tagId === 'effect.has_offspring');
    expect(frontTag?.face).toBe('front');
    expect(backTag?.face).toBe('back');
  });

  it('matchCard-only keyword rule fires exactly once for DFC with keyword on back face (no duplicate, no face field)', () => {
    // Regression for the double-fire bug: effect.has_flying uses matchCard
    // (no text-regex match). With the old code, it fired on BOTH per-face
    // applyRules calls, producing two CardTags for the same tagId.
    // With the fix, matchCard rules run once at card level — no face attribution.
    // Flying appears in the back face's oracle text and Scryfall's keywords array.
    const front = makeFace('Grounded Walker', 'Whenever another creature enters the battlefield, draw a card.');
    const back = makeFace('Sky Soarer', 'Flying');
    const card: Card = {
      oracleId: 'fly1', name: 'Grounded Walker // Sky Soarer', set: 's', printings: ['s'],
      collectorNumber: '1', manaCost: '{1}', cmc: 1, colors: [], colorIdentity: [],
      typeLine: 'Creature', types: ['Creature'], subtypes: [], supertypes: [],
      // Combined oracle text includes Flying on its own keyword-block line.
      oracleText: 'Whenever another creature enters the battlefield, draw a card.\n\nFlying',
      keywords: ['Flying'],
      power: '1', toughness: '1', rarity: 'common', imageUrl: '',
      layout: 'transform', faces: [front, back], tags: [],
    };
    const tagged = tagCardsForTest(card);
    const flyingTags = tagged.tags.filter((t) => t.tagId === 'effect.has_flying');
    // Exactly one tag — no double-fire.
    expect(flyingTags).toHaveLength(1);
    // matchCard-only rules carry no face attribution (keywords are card-level).
    expect(flyingTags[0]?.face).toBeUndefined();
  });

  it('single-face cards do not get a face field', () => {
    const card: Card = {
      oracleId: 'p1', name: 'Plain', set: 's', printings: ['s'],
      collectorNumber: '1', manaCost: '{1}', cmc: 1, colors: [], colorIdentity: [],
      typeLine: 'Creature — X', types: ['Creature'], subtypes: ['X'], supertypes: [],
      oracleText: 'Whenever another creature enters the battlefield, draw a card.',
      keywords: [],
      power: '1', toughness: '1', rarity: 'common', imageUrl: '',
      layout: 'normal', tags: [],
    };
    const tagged = tagCardsForTest(card);
    const etbTag = tagged.tags.find((t) => t.tagId === 'trigger.another_creature_etb');
    expect(etbTag).toBeDefined();
    expect(etbTag?.face).toBeUndefined();
  });
});

// Inline replica of the per-face tagging pipeline; kept tight on purpose so
// the test surfaces shape changes loudly. Lift to a shared helper later if
// other tests need it.
function tagCardsForTest(c: Card): Card {
  const catalog = getTagCatalog();
  const rules = getAllRules();
  const tagDefById = Object.fromEntries(catalog.map((d) => [d.tagId, d]));
  const isLegendary = c.supertypes?.includes('Legendary') ?? false;

  const runFace = (text: string, name: string, face: 'front' | 'back' | undefined, textOnly?: boolean) => {
    const normalized = normalizeOracleText(text, name, isLegendary);
    const hostTags = applyRules(normalized, c, rules, textOnly ? { textOnly: true } : undefined);
    const hostTagIds = new Set(hostTags.map((t) => t.tagId));
    const grantedTags = [];
    for (const inner of extractGrantedInnerTexts(stripReminderText(text))) {
      const innerNorm = normalizeInnerGrantText(inner);
      for (const innerTag of applyRules(innerNorm, c, rules, textOnly ? { textOnly: true } : undefined)) {
        if (hostTagIds.has(innerTag.tagId)) continue;
        hostTagIds.add(innerTag.tagId);
        grantedTags.push({ ...innerTag, evidence: `granted: ${innerTag.evidence}` });
      }
    }
    return [...hostTags, ...grantedTags].map((t) => face ? { ...t, face } : t);
  };

  let all;
  if (c.faces && c.faces.length === 2) {
    // Text-based rules per face; matchCard rules once at card level (no face).
    const frontTags = runFace(c.faces[0]!.oracleText, c.faces[0]!.name, 'front', true);
    const backTags = runFace(c.faces[1]!.oracleText, c.faces[1]!.name, 'back', true);
    const cardLevelTags = applyRules('', c, rules, { matchCardOnly: true });
    // Dedup: text-attributed (face-bearing) tags win over card-level no-face tags.
    const byTagId = new Map<string, import('../shared/types').CardTag>();
    for (const t of [...frontTags, ...backTags]) {
      if (!byTagId.has(t.tagId)) byTagId.set(t.tagId, t);
    }
    for (const t of cardLevelTags) {
      if (!byTagId.has(t.tagId)) byTagId.set(t.tagId, t);
    }
    all = [...byTagId.values()];
  } else {
    all = runFace(c.oracleText, c.name, undefined);
  }
  const tags = expandChildren(all, tagDefById);
  return { ...c, tags };
}
