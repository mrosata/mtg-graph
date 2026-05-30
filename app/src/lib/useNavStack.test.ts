import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNavStack } from './useNavStack';

function firePopstate() {
  window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }));
}

describe('useNavStack', () => {
  beforeEach(() => {
    // Reset history to a known baseline before each test. jsdom keeps the same
    // window across tests, so prior pushState calls would otherwise leak.
    window.history.replaceState(null, '', '/test');
  });

  afterEach(() => {
    window.history.replaceState(null, '', '/test');
  });

  it('starts with canBack=false and canForward=false', () => {
    const { result } = renderHook(() => useNavStack());
    expect(result.current.canBack).toBe(false);
    expect(result.current.canForward).toBe(false);
  });

  it('enables canBack after one markPush', () => {
    const { result } = renderHook(() => useNavStack());
    act(() => {
      window.history.pushState(null, '', '/test?selected=a');
      result.current.markPush();
    });
    expect(result.current.canBack).toBe(true);
    expect(result.current.canForward).toBe(false);
  });

  it('enables canForward after navigating back', () => {
    const { result } = renderHook(() => useNavStack());
    act(() => {
      window.history.pushState(null, '', '/test?selected=a');
      result.current.markPush();
    });
    // Simulate browser-back: replace current state with idx=0, fire popstate.
    act(() => {
      window.history.replaceState({ __navIdx: 0 }, '', '/test');
      firePopstate();
    });
    expect(result.current.canBack).toBe(false);
    expect(result.current.canForward).toBe(true);
  });

  it('re-disables canForward after back-then-new-push (forward stack truncates)', () => {
    const { result } = renderHook(() => useNavStack());
    // Push A then B.
    act(() => {
      window.history.pushState(null, '', '/test?selected=a');
      result.current.markPush();
    });
    act(() => {
      window.history.pushState(null, '', '/test?selected=b');
      result.current.markPush();
    });
    // Back to A.
    act(() => {
      window.history.replaceState({ __navIdx: 1 }, '', '/test?selected=a');
      firePopstate();
    });
    expect(result.current.canForward).toBe(true);
    // Push C from A — should clobber B in the forward stack.
    act(() => {
      window.history.pushState(null, '', '/test?selected=c');
      result.current.markPush();
    });
    expect(result.current.canForward).toBe(false);
    expect(result.current.canBack).toBe(true);
  });

  it('goBack and goForward delegate to window.history', () => {
    const { result } = renderHook(() => useNavStack());
    const backSpy = vi.spyOn(window.history, 'back').mockImplementation(() => {});
    const fwdSpy = vi.spyOn(window.history, 'forward').mockImplementation(() => {});
    result.current.goBack();
    result.current.goForward();
    expect(backSpy).toHaveBeenCalledTimes(1);
    expect(fwdSpy).toHaveBeenCalledTimes(1);
    backSpy.mockRestore();
    fwdSpy.mockRestore();
  });
});
