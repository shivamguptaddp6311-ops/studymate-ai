import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Shuffle, ChevronLeft, ChevronRight, Bookmark, AlertCircle, BookmarkPlus, CheckCircle2, Layers, Sparkles } from "lucide-react";
import { FlashcardDeckData, FlashcardData } from "../types";
import { ProgressHeader } from "./ProgressHeader";
import { FlipFlashcard } from "./FlipFlashcard";

interface FlashcardDeckProps {
  deckData: FlashcardDeckData;
  onSaveToWorkspace?: () => void;
}

export const FlashcardDeck: React.FC<FlashcardDeckProps> = ({
  deckData,
  onSaveToWorkspace
}) => {
  const [cards, setCards] = useState<FlashcardData[]>(deckData.cards || []);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [filterMode, setFilterMode] = useState<"all" | "difficult" | "bookmarked">("all");

  const filteredCards = cards.filter((card) => {
    if (filterMode === "difficult") return card.isDifficult;
    if (filterMode === "bookmarked") return card.isBookmarked;
    return true;
  });

  const activeDeck = filteredCards.length > 0 ? filteredCards : cards;
  const currentCard = activeDeck[currentIndex] || activeDeck[0];

  const handleToggleBookmark = (cardId: string) => {
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, isBookmarked: !c.isBookmarked } : c))
    );
  };

  const handleToggleDifficult = (cardId: string) => {
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, isDifficult: !c.isDifficult } : c))
    );
  };

  const handleShuffle = () => {
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setCurrentIndex(0);
  };

  const handleNext = () => {
    if (currentIndex < activeDeck.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setCurrentIndex(0); // loop back to start
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    } else {
      setCurrentIndex(activeDeck.length - 1);
    }
  };

  const difficultCount = cards.filter((c) => c.isDifficult).length;
  const bookmarkedCount = cards.filter((c) => c.isBookmarked).length;

  return (
    <div className="w-full bg-slate-100/90 dark:bg-slate-950/90 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-4 md:p-5 shadow-xl relative my-2 overflow-hidden">
      {/* Top Header & Progress */}
      <ProgressHeader
        title={deckData.title}
        subject={deckData.subject}
        chapter={deckData.chapter}
        currentIndex={currentIndex}
        totalCount={activeDeck.length}
        modeLabel={filterMode !== "all" ? `${filterMode.toUpperCase()} MODE` : undefined}
      />

      {/* Filter Mode & Stats Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 px-1">
        <div className="flex items-center space-x-1.5">
          <button
            type="button"
            onClick={() => { setFilterMode("all"); setCurrentIndex(0); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
              filterMode === "all"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800"
            }`}
          >
            All Cards ({cards.length})
          </button>

          <button
            type="button"
            onClick={() => { setFilterMode("difficult"); setCurrentIndex(0); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition flex items-center space-x-1 cursor-pointer ${
              filterMode === "difficult"
                ? "bg-rose-600 text-white shadow-xs"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-rose-950/30"
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
            <span>Difficult ({difficultCount})</span>
          </button>

          <button
            type="button"
            onClick={() => { setFilterMode("bookmarked"); setCurrentIndex(0); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition flex items-center space-x-1 cursor-pointer ${
              filterMode === "bookmarked"
                ? "bg-amber-600 text-white shadow-xs"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-amber-50 dark:hover:bg-amber-950/30"
            }`}
          >
            <Bookmark className="w-3.5 h-3.5 text-amber-500" />
            <span>Bookmarked ({bookmarkedCount})</span>
          </button>
        </div>

        <button
          type="button"
          onClick={handleShuffle}
          className="px-3 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-800/80 rounded-xl text-xs font-bold transition flex items-center space-x-1 cursor-pointer"
          title="Shuffle Deck"
        >
          <Shuffle className="w-3.5 h-3.5 text-indigo-500" />
          <span>Shuffle</span>
        </button>
      </div>

      {/* Main Flip Card Container */}
      {currentCard ? (
        <AnimatePresence mode="wait">
          <motion.div
            key={currentCard.id || currentIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <FlipFlashcard
              card={currentCard}
              cardNumber={currentIndex + 1}
              totalCards={activeDeck.length}
              onToggleBookmark={handleToggleBookmark}
              onToggleDifficult={handleToggleDifficult}
            />
          </motion.div>
        </AnimatePresence>
      ) : (
        <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 my-4">
          <p className="text-sm font-bold text-slate-500">No flashcards found in this filter mode.</p>
          <button
            onClick={() => setFilterMode("all")}
            className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold"
          >
            Show All Cards
          </button>
        </div>
      )}

      {/* Navigation Controls Row */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={handlePrev}
          className="p-2.5 bg-white dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-200 transition cursor-pointer flex items-center space-x-1 font-extrabold text-xs"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Previous</span>
        </button>

        {onSaveToWorkspace && (
          <button
            type="button"
            onClick={onSaveToWorkspace}
            className="px-3.5 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer"
          >
            <BookmarkPlus className="w-3.5 h-3.5 text-emerald-500" />
            <span>Save Deck to Workspace</span>
          </button>
        )}

        <button
          type="button"
          onClick={handleNext}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-extrabold transition shadow-md flex items-center space-x-1 cursor-pointer"
        >
          <span>Next Card</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
