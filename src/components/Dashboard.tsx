import React, { useState, useEffect } from "react";
import { UserProfile, Task, Alarm, Habit, TimetableItem } from "../types";
import { MOTIVATIONAL_QUOTES } from "../data";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
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

    // Permission popup trigger once
    const hasAsked = localStorage.getItem(permissionKey) === "true" || localStorage.getItem("studymate_permissions_requested") === "true";
    if (!hasAsked) {
      const timer = setTimeout(() => {
        setShowPermissionsModal(true);
      }, 1200);
      return () => {
        clearTimeout(timer);
      };
    }
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

function LiveClockBadge() {
  const [time, setTime] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-300 bg-indigo-500/20 border border-indigo-400/30 px-3 py-1 rounded-full backdrop-blur-md flex items-center gap-1.5">
      <Clock className="w-3 h-3 text-indigo-400" />
      {formatDate(time)} &bull; {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
    </span>
  );
}
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

  const rawDisplayName = profile.nickname || profile.fullName.split(" ")[0] || "Student";
  const displayName = rawDisplayName.charAt(0).toUpperCase() + rawDisplayName.slice(1);

  const shouldReduceMotion = useReducedMotion();

  const getDaysToBoardExam = () => {
    const customDate = localStorage.getItem("studymate_target_exam_date");
    const target = customDate ? new Date(customDate) : new Date("2027-02-15");
    const now = new Date();
    const diffTime = target.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 185;
  };
  const daysRemaining = getDaysToBoardExam();

  return (
    <div id="dashboard_tab" className="space-y-5 max-w-5xl mx-auto px-1 md:px-3 pb-12 select-none">
      
      {/* 1. COMPRESSED VIBRANT HERO CARD */}
      <motion.div 
        initial={shouldReduceMotion ? {} : { opacity: 0, y: 10 }}
        animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0d0f22] via-[#241a5e] to-[#0d0f22] text-white p-4 sm:p-5 shadow-[0_20px_50px_-15px_rgba(91,79,233,0.35)] border border-[#5B4FE9]/30"
      >
        {/* Soft background ambient radial glows using target palette */}
        <div className="absolute -top-16 -right-16 w-56 h-56 bg-[#5B4FE9]/25 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute -bottom-20 -left-16 w-64 h-64 bg-[#E0459B]/20 rounded-full blur-[90px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-[#3AB0E8]/15 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 space-y-3.5">
          
          {/* Top Row: Date/Clock + Level Chip + Streak Flame Chip */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <LiveClockBadge />
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#FFA726] bg-[#FFA726]/15 border border-[#FFA726]/30 px-2.5 py-0.5 rounded-full backdrop-blur-md flex items-center gap-1">
                <Sparkle className="w-3 h-3 text-[#FFA726]" />
                Level {profile.level} Student
              </span>
            </div>
            
            <div className="flex items-center gap-1.5 bg-white/10 dark:bg-white/5 border border-white/15 px-3 py-1 rounded-full backdrop-blur-md">
              <Flame className="w-3.5 h-3.5 text-[#FFA726] fill-[#FFA726] animate-pulse" />
              <span className="text-xs font-bold text-amber-200">{profile.streakCounter || 1} Day Streak</span>
            </div>
          </div>

          {/* Main Hero Middle: Scoreboard-style Board Exam Countdown Digit Card */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white/5 border border-white/10 rounded-2xl p-3.5 backdrop-blur-md">
            <div className="flex items-center gap-3.5 w-full sm:w-auto">
              {/* Glowing Scoreboard Digit Block */}
              <motion.div 
                initial={shouldReduceMotion ? {} : { opacity: 0, scale: 0.9, y: 5 }}
                animate={shouldReduceMotion ? {} : { opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="bg-gradient-to-br from-[#FFA726] to-[#E0459B] p-0.5 rounded-2xl shadow-[0_0_22px_rgba(255,167,38,0.4)] shrink-0"
              >
                <div className="bg-[#0d0f22] rounded-[14px] px-4 py-1.5 flex items-center justify-center min-w-[80px] text-center">
                  <span className="font-jetbrains text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#FFA726] via-[#FF5A6E] to-[#E0459B] tracking-tight">
                    {daysRemaining}
                  </span>
                </div>
              </motion.div>

              <div className="text-left min-w-0">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#FFA726] block">
                  {profile.targetExam ? `${profile.targetExam} Countdown` : "CBSE Board Exam Countdown"}
                </span>
                <h2 className="text-base sm:text-lg font-black text-white leading-tight">
                  Days to Board Exam &bull; {getSalutation()}, {displayName}! 👋
                </h2>
                <p className="text-[11px] text-slate-300/80 font-medium flex items-center gap-1.5 mt-0.5 truncate">
                  <BookOpen className="w-3.5 h-3.5 text-[#3AB0E8] shrink-0" />
                  <span>{profile.classGrade} &bull; Target: <strong className="text-indigo-200">{profile.targetExam}</strong></span>
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowLogHours(true)}
              className="w-full sm:w-auto bg-gradient-to-r from-[#5B4FE9] to-[#E0459B] hover:opacity-95 active:scale-95 text-xs font-black px-3.5 py-2 rounded-xl text-white shadow-lg shadow-[#5B4FE9]/30 transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Log Study Hours</span>
            </button>
          </div>

          {/* Compact "Continue Learning" Resume Card */}
          <div className="bg-white/10 dark:bg-white/5 border border-white/15 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-2.5 backdrop-blur-md">
            <div className="flex items-center gap-3 text-left w-full sm:w-auto min-w-0">
              <div className="p-2 bg-[#5B4FE9]/30 border border-[#5B4FE9]/50 rounded-xl text-[#3AB0E8] shrink-0">
                <BookOpen className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black uppercase tracking-wider text-[#3AB0E8] bg-[#3AB0E8]/20 px-2 py-0.5 rounded-md">
                    Continue Learning
                  </span>
                  <span className="text-[9px] font-semibold text-slate-300">Syllabus Day {syllabusDaysElapsed}</span>
                </div>
                <h4 className="text-xs font-bold text-white truncate mt-0.5">NCERT Physics: Chapter 4</h4>
                <p className="text-[10px] text-slate-300 truncate">Moving Charges & Magnetism Checkpoint</p>
              </div>
            </div>

            <button
              onClick={() => onNavigate("assessment")}
              className="w-full sm:w-auto px-3.5 py-1.5 bg-white text-slate-950 hover:bg-slate-100 active:scale-98 font-black text-xs rounded-xl transition flex items-center justify-center gap-1 cursor-pointer shrink-0 shadow"
            >
              <span>Resume Test</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Motivational Quote Banner */}
          <div className="pt-1.5 border-t border-white/10 flex items-center gap-2 text-left text-slate-300">
            <Sparkles className="w-3.5 h-3.5 text-[#FFA726] shrink-0" />
            <p className="text-[11px] font-medium italic text-indigo-100/90 truncate">
              "{quote.quote || "The future depends on what you do today."}" &mdash; <span className="not-italic text-indigo-200/70 font-bold">{quote.author || "Mahatma Gandhi"}</span>
            </p>
          </div>

        </div>
      </motion.div>

      {/* 2. SLIM HORIZONTAL ROW OF 3 STAT CHIPS DIRECTLY BELOW HERO */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Stat Chip 1: Daily Goal + Shrunken Progress Ring (Sky Tint #3AB0E8) */}
        <div className="bg-[#3AB0E8]/10 dark:bg-[#3AB0E8]/15 border border-[#3AB0E8]/30 rounded-2xl p-3 flex items-center justify-between backdrop-blur-sm">
          <div className="flex items-center gap-3">
            {/* Shrunken Progress Ring */}
            <div className="relative w-10 h-10 flex items-center justify-center shrink-0">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="20"
                  cy="20"
                  r="16"
                  className="stroke-slate-200 dark:stroke-slate-700"
                  strokeWidth="3.5"
                  fill="transparent"
                />
                <motion.circle
                  cx="20"
                  cy="20"
                  r="16"
                  className="stroke-[#3AB0E8]"
                  strokeWidth="3.5"
                  fill="transparent"
                  strokeDasharray={2 * Math.PI * 16}
                  initial={{ strokeDashoffset: 2 * Math.PI * 16 }}
                  animate={{ strokeDashoffset: (2 * Math.PI * 16) * (1 - Math.min(100, studyPercent) / 100) }}
                  transition={{ duration: shouldReduceMotion ? 0 : 1, ease: "easeOut" }}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute text-[9px] font-black text-slate-900 dark:text-white">
                {studyPercent}%
              </span>
            </div>

            <div className="text-left">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#3AB0E8] block">Daily Goal</span>
              <span className="text-sm font-black text-slate-900 dark:text-white">
                {studyHoursToday} / {profile.dailyStudyGoal} <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">hrs</span>
              </span>
            </div>
          </div>

          <button
            onClick={() => setShowLogHours(true)}
            className="p-1.5 bg-[#3AB0E8]/20 hover:bg-[#3AB0E8]/30 text-[#3AB0E8] dark:text-sky-300 rounded-lg transition cursor-pointer"
            title="Log Study Hours"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Stat Chip 2: Streak (Marigold Tint #FFA726) */}
        <div className="bg-[#FFA726]/10 dark:bg-[#FFA726]/15 border border-[#FFA726]/30 rounded-2xl p-3 flex items-center justify-between backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#FFA726]/20 rounded-xl text-[#FFA726] shrink-0">
              <Flame className="w-5 h-5 fill-[#FFA726]" />
            </div>
            <div className="text-left">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#FFA726] block">Streak</span>
              <span className="text-sm font-black text-slate-900 dark:text-white">
                {profile.streakCounter || 1} <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Days</span>
              </span>
            </div>
          </div>
          <span className="text-[10px] font-extrabold text-[#FFA726] bg-[#FFA726]/20 px-2 py-0.5 rounded-md">
            Level {profile.level}
          </span>
        </div>

        {/* Stat Chip 3: XP Score (Violet/Fuchsia Tint #E0459B / #5B4FE9) */}
        <div className="bg-[#E0459B]/10 dark:bg-[#E0459B]/15 border border-[#E0459B]/30 rounded-2xl p-3 flex items-center justify-between backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#E0459B]/20 rounded-xl text-[#E0459B] shrink-0">
              <Trophy className="w-5 h-5 fill-[#E0459B]/30" />
            </div>
            <div className="text-left">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#E0459B] block">XP Score</span>
              <span className="text-sm font-black text-slate-900 dark:text-white">
                {profile.xp} <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">XP</span>
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-extrabold text-[#E0459B] block">
              {profile.xp % 500}/500
            </span>
            <span className="text-[9px] font-semibold text-slate-500 dark:text-slate-400 block">
              Next Lvl
            </span>
          </div>
        </div>
      </div>

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
