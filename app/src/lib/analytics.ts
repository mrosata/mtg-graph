// Thin wrapper around GA4's gtag. Components never call gtag directly; if the
// script is blocked or absent, every helper silently no-ops.
type EventParams = Record<string, string | number>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackEvent(name: string, params: EventParams = {}): void {
  if (typeof window.gtag !== 'function') return;
  window.gtag('event', name, params);
}

export function trackPageView(path: string): void {
  trackEvent('page_view', {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
  });
}

export function trackCardViewed(cardName: string): void {
  trackEvent('card_viewed', { card_name: cardName });
}

export type FilterType = 'color' | 'set' | 'tag' | 'rarity';

export function trackFilterApplied(filterType: FilterType): void {
  trackEvent('filter_applied', { filter_type: filterType });
}

const SEARCH_DEBOUNCE_MS = 1500;
const searchTimers: Partial<Record<'name' | 'text', ReturnType<typeof setTimeout>>> = {};

// Search inputs fire onChange per keystroke; only report a search once typing
// stops, and never report the (private) query text — only its length.
// Each field gets its own timer so interleaved typing in different fields
// doesn't cancel each other's pending events.
export function trackSearchDebounced(field: 'name' | 'text', queryLength: number): void {
  clearTimeout(searchTimers[field]);
  if (queryLength === 0) return;
  searchTimers[field] = setTimeout(() => {
    trackEvent('search_performed', { field, query_length: queryLength });
  }, SEARCH_DEBOUNCE_MS);
}

export function trackInteractionExplored(): void {
  trackEvent('interaction_explored');
}

export function trackDeckCreated(): void {
  trackEvent('deck_created');
}

export function trackDeckCardAdded(deckSize: number): void {
  trackEvent('deck_card_added', { deck_size: deckSize });
}

export function trackDeckExported(format: 'arena' | 'dek'): void {
  trackEvent('deck_exported', { export_format: format });
}

export function trackMtgaImportUsed(): void {
  trackEvent('mtga_import_used');
}
