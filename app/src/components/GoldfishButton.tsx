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
        className="focus-brass inline-flex items-center gap-1.5 rounded-full border border-mana-u/30 bg-mana-u/[0.06] px-3 py-1 text-xs text-vellum-mute transition-colors hover:border-mana-u/60 hover:bg-mana-u/[0.12] hover:text-vellum"
      >
        <FishIcon className="text-mana-u" />
        Goldfish
      </button>
      {open && <GoldfishModal onClose={() => setOpen(false)} />}
    </>
  );
}
