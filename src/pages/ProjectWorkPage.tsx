import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Wrench, Clock, MessageCircle, CheckCircle, AlertTriangle, User, 
  CreditCard, FileText, Award, Circle, Shield
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { useToastContext } from '../contexts/ToastContext';
import { supabase } from '../lib/supabase';
import { notifyClientProjectCompleted } from '../lib/notificationService';
import { SkeletonScreen } from '../components/SkeletonScreen';
import { ConfirmModal } from '../components/ConfirmModal';
import { HomeButton } from '../components/HomeButton';

// Timeline steps
const TIMELINE_STEPS = [
  { id: 'quote', label: 'Devis accepté', icon: FileText },
  { id: 'payment', label: 'Paiement', icon: CreditCard },
  { id: 'work', label: 'Travaux', icon: Wrench },
  { id: 'completed', label: 'Terminé', icon: Award },
];

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
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  useEffect(() => {
    if (!id || !auth.user) return;
    
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch project with client profile
        const { data: pData, error: pError } = await supabase
          .from('projects')
          .select('*, profiles!projects_client_id_fkey(*)')
          .eq('id', id)
          .single();

        if (pError) throw pError;
        setProject(pData);
        setClient(pData.profiles);

        // Fetch escrow
        const { data: eData } = await supabase
          .from('escrows')
          .select('*')
          .eq('project_id', id)
          .maybeSingle();
        setEscrow(eData || null);

        // Fetch accepted quote (sans join profiles pour éviter RLS / FK)
        const { data: qRow, error: qErr } = await supabase
          .from('quotes')
          .select('*')
          .eq('project_id', id)
          .eq('status', 'accepted')
          .maybeSingle();

        if (!qErr && qRow) {
          setQuote(qRow);
          if (qRow.artisan_id) {
            const { data: art } = await supabase
              .from('profiles')
              .select('id, full_name, avatar_url')
              .eq('id', qRow.artisan_id)
              .maybeSingle();
            setArtisan(art || null);
          }
        }

      } catch (err: any) {
        console.error('Error fetching work data:', err);
        showError(`Erreur: ${err.message || 'Erreur inconnue'}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, auth.user, showError]);

  const isClient = project?.client_id === auth.user?.id;
  const isArtisan = profile?.role === 'artisan';
  const isAssignedArtisan = quote?.artisan_id === auth.user?.id;
  
  // Determine current step based on project status
  const getCurrentStep = () => {
    switch (project?.status) {
      case 'completed': return 3;
      case 'completion_requested': return 2;
      case 'in_progress': return 2;
      default: return 1; // payment done
    }
  };

  const handleRequestCompletion = async () => {
    if (!id || !project) return;
    
    try {
      setActionLoading(true);
      
      // Update project status to completion_requested
      const { error: updateError } = await supabase
        .from('projects')
        .update({ status: 'completion_requested' })
        .eq('id', id);

      if (updateError) throw updateError;

      // Notify the other party
      if (isArtisan && project.client_id) {
        await notifyClientProjectCompleted(id, project.client_id, project.title);
        success('Demande de clôture envoyée au client !');
      } else if (isClient && quote?.artisan_id) {
        await notifyClientProjectCompleted(id, quote.artisan_id, project.title);
        success('Demande de clôture envoyée à l\'artisan !');
      }
      
      // Refresh data
      const { data: pData } = await supabase
        .from('projects')
        .select('*, profiles!projects_client_id_fkey(*)')
        .eq('id', id)
        .single();
      if (pData) {
        setProject(pData);
        setClient(pData.profiles);
      }
      
    } catch (err: any) {
      console.error('Error requesting completion:', err);
      showError(`Erreur: ${err.message || 'Erreur inconnue'}`);
    } finally {
      setActionLoading(false);
      setShowCompletionModal(false);
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

  const currentStep = getCurrentStep();
  const isCompletionRequested = project.status === 'completion_requested';
  const isCompleted = project.status === 'completed';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-20 px-4 py-4 bg-white border-b border-gray-100 flex items-center gap-4">
        <HomeButton />
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-gray-900 truncate">
            {isCompleted ? 'Projet terminé' : 'Travaux en cours'}
          </h1>
          <p className="text-xs text-gray-400 font-mono">{project.project_number}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${
          isCompleted ? 'bg-green-100 text-green-700' :
          isCompletionRequested ? 'bg-orange-100 text-orange-700' :
          'bg-brand-100 text-brand-700'
        }`}>
          {isCompleted ? 'Terminé' : isCompletionRequested ? 'Clôture demandée' : 'En cours'}
        </span>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 pb-40">
        {/* Timeline Visuelle */}
        <section className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
          <h3 className="font-bold text-gray-900 text-sm mb-4">Avancement du projet</h3>
          
          <div className="relative">
            {/* Progress Line */}
            <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200" />
            <div 
              className="absolute left-5 top-0 w-0.5 bg-brand-500 transition-all duration-500"
              style={{ height: `${(currentStep / (TIMELINE_STEPS.length - 1)) * 100}%` }}
            />
            
            {/* Steps */}
            <div className="space-y-6">
              {TIMELINE_STEPS.map((step, index) => {
                const isActive = index <= currentStep;
                const isCurrent = index === currentStep;
                const Icon = step.icon;
                
                return (
                  <div key={step.id} className="flex items-center gap-4 relative">
                    <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      isActive 
                        ? 'bg-brand-500 text-white shadow-lg shadow-brand-200' 
                        : 'bg-gray-100 text-gray-400'
                    } ${isCurrent ? 'ring-4 ring-brand-100 scale-110' : ''}`}>
                      {isActive && index < currentStep ? (
                        <CheckCircle size={20} />
                      ) : (
                        <Icon size={18} />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={`font-bold text-sm ${isActive ? 'text-gray-900' : 'text-gray-400'}`}>
                        {step.label}
                      </p>
                      {isCurrent && !isCompleted && (
                        <p className="text-xs text-brand-600 animate-pulse">Étape actuelle</p>
                      )}
                      {isActive && index < currentStep && (
                        <p className="text-xs text-green-600">Terminé ✓</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Project Info Card */}
        <section className="bg-white rounded-2xl p-5 mb-6 border border-gray-100">
          <h2 className="font-bold text-lg text-gray-900 mb-4">{project.title}</h2>
          
          {/* Show relevant person based on role */}
          {isClient && artisan && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl mb-4">
              <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                {artisan.avatar_url ? (
                  <img src={artisan.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User size={20} className="text-gray-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-gray-900">{artisan.full_name || 'Artisan'}</p>
                <p className="text-xs text-gray-500">Artisan en charge des travaux</p>
              </div>
            </div>
          )}

          {isArtisan && client && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl mb-4">
              <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                {client.avatar_url ? (
                  <img src={client.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User size={20} className="text-gray-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-gray-900">{client.full_name || 'Client'}</p>
                <p className="text-xs text-gray-500">Client du projet</p>
              </div>
            </div>
          )}

          {/* Escrow Info */}
          {escrow && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield size={16} className="text-green-600" />
                <span className="text-xs font-bold text-green-800">Paiement sécurisé</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-green-700">Montant</span>
                <span className="font-black text-green-900">
                  {Number(escrow.total_amount || 0).toLocaleString('fr-FR')} FCFA
                </span>
              </div>
            </div>
          )}
        </section>

        {/* Status Messages */}
        {isCompletionRequested && (
          <section className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5 mb-6">
            <div className="flex items-center gap-3">
              <Clock size={24} className="text-yellow-600 flex-shrink-0" />
              <div>
                <h4 className="font-bold text-yellow-900 text-sm">Clôture demandée</h4>
                <p className="text-xs text-yellow-700 mt-1">
                  {isClient 
                    ? 'Vous pouvez maintenant confirmer la fin des travaux et noter l\'artisan.'
                    : 'En attente de la confirmation du client pour libérer le paiement.'
                  }
                </p>
              </div>
            </div>
          </section>
        )}

        {isCompleted && (
          <section className="bg-green-50 border border-green-200 rounded-2xl p-5 mb-6">
            <div className="flex items-center gap-3">
              <CheckCircle size={24} className="text-green-600 flex-shrink-0" />
              <div>
                <h4 className="font-bold text-green-900 text-sm">Projet terminé</h4>
                <p className="text-xs text-green-700 mt-1">
                  Le projet a été clôturé avec succès. Le paiement a été versé à l'artisan.
                </p>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Bottom Actions */}
      {!isCompleted && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 z-20 space-y-3">
          {/* Client Actions */}
          {isClient && (
            <>
              {isCompletionRequested ? (
                <button
                  onClick={() => navigate(`/projects/${id}/completion`)}
                  className="w-full bg-green-500 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-green-600 transition-colors shadow-lg shadow-green-200"
                >
                  <CheckCircle size={20} />
                  Confirmer et noter l'artisan
                </button>
              ) : (
                <button
                  onClick={() => setShowCompletionModal(true)}
                  disabled={actionLoading}
                  className="w-full bg-green-500 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-green-600 transition-colors disabled:opacity-50"
                >
                  <CheckCircle size={20} />
                  {actionLoading ? 'Traitement...' : 'Travaux terminés'}
                </button>
              )}
            </>
          )}

          {/* Artisan Actions */}
          {isArtisan && isAssignedArtisan && (
            <>
              {isCompletionRequested ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
                  <Clock size={20} className="text-yellow-600 mx-auto mb-2" />
                  <p className="text-sm font-bold text-yellow-800">En attente du client</p>
                  <p className="text-xs text-yellow-700">Le client doit confirmer la fin des travaux.</p>
                </div>
              ) : (
                <button
                  onClick={() => setShowCompletionModal(true)}
                  disabled={actionLoading}
                  className="w-full bg-green-500 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-green-600 transition-colors disabled:opacity-50"
                >
                  <CheckCircle size={20} />
                  {actionLoading ? 'Traitement...' : 'J\'ai terminé les travaux'}
                </button>
              )}
            </>
          )}

          <button
            type="button"
            onClick={() => navigate(`/projects/${id}#devis`)}
            className="w-full bg-gray-100 text-gray-700 font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors"
          >
            <FileText size={18} />
            Voir le projet et les devis
          </button>
          <button
            type="button"
            onClick={() => navigate(`/chat/${id}`)}
            className="w-full bg-gray-100 text-gray-700 font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors"
          >
            <MessageCircle size={18} />
            {isClient ? 'Contacter l\'artisan' : 'Contacter le client'}
          </button>
        </div>
      )}

      {/* Completed state - show rating button for client */}
      {isCompleted && isClient && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 z-20 space-y-2">
          <button
            type="button"
            onClick={() => navigate(`/projects/${id}#devis`)}
            className="w-full bg-brand-500 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-brand-600 transition-colors"
          >
            <FileText size={20} />
            Voir le projet et les devis
          </button>
          <button
            type="button"
            onClick={() => navigate(`/projects/${id}`)}
            className="w-full bg-gray-100 text-gray-700 font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors"
          >
            Voir le projet
          </button>
        </div>
      )}

      {/* Completion Request Modal */}
      <ConfirmModal
        open={showCompletionModal}
        onCancel={() => setShowCompletionModal(false)}
        onConfirm={handleRequestCompletion}
        title="Confirmer la fin des travaux"
        message={isClient 
          ? "Confirmez-vous que les travaux sont terminés ? Vous pourrez ensuite noter l'artisan et libérer le paiement."
          : "Confirmez-vous que les travaux sont terminés ? Une notification sera envoyée au client."
        }
        confirmText="Oui, travaux terminés"
        cancelText="Annuler"
      />
    </div>
  );
}
