import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Flame, Clock, Award, AlertTriangle, TrendingUp, Bell, CheckCircle2, BookOpen, Target, Sparkles } from "lucide-react";
import { WeakTopic } from "./types";

interface ProgressDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSubject?: string;
  onOpenWeakTopics?: () => void;
  onOpenStudyPlanner?: () => void;
}

export function ProgressDashboardModal({
  isOpen,
  onClose,
  activeSubject = "Physics",
  onOpenWeakTopics,
  onOpenStudyPlanner
}: ProgressDashboardModalProps) {
  if (!isOpen) return null;

  const weakTopics: WeakTopic[] = [
    {
      id: "wt-1",
      subject: "Physics",
      chapter: "Electrostatics",
      topic: "Gauss Law Flux Derivations",
      mistakeCount: 4,
      accuracy: 62,
      recommendedAction: "Review step-by-step vector integration"
    },
    {
      id: "wt-2",
      subject: "Chemistry",
      chapter: "Organic Chemistry",
      topic: "SN1 vs SN2 Solvents",
      mistakeCount: 3,
      accuracy: 70,
      recommendedAction: "Solve 5 practice MCQs on protic vs aprotic"
    }
  ];

  const smartReminders = [
    { id: "r1", title: "Spaced Repetition Due", text: "Electrostatics Capacitance revision due today", time: "2 hours ago" },
    { id: "r2", title: "Weak Topic Alert", text: "Gauss Law Flux derivation accuracy dropped below 65%", time: "Today" },
    { id: "r3", title: "Exam Target Countdown", text: "Class 12 CBSE Board Sprint in 42 days", time: "Upcoming" }
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl text-slate-800 dark:text-slate-100"
        >
          {/* Header */}
          <div className="p-5 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-2xl">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight">Personalized Learning Dashboard</h3>
                <p className="text-xs text-indigo-100 font-medium">Study streak, accuracy, weak topics & reminders</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 overflow-y-auto space-y-5 flex-1">
            {/* Top Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/30">
                <Flame className="w-5 h-5 text-amber-500 mb-1" />
                <span className="text-xl font-black text-amber-600 dark:text-amber-400">12 Days</span>
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Study Streak</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/30">
                <Clock className="w-5 h-5 text-indigo-500 mb-1" />
                <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">28.5 hrs</span>
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Total Study Time</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/30">
                <Award className="w-5 h-5 text-emerald-500 mb-1" />
                <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">88%</span>
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Quiz Accuracy</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-rose-500/10 to-pink-500/10 border border-rose-500/30">
                <Target className="w-5 h-5 text-rose-500 mb-1" />
                <span className="text-xl font-black text-rose-600 dark:text-rose-400">14 / 18</span>
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Chapters Done</span>
              </div>
            </div>

            {/* Weak Topics Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-rose-500 flex items-center space-x-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Detected Weak Topics</span>
                </h4>
                {onOpenWeakTopics && (
                  <button
                    onClick={onOpenWeakTopics}
                    className="text-[11px] font-bold text-indigo-500 hover:underline cursor-pointer"
                  >
                    Open Notebook →
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {weakTopics.map((wt) => (
                  <div
                    key={wt.id}
                    className="p-3.5 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-900/50 flex items-center justify-between"
                  >
                    <div>
                      <span className="text-[10px] font-black uppercase text-rose-600 dark:text-rose-400">{wt.subject} • {wt.chapter}</span>
                      <h5 className="text-xs font-black">{wt.topic}</h5>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{wt.recommendedAction}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-black text-rose-600 dark:text-rose-400 block">{wt.accuracy}%</span>
                      <span className="text-[9px] text-slate-400 font-bold uppercase">{wt.mistakeCount} mistakes</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Smart Reminders */}
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-indigo-500 mb-2 flex items-center space-x-1.5">
                <Bell className="w-3.5 h-3.5" />
                <span>Smart AI Study Reminders</span>
              </h4>

              <div className="space-y-2">
                {smartReminders.map((r) => (
                  <div
                    key={r.id}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500 shrink-0">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="text-xs font-extrabold">{r.title}</h5>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">{r.text}</p>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 font-bold shrink-0">{r.time}</span>
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
