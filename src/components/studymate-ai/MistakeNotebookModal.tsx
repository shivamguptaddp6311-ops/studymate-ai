import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, BookOpen, AlertCircle, Sparkles, CheckCircle2, RotateCcw, Trash2, Filter } from "lucide-react";
import { MistakeEntry } from "./types";

interface MistakeNotebookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTestMistake: (mistake: MistakeEntry) => void;
}

export function MistakeNotebookModal({
  isOpen,
  onClose,
  onTestMistake
}: MistakeNotebookModalProps) {
  const [mistakes, setMistakes] = useState<MistakeEntry[]>(() => {
    try {
      const saved = localStorage.getItem("studymate_mistake_notebook");
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [
      {
        id: "m-1",
        subject: "Physics",
        chapter: "Electrostatics",
        concept: "Gauss's Law Flux Calculation",
        question: "What is the electric flux through a closed surface containing a net charge of 8.85 µC?",
        wrongAnswer: "1.0 × 10^12 N·m²/C",
        correctAnswer: "1.0 × 10^6 N·m²/C",
        explanation: "Flux Φ = Q / ε₀ = (8.85 × 10⁻⁶) / (8.85 × 10⁻¹²) = 10⁶ N·m²/C. Check micro-coulomb unit conversion!",
        difficulty: "medium",
        savedAt: "Yesterday"
      },
      {
        id: "m-2",
        subject: "Chemistry",
        chapter: "Organic Chemistry",
        concept: "SN1 vs SN2 Solvents",
        question: "Which solvent favors the SN2 reaction mechanism?",
        wrongAnswer: "Polar Protic (Water, Ethanol)",
        correctAnswer: "Polar Aprotic (Acetone, DMSO)",
        explanation: "Polar aprotic solvents solvate the counter-cation without solvating nucleophiles, leaving nucleophiles free for backside attack.",
        difficulty: "easy",
        savedAt: "2 days ago"
      },
      {
        id: "m-3",
        subject: "Mathematics",
        chapter: "Calculus",
        concept: "Integration by Parts Constant",
        question: "Integrate ∫ x e^x dx.",
        wrongAnswer: "x e^x - e^x",
        correctAnswer: "x e^x - e^x + C",
        explanation: "Never forget the constant of integration (+ C) for indefinite integrals!",
        difficulty: "exam-level",
        savedAt: "3 days ago"
      }
    ];
  });

  const [selectedSubject, setSelectedSubject] = useState<string>("All");

  useEffect(() => {
    try {
      localStorage.setItem("studymate_mistake_notebook", JSON.stringify(mistakes));
    } catch {
      // ignore
    }
  }, [mistakes]);

  if (!isOpen) return null;

  const subjects = ["All", ...Array.from(new Set(mistakes.map((m) => m.subject)))];
  const filteredMistakes = selectedSubject === "All" ? mistakes : mistakes.filter((m) => m.subject === selectedSubject);

  const handleDeleteMistake = (id: string) => {
    setMistakes((prev) => prev.filter((m) => m.id !== id));
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="p-5 bg-gradient-to-r from-amber-600 via-rose-600 to-pink-600 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-2xl">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight">Mistake Notebook</h3>
                <p className="text-xs text-amber-100 font-medium">Auto-indexed errors & AI correction strategies</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Filter Bar */}
          <div className="px-5 py-3 bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800 flex items-center space-x-2 overflow-x-auto no-scrollbar shrink-0">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            {subjects.map((subj) => (
              <button
                key={subj}
                type="button"
                onClick={() => setSelectedSubject(subj)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                  selectedSubject === subj
                    ? "bg-amber-500 text-white shadow-xs"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                }`}
              >
                {subj}
              </button>
            ))}
          </div>

          {/* Content List */}
          <div className="p-5 overflow-y-auto space-y-4 flex-1">
            {filteredMistakes.length === 0 ? (
              <div className="py-12 text-center text-slate-400 dark:text-slate-500">
                <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500/50 mb-2" />
                <p className="text-sm font-bold">No mistakes recorded in this category!</p>
                <p className="text-xs">Quizzes and tutor check-ins auto-save wrong answers here.</p>
              </div>
            ) : (
              filteredMistakes.map((mistake) => (
                <div
                  key={mistake.id}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 space-y-2.5 relative group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[10px] font-black uppercase">
                        {mistake.subject}
                      </span>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {mistake.chapter} • <span className="text-indigo-500">{mistake.concept}</span>
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                        {mistake.difficulty}
                      </span>
                      <button
                        onClick={() => handleDeleteMistake(mistake.id)}
                        className="p-1 hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 rounded-lg transition"
                        title="Remove mistake"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{mistake.question}</p>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300">
                      <span className="font-bold block text-[10px] uppercase text-rose-500">Your Answer</span>
                      <span>{mistake.wrongAnswer}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300">
                      <span className="font-bold block text-[10px] uppercase text-emerald-500">Correct Solution</span>
                      <span>{mistake.correctAnswer}</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/50 dark:border-indigo-800/50 text-xs text-indigo-900 dark:text-indigo-200 flex items-start space-x-2">
                    <Sparkles className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                    <span>{mistake.explanation}</span>
                  </div>

                  <div className="pt-1 flex items-center justify-end">
                    <button
                      onClick={() => {
                        onTestMistake(mistake);
                        onClose();
                      }}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Re-test with AI Tutor</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
