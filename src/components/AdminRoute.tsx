import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { LoadingOverlay } from './LoadingOverlay';

interface AdminRouteProps {
  children: React.ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();

  if (authLoading || profileLoading) {
    return <LoadingOverlay />;
  }

  // Utilisateur non authentifié - rediriger vers la page de connexion
  if (!user) {
    return <Navigate to="/onboard?mode=login" replace />;
  }

  // Rediriger vers dashboard seulement si le profil est chargé et n'est pas admin (évite la boucle quand profile est encore null)
  if (profile && profile.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  // Profil en cours de chargement ou profil null (utilisateur sans ligne profiles) : garder l'overlay
  if (!profile) {
    return <LoadingOverlay />;
  }

  // Admin authentifié - afficher le contenu
  return <>{children}</>;
}
