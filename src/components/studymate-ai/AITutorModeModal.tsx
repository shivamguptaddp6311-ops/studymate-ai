import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Brain, Sparkles, BookOpen, Layers, CheckCircle2, Award, ChevronRight, Play, RefreshCw, MessageSquare } from "lucide-react";
import { TutorLevel } from "./types";

interface AITutorModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSubject?: string;
  activeChapter?: string;
  onStartTutorSession: (subject: string, chapter: string, level: TutorLevel, goalPrompt: string) => void;
}

export function AITutorModeModal({
  isOpen,
  onClose,
  activeSubject = "Physics",
  activeChapter = "Electrostatics",
  onStartTutorSession
}: AITutorModeModalProps) {
  const [subject, setSubject] = useState(activeSubject);
  const [chapter, setChapter] = useState(activeChapter);
  const [level, setLevel] = useState<TutorLevel>("Intermediate");
  const [focusGoal, setFocusGoal] = useState("Understand core concepts & solve numericals step by step");

  if (!isOpen) return null;

  const handleStart = () => {
    const prompt = `[AI TUTOR MODE ACTIVATED]
Subject: ${subject}
Chapter: ${chapter}
Student Level: ${level}
Focus Goal: ${focusGoal}

Please act as my personal AI Tutor.
1. Teach this chapter step by step starting with foundational principles.
2. Adapt your explanation to my ${level} level.
3. After every short explanation, ask me a follow-up check question or micro-quiz to verify my understanding before moving to the next concept.
4. If I make a mistake, explain why gently and provide an intuitive example.`;

    onStartTutorSession(subject, chapter, level, prompt);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="p-5 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-2xl">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight">AI Tutor Mode</h3>
                <p className="text-xs text-indigo-100 font-medium">Personalized step-by-step interactive learning</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Form */}
          <div className="p-6 space-y-5 text-slate-800 dark:text-slate-100">
            {/* Subject & Chapter Inputs */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Chapter</label>
                <input
                  type="text"
                  value={chapter}
                  onChange={(e) => setChapter(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Level Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">Student Difficulty Level</label>
              <div className="grid grid-cols-3 gap-2">
                {(["Beginner", "Intermediate", "Advanced"] as TutorLevel[]).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setLevel(lvl)}
                    className={`p-3 rounded-2xl border text-xs font-extrabold flex flex-col items-center justify-center space-y-1 transition cursor-pointer ${
                      level === lvl
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-md scale-[1.02]"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    <span>{lvl === "Beginner" ? "🌱" : lvl === "Intermediate" ? "⚡" : "🚀"}</span>
                    <span>{lvl}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Learning Goal */}
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Learning Target / Goal</label>
              <input
                type="text"
                value={focusGoal}
                onChange={(e) => setFocusGoal(e.target.value)}
                placeholder="e.g. Master Gauss theorem derivations & 5 numerical problems"
                className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Tutor Mode Highlights */}
            <div className="p-3.5 bg-indigo-50/80 dark:bg-indigo-950/40 rounded-2xl border border-indigo-200/60 dark:border-indigo-800/60 text-xs space-y-1.5 text-indigo-900 dark:text-indigo-200">
              <div className="flex items-center space-x-1.5 font-bold text-indigo-700 dark:text-indigo-300">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                <span>How Tutor Mode Works:</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-600 dark:text-slate-300">
                <li>Breaks complex topics into digestible 3-minute steps</li>
                <li>Presents interactive check-in quizzes after each section</li>
                <li>Tracks repeated mistakes into your Mistake Notebook</li>
              </ul>
            </div>

            {/* Start Button */}
            <button
              onClick={handleStart}
              className="w-full py-3.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:opacity-95 text-white font-extrabold text-sm rounded-2xl shadow-lg transition duration-200 flex items-center justify-center space-x-2 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Launch AI Tutor Session</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
