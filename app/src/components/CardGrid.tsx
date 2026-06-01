import { useRef } from 'react';
import { FixedSizeGrid as Grid } from 'react-window';
import type { Card } from '@shared/types';
import { TOUR_IDS } from '../wizard/selectors';
import OwnedBadge from './OwnedBadge';

type Props = {
  cards: Card[];
  onCardClick: (card: Card) => void;
  onHoverCard?: (card: Card | null) => void;
  width: number;
  height: number;
};

const CARD_W = 220;
const CARD_H = 320;
const GAP = 8;

export default function CardGrid({ cards, onCardClick, onHoverCard, width, height }: Props) {
  const colCount = Math.max(1, Math.floor(width / (CARD_W + GAP)));
  const rowCount = Math.ceil(cards.length / colCount);
  const hoverTimer = useRef<number | null>(null);

  const scheduleHover = (card: Card) => {
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => onHoverCard?.(card), 300);
  };

  const clearHover = () => {
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
    hoverTimer.current = null;
    onHoverCard?.(null);
  };

  return (
    <div data-tour-id={TOUR_IDS.cardGrid}>
      <Grid
        columnCount={colCount}
        columnWidth={CARD_W + GAP}
        rowCount={rowCount}
        rowHeight={CARD_H + GAP}
        width={width}
        height={height}
        onScroll={clearHover}
      >
        {({ columnIndex, rowIndex, style }) => {
          const idx = rowIndex * colCount + columnIndex;
          const card = cards[idx];
          if (!card) return <div style={style} />;
          return (
            <button
              style={style}
              onClick={() => onCardClick(card)}
              onMouseEnter={() => scheduleHover(card)}
              onMouseLeave={clearHover}
              className="foil-edge relative p-1 text-left"
            >
              <div className="relative h-full w-full overflow-hidden rounded-md">
                <img
                  src={card.imageUrl}
                  alt={card.name}
                  loading="lazy"
                  className="h-full w-full object-contain"
                />
              </div>
              <OwnedBadge card={card} className="absolute bottom-2 right-2" />
            </button>
          );
        }}
      </Grid>
    </div>
  );
}
