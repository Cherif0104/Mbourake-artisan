import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ToastProvider } from './contexts/ToastContext';
import { PWAInstallProvider } from './contexts/PWAInstallContext';
import { LoadingProvider } from './contexts/LoadingContext';
import App from './App';
import './styles.css';

// Désactiver la restauration automatique du scroll du navigateur
// pour permettre à notre composant ScrollToTop de gérer cela
if ('scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual';
}

// PWA : quand un nouveau Service Worker prend le contrôle (déploiement), recharger pour appliquer la mise à jour
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });
}

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <ToastProvider>
      <PWAInstallProvider>
        <LoadingProvider>
          <App />
        </LoadingProvider>
      </PWAInstallProvider>
    </ToastProvider>
  </BrowserRouter>,
);
