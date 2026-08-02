import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Clock, Play, Pause, RotateCcw, ShieldAlert, Sparkles, CheckCircle2, Lock } from "lucide-react";

interface FocusSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSubject?: string;
  activeChapter?: string;
  onCompleteFocusSession: (subject: string, chapter: string, durationMinutes: number) => void;
}

export function FocusSessionModal({
  isOpen,
  onClose,
  activeSubject = "Physics",
  activeChapter = "Electrostatics",
  onCompleteFocusSession
}: FocusSessionModalProps) {
  const [subject, setSubject] = useState(activeSubject);
  const [chapter, setChapter] = useState(activeChapter);
  const [durationMinutes, setDurationMinutes] = useState(25);
  const [remainingSeconds, setRemainingSeconds] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    setRemainingSeconds(durationMinutes * 60);
  }, [durationMinutes]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRunning && remainingSeconds > 0) {
      interval = setInterval(() => {
        setRemainingSeconds((prev) => prev - 1);
      }, 1000);
    } else if (remainingSeconds === 0 && isRunning) {
      setIsRunning(false);
      setIsCompleted(true);
      onCompleteFocusSession(subject, chapter, durationMinutes);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, remainingSeconds, durationMinutes, subject, chapter, onCompleteFocusSession]);

  if (!isOpen) return null;

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleReset = () => {
    setIsRunning(false);
    setIsCompleted(false);
    setRemainingSeconds(durationMinutes * 60);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-slate-900 text-white border border-slate-800 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl p-6 text-center space-y-6 relative"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Session Header */}
          <div>
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-black uppercase mb-2">
              <Lock className="w-3.5 h-3.5" />
              <span>Focused Study Session</span>
            </div>
            <h3 className="text-xl font-black">{subject}</h3>
            <p className="text-xs text-slate-400 font-medium">{chapter}</p>
          </div>

          {/* Timer Display Circle */}
          <div className="relative w-48 h-48 mx-auto flex flex-col items-center justify-center rounded-full border-4 border-indigo-500/30 bg-slate-950/80 shadow-[0_0_50px_rgba(99,102,241,0.2)]">
            <span className="text-4xl font-mono font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
              {formatTime(remainingSeconds)}
            </span>
            <span className="text-[10px] font-bold text-slate-500 uppercase mt-1">
              {isRunning ? "Deep Focus Mode" : isCompleted ? "Session Done!" : "Ready to Start"}
            </span>
          </div>

          {/* Duration Selector */}
          {!isRunning && !isCompleted && (
            <div className="flex items-center justify-center space-x-2">
              {[15, 25, 45, 60].map((mins) => (
                <button
                  key={mins}
                  onClick={() => setDurationMinutes(mins)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                    durationMinutes === mins
                      ? "bg-indigo-600 text-white shadow-md"
                      : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                  }`}
                >
                  {mins}m
                </button>
              ))}
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center justify-center space-x-3 pt-2">
            {!isCompleted ? (
              <>
                <button
                  onClick={() => setIsRunning(!isRunning)}
                  className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center space-x-2 transition cursor-pointer shadow-lg ${
                    isRunning
                      ? "bg-amber-500 hover:bg-amber-600 text-slate-950"
                      : "bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
                  }`}
                >
                  {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                  <span>{isRunning ? "Pause Session" : "Start Focus Timer"}</span>
                </button>

                <button
                  onClick={handleReset}
                  className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl transition cursor-pointer"
                  title="Reset Timer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </>
            ) : (
              <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs space-y-2 w-full">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400" />
                <p className="font-bold">Great study session! {durationMinutes} minutes recorded.</p>
                <button
                  onClick={onClose}
                  className="w-full py-2 bg-emerald-500 text-slate-950 font-black rounded-xl text-xs uppercase"
                >
                  Return to AI Assistant
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
