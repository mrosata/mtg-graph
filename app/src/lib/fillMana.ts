import type { Card, Color } from '@shared/types';
import type { Deck } from './db';
import { colorPipDistribution } from './deckStats';

const WUBRG: readonly Color[] = ['W', 'U', 'B', 'R', 'G'];

const SUBTYPE_FOR_COLOR: Record<Color, string> = {
  W: 'Plains',
  U: 'Island',
  B: 'Swamp',
  R: 'Mountain',
  G: 'Forest',
};

export type FillPlan = {
  add: { oracleId: string; count: number }[];
  remove: { oracleId: string; count: number }[];
  inferredTarget: 40 | 60;
  basicsByColor: Partial<Record<Color, number>>;
  reason?: 'empty' | 'no_colored_spells';
};

export type FillOpts = {
  targetOverride?: 40 | 60;
};

export function getBasicOracleId(color: Color, cards: Map<string, Card>): string | undefined {
  const subtype = SUBTYPE_FOR_COLOR[color];
  for (const card of cards.values()) {
    if (
      card.types.includes('Land') &&
      card.supertypes.includes('Basic') &&
      card.subtypes.includes(subtype)
    ) {
      return card.oracleId;
    }
  }
  return undefined;
}

export function computeLandFill(
  deck: Deck,
  cards: Map<string, Card>,
  opts: FillOpts = {},
): FillPlan {
  const totalCards = deck.workingCards.reduce((s, c) => s + c.count, 0);
  if (totalCards === 0) {
    return {
      add: [], remove: [],
      inferredTarget: 40, basicsByColor: {},
      reason: 'empty',
    };
  }

  const pips = colorPipDistribution(deck, cards);
  const totalPips = (Object.values(pips) as number[]).reduce((s, p) => s + p, 0);

  // Splash threshold: drop any color contributing < 15% of total pips.
  const SPLASH_THRESHOLD = 0.15;
  const filteredPips: Record<Color, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  for (const col of WUBRG) {
    if (totalPips > 0 && pips[col] / totalPips >= SPLASH_THRESHOLD) {
      filteredPips[col] = pips[col];
    }
  }
  const filteredTotalPips = (Object.values(filteredPips) as number[]).reduce((s, p) => s + p, 0);

  // Detect target now so we have it in the early-return.
  const spellCount = deck.workingCards.reduce((s, entry) => {
    const card = cards.get(entry.oracleId);
    if (!card) return s;
    if (card.types.includes('Land')) return s;
    return s + entry.count;
  }, 0);
  const inferredTarget: 40 | 60 = opts.targetOverride ?? (spellCount <= 23 ? 40 : 60);

  // No colored spells (either no pips at all, or all colors are below splash threshold).
  if (totalPips === 0 || filteredTotalPips === 0) {
    return {
      add: [], remove: [],
      inferredTarget, basicsByColor: {},
      reason: 'no_colored_spells',
    };
  }

  const baseLandCount = inferredTarget === 40 ? 17 : 24;

  // Curve adjustment: heavier decks want more lands, lighter decks fewer.
  let totalCmc = 0;
  let totalSpellCount = 0;
  for (const entry of deck.workingCards) {
    const c = cards.get(entry.oracleId);
    if (!c) continue;
    if (c.types.includes('Land')) continue;
    totalCmc += c.cmc * entry.count;
    totalSpellCount += entry.count;
  }
  const avgCmc = totalSpellCount > 0 ? totalCmc / totalSpellCount : 0;
  let adjustedBaseLandCount = baseLandCount;
  if (avgCmc > 3.5) adjustedBaseLandCount += 1;
  else if (avgCmc < 2.5 && totalSpellCount > 0) adjustedBaseLandCount -= 1;

  // Existing non-basic land contributions (currently used for both
  // accounting and distribution adjustment).
  let nonBasicLandCount = 0;
  const existingLandContrib: Record<Color, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  for (const entry of deck.workingCards) {
    const c = cards.get(entry.oracleId);
    if (!c) continue;
    if (!c.types.includes('Land')) continue;
    if (c.supertypes.includes('Basic')) continue;
    nonBasicLandCount += entry.count;
    for (const col of c.colorIdentity) {
      existingLandContrib[col] += entry.count;
    }
  }
  const basicsNeeded = Math.max(0, adjustedBaseLandCount - nonBasicLandCount);

  // Desired pip share per color, minus non-basic contributions.
  const desiredPips: Record<Color, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  for (const col of WUBRG) {
    const share = (filteredPips[col] / filteredTotalPips) * adjustedBaseLandCount - existingLandContrib[col];
    desiredPips[col] = Math.max(0, share);
  }

  // Largest-remainder rounding.
  const basicsByColor = largestRemainder(desiredPips, basicsNeeded);

  // Diff against current basics.
  const currentBasicsByColor: Record<Color, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  const currentBasicOracleByColor: Partial<Record<Color, string>> = {};
  for (const entry of deck.workingCards) {
    const c = cards.get(entry.oracleId);
    if (!c) continue;
    if (!c.types.includes('Land')) continue;
    if (!c.supertypes.includes('Basic')) continue;
    for (const col of WUBRG) {
      if (c.subtypes.includes(SUBTYPE_FOR_COLOR[col])) {
        currentBasicsByColor[col] += entry.count;
        currentBasicOracleByColor[col] = entry.oracleId;
        break;
      }
    }
  }

  const add: { oracleId: string; count: number }[] = [];
  const remove: { oracleId: string; count: number }[] = [];
  const finalByColor: Partial<Record<Color, number>> = {};
  for (const col of WUBRG) {
    const want = basicsByColor[col] ?? 0;
    const have = currentBasicsByColor[col];
    if (want > 0) finalByColor[col] = want;
    if (want > have) {
      const oracleId = currentBasicOracleByColor[col] ?? getBasicOracleId(col, cards);
      if (oracleId) add.push({ oracleId, count: want - have });
    } else if (want < have) {
      const oracleId = currentBasicOracleByColor[col];
      if (oracleId) remove.push({ oracleId, count: have - want });
    }
  }

  return { add, remove, inferredTarget, basicsByColor: finalByColor };
}

function largestRemainder(weights: Record<Color, number>, total: number): Partial<Record<Color, number>> {
  const result: Partial<Record<Color, number>> = {};
  if (total <= 0) return result;
  const sumW = (Object.values(weights) as number[]).reduce((s, w) => s + w, 0);
  if (sumW <= 0) return result;
  const floats: { color: Color; raw: number; floor: number; remainder: number }[] = [];
  let allocated = 0;
  for (const c of WUBRG) {
    const raw = (weights[c] / sumW) * total;
    const floor = Math.floor(raw);
    floats.push({ color: c, raw, floor, remainder: raw - floor });
    allocated += floor;
  }
  let remaining = total - allocated;
  floats.sort((a, b) => b.remainder - a.remainder);
  for (const f of floats) {
    let count = f.floor;
    if (remaining > 0 && f.remainder > 0) {
      count += 1;
      remaining -= 1;
    }
    if (count > 0) result[f.color] = count;
  }
  return result;
}

export { WUBRG, SUBTYPE_FOR_COLOR };
