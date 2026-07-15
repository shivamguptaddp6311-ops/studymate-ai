import React, { useState, useEffect } from "react";
import { Alarm, UserProfile } from "../types";
import { 
  Bell, Plus, Volume2, ShieldAlert, Check, X, Clock, Trash2, 
  RefreshCw, Music, CheckCircle, Zap, ShieldCheck, HelpCircle, Eye, VolumeX
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// ====================================================
// BROWSER-NATIVE AUDIO SYNTHESIS ENGINE (REAL SOUND)
// ====================================================
let audioCtx: AudioContext | null = null;
let ringToneInterval: any = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
}

export function requestSpeakerAccess() {
  try {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") {
      ctx.resume();
    }
    // Play a dual-tone chord to verify speaker access
    playTone(523.25, 0.15); // C5
    setTimeout(() => playTone(659.25, 0.15), 150); // E5
    setTimeout(() => playTone(783.99, 0.3), 300); // G5
    return true;
  } catch (e) {
    console.warn("Failed to request speaker access:", e);
    return false;
  }
}

function playTone(freq: number, duration: number) {
  try {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    console.warn(e);
  }
}

export function startRingtonePlayback(ringtoneName: string) {
  try {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") {
      ctx.resume();
    }
    
    if (ringToneInterval) clearInterval(ringToneInterval);

    const triggerBeat = () => {
      if (ringtoneName === "Zen Harmonic") {
        playTone(523.25, 0.8); // C5
        setTimeout(() => playTone(659.25, 0.8), 250); // E5
        setTimeout(() => playTone(783.99, 1.2), 500); // G5
      } else if (ringtoneName === "Classic Bell") {
        playTone(880.00, 0.1); // Fast ring
        setTimeout(() => playTone(880.00, 0.1), 120);
        setTimeout(() => playTone(880.00, 0.1), 240);
      } else if (ringtoneName === "Cyberpunk Pulse") {
        playTone(180, 0.3); // Deep industrial thump
        setTimeout(() => playTone(180, 0.3), 400);
      } else {
        // Energetic Synth
        playTone(587.33, 0.2); // D5
        setTimeout(() => playTone(698.46, 0.2), 120); // F5
        setTimeout(() => playTone(880.00, 0.4), 240); // A5
      }
    };

    triggerBeat();
    ringToneInterval = setInterval(triggerBeat, 1800);
  } catch (e) {
    console.warn("Ringtone error:", e);
  }
}

export function stopRingtonePlayback() {
  if (ringToneInterval) {
    clearInterval(ringToneInterval);
    ringToneInterval = null;
  }
}

// Countdown time left calculator helper
function getRemainingTimeString(timestamp: number): string {
  const diff = timestamp - Date.now();
  if (diff <= 0) return "Triggering...";
  const secs = Math.floor(diff / 1000) % 60;
  const mins = Math.floor(diff / 60000) % 60;
  const hours = Math.floor(diff / 3600000);
  
  const hPart = hours > 0 ? `${hours}h ` : "";
  const mPart = mins > 0 ? `${mins}m ` : "";
  const sPart = `${secs}s`;
  return `${hPart}${mPart}${sPart}`;
}

