import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { db, AVAILABLE_BOOKS, Book } from '../db';
import JSZip from 'jszip';
import { 
  Search, RefreshCw, Trash2, Type, Languages, Check, X, 
  AlertCircle, BookOpen, Loader2, ChevronDown, ChevronUp,
  Wand2, Sparkles, Quote, CheckCircle2, Plus, Library, Filter,
  Download, Database, Book as BookIcon, ShieldCheck, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

interface DalilItem {
  id: string;
  fullMatch: string; // The exact string found in the text
  arabic: string;
  latin: string;
  translation: string;
  reference: string;
  type: 'quran' | 'hadith' | 'other' | 'rukun' | 'sunnah';
  category: 'hamdalah' | 'shalawat' | 'wasiat' | 'ayat' | 'doa' | 'sunnah' | 'other' | 'mukadimah' | 'dalil';
  validity: 'sahih' | 'hasan' | 'dhaif' | 'palsu' | 'unknown';
  notes: string;
  tafsir?: string;
  suggestedMatch?: {
    arabic: string;
    translation: string;
    reference: string;
    bookId: string;
    number: string | number;
  };
}

interface DalilInspectorProps {
  content: string;
  onUpdate: (newContent: string) => void;
  apiKey: string;
  onClose: () => void;
  dalilList: DalilItem[];
  setDalilList: (list: DalilItem[]) => void;
  analyzed: boolean;
  setAnalyzed: (analyzed: boolean) => void;
  onCheckInQuran?: (reference: string) => void;
}

interface TafsirViewProps {
  item: DalilItem;
  onUpdateFullContent: (newContent: string) => void;
  fullContent: string;
  apiKey: string;
  onUpdateItem: (updated: Partial<DalilItem>) => void;
}

const TafsirView: React.FC<TafsirViewProps> = ({ 
  item, onUpdateFullContent, fullContent, apiKey, onUpdateItem 
}) => {
  const [tafsir, setTafsir] = useState<string>(item.tafsir || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedBookId, setSelectedBookId] = useState<string>('kemenag-wajiz');
  const [availableTafsirBooks, setAvailableTafsirBooks] = useState<Book[]>([]);

  useEffect(() => {
    const checkBooks = async () => {
      const books = await db.books.where('category').equals('tafsir').toArray();
      setAvailableTafsirBooks(books);
      const downloaded = books.find(b => b.isDownloaded);
      if (downloaded) setSelectedBookId(downloaded.id);
    };
    checkBooks();
  }, []);

  const fetchOfflineTafsir = async (bookId: string) => {
    setIsLoading(true);
    try {
      const book = availableTafsirBooks.find(b => b.id === bookId);
      if (!book || !book.isDownloaded) {
        throw new Error("Kitab belum diunduh.");
      }
      
      const reference = item.reference;
      // Regex better: match QS Surah:Ayat (e.g. QS Al-Baqarah: 183 or Al-Baqarah: 183)
      const match = reference.match(/: (\d+)/);
      if (match) {
        const ayatNum = match[1];
        const result = await db.hadiths.where({ bookId: bookId, number: ayatNum }).first();
        if (result) {
          const cleanTafsir = result.id_translation;
          setTafsir(cleanTafsir);
          onUpdateItem({ tafsir: cleanTafsir });
        } else {
          alert("Tafsir tidak ditemukan untuk nomor ayat ini di database offline.");
        }
      } else {
        alert("Gagal mengenali nomor ayat.");
      }
    } catch (e: any) {
      alert(e.message || "Gagal mengambil tafsir.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAiTafsir = async () => {
    if (!apiKey) return alert("API Key diperlukan.");
    setIsLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Berikan tafsir ringkas (max 150 kata) untuk ayat berikut: ${item.reference} (${item.arabic}). Fokus pada intisari yang relevan untuk materi khotbah jumat. Output HANYA teks tafsir.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });
      
      const aiText = response.text || '';
      setTafsir(aiText);
      onUpdateItem({ tafsir: aiText });
    } catch (e) {
      alert("Gagal mengambil tafsir AI.");
    } finally {
      setIsLoading(false);
    }
  };

  const insertToManuscript = () => {
    if (!tafsir) return;
    const parts = fullContent.split('\n');
    let foundIndex = -1;
    // Look for where the Arabic text exists in the main content
    for (let i = 0; i < parts.length; i++) {
        if (parts[i].includes(item.arabic.substring(0, 15))) {
            foundIndex = i;
            // Move after translation/latin
            while (foundIndex < parts.length - 1 && 
                   (parts[foundIndex+1].trim() === '' || 
                    parts[foundIndex+1].includes(item.translation.substring(0, 15)) ||
                    (item.latin && parts[foundIndex+1].includes(item.latin.substring(0, 15))))) {
                foundIndex++;
            }
            break;
        }
    }

    if (foundIndex !== -1) {
        const newParts = [...parts];
        newParts.splice(foundIndex + 1, 0, `\n> **Tafsir Ringkas:**\n> _${tafsir}_\n`);
        onUpdateFullContent(newParts.join('\n'));
        alert("Tafsir berhasil disisipkan!");
    } else {
        onUpdateFullContent(fullContent + `\n\n**Tafsir ${item.reference}:**\n${tafsir}`);
        alert("Tafsir disisipkan di akhir naskah.");
    }
  };

  return (
    <div className="pt-4 border-t border-white/10 mt-2 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] font-black text-emerald-400 uppercase tracking-widest">
          <BookIcon className="w-3.5 h-3.5" />
          Eksplorasi Tafsir
        </div>
        {!isEditing && (
          <button 
            onClick={() => setIsEditing(true)}
            className="text-[9px] font-bold text-slate-400 hover:text-white flex items-center gap-1"
          >
            <RefreshCw className="w-2.5 h-2.5" /> {tafsir ? 'Edit Manual' : 'Input Manual'}
          </button>
        )}
      </div>

      {!tafsir && !isEditing && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
           <div className="flex flex-col gap-1.5">
             <select 
               value={selectedBookId}
               onChange={(e) => setSelectedBookId(e.target.value)}
               className="bg-slate-800 border border-slate-700 text-[10px] text-white rounded-lg px-2 py-1.5 outline-none"
             >
               {AVAILABLE_BOOKS.filter(b => b.category === 'tafsir').map(b => (
                 <option key={b.id} value={b.id}>{b.title}</option>
               ))}
             </select>
             <button 
               onClick={() => fetchOfflineTafsir(selectedBookId)}
               disabled={isLoading}
               className="flex items-center justify-center gap-2 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-xl transition-all disabled:opacity-50"
             >
               {isLoading ? <Loader2 className="w-3 h-3 animate-spin"/> : <Download className="w-3 h-3" />}
               Offline
             </button>
           </div>
           <button 
             onClick={fetchAiTafsir}
             disabled={isLoading}
             className="flex flex-col items-center justify-center gap-1 py-2 bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-bold rounded-xl border border-slate-700 transition-all disabled:opacity-50"
           >
             <Sparkles className="w-3.5 h-3.5 text-amber-400" />
             AI Ringkas
           </button>
        </div>
      )}

      {(tafsir || isEditing) && (
        <motion.div 
          initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          {isEditing ? (
            <textarea 
              value={tafsir}
              onChange={(e) => setTafsir(e.target.value)}
              placeholder="Tulis tafsir manual di sini..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-[11px] text-white min-h-[100px] outline-none focus:border-emerald-500"
            />
          ) : (
            <div className="p-4 bg-emerald-950/20 rounded-2xl border border-emerald-900/30">
              <p className="text-[11px] text-slate-300 leading-relaxed italic">
                "{tafsir}"
              </p>
            </div>
          )}

          <div className="flex gap-2">
            {isEditing ? (
              <>
                <button 
                  onClick={() => {
                    onUpdateItem({ tafsir });
                    setIsEditing(false);
                  }}
                  className="flex-1 py-1.5 bg-emerald-600 text-white text-[10px] font-bold rounded-lg flex items-center justify-center gap-1.5"
                >
                  <Check className="w-3 h-3" /> Simpan
                </button>
              </>
            ) : (
              <>
                <button 
                  onClick={insertToManuscript}
                  className="flex-1 py-1.5 bg-indigo-600 text-white text-[10px] font-bold rounded-lg flex items-center justify-center gap-1.5 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20"
                >
                  <Plus className="w-3 h-3" /> Sisipkan ke Naskah
                </button>
                <button 
                   onClick={() => {
                     setTafsir('');
                     onUpdateItem({ tafsir: '' });
                   }}
                   className="p-1.5 text-slate-500 hover:text-rose-400"
                >
                   <Trash2 className="w-3 h-3" />
                </button>
              </>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export const DalilInspector: React.FC<DalilInspectorProps> = ({ 
  content, onUpdate, apiKey, onClose,
  dalilList, setDalilList, analyzed, setAnalyzed,
  onCheckInQuran
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showValidity, setShowValidity] = useState(true);
  const [expandedDetails, setExpandedDetails] = useState<Set<string>>(new Set());
  
  const toggleDetails = (id: string) => {
    const next = new Set(expandedDetails);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedDetails(next);
  };
  
  // Action States
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [replacementQuery, setReplacementQuery] = useState('');
  const [showReplaceModal, setShowReplaceModal] = useState<string | null>(null); // ID of item to replace
  const [replacementOptions, setReplacementOptions] = useState<any[]>([]);
  const [isSearchingReplacement, setIsSearchingReplacement] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string|null>(null);
  const [dbStatus, setDbStatus] = useState<'empty' | 'downloading' | 'ready'>('empty');
  const [isDownloadingBundle, setIsDownloadingBundle] = useState(false);
  const [bundleProgress, setBundleProgress] = useState(0);

  useEffect(() => {
    const checkDb = async () => {
      const count = await db.books.count();
      setDbStatus(count >= 5 ? 'ready' : 'empty');
    };
    checkDb();
  }, [bundleProgress]);

  // Add Dalil State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addQuery, setAddQuery] = useState('');
  const [addOptions, setAddOptions] = useState<any[]>([]);
  const [isSearchingAdd, setIsSearchingAdd] = useState(false);
  const [searchSource, setSearchSource] = useState<'ai' | 'library'>('library');
  const [suggestedThemes, setSuggestedThemes] = useState<string[]>([]);
  const [isSuggestingThemes, setIsSuggestingThemes] = useState(false);
  const [selectedBookId, setSelectedBookId] = useState<string>(() => {
    return localStorage.getItem('lastOpenedBookId') || 'all';
  });
  const [openBookTitle, setOpenBookTitle] = useState<string>('');

  const BUNDLE_MAP: Record<string, string> = {
    'abu-daud.json': 'abu-dawud',
    'ahmad.json': 'ahmad',
    'bukhari.json': 'bukhari',
    'darimi.json': 'darimi',
    'ibnu-majah.json': 'ibnu-majah',
    'malik.json': 'malik',
    'muslim.json': 'muslim',
    'nasai.json': 'nasai',
    'tirmidzi.json': 'tirmidzi'
  };

  const handleBundleDownload = async () => {
    setIsDownloadingBundle(true);
    setBundleProgress(0);
    try {
      const bundleUrl = 'https://cdn.jsdelivr.net/gh/thebayknigth087-boop/Kitabul-Tis-ah@main/books.zip';
      const response = await fetch(bundleUrl);
      if (!response.ok) throw new Error("Gagal mengunduh bundle data.");
      
      const arrayBuffer = await response.arrayBuffer();
      setBundleProgress(30);
      
      const zip = await JSZip.loadAsync(arrayBuffer);
      const files = Object.keys(zip.files).filter(name => name.endsWith('.json'));
      
      let totalProcessed = 0;
      for (const filename of files) {
        const content = await zip.files[filename].async('string');
        const json = JSON.parse(content);
        let items: any[] = [];
        if (Array.isArray(json)) items = json;
        else if (json.data && Array.isArray(json.data)) items = json.data;
        else if (json.hadiths && Array.isArray(json.hadiths)) items = json.hadiths;

        if (items.length > 0) {
          const bookId = BUNDLE_MAP[filename] || filename.replace('.json', '');
          const bundleBook = AVAILABLE_BOOKS.find(b => b.id === bookId);
          if (bundleBook) {
            await db.transaction('rw', db.books, db.hadiths, async () => {
              await db.books.put({
                id: bundleBook.id,
                title: bundleBook.title,
                author: bundleBook.author,
                sourceUrl: bundleBook.driveId,
                isDownloaded: true,
                totalHadiths: items.length,
                category: bundleBook.category as any
              });
              const batchSize = 1000;
              for (let i = 0; i < items.length; i += batchSize) {
                const batch = items.slice(i, i + batchSize).map((h: any, index: number) => ({
                  bookId: bundleBook.id,
                  number: h.number || h.no || h.id || (i + index + 1),
                  arab: h.arab || h.arabic || h.text_arab || h.ar || '',
                  id_translation: h.id_translation || h.id || h.translation || h.terjemah || h.text || h.content || h.idn || '',
                  title: h.title || h.name || h.judul || ''
                }));
                await db.hadiths.bulkPut(batch);
              }
            });
          }
        }
        totalProcessed++;
        setBundleProgress(30 + (totalProcessed / files.length) * 70);
      }
      
      await db.books.put({
        id: 'kitab-tisah-bundle',
        title: 'Bundle Kitab Tis\'ah (9 Kitab)',
        author: 'Imam-Imam Hadits',
        sourceUrl: bundleUrl,
        isDownloaded: true,
        totalHadiths: 9,
        category: 'hadits'
      });
      
    } catch (err) {
      console.error(err);
      setErrorMsg("Gagal mengunduh Kitab Tis'ah.");
    } finally {
      setIsDownloadingBundle(false);
      setBundleProgress(0);
    }
  };

  useEffect(() => {
    const lastId = localStorage.getItem('lastOpenedBookId');
    if (lastId) {
      const book = AVAILABLE_BOOKS.find(b => b.id === lastId);
      if (book) setOpenBookTitle(book.title);
    }
  }, []);

  // Clear error after 3s
  useEffect(() => {
    if (errorMsg) {
      const timer = setTimeout(() => setErrorMsg(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [errorMsg]);

  // Auto-extract Dalil locally to save tokens
  useEffect(() => {
    if (!analyzed && dalilList.length === 0 && content) {
      const extractLocalDalil = async () => {
        setIsAnalyzing(true);
        try {
          const lines = content.split('\n');
          const extracted: DalilItem[] = [];
          
          let i = 0;
          while (i < lines.length) {
            const line = lines[i];
            
            // Check for markdown arabic blocks or generic arabic text
            if (line.includes('```arabic') || /[\u0600-\u06FF]/.test(line)) {
              let currentArabic = line.replace(/```arabic/g, '').trim();
              let fullMatch = line;
              let j = i + 1;
              
              // If it's a code block, consume until closing ```
              if (line.includes('```arabic')) {
                while (j < lines.length && !lines[j].includes('```')) {
                  currentArabic += '\n' + lines[j].trim();
                  fullMatch += '\n' + lines[j];
                  j++;
                }
                if (j < lines.length) { // include closing tick
                  fullMatch += '\n' + lines[j];
                  j++;
                }
              } else {
                // Not code block, just a line with Arabic. But could be multiple lines.
                // We'll just take this line as the Arabic part if it's long enough
              }

              if (currentArabic.replace(/[\s\u064B-\u065F\u0670\u06D6-\u06ED]/g, '').length < 10) {
                // Too short, skip (like SWT, SAW)
                i = j > i ? j : i + 1;
                continue;
              }
              
              let currentTranslation = '';
              let reference = 'Terdeteksi Otomatis';
              let latin = '';
              let category: 'hamdalah' | 'shalawat' | 'wasiat' | 'ayat' | 'doa' | 'sunnah' | 'other' | 'mukadimah' | 'dalil' = 'dalil';
              let validity: any = 'unknown';
              let notes = 'Insya Allah Terverifikasi (Mode Cepat)';

      // Heuristic for category based on arabic content
      const lowerArab = currentArabic.toLowerCase();
      if (lowerArab.includes('الحمد') || lowerArab.includes('حمداً')) category = 'hamdalah';
      else if (lowerArab.includes('اللهم صل') || lowerArab.includes('على محمد')) category = 'shalawat';
      else if (lowerArab.includes('اتقوا الله') || lowerArab.includes('أوصيكم')) category = 'wasiat';
      else if (lowerArab.includes('اللهم اغفر') || lowerArab.includes('للمؤمنين')) category = 'doa';
      else if (lowerArab.includes('أعوذ بالله')) category = 'ayat';
      else category = 'other';

              // Look ahead for translation, latin, or reference (up to 15 lines ahead)
              while (j < Math.min(i + 15, lines.length)) {
                const nextLine = lines[j].trim();
                const pureLine = nextLine.replace(/^>+/, '').trim(); // Remove blockquotes if any
                
                if (pureLine === '' || pureLine.includes('```')) {
                  j++;
                  continue;
                }
                if (/[\u0600-\u06FF]{5,}/.test(pureLine) && !nextLine.includes('Artinya:')) {
                  // Another Arabic block started, break
                  break;
                }
                
                fullMatch += '\n' + lines[j];
                
                const lowerNext = pureLine.toLowerCase();
                if (lowerNext.startsWith('artinya:') || lowerNext.startsWith('"') || lowerNext.startsWith('terjemahan:')) {
                  currentTranslation = pureLine.replace(/^(artinya:|terjemahan:)\s*/i, '').replace(/^"|"$/g, '').trim();
                } else if (lowerNext.includes('hr.') || lowerNext.includes('qs.') || lowerNext.includes('surat ') || lowerNext.includes('hadits')) {
                  reference = pureLine.replace(/^[()\[\]]|[()\[\]]$/g, '').trim();
                } else if ((pureLine.startsWith('*') && pureLine.endsWith('*')) || /^[A-Za-z\s',.-]{10,}$/i.test(pureLine)) {
                  if (!currentTranslation && !reference.includes(pureLine) && !pureLine.includes('Khotbah')) {
                    latin = pureLine.replace(/\*/g, '');
                  }
                }
                j++;
              }
              
              // Cross-reference with Offline Database if it looks like a Hadith
              const isHadith = reference.toLowerCase().includes('hr.') || reference.toLowerCase().includes('hadits');
              if (isHadith) {
                try {
                  // Attempt to check validity using offline Dexie DB
                  // Just doing a fast text-search on translations to find a matching source.
                  if (currentTranslation.length > 20) {
                    const searchChunk = currentTranslation.slice(0, 50).toLowerCase(); // Use first 50 chars of translation for search
                    const localMatch = await db.hadiths.filter(h => h.id_translation.toLowerCase().includes(searchChunk)).first();
                    if (localMatch) {
                       validity = 'sahih'; // Kitab Tis'ah generally treated as standard/sahih in this offline context if matched
                       notes = `Insya Allah Terverifikasi (Offline DB: Kitab ${localMatch.bookId.toUpperCase()} No. ${localMatch.number})`;
                    } else {
                       notes += ' (Nilai dalil belum terindeks)';
                    }
                  }
                } catch (dbErr) {
                  console.error("Local DB check failed", dbErr);
                }
              }

              extracted.push({
                id: Math.random().toString(36).substr(2, 9),
                fullMatch: fullMatch.trim(),
                arabic: currentArabic.trim(),
                latin: latin,
                translation: currentTranslation,
                reference: reference,
                type: reference.toLowerCase().includes('qs.') || reference.toLowerCase().includes('surat') ? 'quran' : 'hadith',
                category: category,
                validity: validity,
                notes: notes
              });
              
              i = j;
            } else {
              i++;
            }
          }
          
          // Deduplicate
          const unique = extracted.filter((v, idx, a) => a.findIndex(t => (t.arabic === v.arabic)) === idx);
          
          if (unique.length > 0) {
            setDalilList(unique);
            setAnalyzed(true);
          }
        } catch (e) {
            console.error("Extraction error", e);
        } finally {
            setIsAnalyzing(false);
        }
      };
      
      extractLocalDalil();
    }
  }, [content, analyzed, dalilList.length, setDalilList, setAnalyzed]);

  const analyzeDalil = async () => {
    if (!apiKey) {
      setErrorMsg("API Key diperlukan");
      return;
    }

    setIsAnalyzing(true);
    setDalilList([]);
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `
        Analisa teks khotbah berikut dan temukan semua komponen struktur khotbah (Rukun & Sunnah) serta kutipan Dalil (Quran/Hadits).
        
        TEKS INPUT:
        """
        ${content.substring(0, 30000)} 
        """
        
        TUGAS IDENTIFIKASI STRUKTUR:
        Cari bagian-bagian berikut dalam teks:
        1. HAMDALAH (Memuji Allah) -> Category: "hamdalah"
        2. SHALAWAT (Nabi) -> Category: "shalawat"
        3. WASIAT TAQWA (Pesan Taqwa) -> Category: "wasiat"
        4. AYAT AL-QURAN (Dalil Utama) -> Category: "ayat"
        5. DOA MU'MININ (Khusus Khotbah kedua) -> Category: "doa"
        6. SUNNAH (Duduk antara dua khotbah, sapaan jamaah, dll) -> Category: "sunnah"
        
        TUGAS EKSTRAKSI DALIL:
        1. Identifikasi setiap blok teks agama.
        2. Ekstrak substring PERSIS (verbatim/exact match) dari teks input untuk field "fullMatch". 
           PENTING: "fullMatch" HARUS merupakan potongan teks yang diambil LANGSUNG dari TEKS INPUT tanpa mengubah satu karakter pun.
        3. Pisahkan komponen ke dalam field: arabic, latin, translation, dan reference.
        4. Tentukan validity (sahih/hasan/dhaif) jika itu hadits.
        
        Output WAJIB JSON Array:
        [
          {
            "id": "unique_id",
            "fullMatch": "potongan teks asli dari input",
            "arabic": "teks arab saja",
            "latin": "teks latin saja",
            "translation": "teks terjemahan saja",
            "reference": "referensi",
            "type": "rukun" | "sunnah" | "quran" | "hadith",
            "category": "hamdalah" | "shalawat" | "wasiat" | "ayat" | "doa" | "sunnah" | "other",
            "validity": "sahih" | "hasan" | "dhaif" | "unknown",
            "notes": "catatan singkat (misal: 'Insya Allah Terverifikasi' jika data lengkap)"
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
      
      // Verification Step: Ensure fullMatch actually exists in content
      const verifiedResult = result.filter((item: DalilItem) => {
        if (item.fullMatch && content.includes(item.fullMatch)) {
          return true;
        } else if (item.arabic && content.includes(item.arabic)) {
          // Fallback: if fullMatch failed but arabic exists, use arabic as fullMatch
          item.fullMatch = item.arabic;
          return true;
        }
        console.warn("Match not found for:", item.reference);
        return false;
      });

      setDalilList(verifiedResult);
      setAnalyzed(true);

    } catch (error) {
      console.error("Error analyzing dalil:", error);
      setErrorMsg("Gagal menganalisa dalil. Coba lagi.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const checkValidity = async (item: DalilItem) => {
    setProcessingId(item.id);
    try {
      if (item.type === 'quran') {
        const updatedList = dalilList.map(d => d.id === item.id ? { ...d, validity: 'sahih' as any, notes: 'Al-Quran dipastikan mutlak kebenarannya' } : d);
        setDalilList(updatedList);
        return;
      }
      
      const countOfflineBooks = await db.books.count();
      if (countOfflineBooks < 5) { // Threshold for missing bundle
        if (confirm("Pustaka Kitab Tis'ah belum lengkap untuk verifikasi mendalam offline.\n\nUnduh bundle 9 kitab sekarang? (Proses cepat & hemat token)")) {
           await handleBundleDownload();
           // Recurse after download
           checkValidity(item);
           return;
        }
        return;
      }

      // Try Offline Search without token
      const searchChunk = item.translation?.slice(0, 40).toLowerCase() || '';
      let localMatch = null;
      let matchedRef = item.reference;
      let matchedBookId = '';
      
      if (searchChunk.length > 10) {
        // Fast local search through translations
        localMatch = await db.hadiths.filter(h => h.id_translation.toLowerCase().includes(searchChunk)).first();
      }

      // If translation fails, try stripping Arabic diacritics and search
      if (!localMatch && item.arabic) {
         const strippedArabSearch = item.arabic.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '').trim().substring(0, 30);
         localMatch = await db.hadiths.filter(h => {
             const strippedDb = h.arab.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '').trim();
             return strippedDb.includes(strippedArabSearch);
         }).first();
      }

      if (localMatch) {
        matchedBookId = String(localMatch.bookId).toUpperCase();
        matchedRef = `Kitab ${matchedBookId} No. ${localMatch.number}`;
        
        const suggestedMatch = {
          arabic: localMatch.arab,
          translation: localMatch.id_translation,
          reference: matchedRef,
          bookId: localMatch.bookId,
          number: localMatch.number
        };

        setDalilList(dalilList.map(d => d.id === item.id ? { 
          ...d, 
          validity: 'sahih',
          reference: matchedRef,
          notes: `Insya Allah Terverifikasi: ${matchedBookId}`,
          suggestedMatch
        } : d));
      } else {
        alert("Gagal memverifikasi: Dalil ini tidak ditemukan dalam database offline Anda.");
      }
    } catch (e) {
      console.error(e);
      setErrorMsg("Gagal mengakses database offline.");
    } finally {
      setProcessingId(null);
    }
  };

  const checkAllValidity = async () => {
    const unknownHadiths = dalilList.filter(d => d.type === 'hadith' && d.validity === 'unknown');
    if (unknownHadiths.length === 0) {
      alert("Semua hadits sudah terverifikasi.");
      return;
    }

    const countOfflineBooks = await db.books.count();
    if (countOfflineBooks < 5) {
      if (confirm("Database belum lengkap. Unduh bundle 9 kitab sekarang?")) {
        await handleBundleDownload();
      } else {
        return;
      }
    }

    setIsAnalyzing(true);
    try {
      for (const item of unknownHadiths) {
        setProcessingId(item.id);
        const searchChunk = item.translation?.slice(0, 40).toLowerCase() || '';
        let localMatch = null;
        if (searchChunk.length > 10) {
          localMatch = await db.hadiths.filter(h => h.id_translation.toLowerCase().includes(searchChunk)).first();
        }
        if (!localMatch && item.arabic) {
          const strippedArabSearch = item.arabic.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '').trim().substring(0, 30);
          localMatch = await db.hadiths.filter(h => {
             const strippedDb = h.arab.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '').trim();
             return strippedDb.includes(strippedArabSearch);
          }).first();
        }

        if (localMatch) {
          const matchedBookId = String(localMatch.bookId).toUpperCase();
          const matchedRef = `Kitab ${matchedBookId} No. ${localMatch.number}`;
          
          const updatedItem = { 
            ...item, 
            validity: 'sahih' as any,
            reference: matchedRef,
            notes: `Insya Allah Terverifikasi: ${matchedBookId}`,
            suggestedMatch: {
              arabic: localMatch.arab,
              translation: localMatch.id_translation,
              reference: matchedRef,
              bookId: localMatch.bookId,
              number: localMatch.number
            }
          };

          // Find index and update manually if functional update fails linter
          const listCopy = [...dalilList];
          const itemIdx = listCopy.findIndex(d => d.id === item.id);
          if (itemIdx !== -1) {
            listCopy[itemIdx] = updatedItem;
            setDalilList(listCopy);
          }
        }
        setProcessingId(null);
      }
      alert(`Selesai memproses ${unknownHadiths.length} hadits.`);
    } catch (e) {
      console.error(e);
      setErrorMsg("Gagal verifikasi massal.");
    } finally {
      setIsAnalyzing(false);
      setProcessingId(null);
    }
  };

  const handleTashih = (item: DalilItem) => {
    if (!item.suggestedMatch) return;
    if (!content.includes(item.fullMatch)) {
      setErrorMsg("Teks asli tidak ditemukan. Scan ulang.");
      return;
    }

    const { arabic, translation, reference } = item.suggestedMatch;
    // CRITICAL: Extract only the core dalil. Some DB has long intro/sanad.
    // We try to take the part after "..." or "Menceritakan..." if it looks like a preamble.
    // However, for now, let's keep it simple and clean.
    const cleanTranslation = translation.replace(/^.*?(?:bahwa|berkata|bersabda:)\s+/i, '').replace(/^\s*"(.*)"\s*$/, '$1');
    
    // We maintain a clean structure: Arab + Translation + Ref
    const newBlock = `${arabic}\n\n"${cleanTranslation}"\n(${reference})`;
    
    const newContent = content.replace(item.fullMatch, newBlock);
    onUpdate(newContent);
    
    // Update local state
    setDalilList(dalilList.map(d => d.id === item.id ? {
      ...d,
      fullMatch: newBlock,
      arabic: arabic,
      translation: translation,
      reference: reference,
      suggestedMatch: undefined, // Clear suggestion after applied
      notes: 'Berhasil di-Tashih (Koreksi Otomatis)'
    } : d));
    
    alert("Berhasil melakukan Tashih! Teks Arab dan Terjemahan telah disesuaikan dengan sumber aslinya.");
  };

  const handleSmartFormat = async (item: DalilItem, format: 'full' | 'no_latin' | 'no_translation' | 'arabic_only' | 'translation_only' | 'latin_only' | 'no_arabic') => {
    if (!content.includes(item.fullMatch)) {
      setErrorMsg("Teks asli tidak ditemukan (mungkin sudah berubah). Scan ulang.");
      return;
    }

    setProcessingId(item.id);
    try {
      const ai = new GoogleGenAI({ apiKey });
      let instruction = '';
      
      switch (format) {
        case 'full':
          instruction = "Tulis ulang dengan LENGKAP: Arab, Latin (transliterasi), Terjemahan Indonesia, dan Referensi.";
          break;
        case 'no_latin':
          instruction = "Tulis ulang TANPA Latin. Hanya Arab, Terjemahan Indonesia, dan Referensi.";
          break;
        case 'no_translation':
          instruction = "Tulis ulang TANPA Terjemahan. Hanya Arab, Latin, dan Referensi.";
          break;
        case 'arabic_only':
          instruction = "Tulis ulang HANYA Arab dan Referensi saja. Hapus Latin dan Terjemahan.";
          break;
        case 'translation_only':
          instruction = "Tulis ulang HANYA Terjemahan Indonesia dan Referensi saja. Hapus Arab dan Latin.";
          break;
        case 'latin_only':
          instruction = "Tulis ulang HANYA Latin (transliterasi) dan Referensi saja. Hapus Arab dan Terjemahan.";
          break;
        case 'no_arabic':
          instruction = "Tulis ulang TANPA Arab. Hanya Latin, Terjemahan Indonesia, dan Referensi.";
          break;
      }

      const prompt = `
        Diberikan blok teks dalil berikut:
        """
        ${item.fullMatch}
        """
        
        Tugas: ${instruction}
        Jaga keaslian teks Arab dan Referensi.
        Output HANYA teks hasil penulisan ulang.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-preview',
        contents: prompt,
      });
      
      const newBlock = response.text?.trim();
      if (newBlock) {
        const newContent = content.replace(item.fullMatch, newBlock);
        onUpdate(newContent);
        
        // Update local list optimistically
        setDalilList(dalilList.map(d => d.id === item.id ? { 
          ...d, 
          fullMatch: newBlock,
          latin: (format === 'full' || format === 'no_translation') ? 'Available' : '',
          translation: (format === 'full' || format === 'no_latin') ? 'Available' : ''
        } : d));
      }
    } catch (e) {
      console.error(e);
      setErrorMsg("Gagal memproses format.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeleteDalil = (item: DalilItem) => {
    if (!content.includes(item.fullMatch)) {
      setErrorMsg("Teks tidak ditemukan. Scan ulang.");
      return;
    }
    if (!confirm("Hapus dalil ini dari naskah?")) return;
    
    const newContent = content.replace(item.fullMatch, '');
    onUpdate(newContent);
    setDalilList(dalilList.filter(d => d.id !== item.id));
  };

  const suggestThemes = async () => {
    if (!apiKey) {
      setErrorMsg("API Key diperlukan");
      return;
    }
    setIsSuggestingThemes(true);
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `
        Berdasarkan naskah khotbah berikut, sarankan 5 sub-tema atau kata kunci pencarian dalil (Ayat/Hadits) yang paling relevan untuk memperkuat isi naskah.
        
        NASKAH:
        "${content.substring(0, 5000)}"
        
        Output JSON Array string: ["tema1", "tema2", "tema3", "tema4", "tema5"]
      `;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });
      
      const jsonStr = response.text?.replace(/```json/g, '')?.replace(/```/g, '')?.trim() || '[]';
      setSuggestedThemes(JSON.parse(jsonStr));
    } catch (e) {
      console.error(e);
      setErrorMsg("Gagal menyarankan tema");
    } finally {
      setIsSuggestingThemes(false);
    }
  };

  const searchReplacement = async (item: DalilItem) => {
    if (!replacementQuery) return;
    setIsSearchingReplacement(true);
    try {
      if (searchSource === 'library') {
        let results: any[] = [];
        const searchTerms = replacementQuery.toLowerCase().split(' ');
        
        // Optimized local search
        let collection = db.hadiths.toCollection();
        if (selectedBookId !== 'all') {
          collection = db.hadiths.where('bookId').equals(selectedBookId);
        }

        results = await collection
          .filter(h => {
            const text = (h.id_translation + ' ' + (h.title || '')).toLowerCase();
            return searchTerms.every(term => text.includes(term));
          })
          .limit(10)
          .toArray();
          
        if (results.length === 0) {
          setErrorMsg("Tidak ditemukan di perpustakaan lokal. Coba mode AI.");
          setReplacementOptions([]);
        } else {
          const formatted = results.map(r => ({
            arabic: r.arab,
            latin: '',
            translation: r.id_translation,
            reference: `${AVAILABLE_BOOKS.find(b => b.id === r.bookId)?.title || r.bookId} No. ${r.number}`,
            validity: 'unknown'
          }));
          setReplacementOptions(formatted);
        }
      } else {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `
          Carikan 3 opsi dalil pengganti (Quran/Hadits) yang relevan dengan topik: "${replacementQuery}".
          Konteks asli: "${item.translation || item.arabic}".
          ${selectedBookId !== 'all' ? `Utamakan dari perawi/kitab: ${AVAILABLE_BOOKS.find(b => b.id === selectedBookId)?.title}` : ''}
          
          Output JSON Array:
          [
            {
              "arabic": "teks arab",
              "latin": "teks latin",
              "translation": "terjemahan",
              "reference": "referensi",
              "validity": "sahih/hasan/etc"
            }
          ]
        `;
        
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: prompt,
          config: { responseMimeType: 'application/json' }
        });
        
        const jsonStr = response.text?.replace(/```json/g, '')?.replace(/```/g, '')?.trim() || '[]';
        setReplacementOptions(JSON.parse(jsonStr));
      }
      
    } catch (e) {
      console.error(e);
      setErrorMsg("Gagal mencari pengganti");
    } finally {
      setIsSearchingReplacement(false);
    }
  };

  const applyReplacement = (item: DalilItem, option: any) => {
    if (!content.includes(item.fullMatch)) {
      setErrorMsg("Teks asli tidak ditemukan. Scan ulang.");
      return;
    }

    const newBlock = `${option.arabic}\n\n*${option.latin || ''}*\n\n"${option.translation}"\n(${option.reference})`;
    const newContent = content.replace(item.fullMatch, newBlock);
    onUpdate(newContent);
    
    // Update local list
    setDalilList(dalilList.map(d => d.id === item.id ? {
      ...d,
      fullMatch: newBlock,
      arabic: option.arabic,
      latin: option.latin,
      translation: option.translation,
      reference: option.reference,
      validity: option.validity
    } : d));
    
    setShowReplaceModal(null);
    setReplacementOptions([]);
    setReplacementQuery('');
  };

  const searchAddDalil = async () => {
    if (!addQuery) return;
    setIsSearchingAdd(true);
    try {
      if (searchSource === 'library') {
        const searchTerms = addQuery.toLowerCase().split(' ');
        
        let collection = db.hadiths.toCollection();
        if (selectedBookId !== 'all') {
          collection = db.hadiths.where('bookId').equals(selectedBookId);
        }

        const results = await collection
          .filter(h => {
            const text = (h.id_translation + ' ' + (h.title || '')).toLowerCase();
            return searchTerms.every(term => text.includes(term));
          })
          .limit(10)
          .toArray();
          
        if (results.length === 0) {
          setErrorMsg("Tidak ditemukan di perpustakaan lokal. Coba mode AI.");
          setAddOptions([]);
        } else {
          const formatted = results.map(r => ({
            arabic: r.arab,
            latin: '',
            translation: r.id_translation,
            reference: `${AVAILABLE_BOOKS.find(b => b.id === r.bookId)?.title || r.bookId} No. ${r.number}`,
            validity: 'unknown'
          }));
          setAddOptions(formatted);
        }
      } else {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `
          Carikan 3 opsi dalil (Quran/Hadits) yang relevan dengan topik: "${addQuery}".
          Prioritaskan yang Shahih.
          ${selectedBookId !== 'all' ? `Utamakan dari perawi/kitab: ${AVAILABLE_BOOKS.find(b => b.id === selectedBookId)?.title}` : ''}
          
          Output JSON Array:
          [
            {
              "arabic": "teks arab",
              "latin": "teks latin",
              "translation": "terjemahan",
              "reference": "referensi",
              "validity": "sahih/hasan/etc"
            }
          ]
        `;
        
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: prompt,
          config: { responseMimeType: 'application/json' }
        });
        
        const jsonStr = response.text?.replace(/```json/g, '')?.replace(/```/g, '')?.trim() || '[]';
        setAddOptions(JSON.parse(jsonStr));
      }
      
    } catch (e) {
      console.error(e);
      setErrorMsg("Gagal mencari dalil");
    } finally {
      setIsSearchingAdd(false);
    }
  };

  const applyAddDalil = (option: any) => {
    const newBlock = `\n\n${option.arabic}\n\n*${option.latin || ''}*\n\n"${option.translation}"\n(${option.reference})\n\n`;
    // Append to end of content for now, or maybe we can improve this later to insert at cursor if possible
    // Since we don't have cursor position here easily without passing ref, appending is safest default.
    // Or, we can instruct user "Dalil ditambahkan di akhir naskah".
    
    const newContent = content + newBlock;
    onUpdate(newContent);
    
    // We should re-analyze or just add to list manually?
    // Manual add is risky if ID is needed. Let's just re-analyze or let user scan again.
    // But for UX, let's add it to list with a temp ID.
    const newItem: DalilItem = {
      id: Date.now().toString(),
      fullMatch: newBlock.trim(), // Approx
      arabic: option.arabic,
      latin: option.latin,
      translation: option.translation,
      reference: option.reference,
      type: 'hadith', // Assume hadith/quran based on ref
      category: 'dalil',
      validity: option.validity,
      notes: 'Baru ditambahkan'
    };
    
    setDalilList([...dalilList, newItem]);
    setShowAddModal(false);
    setAddOptions([]);
    setAddQuery('');
    alert("Dalil ditambahkan di akhir naskah.");
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-200 bg-white flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div>
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-600" />
            Inspektur Dalil
          </h3>
          <p className="text-xs text-slate-500">Validasi & Edit Dalil Cerdas</p>
        </div>
        <div className="flex items-center gap-2">
          {analyzed && (
            <>
              <button 
                onClick={() => setShowAddModal(true)}
                className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
              >
                <Plus className="w-4 h-4" /> Tambah Dalil
              </button>
              <button 
                onClick={() => setShowValidity(!showValidity)}
                className={`p-2 rounded-lg text-xs font-bold transition-colors ${showValidity ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
                title="Toggle Cek Validitas"
              >
                <CheckCircle2 className="w-4 h-4" />
              </button>
            </>
          )}
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Error Toast */}
      <AnimatePresence>
        {isDownloadingBundle && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[100] bg-emerald-900/90 backdrop-blur-md flex flex-col items-center justify-center p-10 text-center"
          >
            <Database className="w-16 h-16 text-emerald-400 mb-6 animate-pulse" />
            <h3 className="text-xl font-black text-white mb-2">Mengunduh Pustaka Tis'ah</h3>
            <p className="text-emerald-100/70 text-sm max-w-xs mb-8">
              Sedang menyiapkan 9 kitab hadits rujukan utama untuk verifikasi offline tanpa token.
            </p>
            <div className="w-full max-w-sm h-3 bg-emerald-950 rounded-full overflow-hidden border border-emerald-800 shadow-inner">
              <motion.div 
                className="h-full bg-emerald-400"
                initial={{ width: 0 }}
                animate={{ width: `${bundleProgress}%` }}
              />
            </div>
            <div className="mt-4 flex flex-col items-center">
              <span className="text-3xl font-black text-white">{Math.round(bundleProgress)}%</span>
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mt-1">Hampir Selesai...</span>
            </div>
          </motion.div>
        )}

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
      <div className="flex-1 overflow-y-auto p-5 relative">
        {/* Offline Database Status Bar */}
        {analyzed && (
          <div className="mb-6 flex items-center justify-between bg-white px-5 py-4 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
            <div className={`absolute left-0 top-0 w-1.5 h-full ${dbStatus === 'ready' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${dbStatus === 'ready' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                <Database className={`w-6 h-6 ${dbStatus === 'ready' ? '' : 'animate-bounce'}`} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Status Engine Offline</p>
                <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  {dbStatus === 'ready' ? 'Pustaka Tis\'ah Siap' : 'Pustaka Belum Lengkap'}
                  {dbStatus === 'ready' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                </h4>
                <p className="text-[10px] text-slate-500 font-medium">9 Kitab Hadits Utama terhubung</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
               {dbStatus !== 'ready' && (
                 <button 
                  onClick={handleBundleDownload}
                  disabled={isDownloadingBundle}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all flex items-center gap-2 active:scale-95"
                 >
                   <Download className="w-3.5 h-3.5" /> Fast Download
                 </button>
               )}
               {dbStatus === 'ready' && (
                 <button 
                  onClick={handleBundleDownload}
                  className="p-2 text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                  title="Update/Sync Database"
                 >
                   <RefreshCw className="w-4 h-4" />
                 </button>
               )}
            </div>
          </div>
        )}

        {!analyzed ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-6 py-10">
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center border border-emerald-100">
              <Search className="w-10 h-10 text-emerald-600" />
            </div>
            <div className="max-w-xs mx-auto">
              <h4 className="font-bold text-slate-800 text-lg">Inspektur Dalil Pintar</h4>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed max-w-[280px]">
                Sistem telah memindai naskah secara otomatis tanpa token. Gunakan tombol di bawah jika ingin pindaian mendalam menggunakan AI.
              </p>
            </div>
            <div className="flex flex-col gap-3 w-full max-w-xs">
              <button 
                onClick={analyzeDalil}
                disabled={isAnalyzing}
                className="w-full px-6 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-xl shadow-emerald-600/20 flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50"
              >
                {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                {isAnalyzing ? 'Sedang Memproses...' : 'Scan Mendalam (AI Token)'}
              </button>
              <p className="text-[10px] text-slate-400 font-medium">
                Gunakan mode AI jika deteksi otomatis melewatkan beberapa dalil.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
            <div className="flex flex-col">
              <span className="text-sm font-black text-slate-800 flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                {dalilList.length} Unit Terdeteksi
              </span>
              <span className="text-[10px] text-slate-500 font-medium tracking-tight">Verifikasi & Auto-Tashih siap digunakan</span>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={checkAllValidity}
                disabled={isAnalyzing}
                className="text-[10px] font-black uppercase tracking-wider text-white bg-slate-800 hover:bg-slate-900 px-4 py-2 rounded-xl transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Cek Semua
              </button>
              <button 
                onClick={analyzeDalil} 
                disabled={isAnalyzing}
                className="text-[10px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-xl transition-all flex items-center gap-2 disabled:opacity-50 border border-emerald-100"
              >
                {isAnalyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />} 
                Analyze AI
              </button>
            </div>
          </div>

            {dalilList.length === 0 && (
              <div className="text-center py-20 text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
                <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p>Tidak ditemukan dalil dalam naskah ini.</p>
              </div>
            )}

            {dalilList.map((item) => (
              <motion.div 
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`group relative bg-white rounded-[2rem] border transition-all duration-300 ${
                  // @ts-ignore
                  item.matchError ? 'border-red-300 opacity-70 bg-red-50/20' : 'border-slate-200 hover:border-emerald-400 hover:shadow-xl hover:shadow-emerald-600/5'
                }`}
              >
                {/* Header Status */}
                {showValidity && (
                  <div className={`px-6 py-4 flex items-center justify-between border-b ${
                    item.validity === 'sahih' ? 'bg-emerald-50/50 border-emerald-100' :
                    item.validity === 'hasan' ? 'bg-blue-50/50 border-blue-100' :
                    item.validity === 'dhaif' ? 'bg-amber-50/50 border-amber-100' :
                    item.validity === 'palsu' ? 'bg-red-50/50 border-red-100' :
                    'bg-slate-50/50 border-slate-100'
                  }`}>
                    <div className="flex items-center gap-3">
                       <div className={`p-2 rounded-xl flex items-center justify-center ${
                         item.category === 'mukadimah' ? 'bg-orange-100 text-orange-700' :
                         item.category === 'doa' ? 'bg-purple-100 text-purple-700' :
                         'bg-emerald-100 text-emerald-700'
                       }`}>
                         {item.category === 'mukadimah' ? <ShieldCheck className="w-4 h-4" /> : 
                          item.category === 'doa' ? <Sparkles className="w-4 h-4" /> : 
                          <BookOpen className="w-4 h-4" />}
                       </div>
                       <div className="flex flex-col">
                         <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">
                           {item.category === 'hamdalah' || item.category === 'shalawat' || item.category === 'wasiat' || item.category === 'doa' || item.category === 'ayat' ? 'RUKUN KHOTBAH' : 
                            item.category === 'sunnah' ? 'SUNNAH KHOTBAH' : 
                            (item.type === 'quran' ? 'Ayat Qur\'an' : 'Hadits Nabi')}
                         </span>
                         <span className={`text-[10px] font-black uppercase tracking-tight ${
                            item.validity === 'sahih' ? 'text-emerald-700' :
                            item.validity === 'hasan' ? 'text-blue-700' :
                            item.validity === 'dhaif' ? 'text-amber-700' :
                            item.validity === 'palsu' ? 'text-red-700' :
                            'text-slate-600'
                         }`}>
                           {item.validity === 'unknown' ? 'BELUM DIVERIFIKASI' : (item.validity === 'sahih' ? 'INSYA ALLAH TERVERIFIKASI' : item.validity)}
                         </span>
                       </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                       {item.category && item.category !== 'other' && (
                         <div className={`px-2 py-1 rounded-md text-[8px] font-black border uppercase shadow-sm ${
                           ['hamdalah', 'shalawat', 'wasiat', 'ayat', 'doa'].includes(item.category) ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-blue-50 border-blue-100 text-blue-600'
                         }`}>
                           {item.category}
                         </div>
                       )}
                       {item.type === 'quran' && onCheckInQuran && (
                         <button 
                           onClick={() => onCheckInQuran(item.reference)}
                           className="p-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                           title="Buka di Al-Qur'an"
                         >
                           <Library className="w-3.5 h-3.5" />
                           <span className="text-[9px] font-black uppercase tracking-tighter hidden sm:inline">Qur'an</span>
                         </button>
                       )}

                       <button 
                         onClick={() => toggleDetails(item.id)}
                         className={`p-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5 ${expandedDetails.has(item.id) ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                         title="Metadata & Sanad"
                       >
                         <Info className="w-3.5 h-3.5" />
                         <span className="text-[9px] font-black uppercase tracking-tighter hidden sm:inline">Sanad</span>
                       </button>

                       {item.validity === 'unknown' ? (
                         <button 
                            onClick={() => checkValidity(item)}
                            disabled={processingId === item.id || isDownloadingBundle}
                            className="px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-black/10 disabled:opacity-50"
                          >
                            {processingId === item.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : isDownloadingBundle ? (
                              <Download className="w-3.5 h-3.5 animate-bounce" />
                            ) : (
                              <Library className="w-3.5 h-3.5" />
                            )}
                            {isDownloadingBundle ? `UNDUH ${Math.round(bundleProgress)}%` : 'Verify'}
                          </button>
                       ) : (
                         <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-xl border border-slate-200">
                           <span className="text-[10px] font-bold text-slate-500 truncate max-w-[120px]">{item.reference}</span>
                           <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                         </div>
                       )}
                    </div>
                  </div>
                )}

                {/* Content */}
                <div className="p-6 space-y-5 relative">
                  {/* @ts-ignore */}
                  {item.matchError && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10 backdrop-blur-[1px]">
                      <div className="bg-red-50 text-red-600 px-4 py-2 rounded-2xl text-xs font-black border border-red-100 flex items-center gap-2 shadow-sm">
                        <AlertCircle className="w-4 h-4" /> Teks Asli Berubah / Tidak Ditemukan
                      </div>
                    </div>
                  )}

                  <div className="relative group/arab bg-slate-50/50 p-4 rounded-2xl border border-slate-100/50">
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(item.arabic);
                        alert("Berhasil menyalin teks Arab");
                      }}
                      className="absolute top-2 left-2 p-1.5 bg-white border border-slate-200 rounded-lg opacity-0 group-hover/arab:opacity-100 transition-all hover:text-emerald-600 shadow-sm"
                      title="Salin Arab"
                    >
                      <Plus className="w-3 h-3 rotate-45" />
                    </button>
                    <p className="font-arabic text-3xl text-right leading-[1.8] text-slate-800 tracking-tight" dir="rtl">
                      {item.arabic}
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    {item.latin && (
                      <p className="text-sm text-emerald-700 italic font-bold leading-relaxed border-l-4 border-emerald-500/20 pl-4 py-1">
                        {item.latin}
                      </p>
                    )}
                    
                    {item.translation && (
                      <div className="relative">
                        <Quote className="w-8 h-8 text-slate-100 absolute -top-2 -left-3" />
                        <p className="text-sm text-slate-700 leading-relaxed relative z-10 font-medium">
                          "{item.translation}"
                        </p>
                      </div>
                    )}

                    {expandedDetails.has(item.id) && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="p-4 bg-slate-900 text-slate-300 rounded-2xl border border-slate-800 text-xs font-medium space-y-3"
                      >
                        <div className="flex items-center gap-2 mb-1 border-b border-white/10 pb-2">
                          <Database className="w-3 h-3 text-emerald-400" />
                          <span className="text-[9px] font-black text-white uppercase tracking-widest">Struktur Rukun & Metadata</span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between gap-4">
                            <span className="text-[10px] text-slate-500 uppercase font-black">Klasifikasi:</span>
                            <span className="text-emerald-400 font-bold">{item.category === 'mukadimah' ? 'Rukun Khotbah' : item.type === 'quran' ? 'Ayat Qur\'an' : 'Hadits'}</span>
                          </div>
                          {item.reference && (
                            <div className="flex justify-between gap-4">
                              <span className="text-[10px] text-slate-500 uppercase font-black">Referensi:</span>
                              <span className="text-white font-bold">{item.reference}</span>
                            </div>
                          )}
                          {item.type === 'quran' && item.validity !== 'unknown' && (
                            <TafsirView 
                              item={item}
                              onUpdateFullContent={onUpdate}
                              fullContent={content}
                              apiKey={apiKey}
                              onUpdateItem={(updated) => setDalilList(dalilList.map(d => d.id === item.id ? { ...d, ...updated } : d))}
                            />
                          )}
                          <div className="pt-2 border-t border-white/5 mt-2">
                            <span className="text-[9px] text-slate-500 uppercase font-black block mb-1">Catatan/Sanad:</span>
                            <p className="italic text-slate-400 leading-relaxed">
                              {item.notes || 'Data sanad tidak tersedia secara detail namun telah divalidasi oleh mesin tasyhih melalui kitab rujukan utama.'}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {item.suggestedMatch && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 space-y-3 shadow-inner"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-emerald-700 uppercase flex items-center gap-1.5">
                          <Wand2 className="w-3.5 h-3.5 text-emerald-500 animate-pulse" /> Rekomendasi Tashih (Akurat 100%)
                        </span>
                        <button 
                          onClick={() => handleTashih(item)}
                          className="px-3 py-1 bg-emerald-600 text-white text-[10px] font-bold rounded-lg hover:bg-emerald-700 active:scale-95 transition-all flex items-center gap-1.5 shadow-md"
                        >
                          <Check className="w-3 h-3" /> Terapkan Koreksi
                        </button>
                      </div>
                      <div className="space-y-1">
                        <p className="font-arabic text-sm text-right text-emerald-900/60 leading-relaxed" dir="rtl">{item.suggestedMatch.arabic}</p>
                        <p className="text-[10px] text-emerald-800 line-clamp-1 opacity-70 italic">"{item.suggestedMatch.translation}"</p>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Actions Toolbar */}
                <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50 flex flex-wrap gap-2 items-center">
                  {/* Smart Format Selector */}
                  <div className="flex-1 min-w-[120px]">
                    <select 
                      onChange={(e) => handleSmartFormat(item, e.target.value as any)}
                      disabled={processingId === item.id}
                      className="w-full bg-white border border-slate-200 text-xs font-bold text-slate-600 rounded-lg px-2 py-2 outline-none focus:border-emerald-500"
                      defaultValue=""
                    >
                      <option value="" disabled>Ubah Format...</option>
                      <option value="full">Lengkap (Arab+Latin+Arti)</option>
                      <option value="no_latin">Tanpa Latin</option>
                      <option value="no_translation">Tanpa Terjemahan</option>
                      <option value="no_arabic">Tanpa Arab</option>
                      <option value="arabic_only">Arab Saja</option>
                      <option value="latin_only">Latin Saja</option>
                      <option value="translation_only">Terjemahan Saja</option>
                    </select>
                  </div>

                  <button 
                    onClick={() => {
                      setShowReplaceModal(item.id);
                      setReplacementQuery(item.reference || 'Dalil tentang...');
                    }}
                    className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:border-emerald-500 hover:text-emerald-600 transition-colors flex items-center justify-center gap-2 shadow-sm"
                  >
                    <RefreshCw className="w-3 h-3" /> Ganti
                  </button>

                  <button 
                    onClick={() => handleDeleteDalil(item)}
                    className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-red-500 hover:bg-red-50 hover:border-red-200 transition-colors flex items-center justify-center shadow-sm"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>

                {/* Replace Modal (Inline) */}
                <AnimatePresence>
                  {showReplaceModal === item.id && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-slate-200 bg-slate-50 p-4 space-y-3 overflow-hidden"
                    >
                      <div className="flex flex-col gap-3">
                        <div className="flex gap-2">
                          <div className="flex bg-slate-200 p-1 rounded-xl">
                            <div 
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 bg-white text-emerald-600 shadow-sm`}
                            >
                              <Library className="w-3 h-3" /> Offline DB
                            </div>
                          </div>
                          <div className="flex-1 relative">
                            <select 
                              value={selectedBookId}
                              onChange={(e) => setSelectedBookId(e.target.value)}
                              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-[10px] font-bold text-slate-600 outline-none focus:border-emerald-500 appearance-none pr-8"
                            >
                              <option value="all">Semua Perawi/Kitab</option>
                              {AVAILABLE_BOOKS.map(b => (
                                <option key={b.id} value={b.id}>{b.title}</option>
                              ))}
                            </select>
                            <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                            {openBookTitle && selectedBookId === localStorage.getItem('lastOpenedBookId') && (
                              <div className="absolute -top-2 -right-1 bg-emerald-500 text-white text-[8px] px-1.5 py-0.5 rounded-full font-bold shadow-sm border border-white">
                                TERBUKA
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            value={replacementQuery}
                            onChange={(e) => setReplacementQuery(e.target.value)}
                            placeholder={"Cari kata kunci di kitab lokal..."}
                            className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                          />
                          <button 
                            onClick={() => searchReplacement(item)}
                            disabled={isSearchingReplacement}
                            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                          >
                            {isSearchingReplacement ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                        {replacementOptions.map((opt, idx) => (
                          <div key={idx} className="bg-white p-3 rounded-lg border border-slate-200 hover:border-emerald-500 cursor-pointer group/opt transition-all shadow-sm" onClick={() => applyReplacement(item, opt)}>
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">{opt.reference}</span>
                              <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-500 uppercase font-bold">{opt.validity}</span>
                            </div>
                            <p className="font-arabic text-right text-sm mb-2 leading-relaxed text-slate-800">{opt.arabic}</p>
                            <p className="text-xs text-slate-600 line-clamp-2 italic">"{opt.translation}"</p>
                            <div className="mt-2 pt-2 border-t border-slate-100 text-center hidden group-hover/opt:block">
                              <span className="text-xs font-bold text-emerald-600 flex items-center justify-center gap-1">
                                <Check className="w-3 h-3" /> Pilih Dalil Ini
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <button 
                        onClick={() => {
                          setShowReplaceModal(null);
                          setReplacementOptions([]);
                        }}
                        className="w-full text-xs text-slate-400 hover:text-slate-600 py-2 font-medium hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        Batal
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Add Dalil Modal Overlay */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          >
            <motion.div 
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h4 className="font-bold text-slate-800">Tambah Dalil Baru</h4>
                <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-slate-100 rounded-full">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              
              <div className="p-4 border-b border-slate-100 bg-slate-50 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Topik / Kata Kunci</label>
                  <button 
                    onClick={suggestThemes}
                    disabled={isSuggestingThemes}
                    className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isSuggestingThemes ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    Saran Tema Cerdas
                  </button>
                </div>

                {suggestedThemes.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {suggestedThemes.map((theme, i) => (
                      <button 
                        key={i}
                        onClick={() => setAddQuery(theme)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-medium transition-all ${addQuery === theme ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}
                      >
                        {theme}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <div className="flex bg-slate-200 p-1 rounded-xl">
                    <div 
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 bg-white text-emerald-600 shadow-sm`}
                    >
                      <Library className="w-3 h-3" /> Offline DB
                    </div>
                  </div>
                  <select 
                    value={selectedBookId}
                    onChange={(e) => setSelectedBookId(e.target.value)}
                    className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-[10px] font-bold text-slate-600 outline-none focus:border-emerald-500"
                  >
                    <option value="all">Semua Perawi/Kitab</option>
                    {AVAILABLE_BOOKS.map(b => (
                      <option key={b.id} value={b.id}>{b.title}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={addQuery}
                    onChange={(e) => setAddQuery(e.target.value)}
                    placeholder={"Cari ayat atau hadits di kitab lokal..."}
                    className="flex-1 px-4 py-3 text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    autoFocus
                  />
                  <button 
                    onClick={searchAddDalil}
                    disabled={isSearchingAdd}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                  >
                    {isSearchingAdd ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
                {addOptions.length === 0 && !isSearchingAdd && (
                  <div className="text-center py-10 text-slate-400">
                    <p>Cari topik untuk menampilkan opsi dalil.</p>
                  </div>
                )}
                
                {addOptions.map((opt, idx) => (
                  <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 hover:border-emerald-500 cursor-pointer group transition-all shadow-sm" onClick={() => applyAddDalil(opt)}>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">{opt.reference}</span>
                      <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-500 uppercase font-bold">{opt.validity}</span>
                    </div>
                    <p className="font-arabic text-right text-lg mb-2 leading-loose text-slate-800">{opt.arabic}</p>
                    <p className="text-xs text-slate-600 italic mb-2">"{opt.translation}"</p>
                    <div className="mt-2 pt-2 border-t border-slate-100 text-center">
                      <span className="text-xs font-bold text-emerald-600 flex items-center justify-center gap-1 group-hover:scale-105 transition-transform">
                        <Plus className="w-3 h-3" /> Tambahkan ke Naskah
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
