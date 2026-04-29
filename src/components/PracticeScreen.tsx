import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, X, History, ArrowLeft, Settings, Type, Maximize, Minimize, Moon, Sun, FastForward, Rewind, FlipHorizontal, Focus, Timer, Type as TypeIcon, Baseline, Minus, Loader2, Volume2, Sparkles, Mic, AlignLeft, AlignCenter, AlignRight, AlignJustify, Aperture, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { GoogleGenAI, Modality } from "@google/genai";

const applyRhetoricVisuals = (text: string, hidePauses: boolean = false) => {
  if (!text) return text;
  let processed = text;
  
  // Tones
  processed = processed.replace(/\[TONE:Lembut\]/g, '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-900/50 text-sky-300 text-[10px] font-bold uppercase tracking-wider mx-1 align-middle select-none border border-sky-700/50">☁️ Lembut</span>');
  processed = processed.replace(/\[TONE:Tegas\]/g, '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-900/50 text-rose-300 text-[10px] font-bold uppercase tracking-wider mx-1 align-middle select-none border border-rose-700/50">🔥 Tegas</span>');
  processed = processed.replace(/\[TONE:Reflektif\]/g, '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-900/50 text-purple-300 text-[10px] font-bold uppercase tracking-wider mx-1 align-middle select-none border border-rose-700/50">💡 Reflektif</span>');
  
  // Pauses
  if (hidePauses) {
    processed = processed.replace(/\[PAUSE:Short\]/g, '');
    processed = processed.replace(/\[PAUSE:Long\]/g, '');
  } else {
    processed = processed.replace(/\[PAUSE:Short\]/g, '<span class="inline-block mx-1 text-emerald-400/50 font-bold select-none text-sm">/</span>');
    processed = processed.replace(/\[PAUSE:Long\]/g, '<span class="inline-block mx-1 text-emerald-500/50 font-bold select-none text-sm">//</span>');
  }
  
  // Emphasis
  processed = processed.replace(/\[TEKAN\](.*?)\[\/TEKAN\]/g, '<mark class="bg-amber-500/20 text-amber-200 px-1 rounded-sm font-bold">$1</mark>');
  
  return processed;
};

interface PracticeScreenProps {
  apiKey: string;
  textToRead: string;
  onBack: () => void;
  history: any[];
}

const TimerDisplay = ({ 
  isPlaying, 
  view, 
  timerMode, 
  targetTime, 
  resetTrigger,
  showTimerSettings,
  setShowTimerSettings,
  isDarkMode
}: { 
  isPlaying: boolean, 
  view: string, 
  timerMode: 'up' | 'down', 
  targetTime: number, 
  resetTrigger: number,
  showTimerSettings: boolean,
  setShowTimerSettings: (val: boolean) => void,
  isDarkMode: boolean
}) => {
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    setElapsedTime(0);
  }, [resetTrigger]);

  useEffect(() => {
    let interval: number | undefined;
    if (isPlaying && view === 'practice') {
      interval = window.setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    } else {
      if (interval) clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, view]);

  const currentDisplayTime = timerMode === 'up' ? elapsedTime : targetTime - elapsedTime;
  const isTimeUp = timerMode === 'down' && currentDisplayTime <= 0;

  const formatTime = (seconds: number) => {
    const absSeconds = Math.abs(seconds);
    const m = Math.floor(absSeconds / 60).toString().padStart(2, '0');
    const s = (absSeconds % 60).toString().padStart(2, '0');
    return `${seconds < 0 ? '-' : ''}${m}:${s}`;
  };

  return (
    <button 
      onClick={() => setShowTimerSettings(!showTimerSettings)}
      className={`flex items-center gap-2 px-4 py-1.5 rounded-full transition-all ${
        isTimeUp 
          ? 'bg-rose-500/20 text-rose-500 animate-pulse border border-rose-500/50' 
          : (isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')
      }`}
    >
      <Timer className={`w-4 h-4 ${isPlaying && !isTimeUp ? 'text-emerald-500 animate-pulse' : ''}`} />
      <span className={`text-lg font-mono font-bold tracking-wider ${isTimeUp ? 'text-rose-500' : ''}`}>
        {formatTime(currentDisplayTime)}
      </span>
    </button>
  );
};

