import React, { useState, useEffect } from "react";
import { UserProfile, Badge, getStudentRank, Task, Habit } from "../types";
import { 
  User, GraduationCap, Award, Compass, Save, RefreshCw, 
  Trash2, CheckCircle, Flame, Star, ShieldCheck, HeartPulse,
  Zap, Trophy, Sparkles, Bell, Shield, Database, Sun, Moon, ArrowRight, 
  Lock, Coins, Gem, Settings, Activity, BarChart3, TrendingUp,
  Target, Brain, Check, ChevronDown, ChevronUp, Clock, Eye, Lightbulb,
  CheckCircle2, RotateCcw, Share2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Confetti from "./Confetti";

interface ProfileViewProps {
  profile: UserProfile;
  badges: Badge[];
  tasks?: Task[];
  habits?: Habit[];
  onUpdateProfile: (updates: Partial<UserProfile>) => void;
  onResetApp: () => void;
}

const AVATAR_OPTIONS = [
  "🎓", "🧠", "💡", "🎨", "🚀", "🌟", "🔥", "⚡", "🐼", "🦊", "🦁", "🦖", "🧬", "🧪", "🪐", "🍕"
];

// High performance count-up numbers for 60-120 FPS
function PremiumCountUp({ value, duration = 1000, suffix = "", prefix = "" }: { value: number; duration?: number; suffix?: string; prefix?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easeProgress = progress * (2 - progress); // Quad ease-out
      setCount(easeProgress * value);
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setCount(value);
      }
    };
    window.requestAnimationFrame(step);
  }, [value, duration]);

  return <span>{prefix}{Math.round(count).toLocaleString()}{suffix}</span>;
}

// Apple Fitness Style Circular Ring
function FitnessRing({ 
  percentage, 
  size = 64, 
  strokeWidth = 6, 
  colorFrom = "#6366f1", 
  colorTo = "#a855f7",
  children 
}: { 
  percentage: number; 
  size?: number; 
  strokeWidth?: number; 
  colorFrom?: string; 
  colorTo?: string; 
  children?: React.ReactNode;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, percentage)) / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <defs>
          <linearGradient id={`ringGrad-${colorFrom.replace('#','')}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colorFrom} />
            <stop offset="100%" stopColor={colorTo} />
          </linearGradient>
        </defs>
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-slate-200/60 dark:text-slate-800/80 fill-none"
        />
        {/* Animated Progress ring */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`url(#ringGrad-${colorFrom.replace('#','')})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className="fill-none"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          style={{ strokeDasharray: circumference }}
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );
}

