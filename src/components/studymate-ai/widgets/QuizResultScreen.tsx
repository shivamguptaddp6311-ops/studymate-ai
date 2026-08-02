import React from "react";
import { motion } from "motion/react";
import { Trophy, RotateCcw, AlertTriangle, Sparkles, CheckCircle, RefreshCw, BookmarkPlus, ArrowRight, Target } from "lucide-react";
import { QuizQuestion, QuizData } from "../types";

interface QuizResultScreenProps {
  quizData: QuizData;
  userAnswers: (number | null)[];
  onRetryQuiz: () => void;
  onReviewIncorrect: () => void;
  onRegenerateQuiz: () => void;
  onSaveToWorkspace?: () => void;
}

export const QuizResultScreen: React.FC<QuizResultScreenProps> = ({
  quizData,
  userAnswers,
  onRetryQuiz,
  onReviewIncorrect,
  onRegenerateQuiz,
  onSaveToWorkspace
}) => {
  const totalQuestions = quizData.questions.length;
  let correctCount = 0;
  const incorrectQuestions: QuizQuestion[] = [];
  const weakTopicSet = new Set<string>();

  quizData.questions.forEach((q, idx) => {
    if (userAnswers[idx] === q.correctOption) {
      correctCount++;
    } else {
      incorrectQuestions.push(q);
      if (q.topic) weakTopicSet.add(q.topic);
    }
  });

  const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  const weakTopics = Array.from(weakTopicSet);

  const getScoreGrade = (pct: number) => {
    if (pct >= 90) return { label: "Mastery Level", color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/30" };
    if (pct >= 70) return { label: "Good Understanding", color: "text-indigo-500", bg: "bg-indigo-500/10 border-indigo-500/30" };
    if (pct >= 50) return { label: "Needs Review", color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/30" };
    return { label: "High Focus Required", color: "text-rose-500", bg: "bg-rose-500/10 border-rose-500/30" };
  };

  const gradeInfo = getScoreGrade(percentage);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="w-full bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-3xl p-6 shadow-xl relative overflow-hidden"
    >
      {/* Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-gradient-to-b from-indigo-500/15 via-purple-500/10 to-transparent blur-3xl pointer-events-none rounded-full" />

      {/* Hero Badge Header */}
      <div className="text-center mb-6 relative">
        <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-tr from-amber-400 via-amber-500 to-amber-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/20">
          <Trophy className="w-8 h-8" />
        </div>

        <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">
          Quiz Completed!
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {quizData.title} • {quizData.subject}
        </p>
      </div>

      {/* Main Metric Cards Grid */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-center">
          <span className="text-[10px] font-extrabold uppercase text-slate-400">Total Score</span>
          <p className="text-lg font-black text-slate-800 dark:text-slate-100 mt-0.5">
            {correctCount} / {totalQuestions}
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-center">
          <span className="text-[10px] font-extrabold uppercase text-slate-400">Accuracy</span>
          <p className="text-lg font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
            {percentage}%
          </p>
        </div>

        <div className={`p-3.5 rounded-2xl border text-center ${gradeInfo.bg}`}>
          <span className="text-[10px] font-extrabold uppercase text-slate-400">Status</span>
          <p className={`text-xs font-black mt-1 ${gradeInfo.color}`}>
            {gradeInfo.label}
          </p>
        </div>
      </div>

      {/* Weak Topics & AI Recommendations */}
      {weakTopics.length > 0 && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-500/5 border border-rose-500/20">
          <div className="flex items-center space-x-2 text-rose-600 dark:text-rose-400 mb-2">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-xs font-extrabold uppercase tracking-wider">Identified Weak Topics</span>
          </div>

          <div className="flex flex-wrap gap-1.5 mb-3">
            {weakTopics.map((topic, idx) => (
              <span key={idx} className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20 text-xs font-bold">
                {topic}
              </span>
            ))}
          </div>

          <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-rose-500/10 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            <span className="font-bold text-rose-600 dark:text-rose-400">🤖 AI Recommendation: </span>
            Focus on revising {weakTopics.slice(0, 2).join(" and ")} before attempting the chapter end exam.
          </div>
        </div>
      )}

      {/* Action Buttons Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={onRetryQuiz}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retry Quiz</span>
          </button>

          {incorrectQuestions.length > 0 && (
            <button
              type="button"
              onClick={onReviewIncorrect}
              className="px-3.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/20 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer"
            >
              <Target className="w-3.5 h-3.5 text-amber-500" />
              <span>Review ({incorrectQuestions.length}) Incorrect</span>
            </button>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {onSaveToWorkspace && (
            <button
              type="button"
              onClick={onSaveToWorkspace}
              className="px-3.5 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer"
            >
              <BookmarkPlus className="w-3.5 h-3.5 text-emerald-500" />
              <span>Save to Workspace</span>
            </button>
          )}

          <button
            type="button"
            onClick={onRegenerateQuiz}
            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-extrabold transition flex items-center space-x-1.5 cursor-pointer shadow-md"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Generate Fresh Quiz</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
};
