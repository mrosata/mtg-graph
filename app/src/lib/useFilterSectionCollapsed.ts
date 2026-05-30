import { useCallback, useState } from 'react';

function read(key: string, defaultValue: boolean): boolean {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return defaultValue;
    return raw === 'true';
  } catch {
    return defaultValue;
  }
}

function write(key: string, value: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, value ? 'true' : 'false');
  } catch {
    // ignore — private mode etc.
  }
}

export function useFilterSectionCollapsed(
  key: string | null,
  defaultCollapsed: boolean,
): readonly [boolean, (value: boolean) => void] {
  const [collapsed, setCollapsed] = useState<boolean>(() =>
    key === null ? defaultCollapsed : read(key, defaultCollapsed),
  );
  const set = useCallback(
    (value: boolean) => {
      if (key !== null) write(key, value);
      setCollapsed(value);
    },
    [key],
  );
  return [collapsed, set] as const;
}
