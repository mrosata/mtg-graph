// pipeline/rules/effect.has_plot.ts
//
// Plot keyword — exile the card from hand, cast it later as a sorcery without
// paying the mana cost. Marked `category: 'theme'` because there is currently
// no "Plot matters" payoff in Standard — wire up `pairsWith` when one appears.
//
// v0.14.38 — must require BOTH the `keywords` array entry AND a printed
// `plot {<mana>}` line in the oracle text. Scryfall populates the keywords
// array with "Plot" on any card that *uses* the plot action (grants
// `plotted` status to another card), including pure plot-enablers that
// don't have a printed Plot cost themselves (Kellan Joins Up, Lilah
// Undefeated Slickshot, Make Your Own Luck, Aven Interrupter). Trusting
// the keywords array alone conflates "is plottable" with "interacts with
// plot" — they're different axes for graph purposes.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.has_plot',
  axis: 'effect',
  label: 'Has plot',
  description: 'Has the Plot keyword — may be exiled from hand for an alternate cost and cast as a sorcery on a later turn.',
  pairsWith: [],
  category: 'theme',
};

// `\bplot\s+\{` matches the printed Plot cost line (`Plot {3}{U}`). The
// post-normalize text is lowercased, so anchoring on lowercase `plot` is
// safe. Any mana symbol inside the braces qualifies — we don't constrain
// the symbol class because every printed Plot cost uses standard mana.
const PRINTED_PLOT_COST = /\bplot\s+\{/;

export const rule: Rule = {
  id: 'effect.has_plot',
  axis: 'effect',
  matchCard: (card, normalizedText) => {
    if (!card.keywords.includes('Plot')) return false;
    if (!PRINTED_PLOT_COST.test(normalizedText)) return false;
    return { evidence: 'Plot' };
  },
};
