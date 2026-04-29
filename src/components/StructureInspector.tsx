import React, { useMemo } from 'react';
import { 
  X, CheckCircle2, AlertCircle, Clock, BookOpen, ScrollText, CornerDownRight, MoveRight, Layers 
} from 'lucide-react';
import { motion } from 'motion/react';

interface StructureInspectorProps {
  content: string;
  onUpdate: (newContent: string) => void;
  apiKey: string;
  onClose: () => void;
  tema: string;
  onJumpTo?: (index: number) => void;
}

type NodeType = 'rukun' | 'materi' | 'dalil' | 'transisi';

interface NodeItem {
  id: string;
  type: NodeType;
  title: string;
  timeLabel: string;
  wordCount: number;
  charIndex: number;
  subItems?: string[];
}

export const StructureInspector: React.FC<StructureInspectorProps> = ({ 
  content, onClose, onJumpTo 
}) => {

  const analysis = useMemo(() => {
    const nodes: NodeItem[] = [];
    
    let hasHamdalah = false;
    let hasShalawat = false;
    let hasWasiat = false;
    let hasDoaMuslimin = false;
    let hasDalil = false;

    let currentIndex = 0;
    let currentGroup: NodeItem = {
       id: 'start', type: 'materi', title: 'Materi Pembuka',
       charIndex: 0, wordCount: 0, timeLabel: ''
    };
    let totalWords = 0;

    const pushGroup = () => {
       if (currentGroup && currentGroup.wordCount > 0 || currentGroup.title.includes('Khotbah') || currentGroup.title.includes('Penutup')) {
           nodes.push({...currentGroup});
       }
    };

    const rawLines = content.split('\n');
    rawLines.forEach((line, i) => {
        const lineStart = currentIndex;
        currentIndex += line.length + 1; // +1 for \n
        
        const words = line.trim().split(/\s+/).filter(w => w.length > 0).length;
        totalWords += words;
        currentGroup.wordCount += words;
        
        // Rukun Templates
        if (line.includes('[TEMPLATE_MUKADIMAH_1]') || line.includes('[TEMPLATE_MUKADIMAH_SUNNAH_1]')) {
            pushGroup();
            currentGroup = {
               id: `mukadimah-1-${i}`,
               type: 'rukun',
               title: 'Mukadimah Khotbah Pertama',
               charIndex: lineStart,
               wordCount: 0, timeLabel: '',
               subItems: ['Hamdalah & Pujian', 'Syahadatain', 'Shalawat', 'Wasiat Taqwa']
            };
            hasHamdalah = true;
            hasShalawat = true;
            hasWasiat = true;
            hasDalil = true; 
        } 
        else if (line.includes('[TEMPLATE_PENUTUP_1]')) {
            pushGroup();
            currentGroup = {
               id: `penutup-1-${i}`,
               type: 'transisi',
               title: 'Penutup & Duduk Sejenak',
               charIndex: lineStart,
               wordCount: 0, timeLabel: '',
               subItems: ['Doa Ampunan', 'Jeda Transisi Duduk']
            };
        } 
        else if (line.includes('[TEMPLATE_MUKADIMAH_2]') || line.includes('[TEMPLATE_MUKADIMAH_SUNNAH_2]')) {
            pushGroup();
            currentGroup = {
               id: `mukadimah-2-${i}`,
               type: 'rukun',
               title: 'Khotbah Kedua & Doa Wajib',
               charIndex: lineStart,
               wordCount: 0, timeLabel: '',
               subItems: ['Hamdalah & Shalawat Kedua', 'Kewajiban Shalawat', 'Doa Untuk Muslimin', 'Doa Tematik']
            };
            hasHamdalah = true;
            hasShalawat = true;
            hasDoaMuslimin = true;
        } 
        else if (line.includes('[TEMPLATE_PENUTUP_2]') || line.includes('[TEMPLATE_PENUTUP_SUNNAH_2]')) {
            // Append to previous if it's khotbah 2
            if (currentGroup.id.startsWith('mukadimah-2')) {
                currentGroup.subItems?.push('Doa Palestina/Pemimpin', 'Doa Kebaikan Akhirat', 'Ibadallah & Seruan Shalat');
            } else {
                pushGroup();
                currentGroup = {
                   id: `penutup-2-${i}`,
                   type: 'rukun',
                   title: 'Doa Penutup Akhir',
                   charIndex: lineStart,
                   wordCount: 0, timeLabel: '',
                   subItems: ['Doa Kebaikan Akhirat', 'Ibadallah', 'Dzikir']
                };
            }
        }
        // Headings
        else if (/^(#{1,3})\s+(.*)/.test(line.trim())) {
            const match = line.trim().match(/^(#{1,3})\s+(.*)/);
            if (match) {
                pushGroup();
                const headingTitle = match[2].replace(/\*/g,'').trim();
                currentGroup = {
                   id: `materi-${i}`,
                   type: 'materi',
                   title: `Materi: ${headingTitle.substring(0, 40)}${headingTitle.length > 40 ? '...' : ''}`,
                   charIndex: lineStart,
                   wordCount: 0, timeLabel: '',
                };
            }
        }
        // Dalil blocks
        else if (line.includes('```arabic') || /[\u0600-\u06FF]{15,}/.test(line)) {
            hasDalil = true;
            if (currentGroup.type !== 'rukun' && currentGroup.type !== 'dalil') {
                pushGroup();
                currentGroup = {
                   id: `dalil-${i}`,
                   type: 'dalil',
                   title: `Dalil Penguat (Ayat/Hadits)`,
                   charIndex: lineStart,
                   wordCount: 0, timeLabel: '',
                };
            }
        }
    });

    pushGroup();

    // Remove empty 'Pendahuluan'
    const filteredNodes = nodes.filter(n => !(n.id === 'start' && n.wordCount < 10));

    // Calculate time estimates
    let totalTime = 0;
    filteredNodes.forEach(n => {
       // Assuming 130 words per minute average speaking rate
       // For rukun templates, we add hardcoded approximations because the raw template string is only 1-2 words.
       let effectiveWords = n.wordCount;
       if (n.type === 'rukun' && n.id.includes('mukadimah')) effectiveWords += 150; // Template text approx words
       if (n.type === 'rukun' && n.id.includes('penutup')) effectiveWords += 120;
       if (n.type === 'transisi') effectiveWords += 40;
       
       const mins = Math.max(0.5, Math.ceil((effectiveWords / 130) * 10) / 10);
       n.timeLabel = `~${mins} mnt`;
       totalTime += mins;
    });

    const isSah = hasHamdalah && hasShalawat && hasWasiat && hasDoaMuslimin && hasDalil;

    return {
        nodes: filteredNodes,
        validation: { hasHamdalah, hasShalawat, hasWasiat, hasDoaMuslimin, hasDalil, isSah },
        totalWords,
        totalTime: totalTime.toFixed(1)
    };
  }, [content]);

  return (
    <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden">
      {/* Header */}
      <header className="bg-white px-5 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
           <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
              <Layers className="w-5 h-5" />
           </div>
           <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">Peta Naskah</h3>
              <p className="text-[11px] text-slate-500 font-medium">Navigasi Vertikal & Validasi Rukun</p>
           </div>
        </div>
        <button onClick={onClose} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto custom-scrollbar p-5 pb-20">
         {/* Diagnostic Validator */}
         <div className={`mb-8 p-5 rounded-2xl border ${analysis.validation.isSah ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
             <div className="flex items-start gap-4">
                 <div className={`p-2 rounded-xl mt-1 shrink-0 ${analysis.validation.isSah ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                    {analysis.validation.isSah ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                 </div>
                 <div className="flex-1">
                     <h4 className={`text-sm font-bold ${analysis.validation.isSah ? 'text-emerald-900' : 'text-red-900'}`}>
                         {analysis.validation.isSah ? 'Syarat Sah Khotbah Terpenuhi' : 'Peringatan: Khotbah Mungkin Tidak Sah'}
                     </h4>
                     <p className={`text-xs mt-1 font-medium ${analysis.validation.isSah ? 'text-emerald-700' : 'text-red-700'}`}>
                         {analysis.validation.isSah 
                           ? `Seluruh rukun wajib khotbah terdeteksi dari struktur template dan naskah.`
                           : `Ada rukun wajib yang hilang. Pastikan Anda menyisipkan template atau menggeser struktur dengan benar.`}
                     </p>
                     
                     <div className="mt-4 grid grid-cols-2 gap-2 text-[10px] font-bold uppercase tracking-wider">
                         <div className={`flex items-center gap-1.5 ${analysis.validation.hasHamdalah ? 'text-emerald-600' : 'text-red-500'}`}>
                            {analysis.validation.hasHamdalah ? <CheckCircle2 className="w-3 h-3"/> : <X className="w-3 h-3"/>} Puji Hamdalah
                         </div>
                         <div className={`flex items-center gap-1.5 ${analysis.validation.hasShalawat ? 'text-emerald-600' : 'text-red-500'}`}>
                            {analysis.validation.hasShalawat ? <CheckCircle2 className="w-3 h-3"/> : <X className="w-3 h-3"/>} Shalawat Nabi
                         </div>
                         <div className={`flex items-center gap-1.5 ${analysis.validation.hasWasiat ? 'text-emerald-600' : 'text-red-500'}`}>
                            {analysis.validation.hasWasiat ? <CheckCircle2 className="w-3 h-3"/> : <X className="w-3 h-3"/>} Wasiat Taqwa
                         </div>
                         <div className={`flex items-center gap-1.5 ${analysis.validation.hasDoaMuslimin ? 'text-emerald-600' : 'text-red-500'}`}>
                            {analysis.validation.hasDoaMuslimin ? <CheckCircle2 className="w-3 h-3"/> : <X className="w-3 h-3"/>} Doa Muslimin
                         </div>
                         <div className={`flex items-center gap-1.5 ${analysis.validation.hasDalil ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {analysis.validation.hasDalil ? <CheckCircle2 className="w-3 h-3"/> : <AlertCircle className="w-3 h-3 text-amber-500"/>} Ayat Al-Quran
                         </div>
                     </div>
                 </div>
             </div>
         </div>

         {/* Density & Time Indicator */}
         <div className="flex gap-4 mb-8">
            <div className="flex-1 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-2 text-indigo-600">
                    <Clock className="w-4 h-4" />
                    <span className="text-[11px] font-bold uppercase tracking-wider">Estimasi Waktu</span>
                </div>
                <span className="text-xl font-black text-slate-800">{analysis.totalTime}<span className="text-sm text-slate-400 font-bold ml-1">Mnt</span></span>
            </div>
            <div className="flex-1 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-2 text-indigo-600">
                    <ScrollText className="w-4 h-4" />
                    <span className="text-[11px] font-bold uppercase tracking-wider">Bobot Kata</span>
                </div>
                <span className="text-xl font-black text-slate-800">{analysis.totalWords}<span className="text-sm text-slate-400 font-bold ml-1">Kata</span></span>
            </div>
         </div>

         {/* Vertical Timeline Stepper */}
         <div className="relative pl-4 overflow-visible pb-10">
             {/* The solid vertical line */}
             <div className="absolute left-[35px] top-6 bottom-0 w-0.5 bg-slate-200"></div>

             {analysis.nodes.map((node, i) => {
                 let NodeIcon = BookOpen;
                 let iconBg = 'bg-white text-slate-400 border-slate-200';
                 
                 if (node.type === 'rukun') {
                     NodeIcon = CheckCircle2;
                     iconBg = 'bg-amber-50 text-amber-500 border-amber-200 shadow-sm';
                 } else if (node.type === 'transisi') {
                     NodeIcon = CornerDownRight;
                     iconBg = 'bg-slate-100 text-slate-500 border-slate-300';
                 } else if (node.type === 'dalil') {
                     NodeIcon = ScrollText;
                     iconBg = 'bg-emerald-50 text-emerald-500 border-emerald-200';
                 } else {
                     NodeIcon = BookOpen;
                     iconBg = 'bg-indigo-50 text-indigo-500 border-indigo-200';
                 }

                 return (
                     <div key={node.id} className="relative flex items-start group mb-8">
                         {/* Connector Node */}
                         <div className={`relative z-10 w-10 h-10 rounded-full border-2 flex items-center justify-center shrink-0 ${iconBg} group-hover:scale-110 transition-transform cursor-pointer`}
                              onClick={() => onJumpTo && onJumpTo(node.charIndex)}>
                            <NodeIcon className="w-4 h-4 ml-[1px]" />
                         </div>

                         {/* Content Card */}
                         <div className="ml-5 flex-1 cursor-pointer" onClick={() => onJumpTo && onJumpTo(node.charIndex)}>
                            <div className="flex justify-between items-end mb-1">
                                <h5 className={`font-bold text-sm ${node.type === 'rukun' ? 'text-amber-700' : 'text-slate-800'} group-hover:text-indigo-600 transition-colors flex items-center gap-2`}>
                                    {node.title} 
                                    <MoveRight className="w-3 h-3 opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                                </h5>
                                <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-100 shrink-0">
                                    {node.timeLabel}
                                </span>
                            </div>
                            
                            {node.subItems && (
                                <ul className="mt-2 space-y-1">
                                    {node.subItems.map((sub, idx) => (
                                        <li key={idx} className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                                            <span className="w-1.5 h-1.5 rounded-full bg-slate-200"></span> {sub}
                                        </li>
                                    ))}
                                </ul>
                            )}
                         </div>
                     </div>
                 );
             })}
         </div>

      </main>
    </div>
  );
};
