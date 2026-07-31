import * as pdfjsLib from "pdfjs-dist";
import mammoth from "mammoth";
import { preprocessImageForOCRAndVision } from "./imagePreprocessingPipeline";
import { logger } from "./logger";
import {
  saveDocToIndexedDB,
  getDocFromIndexedDB,
  loadAllDocsFromIndexedDB,
  deleteDocFromIndexedDB
} from "./pdfChunkCache";

// Configure pdfjs worker URL safely
if (typeof window !== "undefined") {
  try {
    const pLib = pdfjsLib as any;
    if (pLib && (pLib.GlobalWorkerOptions || pLib.default?.GlobalWorkerOptions)) {
      const gwo = pLib.GlobalWorkerOptions || pLib.default?.GlobalWorkerOptions;
      const version = pLib.version || pLib.default?.version || "4.10.38";
      gwo.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.mjs`;
    }
  } catch (e) {
    console.warn("[documentProcessor] pdfjs worker initialization warning:", e);
  }
}

export interface DocumentPage {
  pageNumber: number;
  text: string;
}

export interface DocumentChunk {
  id: string;
  docId: string;
  docName: string;
  pageNumber: number;
  startPage?: number;
  endPage?: number;
  headingHierarchy?: string;
  content: string;
  tokenCountEstimate?: number;
}

export interface ProcessedDocument {
  id: string;
  name: string;
  fileType: "pdf" | "docx" | "txt";
  fileSize: string;
  totalPages: number;
  pages: DocumentPage[];
  chunks: DocumentChunk[];
  fullText: string;
  dataUrl?: string; // Base64 data URL for inline PDF viewing
  createdAt: number;
  updatedAt: number;
  hash: string;
}

const STORAGE_KEY = "studymate_notebooklm_documents_v1";

/**
 * Generate a simple hash string for file caching
 */
function calculateFileHash(fileName: string, fileSize: number, firstBytes: string): string {
  let hash = 0;
  const str = `${fileName}_${fileSize}_${firstBytes.slice(0, 100)}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `doc_hash_${Math.abs(hash)}`;
}

/**
 * Helper to check if a line is a heading or section title
 */
function isHeadingLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 90) return false;

  // Markdown headings
  if (/^#{1,4}\s+\S+/.test(trimmed)) return true;

  // Chapter / Section / Unit / Module
  if (/^(chapter|section|unit|module|part)\s+[\d\w]+/i.test(trimmed)) return true;

  // Numbered headings like 1.1, 2.3.1
  if (/^\d+(\.\d+)*\s+[A-Z]/.test(trimmed)) return true;

  // Standalone all-caps line (e.g. "THERMODYNAMICS AND KINETICS")
  if (/^[A-Z0-9\s\.\,\-\:\(\)]{4,60}$/.test(trimmed) && !trimmed.endsWith(".")) return true;

  // Bold text line
  if (/^\*\*[^*]+\*\*$/.test(trimmed)) return true;

  return false;
}

/**
 * Scalable Semantic Chunking Algorithm
 * Chunks text by headings, paragraphs, and page boundaries with context breadcrumbs & overlapping windows
 */
export function createSemanticChunks(
  docId: string,
  docName: string,
  pages: DocumentPage[]
): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];
  let chunkIdx = 0;
  let activeHeadingStack: string[] = [];

  const TARGET_CHUNK_CHARS = 1200; // ~300 words
  const OVERLAP_CHARS = 150; // Context continuity overlap

  for (const page of pages) {
    const rawText = page.text || "";
    if (!rawText.trim()) continue;

    const lines = rawText.split(/\r?\n/);
    let currentParagraphs: string[] = [];
    let chunkStartPage = page.pageNumber;

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) {
        if (currentParagraphs.length > 0) {
          currentParagraphs.push("\n");
        }
        continue;
      }

      // Track headings
      if (isHeadingLine(trimmedLine)) {
        const cleanHeading = trimmedLine.replace(/^#+\s*/, "").replace(/\*\*/g, "").trim();
        if (trimmedLine.startsWith("# ")) {
          activeHeadingStack = [cleanHeading];
        } else if (trimmedLine.startsWith("## ")) {
          activeHeadingStack = [activeHeadingStack[0] || "General", cleanHeading];
        } else {
          activeHeadingStack = [activeHeadingStack[0] || "Section", cleanHeading];
        }
      }

      currentParagraphs.push(line);
      const accumulatedLength = currentParagraphs.join("\n").length;

      if (accumulatedLength >= TARGET_CHUNK_CHARS) {
        const chunkContent = currentParagraphs.join("\n").trim();
        const hierarchyStr = activeHeadingStack.join(" > ") || undefined;
        chunkIdx++;

        chunks.push({
          id: `${docId}_c${chunkIdx}`,
          docId,
          docName,
          pageNumber: page.pageNumber,
          startPage: chunkStartPage,
          endPage: page.pageNumber,
          headingHierarchy: hierarchyStr,
          content: chunkContent,
          tokenCountEstimate: Math.ceil(chunkContent.length / 4)
        });

        // Prepare overlap window for continuity
        const overlapText = chunkContent.slice(Math.max(0, chunkContent.length - OVERLAP_CHARS));
        currentParagraphs = [overlapText];
        chunkStartPage = page.pageNumber;
      }
    }

    // Flush remaining paragraphs for page
    if (currentParagraphs.length > 0) {
      const remainingContent = currentParagraphs.join("\n").trim();
      if (remainingContent.length > 30) {
        const hierarchyStr = activeHeadingStack.join(" > ") || undefined;
        chunkIdx++;
        chunks.push({
          id: `${docId}_c${chunkIdx}`,
          docId,
          docName,
          pageNumber: page.pageNumber,
          startPage: chunkStartPage,
          endPage: page.pageNumber,
          headingHierarchy: hierarchyStr,
          content: remainingContent,
          tokenCountEstimate: Math.ceil(remainingContent.length / 4)
        });
      }
    }
  }

  // Fallback for short pages
  if (chunks.length === 0 && pages.length > 0) {
    for (const page of pages) {
      if (page.text.trim()) {
        chunkIdx++;
        chunks.push({
          id: `${docId}_c${chunkIdx}`,
          docId,
          docName,
          pageNumber: page.pageNumber,
          content: page.text.trim(),
          tokenCountEstimate: Math.ceil(page.text.trim().length / 4)
        });
      }
    }
  }

  return chunks;
}

