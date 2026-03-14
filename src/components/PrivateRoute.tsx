import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useGlobalLoading } from '../contexts/LoadingContext';
import { RequireNotSuspended } from './RequireNotSuspended';

export function PrivateRoute({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  useGlobalLoading(auth.loading, 'private-auth');

  // Auth en cours → rien (overlay global géré par useGlobalLoading)
  if (auth.loading) {
    return null;
  }

  // Utilisateur non authentifié (une fois l'auth connue) → onboard
  if (!auth.user) {
    const currentPath = window.location.pathname + window.location.search;
    return <Navigate to={`/onboard?mode=login&redirect=${encodeURIComponent(currentPath)}`} replace />;
  }

  // Compte suspendu → redirection gérée par RequireNotSuspended
  return <RequireNotSuspended>{children}</RequireNotSuspended>;
}
