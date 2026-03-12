import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type PWAInstallBrowser = 'ios' | 'android-chrome' | 'android-firefox' | 'android-samsung' | 'android-edge' | 'other-mobile';

type PWAInstallContextValue = {
  deferredPrompt: BeforeInstallPromptEvent | null;
  setDeferredPrompt: (e: BeforeInstallPromptEvent | null) => void;
  isIOS: boolean;
  setIsIOS: (v: boolean) => void;
  isStandalone: boolean;
  setIsStandalone: (v: boolean) => void;
  showBanner: boolean;
  setShowBanner: (v: boolean) => void;
  canInstall: boolean;
  /** Détecté pour afficher les bonnes instructions (Safari, Chrome, Firefox, Samsung, Edge, etc.) */
  installBrowser: PWAInstallBrowser | null;
  setInstallBrowser: (b: PWAInstallBrowser | null) => void;
  /** Déclenche l'installation : native (Chrome) ou bandeau d'instructions (Safari, Firefox, etc.) */
  promptInstall: () => void;
};

const PWAInstallContext = createContext<PWAInstallContextValue | null>(null);

function detectInstallBrowser(): PWAInstallBrowser | null {
  if (typeof navigator === 'undefined') return null;
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
  if (isIOS) return 'ios';
  const isAndroid = /Android/i.test(ua);
  if (!isAndroid) return null;
  if (/Firefox|FxiOS/.test(ua)) return 'android-firefox';
  if (/SamsungBrowser/.test(ua)) return 'android-samsung';
  if (/EdgA?|Edge/.test(ua)) return 'android-edge';
  if (/Chrome/.test(ua)) return 'android-chrome';
  return 'other-mobile';
}

export function PWAInstallProvider({ children }: { children: React.ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [installBrowser, setInstallBrowser] = useState<PWAInstallBrowser | null>(null);

  useEffect(() => {
    setInstallBrowser(detectInstallBrowser());
  }, []);

  const canInstall = !isStandalone && (!!deferredPrompt || isIOS || !!installBrowser);

  const promptInstall = useCallback(() => {
    if (deferredPrompt) {
      // Android Chrome : boîte native PWA « Installer l'app »
      deferredPrompt.prompt();
    } else {
      // iOS, Android (Firefox, Samsung, Edge) : modal avec instructions PWA
      setShowBanner(true);
    }
  }, [deferredPrompt]);

  const value: PWAInstallContextValue = {
    deferredPrompt,
    setDeferredPrompt,
    isIOS,
    setIsIOS,
    isStandalone,
    setIsStandalone,
    showBanner,
    setShowBanner,
    canInstall,
    installBrowser,
    setInstallBrowser,
    promptInstall,
  };

  return (
    <PWAInstallContext.Provider value={value}>
      {children}
    </PWAInstallContext.Provider>
  );
}

export function usePWAInstall() {
  const ctx = useContext(PWAInstallContext);
  return ctx;
}
