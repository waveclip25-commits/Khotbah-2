import React, { useState, useEffect, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
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
import { X, Save, GripVertical, Trash2, Plus, ArrowLeft, ArrowRight, Sparkles, Scissors } from 'lucide-react';

// --- Types ---
type Paragraph = {
  id: string;
  content: string;
};

type Page = {
  id: string;
  paragraphs: Paragraph[];
};

// --- Helper Functions ---
const autoBalancePages = (allParagraphs: Paragraph[], safeCharLimit: number, getEstimatedLength: (text: string) => number): Page[] => {
  if (allParagraphs.length === 0) return [];

  const TARGET_CHARS_PER_PAGE = safeCharLimit;
  
  const newPages: Page[] = [];
  let currentPageParagraphs: Paragraph[] = [];
  let currentCharCount = 0;

  allParagraphs.forEach((p) => {
    let estimatedLength = getEstimatedLength(p.content);

    if (estimatedLength > TARGET_CHARS_PER_PAGE) {
      // Split long paragraph
      const lines = p.content.split('\n');
      let currentChunk = '';
      let currentChunkLength = 0;
      
      for (const line of lines) {
        const lineLen = getEstimatedLength(line + '\n');
        
        if (lineLen > TARGET_CHARS_PER_PAGE) {
          if (currentChunk) {
            if (currentCharCount + currentChunkLength > TARGET_CHARS_PER_PAGE && currentPageParagraphs.length > 0) {
              newPages.push({ id: `page-${Date.now()}-${newPages.length}`, paragraphs: currentPageParagraphs });
              currentPageParagraphs = [];
              currentCharCount = 0;
            }
            currentPageParagraphs.push({ id: `p-${Date.now()}-${Math.random()}`, content: currentChunk.trim() });
            currentCharCount += currentChunkLength;
            currentChunk = '';
            currentChunkLength = 0;
          }
          
          const words = line.split(' ');
          for (const word of words) {
            const wordLen = getEstimatedLength(word + ' ');
            if (currentChunkLength + wordLen > TARGET_CHARS_PER_PAGE && currentChunk) {
              if (currentCharCount + currentChunkLength > TARGET_CHARS_PER_PAGE && currentPageParagraphs.length > 0) {
                newPages.push({ id: `page-${Date.now()}-${newPages.length}`, paragraphs: currentPageParagraphs });
                currentPageParagraphs = [];
                currentCharCount = 0;
              }
              currentPageParagraphs.push({ id: `p-${Date.now()}-${Math.random()}`, content: currentChunk.trim() });
              currentCharCount += currentChunkLength;
              currentChunk = word + ' ';
              currentChunkLength = wordLen;
            } else {
              currentChunk += word + ' ';
              currentChunkLength += wordLen;
            }
          }
          currentChunk += '\n';
        } else if (currentChunkLength + lineLen > TARGET_CHARS_PER_PAGE && currentChunk) {
          if (currentCharCount + currentChunkLength > TARGET_CHARS_PER_PAGE && currentPageParagraphs.length > 0) {
            newPages.push({ id: `page-${Date.now()}-${newPages.length}`, paragraphs: currentPageParagraphs });
            currentPageParagraphs = [];
            currentCharCount = 0;
          }
          currentPageParagraphs.push({ id: `p-${Date.now()}-${Math.random()}`, content: currentChunk.trim() });
          currentCharCount += currentChunkLength;
          currentChunk = line + '\n';
          currentChunkLength = lineLen;
        } else {
          currentChunk += line + '\n';
          currentChunkLength += lineLen;
        }
      }
      
      if (currentChunk.trim()) {
         if (currentCharCount + currentChunkLength > TARGET_CHARS_PER_PAGE && currentPageParagraphs.length > 0) {
            newPages.push({ id: `page-${Date.now()}-${newPages.length}`, paragraphs: currentPageParagraphs });
            currentPageParagraphs = [];
            currentCharCount = 0;
         }
         currentPageParagraphs.push({ id: `p-${Date.now()}-${Math.random()}`, content: currentChunk.trim() });
         currentCharCount += currentChunkLength;
      }
    } else if (currentCharCount + estimatedLength > TARGET_CHARS_PER_PAGE && currentPageParagraphs.length > 0) {
      newPages.push({
        id: `page-${Date.now()}-${newPages.length}`,
        paragraphs: currentPageParagraphs
      });
      currentPageParagraphs = [p];
      currentCharCount = estimatedLength;
    } else {
      currentPageParagraphs.push(p);
      currentCharCount += estimatedLength;
    }
  });

  if (currentPageParagraphs.length > 0) {
    newPages.push({
      id: `page-${Date.now()}-${newPages.length}`,
      paragraphs: currentPageParagraphs
    });
  }

  return newPages;
};

const stripLine = (text: string): string => {
  return text.replace(/^[-*•]|\d+\.\s+/, '').trim();
};

const parseContent = (text: string): Page[] => {
  const pageTexts = text.split(/\n---\n/);
  return pageTexts.map((pageText, pageIndex) => ({
    id: `page-${pageIndex}`,
    paragraphs: pageText
      .split(/\n/)
      .map(p => p.trim())
      .filter((p) => p !== '')
      .map((p, pIndex) => {
        let content = p;
        // Basic rule-based cleaning/detection
        if (content.match(/\[\s*TEMPLATE_MUKADIMAH_1\s*\]/i)) content = '[TEMPLATE_MUKADIMAH_1]';
        else if (content.match(/\[\s*TEMPLATE_PENUTUP_1\s*\]/i)) content = '[TEMPLATE_PENUTUP_1]';
        else if (content.match(/\[\s*TEMPLATE_MUKADIMAH_2\s*\]/i)) content = '[TEMPLATE_MUKADIMAH_2]';
        else if (content.match(/\[\s*TEMPLATE_PENUTUP_2\s*\]/i)) content = '[TEMPLATE_PENUTUP_2]';
        
        // Detect points (e.g., starting with -, *, or number)
        const isPoint = /^\s*([-*•]|\d+\.)\s+/;
        // Detect translations (e.g., lines in parentheses)
        const isTranslation = /^\s*\(.*\)\s*$/;
        
        // Apply stripLine if it's a point
        if (isPoint.test(content)) {
            content = stripLine(content);
        }
        
        return {
          id: `p-${pageIndex}-${pIndex}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Unique ID
          content,
        };
      }),
  }));
};

const serializeContent = (pages: Page[]): string => {
  return pages
    .map((page) => page.paragraphs.map((p) => p.content).join('\n\n'))
    .join('\n\n---\n\n');
};

// --- Sortable Item Component ---
const SortableItem = ({ id, content, onMove, onDelete, onSplit, canMovePrev, canMoveNext }: { id: string; content: string; onMove: (dir: 'prev' | 'next') => void; onDelete: (id: string) => void; onSplit: (id: string) => void; canMovePrev: boolean; canMoveNext: boolean }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 999 : 'auto',
    opacity: isDragging ? 0.5 : 1,
  };

  const isTemplate = content.match(/\[\s*TEMPLATE_(MUKADIMAH|PENUTUP)_[12]\s*\]/i);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white border border-slate-200 rounded-lg p-3 mb-2 shadow-sm hover:shadow-md transition-shadow group relative ${isDragging ? 'ring-2 ring-emerald-500' : ''}`}
    >
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 right-2 p-1 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="w-4 h-4" />
      </div>
      
      {isTemplate ? (
        <div className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1.5 rounded border border-emerald-100 inline-block mb-2">
          {content.includes('MUKADIMAH_1') ? '🕌 Mukadimah Khotbah 1' : 
           content.includes('PENUTUP_1') ? '🤲 Penutup Khotbah 1' :
           content.includes('MUKADIMAH_2') ? '🕌 Mukadimah Khotbah 2' :
           '🤲 Penutup Khotbah 2'}
        </div>
      ) : (
        <div 
          className={`text-xs text-slate-700 line-clamp-3 pr-6 font-medium mb-2 ${/[\u0600-\u06FF]/.test(content) ? 'text-right' : 'text-left'}`}
          style={/[\u0600-\u06FF]/.test(content) ? { direction: 'rtl' } : {}}
        >
          {content}
        </div>
      )}
      
      {/* Manual Move Buttons */}
      <div className="flex items-center gap-1 mt-2 border-t border-slate-100 pt-2">
        <button 
          onClick={(e) => { e.stopPropagation(); onMove('prev'); }}
          disabled={!canMovePrev}
          className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400 transition-colors"
          title="Pindah ke Halaman Sebelumnya"
        >
          <ArrowLeft className="w-3 h-3" />
        </button>
        <span className="text-[10px] text-slate-300 flex-1 text-center font-mono">Geser</span>
        {!isTemplate && content.length > 50 && (
          <button
            onClick={(e) => { e.stopPropagation(); onSplit(id); }}
            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="Belah Paragraf Menjadi Dua (Otomatis Pindah ke Halaman Berikutnya)"
          >
            <Scissors className="w-3 h-3" />
          </button>
        )}
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(id); }}
          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
          title="Hapus Paragraf"
        >
          <Trash2 className="w-3 h-3" />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); onMove('next'); }}
          disabled={!canMoveNext}
          className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400 transition-colors"
          title="Pindah ke Halaman Berikutnya"
        >
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

// --- Droppable Page Component ---
const DroppablePage = ({ page, pageIndex, totalPages, onDeletePage, onMoveItem, onDeleteItem, onSplitItem, onMergeUp, safeCharLimit, getEstimatedLength }: { page: Page; pageIndex: number; totalPages: number; onDeletePage: (id: string) => void; onMoveItem: (itemId: string, dir: 'prev' | 'next') => void; onDeleteItem: (itemId: string) => void; onSplitItem: (itemId: string) => void; onMergeUp: (pageIndex: number) => void; safeCharLimit: number; getEstimatedLength: (text: string) => number }) => {
  const { setNodeRef } = useDroppable({
    id: page.id,
    data: {
      type: 'Page',
      page,
    },
  });

  // Calculate estimated capacity
  const TARGET_CHARS_PER_PAGE = safeCharLimit;
  let estimatedChars = 0;
  page.paragraphs.forEach(p => {
    estimatedChars += getEstimatedLength(p.content);
  });
  
  const fillPercentage = Math.min(100, (estimatedChars / TARGET_CHARS_PER_PAGE) * 100);
  const isOverflowing = estimatedChars > TARGET_CHARS_PER_PAGE + 200; // Allow a little leeway

  return (
    <div ref={setNodeRef} className={`flex-shrink-0 w-64 xs:w-72 h-full flex flex-col bg-slate-50 rounded-xl border-2 transition-colors shadow-sm overflow-hidden ${isOverflowing ? 'border-red-400' : 'border-slate-200'}`}>
      <div className="p-3 bg-white border-b border-slate-200 flex flex-col sticky top-0 z-10">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold text-slate-500 uppercase">Halaman {pageIndex + 1}</h3>
            {pageIndex > 0 && (
              <button
                onClick={() => onMergeUp(pageIndex)}
                className="p-1 text-slate-400 hover:text-emerald-600 rounded hover:bg-emerald-50 transition-colors"
                title="Gabungkan dengan halaman sebelumnya"
              >
                <ArrowLeft className="w-3 h-3 rotate-90" />
              </button>
            )}
          </div>
          <button
            onClick={() => onDeletePage(page.id)}
            className="p-1 text-slate-400 hover:text-red-500 rounded-md hover:bg-red-50 transition-colors"
            title="Hapus Halaman"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
        
        {/* Capacity Indicator */}
        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden" title={`Kapasitas: ${Math.round(fillPercentage)}%`}>
          <div 
            className={`h-full transition-all ${isOverflowing ? 'bg-red-500' : fillPercentage > 85 ? 'bg-amber-500' : 'bg-emerald-500'}`}
            style={{ width: `${fillPercentage}%` }}
          />
        </div>
        {isOverflowing && (
          <span className="text-[9px] text-red-500 font-bold mt-1">⚠️ Melebihi batas kertas</span>
        )}
      </div>
      
      <div className="flex-1 p-3 overflow-y-auto custom-scrollbar min-h-[100px]">
        <SortableContext
          id={page.id}
          items={page.paragraphs.map((p) => p.id)}
          strategy={verticalListSortingStrategy}
        >
          {page.paragraphs.length === 0 ? (
            <div className="h-24 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center text-slate-400 text-xs italic">
              Halaman Kosong (Drop di sini)
            </div>
          ) : (
            page.paragraphs.map((p) => (
              <SortableItem 
                key={p.id} 
                id={p.id} 
                content={p.content} 
                onMove={(dir) => onMoveItem(p.id, dir)}
                onDelete={(id) => onDeleteItem(id)}
                onSplit={(id) => onSplitItem(id)}
                canMovePrev={pageIndex > 0}
                canMoveNext={pageIndex < totalPages - 1}
              />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
};

// --- Main Component ---
export const PageOrganizer = ({ content, onSave, onClose, getEstimatedLength, safeCharLimit }: { content: string; onSave: (newContent: string) => void; onClose: () => void; getEstimatedLength: (text: string) => number; safeCharLimit: number }) => {
  const [pages, setPages] = useState<Page[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pageToDelete, setPageToDelete] = useState<string | null>(null);

  useEffect(() => {
    let parsed = parseContent(content);
    if (!content.includes('\n---\n') && parsed.length === 1 && parsed[0].paragraphs.length > 0) {
        parsed = autoBalancePages(parsed[0].paragraphs, safeCharLimit, getEstimatedLength);
    }
    setPages(parsed);
  }, [content]);

  const handleMoveItem = (itemId: string, dir: 'prev' | 'next') => {
    setPages(prev => {
      const newPages = [...prev];
      
      // Find current page and item
      let sourcePageIndex = -1;
      let itemIndex = -1;
      
      for (let i = 0; i < newPages.length; i++) {
        const idx = newPages[i].paragraphs.findIndex(p => p.id === itemId);
        if (idx !== -1) {
          sourcePageIndex = i;
          itemIndex = idx;
          break;
        }
      }
      
      if (sourcePageIndex === -1) return prev;
      
      const targetPageIndex = dir === 'prev' ? sourcePageIndex - 1 : sourcePageIndex + 1;
      
      if (targetPageIndex < 0 || targetPageIndex >= newPages.length) return prev;
      
      // Move item
      const item = newPages[sourcePageIndex].paragraphs[itemIndex];
      
      // Remove from source
      newPages[sourcePageIndex] = {
        ...newPages[sourcePageIndex],
        paragraphs: newPages[sourcePageIndex].paragraphs.filter(p => p.id !== itemId)
      };
      
      // Add to target
      const targetParagraphs = [...newPages[targetPageIndex].paragraphs];
      if (dir === 'prev') {
        // Moving up: add to the end of the previous page
        targetParagraphs.push(item);
      } else {
        // Moving down: add to the beginning of the next page
        targetParagraphs.unshift(item);
      }

      newPages[targetPageIndex] = {
        ...newPages[targetPageIndex],
        paragraphs: targetParagraphs
      };
      
      return newPages;
    });
  };

  const handleDeleteItem = (itemId: string) => {
    setPages(prev => {
      return prev.map(page => ({
        ...page,
        paragraphs: page.paragraphs.filter(p => p.id !== itemId)
      }));
    });
  };

  const handleSplitItem = (itemId: string) => {
    setPages(prev => {
      const newPages = JSON.parse(JSON.stringify(prev));
      for (let i = 0; i < newPages.length; i++) {
        const pIdx = newPages[i].paragraphs.findIndex((p: any) => p.id === itemId);
        if (pIdx !== -1) {
          const content = newPages[i].paragraphs[pIdx].content;
          
          // Find a good split point (nearest sentence end to the middle)
          const mid = Math.floor(content.length / 2);
          let splitIndex = mid;
          
          // Look for a period, question mark, or exclamation point near the middle
          const match = content.substring(mid).match(/[.!?]\s/);
          if (match && match.index !== undefined) {
            splitIndex = mid + match.index + 1;
          } else {
            // Fallback to looking backwards
            const backMatch = content.substring(0, mid).match(/[.!?]\s[^.!?]*$/);
            if (backMatch && backMatch.index !== undefined) {
              splitIndex = backMatch.index + 1;
            } else {
              // Fallback to nearest space
              const spaceMatch = content.substring(mid).match(/\s/);
              if (spaceMatch && spaceMatch.index !== undefined) {
                splitIndex = mid + spaceMatch.index;
              }
            }
          }

          const part1 = content.substring(0, splitIndex).trim();
          const part2 = content.substring(splitIndex).trim();

          if (part1 && part2) {
            newPages[i].paragraphs[pIdx].content = part1;
            
            const newParagraph = {
              id: `p-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              content: part2
            };

            // If it's overflowing or we want to push it to the next page automatically
            if (i + 1 < newPages.length) {
              newPages[i + 1].paragraphs.unshift(newParagraph);
            } else {
              // Create a new page if it's the last page
              newPages.push({
                id: `page-${Date.now()}`,
                paragraphs: [newParagraph]
              });
            }
          }
          break;
        }
      }
      return newPages;
    });
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const findContainer = (id: string) => {
    if (pages.find((p) => p.id === id)) return id;
    return pages.find((p) => p.paragraphs.find((item) => item.id === id))?.id;
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeContainer = findContainer(activeId);
    const overContainer = findContainer(overId);

    if (!activeContainer || !overContainer || activeContainer === overContainer) {
      return;
    }

    setPages((prev) => {
      const activePage = prev.find((p) => p.id === activeContainer);
      const overPage = prev.find((p) => p.id === overContainer);

      if (!activePage || !overPage) return prev;

      const activeItems = activePage.paragraphs;
      const overItems = overPage.paragraphs;
      
      const activeIndex = activeItems.findIndex((p) => p.id === activeId);
      const overIndex = overItems.findIndex((p) => p.id === overId);

      let newIndex;
      if (overId === overContainer) {
        // We're over the container itself, drop at the end
        newIndex = overItems.length + 1;
      } else {
        const isBelowOverItem =
          over &&
          active.rect.current.translated &&
          active.rect.current.translated.top > over.rect.top + over.rect.height;

        const modifier = isBelowOverItem ? 1 : 0;
        newIndex = overIndex >= 0 ? overIndex + modifier : overItems.length + 1;
      }

      return prev.map((page) => {
        if (page.id === activeContainer) {
          return {
            ...page,
            paragraphs: page.paragraphs.filter((item) => item.id !== activeId),
          };
        }
        if (page.id === overContainer) {
          const newParagraphs = [...page.paragraphs];
          // Ensure we don't duplicate if it's already there (though filter above handles removal)
          if (!newParagraphs.find(p => p.id === activeId)) {
             const itemToMove = activeItems[activeIndex];
             if (itemToMove) {
                 newParagraphs.splice(newIndex, 0, itemToMove);
             }
          }
          return {
            ...page,
            paragraphs: newParagraphs,
          };
        }
        return page;
      });
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const activeId = active.id as string;
    const overId = over?.id as string;

    const activeContainer = findContainer(activeId);
    const overContainer = overId ? findContainer(overId) : null;

    if (activeContainer && overContainer && activeContainer === overContainer) {
        const pageIndex = pages.findIndex(p => p.id === activeContainer);
        if (pageIndex !== -1) {
            const activeIndex = pages[pageIndex].paragraphs.findIndex(p => p.id === activeId);
            const overIndex = pages[pageIndex].paragraphs.findIndex(p => p.id === overId);
            
            if (activeIndex !== overIndex) {
                setPages((prev) => {
                    const newPages = [...prev];
                    newPages[pageIndex] = {
                        ...newPages[pageIndex],
                        paragraphs: arrayMove(newPages[pageIndex].paragraphs, activeIndex, overIndex)
                    };
                    return newPages;
                });
            }
        }
    }

    setActiveId(null);
  };

  const handleAddPage = () => {
    setPages((prev) => [
      ...prev,
      { id: `page-${Date.now()}`, paragraphs: [] },
    ]);
  };

  const handleMergeUp = (pageIndex: number) => {
    if (pageIndex <= 0) return;
    
    setPages(prev => {
      const newPages = [...prev];
      const currentPage = newPages[pageIndex];
      const prevPage = newPages[pageIndex - 1];
      
      // Merge paragraphs to previous page
      newPages[pageIndex - 1] = {
        ...prevPage,
        paragraphs: [...prevPage.paragraphs, ...currentPage.paragraphs]
      };
      
      // Remove current page
      newPages.splice(pageIndex, 1);
      
      return newPages;
    });
  };

  const handleAutoBalance = () => {
    // Collect all paragraphs
    const allParagraphs = pages.flatMap(p => p.paragraphs);
    if (allParagraphs.length === 0) return;

    setPages(autoBalancePages(allParagraphs, safeCharLimit, getEstimatedLength));
  };

  const handleDeletePage = (id: string) => {
    const pageIndex = pages.findIndex(p => p.id === id);
    if (pageIndex === -1) return;
    
    const page = pages[pageIndex];
    if (page.paragraphs.length > 0) {
      setPageToDelete(id);
    } else {
      confirmDeletePage(id);
    }
  };

  const confirmDeletePage = (id: string) => {
    setPages((prev) => {
      if (prev.length <= 1) return prev; // Cannot delete the last page
      
      const pageIndex = prev.findIndex(p => p.id === id);
      if (pageIndex === -1) return prev;
      
      const newPages = [...prev];
      newPages.splice(pageIndex, 1);
      return newPages;
    });
    setPageToDelete(null);
  };

  const handleSaveClick = () => {
    const newContent = serializeContent(pages);
    onSave(newContent);
    onClose();
  };

  // Find active item content for overlay
  const activeItemContent = activeId 
    ? pages.flatMap(p => p.paragraphs).find(p => p.id === activeId)?.content 
    : null;

  return (
    <div className="fixed inset-0 bg-slate-100 z-[60] flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-3 py-3 md:px-4 flex flex-col sm:flex-row items-start sm:items-center justify-between shadow-sm gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button onClick={onClose} className="p-1.5 md:p-2 hover:bg-slate-100 rounded-full text-slate-600 shrink-0">
            <X className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-slate-800 text-sm md:text-lg truncate">Atur Halaman (Drag & Drop)</h2>
            <p className="text-[10px] md:text-xs text-slate-500 truncate">Geser paragraf antar halaman untuk merapikan tata letak.</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 md:gap-2 w-full sm:w-auto overflow-x-auto no-scrollbar pb-1 sm:pb-0">
          <button 
            onClick={handleAutoBalance}
            className="px-2.5 py-1.5 md:px-3 md:py-2 bg-indigo-50 border border-indigo-100 text-indigo-700 font-medium text-[10px] md:text-sm rounded-lg hover:bg-indigo-100 transition-colors flex items-center gap-1.5 shrink-0"
            title="Rapikan tata letak secara otomatis agar pas di setiap halaman"
          >
            <Sparkles className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Rapikan Otomatis</span><span className="sm:hidden">Rapikan</span>
          </button>
          <button 
            onClick={handleAddPage}
            className="px-2.5 py-1.5 md:px-3 md:py-2 bg-white border border-slate-200 text-slate-600 font-medium text-[10px] md:text-sm rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Tambah Halaman</span><span className="sm:hidden">Tambah</span>
          </button>
          <button 
            onClick={handleSaveClick}
            className="px-3 py-1.5 md:px-4 md:py-2 bg-emerald-600 text-white font-bold text-[10px] md:text-sm rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-1.5 shadow-sm shrink-0 ml-auto sm:ml-0"
          >
            <Save className="w-3.5 h-3.5" /> Simpan
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-6 bg-slate-100">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex h-full gap-6 pb-4 min-w-max">
            {pages.map((page, index) => (
              <DroppablePage 
                key={page.id} 
                page={page} 
                pageIndex={index} 
                totalPages={pages.length}
                onDeletePage={handleDeletePage}
                onMoveItem={handleMoveItem}
                onDeleteItem={handleDeleteItem}
                onSplitItem={handleSplitItem}
                onMergeUp={handleMergeUp}
                safeCharLimit={safeCharLimit}
                getEstimatedLength={getEstimatedLength}
              />
            ))}
            
            {/* Add Page Placeholder at the end */}
            <button
              onClick={handleAddPage}
              className="w-16 h-full rounded-xl border-2 border-dashed border-slate-300 hover:border-emerald-400 bg-slate-50 hover:bg-emerald-50 transition-all flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-emerald-600 group"
            >
              <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Plus className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold writing-vertical-rl rotate-180">Tambah Halaman</span>
            </button>
          </div>

          <DragOverlay>
            {activeId && activeItemContent ? (
               <div className="bg-white border-2 border-emerald-500 rounded-lg p-3 shadow-xl opacity-90 w-64 rotate-2 cursor-grabbing">
                 <div className="text-xs text-slate-700 line-clamp-3 font-medium">
                   {activeItemContent}
                 </div>
               </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Delete Confirmation Modal */}
      {pageToDelete && (
        <div className="fixed inset-0 bg-slate-900/50 z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Hapus Halaman?</h3>
            <p className="text-sm text-slate-600 mb-6">
              Halaman ini memiliki isi paragraf. Apakah Anda yakin ingin menghapus halaman beserta seluruh isinya?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setPageToDelete(null)}
                className="flex-1 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => confirmDeletePage(pageToDelete)}
                className="flex-1 py-2.5 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 transition-colors"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
