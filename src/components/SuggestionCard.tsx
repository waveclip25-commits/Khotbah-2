import { Check, Copy, Sparkles, ThumbsUp } from 'lucide-react';
import React from 'react';

interface SuggestionCardProps {
  original: string;
  replacement: string;
  reason: string;
  onApply: (original: string, replacement: string) => void;
  isFixing: boolean;
  isApplied?: boolean;
}

export const SuggestionCard: React.FC<SuggestionCardProps> = ({ original, replacement, reason, onApply, isFixing, isApplied }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl my-4 overflow-hidden shadow-sm">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="bg-amber-100 text-amber-600 p-2 rounded-full">
            <ThumbsUp className="w-4 h-4" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-700">Saran Perbaikan</p>
            <p className="text-sm text-slate-600 italic">{reason}</p>
          </div>
        </div>
        
        <div className="space-y-3 mt-4">
          <div>
            <p className="text-xs font-semibold text-red-600 mb-1">Teks Asli:</p>
            <p className="p-3 bg-red-50 text-red-800 rounded-lg text-sm font-mono relative group">
              {original}
              <button 
                onClick={() => navigator.clipboard.writeText(original)}
                className="absolute top-2 right-2 p-1 bg-white/50 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Copy className="w-3 h-3" />
              </button>
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-emerald-600 mb-1">Saran AI:</p>
            <p className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-sm font-mono relative group">
              {replacement}
              <button 
                onClick={() => navigator.clipboard.writeText(replacement)}
                className="absolute top-2 right-2 p-1 bg-white/50 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Copy className="w-3 h-3" />
              </button>
            </p>
          </div>
        </div>
      </div>
      <div className="bg-slate-50 p-3 border-t border-slate-200">
        <button
          onClick={() => onApply(original, replacement)}
          disabled={isFixing || isApplied}
          className={`w-full font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60 ${isApplied ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}
        >
          {isApplied ? <Check className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
          <span>{isApplied ? 'Sudah Diterapkan' : 'Terapkan Saran Ini'}</span>
        </button>
      </div>
    </div>
  );
};