interface AlarmsProps {
  alarms: Alarm[];
  profile: UserProfile;
  onAddAlarm: (
    time: string, 
    label: string, 
    subject: string, 
    repeatDays: number[], 
    ringtone: string, 
    vibration: boolean, 
    snoozeOption: boolean, 
    challengeMode: boolean,
    triggerTimestamp?: number
  ) => void;
  onToggleAlarm: (id: string) => void;
  onDeleteAlarm: (id: string) => void;
  onNavigate: (tab: string) => void;
  triggeredAlarm: Alarm | null;
  onClearTriggeredAlarm: () => void;
  onAwardXP: (xp: number) => void;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const RINGTONES = ["Zen Harmonic", "Classic Bell", "Cyberpunk Pulse", "Energetic Synth"];

export default function Alarms({
  alarms,
  profile,
  onAddAlarm,
  onToggleAlarm,
  onDeleteAlarm,
  onNavigate,
  triggeredAlarm,
  onClearTriggeredAlarm,
  onAwardXP
}: AlarmsProps) {
  const [showAdd, setShowAdd] = useState(false);
  
  // Custom Alarm subforms
  const [formTab, setFormTab] = useState<"standard" | "countdown">("standard");
  const [countdownHours, setCountdownHours] = useState(1);
  const [countdownMinutes, setCountdownMinutes] = useState(0);
  const [speakerAccess, setSpeakerAccess] = useState<"granted" | "prompt">(() => {
    // Check if AudioContext has already been instantiated and was active
    if (audioCtx && audioCtx.state === "running") return "granted";
    if (typeof window !== "undefined" && localStorage.getItem("studymate_permissions_requested") === "true") {
      return "granted";
    }
    return "prompt";
  });

  const [time, setTime] = useState("06:00");
  const [label, setLabel] = useState("");
  const [subject, setSubject] = useState("");
  const [repeatDays, setRepeatDays] = useState<number[]>([]);
  const [ringtone, setRingtone] = useState("Zen Harmonic");
  const [vibration, setVibration] = useState(true);
  const [snoozeOption, setSnoozeOption] = useState(true);
  const [challengeMode, setChallengeMode] = useState(true);

  // Active ring states
  const [currentChallenge, setCurrentChallenge] = useState<{ q: string; a: number }>({ q: "", a: 0 });
  const [userAnswer, setUserAnswer] = useState("");
  const [challengeError, setChallengeError] = useState("");
  const [showChallenge, setShowChallenge] = useState(false);

  // Sound play simulation
  const [playingAudio, setPlayingAudio] = useState(false);

  // Dynamic ticking state to count down remaining seconds
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (triggeredAlarm) {
      generateMathChallenge();
      setShowChallenge(true);
      setPlayingAudio(true);
      startRingtonePlayback(triggeredAlarm.ringtone);
    } else {
      stopRingtonePlayback();
    }
    return () => {
      stopRingtonePlayback();
    };
  }, [triggeredAlarm]);

  const generateMathChallenge = () => {
    const level = Math.floor(Math.random() * 3); // 0 = Easy, 1 = Med, 2 = Hard
    let num1 = 0, num2 = 0, num3 = 0, q = "", a = 0;

    if (level === 0) {
      num1 = Math.floor(Math.random() * 30) + 10;
      num2 = Math.floor(Math.random() * 30) + 10;
      q = `${num1} + ${num2}`;
      a = num1 + num2;
    } else if (level === 1) {
      num1 = Math.floor(Math.random() * 12) + 2;
      num2 = Math.floor(Math.random() * 12) + 2;
      q = `${num1} × ${num2}`;
      a = num1 * num2;
    } else {
      num1 = Math.floor(Math.random() * 15) + 5;
      num2 = Math.floor(Math.random() * 6) + 2;
      num3 = Math.floor(Math.random() * 20) + 5;
      q = `(${num1} × ${num2}) + ${num3}`;
      a = (num1 * num2) + num3;
    }

    setCurrentChallenge({ q, a });
    setUserAnswer("");
    setChallengeError("");
  };

  const handleSpeakerPermissionRequest = () => {
    const success = requestSpeakerAccess();
    if (success) {
      setSpeakerAccess("granted");
    } else {
      alert("Please ensure your volume is turned on and try again!");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (formTab === "countdown") {
      const totalMinutes = (countdownHours * 60) + countdownMinutes;
      if (totalMinutes < 1) {
        alert("Study timer must be at least 1 minute!");
        return;
      }
      if (totalMinutes > 2880) {
        alert("Study timer cannot exceed 48 hours (2880 minutes)!");
        return;
      }

      const triggerTimestamp = Date.now() + (totalMinutes * 60 * 1000);
      const targetDate = new Date(triggerTimestamp);
      const hoursStr = String(targetDate.getHours()).padStart(2, '0');
      const minsStr = String(targetDate.getMinutes()).padStart(2, '0');
      const targetHHMM = `${hoursStr}:${minsStr}`;

      onAddAlarm(
        targetHHMM,
        label || `Study Countdown Reminder (${countdownHours}h ${countdownMinutes}m)`,
        subject || profile.favoriteSubjects[0] || "General",
        [],
        ringtone,
        vibration,
        snoozeOption,
        challengeMode,
        triggerTimestamp
      );

      // Reset Form values
      setCountdownHours(1);
      setCountdownMinutes(0);
      setLabel("");
      setSubject("");
      setRingtone("Zen Harmonic");
      setVibration(true);
      setSnoozeOption(true);
      setChallengeMode(true);
      setShowAdd(false);
      return;
    }

    onAddAlarm(
      time,
      label || `${subject || "Study"} Alarm`,
      subject || profile.favoriteSubjects[0] || "General",
      repeatDays,
      ringtone,
      vibration,
      snoozeOption,
      challengeMode
    );

    // Reset Form values
    setTime("06:00");
    setLabel("");
    setSubject("");
    setRepeatDays([]);
    setRingtone("Zen Harmonic");
    setVibration(true);
    setSnoozeOption(true);
    setChallengeMode(true);
    setShowAdd(false);
  };

  const handleDayToggle = (dayIndex: number) => {
    if (repeatDays.includes(dayIndex)) {
      setRepeatDays(repeatDays.filter((d) => d !== dayIndex));
    } else {
      setRepeatDays([...repeatDays, dayIndex].sort());
    }
  };

  const handleDismissAttempt = () => {
    stopRingtonePlayback();
    if (triggeredAlarm?.challengeMode) {
      const parsedAns = parseInt(userAnswer.trim());
      if (parsedAns === currentChallenge.a) {
        // Success!
        setPlayingAudio(false);
        setShowChallenge(false);
        onClearTriggeredAlarm();
        onAwardXP(50); // XP bonus for solving challenge!
        
        // Custom feature: automatically redirect to today's study tasks
        onNavigate("tasks");
      } else {
        setChallengeError("Incorrect answer! Try again to turn off the alarm.");
        generateMathChallenge();
      }
    } else {
      // Direct dismiss
      setPlayingAudio(false);
      setShowChallenge(false);
      onClearTriggeredAlarm();
      onNavigate("tasks");
    }
  };

  const handleSnoozeAttempt = () => {
    stopRingtonePlayback();
    // Snoozes alarm by 5 minutes or directly dismisses
    setPlayingAudio(false);
    setShowChallenge(false);
    onClearTriggeredAlarm();
    alert("Alarm snoozed for 5 minutes.");
    onNavigate("tasks");
  };

  return (
    <div id="alarm_tab" className="space-y-6">

      {/* HEADER SECTION */}
      <div className="flex justify-between items-center bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm">
        <div className="space-y-1">
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center">
            <Bell className="w-6 h-6 text-indigo-500 mr-2" />
            Smart Alarm System
          </h1>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Wake up or get reminded to study your favorite subjects with math challenge mode.
          </p>
        </div>
        
        <button 
          onClick={() => setShowAdd(true)}
          className="flex items-center space-x-1 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-2xl text-xs font-bold shadow-md transition duration-200 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Alarm</span>
        </button>
      </div>

      {/* SPEAKER ACCESS PERMISSION CARD */}
      {speakerAccess === "prompt" && (
        <div className="bg-gradient-to-r from-amber-500/10 to-indigo-500/10 border border-amber-200/30 dark:border-indigo-800/20 p-5 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 bg-amber-500/10 text-amber-500 rounded-2xl">
              <Volume2 className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 flex items-center">
                Speaker & Audio Authorization
                <span className="ml-2 text-[8px] bg-indigo-500 text-white px-1.5 py-0.5 rounded font-mono uppercase tracking-wider">Required</span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-xl leading-relaxed">
                Browser security rules require explicit user engagement before audio can play. Enable speaker access to activate real-time Zen Harmonics and math challenge alarms!
              </p>
            </div>
          </div>
          <button
            onClick={handleSpeakerPermissionRequest}
            className="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-md transition duration-200 cursor-pointer flex items-center justify-center space-x-1.5 shrink-0"
          >
            <span>Activate Speaker</span>
            <CheckCircle className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ALARMS LISTING */}
      {alarms.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-12 rounded-3xl shadow-sm text-center">
          <span className="text-4xl block mb-3">⏰</span>
          <h3 className="font-bold text-slate-800 dark:text-slate-200">No alarms set</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">Create a repeating or custom alarm scheduled for your weak subjects.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {alarms.map((alarm) => (
            <div 
              key={alarm.id}
              className={`p-5 rounded-3xl border shadow-sm transition duration-200 flex flex-col justify-between ${
                alarm.isActive 
                  ? "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800/80" 
                  : "bg-slate-50/50 dark:bg-slate-900/30 border-slate-100 dark:border-slate-800/20 opacity-60"
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-4xl font-black tracking-tight text-slate-800 dark:text-slate-100 flex items-baseline gap-2">
                    {alarm.time}
                    {alarm.triggerTimestamp && (
                      <span className="text-[9px] bg-rose-500 text-white font-black uppercase px-1.5 py-0.5 rounded tracking-wider flex items-center">
                        <Clock className="w-2.5 h-2.5 mr-0.5" /> Timer
                      </span>
                    )}
                  </span>

                  {alarm.isActive && alarm.triggerTimestamp && (
                    <div className="text-[10px] text-amber-600 dark:text-amber-400 font-bold mt-1 bg-amber-500/5 px-2 py-0.5 rounded border border-amber-500/10 inline-block animate-pulse">
                      ⏳ Remaining: {getRemainingTimeString(alarm.triggerTimestamp)}
                    </div>
                  )}

                  <div className="flex items-center space-x-2 mt-2">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                      📚 {alarm.subject}
                    </span>
                    {alarm.challengeMode && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center">
                        <Zap className="w-2.5 h-2.5 mr-0.5" />
                        Math Solve Challenge
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-2">{alarm.label}</p>
                </div>

                {/* Switch Toggle */}
                <button 
                  onClick={() => onToggleAlarm(alarm.id)}
                  className={`w-11 h-6 rounded-full p-1 transition-colors duration-200 outline-none ${
                    alarm.isActive ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-800"
                  }`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform duration-200 ${
                    alarm.isActive ? "translate-x-5" : "translate-x-0"
                  }`} />
                </button>
              </div>

              {/* Repeat Days indicator */}
              <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/60 pt-4 mt-4">
                {alarm.triggerTimestamp ? (
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">
                    One-time Countdown Reminder
                  </span>
                ) : (
                  <div className="flex space-x-1">
                    {WEEKDAYS.map((day, idx) => {
                      const isRepeating = alarm.repeatDays.includes(idx);
                      return (
                        <span 
                          key={day} 
                          className={`text-[9px] font-bold w-6 h-6 flex items-center justify-center rounded-full border ${
                            isRepeating 
                              ? "bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-400" 
                              : "bg-transparent border-transparent text-slate-400"
                          }`}
                        >
                          {day[0]}
                        </span>
                      );
                    })}
                  </div>
                )}

                <div className="flex items-center space-x-1">
                  <span className="text-[9px] font-mono text-slate-400 mr-2 flex items-center">
                    <Music className="w-2.5 h-2.5 mr-0.5" /> {alarm.ringtone}
                  </span>
                  <button 
                    onClick={() => onDeleteAlarm(alarm.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TRIGGRED MATH CHALLENGE POPUP INTERACTION */}
      {showChallenge && triggeredAlarm && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-6 text-center space-y-6 border border-slate-200 dark:border-slate-800"
          >
            <div className="flex flex-col items-center space-y-2">
              <div className="p-4 bg-amber-500/10 text-amber-500 rounded-full animate-bounce">
                <Bell className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">Study Alarm Ringing!</h2>
              <span className="text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                🔔 Subject: {triggeredAlarm.subject}
              </span>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">"{triggeredAlarm.label}"</p>
              {playingAudio && (
                <span className="text-[10px] text-emerald-500 font-bold flex items-center animate-pulse justify-center">
                  <Volume2 className="w-3.5 h-3.5 mr-1 text-emerald-500" /> Ringing: {triggeredAlarm.ringtone}...
                </span>
              )}
            </div>

            {triggeredAlarm.challengeMode ? (
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 text-center space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-center">
                  <ShieldAlert className="w-4 h-4 text-amber-500 mr-1.5" />
                  WAKE UP CHALLENGE (Solve to dismiss)
                </h3>
                <p className="text-3xl font-black tracking-tight text-slate-800 dark:text-slate-100 my-2">
                  {currentChallenge.q} = ?
                </p>
                <div className="flex space-x-2">
                  <input 
                    type="number" 
                    placeholder="Enter answer"
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 text-center font-bold text-lg outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleDismissAttempt()}
                    autoFocus
                  />
                  <button 
                    onClick={generateMathChallenge}
                    className="p-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 rounded-xl transition cursor-pointer"
                    title="Generate new question"
                  >
                    <RefreshCw className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  </button>
                </div>
                {challengeError && <p className="text-xs text-rose-500 font-bold">{challengeError}</p>}
                <p className="text-[10px] text-slate-400">Answer correctly to unlock study routines. Solving awards <strong>+50 XP</strong> bonus!</p>
              </div>
            ) : (
              <p className="text-xs text-slate-500">Press the button below to shut off the alert and study.</p>
            )}

            <div className="flex space-x-3">
              {triggeredAlarm.snoozeOption && (
                <button 
                  onClick={handleSnoozeAttempt}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-sm rounded-xl transition cursor-pointer"
                >
                  Snooze (5m)
                </button>
              )}
              <button 
                onClick={handleDismissAttempt}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl shadow-md transition cursor-pointer"
              >
                Dismiss Alarm
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ADD ALARM DIALOG POPUP */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-xl overflow-hidden border border-slate-100 dark:border-slate-800">
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-lg">Create Alarm Reminders</h3>
                <button onClick={() => setShowAdd(false)} className="p-1 text-slate-400 hover:bg-slate-100 rounded-full cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form switcher tabs */}
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setFormTab("standard")}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                    formTab === "standard"
                      ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  ⏰ Daily Scheduled
                </button>
                <button
                  type="button"
                  onClick={() => setFormTab("countdown")}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                    formTab === "countdown"
                      ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  ⏳ Study Timer (1m - 48h)
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* Standard time picker vs Countdown hour picker */}
                {formTab === "standard" ? (
                  <div className="flex flex-col items-center justify-center py-2 bg-slate-50 dark:bg-slate-800/20 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Set Time</label>
                    <input 
                      type="time" 
                      className="text-4xl font-black bg-transparent border-none text-slate-800 dark:text-slate-100 text-center outline-none"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      required
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-4 py-3 px-4 bg-slate-50 dark:bg-slate-800/20 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <div className="text-center">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Hours</label>
                        <input 
                          type="number" 
                          min="0" 
                          max="48"
                          className="w-full text-3xl font-black bg-transparent text-slate-800 dark:text-slate-100 text-center outline-none"
                          value={countdownHours}
                          onChange={(e) => setCountdownHours(Math.max(0, Math.min(48, parseInt(e.target.value) || 0)))}
                        />
                      </div>
                      <div className="text-center">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Minutes</label>
                        <input 
                          type="number" 
                          min="0" 
                          max="59"
                          className="w-full text-3xl font-black bg-transparent text-slate-800 dark:text-slate-100 text-center outline-none"
                          value={countdownMinutes}
                          onChange={(e) => setCountdownMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                        />
                      </div>
                    </div>
                    {(() => {
                      const totalMinutes = (countdownHours * 60) + countdownMinutes;
                      if (totalMinutes > 0) {
                        const targetTime = new Date(Date.now() + totalMinutes * 60000);
                        return (
                          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 text-center font-bold">
                            🔔 Triggers at: {targetTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} 
                            {targetTime.getDate() !== new Date().getDate() ? " tomorrow" : " today"} ({totalMinutes} minutes from now)
                          </p>
                        );
                      }
                      return (
                        <p className="text-[10px] text-rose-500 text-center font-bold">
                          Timer must be between 1 minute and 48 hours.
                        </p>
                      );
                    })()}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Subject</label>
                    <select
                      className="w-full px-3 py-2 text-sm border rounded-xl border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 outline-none"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                    >
                      <option value="">Select subject...</option>
                      {profile.favoriteSubjects.map((sub) => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                      <option value="General">General</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Alarm Label</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Break / Mock Revision"
                      className="w-full px-3 py-2 text-sm border rounded-xl border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 outline-none"
                      value={label}
                      onChange={(e) => setLabel(e.target.value)}
                    />
                  </div>
                </div>

                {/* Repeat options (Standard only) */}
                {formTab === "standard" && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Repeat Days</label>
                    <div className="flex justify-between">
                      {WEEKDAYS.map((day, idx) => {
                        const selected = repeatDays.includes(idx);
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => handleDayToggle(idx)}
                            className={`w-9 h-9 flex items-center justify-center text-xs font-bold rounded-xl border transition ${
                              selected 
                                ? "bg-indigo-600 border-indigo-600 text-white shadow-sm" 
                                : "bg-white dark:bg-slate-950 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800"
                            }`}
                          >
                            {day[0]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Alarm Sound Tone</label>
                    <select
                      className="w-full px-3 py-2 text-sm border rounded-xl border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 outline-none"
                      value={ringtone}
                      onChange={(e) => setRingtone(e.target.value)}
                    >
                      {RINGTONES.map((rt) => (
                        <option key={rt} value={rt}>{rt}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col justify-end space-y-2">
                    <label className="flex items-center space-x-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={vibration}
                        onChange={(e) => setVibration(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600"
                      />
                      <span>Vibration Mode</span>
                    </label>
                    <label className="flex items-center space-x-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={snoozeOption}
                        onChange={(e) => setSnoozeOption(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600"
                      />
                      <span>Enable Snooze</span>
                    </label>
                  </div>
                </div>

                {/* Challenge toggle */}
                <div className="p-3 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start space-x-3.5">
                  <input 
                    type="checkbox" 
                    id="chalMode"
                    className="mt-1 accent-indigo-600 rounded"
                    checked={challengeMode}
                    onChange={(e) => setChallengeMode(e.target.checked)}
                  />
                  <div>
                    <label htmlFor="chalMode" className="block text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                      Activate Math Solver Wake-Up Challenge
                    </label>
                    <p className="text-[10px] text-slate-500 leading-normal mt-0.5">
                      Forces you to calculate a random algebraic equation on-screen before you can dismiss the alarm. Best for overcoming morning grogginess!
                    </p>
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl shadow-md transition cursor-pointer"
                >
                  Create Study Timer (+10 XP)
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
