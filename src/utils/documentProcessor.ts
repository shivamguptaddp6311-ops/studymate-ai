import * as pdfjsLib from "pdfjs-dist";
import mammoth from "mammoth";

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
  content: string;
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
 * Split text into chunks with page numbers and overlap
 */
function createChunks(docId: string, docName: string, pages: DocumentPage[]): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];
  let chunkIdx = 0;

  for (const page of pages) {
    const text = page.text.trim();
    if (!text) continue;

    // Split page into paragraphs/sentences if long
    const MAX_CHUNK_LEN = 1000;
    if (text.length <= MAX_CHUNK_LEN) {
      chunkIdx++;
      chunks.push({
        id: `${docId}_c${chunkIdx}`,
        docId,
        docName,
        pageNumber: page.pageNumber,
        content: text
      });
    } else {
      // Divide page text into overlapping windows
      let start = 0;
      while (start < text.length) {
        const end = Math.min(start + MAX_CHUNK_LEN, text.length);
        const subText = text.substring(start, end);
        chunkIdx++;
        chunks.push({
          id: `${docId}_c${chunkIdx}`,
          docId,
          docName,
          pageNumber: page.pageNumber,
          content: subText
        });
        start += MAX_CHUNK_LEN - 150; // 150 char overlap
      }
    }
  }

  return chunks;
}

/**
 * Extract text from PDF file using pdfjs-dist
 */
export async function extractPdfText(file: File): Promise<{ pages: DocumentPage[]; fullText: string }> {
  const arrayBuffer = await file.arrayBuffer();
  const getDoc = pdfjsLib.getDocument || (pdfjsLib as any).default?.getDocument;
  if (typeof getDoc !== "function") {
    throw new Error("PDF parser function (pdfjsLib.getDocument) is not available.");
  }
  const pdf = await getDoc({ data: arrayBuffer }).promise;
  const pages: DocumentPage[] = [];
  let fullTextParts: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str || "")
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    pages.push({
      pageNumber: i,
      text: pageText || `[Page ${i} content]`
    });
    fullTextParts.push(`--- Page ${i} ---\n${pageText}`);
  }

  return {
    pages,
    fullText: fullTextParts.join("\n\n")
  };
}

/**
 * Extract text from DOCX file using mammoth
 */
export async function extractDocxText(file: File): Promise<{ pages: DocumentPage[]; fullText: string }> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  const rawText = result.value || "";

  // Divide raw text into simulated pages (~1200 characters per page)
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
 * Main function: Process file with caching
 */
export async function processDocumentFile(file: File): Promise<ProcessedDocument> {
  const fileName = file.name;
  const fileSizeStr = formatFileSize(file.size);
  const ext = fileName.split(".").pop()?.toLowerCase() || "";

  let fileType: "pdf" | "docx" | "txt" = "pdf";
  if (ext === "docx" || ext === "doc") fileType = "docx";
  else if (ext === "txt") fileType = "txt";

  const dataUrl = await fileToDataUrl(file);
  const hash = calculateFileHash(fileName, file.size, dataUrl.slice(0, 200));

  // Check cache in localStorage
  const cachedDocs = loadCachedDocuments();
  const existing = cachedDocs.find((d) => d.hash === hash || (d.name === fileName && d.fileSize === fileSizeStr));
  if (existing) {
    console.log(`[DocumentProcessor] Returning cached document for ${fileName}`);
    return {
      ...existing,
      dataUrl: existing.dataUrl || dataUrl // preserve dataUrl
    };
  }

  // Extract text based on file type
  let extracted: { pages: DocumentPage[]; fullText: string };
  if (fileType === "pdf") {
    extracted = await extractPdfText(file);
  } else if (fileType === "docx") {
    extracted = await extractDocxText(file);
  } else {
    extracted = await extractTxtText(file);
  }

  const docId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const chunks = createChunks(docId, fileName, extracted.pages);

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

  saveDocumentToCache(newDoc);
  return newDoc;
}

/**
 * Caching operations
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

export function saveDocumentToCache(doc: ProcessedDocument) {
  try {
    const docs = loadCachedDocuments();
    const updated = [doc, ...docs.filter((d) => d.id !== doc.id)].slice(0, 15); // store up to 15 docs
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn("Failed to cache document:", e);
  }
}

export function removeDocumentFromCache(docId: string): ProcessedDocument[] {
  try {
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
    for (const page of doc.pages) {
      const pageTextLower = page.text.toLowerCase();
      let matchScore = 0;

      for (const term of terms) {
        if (pageTextLower.includes(term)) {
          matchScore += (pageTextLower.split(term).length - 1) * 2;
        }
      }

      if (matchScore > 0) {
        // Find best snippet window
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

  return results.sort((a, b) => b.score - a.score);
}

/**
 * Build grounded search context string for Gemini / AI Chat
 */
export function buildDocumentContextPrompt(docs: ProcessedDocument[], activeDocIds?: string[]): string {
  const targetDocs = activeDocIds && activeDocIds.length > 0 
    ? docs.filter((d) => activeDocIds.includes(d.id))
    : docs;

  if (targetDocs.length === 0) return "";

  let contextParts: string[] = [];
  contextParts.push("=== NOTEBOOKLM GROUNDED DOCUMENTS CONTEXT ===");
  contextParts.push("The user has uploaded the following source document(s). You MUST base your answers ONLY on these documents unless Web Search is explicitly requested.");
  contextParts.push("Rule: Always provide page citations in standard format like [DocumentName, p. X] or [Page X] whenever referencing facts, formulas, or answers from the documents.\n");

  for (const doc of targetDocs) {
    contextParts.push(`DOCUMENT: "${doc.name}" (Type: ${doc.fileType.toUpperCase()}, Total Pages: ${doc.totalPages})`);
    
    // Include top pages text (limit per page to keep context budget optimal)
    for (const page of doc.pages) {
      const pageTrim = page.text.length > 1500 ? page.text.substring(0, 1500) + "..." : page.text;
      contextParts.push(`[${doc.name} | Page ${page.pageNumber}]\n${pageTrim}\n`);
    }
  }

  contextParts.push("=== END DOCUMENT CONTEXT ===\n");
  return contextParts.join("\n");
}
