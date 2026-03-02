import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { RequireNotSuspended } from './RequireNotSuspended';

export function PrivateRoute({ children }: { children: React.ReactNode }) {
  const auth = useAuth();

  // Utilisateur non authentifié (une fois l'auth connue) → onboard
  if (!auth.loading && !auth.user) {
    const currentPath = window.location.pathname + window.location.search;
    return <Navigate to={`/onboard?mode=login&redirect=${encodeURIComponent(currentPath)}`} replace />;
  }

  // Compte suspendu → redirection gérée par RequireNotSuspended
  return <RequireNotSuspended>{children}</RequireNotSuspended>;
}
