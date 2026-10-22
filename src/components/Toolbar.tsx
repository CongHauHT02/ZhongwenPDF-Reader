import React from 'react';
import type { ViewerSettings } from '../types';
import {
  Upload,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
  Languages,
  Highlighter,
  BookmarkPlus,
  MousePointer,
  History,
  FileText,
} from 'lucide-react';

interface ToolbarProps {
  documentName: string | null;
  currentPage: number;
  totalPages: number;
  scale: number;
  settings: ViewerSettings;
  onPageChange: (newPage: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onToggleFitWidth: () => void;
  onUpdateSettings: (newSettings: Partial<ViewerSettings>) => void;
  onUploadClick: () => void;
  onExportPdf: () => void;
  onToggleNotesPanel: () => void;
  onToggleHistoryDrawer: () => void;
  notesCount: number;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  documentName,
  currentPage,
  totalPages,
  scale,
  settings,
  onPageChange,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onToggleFitWidth,
  onUpdateSettings,
  onUploadClick,
  onExportPdf,
  onToggleNotesPanel,
  onToggleHistoryDrawer,
  notesCount,
}) => {
  return (
    <header className="h-14 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between text-slate-200 select-none z-40 relative">
      {/* Left: Brand + File Picker */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 mr-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-600 to-rose-600 flex items-center justify-center shadow-lg font-serifZh font-bold text-lg text-white">
            中
          </div>
          <div className="hidden sm:block">
            <span className="font-bold text-sm tracking-wide text-slate-100">Zhongwen</span>
            <span className="text-amber-400 font-semibold text-xs ml-1">PDF</span>
          </div>
        </div>

        {/* Upload Button */}
        <button
          onClick={onUploadClick}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold text-xs shadow-md transition-colors"
          title="Tải lên file PDF từ máy tính"
        >
          <Upload className="w-4 h-4" />
          <span className="hidden md:inline">Mở PDF</span>
        </button>

        {/* History / Recent documents button */}
        <button
          onClick={onToggleHistoryDrawer}
          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          title="Tài liệu đã mở gần đây"
        >
          <History className="w-4 h-4" />
        </button>

        {/* Current Document Name */}
        {documentName && (
          <div className="hidden lg:flex items-center text-xs text-slate-400 max-w-[180px] xl:max-w-[260px] truncate border-l border-slate-800 pl-3">
            <span className="truncate" title={documentName}>
              {documentName}
            </span>
          </div>
        )}
      </div>

      {/* Center: Pagination & Zoom */}
      {totalPages > 0 && (
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Pagination */}
          <div className="flex items-center gap-1 bg-slate-800/80 rounded-lg p-1 border border-slate-700/60 text-xs">
            <button
              disabled={currentPage <= 1}
              onClick={() => onPageChange(currentPage - 1)}
              className="p-1 rounded hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent"
              title="Trang trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-1 text-slate-300 font-medium">
              <span className="text-amber-400 font-bold">{currentPage}</span> / {totalPages}
            </span>

            <button
              disabled={currentPage >= totalPages}
              onClick={() => onPageChange(currentPage + 1)}
              className="p-1 rounded hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent"
              title="Trang sau"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Zoom controls */}
          <div className="hidden md:flex items-center gap-1 bg-slate-800/80 rounded-lg p-1 border border-slate-700/60 text-xs">
            <button
              onClick={onZoomOut}
              className="p-1 rounded hover:bg-slate-700"
              title="Thu nhỏ"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onResetZoom}
              className="px-1.5 font-medium text-slate-300 hover:text-white"
              title="Khôi phục 100%"
            >
              {Math.round(scale * 100)}%
            </button>

            <button
              onClick={onZoomIn}
              className="p-1 rounded hover:bg-slate-700"
              title="Phóng to"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onToggleFitWidth}
              className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white"
              title="Vừa chiều rộng màn hình"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Right: Layer Toggles & Export & Notes */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Hover dictionary toggle */}
        <button
          onClick={() =>
            onUpdateSettings({ hoverDictionaryEnabled: !settings.hoverDictionaryEnabled })
          }
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
            settings.hoverDictionaryEnabled
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              : 'bg-slate-800 text-slate-400 border-slate-700'
          }`}
          title="Bật/Tắt tra từ khi rê chuột"
        >
          <MousePointer className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Rê chuột tra từ</span>
        </button>

        {/* Pinyin Overlay Toggle */}
        <button
          onClick={() =>
            onUpdateSettings({ showPinyinOverlay: !settings.showPinyinOverlay })
          }
          className={`p-1.5 rounded-lg border text-xs transition-colors ${
            settings.showPinyinOverlay
              ? 'bg-orange-500/20 text-orange-300 border-orange-500/40'
              : 'bg-slate-800 text-slate-500 border-slate-700'
          }`}
          title="Ẩn/Hiện lớp Pinyin"
        >
          <BookmarkPlus className="w-4 h-4" />
        </button>

        {/* Vietnamese Overlay Toggle */}
        <button
          onClick={() =>
            onUpdateSettings({ showVietnameseOverlay: !settings.showVietnameseOverlay })
          }
          className={`p-1.5 rounded-lg border text-xs transition-colors ${
            settings.showVietnameseOverlay
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              : 'bg-slate-800 text-slate-500 border-slate-700'
          }`}
          title="Ẩn/Hiện lớp nghĩa tiếng Việt"
        >
          <Languages className="w-4 h-4" />
        </button>

        {/* Highlight Toggle */}
        <button
          onClick={() =>
            onUpdateSettings({ showHighlights: !settings.showHighlights })
          }
          className={`p-1.5 rounded-lg border text-xs transition-colors ${
            settings.showHighlights
              ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40'
              : 'bg-slate-800 text-slate-500 border-slate-700'
          }`}
          title="Ẩn/Hiện lớp Highlight"
        >
          <Highlighter className="w-4 h-4" />
        </button>

        {/* Export PDF Button */}
        {totalPages > 0 && (
          <button
            onClick={onExportPdf}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow transition-colors"
            title="Xuất file PDF mới có chứa highlight và ghi chú"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Xuất PDF</span>
          </button>
        )}

        {/* Open Notes Drawer Button */}
        <button
          onClick={onToggleNotesPanel}
          className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium transition-colors"
          title="Mở danh sách từ vựng & ghi chú"
        >
          <FileText className="w-4 h-4 text-amber-400" />
          <span className="hidden sm:inline">Ghi chú</span>
          {notesCount > 0 && (
            <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px]">
              {notesCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