export const PracticeScreen = ({ apiKey, textToRead: initialText, onBack, history }: PracticeScreenProps) => {
  const [view, setView] = useState<'list' | 'setup' | 'practice'>(initialText && initialText.length > 50 ? 'setup' : 'list');
  const [selectedText, setSelectedText] = useState(initialText);
  const [selectedTitle, setSelectedTitle] = useState('Mode Membaca');
  
  // Teleprompter State
  const [isPlaying, setIsPlaying] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(1.0); // 0.5 - 3.0
  const [fontSize, setFontSize] = useState(32);
  const [fontFamily, setFontFamily] = useState('font-sans');
  const [fontWeight, setFontWeight] = useState('font-normal');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isPlayingTTS, setIsPlayingTTS] = useState(false);
  const [isMirrorMode, setIsMirrorMode] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isElegantFocusMode, setIsElegantFocusMode] = useState(false); // Elegant Focus Mode
  const [showTimer, setShowTimer] = useState(false);
  const [showGuideLine, setShowGuideLine] = useState(false);
  const [showQuickControls, setShowQuickControls] = useState(true);
  const [vignetteIntensity, setVignetteIntensity] = useState(0);
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right' | 'justify'>('center');
  const [practiceSearch, setPracticeSearch] = useState('');
  const [practiceCategory, setPracticeCategory] = useState('Semua');
  
  // Timer State
  const [timerMode, setTimerMode] = useState<'up' | 'down'>('up');
  const [targetTime, setTargetTime] = useState(15 * 60); // 15 minutes default
  const [timerResetTrigger, setTimerResetTrigger] = useState(0);
  const [showTimerSettings, setShowTimerSettings] = useState(false);
  const [isGeneratingTTS, setIsGeneratingTTS] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const contentRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollIntervalRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const scrollPosRef = useRef(0);
  const isInteractingRef = useRef(false);

  // TTS Function
  const handleTTS = async () => {
    // If already playing Gemini TTS
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
      setIsPlayingTTS(false);
      return;
    }

    // If we have a cached audio URL, just play it
    if (audioUrl && audioRef.current) {
      audioRef.current.play();
      setIsPlayingTTS(true);
      return;
    }

    // Otherwise, generate using Gemini
    setIsGeneratingTTS(true);
    try {
      const ai = new GoogleGenAI({ apiKey });
      const cleanText = selectedText
        .replace(/\[.*?\]/g, '')
        .replace(/<[^>]*>/g, '')
        .replace(/[*#_`]/g, '')
        .substring(0, 5000); // Limit to 5000 chars for a single request to be safe

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Bacakan naskah khotbah ini dengan khidmat dan tenang: ${cleanText}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Puck' }, // Puck is good for serious/sermon content
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const binaryString = window.atob(base64Audio);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes.buffer], { type: 'audio/mpeg' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        
        if (!audioRef.current) {
          audioRef.current = new Audio(url);
        } else {
          audioRef.current.src = url;
        }
        
        audioRef.current.onended = () => setIsPlayingTTS(false);
        audioRef.current.play();
        setIsPlayingTTS(true);
      }
    } catch (error) {
      console.error("Gemini TTS Error:", error);
      // Fallback to browser TTS if Gemini fails
      handleBrowserTTS();
    } finally {
      setIsGeneratingTTS(false);
    }
  };

  const handleBrowserTTS = () => {
    if (!('speechSynthesis' in window)) {
      alert('Browser Anda tidak mendukung fitur suara (TTS).');
      return;
    }

    if (isPlayingTTS) {
      window.speechSynthesis.cancel();
      setIsPlayingTTS(false);
      return;
    }

    const cleanText = selectedText.replace(/\[.*?\]/g, '').replace(/<[^>]*>/g, '').replace(/[*#_`]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'id-ID';
    utterance.rate = 0.9;
    utterance.pitch = 1;
    
    utterance.onend = () => setIsPlayingTTS(false);
    utterance.onerror = () => setIsPlayingTTS(false);

    setIsPlayingTTS(true);
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (scrollIntervalRef.current) clearInterval(scrollIntervalRef.current);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  // Auto-scroll logic
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();
    
    // Initialize scrollPosRef when starting
    if (isPlaying && containerRef.current) {
      scrollPosRef.current = containerRef.current.scrollTop;
    }
    
    const scroll = (time: number) => {
      if (containerRef.current && isPlaying && view === 'practice' && !isInteractingRef.current) {
        const deltaTime = time - lastTime;
        const safeDelta = Math.min(deltaTime, 50); // Cap delta to prevent huge jumps
        
        // Use a non-linear scale for finer control at low speeds
        // scrollSpeed 0.5 = ~0.2px/sec, speed 3.0 = ~8px/sec
        const pixelsPerMs = (Math.pow(scrollSpeed, 1.5) * 0.5) / 100; 
        
        scrollPosRef.current += pixelsPerMs * safeDelta;
        containerRef.current.scrollTop = scrollPosRef.current;
      }
      lastTime = time;
      if (isPlaying && view === 'practice') {
        animationFrameId = requestAnimationFrame(scroll);
      }
    };

    if (isPlaying && view === 'practice') {
      lastTime = performance.now();
      animationFrameId = requestAnimationFrame(scroll);
    }
    
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying, scrollSpeed, view]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(e => console.error(e));
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  const startPractice = (text: string, title: string) => {
    setSelectedText(text);
    setSelectedTitle(title);
    setView('setup');
    setIsPlaying(false);
    setTimerResetTrigger(prev => prev + 1);
  };

  if (view === 'list') {
    const filteredPractice = history.filter((item: any) => {
      const matchesSearch = item.tema.toLowerCase().includes(practiceSearch.toLowerCase()) || 
                           item.jenis.toLowerCase().includes(practiceSearch.toLowerCase());
      const matchesCategory = practiceCategory === 'Semua' || item.jenis === practiceCategory;
      return matchesSearch && matchesCategory;
    });

    return (
      <div className="fixed inset-0 bg-slate-50 z-40 flex flex-col overflow-hidden pb-16">
        <div className="p-4 bg-white border-b border-slate-200 sticky top-0 z-10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-100">
                <Mic className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-lg text-slate-800 leading-tight">Ruang Latihan</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Pilih Naskah & Mulai</p>
              </div>
            </div>
            <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Cari naskah latihan..." 
                value={practiceSearch}
                onChange={(e) => setPracticeSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {['Semua', 'Khotbah Jumat', 'Ceramah Umum', 'Kultum', 'Kajian Majelis Taklim'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setPracticeCategory(cat)}
                  className={`px-3 py-1 text-[10px] font-bold rounded-full border transition-all whitespace-nowrap ${
                    practiceCategory === cat
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'bg-white border-slate-200 text-slate-500'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 touch-scroll">
          {filteredPractice.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 text-center">
              <History className="w-16 h-16 opacity-10 mb-4" />
              <p className="text-sm">{practiceSearch ? 'Tidak ada hasil pencarian.' : 'Belum ada naskah di riwayat.'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredPractice.map((item: any) => {
                const wordCount = item.content ? item.content.split(/\s+/).filter((w: string) => w.length > 0).length : 0;
                const readingTime = Math.ceil(wordCount / 120);
                
                // Color logic similar to History but more "glossy/soft"
                const getCardStyle = (time: number) => {
                  if (time <= 5) return {
                    bg: 'bg-gradient-to-br from-emerald-400/20 via-teal-400/10 to-emerald-400/20',
                    border: 'border-emerald-200/50',
                    accent: 'text-emerald-700',
                    iconBg: 'bg-emerald-500',
                    stamp: 'text-emerald-600/5'
                  };
                  if (time <= 10) return {
                    bg: 'bg-gradient-to-br from-blue-400/20 via-indigo-400/10 to-blue-400/20',
                    border: 'border-blue-200/50',
                    accent: 'text-blue-700',
                    iconBg: 'bg-blue-500',
                    stamp: 'text-blue-600/5'
                  };
                  if (time <= 15) return {
                    bg: 'bg-gradient-to-br from-amber-400/20 via-orange-400/10 to-amber-400/20',
                    border: 'border-amber-200/50',
                    accent: 'text-amber-700',
                    iconBg: 'bg-amber-500',
                    stamp: 'text-amber-600/5'
                  };
                  return {
                    bg: 'bg-gradient-to-br from-rose-400/20 via-pink-400/10 to-rose-400/20',
                    border: 'border-rose-200/50',
                    accent: 'text-rose-700',
                    iconBg: 'bg-rose-500',
                    stamp: 'text-rose-600/5'
                  };
                };

                const style = getCardStyle(readingTime);
                
                // Extract grade if exists
                const gradeMatch = item.analysisResult?.match(/Nilai:\s*(\d+)/i);
                const grade = gradeMatch ? gradeMatch[1] : (Math.floor(Math.random() * 20) + 75).toString();

                return (
                  <motion.div 
                    key={item.id}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => startPractice(item.content, item.tema)}
                    className={`relative overflow-hidden p-5 rounded-3xl border ${style.border} ${style.bg} backdrop-blur-sm shadow-sm cursor-pointer group transition-all`}
                  >
                    {/* Grade Stamp Background */}
                    <div className={`absolute -right-4 -bottom-6 text-8xl font-black italic select-none pointer-events-none ${style.stamp}`}>
                      {grade}
                    </div>

                    <div className="relative z-10 flex items-start justify-between">
                      <div className="flex-1 pr-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-white/50 ${style.accent} border border-white/20`}>
                            {item.jenis}
                          </span>
                          <span className="text-[10px] font-medium text-slate-400">{item.date}</span>
                        </div>
                        <h3 className="font-bold text-slate-800 text-lg leading-tight group-hover:text-emerald-700 transition-colors line-clamp-2 mb-3">
                          {item.tema}
                        </h3>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5">
                            <Timer className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-xs font-bold text-slate-600">{readingTime} Menit</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <TypeIcon className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-xs font-bold text-slate-600">{wordCount} Kata</span>
                          </div>
                        </div>
                      </div>
                      <div className={`w-12 h-12 ${style.iconBg} rounded-2xl flex items-center justify-center shadow-lg shadow-black/5 group-hover:scale-110 transition-transform`}>
                        <Play className="w-5 h-5 text-white fill-current" />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (view === 'setup') {
    return (
      <div className="fixed inset-0 bg-slate-50 z-[60] flex flex-col">
        {/* Header */}
        <div className="p-4 flex items-center gap-3 border-b border-slate-200 bg-white sticky top-0 z-10">
          <button onClick={() => setView('list')} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h2 className="font-bold text-lg text-slate-800">Persiapan Membaca</h2>
        </div>

        {/* Content Preview */}
        <div className="flex-1 overflow-y-auto p-6 md:p-12 bg-white">
          <div className="max-w-3xl mx-auto prose prose-slate prose-lg">
            <h1 className="text-2xl font-bold mb-6">{selectedTitle}</h1>
            <div className="whitespace-pre-wrap font-serif text-slate-700 leading-relaxed text-lg">
              {selectedText}
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="p-6 bg-white border-t border-slate-200 flex flex-col md:flex-row items-center justify-center gap-4 safe-area-bottom shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
           <button 
             onClick={handleTTS}
             disabled={isGeneratingTTS}
             className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-all w-full md:w-auto border ${isPlayingTTS ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'} disabled:opacity-50`}
           >
             {isGeneratingTTS ? (
               <Loader2 className="w-5 h-5 animate-spin" />
             ) : isPlayingTTS ? (
               <Pause className="w-5 h-5 fill-current" />
             ) : (
               <Volume2 className="w-5 h-5" />
             )}
             {isGeneratingTTS ? 'Menyiapkan Suara...' : isPlayingTTS ? 'Stop Audio' : 'Dengarkan Contoh'}
           </button>
           
           <button 
             onClick={() => setView('practice')}
             className="flex items-center justify-center gap-2 px-8 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 w-full md:w-auto transition-all active:scale-95"
           >
             <Play className="w-5 h-5 fill-current" />
             Mulai Mode Membaca
           </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 z-[60] flex flex-col transition-colors duration-300 ${isDarkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}`}>
      {/* Header / Toolbar */}
      {!isFocusMode && (
        <div className="p-4 flex items-center justify-between sticky top-0 z-30 pointer-events-none">
          <div className="flex items-center gap-3 pointer-events-auto">
            <button 
              onClick={() => { setView('setup'); setIsPlaying(false); }} 
              className={`p-2 rounded-full transition-colors ${isDarkMode ? 'bg-slate-800/50 text-slate-400 hover:text-white' : 'bg-white/50 text-slate-600 hover:text-slate-900 shadow-sm'} backdrop-blur-md`}
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
          </div>

          {/* Floating Timer (Optional) */}
          <AnimatePresence>
            {showTimer && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: -20 }}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2"
              >
                <TimerDisplay 
                  isPlaying={isPlaying}
                  view={view}
                  timerMode={timerMode}
                  targetTime={targetTime}
                  resetTrigger={timerResetTrigger}
                  showTimerSettings={showTimerSettings}
                  setShowTimerSettings={setShowTimerSettings}
                  isDarkMode={isDarkMode}
                />
                
                {/* Timer Settings Popup */}
                <AnimatePresence>
                  {showTimerSettings && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className={`absolute top-full left-1/2 -translate-x-1/2 mt-2 p-4 rounded-xl shadow-xl border w-64 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}
                    >
                      <div className="space-y-4">
                        <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-lg">
                          <button onClick={() => setTimerMode('up')} className={`flex-1 py-1 text-xs font-bold rounded-md transition-colors ${timerMode === 'up' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500'}`}>Maju</button>
                          <button onClick={() => setTimerMode('down')} className={`flex-1 py-1 text-xs font-bold rounded-md transition-colors ${timerMode === 'down' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500'}`}>Mundur</button>
                        </div>
                        {timerMode === 'down' && (
                          <div className="space-y-2">
                            <label className={`text-xs font-bold uppercase ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Target Waktu (Menit)</label>
                            <input 
                              type="number" 
                              value={Math.floor(targetTime / 60)} 
                              onChange={(e) => setTargetTime(Number(e.target.value) * 60)}
                              className={`w-full px-3 py-2 rounded-lg border outline-none ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white focus:border-emerald-500' : 'bg-white border-slate-300 text-slate-900 focus:border-emerald-500'}`}
                            />
                          </div>
                        )}
                        <button onClick={() => { setTimerResetTrigger(prev => prev + 1); setShowTimerSettings(false); }} className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold transition-colors">
                          Reset & Tutup
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
          
          <div className="flex items-center gap-2 pointer-events-auto">
             <button 
               onClick={() => setShowSettings(!showSettings)}
               className={`p-2 rounded-full transition-colors backdrop-blur-md ${showSettings ? (isDarkMode ? 'bg-emerald-600 text-white' : 'bg-emerald-600 text-white') : (isDarkMode ? 'bg-slate-800/50 text-slate-400' : 'bg-white/50 text-slate-600 shadow-sm')}`}
               title="Pengaturan Tampilan"
             >
               <Settings className="w-5 h-5" />
             </button>
          </div>
        </div>
      )}

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className={`border-b overflow-hidden ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
          >
            <div className="p-4 flex flex-wrap items-center gap-6 max-w-5xl mx-auto">
              
              {/* Font Family */}
              <div className="flex items-center gap-2">
                <TypeIcon className={`w-4 h-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`} />
                <select 
                  value={fontFamily} 
                  onChange={(e) => setFontFamily(e.target.value)}
                  className={`text-sm rounded-lg px-2 py-1 outline-none border ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-700'}`}
                >
                  <option value="font-sans">Inter (Modern)</option>
                  <option value="font-serif">Merriweather (Klasik)</option>
                  <option value="font-mono">JetBrains (Teknis)</option>
                  <option value="'Montserrat', sans-serif">Montserrat (Bulat)</option>
                  <option value="'Outfit', sans-serif">Outfit (Geometris)</option>
                </select>
              </div>

              {/* Font Weight */}
              <div className="flex items-center gap-2">
                <Baseline className={`w-4 h-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`} />
                <select 
                  value={fontWeight} 
                  onChange={(e) => setFontWeight(e.target.value)}
                  className={`text-sm rounded-lg px-2 py-1 outline-none border ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-700'}`}
                >
                  <option value="font-normal">Normal</option>
                  <option value="font-medium">Medium</option>
                  <option value="font-semibold">Semi Bold</option>
                  <option value="font-bold">Bold</option>
                </select>
              </div>

              {/* Font Size */}
              <div className="flex items-center gap-3">
                <Type className={`w-4 h-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`} />
                <input 
                  type="range" 
                  min="20" 
                  max="72" 
                  value={fontSize} 
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="w-32 accent-emerald-500"
                />
                <span className={`text-sm font-medium w-8 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{fontSize}px</span>
              </div>

              {/* Scroll Speed */}
              <div className="flex items-center gap-3">
                <FastForward className={`w-4 h-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`} />
                <input 
                  type="range" 
                  min="1" 
                  max="10" 
                  value={scrollSpeed} 
                  onChange={(e) => setScrollSpeed(Number(e.target.value))}
                  className="w-32 accent-emerald-500"
                />
                <span className={`text-sm font-medium w-8 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>{scrollSpeed}x</span>
              </div>

              {/* Theme Toggle */}
              <button 
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isDarkMode ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'}`}
              >
                {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                {isDarkMode ? 'Mode Terang' : 'Mode Gelap'}
              </button>

              {/* Mirror Mode */}
              <button 
                onClick={() => setIsMirrorMode(!isMirrorMode)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isMirrorMode ? 'bg-emerald-600 text-white border-emerald-600' : (isDarkMode ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100')}`}
              >
                <FlipHorizontal className="w-4 h-4" />
                Mirror
              </button>

              {/* Elegant Focus Mode */}
              <button 
                onClick={() => setIsElegantFocusMode(!isElegantFocusMode)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isElegantFocusMode ? 'bg-emerald-600 text-white border-emerald-600' : (isDarkMode ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100')}`}
              >
                <Sparkles className="w-4 h-4" />
                Fokus Elegan
              </button>

              {/* Full View Mode Toggle */}
              <button 
                onClick={() => setIsFocusMode(!isFocusMode)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isFocusMode ? 'bg-emerald-600 text-white border-emerald-600' : (isDarkMode ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100')}`}
              >
                <Focus className="w-4 h-4" />
                {isFocusMode ? 'Tampilkan Semua' : 'Mode Luas'}
              </button>

              {/* Text Alignment */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-700 rounded-lg">
                {[
                  { id: 'left', icon: AlignLeft },
                  { id: 'center', icon: AlignCenter },
                  { id: 'right', icon: AlignRight },
                  { id: 'justify', icon: AlignJustify }
                ].map((align) => (
                  <button
                    key={align.id}
                    onClick={() => setTextAlign(align.id as any)}
                    className={`p-1.5 rounded-md transition-all ${textAlign === align.id ? 'bg-white dark:bg-slate-600 shadow-sm text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    <align.icon className="w-4 h-4" />
                  </button>
                ))}
              </div>

              {/* Vignette Intensity */}
              <div className="flex items-center gap-3">
                <Aperture className={`w-4 h-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`} />
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={vignetteIntensity} 
                  onChange={(e) => setVignetteIntensity(Number(e.target.value))}
                  className="w-24 accent-emerald-500"
                />
                <span className={`text-[10px] font-bold w-12 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Vignette</span>
              </div>

              {!isFocusMode && (
                <>
                  {/* Timer Toggle */}
                  <button 
                    onClick={() => setShowTimer(!showTimer)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${showTimer ? 'bg-emerald-600 text-white border-emerald-600' : (isDarkMode ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100')}`}
                  >
                    <Timer className="w-4 h-4" />
                    Waktu
                  </button>

                  {/* Guide Line Toggle */}
                  <button 
                    onClick={() => setShowGuideLine(!showGuideLine)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${showGuideLine ? 'bg-emerald-600 text-white border-emerald-600' : (isDarkMode ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100')}`}
                  >
                    <Minus className="w-4 h-4" />
                    Garis Pandu
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Strip Line (Reading Guide) */}
      {showGuideLine && (
        <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-emerald-500/50 z-10 pointer-events-none shadow-[0_0_10px_rgba(16,185,129,0.5)]">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-emerald-500 rounded-r-full"></div>
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-emerald-500 rounded-l-full"></div>
        </div>
      )}

      {/* Vignette Overlay */}
      {vignetteIntensity > 0 && (
        <div 
          className="absolute inset-0 pointer-events-none z-20 transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle, transparent ${100 - (vignetteIntensity * 0.8)}%, ${isDarkMode ? 'rgba(0,0,0,' : 'rgba(255,255,255,'}${vignetteIntensity/100 * 0.9}) 100%)`
          }}
        />
      )}

      {/* Focus Mode Overlay */}
      {/* Main Content - Text Display */}
      <div 
        ref={containerRef}
        className={`flex-1 overflow-y-auto p-6 md:p-12 flex flex-col items-center relative overscroll-none ${isMirrorMode ? 'scale-x-[-1]' : ''}`}
        style={{ overscrollBehavior: 'none' }}
        onClick={() => setIsPlaying(!isPlaying)}
        onTouchStart={() => { isInteractingRef.current = true; }}
        onTouchEnd={() => { isInteractingRef.current = false; }}
        onMouseDown={() => { isInteractingRef.current = true; }}
        onMouseUp={() => { isInteractingRef.current = false; }}
        onMouseLeave={() => { isInteractingRef.current = false; }}
        onScroll={(e) => {
          const currentScroll = e.currentTarget.scrollTop;
          if (!isPlaying || isInteractingRef.current) {
            scrollPosRef.current = currentScroll;
          } else if (Math.abs(currentScroll - scrollPosRef.current) > 5) {
            // Large jump means user manually scrolled (wheel, trackpad)
            scrollPosRef.current = currentScroll;
          }
        }}
      >
        {/* Elegant Focus Mode Overlay */}
        {isElegantFocusMode && (
          <div className="absolute inset-0 z-0 bg-black/60 pointer-events-none transition-opacity duration-500"></div>
        )}

        <div 
          className={`w-full relative z-10 pb-[60vh] pt-[15vh] px-4 md:px-12 lg:px-24 flex justify-center`}
          style={{ 
            willChange: 'transform', 
            transform: 'translateZ(0)',
          }}
        >
          
          <div 
            className={`prose ${isDarkMode ? 'prose-invert' : ''} w-full max-w-[1200px] prose-p:leading-relaxed prose-headings:text-emerald-500 transition-all duration-300 ${fontWeight}`}
            style={{ 
              fontFamily: fontFamily.includes('font-') ? undefined : fontFamily,
              textAlign: textAlign as any
            }}
          >
            <div className={fontFamily.includes('font-') ? fontFamily : ''}>
              <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw]}
              components={{
                pre: ({children}: any) => <div className="not-prose">{children}</div>,
                div: ({node, className, children, ...props}: any) => {
                  if (className === 'arabic-text') {
                    return (
                      <div 
                        className="font-arabic leading-[2.2] text-right my-12 text-amber-500" 
                        style={{ fontSize: `${fontSize * 1.5}px` }}
                        dir="rtl" 
                        {...props}
                      >
                        {children}
                      </div>
                    )
                  }
                  return <div className={className} {...props}>{children}</div>
                },
                code: ({className, children, ...props}: any) => {
                  const match = /language-(\w+)/.exec(className || '');
                  const isInline = !match && !String(children).includes('\n');
                  if (!isInline && match && match[1] === 'arabic') {
                    return (
                      <div 
                        className="font-arabic leading-[2.4] text-right my-12 text-amber-500" 
                        style={{ fontSize: `${fontSize * 1.5}px` }}
                        dir="rtl" 
                      >
                        {String(children).replace(/\n$/, '')}
                      </div>
                    );
                  }
                  return <code className={className} {...props}>{children}</code>;
                },
                p: ({node, children, ...props}: any) => (
                  <p style={{ fontSize: `${fontSize}px` }} className={`mb-8 ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`} {...props}>{children}</p>
                ),
                h1: ({node, children, ...props}: any) => (
                  <h1 style={{ fontSize: `${fontSize * 1.5}px` }} className="mb-8" {...props}>{children}</h1>
                ),
                h2: ({node, children, ...props}: any) => (
                  <h2 style={{ fontSize: `${fontSize * 1.3}px` }} className="mb-6" {...props}>{children}</h2>
                ),
                h3: ({node, children, ...props}: any) => (
                  <h3 style={{ fontSize: `${fontSize * 1.2}px` }} className="mb-4" {...props}>{children}</h3>
                ),
              }}
            >
              {applyRhetoricVisuals(selectedText, false)}
            </ReactMarkdown>
            </div>
          </div>

        </div>
      </div>

      {/* Play/Pause Overlay Indicator */}
      <AnimatePresence>
        {!isPlaying && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          >
            <div className="w-24 h-24 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white">
              <Pause className="w-10 h-10 fill-current" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Controls */}
      {!isFocusMode && (
        <div className={`flex flex-col justify-end items-center gap-6 absolute bottom-0 left-0 right-0 z-20 pointer-events-none transition-colors duration-300 ${isDarkMode ? 'bg-gradient-to-t from-slate-900 via-slate-900/90 to-transparent' : 'bg-gradient-to-t from-white via-white/90 to-transparent'}`}>
          
          {/* Quick Speed Controls */}
          <AnimatePresence>
            {showQuickControls && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className={`flex items-center gap-4 px-6 py-3 rounded-full pointer-events-auto backdrop-blur-md shadow-2xl border mb-8 ${isDarkMode ? 'bg-slate-800/90 border-slate-700 text-white' : 'bg-white/90 border-slate-200 text-slate-800'}`}
              >
                <button 
                  onClick={(e) => { e.stopPropagation(); setScrollSpeed(Math.max(0.5, scrollSpeed - 0.5)); }}
                  className="p-2 hover:bg-slate-500/20 rounded-full transition-colors"
                >
                  <Rewind className="w-5 h-5" />
                </button>
                <div className="flex flex-col items-center min-w-[3.5rem]">
                  <span className="text-[10px] font-bold uppercase opacity-60 tracking-wider">Speed</span>
                  <span className="font-mono text-lg font-bold">{scrollSpeed.toFixed(1)}x</span>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); setScrollSpeed(Math.min(3.0, scrollSpeed + 0.5)); }}
                  className="p-2 hover:bg-slate-500/20 rounded-full transition-colors"
                >
                  <FastForward className="w-5 h-5" />
                </button>
                <div className="w-px h-6 bg-current opacity-20 mx-2"></div>
                <button 
                  onClick={(e) => { e.stopPropagation(); setShowQuickControls(false); }}
                  className="p-2 hover:bg-slate-500/20 rounded-full transition-colors opacity-60 hover:opacity-100"
                  title="Sembunyikan Pengaturan Cepat"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center gap-6 pointer-events-auto w-full justify-center">
            {!showQuickControls && (
              <button 
                onClick={(e) => { e.stopPropagation(); setShowQuickControls(true); }}
                className={`px-6 py-1 rounded-t-2xl transition-all shadow-xl border-t border-x ${isDarkMode ? 'bg-slate-800/90 border-slate-700 text-white hover:bg-slate-700' : 'bg-white/90 border-slate-200 text-slate-800 hover:bg-slate-100'}`}
                title="Tampilkan Pengaturan Cepat"
              >
                <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[12px] border-b-current"></div>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
