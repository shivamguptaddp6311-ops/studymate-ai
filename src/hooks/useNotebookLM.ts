import { useState, useEffect, useCallback, useRef } from "react";
import {
  ProcessedDocument,
  processDocumentFile,
  loadCachedDocuments,
  saveDocumentToCache,
  removeDocumentFromCache,
  renameDocumentInCache,
  searchDocuments,
  SearchMatch,
  buildDocumentContextPrompt
} from "../utils/documentProcessor";

export type StudioToolType = "summary" | "explain" | "notes" | "flashcards" | "quiz" | "mindmap";

export interface MindMapNode {
  id: string;
  label: string;
  details?: string;
  children?: MindMapNode[];
}

export function useNotebookLM() {
  const [documents, setDocuments] = useState<ProcessedDocument[]>([]);
  const [activeDocIds, setActiveDocIds] = useState<string[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [viewPageNumber, setViewPageNumber] = useState<number>(1);
  const [highlightTerm, setHighlightTerm] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<SearchMatch[]>([]);
  const [isUploadingDoc, setIsUploadingDoc] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [activeStudioTool, setActiveStudioTool] = useState<StudioToolType | null>(null);
  const [isGeneratingStudio, setIsGeneratingStudio] = useState<boolean>(false);
  const [studioOutputText, setStudioOutputText] = useState<string | null>(null);
  const [studioFlashcards, setStudioFlashcards] = useState<Array<{ question: string; answer: string; page?: number }>>([]);
  const [studioQuiz, setStudioQuiz] = useState<Array<{ question: string; options: string[]; correctAnswerIndex: number; explanation: string }>>([]);
  const [studioMindMap, setStudioMindMap] = useState<MindMapNode | null>(null);

  const docInputRef = useRef<HTMLInputElement>(null);

  // Load cached documents on mount
  useEffect(() => {
    const cached = loadCachedDocuments();
    if (cached.length > 0) {
      setDocuments(cached);
      setActiveDocIds(cached.map((d) => d.id));
      setSelectedDocId(cached[0].id);
    }
  }, []);

  // Update active search when query or documents change
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
    } else {
      const activeDocs = documents.filter((d) => activeDocIds.includes(d.id));
      const matches = searchDocuments(activeDocs.length > 0 ? activeDocs : documents, searchQuery);
      setSearchResults(matches);
    }
  }, [searchQuery, documents, activeDocIds]);

  /**
   * Upload and process multiple files (PDF, DOCX, TXT)
   */
  const handleUploadFiles = async (
    files: FileList | File[],
    onSuccess?: (msg: string) => void,
    onError?: (err: string) => void
  ) => {
    if (!files || files.length === 0) return;

    setIsUploadingDoc(true);
    setUploadError(null);

    const newProcessed: ProcessedDocument[] = [];
    let errorMsgs: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      if (!["pdf", "docx", "doc", "txt"].includes(ext)) {
        errorMsgs.push(`Unsupported file type: ${file.name}. Only PDF, DOCX, and TXT are supported.`);
        continue;
      }

      try {
        const processed = await processDocumentFile(file);
        newProcessed.push(processed);
      } catch (err: any) {
        console.error(`Failed to process document ${file.name}:`, err);
        errorMsgs.push(`Failed to parse ${file.name}: ${err.message || "Unknown error"}`);
      }
    }

    if (newProcessed.length > 0) {
      setDocuments((prev) => {
        // Replace existing by ID or prepend
        const existingIds = new Set(newProcessed.map((d) => d.id));
        const filteredPrev = prev.filter((d) => !existingIds.has(d.id));
        const updated = [...newProcessed, ...filteredPrev];
        return updated;
      });

      // Enable new documents in active selection
      setActiveDocIds((prev) => Array.from(new Set([...prev, ...newProcessed.map((d) => d.id)])));
      setSelectedDocId(newProcessed[0].id);
      setViewPageNumber(1);

      if (onSuccess) {
        onSuccess(`Successfully processed ${newProcessed.length} document(s).`);
      }
    }

    if (errorMsgs.length > 0) {
      const combined = errorMsgs.join("\n");
      setUploadError(combined);
      if (onError) onError(combined);
    }

    setIsUploadingDoc(false);
  };

  /**
   * Toggle active selection for a document
   */
  const toggleDocActive = (docId: string) => {
    setActiveDocIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  };

  /**
   * Select all or deselect all
   */
  const selectAllDocs = () => {
    setActiveDocIds(documents.map((d) => d.id));
  };

  const deselectAllDocs = () => {
    setActiveDocIds([]);
  };

  /**
   * Delete document
   */
  const handleDeleteDoc = (docId: string) => {
    const updated = removeDocumentFromCache(docId);
    setDocuments(updated);
    setActiveDocIds((prev) => prev.filter((id) => id !== docId));
    if (selectedDocId === docId) {
      setSelectedDocId(updated.length > 0 ? updated[0].id : null);
      setViewPageNumber(1);
    }
  };

  /**
   * Rename document
   */
  const handleRenameDoc = (docId: string, newName: string) => {
    if (!newName.trim()) return;
    const updated = renameDocumentInCache(docId, newName.trim());
    setDocuments(updated);
  };

  /**
   * Jump to page & document for citations
   */
  const jumpToCitation = (docName: string, pageNumber: number, snippet?: string) => {
    const doc = documents.find(
      (d) => d.name.toLowerCase().includes(docName.toLowerCase()) || docName.toLowerCase().includes(d.name.toLowerCase())
    ) || documents.find((d) => activeDocIds.includes(d.id)) || documents[0];

    if (doc) {
      setSelectedDocId(doc.id);
      setViewPageNumber(Math.max(1, Math.min(doc.totalPages, pageNumber)));
      if (snippet) setHighlightTerm(snippet.slice(0, 30));
    }
  };

  /**
   * Execute NotebookLM Studio Tool (Summary, Notes, Flashcards, Quiz, MindMap, Explain)
   */
  const executeStudioTool = async (
    tool: StudioToolType,
    customInstruction?: string
  ) => {
    const activeDocs = documents.filter((d) => activeDocIds.includes(d.id));
    if (activeDocs.length === 0) {
      setUploadError("Please upload or select at least one document first.");
      return;
    }

    setActiveStudioTool(tool);
    setIsGeneratingStudio(true);
    setStudioOutputText(null);
    setStudioFlashcards([]);
    setStudioQuiz([]);
    setStudioMindMap(null);

    const docContext = buildDocumentContextPrompt(activeDocs);

    const toolPrompts: Record<StudioToolType, string> = {
      summary: `Provide an Executive Summary & Key Takeaways from the uploaded document(s). Group by major topics with page citations [DocName, p. X].`,
      explain: `Explain the core concepts, theories, and complex mechanisms in the uploaded document(s) in clean, student-friendly terms with analogies and page citations. ${customInstruction || ""}`,
      notes: `Generate comprehensive Study Notes in beautifully formatted Markdown. Include:
# Title & Overview
## Key Concepts & Definitions
## Formulas & Equations (in LaTeX $...$)
## Chapter-by-Chapter Breakdown with [DocName, p. X] page citations
## Exam High-Yield Summary Box`,
      flashcards: `Generate 6-10 High-Yield Flashcards based strictly on the uploaded document(s).
Format your response STRICTLY as a JSON array inside a \`\`\`json markdown block:
\`\`\`json
[
  { "question": "...", "answer": "...", "page": 1 }
]
\`\`\``,
      quiz: `Generate 5 Multiple-Choice Practice Quiz questions with detailed explanations based on the uploaded document(s).
Format your response STRICTLY as a JSON array inside a \`\`\`json markdown block:
\`\`\`json
[
  {
    "question": "...",
    "options": ["A", "B", "C", "D"],
    "correctAnswerIndex": 0,
    "explanation": "..."
  }
]
\`\`\``,
      mindmap: `Generate a hierarchical Concept Mind Map based on the document topics.
Format your response STRICTLY as a JSON object inside a \`\`\`json markdown block:
\`\`\`json
{
  "id": "root",
  "label": "Document Topic Title",
  "details": "Core theme description",
  "children": [
    {
      "id": "node-1",
      "label": "Section 1 Title",
      "details": "Summary of section 1",
      "children": [
        { "id": "node-1-1", "label": "Subtopic A", "details": "Key concept" }
      ]
    }
  ]
}
\`\`\``
    };

    try {
      let token = localStorage.getItem("studymate_token") || "";
      let email = localStorage.getItem("studymate_logged_in_email") || `guest-${Date.now()}@studymate.app`;

      if (!token) {
        try {
          const guestRes = await fetch("/api/auth/guest-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email })
          });
          if (guestRes.ok) {
            const guestData = await guestRes.json();
            token = guestData.token;
            localStorage.setItem("studymate_token", token);
          }
        } catch (e) {}
      }

      const promptText = `${docContext}\n\n[NotebookLM Studio Task Directive: ${tool.toUpperCase()}]\n${toolPrompts[tool]}`;

      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          message: promptText,
          provider: localStorage.getItem("studymate_ai_provider") || "auto",
          timeoutMs: 35000
        })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Server error: ${response.status}`);
      }

      const resData = await response.json();
      const rawOutput = resData.response || "No output generated.";

      setStudioOutputText(rawOutput);

      // Parse JSON structured blocks if present
      const jsonMatch = rawOutput.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        try {
          const parsed = JSON.parse(jsonMatch[1]);
          if (tool === "flashcards" && Array.isArray(parsed)) {
            setStudioFlashcards(parsed);
          } else if (tool === "quiz" && Array.isArray(parsed)) {
            setStudioQuiz(parsed);
          } else if (tool === "mindmap" && parsed && parsed.label) {
            setStudioMindMap(parsed);
          }
        } catch (e) {
          console.warn("[NotebookLM] Could not parse embedded studio JSON:", e);
        }
      } else if (tool === "mindmap") {
        // Fallback root mindmap node
        setStudioMindMap({
          id: "root-fallback",
          label: activeDocs[0]?.name || "Document Mind Map",
          details: rawOutput.slice(0, 100),
          children: [
            { id: "node-1", label: "Key Concepts", details: rawOutput.slice(100, 250) },
            { id: "node-2", label: "Important Notes", details: rawOutput.slice(250, 400) }
          ]
        });
      }
    } catch (err: any) {
      console.error("[NotebookLM] Studio tool error:", err);
      setStudioOutputText(`Error generating ${tool}: ${err.message || err}`);
    } finally {
      setIsGeneratingStudio(false);
    }
  };

  const selectedDocument = documents.find((d) => d.id === selectedDocId) || documents[0] || null;

  return {
    documents,
    activeDocIds,
    selectedDocId,
    selectedDocument,
    setSelectedDocId,
    viewPageNumber,
    setViewPageNumber,
    highlightTerm,
    setHighlightTerm,
    searchQuery,
    setSearchQuery,
    searchResults,
    isUploadingDoc,
    uploadError,
    setUploadError,
    docInputRef,
    handleUploadFiles,
    toggleDocActive,
    selectAllDocs,
    deselectAllDocs,
    handleDeleteDoc,
    handleRenameDoc,
    jumpToCitation,
    activeStudioTool,
    setActiveStudioTool,
    isGeneratingStudio,
    studioOutputText,
    studioFlashcards,
    studioQuiz,
    studioMindMap,
    executeStudioTool
  };
}
