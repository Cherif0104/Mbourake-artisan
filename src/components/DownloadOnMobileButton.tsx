import React, { useState } from 'react';
import { Smartphone, Download } from 'lucide-react';
import { usePWAInstall } from '../contexts/PWAInstallContext';

/**
 * Bouton footer "Télécharger sur mobile" : déclenche l'installation PWA (popup navigateur)
 * ou affiche des instructions pour iOS / Android si le popup n'est pas disponible.
 */
export function DownloadOnMobileButton() {
  const ctx = usePWAInstall();
  const [showHint, setShowHint] = useState(false);

  const handleClick = () => {
    if (ctx?.canInstall) {
      ctx.promptInstall();
    } else {
      setShowHint(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="flex items-center gap-2 text-gray-600 hover:text-brand-500 font-bold text-sm transition-colors"
      >
        <Smartphone size={20} className="shrink-0" />
        Télécharger sur mobile
      </button>

      {showHint && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowHint(false)}
          role="presentation"
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-left"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="pwa-hint-title"
          >
            <h2 id="pwa-hint-title" className="font-black text-gray-900 mb-3 flex items-center gap-2">
              <Download size={22} className="text-brand-500" />
              Installer Mbourake
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              <strong>Sur Android (Chrome) :</strong> ouvrez le menu (⋮) puis « Ajouter à l&apos;écran d&apos;accueil » ou « Installer l&apos;application ».
            </p>
            <p className="text-sm text-gray-600 mb-4">
              <strong>Sur iPhone (Safari) :</strong> appuyez sur le bouton Partager puis « Sur l&apos;écran d&apos;accueil ».
            </p>
            <p className="text-xs text-gray-500 mb-4">
              Vous pourrez ensuite ouvrir Mbourake comme une application et recevoir les notifications.
            </p>
            <button
              type="button"
              onClick={() => setShowHint(false)}
              className="w-full py-2.5 bg-brand-500 text-white rounded-xl font-bold text-sm"
            >
              Compris
            </button>
          </div>
        </div>
      )}
    </>
  );
}
