import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { LoadingOverlay } from '../components/LoadingOverlay';

// Retirer l'overlay initial du HTML dès que React a monté (évite page blanche au reload)
function removeInitialLoadingOverlay() {
  const el = document.getElementById('app-loading');
  if (el) el.remove();
}

type LoadingId = string;

interface LoadingContextType {
  /** Enregistre un état de chargement. Retourne une fonction pour retirer. */
  setLoading: (loading: boolean, id?: LoadingId) => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

const HIDE_DELAY_MS = 150;

/**
 * Un seul overlay global au niveau App — évite les enchaînements de plusieurs overlays
 * (PrivateRoute → RequireNotSuspended → Dashboard) qui causent des flashs.
 */
export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [loadingIds, setLoadingIds] = useState<Set<LoadingId>>(new Set());
  const [visible, setVisible] = useState(false);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Retirer l'overlay HTML initial : dès qu'on affiche le nôtre, ou après 100ms (pages sans loading)
  useEffect(() => {
    if (visible) removeInitialLoadingOverlay();
  }, [visible]);
  useEffect(() => {
    const t = setTimeout(removeInitialLoadingOverlay, 100);
    return () => clearTimeout(t);
  }, []);

  const setLoading = useCallback((loading: boolean, id?: LoadingId | null) => {
    if (id == null && !loading) return;
    const key = id ?? `loading-${Math.random().toString(36).slice(2)}`;
    setLoadingIds((prev) => {
      const next = new Set(prev);
      if (loading) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
  }, []);

  // Dériver la visibilité avec délai avant de masquer (évite flash entre overlays enchaînés)
  useEffect(() => {
    const count = loadingIds.size;
    if (count > 0) {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
      setVisible(true);
    } else {
      hideTimeoutRef.current = setTimeout(() => {
        hideTimeoutRef.current = null;
        setVisible(false);
      }, HIDE_DELAY_MS);
      return () => {
        if (hideTimeoutRef.current) {
          clearTimeout(hideTimeoutRef.current);
        }
      };
    }
  }, [loadingIds.size]);

  return (
    <LoadingContext.Provider value={{ setLoading }}>
      {children}
      {visible && <LoadingOverlay />}
    </LoadingContext.Provider>
  );
}

export function useLoadingContext() {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoadingContext must be used within a LoadingProvider');
  }
  return context;
}

/**
 * Hook pour signaler un état de chargement au global overlay.
 * Évite les remplacements successifs d'overlays (flash).
 */
export function useGlobalLoading(loading: boolean, id?: string) {
  const { setLoading } = useLoadingContext();
  const idRef = useRef<string | null>(null);

  useEffect(() => {
    if (loading) {
      idRef.current = id ?? `gl-${Math.random().toString(36).slice(2, 9)}`;
      setLoading(true, idRef.current);
    }
    return () => {
      if (idRef.current) {
        setLoading(false, idRef.current);
        idRef.current = null;
      }
    };
  }, [loading, id, setLoading]);
}
