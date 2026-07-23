import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Trophy, Zap, Brain, Sparkles, Clock, AlertCircle, RefreshCw, 
  CheckCircle2, XCircle, ChevronRight, Play, ArrowLeft, Volume2, 
  HelpCircle, Star, Award, ShieldCheck, ListOrdered
} from "lucide-react";
import { UserProfile } from "../types";
import { SYLLABUS_DB } from "../syllabusData";
import PremiumErrorCard from "./PremiumErrorCard";

interface SyllabusQuestGameProps {
  profile: UserProfile;
  difficulty: "easy" | "medium" | "hard" | "expert";
  grade: string;
  onFinished: (score: number, max: number, accuracy: number) => void;
  synthSound: (f: number, t?: OscillatorType, d?: number) => void;
  onAddNotification: (title: string, message: string, type: "info" | "alert" | "success" | "reminder") => void;
  onClose?: () => void;
}

// Map UI difficulty levels to Server difficulties
const DIFFICULTY_MAP = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
  expert: "Expert"
} as const;

const REVERSE_DIFFICULTY_MAP = {
  "Easy": "easy",
  "Medium": "medium",
  "Hard": "hard",
  "Expert": "expert"
} as const;

// Helper to retrieve syllabus chapters and subjects
const getSubjectsForClass = (grade: string): string[] => {
  const matched = SYLLABUS_DB.find(s => s.grade.toLowerCase() === grade.toLowerCase());
  if (matched) {
    return matched.subjects.map(sub => sub.subject);
  }
  return ["Mathematics", "Science", "Social Science", "English"];
};

const getChaptersForSubject = (grade: string, subject: string): string[] => {
  const matchedClass = SYLLABUS_DB.find(s => s.grade.toLowerCase() === grade.toLowerCase());
  if (matchedClass) {
    const matchedSub = matchedClass.subjects.find(sub => sub.subject.toLowerCase() === subject.toLowerCase());
    if (matchedSub) {
      return matchedSub.chapters.map(ch => ch.title);
    }
  }
  return [
    "Chapter 1: Foundations",
    "Chapter 2: Concept Analysis",
    "Chapter 3: Essential Problems",
    "Chapter 4: Advanced Mastery"
  ];
};

interface Question {
  id: string;
  type: string;
  classGrade: string;
  subject: string;
  chapter: string;
  difficulty: "Easy" | "Medium" | "Hard" | "Expert";
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export default function SyllabusQuestGame({
  profile,
  difficulty: initialDifficulty,
  grade: initialGrade,
  onFinished,
  synthSound,
  onAddNotification,
  onClose
}: SyllabusQuestGameProps) {
  const emailPrefix = profile.emailAddress.replace(/[^a-zA-Z0-9]/g, "_");

  // Game Setup States
  const [gameState, setGameState] = useState<"setup" | "playing" | "explanation" | "results">("setup");
  const [selectedClass, setSelectedClass] = useState<string>(initialGrade || profile.classGrade || "Class 10");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedChapter, setSelectedChapter] = useState<string>("All Chapters");
  const [currentDifficulty, setCurrentDifficulty] = useState<"easy" | "medium" | "hard" | "expert">(initialDifficulty);

