import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  HelpCircle,
  MessageSquare,
  CheckCircle2,
  ChevronRight,
  BookOpen,
  Send,
  Zap
} from "lucide-react";

interface ProblemStep {
  stepNumber: number;
  title: string;
  expression: string;
  explanation: string;
  keyRule: string;
}

interface LiveProblemSolverModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSubject?: string;
  activeChapter?: string;
  onSendSolverPrompt?: (promptText: string) => void;
}

export function LiveProblemSolverModal({
  isOpen,
  onClose,
  activeSubject = "Physics",
  activeChapter = "Electrostatics",
  onSendSolverPrompt
}: LiveProblemSolverModalProps) {
  const [problemText, setProblemText] = useState(
    "A point charge of 5 µC is placed at a distance of 10 cm from another charge of 10 µC in vacuum. Calculate the electrostatic force between them."
  );
  const [isSolving, setIsSolving] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [questionInput, setQuestionInput] = useState("");
  const [qaLog, setQaLog] = useState<{ question: string; answer: string }[]>([]);

  const sampleSteps: ProblemStep[] = [
    {
      stepNumber: 1,
      title: "Step 1: Convert units to SI standards",
      expression: "q₁ = 5 × 10⁻⁶ C, q₂ = 10 × 10⁻⁶ C, r = 0.1 m",
      explanation: "Convert micro-coulombs (µC) to Coulombs (C) and centimeters (cm) to meters (m).",
      keyRule: "SI Units: 1 µC = 10⁻⁶ C"
    },
    {
      stepNumber: 2,
      title: "Step 2: Apply Coulomb's Law formula",
      expression: "F = (1 / (4πε₀)) × (|q₁ q₂| / r²)",
      explanation: "Substitute constant k = 9 × 10⁹ N·m²/C² into the electrostatic force equation.",
      keyRule: "Electrostatic Constant k = 9 × 10⁹"
    },
    {
      stepNumber: 3,
      title: "Step 3: Perform numerical calculation",
      expression: "F = (9 × 10⁹) × (5 × 10⁻⁶ × 10 × 10⁻⁶) / (0.1)²",
      explanation: "F = (9 × 10⁹ × 50 × 10⁻¹²) / 0.01 = 450 × 10⁻³ / 0.01 = 45 N",
      keyRule: "Final Answer: F = 45 N (Repulsive)"
    }
  ];

  if (!isOpen) return null;

  const handleStartSolving = () => {
    setIsSolving(true);
    setIsPaused(false);
    setCurrentStepIndex(0);
  };

  const handlePause = () => {
    setIsPaused(!isPaused);
  };

  const handleAskMidSolutionQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionInput.trim()) return;

    const q = questionInput.trim();
    const mockAns = `AI Tutor Clarification for Step ${currentStepIndex + 1}:
Great question! We multiplied by 10⁻⁶ because the charge was given in micro-coulombs (µC). In SI units, 1 µC is strictly equal to 10⁻⁶ C.`;

    setQaLog((prev) => [...prev, { question: q, answer: mockAns }]);
    setQuestionInput("");
  };

  const handleNextStep = () => {
    if (currentStepIndex < sampleSteps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl text-slate-800 dark:text-slate-100"
        >
          {/* Header */}
          <div className="p-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-2xl">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight">Live Step-by-Step Problem Solver</h3>
                <p className="text-xs text-blue-100 font-medium">Pause mid-solution to ask instant AI questions</p>
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
            {/* Input Problem Statement */}
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                Problem / Numerical Question
              </label>
              <textarea
                value={problemText}
                onChange={(e) => setProblemText(e.target.value)}
                rows={2}
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Controls Bar */}
            <div className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700">
              <button
                onClick={handleStartSolving}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-95 text-white text-xs font-extrabold rounded-xl shadow-md transition flex items-center space-x-1.5 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Start Live AI Solving</span>
              </button>

              {isSolving && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handlePause}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1 cursor-pointer ${
                      isPaused ? "bg-amber-500 text-slate-950" : "bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                    }`}
                  >
                    <Pause className="w-3.5 h-3.5" />
                    <span>{isPaused ? "Paused (Ask Qs)" : "Pause AI"}</span>
                  </button>

                  <button
                    onClick={handleNextStep}
                    disabled={currentStepIndex >= sampleSteps.length - 1}
                    className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1 cursor-pointer disabled:opacity-50"
                  >
                    <span>Next Step</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Active Live Steps Display */}
            {isSolving && currentStepIndex >= 0 && (
              <div className="space-y-3">
                {sampleSteps.slice(0, currentStepIndex + 1).map((st) => (
                  <motion.div
                    key={st.stepNumber}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 space-y-2"
                  >
                    <h4 className="text-xs font-black text-indigo-600 dark:text-indigo-400">{st.title}</h4>
                    <div className="p-2.5 bg-slate-900 text-emerald-400 font-mono text-xs font-bold rounded-xl overflow-x-auto">
                      {st.expression}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300">{st.explanation}</p>
                    <div className="inline-block px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold">
                      {st.keyRule}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Mid-Solution Ask AI Clarification Box */}
            {isSolving && (
              <div className="p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 space-y-3">
                <div className="flex items-center space-x-2 text-indigo-900 dark:text-indigo-200 text-xs font-black">
                  <HelpCircle className="w-4 h-4 text-indigo-500" />
                  <span>Confused by any step? Pause & ask AI Tutor live:</span>
                </div>

                <form onSubmit={handleAskMidSolutionQuestion} className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={questionInput}
                    onChange={(e) => setQuestionInput(e.target.value)}
                    placeholder="e.g. Why did we multiply by 10^-6 in step 1?"
                    className="flex-1 px-3.5 py-2 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1 cursor-pointer"
                  >
                    <Send className="w-3 h-3" />
                    <span>Ask AI</span>
                  </button>
                </form>

                {/* Q&A Log */}
                {qaLog.map((log, idx) => (
                  <div key={idx} className="p-3 bg-white dark:bg-slate-900 rounded-xl text-xs space-y-1 border border-indigo-100 dark:border-indigo-900">
                    <p className="font-bold text-slate-800 dark:text-slate-200">Q: {log.question}</p>
                    <p className="text-indigo-600 dark:text-indigo-300 font-medium">{log.answer}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
