/**
 * Overlay de chargement validé — utilisé pour tous les chargements, refresh et transitions.
 * Même visuel partout : fond blanc, logo M, cercles flottants, "Chargement...".
 * @param contentOnly — si true, n'utilise pas fixed (remplit le parent positionné)
 */
export function LoadingOverlay({ className = '', contentOnly }: { className?: string; contentOnly?: boolean }) {
  return (
    <div
      className={`flex items-center justify-center bg-white ${contentOnly ? 'absolute inset-0' : 'fixed inset-0 z-[9999]'} ${className}`}
      style={{ pointerEvents: 'auto' }}
      aria-hidden="true"
      aria-busy="true"
    >
      {/* Éléments décoratifs flottants en arrière-plan */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-32 h-32 bg-brand-100 rounded-full blur-3xl opacity-40 animate-float-slow" style={{ animationDelay: '0s' }} />
        <div className="absolute top-40 right-20 w-24 h-24 bg-orange-100 rounded-full blur-2xl opacity-30 animate-float-medium" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-32 left-1/4 w-40 h-40 bg-brand-50 rounded-full blur-3xl opacity-35 animate-float-slow" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-20 right-1/3 w-28 h-28 bg-orange-50 rounded-full blur-2xl opacity-40 animate-float-medium" style={{ animationDelay: '1.5s' }} />
        <div className="absolute top-1/4 left-1/3 w-16 h-16 border-4 border-brand-200 rounded-2xl rotate-45 opacity-20 animate-float-fast" style={{ animationDelay: '0.5s' }} />
        <div className="absolute top-1/3 right-1/4 w-12 h-12 border-4 border-orange-200 rounded-lg rotate-12 opacity-25 animate-float-fast" style={{ animationDelay: '2.5s' }} />
        <div className="absolute bottom-1/4 left-1/5 w-20 h-20 border-4 border-brand-300 rounded-3xl rotate-45 opacity-15 animate-float-medium" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/6 w-3 h-3 bg-brand-400 rounded-full opacity-30 animate-float-fast" style={{ animationDelay: '0s' }} />
        <div className="absolute top-1/3 right-1/6 w-2 h-2 bg-orange-400 rounded-full opacity-35 animate-float-medium" style={{ animationDelay: '1.5s' }} />
        <div className="absolute bottom-1/3 right-1/5 w-4 h-4 bg-brand-300 rounded-full opacity-25 animate-float-slow" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative flex flex-col items-center gap-6 px-4 z-10">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-brand-500/10 animate-ping" />
          <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-xl">
            <svg viewBox="0 0 100 100" className="w-12 h-12 text-white" fill="currentColor">
              <path
                d="M 20 30 L 20 70 L 30 70 L 30 45 L 50 65 L 70 45 L 70 70 L 80 70 L 80 30 L 70 30 L 50 50 L 30 30 Z"
                fill="currentColor"
                className="animate-pulse"
              />
            </svg>
          </div>
        </div>
        <div className="text-center max-w-xs">
          <p className="text-base font-black text-gray-900 mb-2">La première plateforme</p>
          <p className="text-base font-black text-brand-600 mb-3">faite pour les artisans au Sénégal</p>
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

      <style>{`
        @keyframes float-fast {
          0%, 100% { transform: translateY(0px) translateX(0px) rotate(0deg); }
          33% { transform: translateY(-20px) translateX(10px) rotate(5deg); }
          66% { transform: translateY(-10px) translateX(-10px) rotate(-5deg); }
        }
        @keyframes float-medium {
          0%, 100% { transform: translateY(0px) translateX(0px) rotate(0deg); }
          50% { transform: translateY(-30px) translateX(15px) rotate(10deg); }
        }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) translateX(0px) rotate(0deg); }
          50% { transform: translateY(-40px) translateX(20px) rotate(15deg); }
        }
        .animate-float-fast { animation: float-fast 4s ease-in-out infinite; }
        .animate-float-medium { animation: float-medium 6s ease-in-out infinite; }
        .animate-float-slow { animation: float-slow 8s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
