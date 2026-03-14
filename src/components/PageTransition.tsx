import { useLayoutEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { LoadingOverlay } from './LoadingOverlay';

// Routes qui affichent déjà leur propre LoadingOverlay — on n'affiche pas PageTransition pour éviter le double overlay.
// Liste étendue pour couvrir toutes les pages avec chargement propre (évite enchaînement/superposition).
const ROUTES_WITH_OWN_LOADING = [
  '/',
  '/dashboard',
  '/revisions',
  '/projects',
  '/credits',
  '/verification',
  '/edit-profile',
  '/conversations',
  '/notifications',
  '/artisans',
  '/category',
  '/marketplace',
  '/profile',
  '/settings',
  '/expenses',
  '/invoices',
  '/avis-recus',
  '/create-project',
  '/my-products',
  '/my-certifications',
  '/commandes',
  '/my-orders',
  '/my-shop-orders',
  '/panier',
  '/panier/checkout',
  '/orders',
  '/favorites',
  '/chambre',
  '/admin',
];

function shouldSkipTransition(pathname: string) {
  return ROUTES_WITH_OWN_LOADING.some((r) => {
    if (r === '/') return pathname === '/';
    return pathname === r || pathname.startsWith(r + '/');
  });
}

/**
 * Affiche l'overlay de chargement validé lors des transitions de page (changement de route).
 * L'overlay est affiché dès le même rendu que le changement d'URL pour éviter que l'ancienne page ne réapparaisse brièvement.
 * Sauf sur les routes qui gèrent déjà leur propre overlay (ex. dashboard) pour éviter le double overlay.
 */
export function PageTransition() {
  const location = useLocation();
  const pathname = location.pathname;
  const prevPathRef = useRef(pathname);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [displayContent, setDisplayContent] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animationRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pathJustChanged = prevPathRef.current !== pathname;
  const showOverlay = !shouldSkipTransition(pathname) && (displayContent || pathJustChanged);

  useLayoutEffect(() => {
    if (shouldSkipTransition(pathname)) return;

    prevPathRef.current = pathname;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (animationRef.current) clearTimeout(animationRef.current);

    setIsTransitioning(true);
    setDisplayContent(true);

    timeoutRef.current = setTimeout(() => {
      setIsTransitioning(false);
      animationRef.current = setTimeout(() => setDisplayContent(false), 200);
    }, 350);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (animationRef.current) clearTimeout(animationRef.current);
    };
  }, [pathname]);

  if (!showOverlay) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] transition-opacity duration-300 ${isTransitioning ? 'opacity-100' : 'opacity-0'}`}
      style={{ pointerEvents: isTransitioning ? 'auto' : 'none' }}
    >
      <LoadingOverlay contentOnly />
    </div>
  );
}
