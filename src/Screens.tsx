import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { motion, AnimatePresence } from 'motion/react';
import { PageOrganizer } from './components/PageOrganizer';
import { DownloadModal } from './components/DownloadModal';
import {
  ArrowLeft, ArrowUp, ArrowDown, FileText, Minus, Plus, Type, Palette, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  FilePlus2, Search, X, Loader2, BookOpen, Share2, Check, Copy, Printer, Activity, Play, Scissors, ChevronRight, ChevronUp, ChevronDown,
  MoonStar, PenLine, ZoomOut, ZoomIn, History, Trash2, Settings, Key, Eye, EyeOff, ShieldCheck, AlertCircle, User, Sparkles, Highlighter, Baseline, LayoutDashboard,
  Wind, Flame, Brain, Mic2, Info, Library, Book as BookIcon, Upload, CheckCircle2, Users, Wand2, Calendar, MapPin, Clock, Bookmark, Image as ImageIcon, HeartHandshake, LayoutList, CheckCheck,
  Maximize2, Minimize2, MoreVertical, Languages, Italic, Heading, Bold, Square, Eraser, Wrench
} from 'lucide-react';

import { DalilInspector } from './components/DalilInspector';
import { VocalInspector } from './components/VocalInspector';
import { GrammarInspector } from './components/GrammarInspector';
import { DoaInspector } from './components/DoaInspector';
import { StructureInspector } from './components/StructureInspector';
import { HadithLibrary } from './components/HadithLibrary';
import { AVAILABLE_MODELS } from './constants';
import { processTemplateMarkers } from './utils/templateEngine';
import { Share } from '@capacitor/share';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

const QUICK_PRESETS = [
  {
    id: 'klasik',
    name: 'Kitab Klasik',
    desc: 'Tradisional & Khusyuk (Nyaman dibaca lama)',
    vibeColor: '#d4af37',
    paperPreview: 'bg-[#FDFBF7]',
    textColorPreview: 'text-amber-950',
    settings: {
      latin: { fontFamily: "'Merriweather', serif", lineHeight: 'leading-relaxed', color: '#451a03', stripColor: '#d4af37', highlightColor: '#fef08a', textAlign: 'text-justify' },
      arabic: { fontFamily: "'Amiri', serif", color: '#451a03' },
      paperTemplate: 'classic',
      textAlign: 'text-justify'
    }
  },
  {
    id: 'modern',
    name: 'Modern Minimalis',
    desc: 'Bersih & Elegan (Cocok untuk cetak)',
    vibeColor: '#3b82f6',
    paperPreview: 'bg-white border text-center shadow-none mb-1',
    textColorPreview: 'text-slate-900',
    settings: {
      latin: { fontFamily: "'Inter', sans-serif", lineHeight: 'leading-loose', color: '#0f172a', stripColor: '#3b82f6', highlightColor: '#dbeafe', textAlign: 'text-left' },
      arabic: { fontFamily: "'Amiri', serif", color: '#0f172a' },
      paperTemplate: 'plain',
      textAlign: 'text-left'
    }
  },
  {
    id: 'teduh',
    name: 'Jumat Teduh',
    desc: 'Sejuk & Menenangkan (Adem dimata)',
    vibeColor: '#059669',
    paperPreview: 'bg-emerald-50/50',
    textColorPreview: 'text-emerald-950',
    settings: {
      latin: { fontFamily: "system-ui, sans-serif", lineHeight: 'leading-relaxed', color: '#022c22', stripColor: '#059669', highlightColor: '#a7f3d0', textAlign: 'text-justify' },
      arabic: { fontFamily: "'Amiri', serif", color: '#064e3b' },
      paperTemplate: 'plain',
      textAlign: 'text-justify'
    }
  },
  {
    id: 'fokus',
    name: 'Fokus Mimbar',
    desc: 'Kontras Tinggi untuk cahaya redup',
    vibeColor: '#ef4444',
    paperPreview: 'bg-white',
    textColorPreview: 'text-black font-semibold',
    settings: {
      latin: { fontFamily: "'Arial', sans-serif", lineHeight: 'leading-normal', color: '#000000', stripColor: '#ef4444', highlightColor: '#fde047', textAlign: 'text-left' },
      arabic: { fontFamily: "'Amiri', serif", color: '#000000' },
      paperTemplate: 'plain',
      textAlign: 'text-left'
    }
  },
  {
    id: 'jurnal',
    name: 'Estetik Jurnal',
    desc: 'Buku catatan personal (Hangat)',
    vibeColor: '#f97316',
    paperPreview: 'bg-[#fafaf9]',
    textColorPreview: 'text-stone-800',
    settings: {
      latin: { fontFamily: "ui-monospace, SFMono-Regular, monospace", lineHeight: 'leading-relaxed', color: '#292524', stripColor: '#f97316', highlightColor: '#fed7aa', textAlign: 'text-justify' },
      arabic: { fontFamily: "'Amiri', serif", color: '#44403c' },
      paperTemplate: 'craft',
      textAlign: 'text-justify'
    }
  },
  {
    id: 'bergaris',
    name: 'Buku Tulis',
    desc: 'Kertas Bergaris (Nuansa Belajar)',
    vibeColor: '#0284c7',
    paperPreview: 'bg-white',
    textColorPreview: 'text-blue-900',
    settings: {
      latin: { fontFamily: "ui-monospace, SFMono-Regular, monospace", lineHeight: 'leading-loose', color: '#1e3a8a', stripColor: '#0284c7', highlightColor: '#bae6fd', textAlign: 'text-left' },
      arabic: { fontFamily: "'Amiri', serif", color: '#1e3a8a' },
      paperTemplate: 'lined',
      textAlign: 'text-left'
    }
  },
  {
    id: 'blueprint',
    name: 'Blueprint Cetak',
    desc: 'Mode Gelap Biru (Print Reverse)',
    vibeColor: '#1e3a8a',
    paperPreview: 'bg-[#1e3a8a]',
    textColorPreview: 'text-blue-50',
    settings: {
      latin: { fontFamily: "'Inter', sans-serif", lineHeight: 'leading-relaxed', color: '#eff6ff', stripColor: '#60a5fa', highlightColor: '#1d4ed8', textAlign: 'text-justify' },
      arabic: { fontFamily: "'Noto Naskh Arabic', serif", color: '#eff6ff' },
      paperTemplate: 'blueprint',
      textAlign: 'text-justify'
    }
  },
  {
    id: 'islami-emas',
    name: 'Utsmani Emas',
    desc: 'Bingkai Elegan Emas & Mewah',
    vibeColor: '#d97706',
    paperPreview: 'bg-[#fffdf5]',
    textColorPreview: 'text-amber-900',
    settings: {
      latin: { fontFamily: "'Lora', serif", lineHeight: 'leading-relaxed', color: '#78350f', stripColor: '#d97706', highlightColor: '#fde68a', textAlign: 'text-justify' },
      arabic: { fontFamily: "'Amiri', serif", color: '#78350f' },
      paperTemplate: 'islamic-gold',
      textAlign: 'text-justify'
    }
  },
  {
    id: 'perkamen',
    name: 'Gulungan Kuno',
    desc: 'Kertas Perkamen Kuno & Klasik',
    vibeColor: '#854d0e',
    paperPreview: 'bg-[#f1e4c3]',
    textColorPreview: 'text-yellow-900',
    settings: {
      latin: { fontFamily: "'Merriweather', serif", lineHeight: 'leading-loose', color: '#422006', stripColor: '#a16207', highlightColor: '#fef08a', textAlign: 'text-justify' },
      arabic: { fontFamily: "'Scheherazade New', serif", color: '#422006' },
      paperTemplate: 'parchment',
      textAlign: 'text-justify'
    }
  },
  {
    id: 'geometri',
    name: 'Geometri Hijau',
    desc: 'Bingkai Ornamen Islami Hijau',
    vibeColor: '#059669',
    paperPreview: 'bg-white',
    textColorPreview: 'text-emerald-900',
    settings: {
      latin: { fontFamily: "'Inter', sans-serif", lineHeight: 'leading-relaxed', color: '#064e3b', stripColor: '#059669', highlightColor: '#d1fae5', textAlign: 'text-justify' },
      arabic: { fontFamily: "'Noto Naskh Arabic', serif", color: '#064e3b' },
      paperTemplate: 'ornament-4',
      textAlign: 'text-justify'
    }
  },
  {
    id: 'tarawih',
    name: 'Malam Tarawih',
    desc: 'Kertas Gelap Mewah & Menenangkan (Pilihan Terbaik Gelap)',
    vibeColor: '#1e1b4b',
    paperPreview: 'bg-[#0f172a]',
    textColorPreview: 'text-amber-200',
    settings: {
      latin: { fontFamily: "'Outfit', sans-serif", lineHeight: 'leading-loose', color: '#fde68a', stripColor: '#fbbf24', highlightColor: '#1e1b4b', textAlign: 'text-justify', fontWeight: 'font-medium' },
      arabic: { fontFamily: "'Scheherazade New', serif", color: '#fef08a' },
      paperTemplate: 'midnight-gold',
      textAlign: 'text-justify'
    }
  },
  {
    id: 'royal-kraton',
    name: 'Pusaka Kraton',
    desc: 'Buku Elegan Klasik Tinggi dengan Tepi Batik',
    vibeColor: '#581c87',
    paperPreview: 'bg-[#2e1065]',
    textColorPreview: 'text-violet-100',
    settings: {
      latin: { fontFamily: "'Lora', serif", lineHeight: 'leading-relaxed', color: '#ede9fe', stripColor: '#c084fc', highlightColor: '#3b0764', textAlign: 'text-justify', fontWeight: 'font-normal' },
      arabic: { fontFamily: "'Reem Kufi', sans-serif", color: '#ddd6fe' },
      paperTemplate: 'royal-purple',
      textAlign: 'text-justify'
    }
  },
  {
    id: 'modern-zine',
    name: 'Majalah Cetak',
    desc: 'Minimalis Tinggi Hitam Putih mirip Majalah',
    vibeColor: '#18181b',
    paperPreview: 'bg-white',
    textColorPreview: 'text-zinc-900',
    settings: {
      latin: { fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 'leading-loose', color: '#18181b', stripColor: '#3f3f46', highlightColor: '#f4f4f5', textAlign: 'text-left', fontWeight: 'font-medium' },
      arabic: { fontFamily: "'Cairo', sans-serif", color: '#18181b' },
      paperTemplate: 'modern-line',
      textAlign: 'text-left'
    }
  }
];

// --- Local Components for Performance ---
const LocalRangeInput = ({ value, min, max, step, onChange, label, formatValue }: { 
  value: number, min: number, max: number, step: number, 
  onChange: (val: number) => void, label: string, formatValue: (v: number) => string 
}) => {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] font-bold text-slate-500">
        <span>{label}</span>
        <span>{formatValue(localValue)}</span>
      </div>
      <input 
        type="range" min={min} max={max} step={step} 
        value={localValue}
        onChange={(e) => setLocalValue(parseFloat(e.target.value))}
        onMouseUp={() => onChange(localValue)}
        onTouchEnd={() => onChange(localValue)}
        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
      />
    </div>
  );
};

export const PAPER_DIMENSIONS: any = {
  'A4': { width: 794, minHeight: 1122, scale: 1.0 },
  'A5': { width: 559, minHeight: 790, scale: 0.70 },
  'B5': { width: 665, minHeight: 940, scale: 0.83 }, // Standard Buku
  'A6': { width: 397, minHeight: 561, scale: 0.50 }, // Buku Saku
  'Legal': { width: 794, minHeight: 1335, scale: 1.0 },
  'F4': { width: 794, minHeight: 1247, scale: 1.0 } // Folio
};

export const PAPER_TEMPLATES: any = {
  'plain': { name: 'Polos (Hemat Tinta)', bg: 'bg-white', border: 'border-slate-200', text: 'text-slate-900', type: 'clean' },
  'classic': { name: 'Klasik (Krem)', bg: 'bg-[#FDFBF7]', border: 'border-slate-200/60', text: 'text-slate-900', type: 'clean' },
  'lined': { name: 'Kertas Bergaris', bg: 'bg-white', border: 'border-slate-300', text: 'text-slate-900', type: 'lined' },
  'grid': { name: 'Kertas Kotak', bg: 'bg-white', border: 'border-slate-300', text: 'text-slate-900', type: 'grid' },
  'craft': { name: 'Kertas Craft', bg: 'bg-[#E6D5B8]', border: 'border-[#C4A47C]', text: 'text-slate-900', type: 'craft' },
  'parchment': { name: 'Kertas Perkamen', bg: 'bg-[#f1e4c3]', border: 'border-[#d4c49f]', text: 'text-slate-900', type: 'parchment' },
  'blueprint': { name: 'Blueprint', bg: 'bg-[#1e3a8a]', border: 'border-blue-700', text: 'text-blue-50', type: 'blueprint', isDark: true },
  'ornament-1': { name: 'Bingkai Klasik', bg: 'bg-white', border: 'border-slate-900', text: 'text-slate-900', type: 'frame-classic' },
  'ornament-2': { name: 'Bingkai Bunga', bg: 'bg-white', border: 'border-slate-900', text: 'text-slate-900', type: 'frame-floral' },
  'ornament-3': { name: 'Bingkai Arabesque', bg: 'bg-[#fffdf5]', border: 'border-amber-900/20', text: 'text-slate-900', type: 'frame-floral' },
  'ornament-4': { name: 'Geometri Islam', bg: 'bg-white', border: 'border-emerald-900', text: 'text-slate-900', type: 'frame-geo' },
  'islamic-gold': { name: 'Islami Emas', bg: 'bg-[#fffdf5]', border: 'border-amber-500', text: 'text-slate-900', type: 'frame-islamic-gold' },
  'royal': { name: 'Royal Gold', bg: 'bg-white', border: 'border-amber-600', text: 'text-slate-900', type: 'frame-royal' },
  'modern-line': { name: 'Garis Modern', bg: 'bg-white', border: 'border-slate-800', text: 'text-slate-900', type: 'frame-modern' },
  'vintage-edge': { name: 'Tepi Vintage', bg: 'bg-[#FDFBF7]', border: 'border-amber-900/30', text: 'text-amber-950', type: 'vintage-edge' },
  'minimal-border': { name: 'Minimalis', bg: 'bg-white', border: 'border-slate-200', text: 'text-slate-900', type: 'frame-minimal' },
  'double-border': { name: 'Garis Ganda', bg: 'bg-white', border: 'border-slate-900', text: 'text-slate-900', type: 'frame-double' },
  'antique': { name: 'Antik / Kuno', bg: 'bg-[#f4ecd8]', border: 'border-sepia-900', text: 'text-sepia-900', type: 'frame-antique' },
  'modern-soft': { name: 'Modern Soft', bg: 'bg-[#F8FAFC]', border: 'border-slate-200', text: 'text-slate-800', type: 'frame-modern-soft' },
  'islamic-pattern': { name: 'Pola Islami', bg: 'bg-white', border: 'border-emerald-800', text: 'text-slate-900', type: 'frame-islamic-pattern' },
  'elegant-gold': { name: 'Emas Elegan', bg: 'bg-[#FFFEFA]', border: 'border-amber-400', text: 'text-slate-900', type: 'frame-elegant-gold' },
  'manuscript': { name: 'Manuskrip Tua', bg: 'bg-[#EBDCB2]', border: 'border-[#8B4513]', text: 'text-[#3E2723]', type: 'frame-manuscript' },
  'minimal-tech': { name: 'Minimal Tech', bg: 'bg-white', border: 'border-slate-100', text: 'text-slate-900', type: 'frame-tech' },
  'royal-blue': { name: 'Royal Blue', bg: 'bg-[#1a237e]', border: 'border-blue-300', text: 'text-blue-50', type: 'frame-royal-blue', isDark: true },
  'zen-stone': { name: 'Zen Stone', bg: 'bg-[#f5f5f5]', border: 'border-stone-300', text: 'text-stone-800', type: 'frame-zen' },
  'certificate': { name: 'Sertifikat / Piagam', bg: 'bg-[#fffdf5]', border: 'border-amber-600', text: 'text-slate-900', type: 'frame-certificate' },
  'newsletter': { name: 'Buletin / Majalah', bg: 'bg-white', border: 'border-slate-800', text: 'text-slate-900', type: 'frame-newsletter' },
  'luxury-dark': { name: 'Luxury Dark', bg: 'bg-[#0a0a0a]', border: 'border-amber-500', text: 'text-amber-50', type: 'frame-luxury-dark', isDark: true },
  'midnight-gold': { name: 'Midnight Gold', bg: 'bg-[#0f172a]', border: 'border-amber-500/50', text: 'text-slate-100', type: 'frame-luxury-dark', isDark: true },
  'forest-deep': { name: 'Forest Deep', bg: 'bg-[#064e3b]', border: 'border-emerald-400/30', text: 'text-emerald-50', type: 'frame-zen', isDark: true },
  'rose-water': { name: 'Rose Water', bg: 'bg-[#fff1f2]', border: 'border-rose-200', text: 'text-rose-900', type: 'clean' },
  'slate-pro': { name: 'Slate Professional', bg: 'bg-[#334155]', border: 'border-slate-400/30', text: 'text-slate-50', type: 'frame-modern', isDark: true },
  'coffee-latte': { name: 'Coffee Latte', bg: 'bg-[#fdf8f1]', border: 'border-[#d2b48c]/50', text: 'text-[#5d4037]', type: 'clean' },
  'ocean-mist': { name: 'Ocean Mist', bg: 'bg-[#f0f9ff]', border: 'border-sky-200', text: 'text-sky-900', type: 'clean' },
  'lavender-dream': { name: 'Lavender Dream', bg: 'bg-[#f5f3ff]', border: 'border-violet-200', text: 'text-violet-900', type: 'clean' },
  'charcoal-minimal': { name: 'Charcoal Minimal', bg: 'bg-[#18181b]', border: 'border-zinc-800', text: 'text-zinc-300', type: 'clean', isDark: true },
  'sandstone': { name: 'Sandstone', bg: 'bg-[#f9f5e8]', border: 'border-[#d4c49f]', text: 'text-[#4a3728]', type: 'frame-antique' },
  'emerald-royal': { name: 'Emerald Royal', bg: 'bg-[#022c22]', border: 'border-amber-400/40', text: 'text-emerald-50', type: 'frame-islamic-gold', isDark: true },
  'royal-purple': { name: 'Royal Purple', bg: 'bg-[#2e1065]', border: 'border-amber-400/30', text: 'text-violet-50', type: 'frame-royal-blue', isDark: true },
  'terracotta': { name: 'Terracotta Warm', bg: 'bg-[#7c2d12]', border: 'border-orange-200/20', text: 'text-orange-50', type: 'frame-manuscript', isDark: true },
  'deep-ocean': { name: 'Deep Ocean', bg: 'bg-[#0c4a6e]', border: 'border-sky-300/30', text: 'text-sky-50', type: 'frame-royal-blue', isDark: true },
  'vintage-sepia': { name: 'Vintage Sepia Pro', bg: 'bg-[#fdf6e3]', border: 'border-[#93a1a1]/30', text: 'text-[#586e75]', type: 'frame-antique' },
  'obsidian-gold': { name: 'Obsidian Gold', bg: 'bg-[#1c1917]', border: 'border-amber-600/40', text: 'text-stone-200', type: 'frame-elegant-gold', isDark: true },
  'deep-maroon': { name: 'Maroon Klasik', bg: 'bg-[#450a0a]', border: 'border-red-200/20', text: 'text-red-50', type: 'frame-double', isDark: true },
  'royal-emerald': { name: 'Royal Emerald', bg: 'bg-[#064e3b]', border: 'border-amber-500/40', text: 'text-emerald-50', type: 'frame-royal', isDark: true },
  'midnight-emerald': { name: 'Midnight Emerald', bg: 'bg-[#022c22]', border: 'border-emerald-400/30', text: 'text-emerald-50', type: 'frame-geo', isDark: true },
  'royal-maroon': { name: 'Royal Maroon', bg: 'bg-[#4c0519]', border: 'border-amber-400/40', text: 'text-rose-50', type: 'frame-royal', isDark: true },
  'slate-minimal-dark': { name: 'Slate Minimal Dark', bg: 'bg-[#0f172a]', border: 'border-slate-800', text: 'text-slate-300', type: 'clean', isDark: true },
  'parchment-dark': { name: 'Perkamen Tua', bg: 'bg-[#3e2723]', border: 'border-[#5d4037]', text: 'text-[#d7ccc8]', type: 'frame-manuscript', isDark: true },
  'modern-black': { name: 'Modern Black', bg: 'bg-black', border: 'border-zinc-800', text: 'text-zinc-400', type: 'frame-tech', isDark: true },
  'nordic-white': { name: 'Nordic Minimal', bg: 'bg-[#f8fafc]', border: 'border-slate-200', text: 'text-slate-500', type: 'clean' },
  'desert-sand': { name: 'Desert Sand', bg: '#f9f5e8', border: '#e2d5b8', text: '#5d4037', type: 'clean' },
  'deep-forest-pro': { name: 'Hutan Mendalam', bg: '#064e3b', border: '#065f46', text: '#ecfdf5', type: 'clean', isDark: true },
  'royal-manuscript': { name: 'Manuskrip Kerajaan', bg: '#fffdf5', border: '#amber-500/30', text: '#451a03', type: 'frame-manuscript' },
};

export const PAGE_TEXTURES: any = {
  'none': { name: 'Polos (Tanpa Tekstur)' },
  'premium-fibers': { name: 'Serat Premium (Tebal)', url: 'https://www.transparenttextures.com/patterns/paper-fibers.png', opacity: 0.6 },
  'rough-paper': { name: 'Kertas Kasar', url: 'https://www.transparenttextures.com/patterns/rough-paper.png', opacity: 0.5 },
  'aged-paper': { name: 'Kertas Kuno (Vintage)', url: 'https://www.transparenttextures.com/patterns/aged-paper.png', opacity: 0.5 },
  'watercolor': { name: 'Kertas Cat Air', url: 'https://www.transparenttextures.com/patterns/white-wall-3.png', opacity: 0.4 },
  'rice': { name: 'Kertas Beras (Washi)', url: 'https://www.transparenttextures.com/patterns/rice-paper-2.png', opacity: 0.5 },
  'linen': { name: 'Linen (Serat Kain)', url: 'https://www.transparenttextures.com/patterns/linen.png', opacity: 0.4 },
  'cardboard': { name: 'Kardus Kasar', url: 'https://www.transparenttextures.com/patterns/cardboard.png', opacity: 0.4 },
  'cream-dust': { name: 'Bintik Estetik', url: 'https://www.transparenttextures.com/patterns/cream-dust.png', opacity: 0.6 },
  'noise': { name: 'Modern Noise', url: 'https://www.transparenttextures.com/patterns/stardust.png', opacity: 0.35 },
  'wood': { name: 'Serat Kayu Lembut', url: 'https://www.transparenttextures.com/patterns/retina-wood.png', opacity: 0.3 },
  'leather': { name: 'Kulit Premium', url: 'https://www.transparenttextures.com/patterns/clean-textile.png', opacity: 0.4 },
};

export const INK_STYLES: any = {
  'solid': { name: 'Digital Standar (Jelas)' },
  'multiply': { 
    name: 'Tinta Meresap (Halus)', 
    className: 'opacity-90',
    style: { filter: 'contrast(1.1)' }
  },
  'vintage-print': { 
    name: 'Cetak Mesin Tua (Kasar)', 
    className: 'opacity-[0.85]',
    style: { 
      filter: 'contrast(1.2) sepia(0.1)'
    } 
  },
  'letterpress': { 
    name: 'Cetak Timbul (Letterpress)', 
    className: 'opacity-90',
    style: { 
      textShadow: '0 1px 1px rgba(255,255,255,0.15), 0 -1px 1px rgba(0,0,0,0.15)'
    } 
  },
  'stempel-pudar': { 
    name: 'Stempel Pudar (Klasik)', 
    className: 'opacity-75',
    style: { 
      filter: 'contrast(1.1) blur(0.2px)'
    }
  }
};

export const COVER_STYLES = [
  { id: 'minimalist', label: 'Minimalis', prompt: 'minimalist, clean, modern, flat design, professional book cover' },
  { id: 'islamic-pattern', label: 'Pola Islami', prompt: 'intricate islamic geometric patterns, arabesque, elegant, spiritual' },
  { id: 'oil-painting', label: 'Lukisan Cat Minyak', prompt: 'oil painting style, rich textures, classical art, masterpiece' },
  { id: 'watercolor', label: 'Cat Air', prompt: 'soft watercolor illustration, ethereal, artistic, hand-painted feel' },
  { id: 'digital-art', label: 'Seni Digital', prompt: 'modern digital art, vibrant colors, sharp details, cinematic lighting' },
  { id: 'vintage', label: 'Vintage', prompt: 'vintage book cover style, aged paper texture, classic typography, historical' },
  { id: 'calligraphy', label: 'Kaligrafi', prompt: 'artistic arabic calligraphy background, spiritual, flowing lines, abstract' },
  { id: '3d-render', label: 'Modern 3D', prompt: 'modern 3d render, soft lighting, depth, clean surfaces, abstract shapes' },
  { id: 'nature', label: 'Alam & Ketenangan', prompt: 'peaceful nature landscape, serenity, mountains, forest, calm atmosphere' },
  { id: 'architectural', label: 'Arsitektur Masjid', prompt: 'grand mosque architecture, minarets, domes, intricate details, majestic' },
];

export const HEADER_STYLES: any = {
  'simple': { name: 'Sederhana', classes: 'text-center font-bold mb-6' },
  'box': { name: 'Kotak Tegas', classes: 'text-center font-bold mb-8 py-4 border-y-4 border-double border-current' },
  'ornament': { name: 'Ornamen', classes: 'text-center font-bold mb-8 py-6 bg-[url("https://www.transparenttextures.com/patterns/arabesque.png")] bg-contain border-y border-current' },
  'underlined': { name: 'Garis Bawah', classes: 'text-center font-bold mb-6 pb-2 border-b-2 border-current' },
  'ribbon': { name: 'Pita', classes: 'text-center font-bold mb-8 py-3 bg-current text-white rounded-sm shadow-sm relative before:absolute before:content-[""] before:-left-3 before:top-2 before:border-r-[12px] before:border-r-current before:border-y-[14px] before:border-y-transparent before:-z-10 after:absolute after:content-[""] after:-right-3 after:top-2 after:border-l-[12px] after:border-l-current after:border-y-[14px] after:border-y-transparent after:-z-10' },
  'double-line': { name: 'Garis Ganda', classes: 'text-center font-bold mb-8 py-3 border-y border-current relative before:absolute before:content-[""] before:left-0 before:right-0 before:-top-1.5 before:border-t before:border-current after:absolute after:content-[""] after:left-0 after:right-0 after:-bottom-1.5 after:border-b after:border-current' },
  'calligraphy': { name: 'Kaligrafi', classes: 'text-center font-bold mb-8 py-4 text-2xl tracking-widest' },
  'modern-gradient': { name: 'Modern Gradient', classes: 'text-center font-black mb-8 py-4 text-3xl bg-gradient-to-r from-emerald-600 to-indigo-600 bg-clip-text text-transparent uppercase tracking-tighter' },
  'classic-shadow': { name: 'Bayangan Klasik', classes: 'text-center font-bold mb-8 py-4 text-2xl drop-shadow-md border-b-4 border-current/20' },
  'islamic-badge': { name: 'Lencana Islami', classes: 'text-center font-bold mb-10 py-6 px-8 border-2 border-current rounded-[2rem] relative before:absolute before:inset-1 before:border before:border-current/30 before:rounded-[1.8rem]' },
};

export const DALIL_STYLES: any = {
  'none': { name: 'Tanpa Bingkai', container: 'my-4', text: '' },
  'left-line': { name: 'Garis Kiri', container: 'my-6 pl-4 border-l-4 border-current', text: 'italic' },
  'box': { name: 'Kotak', container: 'my-6 p-6 border border-current rounded-lg', text: '' },
  'brackets': { name: 'Kurung Siku', container: 'my-6 p-4 border-x-4 border-current bg-slate-500/10', text: '' },
  'shaded': { name: 'Blok Warna', container: 'my-6 p-6 bg-slate-500/10 rounded-xl', text: '' },
  'elegant-frame': { name: 'Bingkai Elegan', container: 'my-8 p-8 border-2 border-current relative before:absolute before:inset-1 before:border before:border-current/50', text: '' },
  'quote-marks': { name: 'Tanda Kutip', container: 'my-8 pl-12 relative before:absolute before:content-["\\""] before:text-6xl before:left-0 before:-top-4 before:text-current/30 before:font-serif', text: '' },
  'minimal-accent': { name: 'Aksen Minimal', container: 'my-6 py-4 border-y border-current/20', text: '' },
  'stripe-line': { name: 'Garis Strip (Koma)', container: 'my-6 pl-4 border-l-4 border-current/30 bg-slate-500/10 rounded-r-xl py-4', text: '' },
  'double-box': { name: 'Kotak Ganda', container: 'my-8 p-6 border-4 border-double border-current rounded-xl', text: '' },
  'top-bottom-line': { name: 'Garis Atas-Bawah', container: 'my-8 py-6 border-y-2 border-current font-medium', text: 'text-center' },
  'soft-glow': { name: 'Kilau Lembut', container: 'my-8 p-6 bg-white shadow-[0_0_20px_rgba(0,0,0,0.05)] rounded-2xl border border-slate-100', text: '' },
};

export const MARGIN_TEMPLATES: any = {
  'normal': { name: 'Normal (Standar)', class: 'p-16' },
  'narrow': { name: 'Sempit (Hemat Kertas)', class: 'p-8' },
  'wide': { name: 'Lebar (Elegan)', class: 'p-24' },
  'book': { name: 'Buku Saku (Kecil)', class: 'px-12 py-16' },
  'academic': { name: 'Akademik (Skripsi)', class: 'pt-20 pb-16 px-16' },
  'magazine': { name: 'Majalah (Modern)', class: 'pt-24 pb-16 px-16' },
  'minimal': { name: 'Minimalis', class: 'p-6' },
  'classic': { name: 'Klasik (Bingkai)', class: 'p-16 border-[24px] border-transparent' },
};

export const COLOR_VIBES = [
  { id: 'light', name: 'Al-Nur (Terang)', bg: '#ffffff', border: '#e2e8f0', text: '#1e293b', arabic: '#047857', accent: '#10b981', highlight: '#fef08a' },
  { id: 'sepia', name: 'Utsmani (Sepia)', bg: '#fef3c7', border: '#fcd34d', text: '#78350f', arabic: '#92400e', accent: '#d97706', highlight: '#fde68a' },
  { id: 'dark', name: 'Lail (Malam)', bg: '#0f172a', border: '#334155', text: '#f8fafc', arabic: '#34d399', accent: '#10b981', highlight: '#1e293b' },
  { id: 'sacred-emerald', name: 'Zamrud Suci', bg: '#022C22', border: '#064E3B', text: '#F0FDF4', arabic: '#34D399', accent: '#10B981', highlight: '#022C22' },
  { id: 'royal-gold', name: 'Emas Kerajaan', bg: '#FFFEFA', border: '#FDE68A', text: '#451A03', arabic: '#B45309', accent: '#D97706', highlight: '#FEF3C7' },
  { id: 'midnight-luxury', name: 'Midnight Gold', bg: '#09090B', border: '#27272A', text: '#E4E4E7', arabic: '#D4AF37', accent: '#F59E0B', highlight: '#18181B' },
  { id: 'deep-maroon', name: 'Marun Klasik', bg: '#450A0A', border: '#7F1D1D', text: '#FEF2F2', arabic: '#F87171', accent: '#EF4444', highlight: '#7F1D1D' },
  { id: 'clay-earth', name: 'Tanah Liat', bg: '#FDF8F6', border: '#F5E6E0', text: '#431407', arabic: '#9A3412', accent: '#EA580C', highlight: '#FFEDD5' },
  { id: 'slate-minimal', name: 'Slate Modern', bg: '#334155', border: '#1E293B', text: '#F1F5F9', arabic: '#94A3B8', accent: '#64748B', highlight: '#1E293B' },
  { id: 'matcha-tea', name: 'Teh Hijau', bg: '#F0F4EF', border: '#DCE4D9', text: '#2D3A27', arabic: '#507D50', accent: '#86A386', highlight: '#DCE4D9' },
  { id: 'nebula-dust', name: 'Nebula Spiritual', bg: '#1A1B26', border: '#24283B', text: '#A9B1D6', arabic: '#7AA2F7', accent: '#BB9AF7', highlight: '#414868' },
  { id: 'sand-dune', name: 'Padang Pasir', bg: '#F9F5E8', border: '#E2D5B8', text: '#4A3728', arabic: '#8B5A2B', accent: '#C4A484', highlight: '#E2D5B8' },
  { id: 'navy-deep', name: 'Samudra Dalam', bg: '#082F49', border: '#0C4A6E', text: '#F0F9FF', arabic: '#38BDF8', accent: '#0EA5E9', highlight: '#082F49' },
  { id: 'rose-quartz', name: 'Rose Quartz', bg: '#FFF1F2', border: '#FFE4E6', text: '#881337', arabic: '#BE123C', accent: '#FB7185', highlight: '#FFE4E6' },
  { id: 'nordic-snow', name: 'Nordic Snow', bg: '#F8FAFC', border: '#F1F5F9', text: '#475569', arabic: '#0891B2', accent: '#0EA5E9', highlight: '#E0F2FE' },
  { id: 'vintage-polaroid', name: 'Polaroid Retro', bg: '#F8F4E3', border: '#E7E0C9', text: '#3D3D3D', arabic: '#B85C5C', accent: '#7B8FA1', highlight: '#E7E0C9' },
];

const applyRhetoricVisuals = (text: string, styleSettings?: any, hidePauses: boolean = false, terjemahanMukadimah: boolean = false, latinMukadimah: boolean = false) => {
  if (!text) return text;
  
  // Strip Metadata
  let processed = text.replace(/\[VISUAL_PHILOSOPHY\]:.*$/m, '')
                      .replace(/\[DAFTAR_ISI\]:.*$/m, '')
                      .trim();
  
  // Process template markers first
  processed = processTemplateMarkers(processed, terjemahanMukadimah, latinMukadimah);
  
  // Tones
  processed = processed.replace(/\[TONE:Lembut\]/g, '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 text-[10px] font-bold uppercase tracking-wider mx-1 align-middle select-none shadow-sm border border-sky-200">☁️ Lembut</span>');
  processed = processed.replace(/\[TONE:Tegas\]/g, '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold uppercase tracking-wider mx-1 align-middle select-none shadow-sm border border-rose-200">🔥 Tegas</span>');
  processed = processed.replace(/\[TONE:Reflektif\]/g, '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-bold uppercase tracking-wider mx-1 align-middle select-none shadow-sm border border-purple-200">💡 Reflektif</span>');
  
  // Pauses
  if (hidePauses) {
    processed = processed.replace(/\[PAUSE:Short\]/g, '');
    processed = processed.replace(/\[PAUSE:Long\]/g, '');
  } else {
    processed = processed.replace(/\[PAUSE:Short\]/g, '<span class="inline-block mx-1 text-emerald-400 font-bold select-none text-sm">/</span>');
    processed = processed.replace(/\[PAUSE:Long\]/g, '<span class="inline-block mx-1 text-emerald-500 font-bold select-none text-sm">//</span>');
  }
  
  // Marker Styles from Settings
  const stripCol = styleSettings?.latin?.stripColor || '#10b981';
  const highCol = styleSettings?.latin?.highlightColor || '#fef08a';
  const stripVibe = styleSettings?.latin?.stripVibe || 'standard';
  const highVibe = styleSettings?.latin?.highlightVibe || 'standard';

  const getVibeStyle = (type: 'strip' | 'highlight', vibe: string, baseColor: string) => {
    if (vibe === 'pastel') {
      return type === 'strip' ? `border-color: ${baseColor}; opacity: 0.7;` : `background-color: ${baseColor}; opacity: 0.6;`;
    }
    if (vibe === 'neon') {
      return type === 'strip' 
        ? `border-color: ${baseColor}; box-shadow: 0 0 5px ${baseColor};` 
        : `background-color: ${baseColor}; box-shadow: 0 0 8px ${hexToRgba(baseColor, 0.5)};`;
    }
    return type === 'strip' ? `border-color: ${baseColor};` : `background-color: ${baseColor};`;
  };

  const stripStyle = getVibeStyle('strip', stripVibe, stripCol);
  const highlightStyle = getVibeStyle('highlight', highVibe, highCol);

  // Merge adjacent manual markers separated by spaces before replacing them with HTML
  const allTagsRegex = ['STRIP', 'DOUBLE', 'STABILO', 'THIN', 'BOX', 'TEKAN'];
  allTagsRegex.forEach(tag => {
    // Matches e.g. [/STABILO] [STABILO] or [/STABILO]   [STABILO]
    const mergePattern = new RegExp(`\\[\\/${tag}\\](\\s+)\\[${tag}\\]`, 'g');
    // We apply it multiple times in case of multiple sequential tags e.g. w1 w2 w3
    let previous = '';
    while (processed !== previous) {
      previous = processed;
      processed = processed.replace(mergePattern, '$1');
    }
  });

  // Emphasis
  processed = processed.replace(/\[TEKAN\](.*?)\[\/TEKAN\]/g, `<mark class="px-1 rounded-sm font-bold shadow-sm" style="${highlightStyle}">$1</mark>`);
  
  // Custom Manual Markers
  processed = processed.replace(/\[STRIP\](.*?)\[\/STRIP\]/g, `<span class="border-b-2 pb-0.5 transition-all" style="${stripStyle}">$1</span>`);
  processed = processed.replace(/\[DOUBLE\](.*?)\[\/DOUBLE\]/g, `<span class="border-b-4 border-double pb-0.5 transition-all" style="${stripStyle}">$1</span>`);
  processed = processed.replace(/\[STABILO\](.*?)\[\/STABILO\]/g, `<mark class="px-1 rounded-sm transition-all" style="${highlightStyle}">$1</mark>`);
  processed = processed.replace(/\[THIN\](.*?)\[\/THIN\]/g, '<span class="font-extralight text-slate-500 italic">$1</span>');
  processed = processed.replace(/\[BOX\](.*?)\[\/BOX\]/g, `<span class="border px-1 rounded-md transition-all" style="${stripStyle}">$1</span>`);
  
  return processed;
};

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  MouseSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  closestCorners,
  useDroppable,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GoogleGenAI } from '@google/genai';
import { KITAB_DATABASE, Kitab, KitabChapter } from './data/kitabData';
import { LibraryScreen } from './components/LibraryScreen';
import { ReferenceManager, ReferenceFile } from './components/ReferenceManager';
import { QuranReference } from './components/QuranReference';
import { KitabBrowser } from './components/KitabBrowser';

