import { useEffect, useMemo, useState } from 'react';
import {
  deckConnectionSummary,
  neighborStats,
  type GraphEdge,
  type GraphNode,
  type NeighborStat,
} from '../../lib/deckGraph';
import { FAMILIES, type FamilyId } from '../../lib/tagFamilies';
import type { Card } from '@shared/types';
import ManaCost from '../ManaCost';
import ConfirmModal from '../ConfirmModal';
import CardListRow from '../CardListRow';
import HoverCardPreview from '../HoverCardPreview';

const FAMILY_DEFS = new Map(FAMILIES.map((f) => [f.id, f]));

type Props = {
  node: GraphNode;
  incidentEdges: GraphEdge[];
  deckCount: number;
  cards: Map<string, Card>;
  deckCounts: Map<string, number>;
  nodesById: Map<string, GraphNode>;
  onAdd: () => void;
  onRemoveOne: () => void;
  onRemoveAll: () => void;
  onClose: () => void;
  onAddNeighbor: (oracleId: string, qty: number) => void | Promise<void>;
  onRemoveNeighbor: (oracleId: string, qty: number) => void | Promise<void>;
  onSelectNeighbor: (oracleId: string) => void;
  onHoverNeighbor: (oracleId: string | null) => void;
  onToggleFamily: (id: FamilyId) => void;
};

