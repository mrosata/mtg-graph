// pipeline/rules/condition.cares_tokens.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'condition.cares_tokens',
  axis: 'condition',
  label: 'Cares about tokens',
  description: 'Triggers or scales off tokens you control or create.',
  pairsWith: [
    'effect.create_token',
    'effect.create_creature_token',
    'effect.create_treasure',
    'effect.create_food',
    'effect.create_clue',
  ],
};

const PATTERNS = [
  // "whenever ... create(s) a token" or "whenever ... token ... enters" — trigger workhorse.
  /\bwhenever [\w\s]+? (?:create(?:s|d)?\s+(?:a\s+|an\s+)?(?:[\w\-]+\s+)*token|token [\w\s]+? enters)\b/,
  // "for each [N|type] token(s) [you control]"
  /\bfor each (?:[\w\s\-]+? )?tokens? (?:you control )?/,
  // "tokens you control" — payoff group
  /\btokens? you control\b/,
  // "if you control N or more tokens"
  /\bif you control (?:[\d]+ or more |[\w\s\-]+ )?tokens?\b/,
  // v0.14.1 — replacement-effect "would be created" frame. Ojer Taq: "if one
  // or more creature tokens would be created under your control" triples the
  // tokens. Anker on "tokens would be created" — gating filler accepts noun
  // adjectives (creature, treasure, food, ...) plus quantifier prefix.
  /\bif (?:a|one or more) [\w\s]+? tokens? would be created\b/,
  // v0.14.9 — "sacrifice N tokens" activation-cost frame (Izoni, Center of
  // the Web). Tokens used as a paid resource is a token-payoff signal.
  /\bsacrifice (?:a|an|one|two|three|four|five|six|seven|x|\d+) tokens?\b/,
];

export const rule: Rule = {
  id: 'condition.cares_tokens',
  axis: 'condition',
  match: (t) => {
    for (const re of PATTERNS) {
      const m = t.match(re);
      if (m) return { evidence: m[0] };
    }
    return false;
  },
  nearMiss: { anchors: ['token', 'tokens'], proximity: ['create', 'control', 'sacrifice', 'each'], window: 8 },
};
