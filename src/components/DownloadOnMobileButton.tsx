import React, { useState, useMemo } from 'react';
import { Smartphone, Download } from 'lucide-react';
import { usePWAInstall } from '../contexts/PWAInstallContext';

const HINT_BY_BROWSER: Record<string, string> = {
  ios: 'Sur iPhone (Safari) : appuyez sur le bouton Partager puis « Sur l\'écran d\'accueil ».',
  'android-chrome': 'Sur Android (Chrome) : ouvrez le menu (⋮) puis « Ajouter à l\'écran d\'accueil » ou « Installer l\'application ».',
  'android-firefox': 'Sur Android (Firefox) : ouvrez le menu (⋮) puis « Installer » ou « Ajouter à l\'écran d\'accueil ».',
  'android-samsung': 'Sur navigateur Samsung : ouvrez le menu puis « Ajouter la page à » → « Écran d\'accueil ».',
  'android-edge': 'Sur Microsoft Edge : ouvrez le menu (⋯) puis « Applications » → « Installer cette application ».',
  'other-mobile': 'Ouvrez le menu du navigateur et cherchez « Ajouter à l\'écran d\'accueil » ou « Installer l\'application ».',
};

function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) return true;
  if ('maxTouchPoints' in navigator && navigator.maxTouchPoints > 0 && window.innerWidth < 1024) return true;
  return false;
}

/**
 * Bouton footer "Télécharger sur mobile" : un clic déclenche directement
 * l'installation de l'app (PWA) sur le téléphone — Android, iPhone, Samsung, etc.
 * Sur mobile : ouvre la boîte native d'installation (Chrome) ou le guide pas à pas (Safari, Firefox, Edge).
 * Sur ordinateur : affiche comment installer depuis le téléphone.
 */
export function DownloadOnMobileButton() {
  const ctx = usePWAInstall();
  const [showHint, setShowHint] = useState(false);
  const isMobile = useMemo(() => isMobileDevice(), []);

  const handleClick = () => {
    if (ctx?.isStandalone) {
      setShowHint(true);
      return;
    }
    if (isMobile) {
      ctx?.promptInstall();
      return;
    }
    setShowHint(true);
  };

  const hintText = ctx?.installBrowser ? HINT_BY_BROWSER[ctx.installBrowser] : null;
  const isStandaloneHint = ctx?.isStandalone;

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="flex items-center gap-2 text-gray-600 hover:text-brand-500 font-bold text-sm transition-colors"
        aria-label="Télécharger l'application sur votre téléphone"
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
              {isStandaloneHint ? 'Application installée' : 'Installer Mbourake'}
            </h2>
            {isStandaloneHint ? (
              <p className="text-sm text-gray-600 mb-4">
                L&apos;application est déjà installée sur cet appareil. Vous pouvez la retrouver sur votre écran d&apos;accueil.
              </p>
            ) : hintText ? (
              <p className="text-sm text-gray-600 mb-4">{hintText}</p>
            ) : (
              <>
                <p className="text-sm text-gray-700 mb-2 font-semibold">Sur votre téléphone :</p>
                <p className="text-sm text-gray-600 mb-4">
                  Ouvrez <strong>mbourake.com</strong> dans le navigateur (Chrome, Safari, Firefox, Samsung…), puis appuyez sur « Télécharger sur mobile » dans le footer. Suivez les instructions pour ajouter l&apos;app à l&apos;écran d&apos;accueil.
                </p>
                <p className="text-xs text-gray-500 mb-4">
                  Android : menu (⋮) → Installer / Ajouter à l&apos;écran d&apos;accueil. iPhone : Partager → Sur l&apos;écran d&apos;accueil.
                </p>
              </>
            )}
            {!isStandaloneHint && (
              <p className="text-xs text-gray-500 mb-4">
                Mbourake s&apos;ouvrira comme une application, sans barre d&apos;adresse.
              </p>
            )}
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