/**
 * Backward compatible chunk creator wrapping semantic chunking
 */
function createChunks(docId: string, docName: string, pages: DocumentPage[]): DocumentChunk[] {
  return createSemanticChunks(docId, docName, pages);
}

/**
 * Detects whether extracted text is insufficient (indicating a scanned or image-based PDF page).
 */
export function isInsufficientText(text: string): boolean {
  if (!text || !text.trim()) return true;
  const cleaned = text.replace(/\[Page \d+ content.*?\]/gi, "").trim();
  const meaningfulChars = cleaned.replace(/[^a-zA-Z0-9\u0900-\u097F]/g, "");
  return meaningfulChars.length < 20;
}

/**
 * Render a PDF page proxy to canvas and export as a JPEG Base64 Data URL for OCR
 */
export async function renderPdfPageToDataUrl(page: any): Promise<string | null> {
  try {
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) return null;

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({ canvasContext: context, viewport }).promise;
    return canvas.toDataURL("image/jpeg", 0.85);
  } catch (err) {
    console.warn("[documentProcessor] Canvas render error for PDF page OCR:", err);
    return null;
  }
}

/**
 * Perform OCR on a scanned PDF page image using the backend AI OCR endpoint
 */
export async function performPageOcr(imageDataUrl: string, pageNumber: number): Promise<string> {
  try {
    let processedImage = imageDataUrl;
    try {
      const result = await preprocessImageForOCRAndVision(imageDataUrl, {
        autoRotate: true,
        deskew: true,
        denoise: true,
        improveContrast: true,
        resizeIntelligently: true,
        jpegQuality: 0.88
      });
      processedImage = result.processedDataUrl;
    } catch (e) {
      console.warn("[documentProcessor] Preprocessing failed for page image, proceeding with original:", e);
    }

    let token = localStorage.getItem("studymate_token") || window.localStorage.getItem("studymate_token") || "";
    if (!token) {
      const email = localStorage.getItem("studymate_logged_in_email") || `guest-${Date.now()}@studymate.app`;
      const guestRes = await fetch("/api/auth/guest-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      if (guestRes.ok) {
        const guestData = await guestRes.json();
        token = guestData.token;
        window.localStorage.setItem("studymate_token", token);
      }
    }

    const res = await fetch("/api/ai/ocr-pdf-page", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        image: processedImage,
        pageNumber,
        provider: localStorage.getItem("studymate_ai_provider") || "auto"
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.text && typeof data.text === "string" && data.text.trim()) {
        return data.text.trim();
      }
    }
  } catch (err) {
    console.warn(`[documentProcessor] OCR failed for page ${pageNumber}:`, err);
  }
  return `[Page ${pageNumber} content - OCR unavailable]`;
}

