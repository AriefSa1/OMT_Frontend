'use client';

import { useEffect, useState } from 'react';

export function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function useSnapshotRefresh(onRefresh) {
  useEffect(() => {
    const handler = () => onRefresh();
    window.addEventListener('snapshot:updated', handler);
    return () => window.removeEventListener('snapshot:updated', handler);
  }, [onRefresh]);
}
