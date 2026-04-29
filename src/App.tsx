import { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI } from '@google/genai';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, Sparkles, Users, Type, 
  ChevronRight, Home, Settings, History, PenLine, Mic, Loader2, Languages, Quote, Info, Zap
} from 'lucide-react';
import { HistoryScreen, ResultScreen, SettingsScreen, ReferenceScreen } from './Screens';
import { PracticeScreen } from './components/PracticeScreen';
import { LibraryScreen } from './components/LibraryScreen';
import { ApiKeyModal } from './components/ApiKeyModal';
import { CalibrationModal } from './components/CalibrationModal';
import { ReferenceFile } from './components/ReferenceManager';
import localforage from 'localforage';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { generateWithFallback } from './services/aiService';
import { useGeneration } from './context/GenerationContext';
import { FloatingTaskWidget } from './components/background/FloatingTaskWidget';

import { AVAILABLE_MODELS, DEFAULT_MODEL } from './constants';
import { preloadFont } from './utils/fontCache';
import { processTemplateMarkers, processTemplateMarkersForText, cleanUpInstructionText } from './utils/templateEngine';

// --- Constants ---
// --- Helpers ---
const sendNotification = (title: string, body: string) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/favicon.ico' });
  }
};

const LOADING_MESSAGES = [
  "Menganalisis tema...",
  "Mencari ayat Al-Quran...",
  "Mengumpulkan hadits...",
  "Menyusun mukadimah...",
  "Merangkai isi naskah...",
  "Menyempurnakan..."
];

const DEFAULT_THEMES: Record<string, string[]> = {
  'Khotbah Jumat': [
    "Sabar menghadapi ujian ekonomi",
    "Bahaya lisan dan jejak digital",
    "Mendidik anak dengan keteladanan",
    "Ketenangan hati di era modern",
    "Keutamaan istighfar pembuka rezeki",
    "Menjaga amanah dalam pekerjaan",
    "Pentingnya ukhuwah islamiyah",
    "Adab bertetangga dalam Islam",
    "Mempersiapkan bekal akhirat",
    "Bahaya sifat hasad dan dengki"
  ],
  'Idul Fitri': [
    "Kembali Fitrah: Menjaga Kesucian Hati",
    "Mempererat Silaturahmi di Era Digital",
    "Zakat sebagai Pembersih Jiwa",
    "Istiqomah Pasca Ramadhan",
    "Membangun Kepedulian Sosial",
    "Merayakan Kemenangan dengan Syukur",
    "Menjadi Pribadi yang Lebih Baik",
    "Maaf-memaafkan: Kunci Surga",
    "Menjaga Semangat Ibadah",
    "Pesan Persatuan di Hari Raya"
  ],
  'Idul Adha': [
    "Meneladani Pengorbanan Nabi Ibrahim",
    "Qurban: Bukti Cinta kepada Allah",
    "Haji Mabrur dan Pesan Kemanusiaan",
    "Ikhlas dalam Berbagi Rezeki",
    "Semangat Berkorban untuk Agama",
    "Makna Ketaatan Nabi Ismail",
    "Kepedulian Sosial melalui Qurban",
    "Tauhid di Balik Syariat Qurban",
    "Menyembelih Sifat Kebinatangan",
    "Haji: Simbol Persamaan Derajat"
  ],
  'Ceramah Umum': [
    "Adab Menuntut Ilmu",
    "Sejarah Perjuangan Rasulullah",
    "Pentingnya Menjaga Sholat Berjamaah",
    "Bahaya Ghibah dan Fitnah",
    "Membangun Keluarga Sakinah",
    "Cinta Tanah Air dalam Islam",
    "Menghadapi Fitnah Akhir Zaman",
    "Keadilan Sosial dalam Islam",
    "Peran Pemuda dalam Dakwah",
    "Etika Berkomunikasi di Sosmed"
  ],
  'Kultum': [
    "Keutamaan Sholat Dhuha",
    "Sedekah Tidak Mengurangi Harta",
    "Menjaga Pandangan",
    "Dzikir Pagi dan Petang",
    "Berbakti kepada Orang Tua",
    "Manfaat Puasa Sunnah",
    "Keutamaan Membaca Al-Quran",
    "Adab Makan dan Minum",
    "Pentingnya Niat yang Ikhlas",
    "Senyum adalah Sedekah"
  ],
  'Kajian Majelis Taklim': [
    "Fiqih Wanita: Darah Kebiasaan",
    "Menjadi Istri Sholehah di Akhir Zaman",
    "Mendidik Anak Generasi Alpha",
    "Keutamaan Sedekah Subuh",
    "Manajemen Hati bagi Ibu Rumah Tangga",
    "Kisah Shahabiyah yang Menginspirasi",
    "Pentingnya Menutup Aurat",
    "Adab Bergaul dengan Sesama Wanita",
    "Mempersiapkan Kematian yang Husnul Khotimah",
    "Menjaga Keharmonisan Rumah Tangga"
  ],
  'Ceramah Nikah': [
    "Hakikat Pernikahan dalam Islam",
    "Hak dan Kewajiban Suami Istri",
    "Tips Mengelola Konflik Rumah Tangga",
    "Pentingnya Visi Misi Keluarga",
    "Menjaga Romantisme ala Rasulullah",
    "Membangun Komunikasi yang Efektif",
    "Sabar dan Syukur dalam Pernikahan",
    "Mendidik Anak secara Islami",
    "Mengelola Keuangan Keluarga",
    "Pentingnya Restu Orang Tua"
  ],
  'Tausiyah Kematian': [
    "Mengingat Pemutus Kelezatan (Kematian)",
    "Persiapan Bekal Menuju Akhirat",
    "Sabar dan Ridho atas Takdir",
    "Amalan yang Terus Mengalir (Jariyah)",
    "Hakikat Kehidupan Dunia yang Sementara",
    "Tanda-tanda Husnul Khotimah",
    "Pentingnya Wasiat sebelum Wafat",
    "Menghadapi Sakaratul Maut",
    "Kehidupan di Alam Barzakh",
    "Syafaat bagi Orang yang Beriman"
  ],
  'Kajian Remaja': [
    "Gaul Syar'i: Batasan Pergaulan",
    "Menemukan Jati Diri Muslim",
    "Bahaya FOMO dan Hedonisme",
    "Adab kepada Orang Tua dan Guru",
    "Sukses Dunia Akhirat dengan Al-Quran",
    "Menjaga Kesehatan Mental secara Islami",
    "Bahaya Narkoba dan Pergaulan Bebas",
    "Membangun Karakter Pemimpin",
    "Pentingnya Memilih Teman yang Baik",
    "Cita-cita Mulia Pemuda Muslim"
  ],
  'Kajian Ekonomi Syariah': [
    "Bahaya Riba dalam Transaksi",
    "Etika Berbisnis ala Rasulullah",
    "Pentingnya Zakat Mal",
    "Wakaf Produktif untuk Umat",
    "Manajemen Keuangan Islami",
    "Jual Beli yang Barokah",
    "Hukum Pinjaman Online (Pinjol)",
    "Membangun Kemandirian Ekonomi",
    "Keadilan dalam Pembagian Waris",
    "Pentingnya Halal dan Thayyib"
  ],
  'Kajian Parenting': [
    "Mendidik Anak dengan Kasih Sayang",
    "Peran Ayah dalam Pengasuhan",
    "Mengenalkan Tauhid sejak Dini",
    "Menghadapi Tantangan Gadget",
    "Membangun Kedekatan dengan Anak",
    "Adab Anak kepada Orang Tua",
    "Mendidik Remaja di Era Digital",
    "Pentingnya Nutrisi Halal untuk Anak",
    "Menanamkan Cinta Rasulullah",
    "Disiplin Positif ala Islam"
  ],
  'Tarbiyah / Halqah': [
    "Urgensi Tarbiyah dalam Membangun Karakter",
    "Mengenal Ma'rifatullah (Mengenal Allah)",
    "Membumikan Rukun Iman dalam Kehidupan",
    "Pentingnya Ukhuwah Islamiyah",
    "Syumuliyatul Islam (Kesempurnaan Islam)",
    "Adab Menuntut Ilmu",
    "Ghazwul Fikri (Perang Pemikiran)",
    "Urgensi Amal Jama'i",
    "Tazkiyatun Nafs (Penyucian Jiwa)",
    "Fiqih Dakwah: Prioritas dalam Beramal"
  ],
  'Kata Sambutan / Protokol': [
    "Sambutan Tuan Rumah Acara Pengajian",
    "Sambutan Ketua Panitia Pembangunan Masjid",
    "Sambutan Membuka Acara Tabligh Akbar",
    "Sambutan Penyerahan Santunan Yatim Piatu",
    "Sambutan Wali Murid di Acara Perpisahan",
    "Mewakili Keluarga dalam Acara Lamaran/Khithbah",
    "Sambutan Singkat Ketua DKM",
    "Sambutan Pelepasan Jamaah Haji/Umroh"
  ]
};

const LANGUAGES = [
  { id: 'Indonesian', label: 'Bahasa Indonesia', flag: '🇮🇩' },
  { id: 'English', label: 'English', flag: '🇺🇸' },
  { id: 'Arabic', label: 'Arabic (العربية)', flag: '🇸🇦' },
  { id: 'Javanese', label: 'Bahasa Jawa', flag: '🇮🇩' },
  { id: 'Sundanese', label: 'Bahasa Sunda', flag: '🇮🇩' },
  { id: 'Minangkabau', label: 'Bahasa Minang', flag: '🇮🇩' },
  { id: 'Bugis', label: 'Bahasa Bugis', flag: '🇮🇩' },
  { id: 'Madurese', label: 'Bahasa Madura', flag: '🇮🇩' },
  { id: 'Acehnese', label: 'Bahasa Aceh', flag: '🇮🇩' },
  { id: 'Balinese', label: 'Bahasa Bali', flag: '🇮🇩' },
];

// --- Types ---
type Screen = 'home' | 'history' | 'settings' | 'result' | 'reference' | 'practice' | 'library';
type KhotbahData = {
  id: string;
  date: string;
  tema: string;
  jenis: string;
  content: string;
  analysisResult?: string;
  analyzedContent?: string;
  coverData?: {
    show: boolean;
    title: string;
    subtitle: string;
    author: string;
    location: string;
    date: string;
    toc: string;
    imageUrl?: string;
    layout: 'text' | 'image';
    showImageCover?: boolean;
    showTextCover?: boolean;
  };
  watermark?: {
    text: string;
    showOnAllPages: boolean;
  };
  isBookmarked?: boolean;
  category?: string;
  scheduleDate?: string;
  scheduleLocation?: string;
  reminderStatus?: 'pending' | 'completed';
  status?: 'generating' | 'completed' | 'failed';
};
type PaperSize = 'A4' | 'A5' | 'B5' | 'A6' | 'Legal' | 'F4';

// --- API Key Detection (Deep Hunter) ---
const detectApiKeyType = (key: string): string => {
  if (!key) return 'unknown';
  if (key.startsWith('AIza')) return 'gemini';
  if (key.startsWith('sk-ant')) return 'anthropic';
  if (key.startsWith('sk-') || key.startsWith('sess-')) return 'openai'; // OpenAI & DeepSeek often share sk-
  if (key.startsWith('gsk_')) return 'groq';
  return 'unknown';
};

const BottomNav = ({ activeTab, setActiveTab, setCurrentScreen }: any) => (
  <div className="bg-white border-t border-slate-200 shadow-sm z-50 safe-area-bottom">
    <div className="flex justify-around items-center h-16 relative px-2">
      {[
        { id: 'home', icon: Home, label: 'Beranda' },
        { id: 'library', icon: BookOpen, label: 'Maktabah' },
        { id: 'practice', icon: Mic, label: 'Latihan' },
        { id: 'history', icon: History, label: 'Riwayat' },
        { id: 'settings', icon: Settings, label: 'Pengaturan' }
      ].map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;
        return (
          <button 
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setCurrentScreen(tab.id); }}
            className={`relative flex flex-col items-center justify-center w-full h-full space-y-0.5 z-10 transition-colors duration-300 ${isActive ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <motion.div
              animate={isActive ? { scale: 1.1 } : { scale: 1 }}
              className="flex flex-col items-center"
            >
              <Icon 
                className={`w-6 h-6 transition-all duration-300 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} 
                strokeWidth={isActive ? 2.5 : 2} 
              />
              <span className={`text-[10px] font-bold mt-1 transition-all duration-300 ${isActive ? 'text-emerald-700' : 'text-slate-400'}`}>{tab.label}</span>
            </motion.div>
            {isActive && (
              <motion.div
                layoutId="activeTabIndicator"
                className="absolute -top-1 left-1/2 w-12 h-1 bg-emerald-500 rounded-full -translate-x-1/2 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
              />
            )}
          </button>
        );
      })}
    </div>
  </div>
);

