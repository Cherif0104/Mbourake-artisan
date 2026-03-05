import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const STORAGE_KEY = 'mbourake_last_route';

const EXCLUDED_PATHS = [
  '/',
  '/onboard',
  '/compte-suspendu',
];

function isExcluded(pathname: string): boolean {
  if (EXCLUDED_PATHS.includes(pathname)) return true;
  if (pathname.startsWith('/invite/')) return true;
  if (pathname.startsWith('/download/')) return true;
  return false;
}

/**
 * Sauvegarde la route courante dans sessionStorage et restaure la dernière route
 * quand l'utilisateur revient sur / (évite le retour systématique à la landing).
 */
export function LastRoutePersistence() {
  const location = useLocation();
  const navigate = useNavigate();
  const { loading: authLoading } = useAuth();
  const hasRestoredRef = useRef(false);

  // Sauvegarder la route à chaque navigation (sauf routes exclues)
  useEffect(() => {
    const { pathname, search } = location;
    const full = pathname + search;
    if (isExcluded(pathname)) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, full);
    } catch {
      // ignore
    }
  }, [location.pathname, location.search]);

  // Restaurer la dernière route si on est sur / (connecté ou non) pour éviter le retour à l'accueil au retour sur l'app
  useEffect(() => {
    if (authLoading) return;
    if (location.pathname !== '/') return;
    if (location.search && location.search.includes('recherche=1')) return;
    if (hasRestoredRef.current) return;

    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (!saved || saved === '/' || !saved.startsWith('/')) return;
      if (isExcluded(saved.split('?')[0])) return;

      hasRestoredRef.current = true;
      navigate(saved, { replace: true });
    } catch {
      // ignore
    }
  }, [authLoading, location.pathname, location.search, navigate]);

  return null;
}
