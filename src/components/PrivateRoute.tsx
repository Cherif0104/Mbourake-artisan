import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function PrivateRoute({ children }: { children: React.ReactNode }) {
  const auth = useAuth();

  // Utilisateur non authentifié (une fois l'auth connue) → onboard
  if (!auth.loading && !auth.user) {
    const currentPath = window.location.pathname + window.location.search;
    return <Navigate to={`/onboard?mode=login&redirect=${encodeURIComponent(currentPath)}`} replace />;
  }

  // auth.loading OU auth.user : on affiche l'enfant (Dashboard / etc.) qui gère son propre overlay de chargement → pas de double overlay
  return <>{children}</>;
}
