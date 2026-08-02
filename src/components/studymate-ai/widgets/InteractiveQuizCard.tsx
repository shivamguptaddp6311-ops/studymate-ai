import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, XCircle, ArrowRight, HelpCircle, Sparkles, Check, X } from "lucide-react";
import { QuizQuestion } from "../types";

interface InteractiveQuizCardProps {
  question: QuizQuestion;
  totalQuestions: number;
  selectedOptionIndex: number | null;
  onSelectOption: (optionIndex: number) => void;
  onNextQuestion: () => void;
  isLastQuestion: boolean;
}

export const InteractiveQuizCard: React.FC<InteractiveQuizCardProps> = ({
  question,
  totalQuestions,
  selectedOptionIndex,
  onSelectOption,
  onNextQuestion,
  isLastQuestion
}) => {
  const isAnswered = selectedOptionIndex !== null;
  const isCorrect = isAnswered && selectedOptionIndex === question.correctOption;

  const optionLabels = ["A", "B", "C", "D"];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.98 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="w-full bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-3xl p-5 md:p-6 shadow-xl relative overflow-hidden"
    >
      {/* Background Accent Highlight */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/10 to-purple-500/5 blur-2xl rounded-full pointer-events-none" />

      {/* Question Badge Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <span className="w-7 h-7 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-extrabold text-xs flex items-center justify-center shadow-xs">
            {question.questionNumber}
          </span>
          <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Question {question.questionNumber} of {totalQuestions}
          </span>
        </div>

        {question.topic && (
          <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-full">
            {question.topic}
          </span>
        )}
      </div>

      {/* Question Text */}
      <h3 className="text-base md:text-lg font-extrabold text-slate-900 dark:text-slate-100 leading-snug mb-5">
        {question.question}
      </h3>

      {/* 4 Clickable Options */}
      <div className="space-y-3 mb-5">
        {question.options.map((optionText, idx) => {
          const isThisSelected = selectedOptionIndex === idx;
          const isThisCorrect = idx === question.correctOption;

          let cardStyle = "bg-slate-50/80 hover:bg-slate-100/80 dark:bg-slate-800/50 dark:hover:bg-slate-800/80 border-slate-200/80 dark:border-slate-700/60 text-slate-700 dark:text-slate-200";
          let labelStyle = "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200";

          if (isAnswered) {
            if (isThisCorrect) {
              cardStyle = "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-900 dark:text-emerald-200 shadow-sm ring-1 ring-emerald-500/50";
              labelStyle = "bg-emerald-500 text-white";
            } else if (isThisSelected) {
              cardStyle = "bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-900 dark:text-rose-200 shadow-sm ring-1 ring-rose-500/50";
              labelStyle = "bg-rose-500 text-white";
            } else {
              cardStyle = "opacity-50 bg-slate-50 dark:bg-slate-850/30 border-slate-200/40 dark:border-slate-800/40 text-slate-400 dark:text-slate-500";
              labelStyle = "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500";
            }
          }

          return (
            <button
              key={idx}
              type="button"
              disabled={isAnswered}
              onClick={() => onSelectOption(idx)}
              className={`w-full p-3.5 md:p-4 rounded-2xl border text-left transition-all duration-200 flex items-center justify-between group relative overflow-hidden ${
                isAnswered ? "cursor-default" : "cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500 active:scale-[0.99]"
              } ${cardStyle}`}
            >
              <div className="flex items-start space-x-3 pr-2">
                <span className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center shrink-0 mt-0.5 transition-colors ${labelStyle}`}>
                  {optionLabels[idx] || idx + 1}
                </span>
                <span className="text-sm font-semibold leading-relaxed">
                  {optionText}
                </span>
              </div>

              {/* Status Indicator Icon */}
              {isAnswered && (
                <div className="shrink-0 ml-2">
                  {isThisCorrect ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  ) : isThisSelected ? (
                    <XCircle className="w-5 h-5 text-rose-500" />
                  ) : null}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Explanation Box (Animates in after answering) */}
      <AnimatePresence>
        {isAnswered && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: 10 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden mb-5"
          >
            <div className={`p-4 rounded-2xl border ${
              isCorrect 
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-200" 
                : "bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-200"
            }`}>
              <div className="flex items-center space-x-2 mb-1.5">
                {isCorrect ? (
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                ) : (
                  <HelpCircle className="w-4 h-4 text-amber-500" />
                )}
                <span className="text-xs font-extrabold uppercase tracking-wider">
                  {isCorrect ? "Correct Solution!" : "Explanation & Key Concept"}
                </span>
              </div>

              <p className="text-xs leading-relaxed opacity-90 font-medium">
                {question.explanation}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer Navigation Action */}
      {isAnswered && (
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onNextQuestion}
            className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-extrabold transition-all shadow-md hover:shadow-lg flex items-center space-x-2 cursor-pointer active:scale-95"
          >
            <span>{isLastQuestion ? "View Quiz Results" : "Next Question"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </motion.div>
  );
};
