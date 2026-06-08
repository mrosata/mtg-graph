// pipeline/rules/effect.exile_from_graveyard.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.exile_from_graveyard',
  axis: 'effect',
  label: 'Exiles from graveyard',
  description: 'Produces an effect that removes cards from a graveyard by exiling them. Excludes self-exile activation costs (Renew-style).',
  pairsWith: ['trigger.creature_leaves_graveyard'],
};

// Three-arm match:
//  1. Targeted removal from a foreign or generic graveyard. The negative
//     lookahead excludes the cost form "exile __self__ from a graveyard:" if
//     any card ever uses that templating (rare; existing forms are "your").
//  2. From "your graveyard" only when the object is qualified with `target` —
//     real effects say "exile target [card type] from your graveyard"; cost
//     forms say "exile this card / a card / N cards from your graveyard:".
//  3. Mass wipe of opponents' graveyards (e.g. Soul-Guide Lantern's sac ability).
// "an opponent's graveyard" (indefinite-article exile-an-opponent's) added
// alongside `target opponent's` for cards like Lord Skitter, Sewer King
// ("exile up to one target card from an opponent's graveyard").
// "a single graveyard" / "target player's graveyard" added for Digsite
// Conservator ("exile up to four target cards from a single graveyard").
// v0.14.38 — filler tightened from `.+?` to `[^.]+?` so the match can't span
// across sentence terminators. Aven Interrupter's "exile target spell. it
// becomes plotted. spells your opponents cast from graveyards or from exile
// cost {2} more to cast." used to FP because the greedy filler walked past
// two periods to reach `from graveyards` in an unrelated tax clause; the
// card actually touches the stack, not any graveyard.
// v0.39.0 — 200-card audit Ship 12a — Augusta, Order Returned: "each
// player exiles a card from their graveyard" uses `their` as the source
// possessive and `exiles` (third-person singular) as the verb form (forced
// edict on the player). Add `their ` to the source slot AND admit
// `exiles?` so the edict form fires alongside the imperative form.
const FOREIGN_OR_GENERIC = /exiles? [^.]+? from (?:a |a single |an opponent's |target opponent's |target player's |their )?graveyard(?!s*\s*[:—])|exiles? [^.]+? from graveyards/;
const OWN_TARGETED = /exile (?:up to [\w-]+ |any number of )?target [^.]+? from your graveyard/;
// "Exile one or more X cards from your graveyard" — variable-scope exile that
// scales a subsequent effect by cards exiled. Excludes cost forms (colon/em-dash
// terminator) via negative lookahead. Filler `[^:.—]+?` forbids colons,
// periods, and em-dashes so we don't span across activation separators —
// e.g. Fabrication Foundry's "exile one or more other artifacts you control
// with total mana value x: return target artifact card with mana value x or
// less from your graveyard" used to FP because the greedy `.+?` ate the
// colon.
const OWN_QUANTIFIED = /exile one or more [^:.—]+? from your graveyard(?!s*\s*[:—])/;
// Bulk single-graveyard exile ("exile target player's graveyard" — Sentinel
// of Lost Lore) joins the plural mass-wipe form on this arm.
// v0.15 — "exile all graveyards" / "exile each graveyard" added (Rest in
// Peace's ETB). Broadest possible graveyard-exile — every card in every
// graveyard at once.
const MASS_WIPE = /exile (?:all|each|each opponent's|target (?:opponent|player)'s) graveyards?/;

// 2026-06-01 audit batch — Strategic Betrayal: "target opponent exiles a
// creature they control and their graveyard". The whole-graveyard wipe
// uses bare `their graveyard` because the opponent antecedent is in scope
// from `target opponent exiles`. The forced-edict-via-exile is in
// effect.exile_creature; this arm handles the graveyard half.
const OPPONENT_FORCED_GRAVEYARD = /\btarget opponent exiles\b[^.]*?\btheir graveyards?\b/;
// v0.14.22 — "exile target X card IN a graveyard" — modern templating
// (Reenact the Crime). Semantically the same as "from a graveyard": the
// graveyard is the source zone, and the targeted card is what's exiled.
// Requires the `card` noun before "in a graveyard" so we don't FP on
// passive references like "cards in your graveyard" or "tokens in a
// graveyard".
const IN_GRAVEYARD = /exile (?:up to [\w-]+ |any number of )?target [^.]{0,60}? card in (?:a |an |the |your |any )?graveyard\b/;
// v0.20.0 — Abhorrent Oculus: "exile six cards from your graveyard" as an
// additional cost to cast a spell. Numeric-count additional-cost graveyard
// exile (1+ cards, fixed N). The negative lookahead `(?!\s*[:—])` preserves
// Renew-style cost suppression (those use a colon/em-dash terminator).
const OWN_NUMBER_QUANTIFIED = /\bexile (?:\d+|two|three|four|five|six|seven|eight|nine|ten) cards? from your graveyard(?!\s*[:—])/;

// 2026-06-01 audit batch — Tersa Lightshatter: "exile a card at random from
// your graveyard" — the "at random" infix breaks the FOREIGN_OR_GENERIC
// match (which doesn't admit "your" graveyard) AND doesn't fit
// OWN_NUMBER_QUANTIFIED (count is "a", not numeric). Triggered effects with
// a controller-graveyard exile (not a cost) are the same axis as the
// targeted/numbered forms. The negative lookahead `(?!\s*[:—])` preserves
// Renew-style cost suppression.
const OWN_AT_RANDOM = /\bexile (?:a|an|that)\s+(?:[\w\-]+\s+){0,3}?card\s+at\s+random\s+from\s+your\s+graveyard(?!\s*[:—])/;

// v0.35.0 Batch 7 — non-self cost activation arm. "{T}, exile a card from
// your graveyard: <effect>" / "{1}{B}, exile an instant or sorcery card
// from your graveyard: <effect>" (Rubble Rouser, Postmortem Professor,
// Lluwen). Indefinite/definite determiner alternation `(a|an|one|that)`
// keeps Renew-style self-exile excluded (Renew uses `__self__`, not these
// determiners). The `(?=\s*:)` positive lookahead distinguishes the cost
// form from passive references.
const COST_NONSELF = /\bexile\s+(?:a|an|one|that)\s+(?:[\w\-]+\s+){0,3}?cards?\s+from\s+your\s+graveyard(?=\s*:)/;
// v0.35.0 Batch 7 — optional/conditional non-cost arm. "You may exile a
// card from your graveyard. if you do, …" (Heated Argument). Standalone
// sentence-ending exile in a may-clause; not a cost (no colon/em-dash)
// and not the `from your graveyard to <zone>` reanimation frame.
const OPTIONAL_NONSELF = /\b(?:you\s+may\s+)?exile\s+(?:a|an|one|that)\s+(?:[\w\-]+\s+){0,3}?cards?\s+from\s+your\s+graveyard(?!\s*(?:[:—]|to))/;

// v0.23 — anaphoric "exile that card / that creature / those cards" from
// your graveyard (Containment Construct, Currency Converter — "you may exile
// that card from your graveyard"). The colon/em-dash exclusion preserves
// Renew-style cost suppression. Bare `it`/`them` excluded to avoid FP on
// flicker tails; `that card` requires an explicit antecedent in a prior clause.
const OWN_ANAPHORIC = /\bexile (?:that card|that creature|those cards) from your graveyard(?!s*\s*[:—])/;

// 2026-06-01 audit Group 13 — Ancient Vendetta: multi-zone search-and-exile
// "search <X>'s graveyard, ... and library for ... cards ... and exile
// them". The search lists the graveyard as a source zone; the matched cards
// are exiled. Distinct from tutor-and-exile (library-only) which is owned
// by effect.exile_from_library — both rules SHOULD fire on multi-zone
// searches that include graveyard.
const SEARCH_GRAVEYARD_EXILE = /\bsearch [^.]*?\bgraveyard\b[^.]*?\bexile\s+(?:them|it|that card|those cards)\b/;

export const rule: Rule = {
  id: 'effect.exile_from_graveyard',
  axis: 'effect',
  match: (t) => {
    const m =
      t.match(FOREIGN_OR_GENERIC) ??
      t.match(OWN_TARGETED) ??
      t.match(OWN_QUANTIFIED) ??
      t.match(MASS_WIPE) ??
      t.match(IN_GRAVEYARD) ??
      t.match(OWN_NUMBER_QUANTIFIED) ??
      t.match(OWN_ANAPHORIC) ??
      t.match(SEARCH_GRAVEYARD_EXILE) ??
      t.match(OWN_AT_RANDOM) ??
      t.match(COST_NONSELF) ??
      t.match(OPTIONAL_NONSELF) ??
      t.match(OPPONENT_FORCED_GRAVEYARD);
    return m ? { evidence: m[0] } : false;
  },
};
