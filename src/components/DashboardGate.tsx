import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useGlobalLoading } from '../contexts/LoadingContext';
import { Dashboard } from '../pages/Dashboard';

const ADMIN_EMAIL = 'techsupport@senegel.org';

/**
 * Wrapper pour la route /dashboard qui redirige immédiatement les admins
 * (identifiés par email) vers /admin, évitant tout flash ou conflit de redirection.
 */
export function DashboardGate() {
  const auth = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isAdminByEmail = !auth.loading && auth.user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  useGlobalLoading(isAdminByEmail, 'dashboard-gate');

  useEffect(() => {
    if (!isAdminByEmail || location.pathname !== '/dashboard') return;
    navigate('/admin', { replace: true });
  }, [isAdminByEmail, location.pathname, navigate]);

  // Ne jamais rendre le Dashboard pour un admin (évite flash et conflit)
  if (isAdminByEmail) {
    return null;
  }

  return <Dashboard />;
}
