import { useState, useEffect } from 'react';
import { X, Download, Smartphone } from 'lucide-react';
import { usePWAInstall, type PWAInstallBrowser } from '../contexts/PWAInstallContext';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function getInstallInstructions(browser: PWAInstallBrowser | null, isIOS: boolean): { steps: React.ReactNode; showButton: boolean } {
  if (isIOS || browser === 'ios') {
    return {
      steps: (
        <>
          <p className="font-medium text-gray-700">Sur iPhone, en 2 étapes :</p>
          <ol className="list-decimal list-inside space-y-1.5 ml-2 mt-2 text-gray-600">
            <li>Appuyez sur <span className="font-bold text-gray-800">Partager</span> (icône en bas de Safari)</li>
            <li>Choisissez <span className="font-bold text-gray-800">« Ajouter à l&apos;écran d&apos;accueil »</span> puis <span className="font-bold text-gray-800">« Ajouter »</span></li>
          </ol>
        </>
      ),
      showButton: false,
    };
  }
  if (browser === 'android-firefox') {
    return { steps: <>Ouvrez le menu (⋮) puis « Installer » ou « Ajouter à l&apos;écran d&apos;accueil ».</>, showButton: false };
  }
  if (browser === 'android-samsung') {
    return { steps: <>Ouvrez le menu puis « Ajouter la page à » → « Écran d&apos;accueil ».</>, showButton: false };
  }
  if (browser === 'android-edge') {
    return { steps: <>Ouvrez le menu (⋯) puis « Applications » → « Installer cette application ».</>, showButton: false };
  }
  if (browser === 'other-mobile') {
    return { steps: <>Ouvrez le menu du navigateur et cherchez « Ajouter à l&apos;écran d&apos;accueil » ou « Installer l&apos;application ».</>, showButton: false };
  }
  return { steps: <>Un clic sur <strong>Télécharger</strong> et l&apos;app s&apos;installe sur votre téléphone.</>, showButton: true };
}

/**
 * Bandeau d'installation PWA. Compatible Chrome, Safari, Firefox, Samsung, Edge.
 * X = fermer (le bandeau peut réapparaître plus tard).
 * "Ne plus proposer" = ne plus jamais afficher le bandeau.
 */
export function InstallPrompt() {
  const ctx = usePWAInstall();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!ctx || !mounted) return;

    if (window.matchMedia('(display-mode: standalone)').matches) {
      ctx.setIsStandalone(true);
      return;
    }

    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    ctx.setIsIOS(iOS);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      ctx.setDeferredPrompt(e as BeforeInstallPromptEvent);
      ctx.setInstallBrowser('android-chrome');
      const dismissed = localStorage.getItem('pwa-install-dismissed');
      if (!dismissed) setTimeout(() => ctx.setShowBanner(true), 800);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    if (iOS || ctx.installBrowser) {
      const dismissed = localStorage.getItem('pwa-install-dismissed');
      if (!dismissed) setTimeout(() => ctx.setShowBanner(true), 1200);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [ctx, mounted]);

  const handleInstall = async () => {
    if (!ctx?.deferredPrompt) return;
    ctx.deferredPrompt.prompt();
    const { outcome } = await ctx.deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      ctx.setShowBanner(false);
      localStorage.setItem('pwa-install-dismissed', 'true');
    }
    ctx.setDeferredPrompt(null);
  };

  const handleClose = () => {
    ctx?.setShowBanner(false);
  };

  const handleNeverShow = () => {
    localStorage.setItem('pwa-install-dismissed', 'true');
    ctx?.setShowBanner(false);
  };

  if (!ctx || ctx.isStandalone || !ctx.showBanner || !ctx.canInstall) return null;

  const { steps, showButton } = getInstallInstructions(ctx.installBrowser, ctx.isIOS);

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-[100] animate-in slide-in-from-bottom-4 duration-300" role="dialog" aria-label="Installer l'application">
      <div className="bg-white rounded-2xl shadow-2xl border-2 border-brand-200 p-4 md:p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center flex-shrink-0">
            <Smartphone className="w-6 h-6 text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-black text-gray-900 mb-1">Téléchargez Mbourake sur votre téléphone</h3>
            <div className="text-sm text-gray-600 space-y-1">{steps}</div>

            <div className="flex gap-2 mt-4 flex-wrap items-center">
              {showButton && ctx.deferredPrompt && (
                <button
                  onClick={handleInstall}
                  className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-5 py-3 bg-brand-500 text-white rounded-xl font-bold hover:bg-brand-600 transition-colors text-base"
                  aria-label="Télécharger l'application"
                >
                  <Download size={20} />
                  Télécharger
                </button>
              )}
              <button
                onClick={handleClose}
                className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                aria-label="Fermer"
              >
                <X size={18} />
              </button>
            </div>

            <button
              type="button"
              onClick={handleNeverShow}
              className="mt-3 text-xs text-gray-500 hover:text-gray-700 underline"
            >
              Ne plus proposer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
