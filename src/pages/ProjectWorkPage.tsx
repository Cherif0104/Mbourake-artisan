import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Wrench, Clock, MessageCircle, CheckCircle, AlertTriangle, User, MapPin, Calendar } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { useToastContext } from '../contexts/ToastContext';
import { supabase } from '../lib/supabase';
import { notifyClientProjectCompleted } from '../lib/notificationService';
import { SkeletonScreen } from '../components/SkeletonScreen';
import { ConfirmModal } from '../components/ConfirmModal';
import { HomeButton } from '../components/HomeButton';

export function ProjectWorkPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const auth = useAuth();
  const { profile } = useProfile();
  const { success, error: showError } = useToastContext();
  
  const [project, setProject] = useState<any>(null);
  const [escrow, setEscrow] = useState<any>(null);
  const [quote, setQuote] = useState<any>(null);
  const [artisan, setArtisan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showRequestCompletionModal, setShowRequestCompletionModal] = useState(false);

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

        // Verify access (client or artisan)
        const isClient = pData.client_id === auth.user.id;
        const isArtisan = profile?.role === 'artisan';
        
        if (!isClient && !isArtisan) {
          showError('Vous n\'êtes pas autorisé à accéder à cette page.');
          navigate(`/projects/${id}`);
          return;
        }

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
          .single();

        if (qData) {
          setQuote(qData);
          setArtisan(qData.profiles);
        }

      } catch (err: any) {
        console.error('Error fetching work data:', err);
        showError(`Erreur: ${err.message || 'Erreur inconnue'}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, auth.user, profile, navigate, showError]);

  const isClient = project?.client_id === auth.user?.id;
  const isArtisan = profile?.role === 'artisan';
  const isAssignedArtisan = quote?.artisan_id === auth.user?.id;
  const canComplete = isClient && project?.status === 'in_progress';
  const canRequestCompletion = isClient && project?.status === 'in_progress';
  const artisanCanRequestCompletion = isArtisan && isAssignedArtisan && project?.status === 'in_progress';

  const handleArtisanRequestCompletion = async () => {
    if (!id || !project?.client_id || !project?.title) return;
    
    try {
      setActionLoading(true);
      
      // Update project status to completion_requested
      const { error: updateError } = await supabase
        .from('projects')
        .update({ status: 'completion_requested' })
        .eq('id', id);

      if (updateError) throw updateError;

      // Notify client
      await notifyClientProjectCompleted(id, project.client_id, project.title);

      success('Demande de clôture envoyée ! Le client sera notifié.');
      
      // Refresh data
      setTimeout(async () => {
        const { data: pData } = await supabase
          .from('projects')
          .select('*')
          .eq('id', id)
          .single();
        if (pData) setProject(pData);
      }, 500);
      
    } catch (err: any) {
      console.error('Error requesting completion:', err);
      showError(`Erreur: ${err.message || 'Erreur inconnue'}`);
    } finally {
      setActionLoading(false);
      setShowRequestCompletionModal(false);
    }
  };

  if (loading) {
    return <SkeletonScreen />;
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center">
          <AlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
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
      {/* Header */}
      <header className="sticky top-0 z-20 px-4 py-4 bg-white border-b border-gray-100 flex items-center gap-4">
        <HomeButton />
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-gray-900 truncate">Travaux en cours</h1>
          <p className="text-xs text-gray-400 font-mono">{project.project_number}</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 pb-32">
        {/* Project Info */}
        <div className="bg-white rounded-2xl p-5 mb-6 border border-gray-100">
          <h2 className="font-bold text-lg text-gray-900 mb-4">{project.title}</h2>
          
          {artisan && (
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                {artisan.avatar_url ? (
                  <img src={artisan.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User size={20} className="text-gray-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-gray-900">{artisan.full_name || 'Artisan'}</p>
                <p className="text-xs text-gray-500">Artisan sélectionné</p>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {project.location && (
              <div className="flex items-start gap-2 text-sm">
                <MapPin size={16} className="text-gray-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">{project.location}</span>
              </div>
            )}
            
            {quote?.proposed_date && (
              <div className="flex items-start gap-2 text-sm">
                <Calendar size={16} className="text-gray-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">
                  Date prévue: {new Date(quote.proposed_date).toLocaleDateString('fr-FR', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </span>
              </div>
            )}

            {quote?.estimated_duration && (
              <div className="flex items-start gap-2 text-sm">
                <Clock size={16} className="text-gray-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">Durée estimée: {quote.estimated_duration}</span>
              </div>
            )}
          </div>
        </div>

        {/* Status Badge */}
        <div className="bg-brand-50 border border-brand-200 rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-brand-500 flex items-center justify-center">
              <Wrench size={24} className="text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg text-brand-900">Travaux en cours</h3>
              <p className="text-sm text-brand-700">
                {isClient 
                  ? 'Votre artisan est en train de réaliser les travaux.'
                  : 'Vous êtes en train de réaliser les travaux pour ce projet.'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Escrow Status (for client) */}
        {isClient && escrow && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-5 mb-6">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle size={20} className="text-green-600" />
              <h4 className="font-bold text-sm text-green-900">Paiement sécurisé</h4>
            </div>
            <p className="text-xs text-green-700 leading-relaxed">
              Votre paiement est protégé et sera libéré après confirmation de la fin des travaux.
            </p>
            <div className="mt-3 pt-3 border-t border-green-200">
              <div className="flex justify-between items-center">
                <span className="text-xs text-green-700">Montant sécurisé</span>
                <span className="font-bold text-green-900">
                  {Number(escrow.total_amount || 0).toLocaleString('fr-FR')} FCFA
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        {isClient && canRequestCompletion && (
          <div className="space-y-3">
            <button
              onClick={() => navigate(`/projects/${id}/completion`)}
              className="w-full bg-green-500 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-green-600 transition-colors"
            >
              <CheckCircle size={20} />
              Confirmer la fin des travaux
            </button>
            
            <button
              onClick={() => navigate(`/projects/${id}`)}
              className="w-full bg-gray-100 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors"
            >
              Voir les détails du projet
            </button>
          </div>
        )}

        {/* For Artisan */}
        {isArtisan && isAssignedArtisan && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 space-y-3">
            <div>
              <h4 className="font-bold text-sm text-blue-900 mb-2">Instructions</h4>
              <p className="text-xs text-blue-700 leading-relaxed mb-4">
                Effectuez les travaux conformément au devis accepté. Une fois terminé, vous pourrez demander la clôture.
              </p>
            </div>
            
            {artisanCanRequestCompletion && (
              <button
                onClick={() => setShowRequestCompletionModal(true)}
                disabled={actionLoading}
                className="w-full bg-green-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle size={18} />
                {actionLoading ? 'Traitement...' : 'Demander la clôture'}
              </button>
            )}
            
            {project?.status === 'completion_requested' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                <p className="text-xs text-yellow-700 font-medium text-center">
                  Demande de clôture envoyée. En attente de confirmation du client.
                </p>
              </div>
            )}
            
            <button
              onClick={() => navigate(`/chat/${id}`)}
              className="w-full bg-blue-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-blue-600 transition-colors"
            >
              <MessageCircle size={18} />
              Contacter le client
            </button>
          </div>
        )}
      </main>

      {/* Request Completion Modal for Artisan */}
      <ConfirmModal
        open={showRequestCompletionModal}
        onCancel={() => setShowRequestCompletionModal(false)}
        onConfirm={handleArtisanRequestCompletion}
        title="Demander la clôture"
        message="Confirmez-vous que les travaux sont terminés ? Une notification sera envoyée au client pour qu'il confirme la clôture."
        confirmText="Oui, demander la clôture"
        cancelText="Annuler"
      />
    </div>
  );
}
