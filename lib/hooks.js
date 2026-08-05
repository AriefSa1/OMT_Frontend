'use client';

import { useEffect, useRef, useState } from 'react';

export function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function useSnapshotRefresh(onRefresh) {
  const refreshRef = useRef(onRefresh);

  useEffect(() => {
    refreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    const handler = () => refreshRef.current?.();
    window.addEventListener('snapshot:updated', handler);
    return () => window.removeEventListener('snapshot:updated', handler);
  }, []);
}
