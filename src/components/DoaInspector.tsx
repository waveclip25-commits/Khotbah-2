import React, { useState, useEffect, useMemo } from 'react';
import { GoogleGenAI } from '@google/genai';
import { db, AVAILABLE_BOOKS, DoaItemModel } from '../db';
import { DOA_KOLEKSI } from '../data/doa_koleksi';
import { processTemplateMarkers } from '../utils/templateEngine';
import { 
  Search, RefreshCw, Trash2, Check, X, 
  Loader2, Sparkles, BookHeart, Library,
  Copy, Wand2, Plus, Star, BookOpen, PenTool, LayoutTemplate
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLiveQuery } from 'dexie-react-hooks';

interface ParsedDoa {
  id: string;
  arabic: string;
  latin: string;
  translation: string;
  originalBlock: string;
  markerType?: string;
  isTemplate?: boolean;
}

interface DoaInspectorProps {
  content: string;
  onUpdate: (newContent: string) => void;
  apiKey: string;
  onClose: () => void;
  tema: string;
}

export const DoaInspector: React.FC<DoaInspectorProps> = ({ 
  content, onUpdate, apiKey, onClose, tema 
}) => {
  const [activeTab, setActiveTab] = useState<'naskah' | 'ai' | 'kitab'>('naskah');
  
  // Tab: Naskah
  const [parsedDoas, setParsedDoas] = useState<ParsedDoa[]>([]);
  const [isProcessingLatin, setIsProcessingLatin] = useState<string | null>(null);
  
  // Tab: AI
  const [aiDoas, setAiDoas] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [doaType, setDoaType] = useState<'umum' | 'tematik' | 'asmaul_husna' | null>(null);
  
  // Tab: Kitab
  const [searchQuery, setSearchQuery] = useState('');

  const getGacorLabel = (marker?: string) => {
    if (!marker) return "Isi Khotbah (Terdeteksi)";
    const map: Record<string, string> = {
      'hamdalah': 'Puji Hamdalah & Syukur',
      'syahadat': 'Dua Kalimat Syahadat',
      'shalawat': 'Shalawat Nabi',
      'wasiat-taqwa': 'Wasiat Taqwa',
      'dalil-taqwa': 'Dalil Perintah Taqwa',
      'innalhamdalillah': 'Khutbatul Hajah',
      'amma-badu': 'Teks Amma Ba\'du',
      'barakallah': 'Doa Keberkahan Al-Quran',
      'taqabbalallah': 'Doa Penerimaan Amal',
      'astaghfirullah': 'Istighfar & Tabsyir',
      'udullah': 'Seruan Ijabah Doa',
      'hamdalah-syahadat': 'Hamdalah & Syahadat II',
      'ayat-shalawat': 'Dalil Shalawat (Al-Ahzab)',
      'doa-ampunan': 'Doa Ampunan Muslimin',
      'doa-kesehatan-utang': 'Doa Kesehatan & Bebas Utang',
      'doa-sapu-jagat-diri': 'Doa Sapu Jagat & Akhlak',
      'doa-ketakwaan': 'Doa Ketakwaan Jiwa',
      'doa-islam-palestina': 'Doa Kemuliaan & Palestina',
      'doa-pemimpin-negara': 'Doa Pemimpin & Negeri',
      'doa-dunia-akhirat': 'Doa Rabbana Atina',
      'ibadallah': 'Penutup & Ibadallah',
      'dzikir-penutup': 'Dzikir & Seruan Shalat'
    };
    return map[marker] || marker.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };
  
  // Parse Doa without AI
  useEffect(() => {
    if (activeTab === 'naskah') {
      const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]{6,}/;
      const expandedContent = processTemplateMarkers(content, true, true);
      const paragraphs = expandedContent.split(/\n\n+/);
      const results: ParsedDoa[] = [];
      let lastMarker: string | null = null;

      for (let i = 0; i < paragraphs.length; i++) {
        const p = paragraphs[i].trim();
        
        const markerMatch = p.match(/<div data-type="([^"]+)"/);
        if (markerMatch) {
          lastMarker = markerMatch[1];
          continue;
        }

        const cleanP = p.replace(/```arabic/g, '').replace(/```/g, '').trim();

        if (arabicRegex.test(cleanP)) {
          let latin = '';
          let translation = '';
          let originalBlock = p;

          // Check lines below for Latin/Translation
          if (paragraphs[i+1] && !arabicRegex.test(paragraphs[i+1])) {
             const sub = paragraphs[i+1].trim();
             if (sub.startsWith('*') || sub.startsWith('_')) {
                 latin = sub;
                 originalBlock += `\n\n${sub}`;
             } else {
                 translation = sub;
                 originalBlock += `\n\n${sub}`;
             }
          }
          
          if (paragraphs[i+2] && !arabicRegex.test(paragraphs[i+2])) {
             const sub2 = paragraphs[i+2].trim();
             if (!latin && (sub2.startsWith('*') || sub2.startsWith('_'))) {
                latin = sub2;
                originalBlock += `\n\n${sub2}`;
             } else if (!translation) {
                translation = sub2;
                originalBlock += `\n\n${sub2}`;
             }
          }
          
          const isTemplate = !!lastMarker;
          const markerType = lastMarker || undefined;

          // Gacor Heuristics:
          const isKnownDoa = cleanP.includes('اللهم') || cleanP.includes('ربنا') || cleanP.includes('رب ') || cleanP.includes('يا') || cleanP.includes('الحمد لله');
          
          if (isTemplate || isKnownDoa || i > paragraphs.length * 0.7) {
              results.push({ 
                id: `parsed-${i}-${Date.now()}`,
                arabic: cleanP, 
                latin: latin.replace(/[\*_]/g,'').trim(), 
                translation: translation.replace(/"/g,'').replace(/^>\s*/, '').replace(/Artinya:\s*/i, '').trim(), 
                originalBlock,
                markerType,
                isTemplate 
              });
          }
          lastMarker = null; // reset
        }
      }
      setParsedDoas(results);
    }
  }, [content, activeTab]);

  // AI Generator
  const generateDoa = async (type: 'umum' | 'tematik' | 'asmaul_husna') => {
    if (!apiKey) return alert("API Key diperlukan untuk fitur AI");
    
    setDoaType(type);
    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey });
      let prompt = `Berikan 3 doa penutup khotbah Jumat tentang "${type === 'tematik' ? tema : type}". Sertakan latin, terjemahan, dan referensi. Format JSON: [{"arabic": "...", "latin": "...", "translation": "...", "reference": "..."}]`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });

      const jsonStr = response.text?.replace(/```json/g, '')?.replace(/```/g, '')?.trim() || '[]';
      const result = JSON.parse(jsonStr);
      setAiDoas(result);
    } catch (error) {
      console.error(error);
      alert("Gagal memproses permintaan.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Kitab Filter (Offline)
  const filteredKitab = useMemo(() => {
     if (!searchQuery) {
        // If no explicit query, try to automatically suggest based on "tema"
        const keywords = tema.toLowerCase().split(' ');
        const matches = DOA_KOLEKSI.filter(d => d.tema.some(t => keywords.some(k => k.includes(t))));
        if (matches.length > 0) return matches;
        return DOA_KOLEKSI; // Show all
     }
     
     const q = searchQuery.toLowerCase();
     return DOA_KOLEKSI.filter(d => 
        d.translation.toLowerCase().includes(q) || 
        d.latin.toLowerCase().includes(q) || 
        d.tema.some(t => t.includes(q))
     );
  }, [searchQuery, tema]);

  const insertToContent = (doa: { arabic: string; latin?: string; translation: string; reference?: string }) => {
    const ref = doa.reference ? `\n*(${doa.reference})*` : '';
    const newBlock = `\n\n### Doa Pilihan\n\n${doa.arabic}\n\n*${doa.latin || ''}*\n\n"${doa.translation}"${ref}\n\n`;
    onUpdate(content + newBlock);
    alert("Doa berhasil disisipkan di akhir naskah.");
  };

  const handleFixBlock = async (parsed: ParsedDoa, action: 'latin' | 'terjemahan' | 'hapus') => {
      if (action === 'hapus') {
         if (confirm("Hapus doa ini dari naskah?")) {
            onUpdate(content.replace(parsed.originalBlock, ''));
            setParsedDoas(prev => prev.filter(p => p.id !== parsed.id));
         }
         return;
      }

      if (!apiKey) return alert("Membutuhkan AI untuk melengkapi.");
      setIsProcessingLatin(parsed.id);

      try {
         const ai = new GoogleGenAI({ apiKey });
         const prompt = action === 'latin' 
            ? `Berikan tulisan latin transliterasi bahasa Indonesia HANYA untuk teks Arab ini tanpa tambahan chat apapun: ${parsed.arabic}`
            : `Berikan terjemahan bahasa Indonesia formal HANYA untuk teks Arab ini tanpa tambahan chat apapun: ${parsed.arabic}`;

         const response = await ai.models.generateContent({
             model: 'gemini-3-flash-preview',
             contents: prompt
         });
         
         const fixText = response.text || '';
         let newBlock = parsed.originalBlock;
         
         if (action === 'latin') {
            newBlock += `\n\n*${fixText.trim()}*`;
         } else {
            newBlock += `\n\n"${fixText.trim()}"`;
         }

         onUpdate(content.replace(parsed.originalBlock, newBlock));
         
         // Update local state temporarily
         setParsedDoas(prev => prev.map(p => {
             if (p.id === parsed.id) {
                 return {
                     ...p,
                     latin: action === 'latin' ? fixText : p.latin,
                     translation: action === 'terjemahan' ? fixText : p.translation,
                     originalBlock: newBlock
                 };
             }
             return p;
         }));

      } catch (e) {
         alert("Gagal melengkapi teks.");
      } finally {
         setIsProcessingLatin(null);
      }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Berhasil disalin ke clipboard!");
  };

  const handleSaveToLibrary = async (doa: any) => {
    try {
      await db.collectedDoas.add({
        arabic: doa.arabic,
        latin: doa.latin,
        translation: doa.translation,
        type: doa.markerType || 'Pribadi',
        tema: doa.markerType ? doa.markerType : 'Umum',
        reference: doa.reference || 'Inspeksi Naskah',
        createdAt: Date.now()
      });
      alert("Berhasil disimpan ke Pustaka Doa Pribadi!");
    } catch (e) {
      console.error(e);
      alert("Gagal menyimpan ke database.");
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 md:h-full relative overflow-hidden">
      {/* Header Mobile Friendly */}
      <header className="bg-white px-5 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
           <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
              <BookHeart className="w-5 h-5" />
           </div>
           <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">Koleksi Doa</h3>
              <p className="text-[11px] text-slate-500 font-medium">Inspektur & Kurasi</p>
           </div>
        </div>
        <button onClick={onClose} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-100 px-2 flex justify-between items-center shadow-sm">
         {[
            { id: 'naskah', label: 'Di Naskah', icon: LayoutTemplate },
            { id: 'ai', label: 'AI Generator', icon: Sparkles },
            { id: 'kitab', label: 'Dari Kitab', icon: Library }
         ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-3 border-b-2 flex flex-col items-center gap-1 transition-all ${activeTab === tab.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
            >
               <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-indigo-600' : 'text-slate-400'}`} />
               <span className="text-[10px] font-bold uppercase tracking-wider">{tab.label}</span>
            </button>
         ))}
      </div>

      <main className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8">
         {/* TAB 1: NASKAH PARSER */}
         {activeTab === 'naskah' && (
            <div className="space-y-4">
               <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl flex items-start gap-3">
                  <BookOpen className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                     <h4 className="text-sm font-bold text-indigo-900">Inspeksi Otomatis</h4>
                     <p className="text-xs text-indigo-700 leading-relaxed mt-1">Kami menemukan <b>{parsedDoas.length}</b> paragraf Arab yang terdeteksi sebagai doa/dalil di dalam naskah Anda.</p>
                  </div>
               </div>

               {parsedDoas.length === 0 ? (
                  <div className="text-center py-20 px-4">
                     <p className="text-sm text-slate-500 font-medium">Tidak ada doa bahasa Arab yang terdeteksi di naskah ini.</p>
                  </div>
               ) : (
                  <div className="space-y-4">
                     {parsedDoas.map((doa, idx) => (
                        <div key={doa.id} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
                           <div className="flex justify-between items-center mb-4">
                              <div className="flex gap-2 items-center">
                                <span className="text-[10px] font-black text-rose-500 bg-rose-50 px-2 py-1 rounded-lg uppercase">Blok #{idx + 1}</span>
                                {doa.isTemplate && (
                                  <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg uppercase flex items-center gap-1 border border-amber-100">
                                    <Check className="w-3 h-3" />
                                    {getGacorLabel(doa.markerType)}
                                  </span>
                                )}
                                {!doa.isTemplate && (
                                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg uppercase flex items-center gap-1 border border-indigo-100">
                                    <Sparkles className="w-3 h-3" />
                                    {getGacorLabel()}
                                  </span>
                                )}
                              </div>
                              <button onClick={() => handleFixBlock(doa, 'hapus')} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                           </div>
                           <p className="font-arabic text-2xl md:text-3xl text-right leading-loose text-slate-800 mb-6" dir="rtl">{doa.arabic}</p>
                           
                           {doa.latin && <p className="text-xs italic text-indigo-600 mb-2 border-l-2 border-indigo-100 pl-3">{doa.latin}</p>}
                           {doa.translation && <p className="text-xs text-slate-600 mb-2 border-l-2 border-slate-100 pl-3 leading-relaxed">{doa.translation}</p>}
                           
                           <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-50">
                              <button 
                                 onClick={() => copyToClipboard(`${doa.arabic}\n\n${doa.latin}\n\n${doa.translation}`)}
                                 className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-xl transition-colors"
                                 title="Salin"
                              >
                                 <Copy className="w-4 h-4" />
                              </button>
                              <button 
                                 onClick={() => handleSaveToLibrary(doa)}
                                 className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl transition-colors"
                                 title="Simpan"
                              >
                                 <BookHeart className="w-4 h-4" />
                              </button>
                              {!doa.latin && (
                                 <button 
                                    onClick={() => handleFixBlock(doa, 'latin')}
                                    disabled={isProcessingLatin === doa.id}
                                    className="flex-1 py-1 px-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-[10px] font-bold transition-colors flex justify-center items-center gap-1"
                                 >
                                    {isProcessingLatin === doa.id ? <Loader2 className="w-3 h-3 animate-spin"/> : <Plus className="w-3 h-3"/>}
                                    Latin
                                 </button>
                              )}
                              {!doa.translation && (
                                 <button 
                                    onClick={() => handleFixBlock(doa, 'terjemahan')}
                                    disabled={isProcessingLatin === doa.id}
                                    className="flex-1 py-1 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-[10px] font-bold transition-colors flex justify-center items-center gap-1"
                                 >
                                    {isProcessingLatin === doa.id ? <Loader2 className="w-3 h-3 animate-spin"/> : <Plus className="w-3 h-3"/>}
                                    Arti
                                 </button>
                              )}
                           </div>
                        </div>
                     ))}
                  </div>
               )}
            </div>
         )}

         {/* TAB 2: AI GENERATOR */}
         {activeTab === 'ai' && (
            <div className="space-y-6">
               <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => generateDoa('tematik')} className="p-4 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/30 flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform">
                     <Sparkles className="w-6 h-6" />
                     <span className="text-xs font-bold">Doa Khusus Tema Ini</span>
                  </button>
                  <button onClick={() => generateDoa('umum')} className="p-4 rounded-2xl bg-white border border-slate-200 text-slate-700 hover:border-indigo-300 flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform">
                     <Library className="w-6 h-6 text-slate-400" />
                     <span className="text-xs font-bold">Doa Sapu Jagat</span>
                  </button>
               </div>

               {isGenerating ? (
                  <div className="py-20 flex flex-col items-center gap-4">
                     <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                     <p className="text-xs font-bold text-slate-400 uppercase">AI Sedang Menyusun Doa...</p>
                  </div>
               ) : (
                  <div className="space-y-4">
                     {aiDoas.map((doa, idx) => (
                        <div key={idx} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
                           <p className="font-arabic text-2xl md:text-3xl text-right leading-loose text-slate-800 mb-6" dir="rtl">{doa.arabic}</p>
                           <p className="text-xs italic text-indigo-600 mb-2 border-l-2 border-indigo-100 pl-3">{doa.latin}</p>
                           <p className="text-xs text-slate-600 mb-3 border-l-2 border-slate-100 pl-3 leading-relaxed">{doa.translation}</p>
                           {doa.reference && (
                              <p className="text-[10px] font-bold text-slate-400 uppercase mt-4 mb-2">{doa.reference}</p>
                           )}
                           <div className="flex gap-2 mt-4">
                              <button 
                                 onClick={() => copyToClipboard(`${doa.arabic}\n\n${doa.latin}\n\n${doa.translation}`)}
                                 className="flex-1 py-3 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2"
                              >
                                 <Copy className="w-3.5 h-3.5" /> Salin
                              </button>
                              <button 
                                 onClick={() => handleSaveToLibrary(doa)}
                                 className="flex-1 py-3 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2"
                              >
                                 <BookHeart className="w-3.5 h-3.5" /> Simpan
                              </button>
                           </div>
                           <button 
                              onClick={() => insertToContent(doa)}
                              className="w-full mt-2 py-3 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-colors"
                           >
                              Sisipkan ke Naskah
                           </button>
                        </div>
                     ))}
                  </div>
               )}
            </div>
         )}

         {/* TAB 3: DARI KITAB (OFFLINE) */}
         {activeTab === 'kitab' && (
            <div className="space-y-6">
               <div className="relative">
                  <input 
                     type="text" 
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     placeholder="Cari doa hutang, jodoh, sabar..."
                     className="w-full bg-white border border-slate-200 rounded-2xl py-3 pl-10 pr-4 text-sm font-medium outline-none focus:border-indigo-500 shadow-sm"
                  />
                  <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
               </div>

               <div className="space-y-4">
                  {filteredKitab.length === 0 ? (
                     <div className="text-center py-20 text-slate-500 text-sm">Tidak ditemukan doa dengan kata kunci tersebut. Coba gunakan fitur AI.</div>
                  ) : filteredKitab.map((doa) => (
                     <div key={doa.id} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
                        <div className="flex gap-2 mb-4 flex-wrap">
                           {doa.tema.slice(0,3).map(t => (
                              <span key={t} className="text-[9px] font-black text-slate-500 bg-slate-100 px-2 py-1 rounded-md uppercase">#{t}</span>
                           ))}
                        </div>
                        <p className="font-arabic text-2xl md:text-3xl text-right leading-loose text-slate-800 mb-6" dir="rtl">{doa.arabic}</p>
                        <p className="text-xs italic text-indigo-600 mb-2 border-l-2 border-indigo-100 pl-3">{doa.latin}</p>
                        <p className="text-xs text-slate-600 mb-3 border-l-2 border-slate-100 pl-3 leading-relaxed">{doa.translation}</p>
                        <p className="text-[10px] font-bold text-rose-500 mt-4 mb-2 flex items-center gap-1.5"><Library className="w-3 h-3"/> {doa.reference}</p>
                        <div className="flex gap-2 mt-4">
                           <button 
                              onClick={() => copyToClipboard(`${doa.arabic}\n\n${doa.latin}\n\n${doa.translation}`)}
                              className="flex-1 py-3 bg-slate-50 text-slate-500 hover:bg-slate-100 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2"
                           >
                              <Copy className="w-3.5 h-3.5" /> Salin
                           </button>
                           <button 
                              onClick={() => handleSaveToLibrary(doa)}
                              className="flex-1 py-3 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2"
                           >
                              <BookHeart className="w-3.5 h-3.5" /> Simpan
                           </button>
                        </div>
                        <button 
                           onClick={() => insertToContent(doa)}
                           className="w-full mt-2 py-3 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-bold transition-colors"
                        >
                           Sisipkan ke Naskah
                        </button>
                     </div>
                  ))}
               </div>
            </div>
         )}
      </main>
    </div>
  );
};

const QuoteIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M14.017 21L14.017 18C14.017 16.8954 14.9124 16 16.017 16H19.017C19.5693 16 20.017 15.5523 20.017 15V9C20.017 8.44772 19.5693 8 19.017 8H15.017C14.4647 8 14.017 7.55228 14.017 7V5C14.017 4.44772 14.4647 4 15.017 4H19.017C21.2261 4 23.017 5.79086 23.017 8V15C23.017 18.3137 20.3307 21 17.017 21H14.017ZM1 21L1 18C1 16.8954 1.89543 16 3 16H6C6.55228 16 7 15.5523 7 15V9C7 8.44772 6.55228 8 6 8H2C1.44772 8 1 7.55228 1 7V5C1 4.44772 1.44772 4 2 4H6C8.20914 4 10 5.79086 10 8V15C10 18.3137 7.31371 21 4 21H1ZM4 21" />
  </svg>
);