const HomeScreen = ({ 
  tema, setTema, jenis, setJenis, audiens, setAudiens, durasi, setDurasi, 
  readingSpeed, setReadingSpeed, customWpm, setCustomWpm, setShowCalibrationModal,
  hookType, setHookType, emosi, setEmosi, penutupType, setPenutupType,
  struktur, setStruktur, gayaPembicara, setGayaPembicara,
  terjemahanMukadimah, setTerjemahanMukadimah,
  latinMukadimah, setLatinMukadimah,
  gayaDoa, setGayaDoa, bahasaDoa, setBahasaDoa, kepadatanDalil, setKepadatanDalil, sapaanJamaah, setSapaanJamaah, customSapaan, setCustomSapaan,
  targetDoaKhusus, setTargetDoaKhusus,
  useSunnahTemplate, setUseSunnahTemplate,
  showBlueprint, setShowBlueprint,
  includeUlamaQuotes, setIncludeUlamaQuotes,
  handleGenerate, handleManualCreate,
  selectedModel, setSelectedModel, MODELS, customApiKey,
  usePersonalReferences, setUsePersonalReferences, referencesCount,
  useTurboMode, setUseTurboMode,
  language, setLanguage, LANGUAGES, targetWordCount
}: any) => {
  const [suggestedThemes, setSuggestedThemes] = useState<string[]>([]);
  const [isAdvancedSettingsOpen, setIsAdvancedSettingsOpen] = useState(false);
  const [isSearchingTrends, setIsSearchingTrends] = useState(false);
  const [headlineSuggestions, setHeadlineSuggestions] = useState<string[]>([]);
  const [isGeneratingHeadlines, setIsGeneratingHeadlines] = useState(false);

  // Update suggestions when 'jenis' changes
  useEffect(() => {
    setSuggestedThemes(DEFAULT_THEMES[jenis] || DEFAULT_THEMES['Khotbah Jumat']);
    setHeadlineSuggestions([]); // Clear headlines when type changes
  }, [jenis]);

  const generateHeadlines = async () => {
    if (!tema || tema.length < 3) {
      alert("Ketikkan minimal satu kata kunci tema (misal: 'Sabar')");
      return;
    }

    setIsGeneratingHeadlines(true);
    try {
      const prompt = `
        Peran: Copywriter Islami & Ulama Kreatif.
        Tugas: Buatkan 5 variasi JUDUL/HEADLINE yang sangat menarik, spesifik, dan relevan berdasarkan kata kunci berikut.
        
        Kata Kunci: "${tema}"
        Target Audiens: ${audiens}
        Jenis Naskah: ${jenis}
        
        Instruksi Penting:
        1. Gunakan "Angle" (Sudut Pandang) yang menyentuh emosi. Pilih 5 angle berbeda dari daftar berikut untuk setiap judul:
           - Ujian Hidup (Saat hidup terasa berat)
           - Krisis / Kesulitan (Saat rezeki sempit)
           - Introspeksi Diri (Muhasabah/Syukur)
           - Ancaman Akhirat (Penyesalan)
           - Waktu (Sebelum terlambat)
           - Hati / Iman (Menjaga hati di zaman fitnah)
           - Zaman Modern (Iman di era digital)
           - Perjalanan Hidup (Bekal akhirat)
           - Harapan (Allah tidak meninggalkan hamba-Nya)
           - Peringatan (Bahaya dosa yang diremehkan)
           - Rezeki (Rahasia rezeki berkah)
           - Keluarga (Mendidik anak/Rumah tangga)
           - Pemuda (Masa depan akhirat)
           - Dunia vs Akhirat (Jangan tertipu dunia)
           - Taubat (Pintu taubat terbuka)
           - Keteguhan (Istiqamah)
           - Kematian (Mengingat ajal)
           - Nikmat (Mensyukuri karunia)
           - Perubahan (Awal perbaikan diri)
           - Bekal Akhirat (Persiapan pulang)
        2. Judul harus 5-10 kata. Tidak terlalu sensasional, tetap terasa religius dan khusyuk.
        3. Hindari judul klise seperti "Keutamaan Sabar". Buat lebih spesifik (Contoh: "Sabar Saat Hidup Terasa Berat").
        4. Sesuaikan bahasa dengan audiens (Gaul untuk remaja, lembut untuk ibu-ibu, tegas untuk bapak-bapak, relevan untuk pekerja/mahasiswa).
        
        Output WAJIB JSON Array of Strings. Contoh: ["Judul 1", "Judul 2"].
      `;

      const activeKey = customApiKey || process.env.GEMINI_API_KEY;
      const ai = new GoogleGenAI({ apiKey: activeKey });
      
      const response = await ai.models.generateContent({
        model: selectedModel,
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });

      const headlines = JSON.parse(response.text);
      if (Array.isArray(headlines)) {
        setHeadlineSuggestions(headlines);
      }
    } catch (error) {
      console.error("Error generating headlines:", error);
      alert("Gagal membuat variasi judul. Coba lagi.");
    } finally {
      setIsGeneratingHeadlines(false);
    }
  };

  const handleSearchTrends = async () => {
    setIsSearchingTrends(true);
    try {
      const prompt = `
Carikan 5 topik/tema ${jenis} yang sedang hangat, viral, atau sangat relevan dengan kondisi masyarakat Indonesia saat ini (berita terkini, isu sosial, atau momentum kalender Islam).
Output WAJIB hanya JSON Array of Strings. Contoh: ["Judul 1", "Judul 2"].
      `;

      const activeKey = customApiKey || process.env.GEMINI_API_KEY;
      const ai = new GoogleGenAI({ apiKey: activeKey });
      
      const response = await ai.models.generateContent({
        model: selectedModel,
        contents: prompt,
        config: { 
          responseMimeType: 'application/json',
          tools: [{ googleSearch: {} }] 
        }
      });

      const trends = JSON.parse(response.text);
      if (Array.isArray(trends)) {
        setSuggestedThemes(trends);
      }
    } catch (error) {
      console.error("Error fetching trends:", error);
      alert("Gagal mencari topik trending. Menggunakan saran standar.");
      setSuggestedThemes(DEFAULT_THEMES[jenis] || DEFAULT_THEMES['Khotbah Jumat']);
    } finally {
      setIsSearchingTrends(false);
    }
  };

  return (
  <div className="min-h-full bg-slate-50 flex flex-col">
    {/* Header with Gradient */}
    <div className="bg-gradient-to-br from-emerald-600 to-teal-900 rounded-b-[2.5rem] p-6 pt-12 pb-24 text-white shadow-lg relative overflow-hidden shrink-0">
      {/* Decorative circles */}
      <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-white/10 blur-2xl"></div>
      <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-24 h-24 rounded-full bg-teal-400/20 blur-xl"></div>
      
      <div className="flex items-center justify-between relative z-10">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">KhotbahAI</h1>
          <p className="text-emerald-100 font-medium mt-1 text-sm">Asisten Naskah Cerdas</p>
        </div>
        <button 
          onClick={handleManualCreate}
          className="group flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2 rounded-full hover:bg-white/20 transition-all active:scale-95"
        >
          <PenLine className="w-4 h-4 text-emerald-100 group-hover:text-white" />
          <span className="text-xs font-semibold text-emerald-100 group-hover:text-white">Tulis Manual</span>
        </button>
      </div>
    </div>

    <div className="px-4 -mt-16 space-y-6 relative z-20 flex-1">
      <div className="bg-white rounded-3xl p-1 shadow-xl shadow-slate-200/50 border border-slate-100">
        <div className="p-5 space-y-6">
          {/* Main Input */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-3 h-3 text-emerald-500" />
                Tema Khotbah
              </label>
              <button 
                onClick={handleSearchTrends}
                disabled={isSearchingTrends}
                className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-full transition-colors disabled:opacity-50"
              >
                {isSearchingTrends ? (
                  <span className="animate-pulse">Mencari...</span>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3" /> Cari Topik Trending
                  </>
                )}
              </button>
            </div>
            <div className="relative group">
              <textarea 
                value={tema}
                onChange={(e) => setTema(e.target.value)}
                placeholder="Ketik tema khotbah di sini..."
                className="w-full bg-slate-50 group-hover:bg-white border border-slate-200 group-hover:border-emerald-300 rounded-2xl p-4 text-lg font-medium text-slate-800 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none resize-none h-28 transition-all placeholder:text-slate-400 placeholder:font-normal"
              />
              <div className="absolute bottom-3 right-3 flex items-center gap-2">
                {tema.length > 2 && (
                  <button 
                    onClick={generateHeadlines}
                    disabled={isGeneratingHeadlines}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors disabled:opacity-50"
                  >
                    {isGeneratingHeadlines ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    Saran Judul
                  </button>
                )}
                <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Type className="w-3 h-3 text-emerald-600" />
                </div>
              </div>
            </div>
            
            {/* Headline Suggestions */}
            {headlineSuggestions.length > 0 && (
              <div className="bg-indigo-50/50 rounded-xl p-3 border border-indigo-100">
                <p className="text-[10px] font-bold text-indigo-400 uppercase mb-2 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Saran Judul Menarik:
                </p>
                <div className="flex flex-wrap gap-2">
                  <AnimatePresence mode="popLayout">
                    {headlineSuggestions.map((headline, idx) => (
                      <motion.button
                        key={headline}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ 
                          type: "spring", 
                          stiffness: 100, 
                          damping: 15,
                          delay: idx * 0.05 
                        }}
                        whileHover={{ 
                          scale: 1.05, 
                          backgroundColor: "#eef2ff",
                          borderColor: "#a5b4fc",
                          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)"
                        }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setTema(headline);
                          setHeadlineSuggestions([]);
                        }}
                        className="text-left text-xs font-medium text-indigo-700 bg-white border border-indigo-200 px-3 py-2 rounded-lg transition-all shadow-sm"
                      >
                        {headline}
                      </motion.button>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}
            
            {/* Suggestions */}
            <div className="pt-1 overflow-hidden">
              <p className="text-[10px] text-slate-400 mb-2 font-medium">Inspirasi untuk {jenis}:</p>
              <motion.div 
                className="flex gap-2 cursor-grab active:cursor-grabbing"
                drag="x"
                dragConstraints={{ left: -500, right: 0 }}
                animate={{ x: [0, -500] }}
                transition={{ 
                  duration: 40, 
                  repeat: Infinity, 
                  ease: "linear",
                  repeatType: "loop" 
                }}
              >
                {[...suggestedThemes, ...suggestedThemes].map((t, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => setTema(t)}
                    className="whitespace-nowrap px-3 py-1.5 bg-slate-50 text-slate-600 border border-slate-200 rounded-full text-xs font-medium transition-all hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200"
                  >
                    {t}
                  </button>
                ))}
              </motion.div>
            </div>
          </div>

          {/* Options Grid */}
          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Jenis Naskah</label>
              <div className="flex overflow-x-auto gap-2 pb-2 no-scrollbar touch-scroll -mx-2 px-2">
                {['Khotbah Jumat', 'Idul Fitri', 'Idul Adha', 'Ceramah Umum', 'Kultum', 'Kajian Majelis Taklim', 'Ceramah Nikah', 'Tausiyah Kematian', 'Kajian Remaja', 'Kajian Ekonomi Syariah', 'Kajian Parenting', 'Kata Sambutan / Protoko', 'Tarbiyah / Halqah', 'Tausiyah Tarawih'].map((item, idx) => (
                  <motion.button
                    key={item}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setJenis(item)}
                    className={`whitespace-nowrap px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 border ${
                      jenis === item 
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-600/20' 
                        : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-200 hover:bg-emerald-50'
                    }`}
                  >
                    {item}
                  </motion.button>
                ))}
              </div>

              {/* Blueprint Preview */}
              {jenis === 'Khotbah Jumat' && (
                <div className="mt-2 bg-slate-50 border border-slate-200 rounded-xl p-4 transition-all">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-emerald-600" />
                      Struktur Naskah (Blueprint)
                    </h4>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setShowBlueprint(!showBlueprint)}
                        className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-lg"
                      >
                        {showBlueprint ? 'Sembunyikan' : 'Lihat Detail'}
                        <ChevronRight className={`w-3 h-3 transition-transform ${showBlueprint ? 'rotate-90' : ''}`} />
                      </button>
                    </div>
                  </div>
                  
                  {showBlueprint && (
                    <div className="mt-4 space-y-4 text-xs text-slate-600 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="space-y-2">
                        <h5 className="font-bold text-slate-800 bg-slate-200 px-2 py-1 rounded inline-block">Khotbah Pertama</h5>
                        <ul className="list-disc pl-5 space-y-1">
                          <li><span className="font-semibold">Mukadimah:</span> {useSunnahTemplate ? 'Khutbah Hajat (Innal hamdalillah...), Syahadat, Shalawat, Ayat-ayat Taqwa, Amma Ba\'du' : 'Hamdalah, Istighfar, Syahadat, Shalawat, Wasiat Taqwa, Ayat Taqwa, Amma Ba\'du'}</li>
                          <li><span className="font-semibold">Isi Khotbah:</span> {tema ? `Membahas "${tema}"` : 'Membahas tema yang ditentukan'} (disesuaikan dengan opsi retorika & dalil)
                            {includeUlamaQuotes && (
                              <div className="mt-1 ml-2 flex items-start gap-1.5 text-emerald-700 bg-emerald-50/50 p-1.5 rounded-md border border-emerald-100/50">
                                <Quote className="w-3 h-3 mt-0.5 shrink-0 opacity-70" />
                                <span className="text-[10px] leading-tight">Akan disisipkan pendapat ulama salaf/hikmah untuk memperdalam argumen dan dalil secara natural.</span>
                              </div>
                            )}
                          </li>
                          <li><span className="font-semibold">Penutup Khotbah 1:</span> Kesimpulan & kalimat "Aqulu qawli hadza..."</li>
                        </ul>
                      </div>
                      
                      <div className="space-y-2">
                        <h5 className="font-bold text-slate-800 bg-slate-200 px-2 py-1 rounded inline-block">Duduk di Antara Dua Khotbah</h5>
                        <p className="pl-2 italic text-slate-500">Khatib duduk sejenak (membaca istighfar/dzikir dalam hati)</p>
                      </div>

                      <div className="space-y-2">
                        <h5 className="font-bold text-slate-800 bg-slate-200 px-2 py-1 rounded inline-block">Khotbah Kedua</h5>
                        <ul className="list-disc pl-5 space-y-1">
                          <li><span className="font-semibold">Mukadimah:</span> {useSunnahTemplate ? 'Alhamdulillah, Shalawat, Wasiat Taqwa' : 'Hamdalah, Shalawat, Wasiat Taqwa'}</li>
                          <li><span className="font-semibold">Doa (Berlapis):</span> Doa Muslimin (Rukun), Doa Umat, Doa Orang Tua, Doa Pemimpin, Doa Tematik, Doa Sapu Jagat</li>
                          <li><span className="font-semibold">Penutup Resmi:</span> Ayat "Innallaha ya'muru bil 'adli wal ihsan..." & Iqamah</li>
                        </ul>
                      </div>
                      
                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mt-2">
                        <p className="text-emerald-800 font-medium">
                          <Info className="w-3 h-3 inline mr-1 mb-0.5" />
                          {useSunnahTemplate 
                            ? 'Mode Sunnah Hajat aktif. Struktur di atas akan diterapkan secara ketat sesuai sunnah.' 
                            : 'Mode Default aktif. Struktur akan disesuaikan agar lebih mengalir namun tetap memenuhi rukun.'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Bahasa Naskah</label>
                <div className="relative">
                  <button
                    onClick={() => {
                      const select = document.getElementById('lang-select') as HTMLSelectElement;
                      if (select) select.focus();
                    }}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 flex items-center justify-between hover:border-emerald-500 transition-all shadow-sm"
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-lg">{LANGUAGES.find(l => l.id === language)?.flag}</span>
                      {LANGUAGES.find(l => l.id === language)?.label}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400 rotate-90" />
                  </button>
                  <select 
                    id="lang-select"
                    value={language} 
                    onChange={(e) => setLanguage(e.target.value)}
                    className="absolute inset-0 w-full opacity-0 cursor-pointer"
                  >
                    {LANGUAGES.map(lang => (
                      <option key={lang.id} value={lang.id}>{lang.flag} {lang.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Audiens</label>
                <div className="relative">
                  <button
                    onClick={() => {
                      const select = document.getElementById('audience-select') as HTMLSelectElement;
                      if (select) select.focus();
                    }}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 flex items-center justify-between hover:border-emerald-500 transition-all shadow-sm"
                  >
                    <span className="flex items-center gap-2 truncate">
                      <Users className="w-4 h-4 text-emerald-600" />
                      {audiens}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400 rotate-90" />
                  </button>
                  <select 
                    id="audience-select"
                    value={audiens} 
                    onChange={(e) => setAudiens(e.target.value)}
                    className="absolute inset-0 w-full opacity-0 cursor-pointer"
                  >
                    <option value="Umum">Umum</option>
                    <option value="Anak Muda">Anak Muda (Gen Z/Millenial)</option>
                    <option value="Pelajar & Mahasiswa">Pelajar & Mahasiswa (Edukasi/Ujian)</option>
                    <option value="Pekerja & Karyawan">Pekerja & Karyawan (Karir/Rezeki)</option>
                    <option value="Pengusaha & Pedagang">Pengusaha & Pedagang (Bisnis/Tawakkal)</option>
                    <option value="Keluarga">Keluarga (Suami/Istri/Orang Tua)</option>
                    <option value="Bapak-bapak">Bapak-bapak (Masjid/Kampung)</option>
                    <option value="Ibu-ibu">Ibu-ibu (Majelis Taklim)</option>
                    <option value="Anak-anak">Anak-anak (TPA/Sekolah)</option>
                    <option value="Akademisi">Akademisi & Intelektual</option>
                    <option value="Masyarakat Desa">Masyarakat Desa (Bahasa Sederhana)</option>
                    <option value="Eksekutif">Eksekutif & Perkantoran</option>
                  </select>
                </div>
              </div>
              
              {/* Interactive Duration & Speed Slider */}
              <div className="space-y-3 md:col-span-2">
                {/* Penyesuaian Tempo Bicara Section */}
                <div className="space-y-4 mb-4">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-titles flex items-center gap-2 pl-1">
                    <Mic className="w-3 h-3 text-emerald-500" />
                    Penyesuaian Tempo Bicara
                  </label>
                  
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`rounded-2xl p-0.5 transition-all duration-700 relative overflow-hidden ${
                      customWpm 
                        ? 'bg-gradient-to-br from-blue-400 via-blue-500 to-indigo-600 shadow-[0_10px_25px_-5px_rgba(59,130,246,0.4)]' 
                        : 'bg-slate-200 shadow-sm'
                    }`}
                  >
                    <div className={`bg-white rounded-[calc(1rem-2px)] p-4 relative overflow-hidden`}>
                      {/* Glossy highlight effect for active state */}
                      {customWpm && (
                        <motion.div 
                          initial={{ x: '-100%', opacity: 0 }}
                          animate={{ x: '200%', opacity: 1 }}
                          transition={{ repeat: Infinity, duration: 3.5, ease: "linear", repeatDelay: 1.5 }}
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent skew-x-[-25deg] z-10"
                        />
                      )}

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-20">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <motion.div
                              animate={customWpm ? {
                                scale: [1, 1.4, 1],
                                opacity: [0.3, 0.7, 0.3]
                              } : {}}
                              transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
                              className={`absolute inset-0 rounded-full blur-xl ${customWpm ? 'bg-blue-400' : 'hidden'}`}
                            />
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                              customWpm 
                                ? 'bg-blue-600 shadow-lg shadow-blue-600/30 ring-2 ring-blue-100' 
                                : 'bg-slate-50 border border-slate-100'
                            }`}>
                              <Zap className={`w-7 h-7 transition-colors ${customWpm ? 'text-white' : 'text-slate-300'}`} />
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className={`font-bold text-sm transition-colors ${customWpm ? 'text-blue-900 leading-tight' : 'text-slate-700'}`}>
                                {customWpm ? `${customWpm} KPM (Human Mode)` : 'Tes Kecepatan Bicara'}
                              </h3>
                              {customWpm && (
                                <span className="bg-blue-100 text-blue-700 text-[8px] font-black uppercase px-1.5 py-0.5 rounded tracking-tighter animate-pulse">Verified</span>
                              )}
                            </div>
                            <p className={`text-[10px] mt-1 font-medium leading-relaxed max-w-[200px] transition-colors ${customWpm ? 'text-blue-700/70' : 'text-slate-400'}`}>
                              {customWpm 
                                ? 'Tempo naskah akurat berdasarkan kalibrasi suara Anda.' 
                                : 'Ukur kecepatan baca Anda secara otomatis untuk durasi presisi.'}
                            </p>
                          </div>
                        </div>

                        <button 
                          onClick={() => setShowCalibrationModal(true)}
                          className={`min-w-[110px] py-3 rounded-xl text-[11px] font-black tracking-wide transition-all active:scale-95 ${
                            customWpm 
                              ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200' 
                              : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20'
                          }`}
                        >
                          {customWpm ? 'TES ULANG' : 'DAPATKAN SKOR'}
                        </button>
                      </div>
                    </div>
                  </motion.div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Atau Gunakan Tempo Preset:</label>
                    <div className={`relative group transition-all ${customWpm ? 'opacity-40 grayscale-50' : 'opacity-100'}`}>
                      <select
                        value={readingSpeed}
                        disabled={!!customWpm}
                        onChange={(e) => {
                          setReadingSpeed(e.target.value as any);
                          if (customWpm) {
                            setCustomWpm(null);
                            localStorage.removeItem('customWpm');
                          }
                        }}
                        className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-[11px] font-bold text-slate-600 hover:border-blue-400 transition-all appearance-none shadow-sm group-hover:bg-white ${customWpm ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <option value="Tempo Standar">PRESET: TEMPO STANDAR (190 KPM)</option>
                        <option value="Tempo Ust. Khalid Basalamah">PRESET: UST. KHALID BASALAMAH (205 KPM)</option>
                        <option value="Tempo Ust. Adi Hidayat">PRESET: UST. ADI HIDAYAT (210 KPM)</option>
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-blue-500 transition-colors">
                        <ChevronRight className="w-4 h-4 rotate-90" />
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Durasi</label>
                  <motion.div 
                    key={durasi}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md text-xs font-mono font-bold"
                  >
                    {durasi} Menit
                  </motion.div>
                </div>
                <div className="relative h-12 flex items-center select-none touch-none cursor-pointer group">
                  {/* Track Background */}
                  <div className="absolute w-full h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600"
                      initial={{ width: 0 }}
                      animate={{ width: `${((durasi - 5) / (60 - 5)) * 100}%` }}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  </div>
                  
                  {/* Native Input (Invisible but handles interaction) */}
                  <input 
                    type="range" 
                    min="5" 
                    max="60" 
                    step="1"
                    value={durasi}
                    onChange={(e) => setDurasi(parseInt(e.target.value))}
                    className="absolute w-full h-full opacity-0 cursor-pointer z-20"
                  />
                  
                  {/* Custom Thumb Handle */}
                  <motion.div 
                    className="absolute w-7 h-7 bg-white border-[3px] border-emerald-500 rounded-full shadow-lg z-10 pointer-events-none flex items-center justify-center"
                    animate={{ left: `calc(${((durasi - 5) / (60 - 5)) * 100}% - 14px)` }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  >
                    <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                  </motion.div>
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 font-medium px-1 -mt-2">
                  <span>5m (Kultum)</span>
                  <span>30m (Jumat)</span>
                  <span>60m (Tabligh)</span>
                </div>
                <p className="text-[10px] text-slate-500 text-center mt-2">
                  Estimasi naskah: <strong className="text-emerald-600">{targetWordCount} kata</strong> (termasuk dalil Arab).
                </p>
              </div>
            </div>

            {/* Retorika & Emosi */}
            <div className="space-y-3">
              <button 
                onClick={() => setIsAdvancedSettingsOpen(!isAdvancedSettingsOpen)}
                className="flex items-center justify-between w-full text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-100 p-3 rounded-xl hover:bg-slate-200 transition-colors"
              >
                <span>Opsi Tambahan</span>
                <ChevronRight className={`w-4 h-4 transition-transform ${isAdvancedSettingsOpen ? 'rotate-90' : ''}`} />
              </button>

              {isAdvancedSettingsOpen && (
                <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                  {/* Retorika & Emosi */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        Gaya Pembuka (Hook)
                        <div className="group relative cursor-help">
                          <div className="w-3 h-3 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-[8px] font-bold">?</div>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-800 text-white text-[10px] rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 shadow-xl pointer-events-none">
                            Pilih cara mengambil perhatian jamaah di awal khotbah.
                          </div>
                        </div>
                      </label>
                      <div className="relative">
                        <select 
                          value={hookType} 
                          onChange={(e) => setHookType(e.target.value)}
                          className="w-full bg-slate-50 hover:bg-white border border-slate-200 hover:border-emerald-300 rounded-xl p-3 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all appearance-none"
                        >
                          <option value="AI Auto (Biarkan AI Memilih Terbaik)">✨ AI Auto (Pilihan Terbaik AI)</option>
                          <option value="Spiritual Framing (Atmosfer Hening)">Spiritual Framing (Hening)</option>
                          <option value="Reflektif (Introspektif)">Reflektif (Introspektif)</option>
                          <option value="Naratif (Story Entry)">Naratif (Story Entry)</option>
                          <option value="Pertanyaan Diam (Silence-based)">Pertanyaan Diam</option>
                          <option value="Shock Hook (Kejutan/Kontradiksi)">Shock Hook (Kejutan)</option>
                          <option value="Otoritatif (Langsung Dalil)">Otoritatif (Langsung Dalil)</option>
                        </select>
                        <ChevronRight className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none rotate-90" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        Pendekatan Emosi
                        <div className="group relative cursor-help">
                          <div className="w-3 h-3 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-[8px] font-bold">?</div>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-800 text-white text-[10px] rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 shadow-xl pointer-events-none">
                            Menentukan nada bahasa dan cara menyentuh hati jamaah tanpa membuat defensif.
                          </div>
                        </div>
                      </label>
                      <div className="relative">
                        <select 
                          value={emosi} 
                          onChange={(e) => setEmosi(e.target.value)}
                          className="w-full bg-slate-50 hover:bg-white border border-slate-200 hover:border-emerald-300 rounded-xl p-3 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all appearance-none"
                        >
                          <option value="AI Auto (Biarkan AI Memilih Terbaik)">✨ AI Auto (Pilihan Terbaik AI)</option>
                          <option value="Empati & Penenang (Validasi Emosi)">Empati & Penenang</option>
                          <option value="Teguran Halus (Moral Elevation)">Teguran Halus (Mengangkat)</option>
                          <option value="Urgensi & Waktu (Kefanaan)">Urgensi & Waktu (Kefanaan)</option>
                          <option value="Kontras Nilai (Dunia vs Akhirat)">Kontras Nilai (Dunia vs Akhirat)</option>
                        </select>
                        <ChevronRight className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none rotate-90" />
                      </div>
                    </div>
                  </div>

                  {/* Gaya Penutup */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        Gaya Penutup (Closing)
                        <div className="group relative cursor-help">
                          <div className="w-3 h-3 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-[8px] font-bold">?</div>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-800 text-white text-[10px] rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 shadow-xl pointer-events-none">
                            Cara mengunci memori jamaah di akhir khotbah sebelum doa.
                          </div>
                        </div>
                      </label>
                      <div className="relative">
                        <select 
                          value={penutupType} 
                          onChange={(e) => setPenutupType(e.target.value)}
                          className="w-full bg-slate-50 hover:bg-white border border-slate-200 hover:border-emerald-300 rounded-xl p-3 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all appearance-none"
                        >
                          <option value="AI Auto (Biarkan AI Memilih Terbaik)">✨ AI Auto (Pilihan Terbaik AI)</option>
                          <option value="Echo Ending (Kembali ke Hook Awal)">Echo Ending (Kembali ke Hook Awal)</option>
                          <option value="Pendaratan Halus (Emotional Landing)">Pendaratan Halus (Emotional Landing)</option>
                          <option value="Satu Kalimat Klimaks (One Breath Close)">Satu Kalimat Klimaks (One Breath Close)</option>
                          <option value="Call to Action (Langkah Praktis)">Call to Action (Langkah Praktis)</option>
                          <option value="Future Pacing (Visualisasi Masa Depan)">Future Pacing (Visualisasi Masa Depan)</option>
                          <option value="Circular Ending (Kembali ke Mukadimah)">Circular Ending (Kembali ke Mukadimah)</option>
                          <option value="Paradox Ending (Kontradiksi Memorable)">Paradox Ending (Kontradiksi Memorable)</option>
                        </select>
                        <ChevronRight className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none rotate-90" />
                      </div>
                    </div>
                    {/* Gaya Pembicara & Struktur */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        Gaya Pembicara (Persona)
                        <div className="group relative cursor-help">
                          <div className="w-3 h-3 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-[8px] font-bold">?</div>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-800 text-white text-[10px] rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 shadow-xl pointer-events-none">
                            Karakter dan cara penyampaian pesan kepada jamaah.
                          </div>
                        </div>
                      </label>
                      <div className="relative">
                        <select 
                          value={gayaPembicara} 
                          onChange={(e) => setGayaPembicara(e.target.value)}
                          className="w-full bg-slate-50 hover:bg-white border border-slate-200 hover:border-emerald-300 rounded-xl p-3 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all appearance-none"
                        >
                          <option value="AI Auto (Biarkan AI Memilih Terbaik)">✨ AI Auto (Pilihan Terbaik AI)</option>
                          <option value="Nasihat Ayah ke Anak (Lembut, Mengayomi)">Nasihat Ayah ke Anak (Lembut)</option>
                          <option value="Seruan Pemimpin (Tegas, Berwibawa)">Seruan Pemimpin (Tegas)</option>
                          <option value="Renungan Sahabat (Jujur, Sejajar)">Renungan Sahabat (Jujur, Sejajar)</option>
                          <option value="Intelektual & Akademis (Logis, Kaya Dalil)">Intelektual & Akademis (Logis)</option>
                          <option value="Pencerita (Storyteller, Mengalir)">Pencerita (Storyteller, Mengalir)</option>
                        </select>
                        <ChevronRight className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none rotate-90" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        Struktur Pembahasan
                        <div className="group relative cursor-help">
                          <div className="w-3 h-3 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-[8px] font-bold">?</div>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-800 text-white text-[10px] rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 shadow-xl pointer-events-none">
                            Metode penyampaian materi utama.
                          </div>
                        </div>
                      </label>
                      <div className="relative">
                        <select 
                          value={struktur} 
                          onChange={(e) => setStruktur(e.target.value)}
                          className="w-full bg-slate-50 hover:bg-white border border-slate-200 hover:border-emerald-300 rounded-xl p-3 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all appearance-none"
                        >
                          <option value="AI Auto (Biarkan AI Memilih Terbaik)">✨ AI Auto (Pilihan Terbaik AI)</option>
                          <option value="Problem - Solution (Masalah & Solusi)">Problem - Solution</option>
                          <option value="Thematic (Poin-poin Tematik)">Thematic (Poin-poin)</option>
                          <option value="Chronological (Kronologis)">Chronological (Kronologis)</option>
                          <option value="Comparative (Perbandingan)">Comparative (Perbandingan)</option>
                          <option value="Story-Driven (Berbasis Kisah)">Story-Driven (Berbasis Kisah)</option>
                        </select>
                        <ChevronRight className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none rotate-90" />
                      </div>
                    </div>
                  </div>

                  {/* Pengaturan Tambahan (Doa, Dalil, Sapaan) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        Kepadatan Dalil
                        <div className="group relative cursor-help">
                          <div className="w-3 h-3 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-[8px] font-bold">?</div>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-800 text-white text-[10px] rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 shadow-xl pointer-events-none">
                            Seberapa banyak ayat Al-Quran dan Hadits yang ingin disertakan.
                          </div>
                        </div>
                      </label>
                      <div className="relative">
                        <select 
                          value={kepadatanDalil} 
                          onChange={(e) => setKepadatanDalil(e.target.value)}
                          className="w-full bg-slate-50 hover:bg-white border border-slate-200 hover:border-emerald-300 rounded-xl p-3 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all appearance-none"
                        >
                          <option value="Seimbang (Dalil & Narasi)">Seimbang (Dalil & Narasi)</option>
                          <option value="Kaya Dalil (Banyak Ayat & Hadits)">Kaya Dalil (Banyak Ayat & Hadits)</option>
                          <option value="Minim Dalil (Fokus Cerita/Narasi)">Minim Dalil (Fokus Cerita/Narasi)</option>
                        </select>
                        <ChevronRight className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none rotate-90" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        Kutipan Ulama / Hikmah
                      </label>
                      <button
                        onClick={() => setIncludeUlamaQuotes(!includeUlamaQuotes)}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-sm font-medium ${
                          includeUlamaQuotes 
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-700' 
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-white hover:border-emerald-300'
                        }`}
                      >
                        <span>Sertakan Kutipan Ulama</span>
                        <div className={`w-10 h-6 rounded-full p-1 transition-colors ${includeUlamaQuotes ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                          <div className={`w-4 h-4 rounded-full bg-white transition-transform ${includeUlamaQuotes ? 'translate-x-4' : 'translate-x-0'}`} />
                        </div>
                      </button>
                      <p className="text-[10px] text-slate-400 px-1">Menyisipkan qaul ulama/hikmah secara natural ke dalam argumen.</p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        Gaya Doa Penutup
                        <div className="group relative cursor-help">
                          <div className="w-3 h-3 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-[8px] font-bold">?</div>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-800 text-white text-[10px] rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 shadow-xl pointer-events-none">
                            Pilih jenis doa di khotbah kedua.
                          </div>
                        </div>
                      </label>
                      <div className="relative">
                        <select 
                          value={gayaDoa} 
                          onChange={(e) => {
                            setGayaDoa(e.target.value);
                            if (e.target.value !== 'Doa Khusus (Kustom target doa)') {
                              setTargetDoaKhusus('');
                            }
                          }}
                          className="w-full bg-slate-50 hover:bg-white border border-slate-200 hover:border-emerald-300 rounded-xl p-3 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all appearance-none"
                        >
                          <option value="Standar & Tematik (Sesuai Sunnah)">Standar & Tematik (Sesuai Sunnah)</option>
                          <option value="Doa Umum Saja (Singkat)">Doa Umum Saja (Singkat)</option>
                          <option value="Fokus Doa Tematik (Sesuai Isi)">Fokus Doa Tematik (Sesuai Isi)</option>
                          <option value="Doa Khusus (Kustom target doa)">Doa Khusus (Kustom target doa...)</option>
                        </select>
                        <ChevronRight className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none rotate-90" />
                      </div>
                      {gayaDoa === 'Doa Khusus (Kustom target doa)' && (
                        <motion.div 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-2"
                        >
                          <input
                            type="text"
                            value={targetDoaKhusus}
                            onChange={(e) => setTargetDoaKhusus(e.target.value)}
                            placeholder="Contoh: Doakan warga desa X, kelulusan ujian, Palestina..."
                            className="w-full bg-white border border-emerald-200 rounded-xl p-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:text-slate-400"
                          />
                          <p className="text-[10px] text-slate-500 mt-1 px-1">
                            AI akan menyusun doa khusus ini dalam bahasa Arab & terjemahannya, dengan tetap menjaga kemurnian tauhid dan adab doa.
                          </p>
                        </motion.div>
                      )}
                      
                      <label className="block mt-4 mb-2">
                        <div className="flex items-center gap-2">
                          <Languages className="w-4 h-4 text-emerald-600" />
                          <div>
                            <span className="text-sm font-bold text-slate-700 block">Bahasa Doa Tematik</span>
                            <span className="text-xs text-slate-500 font-normal">Pilih bahasa untuk doa tematik di Khotbah Kedua</span>
                          </div>
                        </div>
                      </label>
                      <div className="relative">
                        <select 
                          value={bahasaDoa} 
                          onChange={(e) => setBahasaDoa(e.target.value)}
                          className="w-full bg-slate-50 hover:bg-white border border-slate-200 hover:border-emerald-300 rounded-xl p-3 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all appearance-none"
                        >
                          <option value="Indo Saja">Bahasa Indonesia Saja (Default)</option>
                          <option value="Arab Saja">Bahasa Arab Saja</option>
                          <option value="Arab & Indo">Bahasa Arab & Terjemahan</option>
                        </select>
                        <ChevronRight className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none rotate-90" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 lg:col-span-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        Sapaan Jamaah & Audiens
                        <div className="group relative cursor-help">
                          <div className="w-3 h-3 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-[8px] font-bold">?</div>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2 bg-slate-800 text-white text-[10px] rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 shadow-xl pointer-events-none text-center">
                            Kata sapaan yang diulang di tengah naskah. AI akan menambahkan tag [SAPAAN] agar mudah diatur ulang.
                          </div>
                        </div>
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="relative">
                          <select 
                            value={sapaanJamaah} 
                            onChange={(e) => {
                              setSapaanJamaah(e.target.value);
                              if (e.target.value !== 'Custom') {
                                setCustomSapaan('');
                              }
                            }}
                            className="w-full bg-slate-50 hover:bg-white border border-slate-200 hover:border-emerald-300 rounded-xl p-3 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all appearance-none"
                          >
                            <option value="Hadirin Jamaah yang Dirahmati Allah">Hadirin Jamaah yang Dirahmati Allah</option>
                            <option value="Ma'asyiral Muslimin Rahimakumullah">Ma'asyiral Muslimin Rahimakumullah</option>
                            <option value="Sidang Jumat yang Dimuliakan Allah">Sidang Jumat yang Dimuliakan Allah</option>
                            <option value="Saudaraku seiman yang dicintai Allah">Saudaraku seiman yang dicintai Allah</option>
                            <option value="Jamaah sekalian yang berbahagia">Jamaah sekalian yang berbahagia</option>
                            <option value="Bapak-bapak dan Ibu-ibu yang saya hormati">Bapak-bapak dan Ibu-ibu yang saya hormati</option>
                            <option value="Anak-anakku sekalian yang bapak/ibu cintai">Anak-anakku sekalian yang dicintai</option>
                            <option value="Kaum Muslimin wal Muslimat">Kaum Muslimin wal Muslimat</option>
                            <option value="Custom">-- Tulis Custom Sapaan Sendiri --</option>
                          </select>
                          <ChevronRight className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none rotate-90" />
                        </div>
                        {sapaanJamaah === 'Custom' && (
                          <input
                            type="text"
                            placeholder="Contoh: Rekan-rekan panitia yang hebat,"
                            value={customSapaan}
                            onChange={(e) => setCustomSapaan(e.target.value)}
                            className="w-full bg-white border border-emerald-300 rounded-xl p-3 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                            autoFocus
                          />
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        Terjemahan Mukadimah & Doa
                      </label>
                      <button
                        onClick={() => setTerjemahanMukadimah(!terjemahanMukadimah)}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-sm font-medium ${
                          terjemahanMukadimah 
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-700' 
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-white hover:border-emerald-300'
                        }`}
                      >
                        <span>Sertakan Terjemahan</span>
                        <div className={`w-10 h-6 rounded-full p-1 transition-colors ${terjemahanMukadimah ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                          <div className={`w-4 h-4 rounded-full bg-white transition-transform ${terjemahanMukadimah ? 'translate-x-4' : 'translate-x-0'}`} />
                        </div>
                      </button>
                      <p className="text-[10px] text-slate-400 px-1">Matikan untuk menghemat durasi (langsung baca Arab/Latin).</p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        Latin (Transliterasi)
                      </label>
                      <button
                        onClick={() => setLatinMukadimah(!latinMukadimah)}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-sm font-medium ${
                          latinMukadimah 
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-700' 
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-white hover:border-emerald-300'
                        }`}
                      >
                        <span>Sertakan Latin</span>
                        <div className={`w-10 h-6 rounded-full p-1 transition-colors ${latinMukadimah ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                          <div className={`w-4 h-4 rounded-full bg-white transition-transform ${latinMukadimah ? 'translate-x-4' : 'translate-x-0'}`} />
                        </div>
                      </button>
                      <p className="text-[10px] text-slate-400 px-1">Matikan jika Anda sudah lancar membaca teks Arab.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>





            {/* Magic Modes (Chain of Thought) */}
            {/* Reference Toggle */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Referensi Pribadi</label>
              <button
                onClick={() => setUsePersonalReferences(!usePersonalReferences)}
                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                  usePersonalReferences 
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm' 
                    : 'bg-white border-slate-200 text-slate-500 hover:border-emerald-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${usePersonalReferences ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                    <BookOpen className={`w-4 h-4 ${usePersonalReferences ? 'text-emerald-600' : 'text-slate-400'}`} />
                  </div>
                  <div className="text-left">
                    <span className="block text-sm font-bold">Gunakan Referensi Upload</span>
                    <span className="text-[10px] opacity-80">
                      {referencesCount > 0 
                        ? `${referencesCount} dokumen tersedia` 
                        : 'Belum ada dokumen diupload'}
                    </span>
                  </div>
                </div>
                <div className={`w-10 h-6 rounded-full p-1 transition-colors ${usePersonalReferences ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${usePersonalReferences ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
              </button>
            </div>

            {/* Model Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Model AI</label>
              <div className="relative">
                <select 
                  value={selectedModel} 
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full bg-slate-50 hover:bg-white border border-slate-200 hover:border-emerald-300 rounded-xl p-3 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all appearance-none"
                >
                  {MODELS.map(model => (
                    <option key={model.id} value={model.id}>{model.name}</option>
                  ))}
                </select>
                <ChevronRight className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none rotate-90" />
              </div>
            </div>
          </div>
        </div>

        {/* Turbo Mode Toggle */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/50 rounded-2xl p-4 mt-6">
          <div className="flex items-start justify-between">
            <div className="flex-1 pr-4">
              <h3 className="font-bold text-amber-900 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-600" />
                Mode Cepat (Turbo)
              </h3>
              <p className="text-xs text-amber-700/80 mt-1 leading-relaxed">
                Tulis ribuan kata sekaligus dalam satu tarikan napas API. Sangat cepat, ideal untuk durasi panjang tanpa delay, memisahkan isi dan doa secara otomatis.
              </p>
            </div>
            <button
              onClick={() => setUseTurboMode(!useTurboMode)}
              className={`w-12 h-7 rounded-full p-1 transition-colors flex-shrink-0 ${useTurboMode ? 'bg-amber-500' : 'bg-slate-300'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${useTurboMode ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>

        {/* Sunnah Template Toggle */}
        {jenis === 'Khotbah Jumat' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mt-6 rounded-2xl p-0.5 transition-all duration-500 ${
              useSunnahTemplate 
                ? 'bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 shadow-[0_0_20px_rgba(16,185,129,0.3)]' 
                : 'bg-slate-200'
            }`}
          >
            <button
              onClick={() => setUseSunnahTemplate(!useSunnahTemplate)}
              className={`w-full flex items-center justify-between p-4 rounded-[calc(1rem-2px)] transition-all overflow-hidden relative group ${
                useSunnahTemplate ? 'bg-white/90 backdrop-blur-sm' : 'bg-white'
              }`}
            >
              {/* Glossy Effect overlay */}
              {useSunnahTemplate && (
                <motion.div 
                  initial={{ x: '-100%' }}
                  animate={{ x: '200%' }}
                  transition={{ repeat: Infinity, duration: 3, ease: "linear", repeatDelay: 1 }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-[-20deg] z-0"
                />
              )}

              <div className="flex items-center gap-4 relative z-10">
                <div className="relative">
                  <motion.div
                    animate={useSunnahTemplate ? {
                      scale: [1, 1.2, 1],
                      opacity: [0.5, 0.8, 0.5]
                    } : {}}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className={`absolute inset-0 rounded-full blur-md ${useSunnahTemplate ? 'bg-emerald-400' : 'hidden'}`}
                  />
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                    useSunnahTemplate 
                      ? 'bg-emerald-600 shadow-inner' 
                      : 'bg-slate-100'
                  }`}>
                    <BookOpen className={`w-6 h-6 transition-colors ${useSunnahTemplate ? 'text-white' : 'text-slate-400'}`} />
                  </div>
                </div>
                <div className="text-left">
                  <h3 className={`font-bold text-sm transition-colors ${useSunnahTemplate ? 'text-emerald-900' : 'text-slate-600'}`}>
                    Template Khutbah Hajat (Sunnah)
                  </h3>
                  <p className={`text-[10px] mt-0.5 font-medium transition-colors ${useSunnahTemplate ? 'text-emerald-700/80' : 'text-slate-400'}`}>
                    {useSunnahTemplate 
                      ? 'Rukun khutbah sesuai tuntunan Nabi ﷺ' 
                      : 'Matikan untuk menggunakan template standar'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 relative z-10">
                <span className={`text-[10px] font-black uppercase tracking-widest ${useSunnahTemplate ? 'text-emerald-600' : 'text-slate-300'}`}>
                  {useSunnahTemplate ? 'Aktif' : 'Off'}
                </span>
                <div className={`w-14 h-8 rounded-full p-1 transition-all duration-300 relative ${
                  useSunnahTemplate 
                    ? 'bg-emerald-500 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]' 
                    : 'bg-slate-200'
                }`}>
                  <motion.div 
                    layout
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className={`w-6 h-6 rounded-full shadow-lg flex items-center justify-center ${
                      useSunnahTemplate ? 'bg-white' : 'bg-white'
                    }`}
                  >
                    {useSunnahTemplate && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                  </motion.div>
                </div>
              </div>
            </button>
          </motion.div>
        )}

        <button
          onClick={handleGenerate}
          className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold py-4 rounded-2xl shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-3 transition-all active:scale-[0.98] group mt-6"
        >
          <Sparkles className="w-6 h-6 group-hover:animate-pulse" />
          <span className="text-lg">Buat Naskah Sekarang</span>
        </button>
        
        {/* Spacer for bottom nav */}
        <div className="h-12"></div>
      </div>
    </div>
  </div>
);
};

export default function App() {
  const { addTask, updateTask } = useGeneration();
  // Navigation State
  const [activeTab, setActiveTab] = useState<'home' | 'history' | 'settings'>('home');
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  
  // Preload PDF fonts to IndexedDB for offline speed and reliability
  useEffect(() => {
    const initFonts = async () => {
      try {
        // We only need to preload Amiri. Standard fonts like Helvetica are built into react-pdf.
        await preloadFont('Amiri', 'https://raw.githubusercontent.com/google/fonts/main/ofl/amiri/Amiri-Regular.ttf');
      } catch (err) {
        console.warn("Initial font preload failed, will try again during PDF generation.", err);
      }
    };
    initFonts();
  }, []);
  const [history, setHistory] = useState<KhotbahData[]>([]);
  
  // Form State
  const [jenis, setJenis] = useState('Khotbah Jumat');
  const [tema, setTema] = useState('');
  const [audiens, setAudiens] = useState('Umum');
  const [durasi, setDurasi] = useState(15);
  const [hookType, setHookType] = useState('AI Auto (Biarkan AI Memilih Terbaik)');
  const [emosi, setEmosi] = useState('AI Auto (Biarkan AI Memilih Terbaik)');
  const [penutupType, setPenutupType] = useState('AI Auto (Biarkan AI Memilih Terbaik)');
  const [struktur, setStruktur] = useState('AI Auto (Biarkan AI Memilih Terbaik)');
  const [gayaPembicara, setGayaPembicara] = useState('AI Auto (Biarkan AI Memilih Terbaik)');
  
  // Advanced Options State
  const [terjemahanMukadimah, setTerjemahanMukadimah] = useState(false);
  const [latinMukadimah, setLatinMukadimah] = useState(false);
  const [gayaDoa, setGayaDoa] = useState('Standar & Tematik (Sesuai Sunnah)');
  const [bahasaDoa, setBahasaDoa] = useState('Indo Saja');
  const [kepadatanDalil, setKepadatanDalil] = useState('Seimbang (Dalil & Narasi)');
  const [sapaanJamaah, setSapaanJamaah] = useState('Hadirin Jamaah yang Dirahmati Allah');
  const [customSapaan, setCustomSapaan] = useState('');
  const [targetDoaKhusus, setTargetDoaKhusus] = useState('');
  const [readingSpeed, setReadingSpeed] = useState<'Tempo Ust. Khalid Basalamah' | 'Tempo Ust. Adi Hidayat' | 'Tempo Standar'>('Tempo Standar');
  const [customWpm, setCustomWpm] = useState<number | null>(() => {
    const saved = localStorage.getItem('customWpm');
    return saved ? parseInt(saved, 10) : null;
  });
  const [showCalibrationModal, setShowCalibrationModal] = useState(false);
  
  const [showBlueprint, setShowBlueprint] = useState(false);
  const [includeUlamaQuotes, setIncludeUlamaQuotes] = useState(true);

  const [useSunnahTemplate, setUseSunnahTemplate] = useState(false);
  const [language, setLanguage] = useState('Indonesian');
  
  // Result State
  const [result, setResult] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [startInEditMode, setStartInEditMode] = useState(false);
  
  // Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState('');
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  
  // Annotation State
  const [isAnnotating, setIsAnnotating] = useState(false);
  
  // Paper State
  const [paperSize, setPaperSize] = useState<PaperSize>('A4');
  const [zoom, setZoom] = useState(100);
  
  // Calculate words per minute based on reading speed
  // Updated WPM based on user data: Khalid (205), Adi (210), Standar (190)
  const defaultWpm = readingSpeed === 'Tempo Ust. Khalid Basalamah' ? 205 : readingSpeed === 'Tempo Ust. Adi Hidayat' ? 210 : 190;
  const wpm = customWpm !== null ? customWpm : defaultWpm;
  const targetWordCount = durasi * wpm;
  
  // Cover Page & Watermark State
  const [coverData, setCoverData] = useState<{
    show: boolean;
    title: string;
    subtitle: string;
    author: string;
    location: string;
    date: string;
    toc: string;
    imageUrl?: string;
    layout: 'text' | 'image';
    showTextOverlay?: boolean;
    showImageCover?: boolean;
    showTextCover?: boolean;
    imageScale?: number;
    imageOffsetX?: number;
    imageOffsetY?: number;
    imageHistory?: string[];
    imageStyle?: string;
  }>({
    show: true,
    title: '',
    subtitle: '',
    author: '',
    location: '',
    date: '',
    toc: '',
    imageUrl: '',
    layout: 'text',
    showTextOverlay: true,
    showImageCover: false,
    showTextCover: true,
    imageScale: 1,
    imageOffsetX: 0,
    imageOffsetY: 0,
    imageHistory: [],
    imageStyle: 'minimalist'
  });
  
  const [watermark, setWatermark] = useState<{
    text: string;
    showOnAllPages: boolean;
  }>({
    text: '',
    showOnAllPages: false
  });
  
  // Advanced Styling State (The Studio)
  const [styleSettings, setStyleSettings] = useState(() => {
    const defaultSettings = {
      latin: {
        fontFamily: 'font-sans',
        fontSize: 18,
        fontWeight: 'font-normal',
        color: '#1e293b', // slate-800
        lineHeight: 'leading-relaxed',
        letterSpacing: 'tracking-normal',
        wordSpacing: 'tracking-normal',
        textShadow: 'none',
        highlightColor: '#fef08a', // yellow-200
        stripColor: '#10b981', // emerald-500
        textMargin: 64, // Default margin in px (corresponds to p-16)
        autoHighlightArabic: 'none',
        autoHighlightTranslation: 'none',
        autoHighlightLatin: 'none',
        autoHighlightTitles: 'none',
        autoHighlightBold: 'none',
        autoHighlightItalic: 'none',
        autoHighlightNormal: 'none',
        paragraphSpacing: 'mb-4',
      },
      arabic: {
        fontFamily: "'Amiri', serif",
        fontSizeScale: 1.6, // Multiplier of latin size
        color: '#047857', // emerald-700
        lineHeight: 'leading-loose',
        fontWeight: 'font-normal',
        wordSpacing: 'tracking-normal',
        textShadow: 'none',
        textAlign: 'text-right',
        paragraphSpacing: 'mb-6',
      },
      page: {
        margin: 'p-12 md:p-16', // Default margin class
        bg: 'bg-[#FDFBF7]', // Default classic
        customBg: '',
        customBorder: '',
        decorationOpacity: 0.1,
        foldLines: false,
        paragraphSpacing: 'mb-4',
        gradient: 'none', // none, radial, linear-top, linear-bottom
        texture: 'none', // none, linen, rice, recycled, stone, graph, jeans, canvas, noise
      },
      header: 'simple',
      dalil: 'none',
      responsivePreview: 'two-page', // two-page, fit
    };
    
    try {
      const stored = localStorage.getItem('USER_PERSONAL_PRESET');
      if (stored) {
        const parsed = JSON.parse(stored);
        const newSettings = { ...defaultSettings };
        if (parsed.latin) newSettings.latin = { ...newSettings.latin, ...parsed.latin };
        if (parsed.arabic) newSettings.arabic = { ...newSettings.arabic, ...parsed.arabic };
        // Don't override page object completely, merge if needed, but personal preset only saves latin and arabic styles
        return newSettings;
      }
    } catch (e) {
      console.error("Error loading personal preset", e);
    }
    return defaultSettings;
  });

  const [customFontUrl, setCustomFontUrl] = useState("");
  const [paperTemplate, setPaperTemplate] = useState(() => {
    try {
      const stored = localStorage.getItem('USER_PERSONAL_PRESET');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.paperTemplate) return parsed.paperTemplate;
      }
    } catch (e) {}
    return 'classic';
  });
  
  const [textAlign, setTextAlign] = useState(() => {
    try {
      const stored = localStorage.getItem('USER_PERSONAL_PRESET');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.textAlign) return parsed.textAlign;
      }
    } catch (e) {}
    return 'text-left';
  });

  // Backward compatibility proxies (mapped to new state)
  const setFontFamily = (val: string) => setStyleSettings(prev => ({ ...prev, latin: { ...prev.latin, fontFamily: val } }));
  const setFontSize = (val: number) => setStyleSettings(prev => ({ ...prev, latin: { ...prev.latin, fontSize: val } }));
  const setArabicFontFamily = (val: string) => setStyleSettings(prev => ({ ...prev, arabic: { ...prev.arabic, fontFamily: val } }));
  const setLineHeight = (val: string) => setStyleSettings(prev => ({ ...prev, latin: { ...prev.latin, lineHeight: val } }));

  // Inject Custom Font
  useEffect(() => {
    if (customFontUrl) {
      const link = document.createElement('link');
      link.href = customFontUrl;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
      return () => {
        document.head.removeChild(link);
      };
    }
  }, [customFontUrl]);

  // Model Selection State
  const [selectedModel, setSelectedModel] = useState(() => localStorage.getItem('selected_model') || DEFAULT_MODEL);
  const [customModelId, setCustomModelId] = useState(() => localStorage.getItem('custom_model_id') || '');

  useEffect(() => {
    localStorage.setItem('selected_model', selectedModel);
  }, [selectedModel]);

  useEffect(() => {
    localStorage.setItem('custom_model_id', customModelId);
  }, [customModelId]);

  // API Key State
  const [customApiKey, setCustomApiKey] = useState('');
  const [customBaseUrl, setCustomBaseUrl] = useState('');
  const [sunnahKey, setSunnahKey] = useState(''); // New: Sunnah API Key
  const [apiKeyType, setApiKeyType] = useState('unknown');
  const [references, setReferences] = useState<ReferenceFile[]>([]);

  // Dynamic Models List
  const [scannedModels, setScannedModels] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('scanned_models');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [manualModels, setManualModels] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('manual_models');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem('scanned_models', JSON.stringify(scannedModels));
  }, [scannedModels]);

  useEffect(() => {
    localStorage.setItem('manual_models', JSON.stringify(manualModels));
  }, [manualModels]);

  const getModels = () => {
    // Default Gemini Models (Always Available)
    const baseModels = [
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'Google' },
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'Google' },
      { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', provider: 'Google' },
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'Google' },
      { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite', provider: 'Google' },
      { id: 'gemini-flash-latest', name: 'Gemini Flash (Stabil)', provider: 'Google' },
      { id: 'gemini-flash-lite-latest', name: 'Gemini Flash Lite', provider: 'Google' },
      { id: 'gemma-4-31b-it', name: 'Gemma 4 31B IT', provider: 'Google' },
      { id: 'gemma-4-26b-a4b-it', name: 'Gemma 4 26B A4B IT', provider: 'Google' },
      { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro', provider: 'Google' },
      { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash', provider: 'Google' },
    ];

    if (apiKeyType === 'openai') {
      return [
        ...baseModels,
        ...manualModels,
        { id: 'gpt-4o', name: 'GPT-4o (OpenAI)', provider: 'OpenAI' },
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini (OpenAI)', provider: 'OpenAI' },
        { id: 'o1-mini', name: 'O1 Mini (Reasoning)', provider: 'OpenAI' },
      ];
    }
    
    if (apiKeyType === 'deepseek') {
      return [
        ...baseModels,
        ...manualModels,
        { id: 'deepseek-chat', name: 'DeepSeek V3', provider: 'DeepSeek' },
        { id: 'deepseek-reasoner', name: 'DeepSeek R1 (Reasoner)', provider: 'DeepSeek' },
      ];
    }

    if (apiKeyType === 'groq') {
       return [
        ...baseModels,
        ...scannedModels,
        ...manualModels,
        { id: 'llama3-70b-8192', name: 'Llama 3 70B (Groq)', provider: 'Groq' },
        { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B (Groq)', provider: 'Groq' },
      ];
    }

    return [...baseModels, ...scannedModels, ...manualModels];
  };

  const MODELS = getModels();

  // Auto-detect API Key Type
  useEffect(() => {
    if (customApiKey.startsWith('sk-ant')) setApiKeyType('anthropic');
    else if (customApiKey.startsWith('sk-') && customApiKey.length > 40) setApiKeyType('openai'); // Simple check
    else if (customApiKey.startsWith('gsk_')) setApiKeyType('groq');
    else if (customApiKey.startsWith('AIza')) setApiKeyType('google');
    else if (customApiKey.length > 10) setApiKeyType('deepseek'); // Fallback for deepseek/others
    else setApiKeyType('unknown');
  }, [customApiKey]);

  // User Profile State
  const [userProfile, setUserProfile] = useState({
    name: '',
    title: '',
    mosque: '',
    city: ''
  });

  // References State
  const [usePersonalReferences, setUsePersonalReferences] = useState(false);
  
  // Turbo Mode State
  const [useTurboMode, setUseTurboMode] = useState(false);

  
  // App Loading State
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [isHistoryLoaded, setIsHistoryLoaded] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

  // Load settings on mount
  useEffect(() => {
    // Load history from localforage (more robust)
    localforage.getItem<KhotbahData[]>('khotbah_history').then((savedHistory) => {
      if (savedHistory) setHistory(savedHistory);
      setIsHistoryLoaded(true);
    }).catch(err => {
      console.error("Failed to load history", err);
      setIsHistoryLoaded(true);
    });

    // Simulate initial loading time for splash screen (e.g., 2 seconds)
    const splashTimer = setTimeout(() => {
      setIsAppLoading(false);
    }, 2000);
    
    const savedKey = localStorage.getItem('custom_api_key');
    if (savedKey) {
      setCustomApiKey(savedKey);
    } else if (!process.env.GEMINI_API_KEY) {
      // If no key in storage and no env key, show modal after splash
      setTimeout(() => setShowApiKeyModal(true), 3000);
    }

    const savedBaseUrl = localStorage.getItem('custom_base_url');
    if (savedBaseUrl) {
      setCustomBaseUrl(savedBaseUrl);
    }

    const savedProfile = localStorage.getItem('user_profile');
    if (savedProfile) {
      try {
        setUserProfile(JSON.parse(savedProfile));
      } catch (e) { console.error(e); }
    }

    // Load references from IndexedDB
    localforage.getItem<ReferenceFile[]>('khotbahai_references').then((storedFiles) => {
      if (storedFiles && Array.isArray(storedFiles)) {
        setReferences(storedFiles);
      }
    }).catch(err => console.error("Failed to load references", err));
  }, []);

  // Save Profile
  useEffect(() => {
    localStorage.setItem('user_profile', JSON.stringify(userProfile));
  }, [userProfile]);

  // Save References
  useEffect(() => {
    localforage.setItem('khotbahai_references', references).catch(err => console.error("Failed to save references", err));
  }, [references]);

  // CAPACITOR NATIVE: Handle Hardware Back Button
  useEffect(() => {
    const setupBackButton = async () => {
      await CapApp.addListener('backButton', () => {
        // If they are on a sub-screen, go back to home
        setCurrentScreen(prev => {
          if (prev === 'result' || prev === 'history' || prev === 'settings' || prev === 'reference' || prev === 'practice' || prev === 'library') {
            return 'home';
          }
          // If on home dashboard, exit app natively
          if (prev === 'home') {
            CapApp.exitApp();
          }
          return prev;
        });
      });
    };
    setupBackButton();

    return () => {
      CapApp.removeAllListeners();
    };
  }, []);

  const clearAllHistory = () => {
    setHistory([]);
    localforage.removeItem('khotbah_history');
  };

  // Save history when updated (Debounced for performance)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (history.length > 0) {
        localforage.setItem('khotbah_history', history).catch(err => console.error("Failed to save history", err));
      }
    }, 1000); // 1 second debounce
    return () => clearTimeout(timer);
  }, [history]);

  // Handle auto-zoom adjustment when window is resized or preview mode is changed
  useEffect(() => {
    const handleResize = () => {
      if (currentScreen === 'result' || currentScreen === 'practice') {
        const baseWidth = paperSize === 'A5' ? 559 : paperSize === 'B5' ? 665 : paperSize === 'A6' ? 397 : 794;
        if (window.innerWidth < 768) {
          // On mobile, padding is typically zero or small in focus mode, but let's account for it securely.
          // Add a slight buffer (like 32px or 16px) instead of exactly window inner width so it doesn't push bounds
          setZoom(Math.floor(((window.innerWidth - 16) / baseWidth) * 100));
        } else if (styleSettings?.responsivePreview === 'fit') {
          // Leave a 64px total gap (32px each side) assuming md:p-8 container
          setZoom(Math.min(150, Math.floor(((window.innerWidth - 64) / baseWidth) * 100)));
        }
      }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize(); // trigger once immediately
    
    return () => window.removeEventListener('resize', handleResize);
  }, [currentScreen, styleSettings?.responsivePreview, paperSize]);

  // Sync coverData and watermark to active history item (Debounced for performance during slider moves)
  // CRITICAL: Only sync if history is already loaded to prevent overwriting with defaults
  useEffect(() => {
    if (activeHistoryId && isHistoryLoaded && !isAppLoading) {
      const timer = setTimeout(() => {
        setHistory(prev => {
          const currentItem = prev.find(item => item.id === activeHistoryId);
          // Only update if data actually changed
          if (currentItem && JSON.stringify(currentItem.coverData) === JSON.stringify(coverData)) {
            return prev;
          }
          return prev.map(item => 
            item.id === activeHistoryId ? { ...item, coverData } : item
          );
        });
      }, 100); // 100ms debounce for faster sync
      return () => clearTimeout(timer);
    }
  }, [coverData, activeHistoryId, isHistoryLoaded, isAppLoading]);

  useEffect(() => {
    if (activeHistoryId && isHistoryLoaded && !isAppLoading) {
      const timer = setTimeout(() => {
        setHistory(prev => {
          const currentItem = prev.find(item => item.id === activeHistoryId);
          if (currentItem && JSON.stringify(currentItem.watermark) === JSON.stringify(watermark)) {
            return prev;
          }
          return prev.map(item => 
            item.id === activeHistoryId ? { ...item, watermark } : item
          );
        });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [watermark, activeHistoryId, isHistoryLoaded, isAppLoading]);

  // Save API Key
  useEffect(() => {
    if (customApiKey) localStorage.setItem('custom_api_key', customApiKey);
  }, [customApiKey]);

  useEffect(() => {
    if (customBaseUrl) {
      localStorage.setItem('custom_base_url', customBaseUrl);
    } else {
      localStorage.removeItem('custom_base_url');
    }
  }, [customBaseUrl]);

  // Cycle loading messages
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isGenerating) {
      interval = setInterval(() => {
        setLoadingMsgIdx((prev) => (prev + 1) % LOADING_MESSAGES.length);
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  // --- Deep Write Logic (Chain of Thought) ---
  const generateLongForm = async (activeKey: string, promptBase: string, draftId: string) => {
    const modelToUse = customModelId.trim() || selectedModel;
    const ai = new GoogleGenAI({ apiKey: activeKey });
    let fullDocument = "";
    
    // 1. THE ARCHITECT: Create the Outline
    setLoadingMsgIdx(0); // "Menganalisis tema..."
    
    // Scale parts dynamically (approx 400 words per part so AI doesn't fatigue)
    const wpmConst = 150;
    const computedTargetWords = durasi * wpmConst;
    const numOfParts = Math.max(4, Math.ceil(computedTargetWords / 400));
    
    const outlinePrompt = `
      ${promptBase}
      
      TUGAS KHUSUS ARSITEK (PENYUSUN KERANGKA & ALUR):
      Jangan tulis naskah dulu. Buatlah KERANGKA (OUTLINE) detail untuk durasi ${durasi} menit (sekitar ${computedTargetWords} kata).
      Pecah SAJIKAN MENJADI TEPAT ${numOfParts} BAGIAN logis. 
      
      MANAJEMEN ALUR PANJANG (MASTERCLASS 5 FASE DENGAN ADAPTASI KUSTOMISASI):
      Karena naskah ini sangat panjang, kerangka Anda WAJIB memiliki gelombang emosi layaknya orasi tingkat tinggi. Gunakan "Fondasi Psikologi 5 Fase" sebagai ruh pembagian ${numOfParts} bagian:
      (Fase 1: Hook Keresahan -> Fase 2: Validasi Realita -> Fase 3: Pembuktian/Argumen Inti -> Fase 4: Storytelling/Pendinginan Kognitif -> Fase 5: Pencerahan/Solusi).
      
      SANGAT PENTING (MENCEGAH BENTROK SISTEM OPSI USER): 
      Anda WAJIB menundukkan kelima fase di atas ke dalam pengaturan User di PROMPT UTAMA:
      - Jika User meminta Struktur "Tanya-Jawab", buatlah kelima fase tersebut berjalan dengan gaya dialog/tanya-jawab!
      - Jika User mengatur Kepadatan Dalil "Tanpa Dalil" atau "Sangat Sedikit", maka Fase 3 JANGAN memaksa membedah dalil, ganti dengan argumen logika/filosofis!
      - Jadikan 5 Fase ini sebagai "Rel Emosi" (gelombang bawah sadar), yang tetap menghormati pengaturan "Struktur Pembahasan", "Gaya Bahasa", dan "Kepadatan Dalil" dari User.
      
      WAJIB MENCAKUP SEMUA RUKUN KHOTBAH:
      1. Isi Khotbah Pertama (Pecah menjadi ${numOfParts - 1} poin/bab pembahasan secara mengalir).
      2. Khotbah Kedua (HANYA Doa Tematik) pada bagian terakhir.
      
      PENTING: JANGAN masukkan Mukadimah dan Penutup ke dalam outline, karena sistem kami sudah menyediakannya. Rencanakan juga di bagian mana ayat/hadits akan disisipkan agar penulis (Writer) nanti tahu kapan harus memasukkan dalil.
      
      Output WAJIB JSON Array of Objects (PENTING: Array harus persis berjumlah ${numOfParts} item):
      [
        { "title": "Bab 1: [Judul Bebas, Membawa Vibe Fase Keresahan]", "duration_mins": 3, "instruction": "Mulai naskah dengan..." },
        { "title": "Bab 2: [Judul Bebas, Membawa Vibe Fase Validasi]", "duration_mins": 5, "instruction": "Arahkan narasi ke..." },
        ... (lanjutkan membagikan fase-fase Masterclass di atas sampai persis mencapai poin ke-${numOfParts - 1}) ...
        { "title": "Doa Tematik Khotbah Kedua", "duration_mins": 2, "instruction": "Tulis HANYA doa tematik dalam bahasa ${bahasaDoa}..." }
      ]
    `;

    let outline = [];
    try {
      const response = await ai.models.generateContent({
        model: modelToUse,
        contents: outlinePrompt,
        config: { responseMimeType: 'application/json' }
      });
      outline = JSON.parse(response.text);
    } catch (e) {
      console.error("Outline generation failed", e);
      // Fallback to standard generation if JSON fails
      return null; 
    }

    // 2. THE WRITER: Loop through sections
    setCurrentScreen('result');
    let previousContext = "";
    
    for (let i = 0; i < outline.length; i++) {
      const section = outline[i];
      // Update UI to show progress
      setResult(prev => prev + `\n\n> *Sedang menulis bagian ${i+1}/${outline.length}: ${section.title}...*\n\n`);
      
      const targetWords = Math.floor(section.duration_mins * wpm);
      
      // Strip the strict blueprint from promptBase to prevent looping in Deep Write
      const safeContextItems = promptBase.split('STRUKTUR OUTPUT YANG WAJIB DIIKUTI');
      const safeContext = safeContextItems[0];

      const sectionPrompt = `
        KONTEKS UTAMA & ATURAN (WAJIB DIIKUTI):
        ${safeContext}

        KONTEKS SEBELUMNYA (Agar nyambung):
        "${previousContext.slice(-1000)}" ...

        TUGAS SEKARANG:
        Tulis naskah UNTUK BAGIAN: "${section.title}"
        Instruksi Khusus: ${section.instruction}
        Target Panjang: Sekitar ${targetWords} kata.
        
        ATURAN FORMATTING (SANGAT PENTING):
        1. Tulis HANYA isi naskah bagian ini. Jangan tulis ulang judul bab.
        2. Gunakan gaya bahasa lisan yang mengalir sesuai dengan Persona dan Emosi yang diminta di Konteks Utama.
        3. Format Markdown rapi (Heading, Bold, Italic).
        4. UNTUK SEMUA TEKS ARAB (Ayat, Hadits, Doa), WAJIB ikuti [ATURAN FORMAT BAHASA ARAB] di Konteks Utama.
        5. Buat paragraf yang ringkas (maksimal 3-4 kalimat per paragraf).
        6. SANGAT PENTING: LANGSUNG tulis isi naskah. JANGAN PERNAH menambahkan kalimat pengantar seperti "Ini adalah khotbah yang dibuat...", "Berikut adalah naskah...", atau kalimat basa-basi lainnya di awal naskah.
        7. DILARANG KERAS MENGULANG DALIL YANG SAMA. Jika Anda sudah menggunakan sebuah ayat/hadits di bagian sebelumnya, gunakan dalil yang BERBEDA di bagian ini.
        8. WAJIB memberikan contoh konkret dari kehidupan sehari-hari masa kini (misal: interaksi di media sosial, grup WhatsApp, masalah pekerjaan, konflik keluarga, dll) agar naskah terasa sangat "relatable" dan membumi. Jangan hanya teoretis atau filosofis.
        
        ATURAN RUKUN KHOTBAH (WAJIB DIIKUTI UNTUK BAGIAN INI):
        - JANGAN PERNAH menulis Mukadimah atau Penutup Khotbah. Sistem kami sudah menyediakannya.
        - Jika bagian ini adalah KHOTBAH KEDUA (Doa Tematik), DILARANG KERAS menulis pesan singkat, kesimpulan materi, atau kalimat pengantar/transisi seperti "Mari jamaah tundukkan kepala". Buat HANYA Doa Tematik sesuai tema (cukup 1-2 paragraf saja, padat, penuh makna seperti sastra, dan WAJIB menyertakan Asmaul Husna yang relevan). Jangan terlalu panjang karena sudah ada doa standar lainnya. Tulis dalam bahasa ${bahasaDoa}. PENTING: Jika menggunakan bahasa Arab, WAJIB dibungkus dalam code block \`\`\`arabic.
      `;

      const stream = await ai.models.generateContentStream({
        model: modelToUse,
        contents: sectionPrompt
      });

      let sectionText = "";
      
      // Inject BATAS_KHOTBAH_KEDUA if this is the last section (Doa)
      if (i === outline.length - 1 && (jenis === 'Khotbah Jumat' || jenis.includes('Idul'))) {
        fullDocument += `\n\n[BATAS_KHOTBAH_KEDUA]\n\n`;
      }
      
      // Add Section Header (only for Khotbah Pertama)
      if (i !== outline.length - 1 || !(jenis === 'Khotbah Jumat' || jenis.includes('Idul'))) {
        const header = `\n\n## ${section.title}\n\n`;
        fullDocument += header;
      }

      let chunkCount = 0;
      for await (const chunk of stream) {
        const text = chunk.text || "";
        sectionText += text;
        fullDocument += text;
        
        // --- OTAK KEDUA (TEMPLATE ENGINE) ---
        let formattedDisplay = fullDocument;
        if (jenis === 'Khotbah Jumat' || jenis.includes('Idul')) {
          const normalizedDoc = fullDocument.replace(/\[\s*BATAS[\s_]*KHOTBAH[\s_]*KEDUA\s*\]/gi, '[BATAS_KHOTBAH_KEDUA]');
          const parts = normalizedDoc.split('[BATAS_KHOTBAH_KEDUA]');
          const isiKhotbah = parts[0] || '';
          // Join all subsequent parts to prevent losing content if multiple markers appeared
          const doaKhotbah = parts.length > 1 ? parts.slice(1).join('\n\n').trim() : '';
          
          const mukadimah1Marker = useSunnahTemplate ? '[TEMPLATE_MUKADIMAH_SUNNAH_1]' : '[TEMPLATE_MUKADIMAH_1]';
          const penutup1Marker = '[TEMPLATE_PENUTUP_1]';
          const mukadimah2Marker = useSunnahTemplate ? '[TEMPLATE_MUKADIMAH_SUNNAH_2]' : '[TEMPLATE_MUKADIMAH_2]';
          const penutup2Marker = useSunnahTemplate ? '[TEMPLATE_PENUTUP_SUNNAH_2]' : '[TEMPLATE_PENUTUP_2]';

          formattedDisplay = `${mukadimah1Marker}\n\n${isiKhotbah.trim()}`;
          
          if (parts.length > 1) {
            formattedDisplay += `\n\n${penutup1Marker}\n\n---\n\n${mukadimah2Marker}\n\n${doaKhotbah}\n\n${penutup2Marker}`;
          } else {
            // If we haven't hit the marker yet, but we are in the last section, show the Doa placeholder
            if (i === outline.length - 1) {
              formattedDisplay += `\n\n${penutup1Marker}\n\n---\n\n${mukadimah2Marker}\n\n*(Sedang menulis bagian ${i+1}/${outline.length}: ${section.title}...)*\n\n${penutup2Marker}`;
            } else {
              formattedDisplay += `\n\n${penutup1Marker}\n\n---\n\n${mukadimah2Marker}\n\n*(Menunggu giliran Khotbah Kedua...)*\n\n${penutup2Marker}`;
            }
          }
        } else {
          const mukadimah1Marker = useSunnahTemplate ? '[TEMPLATE_MUKADIMAH_SUNNAH_1]' : '[TEMPLATE_MUKADIMAH_1]';
          const penutup1Marker = '[TEMPLATE_PENUTUP_1]';
          formattedDisplay = `${mukadimah1Marker}\n\n${fullDocument.trim()}\n\n${penutup1Marker}`;
        }
        
        const processedDoc = cleanUpInstructionText(formattedDisplay);
        setResult(processedDoc);
        
        chunkCount++;
        // Update history every 15 chunks to avoid performance lag but keep it "live"
        if (chunkCount % 15 === 0) {
          setHistory(prev => prev.map(item => 
            item.id === draftId 
              ? { ...item, content: processedDoc } 
              : item
          ));
        }
      }

      let finalFormattedDisplay = fullDocument;
      if (jenis === 'Khotbah Jumat' || jenis.includes('Idul')) {
        const normalizedDoc = fullDocument.replace(/\[\s*BATAS[\s_]*KHOTBAH[\s_]*KEDUA\s*\]/gi, '[BATAS_KHOTBAH_KEDUA]');
        const parts = normalizedDoc.split('[BATAS_KHOTBAH_KEDUA]');
        const isiKhotbah = parts[0] || '';
        const doaKhotbah = parts.length > 1 ? parts.slice(1).join('\n\n').trim() : '';
        
        const mukadimah1Marker = useSunnahTemplate ? '[TEMPLATE_MUKADIMAH_SUNNAH_1]' : '[TEMPLATE_MUKADIMAH_1]';
        const penutup1Marker = '[TEMPLATE_PENUTUP_1]';
        const mukadimah2Marker = useSunnahTemplate ? '[TEMPLATE_MUKADIMAH_SUNNAH_2]' : '[TEMPLATE_MUKADIMAH_2]';
        const penutup2Marker = useSunnahTemplate ? '[TEMPLATE_PENUTUP_SUNNAH_2]' : '[TEMPLATE_PENUTUP_2]';

        finalFormattedDisplay = `${mukadimah1Marker}\n\n${isiKhotbah.trim()}`;
        
        if (parts.length > 1) {
          finalFormattedDisplay += `\n\n${penutup1Marker}\n\n---\n\n${mukadimah2Marker}\n\n${doaKhotbah}\n\n${penutup2Marker}`;
        } else {
          if (i === outline.length - 1) {
            finalFormattedDisplay += `\n\n${penutup1Marker}\n\n---\n\n${mukadimah2Marker}\n\n${penutup2Marker}`;
          } else {
            finalFormattedDisplay += `\n\n${penutup1Marker}\n\n---\n\n${mukadimah2Marker}\n\n*(Menunggu giliran Khotbah Kedua...)*\n\n${penutup2Marker}`;
          }
        }
      } else {
        const mukadimah1Marker = useSunnahTemplate ? '[TEMPLATE_MUKADIMAH_SUNNAH_1]' : '[TEMPLATE_MUKADIMAH_1]';
        const penutup1Marker = '[TEMPLATE_PENUTUP_1]';
        finalFormattedDisplay = `${mukadimah1Marker}\n\n${fullDocument.trim()}\n\n${penutup1Marker}`;
      }

      const finalProcessedDoc = cleanUpInstructionText(finalFormattedDisplay);
      setResult(finalProcessedDoc);
      // Final update for the section
      setHistory(prev => prev.map(item => 
        item.id === draftId 
          ? { ...item, content: finalProcessedDoc, status: i === outline.length - 1 ? 'completed' : 'generating' } 
          : item
      ));

      previousContext = sectionText; // Update context for next loop
    }

    // Recalculate final display for returning
    let finalFormattedDisplay = fullDocument;
    if (jenis === 'Khotbah Jumat' || jenis.includes('Idul')) {
      const normalizedDoc = fullDocument.replace(/\[\s*BATAS[\s_]*KHOTBAH[\s_]*KEDUA\s*\]/gi, '[BATAS_KHOTBAH_KEDUA]');
      const parts = normalizedDoc.split('[BATAS_KHOTBAH_KEDUA]');
      const isiKhotbah = parts[0] || '';
      const doaKhotbah = parts.length > 1 ? parts.slice(1).join('\n\n').trim() : '';
      
      const mukadimah1Marker = useSunnahTemplate ? '[TEMPLATE_MUKADIMAH_SUNNAH_1]' : '[TEMPLATE_MUKADIMAH_1]';
      const penutup1Marker = '[TEMPLATE_PENUTUP_1]';
      const mukadimah2Marker = useSunnahTemplate ? '[TEMPLATE_MUKADIMAH_SUNNAH_2]' : '[TEMPLATE_MUKADIMAH_2]';
      const penutup2Marker = useSunnahTemplate ? '[TEMPLATE_PENUTUP_SUNNAH_2]' : '[TEMPLATE_PENUTUP_2]';

      finalFormattedDisplay = `${mukadimah1Marker}\n\n${isiKhotbah.trim()}`;
      if (parts.length > 1) {
        finalFormattedDisplay += `\n\n${penutup1Marker}\n\n---\n\n${mukadimah2Marker}\n\n${doaKhotbah}\n\n${penutup2Marker}`;
      } else {
        finalFormattedDisplay += `\n\n${penutup1Marker}\n\n---\n\n${mukadimah2Marker}\n\n*(Sedang merangkai Khotbah Kedua...)*\n\n${penutup2Marker}`;
      }
    } else {
      const mukadimah1Marker = useSunnahTemplate ? '[TEMPLATE_MUKADIMAH_SUNNAH_1]' : '[TEMPLATE_MUKADIMAH_1]';
      const penutup1Marker = '[TEMPLATE_PENUTUP_1]';
      finalFormattedDisplay = `${mukadimah1Marker}\n\n${fullDocument.trim()}\n\n${penutup1Marker}`;
    }

    const finalProcessedDocForReturn = cleanUpInstructionText(finalFormattedDisplay);
    return finalProcessedDocForReturn;
  };

  const handleGenerate = async () => {
    if (!tema.trim()) {
      alert('Mohon isi tema khotbah terlebih dahulu.');
      return;
    }

    const activeKey = customApiKey || process.env.GEMINI_API_KEY;
    
    if (!activeKey) {
      setShowApiKeyModal(true);
      return;
    }

    setIsGenerating(true);
    setLoadingMsgIdx(0);
    setStartInEditMode(false);
    setResult(''); 
    setCoverData({
      show: true,
      title: tema,
      subtitle: '',
      author: userProfile?.name || '',
      location: userProfile?.mosque || '',
      date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
      toc: '',
      imageUrl: '',
      layout: 'text'
    });
    setWatermark({
      text: '',
      showOnAllPages: false
    });
    
    const draftId = Date.now().toString();
    const taskId = addTask({
      type: 'generation',
      theme: tema,
      category: jenis,
      historyId: draftId,
      message: 'Menyiapkan...',
    });

    const draftEntry: KhotbahData = {
      id: draftId,
      date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
      tema,
      jenis,
      content: 'Sedang menyusun naskah...',
      status: 'generating',
      coverData: {
        show: true,
        title: tema,
        subtitle: '',
        author: userProfile?.name || '',
        location: userProfile?.mosque || '',
        date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
        toc: '',
        imageUrl: '',
        layout: 'text'
      }
    };
    setHistory(prev => [draftEntry, ...prev]);
    setActiveHistoryId(draftId);
    
    try {
      updateTask(taskId, { status: 'processing', message: 'Menganalisis...' });
      const activeKey = customApiKey || process.env.GEMINI_API_KEY;
      
      // Rhetoric Instructions
      const hookInstruction = hookType.includes('AI Auto') 
        ? "Pilih gaya pembuka (hook) yang paling efektif, cerdas, dan relevan berdasarkan tema dan audiens (bisa berupa naratif, reflektif, kejutan, atau pertanyaan retoris)." 
        : hookType;
      
      const emosiInstruction = emosi.includes('AI Auto')
        ? "Pilih pendekatan emosi yang paling menyentuh dan tepat untuk tema ini (bisa berupa empati, urgensi, kontras nilai, atau teguran halus)."
        : emosi;
        
      const penutupInstruction = penutupType.includes('AI Auto')
        ? "Pilih gaya penutup yang paling membekas, kuat, dan mengunci memori jamaah (bisa berupa echo ending, call to action, kalimat klimaks, atau pendaratan halus)."
        : penutupType;
        
      const strukturInstruction = struktur.includes('AI Auto')
        ? "Pilih struktur pembahasan yang paling logis dan menarik untuk tema ini (bisa berupa problem-solution, thematic 3-poin, naratif, atau komparasi)."
        : struktur;

      const gayaPembicaraInstruction = gayaPembicara.includes('AI Auto')
        ? "Pilih gaya pembicara (persona) yang paling sesuai dengan tema dan audiens (misal: Nasihat Ayah ke Anak, Seruan Pemimpin, atau Renungan Sahabat)."
        : gayaPembicara;

      // Prepare References Context
      let referencesContext = "";
      if (usePersonalReferences && references.length > 0) {
        referencesContext = `
        REFERENSI TAMBAHAN DARI USER (Gunakan jika relevan):
        ${references.map((f, i) => `
          Dokumen ${i+1}: ${f.name}
          Ringkasan: ${f.summary}
          Isi (Cuplikan): ${f.content.substring(0, 2000)}...
        `).join('\n\n')}
        
        Instruksi Referensi:
        - Prioritaskan dalil/cerita dari referensi di atas JIKA RELEVAN dengan tema.
        - Jika tidak relevan, abaikan saja (jangan dipaksa).
        `;
      }

      // Base Prompt Construction
      const doaKhususInstruction = gayaDoa === 'Doa Khusus (Kustom target doa)' && targetDoaKhusus.trim()
        ? `\n   - FOKUS DOA KHUSUS: ${targetDoaKhusus}. (Gabungkan doa ampunan umum dengan doa tematik ini secara harmonis. Susun doa dalam bahasa ${bahasaDoa}, gunakan Asmaul Husna yang tepat, pastikan tauhid murni).`
        : `\n   - DOA TEMATIK: Sisipkan doa yang relevan dengan tema "${tema}" di antara doa ampunan umum dan sapu jagat. Susun doa dalam bahasa ${bahasaDoa}.`;

      const prompt = `
1. PERAN & KEAHLIAN (PERSONA):
Kamu adalah seorang Ulama Kharismatik, Ahli Tafsir, Psikolog, dan Copywriter Islami tingkat tinggi. Kamu memiliki:
- Pemahaman mendalam tentang Al-Quran, Hadits Shahih, dan Sirah Nabawiyah.
- Kemampuan membaca psikologi massa dan menyentuh sisi emosional terdalam manusia (neuro-linguistic programming).
- Keahlian merangkai kata (copywriting) yang memukau, tidak membosankan, dan langsung menusuk ke hati sanubari.
- Pemahaman fiqih khotbah yang sempurna (rukun, syarat sah, dan adab).

2. TUGAS UTAMA:
Tugas Anda adalah membuat naskah ${jenis} yang lengkap, inspiratif, dan sesuai dengan Al-Quran dan As-Sunnah.

BAHASA NASKAH: ${language}
(PENTING: WAJIB menulis seluruh naskah dalam bahasa ${language}. Gunakan tata bahasa yang natural, mengalir, dan berwibawa. Jika bahasa daerah, gunakan tingkat kesopanan yang tinggi/Kromo/Halus.)

DETAIL PERMINTAAN:
- Tema Utama: "${tema}"
- Target Audiens: ${audiens}
- Estimasi Durasi: ${durasi} menit dengan kecepatan bicara ${readingSpeed}.
- Target Panjang Naskah: Sekitar ${targetWordCount} kata (PENTING: Jumlah ini SUDAH TERMASUK teks Arab dan terjemahannya. Jangan terlalu panjang atau terlalu pendek).
- Gaya Pembicara (Persona): ${gayaPembicaraInstruction} (Gunakan gaya ini secara konsisten dari awal hingga akhir)
- Gaya Pembuka (Hook): ${hookInstruction} (Gunakan teknik retorika ini SETELAH Mukadimah untuk menarik perhatian)
- Pendekatan Emosi: ${emosiInstruction} (Sesuaikan nada bahasa, empati, dan ketegasan)
- Gaya Penutup: ${penutupInstruction} (Terapkan gaya ini di KHOTBAH PERTAMA bagian akhir untuk mengunci memori jamaah)
- Struktur Pembahasan: ${strukturInstruction} (Gunakan metode ini dalam menyusun materi utama di Khotbah Pertama)
- Kepadatan Dalil: ${kepadatanDalil} (PENTING: Jadikan ini sebagai patokan utama porsi ayat/hadits vs narasi/cerita. Jangan berlebihan jika diminta rendah, jangan kurang jika diminta tinggi)
- Gaya Doa Penutup: ${gayaDoa} (Sesuaikan jenis doa di khotbah kedua)
- Sapaan Jamaah: "${sapaanJamaah === 'Custom' ? customSapaan : sapaanJamaah}" (PENTING: Setiap kali menyapa jamaah di tengah naskah, Anda WAJIB menggunakan tag persis \`[SAPAAN]\` dan DILARANG menulis kalimat sapaannya. Sistem kami akan menggantikan tag tersebut dengan "${sapaanJamaah === 'Custom' ? customSapaan : sapaanJamaah}").
${includeUlamaQuotes ? '- KUTIPAN ULAMA/HIKMAH: Integrasikan kutipan ulama salaf (Atsar/Qaul) atau hikmah yang relevan secara natural ke dalam argumen, jadikan sebagai penguat pesan (bukan sekadar tempelan), selaras dengan alur emosi dan retorika.' : ''}
${userProfile.name ? `- Nama Penceramah: ${userProfile.name} ${userProfile.title}` : ''}
${userProfile.mosque ? `- Lokasi/Masjid: ${userProfile.mosque}` : ''}
${userProfile.city ? `- Kota: ${userProfile.city}` : ''}


${referencesContext}

PRINSIP RETORIKA & NEUROSAINS YANG WAJIB DITERAPKAN:
1. GAYA BAHASA ANTI-DEFENSIF (Psychological Safety):
   - Gunakan kata ganti "Kita", BUKAN "Kalian" atau "Kamu". Rangkul jamaah, jangan menghakimi.
   - Hindari kata absolut seperti "Selalu", "Pasti", "Semua". Gunakan "Sering kali", "Kadang tanpa sadar".
   - Tulis naskah seolah-olah sedang BERBICARA dari hati ke hati (Internal Mirror Effect), bukan menulis artikel kaku.

2. ALUR EMOSI & MAKNA (One Red Thread & Layered Intent):
   - Mulai dari Realita/Masalah yang dekat dengan audiens (Level Realita).
   - Validasi perasaan mereka (Empati/Penenang).
   - Masukkan Dalil sebagai Solusi/Penerang/Jawaban yang sudah lama ada, BUKAN sebagai palu ancaman (Level Hati/Spiritual).
   - Akhiri dengan Harapan dan Langkah Praktis yang kecil dan realistis (Moral Elevation).

${useSunnahTemplate && jenis === 'Khotbah Jumat' ? `
3. RITME, JEDA & KETEGANGAN (Cognitive Load Management):
   - Buat variasi panjang kalimat (Cadence). Gunakan kalimat pendek yang tegas untuk penekanan.
   - Sisipkan pertanyaan reflektif untuk memancing rasa ingin tahu jamaah.
   - Gunakan tanda baca yang tepat untuk menciptakan jeda alami setelah kalimat berat/dalil.

4. ADAB & STRUKTUR (MODE SUNNAH):
   - Kepatuhan Mutlak: Kamu SEDANG MENGGUNAKAN TEMPLATE BAKU. DILARANG KERAS membuat salam, hamdalah, selawat, atau mukadimah sendiri.
   - Transisi Halus: Karena mukadimah sudah disediakan oleh sistem, kalimat pertamamu di "Isi Khotbah" harus langsung menyapa jamaah (misal: "Hadirin sidang Jumat yang dirahmati Allah,") lalu mengalir masuk ke materi inti tanpa basa-basi.
   - ${userProfile.name ? `Di akhir naskah (setelah doa), cantumkan tanda tangan/footer: "Disampaikan oleh: ${userProfile.name} ${userProfile.title}" dan "${userProfile.mosque ? userProfile.mosque + ', ' : ''}${userProfile.city ? userProfile.city : ''}".` : ''}

5. ATURAN FORMAT BAHASA ARAB (SANGAT PENTING):
   - KHUSUS untuk Dalil Al-Quran / Hadits di DALAM ISI KHOTBAH: Dikecualikan dari aturan settingan. Kamu WAJIB selalu menyertakan Terjemahan Bahasa Indonesia (serta sebutkan nama surah/perawi jika relevan) tepat di bawah blok teks Arab dalil tersebut. Jangan pernah biarkan dalil di bagian isi tanpa arti/terjemahannya.
   - HARAP PATUHI SISA ATURAN INI UNTUK Mukadimah / Doa Penutup (jika ada):
   - ${terjemahanMukadimah && latinMukadimah ? 'Untuk tulisan selain dalil isi, sertakan teks Arab, teks Latin (transliterasi), dan Terjemahan Bahasa Indonesia.' : 
       terjemahanMukadimah ? 'Untuk tulisan selain dalil isi, sertakan teks Arab dan Terjemahan Bahasa Indonesia saja. DILARANG KERAS menulis teks Latin (transliterasi).' : 
       latinMukadimah ? 'Untuk tulisan selain dalil isi, sertakan teks Arab dan teks Latin (transliterasi) saja. DILARANG KERAS menulis Terjemahan Bahasa Indonesia (biarkan bahasa Arab & Latin saja).' : 
       'Untuk tulisan selain dalil isi (seperti doa dll), WAJIB sertakan teks Arab murni saja tanpa teks Latin (transliterasi) maupun Terjemahan Bahasa Indonesia.'}

6. PENUTUP YANG MENGGEMA:
   - Lakukan Echo Ending: Pantulkan kembali pesan utama di bagian akhir KHOTBAH PERTAMA sebelum masuk ke placeholder penutup.

7. PANTANGAN (YANG HARUS DIHINDARI):
   - DILARANG KERAS MENGULANG DALIL YANG SAMA. Setiap poin pembahasan WAJIB menggunakan ayat/hadits yang BERBEDA.
   - DILARANG menggunakan transisi kaku (Pertama-tama, Poin kedua).
   - DILARANG menambah doa pembuka atau penutup di luar placeholder yang diminta.
` : `
3. RITME, JEDA & KETEGANGAN (Cognitive Load Management):
   - Buat variasi panjang kalimat (Cadence). Gunakan kalimat pendek yang tegas untuk penekanan (Precision Strike).
   - Sisipkan pertanyaan reflektif untuk memancing rasa ingin tahu jamaah (Micro-Curiosity Loop).
   - Gunakan tanda baca yang tepat (titik, koma) untuk menciptakan jeda alami setelah kalimat berat/dalil agar jamaah bisa memproses makna (Sacred Pause). JANGAN gunakan tag khusus seperti [PAUSE] atau //.
   - Gunakan Anaphora (pengulangan kata di awal kalimat) untuk membangun ritme emosi.
   - Terapkan Rule of Three (tiga poin utama) agar mudah diingat.

4. ADAB & STRUKTUR (MODE FULL AI / DEFAULT):
   - Kamu bertugas menulis KESELURUHAN naskah dari awal hingga akhir.
   - Jangan langsung masuk ke materi. WAJIB mulai dengan ADAB PEMBUKAAN (Mukadimah) yang lengkap secara fiqih (Hamdalah, Syahadat, Selawat, Wasiat Takwa, dan Ayat Takwa).
   - Baru setelah itu masuk ke Hook/Pembuka Materi.
   - ${userProfile.name ? `Di akhir naskah (setelah doa), cantumkan tanda tangan/footer: "Disampaikan oleh: ${userProfile.name} ${userProfile.title}" dan "${userProfile.mosque ? userProfile.mosque + ', ' : ''}${userProfile.city ? userProfile.city : ''}".` : ''}

5. ATURAN FORMAT BAHASA ARAB (SANGAT PENTING):
   - KHUSUS untuk Dalil Al-Quran / Hadits di DALAM ISI KHOTBAH: Dikecualikan dari aturan settingan. Kamu WAJIB selalu menyertakan Terjemahan Bahasa Indonesia (serta sebutkan nama surah/perawi jika relevan) tepat di bawah blok teks Arab dalil tersebut. Jangan pernah biarkan dalil di bagian isi tanpa arti/terjemahannya.
   - HARAP PATUHI SISA ATURAN INI UNTUK Mukadimah / Doa Penutup (jika ada):
   - ${terjemahanMukadimah && latinMukadimah ? 'Untuk tulisan selain dalil isi, sertakan teks Arab, teks Latin (transliterasi), dan Terjemahan Bahasa Indonesia.' : 
       terjemahanMukadimah ? 'Untuk tulisan selain dalil isi, sertakan teks Arab dan Terjemahan Bahasa Indonesia saja. DILARANG KERAS menulis teks Latin (transliterasi).' : 
       latinMukadimah ? 'Untuk tulisan selain dalil isi, sertakan teks Arab dan teks Latin (transliterasi) saja. DILARANG KERAS menulis Terjemahan Bahasa Indonesia (biarkan bahasa Arab & Latin saja).' : 
       'Untuk tulisan selain dalil isi (seperti doa dll), WAJIB sertakan teks Arab murni saja tanpa teks Latin (transliterasi) maupun Terjemahan Bahasa Indonesia.'}

6. PENUTUP YANG MENGGEMA (The Exit Grace):
   - Lakukan Echo Ending: Pantulkan kembali pesan atau hook dari awal khotbah di bagian akhir KHOTBAH PERTAMA.
   - Gunakan One Breath Close: Kalimat terakhir sebelum doa penutup khotbah pertama harus pendek, bersih, dan penuh makna.

7. PANTANGAN (YANG HARUS DIHINDARI):
   - DILARANG KERAS MENGULANG DALIL YANG SAMA. Setiap poin pembahasan WAJIB menggunakan ayat Al-Quran atau Hadits yang BERBEDA. Jangan pernah mengulang kutipan ayat/hadits yang sudah disebutkan di paragraf sebelumnya.
   - DILARANG KERAS menggunakan transisi kaku atau robotik seperti "Pertama-tama...", "Poin kedua adalah...", "Kesimpulannya pada hari ini...". Gunakan transisi paragraf yang mengalir (narrative flow).
   - DILARANG menggunakan bahasa klise atau template AI yang kaku.
`}

8. RELEVANSI & CONTOH NYATA:
   - WAJIB memberikan contoh konkret dari kehidupan sehari-hari masa kini (misal: interaksi di media sosial, grup WhatsApp, masalah pekerjaan, konflik keluarga, dll) agar naskah terasa sangat "relatable" dan membumi. Jangan hanya teoretis atau filosofis.

STRUKTUR OUTPUT YANG WAJIB DIIKUTI (METODE OTAK KEDUA):
Kamu HANYA bertugas menulis "Daging" (Isi) dari khotbah. JANGAN menulis Mukadimah dan Penutup (karena sistem kami sudah menyediakannya secara otomatis di background).

${jenis === 'Khotbah Jumat' || jenis.includes('Idul') ? `
Kamu WAJIB membagi outputmu menjadi DUA bagian yang dipisahkan oleh marker "[BATAS_KHOTBAH_KEDUA]".

(Tulis sapaan pembuka sesuai gaya: ${hookInstruction}, lalu tuliskan seluruh isi Khotbah Pertama di sini. ${useSunnahTemplate ? `Bahas tema "${tema}" dengan merujuk ketat pada pemahaman Salafus Shalih. Fokus pada pemurnian tauhid, ibadah, atau akhlak.` : `Bahas tema "${tema}" dengan alur emosi yang telah ditentukan.`} Ikuti pengaturan Kepadatan Dalil: ${kepadatanDalil}. WAJIB sertakan minimal satu ayat Al-Quran. Teks Arab pada dalil WAJIB mengikuti [ATURAN FORMAT BAHASA ARAB] di atas. Sampaikan intisari pesan secara mengalir di akhir bagian ini.)

[BATAS_KHOTBAH_KEDUA]

(Tulis HANYA Doa Tematik dalam bahasa ${bahasaDoa} di sini. DILARANG KERAS menulis pesan singkat, kesimpulan, atau kalimat pengantar bahasa Indonesia seperti "Mari kita berdoa". LANGSUNG tulis doanya saja sesuai tema. Gaya Doa: ${gayaDoa}${doaKhususInstruction}. Doa tematik cukup 1-2 paragraf saja, padat, penuh makna seperti sastra, dan WAJIB menyertakan Asmaul Husna yang relevan dengan tema. Jangan terlalu panjang karena sudah ada doa standar lainnya. PENTING: Jika menggunakan bahasa Arab, WAJIB dibungkus dalam code block \`\`\`arabic seperti yang dijelaskan di [ATURAN FORMAT BAHASA ARAB].)
` : jenis === 'Kultum' ? `
SATU BAGIAN UTUH (DURASI SINGKAT 7 MENIT):
1. Mukadimah Singkat: Salam, Hamdalah, Sholawat ringkas.
2. Hook: Pertanyaan retoris atau fakta mengejutkan (${hookInstruction}).
3. Isi (Single Point): Fokus HANYA pada SATU pesan utama. Jangan melebar.
4. Dalil: Cukup 1 ayat atau 1 hadits pendek yang sangat kuat.
5. Call to Action: Ajak pendengar melakukan satu amalan konkret hari ini.
6. Penutup: Kalimat penutup yang membekas.
` : jenis === 'Kajian Majelis Taklim' ? `
SATU BAGIAN UTUH (KAJIAN IBU-IBU):
1. Mukadimah: Salam hangat, Sholawat, Sapaan akrab ("Ibu-ibu yang dirahmati Allah...").
2. Hook Emosional: Mulai dengan cerita atau masalah rumah tangga yang relate (${hookInstruction}).
3. Isi Kajian: Bahas fiqih wanita atau manajemen hati dengan bahasa yang lembut dan menyentuh.
4. Kisah Teladan: WAJIB ada kisah istri nabi atau wanita sholehah.
5. Tips Praktis: Amalan ringan yang bisa langsung dipraktekkan di rumah.
6. Doa Khusus Keluarga: Doakan suami dan anak-anak agar sholeh/sholehah.
` : jenis === 'Ceramah Nikah' ? `
SATU BAGIAN UTUH (NASIHAT PERNIKAHAN):
1. Mukadimah: Khutbah Hajat (Innal hamdalillah...), Ayat Taqwa.
2. Sapaan Mempelai: Sebut nama kedua mempelai dan doakan (Barakallahu laka...).
3. Hakikat Pernikahan: Jelaskan pernikahan sebagai Mitsaqan Ghaliza.
4. Nasihat Suami Istri: Hak dan kewajiban masing-masing dengan bahasa yang bijak.
5. Tips Harmonis: Resep sakinah mawaddah warahmah ala Rasulullah.
6. Penutup & Doa: Doa khusus untuk kelanggengan rumah tangga.
` : jenis === 'Tausiyah Kematian' ? `
SATU BAGIAN UTUH (TAZKIYATUN NAFS):
1. Mukadimah: Innalillahi..., Hamdalah, Sholawat.
2. Refleksi Kematian: Mengingat pemutus kelezatan dunia dengan nada lembut namun menusuk hati.
3. Hiburan bagi Keluarga: Besarkan hati keluarga yang ditinggalkan, ingatkan tentang sabar dan ridho.
4. Hakikat Dunia: Jelaskan betapa singkatnya dunia dibanding akhirat.
5. Ajakan Taubat: Momen terbaik untuk mengajak hadirin bertaubat sebelum terlambat.
6. Doa Jenazah: Doakan almarhum/almarhumah agar diampuni dan diterima amalnya.
` : jenis === 'Kajian Remaja' ? `
SATU BAGIAN UTUH (GAYA SANTAI & GAUL):
1. Sapaan Gaul: "Assalamu'alaikum Guys/Teman-teman...", Mukadimah singkat.
2. Hook Relate: Angkat isu viral atau keresahan anak muda zaman now (${hookInstruction}).
3. Isi Daging: Bahas agama dengan logika yang masuk akal dan relevan dengan tantangan modern.
4. Hindari Ceramah Menggurui: Gunakan gaya "Sharing" atau "Diskusi".
5. Call to Action: Tantangan kebaikan (Challenge) yang seru.
6. Doa Pemuda: Doa agar dijaga dari fitnah zaman.
` : `
SATU BAGIAN UTUH (CERAMAH UMUM):
1. MUKADIMAH (Wajib Ada):
   - Salam pembuka yang hangat.
   - Hamdalah & Sholawat lengkap (Arab & Artinya).
   - Sapaan kepada hadirin/jamaah dengan penuh hormat.
2. HOOK & INTERAKSI:
   - Setelah mukadimah, baru masuk ke Hook (${hookInstruction}).
   - Ajak interaksi ringan (misal: "Apa kabar bapak-bapak semua?").
3. ISI CERAMAH (The Meat):
   - Bahas tema secara mendalam namun santai.
   - Gunakan analogi atau contoh kehidupan sehari-hari yang relevan dengan ${audiens}.
   - Bagi menjadi 3 sub-poin utama agar mudah diingat.
4. DALIL & KISAH:
   - Perbanyak referensi dalil dan kisah inspiratif (Sirah/Sahabat).
   - Ceritakan kisah dengan gaya bercerita (storytelling), bukan sekadar membaca teks.
5. PENUTUP RETORIS:
   - Berikan ringkasan pesan.
   - SATU kalimat pamungkas (One Breath Close).
6. DOA PENUTUP:
   - Doa yang khusyuk dan menyentuh hati, sesuai tema.
`}

ATURAN FORMATTING (SANGAT PENTING):
1. Gunakan Markdown untuk formatting (Heading, Bold, Italic, List).
2. UNTUK SEMUA TEKS ARAB (Ayat, Hadits, Doa, Mukadimah), WAJIB gunakan format Code Block Markdown dengan bahasa "arabic".
   Contoh:
   \`\`\`arabic
   بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيم
   \`\`\`
   JANGAN gunakan tag HTML seperti <div>. Hanya gunakan code block \`\`\`arabic.
   PENTING: JANGAN PERNAH memasukkan teks Latin, transliterasi, atau terjemahan ke DALAM code block arabic ini. Code block arabic HANYA BOLEH berisi huruf Arab (hijaiyah).
3. Tuliskan terjemahan bahasa Indonesia tepat di bawah blok teks Arab.
4. Buat paragraf yang ringkas (maksimal 3-4 kalimat per paragraf) agar mudah dibaca saat berpidato.
5. SANGAT PENTING: LANGSUNG tulis isi naskah. JANGAN PERNAH menambahkan kalimat pengantar seperti "Ini adalah khotbah yang dibuat...", "Berikut adalah naskah...", atau kalimat basa-basi lainnya di awal naskah.
6. DILARANG KERAS menuliskan marker template seperti [TEMPLATE_MUKADIMAH_1] atau [TEMPLATE_PENUTUP_1] di dalam outputmu, karena sistem akan menambahkannya secara otomatis. Jika kamu menuliskannya, maka akan terjadi duplikasi yang merusak naskah.

7. METADATA SISTEM (SANGAT PENTING):
   Di baris paling akhir naskah (setelah doa penutup), tambahkan metadata berikut untuk sistem:
   [VISUAL_PHILOSOPHY]: "Deskripsi 1 kalimat tentang metafora visual, suasana, dan palet warna yang paling cocok untuk cover buku naskah ini berdasarkan isinya."
   [DAFTAR_ISI]: ["Gagasan Utama 1", "Gagasan Utama 2", "Gagasan Utama 3", "Gagasan Utama 4", "Gagasan Utama 5", "Gagasan Utama 6"] (WAJIB: Ekstrak 6 poin paling berbobot dari isi naskah untuk ditampilkan di cover)
      `;

      const modelToUse = customModelId.trim() || selectedModel;

      if (useTurboMode) {
        updateTask(taskId, { message: 'Inisialisasi Mesin Turbo...', progress: 10 });
        
        try {
          // Dynamic import to avoid top level import clutter just in case
          const { runTurboEngine } = await import('./utils/turboEngine');
          
          setCurrentScreen('result');
          if (window.innerWidth < 768) {
            setZoom(Math.floor((window.innerWidth / 794) * 100)); // Exactly fit screen
          } else if (styleSettings?.responsivePreview === 'fit') {
            setZoom(Math.min(150, Math.floor(((window.innerWidth - 64) / 794) * 100)));
          } else {
            setZoom(100);
          }

          const turboResult = await runTurboEngine({
            apiKey: activeKey || '',
            model: modelToUse,
            tema,
            jenis,
            durasi,
            bahasaDoa,
            gayaDoa,
            targetDoaKhusus,
            useSunnahTemplate,
            basePrompt: prompt,
            onStreamContent: (formattedText) => {
              let processedText = cleanUpInstructionText(formattedText);
              const actualSapaan = sapaanJamaah === 'Custom' ? customSapaan : sapaanJamaah;
              processedText = processedText.replace(/\[SAPAAN\]/gi, actualSapaan);
              setResult(processedText);
              // Update history periodically but fast
              setHistory(prev => prev.map(item => 
                item.id === draftId 
                  ? { ...item, content: processedText } 
                  : item
              ));
            },
            onProgressUpdate: (msg, percent) => {
              updateTask(taskId, { message: msg, progress: percent });
            }
          });

          let finalProcessedText = cleanUpInstructionText(turboResult);
          const actualSapaan = sapaanJamaah === 'Custom' ? customSapaan : sapaanJamaah;
          finalProcessedText = finalProcessedText.replace(/\[SAPAAN\]/gi, actualSapaan);
          
          setActiveHistoryId(currentId => {
            if (currentId === draftId) setResult(finalProcessedText);
            return currentId;
          });

          setHistory(prev => prev.map(item => 
            item.id === draftId 
              ? { ...item, content: finalProcessedText, status: 'completed' } 
              : item
          ));
          updateTask(taskId, { status: 'completed', progress: 100, message: 'Selesai!', result: finalProcessedText });
          sendNotification('Naskah Selesai!', `Naskah "${tema}" telah berhasil disusun (Mesin Turbo).`);
          setIsGenerating(false);
          return;

        } catch (error: any) {
          console.error("Turbo Engine failed:", error);
          // If Turbo fails, gracefully fall through or throw
          throw new Error("Mesin Turbo Gagal: " + (error.message || ''));
        }
      }

      // CHECK: Should we use Deep Write (Multi-step)?
      // Use Deep Write for "Ceramah Umum" OR duration >= 15 minutes OR target words > 1500
      const isLongForm = jenis === 'Ceramah Umum' || durasi >= 15 || targetWordCount > 1500;
      
      if (isLongForm) {
        updateTask(taskId, { message: 'Deep Write Mode...', progress: 10 });
        if (durasi > 30) {
          alert("Peringatan: Anda meminta naskah dengan durasi sangat panjang (>30 menit). Sistem akan menggunakan mode 'Deep Write' (Chain of Thought) untuk memecah penulisan menjadi beberapa bagian agar kualitas tetap terjaga dan tidak terjadi 'AI Amnesia'.\n\nProses ini akan memakan waktu lebih lama dan mengkonsumsi banyak token API. Jika gagal di tengah jalan, cobalah kurangi durasi atau gunakan API Key Anda sendiri.");
        }
        let longFormResult = await generateLongForm(activeKey || '', prompt, draftId);
        if (longFormResult) {
          const actualSapaan = sapaanJamaah === 'Custom' ? customSapaan : sapaanJamaah;
          longFormResult = longFormResult.replace(/\[SAPAAN\]/gi, actualSapaan);
          // Success with long form
          setHistory(prev => prev.map(item => 
            item.id === draftId 
              ? { ...item, content: longFormResult, status: 'completed' } 
              : item
          ));
          updateTask(taskId, { status: 'completed', progress: 100, message: 'Selesai!', result: longFormResult });
          sendNotification('Naskah Selesai!', `Naskah "${tema}" telah berhasil disusun.`);
          setIsGenerating(false);
          return;
        }
        // If long form returned null (failed outline), fall through to standard generation
      }

      // --- Standard Generation (One-Shot) ---
      // Determine client based on key type
      const keyType = detectApiKeyType(activeKey || '');
      
      // Default to Gemini if keyType is unknown or gemini, OR if the selected model is a Gemini model
      // This ensures that even if apiKeyType is 'unknown' (e.g. env var), Gemini models still work
      const isGeminiModel = modelToUse.startsWith('gemini');

      if (isGeminiModel || keyType === 'gemini' || keyType === 'unknown') {
        const ai = new GoogleGenAI({ apiKey: activeKey });
        
        setCurrentScreen('result'); // Switch screen immediately
        
        // Auto-adjust zoom for mobile
        if (window.innerWidth < 768) {
          setZoom(Math.floor((window.innerWidth / 794) * 100)); // Exactly fit screen
        } else if (styleSettings?.responsivePreview === 'fit') {
          setZoom(Math.min(150, Math.floor(((window.innerWidth - 64) / 794) * 100)));
        } else {
          setZoom(100);
        }

        if (jenis === 'Khotbah Jumat' || jenis.includes('Idul')) {
          // ==========================================
          // 2-BATCH GENERATION (USER'S IDEA)
          // ==========================================
          const mukadimah1Marker = useSunnahTemplate ? '[TEMPLATE_MUKADIMAH_SUNNAH_1]' : '[TEMPLATE_MUKADIMAH_1]';
          
          // BATCH 1: ISI KHOTBAH
          const promptIsi = prompt.replace(
            /Kamu WAJIB membagi outputmu menjadi DUA bagian yang dipisahkan oleh marker "\[BATAS_KHOTBAH_KEDUA\]"\.[\s\S]*?\[ATURAN FORMAT BAHASA ARAB\]\.\)/,
            `(Tulis sapaan pembuka sesuai gaya: ${hookInstruction}, lalu tuliskan seluruh isi Khotbah Pertama di sini. ${useSunnahTemplate ? `Bahas tema "${tema}" dengan merujuk ketat pada pemahaman Salafus Shalih. Fokus pada pemurnian tauhid, ibadah, atau akhlak.` : `Bahas tema "${tema}" dengan alur emosi yang telah ditentukan.`} Ikuti pengaturan Kepadatan Dalil: ${kepadatanDalil}. WAJIB sertakan minimal satu ayat Al-Quran. Teks Arab pada dalil WAJIB mengikuti [ATURAN FORMAT BAHASA ARAB] di atas. Sampaikan intisari pesan secara mengalir di akhir bagian ini. JANGAN TULIS DOA PENUTUP.)`
          );

          updateTask(taskId, { progress: 10, message: 'Menyusun Isi Khotbah (Batch 1)...' });
          
          const responseStreamIsi = await ai.models.generateContentStream({
            model: modelToUse,
            contents: promptIsi,
            config: { temperature: 0.7 }
          });

          let isiText = '';
          let chunkCount = 0;
          for await (const chunk of responseStreamIsi) {
            const text = chunk.text || "";
            isiText += text;
            const formattedDisplay = `${mukadimah1Marker}\n\n${isiText.trim()}\n\n[TEMPLATE_PENUTUP_1]\n\n---\n\n${useSunnahTemplate ? '[TEMPLATE_MUKADIMAH_SUNNAH_2]' : '[TEMPLATE_MUKADIMAH_2]'}\n\n*(Sedang merangkai doa tematik...)*\n\n${useSunnahTemplate ? '[TEMPLATE_PENUTUP_SUNNAH_2]' : '[TEMPLATE_PENUTUP_2]'}`;
            const processedText = cleanUpInstructionText(formattedDisplay);
            
            setHistory(prev => prev.map(item => item.id === draftId ? { ...item, content: processedText } : item));
            setActiveHistoryId(currentId => {
              if (currentId === draftId) setResult(processedText);
              return currentId;
            });
            
            chunkCount++;
            if (chunkCount % 15 === 0) {
              const progress = Math.min(50, 10 + (chunkCount / 100) * 40);
              updateTask(taskId, { progress, message: 'Menyusun Isi Khotbah...' });
            }
          }

          // BATCH 2: DOA TEMATIK
          updateTask(taskId, { progress: 60, message: 'Menyusun Doa Tematik (Batch 2)...' });
          
          const promptDoa = `
Kamu adalah seorang Ulama. Berdasarkan isi khotbah berikut:
"""
\${isiText.substring(0, 2000)}...
"""

Tugasmu HANYA menulis Doa Tematik untuk Khotbah Kedua dalam bahasa \${bahasaDoa}.
Gaya Doa: \${gayaDoa}\${doaKhususInstruction}.
PENTING: 
- DILARANG KERAS menulis kalimat pengantar seperti "Berikut adalah doa tematiknya:" atau "[Tambahkan doa tematik di sini]".
- DILARANG KERAS menulis pesan singkat atau kesimpulan. Tulis LANGSUNG mulai dari kata pertama Doa tersebut tanpa kalimat lain sebelumnya.
- Doa tematik cukup 1-2 paragraf saja, padat, penuh makna seperti sastra (namun tidak berlebihan).
- WAJIB menyertakan Asmaul Husna yang relevan dengan tema.
- Jangan terlalu panjang karena sudah ada doa standar lainnya di template.
- Jika menggunakan bahasa Arab, WAJIB dibungkus dalam code block \`\`\`arabic.
- Ingat: Kalimat pertama darimu HARUS berupa bagian langsung dari Doa. Tanpa basa-basi!
          `;

          const responseStreamDoa = await ai.models.generateContentStream({
            model: modelToUse,
            contents: promptDoa,
            config: { temperature: 0.7 }
          });

          let doaText = '';
          for await (const chunk of responseStreamDoa) {
            const text = chunk.text || "";
            doaText += text;
            const doaPart = doaText.trim();
            const formattedDisplay = `${mukadimah1Marker}\n\n${isiText.trim()}\n\n[TEMPLATE_PENUTUP_1]\n\n---\n\n${useSunnahTemplate ? '[TEMPLATE_MUKADIMAH_SUNNAH_2]' : '[TEMPLATE_MUKADIMAH_2]'}\n\n${doaPart || '*(Sedang merangkai doa tematik...)*'}\n\n${useSunnahTemplate ? '[TEMPLATE_PENUTUP_SUNNAH_2]' : '[TEMPLATE_PENUTUP_2]'}`;
            const processedText = cleanUpInstructionText(formattedDisplay);
            
            setHistory(prev => prev.map(item => item.id === draftId ? { ...item, content: processedText } : item));
            setActiveHistoryId(currentId => {
              if (currentId === draftId) setResult(processedText);
              return currentId;
            });
            
            chunkCount++;
            if (chunkCount % 15 === 0) {
              const progress = Math.min(95, 60 + (chunkCount / 50) * 35);
              updateTask(taskId, { progress, message: 'Menyusun Doa Tematik...' });
            }
          }

          const finalDisplay = `${mukadimah1Marker}\n\n${isiText.trim()}\n\n[TEMPLATE_PENUTUP_1]\n\n---\n\n${useSunnahTemplate ? '[TEMPLATE_MUKADIMAH_SUNNAH_2]' : '[TEMPLATE_MUKADIMAH_2]'}\n\n${doaText.trim()}\n\n${useSunnahTemplate ? '[TEMPLATE_PENUTUP_SUNNAH_2]' : '[TEMPLATE_PENUTUP_2]'}`;
          const finalProcessedText = cleanUpInstructionText(finalDisplay);
          
          setActiveHistoryId(currentId => {
            if (currentId === draftId) setResult(finalProcessedText);
            return currentId;
          });

          setHistory(prev => prev.map(item => item.id === draftId ? { ...item, content: finalProcessedText, status: 'completed' } : item));
          updateTask(taskId, { status: 'completed', progress: 100, message: 'Selesai!', result: finalProcessedText });
          sendNotification('Naskah Selesai!', `Naskah "${tema}" telah berhasil disusun.`);

        } else {
          // ==========================================
          // 1-BATCH GENERATION (NORMAL)
          // ==========================================
          const responseStream = await ai.models.generateContentStream({
            model: modelToUse,
            contents: prompt,
            config: { temperature: 0.7 }
          });

          let fullText = '';
          let chunkCount = 0;
          for await (const chunk of responseStream) {
            const chunkText = chunk.text || "";
            fullText += chunkText;
            
            const mukadimah1Marker = useSunnahTemplate ? '[TEMPLATE_MUKADIMAH_SUNNAH_1]' : '[TEMPLATE_MUKADIMAH_1]';
            const penutup1Marker = '[TEMPLATE_PENUTUP_1]';
            const mukadimah2Marker = useSunnahTemplate ? '[TEMPLATE_MUKADIMAH_SUNNAH_2]' : '[TEMPLATE_MUKADIMAH_2]';
            const penutup2Marker = useSunnahTemplate ? '[TEMPLATE_PENUTUP_SUNNAH_2]' : '[TEMPLATE_PENUTUP_2]';
            
            let formattedDisplay = '';
            if (jenis === 'Khotbah Jumat' || jenis.includes('Idul')) {
              const normalizedFullText = fullText.replace(/\[\s*BATAS[\s_]*KHOTBAH[\s_]*KEDUA\s*\]/gi, '[BATAS_KHOTBAH_KEDUA]');
              if (normalizedFullText.includes('[BATAS_KHOTBAH_KEDUA]')) {
                const parts = normalizedFullText.split('[BATAS_KHOTBAH_KEDUA]');
                const isiPart = parts[0].trim();
                const doaPart = parts.slice(1).join('\n\n').trim();
                formattedDisplay = `${mukadimah1Marker}\n\n${isiPart}\n\n${penutup1Marker}\n\n---\n\n${mukadimah2Marker}\n\n${doaPart || '*(Sedang merangkai doa tematik...)*'}\n\n${penutup2Marker}`;
              } else {
                formattedDisplay = `${mukadimah1Marker}\n\n${fullText.trim()}\n\n${penutup1Marker}\n\n---\n\n${mukadimah2Marker}\n\n*(Sedang merangkai doa tematik...)*\n\n${penutup2Marker}`;
              }
            } else {
              formattedDisplay = `${mukadimah1Marker}\n\n${fullText.trim()}\n\n${penutup1Marker}`;
            }
            
            const processedText = cleanUpInstructionText(formattedDisplay);
            
            setHistory(prev => {
              return prev.map(item => {
                if (item.id === draftId) {
                  return { ...item, content: processedText };
                }
                return item;
              });
            });

            setActiveHistoryId(currentId => {
              if (currentId === draftId) {
                setResult(processedText);
              }
              return currentId;
            });
            
            chunkCount++;
            if (chunkCount % 15 === 0) {
              const progress = Math.min(95, (chunkCount / 100) * 100);
              updateTask(taskId, { progress, message: 'Menyusun...' });
            }
          }
          
          const mukadimah1Marker = useSunnahTemplate ? '[TEMPLATE_MUKADIMAH_SUNNAH_1]' : '[TEMPLATE_MUKADIMAH_1]';
          const penutup1Marker = '[TEMPLATE_PENUTUP_1]';
          const mukadimah2Marker = useSunnahTemplate ? '[TEMPLATE_MUKADIMAH_SUNNAH_2]' : '[TEMPLATE_MUKADIMAH_2]';
          const penutup2Marker = useSunnahTemplate ? '[TEMPLATE_PENUTUP_SUNNAH_2]' : '[TEMPLATE_PENUTUP_2]';
          
          let finalDisplay = '';
          if (jenis === 'Khotbah Jumat' || jenis.includes('Idul')) {
            const normalizedFullText = fullText.replace(/\[\s*BATAS[\s_]*KHOTBAH[\s_]*KEDUA\s*\]/gi, '[BATAS_KHOTBAH_KEDUA]');
            if (normalizedFullText.includes('[BATAS_KHOTBAH_KEDUA]')) {
              const parts = normalizedFullText.split('[BATAS_KHOTBAH_KEDUA]');
              const isiPart = parts[0].trim();
              const doaPart = parts.slice(1).join('\n\n').trim();
              finalDisplay = `${mukadimah1Marker}\n\n${isiPart}\n\n${penutup1Marker}\n\n---\n\n${mukadimah2Marker}\n\n${doaPart}\n\n${penutup2Marker}`;
            } else {
              finalDisplay = `${mukadimah1Marker}\n\n${normalizedFullText.trim()}\n\n${penutup1Marker}\n\n---\n\n${mukadimah2Marker}\n\n*(Doa tematik tidak ditemukan)*\n\n${penutup2Marker}`;
            }
          } else {
            finalDisplay = `${mukadimah1Marker}\n\n${fullText.trim()}\n\n${penutup1Marker}`;
          }
          const finalProcessedText = cleanUpInstructionText(finalDisplay);
          
          setActiveHistoryId(currentId => {
            if (currentId === draftId) {
              setResult(finalProcessedText);
            }
            return currentId;
          });

          setHistory(prev => prev.map(item => 
            item.id === draftId 
              ? { ...item, content: finalProcessedText, status: 'completed' } 
              : item
          ));
          updateTask(taskId, { status: 'completed', progress: 100, message: 'Selesai!', result: finalProcessedText });
          sendNotification('Naskah Selesai!', `Naskah "${tema}" telah berhasil disusun.`);
        }
      } else {
        // OpenAI / DeepSeek / Groq Compatible Call
        const baseURL = customBaseUrl ? customBaseUrl.replace(/\/+$/, '') : (
          selectedModel.startsWith('deepseek') ? 'https://api.deepseek.com/v1' :
          selectedModel.startsWith('llama') || selectedModel.startsWith('mixtral') ? 'https://api.groq.com/openai/v1' :
          'https://api.openai.com/v1'
        );

        if (jenis === 'Khotbah Jumat' || jenis.includes('Idul')) {
          // ==========================================
          // 2-BATCH GENERATION (USER'S IDEA)
          // ==========================================
          const mukadimah1Marker = useSunnahTemplate ? '[TEMPLATE_MUKADIMAH_SUNNAH_1]' : '[TEMPLATE_MUKADIMAH_1]';
          
          // BATCH 1: ISI KHOTBAH
          const promptIsi = prompt.replace(
            /Kamu WAJIB membagi outputmu menjadi DUA bagian yang dipisahkan oleh marker "\[BATAS_KHOTBAH_KEDUA\]"\.[\s\S]*?\[ATURAN FORMAT BAHASA ARAB\]\.\)/,
            `(Tulis sapaan pembuka sesuai gaya: ${hookInstruction}, lalu tuliskan seluruh isi Khotbah Pertama di sini. ${useSunnahTemplate ? `Bahas tema "${tema}" dengan merujuk ketat pada pemahaman Salafus Shalih. Fokus pada pemurnian tauhid, ibadah, atau akhlak.` : `Bahas tema "${tema}" dengan alur emosi yang telah ditentukan.`} Ikuti pengaturan Kepadatan Dalil: ${kepadatanDalil}. WAJIB sertakan minimal satu ayat Al-Quran. Teks Arab pada dalil WAJIB mengikuti [ATURAN FORMAT BAHASA ARAB] di atas. Sampaikan intisari pesan secara mengalir di akhir bagian ini. JANGAN TULIS DOA PENUTUP.)`
          );

          updateTask(taskId, { progress: 30, message: 'Menyusun Isi Khotbah (Batch 1)...' });

          const responseIsi = await fetch(`${baseURL}/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${customApiKey}`
            },
            body: JSON.stringify({
              model: selectedModel,
              messages: [{ role: 'user', content: promptIsi }],
              temperature: 0.7
            })
          });

          if (!responseIsi.ok) {
            const err = await responseIsi.json();
            throw new Error(err.error?.message || 'Gagal menghubungi API Provider');
          }

          const dataIsi = await responseIsi.json();
          const isiText = dataIsi.choices[0].message.content;

          // BATCH 2: DOA TEMATIK
          updateTask(taskId, { progress: 60, message: 'Menyusun Doa Tematik (Batch 2)...' });
          
          const promptDoa = `
Kamu adalah seorang Ulama. Berdasarkan isi khotbah berikut:
"""
\${isiText.substring(0, 2000)}...
"""

Tugasmu HANYA menulis Doa Tematik untuk Khotbah Kedua dalam bahasa \${bahasaDoa}.
Gaya Doa: \${gayaDoa}\${doaKhususInstruction}.
PENTING: 
- DILARANG KERAS menulis kalimat pengantar seperti "Berikut adalah doa tematiknya:" atau "[Tambahkan doa tematik di sini]".
- DILARANG KERAS menulis pesan singkat atau kesimpulan. Tulis LANGSUNG mulai dari kata pertama Doa tersebut tanpa kalimat lain sebelumnya.
- Doa tematik cukup 1-2 paragraf saja, padat, penuh makna seperti sastra (namun tidak berlebihan).
- WAJIB menyertakan Asmaul Husna yang relevan dengan tema.
- Jangan terlalu panjang karena sudah ada doa standar lainnya di template.
- Jika menggunakan bahasa Arab, WAJIB dibungkus dalam code block \`\`\`arabic.
- Ingat: Kalimat pertama darimu HARUS berupa bagian langsung dari Doa. Tanpa basa-basi!
          `;

          const responseDoa = await fetch(`${baseURL}/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${customApiKey}`
            },
            body: JSON.stringify({
              model: selectedModel,
              messages: [{ role: 'user', content: promptDoa }],
              temperature: 0.7
            })
          });

          if (!responseDoa.ok) {
            const err = await responseDoa.json();
            throw new Error(err.error?.message || 'Gagal menghubungi API Provider');
          }

          const dataDoa = await responseDoa.json();
          const doaText = dataDoa.choices[0].message.content;

          const finalDisplay = `${mukadimah1Marker}\n\n${isiText.trim()}\n\n[TEMPLATE_PENUTUP_1]\n\n---\n\n${useSunnahTemplate ? '[TEMPLATE_MUKADIMAH_SUNNAH_2]' : '[TEMPLATE_MUKADIMAH_2]'}\n\n${doaText.trim()}\n\n${useSunnahTemplate ? '[TEMPLATE_PENUTUP_SUNNAH_2]' : '[TEMPLATE_PENUTUP_2]'}`;
          const processedText = cleanUpInstructionText(finalDisplay);
          
          setActiveHistoryId(currentId => {
            if (currentId === draftId) setResult(processedText);
            return currentId;
          });

          setHistory(prev => prev.map(item => item.id === draftId ? { ...item, content: processedText, status: 'completed' } : item));
          updateTask(taskId, { status: 'completed', progress: 100, message: 'Selesai!', result: processedText });
          sendNotification('Naskah Selesai!', `Naskah "${tema}" telah berhasil disusun.`);

        } else {
          // ==========================================
          // 1-BATCH GENERATION (NORMAL)
          // ==========================================
          const response = await fetch(`${baseURL}/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${customApiKey}`
            },
            body: JSON.stringify({
              model: selectedModel,
              messages: [{ role: 'user', content: prompt }],
              temperature: 0.7
            })
          });

          if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || 'Gagal menghubungi API Provider');
          }

          const data = await response.json();
          const generatedText = data.choices[0].message.content;
          
          const mukadimah1Marker = useSunnahTemplate ? '[TEMPLATE_MUKADIMAH_SUNNAH_1]' : '[TEMPLATE_MUKADIMAH_1]';
          const penutup1Marker = '[TEMPLATE_PENUTUP_1]';
          const mukadimah2Marker = useSunnahTemplate ? '[TEMPLATE_MUKADIMAH_SUNNAH_2]' : '[TEMPLATE_MUKADIMAH_2]';
          const penutup2Marker = useSunnahTemplate ? '[TEMPLATE_PENUTUP_SUNNAH_2]' : '[TEMPLATE_PENUTUP_2]';
          
          let finalDisplay = '';
          if (jenis === 'Khotbah Jumat' || jenis.includes('Idul')) {
            const normalizedGeneratedText = generatedText.replace(/\[\s*BATAS[\s_]*KHOTBAH[\s_]*KEDUA\s*\]/gi, '[BATAS_KHOTBAH_KEDUA]');
            if (normalizedGeneratedText.includes('[BATAS_KHOTBAH_KEDUA]')) {
              const parts = normalizedGeneratedText.split('[BATAS_KHOTBAH_KEDUA]');
              const isiPart = parts[0].trim();
              const doaPart = parts.slice(1).join('\n\n').trim();
              finalDisplay = `${mukadimah1Marker}\n\n${isiPart}\n\n${penutup1Marker}\n\n---\n\n${mukadimah2Marker}\n\n${doaPart}\n\n${penutup2Marker}`;
            } else {
              finalDisplay = `${mukadimah1Marker}\n\n${normalizedGeneratedText.trim()}\n\n${penutup1Marker}\n\n---\n\n${mukadimah2Marker}\n\n*(Doa tematik tidak ditemukan)*\n\n${penutup2Marker}`;
            }
          } else {
            finalDisplay = `${mukadimah1Marker}\n\n${generatedText.trim()}\n\n${penutup1Marker}`;
          }
          
          const processedText = cleanUpInstructionText(finalDisplay);
          
          setActiveHistoryId(currentId => {
            if (currentId === draftId) {
              setResult(processedText);
            }
            return currentId;
          });

          setHistory(prev => prev.map(item => 
            item.id === draftId 
              ? { ...item, content: processedText, status: 'completed' } 
              : item
          ));
          updateTask(taskId, { status: 'completed', progress: 100, message: 'Selesai!', result: processedText });
          sendNotification('Naskah Selesai!', `Naskah "${tema}" telah berhasil disusun.`);
        }
      }
      
    } catch (error: any) {
      console.error('Error generating khotbah:', error);
      const errorMsg = error.message || '';
      updateTask(taskId, { status: 'failed', error: errorMsg });
      
      setHistory(prev => prev.map(item => 
        item.id === draftId 
          ? { ...item, status: 'failed', content: `Gagal menyusun naskah: ${errorMsg}` } 
          : item
      ));

      if (errorMsg.toLowerCase().includes('api key') || errorMsg.includes('401') || errorMsg.includes('403')) {
        setShowApiKeyModal(true);
      } else {
        alert(`Gagal membuat naskah: ${errorMsg || 'Periksa koneksi internet Anda atau API Key.'}`);
      }
      setCurrentScreen('home'); // Go back to home on error
    } finally {
      setIsGenerating(false);
    }
  };

  const handleManualCreate = () => {
    const newId = Date.now().toString();
    const defaultContent = `# [Tulis Judul Khutbah Anda Di Sini]

*(Ini adalah kerangka Khutbah Sunnah. Teks bahasa Arab di bawah ini otomatis dikenali oleh sistem dengan gaya font Arab yang indah. Silakan hapus atau edit bagian kurung miring sesuai materi Anda).*

**Mukadimah (Khutbatul Hajah)**

إِنَّ الْحَمْدَ لِلَّهِ نَحْمَدُهُ وَنَسْتَعِينُهُ وَنَسْتَغْفِرُهُ، وَنَعُوذُ بِاللَّهِ مِنْ شُرُورِ أَنْفُسِنَا وَمِنْ سَيِّئَاتِ أَعْمَالِنَا، مَنْ يَهْدِهِ اللَّهُ فَلَا مُضِلَّ لَهُ، وَمَنْ يُضْلِلْ فَلَا هَادِيَ لَهُ. وَأَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ.

يَا أَيُّهَا الَّذِينَ آمَنُوا اتَّقُوا اللَّهَ حَقَّ تُقَاتِهِ وَلَا تَمُوتُنَّ إِلَّا وَأَنْتُمْ مُسْلِمُونَ.

يَا أَيُّهَا النَّاسُ اتَّقُوا رَبَّكُمُ الَّذِي خَلَقَكُمْ مِنْ نَفْسٍ وَاحِدَةٍ وَخَلَقَ مِنْهَا زَوْجَهَا وَبَثَّ مِنْهُمَا رِجَالًا كَثِيرًا وَنِسَاءً، وَاتَّقُوا اللَّهَ الَّذِي تَسَاءَلُونَ بِهِ وَالْأَرْحَامَ، إِنَّ اللَّهَ كَانَ عَلَيْكُمْ رَقِيبًا.

يَا أَيُّهَا الَّذِينَ آمَنُوا اتَّقُوا اللَّهَ وَقُولُوا قَوْلًا سَدِيدًا، يُصْلِحْ لَكُمْ أَعْمَالَكُمْ وَيَغْفِرْ لَكُمْ ذُنُوبَكُمْ، وَمَنْ يُطِعِ اللَّهَ وَرَسُولَهُ فَقَدْ فَازَ فَوْزًا عَظِيمًا.

أَمَّا بَعْدُ: فَإِنَّ أَصْدَقَ الْحَدِيثِ كِتَابُ اللَّهِ، وَأَحْسَنَ الْهَدْيِ هَدْيُ مُحَمَّدٍ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ، وَشَرَّ الْأُمُورِ مُحْدَثَاتُهَا، وَكُلَّ مُحْدَثَةٍ بِدْعَةٌ، وَكُلَّ بِدْعَةٍ ضَلَالَةٌ، وَكُلَّ ضَلَالَةٍ فِي النَّارِ.

Ma'asyiral muslimin, jamaah shalat Jumat yang dirahmati Allah. Mengawali khutbah ini, khatib berwasiat kepada diri pribadi dan jamaah sekalian, marilah kita senantiasa meningkatkan ketakwaan kepada Allah Azza wa Jalla...

*(Tulis Paragraf Pembangun Konteks / Bridging Tema Di Sini...)*

---

### Isi Khutbah Pertama

*(Tulis Poin-Poin Utama Khutbah Di Sini. Gunakan tanda kutip \`>\` di awal baris untuk menonjolkan Dalil).*

> "Dan peringatkanlah, karena sesungguhnya peringatan itu bermanfaat bagi orang-orang mukmin." (Rujukan Ayat)

*(Lanjutkan Isi)*

---

**Penutup Khutbah Pertama**

Semoga Allah memberkahi kita semua dengan Al-Quran yang mulia.

بَارَكَ اللَّهُ لِي وَلَكُمْ فِي الْقُرْآنِ الْعَظِيمِ، وَنَفَعَنِي وَإِيَّاكُمْ بِمَا فِيهِ مِنَ الْآيَاتِ وَالذِّكْرِ الْحَكِيمِ. أَقُولُ قَوْلِي هَذَا وَأَسْتَغْفِرُ اللَّهَ لِي وَلَكُمْ وَلِسَائِرِ الْمُسْلِمِينَ مِنْ كُلِّ ذَنْبٍ، فَاسْتَغْفِرُوهُ إِنَّهُ هُوَ الْغَفُورُ الرَّحِيمُ.



---

**Khutbah Kedua**

الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ، وَأَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللَّهُ وَلِيُّ الصَّالِحِينَ، وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ الصَّادِقُ الْأَمِينُ، صَلَّى اللَّهُ عَلَيْهِ وَعَلَى آلِهِ وَصَحْبِهِ أَجْمَعِينَ.

أَمَّا بَعْدُ: فَاتَّقُوا اللَّهَ عِبَادَ اللَّهِ...

*(Tulis Sedikit Ringkasan / Pesan Akhir Di Sini sebelum Doa)*

---

**Doa Penutup**

إِنَّ اللَّهَ وَمَلَائِكَتَهُ يُصَلُّونَ عَلَى النَّبِيِّ، يَا أَيُّهَا الَّذِينَ آمَنُوا صَلُّوا عَلَيْهِ وَسَلِّمُوا تَسْلِيمًا.
اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ.

اللَّهُمَّ اغْفِرْ لِلْمُسْلِمِينَ وَالْمُسْلِمَاتِ، وَالْمُؤْمِنِينَ وَالْمُؤْمِنَاتِ، الْأَحْيَاءِ مِنْهُمْ وَالْأَمْوَاتِ، إِنَّكَ سَمِيعٌ قَرِيبٌ مُجِيبُ الدَّعَوَاتِ، يَا قَاضِيَ الْحَاجَاتِ.

رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ.

عِبَادَ اللَّهِ، إِنَّ اللَّهَ يَأْمُرُ بِالْعَدْلِ وَالْإِحْسَانِ وَإِيتَاءِ ذِي الْقُرْبَى، وَيَنْهَى عَنِ الْفَحْشَاءِ وَالْمُنْكَرِ وَالْبَغْيِ، يَعِظُكُمْ لَعَلَّكُمْ تَذَكَّرُونَ. فَاذْكُرُوا اللَّهَ الْعَظِيمَ يَذْكُرْكُمْ، وَاشْكُرُوهُ عَلَى نِعَمِهِ يَزِدْكُمْ، وَلَذِكْرُ اللَّهِ أَكْبَرُ.`;
    
    setTema('Naskah Khutbah Sunnah (Manual)');
    setJenis('Manual');
    setResult(defaultContent);
    setStartInEditMode(true);
    
    const initialCoverData: any = {
      show: true,
      title: 'Naskah Tanpa Judul',
      subtitle: '',
      author: userProfile?.name || '',
      location: userProfile?.mosque || '',
      date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
      toc: '',
      imageUrl: '',
      showImageCover: false,
      showTextCover: true,
      imageHistory: [],
      imageScale: 1,
      imageOffsetX: 0,
      imageOffsetY: 0
    };
    
    setCoverData(initialCoverData);
    setWatermark({
      text: '',
      showOnAllPages: false
    });
    
    const newEntry: KhotbahData = {
      id: newId,
      date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
      tema: 'Naskah Tanpa Judul',
      jenis: 'Manual',
      content: defaultContent,
      coverData: initialCoverData,
      watermark: { text: '', showOnAllPages: false }
    };
    
    setHistory(prev => [newEntry, ...prev]);
    setActiveHistoryId(newId);
    setCurrentScreen('result');
    if (window.innerWidth < 768) {
      setZoom(Math.floor((window.innerWidth / 794) * 100)); // Exactly fit screen
    } else if (styleSettings?.responsivePreview === 'fit') {
      setZoom(Math.min(150, Math.floor(((window.innerWidth - 64) / 794) * 100)));
    }
  };

  const handleCopy = () => {
    const textToCopy = processTemplateMarkersForText(result, terjemahanMukadimah, latinMukadimah);
    navigator.clipboard.writeText(textToCopy);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleSave = (newContent: string, newCoverData?: any, newWatermark?: any) => {
    setResult(newContent);
    if (newCoverData) setCoverData(newCoverData);
    if (newWatermark) setWatermark(newWatermark);
    
    if (activeHistoryId) {
      setHistory(prev => prev.map(item => 
        item.id === activeHistoryId ? { 
          ...item, 
          content: newContent,
          coverData: newCoverData || item.coverData,
          watermark: newWatermark || item.watermark
        } : item
      ));
    }
  };

  // Dalil Search State
  const [showDalilSearch, setShowDalilSearch] = useState(false);
  const [dalilQuery, setDalilQuery] = useState('');
  const [dalilResults, setDalilResults] = useState<string[]>([]);
  const [isSearchingDalil, setIsSearchingDalil] = useState(false);

  // Paper Template State
  

  const handleSearchDalil = async (query: string = dalilQuery, type: 'quran' | 'hadits' = 'quran', trimSanad: boolean = true) => {
    if (!query.trim()) return;
    setIsSearchingDalil(true);
    setDalilResults([]);
    
    try {
      if (type === 'quran') {
        try {
          // Pencarian Quran Non-AI (menggunakan alquran.cloud api gratis sebagai fallback non-AI)
          const response = await fetch(`https://api.alquran.cloud/v1/search/${encodeURIComponent(query)}/all/id.indonesian`);
          const data = await response.json();
          
          if(data.code === 200 && data.data && data.data.matches && data.data.matches.length > 0) {
              const matches = data.data.matches.slice(0, 3);
              const formattedResults = await Promise.all(matches.map(async (match: any) => {
                  const arabResp = await fetch(`https://api.alquran.cloud/v1/ayah/${match.surah.number}:${match.numberInSurah}/ar.alafasy`);
                  const arabData = await arabResp.json();
                  const arabicText = arabData?.data?.text || "[Teks Arab offline tidak tersedia]";
                  return `**QS. ${match.surah.englishName}: ${match.numberInSurah}**\n\n\`\`\`arabic\n${arabicText}\n\`\`\`\n*Artinya: ${match.text}*`;
              }));
              setDalilResults(formattedResults);
          } else {
              setDalilResults(["*Tidak ditemukan di Al-Quran (Pencarian Non-AI)*"]);
          }
        } catch (apiErr) {
          console.error("Non-AI Quran API error:", apiErr);
          setDalilResults(["*Gagal mencari dari database Al-Quran. Periksa koneksi internet Anda.*"]);
        }
        return; // Early return for quran so it doesn't trigger AI
      }
      
      let prompt = `
Carikan 3 Hadits Shahih dari Kutubut Tis'ah (Termasuk Bukhari, Muslim, Tirmidzi, dll) yang relevan dengan topik: "${query}".
Output WAJIB berupa JSON Array string, di mana setiap string berisi format markdown siap pakai.

PENTING:
${trimSanad ? '1. POTONG SANAD. JANGAN tulis rantai perawi seperti "Telah menceritakan kepada kami fulan...". Langsung mulai dari rawi sahabat puncak (Contoh: "Dari Abu Hurairah radhiyallahu anhu, ia berkata: Rasulullah ﷺ bersabda...")' : '1. Sertakan sanad lengkap sesuai sumber aslinya jika ada.'}
2. Teks Arab HARUS berharakat lengkap.

Format Wajib:
[
  "**HR. [Nama Perawi/Kitab]**\n\n\`\`\`arabic\n[Teks Arab Matan${trimSanad ? ' tanpa sanad awal' : ''} dengan harakat lengkap]\n\`\`\`\n*Artinya: [Terjemahan Bahasa Indonesia]*"
]
`;

      const activeKey = customApiKey || process.env.GEMINI_API_KEY;
      const ai = new GoogleGenAI({ apiKey: activeKey });

      const response = await ai.models.generateContent({
        model: selectedModel,
        contents: prompt,
        config: { 
          responseMimeType: 'application/json',
          tools: [{ googleSearch: {} }]
        }
      });

      const results = JSON.parse(response.text);
      setDalilResults(results);
    } catch (error) {
      console.error('Error searching dalil:', error);
      alert('Gagal mencari dalil. Coba lagi.');
    } finally {
      setIsSearchingDalil(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Naskah ${jenis}: ${tema}`,
          text: result,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      handleCopy();
      alert('Link tersalin ke clipboard (Browser tidak mendukung fitur Share native)');
    }
  };

  const handleDownloadTxt = () => {
    const element = document.createElement("a");
    const file = new Blob([result], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `Khotbah_${tema.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
    document.body.appendChild(element); // Required for this to work in FireFox
    element.click();
    document.body.removeChild(element);
  };

  const handlePrintPdf = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const printableArea = document.getElementById('printable-area');
        if (!printableArea) {
           alert("Area cetak tidak ditemukan.");
           return;
        }
        
        alert("Sedang membuat PDF, mohon tunggu beberapa detik (akan pop-up jika sudah siap)...");
        
        // Create a styled clone to avoid layout scaling bugs
        const clone = printableArea.cloneNode(true) as HTMLElement;
        clone.className = `pb-24 flex flex-col items-center gap-6`;
        const pages = clone.querySelectorAll('.print-page');
        pages.forEach((page: Element) => {
          if (page instanceof HTMLElement) {
            page.style.transform = 'none';
            page.style.zoom = '1';
            page.style.marginBottom = '0';
            page.style.marginTop = '0';
            page.style.maxHeight = 'none';
            page.style.overflow = 'hidden';
            page.style.boxShadow = 'none';
            page.style.border = 'none';
            page.style.pageBreakAfter = 'always';
          }
        });

        // Add to dom temporarily for perfect style rendering
        const hiddenWrapper = document.createElement('div');
        hiddenWrapper.style.position = 'absolute';
        hiddenWrapper.style.left = '-9999px';
        hiddenWrapper.appendChild(clone);
        document.body.appendChild(hiddenWrapper);

        const html2pdf = (await import('html2pdf.js')).default;
        
        const opt = {
          margin:       0,
          filename:     `Khotbah_${tema.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'Document'}.pdf`,
          image:        { type: 'jpeg' as const, quality: 0.98 },
          html2canvas:  { scale: 2, useCORS: true, letterRendering: true, logging: false },
          jsPDF:        { unit: 'in' as const, format: 'a4' as const, orientation: 'portrait' as const }
        };

        const pdfBase64 = await html2pdf().set(opt).from(clone).outputPdf('datauristring');
        
        document.body.removeChild(hiddenWrapper);
        
        // Save to filesystem
        const base64Data = pdfBase64.split(',')[1];
        
        const savedFile = await Filesystem.writeFile({
          path: opt.filename,
          data: base64Data,
          directory: Directory.Cache
        });

        await Share.share({
          title: 'Naskah Khutbah',
          files: [savedFile.uri],
          dialogTitle: 'Simpan / Bagikan PDF',
        });

      } catch (error: any) {
        alert("Gagal membuat PDF: " + (error.message || error));
      }
      return;
    }

    alert("TIPS PENTING SAAT PRINT/SAVE PDF:\n\n1. Atur 'Margins' ke 'None' (agar tidak terpotong).\n2. Centang 'Background graphics' (agar warna kertas muncul).\n3. Pastikan ukuran kertas sesuai (A4/A5).");
    window.print();
  };

  const handleAnalyze = async () => {
    if (!result.trim()) return;
    
    setIsAnalyzing(true);
    setShowAnalysis(true);
    setAnalysisResult('');
    
    try {
      const prompt = `
Anda adalah seorang ahli retorika, neurosains komunikasi, dan pelatih public speaking tingkat tinggi.
Tugas Anda adalah menganalisis naskah khotbah berikut dan memberikan feedback yang sangat tajam, jujur, dan aplikatif.

NASKAH:
"""
${result}
"""

TOLOK UKUR ANALISIS (SMART ANALYSIS BERBASIS NEUROSAINS, RETORIKA & KEILMUAN ISLAM):
1. Hook & Attention: Apakah pembukanya berhasil memecah pola (pattern interrupt) dan membuat audiens penasaran tanpa terasa clickbait?
2. Alur Emosi (Red Thread): Apakah transisi dari masalah -> empati -> dalil -> solusi terasa mulus? Apakah dalil masuk sebagai jawaban yang menenangkan, bukan palu ancaman?
3. Psychological Safety: Apakah gaya bahasanya anti-defensif? (Menggunakan "Kita" bukan "Kalian", menghindari absolutisme).
4. Beban Kognitif & Ritme: Apakah kalimatnya bervariasi (Cadence)? Apakah ada ruang untuk jeda (Sacred Pause)? Apakah menggunakan Rule of Three atau Anaphora?
5. Penutup (The Exit Grace): Apakah penutupnya memiliki resonansi emosional yang kuat (One Breath Close)? Apakah ada Echo Ending (mengaitkan kembali ke awal)?
6. Keselarasan Persona: Apakah gaya pembicara (Ethos) terasa otentik, jujur, dan tidak menggurui?
7. Kerangka & Rukun (Structure): Apakah struktur khotbahnya rapi dan sesuai kaidah (terutama pemisahan Khotbah Pertama dan Kedua)?
8. Bobot Ilmu & Dalil (Theological Accuracy): Apakah dalil yang digunakan relevan, shahih, dan penafsirannya lurus (sesuai pemahaman Salafus Shalih)? Apakah pesan tauhid/akhlaknya tersampaikan dengan benar?

FORMAT JAWABAN WAJIB JSON:
{
  "score": number (1-100),
  "strengths": ["string", "string"],
  "weaknesses": ["string", "string"],
  "suggestions": [
    {
      "title": "Judul Saran",
      "problem": "Penjelasan masalah di bagian tertentu",
      "original_segment": "Kutipan teks asli yang ingin diperbaiki (HARUS PERSIS SAMA DENGAN DI NASKAH)",
      "suggested_replacement": "Teks baru hasil perbaikan yang lebih retoris dan menyentuh",
      "reason": "Mengapa ini lebih baik?"
    }
  ]
}
`;

      const activeKey = customApiKey || process.env.GEMINI_API_KEY;
      const ai = new GoogleGenAI({ apiKey: activeKey });

      const response = await ai.models.generateContent({
        model: selectedModel,
        contents: prompt,
        config: { 
          temperature: 0.7,
          responseMimeType: 'application/json'
        }
      });

      const analysisData = JSON.parse(response.text);
      setAnalysisResult(JSON.stringify(analysisData));
      
      // Update history with analysis result
      if (activeHistoryId) {
        setHistory(prev => prev.map(item => 
          item.id === activeHistoryId ? { ...item, analysisResult: JSON.stringify(analysisData) } : item
        ));
      }
    } catch (error) {
      console.error('Error analyzing khotbah:', error);
      setAnalysisResult('Terjadi kesalahan saat menganalisis naskah. Periksa koneksi internet Anda.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resumeGeneration = async (item: KhotbahData) => {
    if (!item.content.trim()) return;
    
    setIsGenerating(true);
    setLoadingMsgIdx(0);
    setCurrentScreen('result');
    setActiveHistoryId(item.id);
    setResult(item.content);

    const taskId = addTask({
      type: 'generation',
      theme: item.tema,
      category: item.jenis,
      historyId: item.id,
      message: 'Melanjutkan...'
    });
    
    try {
      const activeKey = customApiKey || process.env.GEMINI_API_KEY;
      if (!activeKey) {
        setShowApiKeyModal(true);
        setIsGenerating(false);
        updateTask(taskId, { status: 'failed', message: 'API Key diperlukan' });
        return;
      }
      updateTask(taskId, { status: 'processing', progress: 10 });
      const ai = new GoogleGenAI({ apiKey: activeKey });
      
      const prompt = `
        Peran: Penulis Naskah Khotbah Profesional.
        Tugas: LANJUTKAN penulisan naskah khotbah berikut ini yang terputus.
        
        NASKAH YANG TERPUTUS:
        """
        ${item.content}
        """
        
        INSTRUKSI KHUSUS:
        1. Lanjutkan naskah dari kalimat terakhir secara logis dan mengalir.
        2. Jangan mengulang kalimat terakhir, langsung sambung saja.
        3. Jika naskah belum memiliki penutup dan doa, pastikan untuk menyelesaikannya dengan penutup dan doa yang sesuai.
        4. Output HANYA kelanjutan naskahnya saja (jangan tulis ulang naskah sebelumnya).
      `;

      const stream = await ai.models.generateContentStream({
        model: selectedModel,
        contents: prompt
      });
      
      let newContent = item.content;
      let chunkCount = 0;
      
      for await (const chunk of stream) {
        const text = chunk.text || "";
        newContent += text;
        
        setActiveHistoryId(currentId => {
          if (currentId === item.id) {
            setResult(newContent);
          }
          return currentId;
        });

        chunkCount++;
        if (chunkCount % 10 === 0) {
          updateTask(taskId, { progress: Math.min(90, 10 + chunkCount) });
        }
      }
      
      // Update history
      setHistory(prev => prev.map(h => 
        h.id === item.id ? { ...h, content: newContent, status: 'completed' } : h
      ));
      updateTask(taskId, { status: 'completed', progress: 100, message: 'Selesai!' });
      
    } catch (error: any) {
      console.error("Resume failed", error);
      updateTask(taskId, { status: 'failed', error: error.message });
      alert("Gagal melanjutkan naskah. Silakan coba lagi.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAiDuration = async (action: 'extend' | 'shorten', minutes: number, focus: string[]) => {
    if (!result.trim()) return;
    
    setIsGenerating(true);
    setLoadingMsgIdx(0);
    
    try {
      const activeKey = customApiKey || process.env.GEMINI_API_KEY;
      const ai = new GoogleGenAI({ apiKey: activeKey });
      
      const prompt = `
        Peran: Editor Naskah Khotbah Profesional & Ahli Retorika.
        Tugas: ${action === 'extend' ? 'PERPANJANG' : 'PERPENDEK'} naskah khotbah berikut agar durasi penyampaiannya berubah sekitar ${minutes} menit dari sekarang.
        
        FOKUS PERUBAHAN:
        ${focus.map(f => `- ${f}`).join('\n')}
        
        NASKAH ASLI:
        """
        ${result}
        """
        
        INSTRUKSI KHUSUS:
        1. JANGAN ubah struktur dasar (Mukadimah, Dalil Utama, Penutup).
        2. ${action === 'extend' 
             ? 'Kembangkan poin-poin dengan ilustrasi, analogi, atau penjelasan mendalam. Tambahkan koneksi emosional.' 
             : 'Ringkas penjelasan yang bertele-tele. Hapus pengulangan yang tidak perlu. Padatkan kalimat tanpa mengurangi makna.'}
        3. Pastikan bahasa tetap mengalir, alami, dan menyentuh hati.
        4. Output HANYA naskah hasil revisi dalam format Markdown yang rapi.
      `;

      const response = await ai.models.generateContent({
        model: selectedModel,
        contents: prompt
      });
      
      const newContent = response.text;
      setResult(newContent);
      
      // Update history
      if (activeHistoryId) {
        setHistory(prev => prev.map(item => 
          item.id === activeHistoryId ? { ...item, content: newContent } : item
        ));
      }
      
      alert(`Naskah berhasil di${action === 'extend' ? 'perpanjang' : 'perpendek'}!`);
      
    } catch (error) {
      console.error('Error adjusting duration:', error);
      alert('Gagal menyesuaikan durasi. Periksa koneksi internet.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAutoFix = async (suggestion?: any) => {
    if (!result.trim() || !analysisResult.trim()) return;
    
    setIsFixing(true);
    
    try {
      let newContent = result;

      if (suggestion) {
        // Surgical fix for a specific suggestion
        const { original_segment, suggested_replacement } = suggestion;
        if (newContent.includes(original_segment)) {
          newContent = newContent.replace(original_segment, suggested_replacement);
        } else {
          // Fallback if exact match fails: ask AI to perform the replacement surgically
          const activeKey = customApiKey || process.env.GEMINI_API_KEY;
          const ai = new GoogleGenAI({ apiKey: activeKey });
          const fixPrompt = `
            Tugas: Ganti bagian naskah berikut secara SURGICAL (hanya bagian itu saja).
            
            BAGIAN YANG INGIN DIGANTI:
            "${original_segment}"
            
            PENGGANTI:
            "${suggested_replacement}"
            
            NASKAH LENGKAP:
            """
            ${result}
            """
            
            Output HANYA naskah lengkap hasil perbaikan.
          `;
          const response = await ai.models.generateContent({
            model: selectedModel,
            contents: fixPrompt,
          });
          newContent = response.text || result;
        }
      } else {
        // Global fix based on all suggestions (if no specific suggestion provided)
        const activeKey = customApiKey || process.env.GEMINI_API_KEY;
        const ai = new GoogleGenAI({ apiKey: activeKey });
        const fixPrompt = `
          Anda adalah editor naskah profesional. Perbaiki naskah berikut secara cerdas berdasarkan analisis ini:
          ${analysisResult}
          
          NASKAH:
          """
          ${result}
          """
          
          INSTRUKSI:
          1. Lakukan perbaikan SURGICAL (hanya bagian yang lemah).
          2. JANGAN tulis ulang seluruhnya jika tidak perlu.
          3. Pertahankan gaya asli user namun tingkatkan retorikanya.
          4. Output HANYA naskah hasil perbaikan.
        `;
        const response = await ai.models.generateContent({
          model: selectedModel,
          contents: fixPrompt,
        });
        newContent = response.text || result;
      }

      setResult(newContent);
      
      // Update history
      if (activeHistoryId) {
         setHistory(prev => prev.map(item => 
           item.id === activeHistoryId ? { ...item, content: newContent } : item
         ));
      }
      
      if (!suggestion) setShowAnalysis(false);
      
    } catch (error) {
      console.error('Error fixing khotbah:', error);
      alert('Gagal memperbaiki naskah.');
    } finally {
      setIsFixing(false);
    }
  };

  const handleAnnotateLocally = useCallback(() => {
    if (!result.trim()) return;
    
    // Simple local annotation logic
    let annotated = result;
    
    // 1. Add [PAUSE:Short] after commas
    annotated = annotated.replace(/,\s*/g, ', [PAUSE:Short] ');
    
    // 2. Add [PAUSE:Long] after periods, question marks, exclamation marks
    annotated = annotated.replace(/([.?!])\s*/g, '$1 [PAUSE:Long]\n\n');
    
    // 3. Add basic TONE markers based on keywords
    const tegasKeywords = ['ingatlah', 'wahai', 'awas', 'jangan', 'haram', 'dosa'];
    const lembutKeywords = ['kasih', 'sayang', 'ampunan', 'surga', 'rahmat', 'lembut'];
    
    const lines = annotated.split('\n');
    const processedLines = lines.map(line => {
      const lower = line.toLowerCase();
      if (tegasKeywords.some(k => lower.includes(k))) {
        return '[TONE:Tegas] ' + line;
      }
      if (lembutKeywords.some(k => lower.includes(k))) {
        return '[TONE:Lembut] ' + line;
      }
      return line;
    });
    
    const finalResult = processedLines.join('\n');
    setResult(finalResult);
    if (activeHistoryId) {
      setHistory(prev => prev.map(h => h.id === activeHistoryId ? { ...h, content: finalResult } : h));
    }
  }, [result, activeHistoryId]);

  const handleAnnotate = async () => {
    if (!result.trim()) return;
    setIsAnnotating(true);
    try {
      const activeKey = customApiKey || process.env.GEMINI_API_KEY;
      const ai = new GoogleGenAI({ apiKey: activeKey });
      
      const prompt = `
      Anda adalah asisten pelatih vokal dan retorika khotbah.
      Tugas Anda adalah menganalisis teks khotbah berikut dan menambahkan penanda (marker) visual untuk panduan cara membacanya.

      ATURAN PENANDA (GUNAKAN FORMAT INI PERSIS):
      1. Jeda Pendek (ambil napas): Tambahkan tag [PAUSE:Short]
      2. Jeda Panjang (reflektif/perpindahan topik): Tambahkan tag [PAUSE:Long]
      3. Nada Lembut/Empati: Tambahkan tag [TONE:Lembut] di awal kalimat/paragraf.
      4. Nada Tegas/Peringatan: Tambahkan tag [TONE:Tegas] di awal kalimat/paragraf.
      5. Nada Reflektif/Merenung: Tambahkan tag [TONE:Reflektif] di awal kalimat/paragraf.
      6. Penekanan Kata (Highlight): Apit 1-2 kata penting per paragraf dengan tag [TEKAN]kata[/TEKAN].

      INSTRUKSI PEMROSESAN:
      1. Pecah kalimat yang terlalu panjang menjadi baris-baris pendek (sekitar 3-6 kata per baris) agar natural saat diucapkan (tambahkan enter/newline).
      2. Letakkan [PAUSE:Short] di akhir setiap penggalan baris tersebut.
      3. Letakkan [PAUSE:Long] di akhir kalimat yang memuat konsep berat (kematian, akhirat, dosa, taqwa).
      4. JANGAN mengubah, menambah, atau mengurangi isi teks aslinya. Hanya tambahkan tag dan format baris (enter).
      5. JANGAN mengubah format teks Arab (biarkan dalam block \`\`\`arabic).
      6. Output HANYA teks yang sudah diberi penanda, tanpa penjelasan apapun.

      TEKS KHOTBAH:
      ${result}
      `;

      const response = await ai.models.generateContent({
        model: selectedModel,
        contents: prompt,
      });

      if (response.text) {
        setResult(response.text);
        if (activeHistoryId) {
          setHistory(prev => prev.map(h => h.id === activeHistoryId ? { ...h, content: response.text } : h));
        }
      }
    } catch (error) {
      console.error("Error annotating:", error);
      alert("Gagal membuat panduan baca. Periksa koneksi internet Anda.");
    } finally {
      setIsAnnotating(false);
    }
  };

  const deleteHistoryItem = (id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  const updateHistoryItem = (id: string, updates: Partial<KhotbahData>) => {
    setHistory(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const openHistoryItem = (item: KhotbahData) => {
    setResult(item.content);
    setTema(item.tema);
    setJenis(item.jenis);
    setActiveHistoryId(item.id);
    setAnalysisResult(item.analysisResult || '');
    
    if (item.coverData) {
      setCoverData(item.coverData);
    } else {
      setCoverData({
        show: true,
        title: item.tema,
        subtitle: '',
        author: userProfile?.name || '',
        location: userProfile?.mosque || '',
        date: item.date,
        toc: '',
        imageUrl: '',
        layout: 'text'
      });
    }
    
    if (item.watermark) {
      setWatermark(item.watermark);
    } else {
      setWatermark({ text: '', showOnAllPages: false });
    }

    setStartInEditMode(false);
    setCurrentScreen('result');
    if (window.innerWidth < 768) {
      setZoom(Math.floor((window.innerWidth / 794) * 100)); // Exactly fit screen
    } else if (styleSettings?.responsivePreview === 'fit') {
      setZoom(Math.min(150, Math.floor(((window.innerWidth - 64) / 794) * 100)));
    }
  };

  const openHistoryItemById = (id: string) => {
    const item = history.find(h => h.id === id);
    if (item) openHistoryItem(item);
  };

  if (isAppLoading) {
    return (
      <div className="h-screen w-full bg-emerald-600 flex flex-col items-center justify-center relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,_rgba(255,255,255,1)_0%,_rgba(255,255,255,0)_100%)]"></div>
        </div>
        
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative z-10 flex flex-col items-center"
        >
          <div className="w-24 h-24 bg-white rounded-3xl shadow-2xl flex items-center justify-center mb-6 relative overflow-hidden">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 bg-gradient-to-tr from-emerald-100 to-emerald-50 opacity-50"
            />
            <BookOpen className="w-12 h-12 text-emerald-600 relative z-10" />
          </div>
          
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-4xl font-bold text-white mb-2 tracking-tight"
          >
            Khotbah<span className="text-emerald-200">AI</span>
          </motion.h1>
          
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="text-emerald-100 font-medium tracking-wide text-sm uppercase"
          >
            Asisten Penulis Naskah
          </motion.p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
          className="absolute bottom-12 flex flex-col items-center"
        >
          <div className="flex gap-2 mb-3">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{ 
                  scale: [1, 1.5, 1],
                  opacity: [0.3, 1, 0.3]
                }}
                transition={{ 
                  duration: 1, 
                  repeat: Infinity, 
                  delay: i * 0.2 
                }}
                className="w-2 h-2 bg-white rounded-full"
              />
            ))}
          </div>
          <p className="text-emerald-200/60 text-xs">Memuat data...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-slate-50 flex flex-col overflow-hidden">
      {/* Main Content Area */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          {currentScreen === 'home' && (
            <motion.div 
              key="home"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="h-full overflow-y-auto touch-scroll"
            >
              <HomeScreen 
                tema={tema} setTema={setTema}
                jenis={jenis} setJenis={setJenis}
                audiens={audiens} setAudiens={setAudiens}
                durasi={durasi} setDurasi={setDurasi}
                readingSpeed={readingSpeed} setReadingSpeed={setReadingSpeed}
                customWpm={customWpm} setCustomWpm={setCustomWpm}
                setShowCalibrationModal={setShowCalibrationModal}
                hookType={hookType} setHookType={setHookType}
                emosi={emosi} setEmosi={setEmosi}
                penutupType={penutupType} setPenutupType={setPenutupType}
                struktur={struktur} setStruktur={setStruktur}
                gayaPembicara={gayaPembicara} setGayaPembicara={setGayaPembicara}
                terjemahanMukadimah={terjemahanMukadimah} setTerjemahanMukadimah={setTerjemahanMukadimah}
                latinMukadimah={latinMukadimah} setLatinMukadimah={setLatinMukadimah}
                gayaDoa={gayaDoa} setGayaDoa={setGayaDoa}
                bahasaDoa={bahasaDoa} setBahasaDoa={setBahasaDoa}
                kepadatanDalil={kepadatanDalil} setKepadatanDalil={setKepadatanDalil}
                sapaanJamaah={sapaanJamaah} setSapaanJamaah={setSapaanJamaah}
                customSapaan={customSapaan} setCustomSapaan={setCustomSapaan}
                targetDoaKhusus={targetDoaKhusus} setTargetDoaKhusus={setTargetDoaKhusus}
                useSunnahTemplate={useSunnahTemplate} setUseSunnahTemplate={setUseSunnahTemplate}
                showBlueprint={showBlueprint} setShowBlueprint={setShowBlueprint}
                includeUlamaQuotes={includeUlamaQuotes} setIncludeUlamaQuotes={setIncludeUlamaQuotes}
                handleGenerate={handleGenerate}
                handleManualCreate={handleManualCreate}
                selectedModel={selectedModel}
                setSelectedModel={setSelectedModel}
                MODELS={MODELS}
                customApiKey={customApiKey}
                usePersonalReferences={usePersonalReferences}
                setUsePersonalReferences={setUsePersonalReferences}
                referencesCount={references.length}
                useTurboMode={useTurboMode}
                setUseTurboMode={setUseTurboMode}
                language={language}
                setLanguage={setLanguage}
                LANGUAGES={LANGUAGES}
                targetWordCount={targetWordCount}
              />
            </motion.div>
          )}

          {currentScreen === 'reference' && (
            <motion.div 
              key="reference"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="h-full overflow-hidden"
            >
              <ReferenceScreen 
                apiKey={customApiKey} 
                sunnahKey={sunnahKey} 
                references={references}
                setReferences={setReferences}
                setCurrentScreen={setCurrentScreen}
                onNavigateToBook={() => setCurrentScreen('library')}
              />
            </motion.div>
          )}

          {currentScreen === 'library' && (
            <motion.div 
              key="library"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="h-full"
            >
              <LibraryScreen 
                onBack={() => { setActiveTab('home'); setCurrentScreen('home'); }} 
                onAddToReference={(content, name) => {
                  const newRef: ReferenceFile = {
                    id: `ref-${Date.now()}`,
                    name: name,
                    type: 'markdown',
                    content: content,
                    size: content.length,
                    uploadDate: new Date()
                  };
                  setReferences([...references, newRef]);
                }}
              />
            </motion.div>
          )}

          {currentScreen === 'practice' && (
            <motion.div
              key="practice"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="h-full"
            >
              <PracticeScreen 
                apiKey={customApiKey || process.env.GEMINI_API_KEY || ''}
                textToRead={result}
                onBack={() => { setActiveTab('home'); setCurrentScreen('home'); }}
                history={history}
              />
            </motion.div>
          )}

          {currentScreen === 'history' && (
            <motion.div 
              key="history"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="h-full"
            >
              <HistoryScreen 
                history={history} 
                openHistoryItem={openHistoryItem} 
                deleteHistoryItem={deleteHistoryItem} 
                updateHistoryItem={updateHistoryItem}
                resumeGeneration={resumeGeneration}
              />
            </motion.div>
          )}

          {currentScreen === 'settings' && (
            <motion.div 
              key="settings"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="h-full"
            >
              <SettingsScreen 
                apiKey={customApiKey}
                setApiKey={setCustomApiKey}
                customBaseUrl={customBaseUrl}
                setCustomBaseUrl={setCustomBaseUrl}
                apiKeyType={apiKeyType}
                sunnahKey={sunnahKey}
                setSunnahKey={setSunnahKey}
                userProfile={userProfile}
                setUserProfile={setUserProfile}
                selectedModel={selectedModel}
                setSelectedModel={setSelectedModel}
                customModelId={customModelId}
                setCustomModelId={setCustomModelId}
                scannedModels={scannedModels}
                setScannedModels={setScannedModels}
                manualModels={manualModels}
                setManualModels={setManualModels}
                styleSettings={styleSettings}
                setStyleSettings={setStyleSettings}
                clearAllHistory={clearAllHistory}
                onOpenApiKeyModal={() => setShowApiKeyModal(true)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Overlays */}
        <AnimatePresence>
          {currentScreen === 'result' && (
            <ResultScreen 
              key="result"
              apiKey={customApiKey || process.env.GEMINI_API_KEY}
              isGenerating={isGenerating}
              startInEditMode={startInEditMode}
              result={result}
              setResult={setResult}
              handleSave={handleSave}
              selectedModel={selectedModel}
              customModelId={customModelId}
              setCurrentScreen={setCurrentScreen}
              activeHistoryId={activeHistoryId}
              history={history}
              updateHistoryItem={updateHistoryItem}
              tema={tema}
              language={language}
              paperSize={paperSize}
              setPaperSize={setPaperSize}
              zoom={zoom}
              setZoom={setZoom}
              fontFamily={styleSettings.latin.fontFamily}
              setFontFamily={setFontFamily}
              textAlign={textAlign}
              setTextAlign={setTextAlign}
              lineHeight={styleSettings.latin.lineHeight}
              setLineHeight={setLineHeight}
              paperTemplate={paperTemplate}
              setPaperTemplate={setPaperTemplate}
              fontSize={styleSettings.latin.fontSize}
              setFontSize={setFontSize}
              showDalilSearch={showDalilSearch}
              setShowDalilSearch={setShowDalilSearch}
              dalilQuery={dalilQuery}
              setDalilQuery={setDalilQuery}
              dalilResults={dalilResults}
              isSearchingDalil={isSearchingDalil}
              handleSearchDalil={handleSearchDalil}
              handleShare={handleShare}
              handleCopy={handleCopy}
              isCopied={isCopied}
              handlePrintPdf={handlePrintPdf}
              handleAnalyze={handleAnalyze}
              showAnalysis={showAnalysis}
              setShowAnalysis={setShowAnalysis}
              isAnalyzing={isAnalyzing}
              analysisResult={analysisResult}
              handleAutoFix={handleAutoFix}
              terjemahanMukadimah={terjemahanMukadimah}
              latinMukadimah={latinMukadimah}
              isFixing={isFixing}
              setIsFixing={setIsFixing}
              arabicFontFamily={styleSettings.arabic.fontFamily}
              setArabicFontFamily={setArabicFontFamily}
              customFontUrl={customFontUrl}
              setCustomFontUrl={setCustomFontUrl}
              styleSettings={styleSettings}
              setStyleSettings={setStyleSettings}
              handleAnnotate={handleAnnotate}
              handleAnnotateLocally={handleAnnotateLocally}
              isAnnotating={isAnnotating}
              coverData={coverData}
              setCoverData={setCoverData}
              watermark={watermark}
              setWatermark={setWatermark}
              userProfile={userProfile}
              handleAiDuration={handleAiDuration}
              customWpm={customWpm}
              readingSpeed={readingSpeed}
              durasi={durasi}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Navigation (Only visible on main tabs) */}
      {!['result'].includes(currentScreen) && (
        <BottomNav 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          setCurrentScreen={setCurrentScreen} 
        />
      )}

      <ApiKeyModal 
        isOpen={showApiKeyModal}
        onClose={() => setShowApiKeyModal(false)}
        onSave={(key) => {
          setCustomApiKey(key);
          localStorage.setItem('custom_api_key', key);
        }}
        currentKey={customApiKey}
      />

      <CalibrationModal
        isOpen={showCalibrationModal}
        onClose={() => setShowCalibrationModal(false)}
        onSave={(wpm) => {
          setCustomWpm(wpm);
          setShowCalibrationModal(false);
        }}
      />

      <FloatingTaskWidget currentScreen={currentScreen} onOpenTask={openHistoryItemById} />
    </div>
  );
}
