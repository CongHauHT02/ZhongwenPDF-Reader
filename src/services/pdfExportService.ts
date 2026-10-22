import { PDFDocument, PDFName, PDFArray, PDFHexString, rgb } from 'pdf-lib';
import type { PdfAnnotation } from '../types';

/**
 * Convert rgba string, hex code, or named color to normalized RGB [0..1]
 */
function parseColorToRgb(colorStr?: string): { r: number; g: number; b: number } {
  if (!colorStr) return { r: 0.78, g: 0.55, b: 0.98 }; // Default gentle purple like screenshot

  // 1. Match rgba(r, g, b, a) or rgb(r, g, b)
  const rgbaMatch = colorStr.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (rgbaMatch) {
    return {
      r: Math.min(1, Math.max(0, parseInt(rgbaMatch[1], 10) / 255)),
      g: Math.min(1, Math.max(0, parseInt(rgbaMatch[2], 10) / 255)),
      b: Math.min(1, Math.max(0, parseInt(rgbaMatch[3], 10) / 255)),
    };
  }

  // 2. Match hex format #rrggbb
  if (colorStr.startsWith('#') && colorStr.length >= 7) {
    return {
      r: parseInt(colorStr.slice(1, 3), 16) / 255,
      g: parseInt(colorStr.slice(3, 5), 16) / 255,
      b: parseInt(colorStr.slice(5, 7), 16) / 255,
    };
  }

  // 3. Match named color mappings
  const lower = colorStr.toLowerCase();
  if (lower.includes('purple') || lower.includes('violet')) return { r: 0.75, g: 0.52, b: 0.98 };
  if (lower.includes('yellow')) return { r: 0.99, g: 0.85, b: 0.25 };
  if (lower.includes('green')) return { r: 0.45, g: 0.88, b: 0.55 };
  if (lower.includes('blue')) return { r: 0.45, g: 0.70, b: 0.98 };
  if (lower.includes('rose') || lower.includes('red')) return { r: 0.98, g: 0.50, b: 0.60 };
  if (lower.includes('orange')) return { r: 0.98, g: 0.60, b: 0.25 };

  return { r: 0.78, g: 0.55, b: 0.98 };
}

