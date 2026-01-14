import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Trash2, Check } from 'lucide-react';

interface AudioRecorderProps {
  onRecordingComplete: (blob: Blob) => void;
  onDelete: () => void;
}

export function AudioRecorder({ onRecordingComplete, onDelete }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        onRecordingComplete(blob);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Impossible d'accéder au micro.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDelete = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    onDelete();
  };

  if (audioUrl) {
    return (
      <div className="flex items-center gap-3 bg-brand-50 p-4 rounded-2xl border-2 border-brand-100 animate-in zoom-in duration-200">
        <button 
          onClick={() => {
            const audio = new Audio(audioUrl);
            audio.play();
          }}
          className="w-12 h-12 bg-brand-500 text-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform"
        >
          <Play fill="currentColor" size={20} />
        </button>
        <div className="flex-1">
          <div className="text-xs font-bold text-brand-900 uppercase tracking-widest">Message Vocal</div>
          <div className="text-brand-600 font-medium">{formatTime(recordingTime)}</div>
        </div>
        <button 
          onClick={handleDelete}
          className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
        >
          <Trash2 size={20} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {isRecording ? (
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <div className="text-2xl font-black text-brand-600">{formatTime(recordingTime)}</div>
          <button
            onClick={stopRecording}
            className="w-20 h-20 bg-red-500 text-white rounded-full flex items-center justify-center shadow-xl shadow-red-100 animate-bounce"
          >
            <Square fill="currentColor" size={32} />
          </button>
          <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Appuyez pour arrêter</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <button
            onClick={startRecording}
            className="w-20 h-20 bg-brand-500 text-white rounded-full flex items-center justify-center shadow-xl shadow-brand-100 hover:bg-brand-600 active:scale-90 transition-all"
          >
            <Mic size={32} />
          </button>
          <p className="text-sm font-bold text-gray-400 uppercase tracking-widest text-center">
            Expliquez votre besoin <br /> vocalement
          </p>
        </div>
      )}
    </div>
  );
}
