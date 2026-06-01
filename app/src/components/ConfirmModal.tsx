import { useEffect, type ReactNode } from 'react';

type Props = {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
};

export default function ConfirmModal({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCancel]);

  const confirmClass = destructive
    ? 'focus-brass rounded bg-mana-r px-3.5 py-1.5 text-sm font-semibold text-ink-bg transition-colors hover:bg-mana-r/90'
    : 'focus-brass rounded bg-brass px-3.5 py-1.5 text-sm font-semibold text-ink-bg transition-colors hover:bg-brass-hi';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-bg/80 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="w-96 overflow-hidden rounded-lg border border-ink-line-2 bg-ink-panel shadow-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
      >
        <div className="brass-hairline" />
        <div className="p-6">
          <h3 id="confirm-modal-title" className="font-head text-2xl text-vellum">
            {title}
          </h3>
          <div className="mt-3 text-sm text-vellum-mute">{message}</div>
          <div className="mt-5 flex justify-end gap-2">
            <button
              onClick={onCancel}
              className="focus-brass rounded border border-ink-line-2 bg-ink-raised px-3.5 py-1.5 text-sm text-vellum-mute transition-colors hover:border-brass/40 hover:text-brass-hi"
            >
              {cancelLabel}
            </button>
            <button onClick={onConfirm} className={confirmClass}>
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
