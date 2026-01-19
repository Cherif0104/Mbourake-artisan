import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function PrivateRoute({ children }: { children: React.ReactNode }) {
  const auth = useAuth();

  // État de chargement - afficher un loader
  if (auth.loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-600 font-medium">Chargement...</p>
        </div>
      </div>
    );
  }

  // Utilisateur non authentifié - rediriger vers /onboard
  if (!auth.user) {
    // Sauvegarder l'URL actuelle pour redirection après login
    const currentPath = window.location.pathname + window.location.search;
    return <Navigate to={`/onboard?mode=login&redirect=${encodeURIComponent(currentPath)}`} replace />;
  }

  // Utilisateur authentifié - afficher le contenu
  return <>{children}</>;
}
