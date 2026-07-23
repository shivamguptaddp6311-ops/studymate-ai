import React, { useState, useEffect } from "react";
import { Habit, UserProfile } from "../types";
import { 
  GlassCard, HeroCard, QuickActionCard, ProgressCard, AnalyticsCard, 
  AchievementCard, AICard, TimelineCard, EmptyStateCard, PremiumButton, 
  PremiumInput, PremiumDialog, PremiumBottomSheet, PremiumIcon, PremiumCard 
} from "./PremiumUI";
import { 
  Flame, Calendar, Sparkles, Check, Plus, Trash2, Award, 
  TrendingUp, Activity, ChevronRight, X, Bell, Dumbbell, BookOpen, Brain, 
  Zap, Sparkle, Trophy, Info, Heart, RefreshCw, Star, Play, Coffee, Compass, ListTodo, Sliders, ChevronDown, MessageSquare
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Confetti from "./Confetti";

interface HabitsProps {
  habits: Habit[];
  onToggleHabitDate: (id: string, date: string) => void;
  onAddHabit: (
    name: string, 
    icon: string, 
    color: string, 
    subject?: string, 
    reminderTime?: string, 
    difficulty?: "Easy" | "Medium" | "Hard", 
    xpReward?: number
  ) => void;
  onDeleteHabit: (id: string) => void;
  profile: UserProfile;
}

const COLOR_PRESETS = [
  { class: "indigo", bg: "bg-indigo-500", text: "text-indigo-500", border: "border-indigo-100 dark:border-indigo-900/40", shadow: "shadow-indigo-500/10", gradient: "from-indigo-500 to-purple-600" },
  { class: "emerald", bg: "bg-emerald-500", text: "text-emerald-500", border: "border-emerald-100 dark:border-emerald-900/40", shadow: "shadow-emerald-500/10", gradient: "from-emerald-400 to-teal-600" },
  { class: "sky", bg: "bg-sky-500", text: "text-sky-500", border: "border-sky-100 dark:border-sky-900/40", shadow: "shadow-sky-500/10", gradient: "from-sky-400 to-blue-600" },
  { class: "amber", bg: "bg-amber-500", text: "text-amber-500", border: "border-amber-100 dark:border-amber-900/40", shadow: "shadow-amber-500/10", gradient: "from-amber-400 to-orange-500" },
  { class: "rose", bg: "bg-rose-500", text: "text-rose-500", border: "border-rose-100 dark:border-rose-900/40", shadow: "shadow-rose-500/10", gradient: "from-rose-500 to-pink-600" },
  { class: "purple", bg: "bg-purple-500", text: "text-purple-500", border: "border-purple-100 dark:border-purple-900/40", shadow: "shadow-purple-500/10", gradient: "from-purple-500 to-indigo-600" }
];

const HABIT_ICONS = ["📚", "📖", "💧", "🏃", "🧘", "🌙", "🥦", "✏️", "🎨", "🚴", "🧬", "🧪", "💻", "🧠", "🎯"];

export default function Habits({ habits, onToggleHabitDate, onAddHabit, onDeleteHabit, profile }: HabitsProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("📚");
  const [color, setColor] = useState("indigo");
  
  // Custom Habit attributes
  const [subject, setSubject] = useState("General");
  const [reminderTime, setReminderTime] = useState("07:00 AM");
  const [difficulty, setDifficulty] = useState<"Easy" | "Medium" | "Hard">("Medium");

  // Animations & rewards
  const [showConfetti, setShowConfetti] = useState(false);
  const [xpBurst, setXpBurst] = useState<{ id: string; amount: number } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filters & collapsible sections
  const [filterMode, setFilterMode] = useState<"All" | "Today" | "Pending">("All");
  const [showHeatmapDetail, setShowHeatmapDetail] = useState(false);

  // AI Insights State
  const [aiInsight, setAiInsight] = useState<string>(() => {
    return "Consistency is the compound interest of academic success. StudyMate AI analyzes your routine: complete at least 2 habits today to trigger your 1.2x streak multiplier bonus!";
  });
  const [loadingAI, setLoadingAI] = useState(false);

  const todayStr = new Date().toISOString().split("T")[0];

  // Chiptune chord feedback
  const playRewardSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + index * 0.08);
        gain.gain.setValueAtTime(0.08, ctx.currentTime + index * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + index * 0.08 + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + index * 0.08);
        osc.stop(ctx.currentTime + index * 0.08 + 0.35);
      });
    } catch (e) {
      console.warn("Audio Context failed:", e);
    }
  };

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Generate current week dates (Monday to Sunday)
  const getCurrentWeekDays = () => {
    const current = new Date();
    const week = [];
    const day = current.getDay();
    const diff = current.getDate() - day + (day === 0 ? -6 : 1); // Monday start
    const startOfWeek = new Date(current.setDate(diff));
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      week.push(d.toISOString().split("T")[0]);
    }
    return week;
  };

  const currentWeekDays = getCurrentWeekDays();

  // Helper to generate past 30 days dates for Heatmap
  const getPast30Days = () => {
    const dates: string[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split("T")[0]);
    }
    return dates;
  };

  const past30Days = getPast30Days();

  // Calculate stats for a specific habit
  const getHabitStats = (habit: Habit) => {
    const totalCompletions = habit.datesCompleted.length;
    const completedToday = habit.datesCompleted.includes(todayStr);
    
    // Streaks calculation
    let currentStreak = 0;
    const checkDate = new Date();
    while (true) {
      const checkStr = checkDate.toISOString().split("T")[0];
      if (habit.datesCompleted.includes(checkStr)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    const completionRate30Days = Math.round((totalCompletions / 30) * 100);

    return { totalCompletions, completedToday, currentStreak, completionRate30Days };
  };

  const handleToggle = (id: string) => {
    const habit = habits.find((h) => h.id === id);
    if (!habit) return;

    const isCompleting = !habit.datesCompleted.includes(todayStr);

    if (isCompleting) {
      setShowConfetti(true);
      playRewardSound();
      setXpBurst({ id, amount: 30 });
      setTimeout(() => setXpBurst(null), 1400);
      triggerToast(`🔥 Daily Routine met! Checked in "${habit.name}" (+30 XP)`);
    } else {
      triggerToast(`Removed check-in for "${habit.name}"`);
    }

    onToggleHabitDate(id, todayStr);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Default XP rewards based on difficulty
    const xpMap = { Easy: 15, Medium: 30, Hard: 50 };
    const xpReward = xpMap[difficulty];

    onAddHabit(name, icon, color, subject, reminderTime, difficulty, xpReward);
    setName("");
    setIcon("📚");
    setColor("indigo");
    setSubject("General");
    setReminderTime("07:00 AM");
    setDifficulty("Medium");
    setShowAdd(false);
    triggerToast(`📝 Created new quest: "${name}" (+15 Creation XP)`);
  };

  // Day-wise combined check-in count for heatmap
  const getHeatmapIntensity = (dateStr: string) => {
    return habits.filter((h) => h.datesCompleted.includes(dateStr)).length;
  };

  // Streaks & Stats aggregates
  const totalHabitsCompletedToday = habits.filter((h) => h.datesCompleted.includes(todayStr)).length;
  const overallCompletionRate = habits.length 
    ? Math.round((habits.reduce((acc, h) => acc + h.datesCompleted.length, 0) / (habits.length * 30)) * 100)
    : 0;

  const currentStreakValue = habits.length 
    ? Math.max(...habits.map(h => getHabitStats(h).currentStreak), 0)
    : 0;

  const todayProgressPercent = habits.length 
    ? Math.round((totalHabitsCompletedToday / habits.length) * 100) 
    : 0;

  // Compute total habit XP rewards accumulated
  const totalHabitsCompletions = habits.reduce((acc, h) => acc + h.datesCompleted.length, 0);
  const totalXpEarnedFromHabits = (totalHabitsCompletions * 30) + (habits.length * 15);

  // Fetch live AI Coach consistency tips
  const fetchAICoachAdvice = async () => {
    setLoadingAI(true);
    try {
      const token = localStorage.getItem("studymate_token") || "";
      const habitDetailsStr = habits.map(h => {
        const stats = getHabitStats(h);
        return `"${h.name}" (Streak: ${stats.currentStreak}d, total completed: ${stats.totalCompletions}, difficulty: ${h.difficulty || "Medium"}, subject: ${h.subject || "General"})`;
      }).join(", ");

      const promptText = `Generate a highly motivating, hyper-encouraging, 2-sentence study-consistency advice and 3 specific bullet points inspired by Duolingo, Habitica, and Apple Fitness coaches. 
      The student's details are:
      - Grade Level: ${profile.classGrade}
      - Target Exam: ${profile.targetExam}
      - Favorite Subjects: ${profile.favoriteSubjects.join(", ") || "None"}
      - Weak Subjects: ${profile.weakSubjects.join(", ") || "None"}
      - Current streak: ${currentStreakValue} days
      - Habits listed: ${habitDetailsStr || "No habits added yet"}

      Keep the tone highly energetic, friendly, deeply personalized, with absolutely no developer jargon or preambles. Frame it beautifully with emojis.`;

      let response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          message: promptText,
          history: [],
          provider: localStorage.getItem("studymate_ai_provider") || "auto"
        })
      });

      if (response.status === 401) {
        // Reauth flow similar to StudyMateAI
        const email = localStorage.getItem("studymate_logged_in_email") || "";
        if (email) {
          const reauthRes = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ emailAddress: email })
          });
          if (reauthRes.ok) {
            const reauthData = await reauthRes.json();
            const newToken = reauthData.token;
            localStorage.setItem("studymate_token", newToken);
            response = await fetch("/api/gemini/chat", {
              method: "POST",
              headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${newToken}`
              },
              body: JSON.stringify({
                message: promptText,
                history: [],
                provider: localStorage.getItem("studymate_ai_provider") || "auto"
              })
            });
          }
        }
      }

      if (response.ok) {
        const data = await response.json();
        if (data.text) {
          setAiInsight(data.text);
          triggerToast("✨ Custom AI habit summary updated!");
        }
      } else {
        throw new Error("API call failed");
      }
    } catch (err) {
      console.warn("Failed to retrieve live AI consistency advice, utilizing fallback:", err);
      // Beautiful fallback
      setAiInsight(`🚀 Awesome momentum! Your ${currentStreakValue}-day consistency matches top percentile scholars preparing for ${profile.targetExam}. Strengthen your weak topics by grouping them with a reward system today!`);
    } finally {
      setLoadingAI(false);
    }
  };

  // Color Mapping for different subjects
  const getSubjectTagStyle = (subj?: string) => {
    const s = (subj || "General").toLowerCase();
    if (s.includes("math")) return "bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border-sky-100/30";
    if (s.includes("scie") || s.includes("phys") || s.includes("chem") || s.includes("biol")) {
      return "bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 border-violet-100/30";
    }
    if (s.includes("eng") || s.includes("lit") || s.includes("lang")) {
      return "bg-pink-50 dark:bg-pink-950/40 text-pink-600 dark:text-pink-400 border-pink-100/30";
    }
    if (s.includes("code") || s.includes("comp") || s.includes("tech")) {
      return "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-100/30";
    }
    return "bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 border-slate-100/30";
  };

  // Filter list items
  const filteredHabits = habits.filter((h) => {
    const completedToday = h.datesCompleted.includes(todayStr);
    if (filterMode === "Today") return true; // Show all active today
    if (filterMode === "Pending") return !completedToday;
    return true; // "All"
  });

  return (
    <div id="consistency_habits_flagship" className="space-y-8 relative pb-12">
      <Confetti active={showConfetti} onComplete={() => setShowConfetti(false)} />

      {/* FLOAT TOAST FEEDBACK */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 dark:bg-slate-800 text-white text-xs font-black px-6 py-3.5 rounded-2xl shadow-xl border border-slate-800 dark:border-slate-700 flex items-center gap-2.5 z-55 pointer-events-none"
          >
            <Sparkle className="w-4 h-4 text-amber-400 animate-spin" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TITLE RAIL */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white/50 dark:bg-slate-900/40 backdrop-blur-md border border-slate-150/40 dark:border-slate-800/80 p-6 rounded-3xl gap-4 shadow-sm">
        <div className="flex items-center space-x-3.5 text-left">
          <div className="p-3 bg-gradient-to-tr from-orange-500 to-amber-400 text-white rounded-2xl shadow-lg shadow-orange-500/20">
            <Flame className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-855 dark:text-slate-100 tracking-tight font-display flex items-center gap-1.5">
              Habit Arena
            </h1>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
              Duolingo & Habitica-inspired consistency tracker. Power-up your routine & earn daily multiplier XP.
            </p>
          </div>
        </div>

        <button 
          onClick={() => setShowAdd(true)}
          className="flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white px-5 py-3 rounded-xl text-xs font-extrabold shadow-lg shadow-indigo-600/15 transition-all duration-200 cursor-pointer active:scale-95"
        >
          <Plus className="w-4.5 h-4.5" />
          <span>New Daily Quest</span>
        </button>
      </div>

      {/* FLAGSHIP BENTO HERO METRICS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* BIG STREAK & LEVEL UP CARD (7 Columns) */}
        <div className="lg:col-span-7 bg-gradient-to-br from-indigo-950 via-slate-900 to-violet-950 text-white p-7 rounded-3xl shadow-xl relative overflow-hidden border border-indigo-500/10 flex flex-col justify-between min-h-[290px]">
          
          {/* Back glows */}
          <div className="absolute right-0 top-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-[90px] pointer-events-none translate-x-20 -translate-y-10" />
          <div className="absolute left-1/3 bottom-0 w-60 h-60 bg-violet-500/10 rounded-full blur-[80px] pointer-events-none translate-y-20" />

          {/* Top segment */}
          <div className="relative z-10 flex justify-between items-start">
            <div className="space-y-1.5 text-left">
              <span className="text-[10px] uppercase font-black tracking-widest text-indigo-400/90 flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                Active Streak Engine
              </span>
              <h2 className="text-2xl md:text-3xl font-black font-display tracking-tight leading-tight">
                {currentStreakValue > 0 ? `🔥 ${currentStreakValue} Day Streak!` : "🌱 Setup Daily Quest"}
              </h2>
              <p className="text-xs text-indigo-200/80 font-medium max-w-sm">
                {currentStreakValue >= 4 
                  ? "Incredible flow state! 1.2x streak booster is actively multiplying all study session tasks." 
                  : "Check in 4 days concurrently to activate the study multiplier bonus!"}
              </p>
            </div>

            {/* Glowing fire emblem */}
            <div className="relative">
              <div className="absolute inset-0 bg-orange-500 rounded-full blur-xl opacity-40 animate-pulse" />
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-400 flex items-center justify-center text-3xl shadow-xl shadow-orange-500/20 relative z-10 border border-orange-400/30">
                🔥
              </div>
            </div>
          </div>

          {/* Bottom stats row */}
          <div className="relative z-10 pt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-indigo-900/60 mt-6 text-left">
            <div className="space-y-1">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">XP From Quests</span>
              <div className="flex items-center gap-1">
                <Zap className="w-4 h-4 text-indigo-400" />
                <span className="text-base font-black font-mono">{totalXpEarnedFromHabits} <span className="text-[9px] text-slate-500 font-medium">XP</span></span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Completion Rate</span>
              <div className="flex items-center gap-1">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span className="text-base font-black font-mono">{overallCompletionRate}%</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Weekly Target</span>
              <div className="flex items-center gap-1">
                <Award className="w-4 h-4 text-amber-400" />
                <span className="text-base font-black font-mono">
                  {totalHabitsCompletedToday} <span className="text-[10px] text-slate-400 font-bold">/ {habits.length || 5}</span>
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Today's Progress</span>
              <div className="w-full bg-slate-850 h-2.5 rounded-full mt-2 overflow-hidden border border-slate-800">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${todayProgressPercent}%` }}
                  transition={{ duration: 1 }}
                  className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full"
                />
              </div>
            </div>
          </div>

        </div>

        {/* APPLE FITNESS STYLE CONCENTRIC PROGRESS CARD (5 Columns) */}
        <div className="lg:col-span-5 bg-white/70 dark:bg-slate-900/60 border border-slate-150/40 dark:border-slate-800/80 backdrop-blur-md p-6 rounded-3xl flex items-center justify-between shadow-sm relative overflow-hidden gap-5">
          
          <div className="space-y-3 flex-1 text-left">
            <span className="text-[10px] uppercase font-black tracking-wider text-rose-500 dark:text-rose-400 block">
              Daily Rings Completed
            </span>
            <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 font-display leading-tight">
              Apple Fitness Rings
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium leading-relaxed">
              Close your green routine ring and amber difficulty ring today to secure your consistency level!
            </p>
            
            <div className="space-y-1.5 pt-2">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                <span className="w-2.5 h-2.5 rounded bg-emerald-500" />
                <span>Routine Rings: {todayProgressPercent}% met</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                <span className="w-2.5 h-2.5 rounded bg-amber-500" />
                <span>Goal Momentum: {overallCompletionRate}% last 30d</span>
              </div>
            </div>
          </div>

          {/* Concentric Double SVG Rings */}
          <div className="relative flex items-center justify-center w-28 h-28 shrink-0">
            <svg className="w-28 h-28 transform -rotate-90">
              {/* Outer Ring base */}
              <circle
                cx="56"
                cy="56"
                r="44"
                stroke="currentColor"
                className="text-slate-100 dark:text-slate-800/40"
                strokeWidth="7"
                fill="transparent"
              />
              {/* Outer Ring progress */}
              <motion.circle
                cx="56"
                cy="56"
                r="44"
                stroke="url(#outerRingGrad)"
                strokeWidth="7"
                fill="transparent"
                strokeDasharray={2 * Math.PI * 44}
                initial={{ strokeDashoffset: 2 * Math.PI * 44 }}
                animate={{ strokeDashoffset: (2 * Math.PI * 44) - (todayProgressPercent / 100) * (2 * Math.PI * 44) }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                strokeLinecap="round"
              />

              {/* Inner Ring base */}
              <circle
                cx="56"
                cy="56"
                r="32"
                stroke="currentColor"
                className="text-slate-50 dark:text-slate-800/20"
                strokeWidth="6"
                fill="transparent"
              />
              {/* Inner Ring progress */}
              <motion.circle
                cx="56"
                cy="56"
                r="32"
                stroke="url(#innerRingGrad)"
                strokeWidth="6"
                fill="transparent"
                strokeDasharray={2 * Math.PI * 32}
                initial={{ strokeDashoffset: 2 * Math.PI * 32 }}
                animate={{ strokeDashoffset: (2 * Math.PI * 32) - (overallCompletionRate / 100) * (2 * Math.PI * 32) }}
                transition={{ duration: 1.2, ease: "easeOut", delay: 0.15 }}
                strokeLinecap="round"
              />

              <defs>
                <linearGradient id="outerRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#34d399" />
                </linearGradient>
                <linearGradient id="innerRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#fbbf24" />
                </linearGradient>
              </defs>
            </svg>
            
            {/* Center percentage indicator */}
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-xs font-black text-slate-800 dark:text-slate-100 font-mono">
                {todayProgressPercent}%
              </span>
              <span className="text-[7px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Today
              </span>
            </div>
          </div>

        </div>

      </div>

      {/* WEEKLY ANIMATED HEATMAP SECTION */}
      <div className="bg-white/70 dark:bg-slate-900/60 border border-slate-150/40 dark:border-slate-800/80 backdrop-blur-md p-6 rounded-3xl shadow-sm text-left space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="space-y-0.5">
            <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-1.5">
              <Activity className="w-4.5 h-4.5 text-indigo-500" />
              Interactive Weekly Heatmap
            </h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
              Daily habit completions of the current week. Glowing segments represent targets completed.
            </p>
          </div>

          <button
            onClick={() => setShowHeatmapDetail(!showHeatmapDetail)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[10px] font-extrabold text-slate-650 dark:text-slate-300 rounded-xl cursor-pointer transition-all self-start sm:self-center"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>{showHeatmapDetail ? "Collapse 30-Day View" : "Show 30-Day Heatmap"}</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${showHeatmapDetail ? "rotate-180" : ""}`} />
          </button>
        </div>

        {/* Horizontal Weekly Row */}
        <div className="grid grid-cols-2 sm:grid-cols-7 gap-3.5 pt-1.5">
          {currentWeekDays.map((dayStr) => {
            const completedHabitsOnDay = habits.filter(h => h.datesCompleted.includes(dayStr));
            const intensity = completedHabitsOnDay.length;
            const isToday = dayStr === todayStr;
            const meetsGoal = intensity >= Math.min(2, habits.length);

            // Fetch Date Info
            const dateObj = new Date(dayStr);
            const dayName = dateObj.toLocaleDateString("en-US", { weekday: "short" });
            const dayNum = dateObj.getDate();

            return (
              <motion.div
                key={dayStr}
                whileHover={{ y: -3, scale: 1.02 }}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between items-center h-28 relative overflow-hidden ${
                  isToday 
                    ? "border-indigo-500 shadow-md shadow-indigo-500/5 bg-indigo-50/20 dark:bg-indigo-950/25" 
                    : meetsGoal
                      ? "border-emerald-200 dark:border-emerald-900/30 bg-emerald-500/5 dark:bg-emerald-950/5"
                      : "border-slate-100 dark:border-slate-800/80 bg-slate-50/20 dark:bg-slate-900/10"
                }`}
              >
                {/* Background active watermark */}
                {meetsGoal && (
                  <div className="absolute -right-3 -bottom-3 text-emerald-500/10 text-4xl select-none pointer-events-none">
                    ✔️
                  </div>
                )}

                <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 block">
                  {dayName}
                </span>

                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-mono font-black text-xs z-10 ${
                  isToday 
                    ? "bg-indigo-600 text-white" 
                    : meetsGoal
                      ? "bg-emerald-500 text-white"
                      : intensity > 0
                        ? "bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                }`}>
                  {dayNum}
                </div>

                <div className="text-center z-10">
                  {intensity > 0 ? (
                    <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 flex items-center justify-center gap-0.5">
                      🔥 {intensity} check-in{intensity > 1 ? "s" : ""}
                    </span>
                  ) : (
                    <span className="text-[9px] text-slate-400 dark:text-slate-650 font-bold block">
                      Missed
                    </span>
                  )}
                </div>

                {isToday && (
                  <div className="absolute top-1 right-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-ping absolute" />
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 relative block" />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* 30-Day Heatmap Detail Expandable Section */}
        <AnimatePresence>
          {showHeatmapDetail && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden border-t border-slate-100 dark:border-slate-800 pt-5 space-y-4"
            >
              <div>
                <h4 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                  30-Day Routine Intensity Calendar
                </h4>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                  Overall historical perspective. Deep purple grids show the highest level of daily habit completion.
                </p>
              </div>

              <div className="flex flex-col items-center">
                <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 p-3 bg-slate-50/50 dark:bg-slate-900/20 border border-slate-100 dark:border-slate-800 rounded-2xl w-full max-w-2xl justify-center">
                  {past30Days.map((dateStr) => {
                    const intensity = getHeatmapIntensity(dateStr);
                    let colorClass = "bg-slate-100 dark:bg-slate-800/50 text-slate-400 dark:text-slate-600";
                    if (intensity === 1) colorClass = "bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200/20";
                    else if (intensity === 2) colorClass = "bg-indigo-300/80 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300";
                    else if (intensity === 3) colorClass = "bg-indigo-500 text-white shadow-sm shadow-indigo-500/10";
                    else if (intensity >= 4) colorClass = "bg-indigo-700 text-white shadow-md shadow-indigo-700/15 ring-2 ring-indigo-500/20";

                    return (
                      <div 
                        key={dateStr}
                        className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center text-[11px] font-mono font-bold relative group cursor-help transition-all hover:scale-105 active:scale-95 ${colorClass}`}
                      >
                        <span>{new Date(dateStr).getDate()}</span>
                        
                        {/* Tooltip */}
                        <span className="absolute bottom-12 scale-0 group-hover:scale-100 transition-all bg-slate-900 dark:bg-slate-800 text-white text-[9px] px-2.5 py-1.5 rounded-lg shadow-lg whitespace-nowrap z-20 pointer-events-none border border-slate-700 font-sans font-medium">
                          {new Date(dateStr).toLocaleDateString([], { month: "short", day: "numeric" })}: {intensity} habits checked
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="flex flex-wrap items-center justify-center gap-3 text-[9px] text-slate-400 dark:text-slate-500 mt-4 font-black uppercase tracking-wider">
                  <span>Missed</span>
                  <div className="w-4 h-4 rounded bg-slate-100 dark:bg-slate-800/50" />
                  <div className="w-4 h-4 rounded bg-indigo-100 dark:bg-indigo-950/40" />
                  <div className="w-4 h-4 rounded bg-indigo-300/80" />
                  <div className="w-4 h-4 rounded bg-indigo-500" />
                  <div className="w-4 h-4 rounded bg-indigo-700" />
                  <span>Maximum (4+)</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* AI INSIGHTS COACH (DUOLINGO STYLE EXTREMELY REWARDING SUMMARY) */}
      <div className="bg-gradient-to-r from-purple-500/10 via-indigo-500/5 to-pink-500/10 dark:from-purple-950/30 dark:via-indigo-950/15 dark:to-pink-950/30 border border-purple-500/20 p-6 rounded-3xl text-left shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        
        {/* Decorative dynamic neon background circle */}
        <div className="absolute right-0 top-0 w-36 h-36 bg-purple-500/10 rounded-full blur-2xl pointer-events-none translate-x-10 -translate-y-10" />

        <div className="flex items-start space-x-4 flex-1">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center text-3xl shadow-lg shadow-purple-500/20 shrink-0 relative">
            <span>🦉</span>
            <span className="absolute -bottom-1 -right-1 bg-emerald-500 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 animate-pulse" />
          </div>

          <div className="space-y-1 flex-1">
            <h4 className="text-xs uppercase font-extrabold tracking-widest text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
              <Brain className="w-4 h-4" />
              StudyMate Coach Advisor
            </h4>
            <div className="text-xs font-bold text-slate-700 dark:text-slate-200 leading-relaxed font-sans max-w-2xl whitespace-pre-line">
              {aiInsight}
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold pt-1 flex items-center gap-1">
              <Info className="w-3.5 h-3.5" />
              Updated dynamically based on study behaviors, strengths, and goals.
            </p>
          </div>
        </div>

        <button
          onClick={fetchAICoachAdvice}
          disabled={loadingAI}
          className="flex items-center space-x-1.5 px-4.5 py-3 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-800 text-xs font-black rounded-xl shadow-sm transition-all duration-150 cursor-pointer shrink-0 disabled:opacity-50 active:scale-95"
        >
          {loadingAI ? (
            <>
              <RefreshCw className="w-4 h-4 text-indigo-500 animate-spin" />
              <span>Analyzing Routine...</span>
            </>
          ) : (
            <>
              <MessageSquare className="w-4 h-4 text-purple-500" />
              <span>Request Personal Insights</span>
            </>
          )}
        </button>

      </div>

      {/* CORE INTERACTIVE HABITS ARENA */}
      <div className="space-y-4">
        
        {/* SWITCH TABS HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-150/40 dark:border-slate-800 pb-3 gap-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <ListTodo className="w-4 h-4" />
            </div>
            <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm uppercase tracking-wider">
              Target Habit Quests
            </h3>
          </div>

          {/* Segment Filter Selection */}
          <div className="p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl flex items-center self-start sm:self-center border border-slate-200/30 dark:border-slate-700/50">
            {(["All", "Today", "Pending"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setFilterMode(mode)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-black tracking-wide uppercase transition-all cursor-pointer ${
                  filterMode === mode
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                {mode === "All" ? "All Quests" : mode === "Today" ? "Active Today" : "Pending Quests"}
              </button>
            ))}
          </div>
        </div>

        {/* INTERACTIVE PREMIUM LIST OF HABIT CARDS */}
        {filteredHabits.length === 0 ? (
          <EmptyStateCard
            icon={<Flame className="w-8 h-8 text-amber-500" />}
            title="No Active Study Habits or Quests"
            description="Consistent daily habits trigger compound learning momentum. Build your first academic quest now or pick an AI suggested habit below!"
            motivationalQuote="We are what we repeatedly do. Excellence, then, is not an act, but a habit. — Aristotle"
            aiSuggestions={[
              "30 Mins Daily Math Drill",
              "Read 2 Science Chapters",
              "15 Mins Formula Recall",
              "Evening Revision Block"
            ]}
            onSelectSuggestion={(sug) => {
              setName(sug);
              setShowAdd(true);
            }}
            action={{
              label: "+ Create Study Quest",
              onClick: () => setShowAdd(true)
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredHabits.map((habit) => {
              const { totalCompletions, completedToday, currentStreak, completionRate30Days } = getHabitStats(habit);
              
              // Find matching color preset or fallback
              const colorObj = COLOR_PRESETS.find((c) => c.class === habit.color) || COLOR_PRESETS[0];

              return (
                <motion.div
                  key={habit.id}
                  layoutId={`habit-card-${habit.id}`}
                  className={`p-5 rounded-3xl border transition-all duration-300 relative overflow-hidden bg-white/70 dark:bg-slate-900/60 backdrop-blur-md flex flex-col justify-between ${
                    completedToday 
                      ? "border-slate-150/50 dark:border-slate-800/50 opacity-80 shadow-sm" 
                      : `border-slate-200/50 dark:border-slate-800/80 hover:${colorObj.border} hover:shadow-lg hover:${colorObj.shadow}`
                  }`}
                >
                  
                  {/* FLOATING XP BURST OVERLAY ANIMATION */}
                  <AnimatePresence>
                    {xpBurst && xpBurst.id === habit.id && (
                      <motion.div
                        initial={{ opacity: 0, y: 15, scale: 0.6 }}
                        animate={{ opacity: 1, y: -50, scale: 1.3 }}
                        exit={{ opacity: 0, y: -80, scale: 0.8 }}
                        transition={{ duration: 0.9, ease: "easeOut" }}
                        className="absolute right-12 top-6 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black px-3.5 py-1.5 rounded-full text-[10px] shadow-lg flex items-center gap-1 z-30 ring-4 ring-orange-500/10"
                      >
                        <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                        <span>+{xpBurst.amount} XP BURST!</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex items-start justify-between gap-4">
                    {/* Icon Emoji and Quest Info */}
                    <div className="flex items-center space-x-3.5 text-left">
                      <div className={`w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-center text-2xl shadow-inner relative overflow-hidden group-hover:scale-105 transition-all`}>
                        <span className="relative z-10">{habit.icon}</span>
                        {/* Glow color back */}
                        <div className={`absolute inset-0 bg-gradient-to-tr ${colorObj.gradient} opacity-10`} />
                      </div>

                      <div className="space-y-1 text-left">
                        <h4 className={`text-sm font-extrabold tracking-tight leading-snug ${
                          completedToday 
                            ? "line-through text-slate-400 dark:text-slate-500 font-bold" 
                            : "text-slate-800 dark:text-slate-100"
                        }`}>
                          {habit.name}
                        </h4>
                        
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          {/* Subject Tag */}
                          <span className={`inline-flex items-center text-[9px] font-black px-2 py-0.5 rounded-full border ${getSubjectTagStyle(habit.subject)}`}>
                            {habit.subject || "General"}
                          </span>

                          {/* Difficulty Pill */}
                          <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md ${
                            habit.difficulty === "Hard" 
                              ? "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-100/20" 
                              : habit.difficulty === "Easy"
                                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100/20"
                                : "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-100/20"
                          }`}>
                            {habit.difficulty || "Medium"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quick controls row */}
                    <div className="flex items-center space-x-1 shrink-0">
                      <button 
                        onClick={() => onDeleteHabit(habit.id)}
                        className="p-1.5 text-slate-300 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 transition cursor-pointer"
                        title="Delete daily quest"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Core stats indicators */}
                  <div className="grid grid-cols-3 gap-2.5 pt-4 border-t border-slate-100/80 dark:border-slate-850/60 mt-4 text-left">
                    <div className="space-y-0.5">
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Current Streak</span>
                      <div className="flex items-center gap-1">
                        <Flame className={`w-3.5 h-3.5 ${currentStreak > 0 ? "text-orange-500 fill-orange-500/20" : "text-slate-300"}`} />
                        <span className="text-xs font-black font-mono text-slate-750 dark:text-slate-200">{currentStreak} Day{currentStreak === 1 ? "" : "s"}</span>
                      </div>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Consistency (30d)</span>
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
                        <span className="text-xs font-black font-mono text-slate-750 dark:text-slate-200">{completionRate30Days}%</span>
                      </div>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Daily Quest Reward</span>
                      <div className="flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-xs font-black font-mono text-slate-750 dark:text-slate-200">+{habit.xpReward || 30} XP</span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom section: Check in controls & Alerts Info */}
                  <div className="flex items-center justify-between pt-4 mt-1 border-t border-dashed border-slate-100 dark:border-slate-800">
                    <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 font-semibold">
                      <Bell className="w-3.5 h-3.5 text-slate-400" />
                      <span>Alert at {habit.reminderTime || "07:00 AM"}</span>
                    </div>

                    {/* Check-in Toggle Button */}
                    <button 
                      onClick={() => handleToggle(habit.id)}
                      className={`h-9.5 px-4.5 rounded-xl text-xs font-black tracking-wide transition-all flex items-center space-x-1.5 cursor-pointer select-none active:scale-95 ${
                        completedToday 
                          ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/10" 
                          : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-750 dark:text-slate-300"
                      }`}
                    >
                      <div className={`w-4.5 h-4.5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                        completedToday ? "bg-white border-white text-emerald-500 scale-105" : "border-slate-300 dark:border-slate-600"
                      }`}>
                        {completedToday && <Check className="w-3 h-3 stroke-[4px]" />}
                      </div>
                      <span>{completedToday ? "Quest Mastered!" : "Check-in Quest"}</span>
                    </button>
                  </div>

                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* DETAILED DIALOG MODAL FOR DAILY QUEST CREATION */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 text-left"
          >
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 rounded-xl">
                    <Sliders className="w-5 h-5" />
                  </div>
                  <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm uppercase tracking-wider">Configure Daily Quest</h3>
                </div>
                <button onClick={() => setShowAdd(false)} className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full cursor-pointer transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* Name Input */}
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-black tracking-wider text-slate-500 dark:text-slate-400">Habit Quest Name *</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Read 10 Physics CBSE Proofs"
                    className="w-full px-4 py-3 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 font-medium placeholder-slate-400"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                {/* Subject Selector */}
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase font-black tracking-wider text-slate-500 dark:text-slate-400">Academic Subject Tag</label>
                  <select
                    className="w-full px-4 py-3 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 font-medium"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  >
                    <option value="General" className="dark:bg-slate-900">⭐ General Consistency</option>
                    {profile.favoriteSubjects.map((sub) => (
                      <option key={sub} value={sub} className="dark:bg-slate-900">📓 {sub}</option>
                    ))}
                    {profile.weakSubjects.map((sub) => (
                      <option key={`weak-${sub}`} value={sub} className="dark:bg-slate-900">⚠️ {sub} (Weak)</option>
                    ))}
                  </select>
                </div>

                {/* Grid of Icon emoji selection */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] uppercase font-black tracking-wider text-slate-500 dark:text-slate-400">Select Quest Avatar Emoji</label>
                  <div className="grid grid-cols-5 gap-1.5 max-h-[85px] overflow-y-auto p-1.5 bg-slate-50 dark:bg-slate-850/50 rounded-2xl scrollbar-thin border border-slate-100 dark:border-slate-800">
                    {HABIT_ICONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setIcon(emoji)}
                        className={`text-xl p-1.5 hover:scale-110 active:scale-95 transition-all rounded-lg cursor-pointer ${
                          icon === emoji ? "bg-indigo-500/10 border border-indigo-400" : ""
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Segmented difficulty and Reminder controls */}
                <div className="grid grid-cols-2 gap-3">
                  
                  {/* Difficulty */}
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase font-black tracking-wider text-slate-500 dark:text-slate-400">Quest Difficulty</label>
                    <div className="grid grid-cols-3 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-slate-200/20 dark:border-slate-700/50">
                      {(["Easy", "Medium", "Hard"] as const).map((diff) => (
                        <button
                          key={diff}
                          type="button"
                          onClick={() => setDifficulty(diff)}
                          className={`py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                            difficulty === diff
                              ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                              : "text-slate-500 dark:text-slate-400"
                          }`}
                        >
                          {diff}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Reminder Time */}
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase font-black tracking-wider text-slate-500 dark:text-slate-400">Reminder Bell</label>
                    <input 
                      type="text"
                      placeholder="e.g. 07:30 AM"
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 font-medium"
                      value={reminderTime}
                      onChange={(e) => setReminderTime(e.target.value)}
                    />
                  </div>

                </div>

                {/* Color Tag picker */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] uppercase font-black tracking-wider text-slate-500 dark:text-slate-400">Glow Color Band</label>
                  <div className="flex space-x-2.5">
                    {COLOR_PRESETS.map((col) => (
                      <button
                        key={col.class}
                        type="button"
                        onClick={() => setColor(col.class)}
                        className={`w-7 h-7 rounded-full ${col.bg} transition border-2 cursor-pointer ${
                          color === col.class ? "border-slate-800 dark:border-white scale-110 shadow-md" : "border-transparent opacity-80"
                        }`}
                      ></button>
                    ))}
                  </div>
                </div>

                {/* Reward info */}
                <div className="flex items-center space-x-2.5 bg-indigo-50 dark:bg-indigo-950/20 p-3.5 rounded-2xl border border-indigo-100/30 text-[10px] text-indigo-600 dark:text-indigo-400 leading-normal">
                  <Sparkles className="w-4 h-4 text-amber-500 animate-spin-slow shrink-0" />
                  <span>
                    Checking in logs <strong>+30 Quest XP</strong> daily. Master CBSE goals and claim your multiplier rewards!
                  </span>
                </div>

                {/* Submit button */}
                <button 
                  type="submit"
                  className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition shadow-lg shadow-indigo-600/10 cursor-pointer"
                >
                  Confirm Daily Quest
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
}
