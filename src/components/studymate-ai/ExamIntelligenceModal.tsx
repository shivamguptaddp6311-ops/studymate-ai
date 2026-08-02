import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Award,
  TrendingUp,
  Target,
  Clock,
  Zap,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  Sparkles
} from "lucide-react";

interface ChapterMastery {
  chapter: string;
  masteryPercentage: number;
  questionsAttempted: number;
  accuracy: number;
  status: "Mastered" | "Review Needed" | "Critical Weakness";
}

interface ExamIntelligenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSubject?: string;
}

export function ExamIntelligenceModal({
  isOpen,
  onClose,
  activeSubject = "Physics"
}: ExamIntelligenceModalProps) {
  const readinessScore = 88; // 88% Exam Readiness

  const chapters: ChapterMastery[] = [
    { chapter: "Electric Charges & Fields", masteryPercentage: 94, questionsAttempted: 120, accuracy: 92, status: "Mastered" },
    { chapter: "Electrostatic Potential & Capacitance", masteryPercentage: 86, questionsAttempted: 95, accuracy: 84, status: "Mastered" },
    { chapter: "Current Electricity", masteryPercentage: 78, questionsAttempted: 80, accuracy: 76, status: "Review Needed" },
    { chapter: "Moving Charges & Magnetism", masteryPercentage: 62, questionsAttempted: 45, accuracy: 58, status: "Critical Weakness" },
    { chapter: "Electromagnetic Induction", masteryPercentage: 89, questionsAttempted: 70, accuracy: 88, status: "Mastered" }
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
          <div className="p-4 bg-gradient-to-r from-amber-500 via-orange-600 to-red-600 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-2xl">
                <Award className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-base font-black tracking-tight">Exam Intelligence & Readiness Score</h3>
                <p className="text-xs text-amber-100 font-medium">Predictive analytics, accuracy trends & mastery breakdown</p>
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
            {/* Top Stats Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-slate-850 border border-slate-800 flex flex-col justify-between">
                <span className="text-[10px] font-black uppercase text-slate-400">Predicted Exam Readiness</span>
                <div className="flex items-baseline space-x-2 mt-1">
                  <span className="text-3xl font-black text-amber-400">{readinessScore}%</span>
                  <span className="text-xs font-extrabold text-emerald-400">↑ +5% this week</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full mt-2 overflow-hidden">
                  <div className="bg-gradient-to-r from-amber-400 to-emerald-400 h-full rounded-full" style={{ width: `${readinessScore}%` }} />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-850 border border-slate-800 flex flex-col justify-between">
                <span className="text-[10px] font-black uppercase text-slate-400">Average Solve Speed</span>
                <div className="flex items-baseline space-x-1 mt-1">
                  <span className="text-2xl font-black text-white">1.8</span>
                  <span className="text-xs font-bold text-slate-400">min / question</span>
                </div>
                <span className="text-[10px] text-emerald-400 font-bold mt-2">Optimal CBSE Board speed</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-850 border border-slate-800 flex flex-col justify-between">
                <span className="text-[10px] font-black uppercase text-slate-400">Total Solved Questions</span>
                <div className="flex items-baseline space-x-1 mt-1">
                  <span className="text-2xl font-black text-white">410</span>
                  <span className="text-xs font-bold text-slate-400">questions</span>
                </div>
                <span className="text-[10px] text-indigo-400 font-bold mt-2">86% Overall Accuracy</span>
              </div>
            </div>

            {/* Chapter Mastery Matrix */}
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">
                Chapter Mastery Breakdown ({activeSubject})
              </h4>

              <div className="space-y-2.5">
                {chapters.map((ch, idx) => (
                  <div key={idx} className="p-3.5 rounded-2xl bg-slate-850 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-100">{ch.chapter}</span>
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                          ch.status === "Mastered"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : ch.status === "Review Needed"
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                            : "bg-red-500/10 text-red-400 border-red-500/30"
                        }`}
                      >
                        {ch.status}
                      </span>
                    </div>

                    <div className="flex items-center space-x-3 text-[11px] text-slate-400 font-medium">
                      <div className="flex-1 bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            ch.masteryPercentage > 85
                              ? "bg-emerald-400"
                              : ch.masteryPercentage > 70
                              ? "bg-amber-400"
                              : "bg-red-400"
                          }`}
                          style={{ width: `${ch.masteryPercentage}%` }}
                        />
                      </div>
                      <span className="font-mono text-white font-black w-10 text-right">{ch.masteryPercentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
