// pipeline/rules/effect.tuck_to_library.ts
//
// "Tuck" — soft-bounce removal that puts a card on the top or bottom of a
// library rather than into hand (bounce_creature) or graveyard (mill). Three
// frames in modern oracle text:
//   (A) Owner-of-target X puts it on (their choice of the) top|bottom of
//       their library — Horned Loch-Whale's Lagoon Breach, Memory-Lapse style.
//   (B) Put target X from a graveyard on (top|bottom) of (its owner's) library
//       — Tomb Trawler, Hoverstone Pilgrim, Malevolent Chandelier.
//   (C) Put target creature/permanent on (top|bottom) of (its owner's) library
//       — direct battlefield-to-library tuck (The Spot's Portal).
//
// Explicitly excludes "put the rest on the bottom of your library" patterns
// from scry/dig effects (cards never left the library zone).
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.tuck_to_library',
  axis: 'effect',
  label: 'Tucks to library',
  description: 'Puts a card from the battlefield or graveyard onto the top or bottom of a library — soft-bounce removal distinct from bounce_to_hand and mill.',
  pairsWith: [],
};

// "(the )?top or bottom" handles the compound form ("their choice of the top
// or bottom"), and plain "(the )?(top|bottom)" handles single-direction tucks.
const TOP_OR_BOTTOM = '(?:(?:the )?top or bottom|(?:the )?(?:top|bottom))';
const LIBRARY_OWNER = '(?:its owner\'s|the owner\'s|your|target opponent\'s|their)';
// Frame D ownership phrases — excludes plain "your library" (would catch self-shuffles).
const LIBRARY_OWNER_D = "(?:their|its owner[''\\u2019]?s)";

export const rule: Rule = {
  id: 'effect.tuck_to_library',
  axis: 'effect',
  match: (t) => {
    const re = new RegExp(
      // Frame A: "the owner of target X puts it on (their choice of the)? top|bottom of (their|its owner's) library"
      `\\b(?:the )?owner of target [^.]+? puts? (?:it|them) on (?:their|its) (?:choice of ${TOP_OR_BOTTOM}|${TOP_OR_BOTTOM}) of (?:their|its owner's|your|the owner's) library\\b`
      // v0.14.1 — Frame A2: possessive form "target X's owner puts it on ...".
      // Unlucky Drop.
      + `|\\btarget [^.]+?'s owner puts? (?:it|them) on (?:their|its) (?:choice of ${TOP_OR_BOTTOM}|${TOP_OR_BOTTOM}) of (?:their|its owner's|your|the owner's) library\\b`
      // Frame B: "put target X from a graveyard on top|bottom of <library>"
      + `|\\bput target [^.]+? from (?:a |your |target opponent's |target player's )?graveyard on ${TOP_OR_BOTTOM} of ${LIBRARY_OWNER} library\\b`
      // Frame C: "put target permanent/creature on top|bottom of <library>"
      + `|\\bput target (?:creature|permanent|nonland permanent|artifact|enchantment|planeswalker) on ${TOP_OR_BOTTOM} of ${LIBRARY_OWNER} library\\b`
      // Frame D1: "the owner of target X shuffles it into their library" — Zoyowa's Justice.
      + `|\\bthe owner of target [^.]+?shuffles? it into ${LIBRARY_OWNER_D} library\\b`
      // Frame D2: "shuffles (it|that card|target X) into (their|its owner's) library"
      // Requires a possessive owner phrase to avoid catching plain self-shuffles like
      // "shuffle the rest into your library".
      + `|\\bshuffles? (?:it|that card|target \\w[\\w ]*?|(?:enchanted|attached|equipped) (?:creature|permanent|artifact)) into ${LIBRARY_OWNER_D} library\\b`
      // v0.21.0 — Frame D3: multi-subject shuffle, "shuffle this creature
      // and target X into their owners' libraries" (Floodpits Drowner).
      // TIGHTLY anchored on possessive/multi-owner library phrase to avoid
      // self-shuffle FPs ("shuffle the rest into your library").
      + `|\\bshuffles?\\s+(?:this\\s+(?:creature|permanent)|[^.]{0,80}?target\\s+\\w+[^.]{0,80}?)\\s+(?:and\\s+[^.]{0,40}?\\s+)?into\\s+(?:its owner's|their owners'|target opponent's)\\s+librar(?:y|ies)\\b`,
    );
    const m = t.match(re);
    return m ? { evidence: m[0] } : false;
  },
  nearMiss: { anchors: ['top', 'bottom', 'shuffles'], proximity: ['library', 'owner'], window: 6 },
};
