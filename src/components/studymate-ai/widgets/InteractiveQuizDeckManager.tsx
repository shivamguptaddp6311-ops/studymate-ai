import React, { useState } from "react";
import { QuizData, QuizQuestion } from "../types";
import { ProgressHeader } from "./ProgressHeader";
import { InteractiveQuizCard } from "./InteractiveQuizCard";
import { QuizResultScreen } from "./QuizResultScreen";

interface InteractiveQuizDeckManagerProps {
  quizData: QuizData;
  onSaveToWorkspace?: () => void;
  onRegenerateQuiz?: () => void;
}

export const InteractiveQuizDeckManager: React.FC<InteractiveQuizDeckManagerProps> = ({
  quizData,
  onSaveToWorkspace,
  onRegenerateQuiz
}) => {
  const [currentQuestions, setCurrentQuestions] = useState<QuizQuestion[]>(quizData.questions || []);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<(number | null)[]>(
    new Array(quizData.questions.length).fill(null)
  );
  const [isCompleted, setIsCompleted] = useState(false);
  const [reviewOnlyIncorrect, setReviewOnlyIncorrect] = useState(false);

  const activeQuestions = reviewOnlyIncorrect
    ? currentQuestions.filter((q, idx) => userAnswers[idx] !== q.correctOption)
    : currentQuestions;

  const currentQuestion = activeQuestions[currentIndex] || activeQuestions[0];

  const handleSelectOption = (optionIndex: number) => {
    if (userAnswers[currentIndex] !== null) return; // already answered

    const updated = [...userAnswers];
    updated[currentIndex] = optionIndex;
    setUserAnswers(updated);
  };

  const handleNext = () => {
    if (currentIndex < activeQuestions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsCompleted(true);
    }
  };

  const handleRetry = () => {
    setUserAnswers(new Array(currentQuestions.length).fill(null));
    setCurrentIndex(0);
    setIsCompleted(false);
    setReviewOnlyIncorrect(false);
  };

  const handleReviewIncorrect = () => {
    setReviewOnlyIncorrect(true);
    setCurrentIndex(0);
    setIsCompleted(false);
  };

  const currentScore = userAnswers.filter((ans, idx) => ans === currentQuestions[idx]?.correctOption).length;

  if (isCompleted) {
    return (
      <QuizResultScreen
        quizData={{ ...quizData, questions: currentQuestions }}
        userAnswers={userAnswers}
        onRetryQuiz={handleRetry}
        onReviewIncorrect={handleReviewIncorrect}
        onRegenerateQuiz={onRegenerateQuiz || handleRetry}
        onSaveToWorkspace={onSaveToWorkspace}
      />
    );
  }

  return (
    <div className="w-full bg-slate-100/90 dark:bg-slate-950/90 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-4 md:p-5 shadow-xl relative my-2 overflow-hidden">
      {/* Top Header */}
      <ProgressHeader
        title={quizData.title}
        subject={quizData.subject}
        chapter={quizData.chapter}
        currentIndex={currentIndex}
        totalCount={activeQuestions.length}
        score={currentScore}
        maxScore={currentQuestions.length}
        difficulty={quizData.difficulty}
        estimatedTime={quizData.estimatedTime}
        modeLabel={reviewOnlyIncorrect ? "REVIEW INCORRECT MODE" : undefined}
      />

      {/* Interactive Question Card */}
      {currentQuestion ? (
        <InteractiveQuizCard
          question={currentQuestion}
          totalQuestions={activeQuestions.length}
          selectedOptionIndex={userAnswers[currentIndex]}
          onSelectOption={handleSelectOption}
          onNextQuestion={handleNext}
          isLastQuestion={currentIndex === activeQuestions.length - 1}
        />
      ) : (
        <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 my-4">
          <p className="text-sm font-bold text-slate-500">No questions available to review.</p>
          <button
            onClick={handleRetry}
            className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold"
          >
            Reset Quiz
          </button>
        </div>
      )}
    </div>
  );
};
