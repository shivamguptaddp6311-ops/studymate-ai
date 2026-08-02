import React, { useState } from "react";
import { UserProfile } from "../types";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  User,
  Crown,
  Layers,
  Plus,
  Pin,
  Archive,
  Trash2,
  Edit2,
  Bookmark,
  MessageSquare,
  FileText,
  BookOpen,
  Sparkles,
  HelpCircle,
  HardDrive,
  Cloud,
  Download,
  Database,
  Lock,
  ShieldCheck,
  Key,
  Smartphone,
  Settings,
  Sliders,
  Share2,
  Cpu,
  Brain,
  Check,
  ChevronRight,
  LogOut,
  RefreshCw,
  Eye,
  ToggleLeft,
  ToggleRight
} from "lucide-react";
import { workspaceMemoryService } from "../services/activityEngine";

interface CommandCenterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  onNavigate: (route: string) => void;
}

export function CommandCenterDrawer({
  isOpen,
  onClose,
  profile,
  onNavigate
}: CommandCenterDrawerProps) {
  // Workspaces State
  const [workspaces, setWorkspaces] = useState([
    { id: "ws_main", name: "Physics & Core Sciences", pinned: true, archived: false },
    { id: "ws_math", name: "Class 12 Mathematics PYQs", pinned: true, archived: false },
    { id: "ws_chem", name: "Organic Chemistry Revision", pinned: false, archived: false }
  ]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState("ws_main");
  const [newWsName, setNewWsName] = useState("");
  const [showAddWs, setShowAddWs] = useState(false);
  const [editingWsId, setEditingWsId] = useState<string | null>(null);
  const [editWsName, setEditWsName] = useState("");

  // Memory Manager State
  const [memoryEnabled, setMemoryEnabled] = useState(true);
  const [showMemoryModal, setShowMemoryModal] = useState(false);
  const [memoryItems, setMemoryItems] = useState([
    "Prefers step-by-step calculus derivations",
    "Targeting CBSE Class 12 Physics Board Exam",
    "Focus area: Electromagnetic Induction & PYQs"
  ]);
  const [newMemoryFact, setNewMemoryFact] = useState("");

  // Storage State
  const [storageUsedMB, setStorageUsedMB] = useState(1240);
  const [cacheCleared, setCacheCleared] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Security State
  const [biometricEnabled, setBiometricEnabled] = useState(true);
  const [exportProtection, setExportProtection] = useState(true);

  // Navigation Helper
  const handleNav = (route: string) => {
    onNavigate(route);
    onClose();
  };

  const handleCreateWorkspace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWsName.trim()) return;
    const created = {
      id: `ws_${Date.now()}`,
      name: newWsName.trim(),
      pinned: false,
      archived: false
    };
    setWorkspaces((prev) => [...prev, created]);
    setActiveWorkspaceId(created.id);
    setNewWsName("");
    setShowAddWs(false);
  };

  const handleTogglePin = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setWorkspaces((prev) =>
      prev.map((w) => (w.id === id ? { ...w, pinned: !w.pinned } : w))
    );
  };

  const handleArchiveWorkspace = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setWorkspaces((prev) =>
      prev.map((w) => (w.id === id ? { ...w, archived: !w.archived } : w))
    );
  };

  const handleDeleteWorkspace = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setWorkspaces((prev) => prev.filter((w) => w.id !== id));
    if (activeWorkspaceId === id) {
      setActiveWorkspaceId("ws_main");
    }
  };

  const handleAddMemoryFact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemoryFact.trim()) return;
    setMemoryItems((prev) => [...prev, newMemoryFact.trim()]);
    setNewMemoryFact("");
  };

  const handleClearMemory = () => {
    setMemoryItems([]);
  };

  const handleSyncNow = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
    }, 1200);
  };

  const handleClearCache = () => {
    setCacheCleared(true);
    setStorageUsedMB(820);
    setTimeout(() => setCacheCleared(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-start">
          {/* Backdrop Click */}
          <div className="absolute inset-0" onClick={onClose} />

          {/* 85% Width Command Center Slide Panel */}
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 350, damping: 28 }}
            className="relative z-10 w-[85%] max-w-sm sm:max-w-md h-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-r border-slate-200/80 dark:border-slate-800 shadow-2xl flex flex-col justify-between overflow-hidden text-slate-900 dark:text-slate-100 select-none"
          >
            {/* PANEL HEADER (User Avatar, Name, Level, Premium Badge) */}
            <div className="p-5 border-b border-slate-200/80 dark:border-slate-800/80 bg-gradient-to-br from-purple-50/50 via-indigo-50/30 to-transparent dark:from-purple-950/20 dark:via-indigo-950/10">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-sky-400 p-0.5 shadow-md flex items-center justify-center text-white font-black text-lg">
                      {profile.fullName?.charAt(0) || "S"}
                    </div>
                    <span className="absolute -bottom-1 -right-1 p-0.5 bg-amber-500 rounded-full text-white text-[8px] font-black shadow-xs">
                      <Crown className="w-2.5 h-2.5" />
                    </span>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                        {profile.fullName || "Studentmate Student"}
                      </h3>
                      <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-200/50">
                        PRO
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                      <span>Level {profile.level || 1}</span>
                      <span>•</span>
                      <span className="text-purple-600 dark:text-purple-400">{profile.xp || 1250} XP</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 transition cursor-pointer"
                  aria-label="Close Command Center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* SCROLLABLE BODY SECTIONS */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-purple-200 dark:scrollbar-thumb-purple-900">
              
              {/* 1. WORKSPACES SECTION */}
              <section className="space-y-2.5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    Workspaces
                  </span>
                  <button
                    onClick={() => setShowAddWs(true)}
                    className="p-1 rounded-lg text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950 text-xs font-bold transition flex items-center gap-0.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> New
                  </button>
                </div>

                {/* Add Workspace Input inline */}
                {showAddWs && (
                  <form onSubmit={handleCreateWorkspace} className="flex gap-2 px-1">
                    <input
                      type="text"
                      placeholder="Workspace name..."
                      className="flex-1 px-3 py-1.5 text-xs font-semibold rounded-xl border border-purple-300 dark:border-purple-800 bg-white dark:bg-slate-800 outline-none"
                      value={newWsName}
                      onChange={(e) => setNewWsName(e.target.value)}
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-purple-600 text-white rounded-xl text-xs font-bold cursor-pointer"
                    >
                      Save
                    </button>
                  </form>
                )}

                <div className="space-y-1">
                  {workspaces
                    .filter((w) => !w.archived)
                    .map((ws) => {
                      const isActive = ws.id === activeWorkspaceId;
                      return (
                        <div
                          key={ws.id}
                          onClick={() => setActiveWorkspaceId(ws.id)}
                          className={`group relative p-2.5 rounded-xl transition flex items-center justify-between cursor-pointer border ${
                            isActive
                              ? "bg-purple-50/80 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800/60 font-bold text-purple-900 dark:text-purple-200"
                              : "bg-slate-50/50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                isActive ? "bg-purple-600" : "bg-slate-300 dark:bg-slate-600"
                              }`}
                            />
                            <span className="text-xs truncate">{ws.name}</span>
                          </div>

                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                            <button
                              onClick={(e) => handleTogglePin(ws.id, e)}
                              className={`p-1 rounded hover:bg-purple-100 dark:hover:bg-purple-900 ${
                                ws.pinned ? "text-purple-600" : "text-slate-400"
                              }`}
                              title="Pin Workspace"
                            >
                              <Pin className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => handleArchiveWorkspace(ws.id, e)}
                              className="p-1 rounded hover:bg-slate-200 text-slate-400"
                              title="Archive Workspace"
                            >
                              <Archive className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => handleDeleteWorkspace(ws.id, e)}
                              className="p-1 rounded hover:bg-rose-100 text-rose-500"
                              title="Delete Workspace"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </section>

              {/* 2. LIBRARY SECTION */}
              <section className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1 flex items-center gap-1.5">
                  <Bookmark className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  Library & Saved Items
                </span>

                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  <button
                    onClick={() => handleNav("ai_chat")}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-purple-50 dark:hover:bg-purple-950/40 border border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-semibold flex items-center gap-2 transition cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-purple-600" />
                    <span>Saved Chats</span>
                  </button>

                  <button
                    onClick={() => handleNav("ai_chat")}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-purple-50 dark:hover:bg-purple-950/40 border border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-semibold flex items-center gap-2 transition cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Saved Notes</span>
                  </button>

                  <button
                    onClick={() => handleNav("ai_chat")}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-purple-50 dark:hover:bg-purple-950/40 border border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-semibold flex items-center gap-2 transition cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                    <span>Saved PDFs</span>
                  </button>

                  <button
                    onClick={() => handleNav("ai_chat")}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-purple-50 dark:hover:bg-purple-950/40 border border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-semibold flex items-center gap-2 transition cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-pink-600" />
                    <span>Flashcards</span>
                  </button>
                </div>
              </section>

              {/* 3. AI CONTROL & MEMORY MANAGER */}
              <section className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1 flex items-center gap-1.5">
                  <Brain className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  AI Control & Memory
                </span>

                <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/20 border border-purple-200/80 dark:border-purple-800/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-purple-600" />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Workspace Memory</span>
                    </div>
                    <button
                      onClick={() => setMemoryEnabled(!memoryEnabled)}
                      className="text-purple-600 cursor-pointer"
                    >
                      {memoryEnabled ? (
                        <ToggleRight className="w-6 h-6 fill-purple-600 text-white" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-slate-400" />
                      )}
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                    Isolated memory per workspace. Remembers weak topics, learning styles, & study history.
                  </p>

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => setShowMemoryModal(true)}
                      className="flex-1 py-1.5 bg-purple-600 text-white font-extrabold text-[11px] rounded-xl transition shadow-xs hover:bg-purple-700 cursor-pointer"
                    >
                      Manage Memory ({memoryItems.length})
                    </button>
                  </div>
                </div>
              </section>

              {/* 4. STORAGE & SYNC */}
              <section className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1 flex items-center gap-1.5">
                  <HardDrive className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  Storage & Sync
                </span>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between font-semibold text-slate-700 dark:text-slate-300">
                    <span>Cloud Storage Used</span>
                    <span className="text-purple-600 font-bold">{(storageUsedMB / 1024).toFixed(2)} GB / 5 GB</span>
                  </div>

                  <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div
                      className="h-full bg-purple-600 rounded-full"
                      style={{ width: `${(storageUsedMB / 5120) * 100}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={handleSyncNow}
                      className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:text-purple-600 cursor-pointer"
                    >
                      <Cloud className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-purple-600" : ""}`} />
                      <span>{isSyncing ? "Syncing..." : "Sync Now"}</span>
                    </button>

                    <button
                      onClick={handleClearCache}
                      className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-rose-500 cursor-pointer"
                    >
                      <Database className="w-3.5 h-3.5" />
                      <span>{cacheCleared ? "Cleared!" : "Clear Cache"}</span>
                    </button>
                  </div>
                </div>
              </section>

              {/* 5. SECURITY & PRIVACY */}
              <section className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  Security & Privacy
                </span>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Biometric Lock</span>
                    <button onClick={() => setBiometricEnabled(!biometricEnabled)} className="cursor-pointer">
                      {biometricEnabled ? (
                        <ToggleRight className="w-5 h-5 fill-purple-600 text-white" />
                      ) : (
                        <ToggleLeft className="w-5 h-5 text-slate-400" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Export Protection</span>
                    <button onClick={() => setExportProtection(!exportProtection)} className="cursor-pointer">
                      {exportProtection ? (
                        <ToggleRight className="w-5 h-5 fill-purple-600 text-white" />
                      ) : (
                        <ToggleLeft className="w-5 h-5 text-slate-400" />
                      )}
                    </button>
                  </div>
                </div>
              </section>

              {/* 6. ACCOUNT & PREFERENCES */}
              <section className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1">
                  Account & System
                </span>

                <button
                  onClick={() => handleNav("profile")}
                  className="w-full p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-between transition cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <User className="w-4 h-4 text-purple-600" />
                    <span>Student Profile</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </button>

                <button
                  onClick={() => handleNav("settings")}
                  className="w-full p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-between transition cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Settings className="w-4 h-4 text-purple-600" />
                    <span>App Settings</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </section>

            </div>

            {/* PANEL FOOTER */}
            <div className="p-4 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-400">Target: {profile.targetExam || "Board Exam"}</span>
              <button
                onClick={() => handleNav("settings")}
                className="text-purple-600 dark:text-purple-400 font-bold hover:underline cursor-pointer"
              >
                Help & Feedback
              </button>
            </div>
          </motion.aside>

          {/* MEMORY MANAGER MODAL POPUP */}
          {showMemoryModal && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[28px] border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-2xl"
              >
                <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-purple-600" />
                    <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">
                      Workspace AI Memory Manager
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowMemoryModal(false)}
                    className="p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed">
                  The AI automatically isolates learned study preferences and weak topics for this workspace.
                </p>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {memoryItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200/60 text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between gap-2"
                    >
                      <span className="truncate">{item}</span>
                      <button
                        onClick={() => setMemoryItems((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-rose-500 hover:bg-rose-100 p-1 rounded cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {memoryItems.length === 0 && (
                    <div className="text-xs text-slate-400 text-center py-4">No facts recorded in memory yet.</div>
                  )}
                </div>

                <form onSubmit={handleAddMemoryFact} className="flex gap-2 pt-2">
                  <input
                    type="text"
                    placeholder="Add custom study fact..."
                    value={newMemoryFact}
                    onChange={(e) => setNewMemoryFact(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs font-semibold border rounded-xl dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 outline-none"
                  />
                  <button
                    type="submit"
                    className="px-3 py-2 bg-purple-600 text-white text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Add
                  </button>
                </form>

                <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={handleClearMemory}
                    className="text-xs font-bold text-rose-500 hover:underline cursor-pointer"
                  >
                    Clear All Memory
                  </button>
                  <button
                    onClick={() => setShowMemoryModal(false)}
                    className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </motion.div>
            </div>
          )}

        </div>
      )}
    </AnimatePresence>
  );
}
