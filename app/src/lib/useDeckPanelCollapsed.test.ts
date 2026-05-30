import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDeckPanelCollapsed, STORAGE_KEY } from './useDeckPanelCollapsed';

beforeEach(() => {
  window.localStorage.clear();
});

describe('useDeckPanelCollapsed', () => {
  it('defaults to false', () => {
    const { result } = renderHook(() => useDeckPanelCollapsed());
    expect(result.current[0]).toBe(false);
  });

  it('hydrates from localStorage', () => {
    window.localStorage.setItem(STORAGE_KEY, 'true');
    const { result } = renderHook(() => useDeckPanelCollapsed());
    expect(result.current[0]).toBe(true);
  });

  it('persists updates to localStorage', () => {
    const { result } = renderHook(() => useDeckPanelCollapsed());
    act(() => result.current[1](true));
    expect(result.current[0]).toBe(true);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('true');
  });

  it('persists false explicitly', () => {
    window.localStorage.setItem(STORAGE_KEY, 'true');
    const { result } = renderHook(() => useDeckPanelCollapsed());
    act(() => result.current[1](false));
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('false');
  });
});
