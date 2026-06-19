// pipeline/rules/effect.grants_keyword.ts
//
// Parametric: one tag per intrinsic keyword that can be GRANTED (temporary or
// anthem-style perpetual). Distinct from `effect.has_<keyword>` which is the
// card's own printed keyword. Flying and menace are covered by the broader
// `effect.grants_evasion`, so they're excluded here.
import type { Rule } from './types';
import type { TagDef } from '../../shared/types';

// tag id slug → oracle-text spelling. Slugs use underscores so they're stable
// catalog ids; spellings are what appears in normalized oracle text.
const GRANTABLE_KEYWORDS: { slug: string; spelling: string }[] = [
  { slug: 'haste', spelling: 'haste' },
  { slug: 'trample', spelling: 'trample' },
  { slug: 'lifelink', spelling: 'lifelink' },
  { slug: 'deathtouch', spelling: 'deathtouch' },
  { slug: 'first_strike', spelling: 'first strike' },
  { slug: 'double_strike', spelling: 'double strike' },
  { slug: 'vigilance', spelling: 'vigilance' },
  { slug: 'hexproof', spelling: 'hexproof' },
  { slug: 'indestructible', spelling: 'indestructible' },
  { slug: 'reach', spelling: 'reach' },
  { slug: 'prowess', spelling: 'prowess' },
];

// What the family pairs with on the consumer side. Most grants pair with the
// matching `condition.cares_<kw>` if one exists. For the keywords without a
// "cares about X" condition tag (most of them), the grants tag still exists
// for the deck-graph axis but has no edges until those conditions are authored.
const PAIRINGS: Record<string, string[]> = {
  haste: [],
  trample: [],
  lifelink: ['condition.cares_lifegain'],
  deathtouch: ['condition.cares_deathtouch'],
  first_strike: [],
  double_strike: [],
  vigilance: [],
  hexproof: [],
  indestructible: [],
  reach: ['condition.cares_evasion'],
  prowess: [],
};