export const pdfExportService = {
  /**
   * Export original PDF with standard ISO 32000 PDF Annotations
   * Fully recognized and synchronized with Adobe Acrobat, Foxit Reader, Chrome, and Apple Preview:
   * 1. Native /Subtype /Highlight annotations in exact color
   * 2. Native /Subtype /Text annotations (Sticky Note speech bubble 💬)
   * 3. Full multi-lingual Unicode contents (UTF-16BE) for Chinese Hanzi, Pinyin, and Vietnamese
   * 4. Visual fallback highlight rectangles
   */
  async exportAnnotatedPdf(
    originalPdfBytes: ArrayBuffer,
    annotations: PdfAnnotation[],
    filename: string = 'zhongwen_annotated.pdf'
  ): Promise<void> {
    try {
      // 1. Load the original PDF into pdf-lib
      const pdfDoc = await PDFDocument.load(originalPdfBytes);
      const pages = pdfDoc.getPages();

      // 2. Group annotations by pageNumber (1-indexed)
      const annotationsByPage = new Map<number, PdfAnnotation[]>();
      for (const ann of annotations) {
        const list = annotationsByPage.get(ann.pageNumber) || [];
        list.push(ann);
        annotationsByPage.set(ann.pageNumber, list);
      }

      // 3. Process each page and add native PDF annotations
      annotationsByPage.forEach((pageAnns, pageNum) => {
        const pageIndex = pageNum - 1;
        if (pageIndex < 0 || pageIndex >= pages.length) return;

        const page = pages[pageIndex];
        const { width: pageWidth, height: pageHeight } = page.getSize();

        // Get or initialize page /Annots array
        let annotsArray = page.node.lookup(PDFName.of('Annots')) as PDFArray | undefined;
        if (!annotsArray || !(annotsArray instanceof PDFArray)) {
          annotsArray = pdfDoc.context.obj([]) as PDFArray;
          page.node.set(PDFName.of('Annots'), annotsArray);
        }

        for (const ann of pageAnns) {
          if (!ann.rects || ann.rects.length === 0) continue;

          const { r, g, b } = parseColorToRgb(ann.color);

          // Build note contents formatted for Adobe Acrobat Comments Panel
          const contentParts: string[] = [];
          if (ann.text) contentParts.push(`Từ gốc: ${ann.text}`);
          if (ann.pinyin) contentParts.push(`Pinyin: ${ann.pinyin}`);
          if (ann.vietnamese) contentParts.push(`Nghĩa: ${ann.vietnamese}`);
          if (ann.noteContent) contentParts.push(`Ghi chú: ${ann.noteContent}`);
          const noteContents = contentParts.join('\n');

          // Collect bounding boxes and QuadPoints in PDF coordinate space (bottom-left origin)
          const quadPoints: number[] = [];
          let minX = Number.POSITIVE_INFINITY;
          let minY = Number.POSITIVE_INFINITY;
          let maxX = Number.NEGATIVE_INFINITY;
          let maxY = Number.NEGATIVE_INFINITY;

          for (const rect of ann.rects) {
            const pdfX = rect.x * pageWidth;
            const pdfWidth = rect.width * pageWidth;
            const pdfHeight = rect.height * pageHeight;
            const pdfY = pageHeight - (rect.y + rect.height) * pageHeight;
            const pdfTop = pdfY + pdfHeight;
            const pdfRight = pdfX + pdfWidth;

            minX = Math.min(minX, pdfX);
            minY = Math.min(minY, pdfY);
            maxX = Math.max(maxX, pdfRight);
            maxY = Math.max(maxY, pdfTop);

            // QuadPoints order in ISO 32000:
            // Top-Left, Top-Right, Bottom-Left, Bottom-Right
            quadPoints.push(pdfX, pdfTop, pdfRight, pdfTop, pdfX, pdfY, pdfRight, pdfY);

            // Also draw a visual fallback highlight on the page stream
            page.drawRectangle({
              x: pdfX,
              y: pdfY,
              width: Math.max(pdfWidth, 2),
              height: Math.max(pdfHeight, 2),
              color: rgb(r, g, b),
              opacity: 0.35,
            });
          }

          if (minX === Number.POSITIVE_INFINITY) continue;

          // 1. Standard ISO 32000 Highlight Annotation
          const highlightDict = pdfDoc.context.obj({
            Type: 'Annot',
            Subtype: 'Highlight',
            Rect: [minX, minY, maxX, maxY],
            QuadPoints: quadPoints,
            C: [r, g, b],
            CA: 0.55,
            T: PDFHexString.fromText('Zhongwen 2.0'),
            Subj: PDFHexString.fromText(ann.type === 'note' ? 'Ghi chú tiếng Trung' : 'Đánh dấu từ vựng'),
            Contents: PDFHexString.fromText(noteContents),
            F: 4, // Print flag
          });
          const highlightRef = pdfDoc.context.register(highlightDict);
          annotsArray.push(highlightRef);

          // 2. Standard ISO 32000 Sticky Note Annotation (Speech bubble 💬 icon in Acrobat)
          // Display on note annotations or any annotation with custom content/vietnamese
          if (ann.type === 'note' || ann.noteContent || ann.vietnamese) {
            const firstRect = ann.rects[0];
            const iconX = Math.max(0, firstRect.x * pageWidth - 2);
            const iconY = Math.min(pageHeight - 18, pageHeight - firstRect.y * pageHeight - 6);

            const textAnnotDict = pdfDoc.context.obj({
              Type: 'Annot',
              Subtype: 'Text',
              Rect: [iconX, iconY, iconX + 18, iconY + 18],
              C: [r, g, b],
              Name: 'Comment', // Standard speech bubble icon in Adobe Acrobat & Foxit
              T: PDFHexString.fromText('Zhongwen 2.0'),
              Subj: PDFHexString.fromText('Ghi chú'),
              Contents: PDFHexString.fromText(noteContents),
              F: 4,
            });
            const textAnnotRef = pdfDoc.context.register(textAnnotDict);
            annotsArray.push(textAnnotRef);
          }
        }
      });

      // 4. Serialize to Uint8Array
      const modifiedPdfBytes = await pdfDoc.save();

      // 5. Trigger browser download
      const blob = new Blob([new Uint8Array(modifiedPdfBytes).buffer as ArrayBuffer], {
        type: 'application/pdf',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Lỗi khi xuất PDF có ghi chú chuẩn Adobe Acrobat:', err);
      throw new Error(`Không thể xuất file PDF: ${err instanceof Error ? err.message : String(err)}`);
    }
  },
};
