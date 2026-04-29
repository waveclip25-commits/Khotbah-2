import Dexie, { Table } from 'dexie';

export interface Book {
  id: string; // e.g., 'bukhari'
  title: string;
  author: string;
  sourceUrl: string;
  isDownloaded: boolean;
  totalHadiths: number;
  category: 'hadits' | 'tafsir' | 'fiqh' | 'doa' | 'sirah' | 'akhlak' | 'lainnya';
  sourceType?: 'drive' | 'url' | 'api';
}

export interface Hadith {
  id?: number; // Auto-increment primary key
  bookId: string;
  number: string | number;
  arab: string;
  id_translation: string; // Indonesian translation
  title?: string; // Optional title for Doa/Sirah
}

export interface Bookmark {
  id?: number;
  bookId: string;
  itemNumber: string | number;
  title: string;
  createdAt: number;
}

export interface Note {
  id?: number;
  bookId: string;
  itemNumber: string | number;
  content: string;
  createdAt: number;
  updatedAt: number;
}

export class HadithDatabase extends Dexie {
  books!: Table<Book>;
  hadiths!: Table<Hadith>;
  bookmarks!: Table<Bookmark>;
  notes!: Table<Note>;
  collectedDoas!: Table<DoaItemModel>;

  constructor() {
    super('HadithDatabase');
    this.version(5).stores({
      books: 'id, title, category',
      hadiths: '++id, bookId, number, [bookId+number]', // Compound index for fast lookup
      bookmarks: '++id, bookId, itemNumber, [bookId+itemNumber]',
      notes: '++id, bookId, itemNumber, [bookId+itemNumber]',
      collectedDoas: '++id, type, reference, tema, createdAt, arabic'
    });
  }
}

export interface DoaItemModel {
  id?: number;
  arabic: string;
  latin?: string;
  translation: string;
  type: string;
  reference?: string;
  createdAt: number;
  tema?: string;
}

export const db = new HadithDatabase();

