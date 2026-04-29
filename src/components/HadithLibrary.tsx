import React, { useState, useEffect } from 'react';
import { Download, Trash2, BookOpen, Check, Loader2, X } from 'lucide-react';
import { saveBook, getBook, deleteBook } from '../lib/hadithDb';

const HADITH_BOOKS = [
  { id: 'abu-daud', name: 'Abu Daud', url: 'https://raw.githubusercontent.com/gadingnst/hadith-api/master/books/abu-daud.json' },
  { id: 'bukhari', name: 'Bukhari', url: 'https://raw.githubusercontent.com/gadingnst/hadith-api/master/books/bukhari.json' },
  { id: 'ahmad', name: 'Ahmad', url: 'https://raw.githubusercontent.com/gadingnst/hadith-api/master/books/ahmad.json' },
  { id: 'darimi', name: 'Darimi', url: 'https://raw.githubusercontent.com/gadingnst/hadith-api/master/books/darimi.json' },
  { id: 'ibnu-majah', name: 'Ibnu Majah', url: 'https://raw.githubusercontent.com/gadingnst/hadith-api/master/books/ibnu-majah.json' },
  { id: 'muslim', name: 'Muslim', url: 'https://raw.githubusercontent.com/gadingnst/hadith-api/master/books/muslim.json' },
  { id: 'malik', name: 'Malik', url: 'https://raw.githubusercontent.com/gadingnst/hadith-api/master/books/malik.json' },
  { id: 'nasai', name: 'Nasai', url: 'https://raw.githubusercontent.com/gadingnst/hadith-api/master/books/nasai.json' },
  { id: 'tirmidzi', name: 'Tirmidzi', url: 'https://raw.githubusercontent.com/gadingnst/hadith-api/master/books/tirmidzi.json' },
];

export const HadithLibrary: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [status, setStatus] = useState<Record<string, 'idle' | 'downloading' | 'downloaded'>>({});

  useEffect(() => {
    const checkStatus = async () => {
      const newStatus: Record<string, 'idle' | 'downloading' | 'downloaded'> = {};
      for (const book of HADITH_BOOKS) {
        const data = await getBook(book.id);
        newStatus[book.id] = data ? 'downloaded' : 'idle';
      }
      setStatus(newStatus);
    };
    checkStatus();
  }, []);

  const downloadBook = async (book: typeof HADITH_BOOKS[0]) => {
    setStatus(prev => ({ ...prev, [book.id]: 'downloading' }));
    try {
      const response = await fetch(book.url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      await saveBook(book.id, data);
      setStatus(prev => ({ ...prev, [book.id]: 'downloaded' }));
    } catch (error: any) {
      console.error(error);
      alert(`Gagal mengunduh ${book.name}. Pastikan koneksi intenet stabil. Detail: ${error?.message || error}`);
      setStatus(prev => ({ ...prev, [book.id]: 'idle' }));
    }
  };

  const removeBook = async (id: string) => {
    await deleteBook(id);
    setStatus(prev => ({ ...prev, [id]: 'idle' }));
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-600" />
            Perpustakaan Hadits
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 overflow-y-auto space-y-2">
          {HADITH_BOOKS.map(book => (
            <div key={book.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="font-medium text-slate-700 text-sm">{book.name}</span>
              {status[book.id] === 'downloaded' ? (
                <button onClick={() => removeBook(book.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-full">
                  <Trash2 className="w-4 h-4" />
                </button>
              ) : status[book.id] === 'downloading' ? (
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
              ) : (
                <button onClick={() => downloadBook(book)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-full">
                  <Download className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
