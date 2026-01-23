import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, ArrowLeft, Clock } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { supabase } from '../lib/supabase';

export function ConversationsPage() {
  const navigate = useNavigate();
  const auth = useAuth();
  const { profile } = useProfile();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.user || !profile) return;

    const fetchConversations = async () => {
      setLoading(true);
      try {
        // Récupérer tous les projets où l'utilisateur a des messages
        const { data: messagesData, error: messagesError } = await supabase
          .from('messages')
          .select(`
            project_id, 
            created_at, 
            projects!inner(
              id, 
              title, 
              status, 
              client_id, 
              target_artisan_id, 
              categories(name)
            )
          `)
          .eq('sender_id', auth.user.id)
          .order('created_at', { ascending: false });

        if (messagesError) {
          console.error('Error fetching messages:', messagesError);
          setLoading(false);
          return;
        }

        // Grouper par projet et récupérer le dernier message
        const projectMap = new Map();
        messagesData?.forEach((msg: any) => {
          const projectId = msg.project_id;
          if (!projectMap.has(projectId)) {
            projectMap.set(projectId, {
              project: msg.projects,
              lastMessageAt: msg.created_at,
            });
          } else {
            const existing = projectMap.get(projectId);
            if (new Date(msg.created_at) > new Date(existing.lastMessageAt)) {
              existing.lastMessageAt = msg.created_at;
            }
          }
        });

        // Récupérer les participants pour chaque projet
        const conversationsList = Array.from(projectMap.values()).map(async (conv) => {
          const project = conv.project;
          let participantId = null;
          
          if (profile.role === 'client') {
            participantId = project.target_artisan_id;
          } else {
            participantId = project.client_id;
          }

          if (participantId) {
            const { data: participantData } = await supabase
              .from('profiles')
              .select('id, full_name, avatar_url')
              .eq('id', participantId)
              .single();

            return {
              project,
              participant: participantData,
              lastMessageAt: conv.lastMessageAt,
            };
          }

          return {
            project,
            participant: null,
            lastMessageAt: conv.lastMessageAt,
          };
        });

        const resolved = await Promise.all(conversationsList);
        setConversations(resolved.sort((a, b) => 
          new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
        ));
      } catch (error) {
        console.error('Error fetching conversations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, [auth.user, profile]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-lg mx-auto px-5 py-6">
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
            <div className="w-12 h-12 border-3 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        </div>
      </div>
    );
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
        {conversations.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <MessageSquare size={28} className="text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium">Aucune conversation</p>
            <p className="text-sm text-gray-400 mt-1">Vos messages apparaîtront ici</p>
          </div>
        ) : (
          <div className="space-y-3">
            {conversations.map((conv) => (
              <button
                key={conv.project.id}
                onClick={() => navigate(`/chat/${conv.project.id}`)}
                className="w-full bg-white rounded-2xl p-4 border border-gray-100 text-left hover:border-brand-200 hover:shadow-md transition-all active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-brand-100 flex items-center justify-center flex-shrink-0">
                    {conv.participant?.avatar_url ? (
                      <img 
                        src={conv.participant.avatar_url} 
                        alt={conv.participant.full_name || 'User'} 
                        className="w-full h-full rounded-xl object-cover"
                      />
                    ) : (
                      <MessageSquare size={20} className="text-brand-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-bold text-gray-900 truncate">
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
                      {conv.project.title || 'Projet sans titre'}
                    </p>
                    {conv.project.categories && (
                      <span className="inline-block mt-1 px-2 py-0.5 bg-brand-50 text-brand-700 text-xs font-bold rounded-lg">
                        {conv.project.categories.name}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