export const AVAILABLE_BOOKS = [
  // Hadits
  { id: 'kitab-tisah-bundle', title: 'Bundle Kitab Tis\'ah (9 Kitab)', author: 'Imam-Imam Hadits', driveId: 'https://cdn.jsdelivr.net/gh/thebayknigth087-boop/Kitabul-Tis-ah@main/books.zip', category: 'hadits', sourceType: 'zip' },
  { id: 'bukhari', title: 'Shahih Bukhari', author: 'Imam Bukhari', driveId: 'https://raw.githubusercontent.com/gadingnst/hadith-api/master/books/bukhari.json', category: 'hadits', sourceType: 'url', bundleUrl: 'https://cdn.jsdelivr.net/gh/thebayknigth087-boop/Kitabul-Tis-ah@main/books.zip' },
  { id: 'muslim', title: 'Shahih Muslim', author: 'Imam Muslim', driveId: 'https://raw.githubusercontent.com/gadingnst/hadith-api/master/books/muslim.json', category: 'hadits', sourceType: 'url', bundleUrl: 'https://cdn.jsdelivr.net/gh/thebayknigth087-boop/Kitabul-Tis-ah@main/books.zip' },
  { id: 'abu-dawud', title: 'Sunan Abu Dawud', author: 'Imam Abu Dawud', driveId: 'https://raw.githubusercontent.com/gadingnst/hadith-api/master/books/abu-daud.json', category: 'hadits', sourceType: 'url', bundleUrl: 'https://cdn.jsdelivr.net/gh/thebayknigth087-boop/Kitabul-Tis-ah@main/books.zip' },
  { id: 'tirmidzi', title: 'Sunan Tirmidzi', author: 'Imam Tirmidzi', driveId: 'https://raw.githubusercontent.com/gadingnst/hadith-api/master/books/tirmidzi.json', category: 'hadits', sourceType: 'url', bundleUrl: 'https://cdn.jsdelivr.net/gh/thebayknigth087-boop/Kitabul-Tis-ah@main/books.zip' },
  { id: 'nasai', title: 'Sunan Nasai', author: 'Imam Nasai', driveId: 'https://raw.githubusercontent.com/gadingnst/hadith-api/master/books/nasai.json', category: 'hadits', sourceType: 'url', bundleUrl: 'https://cdn.jsdelivr.net/gh/thebayknigth087-boop/Kitabul-Tis-ah@main/books.zip' },
  { id: 'ibnu-majah', title: 'Sunan Ibnu Majah', author: 'Imam Ibnu Majah', driveId: 'https://raw.githubusercontent.com/gadingnst/hadith-api/master/books/ibnu-majah.json', category: 'hadits', sourceType: 'url', bundleUrl: 'https://cdn.jsdelivr.net/gh/thebayknigth087-boop/Kitabul-Tis-ah@main/books.zip' },
  { id: 'ahmad', title: 'Musnad Ahmad', author: 'Imam Ahmad', driveId: 'https://raw.githubusercontent.com/gadingnst/hadith-api/master/books/ahmad.json', category: 'hadits', sourceType: 'url', bundleUrl: 'https://cdn.jsdelivr.net/gh/thebayknigth087-boop/Kitabul-Tis-ah@main/books.zip' },
  { id: 'malik', title: 'Muwatha Malik', author: 'Imam Malik', driveId: 'https://raw.githubusercontent.com/gadingnst/hadith-api/master/books/malik.json', category: 'hadits', sourceType: 'url', bundleUrl: 'https://cdn.jsdelivr.net/gh/thebayknigth087-boop/Kitabul-Tis-ah@main/books.zip' },
  { id: 'darimi', title: 'Sunan Darimi', author: 'Imam Darimi', driveId: 'https://raw.githubusercontent.com/gadingnst/hadith-api/master/books/darimi.json', category: 'hadits', sourceType: 'url', bundleUrl: 'https://cdn.jsdelivr.net/gh/thebayknigth087-boop/Kitabul-Tis-ah@main/books.zip' },
  
  // Doa & Dzikir
  { id: 'hisnul-muslim', title: 'Hisnul Muslim', author: 'Sa\'id bin Ali bin Wahf Al-Qahthani', driveId: 'https://raw.githubusercontent.com/penggguna/islamic-api/master/data/doa/hisnul-muslim.json', category: 'doa', sourceType: 'url' },
  { id: 'doa-harian', title: 'Kumpulan Doa Harian', author: 'Tim Dakwah', driveId: 'https://raw.githubusercontent.com/penggguna/islamic-api/master/data/doa/doa-harian.json', category: 'doa', sourceType: 'url' },
  { id: 'dzikir-pagi-petang', title: 'Dzikir Pagi & Petang', author: 'Sesuai Sunnah', driveId: 'https://raw.githubusercontent.com/penggguna/islamic-api/master/data/doa/dzikir-pagi-petang.json', category: 'doa', sourceType: 'url' },

  // Fiqh
  { id: 'bulughul-maram', title: 'Bulughul Maram', author: 'Ibnu Hajar Al-Asqalani', driveId: 'https://raw.githubusercontent.com/penggguna/islamic-api/master/data/fiqh/bulughul-maram.json', category: 'fiqh', sourceType: 'url' },
  { id: 'riyadhus-shalihin', title: 'Riyadhus Shalihin', author: 'Imam An-Nawawi', driveId: 'https://raw.githubusercontent.com/penggguna/islamic-api/master/data/fiqh/riyadhus-shalihin.json', category: 'fiqh', sourceType: 'url' },
  { id: 'safinatun-najah', title: 'Safinatun Najah', author: 'Syaikh Salim bin Sumair Al-Hadhrami', driveId: 'https://raw.githubusercontent.com/penggguna/islamic-api/master/data/fiqh/safinatun-najah.json', category: 'fiqh', sourceType: 'url' },
  { id: 'matan-ghoyah', title: 'Matan Al-Ghoyah wat Taqrib', author: 'Abu Syuja\'', driveId: 'https://raw.githubusercontent.com/penggguna/islamic-api/master/data/fiqh/matan-ghoyah.json', category: 'fiqh', sourceType: 'url' },

  // Sirah & Akhlak
  { id: 'ar-raheeq', title: 'Ar-Raheeq Al-Makhtum', author: 'Syafiyurrahman Al-Mubarakfuri', driveId: 'https://raw.githubusercontent.com/penggguna/islamic-api/master/data/sirah/ar-raheeq.json', category: 'sirah', sourceType: 'url' },
  { id: 'al-hikam', title: 'Al-Hikam', author: 'Ibnu Athaillah', driveId: 'https://raw.githubusercontent.com/penggguna/islamic-api/master/data/akhlak/al-hikam.json', category: 'akhlak', sourceType: 'url' },
  { id: 'bidayatul-hidayah', title: 'Bidayatul Hidayah', author: 'Imam Al-Ghazali', driveId: 'https://raw.githubusercontent.com/penggguna/islamic-api/master/data/akhlak/bidayatul-hidayah.json', category: 'akhlak', sourceType: 'url' },
  { id: 'ta-lim-muta-allim', title: 'Ta\'lim Muta\'allim', author: 'Syaikh Az-Zarnuji', driveId: 'https://raw.githubusercontent.com/penggguna/islamic-api/master/data/akhlak/ta-lim-muta-allim.json', category: 'akhlak', sourceType: 'url' },
];
