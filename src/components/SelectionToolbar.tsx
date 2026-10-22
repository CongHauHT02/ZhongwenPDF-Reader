import React, { useState } from 'react';
import type { SelectionState, HighlightColor } from '../types';
import { HIGHLIGHT_COLORS } from '../types';
import {
  BookOpen,
  BookmarkPlus,
  Languages,
  Highlighter,
  FileText,
  Copy,
  Check,
  ChevronDown,
  X,
} from 'lucide-react';

interface SelectionToolbarProps {
  selection: SelectionState | null;
  onLookup: (text: string) => void;
  onPinPinyin: () => void;
  onPinVietnamese: () => void;
  onHighlight: (color: HighlightColor) => void;
  onAddNote: () => void;
  onClose: () => void;
}

export const SelectionToolbar: React.FC<SelectionToolbarProps> = ({
  selection,
  onLookup,
  onPinPinyin,
  onPinVietnamese,
  onHighlight,
  onAddNote,
  onClose,
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!selection || !selection.menuPosition) return null;

  const { x, y } = selection.menuPosition;

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(selection.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      style={{
        position: 'fixed',
        left: `${x}px`,
        top: `${y}px`,
        transform: 'translate(-50%, -100%) translateY(-10px)',
        zIndex: 9998,
      }}
      className="animate-in fade-in zoom-in-95 duration-100 flex items-center bg-slate-900/95 backdrop-blur-md border border-slate-700 shadow-2xl rounded-lg p-1 gap-1 text-slate-200 select-none text-xs"
      onMouseDown={(e) => {
        // Prevent deselecting text on click
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {/* 1. Lookup */}
      <button
        onClick={() => onLookup(selection.text)}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded hover:bg-slate-800 hover:text-amber-400 transition-colors font-medium"
        title="Tra từ điển"
      >
        <BookOpen className="w-3.5 h-3.5 text-amber-400" />
        <span>Tra từ</span>
      </button>

      <div className="w-[1px] h-4 bg-slate-800" />

      {/* 2. Pin Pinyin */}
      <button
        onClick={onPinPinyin}
        className="flex items-center gap-1 px-2 py-1.5 rounded hover:bg-slate-800 hover:text-orange-400 transition-colors font-medium"
        title="Hiển thị Pinyin phía trên từ"
      >
        <BookmarkPlus className="w-3.5 h-3.5 text-orange-400" />
        <span>Pinyin</span>
      </button>

      {/* 3. Pin Vietnamese */}
      <button
        onClick={onPinVietnamese}
        className="flex items-center gap-1 px-2 py-1.5 rounded hover:bg-slate-800 hover:text-emerald-400 transition-colors font-medium"
        title="Hiển thị nghĩa tiếng Việt"
      >
        <Languages className="w-3.5 h-3.5 text-emerald-400" />
        <span>Nghĩa TV</span>
      </button>

      <div className="w-[1px] h-4 bg-slate-800" />

      {/* 4. Highlight with dropdown color picker */}
      <div className="relative">
        <button
          onClick={() => setShowColorPicker(!showColorPicker)}
          className="flex items-center gap-1 px-2 py-1.5 rounded hover:bg-slate-800 hover:text-yellow-400 transition-colors font-medium"
          title="Đánh dấu highlight"
        >
          <Highlighter className="w-3.5 h-3.5 text-yellow-400" />
          <span>Tô màu</span>
          <ChevronDown className="w-3 h-3 text-slate-400" />
        </button>

        {showColorPicker && (
          <div className="absolute left-0 bottom-full mb-1 flex items-center gap-1.5 bg-slate-900 border border-slate-700 p-1.5 rounded-lg shadow-xl z-50">
            {HIGHLIGHT_COLORS.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  onHighlight(c);
                  setShowColorPicker(false);
                }}
                className="w-5 h-5 rounded-full border border-slate-600 transition-transform hover:scale-125 focus:scale-125"
                style={{ backgroundColor: c.borderHex }}
                title={`Màu ${c.name}`}
              />
            ))}
          </div>
        )}
      </div>

      <div className="w-[1px] h-4 bg-slate-800" />

      {/* 5. Add Note */}
      <button
        onClick={onAddNote}
        className="flex items-center gap-1 px-2 py-1.5 rounded hover:bg-slate-800 hover:text-sky-400 transition-colors font-medium"
        title="Thêm ghi chú cá nhân"
      >
        <FileText className="w-3.5 h-3.5 text-sky-400" />
        <span>Ghi chú</span>
      </button>

      {/* 6. Copy */}
      <button
        onClick={handleCopy}
        className="p-1.5 rounded hover:bg-slate-800 hover:text-white transition-colors"
        title="Sao chép văn bản"
      >
        {copied ? (
          <Check className="w-3.5 h-3.5 text-emerald-400" />
        ) : (
          <Copy className="w-3.5 h-3.5 text-slate-400" />
        )}
      </button>

      {/* 7. Close */}
      <button
        onClick={onClose}
        className="p-1.5 rounded hover:bg-slate-800 hover:text-red-400 transition-colors ml-0.5"
        title="Đóng menu"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