function buildGrantRegex(kw: string): RegExp {
  return new RegExp(
    [
      `\\bgains?\\s+${kw}\\b`,
      // Frame (b): added `this` to qualifier set so "this creature has trample
      // as long as…" (Grand Ball Guest, Gallant Pie-Wielder) matches.
      `\\b(?:other|target|enchanted|equipped|all|each|this)\\s+(?:[\\w\\-]+\\s+){0,4}?creatures?[^.]{0,50}?(?:has|have)\\s+${kw}\\b`,
      `\\bcreatures?\\s+(?:you control|you don't control|an opponent controls)\\s+(?:has|have)\\s+${kw}\\b`,
      // v0.35.0 — Batch 23: conditional anthem — "creatures you control with
      // <modifier> have <kw>" (Emil, Vastlands Roamer: "creatures you control
      // with +1/+1 counters on them have trample"). The `with [^.]{0,60}?`
      // filler admits the typical conditional clause ("+1/+1 counters on them",
      // "power 3 or greater", etc.) between the subject and the anthem verb.
      `\\bcreatures?\\s+(?:you control|you don't control|an opponent controls)\\s+with\\s+[^.]{0,60}?\\s+(?:has|have)\\s+${kw}\\b`,
      // Radiant Destiny — anaphoric "they" subject. "as long as you have the
      // city's blessing, they also have vigilance." The antecedent is a tribe
      // noun stated earlier in the same ability. `also` is optional.
      `\\bthey\\s+(?:also\\s+)?have\\s+${kw}\\b`,
      // v0.14.1 — tribal anthem: "Other Dinosaurs you control have haste"
      // (Palani's Hatcher). The subject is a tribe plural noun, not the
      // generic "creatures". Require the plural-`s` suffix to keep this
      // narrow (excludes singular oddities), and limit to subjects following
      // "other" or starting fresh after a sentence boundary.
      // FIX 14 (BR-9) — admit a state adjective ("attacking", "blocking",
      // "tapped", "untapped", "enchanted") before the tribe noun. Crossway
      // Troublemakers: "attacking vampires you control have deathtouch".
      // v0.30 Group 11b — admit printed-keyword prefix as a boundary marker
      // (Fearless Swashbuckler: "haste vehicles you control have haste"
      // where leading "haste" is the printed keyword line collapsed onto
      // the same string). Printed-keyword list explicit so it stays narrow.
      `(?:^|[.,:\\n—] ?|\\bother\\s+|\\b(?:attacking|blocking|tapped|untapped|enchanted)\\s+|\\b(?:haste|flying|trample|vigilance|lifelink|deathtouch|first strike|double strike|hexproof|indestructible|reach|prowess|menace|defender|fear|intimidate|skulk|protection|flash|ward|prowl|shadow|wither|persist|undying)\\s+)[a-z][\\w\\-]+s\\s+(?:and\\s+[a-z][\\w\\-]+s\\s+)?you control\\s+(?:has|have)\\s+${kw}\\b`,
      // FIX 14 (BR-9) — "get +N/+N and have <kw>" anthem continuation.
      // Death Baron: "skeletons you control and other zombies you control
      // get +1/+1 and have deathtouch". The verb chain follows a +N/+N
      // pump rather than the bare anthem verb.
      // v0.30 Group 11a — verb slot widened from `get` to `gets?` to admit
      // singular Aura conjunction "Enchanted permanent gets +N/+N and has
      // <kw>" (Lightwheel Enhancements, Silken Strength).
      `\\bgets?\\s+\\+(?:\\d+|x)\\/\\+(?:\\d+|x)\\s+and\\s+(?:has|have|gains?)\\s+${kw}\\b`,
      // Frame (d): bare __SELF__ subject. Limit filler to 50 chars to avoid
      // crossing sentence boundaries via "and/with" chains.
      `\\b__self__[^.]{0,50}?(?:has|have|gains?)\\s+${kw}\\b`,
      // Frame (e): "is/becomes a [stats] [type] with …, <kw>". The <kw>
      // appears after a comma or "and " inside the with-clause. The
      // pre-"with" filler accepts stats (4/4), type words (angel), and
      // hyphens. Cap filler at 80 chars in the with-clause to stay within
      // the clause and not span sentences.
      // Negative lookbehind excludes non-creature self-animation:
      // "this case/enchantment/artifact/land/saga is/becomes" where a
      // non-creature permanent gains keywords by becoming a creature —
      // those keywords are the new creature's own keywords, not a grant to
      // others. (Case of the Gorgon's Kiss, manland, Case/Saga patterns.)
      // "this creature is/becomes" is intentionally ALLOWED because the
      // Goddric / angel-transformation frame was an existing regression.
      `(?<!\\bthis (?:case|enchantment|artifact|land|saga|planeswalker|vehicle|equipment|aura) )(?<!\\b__self__ )\\b(?:is|becomes)\\s+(?:a\\s+|an\\s+)?[\\w\\-/ ]{1,40}?with\\s+[^.]{0,80}?(?:,\\s*|\\band\\s+)${kw}\\b`,
      // v0.14.1 — Frame (e2): singular keyword inside with-clause. Tendril of
      // the Mycotyrant: "becomes a 0/0 Fungus creature with haste". The kw
      // is the SOLE item in the with-clause — no comma or "and" before it.
      // Same self-animation guard as Frame (e).
      `(?<!\\bthis (?:case|enchantment|artifact|land|saga|planeswalker|vehicle|equipment|aura) )(?<!\\b__self__ )\\b(?:is|becomes)\\s+(?:a\\s+|an\\s+)?[\\w\\-/ ]{1,40}?with\\s+${kw}\\b`,
      // Frame (f): comma-list continuation of a "has/have/gains" grant.
      // Syr Ginger ("__self__ has trample, hexproof, and haste …") — for KWs
      // after the first, the verb-adjacent pattern (Frame d) doesn't fire.
      // Each list item is a single word (optionally "<kw> strike"), comma-
      // separated, with optional "and" before the final item. Anchored on the
      // verb to avoid matching bare printed-keyword lines like "flying, trample".
      // v0.20 — bumped inner pre-item filler from {0,1}? to {0,4}? so 4+ item
      // lists work (Sword of Vengeance: "has first strike, vigilance, trample,
      // and haste" — haste sits at position 4). Benefits all keyword grants.
      `\\b(?:has|have|gains?)\\s+[a-z]+(?:\\s+strike)?\\s*,\\s+(?:[a-z]+(?:\\s+strike)?\\s*,\\s+){0,4}?(?:and\\s+)?${kw}\\b`,
      // Frame (f2): 2-item list joined by bare "and" (no comma) — Water Wings
      // ("gains flying and hexproof"). Same verb anchor as Frame (f), but the
      // separator is "<kw> and" rather than "<kw>, [...,] and".
      `\\b(?:has|have|gains?)\\s+[a-z]+(?:\\s+strike)?\\s+and\\s+${kw}\\b`,
      // v0.32 — Group 13 — Frame (f3): kw on the LEFT side of a 2-item "and"
      // list — Thrumming Hivepool ("slivers you control have double strike
      // and haste"). Frame (f2) catches kw on the RIGHT; this catches it on
      // the LEFT. Verb anchor preserved so it doesn't FP on bare keyword
      // lines.
      `\\b(?:has|have|gains?)\\s+${kw}\\s+and\\s+[a-z]+(?:\\s+strike)?\\b`,
      // v0.14.4 — Frame (j): "gains your choice of <kw1>, <kw2>(, ...)?, or <kw>"
      // Multi-keyword choice grant. Ezrim Agency Chief: "gains your choice of
      // vigilance, lifelink, or hexproof". Each listed keyword fires its own
      // grants_<kw> rule independently; this frame catches the kw wherever it
      // appears in the choice list (terminal, mid-list, or 2-item).
      //
      // (j1) — kw is the FINAL item: "your choice of X, Y, or <kw>"
      `\\bgains?\\s+your choice of\\s+(?:[a-z]+(?:\\s+strike)?\\s*,\\s*){1,4}(?:and\\s+|or\\s+)?${kw}\\b`,
      // (j2) — kw is NOT the final item: "your choice of <kw>, X, ..." — kw is
      // followed by a comma (more items in the list follow).
      `\\bgains?\\s+your choice of\\s+(?:[a-z]+(?:\\s+strike)?\\s*,\\s*)*${kw}\\s*,`,
      // (j3) — 2-item choice with no comma: "gains your choice of X or <kw>" or
      // "gains your choice of <kw> or X".
      `\\bgains?\\s+your choice of\\s+(?:${kw}\\s+or\\s+[a-z]+(?:\\s+strike)?|[a-z]+(?:\\s+strike)?\\s+or\\s+${kw})\\b`,
      // Frame (g): keyword baked into a token-creation clause — "create a
      // 2/2 white Knight creature token with vigilance" (Virtue of Loyalty).
      // The token IS the granted permanent; the kw applies to it.
      `\\bcreates?\\s+[^.]{0,80}?tokens?\\s+(?:with|that has|that have)\\s+[^.]{0,80}?${kw}\\b`,
      // Frame (g2): keyword in a "create a token … (?:and )?has <kw>"
      // continuation. The Apprentice's Folly creates a copy-token whose
      // properties trail a comma-list ending in "and has haste". Bounded by
      // 160 chars from "tokens?" to "has <kw>" to admit "that's a copy of it,
      // except it isn't legendary, is a Reflection in addition to its other
      // types, and has haste".
      `\\bcreates?\\s+[^.]{0,160}?tokens?\\s+[^.]{0,160}?\\b(?:and\\s+)?(?:has|have|gains?)\\s+${kw}\\b`,
      // Frame (h): spell-grants — "instant/sorcery/spells you control have
      // <kw>" (Heartflame Duelist). The keyword applies to a spell rather
      // than a creature. Lifelink is the common case; the frame applies
      // uniformly to all grantable keywords (deathtouch on a spell is also
      // a real thing — Lazav variants).
      `\\b(?:instant(?:\\s+and\\s+sorcery)?|sorcery|noncreature)?\\s*spells?\\s+you control\\s+(?:has|have|gains?)\\s+${kw}\\b`,
      // Frame (i): keyword-counter form — "put a <kw> counter on" (DOM/SNC/MKM
      // era). The counter grants the keyword to the target creature.
      // Call a Surprise Witness: "put a flying counter on it".
      `\\bput a ${kw} counter\\b`,
      // 2026-06-01 audit batch — Frame (i2): multi-counter clause. Qarsi
      // Revenant: "put a flying counter, a deathtouch counter, and a
      // lifelink counter on target creature". Each grants_<kw> needs to
      // fire on its own keyword wherever it sits in the list. Anchor on
      // "put a/an" then a 0-N list of "<kw> counter, " then the target kw
      // counter. The list permits "and " before the final item.
      `\\bput (?:a|an)\\s+(?:[a-z][\\w\\- ]*?\\s+counter\\s*,\\s+){1,4}(?:and\\s+)?(?:a\\s+|an\\s+)?${kw}\\s+counter\\b`,
      // 2026-06-01 follow-up — Frame (i3): "X counter and a <kw> counter"
      // — bare "and" conjunction (no comma). Two-counter shape used by
      // the BLB/DSK Renew family. Champion of Dusan ("put a +1/+1 counter
      // and a trample counter"), Sagu Pummeler ("put two +1/+1 counters
      // and a reach counter"), Kheru Goldkeeper ("put two +1/+1 counters
      // and a flying counter" — handled in grants_evasion).
      // Count slot accepts "a|an", "one|two|three|four", a digit, or a
      // bare word numeral (covers "X" placeholder too). Optional 1-token
      // descriptor before "counter(s)" handles "+1/+1" or other simple
      // counter names.
      `\\bput\\s+(?:a|an|one|two|three|four|five|six|seven|\\d+|x)\\s+(?:[\\w\\-+/]+\\s+)?counters?\\s+and\\s+(?:a\\s+|an\\s+)?${kw}\\s+counter\\b`,
      // 2026-06-01 follow-up — Frame (i4): "with a <kw> counter ... on it"
      // — reanimation/return-with frame. Perennation: "return target
      // permanent card from your graveyard to the battlefield with a
      // hexproof counter and an indestructible counter on it".
      //
      // Guarded by a preceding battlefield-entering verb (enters | returns)
      // within ~120 chars to prevent leakage onto unrelated "with ...
      // counter" clauses (cares clauses, etc.). The guard reuses
      // /(?:enters|returns?)[^.]{0,120}?with/ within a single sentence.
      // Inner counter-list slot mirrors Frame (i2) — accepts 0-N
      // "<kw> counter, " or "<kw> counter and " items before the target
      // kw, so multi-counter with-clauses (Perennation: "with a hexproof
      // counter and an indestructible counter") fire on each kw.
      `\\b(?:enters?|returns?)\\b[^.]{0,120}?\\bwith\\s+(?:(?:a\\s+|an\\s+)?[a-z][\\w\\-+/ ]*?\\s+counter\\s*(?:,\\s+|\\s+and\\s+)){0,4}(?:a\\s+|an\\s+)?${kw}\\s+counter\\b`,
    ].join('|'),
  );
}

