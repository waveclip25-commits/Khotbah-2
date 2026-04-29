import React, { useState, useEffect } from 'react';
import { Search, Loader2, Book, Bookmark, ChevronRight, ChevronDown, Info, ExternalLink, Plus, Check, Sparkles, Play, BookOpen, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from '@google/genai';
import { Capacitor } from '@capacitor/core';

interface QuranReferenceProps {
  onAddToReference: (content: string, name: string) => void;
  existingReferences: any[];
  onNavigateToBook: (bookId: string) => void;
  initialSearchQuery?: string;
}

export const QuranReference: React.FC<QuranReferenceProps> = ({ onAddToReference, existingReferences, onNavigateToBook, initialSearchQuery }) => {
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery || '');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [chapters, setChapters] = useState<any[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [verses, setVerses] = useState<any[]>([]);
  const [isLoadingVerses, setIsLoadingVerses] = useState(false);
  const [activeTab, setActiveTab] = useState<'search' | 'browse'>('browse');
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());
  const [viewingTafsir, setViewingTafsir] = useState<string | null>(null);
  const [tafsirContent, setTafsirContent] = useState<string>('');
  const [isLoadingTafsir, setIsLoadingTafsir] = useState(false);
  const [viewingVerses, setViewingVerses] = useState<boolean>(false);

  useEffect(() => {
    if (initialSearchQuery) {
      setSearchQuery(initialSearchQuery);
      setActiveTab('search');
    }
  }, [initialSearchQuery]);

  useEffect(() => {
    if (searchQuery.trim() && activeTab === 'search') {
      const timer = setTimeout(() => {
        handleSearch();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [searchQuery, activeTab]);
  
  const TAFSIR_OPTIONS = [
    { id: 169, name: 'Tafsir Kemenag (Tahlili Lengkap)' },
    { id: 157, name: 'Tafsir Kemenag (Wajiz Singkat)' },
    { id: 159, name: 'Tafsir Kemenag (Ringkas)' },
    { id: 'equran', name: 'Tafsir EQuran.id' },
    { id: 164, name: 'Tafsir Jalalayn' },
    { id: 16, name: 'Tafsir Ibn Kathir (En)' },
  ];
  
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [selectedReciter, setSelectedReciter] = useState(7); // 7 = Mishary Rashid Alafasy
  const [isPlayingFullSurah, setIsPlayingFullSurah] = useState(false);
  const [currentVerseIndex, setCurrentVerseIndex] = useState(0);
  const [selectedTafsirId, setSelectedTafsirId] = useState<number | string>(169); // Default to Kemenag Tahlili

  const RECITERS = [
    { id: 7, name: 'Mishary Rashid Alafasy' },
    { id: 3, name: 'Abdur-Rahman as-Sudais' },
    { id: 4, name: 'Abu Bakr al-Shatri' },
    { id: 10, name: 'Saud al-Shuraim' },
  ];

  const getProxyUrl = (url: string) => {
    if (Capacitor.isNativePlatform()) {
      return url.replace('/api/quran-proxy/', 'https://api.quran.com/api/v4/')
                .replace('/api/equran-tafsir-proxy/', 'https://equran.id/api/v2/tafsir/');
    }
    return url;
  };

  const handlePlayAudio = async (verseKey: string, autoNext = false) => {
    if (playingAudio === verseKey && !autoNext) {
      audioRef.current?.pause();
      setPlayingAudio(null);
      setIsPlayingFullSurah(false);
      return;
    }

    try {
      const response = await fetch(getProxyUrl(`/api/quran-proxy/recitations/${selectedReciter}/by_ayah/${verseKey}`));
      const data = await response.json();
      
      if (data.audio_files && data.audio_files[0]) {
        const audioUrl = `https://verses.quran.com/${data.audio_files[0].url}`;
        
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.src = audioUrl;
          audioRef.current.play();
          setPlayingAudio(verseKey);
          
          audioRef.current.onended = () => {
            if (isPlayingFullSurah && verses.length > 0) {
              const currentIdx = verses.findIndex(v => v.verse_key === verseKey);
              if (currentIdx !== -1 && currentIdx < verses.length - 1) {
                const nextVerse = verses[currentIdx + 1];
                handlePlayAudio(nextVerse.verse_key, true);
              } else {
                setPlayingAudio(null);
                setIsPlayingFullSurah(false);
              }
            } else {
              setPlayingAudio(null);
            }
          };
        }
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      if (!autoNext) alert('Gagal memutar audio. Coba lagi nanti.');
    }
  };

  const handlePlayFullSurah = () => {
    if (isPlayingFullSurah) {
      audioRef.current?.pause();
      setIsPlayingFullSurah(false);
      setPlayingAudio(null);
    } else if (verses.length > 0) {
      setIsPlayingFullSurah(true);
      handlePlayAudio(verses[0].verse_key, true);
    }
  };

  // Fetch chapters on mount
  useEffect(() => {
    const fetchChapters = async () => {
      try {
        const response = await fetch(getProxyUrl('/api/quran-proxy/chapters?language=id'));
        const data = await response.json();
        setChapters(data.chapters || []);
      } catch (error) {
        console.error('Error fetching chapters:', error);
      }
    };
    fetchChapters();
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setViewingVerses(false);
    try {
      const response = await fetch(getProxyUrl(`/api/quran-proxy/search?q=${encodeURIComponent(searchQuery)}&language=id&size=20`));
      const data = await response.json();
      setResults(data.search.results || []);
    } catch (error) {
      console.error('Error searching Quran:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const fetchVerses = async (chapterId: number) => {
    setSelectedChapter(chapterId);
    setIsLoadingVerses(true);
    setViewingVerses(true);
    try {
      const response = await fetch(getProxyUrl(`/api/quran-proxy/verses/by_chapter/${chapterId}?language=id&words=false&translations=33&fields=text_uthmani`));
      const data = await response.json();
      setVerses(data.verses || []);
    } catch (error) {
      console.error('Error fetching verses:', error);
      setVerses([]);
    } finally {
      setIsLoadingVerses(false);
    }
  };

  const addVerseToReference = async (verseKey: string, text: string, translation: string) => {
    const cleanTranslation = translation.replace(/<[^>]*>?/gm, '');
    const content = `Ayat: ${verseKey}\n\nArab:\n${text}\n\nTerjemahan:\n${cleanTranslation}`;
    onAddToReference(content, `Quran ${verseKey}`);
    setAddedItems(prev => new Set(prev).add(verseKey));
  };

  const fetchTafsirFromAI = async (verseKey: string) => {
    try {
      const activeKey = process.env.GEMINI_API_KEY;
      if (!activeKey) return "Tafsir tidak tersedia (API Key tidak ditemukan).";

      const ai = new GoogleGenAI({ apiKey: activeKey });
      const tafsirName = TAFSIR_OPTIONS.find(t => t.id === selectedTafsirId)?.name || 'Tafsir';
      const prompt = `Berikan penjelasan tafsir untuk ayat Al-Quran ${verseKey} berdasarkan perspektif ${tafsirName}. Gunakan Bahasa Indonesia yang baik dan benar. Berikan penjelasan yang mendalam namun mudah dipahami.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      return response.text;
    } catch (err) {
      console.error("AI Tafsir error:", err);
      return "Gagal mengambil tafsir dari AI.";
    }
  };

  const fetchTafsir = async (verseKey: string, overrideTafsirId?: string | number) => {
    const activeTafsirId = overrideTafsirId || selectedTafsirId;
    setViewingTafsir(verseKey);
    setIsLoadingTafsir(true);
    setTafsirContent('');
    try {
      let content = '';
      if (activeTafsirId === 'equran') {
        const [surah, ayah] = verseKey.split(':');
        const response = await fetch(getProxyUrl(`/api/equran-tafsir-proxy/${surah}`));
        if (!response.ok) throw new Error('API Response Error EQuran');
        const data = await response.json();
        const tafsirItem = data.data?.tafsir?.find((t: any) => t.ayat.toString() === ayah);
        content = tafsirItem?.teks;
      } else {
        const response = await fetch(getProxyUrl(`/api/quran-proxy/tafsirs/${activeTafsirId}/by_verse/${verseKey}`));
        if (!response.ok) throw new Error('API Response Error');
        const data = await response.json();
        content = data.tafsir?.text;
      }
      
      if (!content) {
        const aiContent = await fetchTafsirFromAI(verseKey);
        setTafsirContent(aiContent);
      } else {
        const cleanContent = content
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/&nbsp;/g, ' ')
          .trim();
        setTafsirContent(cleanContent);
      }
    } catch (error) {
      console.error('Error fetching tafsir, trying AI fallback:', error);
      const aiContent = await fetchTafsirFromAI(verseKey);
      setTafsirContent(aiContent);
    } finally {
      setIsLoadingTafsir(false);
    }
  };

  const addTafsirToReference = (verseKey: string) => {
    const tafsirName = TAFSIR_OPTIONS.find(t => t.id === selectedTafsirId)?.name || 'Tafsir';
    const content = `Tafsir Ayat: ${verseKey}\nSumber: ${tafsirName}\n\nIsi Tafsir:\n${tafsirContent.replace(/<[^>]*>?/gm, '')}`;
    onAddToReference(content, `${tafsirName} ${verseKey}`);
    setAddedItems(prev => new Set(prev).add(`tafsir-${verseKey}`));
    setViewingTafsir(null);
  };

  // Ebook-style Tafsir Reader View
  if (viewingTafsir) {
    return (
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex flex-col h-full bg-white rounded-2xl border border-slate-200 overflow-hidden min-h-[500px]"
      >
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <button 
            onClick={() => setViewingTafsir(null)}
            className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-emerald-600 transition-colors"
          >
            <ChevronRight className="w-4 h-4 rotate-180" /> Kembali
          </button>
          <div className="text-center">
            <h3 className="font-bold text-slate-800 text-sm">Tafsir {viewingTafsir}</h3>
          </div>
          <select
            value={selectedTafsirId}
            onChange={(e) => {
              const val = e.target.value === 'equran' ? 'equran' : Number(e.target.value);
              setSelectedTafsirId(val);
              // We need to re-fetch manually after state updates, better done in a useEffect or by passing it to fetchTafsir.
              // To avoid stale state, let's call a modified fetchTafsir below or let a useEffect handle it.
              // We'll update fetchTafsir to accept second optional param:
              fetchTafsir(viewingTafsir, val);
            }}
            className="text-[10px] bg-slate-100 border border-slate-200 text-slate-600 rounded-md py-1 px-2 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            {TAFSIR_OPTIONS.map(opt => (
              <option key={opt.id} value={opt.id}>{opt.name}</option>
            ))}
          </select>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#fdfbf7]">
          {isLoadingTafsir ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Loader2 className="w-10 h-10 animate-spin mb-4" />
              <p className="text-sm">Membuka Kitab Tafsir...</p>
            </div>
          ) : (
            <div 
              className="text-sm text-slate-800 leading-relaxed prose prose-slate max-w-none font-serif tafsir-content"
              dangerouslySetInnerHTML={{ __html: tafsirContent }}
            />
          )}
        </div>

        <div className="p-4 border-t border-slate-100 bg-white flex gap-3">
          <button 
            onClick={() => addTafsirToReference(viewingTafsir)}
            disabled={isLoadingTafsir || addedItems.has(`tafsir-${viewingTafsir}`)}
            className={`flex-1 py-3 rounded-xl text-sm font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 ${addedItems.has(`tafsir-${viewingTafsir}`) ? 'bg-emerald-500' : 'bg-emerald-600 hover:bg-emerald-700'}`}
          >
            {addedItems.has(`tafsir-${viewingTafsir}`) ? (
              <><Check className="w-4 h-4" /> Tersimpan di Referensi</>
            ) : (
              <><Plus className="w-4 h-4" /> Gunakan Sebagai Referensi</>
            )}
          </button>
        </div>
      </motion.div>
    );
  }

  // Full-page Verse List View
  if (viewingVerses && selectedChapter) {
    const chapter = chapters.find(c => c.id === selectedChapter);
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col h-full overflow-hidden"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setViewingVerses(false)}
              className="w-10 h-10 flex items-center justify-center bg-white rounded-full border border-slate-200 text-slate-600 hover:text-emerald-600 hover:border-emerald-200 transition-all shadow-sm"
              title="Kembali ke Daftar Surah"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h3 className="font-bold text-slate-900 text-xl font-outfit leading-tight">{chapter?.name_simple}</h3>
              <p className="text-xs text-slate-500 font-medium">{chapter?.translated_name.name} • {chapter?.verses_count} Ayat</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={handlePlayFullSurah}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold transition-all ${isPlayingFullSurah ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-emerald-600 text-white shadow-lg shadow-emerald-200 hover:bg-emerald-700'}`}
            >
              {isPlayingFullSurah ? <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              {isPlayingFullSurah ? 'Berhenti' : 'Putar Surah'}
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-16 custom-scrollbar pb-24">
            {isLoadingVerses ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Loader2 className="w-10 h-10 animate-spin mb-4" />
                <p className="text-sm font-medium tracking-wide">Meresapi Wahyu...</p>
              </div>
            ) : (
              verses.map((verse, idx) => (
                <div key={verse.id} className="relative max-w-4xl mx-auto w-full">
                  <div className="flex flex-col space-y-10">
                    {/* Verse Header Info */}
                    <div className="flex items-center justify-between opacity-50 hover:opacity-100 transition-opacity">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                          {verse.verse_number}
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 tracking-[0.2em] uppercase font-outfit">{chapter?.name_simple} : {verse.verse_number}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handlePlayAudio(verse.verse_key)}
                          className={`p-2 rounded-xl transition-all ${playingAudio === verse.verse_key ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'text-slate-400 hover:bg-emerald-50 hover:text-emerald-600'}`}
                        >
                          {playingAudio === verse.verse_key ? <div className="w-3 h-3 bg-white rounded-full animate-pulse" /> : <Play className="w-4 h-4 fill-current" />}
                        </button>
                        <button 
                          onClick={() => fetchTafsir(verse.verse_key)}
                          className="p-2 rounded-xl text-slate-400 hover:bg-amber-50 hover:text-amber-600 transition-all"
                          title="Baca Tafsir"
                        >
                          <BookOpen className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => addVerseToReference(verse.verse_key, verse.text_uthmani || '', verse.translations?.[0]?.text || '')}
                          className={`p-2 rounded-xl transition-all ${addedItems.has(verse.verse_key) ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 hover:bg-emerald-50 hover:text-emerald-600'}`}
                        >
                          {addedItems.has(verse.verse_key) ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Arabic Text */}
                    <p className="text-right font-arabic text-4xl md:text-5xl lg:text-7xl leading-[2.8] text-slate-800 tracking-normal px-2" dir="rtl">
                      {verse.text_uthmani}
                    </p>

                    {/* Translation */}
                    <div className="px-2">
                      <div 
                        className="text-lg md:text-xl text-slate-600 leading-relaxed font-medium font-jakarta"
                        dangerouslySetInnerHTML={{ __html: verse.translations?.[0]?.text || '' }}
                      />
                    </div>
                  </div>
                  
                  {/* Visual separator */}
                  {idx !== verses.length - 1 && (
                    <div className="mt-16 w-full h-[1px] bg-slate-100/50" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      <audio ref={audioRef} className="hidden" />
      
      {!viewingVerses && !viewingTafsir && (
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="space-y-1">
            <h2 className="text-3xl font-bold text-slate-900 font-outfit tracking-tight">Al-Qur'anul Karim</h2>
            <p className="text-sm text-slate-500 font-medium">Temukan kedamaian dalam setiap ayatnya</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex bg-slate-100 p-1 rounded-2xl w-full sm:w-auto">
              <button 
                onClick={() => setActiveTab('browse')}
                className={`px-8 py-2.5 text-xs font-bold rounded-xl transition-all ${activeTab === 'browse' ? 'bg-white text-emerald-600 shadow-md shadow-emerald-500/5' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Daftar Surah
              </button>
              <button 
                onClick={() => setActiveTab('search')}
                className={`px-8 py-2.5 text-xs font-bold rounded-xl transition-all ${activeTab === 'search' ? 'bg-white text-emerald-600 shadow-md shadow-emerald-500/5' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Cari Ayat
              </button>
            </div>
            
            <div className="relative group">
              <select 
                value={selectedReciter}
                onChange={(e) => setSelectedReciter(Number(e.target.value))}
                className="appearance-none bg-emerald-50 border border-emerald-100 text-emerald-700 pl-4 pr-10 py-3 rounded-2xl text-xs font-bold outline-none cursor-pointer hover:bg-emerald-100 transition-all"
              >
                {RECITERS.map(r => (
                  <option key={r.id} value={r.id}>{r.name.split(' (')[0]}</option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-600">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'search' ? (
        <div className="space-y-4">
          <div className="relative">
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Cari kata kunci (misal: Taqwa, Sabar)..."
              className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-4 py-4 text-sm outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all shadow-sm"
            />
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <button 
              onClick={handleSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-emerald-600 text-white px-6 py-2 rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
            >
              Telusuri
            </button>
          </div>

          <div className="space-y-4">
            {isSearching ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Loader2 className="w-10 h-10 animate-spin mb-4" />
                <p className="text-sm font-medium tracking-wide">Mencari di Database Pusat...</p>
              </div>
            ) : results.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.map((result, idx) => (
                  <div key={idx} className="bg-white rounded-3xl p-6 border border-slate-200 hover:border-emerald-300 transition-all group shadow-sm flex flex-col">
                    <div className="flex justify-between items-start mb-6">
                      <div className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold border border-emerald-100 italic">
                        Surah {result.verse_key}
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handlePlayAudio(result.verse_key)}
                          className={`p-2 rounded-xl transition-all ${playingAudio === result.verse_key ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-50 text-slate-400 hover:text-emerald-600'}`}
                        >
                           {playingAudio === result.verse_key ? <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" /> : <Play className="w-4 h-4 fill-current" />}
                        </button>
                        <button 
                          onClick={() => addVerseToReference(result.verse_key, result.text.replace(/<[^>]*>?/gm, ''), result.translations?.[0]?.text || '')}
                          className={`p-2 rounded-xl transition-all ${addedItems.has(result.verse_key) ? 'bg-emerald-600 text-white' : 'bg-slate-50 text-slate-400 hover:text-emerald-600'}`}
                        >
                          {addedItems.has(result.verse_key) ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <p className="text-right font-arabic text-2xl leading-[2] mb-6 text-slate-900 overflow-hidden" dir="rtl">
                      {result.text.replace(/<[^>]*>?/gm, '')}
                    </p>
                    <div 
                      className="text-sm text-slate-600 leading-relaxed font-jakarta mt-auto pt-4 border-t border-slate-50"
                      dangerouslySetInnerHTML={{ __html: result.translations?.[0]?.text || 'Terjemahan tidak tersedia' }}
                    />
                  </div>
                ))}
              </div>
            ) : searchQuery && !isSearching ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-slate-200">
                <p className="text-slate-500 font-medium">Wahyu tidak ditemukan dengan kata kunci tersebut.</p>
              </div>
            ) : (
              <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 border-dashed border-2">
                <Book className="w-16 h-16 mx-auto mb-4 text-slate-200" />
                <p className="text-sm text-slate-400 font-medium">Gunakan fitur telusur untuk mencari hikmah dalam Al-Qur'an.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {chapters.map((chapter) => (
            <button 
              key={chapter.id}
              onClick={() => fetchVerses(chapter.id)}
              className="flex items-center p-5 rounded-3xl border border-slate-200/60 bg-white hover:border-emerald-400 hover:shadow-xl hover:shadow-emerald-500/5 transition-all group text-left relative overflow-hidden"
            >
              {/* Background Accent */}
              <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                <span className="font-arabic text-8xl line-clamp-1">{chapter.name_arabic}</span>
              </div>
              
              <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-xs font-bold text-slate-400 group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-600 transition-all shrink-0">
                {chapter.id}
              </div>
              
              <div className="ml-4 flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <h4 className="font-bold text-slate-800 font-outfit truncate">{chapter.name_simple}</h4>
                  <span className="font-arabic text-lg text-emerald-600 group-hover:scale-110 transition-transform">{chapter.name_arabic}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-medium truncate">{chapter.translated_name.name}</span>
                  <span className="w-1 h-1 bg-slate-300 rounded-full" />
                  <span className="text-[10px] text-slate-500 font-bold">{chapter.verses_count} Ayat</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Footer Info */}
      <div className="p-6 bg-gradient-to-r from-emerald-600 to-teal-700 rounded-[2rem] text-white flex flex-col sm:flex-row items-center gap-6 shadow-lg shadow-emerald-200/50">
        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center shrink-0 backdrop-blur-md">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
        <div>
          <h4 className="font-bold text-lg mb-1 leading-tight font-outfit">Sourcing Terverifikasi</h4>
          <p className="text-white/80 text-xs leading-relaxed max-w-xl">
            Seluruh data Quran dan Tafsir bersumber dari <strong>Quran Foundation (Quran.com)</strong>. Kami menjamin akses langsung ke API resmi untuk akurasi teks Uthmani dan terjemahan paling mutakhir.
          </p>
        </div>
      </div>
    </div>
  );
};
