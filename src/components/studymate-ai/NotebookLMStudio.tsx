import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  FileText, 
  Upload, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  Search, 
  Sparkles, 
  BookOpen, 
  Brain, 
  Layers, 
  HelpCircle, 
  GitBranch, 
  Copy, 
  Send, 
  FileCheck, 
  Eye, 
  FolderPlus, 
  CheckSquare, 
  Square,
  Loader2,
  ChevronRight,
  ChevronDown
} from "lucide-react";
import { ProcessedDocument, SearchMatch } from "../../utils/documentProcessor";
import { StudioToolType, MindMapNode } from "../../hooks/useNotebookLM";

interface NotebookLMStudioProps {
  documents: ProcessedDocument[];
  activeDocIds: string[];
  selectedDocId: string | null;
  onSelectDocForView: (docId: string) => void;
  onToggleDocActive: (docId: string) => void;
  onSelectAllDocs: () => void;
  onDeselectAllDocs: () => void;
  onDeleteDoc: (docId: string) => void;
  onRenameDoc: (docId: string, newName: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: SearchMatch[];
  isUploadingDoc: boolean;
  uploadError: string | null;
  onUploadFiles: (files: FileList | File[]) => void;
  docInputRef: React.RefObject<HTMLInputElement | null>;
  activeStudioTool: StudioToolType | null;
  isGeneratingStudio: boolean;
  studioOutputText: string | null;
  studioFlashcards: Array<{ question: string; answer: string; page?: number }>;
  studioQuiz: Array<{ question: string; options: string[]; correctAnswerIndex: number; explanation: string }>;
  studioMindMap: MindMapNode | null;
  onExecuteStudioTool: (tool: StudioToolType, customInstruction?: string) => void;
  onJumpToCitation: (docName: string, pageNumber: number, snippet?: string) => void;
  onSendToChat?: (text: string) => void;
}

export function NotebookLMStudio({
  documents,
  activeDocIds,
  selectedDocId,
  onSelectDocForView,
  onToggleDocActive,
  onSelectAllDocs,
  onDeselectAllDocs,
  onDeleteDoc,
  onRenameDoc,
  searchQuery,
  setSearchQuery,
  searchResults,
  isUploadingDoc,
  uploadError,
  onUploadFiles,
  docInputRef,
  activeStudioTool,
  isGeneratingStudio,
  studioOutputText,
  studioFlashcards,
  studioQuiz,
  studioMindMap,
  onExecuteStudioTool,
  onJumpToCitation,
  onSendToChat
}: NotebookLMStudioProps) {
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  // Quiz state
  const [userQuizAnswers, setUserQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  // Flashcard flip state
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Copy state
  const [copied, setCopied] = useState(false);

  const handleStartRename = (doc: ProcessedDocument) => {
    setEditingDocId(doc.id);
    setEditingTitle(doc.name);
  };

  const handleSaveRename = (docId: string) => {
    if (editingTitle.trim()) {
      onRenameDoc(docId, editingTitle.trim());
    }
    setEditingDocId(null);
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Helper component to render recursive mind map node
  const RenderMindMapNode: React.FC<{ node: MindMapNode; depth?: number }> = ({ node, depth = 0 }) => {
    const [expanded, setExpanded] = useState(true);
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div className="space-y-1.5 my-1">
        <div 
          className={`p-2.5 rounded-2xl border transition flex items-start space-x-2 ${
            depth === 0 
              ? "bg-gradient-to-r from-indigo-900/60 to-purple-900/60 border-indigo-500/50 text-white font-extrabold" 
              : depth === 1
              ? "bg-slate-800/80 border-slate-700/80 text-indigo-300 font-bold ml-4"
              : "bg-slate-900/80 border-slate-800 text-slate-300 text-xs ml-8"
          }`}
        >
          {hasChildren && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="p-1 hover:bg-white/10 rounded cursor-pointer mt-0.5 text-slate-400"
            >
              {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          )}
          <div className="flex-1">
            <span className="text-xs font-bold block">{node.label}</span>
            {node.details && <p className="text-[11px] text-slate-400 font-normal mt-0.5">{node.details}</p>}
          </div>
        </div>

        {hasChildren && expanded && (
          <div className="border-l-2 border-indigo-500/30 pl-2 space-y-1">
            {node.children!.map((child) => (
              <RenderMindMapNode key={child.id} node={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
      {/* HIDDEN MULTI-FILE INPUT */}
      <input
        type="file"
        ref={docInputRef as any}
        onChange={(e) => e.target.files && onUploadFiles(e.target.files)}
        multiple
        accept=".pdf,.docx,.doc,.txt"
        className="hidden"
      />

      {/* HEADER BAR */}
      <div className="p-4 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="p-2.5 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-600 text-white rounded-2xl shadow-lg">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black text-sm sm:text-base text-white flex items-center gap-2">
              NotebookLM AI Studio
              <span className="text-[9px] bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-2 py-0.5 rounded-full font-bold">
                DOCUMENT GROUNDED
              </span>
            </h3>
            <p className="text-[10px] text-slate-400 font-semibold">PDF • DOCX • TXT Multi-Document AI Context</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => docInputRef.current?.click()}
          disabled={isUploadingDoc}
          className="px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-black transition cursor-pointer flex items-center space-x-1.5 shadow-md active:scale-95"
        >
          {isUploadingDoc ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderPlus className="w-4 h-4" />}
          <span>Upload Files</span>
        </button>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* LEFT COLUMN: DOCUMENT LIST & SEARCH */}
        <div className="w-full md:w-80 bg-slate-950/60 border-b md:border-b-0 md:border-r border-slate-800/80 p-3.5 flex flex-col space-y-3 overflow-y-auto">
          {/* SEARCH INSIDE DOCUMENTS */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search terms across documents..."
              className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500"
            />
          </div>

          {/* SEARCH RESULTS LIST */}
          {searchQuery.trim() && (
            <div className="bg-slate-900/90 border border-indigo-500/30 rounded-2xl p-2.5 space-y-2 max-h-48 overflow-y-auto">
              <span className="text-[10px] font-black uppercase text-indigo-400 tracking-wider">
                Matches ({searchResults.length})
              </span>
              {searchResults.length === 0 ? (
                <p className="text-[11px] text-slate-500 italic text-center py-2">No matching pages found.</p>
              ) : (
                searchResults.map((m, idx) => (
                  <div
                    key={idx}
                    onClick={() => onJumpToCitation(m.docName, m.pageNumber, m.snippet)}
                    className="p-2 bg-slate-800/80 hover:bg-indigo-950/60 border border-slate-700/80 rounded-xl cursor-pointer transition text-left space-y-1"
                  >
                    <div className="flex justify-between text-[10px] font-bold text-indigo-300">
                      <span className="truncate max-w-[120px]">{m.docName}</span>
                      <span>Page {m.pageNumber}</span>
                    </div>
                    <p className="text-[10px] text-slate-300 line-clamp-2 italic">{m.snippet}</p>
                  </div>
                ))
              )}
            </div>
          )}

          {/* DOCUMENT MANAGER HEADER */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Uploaded Documents ({documents.length})
            </span>

            {documents.length > 0 && (
              <div className="flex items-center space-x-1.5 text-[10px] font-bold">
                <button
                  type="button"
                  onClick={onSelectAllDocs}
                  className="text-indigo-400 hover:underline cursor-pointer"
                >
                  Select All
                </button>
                <span className="text-slate-600">•</span>
                <button
                  type="button"
                  onClick={onDeselectAllDocs}
                  className="text-slate-500 hover:underline cursor-pointer"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          {/* DOCUMENT LIST CARDS */}
          {documents.length === 0 ? (
            <div className="p-6 border border-dashed border-slate-800 rounded-2xl text-center space-y-2">
              <FileText className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400 font-semibold">No documents added yet.</p>
              <p className="text-[10px] text-slate-500">Upload PDF, DOCX, or TXT files to start NotebookLM AI Chat.</p>
            </div>
          ) : (
            <div className="space-y-2 flex-1 overflow-y-auto pr-1">
              {documents.map((doc) => {
                const isActive = activeDocIds.includes(doc.id);
                const isSelectedForView = selectedDocId === doc.id;
                const isEditing = editingDocId === doc.id;

                return (
                  <div
                    key={doc.id}
                    className={`p-2.5 rounded-2xl border transition space-y-1.5 ${
                      isSelectedForView
                        ? "bg-slate-800/90 border-indigo-500/80 shadow-md"
                        : "bg-slate-900/60 border-slate-800/80 hover:bg-slate-850"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      {/* Checkbox for active context inclusion */}
                      <button
                        type="button"
                        onClick={() => onToggleDocActive(doc.id)}
                        className="p-1 text-indigo-400 hover:text-indigo-300 cursor-pointer"
                        title={isActive ? "Included in AI Context" : "Excluded from AI Context"}
                      >
                        {isActive ? <CheckSquare className="w-4 h-4 text-indigo-400" /> : <Square className="w-4 h-4 text-slate-600" />}
                      </button>

                      {/* File Name / Inline Editor */}
                      <div className="flex-1 min-w-0 mx-2">
                        {isEditing ? (
                          <div className="flex items-center space-x-1">
                            <input
                              type="text"
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              className="w-full bg-slate-950 text-xs text-white px-2 py-1 rounded border border-indigo-500 outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveRename(doc.id)}
                              className="p-1 bg-emerald-600 text-white rounded cursor-pointer"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div 
                            onClick={() => onSelectDocForView(doc.id)}
                            className="cursor-pointer"
                          >
                            <span className="text-xs font-bold text-white block truncate">{doc.name}</span>
                            <div className="flex items-center space-x-1 text-[9px] text-slate-400 font-semibold">
                              <span className="uppercase text-indigo-400 font-black">{doc.fileType}</span>
                              <span>•</span>
                              <span>{doc.totalPages} {doc.totalPages === 1 ? "page" : "pages"}</span>
                              <span>•</span>
                              <span>{doc.fileSize}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Action buttons: Edit, View, Delete */}
                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => onSelectDocForView(doc.id)}
                          className={`p-1 rounded cursor-pointer transition ${isSelectedForView ? "text-indigo-400 bg-indigo-500/20" : "text-slate-500 hover:text-white"}`}
                          title="View Document"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStartRename(doc)}
                          className="p-1 text-slate-500 hover:text-white rounded cursor-pointer"
                          title="Rename Document"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onDeleteDoc(doc.id)}
                          className="p-1 text-rose-500 hover:text-rose-400 rounded cursor-pointer"
                          title="Delete Document"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {uploadError && (
            <p className="text-[10px] text-rose-400 font-bold bg-rose-950/60 p-2 rounded-xl border border-rose-800 text-center">
              {uploadError}
            </p>
          )}
        </div>

        {/* RIGHT COLUMN: NOTEBOOKLM AI STUDIO QUICK GENERATION TOOLS */}
        <div className="flex-1 p-4 flex flex-col space-y-4 overflow-y-auto">
          {/* STUDIO TOOL SELECTION GRID */}
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              NotebookLM AI Studio Tools (Grounded in Active Docs)
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => onExecuteStudioTool("summary")}
                disabled={isGeneratingStudio || activeDocIds.length === 0}
                className={`p-3 rounded-2xl border font-bold text-xs transition flex flex-col items-center justify-center text-center space-y-1.5 cursor-pointer ${
                  activeStudioTool === "summary"
                    ? "bg-indigo-600 border-indigo-500 text-white shadow-lg"
                    : "bg-slate-800/80 border-slate-700/80 text-slate-200 hover:bg-slate-750"
                }`}
              >
                <BookOpen className="w-5 h-5 text-emerald-400" />
                <span>Summarize</span>
              </button>

              <button
                type="button"
                onClick={() => onExecuteStudioTool("explain")}
                disabled={isGeneratingStudio || activeDocIds.length === 0}
                className={`p-3 rounded-2xl border font-bold text-xs transition flex flex-col items-center justify-center text-center space-y-1.5 cursor-pointer ${
                  activeStudioTool === "explain"
                    ? "bg-indigo-600 border-indigo-500 text-white shadow-lg"
                    : "bg-slate-800/80 border-slate-700/80 text-slate-200 hover:bg-slate-750"
                }`}
              >
                <Brain className="w-5 h-5 text-purple-400" />
                <span>Explain Concepts</span>
              </button>

              <button
                type="button"
                onClick={() => onExecuteStudioTool("notes")}
                disabled={isGeneratingStudio || activeDocIds.length === 0}
                className={`p-3 rounded-2xl border font-bold text-xs transition flex flex-col items-center justify-center text-center space-y-1.5 cursor-pointer ${
                  activeStudioTool === "notes"
                    ? "bg-indigo-600 border-indigo-500 text-white shadow-lg"
                    : "bg-slate-800/80 border-slate-700/80 text-slate-200 hover:bg-slate-750"
                }`}
              >
                <FileCheck className="w-5 h-5 text-teal-400" />
                <span>Study Notes</span>
              </button>

              <button
                type="button"
                onClick={() => onExecuteStudioTool("flashcards")}
                disabled={isGeneratingStudio || activeDocIds.length === 0}
                className={`p-3 rounded-2xl border font-bold text-xs transition flex flex-col items-center justify-center text-center space-y-1.5 cursor-pointer ${
                  activeStudioTool === "flashcards"
                    ? "bg-indigo-600 border-indigo-500 text-white shadow-lg"
                    : "bg-slate-800/80 border-slate-700/80 text-slate-200 hover:bg-slate-750"
                }`}
              >
                <Layers className="w-5 h-5 text-pink-400" />
                <span>Flashcards</span>
              </button>

              <button
                type="button"
                onClick={() => onExecuteStudioTool("quiz")}
                disabled={isGeneratingStudio || activeDocIds.length === 0}
                className={`p-3 rounded-2xl border font-bold text-xs transition flex flex-col items-center justify-center text-center space-y-1.5 cursor-pointer ${
                  activeStudioTool === "quiz"
                    ? "bg-indigo-600 border-indigo-500 text-white shadow-lg"
                    : "bg-slate-800/80 border-slate-700/80 text-slate-200 hover:bg-slate-750"
                }`}
              >
                <HelpCircle className="w-5 h-5 text-rose-400" />
                <span>Practice Quiz</span>
              </button>

              <button
                type="button"
                onClick={() => onExecuteStudioTool("mindmap")}
                disabled={isGeneratingStudio || activeDocIds.length === 0}
                className={`p-3 rounded-2xl border font-bold text-xs transition flex flex-col items-center justify-center text-center space-y-1.5 cursor-pointer ${
                  activeStudioTool === "mindmap"
                    ? "bg-indigo-600 border-indigo-500 text-white shadow-lg"
                    : "bg-slate-800/80 border-slate-700/80 text-slate-200 hover:bg-slate-750"
                }`}
              >
                <GitBranch className="w-5 h-5 text-amber-400" />
                <span>Mind Map</span>
              </button>
            </div>
          </div>

          {/* STUDIO GENERATION LOADING OR DISPLAY AREA */}
          <div className="flex-1 bg-slate-950/80 border border-slate-800 rounded-3xl p-4 sm:p-5 flex flex-col space-y-3 min-h-[280px]">
            {isGeneratingStudio ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
                <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                <h4 className="text-sm font-extrabold text-white">Generating NotebookLM {activeStudioTool?.toUpperCase()}...</h4>
                <p className="text-xs text-slate-400 max-w-xs">Extracting key concepts, citations, and formulas from active documents.</p>
              </div>
            ) : activeStudioTool === "flashcards" && studioFlashcards.length > 0 ? (
              /* INTERACTIVE FLASHCARDS DECK */
              <div className="flex-1 flex flex-col items-center justify-between space-y-4">
                <div className="w-full flex justify-between items-center text-xs font-extrabold text-slate-300">
                  <span>Flashcard {activeCardIndex + 1} of {studioFlashcards.length}</span>
                  <span className="text-indigo-400">Click card to flip</span>
                </div>

                <div 
                  onClick={() => setIsFlipped(!isFlipped)}
                  className="w-full max-w-md aspect-[16/10] bg-slate-900 border-2 border-indigo-500/40 hover:border-indigo-500 rounded-3xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition shadow-2xl relative select-none"
                >
                  <span className="text-[10px] font-black uppercase text-indigo-400 tracking-widest absolute top-4 left-4">
                    {isFlipped ? "ANSWER" : "QUESTION"}
                  </span>
                  <p className="text-sm sm:text-base font-extrabold text-white leading-relaxed">
                    {isFlipped ? studioFlashcards[activeCardIndex].answer : studioFlashcards[activeCardIndex].question}
                  </p>
                  {studioFlashcards[activeCardIndex].page && (
                    <span className="text-[10px] text-slate-500 font-bold absolute bottom-4 right-4">
                      Page {studioFlashcards[activeCardIndex].page}
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsFlipped(false);
                      setActiveCardIndex((prev) => Math.max(0, prev - 1));
                    }}
                    disabled={activeCardIndex === 0}
                    className="px-4 py-2 bg-slate-800 disabled:opacity-50 text-xs font-bold text-white rounded-xl cursor-pointer"
                  >
                    Previous
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsFlipped(false);
                      setActiveCardIndex((prev) => Math.min(studioFlashcards.length - 1, prev + 1));
                    }}
                    disabled={activeCardIndex === studioFlashcards.length - 1}
                    className="px-4 py-2 bg-indigo-600 disabled:opacity-50 text-xs font-bold text-white rounded-xl cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : activeStudioTool === "quiz" && studioQuiz.length > 0 ? (
              /* INTERACTIVE PRACTICE QUIZ */
              <div className="flex-1 space-y-4 overflow-y-auto">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <h4 className="text-xs font-black text-white uppercase tracking-wider">Practice Quiz ({studioQuiz.length} Questions)</h4>
                  {!quizSubmitted ? (
                    <button
                      type="button"
                      onClick={() => setQuizSubmitted(true)}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold cursor-pointer"
                    >
                      Submit Quiz
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setUserQuizAnswers({});
                        setQuizSubmitted(false);
                      }}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      Retake Quiz
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  {studioQuiz.map((q, qIdx) => {
                    const selectedOpt = userQuizAnswers[qIdx];
                    const isCorrect = selectedOpt === q.correctAnswerIndex;

                    return (
                      <div key={qIdx} className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl space-y-2.5">
                        <p className="text-xs font-extrabold text-white">{qIdx + 1}. {q.question}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {q.options.map((opt, oIdx) => {
                            const isThisSelected = selectedOpt === oIdx;
                            let style = "bg-slate-800 border-slate-700 text-slate-300";

                            if (quizSubmitted) {
                              if (oIdx === q.correctAnswerIndex) {
                                style = "bg-emerald-950/80 border-emerald-500 text-emerald-300 font-bold";
                              } else if (isThisSelected && !isCorrect) {
                                style = "bg-rose-950/80 border-rose-500 text-rose-300";
                              }
                            } else if (isThisSelected) {
                              style = "bg-indigo-600 border-indigo-500 text-white font-bold";
                            }

                            return (
                              <button
                                key={oIdx}
                                type="button"
                                disabled={quizSubmitted}
                                onClick={() => setUserQuizAnswers((prev) => ({ ...prev, [qIdx]: oIdx }))}
                                className={`p-2.5 rounded-xl text-xs text-left border transition cursor-pointer ${style}`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>

                        {quizSubmitted && q.explanation && (
                          <p className="text-[11px] text-slate-400 bg-slate-950/80 p-2 rounded-xl border border-slate-800 italic">
                            Explanation: {q.explanation}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : activeStudioTool === "mindmap" && studioMindMap ? (
              /* CONCEPT MIND MAP VIEW */
              <div className="flex-1 space-y-3 overflow-y-auto">
                <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <GitBranch className="w-4 h-4" />
                  Concept Mind Map
                </h4>
                <RenderMindMapNode node={studioMindMap} />
              </div>
            ) : studioOutputText ? (
              /* GENERATED TEXT OUTPUT (Summary, Notes, Explain) */
              <div className="flex-1 flex flex-col space-y-3 overflow-hidden">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <span className="text-xs font-black text-indigo-400 uppercase tracking-wider">
                    {activeStudioTool?.toUpperCase()} RESULT
                  </span>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => handleCopyText(studioOutputText)}
                      className="px-2.5 py-1 bg-slate-800 text-xs font-bold text-slate-300 hover:text-white rounded-xl transition cursor-pointer flex items-center space-x-1"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copied ? "Copied!" : "Copy"}</span>
                    </button>

                    {onSendToChat && (
                      <button
                        type="button"
                        onClick={() => onSendToChat(studioOutputText)}
                        className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white rounded-xl transition cursor-pointer flex items-center space-x-1"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Send to Chat</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex-1 bg-slate-900 p-4 rounded-2xl border border-slate-800 overflow-y-auto text-xs text-slate-200 font-sans leading-relaxed whitespace-pre-wrap select-text">
                  {studioOutputText}
                </div>
              </div>
            ) : (
              /* DEFAULT EMPTY STATE */
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
                <Sparkles className="w-8 h-8 text-indigo-500/40 mb-2" />
                <h4 className="text-xs font-extrabold text-white">NotebookLM AI Workspace Ready</h4>
                <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
                  Click any studio tool above to auto-generate summaries, study notes, flashcards, practice quizzes, or mind maps grounded in your documents.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default NotebookLMStudio;