// v0.14.6 — same self-anaphor strip as effect.grants_evasion.ts. Mirrors the
// Warden of the Inner Sky narrowing for non-evasion keywords (vigilance,
// trample, etc.) that get pulled into "it has flying and <kw>" comma-and lists.
//
// v0.14.14 — broadened to match the grants_evasion strip: extended subject
// alternation to include explicit "this <type>" / "__self__" (Living
// Conundrum) and added "during" to the gate connectors (Pompous Gadabout).
// Subject-first self-conditionals ("this creature has X as long as Y" —
// Grand Ball Guest, Gallant Pie-Wielder) are intentionally NOT stripped and
// continue to match grants_<kw> as before.
//
// v0.14.26 — mirrors the grants_evasion v0.14.26 triggered self-buff strip
// (Rot Farm Mortipede). See effect.grants_evasion.ts for the design rationale
// — short version: triggered self-buffs use `gets` (not `has`) and a `when`/
// `whenever` gate; the safety lookahead aborts the strip if the trailing
// clause contains an anthem subject so mixed self+anthem triggers retain
// their grants_<kw> match on the anthem half.
//
// v0.21.0 — PRESERVE the clause if it contains a non-evasion grantable
// keyword. Rationale: evasion keywords (flying/menace/intimidate) have a
// dedicated `effect.gains_keyword_self_conditional` axis, but non-evasion
// grantable keywords (haste/trample/lifelink/deathtouch/first strike/double
// strike/vigilance/hexproof/indestructible/reach/prowess) have NO companion
// self-conditional tag — they must still fire grants_<kw> here. Cards:
// Fear of the Dark ("it gains menace and deathtouch"), Hand That Feeds
// ("it gets +2/+0 and gains menace"), Rot Farm Mortipede ("...gains menace
// and lifelink"). The strip becomes evasion-only.
const NON_EVASION_GRANTABLE = /\b(?:haste|trample|lifelink|deathtouch|first strike|double strike|vigilance|hexproof|indestructible|reach|prowess)\b/;

