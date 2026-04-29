import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Book, FileText, Upload, X, Loader2, CheckCircle2, AlertCircle, Trash2, File, Eye, Sparkles, Settings, Type, AlignLeft, AlignCenter, AlignJustify, Moon, Sun, Search, ArrowLeft } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { GoogleGenAI } from '@google/genai';
import { AnimatePresence, motion } from 'motion/react';

// Set worker source for pdfjs
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export type ReferenceFile = {
  id: string;
  name: string;
  type: 'pdf' | 'text' | 'markdown' | 'other';
  content: string; // Extracted text content
  summary?: string; // AI generated summary
  size: number;
  uploadDate: Date;
};

interface ReferenceManagerProps {
  files: ReferenceFile[];
  onFilesChange: (files: ReferenceFile[]) => void;
  apiKey?: string;
}

export const ReferenceManager: React.FC<ReferenceManagerProps> = ({ files, onFilesChange, apiKey }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [readingFile, setReadingFile] = useState<ReferenceFile | null>(null);
  
  // Reader State
  const [fontSize, setFontSize] = useState(18);
  const [lineHeight, setLineHeight] = useState(1.6);
  const [theme, setTheme] = useState<'light' | 'sepia' | 'dark'>('light');
  const [textAlign, setTextAlign] = useState<'left' | 'justify'>('left');
  const [showTools, setShowTools] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const generateSummary = async (content: string, fileName: string) => {
    try {
      const activeKey = apiKey || process.env.GEMINI_API_KEY;
      if (!activeKey) return "Ringkasan tidak tersedia (API Key tidak ditemukan).";

      const ai = new GoogleGenAI({ apiKey: activeKey });
      const prompt = `Buatkan ringkasan singkat (maksimal 3 kalimat) tentang isi dokumen ini. Dokumen ini bernama "${fileName}".\n\nIsi dokumen (sebagian):\n${content.substring(0, 5000)}`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      return response.text;
    } catch (err) {
      console.error("Failed to generate summary:", err);
      return "Gagal membuat ringkasan otomatis.";
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setIsProcessing(true);
    setError(null);
    const newFiles: ReferenceFile[] = [];

    try {
      for (const file of acceptedFiles) {
        let content = '';
        let type: ReferenceFile['type'] = 'other';

        if (file.type === 'application/pdf') {
          type = 'pdf';
          content = await extractTextFromPdf(file);
        } else if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
          type = 'text';
          content = await file.text();
        } else if (file.name.endsWith('.md')) {
          type = 'markdown';
          content = await file.text();
        } else {
          continue;
        }

        if (!content || content.trim().length < 20) {
          content = "⚠️ Teks tidak dapat diekstrak dari dokumen ini. Kemungkinan dokumen ini berisi gambar hasil scan (bukan teks digital). AI tidak dapat membaca teks dari gambar di versi ini.";
        }

        const summary = await generateSummary(content, file.name);

        newFiles.push({
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          type,
          content,
          summary,
          size: file.size,
          uploadDate: new Date(),
        });
      }

      onFilesChange([...files, ...newFiles]);
    } catch (err) {
      console.error("Error processing files:", err);
      setError("Gagal memproses file. Pastikan format didukung (PDF, TXT, MD) dan tidak dienkripsi.");
    } finally {
      setIsProcessing(false);
    }
  }, [files, onFilesChange, apiKey]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md']
    },
    maxSize: 1024 * 1024 * 1024 // 1GB limit
  });

  const removeFile = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening reader
    e.preventDefault();
    const updatedFiles = files.filter(f => f.id !== id);
    onFilesChange(updatedFiles);
  };

  // Reader Theme Styles
  const getThemeStyles = () => {
    switch (theme) {
      case 'sepia': return 'bg-[#f4ecd8] text-[#5b4636]';
      case 'dark': return 'bg-[#1a1a1a] text-[#e0e0e0]';
      default: return 'bg-white text-slate-800';
    }
  };

  // Full Screen Reader View
  if (readingFile) {
    return (
      <div className={`fixed inset-0 z-50 flex flex-col ${getThemeStyles()} transition-colors duration-300`}>
        {/* Top Bar */}
        <div className={`flex items-center justify-between p-4 border-b ${theme === 'dark' ? 'border-white/10' : 'border-black/5'} backdrop-blur-md sticky top-0 z-10`}>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setReadingFile(null)}
              className={`p-2 rounded-full transition-colors ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="max-w-xs md:max-w-md">
              <h2 className="font-bold text-sm md:text-base truncate">{readingFile.name}</h2>
              <p className={`text-xs ${theme === 'dark' ? 'text-white/50' : 'text-black/50'}`}>
                {readingFile.type.toUpperCase()} • {(readingFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowTools(!showTools)}
              className={`p-2 rounded-full transition-colors ${showTools ? (theme === 'dark' ? 'bg-white/20' : 'bg-black/10') : ''} ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Reading Tools Toolbar */}
        <AnimatePresence>
          {showTools && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className={`border-b overflow-hidden ${theme === 'dark' ? 'border-white/10 bg-white/5' : 'border-black/5 bg-black/5'}`}
            >
              <div className="p-4 flex flex-wrap items-center justify-center gap-6 md:gap-12">
                {/* Font Size */}
                <div className="flex items-center gap-3">
                  <Type className="w-4 h-4 opacity-50" />
                  <input 
                    type="range" 
                    min="12" 
                    max="32" 
                    value={fontSize} 
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    className="w-24 md:w-32 accent-emerald-500 h-1 rounded-lg cursor-pointer"
                  />
                  <span className="text-xs font-mono w-6">{fontSize}</span>
                </div>

                {/* Theme */}
                <div className="flex items-center gap-2 bg-black/5 dark:bg-white/5 p-1 rounded-lg">
                  <button 
                    onClick={() => setTheme('light')}
                    className={`p-1.5 rounded-md ${theme === 'light' ? 'bg-white shadow-sm text-black' : 'opacity-50 hover:opacity-100'}`}
                  >
                    <Sun className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setTheme('sepia')}
                    className={`p-1.5 rounded-md ${theme === 'sepia' ? 'bg-[#f4ecd8] shadow-sm text-[#5b4636]' : 'opacity-50 hover:opacity-100'}`}
                  >
                    <Book className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setTheme('dark')}
                    className={`p-1.5 rounded-md ${theme === 'dark' ? 'bg-[#333] shadow-sm text-white' : 'opacity-50 hover:opacity-100'}`}
                  >
                    <Moon className="w-4 h-4" />
                  </button>
                </div>

                {/* Alignment */}
                <div className="flex items-center gap-2 bg-black/5 dark:bg-white/5 p-1 rounded-lg">
                  <button 
                    onClick={() => setTextAlign('left')}
                    className={`p-1.5 rounded-md ${textAlign === 'left' ? 'bg-white shadow-sm text-black dark:bg-[#333] dark:text-white' : 'opacity-50 hover:opacity-100'}`}
                  >
                    <AlignLeft className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setTextAlign('justify')}
                    className={`p-1.5 rounded-md ${textAlign === 'justify' ? 'bg-white shadow-sm text-black dark:bg-[#333] dark:text-white' : 'opacity-50 hover:opacity-100'}`}
                  >
                    <AlignJustify className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12 touch-scroll scroll-smooth">
          <div className={`max-w-3xl mx-auto transition-all duration-300 ease-in-out pb-24`} style={{ 
            fontSize: `${fontSize}px`,
            lineHeight: lineHeight,
            textAlign: textAlign
          }}>
             {/* Search Highlight Logic could go here, for now just simple render */}
             <div className="whitespace-pre-wrap font-serif">
               {readingFile.content}
             </div>
          </div>
        </div>
      </div>
    );
  }

  // Main Library View
  return (
    <div className="space-y-8">
      {/* Upload Area */}
      <div 
        {...getRootProps()} 
        className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer group ${
          isDragActive 
            ? 'border-emerald-500 bg-emerald-50 scale-[1.02]' 
            : 'border-slate-300 hover:border-emerald-400 hover:bg-slate-50'
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-4">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${isDragActive ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-500'}`}>
            <Upload className="w-8 h-8" />
          </div>
          <div>
            <p className="font-bold text-slate-700 text-lg">
              {isDragActive ? 'Lepaskan file di sini...' : 'Upload Ebook / Referensi'}
            </p>
            <p className="text-sm text-slate-500 mt-2">
              Drag & drop atau klik untuk memilih file (PDF, TXT, MD). <br/>
              <span className="font-medium text-emerald-600">Maksimal 1 GB per file.</span>
            </p>
          </div>
        </div>
      </div>

      {isProcessing && (
        <div className="flex items-center justify-center gap-4 text-emerald-600 bg-emerald-50 p-6 rounded-2xl border border-emerald-100 shadow-sm">
          <Loader2 className="w-6 h-6 animate-spin" />
          <div className="text-left">
            <span className="text-base font-bold block">Memproses Dokumen...</span>
            <span className="text-sm opacity-80">Mengekstrak teks & membuat ringkasan AI</span>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 text-red-600 bg-red-50 p-4 rounded-2xl border border-red-100 shadow-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* File Grid */}
      {files.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <Book className="w-4 h-4" /> Rak Referensi Anda ({files.length})
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {files.map(file => (
              <div 
                key={file.id} 
                onClick={() => setReadingFile(file)}
                className="group relative bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 flex items-start p-4 cursor-pointer"
              >
                {/* Icon */}
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 mr-4 ${
                  file.type === 'pdf' ? 'bg-red-50 text-red-500' : 
                  file.type === 'markdown' ? 'bg-blue-50 text-blue-500' : 'bg-slate-50 text-slate-500'
                }`}>
                  {file.type === 'pdf' ? <FileText className="w-6 h-6" /> : <File className="w-6 h-6" />}
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold text-slate-800 text-sm line-clamp-1" title={file.name}>
                      {file.name}
                    </h4>
                    <button 
                      onClick={(e) => removeFile(file.id, e)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors shrink-0 z-10 relative"
                      title="Hapus Referensi"
                    >
                      <Trash2 className="w-4 h-4 pointer-events-none" />
                    </button>
                  </div>
                  
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mt-1 mb-2">
                    {file.type} • {(file.size / 1024 / 1024).toFixed(2)} MB • {new Date(file.uploadDate).toLocaleDateString()}
                  </p>

                  {/* AI Summary (Compact) */}
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 group-hover:bg-emerald-50/30 group-hover:border-emerald-100 transition-colors">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Ringkasan AI</span>
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {file.summary || "Tidak ada ringkasan."}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {files.length === 0 && !isProcessing && (
        <div className="text-center py-16 bg-slate-50 rounded-3xl border border-slate-100 border-dashed">
          <div className="w-20 h-20 bg-white rounded-full shadow-sm flex items-center justify-center mx-auto mb-6">
            <Book className="w-10 h-10 text-slate-300" />
          </div>
          <h3 className="font-bold text-slate-700 text-lg">Perpustakaan Kosong</h3>
          <p className="text-slate-400 text-sm mt-2 max-w-xs mx-auto leading-relaxed">
            Upload ebook atau dokumen referensi Anda agar AI dapat mempelajarinya.
          </p>
        </div>
      )}
    </div>
  );
};

// Helper to extract text from PDF
async function extractTextFromPdf(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';

  // Limit pages to avoid browser crash on large PDFs (e.g., first 50 pages)
  const maxPages = Math.min(pdf.numPages, 100); // Increased page limit slightly

  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    
    let pageText = '';
    let lastY = -1;
    
    for (const item of textContent.items) {
      if ('str' in item && 'transform' in item) {
        // If Y coordinate changes significantly, add a newline
        if (lastY !== -1 && Math.abs(item.transform[5] - lastY) > 5) {
          pageText += '\n';
        }
        pageText += item.str;
        lastY = item.transform[5];
      }
    }
    
    fullText += `\n\n--- Halaman ${i} ---\n\n${pageText}`;
  }

  return fullText;
}
