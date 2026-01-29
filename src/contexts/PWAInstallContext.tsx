import React, { createContext, useContext, useState, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

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
  promptInstall: () => void;
};

const PWAInstallContext = createContext<PWAInstallContextValue | null>(null);

export function PWAInstallProvider({ children }: { children: React.ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  const canInstall = !isStandalone && (!!deferredPrompt || isIOS);

  const promptInstall = useCallback(() => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
    } else if (isIOS) {
      setShowBanner(true);
    }
  }, [deferredPrompt, isIOS]);

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
