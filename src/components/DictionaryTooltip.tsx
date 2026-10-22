import React, { useRef } from 'react';
import type { LookupResult, PdfAnnotation } from '../types';
import { Volume2, BookmarkPlus, PlusCircle, Languages, FileText, X } from 'lucide-react';

interface DictionaryTooltipProps {
  result: LookupResult | null;
  position: { x: number; y: number } | null;
  placement?: 'top' | 'bottom';
  arrowOffset?: number;
  attachedNote?: PdfAnnotation | null;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onPinPinyin?: (word: string, pinyin: string) => void;
  onPinVietnamese?: (word: string, vietnamese: string) => void;
  onAddNote?: () => void;
  onClose?: () => void;
}

// Tone detection regex for standard Pinyin tone marks
const tone1 = /[āēīōūǖĀĒĪŌŪǕ]/;
const tone2 = /[áéíóúǘÁÉÍÓÚǗ]/;
const tone3 = /[ǎěǐǒǔǚǍĚǏǑǓǙ]/;
const tone4 = /[àèìòùǜÀÈÌÒÙǛ]/;

export function renderColoredPinyin(pinyinText: string) {
  if (!pinyinText) return null;
  const syllables = pinyinText.split(/\s+/);
  return syllables.map((s, idx) => {
    let colorClass = 'text-slate-600';
    if (tone1.test(s)) colorClass = 'text-red-600';
    else if (tone2.test(s)) colorClass = 'text-amber-600';
    else if (tone3.test(s)) colorClass = 'text-emerald-600';
    else if (tone4.test(s)) colorClass = 'text-blue-600';

    return (
      <span key={idx} className={`${colorClass} font-semibold font-mono tracking-wide mr-1`}>
        {s}
      </span>
    );
  });
}

