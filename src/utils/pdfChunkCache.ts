/**
 * pdfChunkCache.ts - Scalable IndexedDB Storage for PDF Chunks and Documents
 * Handles 500+ page PDFs without hitting localStorage quota limits.
 */

import { ProcessedDocument, DocumentChunk } from "./documentProcessor";

const DB_NAME = "StudyMate_PDF_Cache_v1";
const DB_VERSION = 1;
const DOC_STORE = "documents";
const CHUNK_STORE = "chunks";

let dbInstance: IDBDatabase | null = null;

/**
 * Open or initialize IndexedDB connection
 */
export async function openPdfCacheDB(): Promise<IDBDatabase | null> {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    return null;
  }

  if (dbInstance) {
    return dbInstance;
  }

  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(DOC_STORE)) {
          const docStore = db.createObjectStore(DOC_STORE, { keyPath: "id" });
          docStore.createIndex("hash", "hash", { unique: false });
          docStore.createIndex("name", "name", { unique: false });
        }

        if (!db.objectStoreNames.contains(CHUNK_STORE)) {
          const chunkStore = db.createObjectStore(CHUNK_STORE, { keyPath: "id" });
          chunkStore.createIndex("docId", "docId", { unique: false });
          chunkStore.createIndex("pageNumber", "pageNumber", { unique: false });
        }
      };

      request.onsuccess = (event) => {
        dbInstance = (event.target as IDBOpenDBRequest).result;
        resolve(dbInstance);
      };

      request.onerror = (err) => {
        console.warn("[pdfChunkCache] Failed to open IndexedDB:", err);
        resolve(null);
      };
    } catch (e) {
      console.warn("[pdfChunkCache] IndexedDB initialization error:", e);
      resolve(null);
    }
  });
}

/**
 * Save document and its semantic chunks to IndexedDB
 */
export async function saveDocToIndexedDB(doc: ProcessedDocument): Promise<boolean> {
  const db = await openPdfCacheDB();
  if (!db) return false;

  return new Promise((resolve) => {
    try {
      const transaction = db.transaction([DOC_STORE, CHUNK_STORE], "readwrite");
      const docStore = transaction.objectStore(DOC_STORE);
      const chunkStore = transaction.objectStore(CHUNK_STORE);

      // Create a light document record (without duplicating huge dataUrl or monolithic fullText if > 50 pages)
      const lightDoc: ProcessedDocument = {
        ...doc,
        // Keep chunks array empty inside the document store object to avoid multi-MB duplication
        chunks: [],
        dataUrl: doc.totalPages > 30 ? undefined : doc.dataUrl
      };

      docStore.put(lightDoc);

      // Put all chunks in chunks store
      if (doc.chunks && doc.chunks.length > 0) {
        for (const chunk of doc.chunks) {
          chunkStore.put(chunk);
        }
      }

      transaction.oncomplete = () => {
        resolve(true);
      };

      transaction.onerror = (err) => {
        console.warn("[pdfChunkCache] IndexedDB save transaction error:", err);
        resolve(false);
      };
    } catch (e) {
      console.warn("[pdfChunkCache] Save error:", e);
      resolve(false);
    }
  });
}

/**
 * Get cached document and its chunks from IndexedDB by ID or Hash
 */
export async function getDocFromIndexedDB(idOrHash: string): Promise<ProcessedDocument | null> {
  const db = await openPdfCacheDB();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const transaction = db.transaction([DOC_STORE, CHUNK_STORE], "readonly");
      const docStore = transaction.objectStore(DOC_STORE);
      const chunkStore = transaction.objectStore(CHUNK_STORE);

      let docReq: IDBRequest;
      if (idOrHash.startsWith("doc_hash_")) {
        const hashIdx = docStore.index("hash");
        docReq = hashIdx.get(idOrHash);
      } else {
        docReq = docStore.get(idOrHash);
      }

      docReq.onsuccess = () => {
        const doc = docReq.result as ProcessedDocument | undefined;
        if (!doc) {
          resolve(null);
          return;
        }

        // Fetch chunks for this doc
        const chunkIdx = chunkStore.index("docId");
        const chunkReq = chunkIdx.getAll(doc.id);

        chunkReq.onsuccess = () => {
          const chunks = (chunkReq.result || []) as DocumentChunk[];
          resolve({
            ...doc,
            chunks: chunks.length > 0 ? chunks : doc.chunks || []
          });
        };

        chunkReq.onerror = () => {
          resolve(doc);
        };
      };

      docReq.onerror = () => {
        resolve(null);
      };
    } catch (e) {
      console.warn("[pdfChunkCache] Get error:", e);
      resolve(null);
    }
  });
}

/**
 * Load all documents and their chunks from IndexedDB
 */
export async function loadAllDocsFromIndexedDB(): Promise<ProcessedDocument[]> {
  const db = await openPdfCacheDB();
  if (!db) return [];

  return new Promise((resolve) => {
    try {
      const transaction = db.transaction([DOC_STORE, CHUNK_STORE], "readonly");
      const docStore = transaction.objectStore(DOC_STORE);
      const chunkStore = transaction.objectStore(CHUNK_STORE);

      const getAllDocsReq = docStore.getAll();

      getAllDocsReq.onsuccess = () => {
        const docs = (getAllDocsReq.result || []) as ProcessedDocument[];
        if (docs.length === 0) {
          resolve([]);
          return;
        }

        const getAllChunksReq = chunkStore.getAll();

        getAllChunksReq.onsuccess = () => {
          const allChunks = (getAllChunksReq.result || []) as DocumentChunk[];
          
          // Map chunks to docs
          const chunksByDocId = new Map<string, DocumentChunk[]>();
          for (const chunk of allChunks) {
            if (!chunksByDocId.has(chunk.docId)) {
              chunksByDocId.set(chunk.docId, []);
            }
            chunksByDocId.get(chunk.docId)!.push(chunk);
          }

          const completeDocs = docs.map((d) => ({
            ...d,
            chunks: chunksByDocId.get(d.id) || d.chunks || []
          }));

          resolve(completeDocs.sort((a, b) => b.updatedAt - a.updatedAt));
        };

        getAllChunksReq.onerror = () => {
          resolve(docs);
        };
      };

      getAllDocsReq.onerror = () => {
        resolve([]);
      };
    } catch (e) {
      console.warn("[pdfChunkCache] Load all error:", e);
      resolve([]);
    }
  });
}

/**
 * Delete document and chunks from IndexedDB
 */
export async function deleteDocFromIndexedDB(docId: string): Promise<boolean> {
  const db = await openPdfCacheDB();
  if (!db) return false;

  return new Promise((resolve) => {
    try {
      const transaction = db.transaction([DOC_STORE, CHUNK_STORE], "readwrite");
      const docStore = transaction.objectStore(DOC_STORE);
      const chunkStore = transaction.objectStore(CHUNK_STORE);

      docStore.delete(docId);

      // Delete associated chunks
      const chunkIdx = chunkStore.index("docId");
      const cursorReq = chunkIdx.openCursor(IDBKeyRange.only(docId));

      cursorReq.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      transaction.oncomplete = () => {
        resolve(true);
      };

      transaction.onerror = () => {
        resolve(false);
      };
    } catch (e) {
      console.warn("[pdfChunkCache] Delete error:", e);
      resolve(false);
    }
  });
}
