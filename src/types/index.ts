/**
 * Core type definitions for Zhongwen PDF Reader & Annotation
 */

export interface NormalizedRect {
  /** X coordinate normalized to page width (0 to 1) */
  x: number;
  /** Y coordinate normalized to page height (0 to 1) */
  y: number;
  /** Width normalized to page width (0 to 1) */
  width: number;
  /** Height normalized to page height (0 to 1) */
  height: number;
}

export type AnnotationType = 'highlight' | 'pinyin' | 'vietnamese' | 'note';

export interface PdfAnnotation {
  id: string;
  documentId: string;
  pageNumber: number;
  type: AnnotationType;
  /** Original selected text from the PDF */
  text: string;
  /** Normalized bounding rectangles (multi-line support) */
  rects: NormalizedRect[];
  /** Color for highlights (hex code or tailwind color) */
  color?: string;
  /** Attached Pinyin annotation */
  pinyin?: string;
  /** Attached Vietnamese definition */
  vietnamese?: string;
  /** User's personal note */
  noteContent?: string;
  createdAt: number;
  updatedAt: number;
}

export interface PdfDocumentRecord {
  id: string;
  name: string;
  size: number;
  totalPages: number;
  uploadedAt: number;
  lastOpenedAt: number;
  /** PDF raw ArrayBuffer binary stored in IndexedDB */
  pdfData: ArrayBuffer;
}

export interface DictionaryEntry {
  simplified: string;
  traditional?: string;
  pinyin: string;
  hanviet?: string;
  meanings: string[];
  pos?: string;
  hsk?: number;
  subEntries?: DictionaryEntry[];
}

export interface LookupResult {
  word: string;
  entry: DictionaryEntry;
  startIndex: number;
  endIndex: number;
  domRect?: DOMRect;
}

export interface SelectionState {
  text: string;
  pageNumber: number;
  rects: NormalizedRect[];
  clientRects: DOMRect[];
  menuPosition: { x: number; y: number } | null;
}

export interface ViewerSettings {
  scale: number;
  fitMode: 'custom' | 'fit-width' | 'fit-page';
  showPinyinOverlay: boolean;
  showVietnameseOverlay: boolean;
  showHighlights: boolean;
  hoverDictionaryEnabled: boolean;
}

export type HighlightColor = {
  id: string;
  name: string;
  bgHex: string;
  borderHex: string;
  label: string;
};

export const HIGHLIGHT_COLORS: HighlightColor[] = [
  { id: 'yellow', name: 'Vàng', bgHex: 'rgba(254, 240, 138, 0.45)', borderHex: '#facc15', label: 'bg-yellow-200' },
  { id: 'green', name: 'Xanh lá', bgHex: 'rgba(187, 247, 208, 0.45)', borderHex: '#4ade80', label: 'bg-green-200' },
  { id: 'blue', name: 'Xanh lam', bgHex: 'rgba(191, 219, 254, 0.45)', borderHex: '#60a5fa', label: 'bg-blue-200' },
  { id: 'purple', name: 'Tím', bgHex: 'rgba(233, 213, 255, 0.45)', borderHex: '#c084fc', label: 'bg-purple-200' },
  { id: 'rose', name: 'Hồng/Đỏ', bgHex: 'rgba(254, 205, 211, 0.45)', borderHex: '#fb7185', label: 'bg-rose-200' },
  { id: 'orange', name: 'Cam', bgHex: 'rgba(254, 215, 170, 0.45)', borderHex: '#fb923c', label: 'bg-orange-200' },
];
