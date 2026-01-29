import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, CreditCard, FileText, Home } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { supabase } from '../lib/supabase';
import { SkeletonScreen } from '../components/SkeletonScreen';
import { HomeButton } from '../components/HomeButton';

export function ProjectAwaitingPaymentPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const auth = useAuth();
  const { profile } = useProfile();

  const [project, setProject] = useState<any>(null);
  const [escrow, setEscrow] = useState<any>(null);
  const [quote, setQuote] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !auth.user) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: pData, error: pErr } = await supabase
          .from('projects')
          .select('*, profiles!projects_client_id_fkey(id, full_name)')
          .eq('id', id)
          .single();

        if (pErr || !pData) {
          setError('Projet introuvable');
          setLoading(false);
          return;
        }
        setProject(pData);

        const { data: eData } = await supabase
          .from('escrows')
          .select('*')
          .eq('project_id', id)
          .maybeSingle();
        setEscrow(eData || null);

        const { data: qData } = await supabase
          .from('quotes')
          .select('*')
          .eq('project_id', id)
          .eq('status', 'accepted')
          .maybeSingle();
        setQuote(qData || null);
      } catch (err: any) {
        setError(err.message || 'Erreur');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, auth.user]);

  const isArtisan = profile?.role === 'artisan';
  const isAssignedArtisan = quote?.artisan_id === auth.user?.id;
  const showAwaiting = isArtisan && isAssignedArtisan && escrow?.status === 'pending' &&
    (project?.status === 'quote_accepted' || project?.status === 'payment_pending');

  useEffect(() => {
    if (loading || !project) return;
    if (!isArtisan || !isAssignedArtisan) {
      setError('Accès réservé à l\'artisan dont le devis a été accepté.');
      return;
    }
    if (showAwaiting) {
      setError(null);
      return;
    }
    setError('Cette page est affichée uniquement en attente du paiement du client.');
  }, [loading, project, isArtisan, isAssignedArtisan, showAwaiting]);

  if (loading) return <SkeletonScreen />;

  if (error && !showAwaiting) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <p className="text-gray-600 text-center mb-4">{error}</p>
        <div className="flex flex-col gap-2 w-full max-w-xs">
          <button
            onClick={() => navigate(`/projects/${id}`)}
            className="w-full py-3 rounded-xl bg-brand-500 text-white font-semibold flex items-center justify-center gap-2"
          >
            <ArrowLeft size={18} />
            Voir le projet
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full py-3 rounded-xl border border-gray-200 bg-white text-gray-700 font-medium flex items-center justify-center gap-2"
          >
            <Home size={18} />
            Tableau de bord
          </button>
        </div>
        <HomeButton />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-20 px-4 py-4 bg-white border-b border-gray-100 flex items-center gap-4">
        <button
          onClick={() => navigate(`/projects/${id}`)}
          className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"
        >
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-gray-900 truncate">{project?.title || 'Projet'}</h1>
          <p className="text-xs text-gray-400 font-mono">{project?.project_number}</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8">
        <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-xl bg-blue-500 flex items-center justify-center text-white flex-shrink-0">
              <Clock size={28} />
            </div>
            <div>
              <h2 className="font-bold text-blue-900 text-lg">En attente du paiement du client</h2>
              <p className="text-sm text-blue-700 mt-0.5">Votre devis a été accepté</p>
            </div>
          </div>
          <p className="text-sm text-blue-800 mb-4">
            Le client va procéder au paiement pour sécuriser les fonds dans l&apos;escrow Mbourake.
          </p>
          <p className="text-xs text-blue-600">
            Vous serez notifié dès que le paiement sera reçu. Vous pourrez alors commencer les travaux et accéder à la page &quot;Travaux&quot;.
          </p>
        </div>

        {quote?.amount != null && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6">
            <div className="flex items-center gap-2 text-gray-500 text-xs font-bold uppercase mb-1">
              <FileText size={14} />
              Montant du projet
            </div>
            <p className="text-2xl font-black text-gray-900">
              {Number(quote.amount).toLocaleString('fr-FR')} FCFA
            </p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <button
            onClick={() => navigate(`/projects/${id}`)}
            className="w-full py-3.5 rounded-xl bg-brand-500 text-white font-semibold flex items-center justify-center gap-2"
          >
            <ArrowLeft size={18} />
            Voir le projet
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full py-3 rounded-xl border border-gray-200 bg-white text-gray-700 font-medium flex items-center justify-center gap-2"
          >
            <Home size={18} />
            Tableau de bord
          </button>
        </div>
      </main>

      <HomeButton />
    </div>
  );
}
