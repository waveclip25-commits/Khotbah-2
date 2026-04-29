import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { 
  Check, X, AlertCircle, Loader2, Sparkles, 
  ChevronRight, ArrowRight, MessageSquare, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface GrammarIssue {
  id: string;
  original: string;
  suggestion: string;
  explanation: string;
  type: 'spelling' | 'punctuation' | 'grammar' | 'style';
}

interface GrammarInspectorProps {
  content: string;
  onUpdate: (newContent: string) => void;
  apiKey: string;
  onClose: () => void;
}

export const GrammarInspector: React.FC<GrammarInspectorProps> = ({ 
  content, onUpdate, apiKey, onClose
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [issues, setIssues] = useState<GrammarIssue[]>([]);
  const [analyzed, setAnalyzed] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const analyzeGrammar = async () => {
    if (!apiKey) {
      setErrorMsg("API Key diperlukan");
      return;
    }

    setIsAnalyzing(true);
    setIssues([]);
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `
        Analisa teks khotbah berikut dan temukan kesalahan tata bahasa, ejaan (PUEBI/KBBI), tanda baca, atau gaya bahasa yang kurang efektif.
        
        TEKS INPUT:
        """
        ${content.substring(0, 10000)} 
        """
        
        TUGAS:
        1. Identifikasi maksimal 10 masalah paling krusial.
        2. Untuk setiap masalah, ambil potongan teks asli (original) yang salah.
        3. Berikan saran perbaikan (suggestion).
        4. Berikan penjelasan singkat (explanation).
        5. Tentukan tipe masalah (spelling/punctuation/grammar/style).
        
        Output WAJIB JSON Array:
        [
          {
            "id": "unique_id",
            "original": "potongan teks yang salah",
            "suggestion": "teks perbaikan",
            "explanation": "mengapa ini salah/perlu diperbaiki",
            "type": "spelling" | "punctuation" | "grammar" | "style"
          }
        ]
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });

      const jsonStr = response.text?.replace(/```json/g, '')?.replace(/```/g, '')?.trim() || '[]';
      const result = JSON.parse(jsonStr);
      
      // Verify matches
      const verified = result.filter((issue: GrammarIssue) => content.includes(issue.original));
      setIssues(verified);
      setAnalyzed(true);

    } catch (error) {
      console.error("Error analyzing grammar:", error);
      setErrorMsg("Gagal menganalisa tata bahasa.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const applyFix = (issue: GrammarIssue) => {
    if (!content.includes(issue.original)) {
      setErrorMsg("Teks asli tidak ditemukan (mungkin sudah berubah).");
      return;
    }

    setProcessingId(issue.id);
    const newContent = content.replace(issue.original, issue.suggestion);
    onUpdate(newContent);
    
    // Remove from list
    setIssues(issues.filter(i => i.id !== issue.id));
    setProcessingId(null);
  };

  const applyAll = () => {
    let newContent = content;
    let count = 0;
    
    issues.forEach(issue => {
      if (newContent.includes(issue.original)) {
        newContent = newContent.replace(issue.original, issue.suggestion);
        count++;
      }
    });

    if (count > 0) {
      onUpdate(newContent);
      setIssues([]);
      alert(`${count} perbaikan telah diterapkan.`);
    } else {
      setErrorMsg("Tidak ada perbaikan yang bisa diterapkan secara otomatis.");
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden">
      {/* Minimalist Loading Bar */}
      <AnimatePresence>
        {isAnalyzing && (
          <motion.div 
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            exit={{ opacity: 0 }}
            className="absolute top-0 left-0 right-0 h-1 bg-emerald-500 z-[70] origin-left"
            transition={{ duration: 2, ease: "easeInOut" }}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-200 bg-white flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div>
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            Asisten Tata Bahasa
          </h3>
          <p className="text-xs text-slate-500">Koreksi Ejaan, Tanda Baca & Gaya Bahasa</p>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full">
          <X className="w-5 h-5 text-slate-400" />
        </button>
      </div>

      {/* Error Toast */}
      <AnimatePresence>
        {errorMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-20 left-5 right-5 z-50 bg-red-500 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm font-medium">{errorMsg}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-5">
        {!analyzed ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-6 py-10">
            <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center border border-amber-100">
              <MessageSquare className="w-10 h-10 text-amber-600" />
            </div>
            <div className="max-w-xs mx-auto">
              <h4 className="font-bold text-slate-800 text-lg">Cek Tata Bahasa Cerdas</h4>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                AI akan mencari kesalahan ejaan, tanda baca, dan memberikan saran perbaikan tanpa menulis ulang seluruh naskah.
              </p>
            </div>
            <button 
              onClick={analyzeGrammar}
              disabled={isAnalyzing}
              className="px-8 py-4 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-2xl shadow-xl shadow-amber-500/20 flex items-center gap-3 transition-all active:scale-95 disabled:opacity-50"
            >
              {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              {isAnalyzing ? 'Sedang Menganalisa...' : 'Mulai Periksa Naskah'}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                {issues.length} Saran Perbaikan
              </span>
              {issues.length > 0 && (
                <button 
                  onClick={applyAll}
                  className="text-xs font-bold text-amber-600 hover:bg-amber-50 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Terapkan Semua
                </button>
              )}
            </div>

            {issues.length === 0 && (
              <div className="text-center py-20 text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
                <Check className="w-10 h-10 mx-auto mb-3 text-emerald-500" />
                <p className="font-bold text-slate-600">Naskah Sudah Bagus!</p>
                <p className="text-xs mt-1">Tidak ditemukan kesalahan tata bahasa yang berarti.</p>
                <button onClick={analyzeGrammar} className="mt-4 text-xs text-amber-600 font-bold underline">Scan Ulang</button>
              </div>
            )}

            <div className="space-y-4">
              {issues.map((issue) => (
                <motion.div 
                  key={issue.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
                >
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        issue.type === 'spelling' ? 'bg-red-50 text-red-600' :
                        issue.type === 'punctuation' ? 'bg-blue-50 text-blue-600' :
                        issue.type === 'grammar' ? 'bg-amber-50 text-amber-600' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {issue.type}
                      </span>
                      <button 
                        onClick={() => applyFix(issue)}
                        disabled={processingId === issue.id}
                        className="text-xs font-bold text-emerald-600 hover:bg-emerald-50 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                      >
                        {processingId === issue.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                        Terapkan
                      </button>
                    </div>

                    <div className="flex flex-col space-y-2">
                      <div className="p-2 bg-red-50/50 rounded-lg border border-red-100/50 text-sm text-slate-700 line-through decoration-red-300">
                        {issue.original}
                      </div>
                      <div className="flex justify-center">
                        <ChevronRight className="w-4 h-4 text-slate-300" />
                      </div>
                      <div className="p-2 bg-emerald-50/50 rounded-lg border border-emerald-100/50 text-sm text-slate-800 font-medium">
                        {issue.suggestion}
                      </div>
                    </div>

                    <div className="flex items-start gap-2 pt-2 border-t border-slate-50">
                      <Info className="w-3 h-3 text-slate-400 mt-0.5 shrink-0" />
                      <p className="text-[11px] text-slate-500 italic leading-relaxed">
                        {issue.explanation}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>

      {analyzed && issues.length > 0 && (
        <div className="p-5 bg-white border-t border-slate-200">
          <button 
            onClick={analyzeGrammar}
            disabled={isAnalyzing}
            className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Scan Ulang
          </button>
        </div>
      )}
    </div>
  );
};

const RefreshCw = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
);
