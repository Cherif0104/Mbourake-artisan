import { useState, useEffect, useRef } from 'react';
import { Download, Smartphone } from 'lucide-react';
import { usePWAInstall, type PWAInstallBrowser } from '../contexts/PWAInstallContext';
import { Z_INDEX } from '../config/zIndex';

const PWA_DISMISSED_KEY = 'pwa-install-dismissed';

function isDismissed(): boolean {
  try {
    return localStorage.getItem(PWA_DISMISSED_KEY) === 'true';
  } catch {
    return false;
  }
}

function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) return true;
  if ('maxTouchPoints' in navigator && navigator.maxTouchPoints > 0 && window.innerWidth < 1024) return true;
  return false;
}

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
  return { steps: <>Un clic sur <strong>Installer</strong> et l&apos;app s&apos;installe sur votre téléphone.</>, showButton: true };
}

/**
 * Bottom sheet d'installation PWA. Compatible Chrome, Safari, Firefox, Samsung, Edge.
 * 3 actions : "Installer maintenant", "Plus tard", "Ne plus proposer".
 */
export function InstallPrompt() {
  const ctx = usePWAInstall();
  const [mounted, setMounted] = useState(false);
  const timeoutIdsRef = useRef<number[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!ctx || !mounted) return;

    if (window.matchMedia('(display-mode: standalone)').matches) {
      ctx.setIsStandalone(true);
      return;
    }

    const mobile = isMobileDevice();
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    ctx.setIsIOS(iOS);

    const scheduleShow = (delay: number) => {
      const id = window.setTimeout(() => {
        if (isDismissed()) return;
        if (!mobile) return; // Pop-up uniquement sur mobile
        ctx.setShowBanner(true);
      }, delay);
      timeoutIdsRef.current.push(id);
    };

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      ctx.setDeferredPrompt(e as BeforeInstallPromptEvent);
      ctx.setInstallBrowser('android-chrome');
      if (!isDismissed() && mobile) scheduleShow(800);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    if ((iOS || ctx.installBrowser) && mobile) {
      if (!isDismissed()) scheduleShow(1200);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      timeoutIdsRef.current.forEach((id) => clearTimeout(id));
      timeoutIdsRef.current = [];
    };
  }, [ctx, mounted]);

  const handleInstall = async () => {
    if (ctx?.deferredPrompt) {
      ctx.deferredPrompt.prompt();
      const { outcome } = await ctx.deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        ctx.setShowBanner(false);
        try {
          localStorage.setItem(PWA_DISMISSED_KEY, 'true');
        } catch (_) {}
      }
      ctx.setDeferredPrompt(null);
    } else {
      ctx?.promptInstall();
    }
  };

  const handleLater = () => {
    ctx?.setShowBanner(false);
  };

  const handleNeverShow = () => {
    try {
      localStorage.setItem(PWA_DISMISSED_KEY, 'true');
    } catch (_) {}
    ctx?.setShowBanner(false);
  };

  if (!ctx || ctx.isStandalone || !ctx.showBanner || !ctx.canInstall) return null;

  const { steps, showButton } = getInstallInstructions(ctx.installBrowser, ctx.isIOS);
  const canInstallNative = showButton && !!ctx.deferredPrompt;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[99] animate-in fade-in duration-200"
        style={{ zIndex: Z_INDEX.INSTALL_PROMPT - 1 }}
        aria-hidden="true"
      />
      {/* Bottom sheet */}
      <div
        className="fixed left-0 right-0 bottom-0 md:left-1/2 md:right-auto md:bottom-8 md:-translate-x-1/2 md:max-w-[420px] md:rounded-t-2xl rounded-t-3xl bg-white shadow-2xl z-[100] animate-in slide-in-from-bottom duration-300"
        style={{ zIndex: Z_INDEX.INSTALL_PROMPT }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pwa-install-title"
      >
        {/* Poignée visuelle (mobile) */}
        <div className="md:hidden flex justify-center pt-3 pb-1">
          <div className="w-12 h-1 rounded-full bg-gray-300" aria-hidden="true" />
        </div>

        <div className="p-6 md:p-6">
          {/* En-tête */}
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-brand-200/50">
              <Smartphone className="w-7 h-7 text-white" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 id="pwa-install-title" className="font-black text-gray-900 text-lg">
                Installez Mbourake sur votre téléphone
              </h2>
              <p className="text-sm text-gray-600 mt-0.5">
                Accès direct à vos projets, devis et messages. Utilisez Mbourake comme une application.
              </p>
            </div>
          </div>

          {/* Instructions par navigateur */}
          <div id="pwa-install-steps" className="text-sm text-gray-600 mb-6 py-3 px-4 bg-gray-50 rounded-xl">
            {steps}
          </div>

          {/* Boutons */}
          <div className="flex flex-col gap-3">
            <button
              onClick={canInstallNative ? handleInstall : handleLater}
              className="w-full flex items-center justify-center gap-2 py-4 px-5 bg-brand-500 text-white rounded-xl font-bold text-base hover:bg-brand-600 active:scale-[0.98] transition-all shadow-lg shadow-brand-200/50"
              aria-label={canInstallNative ? "Installer l'application PWA" : "J'ai compris"}
            >
              {canInstallNative ? <Download size={22} /> : <Smartphone size={22} />}
              {canInstallNative ? 'Installer maintenant' : "J'ai compris"}
            </button>
            <button
              onClick={handleLater}
              className="w-full py-3 px-5 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200 transition-colors"
            >
              Plus tard
            </button>
            <button
              type="button"
              onClick={handleNeverShow}
              className="text-xs text-gray-500 hover:text-gray-700 underline py-2"
            >
              Ne plus proposer
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
