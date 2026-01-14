import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function PrivateRoute({ children }: { children: React.ReactNode }) {
  const auth = useAuth();

  if (auth.loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-sm text-gray-600">Chargement...</div>
      </div>
    );
  }

  if (!auth.user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
