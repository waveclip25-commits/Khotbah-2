import React, { useState, useEffect } from 'react';
import { 
  Mic2, Sparkles, Wand2, X, Check, Trash2, 
  Volume2, VolumeX, Play, Pause, AlertCircle, 
  ChevronDown, ChevronUp, Info, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface VocalMarker {
  id: string;
  type: 'pause' | 'tone' | 'emphasis';
  value: string;
  context: string;
  index: number;
}

interface VocalInspectorProps {
  content: string;
  onUpdate: (newContent: string) => void;
  apiKey: string;
  onClose: () => void;
  handleAnnotate: () => Promise<void>;
  handleAnnotateLocally: () => void;
  isAnnotating: boolean;
}

export const VocalInspector: React.FC<VocalInspectorProps> = ({ 
  content, onUpdate, apiKey, onClose,
  handleAnnotate, handleAnnotateLocally, isAnnotating
}) => {
  const [markers, setMarkers] = useState<VocalMarker[]>([]);
  const [showMarkers, setShowMarkers] = useState(true);
  const [analyzed, setAnalyzed] = useState(false);

  useEffect(() => {
    extractMarkers();
  }, [content]);

  // Auto-scan locally if no markers
  useEffect(() => {
    if (!analyzed && markers.length === 0 && content && !isAnnotating) {
      handleAnnotateLocally();
      setAnalyzed(true);
    }
  }, [content, analyzed, markers.length, isAnnotating, handleAnnotateLocally]);

  const extractMarkers = () => {
    const foundMarkers: VocalMarker[] = [];
    
    // Regex for [PAUSE:Type], [TONE:Type], [TEKAN]...[/TEKAN]
    const pauseRegex = /\[PAUSE:(Short|Long)\]/g;
    const toneRegex = /\[TONE:(Lembut|Tegas|Reflektif)\]/g;
    const emphasisRegex = /\[TEKAN\](.*?)\[\/TEKAN\]/g;

    let match;
    while ((match = pauseRegex.exec(content)) !== null) {
      foundMarkers.push({
        id: `pause-${match.index}`,
        type: 'pause',
        value: match[1],
        context: content.substring(Math.max(0, match.index - 20), Math.min(content.length, match.index + 20)),
        index: match.index
      });
    }

    while ((match = toneRegex.exec(content)) !== null) {
      foundMarkers.push({
        id: `tone-${match.index}`,
        type: 'tone',
        value: match[1],
        context: content.substring(Math.max(0, match.index - 20), Math.min(content.length, match.index + 20)),
        index: match.index
      });
    }

    while ((match = emphasisRegex.exec(content)) !== null) {
      foundMarkers.push({
        id: `emphasis-${match.index}`,
        type: 'emphasis',
        value: match[1],
        context: content.substring(Math.max(0, match.index - 20), Math.min(content.length, match.index + 20)),
        index: match.index
      });
    }

    setMarkers(foundMarkers.sort((a, b) => a.index - b.index));
  };

  const removeMarker = (marker: VocalMarker) => {
    let newContent = content;
    if (marker.type === 'pause') {
      newContent = content.replace(`[PAUSE:${marker.value}]`, '');
    } else if (marker.type === 'tone') {
      newContent = content.replace(`[TONE:${marker.value}]`, '');
    } else if (marker.type === 'emphasis') {
      newContent = content.replace(`[TEKAN]${marker.value}[/TEKAN]`, marker.value);
    }
    onUpdate(newContent);
  };

  const clearAllMarkers = () => {
    let newContent = content
      .replace(/\[PAUSE:(Short|Long)\]/g, '')
      .replace(/\[TONE:(Lembut|Tegas|Reflektif)\]/g, '')
      .replace(/\[TEKAN\]/g, '')
      .replace(/\[\/TEKAN\]/g, '');
    onUpdate(newContent);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
    >
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-sky-500 to-indigo-600 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <Mic2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Inpektur Vokal & Retorika</h3>
              <p className="text-xs text-white/70">Kelola panduan baca dan nada khotbah</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Action Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button 
              onClick={handleAnnotateLocally}
              className="p-4 rounded-2xl border-2 border-slate-100 hover:border-sky-500 hover:bg-sky-50 transition-all text-left group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-slate-100 group-hover:bg-sky-500 group-hover:text-white rounded-lg transition-colors">
                  <Zap className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full">No Token</span>
              </div>
              <h4 className="font-bold text-slate-800">Scan Lokal</h4>
              <p className="text-xs text-slate-500 mt-1">Tambahkan jeda otomatis berdasarkan tanda baca (Gratis).</p>
            </button>

            <button 
              onClick={handleAnnotate}
              disabled={isAnnotating}
              className="p-4 rounded-2xl border-2 border-slate-100 hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left group disabled:opacity-50"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-slate-100 group-hover:bg-indigo-500 group-hover:text-white rounded-lg transition-colors">
                  <Sparkles className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">AI Token</span>
              </div>
              <h4 className="font-bold text-slate-800">Scan AI</h4>
              <p className="text-xs text-slate-500 mt-1">Analisis nada dan penekanan kata menggunakan kecerdasan buatan.</p>
            </button>
          </div>

          {/* Markers List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-700 flex items-center gap-2">
                Panduan Terdeteksi
                <span className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded-full">{markers.length}</span>
              </h4>
              {markers.length > 0 && (
                <button 
                  onClick={clearAllMarkers}
                  className="text-xs font-bold text-red-500 hover:underline flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  Hapus Semua
                </button>
              )}
            </div>

            {markers.length === 0 ? (
              <div className="py-12 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                <div className="p-4 bg-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <Mic2 className="w-8 h-8 text-slate-300" />
                </div>
                <p className="text-slate-500 font-medium">Belum ada panduan vokal.</p>
                <p className="text-xs text-slate-400 mt-1">Gunakan Scan Lokal atau AI untuk memulai.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {markers.map((marker) => (
                  <div 
                    key={marker.id}
                    className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-xl ${
                        marker.type === 'pause' ? 'bg-amber-50 text-amber-600' :
                        marker.type === 'tone' ? 'bg-indigo-50 text-indigo-600' :
                        'bg-emerald-50 text-emerald-600'
                      }`}>
                        {marker.type === 'pause' ? <Pause className="w-4 h-4" /> :
                         marker.type === 'tone' ? <Volume2 className="w-4 h-4" /> :
                         <Wand2 className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm capitalize">{marker.type}: {marker.value}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5 italic">"...{marker.context}..."</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => removeMarker(marker)}
                      className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-amber-500 rounded-full" />
              Jeda
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-indigo-500 rounded-full" />
              Nada
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-emerald-500 rounded-full" />
              Penekanan
            </div>
          </div>
          <p>Format: [TAG:Value]</p>
        </div>
      </div>
    </motion.div>
  );
};
