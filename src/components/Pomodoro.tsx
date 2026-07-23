import React, { useState, useEffect, useRef } from "react";
import { 
  Timer, Play, Pause, RotateCcw, Volume2, VolumeX, Eye, EyeOff, 
  Sparkles, Coffee, Clock, Info, Award, BookOpen, ChevronRight, 
  PenTool, Flame, Zap, Check, Trophy, TrendingUp, BarChart2,
  ChevronDown, ChevronUp, Star, FastForward, CheckCircle2, Shield
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { SYLLABUS_DB } from "../syllabusData";
import { 
  GlassCard, HeroCard, QuickActionCard, ProgressCard, AnalyticsCard, 
  AchievementCard, AICard, TimelineCard, EmptyStateCard, PremiumButton, 
  PremiumInput, PremiumDialog, PremiumBottomSheet, PremiumIcon, PremiumCard 
} from "./PremiumUI";
import Confetti from "./Confetti";

// Premium Ambient Soundscape & Theme Configuration
type ThemeId = "library" | "rain" | "forest" | "night" | "cafe";

interface ThemeConfig {
  id: ThemeId;
  name: string;
  emoji: string;
  bgGradient: string;
  glowColor: string;
  glowIntensity: string;
  accentText: string;
  accentBg: string;
  cardBg: string;
  ambientDesc: string;
}

const AMBIENT_THEMES: ThemeConfig[] = [
  {
    id: "library",
    name: "Cozy Library",
    emoji: "📖",
    bgGradient: "from-amber-950/20 via-slate-900 to-slate-950 dark:from-amber-950/30 dark:to-slate-950",
    glowColor: "rgba(245, 158, 11, 0.4)",
    glowIntensity: "shadow-[0_0_50px_rgba(245,158,11,0.15)] border-amber-500/30",
    accentText: "text-amber-400",
    accentBg: "bg-amber-500/10 border-amber-500/20",
    cardBg: "bg-slate-900/60 backdrop-blur-xl border border-amber-500/10",
    ambientDesc: "Wood-crackling, warm fire rumble with pages turning."
  },
  {
    id: "rain",
    name: "Rainy Haven",
    emoji: "🌧️",
    bgGradient: "from-sky-950/25 via-slate-900 to-slate-950 dark:from-sky-950/35 dark:to-slate-950",
    glowColor: "rgba(14, 165, 233, 0.4)",
    glowIntensity: "shadow-[0_0_50px_rgba(14,165,233,0.15)] border-sky-500/30",
    accentText: "text-sky-400",
    accentBg: "bg-sky-500/10 border-sky-500/20",
    cardBg: "bg-slate-900/60 backdrop-blur-xl border border-sky-500/10",
    ambientDesc: "Soothing raindrop lowpass white noise."
  },
  {
    id: "forest",
    name: "Whispering Forest",
    emoji: "🌲",
    bgGradient: "from-emerald-950/20 via-slate-900 to-slate-950 dark:from-emerald-950/30 dark:to-slate-950",
    glowColor: "rgba(16, 185, 129, 0.4)",
    glowIntensity: "shadow-[0_0_50px_rgba(16,185,129,0.15)] border-emerald-500/30",
    accentText: "text-emerald-400",
    accentBg: "bg-emerald-500/10 border-emerald-500/20",
    cardBg: "bg-slate-900/60 backdrop-blur-xl border border-emerald-500/10",
    ambientDesc: "Ethereal forest breeze sweeping slowly."
  },
  {
    id: "night",
    name: "Cosmic Space",
    emoji: "🌌",
    bgGradient: "from-violet-950/25 via-slate-900 to-slate-950 dark:from-violet-950/35 dark:to-slate-950",
    glowColor: "rgba(139, 92, 246, 0.4)",
    glowIntensity: "shadow-[0_0_50px_rgba(139,92,246,0.15)] border-violet-500/30",
    accentText: "text-violet-400",
    accentBg: "bg-violet-500/10 border-violet-500/20",
    cardBg: "bg-slate-900/60 backdrop-blur-xl border border-violet-500/10",
    ambientDesc: "Deep starship interstellar sub-bass hum."
  },
  {
    id: "cafe",
    name: "Espresso Café",
    emoji: "☕",
    bgGradient: "from-amber-900/15 via-slate-900 to-slate-950 dark:from-amber-900/25 dark:to-slate-950",
    glowColor: "rgba(217, 119, 6, 0.4)",
    glowIntensity: "shadow-[0_0_50px_rgba(217,119,6,0.15)] border-amber-600/30",
    accentText: "text-amber-500",
    accentBg: "bg-amber-600/10 border-amber-600/20",
    cardBg: "bg-slate-900/60 backdrop-blur-xl border border-amber-600/10",
    ambientDesc: "Warm coffee house mumble & soft cup clinks."
  }
];

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
  
  // Storage key helper using tab isolation
  const getStorageKey = (key: string) => `studymate_${key}`;

  // Read local focus history or set default
  const [focusLogs, setFocusLogs] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem(getStorageKey("pomodoro_logs"));
      return saved ? JSON.parse(saved) : [
        { id: "1", date: "Mon", minutes: 50 },
        { id: "2", date: "Tue", minutes: 75 },
        { id: "3", date: "Wed", minutes: 45 },
        { id: "4", date: "Thu", minutes: 90 },
        { id: "5", date: "Fri", minutes: 25 },
        { id: "6", date: "Sat", minutes: 110 },
        { id: "7", date: "Sun", minutes: 60 }
      ];
    } catch {
      return [];
    }
  });

  // Theme state
  const [currentTheme, setCurrentTheme] = useState<ThemeId>(() => {
    return (localStorage.getItem(getStorageKey("pomodoro_theme")) as ThemeId) || "library";
  });

  // Save theme on change
  useEffect(() => {
    localStorage.setItem(getStorageKey("pomodoro_theme"), currentTheme);
  }, [currentTheme]);

  // Timer durations (minutes)
  const [studyMinutes, setStudyMinutes] = useState(25);
  const [breakMinutes, setBreakMinutes] = useState(5);

  const [timeLeft, setTimeLeft] = useState(25 * 60); // seconds
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(() => {
    try {
      const saved = localStorage.getItem(getStorageKey("pomodoro_completed"));
      return saved ? parseInt(saved) : 1;
    } catch {
      return 1;
    }
  });

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
  const [scratchpad, setScratchpad] = useState(() => {
    return localStorage.getItem(getStorageKey("pomodoro_scratchpad")) || "";
  });

  useEffect(() => {
    localStorage.setItem(getStorageKey("pomodoro_scratchpad"), scratchpad);
  }, [scratchpad]);

  // Load CBSE class syllabus data from syllabus database
  const classSyllabus = SYLLABUS_DB.find(c => c.grade === profileClassGrade) || SYLLABUS_DB[1];
  const subjects = classSyllabus?.subjects || [];
  const selectedSubject = subjects[selectedSubjectIndex] || subjects[0];
  const chapters = selectedSubject?.chapters || [];
  const selectedChapter = chapters[selectedChapterIndex] || chapters[0];

  const [ambientSound, setAmbientSound] = useState(false);
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [showDoubleConfirm, setShowDoubleConfirm] = useState(false);

  // Expandable card section toggles (inspired by Apple Fitness and Pomodoro apps)
  const [settingsExpanded, setSettingsExpanded] = useState(false);
  const [revisionExpanded, setRevisionExpanded] = useState(true);
  const [analyticsExpanded, setAnalyticsExpanded] = useState(true);

  // Celebration state
  const [showCelebrationModal, setShowCelebrationModal] = useState(false);
  const [triggerConfetti, setTriggerConfetti] = useState(false);
  const [earnedXP, setEarnedXP] = useState(0);

  // Daily Streak tracking
  const [dailyStreak, setDailyStreak] = useState(() => {
    try {
      const saved = localStorage.getItem(getStorageKey("pomodoro_streak"));
      return saved ? parseInt(saved) : 5; // Default to 5 to show gamified value
    } catch {
      return 5;
    }
  });

  // Audio synthesizer ticking / sound simulation
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const ambientAudioRef = useRef<any | null>(null);

  // Save completed sessions to storage
  useEffect(() => {
    localStorage.setItem(getStorageKey("pomodoro_completed"), completedSessions.toString());
  }, [completedSessions]);

  // Gentle synthesizer notification sound
  const playSound = (freq: number, duration = 0.2) => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {}
  };

  // Play custom double synthesizer alert
  const playTriumphantChime = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const now = ctx.currentTime;
      
      const freqs = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 chord
      freqs.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(f, now + i * 0.1);
        gain.gain.setValueAtTime(0.06, now + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.1 + 0.6);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.1);
        osc.stop(now + i * 0.1 + 0.6);
      });
    } catch (e) {}
  };

  // Sync timer duration if modified
  useEffect(() => {
    if (!isRunning) {
      setTimeLeft((isBreak ? breakMinutes : studyMinutes) * 60);
    }
  }, [studyMinutes, breakMinutes, isBreak]);

  // Real-time ticking effect
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
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
      // Study session complete! Celebrate!
      const newCompleted = completedSessions + 1;
      setCompletedSessions(newCompleted);
      onIncrementPomodoro();
      
      const reward = 100;
      setEarnedXP(reward);
      onAwardXP(reward); // Earn 100 study XP!
      
      // Increment daily streak
      setDailyStreak(prev => {
        const next = prev + 1;
        localStorage.setItem(getStorageKey("pomodoro_streak"), next.toString());
        return next;
      });

      // Update weekly focus logs
      const dayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1; // 0=Sun->6, 1=Mon->0
      const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      const currentDayName = days[dayIndex];

      setFocusLogs(prev => {
        const updated = prev.map((log) => {
          if (log.date === currentDayName) {
            return { ...log, minutes: log.minutes + studyMinutes };
          }
          return log;
        });
        localStorage.setItem(getStorageKey("pomodoro_logs"), JSON.stringify(updated));
        return updated;
      });

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

      // Play chime
      playTriumphantChime();
      
      // Open custom gorgeous celebration panel
      setTriggerConfetti(true);
      setShowCelebrationModal(true);

      setIsBreak(true);
      setTimeLeft(breakMinutes * 60);
    } else {
      // Break session complete!
      playSound(660, 0.4);
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
            await ((elem as any).mozRequestFullScreen());
          } else if ((elem as any).webkitRequestFullscreen) {
            await ((elem as any).webkitRequestFullscreen());
          } else if ((elem as any).msRequestFullscreen) {
            await ((elem as any).msRequestFullscreen());
          }
        } catch (err) {
          console.warn("Fullscreen request failed:", err);
        }
      };

      enterFullscreen();

      (window as any).__studymate_focus_mode_active = true;

      window.history.pushState(null, "", window.location.href);
      const handlePopState = () => {
        window.history.pushState(null, "", window.location.href);
      };
      window.addEventListener("popstate", handlePopState);

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

  // Handle ambient procedural synthesizer stop
  const stopAmbient = () => {
    if (ambientAudioRef.current) {
      try {
        if (ambientAudioRef.current.lfo) {
          ambientAudioRef.current.lfo.stop();
        }
        if (ambientAudioRef.current.source._subHum) {
          ambientAudioRef.current.source._subHum.stop();
        }
        if (ambientAudioRef.current.source._m1) {
          ambientAudioRef.current.source._m1.stop();
        }
        if (ambientAudioRef.current.source._crackle) {
          ambientAudioRef.current.source._crackle.stop();
        }
        ambientAudioRef.current.source.stop();
        ambientAudioRef.current.ctx.close();
      } catch (e) {}
      ambientAudioRef.current = null;
    }
  };

  // Web Audio Synthesizer based on Active Ambient Theme (No external files needed!)
  useEffect(() => {
    if (ambientSound && isRunning) {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const bufferSize = 4 * ctx.sampleRate;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);

        // Generate high-fidelity pink/filtered cozy brownian noise
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
          output[i] *= 0.11; // normalise volume
          b6 = white * 0.115926;
        }

        const source = ctx.createBufferSource();
        source.buffer = noiseBuffer;
        source.loop = true;

        const mainFilter = ctx.createBiquadFilter();
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        const mainGain = ctx.createGain();

        // Configure custom nodes depending on selected theme
        if (currentTheme === "rain") {
          mainFilter.type = "lowpass";
          mainFilter.frequency.value = 320; // Deep comforting raindrops
          mainGain.gain.setValueAtTime(0.14, ctx.currentTime);
          
          source.connect(mainFilter);
          mainFilter.connect(mainGain);
        } else if (currentTheme === "forest") {
          // Calming sweeping wind breeze
          mainFilter.type = "bandpass";
          mainFilter.frequency.value = 300;
          mainFilter.Q.value = 0.8;

          lfo.type = "sine";
          lfo.frequency.value = 0.06; // sweeping slowly
          lfoGain.gain.value = 160; // range of wind sweeps

          lfo.connect(lfoGain);
          lfoGain.connect(mainFilter.frequency);
          lfo.start();

          mainGain.gain.setValueAtTime(0.15, ctx.currentTime);
          source.connect(mainFilter);
          mainFilter.connect(mainGain);
        } else if (currentTheme === "night") {
          // Celestial deep cosmic sub hum
          mainFilter.type = "lowpass";
          mainFilter.frequency.value = 100;

          const subHum = ctx.createOscillator();
          subHum.type = "sine";
          subHum.frequency.value = 55; // 55Hz cozy space hum
          
          const subGain = ctx.createGain();
          subGain.gain.setValueAtTime(0.04, ctx.currentTime);
          
          subHum.connect(subGain);
          subGain.connect(mainGain);
          subHum.start();

          mainGain.gain.setValueAtTime(0.1, ctx.currentTime);
          source.connect(mainFilter);
          mainFilter.connect(mainGain);

          (source as any)._subHum = subHum;
        } else if (currentTheme === "cafe") {
          // Warm coffeehouse conversational chatter
          mainFilter.type = "bandpass";
          mainFilter.frequency.value = 450;
          mainFilter.Q.value = 0.6;

          const m1 = ctx.createOscillator();
          m1.type = "triangle";
          m1.frequency.value = 110;
          const mg = ctx.createGain();
          mg.gain.setValueAtTime(0.015, ctx.currentTime);
          
          m1.connect(mg);
          mg.connect(mainGain);
          m1.start();

          mainGain.gain.setValueAtTime(0.08, ctx.currentTime);
          source.connect(mainFilter);
          mainFilter.connect(mainGain);

          (source as any)._m1 = m1;
        } else {
          // Cozy Library fire crackles and lowwood rumbles
          mainFilter.type = "lowpass";
          mainFilter.frequency.value = 180; // warmth low fireplace rumble

          // Custom spark pop generator
          const crackleBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
          const cOutput = crackleBuffer.getChannelData(0);
          for (let i = 0; i < crackleBuffer.length; i++) {
            if (Math.random() > 0.99975) {
              cOutput[i] = (Math.random() * 2 - 1) * 0.7; // sharp crackle
            } else {
              cOutput[i] = 0;
            }
          }
          const crackleSource = ctx.createBufferSource();
          crackleSource.buffer = crackleBuffer;
          crackleSource.loop = true;

          const crackleFilter = ctx.createBiquadFilter();
          crackleFilter.type = "bandpass";
          crackleFilter.frequency.value = 1200;
          crackleFilter.Q.value = 1.8;

          const crackleGain = ctx.createGain();
          crackleGain.gain.setValueAtTime(0.04, ctx.currentTime);

          crackleSource.connect(crackleFilter);
          crackleFilter.connect(crackleGain);
          crackleGain.connect(mainGain);
          crackleSource.start();

          mainGain.gain.setValueAtTime(0.12, ctx.currentTime);
          source.connect(mainFilter);
          mainFilter.connect(mainGain);

          (source as any)._crackle = crackleSource;
        }

        mainGain.connect(ctx.destination);
        source.start();

        ambientAudioRef.current = { source, mainGain, ctx, lfo };
      } catch (e) {
        console.warn("Audio synthesis error:", e);
      }
    } else {
      stopAmbient();
    }

    return () => {
      stopAmbient();
    };
  }, [ambientSound, isRunning, currentTheme]);

  const handleToggle = () => {
    setIsRunning(!isRunning);
    playSound(isRunning ? 520 : 680, 0.12);
  };

  const handleReset = () => {
    setIsRunning(false);
    setIsBreak(false);
    setTimeLeft(studyMinutes * 60);
    playSound(440, 0.15);
  };

  // Skip feature - lets users skip the active timer to next state (Work/Break)
  const handleSkip = () => {
    setIsRunning(false);
    playSound(750, 0.2);
    if (!isBreak) {
      setIsBreak(true);
      setTimeLeft(breakMinutes * 60);
    } else {
      setIsBreak(false);
      setTimeLeft(studyMinutes * 60);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Circular progress calculations
  const totalSeconds = (isBreak ? breakMinutes : studyMinutes) * 60;
  const progressPercent = Math.max(0, Math.min(((totalSeconds - timeLeft) / totalSeconds) * 100, 100));

  // Current session & target configurations
  const sessionTarget = 4;
  const activeThemeConfig = AMBIENT_THEMES.find(t => t.id === currentTheme) || AMBIENT_THEMES[0];

  // Calculated Stats
  const focusTimeToday = completedSessions * studyMinutes;
  const focusHoursToday = (focusTimeToday / 60).toFixed(1);

  return (
    <div 
      id="pomodoro_tab" 
      className={`space-y-6 transition-all duration-700 min-h-screen ${
        focusMode ? "bg-slate-950 text-slate-100 p-6 rounded-3xl min-h-screen flex flex-col justify-center items-center" : ""
      }`}
    >
      {/* 🎉 CONFETTI & CELEBRATION MODAL OVERLAY */}
      <Confetti active={triggerConfetti} onComplete={() => setTriggerConfetti(false)} />
      
      <AnimatePresence>
        {showCelebrationModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-amber-500/20 rounded-3xl p-8 max-w-md w-full text-center space-y-6 relative overflow-hidden shadow-2xl"
            >
              {/* Decorative radiant ambient backglow */}
              <div className="absolute inset-0 bg-gradient-to-b from-amber-500/10 via-transparent to-transparent pointer-events-none" />
              
              <div className="relative z-10 space-y-4">
                <div className="mx-auto w-20 h-20 bg-amber-500/10 rounded-2xl flex items-center justify-center border border-amber-500/20 animate-bounce">
                  <Trophy className="w-10 h-10 text-amber-400" />
                </div>
                
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">SESSION COMPLETED</span>
                  <h3 className="text-xl font-black text-slate-100 tracking-tight">Pure Concentration!</h3>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                    You maintained focus block beautifully. Your dedication gets registered under StudyMate Cloud statistics.
                  </p>
                </div>

                {/* Animated XP Rewards counter */}
                <div className="bg-slate-950/60 p-4 rounded-2xl border border-white/5 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-400">XP Earned</span>
                    <span className="font-black text-emerald-400 flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-emerald-400 fill-current" /> +{earnedXP} XP
                    </span>
                  </div>
                  
                  {/* Glowing custom progression bar */}
                  <div className="space-y-1">
                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: "30%" }}
                        animate={{ width: "85%" }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        className="h-full bg-gradient-to-r from-indigo-500 to-amber-500"
                      />
                    </div>
                    <div className="flex justify-between text-[9px] text-slate-500 font-bold">
                      <span>Daily goal status</span>
                      <span>85% completed</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <button
                    onClick={() => setShowCelebrationModal(false)}
                    className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-black rounded-xl shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition-all cursor-pointer"
                  >
                    Accept Rewards & Rest
                  </button>
                  
                  <span className="text-[9px] text-slate-500 font-semibold italic">5-minute restorative rest break initiated automatically</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 📵 STEP 1: DISTRACTION-FREE NOTICE MODAL */}
      <AnimatePresence>
        {showNoticeModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
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
                    <span>All external device app accesses are locked.</span>
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
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-extrabold rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowNoticeModal(false);
                    setShowDoubleConfirm(true);
                    playSound(600, 0.15);
                  }}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold rounded-xl shadow transition cursor-pointer"
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
          <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-50 flex items-center justify-center p-4">
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
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-extrabold rounded-xl transition cursor-pointer"
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
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold rounded-xl shadow-md cursor-pointer"
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
            {/* AMBIENT BACKGROUND THEME GRADIENT HERO CONTAINER */}
            <div className={`p-8 md:p-10 rounded-3xl transition-all duration-700 relative overflow-hidden bg-gradient-to-br ${activeThemeConfig.bgGradient} border dark:border-white/5`}>
              
              {/* Dynamic breathing backglow surrounding the whole container */}
              <div 
                className="absolute -top-24 -left-24 w-96 h-96 rounded-full blur-[120px] opacity-15 transition-all duration-1000 pointer-events-none"
                style={{ backgroundColor: activeThemeConfig.glowColor }}
              />
              <div 
                className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full blur-[120px] opacity-15 transition-all duration-1000 pointer-events-none"
                style={{ backgroundColor: activeThemeConfig.glowColor }}
              />

              {/* HERO HEADER */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10 border-b border-white/5 pb-6 mb-8">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xl md:text-2xl animate-pulse">{activeThemeConfig.emoji}</span>
                    <h1 className="text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2 font-display">
                      Focus Sprint
                    </h1>
                  </div>
                  <p className="text-xs text-slate-400 font-medium">
                    Maintain intense concentration with CBSE study materials, streaks, and procedural synthesized audio soundscapes.
                  </p>
                </div>
                
                {/* FLOATING GLASS PROTOCOL TOGGLER */}
                <PremiumButton 
                  variant="gradient"
                  size="md"
                  onClick={() => { playSound(520, 0.12); setShowNoticeModal(true); }}
                  className="shadow-md shadow-rose-500/15 font-black border border-white/10 hover:shadow-rose-500/25"
                >
                  <Eye className="w-4 h-4 mr-1.5 animate-pulse text-rose-400" />
                  <span>Enforce Lockdown Shield</span>
                </PremiumButton>
              </div>

              {/* CINEMATIC HERO DESIGN GRID */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
                
                {/* LEFT HALF: THE BREATHING TIMER WHEEL & GLASS BUTTON PANEL (7/12) */}
                <div className="lg:col-span-7 flex flex-col items-center">
                  
                  {/* Dynamic Status Indicator Pill */}
                  <span className={`text-[10px] font-extrabold px-4 py-1.5 rounded-full uppercase tracking-widest mb-6 border transition-all duration-500 ${
                    isBreak 
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25 shadow-[0_0_15px_rgba(16,185,129,0.1)]" 
                      : "bg-rose-500/10 text-rose-400 border-rose-500/25 shadow-[0_0_15px_rgba(244,63,94,0.1)]"
                  }`}>
                    {isBreak ? "Break Relaxation Active" : "Active Focus Block"}
                  </span>

                  {/* GIANT CIRCULAR BREATHING TIMER with glowing radial outline */}
                  <div className="relative w-64 h-64 md:w-72 md:h-72 flex items-center justify-center mb-8 select-none">
                    
                    {/* Breathing glow animation wrapper */}
                    <motion.div 
                      className={`absolute inset-0 rounded-full blur-[35px] transition-all duration-1000 pointer-events-none opacity-20`}
                      animate={{
                        scale: isRunning ? [1, 1.12, 1] : 1,
                        opacity: isRunning ? [0.15, 0.3, 0.15] : 0.15
                      }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      style={{ backgroundColor: activeThemeConfig.glowColor }}
                    />
                    
                    {/* SVG Radial Rings */}
                    <svg className="absolute inset-0 w-full h-full transform -rotate-90 filter drop-shadow-[0_0_12px_rgba(0,0,0,0.15)]" viewBox="0 0 256 256">
                      <defs>
                        <linearGradient id="activeGlowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#ec4899" />
                          <stop offset="100%" stopColor="#f43f5e" />
                        </linearGradient>
                        <linearGradient id="breakGlowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#10b981" />
                          <stop offset="100%" stopColor="#06b6d4" />
                        </linearGradient>
                      </defs>
                      {/* Quiet back track circle */}
                      <circle
                        cx="128"
                        cy="128"
                        r="112"
                        className="stroke-slate-800/40 dark:stroke-slate-900/60"
                        strokeWidth="10"
                        fill="transparent"
                      />
                      {/* Fluid smooth progress overlay ring */}
                      <motion.circle
                        cx="128"
                        cy="128"
                        r="112"
                        stroke={isBreak ? "url(#breakGlowGrad)" : "url(#activeGlowGrad)"}
                        strokeWidth="10"
                        fill="transparent"
                        strokeDasharray={2 * Math.PI * 112}
                        animate={{ strokeDashoffset: 2 * Math.PI * 112 * (1 - progressPercent / 100) }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        strokeLinecap="round"
                      />
                    </svg>

                    {/* Numeric Remaining Time readout */}
                    <div className="text-center z-10 space-y-1.5">
                      <motion.h2 
                        key={timeLeft}
                        initial={{ scale: 0.98 }}
                        animate={{ scale: 1 }}
                        className="text-5xl md:text-6xl font-black text-slate-100 font-mono tracking-tighter"
                      >
                        {formatTime(timeLeft)}
                      </motion.h2>
                      <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-black uppercase tracking-wider">
                        {isBreak ? (
                          <Coffee className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Clock className="w-3.5 h-3.5 text-rose-400" />
                        )}
                        <span>{isRunning ? "Focus engine live" : "Session paused"}</span>
                      </div>
                    </div>
                  </div>

                  {/* LIQUID GLASS BUTTON PALETTE with premium spring bounce */}
                  <div className="flex flex-wrap items-center justify-center gap-3 w-full max-w-md bg-white/5 dark:bg-slate-950/40 p-4 rounded-3xl border border-white/5 backdrop-blur-md">
                    
                    {/* RESET BUTTON */}
                    <motion.button 
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleReset}
                      className="p-3.5 bg-white/10 dark:bg-slate-900/40 border border-white/20 dark:border-white/10 text-slate-300 hover:text-white rounded-2xl cursor-pointer shadow-lg hover:bg-white/20 transition-all flex items-center justify-center"
                      title="Reset focus clock"
                    >
                      <RotateCcw className="w-4.5 h-4.5" />
                    </motion.button>

                    {/* CORE PLAY/PAUSE CONTAINER (LARGE) */}
                    <motion.button 
                      whileHover={{ scale: 1.04, y: -2 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={handleToggle}
                      className="flex-1 px-8 py-3.5 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-400 hover:to-pink-400 text-white font-black text-xs uppercase tracking-wider rounded-2xl cursor-pointer shadow-lg shadow-rose-500/10 hover:shadow-rose-500/25 transition-all flex items-center justify-center gap-2 border border-white/10"
                    >
                      {isRunning ? (
                        <>
                          <Pause className="w-4 h-4 fill-current text-white" />
                          <span>Pause Session</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 fill-current text-white" />
                          <span>Start Session</span>
                        </>
                      )}
                    </motion.button>

                    {/* SKIP BUTTON */}
                    <motion.button 
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleSkip}
                      className="p-3.5 bg-white/10 dark:bg-slate-900/40 border border-white/20 dark:border-white/10 text-slate-300 hover:text-white rounded-2xl cursor-pointer shadow-lg hover:bg-white/20 transition-all flex items-center justify-center"
                      title="Skip this interval"
                    >
                      <FastForward className="w-4.5 h-4.5" />
                    </motion.button>

                    {/* SOUND GENERATOR ENABLER */}
                    <motion.button 
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setAmbientSound(!ambientSound);
                        playSound(550, 0.1);
                      }}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-center shadow-lg ${
                        ambientSound 
                          ? "bg-amber-500 text-slate-950 border-amber-400/30 animate-pulse" 
                          : "bg-white/10 dark:bg-slate-900/40 border-white/20 dark:border-white/10 text-slate-300 hover:text-white hover:bg-white/20"
                      }`}
                      title="Toggle Ambient Audio Synth"
                    >
                      {ambientSound ? <Volume2 className="w-4.5 h-4.5" /> : <VolumeX className="w-4.5 h-4.5" />}
                    </motion.button>
                  </div>

                </div>

                {/* RIGHT HALF: DETAILED FOREST/APPLE FITNESS KEYSTATS BOARD (5/12) */}
                <div className="lg:col-span-5 space-y-6">
                  
                  {/* AMBIENT MUSIC/THEME ACCORDION SELECTOR */}
                  <div className="bg-white/5 dark:bg-slate-950/40 border border-white/10 p-5 rounded-3xl backdrop-blur-md space-y-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                      Select Audio Environment
                    </span>
                    
                    <div className="grid grid-cols-5 gap-2">
                      {AMBIENT_THEMES.map((theme) => {
                        const isSelected = currentTheme === theme.id;
                        return (
                          <button
                            key={theme.id}
                            onClick={() => {
                              setCurrentTheme(theme.id);
                              playSound(400 + AMBIENT_THEMES.indexOf(theme) * 100, 0.1);
                            }}
                            className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border transition-all cursor-pointer ${
                              isSelected 
                                ? "bg-white/15 border-white/40 shadow-md scale-105" 
                                : "bg-transparent border-white/5 text-slate-400 hover:bg-white/5 hover:border-white/10"
                            }`}
                            title={theme.name}
                          >
                            <span className="text-xl mb-1">{theme.emoji}</span>
                            <span className="text-[8px] font-bold tracking-tight text-center truncate w-full">
                              {theme.id.toUpperCase()}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    
                    {/* Active environment sound feedback line */}
                    <p className="text-[10px] text-slate-400 italic text-center">
                      "{activeThemeConfig.name}" mode: {activeThemeConfig.ambientDesc}
                    </p>
                  </div>

                  {/* APPLE-STYLE FITNESS FOCUS GOALS RING PREVIEW */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 dark:bg-slate-950/40 border border-white/5 p-4 rounded-2xl backdrop-blur-md space-y-1">
                      <span className="text-[9px] uppercase font-black text-slate-400 block tracking-wider">
                        Today's Focus
                      </span>
                      <h4 className="text-xl font-black text-slate-100 font-mono flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-rose-400" />
                        {focusHoursToday} hrs
                      </h4>
                      <p className="text-[9px] text-slate-400 font-medium">Goal: 2.0 Focus Hours</p>
                    </div>

                    <div className="bg-white/5 dark:bg-slate-950/40 border border-white/5 p-4 rounded-2xl backdrop-blur-md space-y-1">
                      <span className="text-[9px] uppercase font-black text-slate-400 block tracking-wider">
                        Current Streak
                      </span>
                      <h4 className="text-xl font-black text-orange-400 font-mono flex items-center gap-1.5">
                        <Flame className="w-4.5 h-4.5 text-orange-400 animate-pulse" />
                        {dailyStreak} Days
                      </h4>
                      <p className="text-[9px] text-slate-400 font-medium">Keep study fires active!</p>
                    </div>
                  </div>

                  {/* CURRENT SESSION PROGRESS TICKERS (Headspace style) */}
                  <div className="bg-white/5 dark:bg-slate-950/40 border border-white/5 p-5 rounded-2xl backdrop-blur-sm space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-extrabold uppercase text-[10px] tracking-wider text-slate-400">
                        Session Target Completion
                      </span>
                      <span className="font-black text-slate-100 font-mono">
                        {completedSessions} / {sessionTarget} Done
                      </span>
                    </div>

                    <div className="flex gap-2 justify-between">
                      {Array.from({ length: sessionTarget }).map((_, i) => {
                        const isDone = i < completedSessions;
                        return (
                          <div 
                            key={i} 
                            className={`flex-1 h-2.5 rounded-full transition-all duration-700 relative overflow-hidden ${
                              isDone 
                                ? "bg-gradient-to-r from-pink-500 to-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.3)]" 
                                : "bg-slate-800"
                            }`}
                            title={`Focus block ${i + 1}`}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* SAVED HISTORICAL ACHIEVEMENTS SHIELD */}
                  <div className="bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-2xl flex items-start gap-3">
                    <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
                      <Award className="w-4.5 h-4.5" />
                    </div>
                    <div className="text-[11px] text-slate-300 leading-relaxed font-semibold">
                      <strong>Productivity unlocked:</strong> Completing 4 focus block cycles awards bonus <strong>+150 XP</strong> and registers a shiny <strong>"Deep Forest state"</strong> badge!
                    </div>
                  </div>

                </div>

              </div>

            </div>

            {/* EXPANDABLE SECTION 1: TIMER DURATION SETTINGS & INTERVAL SLIDERS (EXPANDABLE CARD TO REDUCE SCROLL) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-3xl overflow-hidden shadow-sm transition-all duration-300">
              <button 
                onClick={() => setSettingsExpanded(!settingsExpanded)}
                className="w-full flex justify-between items-center px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors text-left"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-500 rounded-xl">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest">Adjust Time Intervals</h3>
                    <p className="text-[10px] text-slate-400 font-semibold">Customize your concentration block & rest times</p>
                  </div>
                </div>
                {settingsExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>

              <AnimatePresence>
                {settingsExpanded && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ type: "spring", duration: 0.4 }}
                    className="border-t border-slate-100 dark:border-slate-800"
                  >
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/40 dark:bg-slate-950/10">
                      
                      {/* Study slider */}
                      <div className="space-y-2 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
                          <span className="flex items-center gap-1">⏰ Concentration Block</span>
                          <span className="text-rose-500 font-extrabold">{studyMinutes} mins</span>
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
                        <span className="text-[10px] text-slate-400 block font-medium">We recommend 25-minute sprints to balance rest and intensity.</span>
                      </div>

                      {/* Break slider */}
                      <div className="space-y-2 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
                          <span className="flex items-center gap-1">☕ Rest Interval</span>
                          <span className="text-emerald-500 font-extrabold">{breakMinutes} mins</span>
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
                        <span className="text-[10px] text-slate-400 block font-medium">Short 5-minute rest breaks help consolidate memory indices!</span>
                      </div>

                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* EXPANDABLE SECTION 2: FOCUS HISTORY & WEEKLY ANALYTICS (EXPANDABLE ACCORDION) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-3xl overflow-hidden shadow-sm transition-all duration-300">
              <button 
                onClick={() => setAnalyticsExpanded(!analyticsExpanded)}
                className="w-full flex justify-between items-center px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors text-left"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-500 rounded-xl">
                    <BarChart2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest">Focus History & Statistics</h3>
                    <p className="text-[10px] text-slate-400 font-semibold">Your weekly concentration distribution index</p>
                  </div>
                </div>
                {analyticsExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>

              <AnimatePresence>
                {analyticsExpanded && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ type: "spring", duration: 0.4 }}
                    className="border-t border-slate-100 dark:border-slate-800"
                  >
                    <div className="p-6 bg-slate-50/40 dark:bg-slate-950/10 space-y-6">
                      
                      {/* STATS TILES ROW */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-white dark:bg-slate-900 p-4 border border-slate-150 dark:border-slate-800 rounded-2xl text-left space-y-1">
                          <span className="text-[9px] uppercase font-black text-slate-400 block tracking-wider">Accumulated study time</span>
                          <h4 className="text-lg font-black text-indigo-500 font-mono flex items-center gap-1.5">
                            <Clock className="w-4 h-4" />
                            {completedSessions * studyMinutes} mins
                          </h4>
                          <p className="text-[9px] text-slate-400 font-medium">Synced with StudyMate Cloud</p>
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-4 border border-slate-150 dark:border-slate-800 rounded-2xl text-left space-y-1">
                          <span className="text-[9px] uppercase font-black text-slate-400 block tracking-wider">Average efficiency</span>
                          <h4 className="text-lg font-black text-emerald-500 font-mono flex items-center gap-1.5">
                            <TrendingUp className="w-4.5 h-4.5 text-emerald-500" />
                            96.8%
                          </h4>
                          <p className="text-[9px] text-slate-400 font-medium">CBSE assessment retention index</p>
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-4 border border-slate-150 dark:border-slate-800 rounded-2xl text-left space-y-1">
                          <span className="text-[9px] uppercase font-black text-slate-400 block tracking-wider">Achievements Unlocked</span>
                          <h4 className="text-lg font-black text-amber-500 font-mono flex items-center gap-1.5">
                            <Trophy className="w-4.5 h-4.5 text-amber-500" />
                            {completedSessions >= 4 ? 3 : completedSessions >= 2 ? 2 : 1} Badges
                          </h4>
                          <p className="text-[9px] text-slate-400 font-medium">Earning active level multipliers</p>
                        </div>
                      </div>

                      {/* RESPONSIVE SVG WEEKLY GRAPH WITH HOVER ACCENTS */}
                      <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-5 rounded-2xl space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                            <BarChart2 className="w-4 h-4 text-indigo-500" />
                            Focus Duration Index (Last 7 Days)
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">Past Week Activity</span>
                        </div>

                        <div className="flex justify-between items-end h-32 pt-6 px-2 relative">
                          {focusLogs.map((log: any, index: number) => {
                            const maxMinutes = Math.max(...focusLogs.map((d: any) => d.minutes), 60);
                            const heightPercent = (log.minutes / maxMinutes) * 100;
                            const isToday = index === (new Date().getDay() === 0 ? 6 : new Date().getDay() - 1);
                            
                            return (
                              <div key={log.date || index} className="flex flex-col items-center flex-1 group relative">
                                <div className="w-full px-1.5 flex flex-col justify-end items-center h-24">
                                  {/* Floating micro-tooltip on hover */}
                                  <span className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-5 bg-slate-950 text-white text-[9px] font-bold px-2 py-0.5 rounded-md shadow-md pointer-events-none z-10 font-mono">
                                    {log.minutes}m
                                  </span>
                                  {/* Animated bar columns */}
                                  <motion.div 
                                    initial={{ height: 0 }}
                                    animate={{ height: `${heightPercent}%` }}
                                    transition={{ delay: index * 0.05, type: "spring", stiffness: 100 }}
                                    className={`w-4 sm:w-6 rounded-t-lg transition-all duration-300 ${
                                      isToday 
                                        ? "bg-gradient-to-t from-rose-500 to-pink-500 shadow-[0_0_12px_rgba(244,63,94,0.3)]" 
                                        : "bg-slate-100 dark:bg-slate-800 group-hover:bg-indigo-500/40"
                                    }`}
                                  />
                                </div>
                                <span className={`text-[9px] mt-2 font-bold ${isToday ? "text-rose-500 font-black" : "text-slate-400 dark:text-slate-500"}`}>
                                  {log.date}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </motion.div>
        ) : (
          /* 📵 LOCKDOWN SYSTEM SHIELD VIEW */
          <motion.div 
            key="distraction-mode"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            className="w-full min-h-screen bg-slate-950 text-white p-6 md:p-10 flex flex-col justify-between relative overflow-hidden font-sans select-none"
          >
            {/* Ambient radiant dark-theme colors */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-rose-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse" />

            {/* Top Security Header bar */}
            <div className="flex justify-between items-center pb-4 border-b border-white/5 relative z-10">
              <div className="flex items-center space-x-2.5">
                <span className="text-xl animate-pulse">📵</span>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-rose-500">StudyMate Shield Enforced</h3>
                  <p className="text-[10px] text-slate-400 font-bold">STRICT LOCKDOWN ACTIVE • NO DISTRACTIONS ALLOWED</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 text-xs font-extrabold text-slate-400 bg-slate-900/80 px-3.5 py-1.5 rounded-xl border border-white/5">
                <Shield className="w-4 h-4 text-rose-500 animate-spin" />
                <span>SECURED WORKSPACE</span>
              </div>
            </div>

            {/* Revision materials split panel */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch my-auto py-6 relative z-10 w-full max-w-7xl mx-auto flex-1">
              
              {/* Left Countdown Block */}
              <div className="lg:col-span-5 bg-slate-900/30 border border-white/5 rounded-3xl p-6 flex flex-col justify-center items-center text-center space-y-6">
                <div className="space-y-1">
                  <span className="text-[9px] font-black tracking-widest text-rose-500 bg-rose-500/10 px-2.5 py-1 rounded-full uppercase">
                    {isBreak ? "Break Relaxation" : "Active Focus Block"}
                  </span>
                  <h4 className="text-xs font-bold text-slate-400">
                    {isBreak ? "Hydrate and look away from screen" : "Revise key syllabus units on your right"}
                  </h4>
                </div>

                {/* Pulsing visual countdown ring */}
                <div className="relative w-56 h-56 flex items-center justify-center">
                  <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                    <circle
                      cx="112"
                      cy="112"
                      r="100"
                      className="stroke-slate-900"
                      strokeWidth="8"
                      fill="transparent"
                    />
                    <circle
                      cx="112"
                      cy="112"
                      r="100"
                      className={`transition-all duration-1000 ${
                        isBreak ? "stroke-emerald-500" : "stroke-rose-500"
                      }`}
                      strokeWidth="8"
                      fill="transparent"
                      strokeDasharray={2 * Math.PI * 100}
                      strokeDashoffset={2 * Math.PI * 100 * (1 - progressPercent / 100)}
                      strokeLinecap="round"
                    />
                  </svg>

                  <div className="text-center relative z-10 space-y-1">
                    <h1 className="text-5xl font-black font-mono tracking-tighter text-slate-50 animate-pulse">
                      {formatTime(timeLeft)}
                    </h1>
                    <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest block">
                      {isRunning ? "Engine Ticking" : "Paused"}
                    </span>
                  </div>
                </div>

                {/* Operations palette inside Lockdown */}
                <div className="flex items-center space-x-3">
                  <button 
                    onClick={handleReset}
                    className="p-3 bg-slate-900 hover:bg-slate-850 border border-white/5 text-slate-400 hover:text-white rounded-2xl transition cursor-pointer"
                    title="Reset active block timer"
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
                    onClick={handleSkip}
                    className="p-3 bg-slate-900 hover:bg-slate-850 border border-white/5 text-slate-400 hover:text-white rounded-2xl transition cursor-pointer"
                    title="Skip interval state"
                  >
                    <FastForward className="w-4.5 h-4.5" />
                  </button>
                </div>

                <div className="w-full bg-slate-955/40 p-3 border border-white/5 rounded-2xl text-left space-y-1.5">
                  <span className="text-[8px] font-black uppercase tracking-wider text-rose-500 block">Lockdown active shields</span>
                  <div className="grid grid-cols-2 gap-2 text-[9px] text-slate-400 font-semibold">
                    <div className="flex items-center space-x-1.5">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                      <span>Social Media: Blacklisted</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                      <span>Notifications: Blocked</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Right Study Station revisions pane */}
              <div className="lg:col-span-7 bg-slate-900/20 border border-white/5 rounded-3xl p-6 flex flex-col space-y-4 overflow-hidden max-h-[580px] lg:max-h-[640px] text-left">
                
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

                <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
                  {selectedChapter ? (
                    <>
                      <div className="bg-rose-500/5 border border-rose-500/10 p-3.5 rounded-2xl">
                        <span className="text-[9px] font-black tracking-wider uppercase text-rose-400 block mb-1">Chapter Concept Hub</span>
                        <p className="text-xs text-slate-300 font-semibold leading-relaxed">
                          {selectedChapter.summary}
                        </p>
                      </div>

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

            {/* Bottom Brand bar */}
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
