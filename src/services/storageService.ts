import Dexie, { type Table } from 'dexie';
import type { PdfAnnotation, PdfDocumentRecord } from '../types';

export class ZhongwenDatabase extends Dexie {
  documents!: Table<PdfDocumentRecord, string>;
  annotations!: Table<PdfAnnotation, string>;

  constructor() {
    super('ZhongwenPdfReaderDB');
    this.version(1).stores({
      documents: 'id, name, uploadedAt, lastOpenedAt',
      annotations: 'id, documentId, [documentId+pageNumber], type, createdAt, updatedAt',
    });
  }
}

export const db = new ZhongwenDatabase();

export const storageService = {
  /**
   * Save a PDF document binary and metadata into IndexedDB
   */
  async saveDocument(doc: PdfDocumentRecord): Promise<void> {
    await db.documents.put(doc);
  },

  /**
   * Retrieve a document by ID
   */
  async getDocument(id: string): Promise<PdfDocumentRecord | undefined> {
    return await db.documents.get(id);
  },

  /**
   * List all stored documents ordered by last opened
   */
  async listDocuments(): Promise<Omit<PdfDocumentRecord, 'pdfData'>[]> {
    const all = await db.documents.orderBy('lastOpenedAt').reverse().toArray();
    // Exclude the heavy pdfData binary for the quick list
    return all.map(({ id, name, size, totalPages, uploadedAt, lastOpenedAt }) => ({
      id,
      name,
      size,
      totalPages,
      uploadedAt,
      lastOpenedAt,
    }));
  },

  /**
   * Update last opened timestamp
   */
  async updateLastOpened(id: string): Promise<void> {
    await db.documents.update(id, { lastOpenedAt: Date.now() });
  },

  /**
   * Delete a document and all its associated annotations
   */
  async deleteDocument(id: string): Promise<void> {
    await db.transaction('rw', db.documents, db.annotations, async () => {
      await db.documents.delete(id);
      await db.annotations.where('documentId').equals(id).delete();
    });
  },

  /**
   * Save or update an annotation
   */
  async saveAnnotation(annotation: PdfAnnotation): Promise<void> {
    await db.annotations.put(annotation);
  },

  /**
   * Update an existing annotation
   */
  async updateAnnotation(id: string, updates: Partial<PdfAnnotation>): Promise<void> {
    await db.annotations.update(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },

  /**
   * Delete an annotation
   */
  async deleteAnnotation(id: string): Promise<void> {
    await db.annotations.delete(id);
  },

  /**
   * Get all annotations for a document
   */
  async getAnnotationsByDocument(documentId: string): Promise<PdfAnnotation[]> {
    return await db.annotations.where('documentId').equals(documentId).toArray();
  },

  /**
   * Get annotations for a specific page of a document
   */
  async getAnnotationsByPage(documentId: string, pageNumber: number): Promise<PdfAnnotation[]> {
    return await db.annotations
      .where({ documentId, pageNumber })
      .toArray();
  },
};
