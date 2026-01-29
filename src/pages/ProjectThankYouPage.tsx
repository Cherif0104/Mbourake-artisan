import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, Wrench, ArrowRight, AlertTriangle, Shield, User, Clock } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { supabase } from '../lib/supabase';
import { LoadingOverlay } from '../components/LoadingOverlay';
import { HomeButton } from '../components/HomeButton';

export function ProjectThankYouPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const auth = useAuth();
  const { profile } = useProfile();
  const [project, setProject] = useState<any>(null);
  const [escrow, setEscrow] = useState<any>(null);
  const [quote, setQuote] = useState<any>(null);
  const [artisan, setArtisan] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const isClient = project?.client_id === auth.user?.id;
  const isArtisan = profile?.role === 'artisan';
  const isAssignedArtisan = quote?.artisan_id === auth.user?.id;

  useEffect(() => {
    if (!id || !auth.user) return;
    
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch project
        const { data: pData, error: pError } = await supabase
          .from('projects')
          .select('*')
          .eq('id', id)
          .single();

        if (pError) throw pError;
        setProject(pData);

        // Fetch escrow
        const { data: eData } = await supabase
          .from('escrows')
          .select('*')
          .eq('project_id', id)
          .maybeSingle();
        setEscrow(eData || null);

        // Fetch accepted quote with artisan profile
        const { data: qData } = await supabase
          .from('quotes')
          .select('*, profiles!quotes_artisan_id_fkey(*)')
          .eq('project_id', id)
          .eq('status', 'accepted')
          .maybeSingle();

        if (qData) {
          setQuote(qData);
          setArtisan(qData.profiles);
        }

      } catch (err: any) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, auth.user]);

  if (loading) return <LoadingOverlay />;

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center">
          <AlertTriangle size={48} className="text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Projet non trouvé</h2>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 bg-brand-500 text-white rounded-xl font-bold mt-4"
          >
            Retour au tableau de bord
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-20 px-4 py-4 bg-white border-b border-gray-100 flex items-center gap-4">
        <HomeButton />
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-gray-900 truncate">Confirmation</h1>
          <p className="text-xs text-gray-400 font-mono">{project.project_number}</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8 pb-32">
        {/* Success Icon */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-200">
            <CheckCircle size={56} className="text-white" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">
            {isClient ? 'Paiement confirmé !' : 'Paiement reçu !'}
          </h2>
          <p className="text-gray-600 max-w-sm mx-auto">
            {isClient 
              ? 'Votre paiement a été sécurisé. L\'artisan peut maintenant commencer les travaux.'
              : 'Le client a effectué le paiement. Vous pouvez maintenant commencer les travaux.'
            }
          </p>
        </div>

        {/* Payment Security Badge */}
        <div className="bg-green-50 border border-green-200 rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center">
              <Shield size={20} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-green-900 text-sm">Paiement sécurisé</h3>
              <p className="text-xs text-green-700">Les fonds sont protégés sur la plateforme</p>
            </div>
          </div>
          {escrow && (
            <div className="flex justify-between items-center pt-3 border-t border-green-200">
              <span className="text-sm text-green-700">Montant total</span>
              <span className="font-black text-green-900 text-lg">
                {Number(escrow.total_amount || 0).toLocaleString('fr-FR')} FCFA
              </span>
            </div>
          )}
        </div>

        {/* Project Info */}
        <div className="bg-white rounded-2xl p-5 mb-6 border border-gray-100">
          <h3 className="font-bold text-gray-900 mb-3">{project.title}</h3>
          
          {artisan && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                {artisan.avatar_url ? (
                  <img src={artisan.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User size={18} className="text-gray-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-gray-900">{artisan.full_name || 'Artisan'}</p>
                <p className="text-xs text-gray-500">
                  {isClient ? 'Artisan assigné' : 'Votre profil'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Next Steps */}
        <div className="bg-brand-50 border border-brand-200 rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={18} className="text-brand-600" />
            <h4 className="font-bold text-brand-900 text-sm">Prochaine étape</h4>
          </div>
          <p className="text-sm text-brand-800">
            {isClient 
              ? 'Suivez l\'avancement des travaux et confirmez leur fin une fois satisfait.'
              : 'Réalisez les travaux conformément au devis et demandez la clôture une fois terminé.'
            }
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {isClient && (
            <button
              onClick={() => navigate(`/projects/${id}/work`)}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-brand-500 text-white rounded-2xl font-bold hover:bg-brand-600 transition-colors shadow-lg shadow-brand-200"
            >
              <Wrench size={20} />
              Suivre les travaux
              <ArrowRight size={18} />
            </button>
          )}

          {isArtisan && isAssignedArtisan && (
            <button
              onClick={() => navigate(`/projects/${id}/work`)}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-green-500 text-white rounded-2xl font-bold hover:bg-green-600 transition-colors shadow-lg shadow-green-200"
            >
              <Wrench size={20} />
              Commencer les travaux
              <ArrowRight size={18} />
            </button>
          )}

          <button
            onClick={() => navigate(`/projects/${id}`)}
            className="w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
          >
            Voir les détails du projet
          </button>
        </div>
      </main>
    </div>
  );
}
