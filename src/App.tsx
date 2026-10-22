import { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import type {
  PdfAnnotation,
  ViewerSettings,
  PdfDocumentRecord,
} from './types';
import { pdfService } from './services/pdfService';
import { storageService } from './services/storageService';
import { pdfExportService } from './services/pdfExportService';
import { Toolbar } from './components/Toolbar';
import { PdfViewer } from './components/PdfViewer';
import { NotesPanel } from './components/NotesPanel';
import { RecentDocumentsDrawer } from './components/RecentDocumentsDrawer';

export function App() {
  // Document state
  const [pdfDocument, setPdfDocument] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [documentName, setDocumentName] = useState<string | null>(null);
  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.25);

  // Annotations state (stored in IndexedDB)
  const [annotations, setAnnotations] = useState<PdfAnnotation[]>([]);

  // Viewer display settings
  const [settings, setSettings] = useState<ViewerSettings>({
    scale: 1.25,
    fitMode: 'custom',
    showPinyinOverlay: true,
    showVietnameseOverlay: true,
    showHighlights: true,
    hoverDictionaryEnabled: true,
  });

  // UI Panels state
  const [isNotesPanelOpen, setIsNotesPanelOpen] = useState<boolean>(false);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState<boolean>(false);
  const [recentDocs, setRecentDocs] = useState<Omit<PdfDocumentRecord, 'pdfData'>[]>([]);

  // Hidden file input ref for toolbar
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Load recent documents list on mount
  const refreshRecentDocs = useCallback(async () => {
    try {
      const list = await storageService.listDocuments();
      setRecentDocs(list);
    } catch (err) {
      console.error('Lỗi tải danh sách tài liệu gần đây:', err);
    }
  }, []);

  useEffect(() => {
    refreshRecentDocs();
  }, [refreshRecentDocs]);

  // 2. Load annotations whenever documentId changes
  useEffect(() => {
    if (!documentId) {
      setAnnotations([]);
      return;
    }

    const loadAnnotations = async () => {
      try {
        const stored = await storageService.getAnnotationsByDocument(documentId);
        setAnnotations(stored);
      } catch (err) {
        console.error('Lỗi tải ghi chú:', err);
      }
    };

    loadAnnotations();
  }, [documentId]);

  // 3. Process and open a PDF from ArrayBuffer
  const loadPdfData = async (buffer: ArrayBuffer, name: string, docId?: string) => {
    try {
      // Create independent copies so Web Worker transfer does not detach the storage buffer
      const storageBuffer = buffer.slice(0);
      const renderBuffer = buffer.slice(0);

      const doc = await pdfService.loadDocument(renderBuffer);
      await pdfService.inspectDocument(doc);

      const id = docId || `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Save document to IndexedDB for local persistence
      const record: PdfDocumentRecord = {
        id,
        name,
        size: storageBuffer.byteLength,
        totalPages: doc.numPages,
        uploadedAt: Date.now(),
        lastOpenedAt: Date.now(),
        pdfData: storageBuffer,
      };

      await storageService.saveDocument(record);
      await refreshRecentDocs();

      // Automatically import any pre-existing annotations from the PDF (e.g. from Adobe Acrobat)
      try {
        const existingAnns = await pdfService.extractExistingAnnotations(doc);
        if (existingAnns.length > 0) {
          const currentStored = await storageService.getAnnotationsByDocument(id);
          if (currentStored.length === 0) {
            for (const item of existingAnns) {
              item.documentId = id;
              await storageService.saveAnnotation(item);
            }
          }
        }
      } catch (annErr) {
        console.warn('Lỗi đồng bộ annotation gốc từ PDF:', annErr);
      }

      setPdfBytes(storageBuffer.slice(0));
      setPdfDocument(doc);
      setDocumentId(id);
      setDocumentName(name);
      setTotalPages(doc.numPages);
      setCurrentPage(1);
    } catch (err) {
      console.error('Lỗi khi mở PDF:', err);
      alert(`Không thể đọc file PDF này. Chi tiết: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // 4. Handle user uploading file from disk
  const handleUploadFile = async (file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      await loadPdfData(buffer, file.name);
    } catch (err) {
      console.error('Lỗi đọc file:', err);
      alert('Không thể đọc dữ liệu file đã chọn.');
    }
  };

  // 5. Open bundled Chinese sample PDF
  const handleOpenSamplePdf = async () => {
    try {
      const response = await fetch('/sample_chinese.pdf');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const buffer = await response.arrayBuffer();
      await loadPdfData(buffer, 'Tai_Lieu_Mau_Tieng_Trung.pdf', 'demo_sample_chinese');
    } catch (err) {
      console.error('Lỗi tải tài liệu mẫu:', err);
      alert('Chưa thể tải file mẫu. Bạn có thể kéo thả bất kỳ file PDF tiếng Trung nào từ máy tính vào để trải nghiệm!');
    }
  };

  // 6. Open a document from recent history
  const handleSelectRecentDocument = async (id: string) => {
    try {
      const record = await storageService.getDocument(id);
      if (!record) {
        alert('Tài liệu không tồn tại hoặc đã bị xóa.');
        return;
      }
      await storageService.updateLastOpened(id);
      await loadPdfData(record.pdfData, record.name, record.id);
    } catch (err) {
      console.error('Lỗi mở tài liệu từ IndexedDB:', err);
    }
  };

  // 7. Delete a document from history
  const handleDeleteDocument = async (id: string) => {
    try {
      await storageService.deleteDocument(id);
      await refreshRecentDocs();
      if (documentId === id) {
        setPdfDocument(null);
        setDocumentId(null);
        setDocumentName(null);
        setPdfBytes(null);
        setAnnotations([]);
      }
    } catch (err) {
      console.error('Lỗi xóa tài liệu:', err);
    }
  };

  // 8. Add new annotation
  const handleAddAnnotation = async (
    annData: Omit<PdfAnnotation, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    const newAnn: PdfAnnotation = {
      ...annData,
      id: `ann_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Update state immediately for instant UI response
    setAnnotations((prev) => [...prev, newAnn]);
    // Save to IndexedDB
    await storageService.saveAnnotation(newAnn);
  };

  // 9. Update existing annotation
  const handleUpdateAnnotation = async (id: string, updates: Partial<PdfAnnotation>) => {
    setAnnotations((prev) =>
      prev.map((ann) => (ann.id === id ? { ...ann, ...updates, updatedAt: Date.now() } : ann))
    );
    await storageService.updateAnnotation(id, updates);
  };

  // 10. Delete annotation
  const handleDeleteAnnotation = async (id: string) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
    await storageService.deleteAnnotation(id);
  };

  // 11. Clear all annotations for current document
  const handleClearAllAnnotations = async () => {
    if (!documentId) return;
    for (const ann of annotations) {
      await storageService.deleteAnnotation(ann.id);
    }
    setAnnotations([]);
  };

  // 12. Export PDF with embedded annotations
  const handleExportPdf = async () => {
    if (!pdfBytes) {
      alert('Chưa có file PDF nào đang mở.');
      return;
    }

    try {
      const baseName = documentName ? documentName.replace(/\.pdf$/i, '') : 'zhongwen_document';
      const exportName = `${baseName}_annotated.pdf`;
      await pdfExportService.exportAnnotatedPdf(pdfBytes.slice(0), annotations, exportName);
    } catch (err) {
      alert(`Lỗi xuất PDF: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Zoom handlers
  const handleZoomIn = () => setScale((s) => Math.min(3.0, +(s + 0.15).toFixed(2)));
  const handleZoomOut = () => setScale((s) => Math.max(0.6, +(s - 0.15).toFixed(2)));
  const handleResetZoom = () => setScale(1.0);
  const handleToggleFitWidth = () => {
    // Standard fit width approximation
    const screenWidth = window.innerWidth;
    if (screenWidth > 1200) {
      setScale(1.4);
    } else if (screenWidth > 768) {
      setScale(1.1);
    } else {
      setScale(0.8);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 overflow-hidden font-sans">
      {/* Hidden file input for Toolbar trigger */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUploadFile(file);
        }}
      />

      {/* Top Application Toolbar */}
      <Toolbar
        documentName={documentName}
        currentPage={currentPage}
        totalPages={totalPages}
        scale={scale}
        settings={settings}
        notesCount={annotations.length}
        onPageChange={(p) => setCurrentPage(p)}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetZoom={handleResetZoom}
        onToggleFitWidth={handleToggleFitWidth}
        onUpdateSettings={(newSettings) => setSettings((s) => ({ ...s, ...newSettings }))}
        onUploadClick={() => fileInputRef.current?.click()}
        onExportPdf={handleExportPdf}
        onToggleNotesPanel={() => setIsNotesPanelOpen(!isNotesPanelOpen)}
        onToggleHistoryDrawer={() => setIsHistoryDrawerOpen(!isHistoryDrawerOpen)}
      />

      {/* Central PDF Viewer Area */}
      <PdfViewer
        pdfDocument={pdfDocument}
        documentId={documentId}
        scale={scale}
        currentPage={currentPage}
        settings={settings}
        annotations={annotations}
        onPageChange={(p) => setCurrentPage(p)}
        onAddAnnotation={handleAddAnnotation}
        onUpdateAnnotation={handleUpdateAnnotation}
        onDeleteAnnotation={handleDeleteAnnotation}
        onOpenSamplePdf={handleOpenSamplePdf}
        onUploadFile={handleUploadFile}
      />

      {/* Side Panel: Vocabulary & Personal Notes */}
      <NotesPanel
        isOpen={isNotesPanelOpen}
        onClose={() => setIsNotesPanelOpen(false)}
        annotations={annotations}
        currentPage={currentPage}
        onJumpToPage={(p) => setCurrentPage(p)}
        onEditAnnotation={(ann) => {
          setCurrentPage(ann.pageNumber);
        }}
        onDeleteAnnotation={handleDeleteAnnotation}
        onClearAllAnnotations={handleClearAllAnnotations}
      />

      {/* Drawer: Recent Documents History */}
      <RecentDocumentsDrawer
        isOpen={isHistoryDrawerOpen}
        onClose={() => setIsHistoryDrawerOpen(false)}
        documents={recentDocs}
        currentDocumentId={documentId}
        onSelectDocument={handleSelectRecentDocument}
        onDeleteDocument={handleDeleteDocument}
      />
    </div>
  );
}

export default App;
