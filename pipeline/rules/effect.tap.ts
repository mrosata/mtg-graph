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
const PATTERN = /(?<!(?:if|whenever)\s+you\s+)\btap (?!this |__self__)(?!(?:one|two|three|four|five|six|seven|eight|nine|ten|\d+|a|an) untapped)(?:up to (?:one|two|three|four|five|six|seven|eight|nine|ten|\d+) |(?:one|two|three) or (?:two|three|four) )?(?:target )?(?:[\w\-]+ ){0,3}(?:creature|permanent|artifact|land|enchantment)s?\b/;

export const rule: Rule = {
  id: 'effect.tap',
  axis: 'effect',
  match: (t) => {
    const m = t.match(PATTERN);
    if (!m || m.index === undefined) return false;
    // Cost-vs-effect gate: in normalized text, oracle abilities have the
    // shape "cost: effect" and the cost can include convoke-style
    // "tap N untapped permanents you control". If a colon appears in the
    // local window AFTER the match BEFORE the next sentence terminator,
    // the match is on the cost side — skip it. effect.tap is for soft
    // control/removal, never for activation costs that tap your own stuff.
    const tail = t.slice(m.index + m[0].length);
    const terminator = tail.search(/[.\n]/);
    const colon = tail.search(/:/);
    if (colon !== -1 && (terminator === -1 || colon < terminator)) return false;
    return { evidence: m[0] };
  },
  nearMiss: { anchors: ['tap'], proximity: ['creature', 'permanent', 'target'], window: 6 },
};
