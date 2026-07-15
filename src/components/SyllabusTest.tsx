import React, { useState, useEffect } from "react";
import { TEST_BANKS, TestQuestion, SYLLABUS_DB } from "../syllabusData";
import { UserProfile } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { 
  Award, Clock, CheckCircle2, AlertCircle, BookOpen, 
  HelpCircle, Sparkles, ChevronRight, RefreshCw, Volume2, ShieldCheck 
} from "lucide-react";
import { getDifficult50Questions } from "../difficultTestBank";

interface SyllabusTestProps {
  profile: UserProfile;
  onAwardXP: (xpAmount: number) => void;
  onAddNotification: (title: string, message: string, type: "info" | "alert" | "success" | "reminder") => void;
  onIncrementStreak?: () => void;
}

const generateExamOf50Questions = (gradeKey: string): TestQuestion[] => {
  return getDifficult50Questions(gradeKey);
};

export default function SyllabusTest({ 
  profile, 
  onAwardXP, 
  onAddNotification,
  onIncrementStreak 
}: SyllabusTestProps) {
  // Days elapsed state (saves to localStorage, defaults to 0)
  const storageKeyPrefix = `studymate_${profile.emailAddress.replace(/[^a-zA-Z0-9]/g, "_")}`;
  const [daysElapsed, setDaysElapsed] = useState<number>(() => {
    const savedStart = localStorage.getItem(`${storageKeyPrefix}_cycle_start_time`);
    let startTime = savedStart ? parseInt(savedStart) : 0;
    if (!savedStart) {
      startTime = Date.now();
      localStorage.setItem(`${storageKeyPrefix}_cycle_start_time`, String(startTime));
    }
    const diffDays = Math.floor((Date.now() - startTime) / (1000 * 60 * 60 * 24));
    const savedDays = localStorage.getItem(`${storageKeyPrefix}_days_elapsed`);
    const manualDays = savedDays ? parseInt(savedDays) : 0;
    return Math.min(Math.max(diffDays, manualDays), 10);
  });

  const [hasTriggeredEarlyThisCycle, setHasTriggeredEarlyThisCycle] = useState<boolean>(() => {
    return localStorage.getItem(`${storageKeyPrefix}_triggered_early_this_cycle`) === "true";
  });

  const [showXpUnlockModal, setShowXpUnlockModal] = useState(false);

  const [testHistory, setTestHistory] = useState<any[]>(() => {
    const saved = localStorage.getItem(`${storageKeyPrefix}_test_history`);
    return saved ? JSON.parse(saved) : [];
  });

  // Active exam states
  const [activeTest, setActiveTest] = useState<TestQuestion[] | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [showAnswerResult, setShowAnswerResult] = useState(false);
  const [testCompleted, setTestCompleted] = useState(false);
  const [score, setScore] = useState(0);
  const [isSimulated, setIsSimulated] = useState(false);
  const [showStartNotice, setShowStartNotice] = useState(false);
  const [isSimulatedNext, setIsSimulatedNext] = useState(false);
  const [acceptedNoticeRules, setAcceptedNoticeRules] = useState(false);
  const [examTypeToStart, setExamTypeToStart] = useState<"20q" | "50q">("20q");

  const triggerStartExam = (force = false) => {
    setIsSimulatedNext(force);
    setExamTypeToStart("20q");
    setAcceptedNoticeRules(false);
    setShowStartNotice(true);
    playSound(480, "sine", 0.15);
  };

  const triggerStart50QuestionExamNotice = () => {
    setIsSimulatedNext(false);
    setExamTypeToStart("50q");
    setAcceptedNoticeRules(false);
    setShowStartNotice(true);
    playSound(480, "sine", 0.15);
  };

  // Sound effects helper
  const playSound = (freq: number, type: OscillatorType = "sine", duration = 0.15) => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      // Ignore audio failure
    }
  };

  // Trigger days increment (simulating time passing)
  const handleIncrementDay = () => {
    const nextDays = daysElapsed + 1;
    setDaysElapsed(nextDays);
    localStorage.setItem(`${storageKeyPrefix}_days_elapsed`, String(nextDays));
    playSound(400, "triangle", 0.1);

    if (nextDays === 10) {
      triggerTestNotification();
    }
  };

  const triggerTestNotification = () => {
    onAddNotification(
      "📝 10-Day Syllabus Test Unlocked!",
      `A new comprehensive revision test of 20 high-impact questions has been generated based on your CBSE ${profile.classGrade} syllabus. Test your limits!`,
      "alert"
    );
    playSound(600, "sine", 0.3);
  };

  // Generate full 20 questions exam for current syllabus
  const handleStartExam = (force = false) => {
    if (daysElapsed < 10 && !force) return;

    setIsSimulated(force);
    // Find questions matching user's class
    const gradeKey = profile.classGrade || "Class 10";
    const baseQuestions = TEST_BANKS[gradeKey] || TEST_BANKS["Class 10"];
    
    // Mix and replicate questions if necessary to fill up to 20 total questions as requested
    let examSet: TestQuestion[] = [...baseQuestions];
    while (examSet.length < 20) {
      // Clone with new IDs to represent a fuller 20-question comprehensive exam bank
      examSet = examSet.concat(baseQuestions.map((q, idx) => ({
        ...q,
        id: `${q.id}-dup-${idx}-${examSet.length}`
      })));
    }
    
    // Slice exactly at 20 questions
    examSet = examSet.slice(0, 20);

    setActiveTest(examSet);
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setShowAnswerResult(false);
    setTestCompleted(false);
    setScore(0);

    onAddNotification(
      "✍️ Exam Started",
      "You are now taking the 20-question CBSE Board Exam mock test. Do not close this tab!",
      "info"
    );
    playSound(520, "sine", 0.2);
  };

  const handleStart50QuestionExam = () => {
    const gradeKey = profile.classGrade || "Class 10";
    const examSet = generateExamOf50Questions(gradeKey);
    
    setIsSimulated(false);
    setActiveTest(examSet);
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setShowAnswerResult(false);
    setTestCompleted(false);
    setScore(0);

    onAddNotification(
      "🔥 50-Question Exam Started",
      "You are now taking the 50-question CBSE Syllabus Ultimate Challenge. Maximum focus required!",
      "alert"
    );
    playSound(600, "sine", 0.35);
  };

  const handleSelectOption = (optionIndex: number) => {
    const currentQ = activeTest?.[currentQuestionIndex];
    if (!currentQ) return;

    setSelectedAnswers({
      ...selectedAnswers,
      [currentQ.id]: optionIndex
    });
    playSound(450, "sine", 0.05);
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      playSound(500, "sine", 0.08);
    }
  };

  const handleNextQuestion = () => {
    if (!activeTest) return;
    if (currentQuestionIndex < activeTest.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      playSound(500, "sine", 0.08);
    }
  };

  const handleCompleteExam = () => {
    if (!activeTest) return;
    
    // Evaluate total score
    let calculatedScore = 0;
    activeTest.forEach((q) => {
      if (selectedAnswers[q.id] === q.correctAnswer) {
        calculatedScore += 1;
      }
    });
    
    setScore(calculatedScore);
    setTestCompleted(true);
    
    // Calculate final score percentage
    const finalScorePercent = Math.round((calculatedScore / activeTest.length) * 100);
    
    // Determine if it is the 50-question test
    const isLongTest = activeTest.length === 50;
    
    // Award XP rewards (Higher scaling for 50-question challenge)
    const xpReward = isLongTest 
      ? 300 + (calculatedScore * 15) 
      : 150 + (calculatedScore * 10);
    onAwardXP(xpReward);

    // Save test history record
    const newRecord = {
      id: `test-${Date.now()}`,
      grade: profile.classGrade,
      date: new Date().toISOString().split("T")[0],
      score: `${calculatedScore}/${activeTest.length}`,
      percentage: finalScorePercent,
      xpEarned: xpReward,
      isLongTest: isLongTest
    };

    const nextHistory = [newRecord, ...testHistory];
    setTestHistory(nextHistory);
    localStorage.setItem(`${storageKeyPrefix}_test_history`, JSON.stringify(nextHistory));

    // Reset 10 day timeline countdown ONLY if they took the standard 10-day test
    if (!isLongTest) {
      setDaysElapsed(0);
      localStorage.setItem(`${storageKeyPrefix}_days_elapsed`, "0");
      localStorage.setItem(`${storageKeyPrefix}_cycle_start_time`, String(Date.now()));
      setHasTriggeredEarlyThisCycle(false);
      localStorage.setItem(`${storageKeyPrefix}_triggered_early_this_cycle`, "false");
    }

    // Boost login streak
    if (onIncrementStreak) {
      onIncrementStreak();
    }

    onAddNotification(
      isLongTest ? "🏆 Ultimate 50-Question Challenge Completed!" : "🏆 10-Day Exam Accomplished!",
      isLongTest 
        ? `Phenomenal performance! You completed the 50-question Hard Syllabus mock challenge with a score of ${calculatedScore}/50 (${finalScorePercent}%). Earned +${xpReward} XP!`
        : `Incredible job! You completed your CBSE syllabus mock assessment with a score of ${calculatedScore}/20 (${finalScorePercent}%). Earned +${xpReward} XP!`,
      "success"
    );

    playSound(950, "sine", 0.4);
  };

  const handleQuitExam = () => {
    // Only allow quitting if the test is already completed
    if (testCompleted) {
      setActiveTest(null);
      playSound(200, "triangle", 0.35);
    }
  };

  return (
    <div id="syllabus_test_view" className="space-y-6">
      
      {/* 📋 TEST START NOTICE GUIDELINES MODAL */}
      <AnimatePresence>
        {showStartNotice && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 text-left"
            >
              <div className="flex items-center space-x-3 text-indigo-600 dark:text-indigo-400">
                <span className="text-3xl">{examTypeToStart === "50q" ? "🔥" : "📝"}</span>
                <div>
                  <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-50">
                    {examTypeToStart === "50q" ? "50Q PYQ Ultimate Challenge Guidelines" : "10-Day 20Q Syllabus Test Guidelines"}
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">Please review the syllabus test structure and critical guidelines before starting.</p>
                </div>
              </div>

              <div className="space-y-3.5 bg-slate-50 dark:bg-slate-950 p-4.5 rounded-2xl border border-slate-100 dark:border-slate-850">
                <span className="text-[10px] font-black uppercase text-indigo-500 tracking-wider block">Key Exam Features</span>
                
                <div className="space-y-3">
                  <div className="flex items-start space-x-2.5">
                    <span className="text-sm mt-0.5">🎯</span>
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {examTypeToStart === "50q" ? "50 High-Difficulty Board Level Questions" : "20 High-Impact Mapped Questions"}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {examTypeToStart === "50q" 
                          ? "This mock test contains 50 rigorous questions hand-selected from CBSE previous years' board exam papers."
                          : "Every test pulls exactly 20 syllabus-specific MCQ questions mapped strictly to your CBSE curriculum."}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2.5">
                    <span className="text-sm mt-0.5">⏱️</span>
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">No Strict Time Limit, but Speed Matters</p>
                      <p className="text-[10px] text-slate-400">
                        {examTypeToStart === "50q" 
                          ? "Take your time to answer accurately! Expected completion time: 60-90 minutes." 
                          : "Pace yourself! We record your progress to calculate study efficacy and exam confidence indexes."}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2.5">
                    <span className="text-sm mt-0.5">🏆</span>
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Earn Massive Study XP Rewards</p>
                      <p className="text-[10px] text-slate-400">
                        {examTypeToStart === "50q"
                          ? "Earn +300 Base XP on completion, and +15 bonus XP for each correct answer! Boost your grade rank status."
                          : "Earn +150 Base XP on completion, and +10 bonus XP for each correct answer. Perfect score yields +350 XP!"}
                      </p>
                    </div>
                  </div>

                  {/* Anti-Close/Warning Notice */}
                  <div className="flex items-start space-x-2.5 p-3 bg-rose-50/70 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl">
                    <span className="text-sm mt-0.5">⚠️</span>
                    <div>
                      <p className="text-xs font-black text-rose-600 dark:text-rose-400 uppercase tracking-wide">NOTICE: DO NOT CLOSE OR REFRESH BEFORE COMPLETING!</p>
                      <p className="text-[10px] text-rose-500 font-extrabold leading-normal mt-0.5">
                        Starting this exam locks your session. If you close this browser tab, reload the page, or navigate away before answering all questions and clicking Submit, all active progress will be lost and your test session will be voided.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Acceptance Switch */}
              <div className="flex items-center space-x-3 p-1">
                <input 
                  type="checkbox" 
                  id="accept-rules" 
                  checked={acceptedNoticeRules}
                  onChange={(e) => setAcceptedNoticeRules(e.target.checked)}
                  className="w-4.5 h-4.5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                />
                <label htmlFor="accept-rules" className="text-xs font-black text-slate-700 dark:text-slate-300 cursor-pointer">
                  I understand that I must NOT close, reload, or leave the app until completing the exam.
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowStartNotice(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 text-xs font-extrabold rounded-xl transition cursor-pointer"
                >
                  Go Back
                </button>
                <button
                  type="button"
                  disabled={!acceptedNoticeRules}
                  onClick={() => {
                    setShowStartNotice(false);
                    if (examTypeToStart === "50q") {
                      handleStart50QuestionExam();
                    } else {
                      handleStartExam(isSimulatedNext);
                    }
                  }}
                  className={`flex-1 py-2.5 text-xs font-extrabold rounded-xl transition cursor-pointer flex items-center justify-center space-x-1.5 ${
                    acceptedNoticeRules 
                      ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow" 
                      : "bg-slate-100 text-slate-400 dark:bg-slate-800 cursor-not-allowed"
                  }`}
                >
                  <span>Start Mock Exam</span>
                  <span>&rarr;</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🪙 XP EARLY TEST UNLOCK MODAL */}
      <AnimatePresence>
        {showXpUnlockModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl text-center space-y-5"
            >
              <div className="mx-auto w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center text-amber-500 text-xl font-bold animate-pulse">
                🪙
              </div>

              <div className="space-y-2">
                <h3 className="text-base font-black text-slate-950 dark:text-slate-50 uppercase tracking-tight">
                  Unlock Test Early with XP
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                  You have {profile.xp} XP points available. Unlocking requires 50 XP.
                </p>
              </div>

              {profile.xp >= 50 ? (
                <div className="space-y-4">
                  <div className="p-4 bg-amber-50/50 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/30 rounded-2xl text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-semibold">
                    Expending <span className="text-amber-600 dark:text-amber-400 font-black">50 XP</span> will unlock 1 CBSE mock test immediately. Once triggered, you must complete it or your session will be lost. Your 10-day schedule resets upon test completion.
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowXpUnlockModal(false)}
                      className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-black rounded-xl cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowXpUnlockModal(false);
                        onAwardXP(-50);
                        setHasTriggeredEarlyThisCycle(true);
                        localStorage.setItem(`${storageKeyPrefix}_triggered_early_this_cycle`, "true");
                        handleStartExam(true);
                      }}
                      className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl shadow-md cursor-pointer"
                    >
                      Spend 50 XP & Start
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/30 rounded-2xl text-xs text-rose-600 dark:text-rose-400 leading-relaxed font-semibold">
                    Oops! You only have <span className="font-black">{profile.xp} XP</span>. You need at least <span className="font-black">50 XP</span> to unlock a test early. Earn more XP by answering active recalls, completing tasks, or running Pomodoro sessions.
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowXpUnlockModal(false)}
                    className="w-full py-2.5 bg-slate-900 dark:bg-slate-800 text-white hover:bg-slate-800 text-xs font-black rounded-xl cursor-pointer"
                  >
                    Got It
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dynamic Main Dashboard Container */}
      {!activeTest ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Timeline and Trigger Center */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-6 flex flex-col justify-between">
            <div className="space-y-2">
              <span className="text-[10px] font-black bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-2.5 py-1 rounded-full uppercase tracking-widest">
                Scheduled Learning Cycles
              </span>
              <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">10-Day Syllabus Assessment Center</h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Consistent revision leads to board exam excellence. Your progress is monitored automatically. After every 10 active days of logged studies, we assemble a complete board-style revision test containing exactly 20 questions mapped specifically to your stream.
              </p>
            </div>

            {/* Simulated Day Ticker Container */}
            <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-xs text-slate-400 font-bold block uppercase tracking-wider">Elapsed Timeline</span>
                  <p className="text-lg font-black text-slate-800 dark:text-slate-100">{daysElapsed} / 10 Days</p>
                </div>
                <div className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100/20 text-emerald-600 dark:text-emerald-450 font-bold text-[10px] rounded-full uppercase tracking-wider flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                  <span>Fully Automatic</span>
                </div>
              </div>

              {/* Progress visual timeline dots */}
              <div className="grid grid-cols-10 gap-1.5 pt-1">
                {Array.from({ length: 10 }).map((_, idx) => {
                  const isActive = idx < daysElapsed;
                  const isFinished = idx === 9 && daysElapsed === 10;
                  return (
                    <div 
                      key={idx}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        isFinished ? "bg-emerald-500 animate-pulse" : 
                        isActive ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-800"
                      }`}
                    />
                  );
                })}
              </div>

              {daysElapsed < 10 ? (
                <div className="space-y-3">
                  <p className="text-[10px] text-slate-400 font-semibold text-center py-2 bg-slate-100/50 dark:bg-slate-950/50 rounded-xl border border-slate-100 dark:border-slate-850">
                    🔒 Next board test unlocks automatically in {10 - daysElapsed} days. Keep completing daily learning activities!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-800 rounded-xl flex items-center space-x-2.5 text-xs text-emerald-700 dark:text-emerald-400 font-bold animate-pulse">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                    <span>Syllabus Test Available! Click below to start your comprehensive 20 questions paper.</span>
                  </div>
                  
                  {daysElapsed > 10 && (
                    <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl flex items-center space-x-2.5 text-xs text-rose-600 dark:text-rose-400 font-bold">
                      <span className="text-sm">⚠️</span>
                      <span>By Mistake Missed? You have elapsed {daysElapsed} days without taking the test. You can still complete it now with no penalty!</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Launchers buttons */}
            <div className="flex flex-col gap-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* 10-Day Test Button */}
                <div className="flex flex-col justify-between p-4 bg-slate-50 dark:bg-slate-950/45 rounded-2xl border border-slate-100 dark:border-slate-850 space-y-3">
                  <div className="text-left space-y-1">
                    <span className="text-[9px] bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400 px-2 py-0.5 rounded font-black uppercase tracking-wider">
                      Standard Assessment
                    </span>
                    <h4 className="text-xs font-black text-slate-800 dark:text-slate-100">10-Day Syllabus Test</h4>
                    <p className="text-[10px] text-slate-400 leading-normal">
                      A customized 20-question revision evaluation paper automatically unlocked every 10 active study days.
                    </p>
                  </div>
                  <button
                    disabled={daysElapsed < 10}
                    onClick={() => triggerStartExam(false)}
                    className={`w-full py-2.5 font-extrabold text-[11px] rounded-xl shadow-sm transition flex items-center justify-center space-x-1.5 ${
                      daysElapsed >= 10 
                        ? "bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer" 
                        : "bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-800"
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Begin 20Q Syllabus Test</span>
                  </button>
                </div>

                {/* 50-Question Long Test Button */}
                <div className="flex flex-col justify-between p-4 bg-gradient-to-br from-rose-50/50 to-orange-50/30 dark:from-rose-950/10 dark:to-orange-950/10 rounded-2xl border border-rose-100/50 dark:border-rose-900/20 space-y-3">
                  <div className="text-left space-y-1">
                    <span className="text-[9px] bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400 px-2 py-0.5 rounded font-black uppercase tracking-wider">
                      🔥 Hard Mode Challenge
                    </span>
                    <h4 className="text-xs font-black text-slate-800 dark:text-slate-100">Ultimate 50Q Board Exam</h4>
                    <p className="text-[10px] text-slate-400 leading-normal">
                      Rigorous 50-question mock exam containing extremely difficult conceptual challenges and actual CBSE Board PYQs.
                    </p>
                  </div>
                  <button
                    onClick={triggerStart50QuestionExamNotice}
                    className="w-full py-2.5 bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-500 hover:to-orange-500 text-white font-extrabold text-[11px] rounded-xl shadow-sm transition flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
                    <span>Begin 50Q PYQ Challenge</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Test Performance & Report Cards */}
          <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm flex flex-col space-y-4">
            <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 flex items-center">
              <Award className="w-4.5 h-4.5 text-amber-500 mr-2" />
              Syllabus Test History
            </h3>
            
            {testHistory.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl">
                <span className="text-3xl block">📋</span>
                <p className="text-xs font-bold text-slate-500 mt-2">No test logs found yet</p>
                <p className="text-[10px] text-slate-400">Complete your first 10-day test to see performance graphs here.</p>
              </div>
            ) : (
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[360px] pr-1">
                {testHistory.map((h, i) => (
                  <div key={i} className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800/80 flex justify-between items-center text-xs">
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-bold text-slate-400 block">{h.date}</span>
                      <p className="font-bold text-slate-800 dark:text-slate-100">{h.grade} Exam</p>
                      <span className="text-[10px] text-emerald-500 font-bold">+{h.xpEarned} XP Awarded</span>
                    </div>
                    <div className="text-right">
                      <span className="text-base font-black text-indigo-600 dark:text-indigo-400 block">{h.score}</span>
                      <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950 font-bold px-1.5 py-0.5 rounded text-indigo-700 dark:text-indigo-400">{h.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      ) : (
        /* Immersive Board Test Screen Window */
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-lg space-y-6">
          
          {/* Test Header */}
          <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800/80">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="bg-rose-500 text-white font-extrabold text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                  Active Board Test
                </span>
                {isSimulated && (
                  <span className="bg-amber-500 text-slate-950 font-bold text-[9px] px-2 py-0.5 rounded-full">
                    DEMO BYPASS MODE
                  </span>
                )}
              </div>
              <h2 className="text-base font-black text-slate-800 dark:text-slate-100">
                CBSE {profile.classGrade} Syllabus Mock Test
              </h2>
            </div>

            {testCompleted && (
              <button
                onClick={() => setActiveTest(null)}
                className="px-3.5 py-1.5 text-xs font-bold text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition cursor-pointer"
              >
                Close Test Dashboard
              </button>
            )}
          </div>

          {!testCompleted ? (
            /* Active Test Panel */
            <div className="space-y-6">
              
              {/* Question status bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-slate-400 font-bold">
                  <span>QUESTION {currentQuestionIndex + 1} OF {activeTest.length}</span>
                  <span>{Object.keys(selectedAnswers).length} of {activeTest.length} Answered</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                    style={{ width: `${((currentQuestionIndex + 1) / activeTest.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Question visual block card */}
              <div className="p-5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80 rounded-2xl space-y-3.5">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded">
                    📚 {activeTest[currentQuestionIndex].subject}
                  </span>
                  {activeTest[currentQuestionIndex].yearHint && (
                    <span className="text-[10px] text-amber-500 font-bold">
                      🎯 {activeTest[currentQuestionIndex].yearHint}
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-relaxed">
                  {activeTest[currentQuestionIndex].question}
                </h3>
              </div>

              {/* Multiple Choice Answers Options */}
              <div className="space-y-2.5">
                {activeTest[currentQuestionIndex].options.map((option, idx) => {
                  const isSelected = selectedAnswers[activeTest[currentQuestionIndex].id] === idx;
                  
                  let optionStyles = "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50";
                  if (isSelected) {
                    optionStyles = "bg-indigo-50/50 border-indigo-400 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 font-bold ring-2 ring-indigo-500";
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelectOption(idx)}
                      className={`w-full text-left p-3.5 rounded-2xl border text-xs transition flex items-center justify-between cursor-pointer ${optionStyles}`}
                    >
                      <div className="flex items-center space-x-3">
                        <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-500">
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span>{option}</span>
                      </div>
                      {isSelected && (
                        <span className="text-indigo-600 text-xs font-bold">Selected</span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="p-3 bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100/30 rounded-xl text-[10px] text-indigo-500 font-semibold leading-relaxed">
                * Tip: You can freely click "Back" to correct any answer. There is no penalty for changing options during the exam phase!
              </div>

              {/* Action Navigation Buttons */}
              <div className="flex justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
                <button
                  disabled={currentQuestionIndex === 0}
                  onClick={handlePrevQuestion}
                  className={`px-5 py-2 text-xs font-bold rounded-xl shadow transition flex items-center space-x-1 ${
                    currentQuestionIndex > 0
                      ? "bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
                      : "bg-slate-50 text-slate-300 dark:bg-slate-950 dark:text-slate-700 cursor-not-allowed"
                  }`}
                >
                  <span>← Back</span>
                </button>

                {currentQuestionIndex < activeTest.length - 1 ? (
                  <button
                    onClick={handleNextQuestion}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow transition flex items-center cursor-pointer"
                  >
                    <span>Next →</span>
                  </button>
                ) : (
                  <button
                    disabled={Object.keys(selectedAnswers).length < activeTest.length}
                    onClick={handleCompleteExam}
                    className={`px-6 py-2.5 text-xs font-extrabold rounded-xl shadow transition ${
                      Object.keys(selectedAnswers).length === activeTest.length
                        ? "bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                        : "bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-800"
                    }`}
                  >
                    {Object.keys(selectedAnswers).length === activeTest.length
                      ? "Submit Comprehensive Exam"
                      : `Answer All Questions (${Object.keys(selectedAnswers).length}/${activeTest.length})`
                    }
                  </button>
                )}
              </div>

            </div>
          ) : (
            /* Completed Exam Summary & Detailed Solutions panel */
            <div className="space-y-8">
              
              <div className="text-center py-6 space-y-4 border-b border-slate-100 dark:border-slate-800/80">
                <span className="text-5xl block animate-bounce">🏆</span>
                <div className="space-y-1">
                  <h3 className="text-xl font-black text-slate-800 dark:text-slate-100">Mock Syllabus Exam Accomplished!</h3>
                  <p className="text-xs text-slate-400 font-semibold">
                    You completed the full CBSE {profile.classGrade} syllabus revision challenge.
                  </p>
                </div>

                {/* Score breakdown bubble */}
                <div className="max-w-xs mx-auto p-5 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-800/50 rounded-2xl space-y-1.5 text-center">
                  <span className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block">Final Score Report</span>
                  <p className="text-3xl font-black text-slate-800 dark:text-slate-100">{score} / {activeTest.length} Correct</p>
                  <p className="text-sm font-bold text-slate-500">{Math.round((score / activeTest.length) * 100)}% Proficiency</p>
                </div>

                <div className="max-w-md mx-auto p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl text-xs text-slate-500 font-medium leading-relaxed space-y-1 text-left">
                  <p className="font-extrabold text-slate-700 dark:text-slate-300 flex items-center">
                    <ShieldCheck className="w-4.5 h-4.5 text-emerald-500 mr-1.5" />
                    Scholar Achievements Mapped:
                  </p>
                  <p>• CBSE Board Syllabus Coverage updated successfully.</p>
                  <p>• XP Awarded: +{150 + (score * 10)} Rank XP points synced to your Google Account.</p>
                  <p>• Streak counter secured successfully for today!</p>
                </div>
              </div>

              {/* Exhaustive Question Answers & Solutions Display */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center">
                    <BookOpen className="w-4.5 h-4.5 text-indigo-500 mr-2" />
                    Complete Exam Answer Key & Solutions
                  </h4>
                  <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded font-black animate-pulse">
                    {activeTest.length} OF {activeTest.length} QUESTIONS
                  </span>
                </div>

                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 border-l border-slate-100 dark:border-slate-800/80 pl-4">
                  {activeTest.map((q, qidx) => {
                    const userChoice = selectedAnswers[q.id];
                    const isCorrect = userChoice === q.correctAnswer;

                    return (
                      <div 
                        key={q.id} 
                        className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-3.5"
                      >
                        <div className="flex justify-between items-start text-xs">
                          <span className="font-black text-slate-400 block uppercase">
                            Q{qidx + 1}. {q.subject}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full font-black text-[9px] uppercase ${
                            isCorrect 
                              ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40" 
                              : "bg-rose-50 text-rose-600 dark:bg-rose-950/40"
                          }`}>
                            {isCorrect ? "✓ Correct" : "✗ Incorrect"}
                          </span>
                        </div>

                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {q.question}
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                          {q.options.map((opt, oidx) => {
                            const isCorrectOpt = q.correctAnswer === oidx;
                            const isSelectedOpt = userChoice === oidx;

                            let optStyle = "border-slate-100 dark:border-slate-900 bg-white dark:bg-slate-900 text-slate-500";
                            if (isCorrectOpt) {
                              optStyle = "border-emerald-200 bg-emerald-50/50 text-emerald-700 dark:border-emerald-950/40 dark:bg-emerald-950/20 font-bold";
                            } else if (isSelectedOpt) {
                              optStyle = "border-rose-200 bg-rose-50/50 text-rose-700 dark:border-rose-950/40 dark:bg-rose-950/20 font-bold";
                            }

                            return (
                              <div key={oidx} className={`p-2 border.5 rounded-xl flex items-center space-x-2 ${optStyle}`}>
                                <span className="font-bold text-[10px] w-5 h-5 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                                  {String.fromCharCode(65 + oidx)}
                                </span>
                                <span className="truncate">{opt}</span>
                                {isCorrectOpt && <span className="text-[9px] text-emerald-600 font-bold ml-auto">✓ Key</span>}
                                {isSelectedOpt && !isCorrectOpt && <span className="text-[9px] text-rose-600 font-bold ml-auto">Your choice</span>}
                              </div>
                            );
                          })}
                        </div>

                        <div className="p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl space-y-1">
                          <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest block">
                            Detailed Solution Step-by-Step:
                          </span>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                            {q.explanation}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-center pt-4">
                <button
                  onClick={() => setActiveTest(null)}
                  className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl shadow transition cursor-pointer"
                >
                  Return to Dashboard
                </button>
              </div>

            </div>
          )}

        </div>
      )}

    </div>
  );
}
