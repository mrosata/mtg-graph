export function stripReminderText(text: string): string {
  const stripped = text.replace(/\([^)]*\)/g, '');
  if (stripped.replace(/\s{2,}/g, ' ').trim().length === 0) return '';
  return stripped.replace(/[ \t]+\./g, '.').trim();
}

export function replaceSelfReferences(
  text: string,
  cardName: string,
  isLegendary: boolean = true,
): string {
  const withTilde = text.replace(/~/g, '__SELF__');
  if (!cardName) return withTilde;
  // Self-references in oracle text appear in short forms beyond the literal
  // full name:
  //   - Multi-face cards ("Front // Back") — each face's oracle uses its OWN
  //     face name (Blow Off Steam, Heartflame Slash, etc.).
  //   - Legendary creatures with comma names ("Greta, Sweettooth Scourge") —
  //     oracle uses the short legendary name ("When Greta enters…"). Per MTG
  //     comprehensive rules, legendary creatures self-reference by the portion
  //     before the comma.
  //   - Legendary creatures with " of " / " the " names ("Sharae of Numbing
  //     Depths", "Ajani the Greathearted") — same legendary short-name
  //     convention, just a different separator. Oracle uses just "Sharae" /
  //     "Ajani".
  // So we split on "//", ",", " of ", " the " and replace each segment.
  // Longest first so a short segment ("Greta") doesn't half-eat a longer one
  // ("Sweettooth Scourge") in pathological cases. Segments under 3 chars are
  // dropped (avoids replacing common bigrams like "of" / "an").
  //
  // v0.23 — the ` of ` / ` the ` short-name split is gated on `isLegendary`.
  // Non-legendary cards like "Pull from the Grave" should NOT be split on
  // " the " (yielding the segment "Grave" which then eats "graveyard" in
  // oracle text). The split is only correct for legendary creatures using
  // the rules-defined short-name convention. Same fix applies to "Pawn of
  // Ulamog" / "Stolen by the Fae" / "Picklock Prankster // Free the Fae"
  // (face B) / "Detective of the Month" / "Striding Shotcaller // Run the
  // Play" — each of which had a body word eaten by the short-name segment.
  const ofTheSplitter = isLegendary ? /\s+(?:of|the)\s+/i : null;
  const segments = cardName
    .split('//')
    .flatMap((face) => face.split(','))
    .flatMap((seg) => (ofTheSplitter ? seg.split(ofTheSplitter) : [seg]))
    .flatMap((seg) => {
      const trimmed = seg.trim();
      // Alchemy rebalanced cards print as "A-Original Name" but the oracle
      // text inherits the original printing and uses the un-prefixed name.
      // Yield both forms.
      if (/^A-/.test(trimmed)) return [trimmed, trimmed.replace(/^A-/, '')];
      return [trimmed];
    })
    .map((s) => s.trim())
    .filter((s) => s.length >= 3);
  segments.sort((a, b) => b.length - a.length);
  let result = withTilde;
  for (const seg of segments) {
    const escaped = seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(new RegExp(escaped, 'gi'), '__SELF__');
  }
  return result;
}

/**
 * True iff `keyword` appears as an INTRINSIC printed keyword on `oracleText` —
 * i.e. on a standalone keyword-block line (comma-separated list of keywords,
 * no prose punctuation/symbols). Filters out keywords Scryfall puts in
 * `card.keywords` because they appear inside granted clauses
 * ("…is a Dragon with…flying"), conditional grants, or in oracle prose.
 *
 * Pass the raw multi-face oracle text (newlines preserved). Lines from
 * reminder text are stripped first.
 */
export function isIntrinsicKeyword(oracleText: string, keyword: string): boolean {
  if (!oracleText) return false;
  const kw = keyword.toLowerCase();
  for (const rawLine of oracleText.split(/\n/)) {
    const line = stripReminderText(rawLine).trim().toLowerCase();
    if (!line) continue;
    // Keyword-block lines have no prose markers: no periods, no em-dash, no
    // colons. Braces are allowed only as mana-cost tokens ({N}, {W}, {T}, {X})
    // — Ward / Equip / Kicker / Crew / Cycling keywords carry such a cost
    // suffix on the keyword line. Strip mana tokens before checking.
    const noMana = line.replace(/\{[^}]*\}/g, '');
    if (/[.:—]/.test(noMana)) continue;
    // After stripping mana tokens the line should be pure keyword text. If
    // any other brace survived, it's prose (rare but worth bailing on).
    if (/[{}]/.test(noMana)) continue;
    // Comma-separated keyword list. Each entry must match the keyword exactly
    // OR be a `<kw> from <X>` qualified variant (hexproof from <color/type>,
    // protection from <color>, etc.) — the card still has the base keyword.
    // Use `noMana` so "ward {2}" becomes "ward " — trim brings it back to "ward".
    const items = noMana.split(/\s*,\s*/).map((s) => s.trim());
    if (items.some((item) => item === kw || item.startsWith(`${kw} from `))) return true;
  }
  return false;
}

// Strip text inside paired double quotes — these are granted abilities
// printed in quotes ("becomes a Treasure with \"{T}, Sacrifice this artifact:
// Add one mana of any color\"") and they belong semantically to the granted
// permanent, not the host card. Leaving them in would cause the host card's
// rule scan to FP on add_mana / sacrifice_artifact / has_activated_ability,
// etc. (Kitesail Larcenist is the canonical case.)
//
// Single quotes are intentionally NOT stripped — in oracle text they are
// almost always contractions ("can't", "doesn't", "owner's") which are not
// quote delimiters at all. Stripping them would butcher most text.
//
// Curly/smart quotes also handled. The replacement uses a space so word
// boundaries on the host side stay intact.
export function stripQuotedAbilities(text: string): string {
  return text
    .replace(/"[^"]*"/g, ' ')
    .replace(/“[^”]*”/g, ' ');
}

export function normalizeOracleText(
  text: string,
  cardName: string,
  isLegendary: boolean = true,
): string {
  const stripped = stripReminderText(text);
  const unquoted = stripQuotedAbilities(stripped);
  const selfed = replaceSelfReferences(unquoted, cardName, isLegendary);
  // Collapse newlines so rules anchored on sentence boundaries don't miss
  // effects on a separate line (e.g. "...this turn.\nDraw three cards.").
  return selfed.toLowerCase().replace(/\s*\n+\s*/g, ' ');
}
