import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

/**
 * Page "Suivi du projet" : redirige vers la fiche projet où le suivi,
 * la timeline et les actions (travaux, clôture, chat) sont affichés.
 */
export function ProjectSuiviPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      navigate(`/projects/${id}`, { replace: true });
    } else {
      navigate('/dashboard', { replace: true });
    }
  }, [id, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500">Chargement du projet...</p>
      </div>
    </div>
  );
}
