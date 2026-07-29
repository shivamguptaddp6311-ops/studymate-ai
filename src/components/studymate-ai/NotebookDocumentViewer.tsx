import React, { useState } from "react";
import { 
  FileText, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Copy, 
  Check, 
  ExternalLink, 
  Bookmark, 
  BookOpen, 
  Sparkles,
  Layers
} from "lucide-react";
import { ProcessedDocument } from "../../utils/documentProcessor";

interface NotebookDocumentViewerProps {
  document: ProcessedDocument | null;
  currentPage: number;
  onPageChange: (page: number) => void;
  highlightTerm?: string | null;
  onClose?: () => void;
}

export function NotebookDocumentViewer({
  document,
  currentPage,
  onPageChange,
  highlightTerm,
  onClose
}: NotebookDocumentViewerProps) {
  const [docSearchQuery, setDocSearchQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const [fontSize, setFontSize] = useState<number>(14);

  if (!document) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400 bg-slate-900/40 rounded-3xl border border-slate-800">
        <div className="p-4 bg-slate-800/80 rounded-2xl mb-3 text-indigo-400">
          <BookOpen className="w-10 h-10" />
        </div>
        <h3 className="font-extrabold text-white text-base">No Document Selected</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-xs">Upload or select a PDF, DOCX, or TXT document from the NotebookLM Studio panel to preview.</p>
      </div>
    );
  }

  const activePageObj = document.pages.find((p) => p.pageNumber === currentPage) || document.pages[0];
  const pageText = activePageObj ? activePageObj.text : "No text content on this page.";

  const handleCopyPageText = () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(pageText).catch(() => {});
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Highlight matches in text
  const renderHighlightedText = (text: string, term?: string | null, searchFilter?: string) => {
    const query = (searchFilter || term || "").trim().toLowerCase();
    if (!query) return text;

    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query ? (
        <mark key={i} className="bg-amber-400 text-slate-950 font-black px-1 rounded shadow-xs">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="h-full flex flex-col bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
      {/* HEADER & CONTROLS TOOLBAR */}
      <div className="p-3 bg-slate-950/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="p-2 bg-gradient-to-tr from-indigo-500 to-purple-600 text-white rounded-xl shadow-md flex-shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-1.5">
              <span className="text-[9px] font-black uppercase tracking-widest bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/30">
                {document.fileType.toUpperCase()}
              </span>
              <span className="text-[10px] text-slate-400 font-semibold">{document.fileSize}</span>
            </div>
            <h4 className="text-xs font-black text-white truncate max-w-[200px] sm:max-w-xs">{document.name}</h4>
          </div>
        </div>

        {/* PAGE NAVIGATION & ZOOM CONTROLS */}
        <div className="flex items-center space-x-2">
          {/* Page Switcher */}
          <div className="flex items-center bg-slate-800 border border-slate-700/80 rounded-xl p-0.5">
            <button
              type="button"
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
              className="p-1 text-slate-300 hover:text-white disabled:text-slate-600 disabled:cursor-not-allowed cursor-pointer"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-mono font-bold text-slate-200 px-2 min-w-[50px] text-center">
              {currentPage} / {document.totalPages}
            </span>
            <button
              type="button"
              onClick={() => onPageChange(Math.min(document.totalPages, currentPage + 1))}
              disabled={currentPage >= document.totalPages}
              className="p-1 text-slate-300 hover:text-white disabled:text-slate-600 disabled:cursor-not-allowed cursor-pointer"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Font Size Adjusters */}
          <div className="flex items-center bg-slate-800 border border-slate-700/80 rounded-xl p-0.5">
            <button
              type="button"
              onClick={() => setFontSize((prev) => Math.max(11, prev - 1))}
              className="p-1 text-slate-300 hover:text-white cursor-pointer"
              title="Decrease Font Size"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setFontSize((prev) => Math.min(22, prev + 1))}
              className="p-1 text-slate-300 hover:text-white cursor-pointer"
              title="Increase Font Size"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Copy page text */}
          <button
            type="button"
            onClick={handleCopyPageText}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition cursor-pointer border border-slate-700"
            title="Copy Page Text"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* SEARCH INSIDE CURRENT DOCUMENT */}
      <div className="px-3 py-1.5 bg-slate-950/50 border-b border-slate-800/80 flex items-center space-x-2">
        <Search className="w-3.5 h-3.5 text-slate-400" />
        <input
          type="text"
          value={docSearchQuery}
          onChange={(e) => setDocSearchQuery(e.target.value)}
          placeholder="Filter or search keywords on this page..."
          className="w-full bg-transparent text-xs text-white placeholder-slate-500 outline-none"
        />
        {docSearchQuery && (
          <button
            type="button"
            onClick={() => setDocSearchQuery("")}
            className="text-[10px] text-slate-400 hover:text-white font-bold cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>

      {/* DOCUMENT PAGE VIEW AREA */}
      <div className="flex-1 p-4 sm:p-6 overflow-y-auto select-text bg-slate-950/90 font-sans leading-relaxed text-slate-200">
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 flex items-center gap-1">
              <Bookmark className="w-3 h-3 text-indigo-400" />
              Page {currentPage} of {document.totalPages}
            </span>
            <span className="text-[10px] text-slate-500 font-medium">
              NotebookLM Extracted Text Context
            </span>
          </div>

          {/* Render Page Content */}
          <div 
            style={{ fontSize: `${fontSize}px` }} 
            className="whitespace-pre-wrap font-normal leading-relaxed text-slate-200 selection:bg-indigo-500 selection:text-white"
          >
            {renderHighlightedText(pageText, highlightTerm, docSearchQuery)}
          </div>
        </div>
      </div>
    </div>
  );
}

export default NotebookDocumentViewer;