/**
 * Incremental Batch Extraction for large PDFs (500+ pages)
 * Yields event-loop control to prevent UI freezing and OOM crashes
 */
export async function extractPdfText(
  file: File,
  onProgress?: (current: number, total: number, status: string) => void
): Promise<{ pages: DocumentPage[]; fullText: string }> {
  const arrayBuffer = await file.arrayBuffer();
  const getDoc = pdfjsLib.getDocument || (pdfjsLib as any).default?.getDocument;
  if (typeof getDoc !== "function") {
    throw new Error("PDF parser function (pdfjsLib.getDocument) is not available.");
  }
  const pdf = await getDoc({ data: arrayBuffer }).promise;
  const totalPages = pdf.numPages;
  const pages: DocumentPage[] = [];
  let fullTextParts: string[] = [];

  const BATCH_SIZE = 15;

  for (let i = 1; i <= totalPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    let pageText = textContent.items
      .map((item: any) => item.str || "")
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    if (isInsufficientText(pageText)) {
      if (onProgress) {
        onProgress(i, totalPages, `Running AI OCR fallback on scanned page ${i}/${totalPages}...`);
      }
      const pageImageDataUrl = await renderPdfPageToDataUrl(page);
      if (pageImageDataUrl) {
        const ocrText = await performPageOcr(pageImageDataUrl, i);
        if (ocrText && ocrText.trim()) {
          pageText = ocrText;
        }
      }
    } else if (onProgress && (i % 5 === 0 || i === totalPages || i === 1)) {
      onProgress(i, totalPages, `Parsing PDF page ${i}/${totalPages} (${Math.round((i / totalPages) * 100)}%)...`);
    }

    if (!pageText || !pageText.trim()) {
      pageText = `[Page ${i} content]`;
    }

    pages.push({
      pageNumber: i,
      text: pageText
    });

    if (totalPages <= 50 || i <= 20 || i > totalPages - 10 || i % 10 === 0) {
      fullTextParts.push(`--- Page ${i} ---\n${pageText}`);
    }

    // Yield event loop every batch to prevent main thread lockup
    if (i % BATCH_SIZE === 0) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  const fullText = totalPages > 50 
    ? `${fullTextParts.slice(0, 30).join("\n\n")}\n\n[... PDF contains ${totalPages} total pages ...]\n\n${fullTextParts.slice(-10).join("\n\n")}`
    : fullTextParts.join("\n\n");

  return {
    pages,
    fullText
  };
}

/**
 * Extract text from DOCX file using mammoth
 */
export async function extractDocxText(file: File): Promise<{ pages: DocumentPage[]; fullText: string }> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  const rawText = result.value || "";

  const CHARS_PER_PAGE = 1200;
  const pages: DocumentPage[] = [];
  let fullTextParts: string[] = [];

  if (!rawText.trim()) {
    pages.push({ pageNumber: 1, text: "Empty document" });
    return { pages, fullText: "Empty document" };
  }

  let pageNum = 1;
  for (let i = 0; i < rawText.length; i += CHARS_PER_PAGE) {
    const chunkText = rawText.substring(i, i + CHARS_PER_PAGE).trim();
    pages.push({
      pageNumber: pageNum,
      text: chunkText
    });
    fullTextParts.push(`--- Section/Page ${pageNum} ---\n${chunkText}`);
    pageNum++;
  }

  return {
    pages,
    fullText: fullTextParts.join("\n\n")
  };
}

