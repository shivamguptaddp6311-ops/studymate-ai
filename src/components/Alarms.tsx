import React, { useState, useEffect } from "react";
import { Alarm, UserProfile } from "../types";
import { 
  GlassCard, HeroCard, QuickActionCard, ProgressCard, AnalyticsCard, 
  AchievementCard, AICard, TimelineCard, EmptyStateCard, PremiumButton, 
  PremiumInput, PremiumDialog, PremiumBottomSheet, PremiumIcon, PremiumCard 
} from "./PremiumUI";
import { 
  Bell, Plus, Volume2, ShieldAlert, Check, X, Clock, Trash2, 
  RefreshCw, Music, CheckCircle, Zap, ShieldCheck, HelpCircle, 
  Eye, VolumeX, Flame, Activity, Sparkles, ChevronDown, ChevronUp, 
  Sliders, Calendar, AlertCircle, Info, Star, ChevronRight
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

// Helper to determine next trigger timestamp
function calculateNextAlarmOccurrence(alarm: Alarm): number {
  if (!alarm.isActive) return Infinity;
  if (alarm.triggerTimestamp) {
    return alarm.triggerTimestamp > Date.now() ? alarm.triggerTimestamp : Infinity;
  }

  const [hoursStr, minutesStr] = alarm.time.split(":");
  const hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);

  const now = new Date();
  const target = new Date();
  target.setHours(hours, minutes, 0, 0);

  if (alarm.repeatDays && alarm.repeatDays.length > 0) {
    let minDiffMs = Infinity;
    const currentDay = now.getDay(); // 0 = Sun, 1 = Mon ...

    alarm.repeatDays.forEach((dayIndex) => {
      let daysToAdd = dayIndex - currentDay;
      if (daysToAdd < 0 || (daysToAdd === 0 && target.getTime() <= now.getTime())) {
        daysToAdd += 7;
      }
      const dayTarget = new Date(target.getTime());
      dayTarget.setDate(dayTarget.getDate() + daysToAdd);
      const diff = dayTarget.getTime() - now.getTime();
      if (diff < minDiffMs) {
        minDiffMs = diff;
      }
    });

    return now.getTime() + minDiffMs;
  } else {
    if (target.getTime() <= now.getTime()) {
      target.setDate(target.getDate() + 1);
    }
    return target.getTime();
  }
}

interface CalculatedNextOccurrence {
  alarm: Alarm;
  nextTriggerMs: number;
  timeString: string;
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
    triggerTimestamp?: number,
    priority?: "High" | "Medium" | "Low",
    color?: string
  ) => void;
  onToggleAlarm: (id: string) => void;
  onDeleteAlarm: (id: string) => void;
  onUpdateAlarm?: (id: string, updates: Partial<Alarm>) => void;
  onNavigate: (tab: string) => void;
  triggeredAlarm: Alarm | null;
  onClearTriggeredAlarm: () => void;
  onAwardXP: (xp: number) => void;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const RINGTONES = ["Zen Harmonic", "Classic Bell", "Cyberpunk Pulse", "Energetic Synth"];

// Theme colors list for customizing glass card visual rings
const ALARM_COLORS = [
  { name: "indigo", value: "from-indigo-500 to-purple-500", border: "border-indigo-100 dark:border-indigo-900/30", text: "text-indigo-500", glow: "shadow-indigo-500/10" },
  { name: "rose", value: "from-rose-500 to-pink-500", border: "border-rose-100 dark:border-rose-900/30", text: "text-rose-500", glow: "shadow-rose-500/10" },
  { name: "emerald", value: "from-emerald-500 to-teal-500", border: "border-emerald-100 dark:border-emerald-900/30", text: "text-emerald-500", glow: "shadow-emerald-500/10" },
  { name: "amber", value: "from-amber-500 to-orange-500", border: "border-amber-100 dark:border-amber-900/30", text: "text-amber-500", glow: "shadow-amber-500/10" },
  { name: "violet", value: "from-violet-500 to-fuchsia-500", border: "border-violet-100 dark:border-violet-900/30", text: "text-violet-500", glow: "shadow-violet-500/10" },
  { name: "sky", value: "from-sky-500 to-cyan-500", border: "border-sky-100 dark:border-sky-900/30", text: "text-sky-500", glow: "shadow-sky-500/10" }
];

