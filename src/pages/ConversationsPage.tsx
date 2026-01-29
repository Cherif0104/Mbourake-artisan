import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, ArrowLeft, Clock, Search } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { useNotifications } from '../hooks/useNotifications';
import { supabase } from '../lib/supabase';
import { LoadingOverlay } from '../components/LoadingOverlay';

function lastMessagePreview(row: { type: string; content: string | null } | undefined): string {
  if (!row) return '';
  if (row.type === 'image') return 'Photo';
  if (row.type === 'video') return 'Vidéo';
  if (row.type === 'audio') return 'Message vocal';
  const text = (row.content || '').trim();
  return text.length > 45 ? text.slice(0, 45) + '…' : text;
}

/** Normalise pour la recherche (minuscules, sans accents) */
function normalizeForSearch(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

export function ConversationsPage() {
  const navigate = useNavigate();
  const auth = useAuth();
  const { profile } = useProfile();
  const { notifications } = useNotifications();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!auth.user || !profile) return;

    const fetchConversations = async () => {
      setLoading(true);
      try {
        type ProjectRow = {
          id: string;
          title: string | null;
          status: string;
          client_id: string;
          target_artisan_id: string | null;
          updated_at: string;
          categories?: { name: string } | null;
        };

        let projects: ProjectRow[] = [];

        if (profile.role === 'client') {
          const { data, error } = await supabase
            .from('projects')
            .select('id, title, status, client_id, target_artisan_id, updated_at, categories(name)')
            .eq('client_id', auth.user.id)
            .not('status', 'in', '("cancelled","expired")')
            .order('updated_at', { ascending: false });
          if (error) throw error;
          projects = (data as ProjectRow[]) || [];
        } else {
          // Artisan : tous les projets où j'ai un devis (en attente, vu ou accepté) — pas seulement accepté
          const { data: quotesData, error: quotesError } = await supabase
            .from('quotes')
            .select(`
              project_id,
              projects (id, title, status, client_id, target_artisan_id, updated_at, categories(name))
            `)
            .eq('artisan_id', auth.user.id)
            .in('status', ['pending', 'viewed', 'accepted']);
          if (quotesError) throw quotesError;
          const byId = new Map<string, ProjectRow>();
          (quotesData as { project_id: string; projects: ProjectRow }[] | null)?.forEach((q) => {
            const p = q.projects;
            if (p && p.id && !['cancelled', 'expired'].includes(p.status)) byId.set(p.id, p);
          });
          projects = Array.from(byId.values());
        }

        if (projects.length === 0) {
          setConversations([]);
          setLoading(false);
          return;
        }

        const projectIds = projects.map((p) => p.id);

        const { data: lastMessages } = await supabase
          .from('messages')
          .select('project_id, created_at, content, type')
          .in('project_id', projectIds)
          .order('created_at', { ascending: false });

        type LastMsg = { created_at: string; content: string | null; type: string };
        const lastMessageByProject = new Map<string, LastMsg>();
        (lastMessages as { project_id: string; created_at: string; content: string | null; type: string }[] | null)?.forEach((row) => {
          if (!lastMessageByProject.has(row.project_id)) {
            lastMessageByProject.set(row.project_id, { created_at: row.created_at, content: row.content, type: row.type || 'text' });
          }
        });

        const conversationsList = await Promise.all(
          projects.map(async (project) => {
            let participantId: string | null = null;
            if (profile.role === 'client') {
              const { data: acceptedQuote } = await supabase
                .from('quotes')
                .select('artisan_id')
                .eq('project_id', project.id)
                .eq('status', 'accepted')
                .maybeSingle();
              participantId = (acceptedQuote as { artisan_id: string } | null)?.artisan_id ?? null;
              if (!participantId) {
                const { data: anyQuoteList } = await supabase
                  .from('quotes')
                  .select('artisan_id')
                  .eq('project_id', project.id)
                  .in('status', ['pending', 'viewed'])
                  .order('created_at', { ascending: false })
                  .limit(1);
                const anyQuote = (anyQuoteList as { artisan_id: string }[] | null)?.[0];
                participantId = anyQuote?.artisan_id ?? null;
              }
              if (!participantId && project.target_artisan_id) {
                participantId = project.target_artisan_id;
              }
            } else {
              participantId = project.client_id;
            }
            const lastMsg = lastMessageByProject.get(project.id);
            const lastMessageAt = lastMsg?.created_at || project.updated_at;
            const lastMessagePreviewText = lastMessagePreview(lastMsg);
            let participant: { id: string; full_name: string | null; avatar_url: string | null } | null = null;
            if (participantId) {
              const { data: participantData } = await supabase
                .from('profiles')
                .select('id, full_name, avatar_url')
                .eq('id', participantId)
                .single();
              participant = participantData as typeof participant;
            }
            return { project, participant, lastMessageAt, lastMessagePreviewText };
          })
        );

        conversationsList.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
        setConversations(conversationsList);
      } catch (error) {
        console.error('Error fetching conversations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, [auth.user, profile]);

  const filteredConversations = useMemo(() => {
    const q = normalizeForSearch(searchQuery).trim();
    if (!q) return conversations;
    return conversations.filter((conv) => {
      const name = normalizeForSearch(conv.participant?.full_name || '');
      const title = normalizeForSearch(conv.project?.title || '');
      const preview = normalizeForSearch(conv.lastMessagePreviewText || '');
      const category = normalizeForSearch(conv.project?.categories?.name || '');
      return name.includes(q) || title.includes(q) || preview.includes(q) || category.includes(q);
    });
  }, [conversations, searchQuery]);

  if (loading) {
    return <LoadingOverlay />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg sticky top-0 z-30 shadow-sm border-b border-gray-100/50">
        <div className="max-w-lg mx-auto px-5 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl font-black text-gray-900">Messages</h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-lg mx-auto px-5 py-6">
        {conversations.length > 0 && (
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher une discussion (nom, projet, message…)"
                className="w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-transparent"
                aria-label="Rechercher dans les discussions"
              />
            </div>
          </div>
        )}

        {conversations.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <MessageSquare size={28} className="text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium">Aucun projet en cours</p>
            <p className="text-sm text-gray-400 mt-1">Les discussions de vos projets actifs apparaîtront ici</p>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
            <Search size={32} className="mx-auto text-gray-200 mb-4" />
            <p className="text-gray-500 font-medium">Aucune discussion trouvée</p>
            <p className="text-sm text-gray-400 mt-1">Essayez avec un autre mot-clé (nom, titre du projet, message)</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredConversations.map((conv, index) => {
              const hasUnread = notifications.some(
                n => !n.is_read && n.type === 'new_message' && n.data?.project_id === conv.project.id
              );
              return (
                <button
                  key={conv.project.id}
                  onClick={() => navigate(`/chat/${conv.project.id}`)}
                  className={`w-full bg-white rounded-2xl p-4 border text-left shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:border-brand-100 transition-all duration-200 active:scale-[0.99] animate-in fade-in slide-in-from-bottom-2 duration-300 ${
                    hasUnread ? 'border-brand-200 bg-brand-50/40' : 'border-gray-100'
                  }`}
                  style={{ animationDelay: `${index * 40}ms`, animationFillMode: 'both' } as React.CSSProperties}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative w-12 h-12 rounded-xl bg-brand-100 flex items-center justify-center flex-shrink-0">
                      {conv.participant?.avatar_url ? (
                        <img 
                          src={conv.participant.avatar_url} 
                          alt={conv.participant.full_name || 'User'} 
                          className="w-full h-full rounded-xl object-cover"
                        />
                      ) : (
                        <MessageSquare size={20} className="text-brand-600" />
                      )}
                      {hasUnread && (
                        <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-brand-500 rounded-full border-2 border-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className={`font-bold truncate ${hasUnread ? 'text-gray-900' : 'text-gray-900'}`}>
                          {conv.participant?.full_name || 'Utilisateur'}
                        </p>
                        <span className="text-xs text-gray-400 flex items-center gap-1 flex-shrink-0 ml-2">
                          <Clock size={12} />
                          {new Date(conv.lastMessageAt).toLocaleDateString('fr-FR', { 
                            day: 'numeric', 
                            month: 'short' 
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 truncate">
                        {conv.lastMessagePreviewText || (conv.project.title || 'Projet sans titre')}
                      </p>
                      {conv.project.categories && (
                        <span className="inline-block mt-1 px-3 py-1 bg-brand-50 text-brand-700 text-xs font-bold rounded-full border border-brand-100">
                          {conv.project.categories.name}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
