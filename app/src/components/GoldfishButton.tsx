import { useState } from 'react';
import GoldfishModal from './GoldfishModal';
import FishIcon from './icons/FishIcon';
import { TOUR_IDS } from '../wizard/selectors';

export default function GoldfishButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-tour-id={TOUR_IDS.goldfishButton}
        className="inline-flex items-center gap-1.5 rounded border border-neutral-700 px-2 py-1 text-xs text-neutral-200 hover:bg-neutral-900"
      >
        <FishIcon className="text-amber-400" />
        Goldfish
      </button>
      {open && <GoldfishModal onClose={() => setOpen(false)} />}
    </>
  );
}
