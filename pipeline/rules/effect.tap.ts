// pipeline/rules/effect.tap.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.tap',
  axis: 'effect',
  label: 'Taps a permanent',
  description: 'Taps a target permanent (soft control / removal effect).',
  pairsWith: ['trigger.tapped_or_untapped'],
};

// Match "tap [up to N] [target] [adjectives] (creature|permanent|artifact|land|enchantment)[s]".
// The leading `\btap ` requires "tap" as a free-standing verb followed by a
// space — this excludes the tap symbol "{t}:" (no space after `t`) and the
// adjective "tapped" (different word). The body deliberately requires a
// permanent-typed noun (creature/permanent/artifact/land/enchantment) so we
// don't capture spurious uses of "tap" in non-effect contexts.
//
// Negative lookahead `(?!this |__self__)` excludes self-tap drawback frames
// ("tap this creature", "tap __self__") — those are costs or replacement
// effects on the card itself, not soft-control on another permanent.
// Negative lookbehind `(?<!(?:if|whenever)\s+you\s+)` excludes conditional
// player-action clauses like "if you tap a basic land for mana, it produces
// 3x mana instead" (Virtue of Strength) and "whenever you tap a land" —
// these are modifiers on the player's tap action, not imperative tap effects.
// Negative lookahead `(?!(?:one|two|...|\d+|a|an|N) untapped)` excludes
// convoke-style "tap N untapped X (and/or Y) you control" — that's an
// additional cost or activation cost, NOT a soft-control tap effect.
// Legitimate "tap target untapped creature" uses target *before* untapped,
// which is still allowed because the lookahead only fires on bare-count.
// Cards: Guardian of the Great Door, Caparocti Sunborn, Fear of Exposure.
//
// v0.33+ — noun slot broadened to admit creature subtypes (Meanders Guide:
// "tap another untapped Merfolk you control"). The trailing `you control`
// constraint or `target` quantifier prevents false positives on generic
// tribal references.
const PATTERN = /(?<!(?:if|whenever)\s+you\s+)\btap (?!this |__self__)(?!(?:one|two|three|four|five|six|seven|eight|nine|ten|\d+|a|an) untapped)(?:up to (?:one|two|three|four|five|six|seven|eight|nine|ten|\d+) |(?:one|two|three) or (?:two|three|four) )?(?:target )?(?:[\w\-]+ ){0,3}(?:creature|permanent|artifact|land|enchantment|[\w\-]+s?)\b/;

// Anaphoric "Tap it / Tap them / Tap that creature" after a target picker.
// Vengeful Villagers: "choose target creature an opponent controls. Tap it,".
const PATTERN_ANAPHORIC = /\btarget (?:[\w\-]+\s+){0,4}(?:creature|permanent|artifact)s?[^.]{0,80}?\.\s*tap (?:it|them|that creature|that permanent)\b/;

function isCostGated(t: string, m: RegExpMatchArray): boolean {
  if (m.index === undefined) return false;
  const tail = t.slice(m.index + m[0].length);
  const terminator = tail.search(/[.\n]/);
  const colon = tail.search(/:/);
  return colon !== -1 && (terminator === -1 || colon < terminator);
}

export const rule: Rule = {
  id: 'effect.tap',
  axis: 'effect',
  match: (t) => {
    // Anaphoric path first — "tap it" after a target picker.
    const ana = t.match(PATTERN_ANAPHORIC);
    if (ana && ana.index !== undefined) return { evidence: ana[0] };

    const m = t.match(PATTERN);
    if (!m || m.index === undefined) return false;
    // Cost-vs-effect gate: in normalized text, oracle abilities have the
    // shape "cost: effect" and the cost can include convoke-style
    // "tap N untapped permanents you control". If a colon appears in the
    // local window AFTER the match BEFORE the next sentence terminator,
    // the match is on the cost side — skip it. effect.tap is for soft
    // control/removal, never for activation costs that tap your own stuff.
    //
    // v0.33+ — if the first match is cost-gated (e.g. Wanderbrine:
    // "Tap, ...: Tap target creature an opponent controls."), retry against
    // the post-colon segment so a legitimate effect-side tap on the right
    // of the colon is still tagged.
    if (isCostGated(t, m)) {
      const tail = t.slice(m.index + m[0].length);
      const colonIdx = tail.indexOf(':');
      if (colonIdx === -1) return false;
      const postColon = tail.slice(colonIdx + 1);
      const m2 = postColon.match(PATTERN);
      if (!m2 || m2.index === undefined) return false;
      if (isCostGated(postColon, m2)) return false;
      return { evidence: m2[0] };
    }
    return { evidence: m[0] };
  },
  nearMiss: { anchors: ['tap'], proximity: ['creature', 'permanent', 'target'], window: 6 },
};
