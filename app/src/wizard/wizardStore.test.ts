import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useWizardStore, STORAGE_KEY, _resetForTesting } from './wizardStore';
import { ALL_TOUR_IDS } from './selectors';

describe('wizardStore', () => {
  beforeEach(() => {
    localStorage.clear();
    _resetForTesting();
  });

  it('starts with no active tour, empty seenTours, stepIndex 0', () => {
    const s = useWizardStore.getState();
    expect(s.activeTour).toBeNull();
    expect(s.stepIndex).toBe(0);
    expect(s.seenTours.size).toBe(0);
  });

  it('openTour sets activeTour and resets stepIndex', () => {
    useWizardStore.getState().setStepIndex(3);
    useWizardStore.getState().openTour('global');
    const s = useWizardStore.getState();
    expect(s.activeTour).toBe('global');
    expect(s.stepIndex).toBe(0);
  });

  it('closeTour clears activeTour', () => {
    useWizardStore.getState().openTour('browse');
    useWizardStore.getState().closeTour();
    expect(useWizardStore.getState().activeTour).toBeNull();
  });

  it('markSeen adds to seenTours and persists to localStorage', () => {
    useWizardStore.getState().markSeen('global');
    expect(useWizardStore.getState().seenTours.has('global')).toBe(true);
    const persisted = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    expect(persisted).toContain('global');
  });

  it('skipAll marks every tour seen and persists', () => {
    useWizardStore.getState().skipAll();
    const seen = useWizardStore.getState().seenTours;
    for (const id of ALL_TOUR_IDS) expect(seen.has(id)).toBe(true);
    const persisted = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    expect(persisted.length).toBe(ALL_TOUR_IDS.length);
  });

  it('openTour({ reset: true }) replays a seen tour without removing seenness', () => {
    useWizardStore.getState().markSeen('global');
    useWizardStore.getState().openTour('global', { reset: true });
    expect(useWizardStore.getState().activeTour).toBe('global');
    expect(useWizardStore.getState().seenTours.has('global')).toBe(true);
  });

  it('reads seenTours from localStorage on init', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['global', 'browse']));
    _resetForTesting();
    const s = useWizardStore.getState();
    expect(s.seenTours.has('global')).toBe(true);
    expect(s.seenTours.has('browse')).toBe(true);
    expect(s.seenTours.has('decks')).toBe(false);
  });

  it('survives localStorage throwing on write', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(() => useWizardStore.getState().markSeen('global')).not.toThrow();
    // In-memory mutation still happened
    expect(useWizardStore.getState().seenTours.has('global')).toBe(true);
    setItemSpy.mockRestore();
  });

  it('survives localStorage throwing on read at init', () => {
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('disabled');
    });
    expect(() => _resetForTesting()).not.toThrow();
    expect(useWizardStore.getState().seenTours.size).toBe(0);
    getItemSpy.mockRestore();
  });

  it('ignores junk in localStorage', () => {
    localStorage.setItem(STORAGE_KEY, '{"not":"an array"}');
    _resetForTesting();
    expect(useWizardStore.getState().seenTours.size).toBe(0);
  });
});
