import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';

// jsdom doesn't provide ResizeObserver; GraphCanvas (and any future component
// using it) needs a minimal stub for jsdom-based tests.
if (typeof globalThis.ResizeObserver === 'undefined') {
  class ResizeObserverStub {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  (globalThis as unknown as { ResizeObserver: typeof ResizeObserverStub }).ResizeObserver = ResizeObserverStub;
}
