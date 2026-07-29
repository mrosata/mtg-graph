import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  trackEvent,
  trackPageView,
  trackCardViewed,
  trackDeckExported,
  trackSearchDebounced,
} from './analytics';

describe('analytics', () => {
  afterEach(() => {
    delete window.gtag;
    vi.useRealTimers();
  });

  it('no-ops without throwing when window.gtag is absent', () => {
    expect(() => trackEvent('card_viewed', { card_name: 'Llanowar Elves' })).not.toThrow();
  });

  it('forwards event name and params to gtag', () => {
    const gtag = vi.fn();
    window.gtag = gtag;
    trackEvent('deck_created');
    expect(gtag).toHaveBeenCalledWith('event', 'deck_created', {});
  });

  it('trackPageView sends page_path, page_location, and page_title', () => {
    const gtag = vi.fn();
    window.gtag = gtag;
    document.title = 'Test Page';
    trackPageView('/decks');
    expect(gtag).toHaveBeenCalledWith(
      'event',
      'page_view',
      expect.objectContaining({
        page_path: '/decks',
        page_location: expect.any(String),
        page_title: 'Test Page',
      }),
    );
    document.title = '';
  });

  it('trackCardViewed sends card_name', () => {
    const gtag = vi.fn();
    window.gtag = gtag;
    trackCardViewed('Doctor Doom');
    expect(gtag).toHaveBeenCalledWith('event', 'card_viewed', { card_name: 'Doctor Doom' });
  });

  it('trackDeckExported sends export_format', () => {
    const gtag = vi.fn();
    window.gtag = gtag;
    trackDeckExported('arena');
    expect(gtag).toHaveBeenCalledWith('event', 'deck_exported', { export_format: 'arena' });
  });

  it('debounces search: only the last call fires, 1500ms after typing stops', () => {
    vi.useFakeTimers();
    const gtag = vi.fn();
    window.gtag = gtag;
    trackSearchDebounced('name', 3);
    trackSearchDebounced('name', 5);
    expect(gtag).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1500);
    expect(gtag).toHaveBeenCalledTimes(1);
    expect(gtag).toHaveBeenCalledWith('event', 'search_performed', {
      field: 'name',
      query_length: 5,
    });
  });

  it('clearing the search box cancels the pending event', () => {
    vi.useFakeTimers();
    const gtag = vi.fn();
    window.gtag = gtag;
    trackSearchDebounced('text', 4);
    trackSearchDebounced('text', 0);
    vi.advanceTimersByTime(3000);
    expect(gtag).not.toHaveBeenCalled();
  });

  it('interleaved fields each fire their own event', () => {
    vi.useFakeTimers();
    const gtag = vi.fn();
    window.gtag = gtag;
    trackSearchDebounced('name', 3);
    trackSearchDebounced('text', 7);
    vi.advanceTimersByTime(1500);
    expect(gtag).toHaveBeenCalledTimes(2);
    expect(gtag).toHaveBeenCalledWith('event', 'search_performed', {
      field: 'name',
      query_length: 3,
    });
    expect(gtag).toHaveBeenCalledWith('event', 'search_performed', {
      field: 'text',
      query_length: 7,
    });
  });
});
