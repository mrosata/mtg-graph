import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDocumentMeta, SITE_URL, SITE_NAME } from './seo';

describe('SITE_URL / SITE_NAME', () => {
  it('exposes the canonical site URL without trailing slash', () => {
    expect(SITE_URL).toBe('https://mtg-graph.com');
  });

  it('exposes the site name', () => {
    expect(SITE_NAME).toBe('MTG Graph');
  });
});

describe('useDocumentMeta', () => {
  let originalTitle: string;

  beforeEach(() => {
    originalTitle = document.title;
    document.title = 'Original Title';
    document.querySelectorAll('meta[name="description"]').forEach((el) => el.remove());
  });

  afterEach(() => {
    document.title = originalTitle;
    document.querySelectorAll('meta[name="description"]').forEach((el) => el.remove());
  });

  it('sets document.title on mount', () => {
    renderHook(() => useDocumentMeta('New Title'));
    expect(document.title).toBe('New Title');
  });

  it('restores document.title on unmount', () => {
    const { unmount } = renderHook(() => useDocumentMeta('New Title'));
    expect(document.title).toBe('New Title');
    unmount();
    expect(document.title).toBe('Original Title');
  });

  it('updates meta description when one exists', () => {
    const meta = document.createElement('meta');
    meta.setAttribute('name', 'description');
    meta.setAttribute('content', 'Original description.');
    document.head.appendChild(meta);

    renderHook(() => useDocumentMeta('New Title', 'New description.'));
    expect(meta.getAttribute('content')).toBe('New description.');
  });

  it('restores meta description on unmount', () => {
    const meta = document.createElement('meta');
    meta.setAttribute('name', 'description');
    meta.setAttribute('content', 'Original description.');
    document.head.appendChild(meta);

    const { unmount } = renderHook(() =>
      useDocumentMeta('New Title', 'New description.'),
    );
    unmount();
    expect(meta.getAttribute('content')).toBe('Original description.');
  });

  it('does not touch description tag when description arg is omitted', () => {
    const meta = document.createElement('meta');
    meta.setAttribute('name', 'description');
    meta.setAttribute('content', 'Original description.');
    document.head.appendChild(meta);

    renderHook(() => useDocumentMeta('New Title'));
    expect(meta.getAttribute('content')).toBe('Original description.');
  });

  it('no-ops on description when meta tag does not exist', () => {
    expect(() =>
      renderHook(() => useDocumentMeta('New Title', 'Whatever.')),
    ).not.toThrow();
    expect(document.querySelector('meta[name="description"]')).toBeNull();
  });
});
