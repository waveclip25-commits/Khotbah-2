import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Square, Check, RefreshCw, Clock } from 'lucide-react';

interface CalibrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (wpm: number) => void;
}

export const CalibrationModal: React.FC<CalibrationModalProps> = ({ isOpen, onClose, onSave }) => {
  const [state, setState] = useState<'idle' | 'countdown' | 'reading' | 'done'>('idle');
  const [countdown, setCountdown] = useState(3);
  const [startTime, setStartTime] = useState<number>(0);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [wpm, setWpm] = useState<number>(0);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  const text = "Hadirin jamaah Jumat yang dirahmati Allah. Mengawali khotbah pada siang hari yang penuh berkah ini, khatib berwasiat kepada diri khatib pribadi dan kepada jamaah sekalian, marilah kita senantiasa meningkatkan ketakwaan kita kepada Allah Subhanahu wa Ta'ala. Karena sesungguhnya, sebaik-baik bekal untuk menghadap Allah adalah takwa. Takwa adalah menjalankan perintah-Nya dan menjauhi larangan-Nya dalam setiap sendi kehidupan kita.";
  const wordCount = text.split(' ').length; // 55 words

  useEffect(() => {
    if (state === 'countdown') {
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            handleStartReading();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [state]);

  useEffect(() => {
    if (state === 'reading') {
      timerRef.current = window.setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        setElapsedTime(elapsed);
        // Visual progress estimation (max 95% until finished)
        setProgress(Math.min(95, (elapsed / (wordCount / 3)) * 100));
      }, 100);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state, startTime]);

  const handleStartCountdown = () => {
    setCountdown(3);
    setState('countdown');
  };

  const handleStartReading = () => {
    setStartTime(Date.now());
    setElapsedTime(0);
    setState('reading');
  };

  const handleStop = () => {
    const seconds = (Date.now() - startTime) / 1000;
    const calculatedWpm = Math.round((wordCount / seconds) * 60);

    // Validation: Normal human speaking is 100-250 WPM. 
    // If > 450, they definitely didn't read the whole text.
    if (calculatedWpm > 450 || seconds < 5) {
      setError("Hasil tidak akurat! Sepertinya Anda menekan selesai terlalu cepat. Mohon baca seluruh teks sampai habis agar AI bisa menghitung tempo Anda dengan benar.");
      handleReset();
      return;
    }

    setState('done');
    setProgress(100);
    setWpm(calculatedWpm);
  };

  const handleReset = () => {
    setState('idle');
    setElapsedTime(0);
    setWpm(0);
    setProgress(0);
    // Note: error is not reset here so it can be shown on the idle screen
  };

  const startNewTest = () => {
    setError(null);
    handleStartCountdown();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      >
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-200"
        >
          <div className="p-4 sm:p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm sm:text-base">Tes Kecepatan Baca</h3>
                <p className="text-[9px] sm:text-[10px] text-slate-500 font-medium uppercase tracking-wider">Sesuaikan Tempo Naskah</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 sm:p-8">
            {state === 'idle' && (
              <div className="text-center space-y-6">
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-50 border border-red-100 p-4 rounded-2xl text-left"
                  >
                    <p className="text-xs text-red-600 font-medium leading-relaxed">
                      {error}
                    </p>
                  </motion.div>
                )}
                <div className="space-y-2">
                  <h4 className="text-base sm:text-lg font-bold text-slate-800">Berapa Kecepatan Baca Anda?</h4>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Setiap orang punya tempo bicara berbeda. Tes ini membantu AI menyesuaikan panjang naskah agar pas dengan durasi yang Anda inginkan.
                  </p>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 text-left">
                  <h5 className="text-[10px] sm:text-xs font-bold text-blue-700 uppercase mb-2">Cara Tes:</h5>
                  <ul className="text-[10px] sm:text-xs text-blue-600 space-y-2">
                    <li className="flex gap-2"><span>1.</span> <span>Klik tombol mulai di bawah.</span></li>
                    <li className="flex gap-2"><span>2.</span> <span>Tunggu hitungan mundur selesai.</span></li>
                    <li className="flex gap-2 font-bold text-blue-800"><span>3.</span> <span>Bacalah SELURUH teks yang muncul sampai habis dengan tempo normal.</span></li>
                    <li className="flex gap-2"><span>4.</span> <span>Klik "Selesai" hanya setelah Anda selesai membaca kata terakhir.</span></li>
                  </ul>
                </div>

                <button 
                  onClick={startNewTest}
                  className="w-full py-3 sm:py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98]"
                >
                  <Play className="w-5 h-5 fill-current" />
                  Mulai Tes
                </button>
              </div>
            )}

            {state === 'countdown' && (
              <div className="py-12 text-center">
                <motion.div
                  key={countdown}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1.5, opacity: 1 }}
                  exit={{ scale: 2, opacity: 0 }}
                  className="text-7xl sm:text-8xl font-black text-blue-600"
                >
                  {countdown}
                </motion.div>
                <p className="mt-8 text-slate-500 text-[10px] sm:text-xs font-bold uppercase tracking-widest animate-pulse">Bersiap...</p>
              </div>
            )}

            {state === 'reading' && (
              <div className="space-y-4 sm:space-y-6">
                <div className="flex justify-between items-end">
                  <div className="space-y-1">
                    <span className="text-[9px] sm:text-[10px] font-bold text-blue-600 uppercase tracking-widest">Sedang Merekam Tempo</span>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 sm:w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
                      <span className="text-xs sm:text-sm font-mono font-bold text-slate-700">LIVE: {elapsedTime.toFixed(1)}s</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Target Baca</span>
                    <div className="text-xs sm:text-sm font-bold text-slate-700">{wordCount} Kata</div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-1 sm:h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-blue-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                  />
                </div>

                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-3xl blur opacity-5 group-hover:opacity-10 transition-opacity"></div>
                  <div className="relative bg-white rounded-2xl border-2 border-blue-100 shadow-inner overflow-hidden">
                    {/* Elegant Lift/Fade Effect */}
                    <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-white to-transparent z-10 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent z-10 pointer-events-none" />
                    
                    <div className="max-h-[220px] sm:max-h-[300px] overflow-y-auto p-4 sm:p-10 no-scrollbar scroll-smooth">
                      <p className="text-lg sm:text-2xl leading-relaxed sm:leading-loose text-slate-800 font-serif italic text-center">
                        "{text}"
                      </p>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={handleStop}
                  className="w-full py-3 sm:py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg shadow-emerald-600/20 transition-all active:scale-[0.98]"
                >
                  <Square className="w-5 h-5 fill-current" />
                  Selesai Baca
                </button>
              </div>
            )}

            {state === 'done' && (
              <div className="text-center space-y-6 sm:space-y-8">
                <div className="relative inline-block">
                  <div className="absolute inset-0 bg-emerald-500 blur-2xl opacity-20 rounded-full"></div>
                  <div className="relative w-24 h-24 sm:w-32 h-32 bg-emerald-50 rounded-full flex items-center justify-center mx-auto border-4 border-white shadow-xl">
                    <div className="text-center">
                      <div className="text-3xl sm:text-4xl font-black text-emerald-600 leading-none">{wpm}</div>
                      <div className="text-[9px] sm:text-[10px] font-bold text-emerald-600/70 uppercase tracking-wider mt-1">KPM</div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <h4 className="text-lg sm:text-xl font-bold text-slate-800">Tes Berhasil!</h4>
                  <p className="text-xs sm:text-sm text-slate-600 px-2 sm:px-4">
                    Kecepatan bicara Anda adalah <strong className="text-slate-800">{wpm} kata per menit</strong>. AI akan menyesuaikan panjang naskah dengan tempo ini.
                  </p>
                  <div className="inline-block px-3 py-1 bg-slate-100 rounded-full text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    KPM = Kata Per Menit
                  </div>
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={handleReset}
                    className="flex-1 py-3 sm:py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all text-xs sm:text-sm"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Ulangi
                  </button>
                  <button 
                    onClick={() => {
                      localStorage.setItem('customWpm', wpm.toString());
                      onSave(wpm);
                      onClose();
                    }}
                    className="flex-1 py-3 sm:py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition-all text-xs sm:text-sm"
                  >
                    <Check className="w-5 h-5" />
                    Simpan
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
