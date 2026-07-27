import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Trash2, Plus, MessageSquare, Check, X, Clock, AlertTriangle, Edit3 } from "lucide-react";
import { ChatSession } from "./types";

interface ChatHistoryProps {
  showClearConfirm: boolean;
  onCloseClearConfirm: () => void;
  onConfirmClear: () => void;
  showSessionsMenu: boolean;
  onCloseSessionsMenu: () => void;
  sessions: ChatSession[];
  activeSessionId: string;
  onSwitchSession: (id: string) => void;
  onCreateNewSession: () => void;
  onDeleteSession: (id: string) => void;
  onRenameSession: (id: string, newTitle: string) => void;
}

export function ChatHistory({
  showClearConfirm,
  onCloseClearConfirm,
  onConfirmClear,
  showSessionsMenu,
  onCloseSessionsMenu,
  sessions,
  activeSessionId,
  onSwitchSession,
  onCreateNewSession,
  onDeleteSession,
  onRenameSession
}: ChatHistoryProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const handleStartRename = (e: React.MouseEvent, s: ChatSession) => {
    e.stopPropagation();
    setEditingId(s.id);
    setEditTitle(s.title);
  };

  const handleSaveRename = (e: React.FormEvent, id: string) => {
    e.preventDefault();
    if (editTitle.trim()) {
      onRenameSession(id, editTitle.trim());
    }
    setEditingId(null);
  };

  return (
    <>
      {/* Sessions Management Overlay / Drawer */}
      <AnimatePresence>
        {showSessionsMenu && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-white dark:bg-slate-900 border border-white/20 dark:border-slate-800 rounded-3xl p-5 shadow-2xl max-w-md w-full space-y-4 max-h-[85vh] flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">
                      Study Chat Threads ({sessions.length})
                    </h3>
                    <p className="text-[10px] text-slate-400 font-medium">Switch, manage, or start new conversations</p>
                  </div>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={() => {
                      onCreateNewSession();
                      onCloseSessionsMenu();
                    }}
                    className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1 cursor-pointer"
                    title="Create New Chat"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-[11px]">New</span>
                  </button>

                  <button
                    type="button"
                    onClick={onCloseSessionsMenu}
                    className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl transition cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Session List */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {sessions.length === 0 ? (
                  <div className="text-center py-8 space-y-2">
                    <MessageSquare className="w-8 h-8 text-slate-300 mx-auto animate-pulse" />
                    <p className="text-xs font-bold text-slate-400">No active chat sessions</p>
                    <button
                      type="button"
                      onClick={() => {
                        onCreateNewSession();
                        onCloseSessionsMenu();
                      }}
                      className="px-3 py-1.5 bg-indigo-600 text-white font-extrabold text-xs rounded-xl"
                    >
                      Start New Chat
                    </button>
                  </div>
                ) : (
                  sessions.map((s) => {
                    const isActive = s.id === activeSessionId;
                    const isEditing = editingId === s.id;
                    const msgCount = s.messages ? s.messages.length : 0;
                    const timeStr = s.updatedAt ? new Date(s.updatedAt).toLocaleDateString([], { month: "short", day: "numeric" }) : "";

                    return (
                      <div
                        key={s.id}
                        onClick={() => {
                          if (!isEditing) {
                            onSwitchSession(s.id);
                            onCloseSessionsMenu();
                          }
                        }}
                        className={`p-3 rounded-2xl border transition-all duration-200 flex items-center justify-between gap-3 cursor-pointer group ${
                          isActive
                            ? "bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/80 shadow-xs"
                            : "bg-slate-50/50 hover:bg-slate-100 dark:bg-slate-800/30 dark:hover:bg-slate-800/70 border-slate-200/50 dark:border-slate-800"
                        }`}
                      >
                        <div className="flex items-center space-x-3 min-w-0 flex-1">
                          <div className={`p-2 rounded-xl shrink-0 ${
                            isActive ? "bg-indigo-600 text-white" : "bg-slate-200/60 dark:bg-slate-700/60 text-slate-500"
                          }`}>
                            <MessageSquare className="w-4 h-4" />
                          </div>

                          <div className="min-w-0 flex-1">
                            {isEditing ? (
                              <form onSubmit={(e) => handleSaveRename(e, s.id)} className="flex items-center gap-1">
                                <input
                                  type="text"
                                  value={editTitle}
                                  onChange={(e) => setEditTitle(e.target.value)}
                                  className="w-full bg-white dark:bg-slate-900 border border-indigo-400 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none"
                                  autoFocus
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <button
                                  type="submit"
                                  className="p-1 bg-emerald-600 text-white rounded-lg shrink-0"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                              </form>
                            ) : (
                              <>
                                <h4 className={`text-xs font-bold truncate ${
                                  isActive ? "text-indigo-900 dark:text-indigo-200" : "text-slate-800 dark:text-slate-200"
                                }`}>
                                  {s.title || "Study Session"}
                                </h4>
                                <div className="flex items-center space-x-2 text-[10px] text-slate-400 font-medium mt-0.5">
                                  <span>{msgCount} message{msgCount !== 1 ? "s" : ""}</span>
                                  <span>•</span>
                                  <span className="flex items-center gap-0.5">
                                    <Clock className="w-2.5 h-2.5" /> {timeStr}
                                  </span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center space-x-1 shrink-0 opacity-80 group-hover:opacity-100 transition">
                          {!isEditing && (
                            <button
                              type="button"
                              onClick={(e) => handleStartRename(e, s)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg transition"
                              title="Rename Chat Thread"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteSession(s.id);
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition"
                            title="Delete Chat Thread"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Clear/Delete Active Chat Confirmation Modal */}
      <AnimatePresence>
        {showClearConfirm && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-white/20 dark:border-slate-800 rounded-3xl p-6 shadow-2xl max-w-sm w-full text-center space-y-4"
            >
              <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto shadow-inner">
                <Trash2 className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">Delete Chat Thread?</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  This will delete this conversation thread. If deleted, another active chat will open automatically.
                </p>
              </div>
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={onCloseClearConfirm}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-extrabold text-xs rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onConfirmClear}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs rounded-xl shadow-md transition cursor-pointer"
                >
                  Delete Thread
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

export default ChatHistory;
