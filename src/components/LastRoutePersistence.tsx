import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const STORAGE_KEY = 'mbourake_last_route';
const BACKUP_STORAGE_KEY = 'mbourake_last_route_backup';
const BACKUP_TTL_MS = 60 * 1000;

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
      localStorage.setItem(
        BACKUP_STORAGE_KEY,
        JSON.stringify({
          route: full,
          ts: Date.now(),
        })
      );
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
      let saved = sessionStorage.getItem(STORAGE_KEY);
      if (!saved) {
        const rawBackup = localStorage.getItem(BACKUP_STORAGE_KEY);
        if (rawBackup) {
          const parsed = JSON.parse(rawBackup) as { route?: string; ts?: number };
          const isFresh = typeof parsed.ts === 'number' && Date.now() - parsed.ts <= BACKUP_TTL_MS;
          if (isFresh && parsed.route) {
            saved = parsed.route;
          }
        }
      }
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
