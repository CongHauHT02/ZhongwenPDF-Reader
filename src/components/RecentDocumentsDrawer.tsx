import React from 'react';
import type { PdfDocumentRecord } from '../types';
import { X, FileText, Trash2, Clock, HardDrive } from 'lucide-react';

interface RecentDocumentsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  documents: Omit<PdfDocumentRecord, 'pdfData'>[];
  currentDocumentId: string | null;
  onSelectDocument: (id: string) => void;
  onDeleteDocument: (id: string) => void;
}

export const RecentDocumentsDrawer: React.FC<RecentDocumentsDrawerProps> = ({
  isOpen,
  onClose,
  documents,
  currentDocumentId,
  onSelectDocument,
  onDeleteDocument,
}) => {
  if (!isOpen) return null;

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex bg-black/60 backdrop-blur-sm animate-in fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm sm:w-96 bg-slate-900 border-r border-slate-800 h-full p-4 flex flex-col text-slate-100 shadow-2xl animate-in slide-in-from-left"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-400" />
            <h2 className="font-bold text-base">Tài liệu đã mở gần đây</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notice on local privacy */}
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3 mb-3 text-xs text-slate-300 flex items-start gap-2">
          <HardDrive className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
          <span>
            Tài liệu và toàn bộ ghi chú được lưu trữ hoàn toàn trên trình duyệt của bạn (IndexedDB), không gửi lên bất kỳ máy chủ nào.
          </span>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto space-y-2">
          {documents.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p>Chưa có tài liệu nào được lưu.</p>
            </div>
          ) : (
            documents.map((doc) => {
              const isCurrent = doc.id === currentDocumentId;

              return (
                <div
                  key={doc.id}
                  onClick={() => {
                    onSelectDocument(doc.id);
                    onClose();
                  }}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start justify-between ${
                    isCurrent
                      ? 'bg-amber-500/10 border-amber-500/50 text-amber-200'
                      : 'bg-slate-800/70 border-slate-700/50 hover:bg-slate-800 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-start gap-2.5 overflow-hidden">
                    <FileText
                      className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                        isCurrent ? 'text-amber-400' : 'text-slate-400'
                      }`}
                    />
                    <div className="overflow-hidden">
                      <p className="text-xs font-semibold truncate" title={doc.name}>
                        {doc.name}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
                        <span>{doc.totalPages} trang</span>
                        <span>•</span>
                        <span>{formatFileSize(doc.size)}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">
                        {formatDate(doc.lastOpenedAt)}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (
                        window.confirm(
                          `Bạn có chắc chắn muốn xóa tài liệu "${doc.name}" và toàn bộ ghi chú liên quan?`
                        )
                      ) {
                        onDeleteDocument(doc.id);
                      }
                    }}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-700/60 transition-colors ml-2"
                    title="Xóa tài liệu"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Backdrop click to close */}
      <div className="flex-1" onClick={onClose} />
    </div>
  );
};
