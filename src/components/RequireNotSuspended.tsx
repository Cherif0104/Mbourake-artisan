import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useProfile } from '../hooks/useProfile';
import { useGlobalLoading } from '../contexts/LoadingContext';

/**
 * À utiliser à l'intérieur de PrivateRoute.
 * Redirige vers /compte-suspendu si le profil chargé est suspendu.
 */
export function RequireNotSuspended({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { profile, loading: profileLoading } = useProfile();
  const showProfileLoading = profileLoading && !profile;
  useGlobalLoading(showProfileLoading, 'require-not-suspended');

  if (location.pathname === '/compte-suspendu') {
    return <>{children}</>;
  }

  if (showProfileLoading) {
    return null;
  }

  if (profile?.is_suspended || profile?.is_banned) {
    return <Navigate to="/compte-suspendu" replace />;
  }

  return <>{children}</>;
}
