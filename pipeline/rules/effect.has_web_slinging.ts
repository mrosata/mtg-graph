// pipeline/rules/effect.has_web_slinging.ts
//
// Web-slinging keyword (Marvel's Spider-Man + Through the Omenpaths mirror).
// Alternate cast cost: return a tapped creature you control to its owner's
// hand. That self-bounce-then-replay loop pairs naturally with self-ETB
// triggers and with single-target bounce effects. Read primarily from
// Scryfall's `keywords` array, with an oracle-text fallback for multi-face
// cards (e.g. Peter Parker // Amazing Spider-Man) where the top-level keyword
// array reflects only the front face.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

export const tagDef: TagDef = {
  tagId: 'effect.has_web_slinging',
  axis: 'effect',
  label: 'Has web-slinging',
  description:
    'Has the Web-slinging keyword — an alternate cast cost that returns a tapped creature you control to its owner\'s hand. Self-bounce-then-replay tempo loop.',
  pairsWith: [
    // Cross-axis only. Web-slinging's tempo loop (bounce a tapped creature,
    // recast with web-slinging cost) re-triggers self-ETBs on the recast
    // body. A "cares about being returned to hand" condition would let us
    // wire to bounce_creature too, but that axis doesn't exist yet — defer.
    'trigger.self_etb',
  ],
  category: 'theme',
};

const TEXT_RE = /\bweb-slinging\b/;

export const rule: Rule = {
  id: 'effect.has_web_slinging',
  axis: 'effect',
  matchCard: (card, normalizedText) => {
    if ((card.keywords || []).includes('Web-slinging')) return { evidence: 'Web-slinging' };
    const m = normalizedText.match(TEXT_RE);
    return m ? { evidence: m[0] } : false;
  },
};
