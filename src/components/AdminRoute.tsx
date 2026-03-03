import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { useAdminPermissions } from '../hooks/useAdminPermissions';
import { LoadingOverlay } from './LoadingOverlay';

interface AdminRouteProps {
  children: React.ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { isAdmin, loading: permLoading } = useAdminPermissions();

  if (authLoading || profileLoading || permLoading) {
    return <LoadingOverlay />;
  }

  if (!user) {
    return <Navigate to="/onboard?mode=login" replace />;
  }

  if (!profile) {
    return <LoadingOverlay />;
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
