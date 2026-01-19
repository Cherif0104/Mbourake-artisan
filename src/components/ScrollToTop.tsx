import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Composant pour restaurer la position de scroll en haut
 * lors de chaque changement de route
 */
export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Scroller vers le haut immédiatement (sans animation)
    // Utiliser plusieurs méthodes pour garantir le scroll
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    
    // Pour les navigateurs qui supportent scrollRestoration
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, [pathname]);

  return null;
}
