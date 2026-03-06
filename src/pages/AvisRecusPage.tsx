import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, TrendingUp, MessageSquare, BarChart3 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { supabase } from '../lib/supabase';
import { LoadingOverlay } from '../components/LoadingOverlay';

interface ReviewRow {
  id: string;
  rating: number | null;
  comment: string | null;
  created_at: string | null;
  project_id: string | null;
  client_id: string | null;
  projects?: { title: string | null; project_number: string | null } | null;
  client?: { full_name: string | null } | null;
}

export function AvisRecusPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || profile?.role !== 'artisan') {
      if (profile && profile.role !== 'artisan') navigate('/dashboard');
      setLoading(false);
      return;
    }
    fetchReviews();
  }, [user, profile, navigate]);

  const fetchReviews = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('reviews')
      .select(`
        id, rating, comment, created_at, project_id, client_id,
        projects ( title, project_number ),
        client:profiles!reviews_client_id_fkey ( full_name )
      `)
      .eq('artisan_id', user.id)
      .order('created_at', { ascending: false });

    if (!error) setReviews(data || []);
    setLoading(false);
  };

  if (profile?.role !== 'artisan') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 gap-4">
        <p className="text-gray-600">Cette page est réservée aux artisans.</p>
        <button onClick={() => navigate('/dashboard')} className="px-4 py-2 bg-brand-500 text-white rounded-xl font-bold">
          Tableau de bord
        </button>
      </div>
    );
  }

  const total = reviews.length;
  const avg = total > 0
    ? reviews.reduce((s, r) => s + (r.rating ?? 0), 0) / total
    : 0;
  const distribution = [1, 2, 3, 4, 5].map(star => ({
    star,
    count: reviews.filter(r => r.rating === star).length,
  }));
  const withComment = reviews.filter(r => r.comment && r.comment.trim()).length;

  if (loading) return <LoadingOverlay />;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-40 px-4 py-4 bg-white border-b border-gray-100 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="font-bold text-gray-900">Avis reçus</h1>
          <p className="text-sm text-gray-500">Historique et santé de vos notes</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 pb-32">
        {/* KPIs */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-4 border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <Star size={18} className="text-amber-500 fill-amber-500" />
              <p className="text-xs text-gray-500 font-medium">Note moyenne</p>
            </div>
            <p className="text-2xl font-black text-gray-900">{avg > 0 ? avg.toFixed(1) : '–'}</p>
            <p className="text-xs text-gray-400 mt-1">sur 5</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 size={18} className="text-brand-500" />
              <p className="text-xs text-gray-500 font-medium">Nombre d&apos;avis</p>
            </div>
            <p className="text-2xl font-black text-gray-900">{total}</p>
            <p className="text-xs text-gray-400 mt-1">{withComment} avec commentaire</p>
          </div>
        </div>

        {/* Répartition étoiles */}
        {total > 0 && (
          <div className="bg-white rounded-2xl p-4 border border-gray-100 mb-6">
            <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <TrendingUp size={18} />
              Répartition des notes
            </h2>
            <div className="space-y-2">
              {distribution.map(({ star, count }) => {
                const pct = total ? (count / total) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-3">
                    <span className="text-sm text-gray-600 w-16">{star} étoile{star > 1 ? 's' : ''}</span>
                    <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-500 w-8">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Liste des avis */}
        <div className="space-y-3">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare size={18} />
            Historique des avis
          </h2>
          {reviews.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
              <Star size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-600 font-medium">Aucun avis pour le moment</p>
              <p className="text-sm text-gray-400 mt-1">Les avis apparaîtront ici après la clôture des projets.</p>
            </div>
          ) : (
            reviews.map((r) => (
              <div
                key={r.id}
                className="bg-white rounded-2xl p-4 border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 truncate">
                      {r.projects?.title || r.projects?.project_number || 'Projet'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {((r as any).client?.full_name ?? (r as any).profiles?.full_name) || 'Client'} · {r.created_at ? new Date(r.created_at).toLocaleDateString('fr-FR') : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Star size={16} className="text-amber-500 fill-amber-500" />
                    <span className="font-bold text-gray-900">{r.rating ?? '–'}</span>
                  </div>
                </div>
                {r.comment && r.comment.trim() && (
                  <p className="text-sm text-gray-600 mt-2 border-t border-gray-50 pt-2">{r.comment}</p>
                )}
                {r.project_id && (
                  <button
                    type="button"
                    onClick={() => navigate(`/projects/${r.project_id}`)}
                    className="mt-2 text-xs text-brand-500 font-bold hover:underline"
                  >
                    Voir le projet
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
