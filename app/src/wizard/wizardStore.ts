import { create } from 'zustand';
import type { TourId } from './selectors';
import { ALL_TOUR_IDS } from './selectors';

export const STORAGE_KEY = 'mtg-graph:seen-tours:v1';

type WizardState = {
  activeTour: TourId | null;
  stepIndex: number;
  seenTours: Set<TourId>;
  openTour: (id: TourId, opts?: { reset?: boolean }) => void;
  closeTour: () => void;
  skipAll: () => void;
  markSeen: (id: TourId) => void;
  setStepIndex: (i: number) => void;
};

function readSeen(): Set<TourId> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    const valid = ALL_TOUR_IDS as readonly string[];
    return new Set(parsed.filter((x): x is TourId => typeof x === 'string' && valid.includes(x)));
  } catch {
    return new Set();
  }
}

function writeSeen(seen: Set<TourId>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(seen)));
  } catch {
    // Swallow; in-memory state remains authoritative for this session.
  }
}

function makeInitialState(): Pick<WizardState, 'activeTour' | 'stepIndex' | 'seenTours'> {
  return {
    activeTour: null,
    stepIndex: 0,
    seenTours: readSeen(),
  };
}

export const useWizardStore = create<WizardState>((set, get) => ({
  ...makeInitialState(),

  openTour: (id, _opts) => {
    // opts.reset is currently a no-op since openTour always resets stepIndex to 0.
    // The option is kept for forward compatibility (HelpMenu passes it explicitly
    // to signal "show this even if already seen", which is already the behavior).
    set({ activeTour: id, stepIndex: 0 });
  },

  closeTour: () => set({ activeTour: null, stepIndex: 0 }),

  skipAll: () => {
    const next = new Set<TourId>(ALL_TOUR_IDS);
    writeSeen(next);
    set({ seenTours: next });
  },

  markSeen: (id) => {
    const next = new Set(get().seenTours);
    next.add(id);
    writeSeen(next);
    set({ seenTours: next });
  },

  setStepIndex: (i) => set({ stepIndex: i }),
}));

// Test-only helper: re-reads localStorage and resets in-memory fields.
// Keep this exported so wizardStore.test.ts can re-init the singleton between cases.
export function _resetForTesting(): void {
  useWizardStore.setState(makeInitialState());
}
