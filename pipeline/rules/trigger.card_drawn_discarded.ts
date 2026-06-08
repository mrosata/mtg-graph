// pipeline/rules/trigger.card_drawn_discarded.ts
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'trigger.card_drawn_discarded',
  axis: 'trigger',
  label: 'Triggers on draw or discard',
  description: 'Triggers when a card is drawn or discarded.',
  pairsWith: ['effect.draws_or_discards'],
};

export const rule: Rule = {
  id: 'trigger.card_drawn_discarded',
  axis: 'trigger',
  match: (t) => {
    // "whenever" — repeating trigger (the standard form).
    // "when … this way" — single-fire trigger nested inside another ability,
    // e.g. Talion's Messenger ("When you discard a card this way, put a +1/+1
    // counter …"). The "this way" anchor is what distinguishes it from open-
    // ended "when" phrasings that aren't actual triggers.
    //
    // v0.12.9: accept an optional card-type qualifier between "a" and "card"
    // ("a land card", "a creature card", "a noncreature card" — Aclazotz,
    // Deepest Betrayal // Temple of the Dead's typed-discard trigger and the
    // mirror typed-draw triggers).
    // v0.13.4: accept "one or more (TYPE )?cards?" — Inti, Seneschal of the
    // Sun ("whenever you discard one or more cards") and similar batched
    // draw/discard triggers.
    const TYPE = '(?:land|creature|noncreature|nonland|artifact|enchantment|planeswalker|instant|sorcery)';
    // v0.15 — plural "one or more players" subject added (Hostile
    // Investigator: "Whenever one or more players discard one or more cards,
    // investigate"). Global discard/draw observer across all players.
    // v0.39.0 — 200-card audit Ship 12e — Archfiend of Ifnir. "Whenever
    // you cycle or discard another card" — `cycle` is a discard-as-cost
    // keyword that pays a discard but isn't literally `discard`. Admit
    // `cycles?` in the verb slot alongside `draws?`/`discards?`. Also
    // admit `another` determiner alongside `a`.
    const m = t.match(
      new RegExp(
        `whenever (?:you|an opponent|a player|one or more players) (?:draws?|discards?|cycles?|draw|discard|cycle|cycle or discard|cycles? or discards?) (?:(?:a|another) (?:${TYPE} )?card|one or more (?:${TYPE} )?cards?|(?:your|their) (?:first|second|third|fourth|fifth) card)|when (?:you|an opponent|a player) (?:draws?|discards?|cycles?) (?:a|another) (?:${TYPE} )?card this way`,
      ),
    );
    return m ? { evidence: m[0] } : false;
  },
};
