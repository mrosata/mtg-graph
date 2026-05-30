// Migration safety test for retiring `effect.has_evasion_intrinsic` in v0.14.0.
//
// Agent C's signoff condition: no card silently loses its evasion edge in the
// bump. The umbrella matched Flying, Menace, or Intimidate (intrinsic on a
// standalone keyword-block line). The replacement family covers Flying and
// Menace per-keyword (plus three other unrelated keywords). Intimidate is a
// legacy non-Standard keyword.
//
// This test reconstructs the old rule's behavior in-place against every card
// in the cached Scryfall set data, then asserts that every card the old rule
// would have matched is now matched by at least one of has_flying / has_menace.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { isIntrinsicKeyword } from './normalize';
import { rule as hasFlying } from './rules/effect.has_flying';
import { rule as hasMenace } from './rules/effect.has_menace';
import type { Card } from '../shared/types';

const CACHE_DIR = join(__dirname, '..', '.cache', 'scryfall');
const EVASION_KEYWORDS = ['Flying', 'Menace', 'Intimidate'];

function buildCardsFromCache(): Card[] {
  if (!existsSync(CACHE_DIR)) return [];
  const cards: Card[] = [];
  const seen = new Set<string>();
  for (const file of readdirSync(CACHE_DIR)) {
    if (!file.endsWith('.json') || file === 'big.json') continue;
    const data = JSON.parse(readFileSync(join(CACHE_DIR, file), 'utf-8'));
    const list = Array.isArray(data) ? data : (data.data ?? []);
    for (const raw of list) {
      if (!raw.oracle_id || seen.has(raw.oracle_id)) continue;
      seen.add(raw.oracle_id);
      const oracleText: string =
        raw.oracle_text ??
        (raw.card_faces ?? []).map((f: { oracle_text?: string }) => f.oracle_text ?? '').join('\n\n');
      cards.push({
        oracleId: raw.oracle_id,
        name: raw.name,
        set: raw.set,
        printings: [raw.set],
        collectorNumber: raw.collector_number,
        manaCost: raw.mana_cost ?? null,
        cmc: raw.cmc ?? 0,
        colors: raw.colors ?? [],
        colorIdentity: raw.color_identity ?? [],
        typeLine: raw.type_line ?? '',
        types: [],
        subtypes: [],
        supertypes: [],
        oracleText,
        keywords: raw.keywords ?? [],
        power: raw.power ?? null,
        toughness: raw.toughness ?? null,
        rarity: raw.rarity ?? 'common',
        imageUrl: '',
        tags: [],
      });
    }
  }
  return cards;
}

describe('has_evasion_intrinsic retirement migration', () => {
  const cards = buildCardsFromCache();

  // If the cache isn't populated this test should soft-skip rather than fail —
  // the file is also exercised by the broader rule:coverage migration table.
  const conditional = cards.length > 0 ? it : it.skip;

  conditional('every card the old umbrella would have matched is covered by has_flying or has_menace', () => {
    const oldMatched: string[] = [];
    const newMissed: string[] = [];
    for (const card of cards) {
      // Reconstruct the old `effect.has_evasion_intrinsic` matchCard.
      let oldHit = false;
      for (const kw of EVASION_KEYWORDS) {
        if (card.keywords.includes(kw) && isIntrinsicKeyword(card.oracleText, kw)) {
          oldHit = true;
          break;
        }
      }
      if (!oldHit) continue;
      oldMatched.push(card.name);
      const lower = card.oracleText.toLowerCase();
      const flyHit = hasFlying.matchCard!(card, lower);
      const menHit = hasMenace.matchCard!(card, lower);
      if (!flyHit && !menHit) newMissed.push(card.name);
    }
    // Intimidate-only cards (the legacy keyword, not in Standard) are the only
    // way a card lands here. We document that drop explicitly rather than
    // silently regressing.
    expect(newMissed, `cards previously tagged has_evasion_intrinsic but no longer tagged: ${newMissed.join(', ')}`).toEqual([]);
    expect(oldMatched.length).toBeGreaterThan(0);
  });
});
