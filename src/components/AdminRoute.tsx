import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { useAdminPermissions } from '../hooks/useAdminPermissions';
import { LoadingOverlay } from './LoadingOverlay';

const ADMIN_EMAIL = 'techsupport@senegel.org';

interface AdminRouteProps {
  children: React.ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { isAdmin, loading: permLoading } = useAdminPermissions();

  // Compte admin technique : accès direct, pas d'attente profil/perm (évite boucle overlay)
  const isAdminByEmail = !authLoading && user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  if (authLoading) {
    return <LoadingOverlay />;
  }

  if (!user) {
    return <Navigate to="/onboard?mode=login" replace />;
  }

  // Admin technique : accès immédiat, pas de boucle loading
  if (isAdminByEmail) {
    return <>{children}</>;
  }

  if (profileLoading || permLoading) {
    return <LoadingOverlay />;
  }

  if (!profile) {
    return <LoadingOverlay />;
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
