import React, { useState } from 'react';
import { Book, ChevronRight, Plus, Check, Info, Search, BookOpen, Sparkles, Loader2, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { KITAB_DATABASE, Kitab, KitabChapter } from '../data/kitabData';
import { GoogleGenAI } from '@google/genai';

interface KitabBrowserProps {
  onAddToReference: (content: string, name: string) => void;
  existingReferences: any[];
}

export const KitabBrowser: React.FC<KitabBrowserProps> = ({ onAddToReference, existingReferences }) => {
  const [selectedKitab, setSelectedKitab] = useState<Kitab | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);

  const filteredKitabs = KITAB_DATABASE.filter(k => 
    k.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    k.author.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAiSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsAiSearching(true);
    setAiResult(null);
    try {
      const activeKey = process.env.GEMINI_API_KEY;
      const ai = new GoogleGenAI({ apiKey: activeKey! });
      const prompt = `Cari isi atau kutipan dari kitab "${searchQuery}". Berikan dalam format JSON: { "name": "Nama Kitab", "author": "Penulis", "content": "Kutipan/Isi penting dalam Bahasa Indonesia", "arabic": "Teks Arab jika ada" }. Jika kitab tidak ditemukan, berikan pesan error dalam JSON.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });

      const result = JSON.parse(response.text);
      setAiResult(result);
    } catch (error) {
      console.error("AI Kitab search error:", error);
      setAiResult({ error: "Gagal mencari kitab via AI." });
    } finally {
      setIsAiSearching(false);
    }
  };

  const handleAddChapter = (kitab: Kitab | any, chapter: KitabChapter | any) => {
    const content = `Kitab: ${kitab.name}\nPenulis: ${kitab.author}\nBab: ${chapter.title || 'Kutipan'}\n\n${chapter.arabic ? `Arab:\n${chapter.arabic}\n\n` : ''}Terjemahan:\n${chapter.translation || chapter.content}\n\nPenjelasan:\n${chapter.explanation || 'Diambil dari pencarian AI'}`;
    onAddToReference(content, `${kitab.name} - ${chapter.title || 'Kutipan'}`);
    setAddedItems(prev => new Set(prev).add(`${kitab.id || 'ai'}-${chapter.title || 'kutipan'}`));
  };

  return (
    <div className="space-y-6">
      {!selectedKitab && !aiResult && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari kitab (Bukhari, Riyadhus Shalihin, dll)..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
            <button 
              onClick={handleAiSearch}
              disabled={isAiSearching || !searchQuery.trim()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all disabled:opacity-50"
            >
              {isAiSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Cari via AI
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredKitabs.map((kitab) => (
              <motion.div 
                key={kitab.id}
                whileHover={{ y: -2 }}
                onClick={() => setSelectedKitab(kitab)}
                className="bg-white border border-slate-200 rounded-2xl p-4 cursor-pointer hover:border-emerald-300 hover:shadow-md transition-all flex gap-4 items-center group"
              >
                <div className={`w-12 h-16 ${kitab.coverColor || 'bg-slate-700'} rounded-lg shadow-sm flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform`}>
                  <Book className="w-6 h-6 opacity-50" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-slate-800 text-sm line-clamp-1">{kitab.name}</h4>
                  <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{kitab.author}</p>
                  <p className="text-[10px] text-slate-400 line-clamp-1 mt-1">{kitab.description}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 transition-colors" />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {aiResult && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-500" /> Hasil Pencarian AI
            </h3>
            <button onClick={() => setAiResult(null)} className="text-xs text-indigo-600 font-bold">Kembali</button>
          </div>
          {aiResult.error ? (
            <div className="p-8 bg-red-50 rounded-2xl border border-red-100 text-center">
              <p className="text-sm text-red-600">{aiResult.error}</p>
            </div>
          ) : (
            <div className="bg-white border border-indigo-100 rounded-2xl p-6 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-bold text-slate-800">{aiResult.name}</h4>
                  <p className="text-xs text-slate-500">{aiResult.author}</p>
                </div>
                <button 
                  onClick={() => handleAddChapter(aiResult, { title: 'Kutipan AI', translation: aiResult.content, arabic: aiResult.arabic })}
                  className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-all"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              {aiResult.arabic && (
                <p className="text-right font-arabic text-xl leading-loose mb-4 text-slate-800" dir="rtl">
                  {aiResult.arabic}
                </p>
              )}
              <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                {aiResult.content}
              </p>
            </div>
          )}
        </motion.div>
      )}

      {selectedKitab && (
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-12 ${selectedKitab.coverColor || 'bg-slate-700'} rounded-lg flex items-center justify-center text-white shrink-0`}>
                <Book className="w-5 h-5 opacity-50" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm">{selectedKitab.name}</h4>
                <p className="text-[10px] text-slate-500">{selectedKitab.author}</p>
              </div>
            </div>
            <button 
              onClick={() => setSelectedKitab(null)}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-white px-3 py-1.5 rounded-lg border border-emerald-100 shadow-sm"
            >
              Ganti Kitab
            </button>
          </div>

          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {selectedKitab.chapters.length > 0 ? (
              selectedKitab.chapters.map((chapter, idx) => (
                <div key={idx} className="bg-white border border-slate-100 rounded-xl p-4 hover:border-emerald-200 transition-all">
                  <div className="flex justify-between items-start mb-3">
                    <h5 className="font-bold text-slate-800 text-sm">{chapter.title}</h5>
                    <button 
                      onClick={() => handleAddChapter(selectedKitab, chapter)}
                      disabled={addedItems.has(`${selectedKitab.id}-${chapter.title}`)}
                      className={`p-1.5 rounded-lg transition-all ${addedItems.has(`${selectedKitab.id}-${chapter.title}`) ? 'bg-emerald-500 text-white' : 'bg-slate-50 text-slate-400 hover:text-emerald-600 border border-slate-100'}`}
                    >
                      {addedItems.has(`${selectedKitab.id}-${chapter.title}`) ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    </button>
                  </div>
                  {chapter.arabic && (
                    <p className="text-right font-arabic text-lg leading-loose mb-3 text-slate-800" dir="rtl">
                      {chapter.arabic}
                    </p>
                  )}
                  <p className="text-xs text-slate-600 italic mb-2">"{chapter.translation}"</p>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <p className="text-[10px] text-slate-500 leading-relaxed">{chapter.explanation}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <BookOpen className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                <p className="text-xs text-slate-400">Konten kitab ini akan segera tersedia atau dapat diakses melalui fitur AI Chat.</p>
              </div>
            )}
          </div>
        </motion.div>
      )}

      <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex gap-3">
        <Info className="w-5 h-5 text-indigo-600 shrink-0" />
        <p className="text-[10px] text-indigo-800 leading-relaxed">
          <strong>Maktabah Klasik:</strong> Koleksi kitab-kitab populer. Jika kitab yang Anda cari tidak ada, gunakan tombol <strong>"Cari via AI"</strong> untuk mengambil kutipan langsung dari kecerdasan buatan.
        </p>
      </div>
    </div>
  );
};
