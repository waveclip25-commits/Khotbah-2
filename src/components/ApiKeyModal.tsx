import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Key, ExternalLink, Check, AlertCircle, Info, ChevronRight, Copy } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (key: string) => void;
  currentKey?: string;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, onSave, currentKey = '' }) => {
  const [key, setKey] = useState(currentKey);
  const [showTutorial, setShowTutorial] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    if (key.trim()) {
      onSave(key.trim());
      setIsSaved(true);
      setTimeout(() => {
        setIsSaved(false);
        onClose();
      }, 1500);
    }
  };

  const tutorialSteps = [
    {
      title: "Buka Google AI Studio",
      description: "Kunjungi situs resmi Google AI Studio untuk membuat API Key gratis.",
      link: "https://aistudio.google.com/app/apikey",
      linkText: "Buka AI Studio"
    },
    {
      title: "Klik 'Create API Key'",
      description: "Cari tombol biru bertuliskan 'Create API Key in new project'.",
    },
    {
      title: "Salin Key Anda",
      description: "Klik ikon salin (copy) pada kode yang muncul (biasanya diawali dengan 'AIza...').",
    },
    {
      title: "Tempel di Sini",
      description: "Kembali ke aplikasi ini dan tempelkan kode tersebut pada kolom input di bawah.",
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="p-6 bg-gradient-to-br from-slate-800 to-slate-900 text-white relative">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-emerald-500/20 rounded-xl">
                  <Key className="w-6 h-6 text-emerald-400" />
                </div>
                <h2 className="text-xl font-bold">Aktivasi Mimbar AI</h2>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed">
                Aplikasi ini memerlukan API Key dari Google Gemini agar otak AI-nya bisa bekerja.
              </p>
              
              {/* Decorative element */}
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Key className="w-24 h-24 rotate-12" />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {!showTutorial ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Masukkan API Key Anda</label>
                    <div className="relative group">
                      <input
                        type="password"
                        value={key}
                        onChange={(e) => setKey(e.target.value)}
                        placeholder="AIzaSy..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 text-slate-800 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-mono text-sm"
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        {key.startsWith('AIza') ? (
                          <Check className="w-5 h-5 text-emerald-500" />
                        ) : key.length > 0 ? (
                          <AlertCircle className="w-5 h-5 text-amber-500" />
                        ) : (
                          <Key className="w-5 h-5 text-slate-300" />
                        )}
                      </div>
                    </div>
                    {key && !key.startsWith('AIza') && (
                      <p className="text-[10px] text-amber-600 font-medium flex items-center gap-1">
                        <Info className="w-3 h-3" /> Pastikan ini adalah Google API Key (biasanya diawali AIza)
                      </p>
                    )}
                  </div>

                  <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
                    <button 
                      onClick={() => setShowTutorial(true)}
                      className="w-full flex items-center justify-between text-emerald-700 group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-lg shadow-sm">
                          <Info className="w-4 h-4" />
                        </div>
                        <div className="text-left">
                          <span className="block text-sm font-bold">Belum punya API Key?</span>
                          <span className="text-[10px] opacity-80">Lihat panduan cara mendapatkannya gratis</span>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <button 
                    onClick={() => setShowTutorial(false)}
                    className="text-xs font-bold text-emerald-600 flex items-center gap-1 hover:underline"
                  >
                    ← Kembali ke Input
                  </button>
                  
                  <div className="space-y-4">
                    {tutorialSteps.map((step, idx) => (
                      <div key={idx} className="flex gap-4">
                        <div className="shrink-0 w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-500">
                          {idx + 1}
                        </div>
                        <div className="space-y-2">
                          <h4 className="text-sm font-bold text-slate-800">{step.title}</h4>
                          <p className="text-xs text-slate-500 leading-relaxed">{step.description}</p>
                          {step.link && (
                            <a 
                              href={step.link} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-[10px] font-bold rounded-lg hover:bg-emerald-700 transition-colors"
                            >
                              {step.linkText}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                    <p className="text-[10px] text-amber-800 leading-relaxed">
                      <strong>Penting:</strong> Gunakan API Key dari akun Google Cloud yang sudah mengaktifkan penagihan (Billing) atau gunakan paket gratis jika tersedia untuk hasil terbaik.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-100 bg-slate-50">
              <button
                onClick={handleSave}
                disabled={!key.trim() || isSaved}
                className={`w-full py-4 rounded-2xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 ${
                  isSaved 
                    ? 'bg-emerald-500' 
                    : 'bg-slate-900 hover:bg-black active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed'
                }`}
              >
                {isSaved ? (
                  <>
                    <Check className="w-5 h-5" />
                    Tersimpan!
                  </>
                ) : (
                  <>
                    <Key className="w-5 h-5" />
                    Simpan & Mulai
                  </>
                )}
              </button>
              <button 
                onClick={onClose}
                className="w-full mt-3 py-2 text-slate-400 text-xs font-medium hover:text-slate-600 transition-colors"
              >
                Nanti Saja
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