export default function ProfileView({ 
  profile, 
  badges, 
  tasks = [], 
  habits = [], 
  onUpdateProfile, 
  onResetApp 
}: ProfileViewProps) {
  const [fullName, setFullName] = useState(profile.fullName);
  const [classGrade, setClassGrade] = useState(profile.classGrade);
  const [targetExam, setTargetExam] = useState(profile.targetExam);
  const [dailyStudyGoal, setDailyStudyGoal] = useState(profile.dailyStudyGoal);
  const [preferredStudyTime, setPreferredStudyTime] = useState(profile.preferredStudyTime);
  const [avatar, setAvatar] = useState(profile.avatar);

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [selectedFavs, setSelectedFavs] = useState<string[]>(profile.favoriteSubjects);
  const [selectedWeaks, setSelectedWeaks] = useState<string[]>(profile.weakSubjects);

  // Active group section for grouped settings
  const [activeGroup, setActiveGroup] = useState<string | null>("profile");

  // Badge filter state & celebration modal
  const [badgeFilter, setBadgeFilter] = useState<"all" | "unlocked" | "locked">("all");
  const [activeBadgeModal, setActiveBadgeModal] = useState<Badge | null>(null);

  // Confetti triggering state
  const [confettiActive, setConfettiActive] = useState(false);

  // Sub-settings toggle states
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundAlarms, setSoundAlarms] = useState(true);
  const [aiSuggestions, setAiSuggestions] = useState(true);
  const [backupSuccess, setBackupSuccess] = useState(false);
  const [backingUp, setBackingUp] = useState(false);

  // Theme detection
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const checkDark = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };
    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const handleThemeToggle = () => {
    if (isDark) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    }
    setIsDark(!isDark);
  };

  const triggerConfettiCelebration = () => {
    setConfettiActive(false);
    setTimeout(() => {
      setConfettiActive(true);
    }, 50);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    setTimeout(() => {
      onUpdateProfile({
        fullName,
        classGrade,
        targetExam,
        dailyStudyGoal,
        preferredStudyTime,
        avatar,
        favoriteSubjects: selectedFavs,
        weakSubjects: selectedWeaks
      });
      setSaving(false);
      setSaveSuccess(true);
      triggerConfettiCelebration();
      setTimeout(() => setSaveSuccess(false), 3000);
    }, 400);
  };

  const handleFavToggle = (sub: string) => {
    if (selectedFavs.includes(sub)) {
      setSelectedFavs(selectedFavs.filter((f) => f !== sub));
    } else {
      setSelectedFavs([...selectedFavs, sub]);
    }
  };

  const handleWeakToggle = (sub: string) => {
    if (selectedWeaks.includes(sub)) {
      setSelectedWeaks(selectedWeaks.filter((w) => w !== sub));
    } else {
      setSelectedWeaks([...selectedWeaks, sub]);
    }
  };

  const handleBackupData = () => {
    setBackingUp(true);
    setTimeout(() => {
      setBackingUp(false);
      setBackupSuccess(true);
      setTimeout(() => setBackupSuccess(false), 3000);
    }, 1200);
  };

  const subjectPresets = [
    "Mathematics", "Physics", "Chemistry", "Biology", 
    "English", "History", "Computer Science", "Geography"
  ];

  const unlockedBadges = badges.filter((b) => b.unlocked);
  const lockedBadges = badges.filter((b) => !b.unlocked);

  // Dynamic metrics
  const totalTasksCount = tasks.length || 10;
  const homeworkCompleted = tasks.filter(t => t.completed).length || 7;
  const homeworkRate = Math.round((homeworkCompleted / totalTasksCount) * 100);
  
  const habitsCompletedCount = habits.reduce((acc, h) => acc + h.datesCompleted.length, 0) || 18;
  const totalFocusSessions = Math.max(1, Math.round(profile.totalStudyHours * 2.4)) || 14;
  const habitConsistencyScore = Math.min(100, Math.round(habitsCompletedCount * 4.2 + (profile.streakCounter || 1) * 3));

  // Load test history
  const [testCount, setTestCount] = useState(6);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("studymate_test_history");
      if (saved) {
        setTestCount(Math.max(1, JSON.parse(saved).length));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Gamified currencies
  const studymateCoins = Math.round(profile.xp * 1.5);
  const studymateGems = Math.round(profile.level * 12 + (profile.streakCounter || 1) * 4);
  const currentRankInfo = getStudentRank(profile.xp);

  // Weekly study report data (Mon - Sun)
  const weeklyData = [
    { day: "Mon", hours: 2.5, target: 3 },
    { day: "Tue", hours: 3.8, target: 3 },
    { day: "Wed", hours: 4.2, target: 3 },
    { day: "Thu", hours: 2.1, target: 3 },
    { day: "Fri", hours: 3.5, target: 3 },
    { day: "Sat", hours: 5.0, target: 4 },
    { day: "Sun", hours: 4.5, target: 4 },
  ];
  const maxWeeklyHours = 6;

  const filteredBadges = badges.filter((b) => {
    if (badgeFilter === "unlocked") return b.unlocked;
    if (badgeFilter === "locked") return !b.unlocked;
    return true;
  });

  return (
    <div id="profile_tab" className="space-y-8 select-none max-w-7xl mx-auto pb-20">
      
      {/* Real-time Confetti Canvas overlay */}
      <Confetti active={confettiActive} onComplete={() => setConfettiActive(false)} />

      {/* 1. HERO PROFILE CARD — APPLE FITNESS & DUOLINGO INSPIRED FLAGSHIP HEADER */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-3xl border border-indigo-500/20 dark:border-indigo-500/30 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 text-white p-6 md:p-8 shadow-2xl"
      >
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-500/25 via-purple-500/20 to-pink-500/10 rounded-full blur-[90px] pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-72 h-72 bg-emerald-500/15 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-center lg:items-stretch justify-between gap-8">
          
          {/* Avatar & Main Identity */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
            
            {/* Duolingo / Apple Fitness Ring Avatar Wrapper */}
            <div 
              className="relative group cursor-pointer shrink-0" 
              onClick={triggerConfettiCelebration}
              title="Click to celebrate streak!"
            >
              <FitnessRing 
                percentage={Math.min(100, (profile.xp % 500) / 5)} 
                size={112} 
                strokeWidth={7} 
                colorFrom="#ec4899" 
                colorTo="#6366f1"
              >
                <div className="text-5xl sm:text-6xl w-24 h-24 bg-white/10 dark:bg-slate-900/80 backdrop-blur-md rounded-full border border-white/20 flex items-center justify-center shadow-inner transform group-hover:scale-105 transition duration-300">
                  {avatar}
                </div>
              </FitnessRing>
              
              {/* Flame Badge Pill */}
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black text-[10px] px-2.5 py-0.5 rounded-full border border-white/30 shadow-lg flex items-center gap-1 uppercase tracking-wider">
                <Flame className="w-3 h-3 fill-white animate-pulse" />
                <span>{profile.streakCounter || 1}d</span>
              </div>
            </div>

            {/* Name, Grade, Rank */}
            <div className="space-y-2.5 flex-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">{fullName}</h1>
                <span className="text-[10px] font-black uppercase tracking-widest bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-3 py-1 rounded-full shadow-md border border-white/20">
                  LVL {profile.level} Scholar
                </span>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 font-semibold flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span className="flex items-center gap-1">
                  <GraduationCap className="w-4 h-4 text-indigo-400" />
                  {classGrade}
                </span>
                <span className="text-slate-600">•</span>
                <span className="flex items-center gap-1 text-slate-300">
                  <Target className="w-3.5 h-3.5 text-purple-400" />
                  {targetExam}
                </span>
              </p>

              {/* Rank & Status Pills */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                <span className="text-[10px] font-black bg-white/10 backdrop-blur-md border border-white/20 text-indigo-300 px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm">
                  <span className="text-sm">{currentRankInfo.symbol}</span>
                  <span className="uppercase tracking-wider">{currentRankInfo.name}</span>
                </span>

                <span className="text-[10px] font-black bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-3 py-1.5 rounded-xl flex items-center gap-1.5 uppercase shadow-sm">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>On Track</span>
                </span>
              </div>
            </div>

          </div>

          {/* Duolingo-Style Currency & Streak Dock */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-3 w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-white/10 pt-6 lg:pt-0 lg:pl-6 shrink-0">
            
            {/* Streak */}
            <div 
              onClick={triggerConfettiCelebration}
              className="p-3 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md hover:bg-white/10 transition cursor-pointer flex items-center space-x-3 group"
            >
              <div className="p-2.5 bg-gradient-to-br from-orange-500 to-amber-600 text-white rounded-xl shadow-md group-hover:scale-110 transition">
                <Flame className="w-5 h-5 fill-white animate-pulse" />
              </div>
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Streak</span>
                <h3 className="text-base font-black text-amber-400">
                  <PremiumCountUp value={profile.streakCounter || 1} suffix=" Days" />
                </h3>
              </div>
            </div>

            {/* Total XP */}
            <div className="p-3 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md hover:bg-white/10 transition flex items-center space-x-3 group">
              <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-xl shadow-md group-hover:scale-110 transition">
                <Zap className="w-5 h-5 fill-white" />
              </div>
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Total XP</span>
                <h3 className="text-base font-black text-indigo-300">
                  <PremiumCountUp value={profile.xp} />
                </h3>
              </div>
            </div>

            {/* Study Coins */}
            <div className="p-3 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md hover:bg-white/10 transition flex items-center space-x-3 group">
              <div className="p-2.5 bg-gradient-to-br from-yellow-500 to-amber-500 text-white rounded-xl shadow-md group-hover:scale-110 transition">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Coins</span>
                <h3 className="text-base font-black text-yellow-400">
                  <PremiumCountUp value={studymateCoins} />
                </h3>
              </div>
            </div>

            {/* Gems */}
            <div className="p-3 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md hover:bg-white/10 transition flex items-center space-x-3 group">
              <div className="p-2.5 bg-gradient-to-br from-fuchsia-500 to-pink-600 text-white rounded-xl shadow-md group-hover:scale-110 transition">
                <Gem className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Gems</span>
                <h3 className="text-base font-black text-fuchsia-300">
                  <PremiumCountUp value={studymateGems} />
                </h3>
              </div>
            </div>

          </div>

        </div>

        {/* Level Progression Progress Bar */}
        <div className="mt-6 pt-4 border-t border-white/10 space-y-1.5">
          <div className="flex justify-between items-center text-[10px] font-extrabold text-slate-300 uppercase tracking-wider">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-indigo-400" />
              Level {profile.level} Progression
            </span>
            <span>{profile.xp % 500} / 500 XP to Level {profile.level + 1}</span>
          </div>
          <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden p-0.5 border border-white/10">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, Math.max(5, ((profile.xp % 500) / 500) * 100))}%` }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-emerald-400 via-indigo-500 to-purple-500 rounded-full shadow-md"
            />
          </div>
        </div>

      </motion.div>

      {/* 2. PREMIUM STATISTIC CARDS (APPLE FITNESS RING STYLE) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-500" />
            <span>Academic Fitness & Metrics</span>
          </h2>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Real-time stats</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          
          {/* STAT 1: Study Hours */}
          <div className="p-4 rounded-3xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 backdrop-blur-xl shadow-lg flex flex-col justify-between hover:border-indigo-500/50 transition">
            <div className="flex items-center justify-between mb-3">
              <FitnessRing 
                percentage={Math.min(100, (profile.totalStudyHours / (profile.dailyStudyGoal * 7)) * 100)} 
                size={44} 
                strokeWidth={5}
                colorFrom="#6366f1"
                colorTo="#8b5cf6"
              >
                <Clock className="w-4 h-4 text-indigo-500" />
              </FitnessRing>
              <span className="text-[9px] font-black uppercase text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">
                {profile.dailyStudyGoal}h/day
              </span>
            </div>
            <div>
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Study Hours</span>
              <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 mt-0.5">
                <PremiumCountUp value={profile.totalStudyHours} suffix="h" />
              </h3>
              <p className="text-[9px] text-slate-500 font-bold mt-1 truncate">Logged across topics</p>
            </div>
          </div>

          {/* STAT 2: Homework Completed */}
          <div className="p-4 rounded-3xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 backdrop-blur-xl shadow-lg flex flex-col justify-between hover:border-emerald-500/50 transition">
            <div className="flex items-center justify-between mb-3">
              <FitnessRing 
                percentage={homeworkRate} 
                size={44} 
                strokeWidth={5}
                colorFrom="#10b981"
                colorTo="#14b8a6"
              >
                <CheckCircle className="w-4 h-4 text-emerald-500" />
              </FitnessRing>
              <span className="text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                {homeworkRate}%
              </span>
            </div>
            <div>
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Homework</span>
              <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 mt-0.5">
                <PremiumCountUp value={homeworkCompleted} />
                <span className="text-xs text-slate-400 font-normal">/{totalTasksCount}</span>
              </h3>
              <p className="text-[9px] text-slate-500 font-bold mt-1 truncate">Tasks completed</p>
            </div>
          </div>

          {/* STAT 3: Tests Completed */}
          <div className="p-4 rounded-3xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 backdrop-blur-xl shadow-lg flex flex-col justify-between hover:border-purple-500/50 transition">
            <div className="flex items-center justify-between mb-3">
              <FitnessRing 
                percentage={Math.min(100, testCount * 12)} 
                size={44} 
                strokeWidth={5}
                colorFrom="#a855f7"
                colorTo="#ec4899"
              >
                <Brain className="w-4 h-4 text-purple-500" />
              </FitnessRing>
              <span className="text-[9px] font-black uppercase text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full">
                Mock Exams
              </span>
            </div>
            <div>
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Tests Completed</span>
              <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 mt-0.5">
                <PremiumCountUp value={testCount} />
              </h3>
              <p className="text-[9px] text-slate-500 font-bold mt-1 truncate">Mock papers finished</p>
            </div>
          </div>

          {/* STAT 4: Focus Time */}
          <div className="p-4 rounded-3xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 backdrop-blur-xl shadow-lg flex flex-col justify-between hover:border-rose-500/50 transition">
            <div className="flex items-center justify-between mb-3">
              <FitnessRing 
                percentage={Math.min(100, (totalFocusSessions / 20) * 100)} 
                size={44} 
                strokeWidth={5}
                colorFrom="#f43f5e"
                colorTo="#fb7185"
              >
                <Target className="w-4 h-4 text-rose-500" />
              </FitnessRing>
              <span className="text-[9px] font-black uppercase text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full">
                25-min Pom
              </span>
            </div>
            <div>
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Focus Time</span>
              <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 mt-0.5">
                <PremiumCountUp value={totalFocusSessions * 25} suffix="m" />
              </h3>
              <p className="text-[9px] text-slate-500 font-bold mt-1 truncate">{totalFocusSessions} Pomodoro sprints</p>
            </div>
          </div>

          {/* STAT 5: Habit Score */}
          <div className="p-4 rounded-3xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 backdrop-blur-xl shadow-lg flex flex-col justify-between hover:border-amber-500/50 transition">
            <div className="flex items-center justify-between mb-3">
              <FitnessRing 
                percentage={habitConsistencyScore} 
                size={44} 
                strokeWidth={5}
                colorFrom="#f59e0b"
                colorTo="#d97706"
              >
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              </FitnessRing>
              <span className="text-[9px] font-black uppercase text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                Habit Index
              </span>
            </div>
            <div>
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Habit Score</span>
              <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 mt-0.5">
                <PremiumCountUp value={habitConsistencyScore} suffix="%" />
              </h3>
              <p className="text-[9px] text-slate-500 font-bold mt-1 truncate">Check-in consistency</p>
            </div>
          </div>

          {/* STAT 6: Achievements */}
          <div className="p-4 rounded-3xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 backdrop-blur-xl shadow-lg flex flex-col justify-between hover:border-teal-500/50 transition">
            <div className="flex items-center justify-between mb-3">
              <FitnessRing 
                percentage={Math.round((unlockedBadges.length / Math.max(1, badges.length)) * 100)} 
                size={44} 
                strokeWidth={5}
                colorFrom="#14b8a6"
                colorTo="#06b6d4"
              >
                <Trophy className="w-4 h-4 text-teal-500" />
              </FitnessRing>
              <span className="text-[9px] font-black uppercase text-teal-600 dark:text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-full">
                Badges
              </span>
            </div>
            <div>
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Achievements</span>
              <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 mt-0.5">
                {unlockedBadges.length}
                <span className="text-xs text-slate-400 font-normal">/{badges.length}</span>
              </h3>
              <p className="text-[9px] text-slate-500 font-bold mt-1 truncate">Unlocked accolades</p>
            </div>
          </div>

        </div>
      </div>

      {/* 3. PERFORMANCE INSIGHTS, WEEKLY REPORT & MONTHLY PROGRESS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Weekly & Monthly Visual Report */}
        <div className="lg:col-span-7 bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 backdrop-blur-xl shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800 pb-4">
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                <BarChart3 className="w-4.5 h-4.5 text-indigo-500" />
                Weekly Study Hours Report
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                Comparison of daily study hours vs target goal
              </p>
            </div>
            <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full uppercase">
              Target: {profile.dailyStudyGoal}h / day
            </span>
          </div>

          {/* Bar chart visualization */}
          <div className="h-44 flex items-end justify-between gap-2 pt-4 px-2">
            {weeklyData.map((item, idx) => {
              const heightPercent = (item.hours / maxWeeklyHours) * 100;
              const isTargetMet = item.hours >= item.target;
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                  <span className="text-[9px] font-bold text-slate-500 group-hover:text-indigo-500 transition">
                    {item.hours}h
                  </span>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl h-full flex items-end p-1 relative overflow-hidden">
                    {/* Target line indicator */}
                    <div 
                      className="absolute left-0 right-0 border-b border-dashed border-slate-400/50 dark:border-slate-500/50 z-10"
                      style={{ bottom: `${(item.target / maxWeeklyHours) * 100}%` }}
                    />
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${heightPercent}%` }}
                      transition={{ duration: 0.8, delay: idx * 0.08 }}
                      className={`w-full rounded-lg shadow-md transition-all duration-300 ${
                        isTargetMet
                          ? "bg-gradient-to-t from-indigo-600 via-indigo-500 to-purple-500"
                          : "bg-gradient-to-t from-slate-400 to-slate-300 dark:from-slate-700 dark:to-slate-600"
                      }`}
                    />
                  </div>
                  <span className={`text-[10px] font-black ${isTargetMet ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400"}`}>
                    {item.day}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Monthly progress overview strip */}
          <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-md">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-800 dark:text-slate-100">Monthly Syllabus Growth</h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  Covered <strong className="text-indigo-600 dark:text-indigo-400">78%</strong> of expected chapter topics this month.
                </p>
              </div>
            </div>
            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
              +14% vs Last Month
            </span>
          </div>
        </div>

        {/* AI Performance Insights Card */}
        <div className="lg:col-span-5 bg-gradient-to-br from-indigo-900 via-slate-900 to-purple-950 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between border border-indigo-500/30">
          <div className="absolute top-0 right-0 w-64 h-64 bg-fuchsia-500/10 rounded-full blur-[60px] pointer-events-none" />

          <div>
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-gradient-to-tr from-indigo-500 to-purple-500 text-white rounded-xl shadow-md">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-sm text-white">AI Performance Insights</h3>
              </div>
              <span className="text-[9px] font-black uppercase tracking-wider bg-white/10 px-2.5 py-1 rounded-full border border-white/20">
                StudyMate Coach
              </span>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 bg-white/5 border border-white/10 rounded-2xl space-y-1">
                <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider flex items-center gap-1">
                  <Flame className="w-3 h-3 text-amber-400" />
                  Peak Performance Window
                </span>
                <p className="text-xs font-medium text-slate-200 leading-relaxed">
                  You study most effectively during <strong className="text-white">{preferredStudyTime}</strong> sessions. Your recall accuracy jumps by 28%!
                </p>
              </div>

              <div className="p-3.5 bg-white/5 border border-white/10 rounded-2xl space-y-1">
                <span className="text-[10px] font-black uppercase text-indigo-300 tracking-wider flex items-center gap-1">
                  <Target className="w-3 h-3 text-indigo-400" />
                  Weak Subject Focus
                </span>
                <p className="text-xs font-medium text-slate-200 leading-relaxed">
                  Priority attention needed for <strong className="text-white">{selectedWeaks.join(", ") || "Mathematics"}</strong>. Try 2 additional Pomodoro sprints this week.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-white/10 flex items-center justify-between text-xs">
            <span className="text-[10px] text-slate-400 font-semibold">Updated with latest test scores</span>
            <button 
              type="button"
              onClick={triggerConfettiCelebration}
              className="text-[10px] font-black text-indigo-300 hover:text-white flex items-center gap-1 cursor-pointer"
            >
              <span>Refresh Insights</span>
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        </div>

      </div>

      {/* 4. REDESIGNED BADGES WITH GLASS CARDS & UNLOCK ANIMATIONS */}
      <div className="bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 backdrop-blur-xl shadow-xl space-y-5">
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200/50 dark:border-slate-800 pb-4">
          <div>
            <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              <span>Prestigious Badges & Honors</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Click any unlocked badge to trigger celebration animations & confetti
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/60">
            <button
              type="button"
              onClick={() => setBadgeFilter("all")}
              className={`px-3 py-1.5 text-[10px] font-extrabold rounded-xl transition cursor-pointer ${
                badgeFilter === "all"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              All ({badges.length})
            </button>
            <button
              type="button"
              onClick={() => setBadgeFilter("unlocked")}
              className={`px-3 py-1.5 text-[10px] font-extrabold rounded-xl transition cursor-pointer ${
                badgeFilter === "unlocked"
                  ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              Unlocked ({unlockedBadges.length})
            </button>
            <button
              type="button"
              onClick={() => setBadgeFilter("locked")}
              className={`px-3 py-1.5 text-[10px] font-extrabold rounded-xl transition cursor-pointer ${
                badgeFilter === "locked"
                  ? "bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              Locked ({lockedBadges.length})
            </button>
          </div>
        </div>

        {/* Badges Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {filteredBadges.map((badge) => {
            return (
              <motion.div
                key={badge.id}
                whileHover={badge.unlocked ? { scale: 1.05, y: -4 } : { scale: 1.02 }}
                whileTap={badge.unlocked ? { scale: 0.95 } : {}}
                onClick={() => {
                  if (badge.unlocked) {
                    setActiveBadgeModal(badge);
                    triggerConfettiCelebration();
                  }
                }}
                className={`p-4 rounded-3xl border flex flex-col items-center text-center justify-between space-y-2 cursor-pointer transition relative overflow-hidden backdrop-blur-md ${
                  badge.unlocked
                    ? "bg-gradient-to-b from-indigo-500/10 via-purple-500/5 to-white/40 dark:to-slate-900/40 border-indigo-500/30 shadow-lg hover:shadow-indigo-500/20"
                    : "bg-slate-100/40 dark:bg-slate-900/30 border-slate-200/50 dark:border-slate-800 opacity-60"
                }`}
              >
                {/* Unlocked Glow Accent */}
                {badge.unlocked && (
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-400 via-indigo-500 to-purple-500" />
                )}

                {/* Badge Icon */}
                <div className="relative text-4xl my-1">
                  {badge.icon}
                  {!badge.unlocked && (
                    <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px] rounded-full flex items-center justify-center">
                      <Lock className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                </div>

                {/* Badge Name & Desc */}
                <div className="space-y-0.5 w-full">
                  <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">
                    {badge.name}
                  </h4>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 font-medium line-clamp-2 leading-tight">
                    {badge.description}
                  </p>
                </div>

                {/* Status Badge */}
                <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  badge.unlocked 
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" 
                    : "bg-slate-200 dark:bg-slate-800 text-slate-400"
                }`}>
                  {badge.unlocked ? "Unlocked" : "Locked"}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* 5. ORGANIZED GROUPED ACCOUNT OPTIONS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-500" />
            <span>Account Settings & Configurations</span>
          </h2>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Preferences</span>
        </div>

        {/* Group Navigation Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          <button
            type="button"
            onClick={() => setActiveGroup("profile")}
            className={`p-3.5 rounded-2xl border transition text-left flex items-center space-x-3 cursor-pointer ${
              activeGroup === "profile"
                ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-500/20"
                : "bg-white/70 dark:bg-slate-900/70 border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-400"
            }`}
          >
            <div className={`p-2 rounded-xl ${activeGroup === "profile" ? "bg-white/20 text-white" : "bg-indigo-500/10 text-indigo-500"}`}>
              <User className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-black block">Student Profile</span>
              <span className={`text-[9px] block ${activeGroup === "profile" ? "text-indigo-100" : "text-slate-400"}`}>Name, Exam, Subjects</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveGroup("notifications")}
            className={`p-3.5 rounded-2xl border transition text-left flex items-center space-x-3 cursor-pointer ${
              activeGroup === "notifications"
                ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-500/20"
                : "bg-white/70 dark:bg-slate-900/70 border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-400"
            }`}
          >
            <div className={`p-2 rounded-xl ${activeGroup === "notifications" ? "bg-white/20 text-white" : "bg-amber-500/10 text-amber-500"}`}>
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-black block">Notifications</span>
              <span className={`text-[9px] block ${activeGroup === "notifications" ? "text-indigo-100" : "text-slate-400"}`}>Alarms, AI Digest</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveGroup("theme")}
            className={`p-3.5 rounded-2xl border transition text-left flex items-center space-x-3 cursor-pointer ${
              activeGroup === "theme"
                ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-500/20"
                : "bg-white/70 dark:bg-slate-900/70 border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-400"
            }`}
          >
            <div className={`p-2 rounded-xl ${activeGroup === "theme" ? "bg-white/20 text-white" : "bg-emerald-500/10 text-emerald-500"}`}>
              {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </div>
            <div>
              <span className="text-xs font-black block">Appearance</span>
              <span className={`text-[9px] block ${activeGroup === "theme" ? "text-indigo-100" : "text-slate-400"}`}>Light / Dark Theme</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveGroup("backup")}
            className={`p-3.5 rounded-2xl border transition text-left flex items-center space-x-3 cursor-pointer ${
              activeGroup === "backup"
                ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-500/20"
                : "bg-white/70 dark:bg-slate-900/70 border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-400"
            }`}
          >
            <div className={`p-2 rounded-xl ${activeGroup === "backup" ? "bg-white/20 text-white" : "bg-blue-500/10 text-blue-500"}`}>
              <Database className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-black block">Cloud Sync & Security</span>
              <span className={`text-[9px] block ${activeGroup === "backup" ? "text-indigo-100" : "text-slate-400"}`}>Backup, Danger Zone</span>
            </div>
          </button>
        </div>

        {/* Group Content Container */}
        <div className="bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 backdrop-blur-xl shadow-xl">
          
          {/* GROUP 1: EDIT PROFILE */}
          {activeGroup === "profile" && (
            <form onSubmit={handleUpdate} className="space-y-6">
              <div className="border-b border-slate-200/50 dark:border-slate-800 pb-3">
                <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">Personal Student Information</h3>
                <p className="text-[10px] text-slate-400 font-medium">Update your photo avatar, target exam, and priority subjects</p>
              </div>

              {/* Avatar Selector */}
              <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Student Avatar Photo</label>
                <div className="grid grid-cols-8 gap-2">
                  {AVATAR_OPTIONS.map((av) => (
                    <button
                      key={av}
                      type="button"
                      onClick={() => setAvatar(av)}
                      className={`text-2xl p-2 bg-slate-50 dark:bg-slate-800/80 hover:scale-110 active:scale-95 transition-all rounded-2xl border flex items-center justify-center cursor-pointer ${
                        avatar === av 
                          ? "border-indigo-600 ring-2 ring-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-950/40" 
                          : "border-slate-200/80 dark:border-slate-800"
                      }`}
                    >
                      {av}
                    </button>
                  ))}
                </div>
              </div>

              {/* Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Full Name</label>
                  <input 
                    type="text" 
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 font-medium"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Class Grade</label>
                  <input 
                    type="text" 
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 font-medium"
                    value={classGrade}
                    onChange={(e) => setClassGrade(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Target Exam</label>
                  <input 
                    type="text" 
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 font-medium"
                    value={targetExam}
                    onChange={(e) => setTargetExam(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Daily Study Goal (Hours)</label>
                  <input 
                    type="number" 
                    min="1"
                    max="12"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 font-medium"
                    value={dailyStudyGoal}
                    onChange={(e) => setDailyStudyGoal(parseInt(e.target.value))}
                    required
                  />
                </div>
              </div>

              {/* Strong & Weak Tags */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200/50 dark:border-slate-800">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Strong Subjects
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {subjectPresets.map((sub) => {
                      const selected = selectedFavs.includes(sub);
                      return (
                        <button
                          key={sub}
                          type="button"
                          onClick={() => handleFavToggle(sub)}
                          className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition cursor-pointer ${
                            selected 
                              ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400" 
                              : "bg-transparent border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-700"
                          }`}
                        >
                          {sub}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">
                    Weak Subjects (AI Focus)
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {subjectPresets.map((sub) => {
                      const selected = selectedWeaks.includes(sub);
                      return (
                        <button
                          key={sub}
                          type="button"
                          onClick={() => handleWeakToggle(sub)}
                          className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition cursor-pointer ${
                            selected 
                              ? "bg-rose-500/15 border-rose-500/40 text-rose-600 dark:text-rose-400" 
                              : "bg-transparent border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-700"
                          }`}
                        >
                          {sub}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200/50 dark:border-slate-800">
                {saveSuccess ? (
                  <span className="text-xs font-bold text-emerald-500 flex items-center gap-1 animate-pulse">
                    <Check className="w-4 h-4 text-emerald-500" />
                    Profile saved successfully!
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400 font-medium">Changes sync instantly to AI Assistant</span>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center space-x-2 cursor-pointer"
                >
                  {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>{saving ? "Saving..." : "Save Profile"}</span>
                </button>
              </div>
            </form>
          )}

          {/* GROUP 2: NOTIFICATIONS */}
          {activeGroup === "notifications" && (
            <div className="space-y-4">
              <div className="border-b border-slate-200/50 dark:border-slate-800 pb-3">
                <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">Study Alarms & Reminders</h3>
                <p className="text-[10px] text-slate-400 font-medium">Manage push alerts, streak alarms, and AI recommendations</p>
              </div>

              <div className="space-y-3 text-xs font-bold">
                <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/60 dark:border-slate-800">
                  <div>
                    <span className="block text-slate-800 dark:text-slate-100">Daily Study Streak Reminders</span>
                    <span className="text-[10px] text-slate-400 font-normal">Alert 30 mins before preferred study window</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={notificationsEnabled} 
                    onChange={() => setNotificationsEnabled(!notificationsEnabled)}
                    className="w-4 h-4 text-indigo-600 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/60 dark:border-slate-800">
                  <div>
                    <span className="block text-slate-800 dark:text-slate-100">Active Recall Math Challenge Alarms</span>
                    <span className="text-[10px] text-slate-400 font-normal">Play sound challenge before disarming alarms</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={soundAlarms} 
                    onChange={() => setSoundAlarms(!soundAlarms)}
                    className="w-4 h-4 text-indigo-600 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/60 dark:border-slate-800">
                  <div>
                    <span className="block text-slate-800 dark:text-slate-100">Weekly AI Study Recommendations</span>
                    <span className="text-[10px] text-slate-400 font-normal">Receive personalized weak-subject focus digests</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={aiSuggestions} 
                    onChange={() => setAiSuggestions(!aiSuggestions)}
                    className="w-4 h-4 text-indigo-600 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* GROUP 3: THEME */}
          {activeGroup === "theme" && (
            <div className="space-y-4">
              <div className="border-b border-slate-200/50 dark:border-slate-800 pb-3">
                <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">Appearance & Theme Layout</h3>
                <p className="text-[10px] text-slate-400 font-medium">Switch between sleek light and eye-friendly dark layouts</p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="block text-xs font-black text-slate-800 dark:text-slate-100">
                    Current Mode: {isDark ? "🌙 Eye-friendly Dark Mode" : "☀️ Professional Light Mode"}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    Adjusts contrast across all dashboards and glass cards
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleThemeToggle}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl shadow-md transition flex items-center space-x-2 cursor-pointer"
                >
                  {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  <span>Switch Theme</span>
                </button>
              </div>
            </div>
          )}

          {/* GROUP 4: CLOUD SYNC & DANGER ZONE */}
          {activeGroup === "backup" && (
            <div className="space-y-6">
              <div className="border-b border-slate-200/50 dark:border-slate-800 pb-3">
                <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">Cloud Sync & Data Security</h3>
                <p className="text-[10px] text-slate-400 font-medium">Backup your study ledger or reset local cache</p>
              </div>

              {/* Cloud Backup */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="block text-xs font-black text-slate-800 dark:text-slate-100">Local Ledger Cloud Backup</span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {backupSuccess ? "✅ Backup created successfully!" : "Last auto-sync: Just now"}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleBackupData}
                  disabled={backingUp}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl shadow-md transition flex items-center space-x-2 cursor-pointer"
                >
                  {backingUp ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
                  <span>{backingUp ? "Syncing..." : "Backup Data"}</span>
                </button>
              </div>

              {/* Danger Zone */}
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-black text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                      <Trash2 className="w-4 h-4" />
                      Danger Zone — Reset Application Cache
                    </h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                      Wipes local mock test history, study habit logs, and restores default onboarding state
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("Are you sure you want to reset all app data? This cannot be undone.")) {
                        onResetApp();
                      }
                    }}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs rounded-xl shadow-md transition cursor-pointer shrink-0"
                  >
                    Reset App
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* BADGE CELEBRATION MODAL */}
      <AnimatePresence>
        {activeBadgeModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[160] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-white/20 dark:border-slate-800 rounded-3xl p-6 shadow-2xl max-w-sm w-full text-center space-y-4 relative overflow-hidden"
            >
              <div className="p-4 bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 rounded-2xl border border-indigo-500/30 inline-block text-6xl my-2">
                {activeBadgeModal.icon}
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase text-emerald-500 tracking-widest bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
                  Achievement Unlocked!
                </span>
                <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
                  {activeBadgeModal.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {activeBadgeModal.description}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveBadgeModal(null)}
                className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black text-xs rounded-xl shadow-md hover:from-indigo-500 hover:to-purple-500 transition cursor-pointer"
              >
                Awesome!
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
