// pipeline/graph.ts
import type { Card, InteractionEdge, TagDef } from '../shared/types';
import { hasTagId } from '../shared/types';

const TRIBE_PREFIX = 'condition.cares_tribe.';

// Triggers whose semantic is "another <permanent> enters/dies/attacks" — when
// the same card also carries a cares_tribe condition, the trigger is narrowed
// to that tribe (e.g. Obyra: "whenever another Faerie enters"). The gate below
// filters edges from token producers down to tribe-matching ones. Non-token
// source effects (reanimate, bounce, sacrifice, damage) fall through because
// we have no subtype signal on what they touch.
const GATED_BY_TRIBE_TRIGGERS = new Set<string>([
  'trigger.another_creature_etb',
  'trigger.creature_dies',
]);

// Note: passing an empty `required` array with mode='any' returns false
// (no tag can satisfy an empty alternatives list). To express "no extra
// constraint," omit requiresOnSource/requiresOnTarget rather than setting
// them to [].
function satisfies(
  tagSet: Set<string> | undefined,
  required: string[],
  mode: 'any' | 'all',
): boolean {
  if (!tagSet) return false;
  if (mode === 'all') return required.every((id) => tagSet.has(id));
  return required.some((id) => tagSet.has(id));
}

export function buildEdges(cards: Card[], catalog: TagDef[]): InteractionEdge[] {
  const tagDefById = new Map(catalog.map((t) => [t.tagId, t]));
  const edges: InteractionEdge[] = [];
  const seen = new Set<string>();

  // Index cards by every tag they have, regardless of axis. In the same pass,
  // collect the union of creature types each card's `effect.create_creature_token`
  // tags declare, so the tribe-edge gate below is O(1) per (source, target) pair
  // instead of re-scanning source.tags. Also collect each card's "narrowings"
  // (tribes it references via condition.cares_tribe.*) so the gated-trigger
  // check below can intersect them against the source's token types.
  const cardsByTag = new Map<string, Set<string>>();
  const tribesByOracleId = new Map<string, Set<string>>();
  const narrowingsByOracleId = new Map<string, Set<string>>();
  const tagSetByOracleId = new Map<string, Set<string>>();
  for (const c of cards) {
    let cardTags = tagSetByOracleId.get(c.oracleId);
    if (!cardTags) tagSetByOracleId.set(c.oracleId, (cardTags = new Set()));
    for (const t of c.tags) {
      cardTags.add(t.tagId);
      let s = cardsByTag.get(t.tagId);
      if (!s) cardsByTag.set(t.tagId, (s = new Set()));
      s.add(c.oracleId);
      if (hasTagId(t, 'effect.create_creature_token')) {
        const types = t.metadata?.creatureTypes;
        if (types && types.length) {
          let tribes = tribesByOracleId.get(c.oracleId);
          if (!tribes) tribesByOracleId.set(c.oracleId, (tribes = new Set()));
          for (const ty of types) tribes.add(ty);
        }
      }
      if (t.tagId.startsWith(TRIBE_PREFIX)) {
        let n = narrowingsByOracleId.get(c.oracleId);
        if (!n) narrowingsByOracleId.set(c.oracleId, (n = new Set()));
        n.add(t.tagId.slice(TRIBE_PREFIX.length));
      }
    }
  }

  type NormalizedPairing = {
    effectId: string;
    consumerId: string;
    requiresOnSource?: string[];
    requiresOnTarget?: string[];
    requiresMode: 'any' | 'all';
  };
  // Collect every pairing, normalized so the effect is always the source. A
  // single (effectId, consumerId) pair may be declared on both sides of the
  // edge (once on the effect rule's pairsWith, once on the consumer's). When
  // that happens, the first-seen gated entry wins over a bare-string entry on
  // the same pair — a gate on either side is honored. If both sides happen to
  // declare conflicting gates, first-seen wins; that case isn't expected and
  // the catalog consistency test does not catch it.
  const byPair = new Map<string, NormalizedPairing>();
  for (const tag of catalog) {
    for (const entry of tag.pairsWith) {
      const partnerId = typeof entry === 'string' ? entry : entry.tagId;
      const partner = tagDefById.get(partnerId);
      if (!partner) continue;
      const effectId = tag.axis === 'effect' ? tag.tagId : partnerId;
      const consumerId = tag.axis === 'effect' ? partnerId : tag.tagId;
      if (tagDefById.get(effectId)?.axis !== 'effect') continue;
      const reqSrc = typeof entry === 'object' ? entry.requiresOnSource : undefined;
      const reqTgt = typeof entry === 'object' ? entry.requiresOnTarget : undefined;
      const mode: 'any' | 'all' =
        (typeof entry === 'object' && entry.requiresMode) || 'any';
      const key = `${effectId}|${consumerId}`;
      const existing = byPair.get(key);
      const hasReqs = !!(reqSrc || reqTgt);
      const existingHasReqs = !!(existing?.requiresOnSource || existing?.requiresOnTarget);
      if (!existing || (hasReqs && !existingHasReqs)) {
        byPair.set(key, { effectId, consumerId, requiresOnSource: reqSrc, requiresOnTarget: reqTgt, requiresMode: mode });
      }
    }
  }
  const pairings: NormalizedPairing[] = Array.from(byPair.values());

  for (const { effectId, consumerId, requiresOnSource, requiresOnTarget, requiresMode } of pairings) {
    const sources = cardsByTag.get(effectId);
    const targets = cardsByTag.get(consumerId);
    if (!sources || !targets) continue;
    for (const source of sources) {
      for (const target of targets) {
        if (source === target) continue;
        // Tribe-edge gate: condition.cares_tribe.X edges only form when the
        // source's effect.create_creature_token tag declares the matching
        // creature type in metadata.creatureTypes.
        if (consumerId.startsWith(TRIBE_PREFIX)) {
          const tribe = consumerId.slice(TRIBE_PREFIX.length);
          const sourceTribes = tribesByOracleId.get(source);
          if (!sourceTribes || !sourceTribes.has(tribe)) continue;
        }
        // Gated-trigger gate: when the consumer is a generic creature-ETB-style
        // trigger AND the target also carries cares_tribe narrowings, the
        // trigger is tribe-scoped (Obyra Dreaming Duelist etc.). Require the
        // source's token creature types to intersect those narrowings — but
        // only when the source actually declares token tribes. Non-token
        // sources fall through; we don't know which subtype they'd touch.
        if (GATED_BY_TRIBE_TRIGGERS.has(consumerId)) {
          const narrowings = narrowingsByOracleId.get(target);
          const sourceTribes = tribesByOracleId.get(source);
          if (narrowings && narrowings.size > 0 && sourceTribes) {
            let hit = false;
            for (const tribe of narrowings) {
              if (sourceTribes.has(tribe)) { hit = true; break; }
            }
            if (!hit) continue;
          }
        }
        if (requiresOnSource && !satisfies(tagSetByOracleId.get(source), requiresOnSource, requiresMode)) continue;
        if (requiresOnTarget && !satisfies(tagSetByOracleId.get(target), requiresOnTarget, requiresMode)) continue;
        const key = `${source}|${target}|${effectId}|${consumerId}`;
        if (seen.has(key)) continue;
        seen.add(key);
        edges.push({
          source,
          target,
          reason: {
            sourceTagId: effectId,
            targetTagId: consumerId,
            direction: 'source_produces_for_target',
          },
        });
      }
    }
  }

  return edges;
}
