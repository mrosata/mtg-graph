import { useEffect, useMemo, useRef, useState } from 'react';
import { useGraphStore } from '../stores/graphStore';
import { useActiveDeck, useDeckStore } from '../stores/deckStore';
import { computeLandFill, type FillPlan } from '../lib/fillMana';
import { TOUR_IDS } from '../wizard/selectors';

export default function FillManaButton() {
  const cards = useGraphStore((s) => s.cards);
  const deck = useActiveDeck();
  const applyLandFill = useDeckStore((s) => s.applyLandFill);

  const [open, setOpen] = useState(false);
  const [override, setOverride] = useState<40 | 60 | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const spellCount = useMemo(() => {
    if (!deck) return 0;
    let n = 0;
    for (const entry of deck.workingCards) {
      const c = cards.get(entry.oracleId);
      if (!c) continue;
      if (c.types.includes('Land')) continue;
      n += entry.count;
    }
    return n;
  }, [deck, cards]);

  const plan: FillPlan | null = useMemo(() => {
    if (!deck) return null;
    return computeLandFill(
      deck,
      cards,
      override ? { targetOverride: override } : {},
    );
  }, [deck, cards, override]);

  const lands40 = useMemo(() => {
    if (!deck) return 17;
    const p = computeLandFill(deck, cards, { targetOverride: 40 });
    if (p.reason) return 17;
    const basics = Object.values(p.basicsByColor).reduce<number>((s, n) => s + (n ?? 0), 0);
    const nonBasics = deck.workingCards.reduce((s, entry) => {
      const c = cards.get(entry.oracleId);
      if (!c || !c.types.includes('Land') || c.supertypes.includes('Basic')) return s;
      return s + entry.count;
    }, 0);
    return basics + nonBasics;
  }, [deck, cards]);

  const lands60 = useMemo(() => {
    if (!deck) return 24;
    const p = computeLandFill(deck, cards, { targetOverride: 60 });
    if (p.reason) return 24;
    const basics = Object.values(p.basicsByColor).reduce<number>((s, n) => s + (n ?? 0), 0);
    const nonBasics = deck.workingCards.reduce((s, entry) => {
      const c = cards.get(entry.oracleId);
      if (!c || !c.types.includes('Land') || c.supertypes.includes('Basic')) return s;
      return s + entry.count;
    }, 0);
    return basics + nonBasics;
  }, [deck, cards]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
        setOverride(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (!deck) return null;
  const target = override ?? plan?.inferredTarget ?? 40;
  const disabled =
    !plan ||
    plan.reason === 'no_colored_spells' ||
    plan.reason === 'empty' ||
    (plan.add.length === 0 && plan.remove.length === 0);

  return (
    <div className="relative" ref={wrapperRef} data-tour-id={TOUR_IDS.fillManaButton}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="focus-brass inline-flex items-center gap-1 rounded-full border border-ink-line-2 bg-ink-raised px-3 py-1 text-xs text-vellum-mute transition-colors hover:text-brass-hi"
      >
        Fill mana
        <span aria-hidden className="text-vellum-dim">▾</span>
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Fill mana options"
          className="absolute right-0 z-50 mt-1 w-64 rounded-md border border-ink-line bg-ink-panel p-3 text-sm text-vellum shadow-[0_18px_40px_-12px_rgba(0,0,0,0.7),0_0_0_1px_rgba(212,164,74,0.18)]"
        >
          <div className="mb-2 font-mono tabular text-xs text-vellum-dim">Detected: {spellCount} spells</div>
          <div className="space-y-1">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="fill-target"
                aria-label="Limited (40)"
                checked={target === 40}
                onChange={() => setOverride(40)}
              />
              <span>Limited (40) — {lands40} lands</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="fill-target"
                aria-label="Standard (60)"
                checked={target === 60}
                onChange={() => setOverride(60)}
              />
              <span>Standard (60) — {lands60} lands</span>
            </label>
          </div>
          <div className="mt-3 text-xs text-vellum-mute">
            {plan?.reason === 'no_colored_spells' || plan?.reason === 'empty' ? (
              <span className="text-brass-hi">Add some colored spells first.</span>
            ) : plan && (plan.add.length > 0 || plan.remove.length > 0) ? (
              <>
                <div>
                  Adding:{' '}
                  {plan.add.length === 0
                    ? 'none'
                    : plan.add
                        .map((a) => {
                          const cardEntry = cards.get(a.oracleId);
                          return `${a.count} ${cardEntry?.name ?? a.oracleId}`;
                        })
                        .join(', ')}
                </div>
                <div>
                  Replacing: {plan.remove.reduce((s, r) => s + r.count, 0)} existing basics
                </div>
              </>
            ) : (
              <span className="text-vellum-dim">No changes needed.</span>
            )}
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setOverride(null);
              }}
              className="focus-brass rounded-full border border-ink-line-2 bg-ink-raised px-3 py-1 text-xs text-vellum-mute transition-colors hover:text-vellum"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={async () => {
                if (!plan) return;
                await applyLandFill(plan);
                setOpen(false);
                setOverride(null);
              }}
              className="focus-brass rounded-full bg-brass px-3 py-1 text-xs font-semibold text-ink-bg transition-colors hover:bg-brass-hi disabled:cursor-not-allowed disabled:bg-ink-raised disabled:text-vellum-dim"
            >
              Fill
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
