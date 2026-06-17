import { describe, it, expect, beforeAll } from 'vitest';
import type { Card, Face } from '../shared/types';
import { ensureWarmed } from './rules';
import { tagCards } from './tag';

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
    const [tagged] = tagCards([card]);
    const frontTag = tagged!.tags.find((t) => t.tagId === 'trigger.another_creature_etb');
    const backTag = tagged!.tags.find((t) => t.tagId === 'effect.has_offspring');
    expect(frontTag?.face).toBe('front');
    expect(backTag?.face).toBe('back');
  });

  it('matchCard-only keyword rule (Flying via keywords array + isIntrinsicKeyword) fires exactly once, no face field', () => {
    // Regression for the double-fire bug: effect.has_flying uses matchCard
    // (no text-regex match). With the fix, matchCard rules run once at card
    // level — no face attribution.
    //
    // Neither face's oracle text alone contains "Flying" on a keyword-block line;
    // the combined card.oracleText does. So the text-only per-face pass cannot
    // match, but matchCard (which reads card.oracleText directly) fires once.
    const front = makeFace('Grounded Walker', 'Whenever another creature enters the battlefield, draw a card.');
    const back = makeFace('Sky Soarer', 'Offspring {2}');
    const card: Card = {
      oracleId: 'fly1', name: 'Grounded Walker // Sky Soarer', set: 's', printings: ['s'],
      collectorNumber: '1', manaCost: '{1}', cmc: 1, colors: [], colorIdentity: [],
      typeLine: 'Creature', types: ['Creature'], subtypes: [], supertypes: [],
      // Combined oracle text includes Flying on its own keyword-block line.
      // (isIntrinsicKeyword reads card.oracleText; the Flying line is not in any face.)
      oracleText: 'Whenever another creature enters the battlefield, draw a card.\n\nFlying',
      keywords: ['Flying'],
      power: '1', toughness: '1', rarity: 'common', imageUrl: '',
      layout: 'transform', faces: [front, back], tags: [],
    };
    const [tagged] = tagCards([card]);
    const flyingTags = tagged!.tags.filter((t) => t.tagId === 'effect.has_flying');
    // Exactly one tag — no double-fire.
    expect(flyingTags).toHaveLength(1);
    // matchCard-only rules carry no face attribution (keywords are card-level).
    expect(flyingTags[0]?.face).toBeUndefined();
  });

  it('text-based rule matching on BOTH faces produces two tags (front + back)', () => {
    // When the same text-regex rule matches oracle text on BOTH faces, both
    // face-attributed CardTag entries must be preserved (I-4 fix).
    // Using effect.has_offspring (text-only match on "offspring {N}") which
    // has no matchCard fallback, guaranteeing text-only path.
    const front = makeFace('Offspring Front', 'Offspring {2}');
    const back = makeFace('Offspring Back', 'Offspring {3}');
    const card: Card = {
      oracleId: 'dualoff', name: 'Offspring Front // Offspring Back', set: 's', printings: ['s'],
      collectorNumber: '1', manaCost: '{1}', cmc: 1, colors: [], colorIdentity: [],
      typeLine: 'Creature', types: ['Creature'], subtypes: [], supertypes: [],
      oracleText: 'Offspring {2}\n\nOffspring {3}',
      keywords: [],  // no keyword array — text-only path
      power: '1', toughness: '1', rarity: 'common', imageUrl: '',
      layout: 'transform', faces: [front, back], tags: [],
    };
    const [tagged] = tagCards([card]);
    const offspringTags = tagged!.tags.filter((t) => t.tagId === 'effect.has_offspring');
    // Both text-based entries must survive dedup.
    expect(offspringTags).toHaveLength(2);
    const faces = offspringTags.map((t) => t.face).sort();
    expect(faces).toEqual(['back', 'front']);
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
    const [tagged] = tagCards([card]);
    const etbTag = tagged!.tags.find((t) => t.tagId === 'trigger.another_creature_etb');
    expect(etbTag).toBeDefined();
    expect(etbTag?.face).toBeUndefined();
  });

  it('cross-face grant: Treasure-creator on front does not forward effect.add_mana from back-face anthem grant', () => {
    // I-1 regression: allHostTagIds must be the UNION across all faces so the
    // Treasure guard fires even when effect.create_treasure is on a different
    // face from the grant being evaluated.
    //
    // Front: creates a Treasure token (fires effect.create_treasure on front).
    // Back:  anthem "creatures you control have 'tap: add {G}'" — the inner
    //        grant text would ordinarily forward effect.add_mana, but because
    //        effect.create_treasure is present on the card (front face) the
    //        forwarding must be suppressed.
    const front = makeFace('Treasure Maker', 'When this creature enters the battlefield, create a Treasure token.');
    const back = makeFace('Mana Anthem', 'Creatures you control have "tap: add {G}."');
    const card: Card = {
      oracleId: 'crossface1',
      name: 'Treasure Maker // Mana Anthem', set: 's', printings: ['s'],
      collectorNumber: '1', manaCost: '{2}{G}', cmc: 3, colors: ['G'], colorIdentity: ['G'],
      typeLine: 'Creature', types: ['Creature'], subtypes: [], supertypes: [],
      oracleText: 'When this creature enters the battlefield, create a Treasure token.\n\nCreatures you control have "tap: add {G}."',
      keywords: [],
      power: '2', toughness: '2', rarity: 'rare', imageUrl: '',
      layout: 'transform', faces: [front, back], tags: [],
    };
    const [tagged] = tagCards([card]);
    const addManaTags = tagged!.tags.filter((t) => t.tagId === 'effect.add_mana');
    expect(addManaTags).toHaveLength(0);
    // Confirm Treasure tag IS present (front face host tag).
    const treasureTags = tagged!.tags.filter((t) => t.tagId === 'effect.create_treasure');
    expect(treasureTags.length).toBeGreaterThan(0);
  });
});
