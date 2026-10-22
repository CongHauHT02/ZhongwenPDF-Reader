import React, { useState, useMemo } from 'react';
import type { PdfAnnotation } from '../types';
import {
  X,
  Search,
  Download,
  Trash2,
  FileText,
  BookmarkPlus,
  Languages,
  ArrowRight,
} from 'lucide-react';

interface NotesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  annotations: PdfAnnotation[];
  currentPage: number;
  onJumpToPage: (pageNumber: number) => void;
  onEditAnnotation: (ann: PdfAnnotation) => void;
  onDeleteAnnotation: (annId: string) => void;
  onClearAllAnnotations: () => void;
}

export const NotesPanel: React.FC<NotesPanelProps> = ({
  isOpen,
  onClose,
  annotations,
  currentPage,
  onJumpToPage,
  onEditAnnotation,
  onDeleteAnnotation,
  onClearAllAnnotations,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCurrentPageOnly, setFilterCurrentPageOnly] = useState(false);

  // Filtered annotations
  const filteredList = useMemo(() => {
    return annotations.filter((ann) => {
      if (filterCurrentPageOnly && ann.pageNumber !== currentPage) return false;
      if (!searchTerm.trim()) return true;

      const q = searchTerm.toLowerCase();
      const matchText = ann.text.toLowerCase().includes(q);
      const matchPinyin = ann.pinyin?.toLowerCase().includes(q) || false;
      const matchVietnamese = ann.vietnamese?.toLowerCase().includes(q) || false;
      const matchNote = ann.noteContent?.toLowerCase().includes(q) || false;

      return matchText || matchPinyin || matchVietnamese || matchNote;
    });
  }, [annotations, currentPage, filterCurrentPageOnly, searchTerm]);

  // Export to Anki-friendly CSV
  const handleExportCsv = () => {
    if (annotations.length === 0) {
      alert('Chưa có từ vựng hoặc ghi chú nào để xuất.');
      return;
    }

    const header = ['Từ tiếng Trung', 'Pinyin', 'Nghĩa tiếng Việt', 'Ghi chú', 'Trang'];
    const rows = annotations.map((ann) => [
      `"${ann.text.replace(/"/g, '""')}"`,
      `"${(ann.pinyin || '').replace(/"/g, '""')}"`,
      `"${(ann.vietnamese || '').replace(/"/g, '""')}"`,
      `"${(ann.noteContent || '').replace(/"/g, '""')}"`,
      ann.pageNumber,
    ]);

    const csvContent = '\uFEFF' + [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `zhongwen_vocabulary_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <aside
      className="fixed right-0 top-0 bottom-0 w-80 sm:w-96 bg-slate-900/95 backdrop-blur-md border-l border-slate-800 shadow-2xl flex flex-col z-50 text-slate-100 animate-in slide-in-from-right duration-200"
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-amber-400" />
          <h2 className="font-bold text-base text-slate-100">Ghi chú & Từ vựng</h2>
          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 text-xs font-semibold">
            {annotations.length}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          title="Đóng bảng ghi chú"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Controls: Search & Filter */}
      <div className="p-3 border-b border-slate-800 space-y-2">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Tìm theo chữ Hán, pinyin, nghĩa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-800 border border-slate-700/60 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-amber-500 placeholder-slate-500"
          />
        </div>

        {/* Filter Toggle & CSV Export */}
        <div className="flex items-center justify-between text-xs pt-1">
          <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
            <input
              type="checkbox"
              checked={filterCurrentPageOnly}
              onChange={(e) => setFilterCurrentPageOnly(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-amber-500 focus:ring-0"
            />
            <span>Chỉ trang hiện tại ({currentPage})</span>
          </label>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-400 transition-colors"
            title="Xuất danh sách sang file CSV cho Anki"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất CSV</span>
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {filteredList.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
            <p>Chưa có ghi chú nào phù hợp.</p>
            <p className="mt-1 text-[11px]">Bôi đen văn bản trên PDF để tạo ghi chú mới.</p>
          </div>
        ) : (
          filteredList.map((ann) => (
            <div
              key={ann.id}
              className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-3 hover:border-amber-500/50 transition-all cursor-pointer group"
              onClick={() => onEditAnnotation(ann)}
            >
              <div className="flex items-start justify-between mb-1.5">
                <span className="font-serifZh text-xl font-bold text-amber-300">
                  {ann.text}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onJumpToPage(ann.pageNumber);
                    }}
                    className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700 text-[11px] flex items-center gap-0.5"
                    title={`Đến trang ${ann.pageNumber}`}
                  >
                    <span>Trang {ann.pageNumber}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm('Xóa ghi chú này?')) {
                        onDeleteAnnotation(ann.id);
                      }
                    }}
                    className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-slate-700 transition-colors"
                    title="Xóa"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Pinyin */}
              {ann.pinyin && (
                <div className="text-orange-400 text-xs font-semibold mb-1 flex items-center gap-1">
                  <BookmarkPlus className="w-3 h-3 text-orange-400" />
                  <span>{ann.pinyin}</span>
                </div>
              )}

              {/* Vietnamese Meaning */}
              {ann.vietnamese && (
                <div className="text-emerald-300 text-xs mb-1 flex items-center gap-1">
                  <Languages className="w-3 h-3 text-emerald-400" />
                  <span>{ann.vietnamese}</span>
                </div>
              )}

              {/* Note Content */}
              {ann.noteContent && (
                <div className="bg-slate-900/60 rounded p-2 text-xs text-slate-300 border border-slate-800 italic mt-1.5">
                  "{ann.noteContent}"
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {annotations.length > 0 && (
        <div className="p-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Tổng cộng: {annotations.length} mục</span>
          <button
            onClick={() => {
              if (window.confirm('Bạn có chắc chắn muốn xóa TOÀN BỘ ghi chú của tài liệu này?')) {
                onClearAllAnnotations();
              }
            }}
            className="text-red-400 hover:text-red-300 flex items-center gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Xóa tất cả</span>
          </button>
        </div>
      )}
    </aside>
  );
};
