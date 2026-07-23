import React, { useState, useEffect } from "react";
import { UserProfile, Task, Alarm, Habit, TimetableItem } from "../types";
import { MOTIVATIONAL_QUOTES } from "../data";
import { motion, AnimatePresence } from "motion/react";
import { 
  GlassCard, HeroCard, QuickActionCard, ProgressCard, AnalyticsCard, 
  AchievementCard, AICard, TimelineCard, EmptyStateCard, PremiumButton, 
  PremiumInput, PremiumDialog, PremiumBottomSheet, PremiumIcon, PremiumCard 
} from "./PremiumUI";
import { 
  Sparkles, Calendar, Bell, Trophy, Plus, Clock, Play, CheckCircle2, 
  X, Check, Flame, ChevronRight, BookOpen, AlertTriangle, User, Award, Timer,
  Mic, Camera, Image as ImageIcon, Lightbulb, BarChart3, RefreshCw, TrendingUp, Info,
  ClipboardList, HelpCircle, Gamepad2, MessageSquare, Settings, ChevronDown, ChevronUp,
  Activity, Book, Target, Sparkle, AlertCircle, CheckCircle, MessageCircle, Zap, Layers,
  Compass, ArrowUpRight, Sliders, ChevronLeft, Search
} from "lucide-react";

interface DashboardProps {
  profile: UserProfile;
  tasks: Task[];
  alarms: Alarm[];
  habits: Habit[];
  studyHoursToday: number;
  timetable?: TimetableItem[];
  onAddTask: (title: string, priority: "High" | "Medium" | "Low", subject: string, deadline?: string, notes?: string) => void;
  onToggleTask: (id: string) => void;
  onNavigate: (tab: string) => void;
  onTriggerAlarmChallenge: (alarm: Alarm) => void;
  onLogStudyHours: (hours: number) => void;
  onToggleHabitDate?: (id: string, dateStr: string) => void;
  onOpenSearch?: () => void;
}

