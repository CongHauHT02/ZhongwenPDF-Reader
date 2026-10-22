import React, { useState } from 'react';
import type { PdfAnnotation } from '../types';
import { HIGHLIGHT_COLORS } from '../types';
import { X, Trash2, Save, FileText, Languages, BookmarkPlus } from 'lucide-react';

interface AnnotationModalProps {
  annotation: PdfAnnotation | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, updates: Partial<PdfAnnotation>) => void;
  onDelete: (id: string) => void;
}

export const AnnotationModal: React.FC<AnnotationModalProps> = ({
  annotation,
  isOpen,
  onClose,
  onSave,
  onDelete,
}) => {
  if (!isOpen || !annotation) return null;

  const [pinyin, setPinyin] = useState(annotation.pinyin || '');
  const [vietnamese, setVietnamese] = useState(annotation.vietnamese || '');
  const [noteContent, setNoteContent] = useState(annotation.noteContent || '');
  const [color, setColor] = useState(annotation.color || 'rgba(254, 240, 138, 0.45)');

  const handleSave = () => {
    onSave(annotation.id, {
      pinyin: pinyin.trim() || undefined,
      vietnamese: vietnamese.trim() || undefined,
      noteContent: noteContent.trim() || undefined,
      color,
    });
    onClose();
  };

  const handleDelete = () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa ghi chú này không?')) {
      onDelete(annotation.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl p-4 sm:p-6 text-slate-100 animate-in fade-in zoom-in-95 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-3 mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-100">Chi tiết Ghi chú</h3>
            <p className="text-xs text-slate-400 mt-0.5">Trang {annotation.pageNumber}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selected Chinese Word Display */}
        <div className="bg-slate-800/70 border border-slate-700/50 rounded-xl p-3 mb-4 text-center">
          <div className="text-xs text-slate-400 mb-1">Từ / Cụm từ gốc:</div>
          <div className="font-serifZh text-3xl font-bold text-amber-400 tracking-wider">
            {annotation.text}
          </div>
        </div>

        {/* Fields */}
        <div className="space-y-3 mb-5">
          {/* Pinyin */}
          <div>
            <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5 mb-1">
              <BookmarkPlus className="w-3.5 h-3.5 text-orange-400" />
              <span>Phiên âm Pinyin</span>
            </label>
            <input
              type="text"
              value={pinyin}
              onChange={(e) => setPinyin(e.target.value)}
              placeholder="VD: xuéxí"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Vietnamese Meaning */}
          <div>
            <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5 mb-1">
              <Languages className="w-3.5 h-3.5 text-emerald-400" />
              <span>Nghĩa tiếng Việt</span>
            </label>
            <input
              type="text"
              value={vietnamese}
              onChange={(e) => setVietnamese(e.target.value)}
              placeholder="VD: học tập, nghiên cứu"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Personal Note */}
          <div>
            <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5 mb-1">
              <FileText className="w-3.5 h-3.5 text-sky-400" />
              <span>Ghi chú cá nhân</span>
            </label>
            <textarea
              rows={3}
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Nhập ghi chú thêm hoặc ngữ cảnh sử dụng..."
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-sky-500 resize-none"
            />
          </div>

          {/* Color selection for highlight and note */}
          {(annotation.type === 'highlight' || annotation.type === 'note') && (
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">
                Màu sắc Highlight / Đánh dấu
              </label>
              <div className="flex items-center gap-2">
                {HIGHLIGHT_COLORS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setColor(c.bgHex)}
                    style={{ backgroundColor: c.borderHex }}
                    className={`w-6 h-6 rounded-full border-2 transition-transform ${
                      color === c.bgHex ? 'scale-125 border-white ring-2 ring-amber-400' : 'border-transparent'
                    }`}
                    title={c.name}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between border-t border-slate-800 pt-4">
          <button
            onClick={handleDelete}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-950/60 border border-red-800/60 text-red-400 hover:bg-red-900 text-xs font-medium transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>Xóa</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-semibold transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Lưu thay đổi</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
