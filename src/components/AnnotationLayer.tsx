import React, { useState, useRef } from 'react';
import type { PdfAnnotation, ViewerSettings } from '../types';
import { FileText, Languages } from 'lucide-react';
import { renderColoredPinyin } from './DictionaryTooltip';

interface AnnotationLayerProps {
  annotations: PdfAnnotation[];
  pageWidth: number;
  pageHeight: number;
  settings: ViewerSettings;
  onAnnotationClick: (ann: PdfAnnotation) => void;
}

export const AnnotationLayer: React.FC<AnnotationLayerProps> = ({
  annotations,
  pageWidth,
  pageHeight,
  settings,
  onAnnotationClick,
}) => {
  const [hoveredAnn, setHoveredAnn] = useState<PdfAnnotation | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const hideTimerRef = useRef<any>(null);

  if (pageWidth <= 0 || pageHeight <= 0) return null;

  const handleMouseEnter = (ann: PdfAnnotation, e: React.MouseEvent) => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setHoverPos({
      x: rect.left,
      y: rect.bottom + 8,
    });
    setHoveredAnn(ann);
  };

  const handleMouseLeave = () => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setHoveredAnn(null);
      setHoverPos(null);
    }, 200);
  };

  return (
    <div
      className="annotation-layer absolute inset-0 pointer-events-none z-10"
      style={{ width: `${pageWidth}px`, height: `${pageHeight}px` }}
    >
      {annotations.map((ann) => {
        const isHighlight = ann.type === 'highlight' && settings.showHighlights;
        const isPinyin = ann.type === 'pinyin' && settings.showPinyinOverlay;
        const isVietnamese = ann.type === 'vietnamese' && settings.showVietnameseOverlay;
        const isNote = ann.type === 'note';

        // Anchor rect is usually the first line bounding box
        const anchorRect = ann.rects[0];
        if (!anchorRect) return null;

        return (
          <React.Fragment key={ann.id}>
            {/* 1. Highlight Rectangles: Render for BOTH 'highlight' and 'note' */}
            {(isHighlight || isNote) &&
              ann.rects.map((rect, idx) => (
                <div
                  key={`${ann.id}-rect-${idx}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onAnnotationClick(ann);
                  }}
                  onMouseEnter={(e) => handleMouseEnter(ann, e)}
                  onMouseLeave={handleMouseLeave}
                  style={{
                    left: `${rect.x * pageWidth}px`,
                    top: `${rect.y * pageHeight}px`,
                    width: `${rect.width * pageWidth}px`,
                    height: `${rect.height * pageHeight}px`,
                    backgroundColor: ann.color || (isNote ? 'rgba(254, 240, 138, 0.55)' : 'rgba(254, 240, 138, 0.45)'),
                    borderBottom: isNote ? '2px solid #f59e0b' : undefined,
                  }}
                  className={`absolute pointer-events-auto cursor-pointer rounded-sm mix-blend-multiply dark:mix-blend-screen transition-all ${
                    isNote ? 'hover:ring-2 hover:ring-amber-500/80 shadow-sm' : 'hover:opacity-80'
                  }`}
                  title={isNote ? `Ghi chú: ${ann.text} (Nhấp để sửa)` : `Đánh dấu: ${ann.text}`}
                />
              ))}

            {/* 2. Pinyin Floating Badge above the word */}
            {isPinyin && ann.pinyin && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onAnnotationClick(ann);
                }}
                style={{
                  left: `${(anchorRect.x + anchorRect.width / 2) * pageWidth}px`,
                  top: `${anchorRect.y * pageHeight - 18}px`,
                  transform: 'translateX(-50%)',
                }}
                className="absolute pointer-events-auto cursor-pointer bg-slate-900/95 border border-orange-500/50 shadow-md text-orange-400 font-semibold px-1.5 py-0.2 rounded text-[11px] leading-tight whitespace-nowrap hover:scale-110 transition-transform"
                title={`Pinyin: ${ann.pinyin}`}
              >
                {ann.pinyin}
              </div>
            )}

            {/* 3. Vietnamese Meaning Floating Tag below the word */}
            {isVietnamese && ann.vietnamese && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onAnnotationClick(ann);
                }}
                style={{
                  left: `${anchorRect.x * pageWidth}px`,
                  top: `${(anchorRect.y + anchorRect.height) * pageHeight + 2}px`,
                }}
                className="absolute pointer-events-auto cursor-pointer bg-slate-900/95 border border-emerald-500/50 shadow-md text-emerald-300 font-medium px-1.5 py-0.5 rounded text-[10px] leading-tight max-w-[200px] truncate hover:scale-105 transition-transform"
                title={`Nghĩa: ${ann.vietnamese}`}
              >
                {ann.vietnamese}
              </div>
            )}

            {/* 4. Personal Note Badge Icon */}
            {isNote && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onAnnotationClick(ann);
                }}
                onMouseEnter={(e) => handleMouseEnter(ann, e)}
                onMouseLeave={handleMouseLeave}
                style={{
                  left: `${(anchorRect.x + anchorRect.width) * pageWidth - 4}px`,
                  top: `${anchorRect.y * pageHeight - 12}px`,
                }}
                className="absolute pointer-events-auto cursor-pointer p-1 rounded-full bg-amber-500 text-slate-950 shadow-lg hover:scale-125 transition-transform z-20"
                title={`Ghi chú: ${ann.noteContent || ann.text}`}
              >
                <FileText className="w-3.5 h-3.5 font-bold" />
              </div>
            )}
          </React.Fragment>
        );
      })}

      {/* Floating Tooltip when hovering over a saved Note / Annotation */}
      {hoveredAnn && hoverPos && (
        <div
          onMouseEnter={() => {
            if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
          }}
          onMouseLeave={handleMouseLeave}
          onClick={(e) => {
            e.stopPropagation();
            onAnnotationClick(hoveredAnn);
          }}
          style={{
            position: 'fixed',
            left: `${Math.min(window.innerWidth - 320, Math.max(16, hoverPos.x))}px`,
            top: `${Math.min(window.innerHeight - 180, hoverPos.y)}px`,
            zIndex: 99999,
            width: '320px',
          }}
          className="pointer-events-auto cursor-pointer animate-in fade-in zoom-in-95 duration-150 bg-[#ffffcc] text-slate-900 border border-amber-400 rounded-xl shadow-2xl p-3 text-left"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-amber-300/80 pb-1.5 mb-2">
            <div className="flex items-baseline gap-2">
              <span className="font-serifZh text-xl font-bold text-blue-700">
                {hoveredAnn.text}
              </span>
              {hoveredAnn.pinyin && (
                <span className="text-sm">
                  {renderColoredPinyin(hoveredAnn.pinyin)}
                </span>
              )}
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 font-semibold border border-amber-300">
              Ghi chú
            </span>
          </div>

          {/* Vietnamese Meaning if present */}
          {hoveredAnn.vietnamese && (
            <div className="text-xs text-slate-800 font-medium mb-1.5 flex items-start gap-1">
              <Languages className="w-3.5 h-3.5 text-emerald-700 flex-shrink-0 mt-0.5" />
              <div>
                <span className="text-slate-500 font-normal">Nghĩa: </span>
                <span className="font-semibold text-emerald-900">{hoveredAnn.vietnamese}</span>
              </div>
            </div>
          )}

          {/* Personal Note Content */}
          {hoveredAnn.noteContent && (
            <div className="text-xs text-slate-900 bg-amber-200/50 p-2 rounded border border-amber-300/60 mb-2 leading-relaxed">
              <div className="text-[10px] text-amber-800 font-bold uppercase mb-0.5 flex items-center gap-1">
                <FileText className="w-3 h-3 text-amber-700" />
                <span>Nội dung ghi chú:</span>
              </div>
              <div className="font-medium whitespace-pre-wrap">{hoveredAnn.noteContent}</div>
            </div>
          )}

          <div className="text-[10px] text-slate-500 text-right italic">
            Nhấp để chỉnh sửa / xóa
          </div>
        </div>
      )}
    </div>
  );
};
