import MtgaImportPanel from './MtgaImportPanel';

type Props = { onClose: () => void };

export default function MtgaImportModal({ onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-bg/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-[40rem] max-w-[92vw] overflow-hidden rounded-lg border border-ink-line-2 bg-ink-panel shadow-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mtga-import-title"
      >
        <div className="brass-hairline" />
        <div className="p-6">
          <h3 id="mtga-import-title" className="font-head text-2xl text-vellum">
            Import MTGA decks
          </h3>
          <div className="mt-3">
            <MtgaImportPanel mode="decks-only" onClose={onClose} />
          </div>
        </div>
      </div>
    </div>
  );
}