export const DictionaryTooltip: React.FC<DictionaryTooltipProps> = ({
  result,
  position,
  placement = 'bottom',
  arrowOffset = 24,
  attachedNote,
  onMouseEnter,
  onMouseLeave,
  onPinPinyin,
  onPinVietnamese,
  onAddNote,
  onClose,
}) => {
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Text to speech for Chinese pronunciation
  const handlePronounce = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!result || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const utterance = new SpeechSynthesisUtterance(result.word);
    utterance.lang = 'zh-CN';
    utterance.rate = 0.85;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  if (!result || !position) return null;

  const { word, entry } = result;

  // Responsive device detection
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const isMobile = viewportWidth < 640;

  // Horizontal rectangular dimensions for desktop/tablet
  const tooltipWidth = Math.min(460, viewportWidth - 32);

  let left = position.x;
  if (left + tooltipWidth > viewportWidth - 16) {
    left = viewportWidth - tooltipWidth - 16;
  }
  if (left < 16) {
    left = 16;
  }

  const top = position.y;
  const safeArrowOffset = Math.max(16, Math.min(tooltipWidth - 20, arrowOffset));

  return (
    <div
      ref={tooltipRef}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={
        isMobile
          ? {
              position: 'fixed',
              left: '12px',
              right: '12px',
              bottom: '16px',
              zIndex: 9999,
              maxWidth: 'calc(100vw - 24px)',
            }
          : {
              position: 'fixed',
              left: `${left}px`,
              top: `${top}px`,
              zIndex: 9999,
              width: `${tooltipWidth}px`,
            }
      }
      className="animate-in fade-in zoom-in-95 duration-150 bg-[#ffffcc] text-slate-900 border border-amber-400/90 rounded-xl shadow-2xl px-3.5 py-2.5 text-left pointer-events-auto select-none"
    >
      {/* Pointing Arrow Indicator (Desktop / Laptop / Tablet only) */}
      {!isMobile && (
        placement === 'bottom' ? (
          <div
            style={{ left: `${safeArrowOffset}px` }}
            className="absolute -top-2 w-3.5 h-3.5 bg-[#ffffcc] border-t border-l border-amber-400 rotate-45 -translate-x-1/2 pointer-events-none"
          />
        ) : (
          <div
            style={{ left: `${safeArrowOffset}px` }}
            className="absolute -bottom-2 w-3.5 h-3.5 bg-[#ffffcc] border-b border-r border-amber-400 rotate-45 -translate-x-1/2 pointer-events-none"
          />
        )
      )}

      {/* Row 1: Hanzi + Traditional + Tone-colored Pinyin + Han-Viet + Audio + Actions */}
      <div className="flex items-center justify-between gap-2 border-b border-amber-300/60 pb-1.5 mb-1.5">
        <div className="flex items-baseline flex-wrap gap-x-2 gap-y-0.5">
          {/* Simplified Word */}
          <span className="font-serifZh text-2xl font-bold tracking-wide text-blue-700">
            {entry.simplified}
          </span>

          {/* Traditional Word (if distinct) */}
          {entry.traditional && entry.traditional !== entry.simplified && (
            <span className="font-serifZh text-lg text-blue-500">
              {entry.traditional}
            </span>
          )}

          {/* Tone-marked Pinyin */}
          {entry.pinyin && (
            <span className="text-base font-semibold">
              {renderColoredPinyin(entry.pinyin)}
            </span>
          )}

          {/* Han-Viet Tag */}
          {entry.hanviet && (
            <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded text-[11px] font-bold uppercase tracking-wider">
              {entry.hanviet}
            </span>
          )}

          {/* Pronounce Audio */}
          <button
            onClick={handlePronounce}
            title="Phát âm tiếng Trung"
            className="p-1 text-slate-600 hover:text-blue-700 hover:bg-amber-200/60 rounded transition-colors"
          >
            <Volume2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Quick Actions Toolbar */}
        <div className="flex items-center gap-1 flex-shrink-0 text-[11px]">
          {onPinPinyin && entry.pinyin && (
            <button
              onClick={() => onPinPinyin(word, entry.pinyin)}
              className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-100/80 hover:bg-amber-200 border border-amber-300/80 text-amber-900 font-medium transition-colors"
              title="Gắn Pinyin trên chữ này"
            >
              <BookmarkPlus className="w-3 h-3 text-orange-600" />
              <span>Pinyin</span>
            </button>
          )}

          {onPinVietnamese && entry.meanings.length > 0 && (
            <button
              onClick={() => onPinVietnamese(word, entry.meanings[0])}
              className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-100/80 hover:bg-emerald-200 border border-emerald-300 text-emerald-900 font-medium transition-colors"
              title="Gắn nghĩa tiếng Việt trên chữ này"
            >
              <Languages className="w-3 h-3 text-emerald-700" />
              <span>Nghĩa</span>
            </button>
          )}

          {onAddNote && (
            <button
              onClick={onAddNote}
              className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-sky-100/80 hover:bg-sky-200 border border-sky-300 text-sky-900 font-medium transition-colors"
              title="Thêm ghi chú"
            >
              <PlusCircle className="w-3 h-3 text-sky-700" />
              <span>Ghi chú</span>
            </button>
          )}

          {onClose && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-1 rounded hover:bg-amber-200 text-slate-500 hover:text-slate-800 transition-colors ml-0.5"
              title="Đóng bảng tra từ"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Row 2: Vietnamese Definitions (horizontal compact layout separated by ◆) */}
      <div className="text-xs text-slate-900 font-medium leading-relaxed mb-1 flex items-baseline gap-1">
        <span className="text-slate-500 font-normal flex-shrink-0 text-[11px]">Nghĩa:</span>
        <div className="flex-1 font-semibold text-slate-900">
          {entry.meanings.slice(0, 4).map((m, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <span className="text-amber-600 mx-1.5">◆</span>}
              <span>{m}</span>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Row 3: Chiết tự / Từng chữ (Sub-entries breakdown in a single compact row) */}
      {entry.subEntries && entry.subEntries.length > 0 && (
        <div className="text-[11px] text-slate-700 pt-1 border-t border-amber-300/40 flex items-baseline gap-1">
          <span className="text-slate-500 text-[10px] flex-shrink-0">Chiết tự:</span>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            {entry.subEntries.map((sub, idx) => (
              <span key={idx} className="inline-flex items-baseline gap-1 bg-amber-100/50 px-1 py-0.2 rounded border border-amber-200/60">
                <span className="font-serifZh font-bold text-blue-700">{sub.simplified}</span>
                {sub.pinyin && <span className="text-slate-600 text-[10px]">{renderColoredPinyin(sub.pinyin)}</span>}
                {sub.hanviet && (
                  <span className="text-emerald-800 uppercase font-semibold text-[9px]">
                    [{sub.hanviet}]
                  </span>
                )}
                {sub.meanings?.[0] && !sub.meanings[0].startsWith('Hán-Việt') && (
                  <span className="text-slate-800 text-[10px]">{sub.meanings[0]}</span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Row 4: Attached User Note (if this word has been saved with a personal note) */}
      {attachedNote && (
        <div className="mt-1.5 pt-1 border-t border-amber-300/60 flex items-start gap-1 text-[11px] text-amber-900 bg-amber-200/50 px-2 py-1 rounded">
          <FileText className="w-3.5 h-3.5 text-amber-700 flex-shrink-0 mt-0.5" />
          <div className="leading-snug">
            <span className="font-bold">Ghi chú của bạn: </span>
            <span>{attachedNote.noteContent || attachedNote.vietnamese || 'Đã lưu'}</span>
          </div>
        </div>
      )}
    </div>
  );
};