const TRIGGERED_SELF_BUFF = new RegExp(
  String.raw`\b(?:when|whenever)\b[^.]*?,\s*(?:this\s+(?:creature|artifact|enchantment|land|permanent|vehicle|equipment|saga|planeswalker)|__self__|it)\s+(?:has|have|gains?|gets?)\s+(?:(?!\bother\s+creatures?\b|\bcreatures?\s+you\s+control\b)[^.])*?\.`,
  'g',
);

const AS_LONG_AS_SELF = /\b(?:as long as|while|if|during)\b[^.]*?,\s*(?:this\s+(?:creature|artifact|enchantment|land|permanent|vehicle|equipment|saga|planeswalker)|__self__|it)\s+(?:has|have|gains?)\s+[^.]*?\./g;

function stripSelfAnaphor(t: string): string {
  // v0.21.0 — preserve the matched span if it contains a non-evasion
  // grantable keyword. Replacement callback returns '' to strip, or the
  // matched span itself to keep it.
  const keepIfNonEvasion = (m: string) => (NON_EVASION_GRANTABLE.test(m) ? m : '');
  return t.replace(AS_LONG_AS_SELF, keepIfNonEvasion).replace(TRIGGERED_SELF_BUFF, keepIfNonEvasion);
}

// v0.14.9 — Judith, Carnage Connoisseur: "That spell gains deathtouch and
// lifelink." Bullet-mode grants where the subject is a spell, not a
// creature. The tagDef explicitly scopes to creature grants; strip the
// "(that|the|this) spell gains/has <stuff>." clause before matching so
// no grant frame sees the spell-subject text.
function stripSpellGrants(t: string): string {
  return t.replace(/\b(?:that|the|this)\s+spell\s+(?:has|have|gains?)\s+[^.]*?\./g, '');
}

