import { describe, it, expect } from 'vitest';
import { relativeTime } from './relativeTime';

const NOW = new Date('2026-05-22T12:00:00Z').getTime();

describe('relativeTime', () => {
  it('returns "just now" for timestamps within the last minute', () => {
    expect(relativeTime(NOW - 30_000, NOW)).toBe('just now');
  });

  it('returns minutes for under an hour', () => {
    expect(relativeTime(NOW - 5 * 60_000, NOW)).toBe('5m ago');
    expect(relativeTime(NOW - 59 * 60_000, NOW)).toBe('59m ago');
  });

  it('returns hours for under a day', () => {
    expect(relativeTime(NOW - 3 * 3_600_000, NOW)).toBe('3h ago');
    expect(relativeTime(NOW - 23 * 3_600_000, NOW)).toBe('23h ago');
  });

  it('returns days for under a week', () => {
    expect(relativeTime(NOW - 2 * 86_400_000, NOW)).toBe('2d ago');
    expect(relativeTime(NOW - 6 * 86_400_000, NOW)).toBe('6d ago');
  });

  it('returns weeks for under a month', () => {
    expect(relativeTime(NOW - 14 * 86_400_000, NOW)).toBe('2w ago');
  });

  it('returns "Nmo ago" for under a year', () => {
    expect(relativeTime(NOW - 90 * 86_400_000, NOW)).toBe('3mo ago');
  });

  it('returns "Ny ago" for a year or more', () => {
    expect(relativeTime(NOW - 400 * 86_400_000, NOW)).toBe('1y ago');
  });
});
