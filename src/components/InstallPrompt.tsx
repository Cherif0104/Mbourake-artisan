import { useState, useEffect } from 'react';
import { X, Download, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../contexts/PWAInstallContext';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * Composant pour inviter l'utilisateur à installer l'application PWA.
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
      const dismissed = localStorage.getItem('pwa-install-dismissed');
      if (!dismissed) {
        setTimeout(() => ctx.setShowBanner(true), 3000);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    if (iOS) {
      const dismissed = localStorage.getItem('pwa-install-dismissed');
      if (!dismissed) {
        setTimeout(() => ctx.setShowBanner(true), 5000);
      }
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

  if (!ctx || ctx.isStandalone || !ctx.showBanner) return null;
  if (!ctx.deferredPrompt && !ctx.isIOS) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-white rounded-2xl shadow-2xl border-2 border-brand-200 p-4 md:p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center flex-shrink-0">
            <Smartphone className="w-6 h-6 text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-black text-gray-900 mb-1">Installer Mbourake</h3>
            {ctx.isIOS ? (
              <div className="text-sm text-gray-600 space-y-2">
                <p>Pour installer l'application :</p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Appuyez sur le bouton <span className="font-bold">Partager</span> <span className="inline-block w-4 h-4 bg-gray-300 rounded" /></li>
                  <li>Sélectionnez <span className="font-bold">Sur l'écran d'accueil</span></li>
                </ol>
              </div>
            ) : (
              <p className="text-sm text-gray-600">
                Installez Mbourake pour un accès rapide et une meilleure expérience.
              </p>
            )}

            <div className="flex gap-2 mt-4 flex-wrap items-center">
              {!ctx.isIOS && ctx.deferredPrompt && (
                <button
                  onClick={handleInstall}
                  className="flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-500 text-white rounded-xl font-bold hover:bg-brand-600 transition-colors"
                >
                  <Download size={18} />
                  Installer
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
