import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Users,
  UserPlus,
  Share2,
  Copy,
  Check,
  ShieldCheck,
  BookOpen,
  FileText,
  HelpCircle,
  Sparkles,
  MessageSquare
} from "lucide-react";
import { CollaborativeMember } from "./types";

interface CollaborativeWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeWorkspaceName?: string;
}

export function CollaborativeWorkspaceModal({
  isOpen,
  onClose,
  activeWorkspaceName = "Physics - Class 12"
}: CollaborativeWorkspaceModalProps) {
  const [copied, setCopied] = useState(false);
  const [inviteCode] = useState("STUDYMATE-SYNC-8829");
  const [members] = useState<CollaborativeMember[]>([
    { id: "u1", name: "You (Host)", avatar: "👨‍🎓", role: "Host", isOnline: true },
    { id: "u2", name: "Ananya Sharma", avatar: "👩‍🔬", role: "Collaborator", isOnline: true },
    { id: "u3", name: "Rahul Verma", avatar: "👨‍💻", role: "Collaborator", isOnline: true },
    { id: "u4", name: "Siddharth Kumar", avatar: "👨‍🏫", role: "Viewer", isOnline: false }
  ]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`https://studymate.ai/join?code=${inviteCode}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl text-slate-800 dark:text-slate-100"
        >
          {/* Header */}
          <div className="p-5 bg-gradient-to-r from-teal-600 via-cyan-600 to-indigo-600 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-2xl">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight">Collaborative Study Room</h3>
                <p className="text-xs text-teal-100 font-medium">Shared PDFs, whiteboard, group quizzes & AI moderation</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 space-y-5">
            {/* Invite Banner */}
            <div className="p-4 rounded-2xl bg-teal-50/80 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-teal-800 dark:text-teal-200 uppercase tracking-wider">
                  Invite Classmates to {activeWorkspaceName}
                </span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-teal-500 text-white">LIVE SYNC</span>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  readOnly
                  value={`https://studymate.ai/join?code=${inviteCode}`}
                  className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-teal-200 dark:border-teal-800 rounded-xl text-xs font-mono font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
                />
                <button
                  onClick={handleCopyLink}
                  className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1 cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </div>

            {/* Active Members */}
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
                Room Members ({members.filter((m) => m.isOnline).length} Online)
              </h4>

              <div className="space-y-2">
                {members.map((m) => (
                  <div
                    key={m.id}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-xl">{m.avatar}</span>
                      <div>
                        <h5 className="text-xs font-extrabold flex items-center space-x-1.5">
                          <span>{m.name}</span>
                          {m.isOnline && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
                        </h5>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">{m.role}</span>
                      </div>
                    </div>

                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${
                      m.isOnline ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" : "bg-slate-200 dark:bg-slate-700 text-slate-400"
                    }`}>
                      {m.isOnline ? "Active Now" : "Offline"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Moderation Badge */}
            <div className="p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60 flex items-center space-x-2 text-xs text-indigo-900 dark:text-indigo-200">
              <ShieldCheck className="w-5 h-5 text-indigo-500 shrink-0" />
              <div>
                <span className="font-extrabold block">AI Study Moderator Active</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Auto-verifies group quiz answers, resolves doubts, and keeps group discussions focused.
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
