import type { Card } from '@shared/types';
import type { Deck, DeckCard } from './db';

function toArenaLines(entries: DeckCard[], cards: Map<string, Card>): string[] {
  return entries
    .map((entry) => {
      const card = cards.get(entry.oracleId);
      return card ? `${entry.count} ${card.name}` : null;
    })
    .filter((line): line is string => line !== null);
}

export function deckToArenaText(deck: Deck, cards: Map<string, Card>): string {
  const mainLines = toArenaLines(deck.workingCards, cards);
  const sideLines = toArenaLines(deck.sideboardCards ?? [], cards);
  const mainBody = mainLines.length > 0 ? `\n${mainLines.join('\n')}` : '';
  const sideSection = sideLines.length > 0 ? `\n\nSideboard\n${sideLines.join('\n')}` : '';
  return `About\nName ${deck.name}\n\nDeck${mainBody}${sideSection}`;
}

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function toDekRow(entry: DeckCard, card: Card, sideboard: boolean): string {
  const catId = entry.mtgoId ?? card.mtgoId ?? 0;
  return (
    `  <Cards CatID="${catId}" Quantity="${entry.count}" ` +
    `Sideboard="${sideboard ? 'true' : 'false'}" Name="${xmlEscape(card.name)}" />`
  );
}

// Archidekt / MTGO Workstation .dek format. CatID is the MTGO catalog ID
// (per-printing). Fallback chain: imported entry override → pipeline canonical
// (first-seen printing) → 0. Archidekt's importer reads Name + Quantity and
// tolerates CatID="0", so cards without an MTGO printing still round-trip.
export function deckToDekXml(deck: Deck, cards: Map<string, Card>): string {
  const mainRows = deck.workingCards
    .map((entry) => {
      const card = cards.get(entry.oracleId);
      return card ? toDekRow(entry, card, false) : null;
    })
    .filter((row): row is string => row !== null);

  const sideRows = (deck.sideboardCards ?? [])
    .map((entry) => {
      const card = cards.get(entry.oracleId);
      return card ? toDekRow(entry, card, true) : null;
    })
    .filter((row): row is string => row !== null);

  const allRows = [...mainRows, ...sideRows];
  const body = allRows.length > 0 ? `\n${allRows.join('\n')}\n` : '';
  return `<?xml version="1.0" encoding="utf-8"?>\n<Deck>${body}</Deck>`;
}
