import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';

type CallStatus = 'idle' | 'calling' | 'ringing' | 'connected' | 'ended';

type CallSignal =
  | { type: 'offer'; from: string; to: string; senderName: string; sdp: RTCSessionDescriptionInit; video?: boolean }
  | { type: 'answer'; from: string; to: string; sdp: RTCSessionDescriptionInit }
  | { type: 'ice'; from: string; to: string; candidate: RTCIceCandidateInit }
  | { type: 'hangup'; from: string; to?: string }
  | { type: 'reject'; from: string; to: string };

const CALL_EVENT = 'call_signal';

function getPayload(msg: unknown): CallSignal | null {
  if (msg && typeof msg === 'object' && 'payload' in msg && msg.payload && typeof msg.payload === 'object') {
    return msg.payload as CallSignal;
  }
  if (msg && typeof msg === 'object' && 'type' in msg) {
    return msg as CallSignal;
  }
  return null;
}

export function useCall(
  projectId: string | undefined,
  recipientId: string | undefined,
  myUserId: string | undefined,
  myName: string
) {
  const [status, setStatus] = useState<CallStatus>('idle');
  const [incomingCallFrom, setIncomingCallFrom] = useState<{ id: string; name: string; video: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isVideoCall, setIsVideoCall] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const channelStatusRef = useRef<string>('');
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);
  const pendingOfferFromRef = useRef<{ id: string; name: string; video: boolean } | null>(null);

  const cleanup = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    channelStatusRef.current = '';
    pendingOfferRef.current = null;
    pendingOfferFromRef.current = null;
    setRemoteStream(null);
    setLocalStream(null);
    setIsVideoCall(false);
  }, []);

  const endCall = useCallback(() => {
    if (channelRef.current && myUserId) {
      channelRef.current.send({
        type: 'broadcast',
        event: CALL_EVENT,
        payload: { type: 'hangup', from: myUserId } as CallSignal,
      });
    }
    cleanup();
    setStatus('idle');
    setIncomingCallFrom(null);
    setError(null);
  }, [myUserId, cleanup]);

  useEffect(() => {
    if (!projectId || !myUserId) return;

    const channel = supabase.channel(`call-${projectId}`);
    channelRef.current = channel;

    channel
      .on('broadcast', { event: CALL_EVENT }, (message: unknown) => {
        const p = getPayload(message);
        if (!p || p.from === myUserId) return;

        if (p.type === 'offer' && p.to === myUserId) {
          const senderName = (p as { senderName?: string }).senderName || 'Quelqu\'un';
          const video = !!(p as { video?: boolean }).video;
          setIncomingCallFrom({ id: p.from, name: senderName, video });
          pendingOfferRef.current = p.sdp;
          pendingOfferFromRef.current = { id: p.from, name: senderName, video };
          setStatus('ringing');
        } else if (p.type === 'answer' && p.to === myUserId && pcRef.current) {
          pcRef.current.setRemoteDescription(new RTCSessionDescription(p.sdp)).catch(console.error);
        } else if (p.type === 'ice' && p.to === myUserId && pcRef.current) {
          if (p.candidate) {
            pcRef.current.addIceCandidate(new RTCIceCandidate(p.candidate)).catch(console.error);
          }
        } else if (p.type === 'hangup' && p.from !== myUserId) {
          cleanup();
          setStatus('idle');
          setIncomingCallFrom(null);
        } else if (p.type === 'reject' && p.to === myUserId) {
          cleanup();
          setStatus('idle');
          setError('Appel refusé');
          setTimeout(() => setError(null), 3000);
        }
      })
      .subscribe((status) => {
        channelStatusRef.current = status;
      });

    return () => {
      endCall();
    };
  }, [projectId, myUserId, endCall]);

  const waitForChannelReady = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (channelStatusRef.current === 'SUBSCRIBED') {
        resolve();
        return;
      }
      const deadline = Date.now() + 5000;
      const t = setInterval(() => {
        if (channelStatusRef.current === 'SUBSCRIBED') {
          clearInterval(t);
          resolve();
        } else if (Date.now() > deadline) {
          clearInterval(t);
          reject(new Error('Canal non prêt'));
        }
      }, 100);
    });
  }, []);

  const startCall = useCallback(async (options: { video?: boolean } = {}) => {
    const video = !!options.video;
    if (!projectId || !recipientId || !myUserId) return;
    setError(null);
    setStatus('calling');
    setIsVideoCall(video);

    try {
      await waitForChannelReady();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: video ? { facingMode: 'user' } : false });
      localStreamRef.current = stream;
      setLocalStream(stream);

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      pcRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.onicecandidate = (e) => {
        if (e.candidate && channelRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: CALL_EVENT,
            payload: { type: 'ice', from: myUserId, to: recipientId, candidate: e.candidate.toJSON() } as CallSignal,
          });
        }
      };

      pc.ontrack = (e) => {
        if (e.streams?.[0]) setRemoteStream(e.streams[0]);
        else if (e.stream) setRemoteStream(e.stream);
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') setStatus('connected');
        if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
          endCall();
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      if (!channelRef.current) throw new Error('Canal non disponible');
      channelRef.current.send({
        type: 'broadcast',
        event: CALL_EVENT,
        payload: {
          type: 'offer',
          from: myUserId,
          to: recipientId,
          senderName: myName || 'Quelqu\'un',
          sdp: offer,
          video,
        } as CallSignal,
      });
    } catch (err) {
      console.error('Start call error:', err);
      setError(err instanceof Error ? err.message : 'Impossible d\'accéder au micro ou à la caméra');
      setStatus('idle');
      setIsVideoCall(false);
      cleanup();
    }
  }, [projectId, recipientId, myUserId, myName, cleanup, endCall, waitForChannelReady]);

  const acceptCall = useCallback(async () => {
    const offer = pendingOfferRef.current;
    const from = pendingOfferFromRef.current;
    if (!offer || !from || !projectId || !myUserId) return;

    const video = from.video;
    setIncomingCallFrom(null);
    setStatus('calling');
    setError(null);
    setIsVideoCall(video);
    pendingOfferRef.current = null;
    pendingOfferFromRef.current = null;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: video ? { facingMode: 'user' } : false });
      localStreamRef.current = stream;
      setLocalStream(stream);

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      pcRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.onicecandidate = (e) => {
        if (e.candidate && channelRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: CALL_EVENT,
            payload: { type: 'ice', from: myUserId, to: from.id, candidate: e.candidate.toJSON() } as CallSignal,
          });
        }
      };

      pc.ontrack = (e) => {
        if (e.streams?.[0]) setRemoteStream(e.streams[0]);
        else if (e.stream) setRemoteStream(e.stream);
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') setStatus('connected');
        if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
          endCall();
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      if (!channelRef.current) throw new Error('Canal non disponible');
      channelRef.current.send({
        type: 'broadcast',
        event: CALL_EVENT,
        payload: { type: 'answer', from: myUserId, to: from.id, sdp: answer } as CallSignal,
      });
    } catch (err) {
      console.error('Accept call error:', err);
      setError('Impossible de rejoindre l\'appel');
      setStatus('idle');
      setIncomingCallFrom(null);
      setIsVideoCall(false);
      cleanup();
    }
  }, [projectId, myUserId, cleanup, endCall]);

  const rejectCall = useCallback(() => {
    const from = pendingOfferFromRef.current;
    if (from && channelRef.current && myUserId) {
      channelRef.current.send({
        type: 'broadcast',
        event: CALL_EVENT,
        payload: { type: 'reject', from: myUserId, to: from.id } as CallSignal,
      });
    }
    setIncomingCallFrom(null);
    pendingOfferRef.current = null;
    pendingOfferFromRef.current = null;
    setStatus('idle');
  }, [myUserId]);

  return {
    status,
    incomingCallFrom,
    error,
    remoteStream,
    localStream,
    isVideoCall,
    startCall,
    endCall,
    acceptCall,
    rejectCall,
  };
}
