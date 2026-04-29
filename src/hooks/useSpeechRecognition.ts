import { useEffect, useRef, useState, useCallback } from 'react';

export type SpeechStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface UseSpeechRecognitionProps {
  onTranscript?: (text: string) => void;
  onError?: (error: string) => void;
}

export const useSpeechRecognition = ({ onTranscript, onError }: UseSpeechRecognitionProps) => {
  const [status, setStatus] = useState<SpeechStatus>('disconnected');
  const [volume, setVolume] = useState(0);
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const startVolumeAnalysis = async (stream: MediaStream) => {
    try {
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;
      
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        setVolume(average / 128); // Normalize to 0-1
        animationFrameRef.current = requestAnimationFrame(updateVolume);
      };
      
      updateVolume();
    } catch (e) {
      console.error("Volume analysis failed", e);
    }
  };

  const connect = useCallback(async () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      const msg = "Browser Anda tidak mendukung Speech Recognition.";
      onError?.(msg);
      setStatus('error');
      return;
    }

    try {
      setStatus('connecting');
      
      // Setup Microphone for Volume Analysis
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      startVolumeAnalysis(stream);

      // Setup Recognition
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'id-ID';

      recognition.onstart = () => {
        setStatus('connected');
      };

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            onTranscript?.(event.results[i][0].transcript);
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        // Optional: handle interim results if needed
      };

      recognition.onerror = (event: any) => {
        console.error("Speech Recognition Error:", event.error);
        if (event.error === 'not-allowed') {
          onError?.("Izin microphone ditolak.");
        } else {
          onError?.(`Kesalahan: ${event.error}`);
        }
        setStatus('error');
      };

      recognition.onend = () => {
        if (status === 'connected') {
          recognition.start(); // Auto-restart if it was supposed to be connected
        } else {
          setStatus('disconnected');
        }
      };

      recognitionRef.current = recognition;
      recognition.start();

    } catch (err: any) {
      console.error("Speech Recognition Connection Failed:", err);
      onError?.(err.message || "Gagal memulai perekaman.");
      setStatus('error');
    }
  }, [onTranscript, onError, status]);

  const disconnect = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    setStatus('disconnected');
    setVolume(0);
  }, []);

  useEffect(() => {
    return () => disconnect();
  }, [disconnect]);

  return { connect, disconnect, status, volume };
};
