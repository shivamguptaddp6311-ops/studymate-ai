import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  RotateCcw,
  Calendar,
  Sparkles,
  Zap,
  CheckCircle2,
  Clock,
  BookOpen,
  ArrowRight
} from "lucide-react";

interface RevisionItem {
  id: string;
  topic: string;
  subject: string;
  intervalDays: number;
  dueDate: string;
  retentionScore: number;
  type: "Flashcard" | "Formula" | "Weak Topic" | "Full Chapter";
}

interface AdaptiveRevisionEngineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartRevisionSession?: (topic: string) => void;
}

export function AdaptiveRevisionEngineModal({
  isOpen,
  onClose,
  onStartRevisionSession
}: AdaptiveRevisionEngineModalProps) {
  const revisionItems: RevisionItem[] = [
    {
      id: "rev-1",
      topic: "Moving Charges & Lorentz Force Law",
      subject: "Physics",
      intervalDays: 1,
      dueDate: "Today (Due)",
      retentionScore: 58,
      type: "Weak Topic"
    },
    {
      id: "rev-2",
      topic: "Gauss's Law & Spherical Shell Proof",
      subject: "Physics",
      intervalDays: 3,
      dueDate: "Tomorrow",
      retentionScore: 78,
      type: "Formula"
    },
    {
      id: "rev-3",
      topic: "Capacitance Energy Density Formula Derivation",
      subject: "Physics",
      intervalDays: 7,
      dueDate: "In 3 days",
      retentionScore: 88,
      type: "Flashcard"
    },
    {
      id: "rev-4",
      topic: "Electric Dipole in Uniform Electric Field Torque",
      subject: "Physics",
      intervalDays: 14,
      dueDate: "In 6 days",
      retentionScore: 94,
      type: "Full Chapter"
    }
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl text-white"
        >
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-teal-600 via-emerald-600 to-cyan-600 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-2xl">
                <RotateCcw className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-base font-black tracking-tight">Adaptive Spaced Repetition Engine</h3>
                <p className="text-xs text-teal-100 font-medium">Automatic review scheduler based on SuperMemo SM-2 curve</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 flex-1 overflow-y-auto space-y-5">
            {/* Daily Queue Summary */}
            <div className="p-4 rounded-2xl bg-slate-850 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-teal-400 block">Today's Spaced Queue</span>
                <h4 className="text-sm font-extrabold text-white">1 High-Priority Weak Topic Review Due</h4>
              </div>

              <button
                onClick={() => {
                  if (onStartRevisionSession) onStartRevisionSession("Moving Charges & Lorentz Force Law");
                  onClose();
                }}
                className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-slate-950 font-black text-xs rounded-xl transition flex items-center space-x-1.5 cursor-pointer shadow-md"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Start Session</span>
              </button>
            </div>

            {/* Scheduled Revision Queue */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                Scheduled Revision Queue ({revisionItems.length})
              </h4>

              {revisionItems.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl bg-slate-850 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-extrabold text-white">{item.topic}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-teal-300 border border-teal-500/30">
                        {item.type}
                      </span>
                    </div>

                    <div className="flex items-center space-x-3 text-[10px] text-slate-400 font-medium">
                      <span>{item.subject}</span>
                      <span>•</span>
                      <span>Interval: {item.intervalDays} days</span>
                      <span>•</span>
                      <span className="text-amber-400 font-bold">{item.dueDate}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-slate-400 font-bold block">Retention Score</span>
                    <span
                      className={`text-sm font-black ${
                        item.retentionScore > 80
                          ? "text-emerald-400"
                          : item.retentionScore > 65
                          ? "text-amber-400"
                          : "text-red-400"
                      }`}
                    >
                      {item.retentionScore}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
