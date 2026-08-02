import React, { useState, useEffect } from "react";
import { UserProfile, Task, Alarm, Habit, TimetableItem } from "../types";
import { MOTIVATIONAL_QUOTES } from "../data";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { dashboardEngine, activityService } from "../services/activityEngine";
import { CommandCenterDrawer } from "./CommandCenterDrawer";

import { 
  Sparkles, Calendar, Bell, Trophy, Plus, Clock, Play, CheckCircle2, 
  X, Check, Flame, ChevronRight, BookOpen, AlertTriangle, User, Award, Timer,
  Mic, Camera, Image as ImageIcon, Lightbulb, BarChart3, RefreshCw, TrendingUp, Info,
  ClipboardList, HelpCircle, Gamepad2, MessageSquare, Settings, ChevronDown, ChevronUp,
  Activity, Book, Target, Sparkle, AlertCircle, CheckCircle, MessageCircle, Zap, Layers,
  Compass, ArrowUpRight, Sliders, ChevronLeft, Search, Menu, Video, FileText, ArrowRight
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

const formatDate = (d: Date) => {
  const options: Intl.DateTimeFormatOptions = { weekday: "long", month: "short", day: "numeric" };
  return d.toLocaleDateString("en-US", options);
};

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
  const shouldReduceMotion = useReducedMotion();
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showLogHours, setShowLogHours] = useState(false);
  const [logAmount, setLogAmount] = useState(1);
  const [quickTaskTitle, setQuickTaskTitle] = useState("");
  const [quickTaskPriority, setQuickTaskPriority] = useState<"High" | "Medium" | "Low">("Medium");
  const [quickTaskSubject, setQuickTaskSubject] = useState("");
  const [searchFilter, setSearchFilter] = useState("All");
  const [showMenuDrawer, setShowMenuDrawer] = useState(false);

  const getSalutation = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const rawDisplayName = profile.nickname || profile.fullName?.split(" ")[0] || "Student";
  const displayName = rawDisplayName.charAt(0).toUpperCase() + rawDisplayName.slice(1);

  // Compute dynamic Activity Engine Data
  const engineData = dashboardEngine.getDashboardData(profile, tasks, studyHoursToday);
  const heroActivity = engineData.heroActivity;

  const handleContinueSession = () => {
    if (heroActivity) {
      const restored = dashboardEngine.restoreSessionState(heroActivity.event.eventId);
      if (restored?.targetRoute) {
        onNavigate(restored.targetRoute);
      } else {
        onNavigate("ai_chat");
      }
    } else {
      onNavigate("ai_chat");
    }
  };

  const getDaysToBoardExam = () => {
    const customDate = localStorage.getItem("studymate_target_exam_date");
    const target = customDate ? new Date(customDate) : new Date("2027-02-15");
    const now = new Date();
    const diffTime = target.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 185;
  };
  const daysRemaining = getDaysToBoardExam();

  const handleQuickAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTaskTitle.trim()) return;
    onAddTask(quickTaskTitle.trim(), quickTaskPriority, quickTaskSubject || "General");
    setQuickTaskTitle("");
    setShowQuickAdd(false);
  };

  const handleLogHoursSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogStudyHours(logAmount);
    setShowLogHours(false);
  };

  // Search chips
  const SEARCH_CHIPS = ["All", "PDFs", "Quizzes", "Notes", "Chats", "Formulas"];

  // 2x3 Quick Actions Grid
  const QUICK_ACTIONS_2x3 = [
    { label: "Homework", icon: ClipboardList, route: "tasks", badge: `${tasks.filter(t => !t.completed).length} pending`, color: "bg-purple-50 text-purple-700 border-purple-200" },
    { label: "Scanner", icon: Camera, route: "assistant", badge: "AI Crop", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
    { label: "Timetable", icon: Calendar, route: "planner", badge: `${timetable.length} sessions`, color: "bg-blue-50 text-blue-700 border-blue-200" },
    { label: "Focus Sprint", icon: Clock, route: "pomodoro", badge: "25 min", color: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200" },
    { label: "Calendar", icon: BookOpen, route: "calendar", badge: "Planner", color: "bg-sky-50 text-sky-700 border-sky-200" },
    { label: "Flashcards", icon: Sparkles, route: "ai_chat", badge: "Active Recall", color: "bg-pink-50 text-pink-700 border-pink-200" }
  ];

  const formatTimeAgo = (timestamp: number) => {
    const minutes = Math.floor((Date.now() - timestamp) / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div id="dashboard_tab" className="space-y-6 max-w-4xl mx-auto px-3 sm:px-4 pb-20 select-none text-slate-900 dark:text-slate-100 font-sans">
      
      {/* 1. TOP HEADER SECTION (Apple-level Cleanliness) */}
      <header className="flex items-center justify-between py-2 px-1 border-b border-slate-200/60 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md sticky top-0 z-30 -mx-3 px-4 rounded-b-2xl shadow-xs">
        {/* Left: Hamburger Menu */}
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowMenuDrawer(true)}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
            aria-label="Open Menu"
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>

        {/* Center: StudyMate Logo + Time-based Greeting */}
        <div className="text-center min-w-0">
          <div className="flex items-center justify-center gap-1.5">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-purple-600 via-indigo-600 to-sky-400 flex items-center justify-center text-white shadow-xs">
              <Sparkles className="w-3.5 h-3.5 fill-white/20" />
            </div>
            <span className="font-extrabold text-sm sm:text-base tracking-tight text-slate-900 dark:text-white">
              StudyMate<span className="text-purple-600 dark:text-purple-400">AI</span>
            </span>
          </div>
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate mt-0.5">
            {getSalutation()}, <strong className="text-slate-800 dark:text-slate-200 font-semibold">{displayName}</strong>
          </p>
        </div>

        {/* Right: Search + Notifications */}
        <div className="flex items-center gap-1.5">
          <button 
            onClick={() => onOpenSearch?.()}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
            title="Search Anything"
          >
            <Search className="w-4 h-4" />
          </button>
          <button 
            onClick={() => onNavigate("alarms")}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer relative"
            title="Notifications & Alarms"
          >
            <Bell className="w-4 h-4" />
            {alarms.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-purple-600 animate-ping" />
            )}
          </button>
        </div>
      </header>

      {/* 2. HERO CARD (Dynamic "Continue Your Last Session" + Zero-Duplication Core Stats) */}
      <motion.section 
        initial={shouldReduceMotion ? {} : { opacity: 0, y: 8 }}
        animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="relative overflow-hidden rounded-[26px] bg-gradient-to-br from-purple-900 via-indigo-900 to-slate-950 text-white p-5 sm:p-6 shadow-xl shadow-purple-950/20 border border-purple-500/20"
      >
        {/* Soft background ambient radial glows */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-purple-500/20 rounded-full blur-[90px] pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-indigo-500/20 rounded-full blur-[90px] pointer-events-none" />

        <div className="relative z-10 space-y-5">
          
          {/* Top Row Stats inside Hero Card (Zero Duplication) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 border-b border-white/10 pb-4">
            {/* Exam Countdown */}
            <div className="bg-white/10 dark:bg-white/5 border border-white/10 rounded-2xl p-2.5 backdrop-blur-md">
              <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider block">Board Exam</span>
              <span className="text-lg font-black text-white">{daysRemaining} <span className="text-xs font-semibold text-purple-200">days</span></span>
            </div>

            {/* Study Hours Today */}
            <div className="bg-white/10 dark:bg-white/5 border border-white/10 rounded-2xl p-2.5 backdrop-blur-md flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider block">Today</span>
                <span className="text-lg font-black text-white">{studyHoursToday} <span className="text-xs font-semibold text-purple-200">/ {profile.dailyStudyGoal}h</span></span>
              </div>
              <button 
                onClick={() => setShowLogHours(true)}
                className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-white transition cursor-pointer"
                title="Log Hours"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Current Streak */}
            <div className="bg-white/10 dark:bg-white/5 border border-white/10 rounded-2xl p-2.5 backdrop-blur-md flex items-center gap-2">
              <div className="p-1.5 bg-amber-500/30 rounded-xl text-amber-300">
                <Flame className="w-4 h-4 fill-amber-400" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider block">Streak</span>
                <span className="text-base font-black text-white">{profile.streakCounter || 1} <span className="text-xs font-semibold text-amber-200">Days</span></span>
              </div>
            </div>

            {/* Level Progress */}
            <div className="bg-white/10 dark:bg-white/5 border border-white/10 rounded-2xl p-2.5 backdrop-blur-md flex items-center gap-2">
              <div className="p-1.5 bg-purple-500/30 rounded-xl text-purple-300">
                <Trophy className="w-4 h-4 text-purple-300" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider block">Level {profile.level}</span>
                <span className="text-base font-black text-white">{profile.xp} <span className="text-xs font-semibold text-purple-200">XP</span></span>
              </div>
            </div>
          </div>

          {/* Dynamic "Continue Your Last Session" Primary Section */}
          {heroActivity ? (
            <div className="bg-white/10 dark:bg-white/5 border border-white/15 rounded-2xl p-4 sm:p-5 backdrop-blur-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-2 max-w-xl min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-purple-300 bg-purple-500/30 border border-purple-400/30 px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                    <Activity className="w-3 h-3 text-purple-300" />
                    {heroActivity.reasonText}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-300">
                    Last active: {formatTimeAgo(heroActivity.event.timestamp)}
                  </span>
                </div>

                <h2 className="text-lg sm:text-xl font-black text-white leading-tight truncate">
                  {heroActivity.event.title}
                </h2>
                <p className="text-xs text-purple-100/80 line-clamp-2 leading-relaxed">
                  {heroActivity.event.description}
                </p>

                {/* Progress Bar */}
                <div className="pt-1 flex items-center gap-3">
                  <div className="flex-1 h-2 rounded-full bg-white/20 overflow-hidden">
                    <div 
                      className="h-full rounded-full bg-gradient-to-r from-purple-400 to-indigo-300 transition-all duration-500"
                      style={{ width: `${Math.max(10, heroActivity.event.completionPercent)}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-extrabold text-purple-200 shrink-0">
                    {heroActivity.event.completionPercent}% complete
                  </span>
                </div>
              </div>

              <button
                onClick={handleContinueSession}
                className="w-full sm:w-auto px-5 py-3 bg-white text-purple-950 hover:bg-purple-50 active:scale-98 font-black text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-white/10 shrink-0 cursor-pointer"
              >
                <span>{heroActivity.actionLabel}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="bg-white/10 border border-white/15 rounded-2xl p-4 backdrop-blur-xl flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white">Start Your Learning Session</h3>
                <p className="text-xs text-purple-200">Ask StudyMate AI or start a focus sprint to begin logging activities.</p>
              </div>
              <button
                onClick={() => onNavigate("ai_chat")}
                className="px-4 py-2 bg-white text-purple-900 font-bold text-xs rounded-xl shadow cursor-pointer"
              >
                Open AI
              </button>
            </div>
          )}

        </div>
      </motion.section>

      {/* 3. AI WORKSPACE DEDICATED CARD */}
      <section className="p-5 rounded-[24px] bg-white dark:bg-slate-900 border border-purple-200/80 dark:border-purple-900/40 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400">
                <Sparkles className="w-4 h-4" />
              </span>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">AI Workspace</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Interactive workspace with multimodal study assistants, notes summarizer & smart tools.
            </p>
          </div>

          <button
            onClick={() => onNavigate("ai_chat")}
            className="w-full sm:w-auto px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-purple-600/20 transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
          >
            <span>Open Workspace</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Compact Mode Chips: Chat, Voice, PDF, Image, Video */}
        <div className="grid grid-cols-5 gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button 
            onClick={() => onNavigate("ai_chat")} 
            className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 transition cursor-pointer"
          >
            <MessageSquare className="w-4 h-4" />
            <span className="text-[10px] font-bold">Chat</span>
          </button>
          
          <button 
            onClick={() => onNavigate("ai_chat")} 
            className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 transition cursor-pointer"
          >
            <Mic className="w-4 h-4" />
            <span className="text-[10px] font-bold">Voice</span>
          </button>

          <button 
            onClick={() => onNavigate("ai_chat")} 
            className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 transition cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span className="text-[10px] font-bold">PDF</span>
          </button>

          <button 
            onClick={() => onNavigate("imageGen")} 
            className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-fuchsia-50/70 dark:bg-fuchsia-950/30 hover:bg-fuchsia-100 dark:hover:bg-fuchsia-900/50 text-fuchsia-700 dark:text-fuchsia-300 transition cursor-pointer"
          >
            <ImageIcon className="w-4 h-4" />
            <span className="text-[10px] font-bold">Image</span>
          </button>

          <button 
            onClick={() => onNavigate("ai_chat")} 
            className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-sky-50/70 dark:bg-sky-950/30 hover:bg-sky-100 dark:hover:bg-sky-900/50 text-sky-700 dark:text-sky-300 transition cursor-pointer"
          >
            <Video className="w-4 h-4" />
            <span className="text-[10px] font-bold">Video</span>
          </button>
        </div>
      </section>

      {/* 4. UNIVERSAL SEARCH BAR */}
      <section className="space-y-2.5">
        <div 
          onClick={() => onOpenSearch?.()}
          className="p-3.5 rounded-[22px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-purple-300 dark:hover:border-purple-700 transition flex items-center justify-between gap-3 cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Search className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
            <span className="text-xs font-medium text-slate-400 truncate">
              Search notes, PDFs, formulas, quizzes, chats...
            </span>
          </div>
          <span className="text-[10px] font-mono font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 shrink-0 hidden sm:inline-block">
            ⌘K
          </span>
        </div>

        {/* Search Filter Chips Below */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {SEARCH_CHIPS.map((chip) => (
            <button
              key={chip}
              onClick={() => {
                setSearchFilter(chip);
                onOpenSearch?.();
              }}
              className={`px-3 py-1 rounded-full text-[11px] font-bold transition whitespace-nowrap cursor-pointer ${
                searchFilter === chip
                  ? "bg-purple-600 text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {chip}
            </button>
          ))}
        </div>
      </section>

      {/* 5. QUICK ACTIONS (Clean 2x3 Grid) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Quick Actions
          </h3>
          <span className="text-[10px] text-slate-400 font-bold">1-Tap Shortcuts</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {QUICK_ACTIONS_2x3.map((action, idx) => {
            const Icon = action.icon;
            return (
              <motion.button
                key={idx}
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onNavigate(action.route)}
                className="p-4 rounded-[22px] bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-purple-300 dark:hover:border-purple-700 transition flex items-center gap-3.5 text-left cursor-pointer"
              >
                <div className={`p-2.5 rounded-xl border ${action.color} shrink-0`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                    {action.label}
                  </h4>
                  <span className="text-[10px] font-semibold text-slate-400 block truncate">
                    {action.badge}
                  </span>
                </div>
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* 6. AI INSIGHT (Compact Personalized Recommendation Card) */}
      <section className="p-4 sm:p-5 rounded-[24px] bg-gradient-to-r from-purple-50 via-indigo-50 to-sky-50 dark:from-purple-950/40 dark:via-indigo-950/40 dark:to-sky-950/40 border border-purple-200/80 dark:border-purple-800/40 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-purple-600 text-white rounded-xl shrink-0 shadow-xs">
            <Lightbulb className="w-4 h-4" />
          </div>
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                Personalized AI Insight
              </span>
              <span className="text-[9px] font-bold text-slate-400">Adaptive</span>
            </div>
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-relaxed">
              {engineData.recommendations[0]?.description || 
                `Your study consistency is up by 18% this week! Focusing on weak topics early in the day improves retention by 2.4x.`}
            </p>
          </div>
        </div>
      </section>

      {/* 7. WEEKLY PROGRESS (Clean Minimal 7-day Chart) */}
      <section className="p-5 rounded-[24px] bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Weekly Activity Progress
            </h3>
            <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
              {engineData.weeklyProgress.reduce((sum, d) => sum + d.hours, 0).toFixed(1)} Total Hours Studied
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs font-extrabold text-purple-600 dark:text-purple-400 block">
              Avg Quiz: 84%
            </span>
            <span className="text-[10px] text-slate-400">7-Day Trend</span>
          </div>
        </div>

        {/* 7-Day Bar Chart */}
        <div className="grid grid-cols-7 gap-2 pt-2 items-end h-32">
          {engineData.weeklyProgress.map((dayData, idx) => {
            const maxHours = Math.max(4, ...engineData.weeklyProgress.map((d) => d.hours));
            const barHeightPercent = Math.min(100, Math.max(12, (dayData.hours / maxHours) * 100));
            const isToday = idx === 6;

            return (
              <div key={dayData.day} className="flex flex-col items-center gap-1.5 h-full justify-end">
                <span className="text-[9px] font-bold text-slate-400">{dayData.hours}h</span>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-lg h-24 relative flex items-end overflow-hidden">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${barHeightPercent}%` }}
                    transition={{ duration: 0.5, delay: idx * 0.05 }}
                    className={`w-full rounded-lg transition-all ${
                      isToday
                        ? "bg-gradient-to-t from-purple-600 to-indigo-500 shadow-xs"
                        : "bg-purple-200 dark:bg-purple-900/60"
                    }`}
                  />
                </div>
                <span className={`text-[10px] font-bold ${isToday ? "text-purple-600 dark:text-purple-400" : "text-slate-400"}`}>
                  {dayData.day}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* 8. RECENT ACTIVITY (Horizontal Scroll Compact Cards) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Recent Activity
          </h3>
          <span className="text-[10px] text-slate-400 font-bold">Auto-Logged</span>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
          {engineData.recentActivities.length > 0 ? (
            engineData.recentActivities.map((act) => (
              <div
                key={act.eventId}
                onClick={() => onNavigate(act.metadata?.targetRoute || "ai_chat")}
                className="min-w-[200px] max-w-[240px] p-3.5 rounded-[20px] bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-purple-300 dark:hover:border-purple-700 transition cursor-pointer flex flex-col justify-between space-y-2 shrink-0"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 border border-purple-200/50">
                    {act.activityType.replace("_", " ")}
                  </span>
                  <span className="text-[9px] text-slate-400">
                    {formatTimeAgo(act.timestamp)}
                  </span>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {act.title}
                  </h4>
                  <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                    {act.description}
                  </p>
                </div>

                <div className="pt-1 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[9px] font-bold text-slate-500">
                    {act.completionPercent}% Done
                  </span>
                  <span className="text-[9px] font-extrabold text-purple-600 dark:text-purple-400 flex items-center gap-0.5">
                    Resume <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full text-center">
              No recent activity logs yet.
            </div>
          )}
        </div>
      </section>

      {/* QUICK ADD TASK MODAL POPUP */}
      {showQuickAdd && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[28px] border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4"
          >
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">Add Quick Task</h3>
              <button onClick={() => setShowQuickAdd(false)} className="p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickAddSubmit} className="space-y-4 text-left">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Task Title</label>
                <input 
                  type="text" 
                  placeholder="e.g. Solve Physics PYQs"
                  className="w-full px-3 py-2.5 text-xs font-bold border rounded-xl dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 outline-none focus:border-purple-500"
                  value={quickTaskTitle}
                  onChange={(e) => setQuickTaskTitle(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Subject</label>
                  <select
                    className="w-full px-3 py-2.5 text-xs font-bold border rounded-xl dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 outline-none"
                    value={quickTaskSubject}
                    onChange={(e) => setQuickTaskSubject(e.target.value)}
                  >
                    <option value="" className="text-slate-800">Select...</option>
                    {profile.favoriteSubjects.map((sub) => (
                      <option key={sub} value={sub} className="text-slate-800">{sub}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Priority</label>
                  <select
                    className="w-full px-3 py-2.5 text-xs font-bold border rounded-xl dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 outline-none"
                    value={quickTaskPriority}
                    onChange={(e) => setQuickTaskPriority(e.target.value as any)}
                  >
                    <option value="High" className="text-slate-800">High</option>
                    <option value="Medium" className="text-slate-800">Medium</option>
                    <option value="Low" className="text-slate-800">Low</option>
                  </select>
                </div>
              </div>

              <button 
                type="submit"
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs rounded-xl shadow cursor-pointer"
              >
                Create Task (+20 XP)
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* LOG HOURS MODAL POPUP */}
      {showLogHours && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-[28px] border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 text-center"
          >
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">Log Study Hours</h3>
              <button onClick={() => setShowLogHours(false)} className="p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleLogHoursSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-3">Hours studied today:</label>
                <div className="flex items-center justify-center space-x-4">
                  <button 
                    type="button" 
                    onClick={() => setLogAmount(Math.max(0.5, logAmount - 0.5))}
                    className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-lg font-black text-slate-700 dark:text-slate-300"
                  >
                    -
                  </button>
                  <span className="text-2xl font-black text-purple-600 dark:text-purple-400">{logAmount} hrs</span>
                  <button 
                    type="button" 
                    onClick={() => setLogAmount(Math.min(12, logAmount + 0.5))}
                    className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-lg font-black text-slate-700 dark:text-slate-300"
                  >
                    +
                  </button>
                </div>
              </div>

              <button 
                type="submit"
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs rounded-xl shadow cursor-pointer"
              >
                Log Hours (+{Math.round(logAmount * 30)} XP)
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* PREMIUM COMMAND CENTER SIDEBAR DRAWER */}
      <CommandCenterDrawer
        isOpen={showMenuDrawer}
        onClose={() => setShowMenuDrawer(false)}
        profile={profile}
        onNavigate={onNavigate}
      />

    </div>
  );
}