/**
 * Extract text from TXT file
 */
export async function extractTxtText(file: File): Promise<{ pages: DocumentPage[]; fullText: string }> {
  const rawText = await file.text();
  const CHARS_PER_PAGE = 1200;
  const pages: DocumentPage[] = [];
  let fullTextParts: string[] = [];

  if (!rawText.trim()) {
    pages.push({ pageNumber: 1, text: "Empty document" });
    return { pages, fullText: "Empty document" };
  }

  let pageNum = 1;
  for (let i = 0; i < rawText.length; i += CHARS_PER_PAGE) {
    const chunkText = rawText.substring(i, i + CHARS_PER_PAGE).trim();
    pages.push({
      pageNumber: pageNum,
      text: chunkText
    });
    fullTextParts.push(`--- Section/Page ${pageNum} ---\n${chunkText}`);
    pageNum++;
  }

  return {
    pages,
    fullText: fullTextParts.join("\n\n")
  };
}

/**
 * Helper to convert file to Base64 Data URL
 */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Format file size into readable KB/MB
 */
function formatFileSize(bytes: number): string {
  if (bytes > 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.round(bytes / 1024)} KB`;
}

/**
 * Main function: Process file with hybrid IndexedDB + localStorage caching
 */
export async function processDocumentFile(
  file: File,
  onProgress?: (current: number, total: number, status: string) => void
): Promise<ProcessedDocument> {
  const fileName = file.name;
  const fileSizeStr = formatFileSize(file.size);
  const ext = fileName.split(".").pop()?.toLowerCase() || "";

  let fileType: "pdf" | "docx" | "txt" = "pdf";
  if (ext === "docx" || ext === "doc") fileType = "docx";
  else if (ext === "txt") fileType = "txt";

  const dataUrl = file.size <= 8 * 1024 * 1024 ? await fileToDataUrl(file) : undefined;
  const hash = calculateFileHash(fileName, file.size, (dataUrl || fileName).slice(0, 200));

  // 1. Check IndexedDB cache first
  const indexedDbCached = await getDocFromIndexedDB(hash);
  if (indexedDbCached) {
    logger.info("DocumentProcessor", `Returning IndexedDB cached document for ${fileName}`);
    return indexedDbCached;
  }

  // 2. Fallback check in localStorage
  const cachedDocs = loadCachedDocuments();
  const existing = cachedDocs.find((d) => d.hash === hash || (d.name === fileName && d.fileSize === fileSizeStr));
  if (existing) {
    logger.info("DocumentProcessor", `Returning localStorage cached document for ${fileName}`);
    return {
      ...existing,
      dataUrl: existing.dataUrl || dataUrl
    };
  }

  // 3. Extract text
  let extracted: { pages: DocumentPage[]; fullText: string };
  if (fileType === "pdf") {
    extracted = await extractPdfText(file, onProgress);
  } else if (fileType === "docx") {
    extracted = await extractDocxText(file);
  } else {
    extracted = await extractTxtText(file);
  }

  const docId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const chunks = createSemanticChunks(docId, fileName, extracted.pages);

  const newDoc: ProcessedDocument = {
    id: docId,
    name: fileName,
    fileType,
    fileSize: fileSizeStr,
    totalPages: extracted.pages.length,
    pages: extracted.pages,
    chunks,
    fullText: extracted.fullText,
    dataUrl,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    hash
  };

  // 4. Save to IndexedDB & localStorage
  await saveDocToIndexedDB(newDoc);
  saveDocumentToCache(newDoc);

  return newDoc;
}

/**
 * Synchronous local storage caching
 */
export function loadCachedDocuments(): ProcessedDocument[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.warn("Failed to load cached documents:", e);
    return [];
  }
}

/**
 * Async IndexedDB caching loader
 */
export async function loadCachedDocumentsAsync(): Promise<ProcessedDocument[]> {
  try {
    const fromIdb = await loadAllDocsFromIndexedDB();
    if (fromIdb && fromIdb.length > 0) {
      return fromIdb;
    }
    return loadCachedDocuments();
  } catch (e) {
    return loadCachedDocuments();
  }
}

export function saveDocumentToCache(doc: ProcessedDocument) {
  try {
    const docs = loadCachedDocuments();
    // Trim heavy pages/dataUrls for localStorage metadata copy
    const lightDoc: ProcessedDocument = {
      ...doc,
      dataUrl: doc.totalPages > 20 ? undefined : doc.dataUrl,
      chunks: doc.chunks ? doc.chunks.slice(0, 100) : []
    };
    const updated = [lightDoc, ...docs.filter((d) => d.id !== doc.id)].slice(0, 15);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn("Failed to cache document in localStorage:", e);
  }
}

export function removeDocumentFromCache(docId: string): ProcessedDocument[] {
  try {
    deleteDocFromIndexedDB(docId).catch(() => {});
    const docs = loadCachedDocuments();
    const filtered = docs.filter((d) => d.id !== docId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return filtered;
  } catch (e) {
    console.warn("Failed to remove document from cache:", e);
    return [];
  }
}

export function renameDocumentInCache(docId: string, newName: string): ProcessedDocument[] {
  try {
    const docs = loadCachedDocuments();
    const updated = docs.map((d) => (d.id === docId ? { ...d, name: newName, updatedAt: Date.now() } : d));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.warn("Failed to rename document in cache:", e);
    return [];
  }
}

/**
 * Search inside uploaded documents
 */
export interface SearchMatch {
  docId: string;
  docName: string;
  pageNumber: number;
  snippet: string;
  score: number;
}

export function searchDocuments(docs: ProcessedDocument[], query: string): SearchMatch[] {
  if (!query.trim()) return [];
  const terms = query.toLowerCase().trim().split(/\s+/);
  const results: SearchMatch[] = [];

  for (const doc of docs) {
    // Search semantic chunks first for higher accuracy
    if (doc.chunks && doc.chunks.length > 0) {
      for (const chunk of doc.chunks) {
        const contentLower = chunk.content.toLowerCase();
        let matchScore = 0;

        for (const term of terms) {
          if (contentLower.includes(term)) {
            matchScore += (contentLower.split(term).length - 1) * 3;
          }
        }

        if (matchScore > 0) {
          const firstTermIdx = Math.max(0, contentLower.indexOf(terms[0]));
          const start = Math.max(0, firstTermIdx - 60);
          const end = Math.min(chunk.content.length, firstTermIdx + 120);
          const snippet = (start > 0 ? "..." : "") + chunk.content.substring(start, end) + (end < chunk.content.length ? "..." : "");

          results.push({
            docId: doc.id,
            docName: doc.name,
            pageNumber: chunk.pageNumber,
            snippet: chunk.headingHierarchy ? `[${chunk.headingHierarchy}] ${snippet}` : snippet,
            score: matchScore
          });
        }
      }
    } else {
      for (const page of doc.pages) {
        const pageTextLower = page.text.toLowerCase();
        let matchScore = 0;

        for (const term of terms) {
          if (pageTextLower.includes(term)) {
            matchScore += (pageTextLower.split(term).length - 1) * 2;
          }
        }

        if (matchScore > 0) {
          const firstTermIdx = Math.max(0, pageTextLower.indexOf(terms[0]));
          const start = Math.max(0, firstTermIdx - 60);
          const end = Math.min(page.text.length, firstTermIdx + 120);
          const snippet = (start > 0 ? "..." : "") + page.text.substring(start, end) + (end < page.text.length ? "..." : "");

          results.push({
            docId: doc.id,
            docName: doc.name,
            pageNumber: page.pageNumber,
            snippet,
            score: matchScore
          });
        }
      }
    }
  }

  return results.sort((a, b) => b.score - a.score);
}

/**
 * Token-Bounded Grounded Context Generator
 * Prevents token overflow on 500+ page PDFs by dynamically selecting top semantic chunks
 */
export function buildDocumentContextPrompt(
  docs: ProcessedDocument[],
  activeDocIds?: string[],
  userQuery?: string
): string {
  const targetDocs = activeDocIds && activeDocIds.length > 0 
    ? docs.filter((d) => activeDocIds.includes(d.id))
    : docs;

  if (targetDocs.length === 0) return "";

  let contextParts: string[] = [];
  contextParts.push("=== NOTEBOOKLM GROUNDED DOCUMENTS CONTEXT ===");
  contextParts.push("The user has uploaded source document(s). Base answers strictly on these documents.");
  contextParts.push("Rule: Always provide page citations in standard format like [DocumentName, p. X] or [Page X] whenever referencing facts, formulas, or answers from the documents.\n");

  const MAX_TOTAL_CONTEXT_CHARS = 16000; // ~4,000 tokens context budget
  let currentLength = contextParts.join("\n").length;

  for (const doc of targetDocs) {
    if (currentLength >= MAX_TOTAL_CONTEXT_CHARS) break;

    contextParts.push(`DOCUMENT: "${doc.name}" (Type: ${doc.fileType.toUpperCase()}, Total Pages: ${doc.totalPages})`);

    // 1. Small Document (<= 15 pages): Full page context
    if (doc.totalPages <= 15) {
      for (const page of doc.pages) {
        if (currentLength >= MAX_TOTAL_CONTEXT_CHARS) break;
        const pageTrim = page.text.length > 1200 ? page.text.substring(0, 1200) + "..." : page.text;
        const entry = `[${doc.name} | Page ${page.pageNumber}]\n${pageTrim}\n`;
        contextParts.push(entry);
        currentLength += entry.length;
      }
    } 
    // 2. Large Document (15 to 500+ pages): Semantic Chunk Retrieval + Outline
    else {
      const outlineHeadings: string[] = [];
      const seenHeadings = new Set<string>();

      for (const chunk of doc.chunks || []) {
        if (chunk.headingHierarchy && !seenHeadings.has(chunk.headingHierarchy)) {
          seenHeadings.add(chunk.headingHierarchy);
          outlineHeadings.push(` - ${chunk.headingHierarchy} (p. ${chunk.pageNumber})`);
          if (outlineHeadings.length >= 15) break;
        }
      }

      if (outlineHeadings.length > 0) {
        const outlineBlock = `[Document Outline / Table of Contents]:\n${outlineHeadings.join("\n")}\n`;
        contextParts.push(outlineBlock);
        currentLength += outlineBlock.length;
      }

      let selectedChunks: DocumentChunk[] = [];

      if (userQuery && userQuery.trim().length > 2) {
        const queryTerms = userQuery.toLowerCase().trim().split(/\s+/).filter((t) => t.length > 2);
        
        const scored = (doc.chunks || []).map((chunk) => {
          const contentLower = chunk.content.toLowerCase();
          const hierarchyLower = (chunk.headingHierarchy || "").toLowerCase();
          let score = 0;

          for (const term of queryTerms) {
            if (contentLower.includes(term)) {
              score += (contentLower.split(term).length - 1) * 3;
            }
            if (hierarchyLower.includes(term)) {
              score += 10;
            }
          }
          return { chunk, score };
        });

        scored.sort((a, b) => b.score - a.score);
        selectedChunks = scored.filter((s) => s.score > 0).slice(0, 15).map((s) => s.chunk);

        if (selectedChunks.length === 0 && doc.chunks && doc.chunks.length > 0) {
          const step = Math.max(1, Math.floor(doc.chunks.length / 10));
          for (let idx = 0; idx < doc.chunks.length; idx += step) {
            selectedChunks.push(doc.chunks[idx]);
          }
        }
      } else {
        const allChunks = doc.chunks || [];
        if (allChunks.length > 0) {
          const step = Math.max(1, Math.floor(allChunks.length / 12));
          for (let idx = 0; idx < allChunks.length; idx += step) {
            selectedChunks.push(allChunks[idx]);
          }
        }
      }

      for (const chunk of selectedChunks) {
        if (currentLength >= MAX_TOTAL_CONTEXT_CHARS) break;
        const headingMeta = chunk.headingHierarchy ? ` | Section: ${chunk.headingHierarchy}` : "";
        const entry = `[${doc.name} | Page ${chunk.pageNumber}${headingMeta}]\n${chunk.content}\n`;
        contextParts.push(entry);
        currentLength += entry.length;
      }
    }
  }

  contextParts.push("=== END DOCUMENT CONTEXT ===\n");
  return contextParts.join("\n");
}
