import React, { useState } from "react";
import { motion } from "motion/react";
import { RotateCw, Bookmark, AlertCircle, Lightbulb, Sparkles, Check } from "lucide-react";
import { FlashcardData } from "../types";

interface FlipFlashcardProps {
  card: FlashcardData;
  cardNumber: number;
  totalCards: number;
  onToggleBookmark: (cardId: string) => void;
  onToggleDifficult: (cardId: string) => void;
}

export const FlipFlashcard: React.FC<FlipFlashcardProps> = ({
  card,
  cardNumber,
  totalCards,
  onToggleBookmark,
  onToggleDifficult
}) => {
  const [isFlipped, setIsFlipped] = useState(false);

  const getDifficultyBadge = (diff?: string) => {
    switch ((diff || "Medium").toLowerCase()) {
      case "easy":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "hard":
        return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
      case "medium":
      default:
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
    }
  };

  return (
    <div className="w-full min-h-[300px] md:min-h-[340px] perspective-1000 relative my-2">
      <motion.div
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
        style={{ transformStyle: "preserve-3d" }}
        onClick={() => setIsFlipped(!isFlipped)}
        className="w-full min-h-[300px] md:min-h-[340px] bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-3xl p-6 shadow-xl cursor-pointer relative select-none flex flex-col justify-between"
      >
        {/* ================= FRONT SIDE ================= */}
        <div
          className={`absolute inset-0 p-6 flex flex-col justify-between rounded-3xl bg-white dark:bg-slate-900 ${
            isFlipped ? "pointer-events-none opacity-0" : "opacity-100"
          }`}
          style={{ backfaceVisibility: "hidden" }}
        >
          {/* Top Header Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                Card {cardNumber} of {totalCards}
              </span>
              {card.concept && (
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 truncate max-w-[150px]">
                  {card.concept}
                </span>
              )}
            </div>

            <div className="flex items-center space-x-1.5" onClick={(e) => e.stopPropagation()}>
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded border ${getDifficultyBadge(card.difficulty)}`}>
                {card.difficulty || "Medium"}
              </span>

              <button
                type="button"
                onClick={() => onToggleDifficult(card.id)}
                className={`p-1.5 rounded-lg border text-xs transition cursor-pointer ${
                  card.isDifficult
                    ? "bg-rose-500 text-white border-rose-600 shadow-xs"
                    : "bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 text-slate-500 hover:text-rose-500 border-slate-200/60 dark:border-slate-700/60"
                }`}
                title={card.isDifficult ? "Marked as Difficult" : "Mark as Difficult"}
              >
                <AlertCircle className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => onToggleBookmark(card.id)}
                className={`p-1.5 rounded-lg border text-xs transition cursor-pointer ${
                  card.isBookmarked
                    ? "bg-amber-500 text-white border-amber-600 shadow-xs"
                    : "bg-slate-100 hover:bg-amber-50 dark:bg-slate-800 text-slate-500 hover:text-amber-500 border-slate-200/60 dark:border-slate-700/60"
                }`}
                title={card.isBookmarked ? "Bookmarked" : "Bookmark Card"}
              >
                <Bookmark className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Center Question / Concept */}
          <div className="my-auto text-center py-6">
            <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest block mb-2">
              QUESTION / CONCEPT
            </span>
            <h3 className="text-base md:text-lg font-extrabold text-slate-900 dark:text-slate-100 leading-relaxed px-2">
              {card.question}
            </h3>
          </div>

          {/* Bottom Flip Instruction */}
          <div className="flex items-center justify-center space-x-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 opacity-80 group-hover:opacity-100">
            <RotateCw className="w-3.5 h-3.5 animate-spin-slow" />
            <span>Tap card to flip answer</span>
          </div>
        </div>

        {/* ================= BACK SIDE ================= */}
        <div
          className={`absolute inset-0 p-6 flex flex-col justify-between rounded-3xl bg-slate-900 text-white ${
            !isFlipped ? "pointer-events-none opacity-0" : "opacity-100"
          }`}
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)"
          }}
        >
          {/* Top Header */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              ANSWER & EXPLANATION
            </span>

            <div className="flex items-center space-x-1.5" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => onToggleDifficult(card.id)}
                className={`p-1.5 rounded-lg border text-xs transition cursor-pointer ${
                  card.isDifficult
                    ? "bg-rose-500 text-white border-rose-600"
                    : "bg-slate-800 text-slate-400 hover:text-rose-400 border-slate-700"
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => onToggleBookmark(card.id)}
                className={`p-1.5 rounded-lg border text-xs transition cursor-pointer ${
                  card.isBookmarked
                    ? "bg-amber-500 text-white border-amber-600"
                    : "bg-slate-800 text-slate-400 hover:text-amber-400 border-slate-700"
                }`}
              >
                <Bookmark className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Center Answer Content */}
          <div className="my-auto py-3 space-y-3">
            <p className="text-sm md:text-base font-extrabold text-white leading-relaxed">
              {card.answer}
            </p>

            {card.explanation && (
              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                {card.explanation}
              </p>
            )}

            {card.memoryTip && (
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start space-x-2">
                <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-extrabold text-amber-300 block mb-0.5">Memory Tip / Mnemonic:</span>
                  <span>{card.memoryTip}</span>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Instruction */}
          <div className="flex items-center justify-center space-x-1.5 text-xs font-bold text-slate-400">
            <RotateCw className="w-3.5 h-3.5" />
            <span>Tap card to flip back</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
