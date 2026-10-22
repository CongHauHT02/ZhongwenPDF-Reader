import React, { useState, useRef, useCallback, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import type {
  PdfAnnotation,
  ViewerSettings,
  SelectionState,
  LookupResult,
  HighlightColor,
  NormalizedRect,
} from '../types';
import { PdfPage } from './PdfPage';
import { DictionaryTooltip } from './DictionaryTooltip';
import { SelectionToolbar } from './SelectionToolbar';
import { AnnotationModal } from './AnnotationModal';
import { dictionaryService } from '../services/dictionaryService';
import {
  Upload,
  Sparkles,
  BookmarkPlus,
  Highlighter,
  Download,
} from 'lucide-react';

interface PdfViewerProps {
  pdfDocument: pdfjsLib.PDFDocumentProxy | null;
  documentId: string | null;
  scale: number;
  currentPage: number;
  settings: ViewerSettings;
  annotations: PdfAnnotation[];
  onPageChange: (newPage: number) => void;
  onAddAnnotation: (annotation: Omit<PdfAnnotation, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onUpdateAnnotation: (id: string, updates: Partial<PdfAnnotation>) => Promise<void>;
  onDeleteAnnotation: (id: string) => Promise<void>;
  onOpenSamplePdf: () => void;
  onUploadFile: (file: File) => void;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({
  pdfDocument,
  documentId,
  scale,
  currentPage,
  settings,
  annotations,
  onPageChange,
  onAddAnnotation,
  onUpdateAnnotation,
  onDeleteAnnotation,
  onOpenSamplePdf,
  onUploadFile,
}) => {
  const viewerContainerRef = useRef<HTMLDivElement>(null);

  // Hover Dictionary State
  const [hoverResult, setHoverResult] = useState<LookupResult | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null);
  const [hoverWordRect, setHoverWordRect] = useState<DOMRect | null>(null);
  const [hoverPlacement, setHoverPlacement] = useState<'top' | 'bottom'>('bottom');
  const [hoverArrowOffset, setHoverArrowOffset] = useState<number>(24);
  const [isMouseInTooltip, setIsMouseInTooltip] = useState<boolean>(false);
  const hoverTimeoutRef = useRef<any>(null);
  const hideTimeoutRef = useRef<any>(null);
  const currentHoverWordRef = useRef<string | null>(null);

  // Selection & Toolbar State
  const [selectionState, setSelectionState] = useState<SelectionState | null>(null);

  // Modal State for Viewing/Editing Annotations
  const [activeAnnotation, setActiveAnnotation] = useState<PdfAnnotation | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Drag and drop state for upload zone
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);

  // Scroll to page when currentPage changes
  useEffect(() => {
    if (!pdfDocument || currentPage < 1) return;
    const pageEl = document.getElementById(`pdf-page-${currentPage}`);
    if (pageEl) {
      pageEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [currentPage, pdfDocument]);

  // Observer to update currentPage while scrolling continuous document
  useEffect(() => {
    if (!pdfDocument) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            const pageId = entry.target.id;
            const pageNum = parseInt(pageId.replace('pdf-page-', ''), 10);
            if (!isNaN(pageNum) && pageNum !== currentPage) {
              onPageChange(pageNum);
            }
          }
        }
      },
      { threshold: 0.5 }
    );

    for (let i = 1; i <= pdfDocument.numPages; i++) {
      const el = document.getElementById(`pdf-page-${i}`);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [pdfDocument, currentPage, onPageChange]);

  // Handle Character Hover from PdfPage
  const handleHoverText = useCallback(
    (fullText: string, charIndex: number, textNode: Node, clientRect: DOMRect) => {
      if (!settings.hoverDictionaryEnabled) return;

      // Clear any pending hide timer
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }

      // Debounce lookups to avoid lag during fast mouse sweeping
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }

      hoverTimeoutRef.current = setTimeout(async () => {
        const result = await dictionaryService.lookupWordAt(fullText, charIndex);

        if (!result) {
          if (!isMouseInTooltip) {
            setHoverResult(null);
            setHoverPosition(null);
            setHoverWordRect(null);
            currentHoverWordRef.current = null;
          }
          return;
        }

        // Calculate exact bounding rectangle of the target word using DOM Range API
        let wordRect: DOMRect = clientRect;
        if (textNode && textNode.nodeType === Node.TEXT_NODE) {
          try {
            const range = document.createRange();
            const len = (textNode.textContent || '').length;
            const s = Math.min(Math.max(0, result.startIndex), len);
            const e = Math.min(Math.max(s, result.endIndex), len);
            if (e > s) {
              range.setStart(textNode, s);
              range.setEnd(textNode, e);
              const r = range.getBoundingClientRect();
              if (r.width > 0 && r.height > 0) {
                wordRect = r;
              }
            }
          } catch (err) {
            console.warn('Word rect calculation error:', err);
          }
        }

        // Update hoverWordRect for visual highlight overlay
        setHoverWordRect(wordRect);

        // Avoid re-rendering if hovering the exact same word
        if (currentHoverWordRef.current === result.word && hoverResult) {
          return;
        }

        currentHoverWordRef.current = result.word;

        // Tooltip geometry: compact rectangular layout
        const tooltipWidth = 460;
        const tooltipHeight = 110;
        const gap = 12; // Clear non-overlapping distance between word and popup

        let placement: 'top' | 'bottom' = 'bottom';
        let tooltipY = wordRect.bottom + gap;

        // If placing below exceeds screen bottom, place above with gap
        if (tooltipY + tooltipHeight > window.innerHeight - 16) {
          tooltipY = wordRect.top - tooltipHeight - gap;
          placement = 'top';
        }

        // Horizontal positioning: align near word start, clamped within viewport
        let tooltipX = wordRect.left - 20;
        if (tooltipX + tooltipWidth > window.innerWidth - 16) {
          tooltipX = window.innerWidth - tooltipWidth - 16;
        }
        if (tooltipX < 16) {
          tooltipX = 16;
        }

        // Arrow offset pointing to horizontal center of the hovered word
        const wordCenter = wordRect.left + wordRect.width / 2;
        const arrowOffset = Math.max(20, Math.min(tooltipWidth - 24, wordCenter - tooltipX));

        setHoverPlacement(placement);
        setHoverArrowOffset(arrowOffset);
        setHoverPosition({
          x: tooltipX,
          y: tooltipY,
        });
        setHoverResult(result);
      }, 70); // 70ms debounce for responsive yet jitter-free hover
    },
    [settings.hoverDictionaryEnabled, isMouseInTooltip, hoverResult]
  );

  // Handle Mouse Leaving Text
  const handleHoverLeave = useCallback(() => {
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);

    // Grace period so user can move mouse into tooltip
    hideTimeoutRef.current = setTimeout(() => {
      if (!isMouseInTooltip) {
        setHoverResult(null);
        setHoverPosition(null);
        setHoverWordRect(null);
        currentHoverWordRef.current = null;
      }
    }, 250);
  }, [isMouseInTooltip]);

  // Tooltip mouse enter / leave
  const handleTooltipMouseEnter = () => {
    setIsMouseInTooltip(true);
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
  };

  const handleTooltipMouseLeave = () => {
    setIsMouseInTooltip(false);
    setHoverResult(null);
    setHoverPosition(null);
    setHoverWordRect(null);
    currentHoverWordRef.current = null;
  };

  // Close selection toolbar when clicking outside
  const handleContainerMouseDown = (e: React.MouseEvent) => {
    // If not clicking inside selection toolbar or annotation, dismiss selection
    const target = e.target as HTMLElement;
    if (!target.closest('.selection-toolbar') && !target.closest('.interactive-annotation')) {
      // Small timeout to allow click actions to register first
      setTimeout(() => {
        const sel = window.getSelection();
        if (sel && sel.isCollapsed) {
          setSelectionState(null);
        }
      }, 150);
    }
  };

  // ----------------------------------------------------
  // Actions triggered from SelectionToolbar or Tooltip
  // ----------------------------------------------------

  // 1. Highlight
  const handleAddHighlight = async (color: HighlightColor) => {
    if (!selectionState || !documentId) return;

    await onAddAnnotation({
      documentId,
      pageNumber: selectionState.pageNumber,
      type: 'highlight',
      text: selectionState.text,
      rects: selectionState.rects,
      color: color.bgHex,
    });

    setSelectionState(null);
    window.getSelection()?.removeAllRanges();
  };

  // 2. Pin Pinyin
  const handlePinPinyin = async () => {
    if (!selectionState || !documentId) return;

    // Lookup pinyin for selected text or derive using pinyin-pro
    const entry = await dictionaryService.lookupExact(selectionState.text);
    const pinyin = entry?.pinyin || dictionaryService.getPinyin(selectionState.text) || selectionState.text;

    await onAddAnnotation({
      documentId,
      pageNumber: selectionState.pageNumber,
      type: 'pinyin',
      text: selectionState.text,
      rects: selectionState.rects,
      pinyin,
    });

    setSelectionState(null);
    window.getSelection()?.removeAllRanges();
  };

  // 3. Pin Vietnamese Meaning
  const handlePinVietnamese = async () => {
    if (!selectionState || !documentId) return;

    let vietnamese = '';
    const entry = await dictionaryService.lookupExact(selectionState.text);
    if (entry && entry.meanings.length > 0) {
      vietnamese = entry.meanings[0];
    } else {
      const hv = dictionaryService.getHanViet(selectionState.text);
      vietnamese = hv ? `Hán-Việt: ${hv}` : selectionState.text;
    }

    await onAddAnnotation({
      documentId,
      pageNumber: selectionState.pageNumber,
      type: 'vietnamese',
      text: selectionState.text,
      rects: selectionState.rects,
      vietnamese,
    });

    setSelectionState(null);
    window.getSelection()?.removeAllRanges();
  };

  // 4. Add Personal Note
  const handleOpenAddNote = async () => {
    if (!selectionState || !documentId) return;

    // Pre-populate Pinyin and Vietnamese translation for note editor
    const entry = await dictionaryService.lookupExact(selectionState.text);
    const pinyin = entry?.pinyin || dictionaryService.getPinyin(selectionState.text) || '';
    const vietnamese = entry?.meanings?.[0] || '';

    // Create a temporary annotation to edit in the modal
    const tempAnn: PdfAnnotation = {
      id: `temp_${Date.now()}`,
      documentId,
      pageNumber: selectionState.pageNumber,
      type: 'note',
      text: selectionState.text,
      rects: selectionState.rects,
      pinyin,
      vietnamese,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setActiveAnnotation(tempAnn);
    setIsModalOpen(true);
    setSelectionState(null);
  };

  // 5. Lookup Selected Text
  const handleLookupSelection = async (text: string) => {
    const entry = await dictionaryService.lookupExact(text);
    if (entry && selectionState?.menuPosition) {
      setHoverResult({
        word: text,
        entry,
        startIndex: 0,
        endIndex: text.length,
      });
      setHoverPosition({
        x: selectionState.menuPosition.x,
        y: Math.max(120, selectionState.menuPosition.y - 120),
      });
    } else {
      const hv = dictionaryService.getHanViet(text);
      const py = dictionaryService.getPinyin(text);
      setHoverResult({
        word: text,
        entry: {
          simplified: text,
          pinyin: py,
          hanviet: hv,
          meanings: hv ? [`Âm Hán Việt: ${hv}`] : ['Chưa tìm thấy bản dịch.'],
        },
        startIndex: 0,
        endIndex: text.length,
      });
      if (selectionState?.menuPosition) {
        setHoverPosition({
          x: selectionState.menuPosition.x,
          y: Math.max(120, selectionState.menuPosition.y - 120),
        });
      }
    }
  };

  // Save changes from AnnotationModal
  const handleSaveModal = async (id: string, updates: Partial<PdfAnnotation>) => {
    if (!activeAnnotation || !documentId) return;

    if (id.startsWith('temp_')) {
      // This was a new note being created
      await onAddAnnotation({
        documentId,
        pageNumber: activeAnnotation.pageNumber,
        type: 'note',
        text: activeAnnotation.text,
        rects: activeAnnotation.rects,
        pinyin: updates.pinyin,
        vietnamese: updates.vietnamese,
        noteContent: updates.noteContent,
        color: updates.color,
      });
    } else {
      await onUpdateAnnotation(id, updates);
    }
  };

  // Quick actions triggered directly from the Dictionary Tooltip
  const handleTooltipPinPinyin = async (word: string, pinyin: string) => {
    if (!documentId || !hoverWordRect) return;
    const pageEl = document.getElementById(`pdf-page-${currentPage}`);
    if (!pageEl) return;
    const pageRect = pageEl.getBoundingClientRect();
    const normRect: NormalizedRect = {
      x: (hoverWordRect.left - pageRect.left) / pageRect.width,
      y: (hoverWordRect.top - pageRect.top) / pageRect.height,
      width: hoverWordRect.width / pageRect.width,
      height: hoverWordRect.height / pageRect.height,
    };
    await onAddAnnotation({
      documentId,
      pageNumber: currentPage,
      type: 'pinyin',
      text: word,
      rects: [normRect],
      pinyin,
    });
  };

  const handleTooltipPinVietnamese = async (word: string, vietnamese: string) => {
    if (!documentId || !hoverWordRect) return;
    const pageEl = document.getElementById(`pdf-page-${currentPage}`);
    if (!pageEl) return;
    const pageRect = pageEl.getBoundingClientRect();
    const normRect: NormalizedRect = {
      x: (hoverWordRect.left - pageRect.left) / pageRect.width,
      y: (hoverWordRect.top - pageRect.top) / pageRect.height,
      width: hoverWordRect.width / pageRect.width,
      height: hoverWordRect.height / pageRect.height,
    };
    await onAddAnnotation({
      documentId,
      pageNumber: currentPage,
      type: 'vietnamese',
      text: word,
      rects: [normRect],
      vietnamese,
    });
  };

  const handleTooltipAddNote = () => {
    if (!documentId || !hoverWordRect || !hoverResult) return;
    const pageEl = document.getElementById(`pdf-page-${currentPage}`);
    if (!pageEl) return;
    const pageRect = pageEl.getBoundingClientRect();
    const normRect: NormalizedRect = {
      x: (hoverWordRect.left - pageRect.left) / pageRect.width,
      y: (hoverWordRect.top - pageRect.top) / pageRect.height,
      width: hoverWordRect.width / pageRect.width,
      height: hoverWordRect.height / pageRect.height,
    };
    const tempAnn: PdfAnnotation = {
      id: `temp_${Date.now()}`,
      documentId,
      pageNumber: currentPage,
      type: 'note',
      text: hoverResult.word,
      rects: [normRect],
      pinyin: hoverResult.entry.pinyin,
      vietnamese: hoverResult.entry.meanings[0] || '',
      color: 'rgba(254, 240, 138, 0.55)',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setActiveAnnotation(tempAnn);
    setIsModalOpen(true);
  };

  // Drag and Drop files onto viewer
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        onUploadFile(file);
      } else {
        alert('Vui lòng chọn một file định dạng PDF.');
      }
    }
  };

  return (
    <main
      ref={viewerContainerRef}
      onMouseDown={handleContainerMouseDown}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDraggingOver(true);
      }}
      onDragLeave={() => setIsDraggingOver(false)}
      onDrop={handleDrop}
      className={`relative flex-1 overflow-y-auto overflow-x-hidden bg-slate-950 p-4 sm:p-8 flex flex-col items-center min-h-[calc(100vh-3.5rem)] transition-colors ${
        isDraggingOver ? 'bg-amber-950/20 ring-2 ring-amber-500 ring-inset' : ''
      }`}
    >
      {/* ========================================================
          Empty State: When no PDF is loaded
          ======================================================== */}
      {!pdfDocument && (
        <div className="max-w-xl w-full my-auto text-center space-y-6 p-8 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-2xl backdrop-blur-sm animate-in fade-in zoom-in-95">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center mx-auto shadow-xl text-3xl font-serifZh font-bold text-white">
            中
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 tracking-tight">
              Đọc & Tra Từ Điển Tiếng Trung Trên PDF
            </h1>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed">
              Lấy cảm hứng từ <strong>Zhongwen</strong> và <strong>Hanzii</strong>. Hỗ trợ rê chuột tra từ tự động, gắn Pinyin, nghĩa tiếng Việt, tô màu highlight và ghi chú trực tiếp.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <label className="w-full sm:w-auto cursor-pointer flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all hover:scale-105">
              <Upload className="w-4 h-4" />
              <span>Tải file PDF từ máy tính</span>
              <input
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onUploadFile(f);
                }}
              />
            </label>

            <button
              onClick={onOpenSamplePdf}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold text-sm border border-slate-700 shadow transition-all hover:scale-105"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Dùng thử tài liệu mẫu tiếng Trung</span>
            </button>
          </div>

          {/* Drag & Drop hint */}
          <p className="text-xs text-slate-500">
            Hoặc kéo và thả trực tiếp file PDF vào khu vực này
          </p>

          {/* Features cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-4 text-left">
            <div className="bg-slate-800/50 border border-slate-700/40 p-3 rounded-xl">
              <Sparkles className="w-4 h-4 text-amber-400 mb-1.5" />
              <div className="text-xs font-bold text-slate-200">Hover Tra Từ</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Pinyin, Hán Việt & nghĩa tức thì</div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700/40 p-3 rounded-xl">
              <BookmarkPlus className="w-4 h-4 text-orange-400 mb-1.5" />
              <div className="text-xs font-bold text-slate-200">Gắn Pinyin</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Hiển thị chữ phiên âm trên từ</div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700/40 p-3 rounded-xl">
              <Highlighter className="w-4 h-4 text-yellow-400 mb-1.5" />
              <div className="text-xs font-bold text-slate-200">Tô Màu & Note</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Lưu ghi chú đa dòng chuẩn PDF</div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700/40 p-3 rounded-xl">
              <Download className="w-4 h-4 text-indigo-400 mb-1.5" />
              <div className="text-xs font-bold text-slate-200">Xuất PDF</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Nhúng highlight & xuất Anki CSV</div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          Active PDF Document Rendering: Continuous Pages
          ======================================================== */}
      {pdfDocument && (
        <div className="w-full max-w-5xl space-y-6 pb-20">
          {Array.from({ length: pdfDocument.numPages }, (_, i) => i + 1).map((pageNum) => {
            // Annotations belonging to this page
            const pageAnnotations = annotations.filter((a) => a.pageNumber === pageNum);

            return (
              <PdfPage
                key={`page-${pageNum}`}
                pdfDocument={pdfDocument}
                pageNumber={pageNum}
                scale={scale}
                settings={settings}
                annotations={pageAnnotations}
                onHoverText={handleHoverText}
                onHoverLeave={handleHoverLeave}
                onTextSelected={(sel) => setSelectionState(sel)}
                onAnnotationClick={(ann) => {
                  setActiveAnnotation(ann);
                  setIsModalOpen(true);
                }}
              />
            );
          })}
        </div>
      )}

      {/* ========================================================
          Interactive Overlays & Modals
          ======================================================== */}

      {/* 0. Real-time Word Hover Highlight Overlay (Requirement 2) */}
      {hoverWordRect && (
        <div
          className="pointer-events-none fixed z-[9998] transition-all duration-75"
          style={{
            left: `${hoverWordRect.left - 2}px`,
            top: `${hoverWordRect.top - 1}px`,
            width: `${hoverWordRect.width + 4}px`,
            height: `${hoverWordRect.height + 2}px`,
            backgroundColor: 'rgba(147, 197, 253, 0.45)', // Soft blue-purple highlight like Image 2
            border: '1.5px solid rgba(59, 130, 246, 0.85)',
            borderRadius: '3px',
            boxShadow: '0 0 6px rgba(59, 130, 246, 0.35)',
          }}
        />
      )}

      {/* 1. Zhongwen-style Dictionary Hover Tooltip (Requirements 1 & 3) */}
      <DictionaryTooltip
        result={hoverResult}
        position={hoverPosition}
        placement={hoverPlacement}
        arrowOffset={hoverArrowOffset}
        attachedNote={
          hoverResult
            ? annotations.find(
                (a) =>
                  a.pageNumber === currentPage &&
                  (a.text === hoverResult.word ||
                    a.text.includes(hoverResult.word) ||
                    hoverResult.word.includes(a.text))
              )
            : null
        }
        onMouseEnter={handleTooltipMouseEnter}
        onMouseLeave={handleTooltipMouseLeave}
        onPinPinyin={handleTooltipPinPinyin}
        onPinVietnamese={handleTooltipPinVietnamese}
        onAddNote={handleTooltipAddNote}
      />

      {/* 2. Floating Text Selection Toolbar */}
      <SelectionToolbar
        selection={selectionState}
        onLookup={handleLookupSelection}
        onPinPinyin={handlePinPinyin}
        onPinVietnamese={handlePinVietnamese}
        onHighlight={handleAddHighlight}
        onAddNote={handleOpenAddNote}
        onClose={() => setSelectionState(null)}
      />

      {/* 3. Annotation Detail & Edit Modal */}
      <AnnotationModal
        annotation={activeAnnotation}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setActiveAnnotation(null);
        }}
        onSave={handleSaveModal}
        onDelete={async (id) => {
          await onDeleteAnnotation(id);
          setIsModalOpen(false);
          setActiveAnnotation(null);
        }}
      />
    </main>
  );
};
