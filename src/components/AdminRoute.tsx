import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';

interface AdminRouteProps {
  children: React.ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();

  // État de chargement - afficher un loader
  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-600 font-medium">Vérification des permissions...</p>
        </div>
      </div>
    );
  }

  // Utilisateur non authentifié - rediriger vers login
  if (!user) {
    const currentPath = window.location.pathname + window.location.search;
    return <Navigate to={`/login?redirect=${encodeURIComponent(currentPath)}`} replace />;
  }

  // Utilisateur n'est pas admin - rediriger vers dashboard
  if (profile?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  // Admin authentifié - afficher le contenu
  return <>{children}</>;
}
