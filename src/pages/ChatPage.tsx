import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Send, Mic, Play, Pause, MoreVertical, Image as ImageIcon, 
  X, Check, User, Phone, PhoneOff, Video, Info, Clock, CheckCheck
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useMessages } from '../hooks/useMessages';
import { useNotifications } from '../hooks/useNotifications';
import { useCall } from '../hooks/useCall';
import { AudioRecorder } from '../components/AudioRecorder';
import { supabase } from '../lib/supabase';
import { notifyNewMessage } from '../lib/notificationService';

interface ProjectInfo {
  id: string;
  title: string;
  client_id: string;
  profiles?: { full_name: string; avatar_url: string };
}

interface ParticipantInfo {
  id: string;
  name: string;
  avatar: string | null;
  role: 'client' | 'artisan';
}

export function ChatPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const auth = useAuth();
  const { messages, sendMessage, loading } = useMessages(projectId);
  const { markAsReadForProject } = useNotifications();

  const [inputText, setInputText] = useState('');
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);
  const [project, setProject] = useState<ProjectInfo | null>(null);
  const [participant, setParticipant] = useState<ParticipantInfo | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [sending, setSending] = useState(false);

  const myName = auth.user?.user_metadata?.full_name || '';
  const {
    status: callStatus,
    incomingCallFrom,
    error: callError,
    remoteStream,
    localStream,
    isVideoCall,
    startCall,
    endCall,
    acceptCall,
    rejectCall,
  } = useCall(projectId, participant?.id, auth.user?.id, myName);

  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) remoteVideoRef.current.srcObject = remoteStream;
  }, [remoteStream]);
  useEffect(() => {
    if (localVideoRef.current && localStream) localVideoRef.current.srcObject = localStream;
  }, [localStream]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);

  /** Hauteurs fixes pour les barres audio (évite le recalcul à chaque render) */
  const AUDIO_BAR_HEIGHTS = [10, 14, 8, 16, 11, 13, 9, 15, 12, 10, 14, 11];

  // Fetch project and participant info
  useEffect(() => {
    const fetchProjectInfo = async () => {
      if (!projectId || !auth.user) return;
      
      // Get project with client info
      const { data: projectData } = await supabase
        .from('projects')
        .select(`
          id, title, client_id, target_artisan_id,
          profiles!projects_client_id_fkey (full_name, avatar_url)
        `)
        .eq('id', projectId)
        .single();
      
      if (projectData) {
        setProject(projectData);
        
        // Determine the other participant
        const isClient = projectData.client_id === auth.user.id;
        
        if (isClient) {
          // 1) Artisan du devis accepté
          const { data: acceptedQuote } = await supabase
            .from('quotes')
            .select(`
              artisan_id,
              profiles!quotes_artisan_id_fkey (full_name, avatar_url)
            `)
            .eq('project_id', projectId)
            .eq('status', 'accepted')
            .maybeSingle();
          
          if (acceptedQuote?.profiles) {
            setParticipant({
              id: acceptedQuote.artisan_id,
              name: acceptedQuote.profiles.full_name,
              avatar: acceptedQuote.profiles.avatar_url,
              role: 'artisan',
            });
          } else {
            // 2) Sinon premier artisan ayant un devis sur le projet (en attente ou vu)
            const { data: quotesList } = await supabase
              .from('quotes')
              .select(`
                artisan_id,
                profiles!quotes_artisan_id_fkey (full_name, avatar_url)
              `)
              .eq('project_id', projectId)
              .in('status', ['pending', 'viewed'])
              .order('created_at', { ascending: false })
              .limit(1);
            const anyQuote = (quotesList as { artisan_id: string; profiles: { full_name: string | null; avatar_url: string | null } }[] | null)?.[0];
            
            if (anyQuote?.profiles) {
              setParticipant({
                id: anyQuote.artisan_id,
                name: anyQuote.profiles.full_name,
                avatar: anyQuote.profiles.avatar_url,
                role: 'artisan',
              });
            } else if ((projectData as { target_artisan_id?: string }).target_artisan_id) {
              // 3) Sinon artisan ciblé par le projet
              const tid = (projectData as { target_artisan_id: string }).target_artisan_id;
              const { data: targetProfile } = await supabase
                .from('profiles')
                .select('id, full_name, avatar_url')
                .eq('id', tid)
                .single();
              if (targetProfile) {
                setParticipant({
                  id: targetProfile.id,
                  name: targetProfile.full_name,
                  avatar: targetProfile.avatar_url,
                  role: 'artisan',
                });
              }
            }
          }
        } else {
          // Current user is the artisan, show client info
          setParticipant({
            id: projectData.client_id,
            name: projectData.profiles?.full_name || 'Client',
            avatar: projectData.profiles?.avatar_url || null,
            role: 'client',
          });
        }
      }
    };
    
    fetchProjectInfo();
  }, [projectId, auth.user]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Marquer les notifications "nouveau message" de ce projet comme lues à l'ouverture du chat
  useEffect(() => {
    if (projectId) markAsReadForProject(projectId);
  }, [projectId, markAsReadForProject]);

  // Scroll vers le bas : au premier chargement, ou si l'utilisateur était déjà proche du bas
  const prevCountRef = useRef(0);
  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el || messages.length === 0) return;
    const wasEmpty = prevCountRef.current === 0;
    prevCountRef.current = messages.length;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
    if (wasEmpty || nearBottom) {
      requestAnimationFrame(() => scrollToBottom());
    }
  }, [messages]);

  // Son à la réception d'un nouveau message (type Messenger/WhatsApp) : uniquement pour les messages reçus, pas au chargement initial
  const prevMessagesLenRef = useRef<number | null>(null);
  useEffect(() => {
    if (!auth.user?.id || messages.length === 0) return;
    const prev = prevMessagesLenRef.current;
    const isNewIncoming =
      prev !== null &&
      messages.length > prev &&
      messages[messages.length - 1]?.sender_id &&
      messages[messages.length - 1].sender_id !== auth.user.id;
    prevMessagesLenRef.current = messages.length;
    if (isNewIncoming) {
      try {
        const audio = new Audio('/notification.mp3');
        audio.volume = 0.4;
        audio.play().catch(() => {});
      } catch (_) {}
    }
  }, [messages, auth.user?.id]);

  // Handle audio playback
  const toggleAudioPlayback = (messageId: string, audioUrl: string) => {
    const currentAudio = audioRefs.current.get(messageId);
    
    if (playingAudioId === messageId && currentAudio) {
      currentAudio.pause();
      setPlayingAudioId(null);
    } else {
      // Pause any currently playing audio
      audioRefs.current.forEach((audio) => audio.pause());
      
      // Create or get audio element
      let audio = audioRefs.current.get(messageId);
      if (!audio) {
        audio = new Audio(audioUrl);
        audio.onended = () => setPlayingAudioId(null);
        audioRefs.current.set(messageId, audio);
      }
      
      audio.play();
      setPlayingAudioId(messageId);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || !projectId || !auth.user || sending) return;
    
    setSending(true);
    try {
      await sendMessage({
        project_id: projectId,
        sender_id: auth.user.id,
        content: inputText,
        type: 'text'
      });
      
      // Notifier le destinataire
      if (participant) {
        await notifyNewMessage(projectId, participant.id, auth.user.user_metadata?.full_name || 'Quelqu\'un');
      }
      
      setInputText('');
    } catch (err) {
      console.error("Error sending message:", err);
    } finally {
      setSending(false);
    }
  };

  const handleAudioComplete = async (blob: Blob) => {
    if (!projectId || !auth.user) return;
    
    setSending(true);
    try {
      const fileName = `${auth.user.id}/${Date.now()}.webm`;
      const { data, error } = await supabase.storage
        .from('audio')
        .upload(`messages/${fileName}`, blob);
      
      if (error) throw error;
      const audioUrl = supabase.storage.from('audio').getPublicUrl(data.path).data.publicUrl;

      await sendMessage({
        project_id: projectId,
        sender_id: auth.user.id,
        audio_url: audioUrl,
        type: 'audio'
      });

      // Notifier le destinataire
      if (participant) {
        await notifyNewMessage(projectId, participant.id, auth.user.user_metadata?.full_name || 'Quelqu\'un');
      }

      setShowAudioRecorder(false);
    } catch (err) {
      console.error("Error sending audio:", err);
    } finally {
      setSending(false);
    }
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !projectId || !auth.user) return;
    const isVideo = file.type.startsWith('video/');
    const messageType = isVideo ? 'video' : 'image';

    setSending(true);
    try {
      const fileName = `${auth.user.id}/${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage
        .from('photos')
        .upload(`messages/${fileName}`, file);
      
      if (error) throw error;
      const mediaUrl = supabase.storage.from('photos').getPublicUrl(data.path).data.publicUrl;

      await sendMessage({
        project_id: projectId,
        sender_id: auth.user.id,
        content: mediaUrl,
        type: messageType
      });

      if (participant) {
        await notifyNewMessage(projectId, participant.id, auth.user.user_metadata?.full_name || 'Quelqu\'un');
      }
    } catch (err) {
      console.error('Error sending media:', err);
    } finally {
      setSending(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups: { date: string; messages: typeof messages }[], message) => {
    const date = new Date(message.created_at!).toLocaleDateString('fr-FR', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long' 
    });
    
    const existingGroup = groups.find(g => g.date === date);
    if (existingGroup) {
      existingGroup.messages.push(message);
    } else {
      groups.push({ date, messages: [message] });
    }
    
    return groups;
  }, []);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="px-4 py-3 bg-white border-b shadow-sm flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)} 
            className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          
          {(participant || project) && (
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center overflow-hidden">
                  {participant?.avatar ? (
                    <img src={participant.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User size={20} className="text-brand-500" />
                  )}
                </div>
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-sm">{participant?.name ?? 'Professionnel'}</p>
                <p className="text-[10px] text-green-500 font-bold uppercase tracking-wider flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  En ligne
                </p>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 flex-shrink-0" title="Appels en développement • Bientôt disponible">
            <span className="text-[10px] font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-1.5 sm:px-2 py-0.5 whitespace-nowrap">
              <span className="sm:hidden">Bientôt</span>
              <span className="hidden sm:inline">En dev • Bientôt</span>
            </span>
            <button
              type="button"
              disabled
              className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-300 bg-gray-50 cursor-not-allowed"
              title="Appel audio — en développement, disponible prochainement"
              aria-label="Appel audio (bientôt disponible)"
            >
              <Phone size={18} />
            </button>
            <button
              type="button"
              disabled
              className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-300 bg-gray-50 cursor-not-allowed"
              title="Appel vidéo — en développement, disponible prochainement"
              aria-label="Appel vidéo (bientôt disponible)"
            >
              <Video size={18} />
            </button>
          </div>
          <button 
            onClick={() => setShowMenu(!showMenu)}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors"
          >
            <MoreVertical size={18} />
          </button>
        </div>
        
        {/* Dropdown Menu */}
        {showMenu && (
          <div className="absolute right-4 top-16 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-20 animate-in fade-in slide-in-from-top-2 duration-200">
            <button 
              onClick={() => {
                navigate(`/projects/${projectId}`);
                setShowMenu(false);
              }}
              className="w-full px-4 py-3 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <Info size={16} />
              Voir le projet
            </button>
          </div>
        )}
      </header>

      {/* Project Info Banner */}
      {project && (
        <div className="px-4 py-2 bg-brand-50 border-b border-brand-100">
          <p className="text-xs text-brand-600 font-medium text-center">
            Discussion pour : <span className="font-bold">{project.title}</span>
          </p>
        </div>
      )}

      {/* Barre appel en cours / connecté (audio) */}
      {(callStatus === 'calling' || callStatus === 'connected') && !isVideoCall && (
        <div className="px-4 py-3 bg-brand-500 text-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-2 h-2 rounded-full bg-white animate-pulse flex-shrink-0" />
            <span className="text-sm font-bold truncate">
              {callStatus === 'calling' && !incomingCallFrom && 'Appel en cours…'}
              {callStatus === 'connected' && participant && `En appel avec ${participant.name}`}
              {callStatus === 'calling' && incomingCallFrom && 'Connexion…'}
            </span>
          </div>
          <button
            type="button"
            onClick={endCall}
            className="flex-shrink-0 w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
            aria-label="Raccrocher"
          >
            <PhoneOff size={18} />
          </button>
        </div>
      )}

      {/* Appel vidéo connecté : flux distant + local + raccrocher */}
      {callStatus === 'connected' && isVideoCall && (
        <div className="absolute inset-0 z-40 flex flex-col bg-gray-900">
          <div className="relative flex-1 min-h-0">
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
            {localStream && (
              <div className="absolute bottom-4 right-4 w-32 h-40 rounded-xl overflow-hidden border-2 border-white shadow-lg">
                <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
              </div>
            )}
          </div>
          <div className="p-4 bg-black/60 flex items-center justify-center gap-4">
            <span className="text-white text-sm font-medium truncate">
              En appel avec {participant?.name || '…'}
            </span>
            <button
              type="button"
              onClick={endCall}
              className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition-colors"
              aria-label="Raccrocher"
            >
              <PhoneOff size={24} className="text-white" />
            </button>
          </div>
        </div>
      )}

      {/* Appel vidéo en cours de connexion (pas encore connecté) */}
      {(callStatus === 'calling' && isVideoCall) && (
        <div className="px-4 py-3 bg-brand-500 text-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-2 h-2 rounded-full bg-white animate-pulse flex-shrink-0" />
            <span className="text-sm font-bold truncate">
              Appel vidéo en cours…
            </span>
          </div>
          <button
            type="button"
            onClick={endCall}
            className="flex-shrink-0 w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
            aria-label="Raccrocher"
          >
            <PhoneOff size={18} />
          </button>
        </div>
      )}

      {/* Erreur appel */}
      {callError && (
        <div className="px-4 py-2 bg-red-50 border-b border-red-100 flex items-center justify-center">
          <p className="text-sm font-medium text-red-600">{callError}</p>
        </div>
      )}

      {/* Messages Area */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 py-4 scroll-smooth"
      >
        {loading ? (
          <div className="flex flex-col gap-4 py-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`h-12 rounded-2xl w-[70%] max-w-[240px] animate-pulse ${
                    i % 2 === 0 ? 'bg-brand-200/50 rounded-br-sm' : 'bg-gray-200 rounded-bl-sm'
                  }`}
                />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Send size={24} className="text-gray-300" />
            </div>
            <p className="text-gray-400 font-medium">Aucun message</p>
            <p className="text-xs text-gray-300 mt-1">Commencez la conversation !</p>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedMessages.map((group) => (
              <div key={group.date}>
                {/* Date Separator */}
                <div className="flex items-center justify-center mb-4">
                  <span className="px-3 py-1 bg-gray-100 text-gray-500 text-[10px] font-medium uppercase tracking-wider rounded-full">
                    {group.date}
                  </span>
                </div>
                
                {/* Messages */}
                <div className="space-y-3">
                  {group.messages.map((msg) => {
                    const isMe = msg.sender_id === auth.user?.id;
                    const isPlaying = playingAudioId === msg.id;
                    
                    return (
                      <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-1 duration-200`}>
                        <div className={`max-w-[80%] ${isMe ? 'order-2' : 'order-1'}`}>
                          <div className={`rounded-2xl px-4 py-3 transition-all duration-200 ${
                            isMe 
                              ? 'bg-brand-500 text-white rounded-br-sm' 
                              : 'bg-white border border-gray-100 text-gray-800 rounded-bl-sm shadow-sm'
                          }`}>
                            {/* Text Message */}
                            {msg.type === 'text' && (
                              <p className="text-sm leading-relaxed">{msg.content}</p>
                            )}
                            
                            {/* Audio Message */}
                            {msg.type === 'audio' && msg.audio_url && (
                              <button 
                                onClick={() => toggleAudioPlayback(msg.id, msg.audio_url!)}
                                className={`flex items-center gap-3 py-1 min-w-[140px] ${isMe ? 'text-white' : 'text-brand-600'}`}
                              >
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                  isMe ? 'bg-white/20' : 'bg-brand-100'
                                }`}>
                                  {isPlaying ? (
                                    <Pause size={18} fill="currentColor" />
                                  ) : (
                                    <Play size={18} fill="currentColor" className="ml-0.5" />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-1">
                                    {AUDIO_BAR_HEIGHTS.map((h, i) => (
                                      <div 
                                        key={i} 
                                        className={`w-1 rounded-full ${
                                          isMe ? 'bg-white/60' : 'bg-brand-300'
                                        } ${isPlaying ? 'animate-pulse' : ''}`}
                                        style={{ 
                                          height: `${h}px`,
                                          animationDelay: `${i * 50}ms`
                                        }}
                                      />
                                    ))}
                                  </div>
                                  <p className={`text-[9px] font-bold uppercase tracking-wider mt-1 ${
                                    isMe ? 'text-white/70' : 'text-gray-400'
                                  }`}>
                                    Message vocal
                                  </p>
                                </div>
                              </button>
                            )}
                            
                            {/* Image Message */}
                            {msg.type === 'image' && msg.content && (
                              <img 
                                src={msg.content} 
                                alt="Image partagée" 
                                className="rounded-xl max-w-full max-h-60 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => window.open(msg.content!, '_blank')}
                              />
                            )}

                            {/* Video Message */}
                            {msg.type === 'video' && msg.content && (
                              <video
                                src={msg.content}
                                controls
                                className="rounded-xl max-w-full max-h-64 w-full object-contain bg-black"
                                preload="metadata"
                                playsInline
                              />
                            )}
                          </div>
                          
                          {/* Time & Status */}
                          <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <span className="text-[10px] text-gray-400">
                              {new Date(msg.created_at!).toLocaleTimeString('fr-FR', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </span>
                            {isMe && (
                              <CheckCheck size={12} className="text-brand-400" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t safe-area-pb">
        {showAudioRecorder ? (
          <div className="animate-in slide-in-from-bottom-4 duration-300">
            <AudioRecorder 
              onRecordingComplete={handleAudioComplete} 
              onDelete={() => setShowAudioRecorder(false)} 
            />
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {/* Image & Video Upload */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleMediaUpload}
              className="hidden"
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={sending}
              className="w-12 h-12 rounded-xl bg-gray-100 text-gray-500 flex items-center justify-center hover:bg-gray-200 transition-all duration-200 active:scale-95 disabled:opacity-50"
              title="Photo ou vidéo"
            >
              <ImageIcon size={20} />
            </button>
            
            {/* Audio Button */}
            <button 
              onClick={() => setShowAudioRecorder(true)}
              disabled={sending}
              className="w-12 h-12 rounded-xl bg-brand-50 text-brand-500 flex items-center justify-center hover:bg-brand-100 transition-all duration-200 active:scale-95 disabled:opacity-50"
            >
              <Mic size={20} />
            </button>
            
            {/* Text Input */}
            <div className="flex-1 relative">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Votre message..."
                disabled={sending}
                className="w-full pl-4 pr-12 py-3 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 ring-brand-200 transition-all text-sm disabled:opacity-50"
              />
              <button 
                onClick={handleSendMessage}
                disabled={!inputText.trim() || sending}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 bg-brand-500 text-white rounded-lg flex items-center justify-center disabled:opacity-50 disabled:bg-gray-300 transition-all duration-200 active:scale-95"
              >
                {sending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send size={16} />
                )}
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Menu Overlay */}
      {showMenu && (
        <div 
          className="fixed inset-0 z-10" 
          onClick={() => setShowMenu(false)} 
        />
      )}

      {/* Appel entrant (audio ou vidéo) */}
      {callStatus === 'ringing' && incomingCallFrom && (
        <>
          <div className="fixed inset-0 z-20 bg-black/50" aria-hidden="true" />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 w-[90%] max-w-sm bg-white rounded-2xl shadow-xl p-6 text-center animate-in fade-in zoom-in-95 duration-200">
            <p className="text-sm text-gray-500 mb-1">
              {incomingCallFrom.video ? 'Appel vidéo entrant' : 'Appel entrant'}
            </p>
            <h3 className="text-xl font-bold text-gray-900 mb-6">{incomingCallFrom.name} vous appelle</h3>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={rejectCall}
                className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
              >
                <PhoneOff size={20} />
                Refuser
              </button>
              <button
                type="button"
                onClick={acceptCall}
                className="flex-1 py-3 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
              >
                {incomingCallFrom.video ? <Video size={20} /> : <Phone size={20} />}
                Accepter
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