export default function Dashboard({
  profile,
  tasks,
  alarms,
  habits,
  studyHoursToday,
  timetable = [],
  onAddTask,
  onToggleTask,
  onNavigate,
  onTriggerAlarmChallenge,
  onLogStudyHours,
  onToggleHabitDate,
  onOpenSearch
}: DashboardProps) {
  const [quote, setQuote] = useState({ quote: "", author: "" });
  const [time, setTime] = useState(new Date());
  const [quickTaskTitle, setQuickTaskTitle] = useState("");
  const [quickTaskPriority, setQuickTaskPriority] = useState<"High" | "Medium" | "Low">("Medium");
  const [quickTaskSubject, setQuickTaskSubject] = useState("");
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [logAmount, setLogAmount] = useState(1);
  const [showLogHours, setShowLogHours] = useState(false);
  const [loading, setLoading] = useState(true);
  const [aiRecommendations, setAiRecommendations] = useState<string[]>([]);
  const [isRegeneratingInsights, setIsRegeneratingInsights] = useState(false);
  const [showFriendlyError, setShowFriendlyError] = useState(false);

  // Active Smart Stack filter tab state ('all', 'homework', 'alarm', 'timetable', 'habits', 'focus', 'ai', 'stats')
  const [activeStackTab, setActiveStackTab] = useState<string>("all");

  // Custom states for expandable widgets to collapse/expand
  const [expandedWidgets, setExpandedWidgets] = useState<Record<string, boolean>>({
    continueLearning: true,
    homework: true,
    alarm: true,
    nextClass: true,
    habits: true,
    focusSprint: true,
    recentActivity: true,
    weeklyProgress: true,
    aiRecommendations: true,
    recentChats: false,
  });

  const toggleWidget = (key: string) => {
    setExpandedWidgets(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  useEffect(() => {
    // Generate intelligent AI recommendations based on user's real stats on mount
    const recs = [
      `Dedicate 25 minutes to your weakest subject (${profile.favoriteSubjects[1] || "Social Science"}) using Focus Sprint today.`,
      `Since you are preparing for ${profile.targetExam}, complete at least one chapter checkpoint under 10-Day Test.`,
      studyHoursToday >= profile.dailyStudyGoal 
        ? "Fantastic! You hit your daily study goal. Enjoy downtime or try Cognitive Games to train working memory!"
        : `You need ${Math.max(0.5, profile.dailyStudyGoal - studyHoursToday)} more study hours to reach today's goal. Log a sprint now!`
    ];
    setAiRecommendations(recs);
    
    const timer = setTimeout(() => {
      setLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [profile.favoriteSubjects, profile.targetExam, studyHoursToday, profile.dailyStudyGoal]);

  const handleRegenerateRecommendations = () => {
    setIsRegeneratingInsights(true);
    setTimeout(() => {
      const advancedRecs = [
        `Review important board exam patterns for ${profile.favoriteSubjects[0] || "Mathematics"} to gain peak board confidence.`,
        `Your study consistency is excellent! Take a 5-minute break for every 25 minutes of high-focus study.`,
        `Practice 3 previous year questions (PYQs) under the "10-Day Test" tab for CBSE scoring excellence.`
      ];
      setAiRecommendations(advancedRecs);
      setIsRegeneratingInsights(false);
    }, 550);
  };
  
  // Permissions gateway states
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [permissions, setPermissions] = useState<{
    notifications: "default" | "granted" | "denied";
    camera: "default" | "granted" | "denied";
    microphone: "default" | "granted" | "denied";
    gallery: "default" | "granted" | "denied";
  }>(() => {
    try {
      const stored = localStorage.getItem("studymate_permissions_store");
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {}
    return {
      notifications: "default",
      camera: "default",
      microphone: "default",
      gallery: "default"
    };
  });

  const updatePermission = (key: keyof typeof permissions, status: "default" | "granted" | "denied") => {
    setPermissions(prev => {
      const updated = { ...prev, [key]: status };
      localStorage.setItem("studymate_permissions_store", JSON.stringify(updated));
      return updated;
    });
  };

  const requestNotification = async () => {
    try {
      if (typeof window !== "undefined" && "Notification" in window) {
        const permission = await Notification.requestPermission();
        updatePermission("notifications", permission);
        return permission;
      } else {
        updatePermission("notifications", "granted");
        return "granted";
      }
    } catch (e) {
      updatePermission("notifications", "denied");
      return "denied";
    }
  };

  const requestCamera = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach((track) => track.stop());
        updatePermission("camera", "granted");
        return "granted";
      } else {
        updatePermission("camera", "granted");
        return "granted";
      }
    } catch (e) {
      console.warn("Camera media access blocked:", e);
      updatePermission("camera", "denied");
      return "denied";
    }
  };

  const requestMicrophone = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
        updatePermission("microphone", "granted");
        return "granted";
      } else {
        updatePermission("microphone", "granted");
        return "granted";
      }
    } catch (e) {
      console.warn("Microphone access blocked:", e);
      updatePermission("microphone", "denied");
      return "denied";
    }
  };

  const requestGallery = async () => {
    try {
      updatePermission("gallery", "granted");
      return "granted";
    } catch (e) {
      updatePermission("gallery", "denied");
      return "denied";
    }
  };

  const requestAllPermissions = async () => {
    const notif = await requestNotification();
    const cam = await requestCamera();
    const mic = await requestMicrophone();
    const gal = await requestGallery();

    if (notif === "granted" || cam === "granted" || mic === "granted" || gal === "granted") {
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } catch (e) {}
    }
  };

  const permissionKey = `studymate_permissions_asked_${profile.fullName.replace(/[^a-zA-Z0-9]/g, "_")}`;

  // Pick a random motivational quote on mount
  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length);
    setQuote(MOTIVATIONAL_QUOTES[randomIndex]);

    // Live clock ticks
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);

    // Permission popup trigger once
    const hasAsked = localStorage.getItem(permissionKey) === "true" || localStorage.getItem("studymate_permissions_requested") === "true";
    if (!hasAsked) {
      const timer = setTimeout(() => {
        setShowPermissionsModal(true);
      }, 1200);
      return () => {
        clearInterval(interval);
        clearTimeout(timer);
      };
    }

    return () => clearInterval(interval);
  }, [profile.fullName, permissionKey]);

  const pendingTasks = tasks.filter((t) => !t.completed);
  const activeAlarms = alarms.filter((a) => a.isActive);
  
  // Calculate today's habit completions
  const todayStr = new Date().toISOString().split("T")[0];
  const completedHabitsCount = habits.filter((h) => h.datesCompleted.includes(todayStr)).length;
  const habitsPercent = habits.length ? Math.round((completedHabitsCount / habits.length) * 100) : 0;

  // Study hours progress
  const studyPercent = Math.min(Math.round((studyHoursToday / profile.dailyStudyGoal) * 100), 100);

  // Timetable events for today
  const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const currentDayName = daysOfWeek[time.getDay()];
  const todayTimetable = timetable.filter((item) => item.day === currentDayName);

  // Read syllabus study days
  const syllabusDaysElapsed = Number(localStorage.getItem("studymate_syllabus_days_elapsed") || "1");

  const handleQuickAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTaskTitle.trim()) return;
    onAddTask(
      quickTaskTitle,
      quickTaskPriority,
      quickTaskSubject || profile.favoriteSubjects[0] || "General"
    );
    setQuickTaskTitle("");
    setQuickTaskSubject("");
    setShowQuickAdd(false);
  };

  const handleLogHoursSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogStudyHours(Number(logAmount));
    setShowLogHours(false);
  };

  // Format date elegantly
  const formatDate = (d: Date) => {
    const options: Intl.DateTimeFormatOptions = { weekday: "long", month: "short", day: "numeric" };
    return d.toLocaleDateString("en-US", options);
  };

  // Dynamic welcome salutation
  const getSalutation = () => {
    const hr = time.getHours();
    if (hr < 12) return "Good Morning";
    if (hr < 17) return "Good Afternoon";
    return "Good Evening";
  };

  if (showFriendlyError) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center text-center p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-sm">
        <span className="text-5xl mb-4" role="img" aria-label="bandage">🩹</span>
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Something wasn't quite right</h3>
        <p className="text-sm text-slate-400 mt-2 max-w-sm">No worries! We safely intercepted the issue. Try returning to the dashboard or refreshing.</p>
        <button 
          onClick={() => setShowFriendlyError(false)}
          className="mt-6 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-2xl shadow-md transition cursor-pointer"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse max-w-5xl mx-auto px-2 py-4">
        <div className="h-56 bg-slate-200 dark:bg-slate-800/60 rounded-[32px]" />
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
          {[1,2,3,4,5,6,7,8].map(i => (
            <div key={i} className="h-20 bg-slate-200 dark:bg-slate-800/60 rounded-2xl" />
          ))}
        </div>
        <div className="space-y-3">
          <div className="h-16 bg-slate-200 dark:bg-slate-800/60 rounded-2xl" />
          <div className="h-16 bg-slate-200 dark:bg-slate-800/60 rounded-2xl" />
          <div className="h-16 bg-slate-200 dark:bg-slate-800/60 rounded-2xl" />
        </div>
      </div>
    );
  }

  // Circular SVG progress ring calculations
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (studyPercent / 100) * circumference;

  // List of premium Quick Actions matching prompt exact requirements
  const QUICK_ACTIONS = [
    { label: "Homework", icon: ClipboardList, tab: "tasks", color: "from-blue-500 to-indigo-600", glow: "rgba(59,130,246,0.35)", badge: `${pendingTasks.length} pending` },
    { label: "Alarm", icon: Bell, tab: "alarms", color: "from-rose-500 to-red-600", glow: "rgba(244,63,94,0.35)", badge: `${activeAlarms.length} active` },
    { label: "Timetable", icon: Calendar, tab: "planner", color: "from-emerald-500 to-teal-600", glow: "rgba(16,185,129,0.35)", badge: `${todayTimetable.length} items` },
    { label: "Habits", icon: Flame, tab: "habits", color: "from-amber-500 to-orange-600", glow: "rgba(245,158,11,0.35)", badge: `${habitsPercent}% done` },
    { label: "Calendar", icon: BookOpen, tab: "calendar", color: "from-sky-500 to-blue-600", glow: "rgba(14,165,233,0.35)", badge: "Events" },
    { label: "Focus Sprint", icon: Clock, tab: "pomodoro", color: "from-purple-500 to-fuchsia-600", glow: "rgba(168,85,247,0.35)", badge: "25 min" },
    { label: "10-Day Test", icon: Target, tab: "assessment", color: "from-fuchsia-500 to-pink-600", glow: "rgba(217,70,239,0.35)", badge: "CBSE Prep" },
    { label: "Question Scanner", icon: Camera, tab: "assistant", color: "from-violet-500 to-indigo-600", glow: "rgba(139,92,246,0.35)", badge: "AI Crop" },
  ];

  // Smart Stack Filter Tabs
  const STACK_TABS = [
    { id: "all", label: "All Smart Widgets", symbol: "⚡" },
    { id: "homework", label: "Homework", symbol: "📝", count: pendingTasks.length },
    { id: "alarm", label: "Alarm", symbol: "🔔", count: activeAlarms.length },
    { id: "timetable", label: "Timetable", symbol: "📅", count: todayTimetable.length },
    { id: "habits", label: "Habits", symbol: "🔥", count: `${completedHabitsCount}/${habits.length}` },
    { id: "focus", label: "Focus Sprint", symbol: "⏱️" },
    { id: "ai", label: "AI Insights", symbol: "💡" },
    { id: "stats", label: "Weekly Stats", symbol: "📈" },
  ];

  const shouldShow = (widgetKey: string) => {
    if (activeStackTab === "all") return true;
    if (activeStackTab === "homework" && widgetKey === "homework") return true;
    if (activeStackTab === "alarm" && widgetKey === "alarm") return true;
    if (activeStackTab === "timetable" && widgetKey === "nextClass") return true;
    if (activeStackTab === "habits" && widgetKey === "habits") return true;
    if (activeStackTab === "focus" && widgetKey === "focusSprint") return true;
    if (activeStackTab === "ai" && widgetKey === "aiRecommendations") return true;
    if (activeStackTab === "stats" && (widgetKey === "weeklyProgress" || widgetKey === "recentActivity")) return true;
    return false;
  };

  return (
    <div id="dashboard_tab" className="space-y-6 max-w-5xl mx-auto px-1 md:px-3 pb-12 select-none">
      
      {/* 1. LARGE PERSONALIZED HERO CARD */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 dark:from-slate-950 dark:via-indigo-950 dark:to-slate-950 text-white p-6 md:p-8 shadow-[0_25px_60px_-15px_rgba(79,70,229,0.3)] border border-white/15 dark:border-indigo-500/30"
      >
        {/* Soft background ambient radial glows */}
        <div className="absolute -top-16 -right-16 w-56 h-56 bg-indigo-500/20 rounded-full blur-[90px] pointer-events-none" />
        <div className="absolute -bottom-20 -left-16 w-64 h-64 bg-purple-500/20 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-stretch justify-between gap-6">
          
          {/* Left Column: Greeting, Class/Exam, Duolingo Streaks & Linear XP Bar */}
          <div className="space-y-4 flex-1 text-left flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-300 bg-indigo-500/20 border border-indigo-400/30 px-3 py-1 rounded-full backdrop-blur-md flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-indigo-400" />
                  {formatDate(time)} &bull; {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-300 bg-amber-500/20 border border-amber-400/30 px-3 py-1 rounded-full backdrop-blur-md flex items-center gap-1">
                  <Sparkle className="w-3 h-3 text-amber-400 animate-spin" style={{ animationDuration: "6s" }} />
                  Level {profile.level} Student
                </span>
              </div>

              <h1 className="text-2xl sm:text-3.5xl font-black tracking-tight leading-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-indigo-200">
                {getSalutation()}, {profile.nickname || profile.fullName.split(" ")[0]}! 👋
              </h1>
              
              <p className="text-slate-300/80 text-xs font-semibold flex items-center gap-1.5 mt-1">
                <BookOpen className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>{profile.classGrade} &bull; Target Exam: <strong className="text-indigo-200">{profile.targetExam}</strong></span>
              </p>
            </div>

            {/* Gamified Duolingo / Linear Gamification Badges Row */}
            <div className="grid grid-cols-3 gap-2.5 pt-2">
              {/* Streak Counter (Duolingo Style) */}
              <div className="bg-white/10 dark:bg-white/5 border border-white/15 rounded-2xl p-3 text-center flex flex-col items-center justify-center backdrop-blur-md hover:bg-white/15 transition">
                <span className="text-[10px] text-slate-300 font-bold block uppercase tracking-wider">Streak</span>
                <span className="text-base font-black text-amber-400 flex items-center gap-1 mt-0.5">
                  <Flame className="w-4 h-4 text-orange-400 fill-orange-400 animate-pulse" />
                  {profile.streakCounter || 1} <span className="text-[10px] font-semibold text-slate-300">Days</span>
                </span>
              </div>

              {/* Rank XP (Linear Style) */}
              <div className="bg-white/10 dark:bg-white/5 border border-white/15 rounded-2xl p-3 text-center flex flex-col items-center justify-center backdrop-blur-md hover:bg-white/15 transition">
                <span className="text-[10px] text-slate-300 font-bold block uppercase tracking-wider">XP Score</span>
                <span className="text-base font-black text-indigo-300 flex items-center gap-1 mt-0.5">
                  <Trophy className="w-4 h-4 text-indigo-400 fill-indigo-400/30" />
                  {profile.xp} <span className="text-[10px] font-semibold text-slate-300">XP</span>
                </span>
              </div>

              {/* Daily Study Goal */}
              <div className="bg-white/10 dark:bg-white/5 border border-white/15 rounded-2xl p-3 text-center flex flex-col items-center justify-center backdrop-blur-md hover:bg-white/15 transition">
                <span className="text-[10px] text-slate-300 font-bold block uppercase tracking-wider">Daily Goal</span>
                <span className="text-base font-black text-cyan-300 flex items-center gap-1 mt-0.5">
                  <Target className="w-4 h-4 text-cyan-400" />
                  {studyHoursToday}/{profile.dailyStudyGoal} <span className="text-[10px] font-semibold text-slate-300">hrs</span>
                </span>
              </div>
            </div>

            {/* Level Progress Bar */}
            <div className="space-y-1 pt-1">
              <div className="flex justify-between items-center text-[10px] font-extrabold text-slate-300">
                <span>Level {profile.level} Rank Progress</span>
                <span>{profile.xp % 500} / 500 XP to Level {profile.level + 1}</span>
              </div>
              <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden p-0.5 border border-white/10">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, ((profile.xp % 500) / 500) * 100)}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-amber-400 via-indigo-400 to-cyan-400 rounded-full shadow-[0_0_10px_rgba(251,191,36,0.6)]"
                />
              </div>
            </div>

          </div>

          {/* Right Column: Continue Learning Card & Animated Apple-style Progress Ring */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-center justify-between gap-4 border-t lg:border-t-0 lg:border-l border-white/10 pt-4 lg:pt-0 lg:pl-6 shrink-0 min-w-[240px]">
            
            {/* Animated Apple Progress Ring */}
            <div className="flex flex-col items-center justify-center relative">
              <div className="relative w-28 h-28 flex items-center justify-center">
                <div className="absolute inset-0 bg-indigo-500/30 rounded-full blur-[20px] animate-pulse" />
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="56"
                    cy="56"
                    r={radius}
                    className="stroke-white/10"
                    strokeWidth="7"
                    fill="transparent"
                  />
                  <motion.circle
                    cx="56"
                    cy="56"
                    r={radius}
                    className="stroke-cyan-400 dark:stroke-cyan-400"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-xl font-black text-white">{studyPercent}%</span>
                  <span className="text-[8px] text-slate-300 uppercase tracking-widest font-extrabold mt-0.5">Goal</span>
                </div>
              </div>

              <button
                onClick={() => setShowLogHours(true)}
                className="mt-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:scale-95 text-[11px] font-black px-3.5 py-1.5 rounded-xl border border-white/20 shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Log Study Hours</span>
              </button>
            </div>

            {/* Continue Learning Widget Card */}
            <div className="bg-white/10 dark:bg-white/5 border border-white/15 rounded-2xl p-3.5 w-full text-left backdrop-blur-md space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black uppercase tracking-wider text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded-md">
                  Continue Learning
                </span>
                <span className="text-[9px] font-bold text-slate-300">Syllabus Day {syllabusDaysElapsed}</span>
              </div>
              <div>
                <h4 className="text-xs font-bold text-white truncate">NCERT Physics: Chapter 4</h4>
                <p className="text-[10px] text-slate-300 truncate">Moving Charges & Magnetism Checkpoint</p>
              </div>
              <button
                onClick={() => onNavigate("assessment")}
                className="w-full py-1.5 bg-white text-slate-950 hover:bg-slate-100 active:scale-98 font-extrabold text-[11px] rounded-xl transition flex items-center justify-center gap-1 cursor-pointer shadow"
              >
                <span>Resume Test</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>

        </div>

        {/* Motivational Quote Banner */}
        <div className="mt-5 pt-4 border-t border-white/10 flex items-start gap-2.5 text-left text-slate-300">
          <Sparkles className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs font-medium italic text-indigo-100/90 leading-relaxed">
              "{quote.quote || "The future depends on what you do today."}"
            </p>
            <span className="text-[9px] text-indigo-200/70 font-bold block mt-0.5">
              &mdash; {quote.author || "Mahatma Gandhi"}
            </span>
          </div>
        </div>
      </motion.div>

      {/* FLAGSHIP UNIVERSAL SMART SEARCH FLOATING CARD */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 350, damping: 25 }}
        onClick={() => onOpenSearch?.()}
        className="relative z-20 group p-4 sm:p-5 rounded-[2.2rem] bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-indigo-200/80 dark:border-indigo-900/50 shadow-[0_15px_35px_-5px_rgba(79,70,229,0.15)] dark:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)] hover:border-indigo-400 dark:hover:border-indigo-500 transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3.5 w-full sm:w-auto">
          <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-2xl shadow-lg shadow-indigo-500/30 group-hover:scale-110 transition-transform shrink-0">
            <Search className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1 text-left">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                Flagship Universal Smart Search
              </h3>
              <span className="text-[9px] font-extrabold uppercase tracking-widest bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 px-2.5 py-0.5 rounded-full">
                Instant Search
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
              Find Homework, Alarms, Timetable, Habits, Calendar, 10-Day Test, Games, AI & Settings...
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
            ⌘K / Ctrl+K
          </span>
          <button className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-xs rounded-xl shadow-md shadow-indigo-600/25 transition flex items-center justify-center gap-2 cursor-pointer">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Search Anything</span>
          </button>
        </div>
      </motion.div>

      {/* 2. RESPONSIVE QUICK ACTIONS GRID */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
            <span>Quick Actions</span>
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
          </h3>
          <span className="text-[10px] text-slate-400 font-bold">1-Tap Navigation</span>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {QUICK_ACTIONS.map((action, idx) => {
            const Icon = action.icon;
            return (
              <motion.button
                key={idx}
                whileHover={{ y: -4, scale: 1.03 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                onClick={() => onNavigate(action.tab)}
                className="relative overflow-hidden group flex flex-col items-center text-center p-3.5 rounded-2xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/50 dark:border-slate-800/80 shadow-[0_8px_20px_rgba(0,0,0,0.02)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.25)] hover:border-indigo-400/40 dark:hover:border-indigo-500/50 transition-all duration-300 cursor-pointer"
                style={{
                  boxShadow: `inset 0 1px 2px rgba(255,255,255,0.2), 0 10px 25px -5px ${action.glow}`
                }}
              >
                {/* Action colored gradient glow layer on hover */}
                <div className={`absolute -inset-10 bg-gradient-to-r ${action.color} opacity-0 group-hover:opacity-[0.06] blur-2xl transition duration-500`} />
                
                {/* Floating icon wrapper with spring scale & tilt */}
                <div className={`p-2.5 rounded-2xl bg-gradient-to-br ${action.color} text-white shadow-md group-hover:scale-110 group-hover:rotate-[6deg] transition duration-300 mb-2`}>
                  <Icon className="w-4 h-4" />
                </div>
                
                <span className="text-[11px] font-black text-slate-800 dark:text-slate-100 tracking-tight leading-none group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {action.label}
                </span>

                {action.badge && (
                  <span className="text-[8px] font-extrabold text-slate-400 dark:text-slate-500 mt-1 block">
                    {action.badge}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* 3. SMART STACK WIDGETS SECTION */}
      <div className="space-y-4">
        
        {/* Header & Smart Stack Carousel Filter Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-slate-200/60 dark:border-slate-800/60">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-500" />
              <span>Smart Stack Desk Widgets</span>
            </h3>
            <p className="text-[10px] text-slate-400 font-semibold">Priority widgets automatically organized & reachable in 1 tap</p>
          </div>

          {/* Horizontal Smart Stack Filter Pills Carousel */}
          <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-1 max-w-full">
            {STACK_TABS.map((tab) => {
              const isActive = activeStackTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveStackTab(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-extrabold flex items-center space-x-1.5 shrink-0 transition-all cursor-pointer ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 scale-[1.02]"
                      : "bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <span>{tab.symbol}</span>
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[8px] ${isActive ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"}`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Modular Stack Grid Container */}
        <div className="space-y-3.5">

          {/* 1. Continue Learning Checkpoint (Always accessible when in 'all' or 'focus') */}
          {(activeStackTab === "all" || activeStackTab === "focus") && shouldShow("continueLearning") && (
            <motion.div 
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-white/60 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.03)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.3)]"
            >
              <button 
                onClick={() => toggleWidget("continueLearning")}
                className="w-full flex items-center justify-between p-4 text-left outline-none cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 rounded-2xl text-indigo-600 dark:text-indigo-400 border border-indigo-100/50 dark:border-indigo-900/30">
                    <Book className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">Continue Learning</h4>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">Syllabus Day {syllabusDaysElapsed} &bull; NCERT Physics Checkpoint</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-extrabold px-2.5 py-0.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg border border-indigo-500/20">Active Chapter</span>
                  {expandedWidgets.continueLearning ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
              </button>
              
              <AnimatePresence>
                {expandedWidgets.continueLearning && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="overflow-hidden border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/30"
                  >
                    <div className="p-4 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-gradient-to-r from-indigo-50/80 to-purple-50/80 dark:from-slate-900 dark:to-slate-900/90 border border-indigo-100/60 dark:border-indigo-900/30 rounded-2xl gap-3 shadow-sm">
                        <div className="flex items-start space-x-3">
                          <span className="text-2xl">🎓</span>
                          <div>
                            <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100">NCERT Physics &bull; Chapter 4: Moving Charges & Magnetism</h5>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">Biot-Savart Law derivations & 3 PYQ checkpoint problems.</p>
                          </div>
                        </div>
                        <PremiumButton 
                          onClick={() => onNavigate("assessment")}
                          variant="gradient" 
                          size="sm"
                          className="text-[10px] self-start sm:self-center font-black py-1.5 px-3.5 rounded-xl flex items-center gap-1 shrink-0 cursor-pointer shadow-sm"
                        >
                          <span>Resume Chapter Test</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </PremiumButton>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <div className="p-3 bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm">
                          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">Estimated Daily Goal</span>
                          <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Solve 3 CBSE PYQs today</p>
                        </div>
                        <div className="p-3 bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm">
                          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">Syllabus Progress</span>
                          <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Day {syllabusDaysElapsed} of 10 Completed</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* 2. Upcoming Homework Widget */}
          {shouldShow("homework") && (
            <motion.div 
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-white/60 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.03)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.3)]"
            >
              <div 
                role="button"
                tabIndex={0}
                onClick={() => toggleWidget("homework")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") toggleWidget("homework");
                }}
                className="w-full flex items-center justify-between p-4 text-left outline-none cursor-pointer select-none"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-blue-50 dark:bg-blue-950/60 rounded-2xl text-blue-600 dark:text-blue-400 border border-blue-100/50 dark:border-blue-900/30">
                    <ClipboardList className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">Upcoming Homework</h4>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">{pendingTasks.length} items remaining</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowQuickAdd(true);
                    }}
                    className="p-1.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 hover:scale-105 rounded-xl border border-indigo-100/50 dark:border-indigo-900/30 transition cursor-pointer"
                    title="Add Task"
                  >
                    <Plus className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  </button>
                  {expandedWidgets.homework ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
              </div>
              
              <AnimatePresence>
                {expandedWidgets.homework && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="overflow-hidden border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/30"
                  >
                    <div className="p-4 space-y-3">
                      {pendingTasks.length === 0 ? (
                        <div className="text-center py-6 bg-white dark:bg-slate-950 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                          <span className="text-2xl block mb-1">🎉</span>
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">All homework checked off!</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">Great job staying on top of your studies.</p>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-[220px] overflow-y-auto no-scrollbar pr-1">
                          {pendingTasks.slice(0, 4).map((task) => (
                            <div 
                              key={task.id}
                              className="flex items-center justify-between p-3 bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-850 rounded-2xl shadow-sm hover:border-indigo-300 dark:hover:border-indigo-900 transition-colors"
                            >
                              <div className="flex items-center space-x-3">
                                <button 
                                  onClick={() => onToggleTask(task.id)}
                                  className="w-5 h-5 rounded-lg border border-slate-300 dark:border-slate-700 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950 flex items-center justify-center transition-colors cursor-pointer"
                                >
                                  <Check className="w-3.5 h-3.5 text-transparent hover:text-indigo-500" />
                                </button>
                                <div>
                                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{task.title}</p>
                                  <div className="flex items-center space-x-1.5 mt-0.5">
                                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                                      {task.subjectTag}
                                    </span>
                                    <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${
                                      task.priority === "High" ? "bg-rose-50 text-rose-600 dark:bg-rose-950/50" : 
                                      task.priority === "Medium" ? "bg-amber-50 text-amber-600 dark:bg-amber-950/50" : 
                                      "bg-slate-100 text-slate-600 dark:bg-slate-800/50"
                                    }`}>
                                      {task.priority} Priority
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 flex items-center">
                                <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" />
                                {task.deadline ? new Date(task.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Today"}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      <button 
                        onClick={() => onNavigate("tasks")}
                        className="text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400 hover:underline w-full text-center block pt-1 cursor-pointer"
                      >
                        View all items ({tasks.length}) &bull; Open Homework Tracker
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* 3. Next Alarm Widget */}
          {shouldShow("alarm") && (
            <motion.div 
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-white/60 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.03)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.3)]"
            >
              <button 
                onClick={() => toggleWidget("alarm")}
                className="w-full flex items-center justify-between p-4 text-left outline-none cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-rose-50 dark:bg-rose-950/60 rounded-2xl text-rose-600 dark:text-rose-400 border border-rose-100/50 dark:border-rose-900/30">
                    <Bell className="w-4 h-4 animate-bounce" style={{ animationDuration: "3s" }} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">Next Alarm</h4>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">{activeAlarms.length} active alarms configured</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {expandedWidgets.alarm ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
              </button>
              
              <AnimatePresence>
                {expandedWidgets.alarm && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="overflow-hidden border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/30"
                  >
                    <div className="p-4 space-y-3">
                      {activeAlarms.length === 0 ? (
                        <div className="text-center py-5 bg-white dark:bg-slate-950 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                          <span className="text-xl block mb-1">😴</span>
                          <p className="text-[11px] text-slate-400 font-semibold">No active alarms set right now.</p>
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {activeAlarms.map((alarm) => (
                            <div 
                              key={alarm.id}
                              className="p-3 bg-white dark:bg-slate-950 rounded-2xl border border-slate-200/80 dark:border-slate-850 flex items-center justify-between hover:border-rose-300 transition-all shadow-sm"
                            >
                              <div className="text-left">
                                <span className="text-xl font-black tracking-tight text-slate-800 dark:text-slate-100 block leading-none mb-1">
                                  {alarm.time}
                                </span>
                                <span className="text-[9px] font-extrabold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950 px-2 py-0.5 rounded block w-fit mt-1">
                                  {alarm.subject}
                                </span>
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-1 font-semibold">{alarm.label || "Study Session Alarm"}</span>
                              </div>
                              
                              <PremiumButton 
                                onClick={() => onTriggerAlarmChallenge(alarm)}
                                variant="secondary"
                                size="sm"
                                className="text-[10px] font-bold rounded-xl flex items-center shrink-0 border border-slate-200 dark:border-slate-700 cursor-pointer"
                              >
                                <Play className="w-3 h-3 mr-1 fill-current" />
                                Test Ring
                              </PremiumButton>
                            </div>
                          ))}
                        </div>
                      )}
                      <button 
                        onClick={() => onNavigate("alarms")}
                        className="text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400 hover:underline w-full text-center block pt-1 cursor-pointer"
                      >
                        Set/Manage Alarms
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* 4. Today's Timetable Widget */}
          {shouldShow("nextClass") && (
            <motion.div 
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-white/60 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.03)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.3)]"
            >
              <button 
                onClick={() => toggleWidget("nextClass")}
                className="w-full flex items-center justify-between p-4 text-left outline-none cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 rounded-2xl text-emerald-600 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-900/30">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">Today's Timetable</h4>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">{todayTimetable.length} sessions scheduled for {currentDayName}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {expandedWidgets.nextClass ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
              </button>
              
              <AnimatePresence>
                {expandedWidgets.nextClass && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="overflow-hidden border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/30"
                  >
                    <div className="p-4 space-y-3 text-left">
                      {todayTimetable.length === 0 ? (
                        <div className="text-center py-5 bg-white dark:bg-slate-950 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                          <span className="text-xl block mb-1">📖</span>
                          <p className="text-[11px] text-slate-400 font-semibold">No structured study blocks scheduled today!</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">Use free hours for a Focus Sprint.</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {todayTimetable.map((item, idx) => (
                            <div 
                              key={item.id || idx}
                              className="p-3 bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-850 rounded-2xl flex items-center justify-between shadow-sm"
                            >
                              <div className="flex items-start space-x-3">
                                <span className="text-xl select-none">📚</span>
                                <div>
                                  <h5 className="text-xs font-bold text-slate-800 dark:text-slate-100">{item.subject}</h5>
                                  <p className="text-[10px] text-slate-400 mt-0.5 font-bold">{item.topic || "General Study"}</p>
                                </div>
                              </div>
                              <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 dark:text-indigo-400 px-2 py-1 rounded-lg border border-indigo-100/30">
                                {item.time}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      <button 
                        onClick={() => onNavigate("planner")}
                        className="text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400 hover:underline w-full text-center block pt-1 cursor-pointer"
                      >
                        Manage Weekly Timetable & Schedule
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* 5. Habit Progress Widget */}
          {shouldShow("habits") && (
            <motion.div 
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-white/60 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.03)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.3)]"
            >
              <button 
                onClick={() => toggleWidget("habits")}
                className="w-full flex items-center justify-between p-4 text-left outline-none cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-amber-50 dark:bg-amber-950/60 rounded-2xl text-amber-600 dark:text-amber-400 border border-amber-100/50 dark:border-amber-900/30">
                    <Flame className="w-4 h-4 text-amber-500 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">Habit Progress</h4>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">{habitsPercent}% completed today</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-extrabold px-2.5 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg border border-emerald-500/20">
                    {completedHabitsCount} of {habits.length} Done
                  </span>
                  {expandedWidgets.habits ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
              </button>
              
              <AnimatePresence>
                {expandedWidgets.habits && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="overflow-hidden border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/30"
                  >
                    <div className="p-4 space-y-3.5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {habits.map((habit) => {
                          const isCompletedToday = habit.datesCompleted.includes(todayStr);
                          return (
                            <div 
                              key={habit.id}
                              className={`p-3 rounded-2xl border flex items-center justify-between shadow-sm transition-all duration-300 ${
                                isCompletedToday 
                                  ? "bg-emerald-500/10 border-emerald-400/30 text-emerald-900 dark:text-emerald-100" 
                                  : "bg-white dark:bg-slate-950 border-slate-200/80 dark:border-slate-850"
                              }`}
                            >
                              <div className="flex items-center space-x-2.5 text-left">
                                <span className="text-xl select-none">{habit.icon || "⚡"}</span>
                                <div>
                                  <h5 className="text-[11px] font-bold tracking-tight leading-none text-slate-800 dark:text-slate-200">{habit.name}</h5>
                                  <p className="text-[9px] text-slate-400 mt-0.5 font-bold">{habit.datesCompleted.length} total active days</p>
                                </div>
                              </div>
                              
                              <button
                                onClick={() => onToggleHabitDate && onToggleHabitDate(habit.id, todayStr)}
                                className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                                  isCompletedToday 
                                    ? "bg-emerald-500 text-white" 
                                    : "border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-transparent hover:text-slate-400"
                                }`}
                              >
                                <Check className="w-4 h-4 stroke-[3px]" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                      <button 
                        onClick={() => onNavigate("habits")}
                        className="text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400 hover:underline w-full text-center block pt-1 cursor-pointer"
                      >
                        View Habits Streak Heatmap & Detailed Logs
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* 6. Focus Sprint Launcher Widget */}
          {shouldShow("focusSprint") && (
            <motion.div 
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-white/60 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.03)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.3)]"
            >
              <div 
                role="button"
                tabIndex={0}
                onClick={() => toggleWidget("focusSprint")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") toggleWidget("focusSprint");
                }}
                className="w-full flex items-center justify-between p-4 text-left outline-none cursor-pointer select-none"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-purple-50 dark:bg-purple-950/60 rounded-2xl text-purple-600 dark:text-purple-400 border border-purple-100/50 dark:border-purple-900/30">
                    <Clock className="w-4 h-4 text-purple-500" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">Focus Sprint</h4>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">Distraction-free 25-minute Pomodoro timer</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {expandedWidgets.focusSprint ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
              </div>

              <AnimatePresence>
                {expandedWidgets.focusSprint && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="overflow-hidden border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/30"
                  >
                    <div className="p-4 space-y-3">
                      <div className="p-4 bg-gradient-to-r from-purple-500/10 via-fuchsia-500/10 to-indigo-500/10 border border-purple-200/50 dark:border-purple-900/30 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
                        <div className="flex items-center space-x-3">
                          <div className="p-3 bg-purple-600 text-white rounded-2xl shadow-md">
                            <Timer className="w-6 h-6 animate-spin" style={{ animationDuration: "10s" }} />
                          </div>
                          <div>
                            <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100">Ready for 25-Min Laser Focus?</h5>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Earn +50 Rank XP and streak protection upon completion.</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => onNavigate("pomodoro")}
                          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-black text-xs rounded-xl shadow-md shadow-purple-600/30 transition cursor-pointer shrink-0"
                        >
                          Start Focus Sprint Now
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* 7. AI Recommendation & Insights Widget */}
          {shouldShow("aiRecommendations") && (
            <motion.div 
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-white/60 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.03)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.3)]"
            >
              <div 
                role="button"
                tabIndex={0}
                onClick={() => toggleWidget("aiRecommendations")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") toggleWidget("aiRecommendations");
                }}
                className="w-full flex items-center justify-between p-4 text-left outline-none cursor-pointer select-none"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-violet-50 dark:bg-violet-950/60 rounded-2xl text-violet-600 dark:text-violet-400 border border-violet-100/50 dark:border-violet-900/30">
                    <Lightbulb className="w-4 h-4 text-violet-500" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">AI Recommendation & Insights</h4>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">Personalized daily study suggestions</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <PremiumButton
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRegenerateRecommendations();
                    }}
                    disabled={isRegeneratingInsights}
                    className="px-2.5 py-1 flex items-center gap-1 text-[10px] font-bold cursor-pointer"
                    aria-label="Regenerate AI recommendations"
                  >
                    <RefreshCw className={`w-3 h-3 ${isRegeneratingInsights ? "animate-spin text-violet-500" : ""}`} />
                    <span>{isRegeneratingInsights ? "Thinking..." : "Regen"}</span>
                  </PremiumButton>
                  {expandedWidgets.aiRecommendations ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
              </div>
              
              <AnimatePresence>
                {expandedWidgets.aiRecommendations && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="overflow-hidden border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/30"
                  >
                    <div className="p-4 space-y-3 text-left">
                      <div className="space-y-2.5">
                        {aiRecommendations.map((rec, idx) => (
                          <div 
                            key={idx}
                            className="flex items-start space-x-3 p-3 bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-850 rounded-2xl hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition-colors shadow-sm"
                          >
                            <span className="text-xs mt-0.5 shrink-0">💡</span>
                            <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">{rec}</p>
                          </div>
                        ))}
                      </div>

                      <div className="bg-gradient-to-r from-violet-500/10 to-indigo-500/10 p-3 rounded-2xl flex items-center space-x-2.5 border border-indigo-200/40 dark:border-indigo-900/30">
                        <Sparkles className="w-4 h-4 text-violet-500 shrink-0 animate-bounce" />
                        <p className="text-[10px] text-indigo-900 dark:text-indigo-300 font-extrabold leading-relaxed">
                          Peak Focus Window: <strong className="text-indigo-600 dark:text-indigo-400">4:00 PM – 6:30 PM</strong> today based on historical focus patterns.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* 8. Weekly Study Statistics Widget */}
          {shouldShow("weeklyProgress") && (
            <motion.div 
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-white/60 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.03)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.3)]"
            >
              <button 
                onClick={() => toggleWidget("weeklyProgress")}
                className="w-full flex items-center justify-between p-4 text-left outline-none cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 rounded-2xl text-emerald-600 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-900/30">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">Weekly Study Statistics</h4>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">Study hours over past 7 days</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-100/30">
                    +15% efficiency
                  </span>
                  {expandedWidgets.weeklyProgress ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
              </button>
              
              <AnimatePresence>
                {expandedWidgets.weeklyProgress && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="overflow-hidden border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/30"
                  >
                    <div className="p-5 space-y-4">
                      {/* Interactive SVG Bar Chart */}
                      <div className="h-28 flex items-end justify-between px-2 pt-4 relative">
                        <div className="absolute inset-x-0 top-0 border-t border-slate-200/50 dark:border-slate-800/50" />
                        <div className="absolute inset-x-0 top-1/2 border-t border-slate-200/30 dark:border-slate-800/30" />
                        
                        {[
                          { day: "Mon", hrs: 2.5 },
                          { day: "Tue", hrs: 4.0 },
                          { day: "Wed", hrs: 3.5 },
                          { day: "Thu", hrs: 1.5 },
                          { day: "Fri", hrs: 5.0 },
                          { day: "Sat", hrs: 3.0 },
                          { day: "Sun", hrs: studyHoursToday || 2.0 },
                        ].map((d, idx) => {
                          const maxHrs = 6;
                          const percent = (d.hrs / maxHrs) * 100;
                          return (
                            <div key={idx} className="flex flex-col items-center flex-1 group cursor-help relative">
                              <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition duration-150 bg-slate-900 text-white text-[9px] font-semibold px-2 py-0.5 rounded shadow pointer-events-none whitespace-nowrap z-10">
                                {d.hrs} hrs studied
                              </div>
                              
                              <div className="w-5 bg-slate-200 dark:bg-slate-800 h-16 rounded-t overflow-hidden relative flex items-end">
                                <div 
                                  className={`w-full rounded-t transition-all duration-500 ${
                                    idx === 6 
                                      ? "bg-gradient-to-t from-indigo-500 to-indigo-600" 
                                      : "bg-gradient-to-t from-emerald-500 to-teal-500"
                                  }`}
                                  style={{ height: `${percent}%` }}
                                />
                              </div>
                              
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-1.5">{d.day}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* 9. Recent Activity Timeline Widget */}
          {shouldShow("recentActivity") && (
            <motion.div 
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-white/60 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.03)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.3)]"
            >
              <button 
                onClick={() => toggleWidget("recentActivity")}
                className="w-full flex items-center justify-between p-4 text-left outline-none cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-rose-50 dark:bg-rose-950/60 rounded-2xl text-rose-600 dark:text-rose-400 border border-rose-100/50 dark:border-rose-900/30">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">Recent Activity & Logs</h4>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">Timeline of achievements & study events</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {expandedWidgets.recentActivity ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
              </button>
              
              <AnimatePresence>
                {expandedWidgets.recentActivity && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="overflow-hidden border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/30"
                  >
                    <div className="p-4 space-y-3.5 text-left">
                      <div className="space-y-3 relative before:absolute before:inset-y-0.5 before:left-3 before:w-[1px] before:bg-slate-200 dark:before:bg-slate-800">
                        <div className="relative flex items-start pl-7 space-x-2">
                          <div className="absolute left-1.5 top-1 w-3 h-3 rounded-full border-2 border-indigo-600 bg-white dark:bg-slate-950" />
                          <div>
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-100">Daily Study Hours Logged</p>
                            <p className="text-[9px] text-slate-400 mt-0.5 font-bold">You studied {studyHoursToday} hours so far today, earning {studyHoursToday * 30} Rank XP!</p>
                          </div>
                        </div>
                        <div className="relative flex items-start pl-7 space-x-2">
                          <div className="absolute left-1.5 top-1 w-3 h-3 rounded-full border-2 border-amber-500 bg-white dark:bg-slate-950" />
                          <div>
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-100">Consistency Streak Active</p>
                            <p className="text-[9px] text-slate-400 mt-0.5 font-bold">Streak is currently active at {profile.streakCounter || 1} day(s)! Keep daily logging.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

        </div>
      </div>

      {/* QUICK ADD TASK MODAL POPUP */}
      {showQuickAdd && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[28px] border border-slate-150 dark:border-slate-800 shadow-2xl overflow-hidden"
          >
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide text-xs">Quick Add Study Task</h3>
                <button onClick={() => setShowQuickAdd(false)} className="p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleQuickAddSubmit} className="space-y-4 text-left">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">Task Title</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Read Physics Chapter 3"
                    className="w-full px-3 py-2.5 text-xs font-bold border rounded-xl dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 transition-colors"
                    value={quickTaskTitle}
                    onChange={(e) => setQuickTaskTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">Subject Tag</label>
                    <select
                      className="w-full px-3 py-2.5 text-xs font-bold border rounded-xl dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 outline-none"
                      value={quickTaskSubject}
                      onChange={(e) => setQuickTaskSubject(e.target.value)}
                    >
                      <option value="" className="text-slate-800 dark:text-slate-200">Select...</option>
                      {profile.favoriteSubjects.map((sub) => (
                        <option key={sub} value={sub} className="text-slate-800 dark:text-slate-200">{sub}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">Priority</label>
                    <select
                      className="w-full px-3 py-2.5 text-xs font-bold border rounded-xl dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 outline-none"
                      value={quickTaskPriority}
                      onChange={(e) => setQuickTaskPriority(e.target.value as any)}
                    >
                      <option value="High" className="text-slate-850">High</option>
                      <option value="Medium" className="text-slate-850">Medium</option>
                      <option value="Low" className="text-slate-850">Low</option>
                    </select>
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl transition shadow-md shadow-indigo-600/20 cursor-pointer"
                >
                  Create Task (+20 XP)
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      )}

      {/* LOG HOURS MODAL POPUP */}
      {showLogHours && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-[28px] border border-slate-150 dark:border-slate-800 shadow-2xl overflow-hidden"
          >
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide text-xs">Log Daily Study Hours</h3>
                <button onClick={() => setShowLogHours(false)} className="p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleLogHoursSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-3">How many hours did you study today?</label>
                  <div className="flex items-center justify-center space-x-5">
                    <button 
                      type="button" 
                      onClick={() => setLogAmount(Math.max(0.5, logAmount - 0.5))}
                      className="w-11 h-11 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 active:scale-95 text-lg font-black text-slate-700 dark:text-slate-300 flex items-center justify-center transition-all cursor-pointer"
                    >
                      -
                    </button>
                    <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400">{logAmount} hrs</span>
                    <button 
                      type="button" 
                      onClick={() => setLogAmount(Math.min(12, logAmount + 0.5))}
                      className="w-11 h-11 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 active:scale-95 text-lg font-black text-slate-700 dark:text-slate-300 flex items-center justify-center transition-all cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl transition shadow-md shadow-indigo-600/20 cursor-pointer"
                >
                  Log Hours (+{Math.round(logAmount * 30)} XP)
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      )}

      {/* ONE-TIME PERMISSIONS MODAL */}
      <AnimatePresence>
        {showPermissionsModal && (
          <div className="fixed inset-0 bg-slate-950/80 z-[100] flex items-center justify-center p-4 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden"
            >
              <div className="p-6 space-y-5">
                <div className="text-center space-y-2">
                  <div className="inline-flex p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl text-indigo-600 dark:text-indigo-400">
                    <Sparkles className="w-6 h-6 animate-pulse" />
                  </div>
                  <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">Grant Companion Permissions</h3>
                  <p className="text-xs text-slate-400 font-semibold max-w-xs mx-auto">
                    StudyMate AI needs your permission once to integrate fully with your device for an interactive learning experience.
                  </p>
                </div>

                <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100/40 dark:border-indigo-900/40 rounded-2xl text-center space-y-2 shadow-sm">
                  <button
                    type="button"
                    onClick={requestAllPermissions}
                    className="w-full py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-[11px] font-black rounded-xl shadow-sm cursor-pointer transition flex items-center justify-center space-x-1"
                  >
                    <span>Grant All Required Permissions Together</span>
                  </button>
                </div>

                <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1 text-left">
                  {/* Notifications */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Bell className="w-4 h-4 text-indigo-500" />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Notifications</span>
                      </div>
                      <button
                        type="button"
                        onClick={requestNotification}
                        className={`px-2.5 py-1 rounded-lg text-[9px] font-black tracking-wider uppercase shadow-sm transition cursor-pointer ${
                          permissions.notifications === "granted"
                            ? "bg-emerald-500 text-white"
                            : "bg-indigo-600 hover:bg-indigo-500 text-white"
                        }`}
                      >
                        {permissions.notifications === "granted" ? "Granted ✓" : "Enable"}
                      </button>
                    </div>
                  </div>

                  {/* Camera */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Camera className="w-4 h-4 text-indigo-500" />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">AI Scanner Camera</span>
                      </div>
                      <button
                        type="button"
                        onClick={requestCamera}
                        className={`px-2.5 py-1 rounded-lg text-[9px] font-black tracking-wider uppercase shadow-sm transition cursor-pointer ${
                          permissions.camera === "granted"
                            ? "bg-emerald-500 text-white"
                            : "bg-indigo-600 hover:bg-indigo-500 text-white"
                        }`}
                      >
                        {permissions.camera === "granted" ? "Granted ✓" : "Enable"}
                      </button>
                    </div>
                  </div>

                  {/* Microphone */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Mic className="w-4 h-4 text-indigo-500" />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Microphone</span>
                      </div>
                      <button
                        type="button"
                        onClick={requestMicrophone}
                        className={`px-2.5 py-1 rounded-lg text-[9px] font-black tracking-wider uppercase shadow-sm transition cursor-pointer ${
                          permissions.microphone === "granted"
                            ? "bg-emerald-500 text-white"
                            : "bg-indigo-600 hover:bg-indigo-500 text-white"
                        }`}
                      >
                        {permissions.microphone === "granted" ? "Granted ✓" : "Enable"}
                      </button>
                    </div>
                  </div>

                  {/* Gallery */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <ImageIcon className="w-4 h-4 text-indigo-500" />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Gallery / File Access</span>
                      </div>
                      <button
                        type="button"
                        onClick={requestGallery}
                        className={`px-2.5 py-1 rounded-lg text-[9px] font-black tracking-wider uppercase shadow-sm transition cursor-pointer ${
                          permissions.gallery === "granted"
                            ? "bg-emerald-500 text-white"
                            : "bg-indigo-600 hover:bg-indigo-500 text-white"
                        }`}
                      >
                        {permissions.gallery === "granted" ? "Granted ✓" : "Enable"}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    localStorage.setItem(permissionKey, "true");
                    localStorage.setItem("studymate_permissions_requested", "true");
                    setShowPermissionsModal(false);
                  }}
                  className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-black rounded-2xl shadow-md cursor-pointer transition flex items-center justify-center space-x-1"
                >
                  <span>Authorize & Unlock StudyMate Core</span>
                  <Check className="w-4 h-4 ml-1" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
