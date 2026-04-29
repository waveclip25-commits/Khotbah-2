import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Printer, FileText, FileCode, Image as ImageIcon, Share2, Check, Download, X, MessageCircle, Settings2, FolderArchive } from 'lucide-react';
import { toCanvas } from 'html-to-image';
import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import { jsPDF } from 'jspdf';
import html2pdf from 'html2pdf.js';
import { pdf, Font } from '@react-pdf/renderer';
import { ProfessionalPDF } from './ProfessionalPDF';
import { processTemplateMarkersForText } from '../utils/templateEngine';
import { getCachedFont } from '../utils/fontCache';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { processArabicText } from '../utils/arabicUtils';

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  title: string;
  elementRef: React.RefObject<HTMLElement>; // The element to capture for Image/PDF
  paperSize: string;
  terjemahanMukadimah?: boolean;
  latinMukadimah?: boolean;
  userProfile?: any;
  coverData?: any;
}

type DownloadFormat = 'txt' | 'md' | 'png' | 'print' | 'docx' | 'pdf' | 'pdf_pro' | 'pdf_direct';

export const DownloadModal = ({ isOpen, onClose, content, title, elementRef, paperSize, terjemahanMukadimah = false, latinMukadimah = true, userProfile, coverData }: DownloadModalProps) => {
  const [step, setStep] = useState<'select' | 'printing' | 'finished'>('select');
  const [selectedFormat, setSelectedFormat] = useState<DownloadFormat>(Capacitor.isNativePlatform() ? 'pdf_pro' : 'print');
  const [progress, setProgress] = useState(0);
  
  // PNG Settings
  const [pngResolution, setPngResolution] = useState<1 | 2 | 3>(2); // 1=SD, 2=HD, 3=Ultra
  const [pngAllPages, setPngAllPages] = useState(true);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setStep('select');
      setProgress(0);
      setSelectedFormat(Capacitor.isNativePlatform() ? 'pdf_pro' : 'print');
    }
  }, [isOpen]);

  const handleDownload = async () => {
    // Open window immediately for formats that need it to bypass popup blockers
    let targetWindow: Window | null = null;
    if (selectedFormat === 'print') {
      targetWindow = window.open('', '_blank');
      if (!targetWindow) {
        alert("Browser memblokir Pop-up! Mohon izinkan Pop-up agar bisa mencetak.");
        return;
      }
      // Show loading state in new tab
      targetWindow.document.write(`
        <html>
          <body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;background:#f1f5f9;color:#64748b;margin:0;">
            <div style="text-align:center;">
              <div style="width:40px;height:40px;border:4px solid #e2e8f0;border-top-color:#10b981;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 16px;"></div>
              <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
              <div style="font-weight:600;">Menyiapkan Cetak...</div>
              <div style="font-size:12px;margin-top:8px;">Mohon tunggu sebentar</div>
            </div>
          </body>
        </html>
      `);
    }

    setStep('printing');
    
    // Simulate printing progress
    let p = 0;
    const interval = setInterval(() => {
      p += 5; // Faster progress for better UX
      if (p > 90) p = 90; // Hold at 90 until done
      setProgress(p);
    }, 100);

    // Give UI time to update
    setTimeout(() => {
      processDownload(interval, targetWindow);
    }, 500);
  };

  const capturePage = async (page: HTMLElement, resolution: number) => {
    // Clone the page to avoid layout shifts in the visible UI
    const clone = page.cloneNode(true) as HTMLElement;
    
    // Copy textarea and input values since cloneNode doesn't copy them
    const originalTextareas = page.querySelectorAll('textarea');
    const clonedTextareas = clone.querySelectorAll('textarea');
    originalTextareas.forEach((textarea, index) => {
      clonedTextareas[index].value = textarea.value;
      clonedTextareas[index].textContent = textarea.value; // Fallback for html-to-image
    });

    const originalInputs = page.querySelectorAll('input');
    const clonedInputs = clone.querySelectorAll('input');
    originalInputs.forEach((input, index) => {
      if (input.type === 'checkbox' || input.type === 'radio') {
        clonedInputs[index].checked = input.checked;
      } else {
        clonedInputs[index].value = input.value;
        clonedInputs[index].setAttribute('value', input.value); // Fallback
      }
    });
    
    // Clean up the clone
    clone.style.zoom = '1';
    clone.style.transform = 'none';
    clone.style.margin = '0';
    clone.style.boxShadow = 'none';
    clone.style.border = 'none';
    
    // Hide UI elements in the clone
    const noPrintElements = Array.from(clone.querySelectorAll('.no-print, .print\\:hidden')) as HTMLElement[];
    noPrintElements.forEach(el => el.style.display = 'none');

    // Create a temporary container
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '-9999px';
    // Ensure the container doesn't restrict the clone's size
    tempContainer.style.width = page.style.width || 'auto';
    tempContainer.style.height = page.style.height || 'auto';
    tempContainer.appendChild(clone);
    document.body.appendChild(tempContainer);

    try {
      const canvas = await toCanvas(clone, { 
        cacheBust: true, 
        pixelRatio: resolution,
        backgroundColor: '#ffffff',
        style: {
          margin: '0',
          boxShadow: 'none',
          border: 'none'
        }
      });
      return canvas;
    } finally {
      document.body.removeChild(tempContainer);
    }
  };

  const processDownload = async (intervalId: NodeJS.Timeout, targetWindow: Window | null = null) => {
    const filename = `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}`;
    const processedContent = processTemplateMarkersForText(content, terjemahanMukadimah, latinMukadimah);

    try {
      if (selectedFormat === 'txt') {
        const blob = new Blob([processedContent], { type: 'text/plain' });
        downloadBlob(blob, `${filename}.txt`);
        finishDownload(intervalId);
      } else if (selectedFormat === 'md') {
        const blob = new Blob([processedContent], { type: 'text/markdown' });
        downloadBlob(blob, `${filename}.md`);
        finishDownload(intervalId);
      } else if (selectedFormat === 'png' && elementRef.current) {
        const container = elementRef.current;
        
        // Find all pages
        let pages = Array.from(container.querySelectorAll('.print-page')) as HTMLElement[];
        if (pages.length === 0) {
          pages = Array.from(container.children) as HTMLElement[];
        }

        if (pages.length === 0) {
          throw new Error("Tidak ada halaman untuk didownload");
        }

        if (pngAllPages && pages.length > 1) {
          // Download as ZIP
          const zip = new JSZip();
          const folder = zip.folder(filename) || zip;

          for (let i = 0; i < pages.length; i++) {
            const page = pages[i];
            const pageProgress = Math.round((i / pages.length) * 100);
            setProgress(pageProgress);

            const canvas = await capturePage(page, pngResolution);
            const dataUrl = canvas.toDataURL('image/png');
            const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
            folder.file(`Halaman_${i + 1}.png`, base64Data, { base64: true });
          }

          const content = await zip.generateAsync({ type: "blob" });
          downloadBlob(content, `${filename}_Images.zip`);
          finishDownload(intervalId);

        } else {
          const target = pages[0];
          const canvas = await capturePage(target, pngResolution);
          canvas.toBlob((blob) => {
             if (blob) downloadBlob(blob, `${filename}.png`);
             finishDownload(intervalId);
          });
        }

      } else if (selectedFormat === 'print' && elementRef.current) {
        // Use new tab printing to completely bypass iframe sandbox restrictions
        finishDownload(intervalId);
        
        const element = elementRef.current;
        
        // 1. Clone the content to manipulate it without affecting the UI
        const clone = element.cloneNode(true) as HTMLElement;
        
        // 2. Clean up the cloned content for printing
        // Find all pages and reset their styles to be "natural" (100% scale, no zoom transforms)
        const pages = clone.querySelectorAll('.print-page');
        pages.forEach((page: Element) => {
          if (page instanceof HTMLElement) {
            // Remove the zoom transform and negative margins used for the screen UI
            page.style.transform = 'none';
            page.style.zoom = '1';
            page.style.marginBottom = '0';
            page.style.marginTop = '0';
            
            // We intentionally keep the original px dimensions (e.g. 794x1122 for A4)
            // instead of forcing physical 'mm' here, because internal paddings/fonts 
            // were calculated based on those px values. The browser's print dialog 
            // will automatically scale the px box to fit the physical paper.
            
            // Allow page to stretch fully for print mapping
            page.style.maxHeight = 'none';
            page.style.overflow = 'hidden';
            
            // Remove screen-only effects
            page.style.boxShadow = 'none';
            page.style.border = 'none'; 
            
            // Force background to be exact
            page.style.printColorAdjust = 'exact';
            (page.style as any).webkitPrintColorAdjust = 'exact';
          }
        });

        // 3. Get all stylesheets to ensure fonts and Tailwind classes are preserved
        const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
          .map(s => s.outerHTML)
          .join('\n');

        // 4. Use the already opened tab
        const printWindow = targetWindow;
        
        if (!printWindow) {
          alert("Browser memblokir Pop-up! Mohon izinkan Pop-up (Allow Pop-ups) untuk situs ini agar bisa mengunduh PDF Vector.");
          return;
        }

        printWindow.document.open();
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${title} - Vector PDF</title>
              <meta charset="utf-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1" />
              ${styles}
              <style>
                /* Reset Body */
                html, body { 
                  margin: 0; 
                  padding: 0; 
                  background-color: white;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }

                /* Print Instruction Overlay (Screen Only) */
                .print-instruction {
                  position: fixed;
                  top: 0;
                  left: 0;
                  right: 0;
                  background: #f8fafc;
                  padding: 20px;
                  text-align: center;
                  border-bottom: 1px solid #e2e8f0;
                  z-index: 9999;
                  font-family: sans-serif;
                  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                }
                .print-instruction h2 { margin: 0 0 10px 0; color: #0f172a; font-size: 18px; }
                .print-instruction p { margin: 5px 0; color: #475569; font-size: 14px; }
                .print-instruction button {
                  background: #059669;
                  color: white;
                  border: none;
                  padding: 10px 20px;
                  border-radius: 6px;
                  font-weight: 600;
                  cursor: pointer;
                  margin-top: 10px;
                  transition: background 0.2s;
                }
                .print-instruction button:hover { background: #047857; }

                /* Container Adjustment */
                #print-container {
                  width: 100%;
                  display: flex;
                  flex-direction: column;
                  align-items: center; /* Center horizontally for perfect print alignment */
                  padding-top: 220px; /* Space for instruction */
                }

                /* Page Styling for Print Window (Screen View) */
                .print-page {
                  margin: 0 auto 40px auto !important; /* Center horizontally */
                  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1) !important;
                }

                /* ACTUAL PRINT STYLES */
                @media print {
                  * {
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                  }
                  @page {
                    margin: 0;
                    size: ${paperSize === 'A4' ? 'A4' : paperSize === 'A5' ? 'A5' : 'B5'} portrait;
                  }
                  
                  html, body {
                    background: none !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    width: 100% !important;
                  }

                  .print-instruction { 
                    display: none !important; 
                  }

                  #print-container {
                    padding-top: 0 !important;
                    display: block !important;
                    width: 100% !important;
                  }

                  .print-page {
                    margin: 0 auto !important;
                    box-shadow: none !important;
                    border: none !important;
                    page-break-after: always !important;
                    break-after: page !important;
                    page-break-inside: avoid !important;
                    break-inside: avoid !important;
                    overflow: hidden !important;
                    /* Ensure background graphics are printed */
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                    background-print: true;
                    box-sizing: border-box !important;
                  }

                  /* Fix for double empty pages: ensure no extra height */
                  .print-page:last-child {
                    page-break-after: auto !important;
                    break-after: auto !important;
                  }

                  /* Hide any other UI elements that might have slipped in */
                  .no-print, .print\\:hidden {
                    display: none !important;
                  }
                }
              </style>
            </head>
            <body>
              <div class="print-instruction">
                <h2>🚀 Mode Cetak / Vector PDF Siap!</h2>
                <p><strong>PENTING:</strong> Agar hasil 100% akurat dan tanpa margin potong:</p>
                <ul style="text-align: left; max-width: 400px; margin: 10px auto; font-size: 13px; color: #334155;">
                  <li>Destination: <strong>Save as PDF</strong> (Simpan sbg PDF)</li>
                  <li>Paper Size: <strong style="text-transform:uppercase">${paperSize}</strong></li>
                  <li>Margins: <strong>None / Tiada / Default</strong></li>
                  <li>Scale: <strong>Default / 100%</strong></li>
                  <li>Options: Centang <strong>Background graphics</strong></li>
                </ul>
                <button onclick="window.print()">🖨️ Cetak / Simpan PDF</button>
              </div>
              
              <div id="print-container">
                ${clone.innerHTML}
              </div>

              <script>
                // Wait for fonts and images to load
                window.onload = () => {
                  // Small delay to ensure rendering is complete
                  setTimeout(() => {
                    // Auto-trigger print
                    window.print();
                  }, 800);
                };
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
      } else if (selectedFormat === 'docx') {
        // Generate Word Document
        const sections = processedContent.split('---').map(section => section.trim());
        
        const doc = new Document({
          sections: [{
            properties: {},
            children: sections.flatMap((section, sIdx) => {
              const lines = section.split('\n');
              const paragraphs: Paragraph[] = [];
              
              lines.forEach(line => {
                if (!line.trim()) return;
                
                // Basic Markdown parsing for DOCX
                if (line.startsWith('# ')) {
                  paragraphs.push(new Paragraph({
                    text: line.replace('# ', ''),
                    heading: HeadingLevel.HEADING_1,
                    spacing: { before: 400, after: 200 }
                  }));
                } else if (line.startsWith('## ')) {
                  paragraphs.push(new Paragraph({
                    text: line.replace('## ', ''),
                    heading: HeadingLevel.HEADING_2,
                    spacing: { before: 300, after: 150 }
                  }));
                } else if (line.startsWith('### ')) {
                  paragraphs.push(new Paragraph({
                    text: line.replace('### ', ''),
                    heading: HeadingLevel.HEADING_3,
                    spacing: { before: 200, after: 100 }
                  }));
                } else {
                  // Check for Arabic
                  const hasArabic = /[\u0600-\u06FF]/.test(line);
                  const processedLine = hasArabic ? processArabicText(line) : line;
                  
                  paragraphs.push(new Paragraph({
                    children: [
                      new TextRun({
                        text: processedLine,
                        size: hasArabic ? 32 : 24,
                        font: hasArabic ? "Amiri" : "Calibri",
                        rightToLeft: hasArabic
                      })
                    ],
                    alignment: hasArabic ? AlignmentType.RIGHT : AlignmentType.LEFT,
                    spacing: { after: 120 }
                  }));
                }
              });
              
              // Add page break between sections if not the last one
              if (sIdx < sections.length - 1) {
                paragraphs.push(new Paragraph({
                  children: [new TextRun({ text: "", break: 1 })]
                }));
              }
              
              return paragraphs;
            })
          }]
        });

        const blob = await Packer.toBlob(doc);
        downloadBlob(blob, `${filename}.docx`);
        finishDownload(intervalId);
      } else if (selectedFormat === 'pdf_direct' && elementRef.current) {
        // Generate PDF directly via html2pdf using exact visual clone (no print UI) 
        const element = elementRef.current;
        const clone = element.cloneNode(true) as HTMLElement;
        
        // Remove the responsive grid/flex layout from the clone, we want vertical stacking for PDF
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
            page.style.pageBreakAfter = 'always'; // Tell html2pdf to break here
          }
        });

        // We need it in the DOM temporarily for html2pdf to process styles perfectly
        const hiddenWrapper = document.createElement('div');
        hiddenWrapper.style.position = 'absolute';
        hiddenWrapper.style.left = '-9999px';
        hiddenWrapper.style.top = '0';
        hiddenWrapper.appendChild(clone);
        document.body.appendChild(hiddenWrapper);

        setProgress(50); // Mid-way
        
        try {
          const pdfFormats: Record<string, [number, number]> = {
            'A4': [794, 1122],
            'A5': [559, 790],
            'B5': [665, 940],
            'A6': [397, 561],
            'Legal': [794, 1335],
            'F4': [794, 1247]
          };
          const formatArray = pdfFormats[paperSize] || [794, 1122];

          const opt = {
            margin:       0,
            filename:     `${filename}_Direct.pdf`,
            image:        { type: 'jpeg' as const, quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' },
            jsPDF:        { unit: 'px', format: formatArray, orientation: 'portrait' as const }
          };
          
          await html2pdf().set(opt).from(clone).outputPdf('blob').then((pdfBlob: Blob) => {
            downloadBlob(pdfBlob, `${filename}_Direct.pdf`);
          });
          
          finishDownload(intervalId);
        } finally {
          document.body.removeChild(hiddenWrapper);
        }
      } else if (selectedFormat === 'pdf' && elementRef.current) {
        const container = elementRef.current;
        let pages = Array.from(container.querySelectorAll('.print-page')) as HTMLElement[];
        if (pages.length === 0) {
          pages = Array.from(container.children) as HTMLElement[];
        }

        if (pages.length === 0) {
          throw new Error("Tidak ada halaman untuk didownload");
        }

        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: paperSize.toLowerCase()
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        for (let i = 0; i < pages.length; i++) {
          const page = pages[i];
          const pageProgress = Math.round((i / pages.length) * 100);
          setProgress(pageProgress);

          // Use 2x resolution (HD) instead of 4x. 4x creates canvases too massive for mobile memory leading to blank crashes.
          const canvas = await capturePage(page, 2);
          const imgData = canvas.toDataURL('image/jpeg', 1.0);

          if (i > 0) {
            pdf.addPage();
          }
          
          pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        }

        const pdfBlob = pdf.output('blob');
        downloadBlob(pdfBlob, `${filename}.pdf`);
        finishDownload(intervalId);
      } else if (selectedFormat === 'pdf_pro') {
        // Generate High-Quality Vector PDF using @react-pdf/renderer
        console.log("Starting Professional PDF generation...");
        try {
          // Re-register fonts from cache if available for maximum speed/offline support
          // We only need Amiri, standard fonts are built-in
          const cachedAmiri = await getCachedFont('Amiri', 'https://raw.githubusercontent.com/google/fonts/main/ofl/amiri/Amiri-Regular.ttf');
          
          Font.register({ family: 'Amiri', src: cachedAmiri });

          const blob = await pdf(
            <ProfessionalPDF 
              title={title} 
              content={processedContent} 
              author={userProfile?.name || "Mimbar AI User"} 
              location={userProfile?.mosque || ""}
              date={new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              coverData={coverData}
            />
          ).toBlob();
          
          console.log("PDF generated successfully, saving file...");
          downloadBlob(blob, `${filename}_HD.pdf`);
          finishDownload(intervalId);
        } catch (pdfError) {
          console.error("Error inside react-pdf engine:", pdfError);
          throw pdfError;
        }
      }
    } catch (error) {
      console.error("Download failed", error);
      clearInterval(intervalId);
      if (targetWindow) targetWindow.close();
      setStep('select'); // Go back on error
      alert('Gagal membuat file. Silakan coba lagi.');
    }
  };

  const finishDownload = (intervalId: NodeJS.Timeout) => {
    clearInterval(intervalId);
    setProgress(100);
    setTimeout(() => setStep('finished'), 500);
  };

  const convertBlobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        resolve(reader.result as string);
      };
      reader.readAsDataURL(blob);
    });
  };

  const downloadBlob = async (blob: Blob, name: string) => {
    if (Capacitor.isNativePlatform()) {
      try {
        const base64DataUrl = await convertBlobToBase64(blob);
        // The dataUrl is like: "data:application/pdf;base64,JVBERi0xLjcKCjEg..."
        const base64Data = base64DataUrl.split(',')[1]; 

        // Write to cache directory first
        const savedFile = await Filesystem.writeFile({
          path: name,
          data: base64Data,
          directory: Directory.Cache
        });

        await Share.share({
          title: title,
          files: [savedFile.uri],
          dialogTitle: 'Simpan atau Bagikan File'
        });

      } catch (err) {
        console.error("Native Save Error:", err);
        alert("Gagal menyimpan file ke perangkat.");
      }
    } else {
      // Standard Web Fallback
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const handleShareWa = () => {
    const text = `*${title}*\n\n${content.substring(0, 500)}...\n\nBaca selengkapnya di Mimbar AI.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleShareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: content,
        });
      } catch (err) {
        console.error("Share failed", err);
      }
    } else {
      // Fallback copy
      navigator.clipboard.writeText(content);
      alert('Teks disalin ke clipboard!');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 print:hidden">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative z-10"
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-slate-800">Download & Bagikan</h3>
              <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {step === 'select' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-3 pb-4">
                    {!Capacitor.isNativePlatform() && (
                      <>
                        <FormatOption 
                          id="print" 
                          label="Cetak ke Storage" 
                          sub="Via Browser" 
                          icon={Printer} 
                          selected={selectedFormat === 'print'} 
                          onSelect={() => setSelectedFormat('print')} 
                        />
                      </>
                    )}
                    <FormatOption 
                      id="pdf_pro" 
                      label="PDF Vektor HD" 
                      sub="Saran Utama" 
                      icon={FileCode} 
                      selected={selectedFormat === 'pdf_pro'} 
                      onSelect={() => setSelectedFormat('pdf_pro')} 
                    />
                    <FormatOption 
                      id="pdf_direct" 
                      label="PDF Otomatis" 
                      sub="Alternatif (Berat)" 
                      icon={FileText} 
                      selected={selectedFormat === 'pdf_direct'} 
                      onSelect={() => setSelectedFormat('pdf_direct')} 
                    />
                    <FormatOption 
                      id="docx" 
                      label="Ms. Word" 
                      sub="Bisa Diedit (.docx)" 
                      icon={FileText} 
                      selected={selectedFormat === 'docx'} 
                      onSelect={() => setSelectedFormat('docx')} 
                    />
                    <FormatOption 
                      id="txt" 
                      label="Teks Murni" 
                      sub="Paling Ringan (.txt)" 
                      icon={FileCode} 
                      selected={selectedFormat === 'txt'} 
                      onSelect={() => setSelectedFormat('txt')} 
                    />
                  </div>

                  {/* PNG Options */}
                  {selectedFormat === 'png' && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4"
                    >
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                          <Settings2 className="w-3 h-3" />
                          Resolusi Gambar
                        </label>
                        <div className="flex gap-2">
                          {[1, 2, 3].map((res) => (
                            <button
                              key={res}
                              onClick={() => setPngResolution(res as 1|2|3)}
                              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                                pngResolution === res 
                                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' 
                                  : 'bg-white text-slate-500 border border-slate-200 hover:border-emerald-200'
                              }`}
                            >
                              {res === 1 ? 'Standar (1x)' : res === 2 ? 'HD (2x)' : 'Ultra (3x)'}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-500 flex items-center gap-2">
                          <FolderArchive className="w-4 h-4 text-slate-400" />
                          Download Semua Halaman (ZIP)
                        </label>
                        <button 
                          onClick={() => setPngAllPages(!pngAllPages)}
                          className={`w-10 h-6 rounded-full transition-colors relative ${pngAllPages ? 'bg-emerald-500' : 'bg-slate-300'}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${pngAllPages ? 'left-5' : 'left-1'}`} />
                        </button>
                      </div>
                    </motion.div>
                  )}

                  <button 
                    onClick={handleDownload}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-lg shadow-emerald-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    <Download className="w-5 h-5" />
                    Mulai Download
                  </button>
                </div>
              )}

              {step === 'printing' && (
                <div className="flex flex-col items-center justify-center py-8 space-y-6">
                  {/* Printer Animation */}
                  <div className="relative w-32 h-32 flex items-center justify-center">
                    <div className="absolute inset-0 bg-emerald-50 rounded-full animate-pulse"></div>
                    <Printer className="w-16 h-16 text-emerald-600 relative z-10 animate-bounce" />
                    
                    {/* Paper sliding out animation */}
                    <motion.div 
                      initial={{ y: -20, opacity: 0, scale: 0.8 }}
                      animate={{ y: 20, opacity: 1, scale: 1 }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute -bottom-4 w-20 h-24 bg-white border border-slate-200 shadow-sm -z-10 mx-auto left-0 right-0"
                    />
                  </div>
                  
                  <div className="w-full space-y-2">
                    <div className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <span>Mencetak...</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-emerald-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 text-center">Sedang menyiapkan file terbaik untuk Anda...</p>
                </div>
              )}

              {step === 'finished' && (
                <div className="flex flex-col items-center space-y-6">
                  {/* Taped Paper Result */}
                  <motion.div 
                    initial={{ scale: 0.8, rotate: 10, opacity: 0 }}
                    animate={{ scale: 1, rotate: -2, opacity: 1 }}
                    transition={{ type: "spring", bounce: 0.5 }}
                    className="relative bg-white p-4 w-48 h-64 border border-slate-200 shadow-xl flex flex-col items-center justify-center text-center gap-2"
                  >
                    {/* Tape */}
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-16 h-8 bg-yellow-200/50 rotate-1 backdrop-blur-sm"></div>
                    
                    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-2">
                      <Check className="w-6 h-6 text-emerald-600" />
                    </div>
                    <h4 className="font-bold text-slate-800 text-sm line-clamp-2">{title}</h4>
                    <p className="text-[10px] text-slate-500">Berhasil disimpan dalam format {selectedFormat.toUpperCase()}</p>
                  </motion.div>

                  <div className="w-full grid grid-cols-2 gap-3">
                    <button 
                      onClick={handleShareWa}
                      className="flex items-center justify-center gap-2 py-3 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl font-bold shadow-lg shadow-green-500/20 transition-all"
                    >
                      <MessageCircle className="w-5 h-5 fill-current" />
                      WhatsApp
                    </button>
                    <button 
                      onClick={handleShareNative}
                      className="flex items-center justify-center gap-2 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all"
                    >
                      <Share2 className="w-5 h-5" />
                      Lainnya
                    </button>
                  </div>
                  
                  <button onClick={onClose} className="text-xs text-slate-400 hover:text-slate-600 underline">
                    Tutup
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const FormatOption = ({ id, label, sub, icon: Icon, selected, onSelect }: any) => (
  <button 
    onClick={onSelect}
    className={`flex-1 p-4 rounded-2xl border-2 text-center transition-all ${
      selected 
        ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/20' 
        : 'border-slate-100 bg-slate-50 hover:border-emerald-200'
    }`}
  >
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3 ${selected ? 'bg-emerald-500 text-white' : 'bg-white text-slate-400 shadow-sm'}`}>
      <Icon className="w-5 h-5" />
    </div>
    <div className="font-bold text-[12px] text-slate-800 mb-1">{label}</div>
    <div className="text-[10px] text-slate-400 font-medium">{sub}</div>
  </button>
);
