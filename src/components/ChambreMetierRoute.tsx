import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { LoadingOverlay } from './LoadingOverlay';

interface ChambreMetierRouteProps {
  children: React.ReactNode;
}

export function ChambreMetierRoute({ children }: ChambreMetierRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();

  if (authLoading || profileLoading) {
    return <LoadingOverlay />;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (profile?.role !== 'chambre_metier') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
