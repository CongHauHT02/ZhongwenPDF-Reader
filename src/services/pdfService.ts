import * as pdfjsLib from 'pdfjs-dist';
import type { PdfAnnotation, NormalizedRect } from '../types';

// Configure worker using CDN with fallback
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '3.11.174'}/pdf.worker.min.js`;
}

export interface PdfMetadata {
  numPages: number;
  title?: string;
  author?: string;
  hasTextLayer: boolean;
}

export const pdfService = {
  /**
   * Load a PDF document from an ArrayBuffer
   */
  async loadDocument(data: ArrayBuffer): Promise<pdfjsLib.PDFDocumentProxy> {
    // Clone buffer so PDF.js Web Worker transfer never detaches the original ArrayBuffer
    const clonedData = data.slice(0);
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(clonedData),
      cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
      cMapPacked: true,
    });
    return await loadingTask.promise;
  },

  /**
   * Quick inspection of the PDF: check total pages and if text layer exists
   */
  async inspectDocument(doc: pdfjsLib.PDFDocumentProxy): Promise<PdfMetadata> {
    const numPages = doc.numPages;
    let title: string | undefined;
    let author: string | undefined;

    try {
      const meta = await doc.getMetadata();
      const info = meta?.info as any;
      if (info) {
        title = info.Title;
        author = info.Author;
      }
    } catch (e) {
      console.warn('Could not read PDF metadata:', e);
    }

    // Inspect first page to verify if selectable text is present
    let hasTextLayer = false;
    try {
      const page1 = await doc.getPage(1);
      const textContent = await page1.getTextContent();
      hasTextLayer = textContent.items && textContent.items.length > 0;
    } catch (e) {
      console.warn('Could not inspect text layer of page 1:', e);
    }

    return {
      numPages,
      title,
      author,
      hasTextLayer,
    };
  },

  /**
   * Extract existing native PDF annotations (from Adobe Acrobat, Foxit, etc.)
   * Synchronizes existing Highlights, Comments, and Notes into the application
   */
  async extractExistingAnnotations(doc: pdfjsLib.PDFDocumentProxy): Promise<PdfAnnotation[]> {
    const results: PdfAnnotation[] = [];
    const numPages = doc.numPages;

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      try {
        const page = await doc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1 });
        const { width, height } = viewport;
        const annots = await page.getAnnotations();

        for (const item of annots) {
          // Check for Highlight or Text (Comment) annotations
          if (item.subtype === 'Highlight' || item.subtype === 'Text') {
            const rawContent = item.contentsObj?.str || item.contents || '';

            // Extract color from annotation if available
            let colorHex: string | undefined;
            if (item.color && (Array.isArray(item.color) || typeof item.color === 'object')) {
              const c = item.color as any;
              const r = Math.round(c[0] !== undefined ? c[0] : 233);
              const g = Math.round(c[1] !== undefined ? c[1] : 213);
              const b = Math.round(c[2] !== undefined ? c[2] : 255);
              colorHex = `rgba(${r}, ${g}, ${b}, 0.55)`;
            }

            // Extract bounding rects
            const rects: NormalizedRect[] = [];
            if (item.rect && item.rect.length === 4) {
              const [x1, y1, x2, y2] = item.rect;
              rects.push({
                x: Math.max(0, Math.min(1, x1 / width)),
                y: Math.max(0, Math.min(1, (height - y2) / height)),
                width: Math.max(0.01, Math.min(1, (x2 - x1) / width)),
                height: Math.max(0.01, Math.min(1, (y2 - y1) / height)),
              });
            }

            if (rects.length > 0) {
              // Parse formatted content fields
              let text = '';
              let pinyin = '';
              let vietnamese = '';
              let noteContent = '';

              const lines = rawContent.split('\n');
              for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith('Từ gốc:') || trimmed.startsWith('Từ:')) {
                  text = trimmed.replace(/^(Từ gốc:|Từ:)\s*/, '');
                } else if (trimmed.startsWith('Pinyin:')) {
                  pinyin = trimmed.replace(/^Pinyin:\s*/, '');
                } else if (trimmed.startsWith('Nghĩa tiếng Việt:') || trimmed.startsWith('Nghĩa:')) {
                  vietnamese = trimmed.replace(/^(Nghĩa tiếng Việt:|Nghĩa:)\s*/, '');
                } else if (trimmed.startsWith('Ghi chú cá nhân:') || trimmed.startsWith('Ghi chú:')) {
                  noteContent = trimmed.replace(/^(Ghi chú cá nhân:|Ghi chú:)\s*/, '');
                } else if (!text && trimmed) {
                  text = trimmed;
                } else if (!noteContent && trimmed) {
                  noteContent = trimmed;
                }
              }

              results.push({
                id: `pdf_imported_${pageNum}_${Math.random().toString(36).substr(2, 9)}`,
                documentId: '',
                pageNumber: pageNum,
                type: noteContent ? 'note' : (item.subtype === 'Highlight' ? 'highlight' : 'note'),
                text: text || 'Ghi chú PDF',
                rects,
                color: colorHex,
                pinyin: pinyin || undefined,
                vietnamese: vietnamese || undefined,
                noteContent: noteContent || undefined,
                createdAt: Date.now(),
                updatedAt: Date.now(),
              });
            }
          }
        }
      } catch (err) {
        console.warn(`Lỗi trích xuất annotation trang ${pageNum}:`, err);
      }
    }

    return results;
  },
};
