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
const FOREIGN_OR_GENERIC = /exile .+? from (?:a |a single |an opponent's |target opponent's |target player's )?graveyard(?!s*\s*[:—])|exile .+? from graveyards/;
const OWN_TARGETED = /exile (?:up to [\w-]+ |any number of )?target .+? from your graveyard/;
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
const MASS_WIPE = /exile (?:each opponent's|target (?:opponent|player)'s) graveyard/;
// v0.14.22 — "exile target X card IN a graveyard" — modern templating
// (Reenact the Crime). Semantically the same as "from a graveyard": the
// graveyard is the source zone, and the targeted card is what's exiled.
// Requires the `card` noun before "in a graveyard" so we don't FP on
// passive references like "cards in your graveyard" or "tokens in a
// graveyard".
const IN_GRAVEYARD = /exile (?:up to [\w-]+ |any number of )?target [^.]{0,60}? card in (?:a |an |the |your |any )?graveyard\b/;

export const rule: Rule = {
  id: 'effect.exile_from_graveyard',
  axis: 'effect',
  match: (t) => {
    const m = t.match(FOREIGN_OR_GENERIC) ?? t.match(OWN_TARGETED) ?? t.match(OWN_QUANTIFIED) ?? t.match(MASS_WIPE) ?? t.match(IN_GRAVEYARD);
    return m ? { evidence: m[0] } : false;
  },
};
