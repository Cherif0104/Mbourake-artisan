import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Composant pour afficher un overlay premium lors des transitions de page
 * Masque les bugs visuels pendant le chargement et améliore l'UX
 * Garantit une seule instance à la fois (pas de doublons)
 */
export function PageTransition() {
  const location = useLocation();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [displayContent, setDisplayContent] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const animationRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Nettoyer les timers précédents pour éviter les doublons
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (animationRef.current) {
      clearTimeout(animationRef.current);
    }

    // Démarrer la transition
    setIsTransitioning(true);
    setDisplayContent(true);

    // Timer pour masquer l'overlay après un court délai
    timeoutRef.current = setTimeout(() => {
      setIsTransitioning(false);
      // Attendre la fin de l'animation avant de masquer complètement
      animationRef.current = setTimeout(() => {
        setDisplayContent(false);
      }, 300);
    }, 500); // Durée totale : 500ms d'affichage + 300ms d'animation = 800ms max

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, [location.pathname]);

  // Ne rien afficher si pas de transition
  if (!displayContent) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-[#FDFCFB] via-white to-orange-50/30 transition-opacity duration-300 ${
        isTransitioning ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ pointerEvents: isTransitioning ? 'auto' : 'none' }}
      aria-hidden="true"
    >
      {/* Illustration premium avec logo Mbourake stylisé */}
      <div className="flex flex-col items-center gap-6 px-4">
        {/* Logo animé */}
        <div className="relative">
          {/* Cercle de fond avec animation pulse */}
          <div className="absolute inset-0 rounded-full bg-brand-500/20 animate-ping" />
          <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-lg">
            <svg
              viewBox="0 0 100 100"
              className="w-12 h-12 text-white"
              fill="currentColor"
            >
              {/* Logo M stylisé */}
              <path
                d="M 20 30 L 20 70 L 30 70 L 30 45 L 50 65 L 70 45 L 70 70 L 80 70 L 80 30 L 70 30 L 50 50 L 30 30 Z"
                fill="currentColor"
                className="animate-pulse"
              />
            </svg>
          </div>
        </div>

        {/* Message personnalisé */}
        <div className="text-center max-w-xs">
          <p className="text-base font-black text-gray-900 mb-2">
            La première plateforme
          </p>
          <p className="text-base font-black text-brand-600 mb-3">
            faite pour les artisans au Sénégal
          </p>
          
          {/* Texte de chargement avec animation */}
          <div className="flex items-center justify-center gap-2">
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-brand-500 animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 rounded-full bg-brand-500 animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 rounded-full bg-brand-500 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-sm font-bold text-gray-500 ml-2">Chargement...</span>
          </div>
        </div>
      </div>

      {/* Styles inline pour animations personnalisées */}
      <style>{`
        @keyframes pulse-slow {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.1); opacity: 1; }
        }
        .animate-pulse-slow {
          animation: pulse-slow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
