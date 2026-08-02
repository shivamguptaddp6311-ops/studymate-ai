import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Code2, Sparkles, BookOpen, Copy, Check, Download, Zap, Layers } from "lucide-react";
import { FormulaCard } from "./types";

interface FormulaConceptEngineModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSubject?: string;
  activeChapter?: string;
  onSendFormulaPrompt: (promptText: string) => void;
}

export function FormulaConceptEngineModal({
  isOpen,
  onClose,
  activeSubject = "Physics",
  activeChapter = "Electrostatics",
  onSendFormulaPrompt
}: FormulaConceptEngineModalProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const formulas: FormulaCard[] = [
    {
      id: "f-1",
      subject: activeSubject,
      chapter: activeChapter,
      title: "Coulomb's Law of Electrostatics",
      formula: "F = (1 / (4πε₀)) × (|q₁ q₂| / r²)",
      derivationSummary: "Describes fundamental electrostatic force between two point charges in vacuum. Direction lies along the line joining the centers.",
      memoryTrick: "Remember: Inverse square law (F ∝ 1/r²). Double distance = quarter force!"
    },
    {
      id: "f-2",
      subject: activeSubject,
      chapter: activeChapter,
      title: "Gauss's Law Electric Flux",
      formula: "Φ_E = ∮ E · dA = Q_enclosed / ε₀",
      derivationSummary: "Total electric flux through any closed Gaussian surface equals net charge enclosed divided by vacuum permittivity.",
      memoryTrick: "Phi = Q / eps0. Shape of Gaussian surface doesn't change total flux!"
    },
    {
      id: "f-3",
      subject: activeSubject,
      chapter: activeChapter,
      title: "Capacitance of Parallel Plate Capacitor",
      formula: "C = (K ε₀ A) / d",
      derivationSummary: "Capacitance increases with plate area (A) and dielectric constant (K), decreases with plate separation (d).",
      memoryTrick: "C = K A / d (KAD formula)."
    }
  ];

  if (!isOpen) return null;

  const handleCopyFormula = (id: string, formula: string) => {
    navigator.clipboard.writeText(formula);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

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
          <div className="p-5 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-2xl">
                <Code2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight">Formula & Concept Engine</h3>
                <p className="text-xs text-indigo-100 font-medium">Derivations, memory tricks & instant formula sheets</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Formula Cards */}
          <div className="p-5 overflow-y-auto space-y-4 flex-1">
            {formulas.map((f) => (
              <div
                key={f.id}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase text-indigo-500">{f.subject} • {f.chapter}</span>
                    <h4 className="text-sm font-extrabold">{f.title}</h4>
                  </div>

                  <button
                    onClick={() => handleCopyFormula(f.id, f.formula)}
                    className="p-1.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-bold transition flex items-center space-x-1"
                  >
                    {copiedId === f.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Main Formula Highlight Box */}
                <div className="p-3 bg-slate-900 text-emerald-400 font-mono text-sm font-bold rounded-xl border border-slate-800 overflow-x-auto">
                  {f.formula}
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{f.derivationSummary}</p>

                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-900 dark:text-amber-200 flex items-center space-x-2 font-medium">
                  <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>{f.memoryTrick}</span>
                </div>
              </div>
            ))}

            {/* AI Generator Button */}
            <button
              onClick={() => {
                const prompt = `[FORMULA & CONCEPT ENGINE]
Subject: ${activeSubject}
Chapter: ${activeChapter}

Please generate a high-yield Formula & Concept Sheet for this chapter including:
1. All fundamental equations & SI units
2. Key step-by-step derivations
3. High-yield memory tricks & common exam pitfalls`;
                onSendFormulaPrompt(prompt);
                onClose();
              }}
              className="w-full py-3.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:opacity-95 text-white font-extrabold text-sm rounded-2xl shadow-lg transition flex items-center justify-center space-x-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Generate Full AI Formula Sheet in Chat</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