function makeRule(slug: string, spelling: string): Rule {
  // Grant frames are documented in buildGrantRegex above.
  // The subject in (a) and (b) is any noun phrase — narrowing it would risk
  // missing creative templating. The trade-off is that "gains <kw>" alone is
  // strongly indicative of a grant (the keyword isn't intrinsic if it's being
  // "gained" — that's the literal MTG meaning).
  const kw = spelling;
  const re = buildGrantRegex(kw);

  // first_strike: double strike is a superset of first strike by game rules.
  // Mirror the has_first_strike broadening — a granted double strike also
  // grants first strike. Match "double strike" in any grant context and carry
  // metadata { doubleStrike: true } so callers can distinguish the two cases.
  if (slug === 'first_strike') {
    const dsRe = buildGrantRegex('double strike');
    return {
      id: `effect.grants_${slug}`,
      axis: 'effect',
      match: (t) => {
        const text = stripSpellGrants(stripSelfAnaphor(t));
        // Prefer double-strike evidence (more specific) over first-strike.
        const dsMatch = text.match(dsRe);
        if (dsMatch) return { evidence: dsMatch[0], metadata: { doubleStrike: true } };
        const m = text.match(re);
        return m ? { evidence: m[0] } : false;
      },
      nearMiss: { anchors: [kw, 'double strike'], proximity: ['gain', 'have', 'has'], window: 4 },
    };
  }

  // FIX 17 (BR-12) — hexproof can be granted to PLAYERS (Crystal Barricade:
  // "you have hexproof"). Other keywords don't apply to players, so this
  // arm is restricted to slug === 'hexproof'.
  // v0.46.0 — I Am Untouchable: compound-subject "you and permanents you
  // control have hexproof" and anthem "other permanents you control have
  // hexproof". The existing Frame (b) only covers `creatures?` as the
  // subject noun; permanents need explicit arms.
  if (slug === 'hexproof') {
    const playerHexproofRe = /\byou\s+(?:have|has|gain|gains)\s+hexproof\b/;
    // v0.46.0 — compound-subject "you and <permanents> you control have hexproof"
    const youAndPermanentsRe = /\byou\s+(?:and\s+[^.]{0,60}?\s+)?(?:have|has|gain|gains)\s+hexproof\b/;
    // v0.46.0 — anthem "other/all/each permanents you/an opponent control(s) have hexproof"
    const permanentsHexproofRe = /\b(?:other|all|each)?\s*permanents?\s+(?:you|an opponent)\s+control(?:s)?\s+(?:have|has|gains?)\s+hexproof\b/;
    return {
      id: `effect.grants_${slug}`,
      axis: 'effect',
      match: (t) => {
        const cleaned = stripSpellGrants(stripSelfAnaphor(t));
        const m = cleaned.match(re) ?? cleaned.match(playerHexproofRe) ?? cleaned.match(youAndPermanentsRe) ?? cleaned.match(permanentsHexproofRe);
        return m ? { evidence: m[0] } : false;
      },
      nearMiss: { anchors: [kw], proximity: ['gain', 'have', 'has'], window: 4 },
    };
  }

  return {
    id: `effect.grants_${slug}`,
    axis: 'effect',
    match: (t) => {
      const m = stripSpellGrants(stripSelfAnaphor(t)).match(re);
      return m ? { evidence: m[0] } : false;
    },
    nearMiss: { anchors: [kw], proximity: ['gain', 'have', 'has'], window: 4 },
  };
}

export const rules: Rule[] = GRANTABLE_KEYWORDS.map(({ slug, spelling }) => makeRule(slug, spelling));

export const tagDefs: TagDef[] = GRANTABLE_KEYWORDS.map(({ slug, spelling }) => ({
  tagId: `effect.grants_${slug}`,
  axis: 'effect',
  label: `Grants ${spelling}`,
  description: `Grants the ${spelling} keyword to one or more creatures (temporary or perpetual). Distinct from \`effect.has_${slug}\` which flags the card's own printed keyword.`,
  pairsWith: PAIRINGS[slug] ?? [],
}));
