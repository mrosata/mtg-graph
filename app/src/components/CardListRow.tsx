import type { MouseEvent, ReactNode } from 'react';
import ManaCost from './ManaCost';

type Props = {
  oracleId: string;
  name: string;
  count: number;
  manaCost: string | null;
  onAdd: (qty: number) => void | Promise<void>;
  onRemove: (qty: number) => void | Promise<void>;
  onClickName?: () => void;
  onMouseEnter?: (ev: MouseEvent) => void;
  onMouseMove?: (ev: MouseEvent) => void;
  onMouseLeave?: () => void;
  rightSlot?: ReactNode;
  className?: string;
};

export default function CardListRow({
  oracleId,
  name,
  count,
  manaCost,
  onAdd,
  onRemove,
  onClickName,
  onMouseEnter,
  onMouseMove,
  onMouseLeave,
  rightSlot,
  className,
}: Props) {
  return (
    <li
      data-oracle-id={oracleId}
      data-testid="card-row"
      onMouseEnter={onMouseEnter}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className={`group flex items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-neutral-900/50${className ? ' ' + className : ''}`}
    >
      <CountControls count={count} onAdd={onAdd} onRemove={onRemove} />
      <button
        type="button"
        onClick={onClickName}
        className={`flex min-w-0 flex-1 items-center gap-2 truncate text-left ${onClickName ? 'cursor-pointer hover:text-amber-200' : 'cursor-default'}`}
      >
        <ManaCost cost={manaCost} />
        <span className="truncate">{name}</span>
      </button>
      {rightSlot}
    </li>
  );
}

type CountControlsProps = {
  count: number;
  onAdd: (qty: number) => void | Promise<void>;
  onRemove: (qty: number) => void | Promise<void>;
};

export function CountControls({ count, onAdd, onRemove }: CountControlsProps) {
  const handleAdd = (e: MouseEvent) => {
    e.stopPropagation();
    onAdd(e.shiftKey ? 4 : 1);
  };
  const handleRemove = (e: MouseEvent) => {
    e.stopPropagation();
    if (count === 0) return;
    onRemove(e.shiftKey ? Math.min(4, count) : 1);
  };
  return (
    <div
      role="group"
      aria-label="Adjust copies"
      onClick={(e) => e.stopPropagation()}
      className="inline-flex shrink-0 select-none overflow-hidden rounded border border-neutral-800 bg-neutral-950 transition group-hover:border-neutral-700"
    >
      <button
        type="button"
        onClick={handleRemove}
        disabled={count === 0}
        aria-label="Remove one copy"
        title="Click: remove 1 • Shift+Click: remove up to 4"
        className="flex h-6 w-6 items-center justify-center text-neutral-400 transition hover:bg-neutral-800 hover:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-amber-400 disabled:cursor-not-allowed disabled:text-neutral-700 disabled:hover:bg-transparent"
      >
        <svg viewBox="0 0 16 16" width="10" height="10" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M3 8h10" />
        </svg>
      </button>
      <span
        className="flex h-6 min-w-[1.5rem] items-center justify-center border-x border-neutral-800 px-1 font-mono text-xs font-semibold text-neutral-200"
        aria-label={`${count} in deck`}
      >
        {count}
      </span>
      <button
        type="button"
        onClick={handleAdd}
        aria-label="Add one copy"
        title="Click: add 1 • Shift+Click: add 4"
        className="flex h-6 w-6 items-center justify-center text-amber-300 transition hover:bg-amber-500/15 hover:text-amber-200 focus:outline-none focus:ring-1 focus:ring-amber-400"
      >
        <svg viewBox="0 0 16 16" width="10" height="10" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M8 3v10M3 8h10" />
        </svg>
      </button>
    </div>
  );
}
