import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import type { PdfAnnotation, ViewerSettings, SelectionState, NormalizedRect } from '../types';
import { AnnotationLayer } from './AnnotationLayer';
import { AlertCircle } from 'lucide-react';

interface PdfPageProps {
  pdfDocument: pdfjsLib.PDFDocumentProxy;
  pageNumber: number;
  scale: number;
  settings: ViewerSettings;
  annotations: PdfAnnotation[];
  onHoverText: (fullText: string, charIndex: number, textNode: Node, clientRect: DOMRect) => void;
  onHoverLeave: () => void;
  onTextSelected: (selection: SelectionState) => void;
  onAnnotationClick: (ann: PdfAnnotation) => void;
}

export const PdfPage: React.FC<PdfPageProps> = ({
  pdfDocument,
  pageNumber,
  scale,
  settings,
  annotations,
  onHoverText,
  onHoverLeave,
  onTextSelected,
  onAnnotationClick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);

  const [pageWidth, setPageWidth] = useState<number>(0);
  const [pageHeight, setPageHeight] = useState<number>(0);
  const [isRendering, setIsRendering] = useState<boolean>(true);
  const [isScannedPage, setIsScannedPage] = useState<boolean>(false);
  const renderTaskRef = useRef<any>(null);

  // Render Canvas and TextLayer
  useEffect(() => {
    let isCancelled = false;

    const renderPage = async () => {
      try {
        setIsRendering(true);
        const page = await pdfDocument.getPage(pageNumber);
        if (isCancelled) return;

        // Base viewport for layout
        const viewport = page.getViewport({ scale });
        const width = Math.floor(viewport.width);
        const height = Math.floor(viewport.height);

        setPageWidth(width);
        setPageHeight(height);

        // 1. Render Canvas with high-DPI crispness
        const canvas = canvasRef.current;
        if (canvas) {
          const pixelRatio = window.devicePixelRatio || 1;
          canvas.width = Math.floor(width * pixelRatio);
          canvas.height = Math.floor(height * pixelRatio);
          canvas.style.width = `${width}px`;
          canvas.style.height = `${height}px`;

          const canvasContext = canvas.getContext('2d');
          if (canvasContext) {
            canvasContext.imageSmoothingEnabled = true;

            // Cancel any prior rendering task
            if (renderTaskRef.current) {
              renderTaskRef.current.cancel();
            }

            const renderContext = {
              canvasContext,
              viewport,
              transform: pixelRatio !== 1 ? [pixelRatio, 0, 0, pixelRatio, 0, 0] : undefined,
            };

            const renderTask = page.render(renderContext);
            renderTaskRef.current = renderTask;
            await renderTask.promise;
          }
        }

        if (isCancelled) return;

        // 2. Render TextLayer
        const textLayerDiv = textLayerRef.current;
        if (textLayerDiv) {
          textLayerDiv.innerHTML = '';
          textLayerDiv.style.width = `${width}px`;
          textLayerDiv.style.height = `${height}px`;

          const textContent = await page.getTextContent();
          if (isCancelled) return;

          // Check if this is a scanned/image-only PDF page
          if (!textContent.items || textContent.items.length === 0) {
            setIsScannedPage(true);
          } else {
            setIsScannedPage(false);
            const textLayerTask = pdfjsLib.renderTextLayer({
              textContentSource: textContent,
              container: textLayerDiv,
              viewport,
              textDivs: [],
            });
            await textLayerTask.promise;
          }
        }

        setIsRendering(false);
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error(`Lỗi render trang ${pageNumber}:`, err);
        }
      }
    };

    renderPage();

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
    };
  }, [pdfDocument, pageNumber, scale]);

  // Handle Hover over TextLayer spans using caretPositionFromPoint / caretRangeFromPoint
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!settings.hoverDictionaryEnabled) return;

      let targetNode: Node | null = null;
      let offset: number = 0;

      // Extract exact character offset under cursor
      if (document.caretRangeFromPoint) {
        const range = document.caretRangeFromPoint(e.clientX, e.clientY);
        if (range && range.startContainer.nodeType === Node.TEXT_NODE) {
          targetNode = range.startContainer;
          offset = range.startOffset;
        }
      } else if ((document as any).caretPositionFromPoint) {
        const pos = (document as any).caretPositionFromPoint(e.clientX, e.clientY);
        if (pos && pos.offsetNode.nodeType === Node.TEXT_NODE) {
          targetNode = pos.offsetNode;
          offset = pos.offset;
        }
      }

      if (targetNode && targetNode.textContent) {
        const fullText = targetNode.textContent;
        // Clamp offset
        const safeOffset = Math.min(Math.max(0, offset), fullText.length - 1);

        // Get approximate client rect of this text node/parent
        const parentSpan = targetNode.parentElement;
        const domRect = parentSpan ? parentSpan.getBoundingClientRect() : (e.target as HTMLElement).getBoundingClientRect();

        onHoverText(fullText, safeOffset, targetNode, domRect);
      }
    },
    [settings.hoverDictionaryEnabled, onHoverText]
  );

  // Track touch start position to distinguish tap from scrolling
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1) {
      touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (!settings.hoverDictionaryEnabled) return;
      if (!touchStartPos.current || e.changedTouches.length === 0) return;

      const touch = e.changedTouches[0];
      const dx = Math.abs(touch.clientX - touchStartPos.current.x);
      const dy = Math.abs(touch.clientY - touchStartPos.current.y);
      touchStartPos.current = null;

      // Only trigger if it was a quick tap, not a scroll gesture
      if (dx > 10 || dy > 10) return;

      // Check if user has active text selection
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed) return;

      let targetNode: Node | null = null;
      let offset: number = 0;

      if (document.caretRangeFromPoint) {
        const range = document.caretRangeFromPoint(touch.clientX, touch.clientY);
        if (range && range.startContainer.nodeType === Node.TEXT_NODE) {
          targetNode = range.startContainer;
          offset = range.startOffset;
        }
      } else if ((document as any).caretPositionFromPoint) {
        const pos = (document as any).caretPositionFromPoint(touch.clientX, touch.clientY);
        if (pos && pos.offsetNode.nodeType === Node.TEXT_NODE) {
          targetNode = pos.offsetNode;
          offset = pos.offset;
        }
      }

      if (targetNode && targetNode.textContent) {
        const fullText = targetNode.textContent;
        const safeOffset = Math.min(Math.max(0, offset), fullText.length - 1);
        const parentSpan = targetNode.parentElement;
        const domRect = parentSpan ? parentSpan.getBoundingClientRect() : (e.target as HTMLElement).getBoundingClientRect();

        onHoverText(fullText, safeOffset, targetNode, domRect);
      }
    },
    [settings.hoverDictionaryEnabled, onHoverText]
  );

  // Handle Selection completion on mouseup
  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const text = selection.toString().trim();
    if (!text) return;

    // Check if selection belongs to this page container
    const container = containerRef.current;
    if (!container || !container.contains(range.commonAncestorContainer)) return;

    const pageRect = container.getBoundingClientRect();
    const rawRects = Array.from(range.getClientRects()).filter(
      (r) => r.width > 2 && r.height > 2
    );

    if (rawRects.length === 0) return;

    // Calculate normalized coordinates
    const normRects: NormalizedRect[] = rawRects.map((r) => ({
      x: (r.left - pageRect.left) / pageRect.width,
      y: (r.top - pageRect.top) / pageRect.height,
      width: r.width / pageRect.width,
      height: r.height / pageRect.height,
    }));

    // Floating menu position: centered above the first selected line
    const anchor = rawRects[0];
    const menuPosition = {
      x: anchor.left + anchor.width / 2,
      y: anchor.top - 8,
    };

    onTextSelected({
      text,
      pageNumber,
      rects: normRects,
      clientRects: rawRects,
      menuPosition,
    });
  }, [pageNumber, onTextSelected]);

  return (
    <div
      ref={containerRef}
      id={`pdf-page-${pageNumber}`}
      onMouseUp={handleMouseUp}
      onMouseMove={handleMouseMove}
      onMouseLeave={onHoverLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{
        width: pageWidth ? `${pageWidth}px` : 'auto',
        height: pageHeight ? `${pageHeight}px` : 'auto',
      }}
      className="pdf-page-container relative bg-white mx-auto my-4 rounded shadow-2xl transition-all"
    >
      {/* 1. Underlying Canvas */}
      <canvas ref={canvasRef} className="block w-full h-full" />

      {/* 2. Interactive TextLayer */}
      <div
        ref={textLayerRef}
        className="textLayer"
      />

      {/* 3. Annotation Layer */}
      {pageWidth > 0 && pageHeight > 0 && (
        <AnnotationLayer
          annotations={annotations}
          pageWidth={pageWidth}
          pageHeight={pageHeight}
          settings={settings}
          onAnnotationClick={onAnnotationClick}
        />
      )}

      {/* Scanned/Image Warning overlay if no selectable text */}
      {isScannedPage && (
        <div className="absolute top-4 left-4 right-4 bg-amber-950/80 border border-amber-500/80 backdrop-blur-sm text-amber-200 px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2.5 text-xs z-20">
          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>
            <strong>Lưu ý:</strong> Trang này dạng hình ảnh scan, không có lớp văn bản (TextLayer) để chọn hoặc rê chuột tra từ trực tiếp.
          </span>
        </div>
      )}

      {/* Loading Skeleton Indicator */}
      {isRendering && (
        <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-[1px] flex items-center justify-center pointer-events-none z-30">
          <div className="text-xs bg-slate-900/80 text-slate-200 px-3 py-1.5 rounded-full shadow">
            Đang tải trang {pageNumber}...
          </div>
        </div>
      )}
    </div>
  );
};
