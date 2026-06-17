// pipeline/tag.ts
//
// Per-card tagging logic extracted from pipeline/index.ts so tests can import
// the real implementation rather than maintaining a diverging replica.
//
// Exported:
//   isForwardable — forwarding filter for inner-grant tags
//   tagCards      — main tagging pass over a Card[]

import { normalizeOracleText, stripReminderText } from './normalize';
import { extractGrantedInnerTexts, normalizeInnerGrantText } from './grant-extraction';
import { applyRules } from './rules/runner';
import { getAllRules } from './rules';
import { getTagCatalog } from './catalog';
import { expandChildren } from './tag-expansion';
import type { Card, CardTag, TagDef } from '../shared/types';

// Forwarding filter for inner-grant tags. The host card grants its
// permanents the inner ability — we forward the inner's TRIGGER and
// EFFECT axes (minus intrinsic `has_*` keyword tags) so the host shows up
// as a source of those abilities in the graph. We do NOT forward:
//   - `effect.has_*` — intrinsic-keyword axes. "Creatures you control have
//     flying" doesn't make the source card fly.
//   - `condition.*` — gating/scaling axes describe what the GRANTED
//     permanent cares about, not what the source cares about.
//
// hostTagIds must be the UNION of all faces' host tag ids (card-wide), not
// just the single face being processed, so suppression rules (e.g. the
// Treasure-token mana-forwarding guard) work correctly even when the
// relevant tag lives on a different face.
export function isForwardable(tag: CardTag, hostTagIds: Set<string>): boolean {
  if (tag.tagId.startsWith('effect.has_')) return false;
  if (tag.axis === 'condition') return false;
  // Treasure tokens grant an intrinsic mana ability; the host card "creates"
  // those tokens but does not itself add mana / ramp. The host is already
  // tagged via effect.create_treasure on the create-token clause.
  if (
    (tag.tagId === 'effect.add_mana' || tag.tagId === 'effect.ramp_nonland') &&
    hostTagIds.has('effect.create_treasure')
  ) {
    return false;
  }
  return true;
}

export function tagCards(cards: Card[]): Card[] {
  const catalog = getTagCatalog();
  const rules = getAllRules();
  const tagDefById: Record<string, TagDef> = Object.fromEntries(
    catalog.map((d) => [d.tagId, d]),
  );
  return cards.map((c) => {
    const isLegendary = c.supertypes?.includes('Legendary') ?? false;

    if (c.faces && c.faces.length === 2) {
      // Phase 1: compute the host-tag ids for EACH face independently, then
      // union them into a card-wide set. This ensures isForwardable suppression
      // rules (e.g. the Treasure-mana guard) fire correctly even when the
      // suppressing tag lives on a DIFFERENT face from the grant being evaluated.
      const frontHostTags = applyRules(
        normalizeOracleText(c.faces[0]!.oracleText, c.faces[0]!.name, isLegendary),
        c, rules, { textOnly: true },
      );
      const backHostTags = applyRules(
        normalizeOracleText(c.faces[1]!.oracleText, c.faces[1]!.name, isLegendary),
        c, rules, { textOnly: true },
      );
      const cardLevelHostTags = applyRules('', c, rules, { matchCardOnly: true });

      const allHostTagIds = new Set<string>([
        ...frontHostTags.map((t) => t.tagId),
        ...backHostTags.map((t) => t.tagId),
        ...cardLevelHostTags.map((t) => t.tagId),
      ]);

      // Phase 2: for each face, extract grants and forward through isForwardable
      // using the card-wide union, then attribute with the face label.
      const runFaceWithGrants = (
        hostTags: CardTag[],
        rawText: string,
        faceName: string,
        faceLabel: 'front' | 'back',
      ): CardTag[] => {
        // Track which tags this face already emits (text-based) so we don't
        // add a granted copy of something the face already has directly.
        const faceTagIds = new Set(hostTags.map((t) => t.tagId));
        const grantedTags: CardTag[] = [];
        for (const inner of extractGrantedInnerTexts(stripReminderText(rawText))) {
          const innerNorm = normalizeInnerGrantText(inner);
          for (const innerTag of applyRules(innerNorm, c, rules, { textOnly: true })) {
            if (!isForwardable(innerTag, allHostTagIds)) continue;
            if (faceTagIds.has(innerTag.tagId)) continue;
            faceTagIds.add(innerTag.tagId);
            grantedTags.push({ ...innerTag, evidence: `granted: ${innerTag.evidence}` });
          }
        }
        return [...hostTags, ...grantedTags].map((t) => ({ ...t, face: faceLabel }));
      };

      const frontTagged = runFaceWithGrants(
        frontHostTags, c.faces[0]!.oracleText, c.faces[0]!.name, 'front',
      );
      const backTagged = runFaceWithGrants(
        backHostTags, c.faces[1]!.oracleText, c.faces[1]!.name, 'back',
      );

      // Dedup rules:
      //   - Text-emitted tags from BOTH faces with the same tagId → keep BOTH
      //     (they carry distinct face values — front vs back).
      //   - Card-level matchCard tags → include only if the tagId wasn't
      //     already emitted by any text run (face-attributed wins).
      //   - Card-level matchCard tags with no text counterpart → include as-is
      //     (no face attribute).
      //
      // Build a set of tagIds already covered by text runs first.
      const textTagIds = new Set<string>([
        ...frontTagged.map((t) => t.tagId),
        ...backTagged.map((t) => t.tagId),
      ]);

      const cardLevelOnly = cardLevelHostTags.filter((t) => !textTagIds.has(t.tagId));

      const collected = [...frontTagged, ...backTagged, ...cardLevelOnly];
      const tags = expandChildren(collected, tagDefById);
      return { ...c, tags };
    }

    // Single-face path: no face attribution.
    const normalized = normalizeOracleText(c.oracleText, c.name, isLegendary);
    const hostTags = applyRules(normalized, c, rules);
    const hostTagIds = new Set(hostTags.map((t) => t.tagId));
    const grantedTags: CardTag[] = [];
    for (const inner of extractGrantedInnerTexts(stripReminderText(c.oracleText))) {
      const innerNorm = normalizeInnerGrantText(inner);
      for (const innerTag of applyRules(innerNorm, c, rules)) {
        if (!isForwardable(innerTag, hostTagIds)) continue;
        if (hostTagIds.has(innerTag.tagId)) continue;
        hostTagIds.add(innerTag.tagId);
        grantedTags.push({ ...innerTag, evidence: `granted: ${innerTag.evidence}` });
      }
    }
    const collected = [...hostTags, ...grantedTags];
    const tags = expandChildren(collected, tagDefById);
    return { ...c, tags };
  });
}
