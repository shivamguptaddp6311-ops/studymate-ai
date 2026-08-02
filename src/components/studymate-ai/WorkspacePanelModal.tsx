import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, Sparkles, MessageSquare, FileText, Bookmark, Lightbulb, 
  ImageIcon, Video, Mic, Plus, History, ArrowRight, Check, Trash2, Folder, Pin, PinOff,
  Zap, HelpCircle, Layers, Globe, ScanText, FileCode, Play, Share2, Download
} from "lucide-react";
import { ChatSession, StudyWorkspace } from "./types";

interface WorkspacePanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions?: ChatSession[];
  activeSessionId?: string;
  onSwitchSession?: (id: string) => void;
  onCreateNewChat?: () => void;
  onOpenImageGenerator?: () => void;
  onOpenVideoGenerator?: () => void;
  onOpenLiveVoiceTutor?: () => void;
  onOpenChatHistory?: () => void;
  onSendPrompt?: (promptText: string) => void;
  documents?: Array<{ id: string; name: string; pageCount?: number }>;
  onSelectDoc?: (docId: string) => void;
  workspaces?: StudyWorkspace[];
  activeWorkspaceId?: string;
  onSelectWorkspace?: (wsId: string) => void;
  onSwitchWorkspace?: (wsId: string) => void;
  onCreateWorkspace?: (name: string, subject: string) => void;
  onTogglePinWorkspace?: (wsId: string) => void;
  onClearWorkspaceMemory?: (wsId: string) => void;
  onOpenPdfStudio?: () => void;
  onOpenImageStudio?: () => void;
  onOpenVoiceTutor?: () => void;
  onTriggerStudyFlow?: (action: "summary" | "notes" | "quiz" | "flashcards") => void;
  onSelectPrompt?: (promptText: string) => void;
  onOpenAITutorMode?: () => void;
  onOpenMistakeNotebook?: () => void;
  onOpenStudyPlanner?: () => void;
  onOpenFocusSession?: () => void;
  onOpenFormulaEngine?: () => void;
  onOpenProgressDashboard?: () => void;
}

