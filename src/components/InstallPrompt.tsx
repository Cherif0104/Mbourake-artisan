import { useState, useEffect } from 'react';
import { X, Download, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * Composant pour inviter l'utilisateur à installer l'application PWA
 * S'affiche automatiquement sur les appareils compatibles
 */
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Vérifier si l'app est déjà installée (mode standalone)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsStandalone(true);
      return;
    }

    // Détecter iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(iOS);

    // Écouter l'événement beforeinstallprompt (Android/Desktop)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Vérifier si l'utilisateur a déjà refusé
      const dismissed = localStorage.getItem('pwa-install-dismissed');
      if (!dismissed) {
        // Afficher après 3 secondes
        setTimeout(() => {
          setShowPrompt(true);
        }, 3000);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Pour iOS, vérifier si on peut afficher les instructions
    if (iOS) {
      const dismissed = localStorage.getItem('pwa-install-dismissed');
      if (!dismissed) {
        setTimeout(() => {
          setShowPrompt(true);
        }, 5000);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      // Android/Desktop : utiliser l'API native
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setShowPrompt(false);
        localStorage.setItem('pwa-install-dismissed', 'true');
      }
      
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  // Ne rien afficher si :
  // - L'app est déjà installée
  // - Le prompt est masqué
  // - Pas de support PWA
  if (isStandalone || !showPrompt || (!deferredPrompt && !isIOS)) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-white rounded-2xl shadow-2xl border-2 border-brand-200 p-4 md:p-6">
        <div className="flex items-start gap-4">
          {/* Icône */}
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center flex-shrink-0">
            <Smartphone className="w-6 h-6 text-white" />
          </div>

          {/* Contenu */}
          <div className="flex-1 min-w-0">
            <h3 className="font-black text-gray-900 mb-1">Installer Mbourake</h3>
            {isIOS ? (
              <div className="text-sm text-gray-600 space-y-2">
                <p>Pour installer l'application :</p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Appuyez sur le bouton <span className="font-bold">Partager</span> <span className="inline-block w-4 h-4 bg-gray-300 rounded"></span></li>
                  <li>Sélectionnez <span className="font-bold">Sur l'écran d'accueil</span></li>
                </ol>
              </div>
            ) : (
              <p className="text-sm text-gray-600">
                Installez Mbourake pour un accès rapide et une meilleure expérience.
              </p>
            )}

            {/* Boutons */}
            <div className="flex gap-2 mt-4">
              {!isIOS && deferredPrompt && (
                <button
                  onClick={handleInstall}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-500 text-white rounded-xl font-bold hover:bg-brand-600 transition-colors"
                >
                  <Download size={18} />
                  Installer
                </button>
              )}
              <button
                onClick={handleDismiss}
                className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
