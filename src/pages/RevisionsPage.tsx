import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, FileText, Clock, CheckCircle, XCircle, MessageCircle, Play, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { useToastContext } from '../contexts/ToastContext';
import { QuoteRevisionResponseModal } from '../components/QuoteRevisionResponseModal';
import { SkeletonScreen } from '../components/SkeletonScreen';
import { HomeButton } from '../components/HomeButton';

export function RevisionsPage() {
  const navigate = useNavigate();
  const auth = useAuth();
  const { profile } = useProfile();
  const { error: showError } = useToastContext();
  
  const [revisions, setRevisions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRevisionId, setSelectedRevisionId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected' | 'modified'>('all');

  useEffect(() => {
    if (!auth.user || !profile || profile.role !== 'artisan') {
      navigate('/dashboard');
      return;
    }

    fetchRevisions();
  }, [auth.user, profile]);

  const fetchRevisions = async () => {
    if (!auth.user) return;

    setLoading(true);
    try {
      // Récupérer tous les devis de l'artisan
      const { data: quotes } = await supabase
        .from('quotes')
        .select('id')
        .eq('artisan_id', auth.user.id);

      if (!quotes || quotes.length === 0) {
        setRevisions([]);
        setLoading(false);
        return;
      }

      const quoteIds = quotes.map(q => q.id);

      // Récupérer les révisions pour ces devis
      const { data: revisionsData, error } = await supabase
        .from('quote_revisions')
        .select(`
          *,
          quotes!quote_revisions_quote_id_fkey(id, amount, quote_number, status),
          projects!quote_revisions_project_id_fkey(id, title, project_number),
          profiles!quote_revisions_requested_by_fkey(id, full_name, avatar_url)
        `)
        .in('quote_id', quoteIds)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setRevisions(revisionsData || []);
    } catch (err: any) {
      console.error('Error fetching revisions:', err);
      showError(`Erreur: ${err.message || 'Impossible de charger les révisions'}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredRevisions = filter === 'all' 
    ? revisions 
    : revisions.filter(r => r.status === filter);

  const statusLabels: Record<string, { label: string; color: string; icon: any }> = {
    pending: { label: 'En attente', color: 'bg-yellow-50 text-yellow-700 border-yellow-200', icon: Clock },
    accepted: { label: 'Acceptée', color: 'bg-green-50 text-green-700 border-green-200', icon: CheckCircle },
    rejected: { label: 'Refusée', color: 'bg-red-50 text-red-700 border-red-200', icon: XCircle },
    modified: { label: 'Devis modifié', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: FileText },
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <SkeletonScreen type="header" />
        <div className="max-w-lg mx-auto px-5 py-6">
          <SkeletonScreen type="card" />
          <SkeletonScreen type="list" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Header */}
      <header className="bg-white sticky top-0 z-30 shadow-sm border-b border-gray-100">
        <div className="max-w-lg mx-auto px-5 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-black text-gray-900">Révisions de devis</h1>
            <p className="text-xs text-gray-500">Gérez les demandes de révision</p>
          </div>
          <HomeButton />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-5 py-6">
        {/* Filtres */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
          {[
            { key: 'all', label: 'Toutes' },
            { key: 'pending', label: 'En attente' },
            { key: 'accepted', label: 'Acceptées' },
            { key: 'rejected', label: 'Refusées' },
            { key: 'modified', label: 'Modifiées' },
          ].map((f) => {
            const count = f.key === 'all' 
              ? revisions.length 
              : revisions.filter(r => r.status === f.key).length;
            
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key as any)}
                className={`px-4 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all ${
                  filter === f.key
                    ? 'bg-brand-500 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f.label}
                {count > 0 && (
                  <span className={`ml-2 px-1.5 py-0.5 rounded-full ${
                    filter === f.key ? 'bg-white/20' : 'bg-white'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Liste des révisions */}
        {filteredRevisions.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={28} className="text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium">
              {filter === 'all' ? 'Aucune révision' : `Aucune révision ${statusLabels[filter]?.label.toLowerCase()}`}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {filter === 'all' 
                ? 'Les demandes de révision apparaîtront ici'
                : 'Changez de filtre pour voir d\'autres révisions'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRevisions.map((revision) => {
              const statusInfo = statusLabels[revision.status] || statusLabels.pending;
              const StatusIcon = statusInfo.icon;
              const quote = revision.quotes;
              const project = revision.projects;
              const client = revision.profiles;

              return (
                <div
                  key={revision.id}
                  className={`bg-white rounded-2xl border-2 transition-all ${
                    revision.status === 'pending' 
                      ? 'border-yellow-200 bg-yellow-50/30' 
                      : 'border-gray-100'
                  }`}
                >
                  <div className="p-4">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-black text-gray-900">
                            {project?.title || 'Projet'}
                          </h3>
                          {project?.project_number && (
                            <span className="text-xs text-gray-400 font-mono">
                              {project.project_number}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">
                          Devis: {quote?.quote_number || revision.quote_id.slice(0, 8).toUpperCase()}
                        </p>
                        {client && (
                          <div className="flex items-center gap-2 mt-2">
                            <div className="w-6 h-6 rounded-full bg-gray-200 overflow-hidden">
                              {client.avatar_url ? (
                                <img src={client.avatar_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <span className="text-xs text-gray-400">{client.full_name?.[0]}</span>
                                </div>
                              )}
                            </div>
                            <span className="text-xs font-bold text-gray-700">{client.full_name}</span>
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold border ${statusInfo.color}`}>
                          <StatusIcon size={12} />
                          {statusInfo.label}
                        </span>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(revision.requested_at).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>

                    {/* Prix suggéré */}
                    {revision.suggested_price && (
                      <div className="bg-blue-50 rounded-xl p-3 mb-3 border border-blue-200">
                        <p className="text-xs font-bold text-blue-800 mb-1">Prix suggéré par le client</p>
                        <p className="text-lg font-black text-blue-900">
                          {Number(revision.suggested_price).toLocaleString('fr-FR')} FCFA
                        </p>
                        {quote?.amount && (
                          <p className="text-xs text-blue-700 mt-1">
                            Devis actuel: {Number(quote.amount).toLocaleString('fr-FR')} FCFA
                          </p>
                        )}
                      </div>
                    )}

                    {/* Commentaires */}
                    <div className="bg-gray-50 rounded-xl p-3 mb-3">
                      <p className="text-xs font-bold text-gray-700 mb-1">Commentaires du client :</p>
                      <p className="text-sm text-gray-600 leading-relaxed">{revision.client_comments}</p>
                    </div>

                    {/* Message vocal */}
                    {revision.audio_url && (
                      <div className="bg-brand-50 rounded-xl p-3 mb-3 border border-brand-200 flex items-center gap-3">
                        <button
                          onClick={() => new Audio(revision.audio_url).play()}
                          className="w-10 h-10 bg-brand-500 text-white rounded-full flex items-center justify-center flex-shrink-0"
                        >
                          <Play fill="currentColor" size={14} />
                        </button>
                        <div className="flex-1">
                          <p className="text-xs font-bold text-brand-800">Message vocal</p>
                          <p className="text-xs text-brand-600">Cliquez pour écouter</p>
                        </div>
                      </div>
                    )}

                    {/* Document joint */}
                    {revision.document_url && (
                      <div className="bg-purple-50 rounded-xl p-3 mb-3 border border-purple-200">
                        <a
                          href={revision.document_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 text-purple-700 hover:text-purple-900"
                        >
                          <FileText size={18} />
                          <div className="flex-1">
                            <p className="text-xs font-bold">Document joint</p>
                            <p className="text-xs">Cliquez pour télécharger</p>
                          </div>
                          <Download size={16} />
                        </a>
                      </div>
                    )}

                    {/* Réponse de l'artisan (si déjà répondu) */}
                    {revision.artisan_response && (
                      <div className="bg-green-50 rounded-xl p-3 mb-3 border border-green-200">
                        <div className="flex items-start gap-2">
                          <MessageCircle size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-xs font-bold text-green-800 mb-1">Votre réponse :</p>
                            <p className="text-sm text-green-900">{revision.artisan_response}</p>
                            {revision.responded_at && (
                              <p className="text-xs text-green-700 mt-1">
                                {new Date(revision.responded_at).toLocaleDateString('fr-FR')}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    {revision.status === 'pending' && (
                      <button
                        onClick={() => setSelectedRevisionId(revision.id)}
                        className="w-full bg-brand-500 text-white font-bold py-3 rounded-xl hover:bg-brand-600 transition-colors flex items-center justify-center gap-2"
                      >
                        <MessageCircle size={16} />
                        Répondre à la révision
                      </button>
                    )}

                    {revision.status !== 'pending' && (
                      <button
                        onClick={() => navigate(`/projects/${revision.project_id}`)}
                        className="w-full bg-gray-100 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                      >
                        <FileText size={16} />
                        Voir le projet
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal de réponse */}
      {selectedRevisionId && (() => {
        const revision = revisions.find(r => r.id === selectedRevisionId);
        const relatedQuote = revision ? revision.quotes : null;
        const relatedProject = revision ? revision.projects : null;
        
        // Construire l'objet quote avec artisan_id
        const quoteWithArtisan = {
          ...relatedQuote,
          artisan_id: relatedQuote?.artisan_id || revision.quotes?.artisan_id
        };
        
        return revision && quoteWithArtisan && relatedProject ? (
          <QuoteRevisionResponseModal
            isOpen={!!selectedRevisionId}
            onClose={() => {
              setSelectedRevisionId(null);
              fetchRevisions();
            }}
            revision={revision}
            quote={quoteWithArtisan}
            project={relatedProject}
            onSuccess={() => {
              fetchRevisions();
            }}
          />
        ) : null;
      })()}
    </div>
  );
}