export function WorkspacePanelModal({
  isOpen,
  onClose,
  sessions,
  activeSessionId,
  onSwitchSession,
  onCreateNewChat,
  onOpenImageGenerator,
  onOpenVideoGenerator,
  onOpenLiveVoiceTutor,
  onOpenChatHistory,
  onSendPrompt,
  documents = [],
  onSelectDoc,
  workspaces: propWorkspaces,
  activeWorkspaceId,
  onSelectWorkspace,
  onCreateWorkspace,
  onTogglePinWorkspace,
  onClearWorkspaceMemory,
  onOpenAITutorMode,
  onOpenMistakeNotebook,
  onOpenStudyPlanner,
  onOpenFocusSession,
  onOpenFormulaEngine,
  onOpenProgressDashboard
}: WorkspacePanelModalProps) {
  const [activeTab, setActiveTab] = useState<"hub" | "assets" | "tools" | "prompts">("hub");
  const [showNewWsInput, setShowNewWsInput] = useState(false);
  const [newWsName, setNewWsName] = useState("");
  const [newWsSubject, setNewWsSubject] = useState("");

  const DEFAULT_WORKSPACES: StudyWorkspace[] = [
    {
      id: "ws-physics",
      name: "Physics - Class 12",
      subject: "Physics",
      chapter: "Chapter 3: Electrostatics",
      isPinned: true,
      lastActive: "2 hours ago",
      pdfs: [{ id: "pdf-1", name: "Electrostatics_NCERT_Ch3.pdf", pageCount: 24, size: "3.2 MB" }],
      notes: [{ id: "n-1", title: "Coulomb's Law & Gauss Theorem", content: "F = k*q1*q2/r^2. Electric field flux Phi = Q/eps0.", createdAt: "Today" }],
      quizzes: [{ id: "q-1", title: "Electrostatics Practice Quiz 1", questionCount: 10, score: "9/10" }],
      flashcards: [{ id: "fc-1", title: "High-Yield Electrostatics Cards", cardCount: 12 }],
      chats: [{ id: "c-1", title: "Gauss Law Derivation Help", updatedAt: "2h ago" }],
      contextChips: [
        { id: "cc-1", label: "Physics", type: "subject" },
        { id: "cc-2", label: "NCERT Class 12", type: "grade" },
        { id: "cc-3", label: "Electrostatics PDF", type: "pdf" }
      ]
    },
    {
      id: "ws-chemistry",
      name: "Organic Chemistry",
      subject: "Chemistry",
      chapter: "Reaction Mechanisms",
      isPinned: true,
      lastActive: "Yesterday",
      pdfs: [{ id: "pdf-2", name: "SN1_SN2_Mechanisms_Guide.pdf", pageCount: 18, size: "2.1 MB" }],
      notes: [{ id: "n-2", title: "SN1 vs SN2 Comparison Table", content: "SN1 is two-step racemization, SN2 is backside attack inversion.", createdAt: "Yesterday" }],
      quizzes: [{ id: "q-2", title: "Nucleophilic Substitution Quiz", questionCount: 8, score: "7/8" }],
      flashcards: [{ id: "fc-2", title: "Reagents & Catalysts Cards", cardCount: 15 }],
      chats: [{ id: "c-2", title: "SN1 Mechanism Walkthrough", updatedAt: "1d ago" }],
      contextChips: [
        { id: "cc-4", label: "Chemistry", type: "subject" },
        { id: "cc-5", label: "Organic Reactions", type: "chapter" }
      ]
    },
    {
      id: "ws-math",
      name: "Calculus & Integration",
      subject: "Mathematics",
      chapter: "Definite Integrals",
      isPinned: false,
      lastActive: "3 days ago",
      pdfs: [{ id: "pdf-3", name: "Integration_Formulas_Sheet.pdf", pageCount: 12, size: "1.5 MB" }],
      notes: [{ id: "n-3", title: "Integration by Parts Formula", content: "∫ u dv = uv - ∫ v du (ILATE rule)", createdAt: "3 days ago" }],
      quizzes: [{ id: "q-3", title: "Definite Integrals Quick Quiz", questionCount: 5 }],
      flashcards: [{ id: "fc-3", title: "Standard Integrals Flashcards", cardCount: 10 }],
      chats: [{ id: "c-3", title: "Integration by Parts Problem 4", updatedAt: "3d ago" }],
      contextChips: [
        { id: "cc-6", label: "Mathematics", type: "subject" },
        { id: "cc-7", label: "Calculus", type: "chapter" }
      ]
    }
  ];

  const workspaces = propWorkspaces || DEFAULT_WORKSPACES;
  const currentWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0];

  const [savedNotes, setSavedNotes] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("studymate_saved_notes") || "[]");
    } catch {
      return [
        "Coulomb's Law: F = k * (|q1*q2|) / r^2",
        "Photoelectric Effect: E = h * f - phi",
        "DNA Replication: Helicase unzips, DNA Polymerase synthesizes 5' to 3'"
      ];
    }
  });

  const [savedResponses, setSavedResponses] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("studymate_saved_responses") || "[]");
    } catch {
      return [
        "Summary of Newton's Laws of Motion with real-world automobile safety examples.",
        "Step-by-step integration by parts method: ∫ u dv = uv - ∫ v du"
      ];
    }
  });

  const SAVED_PROMPTS = [
    { label: "⚡ 1-Tap Unified Study Flow", prompt: "Execute complete 1-tap study workflow for my active workspace: 1) Summarize key concepts, 2) Create concise exam revision notes, 3) Generate a 5-question practice quiz, 4) Create 6 high-yield flashcards." },
    { label: "📐 Solve Step-by-Step", prompt: "Explain how to solve this step-by-step with formulas, diagrams, and clear explanations." },
    { label: "📝 Generate Practice Quiz", prompt: "Generate a 5-question multiple choice practice quiz with detailed answer explanations." },
    { label: "🃏 Create High-Yield Flashcards", prompt: "Create 6 high-yield Q&A flashcards for exam review on this topic." },
    { label: "🌐 Explain in Simple Terms", prompt: "Explain this complex topic in simple terms with an easy real-world analogy." },
    { label: "🎯 Formulas & Definitions", prompt: "List all key formulas, variables, SI units, and definitions required for an exam." }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2 }}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Panel Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-xl shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-600 text-white rounded-2xl shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base md:text-lg text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>AI Workspace Hub</span>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/20">
                  Ecosystem
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Unified learning workspace: PDFs, Notes, Chats, AI Tools & Automated Study Flows
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 bg-slate-200/80 dark:bg-slate-800/80 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-5 py-2.5 bg-slate-100/70 dark:bg-slate-900/90 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center space-x-2 shrink-0 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab("hub")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center space-x-1.5 shrink-0 ${
              activeTab === "hub"
                ? "bg-purple-600 text-white shadow-md"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Folder className="w-3.5 h-3.5" />
            <span>Workspaces ({workspaces.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("assets")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center space-x-1.5 shrink-0 ${
              activeTab === "assets"
                ? "bg-purple-600 text-white shadow-md"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Study Assets (PDFs, Notes & Quizzes)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("tools")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center space-x-1.5 shrink-0 ${
              activeTab === "tools"
                ? "bg-purple-600 text-white shadow-md"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>AI Multi-Modal Tools</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("prompts")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center space-x-1.5 shrink-0 ${
              activeTab === "prompts"
                ? "bg-purple-600 text-white shadow-md"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5" />
            <span>Saved Prompts & Clips</span>
          </button>
        </div>

        {/* Panel Body Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {activeTab === "hub" && (
            <div className="space-y-6">
              {/* Active Workspace Banner & 1-Tap Automation */}
              <div className="p-4 bg-gradient-to-r from-purple-600/15 via-indigo-600/10 to-pink-600/15 border border-purple-500/30 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-2xs">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-300">Active Workspace Memory</span>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span>{currentWorkspace.name}</span>
                    <span className="text-xs font-semibold text-slate-500">({currentWorkspace.subject})</span>
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Contains {currentWorkspace.pdfs.length} PDFs • {currentWorkspace.notes.length} Notes • {currentWorkspace.quizzes.length} Quizzes • {currentWorkspace.flashcards.length} Flashcards
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                  <button
                    type="button"
                    onClick={() => {
                      onSendPrompt(`Execute complete 1-tap study workflow for active workspace "${currentWorkspace.name}":\n\n1. Summarize core concepts\n2. Create key revision notes\n3. Generate a 5-question practice quiz\n4. Create 6 high-yield flashcards`);
                      onClose();
                    }}
                    className="flex-1 md:flex-none px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black transition cursor-pointer shadow-md flex items-center justify-center space-x-1.5 active:scale-95"
                  >
                    <Zap className="w-4 h-4 text-amber-300" />
                    <span>1-Tap Study Flow</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (onClearWorkspaceMemory) onClearWorkspaceMemory(currentWorkspace.id);
                      alert(`Cleared memory for workspace: ${currentWorkspace.name}`);
                    }}
                    className="p-2 bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/40 text-slate-500 hover:text-rose-600 border border-slate-200 dark:border-slate-700 rounded-xl transition cursor-pointer"
                    title="Clear memory for this workspace"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Workspaces List (Pinned & Recent) */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                    <Folder className="w-3.5 h-3.5 text-purple-500" />
                    <span>Your Study Workspaces</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowNewWsInput(!showNewWsInput)}
                    className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Workspace</span>
                  </button>
                </div>

                {/* Inline New Workspace Form */}
                {showNewWsInput && (
                  <div className="mb-4 p-3 bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-2xl space-y-2 animate-in fade-in duration-150">
                    <span className="text-xs font-black text-purple-700 dark:text-purple-300 block">Create Dedicated Workspace</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Workspace Name (e.g. Biology Unit 4)"
                        value={newWsName}
                        onChange={(e) => setNewWsName(e.target.value)}
                        className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800 rounded-xl text-xs font-semibold focus:outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Subject (e.g. Biology)"
                        value={newWsSubject}
                        onChange={(e) => setNewWsSubject(e.target.value)}
                        className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800 rounded-xl text-xs font-semibold focus:outline-none"
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowNewWsInput(false)}
                        className="px-3 py-1 text-slate-500 hover:text-slate-700 text-xs font-bold cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (newWsName.trim() && onCreateWorkspace) {
                            onCreateWorkspace(newWsName.trim(), newWsSubject.trim() || "General");
                            setNewWsName("");
                            setNewWsSubject("");
                            setShowNewWsInput(false);
                          }
                        }}
                        className="px-3.5 py-1 bg-purple-600 text-white rounded-xl text-xs font-extrabold hover:bg-purple-500 cursor-pointer"
                      >
                        Create Workspace
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {workspaces.map((ws) => {
                    const isActive = ws.id === (activeWorkspaceId || currentWorkspace.id);
                    return (
                      <div
                        key={ws.id}
                        className={`p-3.5 rounded-2xl border text-left transition relative flex flex-col justify-between space-y-3 ${
                          isActive
                            ? "bg-purple-50/90 dark:bg-purple-950/60 border-purple-300 dark:border-purple-700 shadow-xs"
                            : "bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200/70 dark:border-slate-700/60"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-[10px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-wider block">
                              {ws.subject}
                            </span>
                            <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-100 mt-0.5 line-clamp-1">
                              {ws.name}
                            </h4>
                            <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                              Active {ws.lastActive}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => onTogglePinWorkspace && onTogglePinWorkspace(ws.id)}
                            className="text-slate-400 hover:text-amber-500 transition cursor-pointer p-1"
                            title={ws.isPinned ? "Unpin Workspace" : "Pin Workspace"}
                          >
                            {ws.isPinned ? <Pin className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> : <Pin className="w-3.5 h-3.5" />}
                          </button>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                            {ws.pdfs.length} PDFs • {ws.notes.length} Notes
                          </span>

                          <button
                            type="button"
                            onClick={() => {
                              if (onSelectWorkspace) onSelectWorkspace(ws.id);
                              onClose();
                            }}
                            className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase transition cursor-pointer ${
                              isActive
                                ? "bg-purple-600 text-white"
                                : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-purple-600 hover:text-white"
                            }`}
                          >
                            {isActive ? "Active" : "Switch"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recent Chats Section */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Recent Chats ({sessions.length})</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenChatHistory();
                    }}
                    className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>View All</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {sessions.slice(0, 4).map((sess) => {
                    const isActive = sess.id === activeSessionId;
                    return (
                      <button
                        key={sess.id}
                        type="button"
                        onClick={() => {
                          onSwitchSession(sess.id);
                          onClose();
                        }}
                        className={`p-3 rounded-2xl border text-left transition cursor-pointer flex items-center justify-between ${
                          isActive
                            ? "bg-purple-50 dark:bg-purple-950/40 border-purple-300 dark:border-purple-700 shadow-2xs"
                            : "bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200/70 dark:border-slate-700/60"
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <p className="text-xs font-extrabold text-slate-800 dark:text-slate-100 truncate">
                            {sess.title || "Untitled Thread"}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                            {sess.messages?.length || 0} messages • {new Date(sess.updatedAt || sess.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        {isActive && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-purple-600 text-white uppercase shrink-0">
                            Active
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === "assets" && (
            <div className="space-y-6">
              {/* Recent PDFs */}
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2.5 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Workspace PDFs & Documents</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {(documents.length > 0 ? documents : currentWorkspace.pdfs).map((doc) => (
                    <div
                      key={doc.id}
                      className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60 flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                        <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-extrabold text-slate-800 dark:text-slate-100 truncate">
                            {doc.name}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {doc.pageCount ? `${doc.pageCount} pages` : "Document"}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (onSelectDoc) onSelectDoc(doc.id);
                          onClose();
                        }}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-bold transition cursor-pointer shrink-0"
                      >
                        Open
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2.5 flex items-center gap-1.5">
                  <Bookmark className="w-3.5 h-3.5 text-amber-500" />
                  <span>Workspace Notes</span>
                </h3>
                <div className="space-y-2">
                  {currentWorkspace.notes.map((note) => (
                    <div
                      key={note.id}
                      className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 flex items-start justify-between text-xs"
                    >
                      <div>
                        <span className="font-extrabold text-slate-900 dark:text-slate-100 block">{note.title}</span>
                        <p className="text-slate-600 dark:text-slate-300 font-medium mt-0.5">{note.content}</p>
                      </div>
                      <span className="text-[10px] text-slate-400 font-bold shrink-0 ml-2">{note.createdAt}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quizzes & Flashcards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Quizzes</span>
                  </h3>
                  <div className="space-y-2">
                    {currentWorkspace.quizzes.map((q) => (
                      <div key={q.id} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-extrabold text-slate-800 dark:text-slate-200 block">{q.title}</span>
                          <span className="text-[10px] text-slate-400">{q.questionCount} Questions {q.score ? `• Score: ${q.score}` : ""}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            onSendPrompt(`Start taking practice quiz: "${q.title}"`);
                            onClose();
                          }}
                          className="px-2 py-1 bg-indigo-600 text-white text-[10px] font-bold rounded-lg hover:bg-indigo-500 cursor-pointer"
                        >
                          Take Quiz
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-purple-500" />
                    <span>Flashcards</span>
                  </h3>
                  <div className="space-y-2">
                    {currentWorkspace.flashcards.map((fc) => (
                      <div key={fc.id} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-extrabold text-slate-800 dark:text-slate-200 block">{fc.title}</span>
                          <span className="text-[10px] text-slate-400">{fc.cardCount} High-Yield Cards</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            onSendPrompt(`Show flashcards for revision: "${fc.title}"`);
                            onClose();
                          }}
                          className="px-2 py-1 bg-purple-600 text-white text-[10px] font-bold rounded-lg hover:bg-purple-500 cursor-pointer"
                        >
                          Review
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "tools" && (
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                AI Multi-Modal Generators & Intelligent Tutor Systems
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onOpenAITutorMode) onOpenAITutorMode();
                  }}
                  className="p-3.5 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-transparent hover:from-indigo-500/20 hover:to-purple-500/20 border border-indigo-500/30 rounded-2xl flex flex-col items-start space-y-2 text-left transition cursor-pointer group"
                >
                  <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs group-hover:scale-110 transition-transform">
                    <Sparkles className="w-4 h-4 text-amber-300" />
                  </div>
                  <div>
                    <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100 block">AI Tutor Mode</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Adaptive step-by-step teaching</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onOpenMistakeNotebook) onOpenMistakeNotebook();
                  }}
                  className="p-3.5 bg-gradient-to-br from-amber-500/10 via-rose-500/10 to-transparent hover:from-amber-500/20 hover:to-rose-500/20 border border-amber-500/30 rounded-2xl flex flex-col items-start space-y-2 text-left transition cursor-pointer group"
                >
                  <div className="p-2 bg-amber-600 text-white rounded-xl shadow-xs group-hover:scale-110 transition-transform">
                    <Bookmark className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100 block">Mistake Notebook</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Auto-saved error corrections</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onOpenStudyPlanner) onOpenStudyPlanner();
                  }}
                  className="p-3.5 bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-transparent hover:from-emerald-500/20 hover:to-teal-500/20 border border-emerald-500/30 rounded-2xl flex flex-col items-start space-y-2 text-left transition cursor-pointer group"
                >
                  <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs group-hover:scale-110 transition-transform">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100 block">Study Planner</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Adaptive schedule & backlog</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onOpenFocusSession) onOpenFocusSession();
                  }}
                  className="p-3.5 bg-gradient-to-br from-blue-500/10 via-indigo-500/10 to-transparent hover:from-blue-500/20 hover:to-indigo-500/20 border border-blue-500/30 rounded-2xl flex flex-col items-start space-y-2 text-left transition cursor-pointer group"
                >
                  <div className="p-2 bg-blue-600 text-white rounded-xl shadow-xs group-hover:scale-110 transition-transform">
                    <Play className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100 block">Focus Session</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Anti-distraction timed study</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onOpenFormulaEngine) onOpenFormulaEngine();
                  }}
                  className="p-3.5 bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-transparent hover:from-purple-500/20 hover:to-pink-500/20 border border-purple-500/30 rounded-2xl flex flex-col items-start space-y-2 text-left transition cursor-pointer group"
                >
                  <div className="p-2 bg-purple-600 text-white rounded-xl shadow-xs group-hover:scale-110 transition-transform">
                    <FileCode className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100 block">Formula Engine</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Derivations & memory tricks</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onOpenProgressDashboard) onOpenProgressDashboard();
                  }}
                  className="p-3.5 bg-gradient-to-br from-cyan-500/10 via-teal-500/10 to-transparent hover:from-cyan-500/20 hover:to-teal-500/20 border border-cyan-500/30 rounded-2xl flex flex-col items-start space-y-2 text-left transition cursor-pointer group"
                >
                  <div className="p-2 bg-cyan-600 text-white rounded-xl shadow-xs group-hover:scale-110 transition-transform">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100 block">Progress Dashboard</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Streak, accuracy & alerts</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenImageGenerator();
                  }}
                  className="p-3.5 bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-transparent hover:from-purple-500/20 hover:to-pink-500/20 border border-purple-500/30 rounded-2xl flex flex-col items-start space-y-2 text-left transition cursor-pointer group"
                >
                  <div className="p-2 bg-purple-600 text-white rounded-xl shadow-xs group-hover:scale-110 transition-transform">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100 block">AI Image Studio</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Generate visual diagrams</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenVideoGenerator();
                  }}
                  className="p-3.5 bg-gradient-to-br from-pink-500/10 via-rose-500/10 to-transparent hover:from-pink-500/20 hover:to-rose-500/20 border border-pink-500/30 rounded-2xl flex flex-col items-start space-y-2 text-left transition cursor-pointer group"
                >
                  <div className="p-2 bg-pink-600 text-white rounded-xl shadow-xs group-hover:scale-110 transition-transform">
                    <Video className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100 block">Video Explainer</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Render animated lessons</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenLiveVoiceTutor();
                  }}
                  className="p-3.5 bg-gradient-to-br from-teal-500/10 via-cyan-500/10 to-transparent hover:from-teal-500/20 hover:to-cyan-500/20 border border-teal-500/30 rounded-2xl flex flex-col items-start space-y-2 text-left transition cursor-pointer group"
                >
                  <div className="p-2 bg-teal-600 text-white rounded-xl shadow-xs group-hover:scale-110 transition-transform">
                    <Mic className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100 block">Live Voice Tutor</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Real-time oral practice</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onSendPrompt("Perform deep web research with academic source citations on the active topic.");
                    onClose();
                  }}
                  className="p-3.5 bg-gradient-to-br from-indigo-500/10 via-blue-500/10 to-transparent hover:from-indigo-500/20 hover:to-blue-500/20 border border-indigo-500/30 rounded-2xl flex flex-col items-start space-y-2 text-left transition cursor-pointer group"
                >
                  <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs group-hover:scale-110 transition-transform">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100 block">Web Research</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Search with web citations</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onSendPrompt("Scan homework image and extract all mathematical formulas using OCR.");
                    onClose();
                  }}
                  className="p-3.5 bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-transparent hover:from-amber-500/20 hover:to-orange-500/20 border border-amber-500/30 rounded-2xl flex flex-col items-start space-y-2 text-left transition cursor-pointer group"
                >
                  <div className="p-2 bg-amber-600 text-white rounded-xl shadow-xs group-hover:scale-110 transition-transform">
                    <ScanText className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100 block">OCR Homework</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Scan & solve equations</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onSendPrompt("Generate a comprehensive study revision sheet for my upcoming exam.");
                    onClose();
                  }}
                  className="p-3.5 bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-transparent hover:from-emerald-500/20 hover:to-teal-500/20 border border-emerald-500/30 rounded-2xl flex flex-col items-start space-y-2 text-left transition cursor-pointer group"
                >
                  <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs group-hover:scale-110 transition-transform">
                    <FileCode className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100 block">Revision Sheet</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Auto exam study guide</span>
                  </div>
                </button>
              </div>
            </div>
          )}

          {activeTab === "prompts" && (
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
                Saved Study Prompts (Tap to Send)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                {SAVED_PROMPTS.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      onSendPrompt(item.prompt);
                      onClose();
                    }}
                    className="p-3.5 bg-slate-50 dark:bg-slate-800/60 hover:bg-purple-50 dark:hover:bg-purple-950/40 border border-slate-200/70 dark:border-slate-700/60 hover:border-purple-300 dark:hover:border-purple-800 rounded-2xl text-left transition cursor-pointer group space-y-1"
                  >
                    <span className="text-xs font-extrabold text-purple-700 dark:text-purple-300 block group-hover:translate-x-0.5 transition-transform">
                      {item.label}
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug line-clamp-2">
                      "{item.prompt}"
                    </p>
                  </button>
                ))}
              </div>

              {/* Saved Notes Clips */}
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Saved Notes & Response Clips ({savedNotes.length + savedResponses.length})
                </h3>
                <div className="space-y-2">
                  {savedNotes.map((note, idx) => (
                    <div 
                      key={idx}
                      className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 flex items-start justify-between text-xs font-medium text-slate-800 dark:text-slate-200"
                    >
                      <span className="pr-3 leading-relaxed">{note}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = savedNotes.filter((_, i) => i !== idx);
                          setSavedNotes(updated);
                          localStorage.setItem("studymate_saved_notes", JSON.stringify(updated));
                        }}
                        className="text-slate-400 hover:text-rose-500 transition cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default WorkspacePanelModal;