export default function SelectionDrawer({
  node,
  incidentEdges,
  deckCount,
  cards,
  deckCounts,
  nodesById,
  onAdd,
  onRemoveOne,
  onRemoveAll,
  onClose,
  onAddNeighbor,
  onRemoveNeighbor,
  onSelectNeighbor,
  onHoverNeighbor,
  onToggleFamily,
}: Props) {
  const [confirmingRemoveAll, setConfirmingRemoveAll] = useState(false);
  const [hover, setHover] = useState<{ url: string; x: number; y: number } | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !confirmingRemoveAll) onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, confirmingRemoveAll]);

  // Clear the graph halo when the drawer unmounts so a stale highlight
  // can't survive a selection change.
  useEffect(() => {
    return () => onHoverNeighbor(null);
  }, [onHoverNeighbor]);

  const byFamily = useMemo(() => {
    const fam = new Map<FamilyId, number>();
    for (const e of incidentEdges) {
      for (const b of e.familyBreakdown) {
        fam.set(b.familyId, (fam.get(b.familyId) ?? 0) + b.count);
      }
    }
    return fam;
  }, [incidentEdges]);

  const neighbors = useMemo(
    () => neighborStats(node.id, incidentEdges, cards, deckCounts, nodesById),
    [node.id, incidentEdges, cards, deckCounts, nodesById],
  );

  const summary = useMemo(() => deckConnectionSummary(neighbors), [neighbors]);
  const summaryText =
    summary.uniqueCards === 0
      ? 'No connections to cards in your deck'
      : `Connects to ${summary.uniqueCards} ${summary.uniqueCards === 1 ? 'node' : 'nodes'}` +
        ` · ${summary.totalCopies} ${summary.totalCopies === 1 ? 'card' : 'cards'} in your deck`;

  return (
    <aside className="h-full w-80 shrink-0 overflow-y-auto border-l border-neutral-800 bg-neutral-950 p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-neutral-500">
            Selected · {node.cls === 'deck' ? 'in deck' : node.cls === 'bridge' ? 'bridge' : 'candidate'}
          </p>
          <h3 className="mt-0.5 text-base font-semibold text-neutral-100">{node.card.name}</h3>
        </div>
        <button
          type="button"
          aria-label="Close drawer"
          onClick={onClose}
          className="text-neutral-400 hover:text-neutral-100"
        >
          ×
        </button>
      </div>

      <div className="mt-2 flex items-center gap-2 text-xs text-neutral-400">
        <ManaCost cost={node.card.manaCost} />
        <span>· {node.card.typeLine}</span>
      </div>

      {node.card.imageUrl && (
        <img
          src={node.card.imageUrl}
          alt={node.card.name}
          className="mt-3 w-full rounded border border-neutral-800"
        />
      )}

      <div className="mt-3">
        <p className="text-xs text-neutral-400">{summaryText}</p>
        {byFamily.size > 0 && (
          <>
            <p className="mt-2 text-[10px] uppercase tracking-wider text-neutral-500">
              Shared interactions
            </p>
            <ul className="mt-1 flex flex-wrap gap-1">
              {Array.from(byFamily.entries()).map(([famId, count]) => {
                const fd = FAMILY_DEFS.get(famId);
                if (!fd) return null;
                return (
                  <li key={famId}>
                    <button
                      type="button"
                      onClick={() => onToggleFamily(famId)}
                      aria-label={`Hide ${fd.label} edges`}
                      title={`Hide ${fd.label} edges`}
                      className="inline-flex items-center gap-1 rounded border border-neutral-800 px-1.5 py-0.5 text-xs text-neutral-300 hover:border-neutral-600 hover:text-neutral-100"
                    >
                      <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: fd.color }} />
                      <span>{fd.label}</span>
                      <span className="text-neutral-500">·{count}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      <div className="mt-4 space-y-2">
        {node.cls !== 'deck' && (
          <button
            type="button"
            onClick={onAdd}
            className="w-full rounded bg-amber-500 px-3 py-2 text-sm font-semibold text-black hover:bg-amber-400"
          >
            + Add to deck
          </button>
        )}
        {node.cls === 'deck' && (
          <>
            <button
              type="button"
              onClick={onRemoveOne}
              disabled={deckCount === 0}
              className="w-full rounded border border-neutral-700 px-3 py-2 text-sm text-neutral-200 hover:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Remove one copy ({deckCount} in deck)
            </button>
            {deckCount > 1 && (
              <button
                type="button"
                onClick={() => setConfirmingRemoveAll(true)}
                className="w-full rounded border border-red-900 px-3 py-2 text-sm text-red-300 hover:border-red-500"
              >
                Remove all copies
              </button>
            )}
          </>
        )}
      </div>

      {neighbors.length > 0 && (
        <div className="mt-5">
          <p className="text-[10px] uppercase tracking-wider text-neutral-500">
            Connected cards · {neighbors.length}
          </p>
          <ul className="mt-1 space-y-0.5">
            {neighbors.map((n) => (
              <CardListRow
                key={n.oracleId}
                oracleId={n.oracleId}
                name={n.card.name}
                count={n.deckCount}
                manaCost={n.card.manaCost}
                onAdd={(qty) => onAddNeighbor(n.oracleId, qty)}
                onRemove={(qty) => onRemoveNeighbor(n.oracleId, qty)}
                onClickName={() => {
                  setHover(null);
                  onHoverNeighbor(null);
                  onSelectNeighbor(n.oracleId);
                }}
                onMouseEnter={(ev) => {
                  if (n.card.imageUrl) {
                    setHover({ url: n.card.imageUrl, x: ev.clientX, y: ev.clientY });
                  }
                  onHoverNeighbor(n.oracleId);
                }}
                onMouseMove={(ev) =>
                  setHover((h) => (h ? { ...h, x: ev.clientX, y: ev.clientY } : null))
                }
                onMouseLeave={() => {
                  setHover(null);
                  onHoverNeighbor(null);
                }}
                rightSlot={<NeighborBadges stat={n} />}
              />
            ))}
          </ul>
          {hover && (
            <HoverCardPreview mode="cursor" url={hover.url} x={hover.x} y={hover.y} width={240} />
          )}
        </div>
      )}

      {confirmingRemoveAll && (
        <ConfirmModal
          title="Remove all copies?"
          message={
            <>
              Remove all {deckCount} copies of <span className="font-semibold text-neutral-100">{node.card.name}</span>?
            </>
          }
          confirmLabel="Remove"
          destructive
          onConfirm={() => { setConfirmingRemoveAll(false); onRemoveAll(); }}
          onCancel={() => setConfirmingRemoveAll(false)}
        />
      )}
    </aside>
  );
}

function NeighborBadges({ stat }: { stat: NeighborStat }) {
  return (
    <span className="ml-1 flex shrink-0 items-center gap-1.5">
      {stat.cls === 'bridge' && (
        <span
          data-bridge-indicator
          title="Bridge: reachable via the selected card"
          aria-label="Bridge neighbor"
          className="inline-block h-2 w-2 rounded-full border border-dashed border-neutral-400"
        />
      )}
      <span className="flex items-center gap-0.5" aria-label="Shared families">
        {stat.familyBreakdown.map((b) => {
          const fd = FAMILY_DEFS.get(b.familyId);
          if (!fd) return null;
          return (
            <span
              key={b.familyId}
              title={`${fd.label} · ${b.count}`}
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: fd.color }}
            />
          );
        })}
      </span>
      <span
        className="font-mono text-[10px] text-neutral-500"
        title={`${stat.totalEdgeCount} shared interaction${stat.totalEdgeCount === 1 ? '' : 's'}`}
      >
        ×{stat.totalEdgeCount}
      </span>
    </span>
  );
}
