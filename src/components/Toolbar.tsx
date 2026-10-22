import React, { useState } from 'react';
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
  SlidersHorizontal,
  X,
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
      <header className="h-14 bg-slate-900 border-b border-slate-800 px-2.5 sm:px-4 flex items-center justify-between text-slate-200 select-none z-40 relative">
        {/* Left: Brand + File Picker */}
        <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-2">
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
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold text-xs shadow-md transition-colors"
            title="Tải lên file PDF từ máy tính / điện thoại"
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

          {/* Current Document Name (Desktop/Laptop) */}
          {documentName && (
            <div className="hidden xl:flex items-center text-xs text-slate-400 max-w-[220px] truncate border-l border-slate-800 pl-3">
              <span className="truncate" title={documentName}>
                {documentName}
              </span>
            </div>
          )}
        </div>

        {/* Center: Pagination & Zoom */}
        {totalPages > 0 && (
          <div className="flex items-center gap-1.5 sm:gap-3 mx-1">
            {/* Pagination */}
            <div className="flex items-center gap-0.5 sm:gap-1 bg-slate-800/90 rounded-lg p-0.5 sm:p-1 border border-slate-700/60 text-xs">
              <button
                disabled={currentPage <= 1}
                onClick={() => onPageChange(currentPage - 1)}
                className="p-1 rounded hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent"
                title="Trang trước"
              >
                <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>

              <span className="px-1 text-slate-300 font-medium text-[11px] sm:text-xs">
                <span className="text-amber-400 font-bold">{currentPage}</span>
                <span className="text-slate-500 mx-0.5">/</span>
                {totalPages}
              </span>

              <button
                disabled={currentPage >= totalPages}
                onClick={() => onPageChange(currentPage + 1)}
                className="p-1 rounded hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent"
                title="Trang sau"
              >
                <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>

            {/* Desktop Zoom controls (Hidden on mobile / tablet < lg) */}
            <div className="hidden lg:flex items-center gap-1 bg-slate-800/90 rounded-lg p-1 border border-slate-700/60 text-xs">
              <button
                onClick={onZoomOut}
                className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white"
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
                className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white"
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

        {/* Right Section: Desktop Full Toggles vs Mobile Compact Controls */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {/* Desktop & Laptop Layer Toggles (Visible on lg: and up) */}
          <div className="hidden lg:flex items-center gap-1.5">
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
              <span className="hidden xl:inline">Tra từ rê chuột</span>
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
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow transition-colors"
                title="Xuất file PDF có chứa highlight và ghi chú chuẩn Adobe Acrobat"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden xl:inline">Xuất PDF</span>
              </button>
            )}
          </div>

          {/* Quick Fit Width Button for Tablet/Mobile */}
          {totalPages > 0 && (
            <button
              onClick={onToggleFitWidth}
              className="lg:hidden p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
              title="Căn vừa chiều rộng màn hình"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          )}

          {/* Open Notes Drawer Button (Always accessible) */}
          <button
            onClick={onToggleNotesPanel}
            className="relative flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium transition-colors"
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

          {/* Mobile & Tablet Settings Button (Hidden on lg:) */}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className={`lg:hidden p-1.5 rounded-lg border text-xs transition-colors ${
              isMobileMenuOpen
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
            title="Tùy chọn hiển thị & Công cụ"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ========================================================
          Mobile & Tablet Options Bottom Sheet / Modal Popover
          ======================================================== */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end lg:hidden animate-in fade-in duration-150">
          {/* Backdrop */}
          <div
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Content Sheet */}
          <div className="relative z-10 bg-slate-900 border-t border-slate-700 rounded-t-2xl shadow-2xl p-4 sm:p-5 text-slate-100 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-sm text-slate-100">Tùy chọn hiển thị & Công cụ</h3>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Document Name if present */}
            {documentName && (
              <div className="mb-4 p-2 bg-slate-800/60 rounded-lg text-xs text-slate-300 truncate flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                <span className="truncate">{documentName}</span>
              </div>
            )}

            {/* Section 1: Display Layers Toggles */}
            <div className="space-y-2.5 mb-5">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Lớp phủ & Tra từ
              </div>

              {/* Toggle 1: Hover / Tap dictionary */}
              <button
                onClick={() =>
                  onUpdateSettings({ hoverDictionaryEnabled: !settings.hoverDictionaryEnabled })
                }
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/70 hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-lg ${settings.hoverDictionaryEnabled ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700 text-slate-400'}`}>
                    <MousePointer className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold text-slate-100">Tra từ khi chạm / rê chuột</div>
                    <div className="text-[11px] text-slate-400">Chạm hoặc trỏ vào từ tiếng Trung để xem từ điển</div>
                  </div>
                </div>
                <div className={`w-9 h-5 rounded-full transition-colors p-0.5 flex items-center ${settings.hoverDictionaryEnabled ? 'bg-amber-500 justify-end' : 'bg-slate-700 justify-start'}`}>
                  <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                </div>
              </button>

              {/* Toggle 2: Pinyin */}
              <button
                onClick={() =>
                  onUpdateSettings({ showPinyinOverlay: !settings.showPinyinOverlay })
                }
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/70 hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-lg ${settings.showPinyinOverlay ? 'bg-orange-500/20 text-orange-400' : 'bg-slate-700 text-slate-400'}`}>
                    <BookmarkPlus className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold text-slate-100">Hiển thị lớp Pinyin</div>
                    <div className="text-[11px] text-slate-400">Phiên âm trên đầu các từ đã gắn</div>
                  </div>
                </div>
                <div className={`w-9 h-5 rounded-full transition-colors p-0.5 flex items-center ${settings.showPinyinOverlay ? 'bg-orange-500 justify-end' : 'bg-slate-700 justify-start'}`}>
                  <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                </div>
              </button>

              {/* Toggle 3: Vietnamese */}
              <button
                onClick={() =>
                  onUpdateSettings({ showVietnameseOverlay: !settings.showVietnameseOverlay })
                }
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/70 hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-lg ${settings.showVietnameseOverlay ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                    <Languages className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold text-slate-100">Hiển thị nghĩa Tiếng Việt</div>
                    <div className="text-[11px] text-slate-400">Bản dịch tiếng Việt bên dưới từ</div>
                  </div>
                </div>
                <div className={`w-9 h-5 rounded-full transition-colors p-0.5 flex items-center ${settings.showVietnameseOverlay ? 'bg-emerald-500 justify-end' : 'bg-slate-700 justify-start'}`}>
                  <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                </div>
              </button>

              {/* Toggle 4: Highlights */}
              <button
                onClick={() =>
                  onUpdateSettings({ showHighlights: !settings.showHighlights })
                }
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/70 hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-lg ${settings.showHighlights ? 'bg-yellow-500/20 text-yellow-400' : 'bg-slate-700 text-slate-400'}`}>
                    <Highlighter className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold text-slate-100">Hiển thị Highlight & Ghi chú</div>
                    <div className="text-[11px] text-slate-400">Các phần đã tô màu và ghi chú cá nhân</div>
                  </div>
                </div>
                <div className={`w-9 h-5 rounded-full transition-colors p-0.5 flex items-center ${settings.showHighlights ? 'bg-yellow-500 justify-end' : 'bg-slate-700 justify-start'}`}>
                  <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                </div>
              </button>
            </div>

            {/* Section 2: Zoom & Scaling controls */}
            {totalPages > 0 && (
              <div className="mb-5">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Thu phóng ({Math.round(scale * 100)}%)
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    onClick={onZoomOut}
                    className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200"
                  >
                    <ZoomOut className="w-4 h-4 mb-1" />
                    <span className="text-[11px]">Thu nhỏ</span>
                  </button>

                  <button
                    onClick={onResetZoom}
                    className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200"
                  >
                    <span className="font-bold text-xs mb-1">100%</span>
                    <span className="text-[11px]">Mặc định</span>
                  </button>

                  <button
                    onClick={onZoomIn}
                    className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200"
                  >
                    <ZoomIn className="w-4 h-4 mb-1" />
                    <span className="text-[11px]">Phóng to</span>
                  </button>

                  <button
                    onClick={() => {
                      onToggleFitWidth();
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex flex-col items-center justify-center p-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30"
                  >
                    <Maximize2 className="w-4 h-4 mb-1" />
                    <span className="text-[11px]">Vừa màn hình</span>
                  </button>
                </div>
              </div>
            )}

            {/* Section 3: Export PDF */}
            {totalPages > 0 && (
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onExportPdf();
                }}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Xuất file PDF (Kèm Highlight & Ghi chú chuẩn Acrobat)</span>
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
};