export const ReferenceScreen = ({ apiKey, references, setReferences, setCurrentScreen }: any) => {
  const [activeSource, setActiveSource] = useState<'koleksi' | 'quran'>('koleksi');
  const [localSearchQuery, setLocalSearchQuery] = useState('');

  const handleAddReference = (content: string, name: string) => {
    const newRef: ReferenceFile = {
      id: `ref-${Date.now()}`,
      name: name,
      type: 'markdown',
      content: content,
      size: content.length,
      uploadDate: new Date()
    };
    setReferences([...references, newRef]);
  };

  const handleNavigateToBook = (bookId: string) => {
    localStorage.setItem('selectedBookId', bookId);
    setCurrentScreen('library');
  };

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header */}
      <div className="p-4 bg-white border-b border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Maktabah Digital</h1>
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Sumber Referensi Khotbah</p>
          </div>
          <div className="flex gap-2">
            <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center border border-emerald-100">
              <BookOpen className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
        </div>

        {/* Local Search Bar */}
        <div className="relative mb-4">
          <input 
            type="text" 
            value={localSearchQuery}
            onChange={(e) => setLocalSearchQuery(e.target.value)}
            placeholder={`Cari di dalam ${activeSource === 'koleksi' ? 'koleksi file' : 'Quran'}...`}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          {localSearchQuery && (
            <button 
              onClick={() => setLocalSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 rounded-full transition-all"
            >
              <X className="w-3 h-3 text-slate-400" />
            </button>
          )}
        </div>

        {/* Source Toggle Tabs */}
        <div className="flex p-1 bg-slate-100 rounded-xl">
          <button 
            onClick={() => setActiveSource('koleksi')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-lg transition-all ${activeSource === 'koleksi' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Library className="w-3.5 h-3.5" />
            Koleksi
          </button>
          <button 
            onClick={() => setActiveSource('quran')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-lg transition-all ${activeSource === 'quran' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <BookIcon className="w-3.5 h-3.5" />
            Quran
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 pb-24 touch-scroll">
        <AnimatePresence mode="wait">
          {activeSource === 'koleksi' && (
            <motion.div
              key="koleksi"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm"
            >
              <div className="mb-5">
                <h3 className="font-bold text-slate-800">Upload & Rak Buku</h3>
                <p className="text-xs text-slate-500 mt-1">Kelola file PDF/TXT/MD pribadi Anda.</p>
              </div>
              <ReferenceManager 
                files={references?.filter((f: any) => f.name.toLowerCase().includes(localSearchQuery.toLowerCase())) || []} 
                onFilesChange={setReferences} 
                apiKey={apiKey}
              />
            </motion.div>
          )}

          {activeSource === 'quran' && (
            <motion.div
              key="quran"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm"
            >
              <div className="mb-5">
                <h3 className="font-bold text-slate-800">Quran.com</h3>
                <p className="text-xs text-slate-500 mt-1">Cari ayat untuk referensi naskah.</p>
              </div>
              <QuranReference 
                onAddToReference={handleAddReference}
                existingReferences={references}
                onNavigateToBook={handleNavigateToBook}
                initialSearchQuery={localSearchQuery}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export const HistoryScreen = ({ history, openHistoryItem, deleteHistoryItem, updateHistoryItem, resumeGeneration }: any) => {
  const [activeTab, setActiveTab] = useState<'jadwal' | 'koleksi' | 'riwayat'>('jadwal');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title'>('newest');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const categories = ['Semua', 'Sabar', 'Keluarga', 'Rezeki', 'Pemuda', 'Akhlak', 'Aqidah', 'Lainnya'];

  const bookmarkedItems = history.filter((item: any) => item.isBookmarked);
  const scheduledItems = history.filter((item: any) => item.scheduleDate).sort((a: any, b: any) => new Date(a.scheduleDate).getTime() - new Date(b.scheduleDate).getTime());

  const filteredBookmarks = selectedCategory === 'Semua' 
    ? bookmarkedItems 
    : bookmarkedItems.filter((item: any) => item.category === selectedCategory);

  const filteredHistory = history
    .filter((item: any) => 
      item.tema.toLowerCase().includes(searchQuery.toLowerCase()) || 
      item.jenis.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a: any, b: any) => {
      if (sortBy === 'newest') return parseInt(b.id) - parseInt(a.id);
      if (sortBy === 'oldest') return parseInt(a.id) - parseInt(b.id);
      if (sortBy === 'title') return a.tema.localeCompare(b.tema);
      return 0;
    });

  return (
    <div className="pb-24 pt-4 px-4 h-full overflow-y-auto touch-scroll bg-slate-50">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Agenda & Koleksi</h1>
        {activeTab === 'riwayat' && history.length > 0 && (
          <button 
            onClick={() => {
              if (window.confirm('Hapus semua riwayat naskah?')) {
                history.forEach((item: any) => deleteHistoryItem(item.id));
              }
            }}
            className="text-[10px] font-bold text-red-500 hover:text-red-700 uppercase tracking-wider flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" /> Bersihkan
          </button>
        )}
      </div>
      
      {/* Tabs */}
      <div className="flex bg-white p-1 rounded-xl shadow-sm mb-6 border border-slate-100">
        <button onClick={() => setActiveTab('jadwal')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'jadwal' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
          <Calendar className="w-4 h-4" /> Jadwal
        </button>
        <button onClick={() => setActiveTab('koleksi')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'koleksi' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
          <Bookmark className="w-4 h-4" /> Tersimpan
        </button>
        <button onClick={() => setActiveTab('riwayat')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'riwayat' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
          <History className="w-4 h-4" /> Riwayat
        </button>
      </div>

      {activeTab === 'riwayat' && history.length > 0 && (
        <div className="flex flex-col gap-3 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Cari tema atau jenis khotbah..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all shadow-sm"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Urutkan:</span>
            <button 
              onClick={() => setSortBy('newest')}
              className={`px-3 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all ${sortBy === 'newest' ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-slate-500 border border-slate-100'}`}
            >
              Terbaru
            </button>
            <button 
              onClick={() => setSortBy('oldest')}
              className={`px-3 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all ${sortBy === 'oldest' ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-slate-500 border border-slate-100'}`}
            >
              Terlama
            </button>
            <button 
              onClick={() => setSortBy('title')}
              className={`px-3 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all ${sortBy === 'title' ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-slate-500 border border-slate-100'}`}
            >
              Abjad
            </button>
          </div>
        </div>
      )}

      {activeTab === 'jadwal' && (
        <div className="space-y-6">
          {scheduledItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400 space-y-4 bg-white rounded-3xl border border-slate-100 border-dashed">
              <Calendar className="w-12 h-12 opacity-20" />
              <p className="text-sm font-bold">Belum ada jadwal khotbah.</p>
              <p className="text-xs text-slate-400 text-center px-8">Buka naskah dari Riwayat atau Koleksi, lalu atur jadwal untuk mengaktifkan pengingat.</p>
            </div>
          ) : (
            scheduledItems.map((item: any) => {
              const scheduleDate = new Date(item.scheduleDate);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              scheduleDate.setHours(0, 0, 0, 0);
              const diffTime = scheduleDate.getTime() - today.getTime();
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              
              const isToday = diffDays === 0;
              const isPast = diffDays < 0;
              const isUrgent = diffDays > 0 && diffDays <= 2;

              return (
                <motion.div 
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="relative group"
                >
                  {/* Decorative Background Element */}
                  <div className={`absolute -inset-0.5 rounded-[2rem] blur opacity-20 group-hover:opacity-40 transition duration-500 ${
                    isToday ? 'bg-emerald-500' : isUrgent ? 'bg-amber-500' : isPast ? 'bg-slate-400' : 'bg-blue-500'
                  }`} />
                  
                  <div className="relative bg-white p-6 rounded-[1.8rem] border border-slate-100 shadow-sm overflow-hidden">
                    {/* Status Badge */}
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest ${
                            isToday ? 'bg-emerald-100 text-emerald-700' : 
                            isUrgent ? 'bg-amber-100 text-amber-700' : 
                            isPast ? 'bg-slate-100 text-slate-500' : 
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {isToday ? 'Hari Ini' : isPast ? 'Selesai' : `${diffDays} Hari Lagi`}
                          </span>
                          <span className="text-[10px] font-bold text-slate-300 uppercase tracking-tighter">{item.jenis}</span>
                        </div>
                        <h3 className="font-bold text-slate-800 text-xl leading-tight group-hover:text-emerald-600 transition-colors">{item.tema}</h3>
                      </div>
                      
                      {/* Date Circle */}
                      <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0 border-2 ${
                        isToday ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 
                        isUrgent ? 'bg-amber-50 border-amber-200 text-amber-700' : 
                        isPast ? 'bg-slate-50 border-slate-200 text-slate-400' : 
                        'bg-blue-50 border-blue-200 text-blue-700'
                      }`}>
                        <span className="text-xl font-black leading-none">{scheduleDate.getDate()}</span>
                        <span className="text-[8px] font-bold uppercase tracking-widest">{scheduleDate.toLocaleDateString('id-ID', { month: 'short' })}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-5">
                      <div className="bg-slate-50/80 p-3 rounded-2xl flex items-center gap-3 border border-slate-100">
                        <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm">
                          <MapPin className="w-4 h-4 text-emerald-500" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Lokasi</span>
                          <span className="text-xs font-bold text-slate-700 truncate max-w-[100px]">{item.scheduleLocation || 'Belum diatur'}</span>
                        </div>
                      </div>
                      <div className="bg-slate-50/80 p-3 rounded-2xl flex items-center gap-3 border border-slate-100">
                        <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm">
                          <Clock className="w-4 h-4 text-blue-500" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Waktu</span>
                          <span className="text-xs font-bold text-slate-700">{scheduleDate.toLocaleDateString('id-ID', { weekday: 'short' })}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button 
                        onClick={() => openHistoryItem(item)} 
                        className="flex-[2] bg-slate-900 hover:bg-black text-white py-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-200"
                      >
                        <BookOpen className="w-4 h-4" /> Buka Naskah
                      </button>
                      <button 
                        onClick={() => updateHistoryItem(item.id, { scheduleDate: undefined, scheduleLocation: undefined })} 
                        className="flex-1 bg-rose-50 text-rose-600 hover:bg-rose-100 py-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-center"
                        title="Hapus Jadwal"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      )}

      {activeTab === 'koleksi' && (
        <div className="space-y-4">
          <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
            {categories.map(cat => (
              <button 
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${selectedCategory === cat ? 'bg-emerald-600 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200 hover:border-emerald-300'}`}
              >
                {cat}
              </button>
            ))}
          </div>

          {filteredBookmarks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400 space-y-4 bg-white rounded-2xl border border-slate-100 border-dashed">
              <Bookmark className="w-12 h-12 opacity-20" />
              <p className="text-sm font-bold">Belum ada naskah tersimpan.</p>
              <p className="text-xs text-slate-400 text-center px-8">Buka naskah dari Riwayat, lalu klik ikon Bookmark untuk menyimpannya di sini.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredBookmarks.map((item: any) => (
                <div key={item.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex justify-between items-center group">
                  <div onClick={() => openHistoryItem(item)} className="flex-1 cursor-pointer">
                    <h3 className="font-semibold text-slate-800 line-clamp-1 group-hover:text-emerald-600 transition-colors">{item.tema}</h3>
                    <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-500 font-medium">
                      <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md">{item.category || 'Lainnya'}</span>
                      <span>• {item.jenis}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => updateHistoryItem(item.id, { isBookmarked: false, category: undefined })}
                    className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"
                  >
                    <Bookmark className="w-5 h-5 fill-current" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'riwayat' && (
        <div className="space-y-3">
          {filteredHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400 space-y-4 bg-white rounded-2xl border border-slate-100 border-dashed">
              <History className="w-12 h-12 opacity-20" />
              <p className="text-sm">{searchQuery ? 'Tidak ada hasil pencarian.' : 'Belum ada riwayat naskah.'}</p>
            </div>
          ) : (
            filteredHistory.map((item: any) => {
              const wordCount = item.content ? item.content.split(/\s+/).filter((w: string) => w.length > 0).length : 0;
              const readingTime = Math.ceil(wordCount / 120); // Approx 120 wpm
              const previewText = item.content ? item.content.replace(/[#*`]/g, '').substring(0, 80).trim() + '...' : 'Belum ada konten...';
              
              // Dynamic Color Logic based on Reading Time
              // 0-5: Emerald (Short), 6-10: Blue (Medium), 11-15: Amber (Long), 16+: Rose (Epic)
              const getTimeColor = (time: number) => {
                if (time <= 5) return { 
                  border: 'border-emerald-200/50', 
                  bg: 'bg-gradient-to-br from-emerald-50/80 via-teal-50/50 to-emerald-50/80', 
                  accent: 'bg-emerald-500', 
                  text: 'text-emerald-700', 
                  label: 'Ringkas',
                  stampColor: 'text-emerald-600/10'
                };
                if (time <= 10) return { 
                  border: 'border-blue-200/50', 
                  bg: 'bg-gradient-to-br from-blue-50/80 via-indigo-50/50 to-blue-50/80', 
                  accent: 'bg-blue-500', 
                  text: 'text-blue-700', 
                  label: 'Standar',
                  stampColor: 'text-blue-600/10'
                };
                if (time <= 15) return { 
                  border: 'border-amber-200/50', 
                  bg: 'bg-gradient-to-br from-amber-50/80 via-orange-50/50 to-amber-50/80', 
                  accent: 'bg-amber-500', 
                  text: 'text-amber-700', 
                  label: 'Mendalam',
                  stampColor: 'text-amber-600/10'
                };
                return { 
                  border: 'border-rose-200/50', 
                  bg: 'bg-gradient-to-br from-rose-50/80 via-pink-50/50 to-rose-50/80', 
                  accent: 'bg-rose-500', 
                  text: 'text-rose-700', 
                  label: 'Komprehensif',
                  stampColor: 'text-rose-600/10'
                };
              };
              
              const colors = getTimeColor(readingTime);
              
              // Analysis Grade Logic
              let analysisGrade = null;
              if (item.analysisResult) {
                try {
                  const data = JSON.parse(item.analysisResult);
                  const score = data.score || 0;
                  analysisGrade = { score };
                } catch (e) { /* ignore */ }
              }
              
              return (
                <div 
                  key={item.id} 
                  className={`rounded-2xl border ${colors.border} ${colors.bg} shadow-sm hover:shadow-md transition-all group overflow-hidden relative backdrop-blur-sm`}
                >
                  {/* Shiny Overlay Effect */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                  
                  {/* Stamp Effect for Grade */}
                  {analysisGrade && (
                    <div className={`absolute -bottom-2 -right-2 text-8xl font-black ${colors.stampColor} select-none pointer-events-none -rotate-12 uppercase italic tracking-tighter`}>
                      {analysisGrade.score}
                    </div>
                  )}
                  
                  <div className="p-4 sm:p-5 relative z-10">
                    <div className="flex justify-between items-start gap-4 mb-3">
                      <div onClick={() => openHistoryItem(item)} className="flex-1 cursor-pointer">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="font-bold text-slate-800 text-lg leading-tight group-hover:text-emerald-700 transition-colors line-clamp-1">
                            {item.tema}
                          </h3>
                          {item.status === 'generating' && (
                            <span className="flex items-center gap-1 text-[9px] font-bold bg-white/80 text-amber-700 px-2 py-0.5 rounded-full animate-pulse uppercase tracking-wider border border-amber-200 shadow-sm">
                              <Loader2 className="w-2.5 h-2.5 animate-spin" />
                              Proses
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-[11px] text-slate-500 font-medium">
                          <span className={`flex items-center gap-1 bg-white/60 ${colors.text} px-2 py-0.5 rounded-md border ${colors.border}`}>
                            <BookOpen className="w-3 h-3" /> {item.jenis}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {item.date}
                          </span>
                          <span className={`flex items-center gap-1 text-[9px] font-bold uppercase tracking-tighter opacity-70`}>
                            {colors.label}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        {item.status === 'generating' && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); resumeGeneration(item); }}
                            className="p-2 text-amber-600 hover:bg-amber-50 rounded-xl transition-colors flex items-center gap-1"
                            title="Lanjutkan penulisan naskah"
                          >
                            <Play className="w-5 h-5" />
                          </button>
                        )}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(item.content);
                            setCopiedId(item.id);
                            setTimeout(() => setCopiedId(null), 2000);
                          }}
                          className={`p-2 transition-colors rounded-xl ${copiedId === item.id ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 hover:text-emerald-500 hover:bg-emerald-50'}`}
                          title="Salin Naskah"
                        >
                          {copiedId === item.id ? <CheckCheck className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                        </button>
                        <button 
                          onClick={() => updateHistoryItem(item.id, { isBookmarked: !item.isBookmarked, category: item.isBookmarked ? undefined : 'Lainnya' })}
                          className={`p-2 transition-colors rounded-xl ${item.isBookmarked ? 'text-emerald-500 bg-emerald-50' : 'text-slate-400 hover:text-emerald-500 hover:bg-slate-50'}`}
                        >
                          <Bookmark className={`w-5 h-5 ${item.isBookmarked ? 'fill-current' : ''}`} />
                        </button>
                        <button 
                          onClick={() => deleteHistoryItem(item.id)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    <div onClick={() => openHistoryItem(item)} className="cursor-pointer">
                      <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed italic opacity-80">
                        "{previewText}"
                      </p>

                      <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            <FileText className="w-3.5 h-3.5 text-emerald-500/60" />
                            <span>{wordCount} Kata</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            <Clock className="w-3.5 h-3.5 text-blue-500/60" />
                            <span>± {readingTime} Menit</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 uppercase tracking-wider group-hover:translate-x-1 transition-transform">
                          Buka <ChevronRight className="w-3 h-3" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

const renderPaperDecorations = (paperTemplate: string, styleSettings: any) => {
  return (
    <>
      {PAPER_TEMPLATES[paperTemplate].type === 'frame-classic' && (
        <div className="absolute inset-3 border-2 border-current pointer-events-none" style={{ opacity: styleSettings?.page?.decorationOpacity ?? 0.2 }}></div>
      )}
      {PAPER_TEMPLATES[paperTemplate].type === 'frame-floral' && (
        <div className="absolute inset-0 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/flower.png')] opacity-10" style={{ filter: PAPER_TEMPLATES[paperTemplate].isDark ? 'invert(1)' : 'none', opacity: styleSettings?.page?.decorationOpacity ?? 0.1 }}></div>
      )}
      {PAPER_TEMPLATES[paperTemplate].type === 'frame-geo' && (
        <div className="absolute inset-0 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/arabesque.png')] opacity-5" style={{ filter: PAPER_TEMPLATES[paperTemplate].isDark ? 'invert(1)' : 'none', opacity: styleSettings?.page?.decorationOpacity ?? 0.05 }}></div>
      )}
      {PAPER_TEMPLATES[paperTemplate].type === 'lined' && (
        <div className="absolute inset-0 pointer-events-none" style={{ opacity: styleSettings?.page?.decorationOpacity ?? 0.2, backgroundImage: `repeating-linear-gradient(transparent, transparent 31px, ${PAPER_TEMPLATES[paperTemplate].isDark ? 'rgba(255,255,255,0.1)' : '#94a3b8'} 31px, ${PAPER_TEMPLATES[paperTemplate].isDark ? 'rgba(255,255,255,0.1)' : '#94a3b8'} 32px)`, backgroundPositionY: '4rem' }}></div>
      )}
      {PAPER_TEMPLATES[paperTemplate].type === 'grid' && (
        <div className="absolute inset-0 pointer-events-none" style={{ opacity: styleSettings?.page?.decorationOpacity ?? 0.1, backgroundImage: `linear-gradient(${PAPER_TEMPLATES[paperTemplate].isDark ? 'rgba(255,255,255,0.1)' : '#94a3b8'} 1px, transparent 1px), linear-gradient(90deg, ${PAPER_TEMPLATES[paperTemplate].isDark ? 'rgba(255,255,255,0.1)' : '#94a3b8'} 1px, transparent 1px)`, backgroundSize: '20px 20px' }}></div>
      )}
      {PAPER_TEMPLATES[paperTemplate].type === 'craft' && (
        <div className="absolute inset-0 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/paper.png')]" style={{ opacity: styleSettings?.page?.decorationOpacity ?? 0.4 }}></div>
      )}
      {PAPER_TEMPLATES[paperTemplate].type === 'parchment' && (
        <div className="absolute inset-0 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/old-wall.png')]" style={{ opacity: styleSettings?.page?.decorationOpacity ?? 0.6 }}></div>
      )}
      {PAPER_TEMPLATES[paperTemplate].type === 'blueprint' && (
        <div className="absolute inset-0 pointer-events-none" style={{ opacity: styleSettings?.page?.decorationOpacity ?? 0.2, backgroundImage: 'linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
      )}
      {PAPER_TEMPLATES[paperTemplate].type === 'vintage-edge' && (
        <div className="absolute inset-4 border border-current pointer-events-none rounded-sm shadow-[inset_0_0_40px_rgba(120,53,15,0.1)]" style={{ opacity: (styleSettings?.page?.decorationOpacity ?? 0.1) * 10 }}></div>
      )}
      {PAPER_TEMPLATES[paperTemplate].type === 'frame-modern' && (
        <div className="absolute inset-6 border-l-4 border-t-4 border-current pointer-events-none" style={{ opacity: styleSettings?.page?.decorationOpacity ?? 0.3 }}></div>
      )}
      {PAPER_TEMPLATES[paperTemplate].type === 'frame-islamic-gold' && (
        <div className="absolute inset-0 pointer-events-none border-[16px] border-amber-500/20 shadow-[inset_0_0_0_2px_rgba(245,158,11,0.5)]" style={{ opacity: (styleSettings?.page?.decorationOpacity ?? 0.1) * 10 }}>
          <div className="absolute inset-2 border border-amber-500/30"></div>
        </div>
      )}
      {PAPER_TEMPLATES[paperTemplate].type === 'frame-royal' && (
        <div className="absolute inset-0 pointer-events-none border-[24px] border-amber-600/10" style={{ opacity: (styleSettings?.page?.decorationOpacity ?? 0.1) * 10 }}>
          <div className="absolute inset-4 border-2 border-amber-600/40"></div>
          <div className="absolute inset-6 border border-amber-600/20"></div>
        </div>
      )}
      {PAPER_TEMPLATES[paperTemplate].type === 'frame-minimal' && (
        <div className="absolute inset-8 border border-current pointer-events-none" style={{ opacity: 0.2 }}></div>
      )}
      {PAPER_TEMPLATES[paperTemplate].type === 'frame-double' && (
        <div className="absolute inset-4 border-4 border-double border-current pointer-events-none" style={{ opacity: 0.3 }}></div>
      )}
      {PAPER_TEMPLATES[paperTemplate].type === 'frame-antique' && (
        <div className="absolute inset-0 pointer-events-none border-[30px] border-current/10 shadow-[inset_0_0_50px_rgba(0,0,0,0.1)]">
          <div className="absolute inset-6 border-2 border-current/30 rounded-sm"></div>
        </div>
      )}
      {PAPER_TEMPLATES[paperTemplate].type === 'frame-modern-soft' && (
        <div className="absolute inset-0 pointer-events-none border-[12px] border-current/5 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)]"></div>
      )}
      {PAPER_TEMPLATES[paperTemplate].type === 'frame-islamic-pattern' && (
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/islamic-art.png')] bg-repeat" style={{ filter: PAPER_TEMPLATES[paperTemplate].isDark ? 'invert(1)' : 'none' }}></div>
      )}
      {PAPER_TEMPLATES[paperTemplate].type === 'frame-elegant-gold' && (
        <div className="absolute inset-0 pointer-events-none border-[20px] border-amber-500/5">
          <div className="absolute inset-2 border border-amber-500/20"></div>
          <div className="absolute inset-4 border-[2px] border-amber-500/10"></div>
        </div>
      )}
      {PAPER_TEMPLATES[paperTemplate].type === 'frame-manuscript' && (
        <div className="absolute inset-0 pointer-events-none border-[32px] border-current/5 shadow-[inset_0_0_60px_rgba(139,69,19,0.1)]">
          <div className="absolute inset-6 border border-current/20"></div>
        </div>
      )}
      {PAPER_TEMPLATES[paperTemplate].type === 'frame-tech' && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 w-16 h-16 border-l-2 border-t-2 border-current/20"></div>
          <div className="absolute top-0 right-0 w-16 h-16 border-r-2 border-t-2 border-current/20"></div>
          <div className="absolute bottom-0 left-0 w-16 h-16 border-l-2 border-b-2 border-current/20"></div>
          <div className="absolute bottom-0 right-0 w-16 h-16 border-r-2 border-b-2 border-current/20"></div>
        </div>
      )}
      {PAPER_TEMPLATES[paperTemplate].type === 'frame-royal-blue' && (
        <div className="absolute inset-0 pointer-events-none border-[24px] border-white/5 shadow-[inset_0_0_100px_rgba(0,0,0,0.3)]">
          <div className="absolute inset-4 border border-white/20"></div>
        </div>
      )}
      {PAPER_TEMPLATES[paperTemplate].type === 'frame-zen' && (
        <div className="absolute inset-0 pointer-events-none border-x-[40px] border-current/5 opacity-50"></div>
      )}
      {PAPER_TEMPLATES[paperTemplate].type === 'frame-certificate' && (
        <div className="absolute inset-0 pointer-events-none border-[32px] border-amber-600/10">
          <div className="absolute inset-4 border-4 border-double border-amber-600/40"></div>
          <div className="absolute inset-8 border border-amber-600/20"></div>
          <div className="absolute top-12 left-1/2 -translate-x-1/2 opacity-10">
            <Sparkles className="w-24 h-24 text-amber-600" />
          </div>
        </div>
      )}
      {PAPER_TEMPLATES[paperTemplate].type === 'frame-newsletter' && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 right-0 h-32 bg-slate-500/5 border-b border-current/10"></div>
          <div className="absolute top-0 left-0 bottom-0 w-12 bg-slate-500/5 border-r border-current/10"></div>
        </div>
      )}
      {PAPER_TEMPLATES[paperTemplate].type === 'frame-luxury-dark' && (
        <div className="absolute inset-0 pointer-events-none border-[24px] border-amber-500/10 shadow-[inset_0_0_100px_rgba(0,0,0,0.8)]">
          <div className="absolute inset-4 border border-amber-500/30"></div>
          <div className="absolute inset-6 border-[0.5px] border-amber-500/10"></div>
        </div>
      )}
      
      {/* Dynamic Texture Overlay */}
      {styleSettings?.page?.texture && styleSettings.page.texture !== 'none' && PAGE_TEXTURES[styleSettings.page.texture] && (
        <div 
          className="absolute inset-0 pointer-events-none" 
          style={{ 
            backgroundImage: `url('${PAGE_TEXTURES[styleSettings.page.texture].url}')`,
            opacity: styleSettings.page.decorationOpacity || PAGE_TEXTURES[styleSettings.page.texture].opacity || 0.3,
            filter: PAPER_TEMPLATES[paperTemplate].isDark ? 'invert(1)' : 'none'
          }}
        ></div>
      )}

      {/* Legacy paper-type patterns still supported for specific templates if needed */}
      {PAPER_TEMPLATES[paperTemplate].type === 'texture-graph' && (
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'linear-gradient(#fecdd3 1px, transparent 1px), linear-gradient(90deg, #fecdd3 1px, transparent 1px)', backgroundSize: '10px 10px', opacity: 0.3 }}>
          <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(#fda4af 1px, transparent 1px), linear-gradient(90deg, #fda4af 1px, transparent 1px)', backgroundSize: '50px 50px', opacity: 0.5 }}></div>
        </div>
      )}
      {PAPER_TEMPLATES[paperTemplate].type === 'texture-jeans' && (
        <div className="absolute inset-0 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/denim.png')] opacity-20 invert"></div>
      )}
    </>
  );
};

import { GripVertical } from 'lucide-react';

const SortablePreviewParagraph = React.memo(({ id, content, components, onDelete, onSplit, onSelect, isSelected, onMoveUp, onMoveDown, isMarkerActive }: any) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
    zIndex: isDragging ? 100 : 1,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative rounded-lg transition-all duration-200 -mx-2 px-2 py-0.5 ${isDragging ? 'ring-2 ring-emerald-500 shadow-2xl scale-[1.02] z-[100]' : ''} ${isSelected ? 'ring-2 ring-blue-500/50' : 'hover:ring-1 hover:ring-current/10'}`}
    >
      {/* Left Side Controls: Grip & Nav */}
      {!isMarkerActive && (
        <div className="absolute -left-10 top-1 flex flex-col items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all z-50 print:hidden">
          <div
            {...attributes}
            {...listeners}
            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded cursor-grab active:cursor-grabbing transition-all flex items-center justify-center touch-none"
            title="Tarik untuk Geser"
          >
            <GripVertical className="w-5 h-5" />
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect(id);
            }}
            className={`p-1.5 rounded-lg transition-all flex items-center justify-center shadow-sm border ${isSelected ? 'bg-blue-600 text-white border-blue-700 scale-110' : 'bg-white text-slate-400 border-slate-200 hover:border-blue-300 hover:text-blue-600'}`}
            title={isSelected ? "Batal Pilih" : "Pilih untuk Pindah Halaman"}
          >
            {isSelected ? <CheckCheck className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
          </button>

          <div className="flex flex-col bg-white/90 backdrop-blur-sm border border-slate-200 rounded-md shadow-sm overflow-hidden mt-1">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onMoveUp(id);
              }}
              className="p-1 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors border-b border-slate-100"
              title="Geser Ke Atas"
            >
              <ArrowUp className="w-3 h-3" />
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onMoveDown(id);
              }}
              className="p-1 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
              title="Geser Ke Bawah"
            >
              <ArrowDown className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
      
      {/* Right Side Controls: Actions */}
      {!isMarkerActive && (
        <div className="absolute -right-2 top-2 flex flex-col gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all z-50 print:hidden">
          {onSplit && content.length > 50 && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onSplit(id);
              }}
              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg border border-transparent hover:border-blue-100 transition-all flex items-center justify-center bg-white/50"
              title="Belah Paragraf"
            >
              <Scissors className="w-4 h-4" />
            </button>
          )}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onDelete(id);
            }}
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-100 transition-all flex items-center justify-center bg-white/50"
            title="Hapus Paragraf"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}
      
      <div className="pl-2 pr-6 preview-paragraph" data-paragraph-id={id}>
        <ReactMarkdown 
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw]}
          components={components}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
});

const DroppablePreviewPage = React.memo(({ id, children, className, style, onDoubleClick, onDeletePage, pageIndex, isEmpty, onMoveHere, isTarget }: any) => {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: { type: 'Page' },
  });

  return (
    <div 
      ref={setNodeRef} 
      className={`${className} ${isOver ? 'ring-4 ring-emerald-500 ring-inset' : ''} ${isTarget ? 'ring-4 ring-blue-400 ring-inset' : ''} group/page`} 
      style={style}
      onDoubleClick={onDoubleClick}
    >
      {isTarget && (
        <div 
          onClick={(e) => {
            e.stopPropagation();
            onMoveHere();
          }}
          className="absolute inset-0 bg-blue-500/10 z-[60] flex items-center justify-center p-10 cursor-pointer hover:bg-blue-500/20 transition-colors"
        >
          <div className="bg-blue-600 text-white px-6 py-3 rounded-full text-sm font-bold shadow-2xl animate-bounce flex items-center gap-2 border-2 border-white/20 pointer-events-none">
            <LayoutList className="w-4 h-4" />
            Pindahkan ke Halaman {pageIndex + 1}
          </div>
        </div>
      )}
      {onDeletePage && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDeletePage(id);
          }}
          className="absolute top-4 right-4 p-2 bg-white/90 backdrop-blur-sm border border-red-100 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-lg shadow-sm opacity-0 group-hover/page:opacity-100 transition-all z-50 print:hidden flex items-center gap-2"
          title="Hapus Halaman Ini"
        >
          <Trash2 className="w-4 h-4" />
          <span className="text-xs font-bold">Hapus Halaman {pageIndex + 1}</span>
        </button>
      )}
      {children}
      {isEmpty && (
        <div className="text-center text-slate-400 py-10 italic border-2 border-dashed border-slate-200 rounded-lg m-4">
          Halaman kosong. Tarik paragraf ke sini atau hapus halaman ini.
        </div>
      )}
    </div>
  );
});

const hashCode = (s: string) => {
  let h = 0;
  for(let i = 0; i < s.length; i++) 
    h = Math.imul(31, h) + s.charCodeAt(i) | 0;
  return Math.abs(h).toString(36);
};

const hexToRgba = (hex: string, alpha: number) => {
  if (!hex || !hex.startsWith('#')) return `rgba(0, 0, 0, ${alpha})`;
  const r = parseInt(hex.slice(1, 3) || '0', 16);
  const g = parseInt(hex.slice(3, 5) || '0', 16);
  const b = parseInt(hex.slice(5, 7) || '0', 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const getGradientStyle = (gradient: string, bgColor: string) => {
  // Hardcoded to return {} to permanently eliminate the "plastic / glass" background bug
  return {};
};

export const ResultScreen = ({
  isGenerating, startInEditMode, result, setResult, handleSave, setCurrentScreen,
  activeHistoryId, history, updateHistoryItem,
  tema, language, paperSize, setPaperSize, zoom, setZoom, fontFamily, setFontFamily,
  textAlign, setTextAlign, lineHeight, setLineHeight, paperTemplate, setPaperTemplate,
  fontSize, setFontSize, showDalilSearch, setShowDalilSearch, dalilQuery, setDalilQuery,
  dalilResults, isSearchingDalil, handleSearchDalil, handleShare, handleCopy,
  isCopied, handlePrintPdf, handleAnalyze, showAnalysis, setShowAnalysis,
  isAnalyzing, analysisResult, arabicFontFamily, setArabicFontFamily, customFontUrl, setCustomFontUrl,
  styleSettings, setStyleSettings, apiKey, handleAnnotate, handleAnnotateLocally, isAnnotating, handleAutoFix, isFixing, setIsFixing, elementRef,
  coverData, setCoverData, watermark, setWatermark, userProfile, handleAiDuration, selectedModel, customModelId,
  customWpm, ustadzName, durasi, terjemahanMukadimah, latinMukadimah
}: any) => {
  const [isEditing, setIsEditing] = useState(startInEditMode);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [selectedParagraphId, setSelectedParagraphId] = useState<string | null>(null);
  const [activeMarker, setActiveMarker] = useState<string | null>(null);
  const [markingScope, setMarkingScope] = useState<'kata' | 'kalimat' | 'paragraf'>('kata');

  const [editContent, setEditContent] = useState(result);
  
  const [activeDalilTab, setActiveDalilTab] = useState<'quran' | 'hadits'>('quran');
  const [trimSanad, setTrimSanad] = useState(true);
  const [focusMode, setFocusMode] = useState(false);
  const [showMoreHeader, setShowMoreHeader] = useState(false);
  
  // Calculate Actual Word Count and Estimated Time
  const actualWordCount = editContent.split(/\s+/).filter((w: string) => w.length > 0).length;
  // Updated WPM based on ustadz: Khalid (205), Adi (210), Standar (190)
  const defaultWpm = ustadzName === 'Tempo Ust. Khalid Basalamah' ? 205 : ustadzName === 'Tempo Ust. Adi Hidayat' ? 210 : 190;
  const activeWpm = customWpm !== null ? customWpm : defaultWpm;
  const estimatedMinutes = Math.max(1, Math.round(actualWordCount / activeWpm));

  // Advanced History State
  interface HistoryItem {
    content: string;
    action: string;
    timestamp: number;
  }

  const [undoStack, setUndoStack] = useState<HistoryItem[]>(() => {
    try {
      if (activeHistoryId) {
        const saved = localStorage.getItem(`undo_${activeHistoryId}`);
        return saved ? JSON.parse(saved) : [];
      }
      return [];
    } catch { return []; }
  });
  const [redoStack, setRedoStack] = useState<HistoryItem[]>(() => {
    try {
      if (activeHistoryId) {
        const saved = localStorage.getItem(`redo_${activeHistoryId}`);
        return saved ? JSON.parse(saved) : [];
      }
      return [];
    } catch { return []; }
  });

  useEffect(() => {
    if (activeHistoryId) {
      try {
        const savedUndo = localStorage.getItem(`undo_${activeHistoryId}`);
        setUndoStack(savedUndo ? JSON.parse(savedUndo) : []);
        const savedRedo = localStorage.getItem(`redo_${activeHistoryId}`);
        setRedoStack(savedRedo ? JSON.parse(savedRedo) : []);
        lastPushedContentRef.current = result; // reset ref
      } catch {
        setUndoStack([]);
        setRedoStack([]);
      }
    }
  }, [activeHistoryId, result]);

  useEffect(() => {
    if (activeHistoryId && undoStack.length > 0) {
      localStorage.setItem(`undo_${activeHistoryId}`, JSON.stringify(undoStack));
    }
  }, [undoStack, activeHistoryId]);

  useEffect(() => {
    if (activeHistoryId && redoStack.length > 0) {
      localStorage.setItem(`redo_${activeHistoryId}`, JSON.stringify(redoStack));
    }
  }, [redoStack, activeHistoryId]);

  const lastPushedContentRef = useRef(result);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showStudio, setShowStudio] = useState(false);
  const [showSavePresetPrompt, setShowSavePresetPrompt] = useState(false);
  const [dontAskSavePreset, setDontAskSavePreset] = useState(false);
  const [showQuickStyle, setShowQuickStyle] = useState(false);
  const [showAdvancedStyle, setShowAdvancedStyle] = useState(false);
  const [activeStudioTab, setActiveStudioTab] = useState('preset');
  const [smartMatching, setSmartMatching] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const [showDalilInspector, setShowDalilInspector] = useState(false);
  const [showVocalInspector, setShowVocalInspector] = useState(false);
  const [showGrammarInspector, setShowGrammarInspector] = useState(false);
  const [showDoaInspector, setShowDoaInspector] = useState(false);
  const [showStructureInspector, setShowStructureInspector] = useState(false);
  const [showHadithLibrary, setShowHadithLibrary] = useState(false);
  const [dalilList, setDalilList] = useState<any[]>([]);
  const [isDalilAnalyzed, setIsDalilAnalyzed] = useState(false);
  
  // AI Duration State
  const [showDurationModal, setShowDurationModal] = useState(false);
  const [durationAction, setDurationAction] = useState<'extend' | 'shorten'>('extend');
  const [durationMinutes, setDurationMinutes] = useState(3);
  const [durationFocus, setDurationFocus] = useState<string[]>([]);
  
  // Bookmark & Schedule State
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleDateInput, setScheduleDateInput] = useState('');
  const [scheduleLocationInput, setScheduleLocationInput] = useState('');
  const [showBookmarkModal, setShowBookmarkModal] = useState(false);
  const [bookmarkCategory, setBookmarkCategory] = useState('Semua');

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const currentHistoryItem = history?.find((h: any) => h.id === activeHistoryId);
  const isBookmarked = currentHistoryItem?.isBookmarked || false;
  const [isProcessingTool, setIsProcessingTool] = useState(false);
  const [toolProgress, setToolProgress] = useState(0);
  const [isAiEditing, setIsAiEditing] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleCloseStudio = () => {
    const isSilenced = localStorage.getItem('dont_ask_save_preset_prompt') === 'true';
    if (isSilenced) {
      setShowStudio(false);
    } else {
      setShowSavePresetPrompt(true);
    }
  };

  const savePersonalPreset = () => {
    const personalPreset = {
      latin: styleSettings.latin,
      arabic: styleSettings.arabic,
      paperTemplate: paperTemplate,
      textAlign: textAlign
    };
    localStorage.setItem('USER_PERSONAL_PRESET', JSON.stringify(personalPreset));
    if (dontAskSavePreset) {
      localStorage.setItem('dont_ask_save_preset_prompt', 'true');
    }
    setShowSavePresetPrompt(false);
    setShowStudio(false);
  };

  const skipSavePersonalPreset = () => {
    if (dontAskSavePreset) {
      localStorage.setItem('dont_ask_save_preset_prompt', 'true');
    }
    setShowSavePresetPrompt(false);
    setShowStudio(false);
  };

  const EXTEND_OPTIONS = [
    "Tambah Ilustrasi/Cerita", "Perdalam Penjelasan Dalil", "Tambah Contoh Konkret", 
    "Koneksi Emosional", "Analogi Modern"
  ];
  
  const SHORTEN_OPTIONS = [
    "Ringkas Penjelasan", "Hapus Basa-basi", "Fokus Poin Utama", 
    "Gabungkan Paragraf", "Bahasa Langsung (To-the-point)"
  ];

  const handleDurationFocusToggle = (focus: string) => {
    setDurationFocus(prev => 
      prev.includes(focus) ? prev.filter(f => f !== focus) : [...prev, focus]
    );
  };

  // Stats Calculation
  const wordCount = editContent.trim().split(/\s+/).length;
  const charCount = editContent.length;
  const estTime = Math.ceil(wordCount / 130); // 130 wpm
  const paragraphCount = editContent.split('\n\n').length;

  // Toggle Focus Mode
  const toggleFocusMode = () => {
    setFocusMode(!focusMode);
  };

  // Debounced push to undo stack for manual typing
  useEffect(() => {
    const timer = setTimeout(() => {
      if (editContent !== lastPushedContentRef.current) {
        setUndoStack(prev => [...prev, {
          content: lastPushedContentRef.current,
          action: 'Ketik Manual',
          timestamp: Date.now()
        }].slice(-50));
        setRedoStack([]);
        lastPushedContentRef.current = editContent;
      }
    }, 1000); // 1 second debounce

    return () => clearTimeout(timer);
  }, [editContent]);

  // Helper to update content with undo support
  const updateContent = (newContent: string, action: string = 'Edit Manual', isUndoRedo = false) => {
    if (!isUndoRedo) {
      setUndoStack(prev => [...prev, {
        content: editContent,
        action: action,
        timestamp: Date.now()
      }].slice(-50)); // Keep last 50 states
      setRedoStack([]);
    }
    lastPushedContentRef.current = newContent;
    setEditContent(newContent);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    
    setRedoStack(prev => [...prev, {
      content: editContent,
      action: previous.action, // The action we are undoing
      timestamp: Date.now()
    }]);
    
    setUndoStack(prev => prev.slice(0, -1));
    updateContent(previous.content, previous.action, true);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    
    setUndoStack(prev => [...prev, {
      content: editContent,
      action: next.action,
      timestamp: Date.now()
    }]);
    
    setRedoStack(prev => prev.slice(0, -1));
    updateContent(next.content, next.action, true);
  };

  const jumpToHistory = (index: number) => {
    // Jump to a specific point in undo stack
    const target = undoStack[index];
    const slice = undoStack.slice(index + 1);
    const reversedSlice = slice.reverse();
    const currentAsHistory = { content: editContent, action: 'Jump History', timestamp: Date.now() };
    
    // Preserve existing redo stack (future of current) and add path from current back to target
    // Order: [Old Redo, Current, Path to Target...] -> Top is nearest future
    const newRedo = [...redoStack, currentAsHistory, ...reversedSlice];
    
    const newUndo = undoStack.slice(0, index);
    
    setUndoStack(newUndo);
    setRedoStack(newRedo as HistoryItem[]);
    updateContent(target.content, 'Jump History', true);
    setShowHistoryModal(false);
  };

  // Keyboard shortcuts for Undo/Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        e.preventDefault();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        handleRedo();
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undoStack, redoStack, editContent]);

  // Update editContent when result changes (streaming or external fix)
  useEffect(() => {
    if (isGenerating || isFixing || isAnnotating) {
      setEditContent(result);
    }
  }, [result, isGenerating, isFixing, isAnnotating]);

  // Final sync when generation finishes to ensure the last chunk is captured
  useEffect(() => {
    if (!isGenerating && !isFixing && !isAnnotating && result) {
      setEditContent(result);
    }
  }, [isGenerating, isFixing, isAnnotating]);

  // Calculate a safe line limit based on paper size and font size
  const lhMultiplier = styleSettings?.latin?.lineHeight === 'leading-loose' ? 2.0 : 
                       styleSettings?.latin?.lineHeight === 'leading-relaxed' ? 1.7 : 
                       styleSettings?.latin?.lineHeight === 'leading-normal' ? 1.5 : 1.3;
                       
  const paperHeight = PAPER_DIMENSIONS[paperSize].minHeight;
  const paperWidth = PAPER_DIMENSIONS[paperSize].width;
  
  // Padding is usually p-12 (48px) or p-16 (64px) on all sides. Let's assume 160px total vertical padding/margins.
  const availableHeight = paperHeight - 140; 
  // We use safeCharLimit to represent safeLineLimit to avoid renaming everything
  const safeCharLimit = Math.floor(availableHeight / (fontSize * lhMultiplier));

  const getEstimatedLength = (text: string) => {
    // Replace templates with dummy text of similar length for estimation
    let processedText = text;
    if (processedText.includes('[TEMPLATE_MUKADIMAH_1]')) {
      processedText = processedText.replace(/\[\s*TEMPLATE_MUKADIMAH_1\s*\]/gi, 'Alhamdulillah... \n\n```arabic\n(Teks Arab)\n```\n\n'.repeat(5));
    }
    if (processedText.includes('[TEMPLATE_MUKADIMAH_SUNNAH_1]')) {
      processedText = processedText.replace(/\[\s*TEMPLATE_MUKADIMAH_SUNNAH_1\s*\]/gi, 'Alhamdulillah... \n\n```arabic\n(Teks Arab Sunnah)\n```\n\n'.repeat(6));
    }
    if (processedText.includes('[TEMPLATE_PENUTUP_1]')) {
      processedText = processedText.replace(/\[\s*TEMPLATE_PENUTUP_1\s*\]/gi, '\n**Doa Penutup**\n\n```arabic\nرَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً...\n```\n\n'.repeat(3));
    }
    if (processedText.includes('[TEMPLATE_MUKADIMAH_2]')) {
      processedText = processedText.replace(/\[\s*TEMPLATE_MUKADIMAH_2\s*\]/gi, 'Alhamdulillah... \n\n```arabic\n(Teks Arab)\n```\n\n'.repeat(4));
    }
    if (processedText.includes('[TEMPLATE_MUKADIMAH_SUNNAH_2]')) {
      processedText = processedText.replace(/\[\s*TEMPLATE_MUKADIMAH_SUNNAH_2\s*\]/gi, 'Alhamdulillah... \n\n```arabic\n(Teks Arab Sunnah)\n```\n\n'.repeat(5));
    }
    if (processedText.includes('[TEMPLATE_PENUTUP_2]')) {
      processedText = processedText.replace(/\[\s*TEMPLATE_PENUTUP_2\s*\]/gi, '\n**Doa Penutup**\n\n```arabic\nرَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً...\n```\n\n'.repeat(4));
    }
    if (processedText.includes('[TEMPLATE_PENUTUP_SUNNAH_2]')) {
      processedText = processedText.replace(/\[\s*TEMPLATE_PENUTUP_SUNNAH_2\s*\]/gi, '\n**Doa Penutup Sunnah**\n\n```arabic\nرَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً...\n```\n\n'.repeat(5));
    }

    // Average character width is ~0.52x font size for proportional fonts
    const charsPerLine = Math.floor((paperWidth - 120) / (fontSize * 0.52));
    
    // Split by newlines to process each line/paragraph separately
    const lines = processedText.split('\n');
    let totalLines = 0;
    
    for (const line of lines) {
      if (line.trim() === '') {
        totalLines += 0.5; // Empty lines usually take less space or are part of paragraph spacing
        continue;
      }
      
      let lineLength = line.length;
      let lineMultiplier = 1;
      
      // Arabic characters are wider and taller
      const arabicMatch = line.match(/[\u0600-\u06FF]/g);
      if (arabicMatch) {
        const arabicScale = styleSettings?.arabic?.fontSizeScale || 1.6;
        const arabicLh = styleSettings?.arabic?.lineHeight === 'leading-[3]' ? 3.0 :
                         styleSettings?.arabic?.lineHeight === 'leading-[2.5]' ? 2.5 :
                         styleSettings?.arabic?.lineHeight === 'leading-loose' ? 2.0 : 2.5;
        
        // Relative to base line height
        const relativeLh = arabicLh / lhMultiplier;
        
        const arabicRatio = arabicMatch.length / line.length;
        if (arabicRatio > 0.3) {
           // Mostly Arabic
           lineLength += arabicMatch.length * (arabicScale - 1); // e.g. 1.6x wider
           lineMultiplier = relativeLh; // Taller line height
        } else {
           // Mixed
           lineLength += arabicMatch.length * (arabicScale - 1);
           lineMultiplier = Math.max(1, relativeLh * 0.8);
        }
      }
      
      // Headers are larger
      if (line.startsWith('# ')) {
        lineLength *= 2;
        lineMultiplier = 2;
      } else if (line.startsWith('## ')) {
        lineLength *= 1.5;
        lineMultiplier = 1.5;
      } else if (line.startsWith('### ')) {
        lineLength *= 1.25;
        lineMultiplier = 1.25;
      }
      
      // Calculate wrapped lines for this paragraph
      const wrappedLines = Math.ceil(lineLength / charsPerLine);
      
      totalLines += wrappedLines * lineMultiplier;
    }
    
    return totalLines;
  };

  // Helper to auto-flow overflowing paragraphs to the next page
  const applyAutoFlow = (pages: any[]) => {
    for (let i = 0; i < pages.length; i++) {
      let pageLength = pages[i].paragraphs.reduce((acc: number, p: any) => acc + getEstimatedLength(p.content), 0);
      while (pageLength > safeCharLimit && pages[i].paragraphs.length > 1) {
        const lastParagraph = pages[i].paragraphs.pop();
        pageLength -= getEstimatedLength(lastParagraph.content);

        if (i + 1 < pages.length) {
          pages[i + 1].paragraphs.unshift(lastParagraph);
        } else {
          pages.push({
            id: `page-${Date.now()}`,
            paragraphs: [lastParagraph],
            paragraphIds: []
          });
        }
      }
    }
    for (let i = 0; i < pages.length; i++) {
       pages[i].paragraphIds = pages[i].paragraphs.map((p: any) => p.id);
    }
    return pages;
  };

  const [layoutPages, setLayoutPages] = useState<any[]>([]);
  const handleApplyMark = useCallback((paragraphId: string, textToMark: string) => {
    if (!activeMarker) return;
    
    const updateTarget = (prev: string) => {
      const targetPara = layoutPages.flatMap(p => p.paragraphs).find(p => p.id === paragraphId);
      if (!targetPara) return prev;

      const markerTags: Record<string, [string, string]> = {
        'strip': ['[STRIP]', '[/STRIP]'],
        'double': ['[DOUBLE]', '[/DOUBLE]'],
        'stabilo': ['[STABILO]', '[/STABILO]'],
        'tipis': ['[THIN]', '[/THIN]'],
        'kotak': ['[BOX]', '[/BOX]'],
        'hapus': ['', '']
      };

      const [startTag, endTag] = markerTags[activeMarker] || ['', ''];
      let newParaContent = targetPara.content;
      const escapedText = textToMark.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      if (activeMarker === 'hapus') {
        const allTags = ['STRIP', 'DOUBLE', 'STABILO', 'THIN', 'BOX'];
        for (const tag of allTags) {
          const tagPattern = new RegExp(`\\[${tag}\\](${escapedText})\\[\\/${tag}\\]`, 'g');
          if (tagPattern.test(newParaContent)) {
            newParaContent = newParaContent.replace(tagPattern, '$1');
          }
        }
      } else {
        const startEscaped = startTag.replace(/\[/g, '\\[').replace(/\]/g, '\\]');
        const endEscaped = endTag.replace(/\[/g, '\\[').replace(/\]/g, '\\]');
        const pattern = new RegExp(`${startEscaped}${escapedText}${endEscaped}`, 'g');
        
        if (pattern.test(newParaContent)) {
          newParaContent = newParaContent.replace(pattern, textToMark);
        } else {
          newParaContent = newParaContent.replace(textToMark, `${startTag}${textToMark}${endTag}`);
        }
      }

      const newLayoutPages = layoutPages.map(page => ({
        ...page,
        paragraphs: page.paragraphs.map((p: any) => 
          p.id === paragraphId ? { ...p, content: newParaContent } : p
        )
      }));

      return newLayoutPages.map(page => 
        page.paragraphs.map((p: any) => p.content).join('\n\n')
      ).join('\n---\n');
    };

    if (isEditing) {
      setEditContent(updateTarget);
    } else {
      setResult(updateTarget);
    }
  }, [activeMarker, layoutPages, isEditing, setEditContent, setResult]);
  const skipLayoutEffect = useRef(false);

  // Split content into pages based on markdown horizontal rule (---)
  // Also auto-split if a page is too long to prevent overflow
  useEffect(() => {
    if (skipLayoutEffect.current) {
      skipLayoutEffect.current = false;
      return;
    }

    const rawContent = isEditing ? editContent : result;
    if (!rawContent) {
      setLayoutPages([]);
      return;
    }

    const pages = rawContent.split(/\n---\n/).flatMap(p => {
      const totalLength = getEstimatedLength(p);
      if (totalLength > safeCharLimit) {
         const chunks: string[] = [];
         
         // Calculate balanced target length
         const numPages = Math.ceil(totalLength / safeCharLimit);
         const targetLength = safeCharLimit;
         
         // Split by paragraphs first
         const paragraphs = p.split(/\n\n+/);
         let currentChunk = '';
         let currentLength = 0;
         
         for (const para of paragraphs) {
           const paraLength = getEstimatedLength(para + '\n\n');
           
           // If a single paragraph is too long, we have to split it by lines
           if (paraLength > targetLength) {
             // Push current chunk if not empty
             if (currentChunk) {
               chunks.push(currentChunk.trim());
               currentChunk = '';
               currentLength = 0;
             }
             
             const lines = para.split('\n');
             for (const line of lines) {
               const lineLen = getEstimatedLength(line + '\n');
               if (lineLen > targetLength) {
                 // If a single line is too long, split by words
                 if (currentChunk) {
                   chunks.push(currentChunk.trim());
                   currentChunk = '';
                   currentLength = 0;
                 }
                 const words = line.split(' ');
                 for (const word of words) {
                   const wordLen = getEstimatedLength(word + ' ');
                   if (currentLength + wordLen > targetLength && currentChunk) {
                     chunks.push(currentChunk.trim());
                     currentChunk = word + ' ';
                     currentLength = wordLen;
                   } else {
                     currentChunk += word + ' ';
                     currentLength += wordLen;
                   }
                 }
                 currentChunk += '\n';
               } else if (currentLength + lineLen > targetLength && currentChunk) {
                 chunks.push(currentChunk.trim());
                 currentChunk = line + '\n';
                 currentLength = lineLen;
               } else {
                 currentChunk += line + '\n';
                 currentLength += lineLen;
               }
             }
             currentChunk += '\n'; // Add paragraph break
           } else if (currentLength + paraLength > targetLength && currentChunk) {
             // Start new chunk
             chunks.push(currentChunk.trim());
             currentChunk = para + '\n\n';
             currentLength = paraLength;
           } else {
             // Add to current chunk
             currentChunk += para + '\n\n';
             currentLength += paraLength;
           }
         }
         
         if (currentChunk.trim()) {
           chunks.push(currentChunk.trim());
         }
         
         return chunks;
      }
      return [p];
    });

    const occurrences = new Map<string, number>();
    const newLayoutPages = pages.map((pageStr, pageIdx) => {
      const paragraphs = pageStr.split(/\n\n+/).filter(p => p.trim() !== '').map((p) => {
        const trimmedP = p.trim();
        const count = occurrences.get(trimmedP) || 0;
        occurrences.set(trimmedP, count + 1);
        return {
          id: `p-${hashCode(trimmedP)}-${count}`,
          content: trimmedP,
          processedContent: applyRhetoricVisuals(trimmedP, styleSettings, false, terjemahanMukadimah, latinMukadimah)
        };
      });
      return {
        id: `page-${pageIdx}`,
        paragraphs,
        paragraphIds: paragraphs.map(p => p.id)
      };
    });

    setLayoutPages(newLayoutPages);
  }, [isEditing, editContent, result, fontSize, paperSize, terjemahanMukadimah, latinMukadimah, styleSettings, textAlign, safeCharLimit]);

  const pageStyle = useMemo(() => ({
    width: `${PAPER_DIMENSIONS[paperSize].width}px`,
    height: `${PAPER_DIMENSIONS[paperSize].minHeight}px`,
    zoom: zoom / 100,
    backgroundColor: styleSettings?.page?.backgroundColor || undefined,
    borderColor: styleSettings?.page?.borderColor || undefined
  }), [paperSize, zoom, styleSettings?.page?.backgroundColor, styleSettings?.page?.borderColor]);

  const handlePageDoubleClick = useCallback(() => {
    if (!isEditing) {
      setIsEditing(true);
    }
  }, [isEditing]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    // Find source and destination
    let sourcePageIdx = -1;
    let sourcePIdx = -1;
    let destPageIdx = -1;
    let destPIdx = -1;

    layoutPages.forEach((page, pIdx) => {
      const sIdx = page.paragraphs.findIndex((p: any) => p.id === activeId);
      if (sIdx !== -1) {
        sourcePageIdx = pIdx;
        sourcePIdx = sIdx;
      }
      if (page.id === overId) {
        destPageIdx = pIdx;
        destPIdx = page.paragraphs.length; // Append to end of page
      } else {
        const dIdx = page.paragraphs.findIndex((p: any) => p.id === overId);
        if (dIdx !== -1) {
          destPageIdx = pIdx;
          destPIdx = dIdx;
        }
      }
    });

    if (sourcePageIdx !== -1 && destPageIdx !== -1) {
      let newLayoutPages = JSON.parse(JSON.stringify(layoutPages));
      
      if (sourcePageIdx === destPageIdx) {
        // Moving within the same page
        newLayoutPages[sourcePageIdx].paragraphs = arrayMove(
          newLayoutPages[sourcePageIdx].paragraphs,
          sourcePIdx,
          destPIdx
        );
      } else {
        // Moving between pages
        const [movedItem] = newLayoutPages[sourcePageIdx].paragraphs.splice(sourcePIdx, 1);
        newLayoutPages[destPageIdx].paragraphs.splice(destPIdx, 0, movedItem);
      }
      
      newLayoutPages = applyAutoFlow(newLayoutPages);
      
      setLayoutPages(newLayoutPages);
      skipLayoutEffect.current = true;
      
      // Serialize back to editContent
      const newContent = newLayoutPages
        .map((page: any) => page.paragraphs.map((p: any) => p.content).join('\n\n'))
        .filter((content: string) => content.trim().length > 0)
        .join('\n\n---\n\n');
        
      updateContent(newContent, 'Pindah Paragraf');
      if (!isEditing) handleSave(newContent, coverData, watermark);
    }
  };

  const handleDeleteParagraph = useCallback((id: string) => {
    try {
      let newLayoutPages = JSON.parse(JSON.stringify(layoutPages));
      for (let i = 0; i < newLayoutPages.length; i++) {
        const pIdx = newLayoutPages[i].paragraphs.findIndex((p: any) => p.id === id);
        if (pIdx !== -1) {
          newLayoutPages[i].paragraphs.splice(pIdx, 1);
          break;
        }
      }
      
      setLayoutPages(newLayoutPages);
      skipLayoutEffect.current = true;

      const newContent = newLayoutPages
        .map((page: any) => page.paragraphs.map((p: any) => p.content).join('\n\n'))
        .filter((content: string) => content.trim().length > 0)
        .join('\n\n---\n\n');
      updateContent(newContent, 'Hapus Paragraf');
      if (!isEditing) handleSave(newContent, coverData, watermark);
    } catch (error) {
      console.error("Error deleting paragraph:", error);
    }
  }, [layoutPages, isEditing, coverData, watermark, updateContent, handleSave]);

  const handleDeletePage = useCallback((id: string) => {
    let newLayoutPages = JSON.parse(JSON.stringify(layoutPages));
    const pageIndex = newLayoutPages.findIndex((p: any) => p.id === id);
    if (pageIndex !== -1) {
      newLayoutPages.splice(pageIndex, 1);
      
      setLayoutPages(newLayoutPages);
      skipLayoutEffect.current = true;

      const newContent = newLayoutPages
        .map((page: any) => page.paragraphs.map((p: any) => p.content).join('\n\n'))
        .filter((content: string) => content.trim().length > 0)
        .join('\n\n---\n\n');
      updateContent(newContent, 'Hapus Halaman');
      if (!isEditing) handleSave(newContent, coverData, watermark);
    }
  }, [layoutPages, isEditing, coverData, watermark, updateContent, handleSave]);

  const handleSplitParagraph = useCallback((id: string) => {
    let newLayoutPages = JSON.parse(JSON.stringify(layoutPages));
    for (let i = 0; i < newLayoutPages.length; i++) {
      const pIdx = newLayoutPages[i].paragraphs.findIndex((p: any) => p.id === id);
      if (pIdx !== -1) {
        const content = newLayoutPages[i].paragraphs[pIdx].content;
        const mid = Math.floor(content.length / 2);
        let splitIdx = mid;
        
        // Try to find a sentence boundary near the middle
        const match = content.substring(mid).match(/[.!?]\s/);
        if (match && match.index !== undefined) {
          splitIdx = mid + match.index + 1;
        } else {
          // Fallback to looking backwards
          const backMatch = content.substring(0, mid).match(/[.!?]\s[^.!?]*$/);
          if (backMatch && backMatch.index !== undefined) {
            splitIdx = backMatch.index + 1;
          } else {
            // Last resort: split at middle space
            const spaceIndex = content.indexOf(' ', mid);
            if (spaceIndex !== -1) {
              splitIdx = spaceIndex;
            }
          }
        }
        
        if (splitIdx !== -1) {
          const firstHalf = content.substring(0, splitIdx).trim();
          const secondHalf = content.substring(splitIdx).trim();
          
          if (firstHalf && secondHalf) {
            newLayoutPages[i].paragraphs[pIdx].content = firstHalf;
            
            const newParagraph = {
              id: `p-split-${Date.now()}`,
              content: secondHalf
            };

            // If we want to push it to the next page automatically
            if (i + 1 < newLayoutPages.length) {
              newLayoutPages[i + 1].paragraphs.unshift(newParagraph);
            } else {
              // Create a new page if it's the last page
              newLayoutPages.push({
                id: `page-${Date.now()}`,
                paragraphs: [newParagraph]
              });
            }
            
            newLayoutPages = applyAutoFlow(newLayoutPages);
            
            setLayoutPages(newLayoutPages);
            skipLayoutEffect.current = true;
            
            const newContent = newLayoutPages
              .map((page: any) => page.paragraphs.map((p: any) => p.content).join('\n\n'))
              .filter((content: string) => content.trim().length > 0)
              .join('\n\n---\n\n');
              
            updateContent(newContent, 'Belah Paragraf');
            if (!isEditing) handleSave(newContent, coverData, watermark);
          }
        }
        break;
      }
    }
  }, [layoutPages, isEditing, coverData, watermark, updateContent, handleSave]);

  const handleMoveParagraphUp = useCallback((id: string) => {
    let newLayoutPages = JSON.parse(JSON.stringify(layoutPages));
    let found = false;
    for (let i = 0; i < newLayoutPages.length; i++) {
      const pIdx = newLayoutPages[i].paragraphs.findIndex((p: any) => p.id === id);
      if (pIdx !== -1) {
        if (pIdx > 0) {
          // Move up within same page
          const [moved] = newLayoutPages[i].paragraphs.splice(pIdx, 1);
          newLayoutPages[i].paragraphs.splice(pIdx - 1, 0, moved);
          found = true;
        } else if (i > 0) {
          // Move to previous page
          const [moved] = newLayoutPages[i].paragraphs.splice(pIdx, 1);
          newLayoutPages[i - 1].paragraphs.push(moved);
          found = true;
        }
        break;
      }
    }
    if (found) {
      newLayoutPages = applyAutoFlow(newLayoutPages);
      
      setLayoutPages(newLayoutPages);
      skipLayoutEffect.current = true;

      const newContent = newLayoutPages
        .map((page: any) => page.paragraphs.map((p: any) => p.content).join('\n\n'))
        .filter((content: string) => content.trim().length > 0)
        .join('\n\n---\n\n');
      updateContent(newContent, 'Geser Paragraf Ke Atas');
      if (!isEditing) handleSave(newContent, coverData, watermark);
    }
  }, [layoutPages, isEditing, coverData, watermark, updateContent, handleSave]);

  const handleMoveParagraphDown = useCallback((id: string) => {
    let newLayoutPages = JSON.parse(JSON.stringify(layoutPages));
    let found = false;
    for (let i = 0; i < newLayoutPages.length; i++) {
      const pIdx = newLayoutPages[i].paragraphs.findIndex((p: any) => p.id === id);
      if (pIdx !== -1) {
        if (pIdx < newLayoutPages[i].paragraphs.length - 1) {
          // Move down within same page
          const [moved] = newLayoutPages[i].paragraphs.splice(pIdx, 1);
          newLayoutPages[i].paragraphs.splice(pIdx + 1, 0, moved);
          found = true;
        } else if (i < newLayoutPages.length - 1) {
          // Move to next page
          const [moved] = newLayoutPages[i].paragraphs.splice(pIdx, 1);
          newLayoutPages[i + 1].paragraphs.unshift(moved);
          found = true;
        }
        break;
      }
    }
    if (found) {
      newLayoutPages = applyAutoFlow(newLayoutPages);
      
      setLayoutPages(newLayoutPages);
      skipLayoutEffect.current = true;

      const newContent = newLayoutPages
        .map((page: any) => page.paragraphs.map((p: any) => p.content).join('\n\n'))
        .filter((content: string) => content.trim().length > 0)
        .join('\n\n---\n\n');
      updateContent(newContent, 'Geser Paragraf Ke Bawah');
      if (!isEditing) handleSave(newContent, coverData, watermark);
    }
  }, [layoutPages, isEditing, coverData, watermark, updateContent, handleSave]);

  const handleMoveToPage = useCallback((paragraphId: string, targetPageId: string) => {
    let newLayoutPages = JSON.parse(JSON.stringify(layoutPages));
    let movedItem: any = null;
    
    // Find and remove from source
    for (let i = 0; i < newLayoutPages.length; i++) {
      const pIdx = newLayoutPages[i].paragraphs.findIndex((p: any) => p.id === paragraphId);
      if (pIdx !== -1) {
        [movedItem] = newLayoutPages[i].paragraphs.splice(pIdx, 1);
        break;
      }
    }
    
    if (movedItem) {
      // Find target page and append
      const targetPageIdx = newLayoutPages.findIndex((p: any) => p.id === targetPageId);
      if (targetPageIdx !== -1) {
        newLayoutPages[targetPageIdx].paragraphs.push(movedItem);
        
        newLayoutPages = applyAutoFlow(newLayoutPages);
        
        setLayoutPages(newLayoutPages);
        skipLayoutEffect.current = true;
        
        const newContent = newLayoutPages
          .map((page: any) => page.paragraphs.map((p: any) => p.content).join('\n\n'))
          .filter((content: string) => content.trim().length > 0)
          .join('\n\n---\n\n');
          
        updateContent(newContent, 'Pindah Paragraf ke Halaman');
        if (!isEditing) handleSave(newContent, coverData, watermark);
        setSelectedParagraphId(null);
      }
    }
  }, [layoutPages, isEditing, coverData, watermark, updateContent, handleSave]);

  const getTextContent = (children: any): string => {
    if (typeof children === 'string') return children;
    if (Array.isArray(children)) return children.map(getTextContent).join('');
    if (children?.props?.children) return getTextContent(children.props.children);
    return '';
  };

  const applyAutoStyle = (styleType: string, hlColor: string, stripColor: string, isRtl: boolean = false): any => {
    if (!styleType || styleType === 'none') return {};
    
    const color = hlColor.startsWith('bg-') ? '#fef08a' : hlColor;
    const sColor = stripColor.startsWith('bg-') ? '#10b981' : stripColor;

    switch (styleType) {
      case 'strip':
        return { borderBottom: `3px solid ${sColor}`, paddingBottom: '1px', display: 'inline' };
      case 'side-strip':
        return { 
          borderLeft: isRtl ? 'none' : `4px solid ${sColor}`, 
          borderRight: isRtl ? `4px solid ${sColor}` : 'none',
          paddingLeft: isRtl ? '0' : '12px', 
          paddingRight: isRtl ? '12px' : '0',
          display: 'block', 
          margin: '4px 0', 
          backgroundColor: hexToRgba(sColor, 0.03), 
          width: '100%',
          textAlign: isRtl ? 'right' : 'left'
        };
      case 'double':
        return { borderBottom: `4px double ${sColor}`, paddingBottom: '2px', display: 'inline' };
      case 'highlight':
        return { backgroundColor: color, borderRadius: '4px', padding: '0 4px', display: 'inline', boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone' };
      case 'bottom':
        return { background: `linear-gradient(to top, ${hexToRgba(color, 0.5)} 40%, transparent 40%)`, padding: '0 2px', display: 'inline' };
      case 'frame':
        return { border: `1px solid ${sColor}`, padding: '0 4px', borderRadius: '4px', backgroundColor: hexToRgba(sColor, 0.06), display: 'inline', boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone' };
      default:
        return {};
    }
  };

  const applySharedArabicStyles = (children: any, Tag: string, defaultClasses: string, props: any) => {
    const textContent = getTextContent(children).trim();
    const isArabic = /[\u0600-\u06FF]/.test(textContent);

    const alignmentClass = isArabic ? (styleSettings?.arabic?.textAlign || 'text-right') : textAlign;
    
    let arabicAdditionalClasses = '';
    let directionStyle: React.CSSProperties = { ...props.style };
    
    if (isArabic) {
      arabicAdditionalClasses = `font-arabic ${styleSettings?.arabic?.lineHeight || 'leading-[2.5]'} ${styleSettings?.arabic?.fontWeight || 'font-normal'} ${styleSettings?.arabic?.textShadow || 'none'} ${styleSettings?.arabic?.wordSpacing || 'tracking-normal'}`;
      directionStyle = {
        ...directionStyle,
        direction: 'rtl',
        fontFamily: arabicFontFamily,
        display: 'block',
        width: '100%',
        color: styleSettings?.arabic?.color || '#047857'
      };
      
      let multiplier = 1.0;
      if (Tag === 'h1') multiplier = 1.8;
      else if (Tag === 'h2') multiplier = 1.5;
      else if (Tag === 'h3') multiplier = 1.3;
      else if (Tag === 'h4') multiplier = 1.1;
      else if (Tag === 'h5' || Tag === 'h6') multiplier = 0.9;
      
      directionStyle.fontSize = `${fontSize * (styleSettings?.arabic?.fontSizeScale || 1.6) * (PAPER_DIMENSIONS[paperSize]?.scale || 1.0) * multiplier}px`;
    }

    const autoStyle = applyAutoStyle(
      (isArabic ? styleSettings?.latin?.autoHighlightArabic : styleSettings?.latin?.autoHighlightNormal), 
      styleSettings?.latin?.highlightColor || '#fef08a',
      styleSettings?.latin?.stripColor || '#10b981',
      isArabic
    );

    return (
      <Tag className={`${defaultClasses} ${alignmentClass} ${arabicAdditionalClasses}`} style={directionStyle} {...props}>
        <span style={autoStyle}>{children}</span>
      </Tag>
    );
  };

  const markdownComponents = useMemo(() => ({
    // Override default block elements to prevent nesting issues
    p: ({node, children, ...props}: any) => {
      const hasDivChild = Array.isArray(children) 
        ? children.some((child: any) => child?.type === 'div' || (child?.props?.className && child.props.className.includes('arabic')))
        : false;
        
      const textContent = getTextContent(children).trim();
      const isArabic = /[\u0600-\u06FF]/.test(textContent);

      const spacingClass = isArabic 
        ? (styleSettings?.arabic?.paragraphSpacing || 'mb-6') 
        : (styleSettings?.latin?.paragraphSpacing || 'mb-4');
      
      const isTranslation = /^\s*\(.*\)\s*$/.test(textContent) || 
                           textContent.toLowerCase().startsWith('artinya:') || 
                           textContent.toLowerCase().startsWith('terjemahan:');
      
      const autoStyle = applyAutoStyle(
        isTranslation ? styleSettings?.latin?.autoHighlightTranslation : (isArabic ? styleSettings?.latin?.autoHighlightArabic : styleSettings?.latin?.autoHighlightNormal), 
        styleSettings?.latin?.highlightColor || '#fef08a',
        styleSettings?.latin?.stripColor || '#10b981',
        isArabic
      );

      const alignmentClass = isArabic ? (styleSettings?.arabic?.textAlign || 'text-right') : textAlign;
      
      const arabicAdditionalClasses = isArabic 
        ? `font-arabic ${styleSettings?.arabic?.lineHeight || 'leading-[2.5]'} ${styleSettings?.arabic?.fontWeight || 'font-normal'} ${styleSettings?.arabic?.textShadow || 'none'} ${styleSettings?.arabic?.wordSpacing || 'tracking-normal'}`
        : '';
        
      const directionStyle: React.CSSProperties = isArabic 
        ? { 
            direction: 'rtl' as const,
            fontFamily: arabicFontFamily,
            fontSize: `${fontSize * (styleSettings?.arabic?.fontSizeScale || 1.6) * (PAPER_DIMENSIONS[paperSize]?.scale || 1.0)}px`,
            color: styleSettings?.arabic?.color || '#047857',
            display: 'block',
            width: '100%'
          } 
        : {};

      const renderChildren = () => {
        if (!activeMarker) return <span style={autoStyle}>{children}</span>;

        // If marker is active, we need to process text nodes into clickable segments
        const processNode = (child: any): any => {
          if (typeof child === 'string') {
            let segments: string[] = [];
            if (markingScope === 'kata') {
              segments = child.split(/(\s+)/);
            } else if (markingScope === 'kalimat') {
              segments = child.split(/([.!?]+\s*)/);
            } else {
              segments = [child];
            }

            return segments.map((seg, i) => {
              const isPunctuationOrSpace = markingScope === 'kata' ? /^\s+$/.test(seg) : /^[.!?]+\s*$/.test(seg);
              if (isPunctuationOrSpace || seg === '') return seg;

              return (
                <span 
                  key={i}
                  onClick={(e) => {
                    e.stopPropagation();
                    // We need to find the parent paragraph id. 
                    // This is passed via context or props in complex apps,
                    // but here we can try to find it from the DOM or closure if possible.
                    // Actually, SortablePreviewParagraph has the ID.
                    // We can pass it down via a ref or search.
                    const paraElement = (e.target as HTMLElement).closest('.preview-paragraph');
                    const paraId = paraElement?.getAttribute('data-paragraph-id') || paraElement?.getAttribute('data-para-id');
                    if (paraId) handleApplyMark(paraId, seg);
                  }}
                  className={`cursor-pointer hover:bg-emerald-100/50 rounded-sm transition-colors border-b border-dashed border-transparent hover:border-emerald-400 select-none ${activeMarker === 'hapus' ? 'hover:bg-red-50 hover:border-red-400' : ''}`}
                >
                  {seg}
                </span>
              );
            });
          }
          if (React.isValidElement(child) && child.props && (child.props as any).children) {
             return React.cloneElement(child, {} as any, React.Children.map((child.props as any).children, processNode));
          }
          return child;
        };

        return <span style={autoStyle}>{React.Children.map(children, processNode)}</span>;
      };

      if (hasDivChild) return <div className={`${spacingClass} ${alignmentClass} ${arabicAdditionalClasses}`} style={directionStyle} {...props}>{renderChildren()}</div>;
      return (
        <p className={`${spacingClass} ${alignmentClass} ${arabicAdditionalClasses}`} style={directionStyle} {...props}>
          {renderChildren()}
        </p>
      );
    },
    pre: ({children}: any) => <div className="not-prose my-6">{children}</div>,
    h1: ({node, children, ...props}: any) => {
      const textContent = getTextContent(children).trim();
      const isArabic = /[\u0600-\u06FF]/.test(textContent);
      const autoStyle = applyAutoStyle(
        styleSettings?.latin?.autoHighlightTitles, 
        styleSettings?.latin?.highlightColor || '#fef08a',
        styleSettings?.latin?.stripColor || '#10b981'
      );
      if (isArabic) {
        return (
          <h1 className={`font-arabic ${styleSettings?.arabic?.lineHeight || 'leading-[2.5]'} text-right block w-full mt-8 mb-4 font-bold`} style={{ direction: 'rtl', fontFamily: arabicFontFamily, fontSize: `${fontSize * (styleSettings?.arabic?.fontSizeScale || 1.6) * (PAPER_DIMENSIONS[paperSize]?.scale || 1.0) * 1.8}px`, color: styleSettings?.arabic?.color || '#047857' }} {...props}>
             <span style={autoStyle}>{children}</span>
          </h1>
        );
      }
      return (
        <h1 
          className={`${HEADER_STYLES[styleSettings?.header || 'simple'].classes} ${PAPER_TEMPLATES[paperTemplate].text} mt-8`} 
          style={autoStyle}
          {...props}
        >
          {children}
        </h1>
      );
    },
    h2: ({node, children, ...props}: any) => {
      const textContent = getTextContent(children).trim();
      const isArabic = /[\u0600-\u06FF]/.test(textContent);
      const autoStyle = applyAutoStyle(
        styleSettings?.latin?.autoHighlightTitles, 
        styleSettings?.latin?.highlightColor || '#fef08a',
        styleSettings?.latin?.stripColor || '#10b981'
      );
      if (isArabic) {
         return (
          <h2 className={`font-arabic ${styleSettings?.arabic?.lineHeight || 'leading-[2.5]'} text-right block w-full mt-8 mb-4 border-b border-current pb-2 font-bold`} style={{ direction: 'rtl', fontFamily: arabicFontFamily, fontSize: `${fontSize * (styleSettings?.arabic?.fontSizeScale || 1.6) * (PAPER_DIMENSIONS[paperSize]?.scale || 1.0) * 1.5}px`, color: styleSettings?.arabic?.color || '#047857' }} {...props}>
             <span style={autoStyle}>{children}</span>
          </h2>
        );
      }
      return (
        <h2 
          className={`font-bold text-xl mt-8 mb-4 border-b border-current pb-2 ${PAPER_TEMPLATES[paperTemplate].text}`} 
          style={autoStyle}
          {...props}
        >
          {children}
        </h2>
      );
    },
    h3: ({node, children, ...props}: any) => {
      const textContent = getTextContent(children).trim();
      const isArabic = /[\u0600-\u06FF]/.test(textContent);
      const autoStyle = applyAutoStyle(
        styleSettings?.latin?.autoHighlightTitles, 
        styleSettings?.latin?.highlightColor || '#fef08a',
        styleSettings?.latin?.stripColor || '#10b981'
      );
      if (isArabic) {
        return (
          <h3 className={`font-arabic ${styleSettings?.arabic?.lineHeight || 'leading-[2.5]'} text-right block w-full mt-6 mb-3 font-bold`} style={{ direction: 'rtl', fontFamily: arabicFontFamily, fontSize: `${fontSize * (styleSettings?.arabic?.fontSizeScale || 1.6) * (PAPER_DIMENSIONS[paperSize]?.scale || 1.0) * 1.3}px`, color: styleSettings?.arabic?.color || '#047857' }} {...props}>
             <span style={autoStyle}>{children}</span>
          </h3>
        );
      }
      return (
        <h3 
          className={`font-bold text-lg mt-6 mb-3 ${PAPER_TEMPLATES[paperTemplate].text}`} 
          style={autoStyle}
          {...props}
        >
          {children}
        </h3>
      );
    },
    ul: ({children}: any) => <ul className="list-none pl-2 mb-4 space-y-2">{children}</ul>,
    ol: ({children}: any) => <ol className="list-decimal pl-6 mb-4 space-y-2">{children}</ol>,
    li: ({children}: any) => {
      const textContent = getTextContent(children).trim();
      const isArabic = /[\u0600-\u06FF]/.test(textContent);
      if (isArabic) {
        return (
          <li className={`relative pl-6 flex items-start gap-2 mb-4`} style={{ direction: 'rtl' }}>
             <div className="absolute right-0 top-3 w-2 h-2 rounded-full bg-emerald-500/40 mt-0.5" />
             <div className={`flex-1 font-arabic ${styleSettings?.arabic?.lineHeight || 'leading-[2.5]'} text-right mb-4 block w-full`} style={{ display: 'block', width: '100%', fontFamily: arabicFontFamily, fontSize: `${fontSize * (styleSettings?.arabic?.fontSizeScale || 1.6) * (PAPER_DIMENSIONS[paperSize]?.scale || 1.0)}px`, color: styleSettings?.arabic?.color || '#047857' }}>{children}</div>
          </li>
        );
      }
      return (
        <li className="relative pl-6 flex items-start gap-2">
          <div className="absolute left-0 top-2 w-2 h-2 rounded-full bg-emerald-500/40 mt-0.5" />
          <div className="flex-1">{children}</div>
        </li>
      );
    },
    strong: ({children}: any) => {
      const autoStyle = applyAutoStyle(
        styleSettings?.latin?.autoHighlightBold, 
        styleSettings?.latin?.highlightColor || '#fef08a',
        styleSettings?.latin?.stripColor || '#10b981'
      );
      
      return (
        <strong className="font-bold" style={autoStyle}>
          {children}
        </strong>
      );
    },
    em: ({children}: any) => {
      const textContent = getTextContent(children);
      // Smart detection for Latin (transliteration) vs Translation
      const looksLikeLatin = textContent.length < 150 && /['’āīūṣḍṭẓḥ]/.test(textContent.toLowerCase());
      
      const styleType = (styleSettings?.latin?.autoHighlightItalic && styleSettings?.latin?.autoHighlightItalic !== 'none')
        ? styleSettings.latin.autoHighlightItalic
        : (looksLikeLatin ? styleSettings?.latin?.autoHighlightLatin : styleSettings?.latin?.autoHighlightTranslation);

      const autoStyle = applyAutoStyle(
        styleType, 
        styleSettings?.latin?.highlightColor || '#fef08a',
        styleSettings?.latin?.stripColor || '#10b981'
      );

      return (
        <em className="italic" style={autoStyle}>
          {children}
        </em>
      );
    },
    code: ({className, children, ...props}: any) => {
      const match = /language-(\w+)/.exec(className || '');
      const isInline = !match && typeof children === 'string' && !children.includes('\n');
      
      // We must handle cases where children is an array (due to rehype-raw)
      const extractText = (nodes: any): string => {
        if (typeof nodes === 'string') return nodes;
        if (Array.isArray(nodes)) return nodes.map(extractText).join('');
        if (nodes && nodes.props && nodes.props.children) return extractText(nodes.props.children);
        return '';
      };
      
      const content = extractText(children).replace(/\n$/, '');
      
      if (!isInline && match && match[1] === 'arabic') {
        const dalilStyle = DALIL_STYLES[styleSettings?.dalil || 'none'];
        // Instead of manually splitting by lines and rendering raw text which breaks rehype-raw markup,
        // we can just wrap the rendered children in the appropriate arabic font wrapper.
        
        // Let's pass the raw children so HTML tags (like <mark>) can work inside code blocks if they somehow got parsed.
        // Actually, rehype-raw DOES NOT parse HTML inside <code>.
        // So we should manually use dangerouslySetInnerHTML for arabic blocks if they contain markup,
        // or just render the children if we let ReactMarkdown parse it.
        // Wait, if content is raw string with HTML, we should use dangerouslySetInnerHTML.
        
        const lines = content.split('\n');
        return (
          <div 
            className={`w-full my-8 ${dalilStyle.container} clear-both`}
            style={styleSettings?.dalil === 'stripe-line' ? { borderRightColor: styleSettings?.latin?.stripColor, backgroundColor: styleSettings?.latin?.stripColor ? hexToRgba(styleSettings.latin.stripColor, 0.05) : 'rgba(0,0,0,0.05)' } : {}}
          >
            {lines.map((line: string, idx: number) => {
              const hasArabic = /[\u0600-\u06FF]/.test(line);
              
              if (hasArabic) {
                const autoStyle = applyAutoStyle(
                  styleSettings?.latin?.autoHighlightArabic, 
                  styleSettings?.latin?.highlightColor || '#fef08a',
                  styleSettings?.latin?.stripColor || '#10b981',
                  true
                );
                
                // If the line contains HTML tags (like <mark>), render via dangeroulsySetInnerHTML
                const isHtml = /<[a-z][\s\S]*>/i.test(line);
                
                return (
                  <div 
                    key={idx}
                    className={`font-arabic ${styleSettings?.arabic?.lineHeight || 'leading-[2.5]'} ${styleSettings?.arabic?.fontWeight || 'font-normal'} ${styleSettings?.arabic?.textShadow || 'none'} ${styleSettings?.arabic?.wordSpacing || 'tracking-normal'} ${styleSettings?.arabic?.textAlign || 'text-right'} w-full block ${dalilStyle.text}`} 
                    style={{ 
                      fontSize: `${fontSize * (styleSettings?.arabic?.fontSizeScale || 1.6) * (PAPER_DIMENSIONS[paperSize]?.scale || 1.0)}px`, 
                      fontFamily: arabicFontFamily,
                      color: styleSettings?.arabic?.color || '#047857',
                      direction: 'rtl',
                      ...autoStyle
                    }}
                  >
                    {isHtml ? <span dangerouslySetInnerHTML={{ __html: line }} /> : line}
                  </div>
                );
              } else if (line.trim()) {
                const isStripeLine = styleSettings?.dalil === 'stripe-line';
                
                // Determine if this is Latin or Translation
                const isExplicitTranslation = /^\s*(artinya|terjemahan)\s*:/i.test(line) || /^\s*\(.*\)\s*$/.test(line);
                const nonArabicLines = lines.filter(l => l.trim() && !/[\u0600-\u06FF]/.test(l));
                const lineIdx = nonArabicLines.indexOf(line);
                
                let isLatin = false;
                if (!isExplicitTranslation) {
                  // If it's not explicitly a translation, it's latin if it's the first of multiple lines,
                  // or if there's only one line and it doesn't look like a translation.
                  // But to be safe, if there's only 1 line, we default to translation unless we know it's latin.
                  // Let's use a heuristic: if it has many common latin transliteration patterns or is the first of 2.
                  isLatin = (nonArabicLines.length > 1 && lineIdx === 0);
                }
                
                const autoStyle = applyAutoStyle(
                  isLatin ? styleSettings?.latin?.autoHighlightLatin : styleSettings?.latin?.autoHighlightTranslation,
                  styleSettings?.latin?.highlightColor || '#fef08a',
                  styleSettings?.latin?.stripColor || '#10b981'
                );

                return (
                  <div 
                    key={idx}
                    className={`${isStripeLine ? 'text-right pr-2' : 'text-center'} text-sm italic opacity-80 mt-2 font-sans`}
                    style={{ 
                      fontSize: `${fontSize * 0.85 * (PAPER_DIMENSIONS[paperSize]?.scale || 1.0)}px`,
                      color: 'inherit',
                      direction: isStripeLine ? 'rtl' : 'ltr',
                      ...autoStyle
                    }}
                  >
                    {line}
                  </div>
                );
              }
              return null;
            })}
          </div>
        );
      }
      
      // Fallback for old div format
      if (!isInline && String(children).includes('arabic-text')) {
        return <code className={className} {...props}>{children}</code>;
      }
      
      // Inline Code
      return <code className={`${className} bg-black/5 px-1.5 py-0.5 rounded text-sm font-mono`} {...props}>{children}</code>;
    },
    mark: ({children}: any) => {
      return <mark className="bg-amber-200 text-amber-900 px-1 rounded-sm font-bold shadow-sm">{children}</mark>;
    },
    u: ({children}: any) => <u className="underline decoration-current underline-offset-2">{children}</u>,
    s: ({children}: any) => <s className="line-through decoration-current">{children}</s>,
    span: ({style, children, ...props}: any) => {
      // rehype-raw might pass style as a string, React needs an object
      let styleObj = style;
      if (typeof style === 'string') {
        styleObj = {};
        style.split(';').forEach(item => {
          const [key, value] = item.split(':');
          if (key && value) {
            const camelKey = key.trim().replace(/-([a-z])/g, g => g[1].toUpperCase());
            styleObj[camelKey] = value.trim();
          }
        });
      }
      return <span style={styleObj} {...props}>{children}</span>;
    },
    blockquote: ({children, ...props}: any) => {
      const textContent = getTextContent(children).trim();
      const isArabic = /[\u0600-\u06FF]/.test(textContent);
      const dalilStyle = DALIL_STYLES[styleSettings?.dalil || 'none'];
      // If dalil style is 'none', use a default blockquote style
      const defaultQuoteStyle = "border-l-4 border-current pl-4 italic my-4 opacity-80";
      const activeStyle = styleSettings?.dalil === 'none' ? defaultQuoteStyle : `${dalilStyle.container} ${dalilStyle.text}`;
      
      if (isArabic) {
        return (
          <blockquote 
            className={`${activeStyle} ${PAPER_TEMPLATES[paperTemplate].text} font-arabic ${styleSettings?.arabic?.lineHeight || 'leading-[2.5]'} text-right block w-full`}
            style={{ 
              direction: 'rtl', 
              fontFamily: arabicFontFamily, 
              fontSize: `${fontSize * (styleSettings?.arabic?.fontSizeScale || 1.6) * (PAPER_DIMENSIONS[paperSize]?.scale || 1.0)}px`, 
              color: styleSettings?.arabic?.color || '#047857',
              ...(styleSettings?.dalil === 'stripe-line' ? { borderRightColor: styleSettings?.latin?.stripColor, backgroundColor: styleSettings?.latin?.stripColor ? hexToRgba(styleSettings.latin.stripColor, 0.05) : 'rgba(0,0,0,0.05)' } : {})
            }}
            {...props}
          >
            {children}
          </blockquote>
        );
      }
      return (
        <blockquote 
          className={`${activeStyle} ${PAPER_TEMPLATES[paperTemplate].text}`}
          style={styleSettings?.dalil === 'stripe-line' ? { borderRightColor: styleSettings?.latin?.stripColor, backgroundColor: styleSettings?.latin?.stripColor ? hexToRgba(styleSettings.latin.stripColor, 0.05) : 'rgba(0,0,0,0.05)' } : {}}
          {...props}
        >
          {children}
        </blockquote>
      );
    },
    // Handle raw divs (legacy support)
    div: ({className, children, ...props}: any) => {
      if (className === 'arabic-text') {
        const dalilStyle = DALIL_STYLES[styleSettings?.dalil || 'none'];
        return (
          <div 
            className={`w-full my-8 ${dalilStyle.container} clear-both`}
            style={styleSettings?.dalil === 'stripe-line' ? { borderRightColor: styleSettings?.latin?.stripColor, backgroundColor: styleSettings?.latin?.stripColor ? hexToRgba(styleSettings.latin.stripColor, 0.05) : 'rgba(0,0,0,0.05)' } : {}}
          >
            <div 
              className={`font-arabic ${styleSettings?.arabic?.lineHeight || 'leading-[2.5]'} ${styleSettings?.arabic?.fontWeight || 'font-normal'} ${styleSettings?.arabic?.textShadow || 'none'} ${styleSettings?.arabic?.wordSpacing || 'tracking-normal'} ${styleSettings?.arabic?.textAlign || 'text-right'} w-full block ${dalilStyle.text}`} 
              style={{ 
                fontSize: `${fontSize * (styleSettings?.arabic?.fontSizeScale || 1.6) * (PAPER_DIMENSIONS[paperSize]?.scale || 1.0)}px`, 
                fontFamily: arabicFontFamily,
                color: styleSettings?.arabic?.color || '#047857',
                direction: 'rtl'
              }}
              {...props}
            >
              {children}
            </div>
          </div>
        )
      }
      if (className === 'latin-text') {
        return <div className={`italic opacity-80 mb-4 text-justify ${PAPER_TEMPLATES[paperTemplate].text}`} style={{ fontSize: `${fontSize * 0.9 * (PAPER_DIMENSIONS[paperSize]?.scale || 1.0)}px` }} {...props}>{children}</div>;
      }
      if (className === 'translation-text') {
        return <div className={`mb-8 opacity-90 text-justify ${PAPER_TEMPLATES[paperTemplate].text}`} style={{ fontSize: `${fontSize * 0.95 * (PAPER_DIMENSIONS[paperSize]?.scale || 1.0)}px` }} {...props}>{children}</div>;
      }
      return <div className={className} {...props}>{children}</div>
    }
  }), [styleSettings, textAlign, fontSize, paperTemplate, arabicFontFamily, activeMarker, markingScope, handleApplyMark]);

  // Auto-resize textarea
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [isEditing, editContent, paperSize, zoom]);

  const toggleEdit = () => {
    if (isEditing) {
      // Save changes
      handleSave(editContent, coverData, watermark);
    } else {
      // Start editing
      setEditContent(result);
    }
    setIsEditing(!isEditing);
  };

  const insertText = (before: string, after: string = '') => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const text = editContent;
    const newText = text.substring(0, start) + before + text.substring(start, end) + after + text.substring(end);
    updateContent(newText, 'Insert Text');
    
    // Restore focus and cursor
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(start + before.length, end + before.length);
      }
    }, 0);
  };

  const [showPageOrganizer, setShowPageOrganizer] = useState(false);
  const [showMagicModal, setShowMagicModal] = useState(false);
  const [magicModalType, setMagicModalType] = useState<'story' | 'analogy' | 'quote'>('story');
  const [magicPrompt, setMagicPrompt] = useState('');

  const openMagicModal = (type: 'story' | 'analogy' | 'quote') => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const selectedText = editContent.substring(start, end);
    
    setMagicModalType(type);
    setMagicPrompt(selectedText || tema || ''); // Default to selection or theme
    setShowMagicModal(true);
  };

  const handleMagicGenerate = async () => {
    if (!magicPrompt.trim()) return;
    setShowMagicModal(false);
    setIsAiEditing(true);

    try {
      const modelToUse = customModelId?.trim() || selectedModel || 'gemini-3.1-flash-preview';
      const ai = new GoogleGenAI({ apiKey });
      let prompt = '';
      const langContext = `Gunakan bahasa: ${language || 'Indonesia'}. (PENTING: Seluruh output WAJIB dalam bahasa ${language || 'Indonesia'} dengan tata bahasa yang natural, mengalir, dan berwibawa. Jika bahasa daerah, gunakan tingkat kesopanan yang tinggi/halus).`;
      
      if (magicModalType === 'story') {
        prompt = `${langContext}\nBuatkan sebuah KISAH INSPIRATIF pendek (maksimal 2 paragraf) yang relevan dengan topik: "${magicPrompt}". 
        Kisah bisa dari Sirah Nabawiyah, Sahabat, atau Ulama Salaf. 
        Gunakan gaya bahasa bercerita yang menyentuh hati. Langsung tulis kisahnya.`;
      } else if (magicModalType === 'analogy') {
        prompt = `${langContext}\nBuatkan sebuah ANALOGI/PERUMPAMAAN cerdas dan sederhana untuk menjelaskan konsep: "${magicPrompt}".
        Gunakan contoh kehidupan sehari-hari yang mudah dipahami awam. Langsung tulis analoginya.`;
      } else if (magicModalType === 'quote') {
        prompt = `${langContext}\nCarikan satu KUTIPAN (Atsar/Qaul) Ulama Salaf yang sangat relevan dengan topik: "${magicPrompt}".
        Sertakan nama ulama dan sumber kitabnya jika ada. Langsung tulis kutipannya.`;
      }

      const response = await ai.models.generateContent({
        model: modelToUse,
        contents: prompt,
      });

      const newText = response.text || '';
      
      // Insert at cursor (or replace selection if any)
      if (textareaRef.current) {
        const start = textareaRef.current.selectionStart;
        const end = textareaRef.current.selectionEnd;
        const text = editContent;
        
        // If text was selected and used as prompt, we probably want to KEEP it and append the result, 
        // OR replace it if the user intended to replace. 
        // SAFEST: Insert AFTER selection if selection exists, or AT cursor if no selection.
        // Actually, for "Insert", usually we want to insert.
        
        let newContent;
        let newCursorPos;

        if (start !== end) {
           // If text selected, append after selection (with newline)
           newContent = text.substring(0, end) + '\n\n' + newText + text.substring(end);
           newCursorPos = end + 2 + newText.length;
        } else {
           // If no selection, insert at cursor
           newContent = text.substring(0, start) + newText + text.substring(end);
           newCursorPos = start + newText.length;
        }

        updateContent(newContent, `AI ${magicModalType}`);
        
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
          }
        }, 0);
      }
    } catch (e) {
      console.error("Magic Generate failed", e);
      alert('Gagal memproses permintaan. Periksa koneksi atau API Key.');
    } finally {
      setIsAiEditing(false);
    }
  };

  const [showAudienceModal, setShowAudienceModal] = useState(false);
  const [audienceType, setAudienceType] = useState<'jumat' | 'eid' | 'kultum' | 'nikah' | 'umum' | 'youth'>('jumat');

  const AUDIENCE_TEMPLATES = {
    jumat: [
      "Jamaah Jumat yang dirahmati Allah,",
      "Ma'asyiral Muslimin rahimakumullah,",
      "Sidang Jumat yang dimuliakan Allah,",
      "Hadirin Jamaah Jumat yang berbahagia,",
      "Kaum Muslimin rahimakumullah,",
      "Ikhwatul Iman yang dimuliakan Allah,",
      "Jamaah rahimakumullah,",
      "Hadirin yang berbahagia,"
    ],
    eid: [
      "Allahu Akbar, Allahu Akbar, Allahu Akbar, Walillahilhamd. Jamaah Shalat Ied yang dimuliakan Allah,",
      "Kaum Muslimin dan Muslimat yang berbahagia,",
      "Hadirin wal Hadirat Rahimakumullah,",
      "Jamaah Shalat Idul Fitri yang dirahmati Allah,",
      "Allahu Akbar, Allahu Akbar, Allahu Akbar. Hadirin sekalian yang saya hormati,"
    ],
    kultum: [
      "Hadirin sekalian yang dirahmati Allah,",
      "Bapak-bapak dan Ibu-ibu yang saya muliakan,",
      "Saudara-saudaraku seiman dan seaqidah,",
      "Jamaah shalat yang berbahagia,",
      "Assalamu'alaikum Warahmatullahi Wabarakatuh. Hadirin sekalian,"
    ],
    nikah: [
      "Hadirin tamu undangan yang berbahagia,",
      "Keluarga besar kedua mempelai yang saya hormati,",
      "Para saksi dan hadirin yang dimuliakan Allah,",
      "Mempelai berdua yang sedang berbahagia,",
      "Para sesepuh dan tokoh masyarakat yang saya hormati,"
    ],
    umum: [
      "Hadirin sekalian yang saya hormati,",
      "Bapak-bapak, Ibu-ibu, dan Saudara-saudara sekalian,",
      "Para hadirin yang dirahmati Allah,",
      "Segenap tamu undangan yang berbahagia,",
      "Para hadirin wal hadirat rahimakumullah,"
    ],
    youth: [
      "Teman-teman muda yang penuh semangat,",
      "Generasi penerus bangsa yang saya banggakan,",
      "Adik-adik dan rekan-rekan remaja sekalian,",
      "Sahabat-sahabat muda yang luar biasa,",
      "Para pemuda harapan bangsa yang saya cintai,"
    ]
  };

  // Context awareness for audience templates
  useEffect(() => {
    if (showAudienceModal) {
      const lowerTema = (tema || "").toLowerCase();
      if (lowerTema.includes('jumat') || lowerTema.includes('khotbah')) {
        setAudienceType('jumat');
      } else if (lowerTema.includes('ied') || lowerTema.includes('fitri') || lowerTema.includes('adha')) {
        setAudienceType('eid');
      } else if (lowerTema.includes('kultum') || lowerTema.includes('ceramah') || lowerTema.includes('tausiyah')) {
        setAudienceType('kultum');
      } else if (lowerTema.includes('nikah') || lowerTema.includes('walimah')) {
        setAudienceType('nikah');
      } else if (lowerTema.includes('muda') || lowerTema.includes('remaja') || lowerTema.includes('pemuda')) {
        setAudienceType('youth');
      } else {
        setAudienceType('umum');
      }
    }
  }, [showAudienceModal, tema]);

  const [isGeneratingCover, setIsGeneratingCover] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [useDeepAnalysis, setUseDeepAnalysis] = useState(false);

  const generateCoverText = async () => {
    const apiKey = localStorage.getItem('custom_api_key') || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      alert('API Key tidak ditemukan.');
      return;
    }
    
    setIsGeneratingCover(true);
    try {
      const modelToUse = customModelId?.trim() || selectedModel || 'gemini-3.1-flash-preview';
      const ai = new GoogleGenAI({ apiKey });
      
      const textPrompt = `
        Buatkan deskripsi singkat atau subtitle untuk cover buku/naskah khotbah yang menarik berdasarkan tema: "${tema}".
        Output WAJIB JSON dengan format:
        {
          "subtitle": "Deskripsi singkat atau tujuan naskah (maks 15 kata)"
        }
      `;
      
      const textResponse = await ai.models.generateContent({
        model: modelToUse,
        contents: textPrompt,
        config: { responseMimeType: 'application/json' }
      });
      
      let textData: any = {};
      try {
        const jsonStr = textResponse.text?.replace(/```json/g, '')?.replace(/```/g, '')?.trim() || '{}';
        textData = JSON.parse(jsonStr);
      } catch (e) {
        console.error('Failed to parse JSON:', e);
      }
      
      setCoverData({
        ...coverData,
        subtitle: textData.subtitle || coverData.subtitle
      });
      
    } catch (error) {
      console.error('Error generating cover text:', error);
      alert('Gagal membuat teks cover AI.');
    } finally {
      setIsGeneratingCover(false);
    }
  };

  const generateTOC = () => {
    if (!editContent) return;
    
    // Step 1: Try to extract from Metadata (The "Expert" Trick)
    const metaMatch = editContent.match(/\[DAFTAR_ISI\]:\s*(\[.*\])/);
    if (metaMatch && metaMatch[1]) {
      try {
        const tocArray = JSON.parse(metaMatch[1]);
        if (Array.isArray(tocArray) && tocArray.length > 0) {
          const generatedTOC = tocArray.slice(0, 6).map((item, i) => `${i + 1}. ${item}`).join('\n');
          setCoverData({ ...coverData, toc: generatedTOC });
          console.log("Extracted TOC from metadata");
          return;
        }
      } catch (e) {
        console.warn("Failed to parse TOC metadata", e);
      }
    }

    // Step 2: Scoring Heuristic (Akal Cerdas)
    const lines = editContent.split('\n');
    const scoredLines = lines.map((line, index) => {
      const trimmed = line.trim();
      // Ignore very short or very long lines
      if (trimmed.length < 3 || trimmed.length > 120) return { text: '', score: -1, index };
      
      let score = 0;
      let cleanText = trimmed;

      // Signal 1: Markdown Headings (Strongest)
      if (trimmed.startsWith('#')) {
        score += 25;
        cleanText = cleanText.replace(/^#+\s*/, '');
      }

      // Signal 2: Bold Text
      if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
        score += 15;
        cleanText = cleanText.replace(/\*\*/g, '');
      }

      // Signal 3: Numbered List at start
      if (/^\d+[\.\)]\s+/.test(trimmed)) {
        score += 12;
        cleanText = cleanText.replace(/^\d+[\.\)]\s+/, '');
      }

      // Signal 4: Sermon Keywords
      const keywords = ["Pertama", "Kedua", "Ketiga", "Keempat", "Kelima", "Keenam", "Kesimpulan", "Penutup", "Gagasan", "Poin", "Inti", "Hikmah"];
      if (keywords.some(k => trimmed.toLowerCase().startsWith(k.toLowerCase()))) {
        score += 15;
      }

      // Signal 5: Ends with Colon (often a sub-heading)
      if (trimmed.endsWith(':')) {
        score += 8;
        cleanText = cleanText.replace(/:$/, '');
      }

      // Signal 6: Length Heuristic (Ideal title length)
      if (cleanText.length > 5 && cleanText.length < 60) {
        score += 5;
      }

      // Signal 7: All Caps (often a heading)
      if (cleanText === cleanText.toUpperCase() && cleanText.length > 4 && !/^\d+$/.test(cleanText)) {
        score += 5;
      }

      // Penalty: Common noise words
      const blacklist = ["MUKADIMAH", "SALAM", "DOA", "KHOTBAH", "PERTAMA", "KEDUA", "KHUTBAH", "SYARAT", "RUKUN"];
      if (blacklist.some(b => cleanText.toUpperCase().includes(b))) {
        score -= 10;
      }
      
      // Penalty: Lines that look like normal sentences (end with period and are long)
      if (trimmed.endsWith('.') && trimmed.length > 40) {
        score -= 20;
      }
      
      // Penalty: Template Markers
      if (cleanText.toUpperCase().includes('[TEMPLATE')) {
        score -= 100;
      }
      
      return { text: cleanText.trim(), score, index };
    });

    // Filter and sort
    const topItems = scoredLines
      .filter(item => item.score >= 15 && !item.text.toUpperCase().includes('[TEMPLATE')) // Minimum threshold for a "gagasan"
      .sort((a, b) => b.score - a.score || a.index - b.index) // Best score first
      .slice(0, 6)
      .sort((a, b) => a.index - b.index) // Back to original order
      .map(item => item.text);

    // Step 3: Fallback to Page Separator logic if heuristic failed
    if (topItems.length < 2) {
      const pages = editContent.split('---');
      const fallbackItems: string[] = [];
      pages.forEach((page, index) => {
        if (index === 0) return; 
        const firstLine = page.trim().split('\n')[0].replace(/^#+\s*/, '').replace(/\*\*/g, '').trim();
        if (firstLine && firstLine.length < 50 && !firstLine.toUpperCase().includes('[TEMPLATE')) {
          fallbackItems.push(firstLine);
        }
      });
      
      if (fallbackItems.length > 0) {
        const finalTOC = fallbackItems.slice(0, 6).map((item, i) => `${i + 1}. ${item}`).join('\n');
        setCoverData({ ...coverData, toc: finalTOC });
        return;
      }
    }

    const finalTOC = topItems.map((item, i) => `${i + 1}. ${item}`).join('\n');
    
    setCoverData({
      ...coverData,
      toc: finalTOC || coverData.toc
    });
  };

  // Auto-extract TOC if empty and content exists
  useEffect(() => {
    if (!coverData?.toc && editContent && editContent.trim().length > 100) {
      generateTOC();
    }
  }, [editContent, coverData?.toc]);

  const generateTOCWithAI = async () => {
    if (!editContent) return;
    setIsGeneratingCover(true);
    try {
      const prompt = `
        Tugas: Buatkan DAFTAR ISI (maksimal 6 poin) berdasarkan naskah khotbah berikut.
        Naskah:
        ${editContent.substring(0, 3000)}
        
        Instruksi:
        1. Identifikasi poin-poin utama atau sub-judul.
        2. Format: "1. Judul Poin", "2. Judul Poin", dst.
        3. Maksimal 6 poin.
        4. Bahasa Indonesia yang baik dan benar.
        
        Output WAJIB teks daftar isi saja, tanpa kata pengantar.
      `;
      
      const activeKey = apiKey;
      const ai = new GoogleGenAI({ apiKey: activeKey });
      const response = await ai.models.generateContent({
        model: selectedModel,
        contents: prompt
      });
      
      const generatedTOC = response.text.trim();
      setCoverData({
        ...coverData,
        toc: generatedTOC || coverData.toc
      });
    } catch (error) {
      console.error('Error generating TOC with AI:', error);
      alert('Gagal membuat daftar isi AI.');
    } finally {
      setIsGeneratingCover(false);
    }
  };

  const generateSubtitleLocally = () => {
    if (!editContent) return;
    
    // Try to find the first paragraph or intro
    const paragraphs = editContent.split('\n\n').filter(p => p.trim().length > 20);
    let subtitle = '';
    
    if (paragraphs.length > 0) {
      // Take the first paragraph, clean it up
      subtitle = paragraphs[0].trim().replace(/^#+\s*/, '').replace(/\n/g, ' ');
      if (subtitle.length > 100) {
        subtitle = subtitle.substring(0, 97) + '...';
      }
    }
    
    setCoverData({
      ...coverData,
      subtitle: subtitle || coverData.subtitle
    });
  };

  const generateCoverImage = async () => {
    const apiKey = localStorage.getItem('custom_api_key') || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      alert('API Key tidak ditemukan. Mohon atur di Pengaturan.');
      return;
    }
    
    setIsGeneratingImage(true);
    try {
      const ai = new GoogleGenAI({ apiKey });
      
      let visualPhilosophy = "";
      
      const metaMatch = editContent?.match(/\[VISUAL_PHILOSOPHY\]:\s*"(.*)"/);
      if (metaMatch && metaMatch[1]) {
        visualPhilosophy = metaMatch[1];
      } else if (useDeepAnalysis) {
        try {
          const scriptSnippet = editContent?.substring(0, 4000) || "";
          const analysisPrompt = `
            Analyze this sermon script and describe a visual metaphor or artistic philosophy for its book cover.
            Focus on: Mood, Color Palette, Symbols, and Atmosphere.
            SCRIPT: ${scriptSnippet}
          `;
          
          const analysisResponse = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: analysisPrompt
          });
          visualPhilosophy = analysisResponse.text || "";
        } catch (e) {
          console.warn("Philosophy analysis failed", e);
        }
      }

      let aspectRatio: "1:1" | "3:4" | "4:3" | "9:16" | "16:9" = "3:4";
      if (paperSize === 'A4' || paperSize === 'A5' || paperSize === 'B5') aspectRatio = "3:4";

      const selectedStyle = COVER_STYLES.find(s => s.id === coverData.imageStyle) || COVER_STYLES[0];
      const cleanTitle = (coverData.title || tema || "Khotbah Digital").toUpperCase().trim();

      const imagePrompt = `A high-quality, professional book cover for an Islamic sermon titled "${cleanTitle}".
      
      VISUAL PHILOSOPHY: ${visualPhilosophy || `Theme: ${tema}. Style: ${selectedStyle.prompt}`}
      
      IMPORTANT:
      - ONLY text allowed: "${cleanTitle}".
      - NO other text, names, or artifacts.
      - Style: ${selectedStyle.prompt}. Peace, divinity, high professional quality.
      - No human faces. Focus on metaphors like light, calligraphy, nature, or architecture.`;
      
      const imageResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image', // Recommended for stable image generation
        contents: imagePrompt,
        config: {
          imageConfig: {
            aspectRatio: aspectRatio
          }
        }
      });
      
      let imageUrl = '';
      if (imageResponse.candidates?.[0]?.content?.parts) {
        const parts = imageResponse.candidates[0].content.parts;
        for (const part of parts) {
          if (part.inlineData) {
            imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            break;
          }
        }
      }
      
      if (!imageUrl) throw new Error("Gagal menerima data gambar dari AI.");

      let rawHistory = [...(coverData.imageHistory || []), imageUrl];
      const newHistory = rawHistory.slice(-10); // Keep last 10
      
      setCoverData({
        ...coverData,
        imageUrl: imageUrl,
        imageHistory: newHistory,
        showImageCover: true,
        showTextCover: false, 
        showTextOverlay: true,
        imageScale: 1,
        imageOffsetX: 0,
        imageOffsetY: 0
      });
      
    } catch (error: any) {
      console.error('Error generating cover image:', error);
      alert(`Gagal membuat cover AI: ${error.message || 'Error tidak diketahui'}`);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleCoverImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const imageUrl = event.target?.result as string;
      if (imageUrl) {
        const newHistory = [...(coverData.imageHistory || []), imageUrl];
        setCoverData({
          ...coverData,
          imageUrl,
          imageHistory: newHistory,
          showImageCover: true,
          showTextCover: false, // Default to image cover only if uploaded
          imageScale: 1,
          imageOffsetX: 0,
          imageOffsetY: 0
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAiEdit = async (action: 'rewrite' | 'expand' | 'shorten' | 'translate' | 'paginate' | 'tidy' | 'transliterate' | 'fix-arabic' | 'remove-translation' | 'add-latin' | 'validate-dalil' | 'smart-edit' | 'ganti-dalil' | 'tambah-dalil' | 'continue') => {
    if (!textareaRef.current) return;
    
    const apiKey = localStorage.getItem('custom_api_key') || process.env.GEMINI_API_KEY || '';
    
    let selectedText = '';
    let start = 0;
    let end = 0;

    if (action === 'continue') {
      setIsAiEditing(true);
      try {
        const ai = new GoogleGenAI({ apiKey });
        const lastChars = editContent.slice(-1500); // Get last 1500 chars for context
        const prompt = `Lanjutkan teks khotbah/ceramah berikut ini. Jangan mengulang kalimat terakhir, langsung sambung saja dengan kalimat atau paragraf berikutnya yang logis, natural, dan sesuai konteks. Tuliskan kelanjutannya saja (sekitar 200-300 kata).\n\nTeks sebelumnya:\n"${lastChars}"`;
        
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: prompt,
        });
        
        const newText = response.text.trim();
        const newContent = editContent + (editContent.endsWith(' ') || editContent.endsWith('\n') ? '' : ' ') + newText;
        updateContent(newContent, 'Lanjutkan Tulisan');
      } catch (error) {
        console.error("Failed to continue writing:", error);
        alert("Gagal melanjutkan tulisan. Pastikan API Key valid dan koneksi internet stabil.");
      } finally {
        setIsAiEditing(false);
      }
      return;
    }

    if (action === 'paginate') {
      setIsProcessingTool(true);
      setToolProgress(0);
      
      const interval = setInterval(() => {
        setToolProgress(prev => Math.min(prev + 15, 95));
      }, 100);

      setTimeout(() => {
        // Local pagination logic - No AI needed, 100% safe from rewriting
        const contentWithoutMarkers = editContent.replace(/\n\s*---\s*\n/g, '\n');
        const paragraphs = contentWithoutMarkers.split(/\n\s*\n/).filter(p => p.trim());
        
        let newContent = '';
        let currentGroup = [];
        // More intelligent paragraph grouping based on length
        let currentLines = 0;
        const targetLinesPerPage = safeCharLimit * 0.8; // Use 80% of safe limit for better layout
        
        for (let i = 0; i < paragraphs.length; i++) {
          const p = paragraphs[i];
          const pLength = getEstimatedLength(p);
          if (currentLines + pLength > targetLinesPerPage && currentGroup.length > 0) {
            newContent += currentGroup.join('\n\n') + '\n\n---\n\n';
            currentGroup = [p];
            currentLines = pLength;
          } else {
            currentGroup.push(p);
            currentLines += pLength;
          }
        }
        newContent += currentGroup.join('\n\n');
        
        updateContent(newContent, 'Otomatis Bagi Halaman');
        clearInterval(interval);
        setToolProgress(100);
        setTimeout(() => setIsProcessingTool(false), 300);
      }, 600);
      return;
    }

    if (action === 'tidy') {
      setIsProcessingTool(true);
      setToolProgress(0);
      
      const interval = setInterval(() => {
        setToolProgress(prev => Math.min(prev + 20, 95));
      }, 80);

      setTimeout(() => {
        // Local tidy logic - Instant and safe
        const tidied = editContent
          .replace(/[ \t]+/g, ' ') // Remove double spaces
          .replace(/\n\s*\n\s*\n+/g, '\n\n') // Max 2 newlines
          .replace(/ ,/g, ',') // Fix space before comma
          .replace(/ \./g, '.') // Fix space before dot
          .replace(/\( /g, '(') // Fix space after open paren
          .replace(/ \)/g, ')') // Fix space before close paren
          .trim();
        
        updateContent(tidied, 'Rapikan Teks');
        clearInterval(interval);
        setToolProgress(100);
        setTimeout(() => setIsProcessingTool(false), 300);
      }, 500);
      return;
    }

    start = textareaRef.current.selectionStart;
    end = textareaRef.current.selectionEnd;
    selectedText = editContent.substring(start, end);

    // For insertion actions, we don't strictly need selected text, but we use it as context if available
    if (!selectedText.trim() && !['insert-story', 'insert-analogy', 'insert-quote'].includes(action)) {
      alert('Blok teks yang ingin diubah terlebih dahulu.');
      return;
    }

    setIsAiEditing(true);
    setIsProcessingTool(true);
    setToolProgress(0);
    
    const progressInterval = setInterval(() => {
      setToolProgress(prev => Math.min(prev + 5, 90));
    }, 200);

    try {
      const modelToUse = customModelId?.trim() || selectedModel || 'gemini-3.1-flash-preview';
      const ai = new GoogleGenAI({ apiKey });
      
      let prompt = '';
      const langContext = `Gunakan bahasa: ${language || 'Indonesia'}. (PENTING: Seluruh output WAJIB dalam bahasa ${language || 'Indonesia'} dengan tata bahasa yang natural, mengalir, dan berwibawa. Jika bahasa daerah, gunakan tingkat kesopanan yang tinggi/halus).`;
      let tools = [];

      if (action === 'rewrite') {
        prompt = `${langContext}\nPerbaiki dan tulis ulang teks berikut agar lebih mengalir, rapi, dan enak dibaca untuk pidato/khotbah. Jangan ubah makna aslinya. Teks:\n\n${selectedText}`;
      } else if (action === 'smart-edit') {
        prompt = `${langContext}
        Lakukan pemeriksaan TATA BAHASA, EJAAN (PUEBI/KBBI), dan TANDA BACA yang sangat teliti pada teks berikut.
        
        ATURAN:
        1. Perbaiki kesalahan penulisan kata (typo).
        2. Perbaiki penggunaan tanda baca (titik, koma, tanda tanya, dll).
        3. Perbaiki struktur kalimat agar lebih efektif dan berwibawa (khusus untuk khotbah).
        4. JANGAN mengubah gaya bahasa asli penulis secara drastis.
        5. JANGAN menambah informasi baru.
        6. Jika teks sudah benar, kembalikan apa adanya.
        
        Teks:
        ${selectedText}`;
      } else if (action === 'expand') {
        prompt = `${langContext}\nPerpanjang teks berikut dengan menambahkan penjelasan, contoh, atau elaborasi yang relevan untuk pidato/khotbah. Teks:\n\n${selectedText}`;
      } else if (action === 'shorten') {
        prompt = `${langContext}\nRingkas teks berikut agar lebih padat dan to the point, tanpa menghilangkan pesan utamanya. Teks:\n\n${selectedText}`;
      } else if (action === 'translate') {
        prompt = `Berikan terjemahan bahasa ${language || 'Indonesia'} yang baik dan benar untuk teks Arab berikut. Hanya berikan teks terjemahannya saja, tanpa teks Arabnya. Teks:\n\n${selectedText}`;
      } else if (action === 'transliterate') {
        prompt = `Berikan transliterasi (Latin) untuk teks Arab berikut. Hanya berikan teks Latinnya saja. Contoh output: "Bismillaahirrahmaanirrahiim". Teks:\n\n${selectedText}`;
      } else if (action === 'fix-arabic') {
        prompt = `Perbaiki blok teks Arab berikut. HAPUS semua teks Latin, terjemahan, atau karakter non-Arab yang ada di DALAMNYA. Pastikan HANYA tersisa teks Arab (hijaiyah) yang murni dan harakatnya. Jangan ubah teks Arabnya, hanya bersihkan dari gangguan. Teks:\n\n${selectedText}`;
      } else if (action === 'remove-translation') {
        prompt = `Tugas Anda adalah MENGHAPUS TERJEMAHAN dari teks berikut.
        Biarkan teks Arab (jika ada) dan teks Latin (transliterasi/bacaan) tetap ada.
        Hapus hanya bagian yang merupakan arti/terjemahan dalam bahasa Indonesia/Inggris.
        Biasanya terjemahan diawali dengan "Artinya:", "Terjemahan:", atau berada dalam tanda kurung/kutip setelah teks Arab.
        Kembalikan teks bersihnya saja.
        
        Teks:
        ${selectedText}`;
      } else if (action === 'add-latin') {
        prompt = `Tugas Anda adalah MENAMBAHKAN BACAAN LATIN (Transliterasi) pada teks Arab berikut.
        Jika teks Arab sudah ada, sisipkan bacaan latinnya di bawahnya atau setelahnya dalam tanda kurung.
        Gunakan ejaan transliterasi yang umum dan mudah dibaca orang awam.
        JANGAN HAPUS teks Arab aslinya.
        
        Teks:
        ${selectedText}`;
      } else if (action === 'validate-dalil') {
        prompt = `Validasi dalil (ayat Al-Quran atau Hadits) berikut ini.
        1. Cek apakah penulisan Arabnya benar. Jika salah, perbaiki.
        2. Cek apakah referensinya (Surat/Ayat atau Perawi) benar.
        3. Berikan output berupa teks dalil yang sudah dikoreksi (Arab + Terjemahan) dan tambahkan status validitasnya di akhir dalam kurung siku (misal: [Shahih, HR. Bukhari] atau [QS. Al-Baqarah: 255]).
        
        Teks:
        ${selectedText}`;
        tools = [{ googleSearch: {} }];
      } else if (action === 'ganti-dalil') {
        prompt = `Ganti dalil (ayat Al-Quran atau Hadits) yang ada pada teks berikut dengan dalil LAIN yang memiliki makna atau pesan yang serupa/senada.
        1. Pastikan dalil pengganti adalah Shahih (jika hadits) atau ayat Al-Quran yang tepat.
        2. Tuliskan teks Arabnya dengan benar.
        3. Tuliskan terjemahannya dalam bahasa Indonesia.
        4. Tuliskan referensinya (Surat/Ayat atau Perawi).
        5. Sesuaikan konteks kalimat pengantarnya agar menyatu dengan teks sebelumnya.
        
        Teks Asli:
        ${selectedText}`;
        tools = [{ googleSearch: {} }];
      } else if (action === 'tambah-dalil') {
        prompt = `Baca poin atau pernyataan pada teks berikut, lalu TAMBAHKAN satu dalil (ayat Al-Quran atau Hadits Shahih) yang sangat relevan untuk memperkuat argumen tersebut.
        1. Berikan kalimat pengantar yang halus (misalnya: "Hal ini sejalan dengan firman Allah..." atau "Rasulullah SAW bersabda...").
        2. Tuliskan teks Arabnya dengan benar.
        3. Tuliskan terjemahannya dalam bahasa Indonesia.
        4. Tuliskan referensinya (Surat/Ayat atau Perawi).
        5. Kembalikan teks asli beserta tambahan dalilnya sehingga menjadi satu kesatuan paragraf yang utuh.
        
        Teks:
        ${selectedText}`;
        tools = [{ googleSearch: {} }];
      }

      const response = await ai.models.generateContent({
        model: modelToUse,
        contents: prompt,
        config: { tools }
      });

      const newText = response.text || '';
      
      const text = editContent;
      const newContent = text.substring(0, start) + newText + text.substring(end);
      updateContent(newContent, `AI ${action}`);
      
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(start, start + newText.length);
        }
      }, 0);
    } catch (e) {
      console.error("AI Edit failed", e);
      alert('Gagal memproses teks. Periksa koneksi atau API Key.');
    } finally {
      clearInterval(progressInterval);
      setToolProgress(100);
      setTimeout(() => {
        setIsAiEditing(false);
        setIsProcessingTool(false);
      }, 300);
    }
  };

  const QUICK_SNIPPETS = [
    { label: 'Bismillah', text: '\n```arabic\nبِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيم\n```\n' },
    { label: 'Mukadimah', text: '\n**Mukadimah**\n\nAlhamdulillah... \n\n```arabic\n(Teks Arab)\n```\n' },
    { label: 'Ayat', text: '\n```arabic\n(Teks Ayat)\n```\n*Artinya: "..." (QS. ...)*\n' },
    { label: 'Doa', text: '\n**Doa Penutup**\n\n```arabic\nرَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً...\n```\n' },
  ];

  return (
    <motion.div 
      initial={{ x: '100%', opacity: 0.5 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'tween', ease: 'easeInOut', duration: 0.3 }}
      className="fixed inset-0 bg-slate-200 z-50 flex flex-col safe-area-top will-change-transform"
    >
      {/* Header */}
      {!focusMode && (
        <div className="flex items-center justify-between px-4 h-14 border-b border-slate-300 bg-white shadow-sm z-20">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <button onClick={() => setCurrentScreen('home')} className="p-2 -ml-2 text-slate-600 hover:bg-slate-50 rounded-full flex-shrink-0">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
              <span className="text-sm font-bold text-slate-800 truncate block">{isGenerating ? 'Menyusun Naskah...' : tema}</span>
              <span className="text-[10px] text-slate-500 truncate block">{layoutPages.length} Halaman • {actualWordCount} Kata</span>
            </div>
            {isGenerating && (
              <button 
                onClick={() => setCurrentScreen('home')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-full shadow-lg shadow-emerald-500/20 animate-pulse"
              >
                <Minimize2 className="w-3 h-3" />
                Latar Belakang
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {!isGenerating && (
              <>
                <button 
                  onClick={toggleFocusMode}
                  className={`p-2 rounded-full transition-colors ${focusMode ? 'bg-amber-100 text-amber-600' : 'text-slate-600 hover:bg-slate-100'}`}
                  title="Mode Fokus (Baca & Edit Tenang)"
                >
                  <Maximize2 className="w-5 h-5" />
                </button>

                {/* Desktop Only Buttons */}
                <div className="hidden md:flex items-center gap-1">
                  {activeHistoryId && (
                    <>
                      <button 
                        onClick={() => setShowScheduleModal(true)}
                        className={`p-2 rounded-full transition-colors ${currentHistoryItem?.scheduleDate ? 'text-emerald-600 bg-emerald-50' : 'text-slate-600 hover:bg-slate-100'}`}
                        title="Atur Jadwal"
                      >
                        <Calendar className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => {
                          if (isBookmarked) {
                            updateHistoryItem(activeHistoryId, { isBookmarked: false, category: undefined });
                          } else {
                            setShowBookmarkModal(true);
                          }
                        }}
                        className={`p-2 rounded-full transition-colors ${isBookmarked ? 'text-emerald-600 bg-emerald-50' : 'text-slate-600 hover:bg-slate-100'}`}
                        title={isBookmarked ? "Hapus Bookmark" : "Simpan ke Koleksi"}
                      >
                        <Bookmark className={`w-5 h-5 ${isBookmarked ? 'fill-current' : ''}`} />
                      </button>
                    </>
                  )}
                  <div className="flex items-center gap-1 mr-1 border-r border-slate-200 pr-2">
                    <button 
                      onClick={handleUndo} 
                      disabled={undoStack.length === 0}
                      className="p-1.5 rounded-full text-slate-600 hover:bg-slate-100 disabled:opacity-30 transition-colors"
                    >
                      <History className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={handleRedo} 
                      disabled={redoStack.length === 0}
                      className="p-1.5 rounded-full text-slate-600 hover:bg-slate-100 disabled:opacity-30 transition-colors"
                    >
                      <History className="w-5 h-5 rotate-180 scale-x-[-1]" />
                    </button>
                  </div>
                </div>

                {/* Mobile More Menu */}
                <div className="relative md:hidden">
                  <button 
                    onClick={() => setShowMoreHeader(!showMoreHeader)}
                    className={`p-2 rounded-full transition-colors ${showMoreHeader ? 'bg-slate-100 text-slate-800' : 'text-slate-600 hover:bg-slate-100'}`}
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>
                  
                  <AnimatePresence>
                    {showMoreHeader && (
                      <>
                        <div className="fixed inset-0 z-30" onClick={() => setShowMoreHeader(false)} />
                        <motion.div 
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-40 overflow-hidden"
                        >
                          {activeHistoryId && (
                            <>
                              <button 
                                onClick={() => { setShowScheduleModal(true); setShowMoreHeader(false); }}
                                className="w-full px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-3"
                              >
                                <Calendar className={`w-4 h-4 ${currentHistoryItem?.scheduleDate ? 'text-emerald-600' : 'text-slate-400'}`} />
                                Atur Jadwal
                              </button>
                              <button 
                                onClick={() => {
                                  if (isBookmarked) {
                                    updateHistoryItem(activeHistoryId, { isBookmarked: false, category: undefined });
                                  } else {
                                    setShowBookmarkModal(true);
                                  }
                                  setShowMoreHeader(false);
                                }}
                                className="w-full px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-3"
                              >
                                <Bookmark className={`w-4 h-4 ${isBookmarked ? 'text-emerald-600 fill-current' : 'text-slate-400'}`} />
                                {isBookmarked ? "Hapus Bookmark" : "Simpan Koleksi"}
                              </button>
                            </>
                          )}
                          <div className="h-px bg-slate-100 my-1 mx-2" />
                          <button 
                            onClick={() => { setCurrentScreen('settings'); setShowMoreHeader(false); }}
                            className="w-full px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-3"
                          >
                            <Settings className="w-4 h-4 text-slate-400" />
                            Pengaturan Utama
                          </button>
                          <div className="h-px bg-slate-100 my-1 mx-2" />
                          <button 
                            onClick={() => { handleUndo(); setShowMoreHeader(false); }}
                            disabled={undoStack.length === 0}
                            className="w-full px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-3 disabled:opacity-30"
                          >
                            <History className="w-4 h-4 text-slate-400" />
                            Undo
                          </button>
                          <button 
                            onClick={() => { handleRedo(); setShowMoreHeader(false); }}
                            disabled={redoStack.length === 0}
                            className="w-full px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-3 disabled:opacity-30"
                          >
                            <History className="w-4 h-4 text-slate-400 rotate-180 scale-x-[-1]" />
                            Redo
                          </button>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>

                <button 
                  onClick={toggleEdit}
                  className={`px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold transition-colors ${isEditing ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                >
                  {isEditing ? 'Selesai' : 'Edit'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Studio Toolbar (Moved to Bottom Sheet) */}

      {/* Toolbar (Only in Edit Mode) */}
      {isEditing && !focusMode && (
        <div className="flex flex-col bg-white border-b border-slate-200 z-10 shadow-sm relative">
          <div className="flex items-center gap-2 px-3 py-2.5 overflow-x-auto no-scrollbar">
            {/* Formatting Group */}
            <div className="flex items-center bg-slate-100/80 p-1 rounded-lg shrink-0 border border-slate-200/50">
              <button onClick={() => insertText('**', '**')} className="w-8 h-8 flex items-center justify-center rounded-md text-slate-700 font-bold hover:bg-white hover:shadow-sm transition-all" title="Tebal">B</button>
              <button onClick={() => insertText('*', '*')} className="w-8 h-8 flex items-center justify-center rounded-md text-slate-700 italic hover:bg-white hover:shadow-sm transition-all" title="Miring">I</button>
            </div>

            <div className="w-px h-6 bg-slate-200 mx-1 shrink-0"></div>

            {/* Core Features */}
            <button onClick={() => insertText('\n```arabic\n', '\n```\n')} className="px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 font-arabic text-lg font-bold hover:bg-emerald-100 transition-all shrink-0">ع</button>
            <button onClick={() => insertText('\n\n---\n\n')} className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-1.5 text-xs font-bold shrink-0">
              <Scissors className="w-3.5 h-3.5" />
              Pisah Kertas
            </button>
            <button 
              onClick={() => setShowAudienceModal(true)}
              className="px-3 py-2 bg-violet-50 border border-violet-200 rounded-lg text-violet-700 hover:bg-violet-100 transition-all flex items-center gap-1.5 text-xs font-bold shrink-0"
            >
              <Users className="w-3.5 h-3.5" />
              Sapaan
            </button>

            <div className="w-px h-6 bg-slate-200 mx-1 shrink-0"></div>

            {/* AI Tools */}
            <button 
              onClick={() => handleAiEdit('continue')}
              disabled={isAiEditing}
              className="px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-700 hover:bg-indigo-100 transition-all flex items-center gap-1.5 text-xs font-bold shrink-0"
            >
              {isAiEditing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PenLine className="w-3.5 h-3.5" />}
              Lanjutkan (AI)
            </button>
            <button 
              onClick={() => handleAiEdit('smart-edit')}
              disabled={isAiEditing}
              className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 hover:bg-amber-100 transition-all flex items-center gap-1.5 text-xs font-bold shrink-0"
            >
              {isAiEditing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              Poles Text
            </button>

            {/* Flexible Spacer */}
            <div className="flex-1 min-w-[12px]"></div>

            {/* Utilities */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button onClick={() => setShowDalilSearch(true)} className="w-9 h-9 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 transition-all" title="Cari Dalil / Referensi (Google)">
                <Search className="w-4 h-4 text-emerald-600" />
              </button>
              <button onClick={() => setShowHistoryModal(true)} className="w-9 h-9 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 transition-all" title="Riwayat Perubahan">
                <History className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page Organizer Modal */}
      {showPageOrganizer && (
        <PageOrganizer 
          content={editContent}
          safeCharLimit={safeCharLimit}
          getEstimatedLength={getEstimatedLength}
          onSave={(newContent) => {
            updateContent(newContent, 'Tata Letak');
            handleSave(newContent, coverData, watermark);
            setShowPageOrganizer(false);
          }}
          onClose={() => setShowPageOrganizer(false)}
        />
      )}

      {/* Magic Modal */}
      <AnimatePresence>
        {showMagicModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4 print:hidden"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
            >
              <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  {magicModalType === 'story' && <BookOpen className="w-4 h-4 text-emerald-600" />}
                  {magicModalType === 'analogy' && <Sparkles className="w-4 h-4 text-indigo-600" />}
                  {magicModalType === 'quote' && <Type className="w-4 h-4 text-amber-600" />}
                  {magicModalType === 'story' ? 'Sisipkan Kisah Inspiratif' : magicModalType === 'analogy' ? 'Sisipkan Analogi' : 'Sisipkan Kutipan Ulama'}
                </h3>
                <button onClick={() => setShowMagicModal(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Topik / Konsep</label>
                  <textarea 
                    value={magicPrompt}
                    onChange={(e) => setMagicPrompt(e.target.value)}
                    placeholder={magicModalType === 'story' ? "Misal: Kesabaran menghadapi ujian..." : magicModalType === 'analogy' ? "Misal: Ikhlas seperti air..." : "Misal: Menjaga lisan..."}
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none min-h-[100px]"
                    autoFocus
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    *AI akan membuatkan konten berdasarkan topik ini dan menyisipkannya di posisi kursor.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button 
                    onClick={() => setShowMagicModal(false)}
                    className="px-4 py-2 text-slate-600 font-medium text-sm hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    Batal
                  </button>
                  <button 
                    onClick={handleMagicGenerate}
                    disabled={!magicPrompt.trim()}
                    className="px-4 py-2 bg-emerald-600 text-white font-bold text-sm rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    Buat & Sisipkan
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Duration Modal */}
      <AnimatePresence>
        {showDurationModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4 print:hidden"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
            >
              <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-600" />
                  Atur Durasi & Panjang Naskah
                </h3>
                <button onClick={() => setShowDurationModal(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Action Selection */}
                <div className="flex bg-slate-100 rounded-xl p-1">
                  <button 
                    onClick={() => setDurationAction('extend')}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${durationAction === 'extend' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Perpanjang
                  </button>
                  <button 
                    onClick={() => setDurationAction('shorten')}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${durationAction === 'shorten' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Perpendek
                  </button>
                </div>

                {/* Duration Slider */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-bold text-slate-700">
                      {durationAction === 'extend' ? 'Tambah Durasi' : 'Kurangi Durasi'}
                    </label>
                    <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
                      {durationMinutes} Menit
                    </span>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="10" 
                    step="1"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(parseInt(e.target.value))}
                    className="w-full accent-blue-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                    <span>1 Menit</span>
                    <span>5 Menit</span>
                    <span>10 Menit</span>
                  </div>
                </div>

                {/* Focus Selection */}
                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-700">Fokus Perubahan (Pilih Minimal 1)</label>
                  <div className="flex flex-wrap gap-2">
                    {(durationAction === 'extend' ? EXTEND_OPTIONS : SHORTEN_OPTIONS).map((option) => (
                      <button
                        key={option}
                        onClick={() => handleDurationFocusToggle(option)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                          durationFocus.includes(option)
                            ? 'bg-blue-50 border-blue-200 text-blue-700'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        {option}
                        {durationFocus.includes(option) && <Check className="w-3 h-3 inline ml-1" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  onClick={() => {
                    if (durationFocus.length === 0) {
                      alert('Pilih minimal satu fokus perubahan.');
                      return;
                    }
                    handleAiDuration(durationAction, durationMinutes, durationFocus);
                    setShowDurationModal(false);
                  }}
                  className={`w-full py-3 rounded-xl font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 ${
                    durationAction === 'extend' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-amber-600 hover:bg-amber-700'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  {durationAction === 'extend' ? 'Perpanjang Naskah' : 'Perpendek Naskah'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Audience Template Modal */}
      <AnimatePresence>
        {showAudienceModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4 print:hidden"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
            >
              <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <Users className="w-4 h-4 text-violet-600" />
                  Pilih Sapaan Jamaah
                </h3>
                <button onClick={() => setShowAudienceModal(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-4 space-y-4">
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                  {[
                    { id: 'jumat', label: 'Khotbah Jumat' },
                    { id: 'eid', label: 'Hari Raya' },
                    { id: 'kultum', label: 'Kultum/Ceramah' },
                    { id: 'nikah', label: 'Pernikahan' },
                    { id: 'umum', label: 'Umum' },
                    { id: 'youth', label: 'Pemuda' }
                  ].map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setAudienceType(type.id as any)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${audienceType === type.id ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>

                <div className="space-y-2">
                  {AUDIENCE_TEMPLATES[audienceType].map((template, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        insertText(template + ' ');
                        setShowAudienceModal(false);
                      }}
                      className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-violet-300 hover:bg-violet-50 transition-all text-sm text-slate-700 group"
                    >
                      {template}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dalil Search Modal */}
      <AnimatePresence>
        {showDalilSearch && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4 print:hidden"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-4 border-b border-slate-200 flex flex-col gap-3 bg-slate-50">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-emerald-600" />
                    Pustaka Dalil
                  </h3>
                  <button onClick={() => setShowDalilSearch(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                {/* Tabs */}
                <div className="flex bg-slate-200/50 p-1 rounded-lg">
                  <button 
                    onClick={() => setActiveDalilTab('quran')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${activeDalilTab === 'quran' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    📖 Al-Quran
                  </button>
                  <button 
                    onClick={() => setActiveDalilTab('hadits')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${activeDalilTab === 'hadits' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    📚 Hadits Shahih
                  </button>
                </div>
              </div>
              
              <div className="p-4 space-y-4">
                {activeDalilTab === 'hadits' && (
                  <div className="flex items-center justify-between bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-amber-900">Potong Sanad (Matan Extractor)</span>
                      <span className="text-[10px] text-amber-700 leading-tight">Buang rantai perawi, fokus pada isi sabda & rawi sahabat terakhir.</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={trimSanad} onChange={(e) => setTrimSanad(e.target.checked)} />
                      <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>
                )}
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={dalilQuery}
                    onChange={(e) => setDalilQuery(e.target.value)}
                    placeholder={activeDalilTab === 'quran' ? "Cari Topik Ayat (misal: Sabar, Rezeki)..." : "Cari Topik Hadits (misal: Jual Beli, Riya)..."} 
                    className="flex-1 border border-slate-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchDalil(dalilQuery, activeDalilTab, trimSanad)}
                  />
                  <button 
                    onClick={() => handleSearchDalil(dalilQuery, activeDalilTab, trimSanad)}
                    disabled={isSearchingDalil || !dalilQuery.trim()}
                    className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isSearchingDalil ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    Cari
                  </button>
                </div>

                <div className="space-y-3 overflow-y-auto max-h-[50vh] pr-1">
                  {dalilResults.length > 0 ? (
                    dalilResults.map((res: string, idx: number) => (
                      <div key={idx} className="border border-slate-200 rounded-xl p-4 hover:border-emerald-300 transition-colors bg-slate-50 hover:bg-white group relative">
                        <div className="prose prose-sm max-w-none mb-3">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{res}</ReactMarkdown>
                        </div>
                        <button 
                          onClick={() => {
                            insertText('\n' + res + '\n');
                            setShowDalilSearch(false);
                          }}
                          className="w-full py-2 bg-white border border-slate-300 text-slate-600 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-colors flex items-center justify-center gap-2"
                        >
                          <Plus className="w-3 h-3" /> Masukkan ke Naskah
                        </button>
                      </div>
                    ))
                  ) : (
                    !isSearchingDalil && (
                      <div className="py-6 flex flex-col items-center">
                        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                          <BookOpen className="w-6 h-6 text-slate-400" />
                        </div>
                        
                        <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl mb-4 w-full text-center">
                          <h4 className="text-xs font-bold text-blue-800 mb-1">💡 Petunjuk Pencarian Pintar</h4>
                          <p className="text-[11px] text-blue-600/80 leading-relaxed max-w-[300px] mx-auto">
                            {activeDalilTab === 'quran' 
                              ? 'Anda tidak perlu menghafal surat. Cukup ketik "Inti Topik" atau pesan moral dari ayat yang Anda butuhkan.'
                              : 'Ketik topik dari isi Sabda. Sakelar "Potong Sanad" di atas secara otomatis akan membuang rawi agar Anda langsung mendapatkan isi Inti Hadits.'}
                          </p>
                        </div>

                        <div className="w-full">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 text-center">Coba Cari Topik Ini:</p>
                          <div className="flex flex-wrap justify-center gap-1.5">
                            {(activeDalilTab === 'quran' 
                              ? ["Berbakti kepada Orang Tua", "Sabar dalam Musibah", "Larangan Riba", "Kewajiban Shalat"] 
                              : ["Adab Makan dan Minum", "Keutamaan Penuntut Ilmu", "Menahan Amarah", "Ancaman Memutus Silaturahmi"]
                            ).map((suggestion) => (
                              <button 
                                key={suggestion}
                                onClick={() => {
                                  setDalilQuery(suggestion);
                                  handleSearchDalil(suggestion, activeDalilTab, trimSanad);
                                }}
                                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-all shadow-sm active:scale-95"
                              >
                                {suggestion}
                              </button>
                            ))}
                          </div>
                        </div>

                      </div>
                    )
                  )}
                  {isSearchingDalil && (
                    <div className="text-center py-8 text-slate-400">
                      <Loader2 className="w-8 h-8 mx-auto animate-spin text-emerald-500" />
                      <p className="text-xs mt-2">Mencari dalil shahih...</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content Area (PDF Viewer or Editor) */}
      <div 
        ref={contentRef}
        className={`flex-1 overflow-y-auto overflow-x-hidden touch-scroll ${PAPER_TEMPLATES[paperTemplate].bg} ${focusMode ? 'p-0' : 'px-0 py-4 md:p-8'} transition-all duration-500 print:overflow-visible print:h-auto print:block print:p-0 flex justify-center`}
      >
        {/* Focus Mode Overlay */}
        <AnimatePresence>
          {focusMode && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 bg-white/80 backdrop-blur-xl border border-slate-200 p-2 rounded-2xl shadow-2xl"
            >
              <button 
                onClick={toggleFocusMode}
                className="p-3 bg-slate-900 text-white rounded-xl hover:bg-black transition-colors shadow-lg"
                title="Keluar Mode Fokus"
              >
                <Minimize2 className="w-5 h-5" />
              </button>
              
              <div className="w-px h-8 bg-slate-200 mx-1" />
              
              <div className="flex items-center bg-slate-100 rounded-xl p-1">
                <button onClick={() => setZoom(Math.max(20, zoom - 10))} className="p-2 hover:bg-white rounded-lg transition-all"><Minus className="w-4 h-4" /></button>
                <span className="w-12 text-center text-xs font-bold text-slate-600">{zoom}%</span>
                <button onClick={() => setZoom(Math.min(200, zoom + 10))} className="p-2 hover:bg-white rounded-lg transition-all"><Plus className="w-4 h-4" /></button>
              </div>

              <div className="w-px h-8 bg-slate-200 mx-1" />

              <button 
                onClick={toggleEdit}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${isEditing ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {isEditing ? 'Simpan' : 'Edit'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Bookmark Modal */}
        <AnimatePresence>
          {showBookmarkModal && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4 print:hidden"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden"
              >
                <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Bookmark className="w-4 h-4 text-emerald-600" />
                    Simpan ke Koleksi
                  </h3>
                  <button onClick={() => setShowBookmarkModal(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-5 space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Pilih Kategori</label>
                    <div className="flex flex-wrap gap-2">
                      {['Sabar', 'Keluarga', 'Rezeki', 'Pemuda', 'Akhlak', 'Aqidah', 'Lainnya'].map(cat => (
                        <button
                          key={cat}
                          onClick={() => setBookmarkCategory(cat)}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${bookmarkCategory === cat ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (activeHistoryId) {
                        updateHistoryItem(activeHistoryId, { isBookmarked: true, category: bookmarkCategory });
                        setShowBookmarkModal(false);
                      }
                    }}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-colors"
                  >
                    Simpan Naskah
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Schedule Modal */}
        <AnimatePresence>
          {showScheduleModal && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4 print:hidden"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden"
              >
                <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    Atur Jadwal Khotbah
                  </h3>
                  <button onClick={() => setShowScheduleModal(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-5 space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Tanggal Khotbah</label>
                    <input 
                      type="date" 
                      value={scheduleDateInput || (currentHistoryItem?.scheduleDate ? new Date(currentHistoryItem.scheduleDate).toISOString().split('T')[0] : '')}
                      onChange={(e) => setScheduleDateInput(e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Lokasi / Masjid (Opsional)</label>
                    <input 
                      type="text" 
                      placeholder="Contoh: Masjid Raya Baiturrahman"
                      value={scheduleLocationInput || currentHistoryItem?.scheduleLocation || ''}
                      onChange={(e) => setScheduleLocationInput(e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all"
                    />
                  </div>
                  <div className="pt-2 flex gap-2">
                    {currentHistoryItem?.scheduleDate && (
                      <button
                        onClick={() => {
                          if (activeHistoryId) {
                            updateHistoryItem(activeHistoryId, { scheduleDate: undefined, scheduleLocation: undefined });
                            setShowScheduleModal(false);
                          }
                        }}
                        className="flex-1 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-bold transition-colors"
                      >
                        Hapus Jadwal
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (!scheduleDateInput && !currentHistoryItem?.scheduleDate) {
                          alert('Pilih tanggal terlebih dahulu.');
                          return;
                        }
                        if (activeHistoryId) {
                          updateHistoryItem(activeHistoryId, { 
                            scheduleDate: scheduleDateInput || currentHistoryItem?.scheduleDate, 
                            scheduleLocation: scheduleLocationInput || currentHistoryItem?.scheduleLocation 
                          });
                          setShowScheduleModal(false);
                        }
                      }}
                      className="flex-[2] py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-colors"
                    >
                      Simpan Jadwal
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {isEditing ? (
          <div className="flex flex-col items-center gap-6 pb-24 w-full">
            <div 
              className={`${styleSettings?.page?.backgroundColor ? '' : PAPER_TEMPLATES[paperTemplate].bg} ${styleSettings?.page?.borderColor ? '' : PAPER_TEMPLATES[paperTemplate].border} shadow-xl transition-all duration-200 origin-top lg:origin-top w-full max-w-full relative overflow-hidden border`}
              style={{ 
                width: `${PAPER_DIMENSIONS[paperSize].width}px`,
                minHeight: `${PAPER_DIMENSIONS[paperSize].minHeight}px`,
                zoom: zoom / 100,
                transformOrigin: window.innerWidth < 768 ? 'top center' : 'top center',
                backgroundColor: styleSettings?.page?.backgroundColor || undefined,
                borderColor: styleSettings?.page?.borderColor || undefined
              }}
            >
              {/* Paper Decorations (Same as result view) */}
              {renderPaperDecorations(paperTemplate, styleSettings)}

              <textarea
                ref={textareaRef}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onBlur={() => {
                  if (editContent !== lastPushedContentRef.current) {
                    setUndoStack(prev => [...prev, { content: lastPushedContentRef.current, action: 'Ketik Manual', timestamp: Date.now() }].slice(-50));
                    setRedoStack([]);
                    lastPushedContentRef.current = editContent;
                  }
                }}
                className={`w-full min-h-[${PAPER_DIMENSIONS[paperSize].minHeight}px] pt-16 bg-transparent outline-none resize-none ${fontFamily} ${textAlign} ${lineHeight} ${styleSettings?.latin?.fontWeight || 'font-normal'} ${styleSettings?.latin?.letterSpacing || 'tracking-normal'} ${styleSettings?.latin?.wordSpacing || 'tracking-normal'} ${styleSettings?.latin?.textShadow || 'none'} ${PAPER_TEMPLATES[paperTemplate].text}`}
                style={{ 
                  fontSize: `${fontSize * (PAPER_DIMENSIONS[paperSize]?.scale || 1.0)}px`, 
                  color: styleSettings?.latin?.color,
                  paddingLeft: `${styleSettings?.latin?.textMargin || 64}px`,
                  paddingRight: `${styleSettings?.latin?.textMargin || 64}px`
                }}
                placeholder="Mulai menulis naskah... Gunakan --- untuk membuat halaman baru."
              />

              {/* Floating Undo/Redo Widget */}
              <AnimatePresence>
                {(undoStack.length > 0 || redoStack.length > 0) && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="fixed bottom-6 right-6 lg:bottom-10 lg:right-10 z-[100] flex items-center bg-white border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-full p-2"
                  >
                    <button
                      onClick={handleUndo}
                      disabled={undoStack.length === 0}
                      className="h-10 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-full disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-600 transition-all flex items-center justify-center relative overflow-hidden group/btn px-3 shrink-0"
                      title="Undo (Ctrl+Z)"
                      style={{ minWidth: '40px' }}
                    >
                      <History className="w-5 h-5 absolute z-10 bg-inherit" />
                      <span className="text-xs font-bold pl-6 opacity-0 group-hover/btn:opacity-100 group-hover/btn:w-auto w-0 overflow-hidden whitespace-nowrap transition-all duration-300">
                        Undo {undoStack.length > 0 && `(${undoStack.length})`}
                      </span>
                    </button>
                    <div className="w-px h-6 bg-slate-200 mx-1 flex-shrink-0" />
                    <button
                      onClick={handleRedo}
                      disabled={redoStack.length === 0}
                      className="h-10 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-full disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-600 transition-all flex items-center justify-center flex-row-reverse relative overflow-hidden group/btn px-3 shrink-0"
                      title="Redo (Ctrl+Y)"
                      style={{ minWidth: '40px' }}
                    >
                      <History className="w-5 h-5 absolute z-10 rotate-180 scale-x-[-1] bg-inherit" />
                      <span className="text-xs font-bold pr-6 opacity-0 group-hover/btn:opacity-100 group-hover/btn:w-auto w-0 overflow-hidden whitespace-nowrap transition-all duration-300 text-right">
                        Redo {redoStack.length > 0 && `(${redoStack.length})`}
                      </span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        ) : (
          <div id="printable-area" ref={elementRef} className={`pb-24 print:p-0 print:pb-0 print:flex print:flex-col print:items-center print:gap-0 ${styleSettings?.responsivePreview === 'fit' ? 'flex flex-col items-center gap-6' : 'grid grid-cols-1 md:grid-cols-2 gap-8 items-start justify-center justify-items-center max-w-[1600px] mx-auto'} w-full overflow-x-hidden`}>
            {/* Cover Page(s) */}
            {coverData?.show && (
              <>
                {/* Page 1: Image Cover (Artistic Book Cover) */}
                {coverData.showImageCover && coverData.imageUrl && (
                  <div 
                    className={`print-page ${styleSettings?.page?.backgroundColor ? '' : (PAPER_TEMPLATES[paperTemplate]?.bg || 'bg-white')} ${styleSettings?.page?.borderColor ? '' : (PAPER_TEMPLATES[paperTemplate]?.border || 'border-slate-200')} shadow-xl transition-all duration-200 origin-top lg:origin-top relative overflow-hidden border flex flex-col items-center justify-center mb-6 print:mb-0 w-full max-w-full`}
                    style={{ 
                      width: `${PAPER_DIMENSIONS[paperSize]?.width || 794}px`,
                      height: `${PAPER_DIMENSIONS[paperSize]?.minHeight || 1122}px`,
                      zoom: zoom / 100,
                      transformOrigin: window.innerWidth < 768 ? 'top center' : 'top center',
                      backgroundColor: styleSettings?.page?.backgroundColor || undefined,
                      borderColor: styleSettings?.page?.borderColor || undefined
                    }}
                  >
                    {renderPaperDecorations(paperTemplate, styleSettings)}
                    <div className="relative w-full h-full flex flex-col items-center overflow-hidden">
                      {/* Background Illustration - Full Bleed or Large Hero */}
                      <div className="absolute inset-0 z-0 flex items-center justify-center">
                         <img 
                           src={coverData.imageUrl} 
                           alt="" 
                           className="w-full h-full object-cover transition-transform duration-200" 
                           style={{ 
                             transform: `scale(${coverData.imageScale || 1}) translate(${coverData.imageOffsetX || 0}px, ${coverData.imageOffsetY || 0}px)` 
                           }}
                           referrerPolicy="no-referrer" 
                         />
                      </div>
                      
                      {/* Content Overlay - Positioned for Book Feel */}
                      {coverData.showTextOverlay !== false && (
                        <div className={`relative z-10 flex flex-col items-center justify-between w-full h-full p-20 text-center ${fontFamily} ${PAPER_TEMPLATES[paperTemplate].text}`} style={{ color: styleSettings?.latin?.color }}>
                          <div className="w-full pt-10">
                            {coverData.subtitle && (
                              <p className="text-xs uppercase tracking-[0.5em] font-black opacity-30 mb-4 px-4 py-2 border-y border-current/10 inline-block">{coverData.subtitle}</p>
                            )}
                          </div>

                          <div className="flex flex-col items-center w-full px-10">
                            <h1 className="text-8xl font-black mb-10 leading-[1] drop-shadow-2xl tracking-tighter uppercase italic" style={{ fontFamily: styleSettings?.header === 'classic' ? "'Playfair Display', serif" : undefined }}>
                              {coverData.title}
                            </h1>
                            <div className="w-64 h-1 bg-current opacity-10 rounded-full"></div>
                          </div>
                          
                          <div className="w-full pb-10 space-y-10">
                            {coverData.author && (
                              <div className="flex flex-col items-center">
                                <div className="w-12 h-0.5 bg-current opacity-20 mb-4"></div>
                                <p className="text-xs uppercase tracking-[0.3em] opacity-40 mb-2 font-bold">Sebuah Karya Oleh</p>
                                <p className="text-3xl font-black tracking-tighter uppercase">{coverData.author}</p>
                              </div>
                            )}
                            
                            {(coverData.location || coverData.date) && (
                              <div className="opacity-40 text-[10px] font-black uppercase tracking-[0.4em] flex items-center justify-center gap-6">
                                {coverData.location && <span>{coverData.location}</span>}
                                {coverData.date && <span>{coverData.date}</span>}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    {watermark?.showOnAllPages && watermark?.text && (
                      <div className="absolute bottom-6 left-0 right-0 text-center opacity-30 text-xs tracking-widest pointer-events-none">
                        {watermark.text}
                      </div>
                    )}
                  </div>
                )}

                {/* Page 2: Text Cover (Minimalist) */}
                {coverData.showTextCover && (
                  <div 
                    className={`print-page ${styleSettings?.page?.backgroundColor ? '' : (PAPER_TEMPLATES[paperTemplate]?.bg || 'bg-white')} ${styleSettings?.page?.borderColor ? '' : (PAPER_TEMPLATES[paperTemplate]?.border || 'border-slate-200')} shadow-xl transition-all duration-200 origin-top lg:origin-top relative overflow-hidden border flex flex-col items-center justify-center mb-6 print:mb-0 w-full max-w-full`}
                    style={{ 
                      width: `${PAPER_DIMENSIONS[paperSize]?.width || 794}px`,
                      height: `${PAPER_DIMENSIONS[paperSize]?.minHeight || 1122}px`,
                      zoom: zoom / 100,
                      transformOrigin: window.innerWidth < 768 ? 'top center' : 'top center',
                      backgroundColor: styleSettings?.page?.backgroundColor || undefined,
                      borderColor: styleSettings?.page?.borderColor || undefined
                    }}
                  >
                    {renderPaperDecorations(paperTemplate, styleSettings)}
                    
                    {/* Layout: Text (Minimalist) */}
                    <div 
                      className={`relative z-10 flex flex-col items-center justify-center w-full h-full p-16 text-center ${fontFamily} ${PAPER_TEMPLATES[paperTemplate].text} ${INK_STYLES[styleSettings?.typography?.inkStyle || 'solid']?.className || ''}`} 
                      style={{ 
                        color: styleSettings?.latin?.color,
                        ...(INK_STYLES[styleSettings?.typography?.inkStyle || 'solid']?.style || {})
                      }}
                    >
                      {coverData.imageUrl && !coverData.showImageCover && (
                        <div className="mb-12 w-80 h-80 relative overflow-hidden">
                          <img 
                            src={coverData.imageUrl} 
                            alt="Cover Illustration" 
                            className="w-full h-full object-contain transition-transform duration-200" 
                            style={{ 
                              transform: `scale(${coverData.imageScale || 1}) translate(${coverData.imageOffsetX || 0}px, ${coverData.imageOffsetY || 0}px)` 
                            }}
                            referrerPolicy="no-referrer" 
                          />
                        </div>
                      )}
                      {coverData.subtitle && (
                        <p className="text-lg uppercase tracking-[0.2em] opacity-60 mb-10 font-medium">{coverData.subtitle}</p>
                      )}
                      
                      <h1 className="text-6xl font-bold mb-14 leading-tight tracking-tight" style={{ fontFamily: styleSettings?.header === 'classic' ? "'Playfair Display', serif" : undefined }}>
                        {coverData.title}
                      </h1>
                      
                      <div className="w-32 h-1 bg-current opacity-20 mb-14"></div>
                      
                      {coverData.author && (
                        <div className="mb-6">
                          <p className="text-sm uppercase tracking-[0.2em] opacity-50 mb-2 font-bold">Disampaikan Oleh</p>
                          <p className="text-3xl font-bold tracking-tight">{coverData.author}</p>
                        </div>
                      )}
                      
                      {(coverData.location || coverData.date) && (
                        <div className="mt-10 opacity-70 flex flex-col items-center gap-1">
                          {coverData.location && <p className="text-xl font-medium">{coverData.location}</p>}
                          {coverData.date && <p className="text-sm uppercase tracking-widest">{coverData.date}</p>}
                        </div>
                      )}
                    </div>
                    {watermark?.showOnAllPages && watermark?.text && (
                      <div className="absolute bottom-6 left-0 right-0 text-center opacity-30 text-xs tracking-widest pointer-events-none">
                        {watermark.text}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Dedicated TOC Page (Page 2) */}
            {coverData?.show && coverData.toc && (
              <div 
                className={`print-page ${styleSettings?.page?.backgroundColor ? '' : (PAPER_TEMPLATES[paperTemplate]?.bg || 'bg-white')} ${styleSettings?.page?.borderColor ? '' : (PAPER_TEMPLATES[paperTemplate]?.border || 'border-slate-200')} shadow-xl transition-all duration-200 origin-top lg:origin-top relative overflow-hidden border w-full max-w-full`}
                style={{ 
                  width: `${PAPER_DIMENSIONS[paperSize]?.width || 794}px`,
                  minHeight: `${PAPER_DIMENSIONS[paperSize]?.minHeight || 1122}px`,
                  zoom: zoom / 100,
                  transformOrigin: window.innerWidth < 768 ? 'top center' : 'top center',
                  backgroundColor: styleSettings?.page?.backgroundColor || undefined,
                  borderColor: styleSettings?.page?.borderColor || undefined
                }}
              >
                {renderPaperDecorations(paperTemplate, styleSettings)}
                
                <div 
                  className={`relative z-10 flex flex-col w-full h-full flex-1 p-16 ${fontFamily} ${PAPER_TEMPLATES[paperTemplate].text} ${INK_STYLES[styleSettings?.typography?.inkStyle || 'solid']?.className || ''}`} 
                  style={{ 
                    color: styleSettings?.latin?.color,
                    ...(INK_STYLES[styleSettings?.typography?.inkStyle || 'solid']?.style || {})
                  }}
                >
                  <div className="mb-16 text-center">
                    <h2 className="text-3xl font-bold uppercase tracking-[0.3em] opacity-80 mb-4">Daftar Isi</h2>
                    <div className="w-24 h-1 bg-current mx-auto opacity-20"></div>
                  </div>

                  <div className="flex-1">
                    <div className="whitespace-pre-wrap leading-[2.5] text-lg font-medium opacity-90 border-l-4 border-current/10 pl-8">
                      {coverData.toc.split('\n').filter((line: string) => line.trim() && !line.toLowerCase().includes('daftar isi:') && !line.toLowerCase().match(/^daftar isi\s*$/)).map((line: string, i: number) => (
                        <div key={i} className="flex items-baseline justify-between border-b border-dotted border-current/20 pb-2 mb-4">
                          <span>{line}</span>
                          <span className="flex-1 border-b border-dotted border-current/30 mx-4 mb-1"></span>
                          <span className="opacity-40 text-sm italic">Halaman ...</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-auto pt-12 border-t border-current/10 text-center opacity-40 text-xs uppercase tracking-widest">
                    Naskah Khotbah: {coverData.title}
                  </div>
                </div>

                {watermark?.showOnAllPages && watermark?.text && (
                  <div className="absolute bottom-6 left-0 right-0 text-center opacity-30 text-xs tracking-widest pointer-events-none">
                    {watermark.text}
                  </div>
                )}
              </div>
            )}

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              {layoutPages.map((pageData, index) => {
                const hasSelected = selectedParagraphId ? pageData.paragraphs.some((p: any) => p.id === selectedParagraphId) : false;
                return (
                <DroppablePreviewPage 
                  key={pageData.id}
                  id={pageData.id}
                  pageIndex={index}
                  onDeletePage={handleDeletePage}
                  isEmpty={pageData.paragraphs.length === 0}
                  className={`print-page ${styleSettings?.page?.backgroundColor ? '' : (PAPER_TEMPLATES[paperTemplate]?.bg || 'bg-white')} ${styleSettings?.page?.borderColor ? '' : (PAPER_TEMPLATES[paperTemplate]?.border || 'border-slate-200')} shadow-xl transition-all duration-200 origin-top lg:origin-top relative overflow-x-hidden border group w-full max-w-full`}
                  onDoubleClick={handlePageDoubleClick}
                  style={{ ...pageStyle, transformOrigin: window.innerWidth < 768 ? 'top center' : 'top center' }}
                  onMoveHere={() => selectedParagraphId && handleMoveToPage(selectedParagraphId, pageData.id)}
                  isTarget={!!selectedParagraphId && !hasSelected}
                >
                  {/* Overflow Warning (Only visible on screen) */}
                  <div className="absolute -right-40 top-10 w-36 p-3 bg-red-50 border border-red-200 rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none print:hidden hidden lg:block">
                    <p className="text-[10px] text-red-600 font-medium">
                      <span className="font-bold block mb-1">💡 Tips Layout:</span>
                      Jika teks menembus batas bawah, gunakan <code className="bg-red-100 px-1 rounded">---</code> untuk pindah ke halaman baru.
                    </p>
                  </div>
                  {renderPaperDecorations(paperTemplate, styleSettings)}
                  
                  {/* Page Boundary Indicators (Only visible on screen, hidden in print) */}
                  <div className="absolute inset-0 pointer-events-none print:hidden overflow-hidden" style={{ zIndex: 50 }}>
                     {Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} className="absolute w-full border-b-2 border-red-400/50 border-dashed" style={{ top: `${(i + 1) * (PAPER_DIMENSIONS[paperSize]?.minHeight || 1122)}px` }}>
                           <span className="absolute right-2 -top-5 text-xs text-red-400/80 font-mono bg-white/80 px-1 rounded">Batas Halaman {i+1}</span>
                        </div>
                     ))}
                  </div>

                  {index === 0 && paperTemplate !== 'plain' && (
                    <div className="absolute top-10 left-0 right-0 flex justify-center opacity-[0.03] pointer-events-none">
                      <MoonStar className="w-32 h-32 text-emerald-900" />
                    </div>
                  )}

                  <div className={`absolute bottom-6 right-8 text-sm font-mono font-bold ${PAPER_TEMPLATES[paperTemplate]?.text || 'text-slate-900'} opacity-50`}>{index + 1}</div>
                  
                  {/* Fold Lines Decoration */}
                  {styleSettings?.page?.foldLines && (
                    <div className="absolute inset-0 pointer-events-none flex flex-col justify-evenly opacity-20">
                      <div className="w-full border-b border-slate-400 border-dashed"></div>
                      <div className="w-full border-b border-slate-400 border-dashed"></div>
                    </div>
                  )}

                  {/* Loading / Streaming Indicator */}
                  {isGenerating && index === layoutPages.length - 1 && (
                    <div className="absolute bottom-6 left-8 flex items-center gap-2 opacity-50">
                      <PenLine className="w-4 h-4 animate-bounce text-emerald-600" />
                      <span className="text-xs font-mono text-emerald-600 animate-pulse">Menulis...</span>
                    </div>
                  )}

                  <div 
                    className={`prose max-w-none pt-16 ${fontFamily} ${textAlign} ${lineHeight} ${styleSettings?.latin?.fontWeight || 'font-normal'} ${styleSettings?.latin?.letterSpacing || 'tracking-normal'} ${styleSettings?.latin?.wordSpacing || 'tracking-normal'} ${styleSettings?.latin?.textShadow || 'none'} ${PAPER_TEMPLATES[paperTemplate].text} prose-headings:text-current prose-p:text-current prose-li:text-current prose-strong:text-current relative z-10 ${INK_STYLES[styleSettings?.typography?.inkStyle || 'solid']?.className || ''}`}
                    style={{ 
                      fontSize: `${fontSize * (PAPER_DIMENSIONS[paperSize]?.scale || 1.0)}px`, 
                      color: styleSettings?.latin?.color,
                      paddingLeft: `${styleSettings?.latin?.textMargin || 64}px`,
                      paddingRight: `${styleSettings?.latin?.textMargin || 64}px`,
                      ...(INK_STYLES[styleSettings?.typography?.inkStyle || 'solid']?.style || {})
                    }}
                  >
                    <SortableContext
                      id={pageData.id}
                      items={pageData.paragraphIds}
                      strategy={verticalListSortingStrategy}
                    >
                      {pageData.paragraphs.map(p => (
                        <SortablePreviewParagraph 
                          key={p.id} 
                          id={p.id} 
                          content={p.processedContent} 
                          components={markdownComponents}
                          onDelete={handleDeleteParagraph}
                          onSplit={handleSplitParagraph}
                          onSelect={(id: string) => setSelectedParagraphId(prev => prev === id ? null : id)}
                          isSelected={selectedParagraphId === p.id}
                          onMoveUp={handleMoveParagraphUp}
                          onMoveDown={handleMoveParagraphDown}
                          isMarkerActive={!!activeMarker}
                        />
                      ))}
                    </SortableContext>
                    
                    {watermark?.showOnAllPages && watermark?.text && (
                      <div className="absolute bottom-6 left-0 right-0 text-center opacity-30 text-xs tracking-widest pointer-events-none">
                        {watermark.text}
                      </div>
                    )}
                  </div>
                </DroppablePreviewPage>
                );
              })}
              <DragOverlay>
                {activeDragId ? (
                  <div className="bg-white border-2 border-emerald-500 rounded-lg p-3 shadow-xl opacity-90 w-full rotate-2 cursor-grabbing">
                    <div 
                      className={`text-xs text-slate-700 line-clamp-3 font-medium ${/[\u0600-\u06FF]/.test(layoutPages.flatMap(p => p.paragraphs).find(p => p.id === activeDragId)?.content || '') ? 'text-right' : 'text-left'}`}
                      style={/[\u0600-\u06FF]/.test(layoutPages.flatMap(p => p.paragraphs).find(p => p.id === activeDragId)?.content || '') ? { direction: 'rtl' } : {}}
                    >
                      {layoutPages.flatMap(p => p.paragraphs).find(p => p.id === activeDragId)?.content}
                    </div>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>
        )}
      </div>

      {/* Bottom Actions */}
      {!isEditing && (
        <div className="bg-white border-t border-slate-200 p-3 sm:p-4 safe-area-bottom shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20 print:hidden">
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 sm:gap-2">
            <button 
              onClick={handleShare}
              className="flex flex-col items-center justify-center gap-1 bg-slate-50 text-slate-600 font-bold py-2 rounded-xl active:bg-slate-100 transition-colors border border-slate-200/30"
            >
              <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-[9px] sm:text-[10px]">Bagikan</span>
            </button>
            <button 
              onClick={handleCopy}
              className="flex flex-col items-center justify-center gap-1 bg-slate-50 text-slate-600 font-bold py-2 rounded-xl active:bg-slate-100 transition-colors border border-slate-200/30"
            >
              {isCopied ? <Check className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" /> : <Copy className="w-4 h-4 sm:w-5 sm:h-5" />}
              <span className="text-[9px] sm:text-[10px]">{isCopied ? 'Tersalin' : 'Salin'}</span>
            </button>
            <button 
              onClick={() => {
                setShowStudio(true);
                setActiveStudioTab('tools');
              }}
              className="flex flex-col items-center justify-center gap-1 bg-slate-50 text-slate-600 font-bold py-2 rounded-xl active:bg-slate-100 transition-all border border-slate-200/30"
            >
              <Wrench className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-[9px] sm:text-[10px]">Cek</span>
            </button>
            <button 
              onClick={() => setIsDownloadModalOpen(true)}
              className="flex flex-col items-center justify-center gap-1 bg-slate-50 text-slate-600 font-bold py-2 rounded-xl active:bg-slate-100 transition-colors border border-slate-200/30"
            >
              <Printer className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-[9px] sm:text-[10px]">Download</span>
            </button>
            <button 
              onClick={() => {
                if (analysisResult) {
                  setShowAnalysis(true);
                } else {
                  handleAnalyze();
                }
              }}
              className="flex flex-col items-center justify-center gap-1 bg-amber-50 text-amber-600 font-bold py-2 rounded-xl active:bg-amber-100 transition-colors border border-amber-200/50"
            >
              <Activity className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-[9px] sm:text-[10px]">Analisis</span>
            </button>
            <button 
              onClick={() => setShowVocalInspector(true)}
              disabled={isAnnotating}
              className="flex flex-col items-center justify-center gap-1 bg-sky-50 text-sky-600 font-bold py-2 rounded-xl active:bg-sky-100 transition-colors border border-sky-200/50 disabled:opacity-50"
            >
              {isAnnotating ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" /> : <Mic2 className="w-4 h-4 sm:w-5 sm:h-5" />}
              <span className="text-[9px] sm:text-[10px]">Vokal</span>
            </button>
            <button 
              onClick={() => setShowStudio(!showStudio)}
              className={`flex flex-col items-center justify-center gap-1 font-bold py-2 rounded-xl transition-all border ${showStudio ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-600 border-slate-200/30 active:bg-slate-100'}`}
            >
              <Palette className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-[9px] sm:text-[10px]">Tampilan</span>
            </button>
            <button 
              onClick={() => setCurrentScreen('practice')}
              className="flex flex-col items-center justify-center gap-1 bg-emerald-600 text-white font-bold py-2 rounded-xl active:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20"
            >
              <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
              <span className="text-[9px] sm:text-[10px]">Baca</span>
            </button>
          </div>
        </div>
      )}

      {/* Analysis Overlay */}
      <AnimatePresence>
        {showAnalysis && (
          <motion.div 
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 bg-white z-[60] flex flex-col safe-area-top safe-area-bottom"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-amber-500" />
                <h2 className="font-bold text-slate-800">Analisis Retorika</h2>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className="p-2 text-amber-600 hover:text-amber-700 bg-white rounded-full shadow-sm disabled:opacity-50"
                  title="Analisis Ulang"
                >
                  <Loader2 className={`w-5 h-5 ${isAnalyzing ? 'animate-spin' : ''}`} />
                </button>
                <button onClick={() => setShowAnalysis(false)} className="p-2 text-slate-400 hover:text-slate-600 bg-white rounded-full shadow-sm">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 touch-scroll bg-slate-50/50">
              {isAnalyzing && !analysisResult ? (
                <div className="flex flex-col items-center justify-center h-full space-y-4 text-slate-500">
                  <Activity className="w-12 h-12 animate-pulse text-amber-400" />
                  <p className="font-medium animate-pulse">AI sedang membedah naskah Anda...</p>
                </div>
              ) : (
                <div className="max-w-2xl mx-auto space-y-8">
                  {(() => {
                    try {
                      const data = JSON.parse(analysisResult);
                      return (
                        <>
                          {/* Score Card */}
                          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                            <div>
                              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Skor Retorika</h3>
                              <p className="text-4xl font-black text-slate-900 mt-1">{data.score}<span className="text-lg text-slate-400">/100</span></p>
                            </div>
                            <div className={`w-16 h-16 rounded-full border-4 flex items-center justify-center font-bold text-xl ${data.score > 80 ? 'border-emerald-500 text-emerald-600' : data.score > 60 ? 'border-amber-500 text-amber-600' : 'border-rose-500 text-rose-600'}`}>
                              {data.score > 80 ? 'A' : data.score > 60 ? 'B' : 'C'}
                            </div>
                          </div>

                          {/* Strengths & Weaknesses */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100">
                              <h4 className="flex items-center gap-2 text-emerald-700 font-bold text-sm mb-3">
                                <Check className="w-4 h-4" /> Kekuatan
                              </h4>
                              <ul className="space-y-2">
                                {data.strengths.map((s: string, i: number) => (
                                  <li key={i} className="text-xs text-emerald-800 flex gap-2">
                                    <span className="opacity-50">•</span> {s}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div className="bg-rose-50 p-5 rounded-2xl border border-rose-100">
                              <h4 className="flex items-center gap-2 text-rose-700 font-bold text-sm mb-3">
                                <AlertCircle className="w-4 h-4" /> Titik Lemah
                              </h4>
                              <ul className="space-y-2">
                                {data.weaknesses.map((w: string, i: number) => (
                                  <motion.li 
                                    key={i} 
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="text-xs text-rose-800 flex gap-2"
                                  >
                                    <span className="opacity-50">•</span> {w}
                                  </motion.li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          {/* Suggestions */}
                          <div className="space-y-4">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                              <Sparkles className="w-5 h-5 text-amber-500" />
                              Saran Perbaikan Cerdas
                            </h3>
                            {data.suggestions.map((s: any, i: number) => (
                              <motion.div 
                                key={i} 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                whileHover={{ y: -5, transition: { duration: 0.2 } }}
                                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-all"
                              >
                                <div className="p-5 border-b border-slate-100">
                                  <h4 className="font-bold text-slate-900 flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-[10px] font-bold">
                                      {i + 1}
                                    </span>
                                    {s.title}
                                  </h4>
                                  <p className="text-xs text-slate-500 mt-1">{s.problem}</p>
                                </div>
                                <div className="p-5 bg-slate-50 space-y-4">
                                  <div className="space-y-2">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Teks Asli</span>
                                    <div className="p-3 bg-white border border-slate-200 rounded-lg text-xs text-slate-600 italic line-clamp-3">
                                      {s.original_segment}
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Saran Perbaikan</span>
                                    <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-xs text-emerald-900 font-medium">
                                      {s.suggested_replacement}
                                    </div>
                                  </div>
                                  <div className="pt-2 flex items-start gap-2">
                                    <Info className="w-3 h-3 text-slate-400 mt-0.5" />
                                    <p className="text-[10px] text-slate-500 italic leading-relaxed">Kenapa? {s.reason}</p>
                                  </div>
                                </div>
                                <div className="p-3 bg-white border-t border-slate-100">
                                  <motion.button 
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => handleAutoFix(s)}
                                    disabled={isFixing}
                                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm"
                                  >
                                    {isFixing ? <Loader2 className="w-3 h-3 animate-spin" /> : <PenLine className="w-3 h-3" />}
                                    Benahi Bagian Ini
                                  </motion.button>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </>
                      );
                    } catch (e) {
                      // Fallback to markdown if JSON parse fails
                      return (
                        <div className="prose prose-slate prose-amber max-w-none prose-headings:text-slate-800 prose-p:text-slate-600 prose-li:text-slate-600">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {analysisResult}
                          </ReactMarkdown>
                        </div>
                      );
                    }
                  })()}
                </div>
              )}
            </div>
            
            {/* Auto Fix Button (Global) */}
            {!isAnalyzing && analysisResult && (
              <div className="p-4 bg-white border-t border-slate-200 safe-area-bottom">
                <button 
                  onClick={() => handleAutoFix()}
                  disabled={isFixing}
                  className="w-full bg-slate-900 hover:bg-black text-white font-bold py-3 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {isFixing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Sedang Memperbaiki...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 text-amber-400" />
                      <span>Benahi Semua Secara Otomatis</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Smart Marker Button (Replaced Quick Style) */}
      {!focusMode && !isGenerating && (
        <div className="fixed bottom-32 right-4 z-[60] flex flex-col items-end gap-3 print:hidden">
          <AnimatePresence>
            {showQuickStyle && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 20 }}
                className="mb-2 w-72 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[75vh] overflow-hidden"
              >
                <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-emerald-500 flex items-center justify-center text-white">
                      <Baseline className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Alat Penanda Manual</span>
                  </div>
                  <button onClick={() => { setShowQuickStyle(false); setActiveMarker(null); }} className="p-1 text-slate-400 hover:text-slate-600 transition-colors"><X className="w-4 h-4" /></button>
                </div>
                
                <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-5">
                  {/* Effect Selection */}
                  <div className="space-y-2">
                    <div className="flex items-baseline justify-between">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Pilih Efek Visual</span>
                      {activeMarker && <span className="text-[8px] text-emerald-500 font-bold animate-pulse">Mode Aktif! Klik Teks</span>}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'strip', label: 'Strip', icon: <Minus className="w-4 h-4" />, color: 'emerald' },
                        { id: 'double', label: 'Double', icon: <AlignJustify className="w-4 h-4" />, color: 'blue' },
                        { id: 'stabilo', label: 'Stabilo', icon: <Highlighter className="w-4 h-4" />, color: 'amber' },
                        { id: 'tipis', label: 'Tipis', icon: <Type className="w-4 h-4" />, color: 'slate' },
                        { id: 'kotak', label: 'Kotak', icon: <Square className="w-4 h-4" />, color: 'rose' },
                        { id: 'hapus', label: 'Hapus', icon: <Eraser className="w-4 h-4" />, color: 'red' },
                      ].map((tool) => (
                        <button
                          key={tool.id}
                          onClick={() => setActiveMarker(prev => prev === tool.id ? null : tool.id)}
                          className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${activeMarker === tool.id ? `bg-${tool.color}-500 border-${tool.color}-600 text-white shadow-lg scale-105` : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-white hover:border-slate-200 shadow-sm'}`}
                        >
                          {tool.icon}
                          <span className={`text-[9px] font-bold ${activeMarker === tool.id ? 'text-white' : 'text-slate-600'}`}>{tool.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Scope Selection */}
                  <div className="space-y-2">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Jangkauan Klik (Scope)</span>
                    <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                      {[
                        { id: 'kata', label: 'Per Kata', icon: <Baseline className="w-3 h-3" /> },
                        { id: 'kalimat', label: 'Per Kalimat', icon: <Languages className="w-3 h-3" /> },
                        { id: 'paragraf', label: 'Per Paragraf', icon: <AlignLeft className="w-3 h-3" /> },
                      ].map((s) => (
                        <button
                          key={s.id}
                          onClick={() => setMarkingScope(s.id as any)}
                          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-bold transition-all ${markingScope === s.id ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                          {s.icon}
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Marker Visual Vibe & Custom Colors (Always visible now) */}
                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    {/* Vibe Presets */}
                    <div className="space-y-2">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Visual Vibe (Kualitas)</span>
                      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                        {[
                          { id: 'standard', name: 'Original', strip: '#10b981', highlight: '#fef08a' },
                          { id: 'pastel', name: 'Soft Pastel', strip: '#d1fae5', highlight: '#fdf2f8' },
                          { id: 'neon', name: 'Electric', strip: '#4ade80', highlight: '#fde047' },
                          { id: 'royal', name: 'Royal', strip: '#7c3aed', highlight: '#f5f3ff' },
                        ].map(v => (
                          <button
                            key={v.id}
                            onClick={() => setStyleSettings((prev: any) => ({
                              ...prev,
                              latin: { 
                                ...prev.latin, 
                                stripColor: v.strip, 
                                highlightColor: v.highlight,
                                stripVibe: v.id,
                                highlightVibe: v.id
                              }
                            }))}
                            className={`flex-shrink-0 px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-all ${styleSettings?.latin?.stripVibe === v.id ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-slate-50 text-slate-600 border-slate-200'}`}
                          >
                            {v.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Custom Colors */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-slate-400 uppercase">Warna Strip</label>
                        <div className="flex items-center gap-2">
                          <input 
                            type="color" 
                            value={styleSettings?.latin?.stripColor || '#10b981'}
                            onChange={(e) => setStyleSettings((prev: any) => ({ ...prev, latin: { ...prev.latin, stripColor: e.target.value } }))}
                            className="w-8 h-8 rounded-lg border-0 p-0 cursor-pointer shadow-sm shrink-0"
                          />
                          <div className="flex gap-1 overflow-x-auto no-scrollbar">
                            {['#10b981', '#3b82f6', '#f43f5e', '#f59e0b'].map(c => (
                              <button key={c} onClick={() => setStyleSettings((prev: any) => ({ ...prev, latin: { ...prev.latin, stripColor: c } }))} className="w-4 h-4 rounded-full border border-slate-200 shrink-0" style={{ backgroundColor: c }} />
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-slate-400 uppercase">Warna Stabilo</label>
                        <div className="flex items-center gap-2">
                          <input 
                            type="color" 
                            value={styleSettings?.latin?.highlightColor || '#fef08a'}
                            onChange={(e) => setStyleSettings((prev: any) => ({ ...prev, latin: { ...prev.latin, highlightColor: e.target.value } }))}
                            className="w-8 h-8 rounded-lg border-0 p-0 cursor-pointer shadow-sm shrink-0"
                          />
                          <div className="flex gap-1 overflow-x-auto no-scrollbar">
                            {['#fef08a', '#bbf7d0', '#bfdbfe', '#fbcfe8'].map(c => (
                              <button key={c} onClick={() => setStyleSettings((prev: any) => ({ ...prev, latin: { ...prev.latin, highlightColor: c } }))} className="w-4 h-4 rounded-full border border-slate-200 shrink-0" style={{ backgroundColor: c }} />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Auto Style Mapping (Hidden by default) */}
                    <div className="pt-2 border-t border-slate-50">
                      <button 
                        onClick={() => setShowAdvancedStyle(!showAdvancedStyle)}
                        className="w-full flex items-center justify-between text-[10px] font-bold text-slate-400 hover:text-emerald-600 transition-colors uppercase tracking-widest py-1"
                      >
                        <span className="flex items-center gap-2">
                          <Sparkles className="w-3 h-3" />
                          Pemetaan Gaya Otomatis
                        </span>
                        {showAdvancedStyle ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>

                      <AnimatePresence>
                        {showAdvancedStyle && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-2 pt-2"
                          >
                            {[
                              { key: 'autoHighlightArabic', label: 'Arab', icon: <Languages className="w-3 h-3" />, color: 'emerald' },
                              { key: 'autoHighlightLatin', label: 'Latin', icon: <Type className="w-3 h-3" />, color: 'cyan' },
                              { key: 'autoHighlightTranslation', label: 'Arti', icon: <Italic className="w-3 h-3" />, color: 'blue' },
                              { key: 'autoHighlightTitles', label: 'Judul', icon: <Heading className="w-3 h-3" />, color: 'amber' },
                              { key: 'autoHighlightBold', label: 'Poin', icon: <Bold className="w-3 h-3" />, color: 'rose' },
                              { key: 'autoHighlightNormal', label: 'Teks', icon: <AlignLeft className="w-3 h-3" />, color: 'indigo' },
                            ].map((item) => (
                              <div key={item.key} className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 min-w-[60px]">
                                  <div className={`w-5 h-5 rounded bg-${item.color}-50 flex items-center justify-center text-${item.color}-600`}>
                                    {item.icon}
                                  </div>
                                  <span className="text-[9px] font-bold text-slate-600">{item.label}</span>
                                </div>
                                <div className="flex bg-slate-100 p-0.5 rounded-lg flex-1">
                                  {[
                                    { id: 'none', icon: <X className="w-2.5 h-2.5" /> },
                                    { id: 'strip', icon: <Minus className="w-2.5 h-2.5" /> },
                                    { id: 'highlight', icon: <Highlighter className="w-2.5 h-2.5" /> },
                                    { id: 'frame', icon: <Square className="w-2.5 h-2.5" /> },
                                  ].map((style) => (
                                    <button
                                      key={style.id}
                                      onClick={() => setStyleSettings((prev: any) => ({ ...prev, latin: { ...prev.latin, [item.key]: style.id } }))}
                                      className={`flex-1 h-6 rounded-md flex items-center justify-center transition-all ${styleSettings?.latin?.[item.key] === style.id ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                      {style.icon}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-slate-50/50 border-t border-slate-100 shrink-0">
                  <p className="text-[8px] text-slate-400 leading-relaxed italic text-center">
                    * Tips: Aktifkan efek, pilih scope, lalu klik teks pada pratinjau.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          <button
            onClick={() => {
              setShowQuickStyle(!showQuickStyle);
            }}
            className={`w-12 h-12 rounded-full shadow-2xl flex items-center justify-center transition-all active:scale-90 relative ${showQuickStyle ? 'bg-white text-emerald-600 border-2 border-emerald-500' : 'bg-emerald-500 text-white hover:bg-emerald-600'}`}
          >
            {showQuickStyle ? <X className="w-6 h-6" /> : <Palette className="w-6 h-6" />}
            {activeMarker && !showQuickStyle && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-ping" />
            )}
          </button>
        </div>
      )}

      {/* Save Preset Prompt Modal */}
      <AnimatePresence>
        {showSavePresetPrompt && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[70] flex items-center justify-center p-4"
              onClick={() => setShowSavePresetPrompt(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl p-6 shadow-2xl w-full max-w-sm relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 rounded-bl-[100px] -z-10" />
                
                <div className="w-12 h-12 bg-rose-100 rounded-2xl flex items-center justify-center text-rose-500 mb-4 border border-rose-200">
                  <HeartHandshake className="w-6 h-6" />
                </div>
                
                <h3 className="text-xl font-bold text-slate-800 mb-2">Simpan sbg Preset Pribadi?</h3>
                <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                  Apakah Anda ingin menjadikan desain visual ini sebagai bawaan otomatis untuk <strong>semua naskah yang digenerate selanjutnya?</strong>
                </p>

                <div className="space-y-3 relative z-10">
                  <button
                    onClick={savePersonalPreset}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 text-white rounded-xl text-sm font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Ya, Jadikan Tampilan Default
                  </button>

                  <button
                    onClick={skipSavePersonalPreset}
                    className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors"
                  >
                    Tidak, Hanya untuk Naskah Ini
                  </button>
                </div>

                <div className="mt-6 flex items-center gap-2 px-1">
                  <input
                    type="checkbox"
                    id="dontAskAgain"
                    checked={dontAskSavePreset}
                    onChange={(e) => setDontAskSavePreset(e.target.checked)}
                    className="w-4 h-4 text-rose-500 rounded border-slate-300 focus:ring-rose-500 outline-none"
                  />
                  <label htmlFor="dontAskAgain" className="text-sm text-slate-500 cursor-pointer select-none font-medium">
                    Jangan tanyakan lagi
                  </label>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showStudio && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseStudio}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed inset-0 bg-white z-50 flex flex-col overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-200">
                    <Palette className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-lg uppercase tracking-tight">Studio Desain Naskah</h3>
                    <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">Kustomisasi Visual Tanpa Batas</p>
                  </div>
                </div>
                <button 
                  onClick={handleCloseStudio} 
                  className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 text-slate-400 hover:text-rose-500 hover:border-rose-200 hover:bg-rose-50 rounded-xl transition-all shadow-sm"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex items-center px-5 border-b border-slate-100 overflow-x-auto no-scrollbar">
                {['preset', 'latin', 'arabic', 'layout', 'cover', 'tools'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveStudioTab(tab)}
                    className={`flex-shrink-0 whitespace-nowrap px-3 sm:px-4 py-3 text-[10px] sm:text-[11px] uppercase tracking-wider font-bold border-b-2 transition-colors flex flex-col items-center justify-center gap-1.5 ${
                      activeStudioTab === tab 
                        ? 'border-emerald-500 text-emerald-600' 
                        : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {tab === 'preset' && <Sparkles className="w-4 h-4" />}
                    {tab === 'latin' && <Type className="w-4 h-4" />}
                    {tab === 'arabic' && <MoonStar className="w-4 h-4" />}
                    {tab === 'layout' && <LayoutDashboard className="w-4 h-4" />}
                    {tab === 'cover' && <BookIcon className="w-4 h-4" />}
                    {tab === 'tools' && <Wand2 className="w-4 h-4" />}
                    
                    <span>
                      {tab === 'preset' && 'Preset'}
                      {tab === 'latin' && 'Latin'}
                      {tab === 'arabic' && 'Arab'}
                      {tab === 'layout' && 'Tampilan'}
                      {tab === 'cover' && 'Cover'}
                      {tab === 'tools' && 'Alat'}
                    </span>
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-6 pb-20">
                {activeStudioTab === 'preset' && (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-800 uppercase flex items-center justify-between">
                        <span>Preset Cepat (Visual)</span>
                      </label>
                      <p className="text-[10px] text-slate-500 leading-relaxed mb-4">
                        Pilih tema di bawah untuk menerapkan setelan visual seketika (font, warna teks, garis gaya, dan latar kertas). <strong>Ukuran huruf akan dipertahankan.</strong>
                      </p>
                      <div className="grid grid-cols-2 gap-3 mt-4">
                        {(() => {
                          let personalPresetObj = null;
                          try {
                            const raw = localStorage.getItem('USER_PERSONAL_PRESET');
                            if (raw) personalPresetObj = JSON.parse(raw);
                          } catch (e) {}
                          
                          return (
                            <>
                              {personalPresetObj && (
                                <div className="col-span-2 relative">
                                  <button
                                    onClick={() => {
                                      const currentSize = styleSettings.latin.fontSize;
                                      const currentArabicScale = styleSettings.arabic.fontSizeScale;
                                      
                                      setStyleSettings({
                                        ...styleSettings,
                                        latin: { 
                                          ...styleSettings.latin, 
                                          ...personalPresetObj.latin, 
                                          fontSize: currentSize 
                                        },
                                        arabic: { 
                                          ...styleSettings.arabic, 
                                          ...personalPresetObj.arabic, 
                                          fontSizeScale: currentArabicScale 
                                        }
                                      });
                                      
                                      setPaperTemplate(personalPresetObj.paperTemplate);
                                      setTextAlign(personalPresetObj.textAlign);
                                    }}
                                    className={`w-full flex items-center justify-between transition-all group overflow-hidden border-2 rounded-xl p-3 relative hover:border-rose-300 active:scale-95 ${
                                      paperTemplate === personalPresetObj.paperTemplate && styleSettings.latin.fontFamily === personalPresetObj.latin.fontFamily
                                        ? 'border-rose-500 shadow-md shadow-rose-500/10' 
                                        : 'border-rose-200'
                                    } bg-rose-50`}
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-rose-500">
                                        <HeartHandshake className="w-5 h-5" />
                                      </div>
                                      <div className="text-left">
                                        <div className="text-sm font-bold text-rose-900 leading-tight">Preset Pribadi</div>
                                        <div className="text-[10px] text-rose-600 opacity-80 leading-snug">
                                          Tersimpan otomatis untuk Naskah Baru
                                        </div>
                                      </div>
                                    </div>
                                    {paperTemplate === personalPresetObj.paperTemplate && styleSettings.latin.fontFamily === personalPresetObj.latin.fontFamily && (
                                      <div className="bg-rose-500 text-white p-1 rounded-full z-20">
                                        <Check className="w-4 h-4" />
                                      </div>
                                    )}
                                  </button>
                                  <button 
                                    onClick={() => {
                                      if (confirm('Hapus Preset Pribadi? Tampilan default akan kembali ke standar.')) {
                                        localStorage.removeItem('USER_PERSONAL_PRESET');
                                        // Force re-render hack by toggling state
                                        setShowQuickStyle(s => !s); 
                                        setTimeout(() => setShowQuickStyle(s => !s), 0);
                                      }
                                    }}
                                    className="absolute -top-2 -right-2 bg-white text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-full shadow-md transition-colors border border-slate-100 z-30"
                                    title="Hapus Preset Pribadi"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                              
                              {QUICK_PRESETS.map((preset) => (
                                <button
                                  key={preset.id}
                                  onClick={() => {
                                    const currentSize = styleSettings.latin.fontSize;
                                    const currentArabicScale = styleSettings.arabic.fontSizeScale;
                                    
                                    setStyleSettings({
                                      ...styleSettings,
                                      latin: { 
                                        ...styleSettings.latin, 
                                        ...preset.settings.latin, 
                                        fontSize: currentSize 
                                      },
                                      arabic: { 
                                        ...styleSettings.arabic, 
                                        ...preset.settings.arabic, 
                                        fontSizeScale: currentArabicScale 
                                      }
                                    });
                                    
                                    setPaperTemplate(preset.settings.paperTemplate);
                                    setTextAlign(preset.settings.textAlign);
                                  }}
                                  className={`flex flex-col text-left transition-all group overflow-hidden border-2 rounded-xl h-28 relative hover:border-emerald-300 active:scale-95 ${
                                    paperTemplate === preset.settings.paperTemplate && styleSettings.latin.fontFamily === preset.settings.latin.fontFamily
                                      ? 'border-emerald-500 shadow-md shadow-emerald-500/10' 
                                      : 'border-slate-200'
                                  } ${preset.paperPreview}`}
                                >
                                  <div className="absolute inset-0 bg-gradient-to-t from-white/90 via-transparent to-transparent pointer-events-none z-0"></div>
                                  
                                  <div className="relative z-10 flex flex-col h-full p-3 justify-between">
                                    <div className="flex items-center justify-between">
                                      <span className={`text-sm font-bold ${preset.textColorPreview} leading-tight`}>{preset.name}</span>
                                      <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: preset.vibeColor }}></div>
                                    </div>
                                    
                                    <p className={`text-[9px] ${preset.textColorPreview} opacity-80 leading-snug line-clamp-2`}>
                                      {preset.desc}
                                    </p>
                                  </div>

                                  {paperTemplate === preset.settings.paperTemplate && styleSettings.latin.fontFamily === preset.settings.latin.fontFamily && (
                                    <div className="absolute top-0 right-0 bg-emerald-500 text-white p-1 rounded-bl-lg z-20">
                                      <Check className="w-3 h-3" />
                                    </div>
                                  )}
                                </button>
                              ))}
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    <div className="h-px bg-slate-200 w-full my-6"></div>
                    
                    {/* Smart Color Vibes */}
                    <div className="space-y-4 pt-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-emerald-600 uppercase flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5" /> Asisten Warna (Vibe)
                        </label>
                        <span className="text-[10px] text-slate-400 font-medium bg-slate-100 px-2 py-0.5 rounded-full">1-Klik Harmoni Web</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mb-2 leading-relaxed">
                        Gunakan Asisten Warna ini untuk mengubah sekumpulan warna naskah menjadi palette harmoni secara otomatis, **tanpa mengubah font atau jenis kertas**.
                      </p>
                      <div className="max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                          {COLOR_VIBES.map(vibe => (
                            <button
                              key={vibe.id}
                              onClick={() => {
                                setStyleSettings({
                                  ...styleSettings,
                                  page: { ...styleSettings.page, backgroundColor: vibe.bg, borderColor: vibe.border },
                                  latin: { ...styleSettings.latin, color: vibe.text, stripColor: vibe.accent, highlightColor: vibe.highlight },
                                  arabic: { ...styleSettings.arabic, color: vibe.arabic }
                                });
                              }}
                              className="flex flex-col items-center gap-1.5 group"
                            >
                              <div 
                                className="w-full aspect-[4/3] rounded-xl border-2 transition-all group-active:scale-95 shadow-sm relative overflow-hidden"
                                style={{ backgroundColor: vibe.bg, borderColor: vibe.border }}
                              >
                                <div className="absolute inset-x-0 bottom-0 h-1/3 opacity-40 transition-all group-hover:h-1/2" style={{ backgroundColor: vibe.accent }}></div>
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl font-arabic font-bold" style={{ color: vibe.arabic }}>ع</div>
                              </div>
                              <span className="text-[9px] font-bold text-slate-500 text-center leading-tight h-5 flex items-center group-hover:text-slate-800 transition-colors uppercase tracking-wider">{vibe.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                  </div>
                )}

                {activeStudioTab === 'cover' && (
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tema Visual AI</label>
                          <div className="grid grid-cols-2 gap-2">
                            {COVER_STYLES.map((style) => (
                              <button
                                key={style.id}
                                onClick={() => setCoverData({ ...coverData, imageStyle: style.id })}
                                className={`px-3 py-2 text-[10px] font-bold rounded-xl border transition-all ${coverData.imageStyle === style.id ? 'bg-emerald-500 text-white border-emerald-600 shadow-lg shadow-emerald-100' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                              >
                                {style.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <label className="text-sm font-bold text-slate-700">Pengaturan Sampul</label>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-bold text-slate-400 uppercase">Analisis Dalam</span>
                            <button
                              onClick={() => setUseDeepAnalysis(!useDeepAnalysis)}
                              className={`w-8 h-4 rounded-full transition-colors relative ${useDeepAnalysis ? 'bg-amber-500' : 'bg-slate-300'}`}
                            >
                              <div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 left-0.5 transition-transform ${useDeepAnalysis ? 'translate-x-4' : 'translate-x-0'}`} />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="cursor-pointer flex items-center gap-1 text-[10px] font-bold text-slate-600 hover:text-slate-700 bg-slate-100 px-2 py-1 rounded-lg transition-colors">
                            <Upload className="w-3 h-3" />
                            Upload
                            <input type="file" className="hidden" accept="image/*" onChange={handleCoverImageUpload} />
                          </label>
                          <button 
                            onClick={generateCoverImage}
                            disabled={isGeneratingImage}
                            className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg transition-colors disabled:opacity-50 ${useDeepAnalysis ? 'bg-amber-50 text-amber-600 hover:text-amber-700' : 'bg-emerald-50 text-emerald-600 hover:text-emerald-700'}`}
                            title={useDeepAnalysis ? "Generate dengan Analisis Mendalam (Boros)" : "Generate Cepat (Hemat)"}
                          >
                            {isGeneratingImage ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImageIcon className="w-3 h-3" />}
                            {isGeneratingImage ? 'Membuat...' : useDeepAnalysis ? 'Deep AI' : 'Generate AI'}
                          </button>
                        </div>
                      </div>

                      {coverData.imageHistory && coverData.imageHistory.length > 0 && (
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Riwayat Gambar</label>
                          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                            {coverData.imageHistory.map((img: string, idx: number) => (
                              <div key={idx} className="relative group flex-shrink-0">
                                <button 
                                  onClick={() => setCoverData({ ...coverData, imageUrl: img, showImageCover: true })}
                                  className={`w-12 h-12 rounded-lg border-2 overflow-hidden transition-all ${coverData.imageUrl === img ? 'border-emerald-500 scale-105 shadow-md' : 'border-transparent hover:border-slate-300'}`}
                                >
                                  <img src={img} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                </button>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const newHistory = coverData.imageHistory.filter((_: any, i: number) => i !== idx);
                                    setCoverData({ 
                                      ...coverData, 
                                      imageHistory: newHistory,
                                      imageUrl: coverData.imageUrl === img ? (newHistory[newHistory.length - 1] || '') : coverData.imageUrl
                                    });
                                  }}
                                  className="absolute -top-1 -right-1 p-0.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-10"
                                  title="Hapus gambar dari riwayat"
                                >
                                  <X className="w-2 h-2" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {coverData.showImageCover && coverData.imageUrl && (
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Posisi & Ukuran Gambar</label>
                          <div className="space-y-4">
                            <div className="space-y-1">
                              <LocalRangeInput 
                                value={coverData.imageScale || 1}
                                min={0.5} max={3} step={0.01}
                                onChange={(val) => setCoverData({ ...coverData, imageScale: val })}
                                label="Zoom"
                                formatValue={(v) => `${Math.round(v * 100)}%`}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <LocalRangeInput 
                                value={coverData.imageOffsetX || 0}
                                min={-500} max={500} step={1}
                                onChange={(val) => setCoverData({ ...coverData, imageOffsetX: val })}
                                label="Geser X"
                                formatValue={(v) => `${Math.round(v)}px`}
                              />
                              <LocalRangeInput 
                                value={coverData.imageOffsetY || 0}
                                min={-500} max={500} step={1}
                                onChange={(val) => setCoverData({ ...coverData, imageOffsetY: val })}
                                label="Geser Y"
                                formatValue={(v) => `${Math.round(v)}px`}
                              />
                            </div>
                            <button 
                              onClick={() => setCoverData({ ...coverData, imageScale: 1, imageOffsetX: 0, imageOffsetY: 0 })}
                              className="w-full py-1.5 text-[10px] font-bold text-slate-500 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                            >
                              Reset Posisi
                            </button>
                          </div>
                        </div>
                      )}
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between mt-4">
                          <label className="text-xs font-bold text-slate-400 uppercase">Tampilkan Cover Gambar</label>
                          <button
                            onClick={() => setCoverData({ ...coverData, showImageCover: !coverData.showImageCover })}
                            className={`w-10 h-6 rounded-full transition-colors ${coverData.showImageCover ? 'bg-emerald-600' : 'bg-slate-300'}`}
                          >
                            <div className={`w-4 h-4 bg-white rounded-full transition-transform ${coverData.showImageCover ? 'translate-x-5' : 'translate-x-1'}`} />
                          </button>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <label className="text-xs font-bold text-slate-400 uppercase">Tampilkan Teks di Atas Gambar</label>
                          <button
                            onClick={() => setCoverData({ ...coverData, showTextOverlay: !coverData.showTextOverlay })}
                            className={`w-10 h-6 rounded-full transition-colors ${coverData.showTextOverlay ? 'bg-emerald-600' : 'bg-slate-300'}`}
                          >
                            <div className={`w-4 h-4 bg-white rounded-full transition-transform ${coverData.showTextOverlay ? 'translate-x-5' : 'translate-x-1'}`} />
                          </button>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <label className="text-xs font-bold text-slate-400 uppercase">Tampilkan Cover Teks</label>
                          <button
                            onClick={() => setCoverData({ ...coverData, showTextCover: !coverData.showTextCover })}
                            className={`w-10 h-6 rounded-full transition-colors ${coverData.showTextCover ? 'bg-emerald-600' : 'bg-slate-300'}`}
                          >
                            <div className={`w-4 h-4 bg-white rounded-full transition-transform ${coverData.showTextCover ? 'translate-x-5' : 'translate-x-1'}`} />
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-400 uppercase">Judul Khotbah/Naskah</label>
                        </div>
                        <input 
                          type="text" 
                          defaultValue={coverData?.title || ''}
                          onBlur={(e) => setCoverData({ ...coverData, title: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 text-sm rounded-xl px-3 py-2 outline-none focus:border-emerald-500"
                          placeholder="Judul Utama"
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-400 uppercase">Tujuan / Deskripsi</label>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={generateSubtitleLocally}
                              className="text-[10px] font-bold text-emerald-600 hover:underline"
                            >
                              Ambil dari Naskah
                            </button>
                            <button 
                              onClick={generateCoverText}
                              disabled={isGeneratingCover}
                              className="text-[10px] font-bold text-emerald-600 hover:underline disabled:opacity-50"
                            >
                              {isGeneratingCover ? 'Membuat...' : 'Generate AI'}
                            </button>
                          </div>
                        </div>
                        <textarea 
                          defaultValue={coverData?.subtitle || ''}
                          onBlur={(e) => setCoverData({ ...coverData, subtitle: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 text-sm rounded-xl px-3 py-2 outline-none focus:border-emerald-500 min-h-[80px]"
                          placeholder="Misal: Khotbah Jumat untuk pemuda..."
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-400 uppercase">Nama Penulis/Khatib</label>
                          <input 
                            type="text" 
                            defaultValue={coverData?.author || ''}
                            onBlur={(e) => setCoverData({ ...coverData, author: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 text-sm rounded-xl px-3 py-2 outline-none focus:border-emerald-500"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-400 uppercase">Tanggal</label>
                          <input 
                            type="text" 
                            defaultValue={coverData?.date || ''}
                            onBlur={(e) => setCoverData({ ...coverData, date: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 text-sm rounded-xl px-3 py-2 outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase">Nama Masjid / Tempat</label>
                        <input 
                          type="text" 
                          defaultValue={coverData?.location || ''}
                          onBlur={(e) => setCoverData({ ...coverData, location: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 text-sm rounded-xl px-3 py-2 outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-400 uppercase">Daftar Isi (Halaman 2)</label>
                          <div className="flex items-center gap-3">
                            <button 
                              onClick={generateTOC}
                              className={`text-[10px] font-bold hover:underline flex items-center gap-1 ${editContent?.includes('[DAFTAR_ISI]:') ? 'text-amber-600' : 'text-emerald-600'}`}
                              title={editContent?.includes('[DAFTAR_ISI]:') ? "Ekstrak dari Metadata (Akal Cerdas)" : "Ekstrak otomatis dari judul halaman"}
                            >
                              <Scissors className="w-3 h-3" /> {editContent?.includes('[DAFTAR_ISI]:') ? 'Smart Parsing' : 'Parsing'}
                            </button>
                            <button 
                              onClick={generateTOCWithAI}
                              className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1"
                              title="Gunakan AI untuk merangkum poin utama"
                            >
                              <Sparkles className="w-3 h-3" /> AI
                            </button>
                          </div>
                        </div>
                        <textarea 
                          defaultValue={coverData?.toc || ''}
                          onBlur={(e) => setCoverData({ ...coverData, toc: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 text-sm rounded-xl px-3 py-2 outline-none focus:border-emerald-500 min-h-[100px]"
                          placeholder="1. Pendahuluan&#10;2. Isi..."
                        />
                      </div>
                      {coverData?.imageUrl && (
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-400 uppercase">Ilustrasi Cover</label>
                          <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50 aspect-square">
                            <img src={coverData.imageUrl} alt="Cover Illustration" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            <button 
                              onClick={() => setCoverData({ ...coverData, imageUrl: '' })}
                              className="absolute top-2 right-2 p-1.5 bg-white/80 backdrop-blur-sm rounded-full text-red-500 hover:bg-white transition-colors shadow-sm"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <hr className="border-slate-200" />
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-bold text-slate-700">Watermark / Copyright</label>
                        <input 
                          type="checkbox" 
                          checked={watermark?.showOnAllPages ?? false}
                          onChange={(e) => setWatermark({ ...watermark, showOnAllPages: e.target.checked })}
                          className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500"
                        />
                      </div>
                      
                      {watermark?.showOnAllPages && (
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-400 uppercase">Teks Copyright</label>
                          <input 
                            type="text" 
                            defaultValue={watermark?.text || ''}
                            onBlur={(e) => setWatermark({ ...watermark, text: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 text-sm rounded-xl px-3 py-2 outline-none focus:border-emerald-500"
                            placeholder="© 2026 Nama Anda"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeStudioTab === 'tools' && (
                  <div className="space-y-6 relative">
                    {/* Minimalist Loading Bar */}
                    <AnimatePresence>
                      {isProcessingTool && (
                        <motion.div 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute -top-2 left-0 right-0 z-[60] px-2"
                        >
                          <div className="bg-white/80 backdrop-blur-md border border-emerald-100 rounded-full p-1 shadow-sm flex items-center gap-3">
                            <div className="flex-1 h-1.5 bg-emerald-50 rounded-full overflow-hidden">
                              <motion.div 
                                className="h-full bg-emerald-500"
                                initial={{ width: 0 }}
                                animate={{ width: `${toolProgress}%` }}
                                transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                              />
                            </div>
                            <div className="flex items-center gap-1.5 pr-2">
                              <Loader2 className="w-3 h-3 text-emerald-600 animate-spin" />
                              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Memproses...</span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {isAiEditing && (
                      <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-50 flex flex-col items-center justify-center space-y-4 rounded-2xl">
                        <div className="relative">
                          <div className="w-16 h-16 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
                          <Sparkles className="w-6 h-6 text-emerald-600 absolute inset-0 m-auto animate-pulse" />
                        </div>
                        <div className="text-center">
                          <p className="font-bold text-slate-800">AI Sedang Bekerja...</p>
                          <p className="text-xs text-slate-500 mt-1">Mohon tunggu sebentar, naskah sedang diperbarui.</p>
                        </div>
                      </div>
                    )}
                    
            {/* Grammar Inspector Overlay */}
            <AnimatePresence>
              {showGrammarInspector && (
                <motion.div
                  initial={{ opacity: 0, y: '100%' }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: '100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  className="fixed inset-0 z-[60] bg-slate-50 flex flex-col"
                >
                  <GrammarInspector 
                    content={editContent}
                    onUpdate={(newContent) => updateContent(newContent, 'Koreksi Tata Bahasa')}
                    apiKey={apiKey}
                    onClose={() => setShowGrammarInspector(false)}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Dalil Inspector Overlay */}
            <AnimatePresence>
              {showVocalInspector && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center">
                  <VocalInspector 
                    content={editContent}
                    onUpdate={setEditContent}
                    apiKey={apiKey}
                    onClose={() => setShowVocalInspector(false)}
                    handleAnnotate={handleAnnotate}
                    handleAnnotateLocally={handleAnnotateLocally}
                    isAnnotating={isAnnotating}
                  />
                </div>
              )}

              {showDalilInspector && (
                <motion.div
                  initial={{ opacity: 0, y: '100%' }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: '100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  className="fixed inset-0 z-[60] bg-slate-50 flex flex-col"
                >
                  <DalilInspector 
                    content={editContent}
                    onUpdate={(newContent) => updateContent(newContent, 'Edit Dalil')}
                    apiKey={apiKey}
                    onClose={() => setShowDalilInspector(false)}
                    dalilList={dalilList}
                    setDalilList={setDalilList}
                    analyzed={isDalilAnalyzed}
                    setAnalyzed={setIsDalilAnalyzed}
                    onCheckInQuran={(ref) => {
                      if (typeof setCurrentScreen === 'function') {
                        localStorage.setItem('libraryInitialTab', 'quran');
                        localStorage.setItem('libraryInitialQuery', ref);
                        // Trigger re-render in LibraryScreen via state or effect
                        window.dispatchEvent(new Event('navigate-to-quran'));
                        setCurrentScreen('library');
                        setShowDalilInspector(false);
                      }
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Doa Inspector Overlay */}
            <AnimatePresence>
              {showDoaInspector && (
                <motion.div
                  initial={{ opacity: 0, y: '100%' }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: '100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  className="fixed inset-0 z-[60] bg-slate-50 flex flex-col"
                >
                  <DoaInspector 
                    content={editContent}
                    onUpdate={(newContent) => updateContent(newContent, 'Tambah Doa')}
                    apiKey={apiKey}
                    onClose={() => setShowDoaInspector(false)}
                    tema={tema}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Structure Inspector Overlay */}
            <AnimatePresence>
              {showStructureInspector && (
                <motion.div
                  initial={{ opacity: 0, y: '100%' }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: '100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  className="fixed inset-0 z-[60] bg-slate-50 flex flex-col"
                >
                  <StructureInspector 
                    content={editContent}
                    onUpdate={(newContent) => updateContent(newContent, 'Update Struktur')}
                    apiKey={apiKey}
                    onClose={() => setShowStructureInspector(false)}
                    tema={tema}
                    onJumpTo={(index) => {
                      setShowStructureInspector(false);
                      setTimeout(() => {
                        if (textareaRef.current) {
                          textareaRef.current.focus();
                          textareaRef.current.setSelectionRange(index, index);
                          const textBefore = editContent.substring(0, index);
                          const newlines = (textBefore.match(/\n/g) || []).length;
                          const lineHeight = 28; // approx line height
                          textareaRef.current.scrollTop = newlines * lineHeight;
                        }
                      }, 300);
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Hadith Library Overlay */}
            <AnimatePresence>
              {showHadithLibrary && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="fixed inset-0 z-[70] bg-slate-900/50 flex items-center justify-center p-4"
                >
                  <HadithLibrary onClose={() => setShowHadithLibrary(false)} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Page Management */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase">Alat Naskah</h4>
              <div className="grid grid-cols-1 gap-3">
                <button 
                  onClick={() => {
                    if (isProcessingTool) return;
                    setIsProcessingTool(true);
                    setToolProgress(0);
                    const interval = setInterval(() => setToolProgress(p => Math.min(p + 20, 95)), 100);
                    setTimeout(() => {
                      clearInterval(interval);
                      setToolProgress(100);
                      setTimeout(() => {
                        setIsProcessingTool(false);
                        setShowDalilInspector(true);
                      }, 200);
                    }, 500);
                  }}
                  disabled={isProcessingTool}
                  className="w-full p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-3 hover:bg-emerald-100 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="w-8 h-8 rounded-full bg-white border border-emerald-100 flex items-center justify-center text-emerald-600">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-emerald-700">Inspektur Dalil</div>
                    <div className="text-[10px] text-emerald-500">Validasi & Kelola Dalil</div>
                  </div>
                </button>
                
                <button 
                  onClick={() => {
                    if (isProcessingTool) return;
                    setIsProcessingTool(true);
                    setToolProgress(0);
                    const interval = setInterval(() => setToolProgress(p => Math.min(p + 20, 95)), 100);
                    setTimeout(() => {
                      clearInterval(interval);
                      setToolProgress(100);
                      setTimeout(() => {
                        setIsProcessingTool(false);
                        setShowDoaInspector(true);
                      }, 200);
                    }, 500);
                  }}
                  disabled={isProcessingTool}
                  className="w-full p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-3 hover:bg-rose-100 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="w-8 h-8 rounded-full bg-white border border-rose-100 flex items-center justify-center text-rose-600">
                    <HeartHandshake className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-rose-700">Koleksi Dalil & Doa</div>
                    <div className="text-[10px] text-rose-500">Kumpulkan Dalil, Doa & Dzikir untuk Penutup</div>
                  </div>
                </button>

                <button 
                  onClick={() => setShowHadithLibrary(true)}
                  className="w-full p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-center gap-3 hover:bg-amber-100 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-white border border-amber-100 flex items-center justify-center text-amber-600">
                    <Library className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-amber-700">Perpustakaan Hadits</div>
                    <div className="text-[10px] text-amber-500">Download & Kelola Kitab</div>
                  </div>
                </button>

                <button 
                  onClick={() => {
                    if (isProcessingTool) return;
                    setIsProcessingTool(true);
                    setToolProgress(0);
                    const interval = setInterval(() => setToolProgress(p => Math.min(p + 20, 95)), 100);
                    setTimeout(() => {
                      clearInterval(interval);
                      setToolProgress(100);
                      setTimeout(() => {
                        setIsProcessingTool(false);
                        setShowStructureInspector(true);
                      }, 200);
                    }, 500);
                  }}
                  disabled={isProcessingTool}
                  className="w-full p-3 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center gap-3 hover:bg-indigo-100 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="w-8 h-8 rounded-full bg-white border border-indigo-100 flex items-center justify-center text-indigo-600">
                    <LayoutList className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-indigo-700">Struktur Sunnah</div>
                    <div className="text-[10px] text-indigo-500">Cek Rukun & Kerangka Khotbah</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Page Management */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase">Manajemen Halaman</h4>
              <div className="grid grid-cols-1 gap-3">
                <button 
                  onClick={() => {
                    setShowPageOrganizer(true);
                  }}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3 hover:bg-slate-100 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600">
                    <LayoutDashboard className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-700">Atur Halaman</div>
                    <div className="text-[10px] text-slate-500">Geser urutan halaman</div>
                  </div>
                </button>
              </div>
            </div>

                    {/* Audience Templates */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-400 uppercase">Template Panggilan</h4>
                      <button 
                        onClick={() => {
                          setShowAudienceModal(true);
                          setShowStudio(false);
                        }}
                        className="w-full p-3 bg-violet-50 border border-violet-100 rounded-xl flex items-center gap-3 hover:bg-violet-100 transition-colors text-left"
                      >
                        <div className="w-8 h-8 rounded-full bg-white border border-violet-100 flex items-center justify-center text-violet-600">
                          <Users className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-violet-700">Pilih Sapaan Jamaah</div>
                          <div className="text-[10px] text-violet-500">Khotbah, Kultum, Nikah, dll</div>
                        </div>
                      </button>
                    </div>

                    {/* AI Magic Tools */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-400 uppercase">AI Magic Tools</h4>
                      <div className="grid grid-cols-1 gap-3">
                        <button 
                          onClick={() => {
                            if (isProcessingTool) return;
                            setIsProcessingTool(true);
                            setToolProgress(0);
                            const interval = setInterval(() => setToolProgress(p => Math.min(p + 20, 95)), 100);
                            setTimeout(() => {
                              clearInterval(interval);
                              setToolProgress(100);
                              setTimeout(() => {
                                setIsProcessingTool(false);
                                setShowGrammarInspector(true);
                              }, 200);
                            }, 500);
                          }}
                          disabled={isProcessingTool}
                          className="p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-center gap-3 hover:bg-amber-100 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <div className="w-8 h-8 rounded-full bg-white border border-amber-100 flex items-center justify-center text-amber-600">
                            <Sparkles className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-amber-700">Cek Tata Bahasa (Granular)</div>
                            <div className="text-[10px] text-amber-500">Koreksi ejaan & tanda baca per titik</div>
                          </div>
                        </button>
                      </div>
                    </div>

                  </div>
                )}

                {activeStudioTab === 'latin' && (
                  <div className="space-y-6">
                    {/* Font & Size */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase">Font</label>
                        <select 
                          value={styleSettings?.latin?.fontFamily || 'font-sans'} 
                          onChange={(e) => setStyleSettings((prev: any) => ({ ...prev, latin: { ...prev.latin, fontFamily: e.target.value } }))}
                          className="w-full bg-slate-50 border border-slate-200 text-sm rounded-xl px-3 py-2 outline-none focus:border-emerald-500"
                        >
                          <option value="font-sans">Inter (Sans)</option>
                          <option value="font-serif">Merriweather (Serif)</option>
                          <option value="font-mono">JetBrains (Mono)</option>
                          <option value="'Playfair Display', serif">Playfair Display</option>
                          <option value="'Montserrat', sans-serif">Montserrat</option>
                          <option value="'Roboto', sans-serif">Roboto</option>
                          <option value="'Poppins', sans-serif">Poppins</option>
                          <option value="'Open Sans', sans-serif">Open Sans</option>
                          <option value="'Libre Baskerville', serif">Libre Baskerville</option>
                          <option value="'Cinzel', serif">Cinzel (Classic)</option>
                          <option value="'Spectral', serif">Spectral (Elegant)</option>
                          <option value="'Quicksand', sans-serif">Quicksand (Soft)</option>
                          <option value="'Outfit', sans-serif">Outfit (Modern)</option>
                          <option value="'Plus Jakarta Sans', sans-serif">Jakarta Sans (Bersih)</option>
                          <option value="'Figtree', sans-serif">Figtree (Viral/Spotify)</option>
                          <option value="'Space Grotesk', sans-serif">Space Grotesk (Tech)</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase">Ukuran</label>
                        <div className="flex items-center bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                          <button onClick={() => setStyleSettings((prev: any) => ({ ...prev, latin: { ...prev.latin, fontSize: Math.max(12, prev.latin.fontSize - 1) } }))} className="p-2 hover:bg-slate-100 flex-1 flex justify-center"><Minus className="w-4 h-4" /></button>
                          <span className="w-8 text-center text-sm font-mono">{styleSettings?.latin?.fontSize || 18}</span>
                          <button onClick={() => setStyleSettings((prev: any) => ({ ...prev, latin: { ...prev.latin, fontSize: Math.min(32, prev.latin.fontSize + 1) } }))} className="p-2 hover:bg-slate-100 flex-1 flex justify-center"><Plus className="w-4 h-4" /></button>
                        </div>
                      </div>
                    </div>

                    {/* Alat Penanda & Penanda Otomatis dipindahkan ke Smart FAB */}
                    <div className="pt-4 border-t border-slate-100 italic text-[10px] text-slate-400">
                      * Pengaturan pemetaan gaya otomatis dan penanda manual telah dipindahkan ke alat melayang (ikon palet) untuk akses lebih presisi.
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-bold text-slate-800">Tampilan Naskah</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-400 uppercase">Ketebalan</label>
                          <select 
                            value={styleSettings?.latin?.fontWeight || 'font-normal'} 
                            onChange={(e) => setStyleSettings((prev: any) => ({ ...prev, latin: { ...prev.latin, fontWeight: e.target.value } }))}
                            className="w-full bg-slate-50 border border-slate-200 text-sm rounded-xl px-3 py-2 outline-none focus:border-emerald-500"
                          >
                            <option value="font-light">Tipis</option>
                            <option value="font-normal">Normal</option>
                            <option value="font-medium">Medium</option>
                            <option value="font-semibold">Semi Bold</option>
                            <option value="font-bold">Tebal</option>
                            <option value="font-black">Sangat Tebal</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-400 uppercase">Ketajaman</label>
                          <select 
                            value={styleSettings?.latin?.textShadow || 'none'} 
                            onChange={(e) => setStyleSettings((prev: any) => ({ ...prev, latin: { ...prev.latin, textShadow: e.target.value } }))}
                            className="w-full bg-slate-50 border border-slate-200 text-sm rounded-xl px-3 py-2 outline-none focus:border-emerald-500"
                          >
                            <option value="none">Normal</option>
                            <option value="0.5px 0 0 currentColor">Tajam (Halus)</option>
                            <option value="1px 0 0 currentColor">Tajam (Sedang)</option>
                            <option value="1.5px 0 0 currentColor">Tajam (Kuat)</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Spacing & Align */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase">Spasi Baris</label>
                        <select 
                          value={styleSettings?.latin?.lineHeight || 'leading-relaxed'} 
                          onChange={(e) => setStyleSettings((prev: any) => ({ ...prev, latin: { ...prev.latin, lineHeight: e.target.value } }))}
                          className="w-full bg-slate-50 border border-slate-200 text-sm rounded-xl px-3 py-2 outline-none focus:border-emerald-500"
                        >
                          <option value="leading-tight">Rapat</option>
                          <option value="leading-normal">Normal</option>
                          <option value="leading-relaxed">Renggang</option>
                          <option value="leading-loose">Luas</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase">Perataan</label>
                        <div className="flex bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                          {['text-left', 'text-center', 'text-justify'].map((align) => (
                            <button 
                              key={align}
                              onClick={() => setTextAlign(align)}
                              className={`flex-1 p-2 flex justify-center ${textAlign === align ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:bg-slate-100'}`}
                            >
                              {align === 'text-left' && <AlignLeft className="w-4 h-4" />}
                              {align === 'text-center' && <AlignCenter className="w-4 h-4" />}
                              {align === 'text-justify' && <AlignJustify className="w-4 h-4" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Jarak Paragraf Latin */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase">Jarak Antar Paragraf</label>
                      <select 
                        value={styleSettings?.latin?.paragraphSpacing || 'mb-4'} 
                        onChange={(e) => setStyleSettings((prev: any) => ({ ...prev, latin: { ...prev.latin, paragraphSpacing: e.target.value } }))}
                        className="w-full bg-slate-50 border border-slate-200 text-sm rounded-xl px-3 py-2 outline-none focus:border-emerald-500"
                      >
                        <option value="mb-0">Tanpa Jarak</option>
                        <option value="mb-2">Rapat</option>
                        <option value="mb-4">Normal</option>
                        <option value="mb-6">Renggang</option>
                        <option value="mb-8">Sangat Renggang</option>
                        <option value="mb-12">Ekstra Luas</option>
                      </select>
                    </div>

                    {/* Letter & Word Spacing */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase">Jarak Huruf</label>
                        <select 
                          value={styleSettings?.latin?.letterSpacing || 'tracking-normal'} 
                          onChange={(e) => setStyleSettings((prev: any) => ({ ...prev, latin: { ...prev.latin, letterSpacing: e.target.value } }))}
                          className="w-full bg-slate-50 border border-slate-200 text-sm rounded-xl px-3 py-2 outline-none focus:border-emerald-500"
                        >
                          <option value="tracking-tighter">Sangat Rapat</option>
                          <option value="tracking-tight">Rapat</option>
                          <option value="tracking-normal">Normal</option>
                          <option value="tracking-wide">Renggang</option>
                          <option value="tracking-wider">Lebih Renggang</option>
                          <option value="tracking-widest">Sangat Renggang</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase">Jarak Kata</label>
                        <select 
                          value={styleSettings?.latin?.wordSpacing || 'tracking-normal'} 
                          onChange={(e) => setStyleSettings((prev: any) => ({ ...prev, latin: { ...prev.latin, wordSpacing: e.target.value } }))}
                          className="w-full bg-slate-50 border border-slate-200 text-sm rounded-xl px-3 py-2 outline-none focus:border-emerald-500"
                        >
                          <option value="tracking-tight">Rapat</option>
                          <option value="tracking-normal">Normal</option>
                          <option value="tracking-wide">Renggang</option>
                        </select>
                      </div>
                    </div>

                    {/* Colors */}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-400 uppercase">Warna Teks</label>
                          <div className="flex items-center gap-2">
                            <input 
                              type="color" 
                              value={styleSettings?.latin?.color || '#1e293b'} 
                              onChange={(e) => setStyleSettings((prev: any) => ({ ...prev, latin: { ...prev.latin, color: e.target.value } }))}
                              className="w-6 h-6 rounded-full border-0 p-0 cursor-pointer overflow-hidden"
                            />
                            <span className="text-[10px] font-mono text-slate-400 uppercase">{styleSettings?.latin?.color || '#1e293b'}</span>
                          </div>
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                          {['#1e293b', '#4b5563', '#3730a3', '#166534', '#991b1b', '#713f12', '#000000', '#2563eb', '#db2777', '#7c3aed', '#ea580c', '#059669'].map((color) => (
                            <button
                              key={color}
                              onClick={() => setStyleSettings((prev: any) => ({ ...prev, latin: { ...prev.latin, color } }))}
                              className={`w-8 h-8 rounded-full border flex-shrink-0 transition-transform active:scale-90 ${styleSettings?.latin?.color === color ? 'ring-2 ring-emerald-500 scale-110' : 'border-slate-200'}`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase">Warna Sorotan (Bold/Italic)</label>
                        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                          {['bg-transparent', 'bg-yellow-200', 'bg-emerald-100', 'bg-blue-100', 'bg-rose-100', 'bg-amber-100', 'bg-indigo-100', 'bg-slate-200'].map((color) => (
                            <button
                              key={color}
                              onClick={() => setStyleSettings((prev: any) => ({ ...prev, latin: { ...prev.latin, highlightColor: color } }))}
                              className={`w-8 h-8 rounded-full border flex-shrink-0 transition-transform active:scale-90 ${styleSettings?.latin?.highlightColor === color ? 'ring-2 ring-emerald-500 scale-110' : 'border-slate-200'}`}
                              style={{ backgroundColor: color === 'bg-transparent' ? 'white' : color.replace('bg-', '').replace('100', '#dcfce7').replace('200', '#fef08a') }}
                            >
                              {color === 'bg-transparent' && <X className="w-4 h-4 text-slate-300 mx-auto" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeStudioTab === 'arabic' && (
                  <div className="space-y-6">
                    {/* Arabic Font & Scale */}
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                        <label className="text-xs font-bold text-emerald-600 uppercase">Font Arab</label>
                        <select 
                          value={!["'Amiri', serif", "'Scheherazade New', serif", "'Noto Naskh Arabic', serif", "'Lateef', serif", "'LPMQ IsepMisbah', serif", "'Cairo', sans-serif", "'Almarai', sans-serif", "'Reem Kufi', sans-serif", "'Aref Ruqaa', serif"].includes(styleSettings?.arabic?.fontFamily) ? 'custom' : styleSettings?.arabic?.fontFamily} 
                          onChange={(e) => {
                            if (e.target.value === 'custom') {
                              setStyleSettings((prev: any) => ({ ...prev, arabic: { ...prev.arabic, fontFamily: '' } }));
                            } else {
                              setStyleSettings((prev: any) => ({ ...prev, arabic: { ...prev.arabic, fontFamily: e.target.value } }));
                              setCustomFontUrl('');
                            }
                          }}
                          className="w-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold rounded-xl px-3 py-2 outline-none focus:border-emerald-500"
                        >
                          <option value="'Amiri', serif">Amiri (Standar)</option>
                          <option value="'LPMQ IsepMisbah', serif">LPMQ (Standar Kemenag RI)</option>
                          <option value="'Lateef', serif">Lateef (Gaya Indo-Pak)</option>
                          <option value="'Scheherazade New', serif">Scheherazade</option>
                          <option value="'Noto Naskh Arabic', serif">Noto Naskh</option>
                          <option value="'Cairo', sans-serif">Cairo</option>
                          <option value="'Almarai', sans-serif">Almarai</option>
                          <option value="'Reem Kufi', sans-serif">Reem Kufi</option>
                          <option value="'Aref Ruqaa', serif">Aref Ruqaa</option>
                          <option value="custom">Kustom...</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-emerald-600 uppercase">Skala</label>
                        <div className="flex items-center bg-white rounded-xl border border-emerald-200 overflow-hidden">
                          <button onClick={() => setStyleSettings((prev: any) => ({ ...prev, arabic: { ...prev.arabic, fontSizeScale: Math.max(1, prev.arabic.fontSizeScale - 0.1) } }))} className="p-2 hover:bg-emerald-50 flex-1 flex justify-center text-emerald-700"><Minus className="w-4 h-4" /></button>
                          <span className="w-10 text-center text-sm font-mono text-emerald-700">{styleSettings?.arabic?.fontSizeScale?.toFixed(1)}x</span>
                          <button onClick={() => setStyleSettings((prev: any) => ({ ...prev, arabic: { ...prev.arabic, fontSizeScale: Math.min(3, prev.arabic.fontSizeScale + 0.1) } }))} className="p-2 hover:bg-emerald-50 flex-1 flex justify-center text-emerald-700"><Plus className="w-4 h-4" /></button>
                        </div>
                      </div>
                    </div>
                    
                    {styleSettings?.arabic?.fontFamily === "'LPMQ IsepMisbah', serif" && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex gap-3 text-sm text-emerald-800">
                        <Info className="w-5 h-5 shrink-0 text-emerald-600" />
                        <div>
                          <strong>Font LPMQ (Standar Kemenag RI)</strong>
                          <p className="mt-1 text-xs opacity-90">
                            Font ini menampilkan harakat kasrah di bawah huruf (bukan di bawah tasydid), sesuai dengan standar penulisan Al-Qur'an di Indonesia. Font akan diunduh otomatis saat pertama kali digunakan.
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {styleSettings?.arabic?.fontFamily === "'Amiri', serif" && (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex gap-3 text-sm text-slate-600">
                        <Info className="w-5 h-5 shrink-0 text-slate-400" />
                        <div>
                          <strong>Font Amiri (Standar Internasional)</strong>
                          <p className="mt-1 text-xs opacity-90">
                            Pada font standar internasional, harakat kasrah yang bertemu tasydid akan diletakkan tepat di bawah tasydid (di atas huruf). Jika jamaah tidak terbiasa, gunakan font <strong>LPMQ</strong>.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Custom Font URL */}
                    {(!["'Amiri', serif", "'Scheherazade New', serif", "'Noto Naskh Arabic', serif", "'Lateef', serif", "'LPMQ IsepMisbah', serif", "'Cairo', sans-serif", "'Almarai', sans-serif", "'Reem Kufi', sans-serif", "'Aref Ruqaa', serif"].includes(styleSettings?.arabic?.fontFamily) || styleSettings?.arabic?.fontFamily === '') && (
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-emerald-600 uppercase">URL Font Kustom (Google Fonts)</label>
                        <input 
                          type="text"
                          placeholder="https://fonts.googleapis.com/css2?family=..."
                          value={customFontUrl}
                          onChange={(e) => setCustomFontUrl(e.target.value)}
                          className="w-full bg-white border border-emerald-200 text-sm rounded-xl px-3 py-2 outline-none focus:border-emerald-500"
                        />
                      </div>
                    )}

                    {/* Arabic Weight & Sharpness */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-emerald-600 uppercase">Ketebalan</label>
                        <select 
                          value={styleSettings?.arabic?.fontWeight || 'font-normal'} 
                          onChange={(e) => setStyleSettings((prev: any) => ({ ...prev, arabic: { ...prev.arabic, fontWeight: e.target.value } }))}
                          className="w-full bg-emerald-50 border border-emerald-200 text-sm rounded-xl px-3 py-2 outline-none focus:border-emerald-500"
                        >
                          <option value="font-light">Tipis</option>
                          <option value="font-normal">Normal</option>
                          <option value="font-medium">Medium</option>
                          <option value="font-semibold">Semi Bold</option>
                          <option value="font-bold">Tebal</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-emerald-600 uppercase">Ketajaman</label>
                        <select 
                          value={styleSettings?.arabic?.textShadow || 'none'} 
                          onChange={(e) => setStyleSettings((prev: any) => ({ ...prev, arabic: { ...prev.arabic, textShadow: e.target.value } }))}
                          className="w-full bg-emerald-50 border border-emerald-200 text-sm rounded-xl px-3 py-2 outline-none focus:border-emerald-500"
                        >
                          <option value="none">Normal</option>
                          <option value="0.5px 0 0 currentColor">Tajam (Halus)</option>
                          <option value="1px 0 0 currentColor">Tajam (Sedang)</option>
                          <option value="1.5px 0 0 currentColor">Tajam (Kuat)</option>
                        </select>
                      </div>
                    </div>

                    {/* Arabic Spacing & Align */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-emerald-600 uppercase">Spasi Baris</label>
                        <select 
                          value={styleSettings?.arabic?.lineHeight || 'leading-[2.5]'} 
                          onChange={(e) => setStyleSettings((prev: any) => ({ ...prev, arabic: { ...prev.arabic, lineHeight: e.target.value } }))}
                          className="w-full bg-emerald-50 border border-emerald-200 text-sm rounded-xl px-3 py-2 outline-none focus:border-emerald-500"
                        >
                          <option value="leading-normal">Sangat Rapat (Asli)</option>
                          <option value="leading-relaxed">Rapat</option>
                          <option value="leading-[2]">Normal</option>
                          <option value="leading-[2.5]">Renggang</option>
                          <option value="leading-[3]">Sangat Renggang</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-emerald-600 uppercase">Perataan</label>
                        <div className="flex bg-emerald-50 rounded-xl border border-emerald-200 overflow-hidden">
                          {['text-right', 'text-justify', 'text-center'].map((align) => (
                            <button 
                              key={align}
                              onClick={() => setStyleSettings((prev: any) => ({ ...prev, arabic: { ...prev.arabic, textAlign: align } }))}
                              className={`flex-1 p-2 flex justify-center ${styleSettings?.arabic?.textAlign === align ? 'bg-white text-emerald-600 shadow-sm' : 'text-emerald-400 hover:bg-emerald-100'}`}
                            >
                              {align === 'text-right' && <AlignRight className="w-4 h-4" />}
                              {align === 'text-justify' && <AlignJustify className="w-4 h-4" />}
                              {align === 'text-center' && <AlignCenter className="w-4 h-4" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Jarak Paragraf Arab */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-emerald-600 uppercase">Jarak Antar Paragraf</label>
                      <select 
                        value={styleSettings?.arabic?.paragraphSpacing || 'mb-6'} 
                        onChange={(e) => setStyleSettings((prev: any) => ({ ...prev, arabic: { ...prev.arabic, paragraphSpacing: e.target.value } }))}
                        className="w-full bg-emerald-50 border border-emerald-200 text-sm rounded-xl px-3 py-2 outline-none focus:border-emerald-500"
                      >
                        <option value="mb-0">Tanpa Jarak</option>
                        <option value="mb-2">Rapat</option>
                        <option value="mb-4">Normal</option>
                        <option value="mb-6">Renggang</option>
                        <option value="mb-8">Sangat Renggang</option>
                        <option value="mb-12">Ekstra Luas</option>
                      </select>
                    </div>

                    {/* Arabic Word Spacing */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-emerald-600 uppercase">Jarak Kata</label>
                      <select 
                        value={styleSettings?.arabic?.wordSpacing || 'tracking-normal'} 
                        onChange={(e) => setStyleSettings((prev: any) => ({ ...prev, arabic: { ...prev.arabic, wordSpacing: e.target.value } }))}
                        className="w-full bg-emerald-50 border border-emerald-200 text-sm rounded-xl px-3 py-2 outline-none focus:border-emerald-500"
                      >
                        <option value="tracking-tighter">Sangat Rapat</option>
                        <option value="tracking-tight">Rapat</option>
                        <option value="tracking-normal">Normal</option>
                        <option value="tracking-wide">Renggang</option>
                        <option value="tracking-wider">Lebih Renggang</option>
                        <option value="tracking-widest">Sangat Renggang</option>
                      </select>
                    </div>

                    {/* Arabic Colors */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-emerald-600 uppercase">Warna Arab</label>
                        <div className="flex items-center gap-2">
                          <input 
                            type="color" 
                            value={styleSettings?.arabic?.color || '#000000'} 
                            onChange={(e) => setStyleSettings((prev: any) => ({ ...prev, arabic: { ...prev.arabic, color: e.target.value } }))}
                            className="w-6 h-6 rounded-full border-0 p-0 cursor-pointer overflow-hidden"
                          />
                          <span className="text-[10px] font-mono text-emerald-600 uppercase">{styleSettings?.arabic?.color || '#000000'}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                        {['#000000', '#047857', '#b45309', '#1e3a8a', '#991b1b', '#6b21a8', '#0f766e', '#78350f', '#065f46', '#111827', '#be123c', '#1d4ed8'].map((color) => (
                          <button
                            key={color}
                            onClick={() => setStyleSettings((prev: any) => ({ ...prev, arabic: { ...prev.arabic, color } }))}
                            className={`w-8 h-8 rounded-full border flex-shrink-0 transition-transform active:scale-90 ${styleSettings?.arabic?.color === color ? 'ring-2 ring-emerald-500 scale-110' : 'border-emerald-100'}`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeStudioTab === 'layout' && (
                  <div className="space-y-6">
                    {/* Header & Dalil Styles */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase">Gaya Judul</label>
                        <select 
                          value={styleSettings?.header || 'simple'} 
                          onChange={(e) => setStyleSettings((prev: any) => ({ ...prev, header: e.target.value }))}
                          className="w-full bg-slate-50 border border-slate-200 text-sm rounded-xl px-3 py-2 outline-none focus:border-emerald-500"
                        >
                          {Object.entries(HEADER_STYLES).map(([key, style]: any) => (
                            <option key={key} value={key}>{style.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase">Bingkai Dalil</label>
                        <select 
                          value={styleSettings?.dalil || 'none'} 
                          onChange={(e) => setStyleSettings((prev: any) => ({ ...prev, dalil: e.target.value }))}
                          className="w-full bg-slate-50 border border-slate-200 text-sm rounded-xl px-3 py-2 outline-none focus:border-emerald-500"
                        >
                          {Object.entries(DALIL_STYLES).map(([key, style]: any) => (
                            <option key={key} value={key}>{style.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Paper & Size */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-bold text-slate-400 uppercase">Tema Kertas</label>
                          <button 
                            onClick={() => setSmartMatching(!smartMatching)}
                            className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full transition-all ${smartMatching ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}
                            title="Otomatis sesuaikan warna teks dengan tema kertas"
                          >
                            <Sparkles className="w-3 h-3" />
                            {smartMatching ? 'Match ON' : 'Match OFF'}
                          </button>
                        </div>
                        <select 
                          value={paperTemplate} 
                          onChange={(e) => {
                            const newTemplate = e.target.value;
                            setPaperTemplate(newTemplate);
                            if (smartMatching) {
                              const template = PAPER_TEMPLATES[newTemplate];
                              if (template) {
                                const isDark = template.isDark;
                                let textColor = isDark ? '#f8fafc' : '#1e293b';
                                let arabicColor = isDark ? '#34d399' : '#047857';
                                
                                if (newTemplate === 'blueprint') { textColor = '#eff6ff'; arabicColor = '#60a5fa'; }
                                if (newTemplate === 'craft') { textColor = '#451a03'; arabicColor = '#92400e'; }
                                if (newTemplate === 'parchment') { textColor = '#422006'; arabicColor = '#78350f'; }
                                if (newTemplate === 'antique') { textColor = '#3e2723'; arabicColor = '#5d4037'; }
                                if (newTemplate === 'luxury-dark') { textColor = '#fef3c7'; arabicColor = '#fbbf24'; }
                                
                                setStyleSettings((prev: any) => ({
                                  ...prev,
                                  latin: { ...prev.latin, color: textColor },
                                  arabic: { ...prev.arabic, color: arabicColor }
                                }));
                              }
                            }
                          }}
                          className="w-full bg-slate-50 border border-slate-200 text-sm rounded-xl px-3 py-2 outline-none focus:border-emerald-500"
                        >
                          {Object.entries(PAPER_TEMPLATES).map(([key, template]: any) => (
                            <option key={key} value={key}>{template.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase">Ukuran Kertas</label>
                        <select 
                          value={paperSize} 
                          onChange={(e) => setPaperSize(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 text-sm rounded-xl px-3 py-2 outline-none focus:border-emerald-500"
                        >
                          <option value="A4">A4 (Standar)</option>
                          <option value="B5">B5 (Buku Sedang)</option>
                          <option value="A5">A5 (Buku Kecil)</option>
                          <option value="A6">A6 (Buku Saku Terjemahan)</option>
                          <option value="Legal">Legal</option>
                          <option value="F4">F4 (Folio)</option>
                        </select>
                      </div>
                    </div>

                    {/* Margins & Zoom */}
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase">Margin</label>
                        <select 
                          value={Object.keys(MARGIN_TEMPLATES).find(key => MARGIN_TEMPLATES[key].class === styleSettings?.page?.margin) || 'normal'} 
                          onChange={(e) => setStyleSettings((prev: any) => ({ ...prev, page: { ...prev.page, margin: MARGIN_TEMPLATES[e.target.value].class } }))}
                          className="w-full bg-slate-50 border border-slate-200 text-sm rounded-xl px-3 py-2 outline-none focus:border-emerald-500"
                        >
                          {Object.entries(MARGIN_TEMPLATES).map(([key, template]: any) => (
                            <option key={key} value={key}>{template.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase">Zoom Preview</label>
                        <div className="flex items-center bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                          <button onClick={() => setZoom((z: number) => Math.max(20, z - 10))} className="p-2 hover:bg-slate-100 flex-1 flex justify-center"><Minus className="w-4 h-4" /></button>
                          <span className="w-10 text-center text-sm font-mono">{zoom}%</span>
                          <button onClick={() => setZoom((z: number) => Math.min(200, z + 10))} className="p-2 hover:bg-slate-100 flex-1 flex justify-center"><Plus className="w-4 h-4" /></button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase">Arah Baca Preview (Layar Lebar)</label>
                        <select 
                          value={styleSettings?.responsivePreview || 'two-page'} 
                          onChange={(e) => setStyleSettings((prev: any) => ({ ...prev, responsivePreview: e.target.value }))}
                          className="w-full bg-slate-50 border border-slate-200 text-sm rounded-xl px-3 py-2 outline-none focus:border-emerald-500"
                        >
                          <option value="two-page">Dua Halaman Bersebelahan (Mode Buku)</option>
                          <option value="fit">Satu Halaman Penuh Tengah (Lebar Layar)</option>
                        </select>
                    </div>

                    {/* Paper Texture Selection */}
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-slate-400 uppercase">Tekstur Kertas (Lapis Atas)</label>
                       <select 
                         value={styleSettings?.page?.texture || 'none'} 
                         onChange={(e) => setStyleSettings((prev: any) => ({ ...prev, page: { ...prev.page, texture: e.target.value } }))}
                         className="w-full bg-white border-2 border-emerald-100 text-sm rounded-xl px-3 py-2 outline-none focus:border-emerald-500 shadow-sm"
                       >
                         {Object.entries(PAGE_TEXTURES).map(([key, texture]: any) => (
                           <option key={key} value={key}>{texture.name}</option>
                         ))}
                       </select>
                       <p className="text-[10px] text-slate-400 italic px-1">Tekstur ini akan melapisi warna atau tema pilihan Anda.</p>
                    </div>

                    {/* Ink Texture Selection */}
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-emerald-600 uppercase">Gaya Tinta Teks</label>
                       <select 
                         value={styleSettings?.typography?.inkStyle || 'solid'} 
                         onChange={(e) => setStyleSettings((prev: any) => ({ 
                           ...prev, 
                           typography: { ...(prev.typography || {}), inkStyle: e.target.value } 
                         }))}
                         className="w-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl px-3 py-2 outline-none focus:border-emerald-500 shadow-sm"
                       >
                         {Object.entries(INK_STYLES).map(([key, style]: any) => (
                           <option key={key} value={key}>{style.name}</option>
                         ))}
                       </select>
                       <p className="text-[10px] text-slate-400 italic px-1 leading-relaxed">Memberikan sensasi cetakan nyata atau kertas usang pada tulisan Latin dan Arab. <strong className="text-emerald-500">Berfungsi paling baik dengan tekstur kertas.</strong></p>
                    </div>

                    {/* Jarak Paragraf Global (Layout) */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase">Jarak Antar Paragraf (Global)</label>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <span className="text-[10px] text-slate-400">Latin</span>
                          <select 
                            value={styleSettings?.latin?.paragraphSpacing || 'mb-4'} 
                            onChange={(e) => setStyleSettings((prev: any) => ({ ...prev, latin: { ...prev.latin, paragraphSpacing: e.target.value } }))}
                            className="w-full bg-slate-50 border border-slate-200 text-sm rounded-xl px-3 py-2 outline-none focus:border-emerald-500"
                          >
                            <option value="mb-0">Tanpa Jarak</option>
                            <option value="mb-2">Rapat</option>
                            <option value="mb-4">Normal</option>
                            <option value="mb-6">Renggang</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] text-emerald-600">Arab</span>
                          <select 
                            value={styleSettings?.arabic?.paragraphSpacing || 'mb-6'} 
                            onChange={(e) => setStyleSettings((prev: any) => ({ ...prev, arabic: { ...prev.arabic, paragraphSpacing: e.target.value } }))}
                            className="w-full bg-emerald-50 border border-emerald-200 text-sm rounded-xl px-3 py-2 outline-none focus:border-emerald-500"
                          >
                            <option value="mb-0">Tanpa Jarak</option>
                            <option value="mb-2">Rapat</option>
                            <option value="mb-4">Normal</option>
                            <option value="mb-6">Renggang</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Gradient check intentionally removed to fix visual bugs */}
                    <div className="space-y-4 pt-4 border-t border-slate-100">
                      <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-400 uppercase">Warna Kertas</label>
                          <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200">
                            <input 
                              type="color" 
                              value={styleSettings?.page?.backgroundColor || '#ffffff'} 
                              onChange={(e) => setStyleSettings((prev: any) => ({ ...prev, page: { ...prev.page, backgroundColor: e.target.value } }))}
                              className="w-8 h-8 rounded-lg border-0 p-0 cursor-pointer"
                            />
                            <span className="text-[10px] font-mono text-slate-500 uppercase flex-1">{styleSettings?.page?.backgroundColor || '#ffffff'}</span>
                            {styleSettings?.page?.backgroundColor && (
                              <button onClick={() => setStyleSettings((prev: any) => ({ ...prev, page: { ...prev.page, backgroundColor: undefined } }))} className="p-1 text-slate-300 hover:text-red-500">
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-400 uppercase">Warna Bingkai</label>
                          <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200">
                            <input 
                              type="color" 
                              value={styleSettings?.page?.borderColor || '#000000'} 
                              onChange={(e) => setStyleSettings((prev: any) => ({ ...prev, page: { ...prev.page, borderColor: e.target.value } }))}
                              className="w-8 h-8 rounded-lg border-0 p-0 cursor-pointer"
                            />
                            <span className="text-[10px] font-mono text-slate-500 uppercase flex-1">{styleSettings?.page?.borderColor || '#000000'}</span>
                            {styleSettings?.page?.borderColor && (
                              <button onClick={() => setStyleSettings((prev: any) => ({ ...prev, page: { ...prev.page, borderColor: undefined } }))} className="p-1 text-slate-300 hover:text-red-500">
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase">Palet Kertas Populer</label>
                        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                          {[
                            { bg: '#ffffff', border: '#e2e8f0', name: 'Putih Bersih' },
                            { bg: '#fdf6e3', border: '#eee8d5', name: 'Solarized Light' },
                            { bg: '#fef3c7', border: '#f59e0b', name: 'Kertas Tua' },
                            { bg: '#ecfdf5', border: '#10b981', name: 'Hijau Islami' },
                            { bg: '#eff6ff', border: '#3b82f6', name: 'Biru Lembut' },
                            { bg: '#fff7ed', border: '#f97316', name: 'Krim Hangat' },
                            { bg: '#fafafa', border: '#262626', name: 'Minimalis' },
                            { bg: '#1e293b', border: '#334155', name: 'Mode Gelap' },
                          ].map((palette) => (
                            <button
                              key={palette.bg}
                              onClick={() => {
                                setStyleSettings((prev: any) => ({ 
                                  ...prev, 
                                  page: { ...prev.page, backgroundColor: palette.bg, borderColor: palette.border } 
                                }));
                                if (smartMatching) {
                                  const isDark = palette.bg === '#1e293b' || palette.bg === '#262626';
                                  setStyleSettings((prev: any) => ({
                                    ...prev,
                                    latin: { ...prev.latin, color: isDark ? '#f8fafc' : '#1e293b' },
                                    arabic: { ...prev.arabic, color: isDark ? '#34d399' : '#047857' }
                                  }));
                                }
                              }}
                              className={`flex-shrink-0 w-12 h-12 rounded-xl border-2 transition-all active:scale-95 ${styleSettings?.page?.backgroundColor === palette.bg ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200'}`}
                              style={{ backgroundColor: palette.bg }}
                              title={palette.name}
                            >
                              <div className="w-full h-2 rounded-t-lg" style={{ backgroundColor: palette.border }} />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Decoration Opacity & Paragraph Spacing */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase">Intensitas Ornamen</label>
                        <input 
                          type="range" 
                          min="0" 
                          max="1" 
                          step="0.05" 
                          value={styleSettings?.page?.decorationOpacity ?? 0.1} 
                          onChange={(e) => setStyleSettings((prev: any) => ({ ...prev, page: { ...prev.page, decorationOpacity: parseFloat(e.target.value) } }))}
                          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase">Jarak Paragraf</label>
                        <select 
                          value={styleSettings?.page?.paragraphSpacing || 'mb-2'} 
                          onChange={(e) => setStyleSettings((prev: any) => ({ ...prev, page: { ...prev.page, paragraphSpacing: e.target.value } }))}
                          className="w-full bg-slate-50 border border-slate-200 text-sm rounded-xl px-3 py-2 outline-none focus:border-emerald-500"
                        >
                          <option value="mb-2">Rapat</option>
                          <option value="mb-4">Normal</option>
                          <option value="mb-6">Renggang</option>
                          <option value="mb-8">Sangat Renggang</option>
                        </select>
                      </div>
                    </div>

                    {/* Fold Lines Toggle */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600">
                          <AlignJustify className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-700">Garis Lipat</div>
                          <div className="text-[10px] text-slate-500">Tampilkan panduan lipatan kertas</div>
                        </div>
                      </div>
                      <button 
                        onClick={() => setStyleSettings((prev: any) => ({ ...prev, page: { ...prev.page, foldLines: !prev.page.foldLines } }))}
                        className={`w-12 h-6 rounded-full transition-colors relative ${styleSettings?.page?.foldLines ? 'bg-emerald-500' : 'bg-slate-300'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${styleSettings?.page?.foldLines ? 'left-7' : 'left-1'}`} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Smart History Modal */}
      <AnimatePresence>
        {showHistoryModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm"
            onClick={() => setShowHistoryModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <History className="w-4 h-4 text-emerald-600" />
                  Riwayat Perubahan
                </h3>
                <button onClick={() => setShowHistoryModal(false)} className="p-1 hover:bg-slate-200 rounded-full">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {undoStack.length === 0 ? (
                  <div className="text-center py-10 text-slate-400">
                    <History className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">Belum ada riwayat perubahan.</p>
                  </div>
                ) : (
                  [...undoStack].reverse().map((item, index) => (
                    <button
                      key={item.timestamp}
                      onClick={() => jumpToHistory(undoStack.length - 1 - index)}
                      className="w-full text-left p-3 rounded-xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50 transition-all group"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-700 text-sm">{item.action}</span>
                        <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-2 font-mono bg-white/50 p-1 rounded">
                        {item.content.substring(0, 100)}...
                      </p>
                      <div className="mt-2 text-[10px] text-emerald-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        Klik untuk memulihkan versi ini
                      </div>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <DownloadModal 
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
        content={result}
        title={tema || "Naskah Khotbah"}
        elementRef={contentRef}
        paperSize={paperSize}
        terjemahanMukadimah={terjemahanMukadimah}
        latinMukadimah={latinMukadimah}
        userProfile={userProfile}
        coverData={coverData}
      />
    </motion.div>
  );
};

export const SettingsScreen = ({ 
  apiKey, setApiKey, apiKeyType, customBaseUrl, setCustomBaseUrl, sunnahKey, setSunnahKey, 
  userProfile, setUserProfile, 
  selectedModel, setSelectedModel,
  customModelId, setCustomModelId,
  scannedModels, setScannedModels,
  manualModels, setManualModels,
  styleSettings, setStyleSettings,
  clearAllHistory, onOpenApiKeyModal 
}: any) => {
  const [showKey, setShowKey] = useState(false);
  const [showSunnahKey, setShowSunnahKey] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testError, setTestError] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Manual Model Form State
  const [manualName, setManualName] = useState('');
  const [manualId, setManualId] = useState('');

  const handleAddManualModel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName || !manualId) return;
    
    if (manualModels.some((m: any) => m.id === manualId)) {
       alert("Model ID sudah ada!");
       return;
    }

    const newModel = { 
      id: manualId, 
      name: manualName, 
      provider: 'Custom',
      description: 'Model yang ditambahkan secara manual' 
    };

    setManualModels([...manualModels, newModel]);
    setManualName('');
    setManualId('');
  };

  const handleRemoveManualModel = (id: string) => {
    setManualModels(manualModels.filter((m: any) => m.id !== id));
  };

  const handleScanModels = async () => {
    if (!apiKey) {
      setScanStatus('error');
      setTestError('API Key belum diisi. Silakan isi API Key di bawah terlebih dahulu.');
      return;
    }

    setIsScanning(true);
    setScanStatus('idle');
    setTestError('');

    try {
      if (apiKeyType === 'google' && !customBaseUrl) {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.list();
        
        const models = [];
        for await (const m of response) {
          const model = m as any;
          if (model.supportedMethods?.includes('generateContent')) {
            const id = model.name.replace('models/', '');
            if (id.toLowerCase().includes('gemma')) {
              models.push({
                id: id,
                name: model.displayName || id,
                description: model.description || 'Model AI dari Google'
              });
            }
          }
        }
        setScannedModels(models);
      } else {
        const baseUrl = customBaseUrl ? customBaseUrl.replace(/\/+$/, '') : 'https://api.openai.com/v1';
        const response = await fetch(`${baseUrl}/models`, {
          headers: {
            'Authorization': `Bearer ${apiKey}`
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch models: ${response.statusText}`);
        }
        
        const data = await response.json();
        const models = data.data.map((m: any) => ({
          id: m.id,
          name: m.id,
          description: `Model dari ${m.owned_by || 'Provider Custom'}`
        }));
        
        setScannedModels(models);
      }
      
      setScanStatus('success');
      setTimeout(() => setScanStatus('idle'), 3000);
    } catch (err: any) {
      console.error("Model scan failed:", err);
      setScanStatus('error');
      setTestError(err.message || 'Gagal memindai model. Pastikan API Key benar.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleTestModel = async () => {
    const modelToTest = customModelId.trim() || selectedModel;
    if (!apiKey) {
      setTestStatus('error');
      setTestError('API Key belum diisi. Silakan isi API Key di bawah terlebih dahulu.');
      return;
    }

    setTestStatus('testing');
    setTestError('');

    try {
      if (apiKeyType === 'google' && !customBaseUrl) {
        const ai = new GoogleGenAI({ apiKey });
        // Use a very simple prompt to test connection
        const response = await ai.models.generateContent({
          model: modelToTest,
          contents: "Test connection. Respond with only 'OK'.",
        });
        
        if (response.text) {
          setTestStatus('success');
          // Reset status after 5 seconds
          setTimeout(() => setTestStatus('idle'), 5000);
        } else {
          throw new Error('Tidak ada respon teks dari model.');
        }
      } else {
        const baseUrl = customBaseUrl ? customBaseUrl.replace(/\/+$/, '') : 'https://api.openai.com/v1';
        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: modelToTest,
            messages: [{ role: 'user', content: "Test connection. Respond with only 'OK'." }],
            max_tokens: 5
          })
        });
        
        if (!response.ok) {
          throw new Error('Gagal terhubung ke provider custom (Cek endpoint url/key)');
        }
        setTestStatus('success');
        setTimeout(() => setTestStatus('idle'), 5000);
      }
    } catch (err: any) {
      console.error("Model test failed:", err);
      setTestStatus('error');
      
      let msg = err.message || 'Gagal terhubung ke model.';
      if (msg.includes('404')) msg = `Model ID "${modelToTest}" tidak ditemukan. Pastikan ID benar.`;
      if (msg.includes('403')) msg = 'API Key tidak valid atau tidak memiliki akses ke model ini.';
      if (msg.includes('429')) msg = 'Terlalu banyak permintaan (Rate limit).';
      
      setTestError(msg);
    }
  };

  const handleDeleteClick = () => {
    if (confirmDelete) {
      clearAllHistory();
      setConfirmDelete(false);
    } else {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
    }
  };

  return (
    <div className="pb-24 pt-4 px-4 h-full overflow-y-auto touch-scroll">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Pengaturan</h1>
      
      <div className="space-y-6">
        {/* User Profile Section */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
              <User className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Profil Penceramah</h3>
              <p className="text-xs text-slate-500">Personalisasi naskah Anda</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Nama Lengkap & Gelar</label>
              <input
                type="text"
                key={userProfile.name}
                defaultValue={userProfile.name}
                onBlur={(e) => setUserProfile({...userProfile, name: e.target.value})}
                placeholder="Contoh: Ustadz Fulan, Lc."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Afiliasi / Masjid</label>
              <input
                type="text"
                key={userProfile.mosque}
                defaultValue={userProfile.mosque}
                onBlur={(e) => setUserProfile({...userProfile, mosque: e.target.value})}
                placeholder="Contoh: Masjid Al-Hikmah"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Kota Domisili</label>
              <input
                type="text"
                key={userProfile.city}
                defaultValue={userProfile.city}
                onBlur={(e) => setUserProfile({...userProfile, city: e.target.value})}
                placeholder="Contoh: Jakarta Selatan"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Model Selection Section */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
              <Brain className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Konfigurasi Model AI</h3>
              <p className="text-xs text-slate-500">Pilih model untuk tugas spesifik</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Model Utama</label>
                <button
                  onClick={handleScanModels}
                  disabled={isScanning}
                  className={`text-[10px] font-bold flex items-center gap-1 px-2 py-1 rounded-md transition-all ${
                    scanStatus === 'success' ? 'bg-emerald-500 text-white' :
                    scanStatus === 'error' ? 'bg-rose-500 text-white' :
                    'bg-indigo-50 text-indigo-600 hover:bg-indigo-700 hover:text-white'
                  }`}
                >
                  {isScanning ? <Loader2 className="w-3 h-3 animate-spin" /> : 
                   scanStatus === 'success' ? <Check className="w-3 h-3" /> :
                   scanStatus === 'error' ? <X className="w-3 h-3" /> :
                   <Search className="w-3 h-3" />}
                  {isScanning ? 'Memindai...' : 
                   scanStatus === 'success' ? 'Selesai!' :
                   scanStatus === 'error' ? 'Gagal' :
                   'Pindai Model Baru'}
                </button>
              </div>
              
              <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                {/* Preset Models */}
                {AVAILABLE_MODELS.map((model: any) => (
                  <button
                    key={model.id}
                    onClick={() => {
                      setSelectedModel(model.id);
                      setCustomModelId(''); // Clear custom if selecting preset
                    }}
                    className={`flex flex-col p-3 rounded-xl border text-left transition-all ${
                      selectedModel === model.id && !customModelId
                        ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500'
                        : 'border-slate-200 bg-slate-50 hover:border-emerald-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-800">{model.name}</span>
                      <span className="text-[8px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-bold uppercase">Preset</span>
                    </div>
                    <span className="text-[10px] text-slate-500">{model.description}</span>
                  </button>
                ))}

                {/* Scanned Models */}
                {scannedModels.length > 0 ? (
                  <div className="pt-2 border-t border-slate-100 mt-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Model Terdeteksi di Akun Anda</p>
                    <div className="space-y-2">
                      {scannedModels.filter(m => !AVAILABLE_MODELS.some(am => am.id === m.id)).length > 0 ? (
                        scannedModels.filter(m => !AVAILABLE_MODELS.some(am => am.id === m.id)).map((model: any) => (
                          <button
                            key={model.id}
                            onClick={() => {
                              setSelectedModel(model.id);
                              setCustomModelId('');
                            }}
                            className={`flex flex-col p-3 rounded-xl border text-left transition-all w-full ${
                              selectedModel === model.id
                                ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500'
                                : 'border-slate-200 bg-slate-50 hover:border-indigo-300'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-bold text-slate-800">{model.name}</span>
                              <span className="text-[8px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded font-bold uppercase">Auto-Detected</span>
                            </div>
                            <span className="text-[10px] text-slate-500 truncate">{model.id}</span>
                          </button>
                        ))
                      ) : (
                        <div className="p-3 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center">
                          <p className="text-[10px] text-slate-400 italic">Semua model yang ditemukan sudah ada di daftar Preset.</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : scanStatus === 'success' && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center mt-2">
                    <p className="text-[10px] text-slate-400 italic">Tidak ada model tambahan yang ditemukan di akun Anda.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Manual Models List */}
            {manualModels.length > 0 && (
              <div className="pt-2 border-t border-slate-100 mt-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Model Kustom Anda</p>
                <div className="space-y-2">
                  {manualModels.map((model: any) => (
                    <div key={model.id} className="relative group">
                      <button
                        onClick={() => {
                          setSelectedModel(model.id);
                          setCustomModelId('');
                        }}
                        className={`flex flex-col p-3 rounded-xl border text-left transition-all w-full ${
                          selectedModel === model.id && !customModelId
                            ? 'border-amber-500 bg-amber-50 ring-1 ring-amber-500'
                            : 'border-slate-200 bg-slate-50 hover:border-amber-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-slate-800">{model.name}</span>
                          <span className="text-[8px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded font-bold uppercase">Manual</span>
                        </div>
                        <span className="text-[10px] text-slate-500 truncate">{model.id}</span>
                      </button>
                      <button 
                        onClick={() => handleRemoveManualModel(model.id)}
                        className="absolute top-2 right-2 p-1 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add Manual Model Form */}
            <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tambah Model Manual</label>
                <button
                  onClick={handleAddManualModel}
                  className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-1 rounded hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                >
                  Simpan Model
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <input
                    type="text"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    placeholder="Nama (e.g. My AI)"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[10px] text-slate-700 outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <input
                    type="text"
                    value={manualId}
                    onChange={(e) => setManualId(e.target.value)}
                    placeholder="ID (e.g. gpt-4)"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[10px] font-mono text-slate-700 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Custom Model ID</label>
                <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">Lanjutan</span>
              </div>
              <input
                type="text"
                key={customModelId}
                defaultValue={customModelId}
                onBlur={(e) => setCustomModelId(e.target.value)}
                placeholder="Contoh: gemini-4-ultra-latest"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono text-slate-700 outline-none focus:border-amber-500"
              />
              <p className="text-[10px] text-slate-400 italic">
                *Gunakan ini jika model baru dirilis oleh Google dan belum ada di daftar di atas.
              </p>

              <div className="flex flex-col gap-2 mt-2">
                <button
                  onClick={handleTestModel}
                  disabled={testStatus === 'testing'}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                    testStatus === 'testing' ? 'bg-slate-100 text-slate-400 cursor-not-allowed' :
                    testStatus === 'success' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' :
                    testStatus === 'error' ? 'bg-rose-500 text-white shadow-lg shadow-rose-200' :
                    'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200'
                  }`}
                >
                  {testStatus === 'testing' ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Sedang Menguji Koneksi...
                    </>
                  ) : testStatus === 'success' ? (
                    <>
                      <CheckCircle2 className="w-3 h-3" />
                      Model Terverifikasi!
                    </>
                  ) : testStatus === 'error' ? (
                    <>
                      <AlertCircle className="w-3 h-3" />
                      Gagal: Coba Lagi
                    </>
                  ) : (
                    <>
                      <Activity className="w-3 h-3" />
                      Uji Validitas Model
                    </>
                  )}
                </button>

                {testStatus === 'error' && testError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-[10px] text-rose-600 font-medium leading-relaxed">
                    <div className="font-bold flex items-center gap-1 mb-1">
                      <AlertCircle className="w-3 h-3" /> ERROR KONEKSI
                    </div>
                    {testError}
                  </div>
                )}
                
                {testStatus === 'success' && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-[10px] text-emerald-600 font-medium leading-relaxed">
                    <div className="font-bold flex items-center gap-1 mb-1">
                      <CheckCircle2 className="w-3 h-3" /> BERHASIL
                    </div>
                    Koneksi ke model <strong>{customModelId || selectedModel}</strong> berhasil! Model ini siap digunakan untuk membuat naskah.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* API Key Section */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center">
              <Key className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Kunci & Konfigurasi API</h3>
              <p className="text-xs text-slate-500">Gunakan API Key dan Endpoint kustom Anda</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Base URL (Optional) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Custom Base URL (Opsional)
                </label>
                <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold">OpenRouter / Groq / Dll</span>
              </div>
              <input
                type="text"
                value={customBaseUrl}
                onChange={(e) => setCustomBaseUrl(e.target.value)}
                placeholder="Contoh: https://openrouter.ai/api/v1"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
              />
              <p className="text-[10px] text-slate-400 italic">Lewati jika menggunakan Gemini bawaan Google.</p>
            </div>

            {/* Main AI Key */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                API Key
              </label>
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Tempel API Key di sini..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-12 py-3 text-sm font-mono text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                />
                <button 
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <button 
                onClick={onOpenApiKeyModal}
                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded-md transition-colors w-fit"
              >
                <Info className="w-3 h-3" /> Cara mendapatkan API Key?
              </button>
              
              {apiKey && (
                <div className={`flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg ${
                  apiKeyType !== 'unknown' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                }`}>
                  {apiKeyType !== 'unknown' ? (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      Terdeteksi: {apiKeyType.toUpperCase()}
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4" />
                      Tipe tidak dikenali (Akan dicoba sebagai OpenAI-compatible)
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Sunnah API Key (New) */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <BookOpen className="w-3 h-3" />
                API Key Kitab Sunnah (Premium)
              </label>
              <div className="relative">
                <input
                  type={showSunnahKey ? "text" : "password"}
                  value={sunnahKey}
                  onChange={(e) => setSunnahKey(e.target.value)}
                  placeholder="Tempel Key Kitab Sunnah..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-12 py-3 text-sm font-mono text-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                />
                <button 
                  onClick={() => setShowSunnahKey(!showSunnahKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showSunnahKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-slate-400">
                Masukkan kunci akses khusus untuk membuka fitur pencarian Hadits Semesta (Kutubus Sittah).
              </p>
            </div>
          </div>
        </div>

        {/* Reading Mode Section */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Mode Membaca</h3>
              <p className="text-xs text-slate-500">Sesuaikan kenyamanan membaca</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Margin Samping Teks</label>
                <span className="text-xs font-bold text-slate-700">{styleSettings.latin.textMargin}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="80"
                step="4"
                value={styleSettings.latin.textMargin}
                onChange={(e) => setStyleSettings({
                  ...styleSettings,
                  latin: { ...styleSettings.latin, textMargin: parseInt(e.target.value) }
                })}
                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase">
                <span>Rapat</span>
                <span>Lebar</span>
              </div>
              <p className="text-[10px] text-slate-400 italic">
                *Mengatur jarak teks dari tepi layar untuk kenyamanan mata saat berkhutbah.
              </p>
            </div>
          </div>
        </div>

        {/* Data Management */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Manajemen Data</h3>
              <p className="text-xs text-slate-500">Hapus atau reset data aplikasi</p>
            </div>
          </div>
          
          <button 
            onClick={handleDeleteClick}
            className={`w-full py-3 border rounded-xl font-medium transition-colors flex items-center justify-center gap-2 ${
              confirmDelete 
                ? 'bg-red-600 text-white border-red-600 hover:bg-red-700' 
                : 'border-red-200 text-red-600 hover:bg-red-50'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            {confirmDelete ? 'Klik Lagi Untuk Konfirmasi Hapus' : 'Hapus Semua Riwayat Naskah'}
          </button>
        </div>

        {/* About App */}
        <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-200 text-center space-y-2 mb-8 shadow-sm">
          <p className="text-xs font-bold text-emerald-500 uppercase tracking-wider">Versi Aplikasi Sistem</p>
          <p className="text-sm font-extrabold text-emerald-800">Mimbar AI v0.3.1 (NATIVE BUILD)</p>
          <p className="text-[10px] text-emerald-600">Dibuat dengan ❤️ untuk Membantu Dakwah</p>
          <p className="text-[9px] text-emerald-500 italic mt-2 border-t border-emerald-100 pt-2">Hard Reset Cache Aktif (v0.3.1).</p>
        </div>
      </div>
    </div>
  );
};