  // Subjects & Chapters select lists
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);
  const [availableChapters, setAvailableChapters] = useState<string[]>([]);

  // Active game play states
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState<number>(0);
  const [shuffledOptions, setShuffledOptions] = useState<{ text: string; originalIndex: number }[]>([]);
  const [selectedOptionIdx, setSelectedOptionIdx] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  
  // Scoring & Stats
  const [score, setScore] = useState<number>(0);
  const [totalQuestionsAnswered, setTotalQuestionsAnswered] = useState<number>(0);
  const [correctCount, setCorrectCount] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Streak counters for Adaptive Difficulty
  const [consecutiveCorrect, setConsecutiveCorrect] = useState<number>(0);
  const [consecutiveWrong, setConsecutiveWrong] = useState<number>(0);
  const [difficultyHistory, setDifficultyHistory] = useState<string[]>([]);

  // Initialize subjects and chapters
  useEffect(() => {
    const subjects = getSubjectsForClass(selectedClass);
    setAvailableSubjects(subjects);
    if (subjects.length > 0) {
      setSelectedSubject(subjects[0]);
    }
  }, [selectedClass]);

  useEffect(() => {
    if (selectedSubject) {
      const chapters = getChaptersForSubject(selectedClass, selectedSubject);
      setAvailableChapters(["All Chapters", ...chapters]);
      setSelectedChapter("All Chapters");
    }
  }, [selectedClass, selectedSubject]);

  // Handle countdown timer during gameplay
  useEffect(() => {
    if (gameState !== "playing") return;

    if (timeLeft <= 0) {
      // Time Out counts as incorrect
      handleAnswerSelection(-1);
      return;
    }

    const timer = setTimeout(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft, gameState]);

  // Load and cache questions dynamically
  const fetchQuestions = async (diff: "easy" | "medium" | "hard" | "expert", count: number): Promise<Question[]> => {
    try {
      const token = localStorage.getItem("studymate_token") || "";
      
      // Get recently used questions for anti-repetition filter
      const cacheKey = `studymate_games_${emailPrefix}_recently_used_question_ids`;
      const savedIds = localStorage.getItem(cacheKey);
      let excludeIds: string[] = savedIds ? JSON.parse(savedIds) : [];

      // Determine a concrete chapter if "All Chapters" is selected to follow strict syllabus mappings
      let chapterParam = selectedChapter;
      if (selectedChapter === "All Chapters" && availableChapters.length > 1) {
        // Exclude "All Chapters" index 0, pick a random concrete chapter
        const randomIndex = Math.floor(Math.random() * (availableChapters.length - 1)) + 1;
        chapterParam = availableChapters[randomIndex];
      }

      const response = await fetch("/api/quiz/questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          classGrade: selectedClass,
          subject: selectedSubject,
          chapter: chapterParam,
          difficulty: DIFFICULTY_MAP[diff],
          excludeIds,
          count
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to retrieve syllabus questions.");
      }

      const data = await response.json();
      if (data.success && Array.isArray(data.questions) && data.questions.length > 0) {
        return data.questions;
      } else {
        throw new Error("No syllabus questions found in pool. Try adjusting selectors.");
      }
    } catch (err: any) {
      console.error("[SyllabusQuestGame] Error loading questions:", err);
      throw err;
    }
  };

  const handleStartGame = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    synthSound(550, "sine", 0.15);

    try {
      // Load first batch of questions at selected starting difficulty
      const fetched = await fetchQuestions(currentDifficulty, 5);
      
      setQuestions(fetched);
      setCurrentQuestionIdx(0);
      setScore(0);
      setTotalQuestionsAnswered(0);
      setCorrectCount(0);
      setConsecutiveCorrect(0);
      setConsecutiveWrong(0);
      setDifficultyHistory([DIFFICULTY_MAP[currentDifficulty]]);

      // Shuffle options of the first question
      shuffleAndPrepareOptions(fetched[0]);

      setGameState("playing");
      setTimeLeft(35);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to prepare syllabus questions. Please check your network connection.");
    } finally {
      setIsLoading(false);
    }
  };

  const shuffleAndPrepareOptions = (questionObj: Question) => {
    if (!questionObj) return;
    
    // Create mapping of options with their original indices to ensure randomized display
    const mapped = questionObj.options.map((opt, idx) => ({
      text: opt,
      originalIndex: idx
    }));

    // Perform truly random shuffle
    const shuffled = [...mapped].sort(() => Math.random() - 0.5);
    setShuffledOptions(shuffled);
    setSelectedOptionIdx(null);
    setIsCorrect(null);
  };

  const handleAnswerSelection = async (shuffledIndex: number) => {
    if (selectedOptionIdx !== null) return; // Prevent double answer submission

    const currentQ = questions[currentQuestionIdx];
    if (!currentQ) return;

    let originalIdx = -1;
    let selectedText = "No Answer";
    
    if (shuffledIndex !== -1) {
      originalIdx = shuffledOptions[shuffledIndex].originalIndex;
      selectedText = shuffledOptions[shuffledIndex].text;
      setSelectedOptionIdx(shuffledIndex);
    }

    const isAnsCorrect = originalIdx === currentQ.correctAnswer;
    setIsCorrect(isAnsCorrect);
    setTotalQuestionsAnswered(prev => prev + 1);

    // Save this question's unique ID to recently served list in localStorage to prevent frequent repetition
    const cacheKey = `studymate_games_${emailPrefix}_recently_used_question_ids`;
    const savedIds = localStorage.getItem(cacheKey);
    let recentlyUsed: string[] = savedIds ? JSON.parse(savedIds) : [];
    
    // Add unique ID, avoiding duplicates
    if (!recentlyUsed.includes(currentQ.id)) {
      recentlyUsed.push(currentQ.id);
      // Keep a max of 120 question IDs in history, then exhaust/rotate pool
      if (recentlyUsed.length > 120) {
        recentlyUsed.shift();
      }
      localStorage.setItem(cacheKey, JSON.stringify(recentlyUsed));
    }

    // Adaptive Difficulty State Engine
    let nextDifficulty = currentDifficulty;
    let upgradedOrDowngraded: "up" | "down" | null = null;

    if (isAnsCorrect) {
      setCorrectCount(prev => prev + 1);
      setScore(prev => prev + (currentDifficulty === "easy" ? 10 : currentDifficulty === "medium" ? 20 : currentDifficulty === "hard" ? 35 : 50));
      
      const newConsecutiveCorrect = consecutiveCorrect + 1;
      setConsecutiveCorrect(newConsecutiveCorrect);
      setConsecutiveWrong(0); // Reset incorrect streak

      // Play victory chime
      synthSound(720, "sine", 0.12);
      setTimeout(() => synthSound(900, "sine", 0.18), 100);

      // Increase difficulty after 2 consecutive correct answers
      if (newConsecutiveCorrect >= 2) {
        if (currentDifficulty === "easy") {
          nextDifficulty = "medium";
          upgradedOrDowngraded = "up";
        } else if (currentDifficulty === "medium") {
          nextDifficulty = "hard";
          upgradedOrDowngraded = "up";
        } else if (currentDifficulty === "hard") {
          nextDifficulty = "expert";
          upgradedOrDowngraded = "up";
        }
        setConsecutiveCorrect(0); // Reset streak after adapt
      }
    } else {
      const newConsecutiveWrong = consecutiveWrong + 1;
      setConsecutiveWrong(newConsecutiveWrong);
      setConsecutiveCorrect(0); // Reset correct streak

      // Play failure chime
      synthSound(180, "sawtooth", 0.35);

      // Decrease difficulty after 2 consecutive wrong answers
      if (newConsecutiveWrong >= 2) {
        if (currentDifficulty === "expert") {
          nextDifficulty = "hard";
          upgradedOrDowngraded = "down";
        } else if (currentDifficulty === "hard") {
          nextDifficulty = "medium";
          upgradedOrDowngraded = "down";
        } else if (currentDifficulty === "medium") {
          nextDifficulty = "easy";
          upgradedOrDowngraded = "down";
        }
        setConsecutiveWrong(0); // Reset streak after adapt
      }
    }

    // Adapt current difficulty (Easy <-> Medium <-> Hard <-> Expert)
    if (upgradedOrDowngraded !== null) {
      setCurrentDifficulty(nextDifficulty);
      setDifficultyHistory(prev => [...prev, DIFFICULTY_MAP[nextDifficulty]]);
      
      if (upgradedOrDowngraded === "up") {
        onAddNotification(
          "⚡ Adaptive Level Up!",
          `Great streak! The StudyMate adaptive engine has upgraded your game difficulty to ${DIFFICULTY_MAP[nextDifficulty]} Mode.`,
          "success"
        );
      } else {
        onAddNotification(
          "⚠️ Adaptive Assistance",
          `Difficulty adjusted to ${DIFFICULTY_MAP[nextDifficulty]} Mode to keep you supported. You got this!`,
          "info"
        );
      }
    }

    // Shift screen to Explanation Review mode
    setGameState("explanation");
  };

  const handleNextQuestion = async () => {
    // End session after 10 questions have been answered to keep gameplay fast & engaging
    if (totalQuestionsAnswered >= 10) {
      setGameState("results");
      const finalAccuracy = Math.round((correctCount / totalQuestionsAnswered) * 100);
      onFinished(score, totalQuestionsAnswered, finalAccuracy);
      synthSound(880, "sine", 0.2);
      return;
    }

    const nextIdx = currentQuestionIdx + 1;

    // Check if we need to load a brand new batch of questions from server
    if (nextIdx >= questions.length) {
      setIsLoading(true);
      try {
        const fetched = await fetchQuestions(currentDifficulty, 5);
        setQuestions(prev => [...prev, ...fetched]);
        setCurrentQuestionIdx(nextIdx);
        shuffleAndPrepareOptions(fetched[0]);
        setGameState("playing");
        setTimeLeft(35);
      } catch (err: any) {
        setErrorMessage("Error fetching next adaptive question. Please tap skip or retry.");
      } finally {
        setIsLoading(false);
      }
    } else {
      // Load next already loaded question
      setCurrentQuestionIdx(nextIdx);
      shuffleAndPrepareOptions(questions[nextIdx]);
      setGameState("playing");
      setTimeLeft(35);
    }
  };

  return (
    <div id="syllabus_quest_game" className="w-full max-w-xl mx-auto">
      
      {/* Loading overlay */}
      {isLoading && (
        <div className="p-8 bg-white/80 dark:bg-slate-900/80 rounded-3xl border border-indigo-200/50 dark:border-indigo-900/50 shadow-xl flex flex-col items-center text-center space-y-5 my-6 relative overflow-hidden">
          <div className="relative p-4 bg-gradient-to-tr from-indigo-500/20 via-purple-500/20 to-pink-500/20 rounded-2xl border border-indigo-500/30">
            <Sparkles className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-spin" />
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-indigo-500 rounded-full animate-ping" />
          </div>
          <div className="space-y-1 max-w-sm">
            <h4 className="text-base font-black text-slate-800 dark:text-slate-100">
              Designing Adaptive Syllabus Quest
            </h4>
            <p className="text-xs text-slate-400 font-bold">
              Tailoring cognitive levels perfectly to {selectedClass} standards...
            </p>
          </div>
          <div className="w-full max-w-md space-y-2.5 pt-2">
            <div className="h-3 w-full bg-slate-200/60 dark:bg-slate-800/60 rounded-full overflow-hidden relative">
              <div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full animate-[shimmer_1.5s_infinite] w-full" />
            </div>
            <div className="flex justify-between text-[10px] text-indigo-500 font-extrabold tracking-wider uppercase">
              <span>Generating Questions</span>
              <span>100% Adaptive</span>
            </div>
          </div>
        </div>
      )}

      {/* SETUP STAGE */}
      {!isLoading && gameState === "setup" && (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm text-left space-y-5"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-500">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight text-slate-900 dark:text-slate-100">
                Syllabus Quest: Trivia Master
              </h3>
              <p className="text-[10px] text-slate-400 font-medium">Adaptive CBSE & Olympiad Level Syllabus Challenge</p>
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
            Test your knowledge! Our elite Adaptive engine automatically tracks your performance. Consecutive correct answers upgrade the difficulty, while errors safely ease it, guaranteeing a tailored cognitive workout.
          </p>

          <div className="space-y-3.5 bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-850">
            {/* Class Grade Select */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">Target Class</label>
                <select 
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold p-2.5 rounded-xl text-slate-700 dark:text-slate-200 cursor-pointer focus:ring-2 focus:ring-indigo-500"
                >
                  {["Class 6", "Class 7", "Class 8", "Class 9", "Class 10", "Class 11", "Class 12"].map(cls => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
              </div>

              {/* Subject Select */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">Select Subject</label>
                <select 
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold p-2.5 rounded-xl text-slate-700 dark:text-slate-200 cursor-pointer focus:ring-2 focus:ring-indigo-500"
                >
                  {availableSubjects.map(sub => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Chapter Select */}
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">Target Chapter</label>
              <select 
                value={selectedChapter}
                onChange={(e) => setSelectedChapter(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold p-2.5 rounded-xl text-slate-700 dark:text-slate-200 cursor-pointer focus:ring-2 focus:ring-indigo-500"
              >
                {availableChapters.map(ch => (
                  <option key={ch} value={ch}>{ch}</option>
                ))}
              </select>
            </div>

            {/* Starting Difficulty Select */}
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">Starting Difficulty</label>
              <div className="grid grid-cols-3 gap-2">
                {(["easy", "medium", "hard"] as const).map(diff => (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => setCurrentDifficulty(diff)}
                    className={`py-2 px-3 text-xs font-black rounded-xl border capitalize transition-all cursor-pointer ${
                      currentDifficulty === diff
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    {diff}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {errorMessage && (
            <PremiumErrorCard
              compact
              type="game"
              title="Syllabus Game Error"
              description={errorMessage}
              error={errorMessage}
              onRetry={handleStartGame}
              onGoBack={() => setErrorMessage(null)}
            />
          )}

          <div className="flex gap-3 pt-2">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-extrabold rounded-xl transition cursor-pointer text-center"
              >
                Cancel
              </button>
            )}
            <button
              type="button"
              onClick={handleStartGame}
              className="flex-[2] py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black rounded-xl shadow-md transition cursor-pointer flex items-center justify-center space-x-1.5"
            >
              <Play className="w-4 h-4 fill-white text-white" />
              <span>Launch Quiz Session</span>
            </button>
          </div>
        </motion.div>
      )}

      {/* ACTIVE PLAY STAGE */}
      {!isLoading && gameState === "playing" && questions.length > 0 && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm text-center space-y-6"
        >
          {/* Top Info Bar */}
          <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950 px-4 py-2.5 rounded-2xl border border-slate-100 dark:border-slate-850">
            <div className="flex items-center space-x-1 text-xs font-extrabold text-indigo-600 dark:text-indigo-400">
              <Award className="w-4 h-4 text-indigo-500" />
              <span>{selectedSubject}</span>
            </div>

            <div className="flex items-center space-x-1 text-xs font-black text-rose-500 animate-pulse">
              <Clock className="w-4 h-4" />
              <span>{timeLeft}s</span>
            </div>

            <div className="text-right text-[10px] text-slate-400 font-extrabold uppercase">
              Difficulty: <span className="text-indigo-500">{DIFFICULTY_MAP[currentDifficulty]}</span>
            </div>
          </div>

          {/* Question Counter Progress */}
          <div className="space-y-1 text-left">
            <div className="flex justify-between text-[10px] text-slate-400 font-black tracking-wide uppercase">
              <span>Question {totalQuestionsAnswered + 1} of 10</span>
              <span>Score: {score} Pts</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden flex">
              {Array.from({ length: 10 }).map((_, idx) => (
                <div 
                  key={idx}
                  className={`flex-1 h-full border-r border-white dark:border-slate-900 last:border-0 ${
                    idx < totalQuestionsAnswered 
                      ? "bg-indigo-600" 
                      : idx === totalQuestionsAnswered 
                      ? "bg-indigo-300 dark:bg-indigo-800" 
                      : "bg-slate-100 dark:bg-slate-800"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Question Text Card */}
          <div className="p-5 bg-indigo-50/30 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/30 rounded-2xl text-left space-y-2">
            <span className="text-[9px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider">
              Syllabus Assessment Query
            </span>
            <p className="text-sm font-black text-slate-800 dark:text-slate-100 leading-relaxed">
              {questions[currentQuestionIdx]?.question}
            </p>
          </div>

          {/* Option Answer Buttons */}
          <div className="grid grid-cols-1 gap-3">
            {shuffledOptions.map((opt, sIdx) => (
              <button
                key={sIdx}
                type="button"
                onClick={() => handleAnswerSelection(sIdx)}
                className="w-full p-3.5 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 border border-slate-200 dark:border-slate-750 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-200 transition duration-150 cursor-pointer shadow-sm text-left hover:border-indigo-300 flex items-center justify-between"
              >
                <span>{opt.text}</span>
                <span className="text-[10px] font-black text-slate-400 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 px-2.5 py-1 rounded-lg uppercase">
                  Option {sIdx + 1}
                </span>
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* EXPLANATION REVIEW STAGE */}
      {!isLoading && gameState === "explanation" && questions[currentQuestionIdx] && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm text-left space-y-5"
        >
          {/* Answer Feedback Header */}
          <div className="flex items-center space-x-3.5 pb-4 border-b border-slate-100 dark:border-slate-800/80">
            {isCorrect ? (
              <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-500 shrink-0">
                <CheckCircle2 className="w-7 h-7" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center text-rose-500 shrink-0">
                <XCircle className="w-7 h-7" />
              </div>
            )}
            <div>
              <h3 className={`text-base font-black tracking-tight ${isCorrect ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                {isCorrect ? "Excellent! Correct Answer" : selectedOptionIdx === null ? "Time's Up!" : "Incomplete Retention / Incorrect"}
              </h3>
              <p className="text-[10px] text-slate-400 font-medium">Review original syllabus parameters & step-by-step calculations</p>
            </div>
          </div>

          {/* Original Question */}
          <div className="space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Question</span>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {questions[currentQuestionIdx].question}
            </p>
          </div>

          {/* User selection and correct answer */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className={`p-3 rounded-xl border text-xs ${
              isCorrect 
                ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-300"
                : "bg-rose-50/50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/30 text-rose-800 dark:text-rose-350"
            }`}>
              <span className="text-[9px] font-black uppercase tracking-wider block opacity-70 mb-0.5">Your Choice</span>
              <span className="font-extrabold text-[11px]">
                {selectedOptionIdx !== null ? shuffledOptions[selectedOptionIdx].text : "No Option Selected"}
              </span>
            </div>

            <div className="p-3 bg-emerald-50/30 dark:bg-emerald-950/10 border border-emerald-100/50 dark:border-emerald-900/20 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs">
              <span className="text-[9px] font-black uppercase tracking-wider block opacity-70 mb-0.5">Correct Answer</span>
              <span className="font-extrabold text-[11px]">
                {questions[currentQuestionIdx].options[questions[currentQuestionIdx].correctAnswer]}
              </span>
            </div>
          </div>

          {/* Explanation text */}
          <div className="p-4 bg-indigo-50/20 dark:bg-indigo-950/10 border border-indigo-100/30 dark:border-indigo-900/30 rounded-2xl space-y-1.5 text-xs">
            <span className="text-[9px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider block">
              Step-by-Step Conceptual Explanation
            </span>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-semibold">
              {questions[currentQuestionIdx].explanation}
            </p>
          </div>

          {/* Action button */}
          <button
            type="button"
            onClick={handleNextQuestion}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black rounded-xl shadow-md transition flex items-center justify-center space-x-1 cursor-pointer"
          >
            <span>{totalQuestionsAnswered >= 10 ? "Finish & See Summary" : "Next Adaptive Question"}</span>
            <ChevronRight className="w-4 h-4 text-white" />
          </button>
        </motion.div>
      )}

      {/* GAME SUMMARY RESULTS STAGE */}
      {!isLoading && gameState === "results" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm text-center space-y-6"
        >
          <div className="py-2 space-y-2">
            <div className="mx-auto w-14 h-14 rounded-full bg-amber-50 dark:bg-amber-950 flex items-center justify-center text-amber-500 text-2xl font-bold animate-bounce shadow-sm">
              🏆
            </div>
            <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-100 uppercase">
              Syllabus Quest Accomplished!
            </h3>
            <p className="text-xs text-slate-400 font-medium">Adaptive Trivia session compiled successfully</p>
          </div>

          <div className="grid grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-950 p-4.5 rounded-2xl border border-slate-100 dark:border-slate-850">
            <div className="text-center">
              <span className="text-[9px] text-slate-400 font-black block uppercase tracking-wide">Accuracy</span>
              <span className="text-base font-black text-indigo-600 dark:text-indigo-400 block mt-0.5">
                {Math.round((correctCount / totalQuestionsAnswered) * 100)}%
              </span>
              <span className="text-[9px] text-slate-400 block mt-0.5">{correctCount}/{totalQuestionsAnswered} Correct</span>
            </div>

            <div className="text-center border-x border-slate-200 dark:border-slate-800">
              <span className="text-[9px] text-slate-400 font-black block uppercase tracking-wide">Points Won</span>
              <span className="text-base font-black text-amber-500 block mt-0.5">
                {score} Pts
              </span>
              <span className="text-[9px] text-slate-400 block mt-0.5">+{Math.floor(score * 0.8)} Coins</span>
            </div>

            <div className="text-center">
              <span className="text-[9px] text-slate-400 font-black block uppercase tracking-wide">Adaptive Peak</span>
              <span className="text-base font-black text-indigo-600 dark:text-indigo-400 block mt-0.5 capitalize">
                {currentDifficulty}
              </span>
              <span className="text-[9px] text-slate-400 block mt-0.5">Level reached</span>
            </div>
          </div>

          {/* Difficulty Timeline Log */}
          <div className="space-y-2.5 text-left bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-850">
            <span className="text-[9px] font-black uppercase text-indigo-500 tracking-wider block">
              Adaptive Level Timeline Tracker
            </span>
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-extrabold text-slate-500">
              {difficultyHistory.map((diff, index) => (
                <React.Fragment key={index}>
                  {index > 0 && <span className="text-slate-300">&rarr;</span>}
                  <span className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 px-2 py-0.5 rounded text-[10px] text-indigo-600 dark:text-indigo-400">
                    {diff}
                  </span>
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setGameState("setup")}
              className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 text-xs font-extrabold rounded-xl transition cursor-pointer"
            >
              Play Again
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black rounded-xl shadow cursor-pointer"
              >
                Return to Games
              </button>
            )}
          </div>
        </motion.div>
      )}

    </div>
  );
}
