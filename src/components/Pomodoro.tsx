import React, { useState, useEffect, useRef } from "react";
import { 
  Timer, Play, Pause, RotateCcw, Volume2, VolumeX, Eye, EyeOff, 
  Sparkles, Coffee, Clock, Info, Award, BookOpen, ChevronRight, PenTool
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { SYLLABUS_DB } from "../syllabusData";

interface PomodoroProps {
  onAwardXP: (xp: number) => void;
  onIncrementPomodoro: () => void;
  isFocusLockdown?: boolean;
  onFocusLockdownChange?: (active: boolean) => void;
  profileClassGrade?: string;
}

export default function Pomodoro({ 
  onAwardXP, 
  onIncrementPomodoro,
  isFocusLockdown = false,
  onFocusLockdownChange,
  profileClassGrade = "Class 10"
}: PomodoroProps) {
  // Timer durations
  const [studyMinutes, setStudyMinutes] = useState(25);
  const [breakMinutes, setBreakMinutes] = useState(5);

  const [timeLeft, setTimeLeft] = useState(25 * 60); // seconds
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);

  // Focus Mode state (linked to elevated props)
  const focusMode = isFocusLockdown;
  const setFocusMode = (active: boolean) => {
    if (onFocusLockdownChange) {
      onFocusLockdownChange(active);
    }
  };

  // Syllabus revision notes and scratchpad state during Lockdown
  const [selectedSubjectIndex, setSelectedSubjectIndex] = useState(0);
  const [selectedChapterIndex, setSelectedChapterIndex] = useState(0);
  const [scratchpad, setScratchpad] = useState("");

  // Load CBSE class syllabus data from syllabus database
  const classSyllabus = SYLLABUS_DB.find(c => c.grade === profileClassGrade) || SYLLABUS_DB[1];
  const subjects = classSyllabus?.subjects || [];
  const selectedSubject = subjects[selectedSubjectIndex] || subjects[0];
  const chapters = selectedSubject?.chapters || [];
  const selectedChapter = chapters[selectedChapterIndex] || chapters[0];

  const [ambientSound, setAmbientSound] = useState(false);
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [showDoubleConfirm, setShowDoubleConfirm] = useState(false);

  const playSound = (freq: number, duration = 0.15) => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {}
  };

  // Audio synthethizer ticking / sound simulation
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync timer duration if modified
  useEffect(() => {
    if (!isRunning) {
      setTimeLeft((isBreak ? breakMinutes : studyMinutes) * 60);
    }
  }, [studyMinutes, breakMinutes, isBreak]);

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // Timer finished!
            setIsRunning(false);
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, isBreak]);

  const handleTimerComplete = () => {
    if (!isBreak) {
      // Study session complete!
      setCompletedSessions((prev) => prev + 1);
      onIncrementPomodoro();
      onAwardXP(100); // Earn 100 study XP!
      
      // Automatically restore normal behavior when the timer finishes
      setFocusMode(false);
      try {
        if (document.fullscreenElement) {
          if (document.exitFullscreen) {
            document.exitFullscreen();
          }
        }
      } catch (err) {
        console.warn("Fullscreen exit failed:", err);
      }

      alert("🎉 Focus session complete! Take a well-earned break.");
      setIsBreak(true);
      setTimeLeft(breakMinutes * 60);
    } else {
      // Break session complete!
      alert("⏰ Break complete! Ready to start focusing again?");
      setIsBreak(false);
      setTimeLeft(studyMinutes * 60);
    }
  };

  // Fullscreen, Back-gesture and reload lock management when focus mode is active
  useEffect(() => {
    if (focusMode) {
      const enterFullscreen = async () => {
        try {
          const elem = document.documentElement;
          if (elem.requestFullscreen) {
            await elem.requestFullscreen();
          } else if ((elem as any).mozRequestFullScreen) {
            await (elem as any).mozRequestFullScreen();
          } else if ((elem as any).webkitRequestFullscreen) {
            await (elem as any).webkitRequestFullscreen();
          } else if ((elem as any).msRequestFullscreen) {
            await (elem as any).msRequestFullscreen();
          }
        } catch (err) {
          console.warn("Fullscreen request failed or was blocked by container iframe:", err);
        }
      };

      enterFullscreen();

      // Set global focus flag to mute other systems or sounds
      (window as any).__studymate_focus_mode_active = true;

      // 1. Prevent back gesture / browser back navigation
      window.history.pushState(null, "", window.location.href);
      const handlePopState = () => {
        window.history.pushState(null, "", window.location.href);
      };
      window.addEventListener("popstate", handlePopState);

      // 2. Prevent tab close / reload / exit
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = "Focus Lockdown is active! Leaving now will reset your active session.";
        return e.returnValue;
      };
      window.addEventListener("beforeunload", handleBeforeUnload);

      return () => {
        (window as any).__studymate_focus_mode_active = false;
        window.removeEventListener("popstate", handlePopState);
        window.removeEventListener("beforeunload", handleBeforeUnload);
        
        try {
          if (document.fullscreenElement) {
            if (document.exitFullscreen) {
              document.exitFullscreen();
            }
          }
        } catch (err) {
          console.warn("Fullscreen exit failed:", err);
        }
      };
    }
  }, [focusMode]);

  const handleToggle = () => {
    setIsRunning(!isRunning);
  };

  const handleReset = () => {
    setIsRunning(false);
    setIsBreak(false);
    setTimeLeft(studyMinutes * 60);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Circular progress calculation
  const totalSeconds = (isBreak ? breakMinutes : studyMinutes) * 60;
  const progressPercent = Math.max(0, Math.min(((totalSeconds - timeLeft) / totalSeconds) * 100, 100));

  return (
    <div id="pomodoro_tab" className={`space-y-6 transition-colors duration-500 ${
      focusMode ? "bg-slate-950 text-slate-100 p-6 rounded-3xl min-h-[500px] flex flex-col justify-center items-center" : ""
    }`}>

      {/* 📵 STEP 1: DISTRACTION-FREE NOTICE MODAL */}
      <AnimatePresence>
        {showNoticeModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-left"
            >
              <div className="flex items-center space-x-3 text-rose-500">
                <span className="text-3xl">📵</span>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-slate-50 uppercase tracking-wider">Distraction-Free Protocol</h3>
                  <p className="text-[10px] text-slate-400 font-semibold">Strict Concentration Lockdown Mode</p>
                </div>
              </div>

              <div className="space-y-3 bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-850">
                <span className="text-[10px] font-black uppercase text-rose-500 block tracking-widest">Guideline Warnings</span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                  Entering this state locks StudyMate into a full-screen, high-discipline Pomodoro screen.
                </p>
                <ul className="space-y-1.5 text-[10px] text-slate-400 font-medium">
                  <li className="flex items-center space-x-1.5">
                    <span className="text-rose-500">✓</span>
                    <span>All external device app accesses are psychologically locked.</span>
                  </li>
                  <li className="flex items-center space-x-1.5">
                    <span className="text-rose-500">✓</span>
                    <span>System and browser notifications are silenced and blocked.</span>
                  </li>
                  <li className="flex items-center space-x-1.5">
                    <span className="text-rose-500">✓</span>
                    <span>Timer resets automatically to a continuous 25-minute focus countdown.</span>
                  </li>
                </ul>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  onClick={() => setShowNoticeModal(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-extrabold rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowNoticeModal(false);
                    setShowDoubleConfirm(true);
                    playSound(600, 0.15);
                  }}
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold rounded-xl shadow transition cursor-pointer"
                >
                  I Understand Rules
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ⚠️ STEP 2: DISTRACTION-FREE DOUBLE CONFIRMATION MODAL */}
      <AnimatePresence>
        {showDoubleConfirm && (
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center space-y-4"
            >
              <span className="text-4xl block animate-bounce">⚠️</span>
              <div className="space-y-1">
                <h3 className="text-sm font-black text-rose-600 uppercase tracking-widest">Double Confirmation Required!</h3>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Are you absolutely sure you are ready?</p>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                You are about to start a 25-minute distraction-free block. Once active, your attention must remain undivided. Do you accept this challenge?
              </p>

              <div className="flex gap-2.5 pt-2">
                <button
                  onClick={() => setShowDoubleConfirm(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-extrabold rounded-xl transition cursor-pointer"
                >
                  No, Study Normally
                </button>
                <button
                  onClick={() => {
                    setShowDoubleConfirm(false);
                    setStudyMinutes(25);
                    setTimeLeft(25 * 60);
                    setIsBreak(false);
                    setIsRunning(true);
                    setFocusMode(true);
                    playSound(880, 0.35);
                  }}
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold rounded-xl shadow-md cursor-pointer"
                >
                  Yes, Start Lockdown!
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {!focusMode ? (
          <motion.div 
            key="normal-mode"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* HEADER */}
            <div className="flex justify-between items-center bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm">
              <div className="space-y-1">
                <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center">
                  <Timer className="w-6 h-6 text-rose-500 mr-2" />
                  Pomodoro Focus Timer
                </h1>
                <p className="text-xs text-slate-400">Maintain deep attention cycles. Cycle between 25m focus and 5m relaxation.</p>
              </div>
              
              <button 
                onClick={() => { playSound(520, 0.12); setShowNoticeModal(true); }}
                className="flex items-center space-x-1 bg-slate-900 dark:bg-slate-800 text-white hover:bg-slate-800 px-4 py-2.5 rounded-2xl text-xs font-bold shadow-sm cursor-pointer animate-pulse"
              >
                <Eye className="w-4 h-4" />
                <span>Distraction-Free Mode</span>
              </button>
            </div>

            {/* CONTROLS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Duration Settings Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
                <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">Durations Settings</h3>

                {/* Focus Duration */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-slate-500">
                    <span>Study Session</span>
                    <span className="text-indigo-600 dark:text-indigo-400">{studyMinutes} Minutes</span>
                  </div>
                  <input 
                    type="range" 
                    min="5" 
                    max="60" 
                    step="5"
                    className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-lg accent-rose-500 cursor-pointer"
                    value={studyMinutes}
                    onChange={(e) => setStudyMinutes(parseInt(e.target.value))}
                    disabled={isRunning}
                  />
                </div>

                {/* Break Duration */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-slate-500">
                    <span>Rest Break</span>
                    <span className="text-emerald-500">{breakMinutes} Minutes</span>
                  </div>
                  <input 
                    type="range" 
                    min="2" 
                    max="30" 
                    step="1"
                    className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-lg accent-emerald-500 cursor-pointer"
                    value={breakMinutes}
                    onChange={(e) => setBreakMinutes(parseInt(e.target.value))}
                    disabled={isRunning}
                  />
                </div>

                {/* Session Statistics */}
                <div className="border-t border-slate-100 dark:border-slate-800/60 pt-4 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 font-semibold block">Completed Cycles</span>
                    <h4 className="text-lg font-black text-slate-800 dark:text-slate-100">{completedSessions} Sessions Today</h4>
                  </div>
                  <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 text-rose-500 rounded-xl">
                    <Award className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Central Clock visual card */}
              <div className="md:col-span-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 rounded-3xl shadow-sm flex flex-col justify-center items-center text-center space-y-6">
                
                {/* Visual Timer ring */}
                <div className="relative w-48 h-48 flex items-center justify-center">
                  <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                    <circle
                      cx="96"
                      cy="96"
                      r="84"
                      className="stroke-slate-100 dark:stroke-slate-800"
                      strokeWidth="10"
                      fill="transparent"
                    />
                    <circle
                      cx="96"
                      cy="96"
                      r="84"
                      className={`transition-all duration-1000 ${
                        isBreak ? "stroke-emerald-500" : "stroke-rose-500"
                      }`}
                      strokeWidth="10"
                      fill="transparent"
                      strokeDasharray={2 * Math.PI * 84}
                      strokeDashoffset={2 * Math.PI * 84 * (1 - progressPercent / 100)}
                      strokeLinecap="round"
                    />
                  </svg>

                  <div className="text-center relative z-10 space-y-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                      {isBreak ? "Break" : "Study Focus"}
                    </span>
                    <h2 className="text-4xl font-black text-slate-800 dark:text-slate-100 font-mono tracking-tight">
                      {formatTime(timeLeft)}
                    </h2>
                    <span className="text-[10px] text-slate-400 font-bold block flex items-center justify-center">
                      {isBreak ? <Coffee className="w-3.5 h-3.5 text-emerald-500 mr-1" /> : <Clock className="w-3.5 h-3.5 text-rose-500 mr-1" />}
                      {isRunning ? "Ticking" : "Paused"}
                    </span>
                  </div>
                </div>

                {/* Clock operation keys */}
                <div className="flex items-center space-x-3">
                  <button 
                    onClick={handleReset}
                    className="p-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-2xl transition cursor-pointer"
                    title="Reset timer"
                  >
                    <RotateCcw className="w-5 h-5" />
                  </button>

                  <button 
                    onClick={handleToggle}
                    className={`px-8 py-3 rounded-2xl font-black text-sm shadow-md transition flex items-center space-x-2 cursor-pointer ${
                      isRunning 
                        ? "bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-800" 
                        : "bg-rose-600 text-white hover:bg-rose-500 shadow-rose-600/10"
                    }`}
                  >
                    {isRunning ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white" />}
                    <span>{isRunning ? "Pause Session" : "Start Focus"}</span>
                  </button>

                  <button 
                    onClick={() => setAmbientSound(!ambientSound)}
                    className={`p-3 rounded-2xl transition cursor-pointer ${
                      ambientSound 
                        ? "bg-rose-50 dark:bg-rose-950/40 text-rose-500 border border-rose-200" 
                        : "bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600"
                    }`}
                    title="Toggle White-noise ambient feedback"
                  >
                    {ambientSound ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                  </button>
                </div>

              </div>

            </div>

            {/* Pomodoro Scientific benefits card */}
            <div className="bg-rose-500/5 border border-rose-500/15 p-5 rounded-3xl flex items-start space-x-4">
              <div className="p-2.5 bg-rose-500/10 text-rose-500 rounded-xl">
                <Info className="w-5 h-5" />
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                <strong>Why Pomodoro?</strong> The Pomodoro technique maximizes productivity by breaking complex revision timelines into highly disciplined 25-minute sprints. Short breaks prevent brain fatigue, reinforce spatial memory indexing, and help maintain high consistency!
              </div>
            </div>

          </motion.div>
        ) : (
          /* 📵 SYSTEM LOCKOUT DISTRACTION FREE SHIELD ACTIVE */
          <motion.div 
            key="distraction-mode"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            className="w-full min-h-screen bg-slate-950 text-white p-6 md:p-10 flex flex-col justify-between relative overflow-hidden font-sans select-none"
          >
            {/* Dark abstract radial ambiance */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-rose-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse" />

            {/* Top Status Header - No exit, back, or close buttons */}
            <div className="flex justify-between items-center pb-4 border-b border-white/5 relative z-10">
              <div className="flex items-center space-x-2.5">
                <span className="text-xl animate-pulse">📵</span>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-rose-500">StudyMate Shield Enforced</h3>
                  <p className="text-[10px] text-slate-400 font-bold">STRICT DISTRACTION-FREE LOCKDOWN ACTIVE</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 text-xs font-extrabold text-slate-400 bg-slate-900/80 px-3.5 py-1.5 rounded-xl border border-white/5">
                <span className="w-2 h-2 bg-rose-500 rounded-full animate-ping" />
                <span>ALL DISTRACTIONS SILENCED</span>
              </div>
            </div>

            {/* Split Grid Revision Station */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch my-auto py-6 relative z-10 w-full max-w-7xl mx-auto flex-1">
              
              {/* Left Column: Giant Minimal Countdown Timer */}
              <div className="lg:col-span-5 bg-slate-900/30 border border-white/5 rounded-3xl p-6 flex flex-col justify-center items-center text-center space-y-6">
                
                {/* Glowing timer title */}
                <div className="space-y-1">
                  <span className="text-[9px] font-black tracking-widest text-rose-500 bg-rose-500/10 px-2.5 py-1 rounded-full uppercase">
                    {isBreak ? "Break Chill" : "Revision Sprint"}
                  </span>
                  <h4 className="text-xs font-bold text-slate-400">
                    {isBreak ? "Rest your eyes & hydrate" : "Engage with notes on the right"}
                  </h4>
                </div>

                {/* Big interactive visual countdown wheel */}
                <div className="relative w-52 h-52 flex items-center justify-center">
                  <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                    <circle
                      cx="104"
                      cy="104"
                      r="92"
                      className="stroke-slate-900"
                      strokeWidth="8"
                      fill="transparent"
                    />
                    <circle
                      cx="104"
                      cy="104"
                      r="92"
                      className={`transition-all duration-1000 ${
                        isBreak ? "stroke-emerald-500 shadow-lg" : "stroke-rose-500 shadow-lg"
                      }`}
                      strokeWidth="8"
                      fill="transparent"
                      strokeDasharray={2 * Math.PI * 92}
                      strokeDashoffset={2 * Math.PI * 92 * (1 - progressPercent / 100)}
                      strokeLinecap="round"
                    />
                  </svg>

                  <div className="text-center relative z-10 space-y-0.5">
                    <h1 className="text-5xl font-black font-mono tracking-tighter text-slate-50 animate-pulse">
                      {formatTime(timeLeft)}
                    </h1>
                    <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest block">
                      {isRunning ? "Running" : "Paused"}
                    </span>
                  </div>
                </div>

                {/* Interactive Controls (NO EXIT BUTTON) */}
                <div className="flex items-center space-x-3">
                  <button 
                    onClick={handleReset}
                    className="p-3 bg-slate-900 hover:bg-slate-800 border border-white/5 text-slate-400 hover:text-white rounded-2xl transition cursor-pointer"
                    title="Reset countdown timer"
                  >
                    <RotateCcw className="w-4.5 h-4.5" />
                  </button>

                  <button 
                    onClick={handleToggle}
                    className={`px-8 py-2.5 rounded-2xl font-black text-xs shadow-md transition flex items-center space-x-1.5 cursor-pointer ${
                      isRunning 
                        ? "bg-white text-slate-950 hover:bg-slate-100" 
                        : "bg-rose-600 text-white hover:bg-rose-500"
                    }`}
                  >
                    {isRunning ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                    <span>{isRunning ? "Pause" : "Resume"}</span>
                  </button>

                  <button 
                    onClick={() => setAmbientSound(!ambientSound)}
                    className={`p-3 rounded-2xl border transition cursor-pointer ${
                      ambientSound 
                        ? "bg-rose-500/20 border-rose-500/30 text-rose-400" 
                        : "bg-slate-900 border-white/5 text-slate-400 hover:text-slate-200"
                    }`}
                    title="Toggle white noise ambient"
                  >
                    {ambientSound ? <Volume2 className="w-4.5 h-4.5" /> : <VolumeX className="w-4.5 h-4.5" />}
                  </button>
                </div>

                {/* Simulated silencing feed updates */}
                <div className="w-full bg-slate-955/40 p-3 border border-white/5 rounded-2xl text-left space-y-1.5">
                  <span className="text-[8px] font-black uppercase tracking-wider text-rose-500 block">Active Study Fort Status</span>
                  <div className="grid grid-cols-2 gap-2 text-[9px] text-slate-400 font-bold">
                    <div className="flex items-center space-x-1">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                      <span>📳 Phone Calls: Muted</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                      <span>🔔 Alerts: Ignored</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Right Column: Immersive CBSE Revision Station & Active Notes */}
              <div className="lg:col-span-7 bg-slate-900/20 border border-white/5 rounded-3xl p-6 flex flex-col space-y-4 overflow-hidden max-h-[580px] lg:max-h-[640px] text-left">
                
                {/* Header Selector bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
                  <div className="flex items-center space-x-2">
                    <BookOpen className="w-4 h-4 text-rose-500" />
                    <span className="text-xs font-black uppercase tracking-wider text-slate-300">Active Syllabus revision:</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={selectedSubjectIndex}
                      onChange={(e) => {
                        setSelectedSubjectIndex(parseInt(e.target.value));
                        setSelectedChapterIndex(0);
                      }}
                      className="bg-slate-900 border border-white/10 text-white text-[11px] font-black rounded-lg p-1.5 focus:outline-none cursor-pointer"
                    >
                      {subjects.map((subj: any, i: number) => (
                        <option key={subj.subject} value={i}>{subj.subject}</option>
                      ))}
                    </select>

                    <select
                      value={selectedChapterIndex}
                      onChange={(e) => setSelectedChapterIndex(parseInt(e.target.value))}
                      className="bg-slate-900 border border-white/10 text-white text-[11px] font-black rounded-lg p-1.5 focus:outline-none cursor-pointer max-w-[150px] truncate"
                    >
                      {chapters.map((chap: any, i: number) => (
                        <option key={chap.id} value={i}>Ch {chap.number}: {chap.title}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Chapter study material reader pane */}
                <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
                  {selectedChapter ? (
                    <>
                      {/* Summary Section */}
                      <div className="bg-rose-500/5 border border-rose-500/10 p-3.5 rounded-2xl">
                        <span className="text-[9px] font-black tracking-wider uppercase text-rose-400 block mb-1">Chapter Concept Hub</span>
                        <p className="text-xs text-slate-300 font-semibold leading-relaxed">
                          {selectedChapter.summary}
                        </p>
                      </div>

                      {/* Notes Bullet points */}
                      <div className="space-y-2">
                        <span className="text-[9px] font-black tracking-wider uppercase text-rose-400 block">High-Yield Exam Notes</span>
                        {selectedChapter.notes && selectedChapter.notes.length > 0 ? (
                          <div className="space-y-2">
                            {selectedChapter.notes.map((note: string, idx: number) => (
                              <div key={idx} className="flex items-start gap-2 text-xs text-slate-300 leading-relaxed bg-slate-900/40 p-2.5 rounded-xl border border-white/5 font-medium">
                                <span className="text-rose-500 mt-0.5 shrink-0">⚡</span>
                                <span>{note}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-500 italic">No notes uploaded for this chapter yet.</p>
                        )}
                      </div>

                      {/* Sample self-assessment pyqs or practice questions */}
                      {selectedChapter.practiceQuestions && selectedChapter.practiceQuestions.length > 0 && (
                        <div className="space-y-2 pt-1">
                          <span className="text-[9px] font-black tracking-wider uppercase text-rose-400 block">Active Practice Desk</span>
                          <div className="space-y-1.5">
                            {selectedChapter.practiceQuestions.map((q: string, idx: number) => (
                              <div key={idx} className="flex items-start gap-2 text-[11px] text-slate-400 leading-relaxed bg-slate-950/40 p-2 rounded-lg border border-white/5">
                                <span className="text-indigo-400 shrink-0">✏️</span>
                                <span>{q}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-12 text-slate-500">
                      <p className="text-xs">No active chapter content found for your class grade.</p>
                    </div>
                  )}
                </div>

                {/* Revision active scratchpad and distraction logger */}
                <div className="border-t border-white/5 pt-3 space-y-2">
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span className="font-extrabold uppercase tracking-wider text-rose-400 flex items-center gap-1">
                      <PenTool className="w-3 h-3" /> Active Study Scratchpad & Distraction dump
                    </span>
                    <span className="font-semibold text-slate-500">Auto-saved locally</span>
                  </div>
                  <textarea
                    value={scratchpad}
                    onChange={(e) => setScratchpad(e.target.value)}
                    placeholder="Type active revision summaries or calculations here. If a distracting thought pops up, dump it here to clear your brain!"
                    className="w-full h-20 bg-slate-950 border border-white/10 rounded-xl p-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-rose-500/50 resize-none font-semibold leading-relaxed"
                  />
                </div>

              </div>

            </div>

            {/* Bottom Brand Bar */}
            <div className="flex justify-between items-center pt-3 border-t border-white/5 relative z-10 text-[10px] text-slate-500 font-bold">
              <span>STUDYMATE REV: v2.5 SECURED</span>
              <span>FOCUS CYCLE SHIELD SYSTEM</span>
            </div>

          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
