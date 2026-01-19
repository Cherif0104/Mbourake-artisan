import { useEffect, useState } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOfflineMessage, setShowOfflineMessage] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflineMessage(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineMessage(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Vérifier l'état initial
    if (!navigator.onLine) {
      setShowOfflineMessage(true);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline && !showOfflineMessage) {
    return null;
  }

  if (isOnline && showOfflineMessage) {
    // Message de reconnexion
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-green-500 text-white px-4 py-3 shadow-lg animate-in slide-in-from-top duration-300">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <Wifi size={20} />
          <span className="font-medium">Connexion rétablie !</span>
        </div>
      </div>
    );
  }

  // Message hors ligne
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-red-500 text-white px-4 py-3 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center gap-3">
        <WifiOff size={20} />
        <div className="flex-1">
          <span className="font-medium">Vous êtes hors ligne</span>
          <span className="ml-2 text-sm opacity-90">
            Vérifiez votre connexion internet et réessayez.
          </span>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
        >
          Réessayer
        </button>
      </div>
    </div>
  );
}
