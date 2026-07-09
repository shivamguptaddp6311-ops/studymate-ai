import React, { useState, useEffect, useRef } from "react";
import { 
  Timer, Play, Pause, RotateCcw, Volume2, VolumeX, Eye, EyeOff, 
  Sparkles, Coffee, Clock, Info, Award
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface PomodoroProps {
  onAwardXP: (xp: number) => void;
  onIncrementPomodoro: () => void;
}

export default function Pomodoro({ onAwardXP, onIncrementPomodoro }: PomodoroProps) {
  // Timer durations
  const [studyMinutes, setStudyMinutes] = useState(25);
  const [breakMinutes, setBreakMinutes] = useState(5);

  const [timeLeft, setTimeLeft] = useState(25 * 60); // seconds
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);

  // Focus Mode toggle (minimalist distraction free mode)
  const [focusMode, setFocusMode] = useState(false);
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
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col justify-center items-center text-center space-y-6 min-h-[520px] bg-slate-950/95 border border-rose-500/10 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl"
          >
            {/* Ambient pulse effect backdrops */}
            <div className="absolute inset-0 bg-radial-gradient from-rose-500/10 via-transparent to-transparent pointer-events-none animate-pulse" />

            <div className="space-y-2 relative z-10">
              <span className="text-4xl animate-bounce inline-block">📵</span>
              <h2 className="text-sm font-black tracking-widest uppercase text-rose-500">Distraction-Free Focus Fortress</h2>
              <p className="text-xs text-slate-400 font-medium max-w-md mx-auto">
                StudyMate Shield is active. All peripheral alerts, push channels, and external applications are silenced.
              </p>
            </div>

            {/* Massive minimalist digital clock */}
            <h1 className="text-7xl md:text-8xl font-black font-mono tracking-tighter text-slate-100 animate-pulse relative z-10">
              {formatTime(timeLeft)}
            </h1>

            {/* Simulated Live Lockout Feeds */}
            <div className="grid grid-cols-2 gap-3 max-w-sm w-full bg-slate-900/40 p-4 rounded-2xl border border-slate-800/60 relative z-10 text-left">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] font-black text-slate-300">Social Apps</p>
                  <span className="text-[9px] text-rose-500 font-black block uppercase tracking-wider">🔒 Blocked</span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] font-black text-slate-300">Device Alerts</p>
                  <span className="text-[9px] text-rose-500 font-black block uppercase tracking-wider">🔇 Silenced</span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] font-black text-slate-300">Direct Calls</p>
                  <span className="text-[9px] text-rose-500 font-black block uppercase tracking-wider">🚫 Muted</span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] font-black text-slate-300">Push Services</p>
                  <span className="text-[9px] text-rose-500 font-black block uppercase tracking-wider">🔒 Intercepted</span>
                </div>
              </div>
            </div>

            {/* Quick operations */}
            <div className="flex items-center space-x-3.5 relative z-10">
              <button 
                onClick={handleToggle}
                className="px-6 py-2.5 bg-white hover:bg-slate-100 text-slate-900 rounded-xl text-xs font-black shadow transition cursor-pointer"
              >
                {isRunning ? "Pause Focus" : "Resume Focus"}
              </button>

              <button 
                onClick={() => {
                  playSound(400, 0.1);
                  setFocusMode(false);
                }}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-black border border-slate-800 transition cursor-pointer"
              >
                Exit Lockdown
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