export default function Alarms({
  alarms,
  profile,
  onAddAlarm,
  onToggleAlarm,
  onDeleteAlarm,
  onUpdateAlarm,
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
  const [selectedPriority, setSelectedPriority] = useState<"High" | "Medium" | "Low">("Medium");
  const [selectedColor, setSelectedColor] = useState<string>("indigo");

  // Active challenge state for alarm firing
  const [currentChallenge, setCurrentChallenge] = useState<{ q: string; a: number }>({ q: "", a: 0 });
  const [userAnswer, setUserAnswer] = useState("");
  const [challengeError, setChallengeError] = useState("");
  const [showChallenge, setShowChallenge] = useState(false);
  const [playingAudio, setPlayingAudio] = useState(false);

  // Dynamic ticking state to trigger countdown UI refreshes smoothly
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
        label || `Countdown (${countdownHours}h ${countdownMinutes}m)`,
        subject || profile.favoriteSubjects[0] || "General",
        [],
        ringtone,
        vibration,
        snoozeOption,
        challengeMode,
        triggerTimestamp,
        selectedPriority,
        selectedColor
      );

      // Reset values
      setCountdownHours(1);
      setCountdownMinutes(0);
      setLabel("");
      setSubject("");
      setRingtone("Zen Harmonic");
      setVibration(true);
      setSnoozeOption(true);
      setChallengeMode(true);
      setSelectedPriority("Medium");
      setSelectedColor("indigo");
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
      challengeMode,
      undefined,
      selectedPriority,
      selectedColor
    );

    // Reset values
    setTime("06:00");
    setLabel("");
    setSubject("");
    setRepeatDays([]);
    setRingtone("Zen Harmonic");
    setVibration(true);
    setSnoozeOption(true);
    setChallengeMode(true);
    setSelectedPriority("Medium");
    setSelectedColor("indigo");
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
      const parsedAns = parseInt(userAnswer.trim(), 10);
      if (parsedAns === currentChallenge.a) {
        setPlayingAudio(false);
        setShowChallenge(false);
        onClearTriggeredAlarm();
        onAwardXP(50); // XP bonus for solving challenge!
        onNavigate("tasks");
      } else {
        setChallengeError("Incorrect answer! Solve equations to quiet the buzzer.");
        generateMathChallenge();
      }
    } else {
      setPlayingAudio(false);
      setShowChallenge(false);
      onClearTriggeredAlarm();
      onNavigate("tasks");
    }
  };

  const handleSnoozeAttempt = () => {
    stopRingtonePlayback();
    setPlayingAudio(false);
    setShowChallenge(false);
    onClearTriggeredAlarm();
    alert("Alarm snoozed for 5 minutes.");
    onNavigate("tasks");
  };

  // Sound Audition tester in standard Bottom Sheet form
  const playAuditionTone = () => {
    try {
      const ctx = getAudioContext();
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      if (ringtone === "Zen Harmonic") {
        playTone(523.25, 0.4);
        setTimeout(() => playTone(659.25, 0.4), 150);
        setTimeout(() => playTone(783.99, 0.6), 300);
      } else if (ringtone === "Classic Bell") {
        playTone(880.00, 0.08);
        setTimeout(() => playTone(880.00, 0.08), 80);
        setTimeout(() => playTone(880.00, 0.08), 160);
      } else if (ringtone === "Cyberpunk Pulse") {
        playTone(180, 0.2);
        setTimeout(() => playTone(180, 0.2), 200);
      } else {
        playTone(587.33, 0.15);
        setTimeout(() => playTone(698.46, 0.15), 80);
        setTimeout(() => playTone(880.00, 0.3), 160);
      }
    } catch (e) {
      console.warn("Audition preview blocked:", e);
    }
  };

  // Helper to color code tags based on selection
  const getColorClasses = (colorName: string) => {
    const item = ALARM_COLORS.find(c => c.name === colorName) || ALARM_COLORS[0];
    return item;
  };

  // Compute Next Upcoming Alarm Hero details
  const getNextUpcomingAlarm = (): CalculatedNextOccurrence | null => {
    const activeAlarms = alarms.filter(a => a.isActive);
    if (activeAlarms.length === 0) return null;

    let closestAlarm: Alarm | null = null;
    let minDiff = Infinity;

    activeAlarms.forEach((alarm) => {
      const nextTime = calculateNextAlarmOccurrence(alarm);
      const diff = nextTime - Date.now();
      if (diff > 0 && diff < minDiff) {
        minDiff = diff;
        closestAlarm = alarm;
      }
    });

    if (!closestAlarm) return null;

    // Build occurrence details
    const timeVal = (closestAlarm as Alarm).time;
    const [hStr, mStr] = timeVal.split(":");
    const hr = parseInt(hStr, 10);
    const min = parseInt(mStr, 10);
    const ampm = hr >= 12 ? "PM" : "AM";
    const hr12 = hr % 12 === 0 ? 12 : hr % 12;
    const displayTimeStr = `${String(hr12).padStart(2, "0")}:${String(min).padStart(2, "0")} ${ampm}`;

    return {
      alarm: closestAlarm,
      nextTriggerMs: Date.now() + minDiff,
      timeString: (closestAlarm as Alarm).triggerTimestamp ? "Study Countdown Timer" : displayTimeStr
    };
  };

  const nextUpcoming = getNextUpcomingAlarm();

  // Organize alarms into categories
  const classifyAlarms = () => {
    const categories: {
      today: Alarm[];
      tomorrow: Alarm[];
      upcoming: Alarm[];
      completed: Alarm[];
    } = {
      today: [],
      tomorrow: [],
      upcoming: [],
      completed: []
    };

    const now = new Date();
    const todayDay = now.getDate();
    const tomorrowDate = new Date();
    tomorrowDate.setDate(now.getDate() + 1);
    const tomorrowDay = tomorrowDate.getDate();

    alarms.forEach((alarm) => {
      if (!alarm.isActive) {
        categories.completed.push(alarm);
        return;
      }

      const triggerTimeMs = calculateNextAlarmOccurrence(alarm);
      if (triggerTimeMs === Infinity) {
        categories.completed.push(alarm);
        return;
      }

      const triggerDate = new Date(triggerTimeMs);
      if (triggerDate.getDate() === todayDay && triggerDate.getMonth() === now.getMonth()) {
        categories.today.push(alarm);
      } else if (triggerDate.getDate() === tomorrowDay && triggerDate.getMonth() === tomorrowDate.getMonth()) {
        categories.tomorrow.push(alarm);
      } else {
        categories.upcoming.push(alarm);
      }
    });

    return categories;
  };

  const groupedAlarms = classifyAlarms();

  // Alarms Stats
  const activeCount = alarms.filter(a => a.isActive).length;
  const inactiveCount = alarms.filter(a => !a.isActive).length;
  const challengeModeActiveCount = alarms.filter(a => a.isActive && a.challengeMode).length;
  const studyStreakVal = profile.streakCounter || 5;

  return (
    <div id="smart_alarm_tab" className="space-y-6 select-none">
      
      {/* 1. TOP TITLE ROW */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-3xl shadow-sm gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-xl">
              <Bell className="w-5 h-5 animate-pulse text-indigo-500" />
            </div>
            <h1 className="text-lg md:text-xl font-bold text-slate-800 dark:text-slate-100 font-display">
              Study Reminders & Clock
            </h1>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-normal">
            Keep your schedule highly optimized. Tap "New Alarm" to program reminders with math puzzles.
          </p>
        </div>
        
        <button 
          id="btn_add_alarm_trigger"
          onClick={() => setShowAdd(true)}
          className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-md transition duration-200 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Alarm</span>
        </button>
      </div>

      {/* 2. SYSTEM AUDIO AUTH CARD */}
      {speakerAccess === "prompt" && (
        <div className="bg-gradient-to-r from-amber-500/15 to-indigo-500/15 border border-amber-200/40 dark:border-indigo-800/25 p-5 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 opacity-10 translate-x-12 -translate-y-6 pointer-events-none">
            <Volume2 className="w-32 h-32" />
          </div>
          <div className="flex items-start space-x-3 relative z-10">
            <div className="p-3 bg-amber-500/10 text-amber-500 rounded-2xl shrink-0 mt-0.5">
              <Volume2 className="w-5 h-5 animate-bounce" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center">
                Speaker Permission Authorization
                <span className="ml-2 text-[8px] bg-indigo-500 text-white px-2 py-0.5 rounded font-mono uppercase font-black tracking-widest">Urgent</span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xl leading-relaxed font-normal">
                Browser security rules mandate an active user engagement before audio triggers can fire dynamically. Grant speaker authorization below to test Zen tones, synth alerts, and math bypasses.
              </p>
            </div>
          </div>
          <button
            id="btn_request_speaker"
            onClick={handleSpeakerPermissionRequest}
            className="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-sm transition duration-200 cursor-pointer flex items-center justify-center space-x-1 shrink-0 relative z-10"
          >
            <span>Activate Audio Nodes</span>
            <Check className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 3. HERO CORNER - NEXT UPCOMING ALARM CARD */}
      {nextUpcoming ? (
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-3xl shadow-xl border border-indigo-500/20 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="absolute left-0 top-0 w-full h-full bg-radial-gradient from-indigo-500/5 to-transparent pointer-events-none" />
          
          <div className="space-y-4 relative z-10 text-center md:text-left flex-1">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-white/10 rounded-full border border-white/10 backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-indigo-200">
                Next Scheduled Study Reminder
              </span>
            </div>

            <div className="space-y-1">
              <div className="text-4xl md:text-5xl font-black font-display tracking-tight text-white drop-shadow-sm flex items-baseline justify-center md:justify-start gap-2">
                <span>{nextUpcoming.timeString}</span>
                <span className="text-xs bg-indigo-500/25 border border-indigo-400/30 px-2 py-0.5 rounded-md text-indigo-300 font-semibold font-mono uppercase">
                  {nextUpcoming.alarm.subject}
                </span>
              </div>
              <p className="text-xs text-indigo-200 font-medium">
                ⏱️ Inactive timer ticking: <strong className="font-mono text-white animate-pulse">{getRemainingTimeString(nextUpcoming.nextTriggerMs)}</strong>
              </p>
            </div>

            <div className="text-[11px] text-slate-350 max-w-md leading-relaxed font-normal">
              Purpose: <strong className="text-white">"{nextUpcoming.alarm.label || "Daily exam preparation schedule"}"</strong>. This reminder requires solving a custom {nextUpcoming.alarm.challengeMode ? "Math wake-up equation" : "standard bypass"} to silence.
            </div>
          </div>

          <div className="relative shrink-0 flex flex-col items-center justify-center p-3 z-10 w-full md:w-auto">
            {/* Pulsing clock decorative graphic element */}
            <div className="relative w-28 h-28 flex items-center justify-center">
              <div className="absolute inset-0 bg-indigo-500/10 rounded-full animate-ping pointer-events-none" />
              <div className="absolute inset-2 bg-indigo-500/20 rounded-full animate-pulse pointer-events-none" />
              <div className="w-20 h-20 rounded-full bg-slate-800/80 border border-indigo-500/40 backdrop-blur-xl flex flex-col items-center justify-center shadow-lg">
                <Clock className="w-8 h-8 text-indigo-400 animate-pulse mb-0.5" />
                <span className="text-[8px] font-bold text-slate-400 font-mono tracking-wider uppercase">Armed</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <EmptyStateCard
          icon={<Clock className="w-8 h-8 text-indigo-500" />}
          title="No Active Alarms or Wake-Up Math Challenges"
          description="Never miss an early morning study session or exam drill. Arm a smart alarm with math challenge protection to stay disciplined."
          motivationalQuote="Your future is created by what you do today, not tomorrow. — Robert Kiyosaki"
          aiSuggestions={[
            "6:00 AM Morning Study Session",
            "7:30 AM CBSE Formula Drill",
            "5:00 PM Homework Sprint",
            "10:00 PM Bedtime Wind-down"
          ]}
          onSelectSuggestion={(sug) => {
            setShowAdd(true);
          }}
          action={{
            label: "+ Create Your First Alarm",
            onClick: () => setShowAdd(true)
          }}
        />
      )}

      {/* 4. STATISTICS & STUDY STREAK BENTO GRIDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        <div className="bg-white/50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 p-4 rounded-3xl shadow-sm text-left flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Active Stream</span>
            <Bell className="w-4 h-4 text-indigo-500 shrink-0" />
          </div>
          <div className="space-y-1 pt-3">
            <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono">{activeCount}</div>
            <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Active Reminders Guarded</div>
          </div>
        </div>

        <div className="bg-white/50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 p-4 rounded-3xl shadow-sm text-left flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Study Streak</span>
            <Flame className="w-4 h-4 text-rose-500 shrink-0 animate-bounce" />
          </div>
          <div className="space-y-1 pt-3">
            <div className="text-2xl font-black text-rose-500 font-mono">{studyStreakVal} Days</div>
            <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">CBSE Wake-up streak</div>
          </div>
        </div>

        <div className="bg-white/50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 p-4 rounded-3xl shadow-sm text-left flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Challenge Ratio</span>
            <Zap className="w-4 h-4 text-amber-500 shrink-0" />
          </div>
          <div className="space-y-1 pt-3">
            <div className="text-2xl font-black text-amber-500 font-mono">
              {activeCount > 0 ? Math.round((challengeModeActiveCount / activeCount) * 100) : 0}%
            </div>
            <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Math solver protected</div>
          </div>
        </div>

        <div className="bg-white/50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 p-4 rounded-3xl shadow-sm text-left flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Bypassed</span>
            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
          </div>
          <div className="space-y-1 pt-3">
            <div className="text-2xl font-black text-emerald-500 font-mono">{inactiveCount} Alarms</div>
            <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Completed / Off</div>
          </div>
        </div>

      </div>

      {/* 5. DRAG-FREE INTELLIGENT ALARM SECTION LISTINGS */}
      {alarms.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-12 rounded-3xl shadow-sm text-center">
          <span className="text-4xl block mb-2">⏰</span>
          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Prism Study Alarms Empty</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto font-normal leading-relaxed">
            Configure alarms matching your JEE/NEET classes or general CBSE study slots to get custom reminders.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* Today's Section */}
          {groupedAlarms.today.length > 0 && (
            <div className="space-y-3.5">
              <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800/80 pb-2">
                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Today's Scheduled Reminders
                </h3>
                <span className="text-[9px] font-black font-mono bg-slate-100 dark:bg-slate-850 text-slate-400 px-2 py-0.5 rounded-full">
                  {groupedAlarms.today.length}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {groupedAlarms.today.map((alarm, idx) => (
                  <AlarmCircularCard 
                    key={`today-${alarm.id}-${idx}`} 
                    alarm={alarm} 
                    onToggle={onToggleAlarm} 
                    onDelete={onDeleteAlarm} 
                    colorClass={getColorClasses(alarm.color || "indigo")} 
                  />
                ))}
              </div>
            </div>
          )}

          {/* Tomorrow Section */}
          {groupedAlarms.tomorrow.length > 0 && (
            <div className="space-y-3.5">
              <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800/80 pb-2">
                <div className="w-2 h-2 rounded-full bg-sky-500" />
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Tomorrow's Reminders
                </h3>
                <span className="text-[9px] font-black font-mono bg-slate-100 dark:bg-slate-850 text-slate-400 px-2 py-0.5 rounded-full">
                  {groupedAlarms.tomorrow.length}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {groupedAlarms.tomorrow.map((alarm, idx) => (
                  <AlarmCircularCard 
                    key={`tomorrow-${alarm.id}-${idx}`} 
                    alarm={alarm} 
                    onToggle={onToggleAlarm} 
                    onDelete={onDeleteAlarm} 
                    colorClass={getColorClasses(alarm.color || "indigo")} 
                  />
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Section */}
          {groupedAlarms.upcoming.length > 0 && (
            <div className="space-y-3.5">
              <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800/80 pb-2">
                <div className="w-2 h-2 rounded-full bg-violet-500" />
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Upcoming Repeating Alarms
                </h3>
                <span className="text-[9px] font-black font-mono bg-slate-100 dark:bg-slate-850 text-slate-400 px-2 py-0.5 rounded-full">
                  {groupedAlarms.upcoming.length}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {groupedAlarms.upcoming.map((alarm, idx) => (
                  <AlarmCircularCard 
                    key={`upcoming-${alarm.id}-${idx}`} 
                    alarm={alarm} 
                    onToggle={onToggleAlarm} 
                    onDelete={onDeleteAlarm} 
                    colorClass={getColorClasses(alarm.color || "indigo")} 
                  />
                ))}
              </div>
            </div>
          )}

          {/* Completed / Inactive Section */}
          {groupedAlarms.completed.length > 0 && (
            <div className="space-y-3.5">
              <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800/80 pb-2">
                <div className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-600" />
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Completed & Inactive Reminders
                </h3>
                <span className="text-[9px] font-black font-mono bg-slate-100 dark:bg-slate-850 text-slate-400 px-2 py-0.5 rounded-full">
                  {groupedAlarms.completed.length}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {groupedAlarms.completed.map((alarm, idx) => (
                  <AlarmCircularCard 
                    key={`completed-${alarm.id}-${idx}`} 
                    alarm={alarm} 
                    onToggle={onToggleAlarm} 
                    onDelete={onDeleteAlarm} 
                    colorClass={getColorClasses(alarm.color || "indigo")} 
                  />
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* 6. TRIGGRED MATH CHALLENGE FULL SCREEN INTERACTION POPUP */}
      <AnimatePresence>
        {showChallenge && triggeredAlarm && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-6 text-center space-y-5 border border-slate-150 dark:border-slate-800"
            >
              <div className="flex flex-col items-center space-y-2 relative">
                {/* Decorative glowing backplate */}
                <div className="absolute top-0 w-24 h-24 bg-rose-500/10 rounded-full animate-ping pointer-events-none" />
                
                <div className="p-4 bg-rose-500/15 text-rose-500 rounded-full animate-bounce relative z-10">
                  <Bell className="w-8 h-8" />
                </div>
                
                <h2 className="text-lg md:text-xl font-bold text-slate-850 dark:text-slate-100 font-display">
                  Active Study Alert Triggered!
                </h2>
                <div className="flex items-center space-x-1.5 justify-center">
                  <span className="text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider">
                    📕 Subject: {triggeredAlarm.subject}
                  </span>
                  <span className="text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider">
                    ⏰ {triggeredAlarm.time}
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  "{triggeredAlarm.label || "Study schedule reminder"}"
                </p>
                {playingAudio && (
                  <span className="text-[10px] text-emerald-500 font-bold flex items-center animate-pulse justify-center">
                    <Volume2 className="w-3.5 h-3.5 mr-1" /> Playing Tone: <strong className="font-mono text-xs text-emerald-500 ml-1">{triggeredAlarm.ringtone}</strong>
                  </span>
                )}
              </div>

              {triggeredAlarm.challengeMode ? (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 text-center space-y-3 shadow-inner">
                  <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-amber-600 flex items-center justify-center">
                    <ShieldAlert className="w-4 h-4 text-amber-500 mr-1.5" />
                    WAKE UP CHALLENGE (Solve to Quiet)
                  </h3>
                  <p className="text-3xl font-black tracking-tight text-slate-800 dark:text-slate-100 font-mono my-1">
                    {currentChallenge.q} = ?
                  </p>
                  
                  <div className="flex space-x-2">
                    <input 
                      type="number" 
                      placeholder="Enter solution"
                      className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-center font-bold text-lg outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleDismissAttempt()}
                      autoFocus
                    />
                    <button 
                      onClick={generateMathChallenge}
                      className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition cursor-pointer shrink-0"
                      title="New challenge equation"
                    >
                      <RefreshCw className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    </button>
                  </div>
                  {challengeError && (
                    <p className="text-xs text-rose-500 font-semibold animate-shake">{challengeError}</p>
                  )}
                  <p className="text-[9px] text-slate-400 max-w-xs mx-auto font-normal leading-relaxed">
                    Completing this wake-up math check unlocks your study board and awards you a bonus <strong className="font-bold text-indigo-500">+50 XP</strong>!
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-500 font-normal">
                  No active Wake-Up math challenges are guarding this slot. Press dismiss below to study.
                </p>
              )}

              <div className="flex space-x-2.5">
                {triggeredAlarm.snoozeOption && (
                  <button 
                    onClick={handleSnoozeAttempt}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl transition cursor-pointer"
                  >
                    Snooze (5m)
                  </button>
                )}
                <button 
                  onClick={handleDismissAttempt}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
                >
                  Unlock Study Board
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 7. PREMIUM BOTTOM SHEET ALARM CREATION DRAWER */}
      <AnimatePresence>
        {showAdd && (
          <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-md">
            
            {/* Sheet Backdrop close trigger */}
            <div className="absolute inset-0" onClick={() => setShowAdd(false)} />

            {/* Bottom Sheet Modal content */}
            <motion.div 
              initial={{ y: "100%", opacity: 0.8 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0.8 }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="w-full max-w-md bg-white dark:bg-slate-900 rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 relative z-10 max-h-[92vh] flex flex-col"
            >
              
              {/* Premium Drag Handle Bar indicator (Inspired by iOS sheet) */}
              <div className="flex justify-center pt-3 pb-1 shrink-0">
                <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full" />
              </div>

              <div className="px-6 pb-6 overflow-y-auto max-h-[85vh] space-y-4">
                
                {/* Header title */}
                <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-850 pb-3">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 rounded-xl">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Add Smart Reminder</h3>
                      <p className="text-[10px] text-slate-400">Configure Study Alerts</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowAdd(false)} 
                    className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full cursor-pointer transition-colors"
                  >
                    <X className="w-4.5 h-4.5" />
                  </button>
                </div>

                {/* Switch Tabs standard Scheduled Alarm vs Countdown Timer */}
                <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setFormTab("standard")}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                      formTab === "standard"
                        ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                        : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                    }`}
                  >
                    ⏰ Standard Wake-Up
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormTab("countdown")}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                      formTab === "countdown"
                        ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                        : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                    }`}
                  >
                    ⏳ CountDown Timer
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 text-left">
                  
                  {/* Dynamic picker input */}
                  {formTab === "standard" ? (
                    <div className="flex flex-col items-center justify-center py-4 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-150 dark:border-slate-800">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Set Study Alarm Time</label>
                      <input 
                        type="time" 
                        className="text-4xl font-black bg-transparent border-none text-slate-850 dark:text-slate-100 text-center outline-none select-none font-mono tracking-tight"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        required
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-4 py-3 px-4 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-150 dark:border-slate-800">
                        <div className="text-center">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Hours</label>
                          <input 
                            type="number" 
                            min="0" 
                            max="48"
                            className="w-full text-3xl font-black bg-transparent text-slate-800 dark:text-slate-100 text-center outline-none font-mono"
                            value={countdownHours}
                            onChange={(e) => setCountdownHours(Math.max(0, Math.min(48, parseInt(e.target.value) || 0)))}
                          />
                        </div>
                        <div className="text-center">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Minutes</label>
                          <input 
                            type="number" 
                            min="0" 
                            max="59"
                            className="w-full text-3xl font-black bg-transparent text-slate-800 dark:text-slate-100 text-center outline-none font-mono"
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
                            <p className="text-[9px] text-emerald-600 dark:text-emerald-400 text-center font-bold">
                              🔔 Firing: {targetTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({totalMinutes} minutes left)
                            </p>
                          );
                        }
                        return (
                          <p className="text-[9px] text-rose-500 text-center font-bold">
                            Countdown timer must exceed 1 minute block.
                          </p>
                        );
                      })()}
                    </div>
                  )}

                  {/* Subject Tag Selector */}
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">Subject Tag</label>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.favoriteSubjects.map((sub) => {
                        const isSelected = subject === sub;
                        return (
                          <button
                            key={sub}
                            type="button"
                            onClick={() => setSubject(sub)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
                              isSelected
                                ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/10 scale-105"
                                : "bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border border-slate-150 dark:border-slate-800 hover:bg-slate-100"
                            }`}
                          >
                            📓 {sub}
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() => setSubject("General")}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
                          subject === "General" || subject === ""
                            ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/10 scale-105"
                            : "bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border border-slate-150 dark:border-slate-800 hover:bg-slate-100"
                        }`}
                      >
                        ⭐ General
                      </button>
                    </div>
                  </div>

                  {/* Priority pills Selection */}
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">Reminder Priority</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["High", "Medium", "Low"] as const).map((p) => {
                        const active = selectedPriority === p;
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setSelectedPriority(p)}
                            className={`py-1.5 rounded-xl text-xs font-bold border transition duration-150 cursor-pointer text-center ${
                              active
                                ? p === "High" 
                                  ? "bg-rose-500 border-rose-500 text-white shadow-md shadow-rose-500/10"
                                  : p === "Medium"
                                    ? "bg-amber-500 border-amber-500 text-white shadow-md shadow-amber-500/10"
                                    : "bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/10"
                                : "bg-transparent border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50"
                            }`}
                          >
                            {p === "High" ? "🔴 " : p === "Medium" ? "🟡 " : "🟢 "} {p}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Custom Glass Visual Ring Color */}
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">Glass Accent Color</label>
                    <div className="flex space-x-3 justify-start py-1">
                      {ALARM_COLORS.map((col) => {
                        const isSelected = selectedColor === col.name;
                        return (
                          <button
                            key={col.name}
                            type="button"
                            onClick={() => setSelectedColor(col.name)}
                            className={`w-7 h-7 rounded-full bg-gradient-to-tr ${col.value} transition duration-200 hover:scale-110 cursor-pointer relative shrink-0 ${
                              isSelected ? "ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-900" : ""
                            }`}
                            title={col.name}
                          >
                            {isSelected && (
                              <Check className="w-3.5 h-3.5 text-white absolute inset-0 m-auto" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Alarm Label */}
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">Alarm Label / Note</label>
                    <input 
                      type="text" 
                      placeholder="e.g. CBSE Revision Block / Algebra Mock Quiz"
                      className="w-full px-3 py-2 text-xs border rounded-xl border-slate-200 dark:border-slate-800 bg-transparent text-slate-850 dark:text-slate-100 outline-none focus:border-indigo-500 placeholder-slate-400 font-medium"
                      value={label}
                      onChange={(e) => setLabel(e.target.value)}
                    />
                  </div>

                  {/* Repeat weekdays selection */}
                  {formTab === "standard" && (
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">Repeat Days</label>
                      <div className="flex justify-between gap-1">
                        {WEEKDAYS.map((day, idx) => {
                          const selected = repeatDays.includes(idx);
                          return (
                            <button
                              key={day}
                              type="button"
                              onClick={() => handleDayToggle(idx)}
                              className={`w-8 h-8 flex items-center justify-center text-xs font-bold rounded-lg border transition cursor-pointer ${
                                selected 
                                  ? "bg-indigo-600 border-indigo-600 text-white shadow-sm" 
                                  : "bg-white dark:bg-slate-950 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100"
                              }`}
                            >
                              {day[0]}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Ringtone Audition selector */}
                  <div className="grid grid-cols-12 gap-3.5 items-end">
                    <div className="col-span-8">
                      <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">Alert Sound Tone</label>
                      <select
                        className="w-full px-3 py-2 text-xs border rounded-xl border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 outline-none font-semibold"
                        value={ringtone}
                        onChange={(e) => setRingtone(e.target.value)}
                      >
                        {RINGTONES.map((rt) => (
                          <option key={rt} value={rt}>{rt}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-4 pb-0.5">
                      <button
                        type="button"
                        onClick={playAuditionTone}
                        className="w-full py-2 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold text-xs rounded-xl flex items-center justify-center space-x-1 cursor-pointer transition-colors"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>Preview</span>
                      </button>
                    </div>
                  </div>

                  {/* Switch option Toggles row */}
                  <div className="grid grid-cols-2 gap-4 py-1.5 border-t border-slate-50 dark:border-slate-850">
                    <label className="flex items-center space-x-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={vibration}
                        onChange={(e) => setVibration(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                      />
                      <span className="font-semibold">Vibration Active</span>
                    </label>
                    <label className="flex items-center space-x-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={snoozeOption}
                        onChange={(e) => setSnoozeOption(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                      />
                      <span className="font-semibold">Enable Snooze</span>
                    </label>
                  </div>

                  {/* Wake up math challenge banner info */}
                  <div className="p-3 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/15 rounded-2xl flex items-start space-x-2.5">
                    <input 
                      type="checkbox" 
                      id="drawerChalMode"
                      className="mt-1 accent-indigo-600 rounded h-3.5 w-3.5"
                      checked={challengeMode}
                      onChange={(e) => setChallengeMode(e.target.checked)}
                    />
                    <div>
                      <label htmlFor="drawerChalMode" className="block text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                        Activate Wake-Up Math Challenge
                      </label>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-normal mt-0.5 font-normal">
                        Guards your study window. Firing triggers a random algebraic equation you must solve on-screen to dismiss. Ideal for overcoming grogginess!
                      </p>
                    </div>
                  </div>

                  {/* Reward indicator alert */}
                  <div className="flex items-center space-x-2 bg-indigo-50/50 dark:bg-indigo-950/25 p-3 rounded-xl border border-indigo-100/30">
                    <Info className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                    <p className="text-[9.5px] text-indigo-600 dark:text-indigo-400 font-bold leading-normal">
                      Earn <strong className="font-black">+10 XP</strong> instantly on reminder creation. Defeating the math unlock awards a <strong className="font-black">+50 XP bonus</strong>!
                    </p>
                  </div>

                  {/* Create submit button */}
                  <button 
                    type="submit"
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer text-center"
                  >
                    Save Study Reminder
                  </button>

                </form>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

// ====================================================
// CIRCULAR TIME CARD COMPONENT WITH GLASS EFFECTS
// ====================================================
interface AlarmCircularCardProps {
  alarm: Alarm;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  colorClass: { name: string; value: string; border: string; text: string; glow: string };
}

function AlarmCircularCard({ alarm, onToggle, onDelete, colorClass }: AlarmCircularCardProps) {
  const ampm = parseInt(alarm.time.split(":")[0], 10) >= 12 ? "PM" : "AM";
  const hr24 = parseInt(alarm.time.split(":")[0], 10);
  const hr12 = hr24 % 12 === 0 ? 12 : hr24 % 12;
  const time12Str = `${String(hr12).padStart(2, "0")}:${alarm.time.split(":")[1]}`;

  return (
    <motion.div 
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className={`group relative rounded-3xl p-5 border shadow-sm flex flex-col justify-between transition-all duration-300 ${
        alarm.isActive 
          ? `bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800/80 shadow-md ${colorClass.glow}` 
          : "bg-slate-50/30 dark:bg-slate-900/10 border-slate-100 dark:border-slate-800/10 opacity-60"
      }`}
    >
      
      {/* Glow dot / pulse ring for active alarms */}
      {alarm.isActive && (
        <div className="absolute top-4 right-4 flex h-2 w-2">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75`} />
          <span className={`relative inline-flex rounded-full h-2 w-2 bg-indigo-500`} />
        </div>
      )}

      <div className="flex items-center gap-5">
        
        {/* Dynamic circular dial showing the time */}
        <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
          {/* Glowing gradient background ring */}
          <div className={`absolute inset-0 rounded-full bg-gradient-to-tr ${colorClass.value} opacity-5 transition-opacity group-hover:opacity-10`} />
          
          {/* Ring borders */}
          <div className={`absolute inset-0 rounded-full border-2 ${alarm.isActive ? "border-indigo-500/25 animate-pulse" : "border-slate-200 dark:border-slate-800"}`} />
          <div className="absolute inset-2 rounded-full border border-dashed border-slate-200 dark:border-slate-800" />
          
          {/* Time Badge Inside Dial */}
          <div className="relative z-10 flex flex-col items-center justify-center text-center">
            <span className="text-sm font-black font-mono text-slate-850 dark:text-slate-100 tracking-tight">
              {time12Str}
            </span>
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none">
              {ampm}
            </span>
          </div>
        </div>

        {/* Content details */}
        <div className="space-y-1 overflow-hidden flex-1 text-left">
          <div className="flex items-center space-x-1.5 flex-wrap">
            <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 border border-slate-150 dark:border-slate-800">
              📕 {alarm.subject}
            </span>
            
            {alarm.challengeMode && (
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center shrink-0">
                <Zap className="w-2.5 h-2.5 mr-0.5" /> Math Solve
              </span>
            )}

            {alarm.priority && (
              <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md ${
                alarm.priority === "High" ? "bg-rose-50 text-rose-600 dark:bg-rose-950/40" : 
                alarm.priority === "Medium" ? "bg-amber-50 text-amber-600 dark:bg-amber-950/40" : 
                "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40"
              }`}>
                {alarm.priority}
              </span>
            )}
          </div>

          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate pr-4 pt-1">
            {alarm.label || "Study schedule block"}
          </h4>
          
          <p className="text-[9px] text-slate-400 font-semibold font-mono flex items-center">
            <Music className="w-3 h-3 mr-1 text-slate-400" /> {alarm.ringtone}
          </p>
        </div>

      </div>

      {/* Footer repeat indicator weekdays & control toggle */}
      <div className="flex items-center justify-between border-t border-slate-50 dark:border-slate-850 pt-3 mt-4 shrink-0">
        {alarm.triggerTimestamp ? (
          <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest font-mono flex items-center">
            <Clock className="w-3 h-3 mr-1" /> Countdown Alarm
          </span>
        ) : (
          <div className="flex space-x-0.5 shrink-0">
            {WEEKDAYS.map((day, idx) => {
              const repeating = alarm.repeatDays.includes(idx);
              return (
                <span 
                  key={day} 
                  className={`text-[8px] font-bold w-4.5 h-4.5 flex items-center justify-center rounded-full border ${
                    repeating 
                      ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400" 
                      : "bg-transparent border-transparent text-slate-300 dark:text-slate-700"
                  }`}
                  title={day}
                >
                  {day[0]}
                </span>
              );
            })}
          </div>
        )}

        {/* Buttons switch & delete row */}
        <div className="flex items-center space-x-2 shrink-0">
          <button 
            onClick={() => onToggle(alarm.id)}
            className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 outline-none cursor-pointer ${
              alarm.isActive ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-800"
            }`}
          >
            <div className={`bg-white w-3.5 h-3.5 rounded-full shadow-md transform transition-transform duration-200 ${
              alarm.isActive ? "translate-x-4" : "translate-x-0"
            }`} />
          </button>

          <button 
            onClick={() => onDelete(alarm.id)}
            className="p-1 text-slate-350 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition duration-150 cursor-pointer"
            title="Delete Alarm"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>

    </motion.div>
  );
}
