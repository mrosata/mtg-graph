import type { Card } from '../../shared/types';
import type { NearMissSpec, Rule } from '../rules/types';
import { isTaggable } from '../coverage';
import { normalizeOracleText } from '../normalize';

export function hasNearMiss(normalized: string, spec: NearMissSpec): boolean {
  const tokens = normalized.split(/\s+/);
  const anchorSet = new Set(spec.anchors.map((a) => a.toLowerCase()));
  const proxSet = new Set(spec.proximity.map((p) => p.toLowerCase()));
  const isAnchor = (t: string) => [...anchorSet].some((a) => t.includes(a));
  const isProx = (t: string) => [...proxSet].some((p) => t.includes(p));
  const anchorIdx: number[] = [];
  const proxIdx: number[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i] ?? '';
    if (isAnchor(tok)) anchorIdx.push(i);
    if (isProx(tok)) proxIdx.push(i);
  }
  for (const a of anchorIdx) {
    for (const p of proxIdx) {
      if (Math.abs(a - p) <= spec.window) return true;
    }
  }
  return false;
}

export type RuleCoverage = {
  ruleId: string;
  matches: number;
  matchSample: Array<{ oracleId: string; name: string; evidence: string }>;
  nearMissSample: Array<{ oracleId: string; name: string }>;
  taggablePct: number;
  naivePct: number;
};

// Deterministic shuffle via splitmix-style mixing. `seed` actually changes order
// (the original `(i+1) * 2654435761 ^ seed` was XOR with a small int, which only
// flipped the low bits and never changed the sort).
function pickRandom<T>(arr: T[], n: number, seed: number): T[] {
  return [...arr]
    .map((v, i) => {
      let x = (i + 1) * 2654435761;
      x = (x ^ (seed * 2246822519)) >>> 0;
      x = (x ^ (x >>> 13)) * 3266489917;
      return { v, k: x >>> 0 };
    })
    .sort((a, b) => a.k - b.k)
    .slice(0, n)
    .map((x) => x.v);
}

export function buildRuleCoverage(cards: Card[], rule: Rule, seed = 1): RuleCoverage {
  const positives: Array<{ oracleId: string; name: string; evidence: string }> = [];
  for (const c of cards) {
    const normalized = normalizeOracleText(c.oracleText, c.name);
    const textResult = rule.match ? rule.match(normalized) : false;
    const cardResult = !textResult && rule.matchCard ? rule.matchCard(c, normalized) : false;
    const m = textResult || cardResult;
    if (m) {
      positives.push({
        oracleId: c.oracleId,
        name: c.name,
        evidence: typeof m === 'object' ? m.evidence : '',
      });
    }
  }
  const total = cards.length;
  const taggable = cards.filter(isTaggable).length;
  const matchSample = pickRandom(positives, 10, seed);
  let nearMissSample: Array<{ oracleId: string; name: string }> = [];
  if (rule.nearMiss) {
    const matchedIds = new Set(positives.map((p) => p.oracleId));
    const candidates: Array<{ oracleId: string; name: string }> = [];
    for (const c of cards) {
      if (matchedIds.has(c.oracleId)) continue;
      const normalized = normalizeOracleText(c.oracleText, c.name);
      if (hasNearMiss(normalized, rule.nearMiss)) {
        candidates.push({ oracleId: c.oracleId, name: c.name });
      }
    }
    nearMissSample = pickRandom(candidates, 20, seed + 1);
  }
  return {
    ruleId: rule.id,
    matches: positives.length,
    matchSample,
    nearMissSample,
    taggablePct: (positives.length / taggable) * 100,
    naivePct: (positives.length / total) * 100,
  };
}
