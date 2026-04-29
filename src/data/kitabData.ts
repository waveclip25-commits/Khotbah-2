export interface KitabChapter {
  title: string;
  arabic?: string;
  translation: string;
  explanation: string;
}

export interface Kitab {
  id: string;
  name: string;
  author: string;
  category: string;
  description: string;
  isPremium?: boolean; // New flag for premium books
  coverColor?: string; // For visual shelf
  chapters: KitabChapter[];
}

export const KITAB_DATABASE: Kitab[] = [
  // --- KITAB INDUK HADITS (KUTUBUS SITTAH) ---
  {
    id: 'bukhari',
    name: 'Shahih Bukhari',
    author: 'Imam Bukhari',
    category: 'Hadits Shahih',
    description: 'Kitab hadits paling shahih setelah Al-Quran. Berisi ribuan hadits pilihan.',
    isPremium: true,
    coverColor: 'bg-emerald-700',
    chapters: [
      {
        title: "Bab Permulaan Wahyu",
        arabic: "إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ",
        translation: "Semua perbuatan tergantung niatnya.",
        explanation: "Hadits pertama dalam Shahih Bukhari yang menekankan pentingnya ikhlas dalam setiap amal ibadah."
      },
      {
        title: "Bab Iman",
        arabic: "الإِيمَانُ بِضْعٌ وَسِتُّونَ شُعْبَةً",
        translation: "Iman itu ada enam puluh lebih cabang.",
        explanation: "Menjelaskan bahwa iman bukan hanya satu dimensi, tapi mencakup banyak aspek kehidupan."
      }
    ]
  },
  {
    id: 'muslim',
    name: 'Shahih Muslim',
    author: 'Imam Muslim',
    category: 'Hadits Shahih',
    description: 'Rujukan utama kedua. Fokus pada matan dan sanad yang kuat.',
    isPremium: true,
    coverColor: 'bg-emerald-600',
    chapters: [
      {
        title: "Bab Keutamaan Wudhu",
        arabic: "الطُّهُورُ شَطْرُ الإِيمَانِ",
        translation: "Kesucian itu adalah setengah dari iman.",
        explanation: "Hadits yang menekankan pentingnya kebersihan lahir dan batin dalam Islam."
      }
    ]
  },
  {
    id: 'abudaud',
    name: 'Sunan Abu Daud',
    author: 'Imam Abu Daud',
    category: 'Hadits Sunan',
    description: 'Fokus pada hadits-hadits hukum (Ahkam).',
    isPremium: true,
    coverColor: 'bg-slate-700',
    chapters: []
  },
  {
    id: 'tirmidzi',
    name: 'Jami\' At-Tirmidzi',
    author: 'Imam Tirmidzi',
    category: 'Hadits Sunan',
    description: 'Mencakup hadits hukum, adab, dan tafsir dengan penjelasan derajat hadits.',
    isPremium: true,
    coverColor: 'bg-slate-600',
    chapters: []
  },
  {
    id: 'nasai',
    name: 'Sunan An-Nasai',
    author: 'Imam An-Nasai',
    category: 'Hadits Sunan',
    description: 'Dikenal dengan seleksi sanad yang sangat ketat.',
    isPremium: true,
    coverColor: 'bg-teal-700',
    chapters: []
  },
  {
    id: 'ibnumajah',
    name: 'Sunan Ibnu Majah',
    author: 'Imam Ibnu Majah',
    category: 'Hadits Sunan',
    description: 'Pelengkap Kutubus Sittah dengan banyak tambahan hadits unik.',
    isPremium: true,
    coverColor: 'bg-teal-600',
    chapters: []
  },

  // --- KITAB POPULER (OFFLINE READY) ---
  {
    id: 'riyadhus',
    name: 'Riyadhus Shalihin',
    author: 'Imam An-Nawawi',
    category: 'Hadits & Adab',
    description: 'Taman orang-orang shalih. Panduan lengkap adab dan akhlak.',
    coverColor: 'bg-amber-600',
    chapters: [
      {
        title: "Bab Ikhlas & Niat",
        arabic: "إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ، وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى",
        translation: "Sesungguhnya amal itu tergantung niatnya, dan setiap orang mendapatkan sesuai apa yang ia niatkan. (HR. Bukhari & Muslim)",
        explanation: "Niat adalah pondasi. Amal besar bisa jadi debu karena salah niat, amal kecil bisa jadi gunung karena niat yang benar."
      },
      {
        title: "Bab Taubat",
        arabic: "يَا أَيُّهَا الَّذِينَ آمَنُوا تُوبُوا إِلَى اللَّهِ تَوْبَةً نَصُوحًا",
        translation: "Wahai orang-orang yang beriman, bertaubatlah kepada Allah dengan taubat yang semurni-murninya. (QS. At-Tahrim: 8)",
        explanation: "Syarat taubat: Menyesal, berhenti maksiat, dan bertekad tidak mengulangi. Jika hak Adam, kembalikan haknya."
      },
      {
        title: "Bab Sabar",
        arabic: "وَاصْبِرْ وَمَا صَبْرُكَ إِلَّا بِاللَّهِ",
        translation: "Dan bersabarlah, dan tiadalah kesabaranmu itu melainkan dengan pertolongan Allah. (QS. An-Nahl: 127)",
        explanation: "Sabar bukan berarti lemah, tapi menahan diri dari keluh kesah dan tetap taat saat diuji."
      }
    ]
  },
  {
    id: 'hikam',
    name: 'Al-Hikam',
    author: 'Ibnu Athaillah',
    category: 'Tazkiyatun Nafs',
    description: 'Mutiara hikmah tingkat tinggi untuk menenangkan jiwa.',
    coverColor: 'bg-indigo-600',
    chapters: [
      {
        title: "Tanda Bergantung pada Amal",
        arabic: "مِنْ عَلامَةِ الاعْتِمادِ عَلى العَمَلِ نُقْصانُ الرَّجاءِ عِنْدَ وُجودِ الزَّلَلِ",
        translation: "Salah satu tanda bergantung pada amal adalah berkurangnya harapan (kepada Allah) ketika terjadi kesalahan (dosa).",
        explanation: "Jangan merasa aman karena amal baikmu, dan jangan putus asa karena dosamu. Bergantunglah murni pada rahmat Allah."
      },
      {
        title: "Ikhlas yang Murni",
        arabic: "لا تَطْلُبْ عِوَضاً عَلى عَمَلٍ لَسْتَ لَهُ فاعِلاً، يَكْفيكَ مِنَ الجَزاءِ أَنْ قَبِلَكَ لَهُ أَهْلاً",
        translation: "Jangan menuntut upah atas amal yang bukan engkau pelakunya (tapi Allah yang menggerakkanmu). Cukuplah balasan bagimu bahwa Allah menerima engkau layak untuk beramal itu.",
        explanation: "Amal itu anugerah Allah. Bisa sholat saja sudah nikmat, jangan tuntut surga sebagai 'bayaran', tapi harapkan sebagai rahmat."
      }
    ]
  },
  {
    id: 'arbain',
    name: 'Arba\'in Nawawi',
    author: 'Imam An-Nawawi',
    category: 'Hadits Pokok',
    description: '42 Hadits yang menjadi pondasi ajaran Islam.',
    coverColor: 'bg-rose-600',
    chapters: [
      {
        title: "Hadits 1: Niat",
        arabic: "إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ",
        translation: "Sesungguhnya setiap amalan tergantung pada niatnya.",
        explanation: "Hadits ini adalah sepertiga ilmu Islam. Memperbaiki hati sebelum beramal."
      },
      {
        title: "Hadits 2: Islam, Iman, Ihsan",
        translation: "Jibril bertanya tentang Islam, Iman, dan Ihsan...",
        explanation: "Kerangka dasar agama: Rukun Islam (Fisik), Rukun Iman (Hati), dan Ihsan (Spiritualitas/Muraqabah)."
      }
    ]
  },
  // --- KITAB TAFSIR ---
  {
    id: 'tafsir-jalalayn',
    name: 'Tafsir Jalalayn',
    author: 'Imam Jalaluddin al-Mahalli & as-Suyuthi',
    category: 'Tafsir',
    description: 'Tafsir ringkas yang sangat populer di kalangan penuntut ilmu.',
    coverColor: 'bg-emerald-900',
    chapters: [
      {
        title: "Surah Al-Fatihah",
        arabic: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
        translation: "Dengan menyebut nama Allah Yang Maha Pemurah lagi Maha Penyayang.",
        explanation: "Tafsir Jalalayn menjelaskan bahwa Basmalah adalah bagian dari surah ini. Al-Fatihah disebut Ummul Kitab."
      }
    ]
  },
  {
    id: 'tafsir-ibnu-katsir',
    name: 'Tafsir Ibnu Katsir (Ringkasan)',
    author: 'Imam Ibnu Katsir',
    category: 'Tafsir',
    description: 'Tafsir paling otoritatif yang merujuk pada ayat dan hadits.',
    coverColor: 'bg-emerald-800',
    chapters: [
      {
        title: "Keutamaan Al-Baqarah",
        translation: "Rumah yang dibacakan surah Al-Baqarah tidak akan dimasuki setan.",
        explanation: "Ibnu Katsir menekankan pentingnya memahami makna ayat melalui riwayat yang shahih."
      }
    ]
  }
];
