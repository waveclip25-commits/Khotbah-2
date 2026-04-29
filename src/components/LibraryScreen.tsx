import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db, AVAILABLE_BOOKS, Book, Hadith } from '../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Virtuoso } from 'react-virtuoso';
import JSZip from 'jszip';
import { Capacitor } from '@capacitor/core';
import { 
  ArrowLeft, Download, BookOpen, Search, Loader2, Trash2, 
  Upload, Library, Sparkles, Book as BookIcon, 
  Settings, List, X, ChevronRight, Copy, Check,
  Type, Moon, Sun, Palette, Hash, Bookmark, FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { GoogleGenAI } from '@google/genai';
import { QuranReference } from './QuranReference';

interface LibraryScreenProps {
  onBack: () => void;
  onAddToReference?: (content: string, name: string) => void;
  initialBookId?: string;
  initialTab?: 'koleksi' | 'quran' | 'global-search';
  initialSearchQuery?: string;
}

export const LibraryScreen: React.FC<LibraryScreenProps> = ({ 
  onBack, onAddToReference, initialBookId, initialTab, initialSearchQuery 
}) => {
  const ALLOWED_BOOK_IDS = AVAILABLE_BOOKS.map(b => b.id);

  const getProxyUrl = (url: string) => {
    if (Capacitor.isNativePlatform()) {
      return url.replace('/api/quran-proxy/', 'https://api.quran.com/api/v4/')
                .replace('/api/equran-tafsir-proxy/', 'https://equran.id/api/v2/tafsir/')
                .replace('/api/external-proxy?url=', '')
                .replace('/api/proxy-download?id=', 'https://drive.google.com/uc?export=download&id=');
    }
    return url;
  };

  const books = useLiveQuery(() => db.books.toArray());
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(initialBookId || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Hadith[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const bookId = localStorage.getItem('selectedBookId');
    if (bookId) {
      setSelectedBookId(bookId);
      localStorage.removeItem('selectedBookId');
    } else if (initialBookId) {
      setSelectedBookId(initialBookId);
    }
  }, [initialBookId]);

  useEffect(() => {
    if (selectedBookId) {
      localStorage.setItem('lastOpenedBookId', selectedBookId);
    }
  }, [selectedBookId]);

  useEffect(() => {
    const checkBundle = async () => {
      // Check if bundle is downloaded or if we should auto-download
      const bundle = await db.books.get('kitab-tisah-bundle');
      const isAutoMode = localStorage.getItem('auto-download-tisah') === 'true';
      
      if (!bundle?.isDownloaded && isAutoMode) {
        const bundleInfo = AVAILABLE_BOOKS.find(b => b.id === 'kitab-tisah-bundle');
        if (bundleInfo) handleDownload(bundleInfo);
      }
    };
    checkBundle();
  }, []);

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

  useEffect(() => {
    // Cleanup any orphaned Tafsir books that might have been downloaded generically in older versions
    const cleanupTafsirs = async () => {
      const allBooks = await db.books.toArray();
      const tafsirBooks = allBooks.filter(b => b.category === 'tafsir');
      for (const tBook of tafsirBooks) {
        await db.hadiths.where('bookId').equals(tBook.id).delete();
        await db.books.delete(tBook.id);
      }
    };
    cleanupTafsirs();
  }, []);

  // Download Handler
  const handleDownload = async (book: typeof AVAILABLE_BOOKS[0]) => {
    setDownloadingId(book.id);
    setDownloadProgress(0);

    try {
      if (book.sourceType === 'zip' || (book as any).bundleUrl) {
        const zipUrl = (book as any).bundleUrl || book.driveId;
        setDownloadProgress(5);
        
        const response = await fetch(zipUrl);
        if (!response.ok) throw new Error(`Download failed: ${response.statusText}`);
        
        const arrayBuffer = await response.arrayBuffer();
        setDownloadProgress(30);
        
        const zip = await JSZip.loadAsync(arrayBuffer);
        const files = Object.keys(zip.files).filter(name => name.endsWith('.json'));
        setDownloadProgress(40);

        let totalProcessed = 0;
        const bundleResults = [];

        for (const filename of files) {
          const baseName = filename.split('/').pop() || filename;
          const content = await zip.files[filename].async('string');
          const json = JSON.parse(content);
          
          let items: any[] = [];
          if (Array.isArray(json)) items = json;
          else if (json.data && Array.isArray(json.data)) items = json.data;
          else if (json.hadiths && Array.isArray(json.hadiths)) items = json.hadiths;

          if (items.length > 0) {
            const bookId = BUNDLE_MAP[baseName] || baseName.replace('.json', '');
            const bundleBook = AVAILABLE_BOOKS.find(b => b.id === bookId);
            
            console.log(`Processing bundle file: ${baseName} -> mapped to bookId: ${bookId}`);

            if (bundleBook) {
              console.log(`Saving ${items.length} items for ${bundleBook.title}`);
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
              bundleResults.push(bundleBook.id);
            }
          }
          totalProcessed++;
          setDownloadProgress(40 + (totalProcessed / files.length) * 60);
        }

        // Finalize bundle ID itself
        await db.books.put({
          id: 'kitab-tisah-bundle',
          title: 'Bundle Kitab Tis\'ah (9 Kitab)',
          author: 'Imam-Imam Hadits',
          sourceUrl: book.driveId,
          isDownloaded: true,
          totalHadiths: 9,
          category: 'hadits'
        });

        setDownloadProgress(100);
        // Force state update to refresh UI
        setTimeout(() => {
          setDownloadingId(null);
          setDownloadProgress(0);
        }, 500);
        return;
      }

      // 1. Fetch via Proxy, Direct URL, or API
      let items = [];
      if (book.sourceType === 'api') {
        setDownloadProgress(5);
        let totalItems = 0;

        // 0. Clear existing data for this book to ensure clean state
        await db.hadiths.where('bookId').equals(book.id).delete();
        console.log(`Cleared existing data for ${book.id}`);

        // 1. Create/Update Book Metadata first (not yet fully downloaded)
        await db.books.put({
          id: book.id,
          title: book.title,
          author: book.author,
          sourceUrl: book.driveId,
          isDownloaded: false,
          totalHadiths: 0,
          category: book.category as any
        });

        if (book.id === 'equran-tafsir') {
          for (let ch = 1; ch <= 114; ch++) {
            let retries = 3;
            let res;
            while (retries > 0) {
              try {
                res = await fetch(getProxyUrl(`/api/equran-tafsir-proxy/${ch}`));
                if (res.ok) break;
              } catch (e) {
                console.warn(`Retry ${3 - retries + 1} for surah ${ch} failed:`, e);
              }
              retries--;
              if (retries > 0) await new Promise(resolve => setTimeout(resolve, 1000));
            }

            if (!res || !res.ok) {
              console.warn(`Failed to fetch equran-tafsir surah ${ch} after retries`);
              continue;
            }

            try {
              const jsonResponse = await res.json();
              const surahData = jsonResponse.data || jsonResponse;
              
              const tafsirItems = surahData.tafsir || surahData.tafsirs || (Array.isArray(surahData) ? surahData : null);
              
              if (tafsirItems && Array.isArray(tafsirItems)) {
                const batch = tafsirItems.map((t: any) => ({
                  bookId: book.id,
                  number: `${ch}:${t.ayat || t.verse_number || t.number}`,
                  arab: t.arab || t.arabic || t.text_arab || '',
                  id_translation: t.teks || t.text || t.translation || t.idn || '',
                  title: t.title || `Surah ${ch} Ayat ${t.ayat || t.verse_number || ''}`
                }));
                
                if (batch.length > 0) {
                  await db.hadiths.bulkPut(batch);
                  totalItems += batch.length;
                }
              }
              await new Promise(resolve => setTimeout(resolve, 50));
            } catch (e) {
              console.error(`Failed to process equran-tafsir surah ${ch}:`, e);
            }
            setDownloadProgress(5 + (ch / 114) * 90);
          }
        } else {
          for (let ch = 1; ch <= 114; ch++) {
            let retries = 3;
            let res;
            while (retries > 0) {
              try {
                res = await fetch(getProxyUrl(`/api/quran-proxy/quran/tafsirs/${book.driveId}?chapter_number=${ch}`));
                if (res.ok) break;
              } catch (e) {
                console.warn(`Retry ${3 - retries + 1} for surah ${ch} failed:`, e);
              }
              retries--;
              if (retries > 0) await new Promise(resolve => setTimeout(resolve, 1000));
            }

            if (!res || !res.ok) {
              console.warn(`Failed to fetch tafsir ${book.driveId} surah ${ch} after retries`);
              continue;
            }

            try {
              const data = await res.json();
              const tafsirItems = data.tafsirs || data.tafsir || (Array.isArray(data) ? data : null);
              
              if (tafsirItems && Array.isArray(tafsirItems)) {
                const batch = tafsirItems.map((t: any) => ({
                  bookId: book.id,
                  number: t.verse_key || `${ch}:${t.number || t.ayat}`,
                  arab: t.arab || t.arabic || '',
                  id_translation: t.text || t.teks || t.translation || '',
                  title: t.title || `Surah ${ch} Ayat ${t.verse_key?.split(':')[1] || t.number || t.ayat || ''}`
                }));
                
                if (batch.length > 0) {
                  await db.hadiths.bulkPut(batch);
                  totalItems += batch.length;
                }
              }
              await new Promise(resolve => setTimeout(resolve, 50));
            } catch (e) {
              console.error(`Failed to process tafsir ${book.driveId} surah ${ch}:`, e);
            }
            setDownloadProgress(5 + (ch / 114) * 90);
          }
        }

        if (totalItems === 0) {
          throw new Error('Data kitab kosong atau gagal mengambil data dari API');
        }

        // 2. Mark as completed and update total count
        await db.books.update(book.id, {
          isDownloaded: true,
          totalHadiths: totalItems
        });
        
        console.log(`Download completed for ${book.id}. Total items: ${totalItems}`);
        const verifyCount = await db.hadiths.where('bookId').equals(book.id).count();
        console.log(`Verified count in DB for ${book.id}: ${verifyCount}`);
        
        setDownloadProgress(100);
        return; // Exit early as we've handled the download
      }

      // For non-API sources (Drive/URL), we still use the old buffering method as they are single files
      const downloadUrl = book.sourceType === 'url' 
          ? (book.driveId.includes('raw.githubusercontent.com') ? book.driveId : getProxyUrl(`/api/external-proxy?url=${encodeURIComponent(book.driveId)}`))
          : getProxyUrl(`/api/proxy-download?id=${book.driveId}`);
        
        const response = await fetch(downloadUrl);
        if (!response.ok) {
          let errorDetails = `Status: ${response.status} ${response.statusText}`;
          try {
            const errorData = await response.json();
            errorDetails = errorData.details || errorData.error || errorDetails;
          } catch (e) {
            errorDetails = await response.text() || errorDetails;
          }
          console.error(`Download request failed: ${errorDetails}`);
          throw new Error(`Download failed: ${errorDetails}`);
        }

        let text = '';
        if (response.body && typeof response.body.getReader === 'function') {
          try {
            const reader = response.body.getReader();
            const contentLength = +(response.headers.get('Content-Length') || 0);
            let receivedLength = 0;
            let chunks = [];

            while(true) {
              const { done, value } = await reader.read();
              if (done) break;
              if (value) {
                chunks.push(value);
                receivedLength += value.length;
                setDownloadProgress(contentLength ? (receivedLength / contentLength) * 100 : Math.min((receivedLength / 5000000) * 100, 95));
              }
            }
            const blob = new Blob(chunks);
            text = await blob.text();
          } catch (e) {
             console.warn("Reader failed, using .text()", e);
             text = await response.text();
          }
        } else {
          setDownloadProgress(50);
          text = await response.text();
        }

        let json;
        try {
          json = JSON.parse(text);
        } catch (e) {
          console.error('JSON Parse error:', e);
          throw new Error('Format file tidak valid (Bukan JSON)');
        }

        if (Array.isArray(json)) {
          items = json;
        } else if (json.data && Array.isArray(json.data)) {
          items = json.data;
        } else if (json.hadiths && Array.isArray(json.hadiths)) {
          items = json.hadiths;
        } else if (json.chapters && Array.isArray(json.chapters)) {
          items = json.chapters;
        } else if (typeof json === 'object') {
          const arrayProp = Object.values(json).find(v => Array.isArray(v));
          if (arrayProp) items = arrayProp as any[];
        }
        
        if (items.length === 0) {
          console.error('Parsed JSON structure:', json);
        }

        if (items.length === 0) {
          throw new Error('Data kitab kosong atau format tidak dikenali');
        }
        
        await db.transaction('rw', db.books, db.hadiths, async () => {
        // Add Book Metadata
        await db.books.put({
          id: book.id,
          title: book.title,
          author: book.author,
          sourceUrl: book.driveId,
          isDownloaded: true,
          totalHadiths: items.length,
          category: book.category as any
        });

        // Add Items in Batches
        const batchSize = 500;
        for (let i = 0; i < items.length; i += batchSize) {
          const batch = items.slice(i, i + batchSize).map((h: any, index: number) => ({
            bookId: book.id,
            number: h.number || h.no || h.id || (i + index + 1),
            arab: h.arab || h.arabic || h.text_arab || h.ar || '',
            id_translation: h.id_translation || h.id || h.translation || h.terjemah || h.text || h.content || h.idn || '',
            title: h.title || h.name || h.judul || ''
          }));
          await db.hadiths.bulkAdd(batch);
          setDownloadProgress(90 + (i / items.length) * 10);
        }
      });

      setDownloadProgress(100);
    } catch (error: any) {
      console.error('Download error:', error);
      alert(`Gagal mengunduh kitab: ${error.message}`);
    } finally {
      setDownloadingId(null);
    }
  };

  // Manual Upload Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, bookId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setDownloadingId(bookId);
    setDownloadProgress(50);

    try {
      const text = await file.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch (e) {
        throw new Error('Format file tidak valid (Bukan JSON)');
      }

      let items = [];
      if (Array.isArray(json)) {
        items = json;
      } else if (json.data && Array.isArray(json.data)) {
        items = json.data;
      } else if (json.hadiths && Array.isArray(json.hadiths)) {
        items = json.hadiths;
      } else if (json.chapters && Array.isArray(json.chapters)) {
        items = json.chapters;
      } else if (typeof json === 'object') {
        const arrayProp = Object.values(json).find(v => Array.isArray(v));
        if (arrayProp) items = arrayProp as any[];
      }

      if (items.length === 0) {
        throw new Error('Data kitab kosong atau format tidak dikenali');
      }

      const bookInfo = AVAILABLE_BOOKS.find(b => b.id === bookId)!;

      await db.transaction('rw', db.books, db.hadiths, async () => {
        await db.books.put({
          id: bookId,
          title: bookInfo.title,
          author: bookInfo.author,
          sourceUrl: bookInfo.driveId,
          isDownloaded: true,
          totalHadiths: items.length,
          category: bookInfo.category as any
        });

        const batchSize = 500;
        for (let i = 0; i < items.length; i += batchSize) {
          const batch = items.slice(i, i + batchSize).map((h: any, index: number) => ({
            bookId: bookId,
            number: h.number || h.no || h.id || (i + index + 1),
            arab: h.arab || h.arabic || h.text_arab || h.ar || '',
            id_translation: h.id_translation || h.id || h.translation || h.terjemah || h.text || h.content || h.idn || '',
            title: h.title || h.name || h.judul || ''
          }));
          await db.hadiths.bulkAdd(batch);
          setDownloadProgress(50 + (i / items.length) * 50);
        }
      });
      setDownloadProgress(100);
    } catch (error: any) {
      console.error('Upload error:', error);
      alert(`Gagal memproses file: ${error.message}`);
    } finally {
      setDownloadingId(null);
    }
  };

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Delete Handler
  const handleDelete = async (bookId: string) => {
    await db.transaction('rw', db.books, db.hadiths, async () => {
      await db.books.delete(bookId);
      await db.hadiths.where('bookId').equals(bookId).delete();
      
      // If deleting a book from the bundle, also remove bundle record to reset UI
      const isPartOfBundle = AVAILABLE_BOOKS.find(b => b.id === bookId)?.bundleUrl;
      if (isPartOfBundle) {
        await db.books.delete('kitab-tisah-bundle');
        localStorage.removeItem('auto-download-tisah');
      }
    });
    setDeleteConfirmId(null);
  };

  // Search Handler
  useEffect(() => {
    if (!selectedBookId || !searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        // Simple text search (can be improved with full-text search index)
        const results = await db.hadiths
          .where('bookId')
          .equals(selectedBookId)
          .filter(h => 
            h.id_translation.toLowerCase().includes(searchQuery.toLowerCase()) ||
            h.number.toString().includes(searchQuery)
          )
          .limit(50)
          .toArray();
        setSearchResults(results);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedBookId]);

  const [activeTab, setActiveTab] = useState<'koleksi' | 'quran' | 'global-search'>(
    (localStorage.getItem('libraryInitialTab') as any) || initialTab || 'koleksi'
  );

  useEffect(() => {
    const checkDeepLink = () => {
      const tab = localStorage.getItem('libraryInitialTab');
      const query = localStorage.getItem('libraryInitialQuery');
      
      if (tab) {
        setActiveTab(tab as any);
        localStorage.removeItem('libraryInitialTab');
      }
      if (query) {
        setSearchQuery(query);
        localStorage.removeItem('libraryInitialQuery');
      }
    };

    checkDeepLink();
    window.addEventListener('navigate-to-quran', checkDeepLink);
    return () => window.removeEventListener('navigate-to-quran', checkDeepLink);
  }, []);

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
    if (initialSearchQuery) setSearchQuery(initialSearchQuery);
  }, [initialTab, initialSearchQuery]);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [globalSearchResults, setGlobalSearchResults] = useState<any[]>([]);
  const [isGlobalSearching, setIsGlobalSearching] = useState(false);

  const handleGlobalSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!globalSearchQuery.trim()) return;

    setIsGlobalSearching(true);
    try {
      const results = await db.hadiths
        .filter(h => 
          h.id_translation.toLowerCase().includes(globalSearchQuery.toLowerCase()) ||
          (h.title && h.title.toLowerCase().includes(globalSearchQuery.toLowerCase()))
        )
        .limit(50)
        .toArray();
      
      // Enrich with book info
      const enrichedResults = await Promise.all(results.map(async (r) => {
        const book = await db.books.get(r.bookId);
        return { ...r, bookTitle: book?.title };
      }));

      setGlobalSearchResults(enrichedResults);
    } catch (err) {
      console.error('Global search error:', err);
    } finally {
      setIsGlobalSearching(false);
    }
  };
  const [activeCategory, setActiveCategory] = useState<'semua' | 'hadits' | 'tafsir' | 'fiqh' | 'doa' | 'sirah' | 'akhlak'>('semua');
  const [librarySearch, setLibrarySearch] = useState('');

  const filteredBooks = AVAILABLE_BOOKS.filter(book => 
    book.id !== 'kitab-tisah-bundle' &&
    (activeCategory === 'semua' || book.category === activeCategory) &&
    (book.title.toLowerCase().includes(librarySearch.toLowerCase()) || 
     book.author.toLowerCase().includes(librarySearch.toLowerCase()))
  );

  const handleReadBook = async (book: typeof AVAILABLE_BOOKS[0]) => {
    const bookMetadata = books?.find(b => b.id === book.id);
    const isDownloaded = bookMetadata?.isDownloaded;
    
    if (isDownloaded) {
      setSelectedBookId(book.id);
    } else {
      // If book is part of a bundle, we might want to download the bundle
      const bundleUrl = (book as any).bundleUrl;
      const isPartOfBundle = !!bundleUrl;
      
      if (downloadingId === book.id || (isPartOfBundle && downloadingId === 'kitab-tisah-bundle')) return; 
      
      if (isPartOfBundle) {
        const bundleInfo = AVAILABLE_BOOKS.find(b => b.id === 'kitab-tisah-bundle');
        if (bundleInfo) {
          await handleDownload(bundleInfo);
        } else {
          await handleDownload(book);
        }
      } else {
        await handleDownload(book);
      }
      
      // Removed automatic open after download - users want manual control
      // and it avoids the "open all" confusion
    }
  };

  // Render Book List
  if (!selectedBookId) {
    return (
      <div className="flex flex-col h-full bg-slate-50">
        <div className="p-4 bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              {activeTab !== 'koleksi' && (
                <button onClick={() => setActiveTab('koleksi')} className="p-2 -ml-2 hover:bg-slate-100 rounded-full text-slate-600">
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <div>
                <h2 className="text-lg font-bold text-slate-800 leading-tight">Maktabah Digital</h2>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Perpustakaan & Referensi</p>
              </div>
            </div>
            <div className="px-2 py-1 bg-emerald-50 text-emerald-700 text-[9px] font-bold rounded-md border border-emerald-100">
              {books?.length || 0} Kitab Offline
            </div>
          </div>

          {activeTab === 'koleksi' && (
            <div className="space-y-3">
              <div className="relative">
                <input 
                  type="text" 
                  value={librarySearch}
                  onChange={(e) => setLibrarySearch(e.target.value)}
                  placeholder="Cari judul kitab atau pengarang..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>

              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {[
                  { id: 'semua', label: 'Semua' },
                  { id: 'hadits', label: 'Hadits' },
                  { id: 'tafsir', label: 'Tafsir' },
                  { id: 'fiqh', label: 'Fiqh' },
                  { id: 'doa', label: 'Doa' },
                  { id: 'sirah', label: 'Sirah' },
                  { id: 'akhlak', label: 'Akhlak' }
                ].map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id as any)}
                    className={`px-3 py-1 text-[10px] font-bold rounded-full border transition-all whitespace-nowrap ${
                      activeCategory === cat.id
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <AnimatePresence mode="wait">
            {activeTab === 'koleksi' && (
              <motion.div 
                key="koleksi"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Quran Card Integration */}
                {activeCategory === 'semua' && !librarySearch && (
                  <motion.div
                    onClick={() => setActiveTab('quran')}
                    className="bg-white p-4 rounded-3xl border border-slate-200 hover:border-emerald-300 transition-all cursor-pointer group flex items-center gap-4 shadow-sm"
                  >
                    <div className="w-14 h-14 bg-emerald-600 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-emerald-100 group-hover:scale-105 transition-transform">
                      <BookIcon className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h4 className="font-bold text-slate-800">Al-Qur'an Al-Karim</h4>
                        <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded uppercase tracking-wider">Utama</span>
                      </div>
                      <p className="text-xs text-slate-500">Baca, Cari Ayat & Tafsir Lengkap</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-emerald-50 transition-colors">
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600" />
                    </div>
                  </motion.div>
                )}
                {/* Featured Section - Only show if not downloaded */}
                {activeCategory === 'semua' && !books?.find(b => b.id === 'kitab-tisah-bundle')?.isDownloaded && (
                  <div className="bg-gradient-to-br from-indigo-700 via-emerald-600 to-teal-700 rounded-3xl p-6 text-white shadow-lg shadow-emerald-200 relative overflow-hidden">
                    <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-[10px] font-bold uppercase tracking-widest bg-white/20 px-2 py-1 rounded-md">Pustaka Utama</span>
                        {!books?.find(b => b.id === 'kitab-tisah-bundle')?.isDownloaded && (
                           <span className="text-[10px] font-bold uppercase tracking-widest bg-amber-500/80 px-2 py-1 rounded-md animate-pulse">Belum Diunduh</span>
                        )}
                      </div>
                      <h3 className="text-xl font-bold mb-1">Bundle Kitab Tis'ah</h3>
                      <p className="text-white/70 text-xs mb-4 leading-relaxed">
                        9 Kitab Hadits Utama (Bukhari, Muslim, dsb) dalam satu paket. 
                        Unduh sekali untuk akses instan semua referensi.
                      </p>
                      
                      {books?.find(b => b.id === 'kitab-tisah-bundle')?.isDownloaded ? (
                        <div className="flex gap-2">
                           <button 
                            onClick={() => setActiveCategory('hadits')}
                            className="bg-white text-emerald-700 px-6 py-2 rounded-xl text-xs font-bold hover:bg-emerald-50 transition-all flex items-center gap-2"
                          >
                            <Library className="w-4 h-4" />
                            Telusuri Koleksi
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => {
                            localStorage.setItem('auto-download-tisah', 'true');
                            handleDownload(AVAILABLE_BOOKS.find(b => b.id === 'kitab-tisah-bundle')!);
                          }}
                          disabled={downloadingId === 'kitab-tisah-bundle'}
                          className="bg-white text-emerald-700 px-6 py-2 rounded-xl text-xs font-bold hover:bg-emerald-50 transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                          {downloadingId === 'kitab-tisah-bundle' ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Mengunduh Bundle ({Math.round(downloadProgress)}%)</>
                          ) : (
                            <><Download className="w-4 h-4" /> Unduh Paket 9 Kitab</>
                          )}
                        </button>
                      )}
                    </div>
                    <BookIcon className="absolute -right-4 -bottom-4 w-32 h-32 text-white/10 rotate-12" />
                  </div>
                )}

                {/* Thematic Exploration */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <h4 className="text-sm font-bold text-slate-800">Eksplor Tema</h4>
                    <span className="text-[10px] font-bold text-slate-400">Topik Populer</span>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {[
                      { label: 'Iman & Tauhid', icon: '✨', query: 'iman' },
                      { label: 'Shalat', icon: '🕌', query: 'shalat' },
                      { label: 'Puasa', icon: '🌙', query: 'puasa' },
                      { label: 'Zakat & Sedekah', icon: '💰', query: 'zakat' },
                      { label: 'Haji & Umrah', icon: '🕋', query: 'haji' },
                      { label: 'Akhlak Mulia', icon: '🤝', query: 'akhlak' },
                      { label: 'Adab Makan', icon: '🍽️', query: 'makan' },
                      { label: 'Doa Harian', icon: '🤲', query: 'doa' },
                      { label: 'Kiamat & Akhirat', icon: '🌋', query: 'kiamat' },
                      { label: 'Ilmu', icon: '📚', query: 'ilmu' }
                    ].map((theme, i) => (
                      <button
                        key={i}
                        onClick={() => setSearchQuery(theme.query)}
                        className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-emerald-500 hover:shadow-md transition-all group"
                      >
                        <span className="text-lg group-hover:scale-125 transition-transform">{theme.icon}</span>
                        <span className="text-[11px] font-bold text-slate-700 whitespace-nowrap">{theme.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Categories Sections */}
                {['hadits', 'tafsir', 'fiqh', 'doa', 'sirah', 'akhlak'].map(cat => {
                  const catBooks = filteredBooks.filter(b => b.category === cat);
                  if (catBooks.length === 0) return null;

                  return (
                    <div key={cat} className="space-y-3">
                      <div className="flex items-center justify-between px-1">
                        <h4 className="text-sm font-bold text-slate-800 capitalize">
                          {cat === 'doa' ? 'Doa & Dzikir' : 
                           cat === 'sirah' ? 'Sirah Nabawiyah' : 
                           cat === 'akhlak' ? 'Adab & Akhlak' : cat}
                        </h4>
                        <span className="text-[10px] font-bold text-slate-400">{catBooks.length} Kitab</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {catBooks.map(book => {
                          const bookMetadata = books?.find(b => b.id === book.id);
                          const isDownloaded = bookMetadata?.isDownloaded;
                          const isDownloading = downloadingId === book.id || (downloadingId === 'kitab-tisah-bundle' && ALLOWED_BOOK_IDS.includes(book.id));

                          return (
                            <div 
                              key={book.id} 
                              className={`group relative flex flex-col bg-white rounded-2xl border transition-all overflow-hidden ${
                                isDownloaded ? 'border-slate-200 hover:border-emerald-500 shadow-sm hover:shadow-md' : 'border-slate-100 opacity-80 hover:opacity-100'
                              }`}
                            >
                              {/* Book Cover Design */}
                              <div className={`h-28 relative flex items-center justify-center overflow-hidden ${
                                book.category === 'hadits' ? 'bg-emerald-600' : 
                                book.category === 'tafsir' ? 'bg-amber-600' : 
                                book.category === 'fiqh' ? 'bg-indigo-600' :
                                book.category === 'doa' ? 'bg-rose-600' :
                                book.category === 'sirah' ? 'bg-cyan-600' :
                                book.category === 'akhlak' ? 'bg-violet-600' :
                                'bg-slate-600'
                              }`}>
                                <div className="absolute inset-0 opacity-10">
                                  <div className="absolute top-0 left-0 w-full h-full border-4 border-white/20 m-2 rounded-sm" />
                                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 border-2 border-white/20 rotate-45" />
                                </div>
                                <BookIcon className="w-10 h-10 text-white/40 group-hover:scale-110 transition-transform duration-500" />
                                
                                {isDownloading && (
                                  <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center p-4">
                                    <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden mb-2">
                                      <motion.div 
                                        className="h-full bg-white"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${downloadProgress}%` }}
                                      />
                                    </div>
                                    <span className="text-[10px] font-bold text-white">{Math.round(downloadProgress)}%</span>
                                  </div>
                                )}
                              </div>

                              <div className="p-3 flex-1 flex flex-col">
                                <div className="flex-1">
                                  <h3 className="font-bold text-slate-800 text-xs line-clamp-2 leading-tight mb-1">{book.title}</h3>
                                  <p className="text-[9px] text-slate-400 line-clamp-1 italic">{book.author}</p>
                                </div>

                                <div className="mt-3 pt-2 border-t border-slate-50 flex items-center justify-between gap-2">
                                  <button 
                                    onClick={() => handleReadBook(book)}
                                    disabled={isDownloading}
                                    data-download-id={book.id}
                                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 ${
                                      isDownloaded 
                                        ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
                                        : 'bg-slate-800 text-white hover:bg-slate-900'
                                    } disabled:opacity-50`}
                                  >
                                    {isDownloaded ? <BookOpen className="w-3 h-3" /> : <Download className="w-3 h-3" />}
                                    {isDownloaded ? 'Baca' : isDownloading ? 'Mendownload...' : 'Buka'}
                                  </button>
                                  
                                  {isDownloaded && (
                                    <button 
                                      onClick={() => setDeleteConfirmId(book.id)}
                                      className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                      title="Hapus Offline"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            )}

            {activeTab === 'quran' && (
              <motion.div
                key="quran"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="max-w-7xl mx-auto w-full px-2"
              >
                <QuranReference 
                  onAddToReference={onAddToReference || (() => {})} 
                  existingReferences={[]} 
                  initialSearchQuery={searchQuery}
                  onNavigateToBook={(id) => {
                    setActiveCategory('tafsir');
                    setSelectedBookId(id);
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {/* Delete Confirmation Modal */}
        {deleteConfirmId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-[100]">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl"
            >
              <h3 className="text-lg font-bold text-slate-800 mb-2">Hapus Kitab?</h3>
              <p className="text-sm text-slate-500 mb-6">
                Apakah Anda yakin ingin menghapus data offline kitab ini? Anda harus mengunduhnya kembali untuk membaca secara offline.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-600 font-bold text-sm"
                >
                  Batal
                </button>
                <button 
                  onClick={() => handleDelete(deleteConfirmId)}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-bold text-sm"
                >
                  Hapus
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    );
  }

  // Render Reader
  return (
    <ReaderView 
      bookId={selectedBookId} 
      onBack={() => {
        setSelectedBookId(null);
        setSearchQuery('');
      }} 
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      searchResults={searchResults}
      isSearching={isSearching}
      onAddToReference={onAddToReference}
    />
  );
};

// Sub-component for Reader to handle hooks cleanly
const ReaderView = ({ bookId, onBack, searchQuery, setSearchQuery, searchResults, isSearching, onAddToReference }: any) => {
  const hadiths = useLiveQuery(() => db.hadiths.where('bookId').equals(bookId).toArray(), [bookId]);
  const book = useLiveQuery(() => db.books.get(bookId), [bookId]);
  const bookmarks = useLiveQuery(() => db.bookmarks.where('bookId').equals(bookId).toArray(), [bookId]);
  const notes = useLiveQuery(() => db.notes.where('bookId').equals(bookId).toArray(), [bookId]);
  
  const [theme, setTheme] = useState<'light' | 'sepia' | 'dark'>(() => (localStorage.getItem('reader-theme') as any) || 'light');
  const [fontSize, setFontSize] = useState<number>(() => Number(localStorage.getItem('reader-font-size')) || 16);
  const [fontFamily, setFontFamily] = useState<string>(() => localStorage.getItem('reader-font-family') || 'font-jakarta');
  const [readerMode, setReaderMode] = useState<'scroll' | 'page'>(() => (localStorage.getItem('reader-mode') as any) || 'scroll');
  const [currentPage, setCurrentPage] = useState(0);
  const [showArabic, setShowArabic] = useState<boolean>(() => localStorage.getItem('reader-show-arabic') !== 'false');
  const [showSanad, setShowSanad] = useState<boolean>(() => localStorage.getItem('reader-show-sanad') !== 'false');
  const [highlightPerawi, setHighlightPerawi] = useState<boolean>(() => localStorage.getItem('reader-show-perawi') !== 'false');
  const [focusMode, setFocusMode] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showTOC, setShowTOC] = useState(false);
  const [jumpTo, setJumpTo] = useState('');
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [activeNoteId, setActiveNoteId] = useState<number | null>(null);
  const virtuosoRef = useRef<any>(null);

  useEffect(() => {
    localStorage.setItem('reader-theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('reader-font-size', fontSize.toString());
  }, [fontSize]);

  useEffect(() => {
    localStorage.setItem('reader-font-family', fontFamily);
  }, [fontFamily]);

  useEffect(() => {
    localStorage.setItem('reader-mode', readerMode);
  }, [readerMode]);

  useEffect(() => {
    localStorage.setItem('reader-show-arabic', showArabic.toString());
  }, [showArabic]);

  useEffect(() => {
    localStorage.setItem('reader-show-sanad', showSanad.toString());
  }, [showSanad]);

  useEffect(() => {
    localStorage.setItem('reader-highlight-perawi', highlightPerawi.toString());
  }, [highlightPerawi]);

  const sortedHadiths = useMemo(() => {
    if (!hadiths) return [];
    if (book?.category === 'tafsir') {
      return [...hadiths].sort((a, b) => {
        const aNum = a.number.toString();
        const bNum = b.number.toString();
        
        // Handle format surah:ayat
        if (aNum.includes(':') && bNum.includes(':')) {
          const [as, aa] = aNum.split(':').map(Number);
          const [bs, ba] = bNum.split(':').map(Number);
          if (as !== bs) return as - bs;
          return aa - ba;
        }
        
        // Fallback to numeric or string sort
        const aVal = parseInt(aNum);
        const bVal = parseInt(bNum);
        if (!isNaN(aVal) && !isNaN(bVal)) return aVal - bVal;
        return aNum.localeCompare(bNum);
      });
    }
    return hadiths;
  }, [hadiths, book?.category]);

  const displayData = searchQuery ? searchResults : sortedHadiths;

  useEffect(() => {
    // Check if we need to jump to a specific verse when opening tafsir
    const jumpToVerse = localStorage.getItem('selectedVerseKey');
    if (jumpToVerse && displayData.length > 0) {
      const index = displayData.findIndex(h => h.number.toString() === jumpToVerse);
      if (index !== -1) {
        setTimeout(() => {
          if (readerMode === 'scroll') {
            virtuosoRef.current?.scrollToIndex({ index, align: 'start' });
          } else {
            setCurrentPage(index);
          }
          localStorage.removeItem('selectedVerseKey');
        }, 500);
      }
    }
  }, [displayData, readerMode]);
  const itemLabel = book?.category === 'hadits' ? 'Hadits' : 
                   book?.category === 'tafsir' ? 'Ayat' : 
                   book?.category === 'doa' ? 'Doa' :
                   book?.category === 'fiqh' ? 'Dalil' : 
                   book?.category === 'akhlak' ? 'Nasihat' : 'Item';

  const tocItems = useMemo(() => {
    if (!displayData) return [];
    if (book?.category === 'tafsir' || book?.id.includes('quran')) {
      // Group by Surah
      const surahs: any[] = [];
      const seenSurahs = new Set();
      displayData.forEach((h, index) => {
        const surahNum = h.number.toString().split(':')[0];
        if (!seenSurahs.has(surahNum)) {
          seenSurahs.add(surahNum);
          surahs.push({ label: `Surah ${surahNum}`, index });
        }
      });
      return surahs;
    }
    // For others, every 50 items
    const items: any[] = [];
    for (let i = 0; i < displayData.length; i += 50) {
      items.push({ label: `${itemLabel} ${displayData[i].number}`, index: i });
    }
    return items;
  }, [displayData, book?.category, book?.id, itemLabel]);

  const handleJumpTo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!jumpTo || !hadiths) return;
    const index = hadiths.findIndex(h => h.number.toString() === jumpTo);
    if (index !== -1) {
      if (readerMode === 'scroll') {
        virtuosoRef.current?.scrollToIndex({ index, align: 'start', behavior: 'smooth' });
      } else {
        setCurrentPage(index);
      }
      setJumpTo('');
      setShowSettings(false);
    } else {
      alert(`${itemLabel} nomor ${jumpTo} tidak ditemukan.`);
    }
  };

  const toggleBookmark = async (item: any) => {
    const existing = bookmarks?.find(b => b.itemNumber === item.number);
    if (existing) {
      await db.bookmarks.delete(existing.id!);
    } else {
      await db.bookmarks.add({
        bookId,
        itemNumber: item.number,
        title: item.title || `No. ${item.number}`,
        createdAt: Date.now()
      });
    }
  };

  const handleSaveNote = async (itemNumber: string | number) => {
    const existing = notes?.find(n => n.itemNumber === itemNumber);
    if (existing) {
      await db.notes.update(existing.id!, {
        content: noteContent,
        updatedAt: Date.now()
      });
    } else {
      await db.notes.add({
        bookId,
        itemNumber,
        content: noteContent,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    }
    setShowNotes(false);
    setNoteContent('');
  };

  const themeColors = {
    light: { bg: 'bg-slate-50', card: 'bg-white', text: 'text-slate-800', sub: 'text-slate-500', border: 'border-slate-100', header: 'bg-white' },
    sepia: { bg: 'bg-[#f4ecd8]', card: 'bg-[#fdf6e3]', text: 'text-[#5b4636]', sub: 'text-[#857a6b]', border: 'border-[#e6decb]', header: 'bg-[#fdf6e3]' },
    dark: { bg: 'bg-[#121212]', card: 'bg-[#1e1e1e]', text: 'text-slate-200', sub: 'text-slate-400', border: 'border-slate-800', header: 'bg-[#1e1e1e]' }
  };

  const colors = themeColors[theme];

  const formatHadith = (text: string) => {
    // 1. Handle Perawi highlighting [...] or (...)
    let processedText = text;
    if (highlightPerawi) {
      // Highlight names in brackets or common narrator names
      processedText = text.replace(/\[(.*?)\]/g, '<span class="perawi-name">$1</span>')
                         .replace(/\((.*?)\)/g, (match, p1) => {
                           // Only highlight if it looks like a name (not too long, no numbers)
                           if (p1.length < 30 && !/\d/.test(p1)) {
                             return `<span class="perawi-name">${p1}</span>`;
                           }
                           return match;
                         });
    }

    // 2. Split Sanad and Matn
    // Improved keywords for splitting
    const splitKeywords = [
      'bersabda:', 'berkata:', 'mengatakan:', 'menceritakan:', 
      'mengabarkan:', 'bertanya:', 'menjawab:', 'berpesan:',
      'Rasulullah SAW bersabda', 'Nabi SAW bersabda',
      'beliau bersabda', 'ia berkata'
    ];
    
    let splitIndex = -1;
    let foundKeyword = '';

    // Find the last occurrence of any keyword to separate Sanad from Matn
    for (const keyword of splitKeywords) {
      const regex = new RegExp(keyword, 'gi');
      let match;
      while ((match = regex.exec(processedText)) !== null) {
        if (match.index > splitIndex) {
          splitIndex = match.index;
          foundKeyword = match[0];
        }
      }
    }

    if (splitIndex === -1) {
      return (
        <div className={`leading-relaxed ${fontFamily}`} style={{ fontSize: `${fontSize}px` }}>
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{processedText}</ReactMarkdown>
        </div>
      );
    }

    const sanad = processedText.substring(0, splitIndex + foundKeyword.length);
    const matn = processedText.substring(splitIndex + foundKeyword.length).trim();

    return (
      <div className="space-y-4">
        {showSanad && (
          <div 
            className={`text-[0.85em] ${colors.sub} italic font-medium border-l-4 border-${categoryColor}-500/30 pl-4 py-3 bg-black/5 rounded-r-2xl ${fontFamily} sanad-content`}
            style={{ fontSize: `${fontSize * 0.95}px` }}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{sanad}</ReactMarkdown>
          </div>
        )}
        
        <div className="relative group/matn">
          {/* Visual Focus Line */}
          <div className={`absolute -left-4 top-0 bottom-0 w-1.5 bg-${categoryColor}-500/20 group-hover/matn:bg-${categoryColor}-500/40 transition-all rounded-full`} />
          
          <div 
            className={`leading-relaxed font-medium ${colors.text} ${fontFamily} matn-content`}
            style={{ fontSize: `${fontSize}px` }}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
              {matn}
            </ReactMarkdown>
          </div>
        </div>

        <style>{`
          .perawi-name {
            color: #10b981;
            font-weight: 700;
            background-color: rgba(16, 185, 129, 0.05);
            padding: 0 4px;
            border-radius: 4px;
            border-bottom: 1px dashed rgba(16, 185, 129, 0.3);
          }
          .dark .perawi-name {
            color: #34d399;
            background-color: rgba(52, 211, 153, 0.1);
            border-bottom: 1px dashed rgba(52, 211, 153, 0.3);
          }
          .sanad-content p {
            margin-bottom: 0;
            line-height: 1.6;
          }
          .matn-content p {
            margin-bottom: 0.5rem;
          }
        `}</style>
      </div>
    );
  };

  const categoryColor = book?.category === 'hadits' ? 'emerald' : 
                        book?.category === 'tafsir' ? 'amber' : 
                        book?.category === 'fiqh' ? 'indigo' :
                        book?.category === 'doa' ? 'rose' :
                        book?.category === 'sirah' ? 'cyan' :
                        book?.category === 'akhlak' ? 'violet' : 'slate';

  return (
    <div className={`flex flex-col h-full ${colors.bg} transition-colors duration-300`}>
      {/* Header */}
      {!focusMode && (
        <div className={`flex items-center gap-3 p-4 ${colors.header} border-b ${colors.border} shadow-sm sticky top-0 z-30 transition-colors duration-300`}>
          <button onClick={onBack} className={`p-2 -ml-2 hover:bg-black/5 rounded-full ${colors.text}`}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className={`text-sm font-bold ${colors.text} line-clamp-1 font-outfit`}>{book?.title || 'Membaca Kitab'}</h2>
            <p className={`text-[10px] ${colors.sub}`}>{displayData?.length || 0} {itemLabel}</p>
          </div>
          
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setFocusMode(true)}
              className={`p-2 hover:bg-black/5 rounded-lg ${colors.text}`}
              title="Mode Fokus"
            >
              <Moon className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setShowTOC(true)}
              className={`p-2 hover:bg-black/5 rounded-lg ${colors.text}`}
              title="Daftar Isi"
            >
              <List className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 hover:bg-black/5 rounded-lg ${colors.text}`}
              title="Pengaturan Tampilan"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {focusMode && (
        <button 
          onClick={() => setFocusMode(false)}
          className="fixed bottom-6 right-6 w-12 h-12 bg-emerald-600 text-white rounded-full shadow-lg flex items-center justify-center z-50 hover:scale-110 transition-all"
          title="Keluar Mode Fokus"
        >
          <Sun className="w-6 h-6" />
        </button>
      )}

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className={`${colors.header} border-b ${colors.border} overflow-hidden z-20`}
          >
            <div className="p-4 space-y-4 max-w-md mx-auto">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold ${colors.text}`}>Mode Baca</span>
                <div className="flex gap-2">
                  {[
                    { id: 'scroll', icon: List, label: 'Scroll' },
                    { id: 'page', icon: ChevronRight, label: 'Halaman' }
                  ].map(m => (
                    <button
                      key={m.id}
                      onClick={() => setReaderMode(m.id as any)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                        readerMode === m.id 
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-600' 
                          : `${colors.border} ${colors.text} hover:bg-black/5`
                      }`}
                    >
                      <m.icon className="w-3 h-3" />
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold ${colors.text}`}>Tema</span>
                <div className="flex gap-2">
                  {[
                    { id: 'light', icon: Sun, label: 'Terang', color: 'bg-white' },
                    { id: 'sepia', icon: Palette, label: 'Sepia', color: 'bg-[#fdf6e3]' },
                    { id: 'dark', icon: Moon, label: 'Gelap', color: 'bg-[#1e1e1e]' }
                  ].map(t => (
                    <button
                      key={t.id}
                      onClick={() => setTheme(t.id as any)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                        theme === t.id 
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-600' 
                          : `${colors.border} ${colors.text} hover:bg-black/5`
                      }`}
                    >
                      <t.icon className="w-3 h-3" />
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold ${colors.text}`}>Ukuran Font</span>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setFontSize(Math.max(12, fontSize - 2))}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg border ${colors.border} ${colors.text} hover:bg-black/5`}
                  >
                    A-
                  </button>
                  <span className={`text-xs font-bold ${colors.text}`}>{fontSize}px</span>
                  <button 
                    onClick={() => setFontSize(Math.min(32, fontSize + 2))}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg border ${colors.border} ${colors.text} hover:bg-black/5`}
                  >
                    A+
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <span className={`text-xs font-bold ${colors.text}`}>Gaya Tulisan</span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'font-jakarta', label: 'Modern (Spotify)', class: 'font-jakarta' },
                    { id: 'font-sans', label: 'Standard', class: 'font-sans' },
                    { id: 'font-outfit', label: 'Elegant', class: 'font-outfit' },
                    { id: 'font-lora', label: 'Klasik (Serif)', class: 'font-lora' }
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => setFontFamily(f.id)}
                      className={`px-3 py-2 rounded-xl text-[10px] font-bold border text-left transition-all ${
                        fontFamily === f.id 
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-600' 
                          : `${colors.border} ${colors.text} hover:bg-black/5`
                      } ${f.class}`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-black/5">
                <span className={`text-xs font-bold ${colors.text}`}>Visibilitas Komponen</span>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={() => setShowArabic(!showArabic)}
                    className={`flex items-center justify-between px-4 py-2.5 rounded-xl border transition-all ${
                      showArabic ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : `${colors.border} ${colors.sub}`
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Type className="w-4 h-4" />
                      <span className="text-xs font-bold">Tampilkan Teks Arab</span>
                    </div>
                    <div className={`w-8 h-4 rounded-full relative transition-all ${showArabic ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                      <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${showArabic ? 'right-0.5' : 'left-0.5'}`} />
                    </div>
                  </button>

                  <button
                    onClick={() => setShowSanad(!showSanad)}
                    className={`flex items-center justify-between px-4 py-2.5 rounded-xl border transition-all ${
                      showSanad ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : `${colors.border} ${colors.sub}`
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Library className="w-4 h-4" />
                      <span className="text-xs font-bold">Tampilkan Sanad (Perawi)</span>
                    </div>
                    <div className={`w-8 h-4 rounded-full relative transition-all ${showSanad ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                      <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${showSanad ? 'right-0.5' : 'left-0.5'}`} />
                    </div>
                  </button>

                  <button
                    onClick={() => setHighlightPerawi(!highlightPerawi)}
                    className={`flex items-center justify-between px-4 py-2.5 rounded-xl border transition-all ${
                      highlightPerawi ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : `${colors.border} ${colors.sub}`
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Sparkles className="w-4 h-4" />
                      <span className="text-xs font-bold">Highlight Nama Tokoh</span>
                    </div>
                    <div className={`w-8 h-4 rounded-full relative transition-all ${highlightPerawi ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                      <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${highlightPerawi ? 'right-0.5' : 'left-0.5'}`} />
                    </div>
                  </button>
                </div>
              </div>

              <form onSubmit={handleJumpTo} className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Hash className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 ${colors.sub}`} />
                  <input 
                    type="text"
                    value={jumpTo}
                    onChange={(e) => setJumpTo(e.target.value)}
                    placeholder={`Lompat ke nomor ${itemLabel.toLowerCase()}...`}
                    className={`w-full ${colors.bg} border ${colors.border} rounded-xl pl-9 pr-4 py-2 text-xs outline-none focus:border-emerald-500 ${colors.text}`}
                  />
                </div>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all"
                >
                  Lompat
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 relative">
        {/* Search Bar (Floating or Inline) */}
        <div className="px-4 py-2 sticky top-0 z-10">
          <div className="relative max-w-md mx-auto">
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Cari di dalam kitab ini...`}
              className={`w-full ${colors.card} border ${colors.border} rounded-2xl pl-10 pr-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-sm ${colors.text}`}
            />
            <Search className={`w-4 h-4 ${colors.sub} absolute left-3.5 top-1/2 -translate-y-1/2`} />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-black/5 rounded-full ${colors.sub}`}
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {!displayData ? (
          <div className="flex items-center justify-center h-full text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : displayData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8 text-center">
            <BookOpen className="w-12 h-12 mb-2 opacity-20" />
            <p className="text-sm mb-4">Tidak ada {itemLabel.toLowerCase()} ditemukan</p>
            {book && (
              <button 
                onClick={async () => {
                  try {
                    // Start download using handleDownload
                    const bookInfo = AVAILABLE_BOOKS.find(b => b.id === book.id);
                    if (bookInfo) {
                      onBack(); // Go back to library to see progress
                      setTimeout(() => {
                        const dlBtn = document.querySelector(`[data-download-id="${book.id}"]`);
                        if (dlBtn instanceof HTMLElement) dlBtn.click();
                      }, 100);
                    }
                  } catch (e) {
                    onBack();
                  }
                }}
                className="px-6 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all"
              >
                Unduh / Sinkron Ulang
              </button>
            )}
          </div>
        ) : readerMode === 'scroll' ? (
          <Virtuoso
            ref={virtuosoRef}
            style={{ height: '100%', width: '100%' }}
            totalCount={displayData.length}
            itemContent={(index) => {
              const item = displayData[index];
              const isCopied = copiedId === item.id;
              
              return (
                <div className="px-4 py-3 max-w-3xl mx-auto">
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className={`${colors.card} rounded-2xl p-6 border ${colors.border} shadow-sm relative group transition-all hover:shadow-md`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 flex items-center justify-center rounded-xl bg-${categoryColor}-50 text-${categoryColor}-600 font-bold text-xs border border-${categoryColor}-100`}>
                          {item.number}
                        </div>
                        <div className="flex flex-col">
                          {item.title && (
                            <h4 className={`text-xs font-bold ${colors.text} font-outfit line-clamp-1`}>
                              {item.title}
                            </h4>
                          )}
                          {book?.category === 'hadits' && (
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={`text-[8px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded bg-${categoryColor}-50 text-${categoryColor}-700 border border-${categoryColor}-100`}>
                                {['bukhari', 'muslim'].includes(book.id) ? 'Shahih' : 
                                 ['abu-dawud', 'tirmidzi', 'nasai', 'ibnu-majah'].includes(book.id) ? 'Mu\'tabar' : 'Hasan'}
                              </span>
                              <span className="text-[8px] text-slate-400 font-bold">Terverifikasi</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => toggleBookmark(item)}
                          className={`p-2 hover:bg-black/5 rounded-lg transition-all ${bookmarks?.some(b => b.itemNumber === item.number) ? 'text-amber-500' : colors.sub}`}
                          title="Bookmark"
                        >
                          <Bookmark className={`w-3.5 h-3.5 ${bookmarks?.some(b => b.itemNumber === item.number) ? 'fill-current' : ''}`} />
                        </button>
                        <button 
                          onClick={() => {
                            const note = notes?.find(n => n.itemNumber === item.number);
                            setNoteContent(note?.content || '');
                            setActiveNoteId(item.number);
                            setShowNotes(true);
                          }}
                          className={`p-2 hover:bg-black/5 rounded-lg transition-all ${notes?.some(n => n.itemNumber === item.number) ? 'text-blue-500' : colors.sub}`}
                          title="Catatan"
                        >
                          <FileText className={`w-3.5 h-3.5 ${notes?.some(n => n.itemNumber === item.number) ? 'fill-current' : ''}`} />
                        </button>
                        {onAddToReference && (
                          <button 
                            onClick={() => {
                              const textToRef = `${item.title ? '### ' + item.title + '\n' : ''}${item.arab ? '```arabic\n' + item.arab + '\n```\n\n' : ''}${item.id_translation}\n\n*(Sumber: ${book?.title} ${book?.category === 'tafsir' ? 'Ayat' : 'No.'} ${item.number})*`;
                              onAddToReference(textToRef, `${book?.title} - ${item.number}`);
                              alert('Berhasil ditambahkan ke Referensi!');
                            }}
                            className={`p-2 hover:bg-emerald-50 text-emerald-600 rounded-lg transition-all`}
                            title="Tambahkan ke Referensi"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button 
                          onClick={() => {
                            const textToCopy = `${item.title ? item.title + '\n' : ''}${item.arab ? item.arab + '\n\n' : ''}${item.id_translation}\n(Sumber: ${book?.title} ${book?.category === 'tafsir' ? 'Ayat' : 'No.'} ${item.number})`;
                            navigator.clipboard.writeText(textToCopy);
                            setCopiedId(item.id);
                            setTimeout(() => setCopiedId(null), 2000);
                          }}
                          className={`p-2 hover:bg-black/5 rounded-lg transition-all ${isCopied ? 'text-emerald-500' : colors.sub}`}
                          title="Salin Teks"
                        >
                          {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {item.arab && showArabic && (
                      <div className="mb-6">
                        <p 
                          className={`text-right font-arabic leading-[2.5] ${colors.text} transition-all`} 
                          dir="rtl"
                          style={{ fontSize: `${fontSize * 1.5}px` }}
                        >
                          {item.arab}
                        </p>
                      </div>
                    )}

                    <div 
                      className={`leading-relaxed ${colors.text} prose prose-slate max-w-none ${fontFamily}`}
                      style={{ fontSize: `${fontSize}px` }}
                    >
                      {book?.category === 'hadits' ? formatHadith(item.id_translation) : (
                        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                          {item.id_translation}
                        </ReactMarkdown>
                      )}
                    </div>
                  </motion.div>
                </div>
              );
            }}
          />
        ) : (
          <div className="h-full flex flex-col">
            <div className="flex-1 relative overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentPage}
                  initial={{ x: 300, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -300, opacity: 0 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.2}
                  onDragEnd={(_, info) => {
                    if (info.offset.x > 100 && currentPage > 0) {
                      setCurrentPage(prev => prev - 1);
                    } else if (info.offset.x < -100 && currentPage < displayData.length - 1) {
                      setCurrentPage(prev => prev + 1);
                    }
                  }}
                  className="absolute inset-0 p-4 overflow-y-auto custom-scrollbar cursor-grab active:cursor-grabbing"
                >
                  <div className="max-w-3xl mx-auto">
                    <div className={`${colors.card} rounded-3xl p-8 border ${colors.border} shadow-lg relative min-h-[60vh]`}>
                      <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 flex items-center justify-center rounded-2xl bg-${categoryColor}-50 text-${categoryColor}-600 font-bold text-sm border border-${categoryColor}-100`}>
                            {displayData[currentPage].number}
                          </div>
                          <div className="flex flex-col">
                            {displayData[currentPage].title && (
                              <h4 className={`text-sm font-bold ${colors.text} font-outfit`}>
                                {displayData[currentPage].title}
                              </h4>
                            )}
                            {book?.category === 'hadits' && (
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`text-[10px] font-black uppercase tracking-tighter px-2 py-0.5 rounded bg-${categoryColor}-50 text-${categoryColor}-700 border border-${categoryColor}-100`}>
                                  {['bukhari', 'muslim'].includes(book.id) ? 'Shahih' : 
                                   ['abu-dawud', 'tirmidzi', 'nasai', 'ibnu-majah'].includes(book.id) ? 'Mu\'tabar' : 'Hasan'}
                                </span>
                                <span className="text-[10px] text-slate-400 font-bold">Terverifikasi</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => toggleBookmark(displayData[currentPage])}
                            className={`p-2.5 hover:bg-black/5 rounded-xl transition-all ${bookmarks?.some(b => b.itemNumber === displayData[currentPage].number) ? 'text-amber-500' : colors.sub}`}
                          >
                            <Bookmark className={`w-4 h-4 ${bookmarks?.some(b => b.itemNumber === displayData[currentPage].number) ? 'fill-current' : ''}`} />
                          </button>
                          <button 
                            onClick={() => {
                              const item = displayData[currentPage];
                              const note = notes?.find(n => n.itemNumber === item.number);
                              setNoteContent(note?.content || '');
                              setActiveNoteId(item.number);
                              setShowNotes(true);
                            }}
                            className={`p-2.5 hover:bg-black/5 rounded-xl transition-all ${notes?.some(n => n.itemNumber === displayData[currentPage].number) ? 'text-blue-500' : colors.sub}`}
                          >
                            <FileText className={`w-4 h-4 ${notes?.some(n => n.itemNumber === displayData[currentPage].number) ? 'fill-current' : ''}`} />
                          </button>
                          {onAddToReference && (
                            <button 
                              onClick={() => {
                                const item = displayData[currentPage];
                                const textToRef = `${item.title ? '### ' + item.title + '\n' : ''}${item.arab ? '```arabic\n' + item.arab + '\n```\n\n' : ''}${item.id_translation}\n\n*(Sumber: ${book?.title} ${book?.category === 'tafsir' ? 'Ayat' : 'No.'} ${item.number})*`;
                                onAddToReference(textToRef, `${book?.title} - ${item.number}`);
                                alert('Berhasil ditambahkan ke Referensi!');
                              }}
                              className={`p-2.5 hover:bg-emerald-50 text-emerald-600 rounded-xl transition-all`}
                              title="Tambahkan ke Referensi"
                            >
                              <Sparkles className="w-4 h-4" />
                            </button>
                          )}
                          <button 
                            onClick={() => {
                              const item = displayData[currentPage];
                              const textToCopy = `${item.title ? item.title + '\n' : ''}${item.arab ? item.arab + '\n\n' : ''}${item.id_translation}\n(Sumber: ${book?.title} ${book?.category === 'tafsir' ? 'Ayat' : 'No.'} ${item.number})`;
                              navigator.clipboard.writeText(textToCopy);
                              setCopiedId(item.id);
                              setTimeout(() => setCopiedId(null), 2000);
                            }}
                            className={`p-2.5 hover:bg-black/5 rounded-xl transition-all ${copiedId === displayData[currentPage].id ? 'text-emerald-500' : colors.sub}`}
                          >
                            {copiedId === displayData[currentPage].id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {displayData[currentPage].arab && showArabic && (
                        <div className="mb-8">
                          <p 
                            className={`text-right font-arabic leading-[2.8] ${colors.text}`} 
                            dir="rtl"
                            style={{ fontSize: `${fontSize * 1.6}px` }}
                          >
                            {displayData[currentPage].arab}
                          </p>
                        </div>
                      )}

                      <div 
                        className={`leading-relaxed ${colors.text} prose prose-slate max-w-none ${fontFamily}`}
                        style={{ fontSize: `${fontSize}px` }}
                      >
                        {book?.category === 'hadits' ? formatHadith(displayData[currentPage].id_translation) : (
                          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                            {displayData[currentPage].id_translation}
                          </ReactMarkdown>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Pagination Controls */}
            <div className={`p-4 ${colors.header} border-t ${colors.border} flex items-center justify-between gap-4`}>
              <button
                disabled={currentPage === 0}
                onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                className={`flex-1 py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                  currentPage === 0 ? 'opacity-30' : `bg-black/5 ${colors.text} hover:bg-black/10`
                }`}
              >
                <ArrowLeft className="w-4 h-4" />
                Sebelumnya
              </button>
              <div className={`text-[10px] font-bold ${colors.sub} whitespace-nowrap`}>
                {currentPage + 1} / {displayData.length}
              </div>
              <button
                disabled={currentPage === displayData.length - 1}
                onClick={() => setCurrentPage(prev => Math.min(displayData.length - 1, prev + 1))}
                className={`flex-1 py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                  currentPage === displayData.length - 1 ? 'opacity-30' : `bg-emerald-600 text-white hover:bg-emerald-700`
                }`}
              >
                Selanjutnya
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Notes Modal */}
      <AnimatePresence>
        {showNotes && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 font-jakarta">
                  <FileText className="w-5 h-5 text-blue-500" />
                  Catatan Peribadi
                </h3>
                <button onClick={() => setShowNotes(false)} className="p-2 hover:bg-slate-100 rounded-full">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-xs text-slate-400 font-jakarta">Menambahkan catatan untuk item No. {activeNoteId}</p>
                <textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Tulis catatan Anda di sini..."
                  className="w-full h-40 p-4 bg-slate-50 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none resize-none text-sm font-jakarta"
                />
                <button
                  onClick={() => handleSaveNote(activeNoteId!)}
                  className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 font-jakarta"
                >
                  Simpan Catatan
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Table of Contents Drawer */}
      <AnimatePresence>
        {showTOC && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTOC(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className={`fixed top-0 right-0 bottom-0 w-80 ${colors.header} shadow-2xl z-[101] flex flex-col`}
            >
              <div className={`p-4 border-b ${colors.border} flex items-center justify-between`}>
                <h3 className={`font-bold ${colors.text} font-outfit`}>Daftar Isi</h3>
                <button onClick={() => setShowTOC(false)} className={`p-2 hover:bg-black/5 rounded-full ${colors.text}`}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                {tocItems.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      virtuosoRef.current?.scrollToIndex({ index: item.index, align: 'start' });
                      setShowTOC(false);
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-xl hover:bg-black/5 transition-all text-left ${colors.text}`}
                  >
                    <span className="text-xs font-medium">{item.label}</span>
                    <ChevronRight className={`w-4 h-4 ${colors.sub}`} />
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
