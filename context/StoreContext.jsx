'use client';

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { fetchShopeeSession, fetchStores, setActiveStoreApi, deleteStoreApi, clearApiCache } from '../lib/api';

const StoreContext = createContext(null);

const STORE_STORAGE_KEY = 'selected_store_id';

export function StoreProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const [stores, setStores] = useState([]);
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [loading, setLoading] = useState(true);

  const loadStores = useCallback(async () => {
    if (!user) {
      setStores([]);
      setSelectedStoreId('');
      setLoading(false);
      return;
    }

    try {
      const data = await fetchShopeeSession();
      let storeList = [];
      if (data?.stores && Array.isArray(data.stores)) {
        storeList = data.stores;
      } else {
        const fallbackList = await fetchStores();
        storeList = fallbackList || [];
      }
      setStores(storeList);

      // Validate selectedStoreId against available stores
      setSelectedStoreId((prevId) => {
        if (prevId && storeList.some((s) => s.storeId === prevId)) {
          return prevId;
        }
        const saved = typeof window !== 'undefined' ? localStorage.getItem(STORE_STORAGE_KEY) : null;
        if (saved && storeList.some((s) => s.storeId === saved)) {
          return saved;
        }
        const firstActive = storeList.find((s) => s.isActive)?.storeId;
        const fallbackId = firstActive || storeList[0]?.storeId || '';
        if (typeof window !== 'undefined') {
          if (fallbackId) localStorage.setItem(STORE_STORAGE_KEY, fallbackId);
          else localStorage.removeItem(STORE_STORAGE_KEY);
        }
        return fallbackId;
      });
    } catch (err) {
      console.warn('[StoreContext] Failed to load stores:', err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      loadStores();
    }
  }, [authLoading, loadStores]);

  // Listen for snapshot updates to reload store list
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleRefresh = () => {
      loadStores();
    };
    window.addEventListener('snapshot:updated', handleRefresh);
    return () => window.removeEventListener('snapshot:updated', handleRefresh);
  }, [loadStores]);

  const switchStore = useCallback((storeId) => {
    setSelectedStoreId(storeId || '');
    if (typeof window !== 'undefined') {
      if (storeId) {
        localStorage.setItem(STORE_STORAGE_KEY, storeId);
      } else {
        localStorage.removeItem(STORE_STORAGE_KEY);
      }
      clearApiCache();
      window.dispatchEvent(new Event('snapshot:updated'));
    }
  }, []);

  const toggleStoreActive = useCallback(async (storeId, isActive) => {
    const res = await setActiveStoreApi(storeId, isActive);
    if (res.success) {
      await loadStores();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('snapshot:updated'));
      }
    }
    return res;
  }, [loadStores]);

  const removeStore = useCallback(async (storeId) => {
    const res = await deleteStoreApi(storeId);
    if (res.success) {
      if (selectedStoreId === storeId) {
        switchStore('');
      }
      await loadStores();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('snapshot:updated'));
      }
    }
    return res;
  }, [selectedStoreId, switchStore, loadStores]);

  const selectedStore = useMemo(() => {
    if (!selectedStoreId) return null;
    return stores.find((s) => s.storeId === selectedStoreId) || null;
  }, [stores, selectedStoreId]);

  const value = useMemo(() => ({
    stores,
    selectedStoreId,
    selectedStore,
    loading,
    switchStore,
    refreshStores: loadStores,
    toggleStoreActive,
    removeStore,
  }), [stores, selectedStoreId, selectedStore, loading, switchStore, loadStores, toggleStoreActive, removeStore]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}
