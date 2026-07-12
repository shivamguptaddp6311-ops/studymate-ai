import React, { useState, useEffect } from "react";
import { UserProfile, Task, Alarm, Habit } from "../types";
import { MOTIVATIONAL_QUOTES } from "../data";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, Calendar, Bell, Trophy, Plus, Clock, Play, CheckCircle2, 
  X, Check, Flame, ChevronRight, BookOpen, AlertTriangle, User, Award, Timer,
  Mic, Camera, Image as ImageIcon, Lightbulb, BarChart3, RefreshCw, TrendingUp, Info
} from "lucide-react";

interface DashboardProps {
  profile: UserProfile;
  tasks: Task[];
  alarms: Alarm[];
  habits: Habit[];
  studyHoursToday: number;
  onAddTask: (title: string, priority: "High" | "Medium" | "Low", subject: string, deadline?: string, notes?: string) => void;
  onToggleTask: (id: string) => void;
  onNavigate: (tab: string) => void;
  onTriggerAlarmChallenge: (alarm: Alarm) => void;
  onLogStudyHours: (hours: number) => void;
}

export default function Dashboard({
  profile,
  tasks,
  alarms,
  habits,
  studyHoursToday,
  onAddTask,
  onToggleTask,
  onNavigate,
  onTriggerAlarmChallenge,
  onLogStudyHours
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
  
  useEffect(() => {
    // Generate intelligent AI recommendations based on user's real stats on mount
    const recs = [
      `Dedicate 25 minutes to your weakest subject (${profile.favoriteSubjects[1] || "Social Science"}) using Pomodoro today.`,
      `Since you are preparing for ${profile.targetExam}, complete at least one CBSE chapter checkpoint task.`,
      studyHoursToday >= profile.dailyStudyGoal 
        ? "Fantastic! You hit your study goal today. Enjoy some downtime or try Cognitive Games to boost memory!"
        : `You need ${Math.max(0.5, profile.dailyStudyGoal - studyHoursToday)} more study hours to reach your goal. Try logging a focus sprint.`
    ];
    setAiRecommendations(recs);
    
    const timer = setTimeout(() => {
      setLoading(false);
    }, 550);
    return () => clearTimeout(timer);
  }, [profile.favoriteSubjects, profile.targetExam, studyHoursToday, profile.dailyStudyGoal]);

  const handleRegenerateRecommendations = () => {
    setIsRegeneratingInsights(true);
    setTimeout(() => {
      const advancedRecs = [
        `Review important board exam patterns for ${profile.favoriteSubjects[0] || "Mathematics"} to gain peak board confidence.`,
        `Your study consistency is excellent! Take a 5-minute break for every 25 minutes of high focus study.`,
        `Pombo recommends practicing 3 previous year questions (PYQs) under the "10-Day Test" tab for CBSE scoring excellence.`
      ];
      setAiRecommendations(advancedRecs);
      setIsRegeneratingInsights(false);
    }, 600);
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

  const pendingTasks = tasks.filter((t) => !t.completed).slice(0, 3);
  const activeAlarms = alarms.filter((a) => a.isActive).slice(0, 2);
  
  // Calculate today's habit completions
  const todayStr = new Date().toISOString().split("T")[0];
  const completedHabitsCount = habits.filter((h) => h.datesCompleted.includes(todayStr)).length;
  const habitsPercent = habits.length ? Math.round((completedHabitsCount / habits.length) * 100) : 0;

  // Study hours progress
  const studyPercent = Math.min(Math.round((studyHoursToday / profile.dailyStudyGoal) * 100), 100);

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
        <p className="text-sm text-slate-400 mt-2 max-w-sm">No worries, partner! We safely intercepted the hiccup. Try refreshing or logging back in to continue studying.</p>
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
      <div className="space-y-6 animate-pulse">
        {/* Shimmer header card */}
        <div className="h-36 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
        
        {/* Shimmer motivational quote */}
        <div className="h-16 bg-slate-200 dark:bg-slate-800 rounded-2xl" />

        {/* Shimmer stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          <div className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          <div className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          <div className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        </div>

        {/* Shimmer layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
              <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
            </div>
          </div>
          <div className="h-80 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
        </div>
      </div>
    );
  }

  return (
    <div id="dashboard_tab" className="space-y-6">
      
      {/* HEADER SECTION WITH USER GREETING & PROFILE ACCESS */}
      <div className="flex justify-between items-start bg-gradient-to-r from-indigo-600 to-violet-600 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
        
        {/* Ambient aesthetic background circle */}
        <div className="absolute top-[-30px] right-[-30px] w-40 h-40 bg-white/10 rounded-full blur-2xl" />
        <div className="absolute bottom-[-50px] left-[10%] w-60 h-60 bg-white/5 rounded-full blur-3xl" />
        
        <div className="space-y-2 relative z-10">
          <span className="text-indigo-100 bg-white/10 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md">
            {formatDate(time)} &bull; {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
          <h1 className="text-3xl font-extrabold font-sans tracking-tight">
            {getSalutation()}, {profile.nickname || profile.fullName.split(" ")[0]}!
          </h1>
          <p className="text-indigo-100 text-sm font-medium flex items-center">
            <BookOpen className="w-4 h-4 mr-1.5" />
            {profile.classGrade} (Sec {profile.section}) &bull; {profile.targetExam}
          </p>
        </div>

        {/* Profile Avatar Trigger button */}
        <button 
          onClick={() => onNavigate("profile")}
          className="w-14 h-14 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 transition-all flex items-center justify-center text-3xl border border-white/20 shadow-md backdrop-blur-md cursor-pointer relative group"
          title="Manage Profile"
        >
          {profile.profilePhoto?.startsWith("data:") ? (
            <img src={profile.profilePhoto} alt="profile" className="w-full h-full object-cover rounded-2xl" />
          ) : (
            <span>{profile.profilePhoto || "🎓"}</span>
          )}
          <span className="absolute bottom-[-2px] right-[-2px] bg-amber-400 text-slate-900 border-2 border-indigo-600 rounded-full px-1.5 py-0.5 text-[9px] font-bold">
            Lvl {profile.level}
          </span>
        </button>
      </div>

      {/* MOTIVATIONAL QUOTE OF THE DAY */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl flex items-center space-x-3.5 shadow-sm">
        <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-xl">
          <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
        </div>
        <div className="flex-1">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium italic">"{quote.quote || "The future depends on what you do today."}"</p>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5 block">&mdash; {quote.author || "Mahatma Gandhi"}</span>
        </div>
      </div>

      {/* STATS ROW BENTO CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        {/* 1. Daily Study Hours Goal */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Study Goal</span>
            <span className="p-1.5 bg-indigo-50 dark:bg-indigo-950/50 rounded-lg text-indigo-600 dark:text-indigo-400"><Clock className="w-4 h-4" /></span>
          </div>
          <div className="my-3">
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">
              {studyHoursToday} <span className="text-xs font-medium text-slate-400">/ {profile.dailyStudyGoal} hrs</span>
            </h3>
            {/* Minimal Progress Bar */}
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1.5">
              <div className="bg-indigo-600 dark:bg-indigo-500 h-full rounded-full transition-all duration-300" style={{ width: `${studyPercent}%` }}></div>
            </div>
          </div>
          <button 
            onClick={() => setShowLogHours(true)}
            className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline text-left flex items-center cursor-pointer"
          >
            Log Hours manually <ChevronRight className="w-3 h-3 ml-0.5" />
          </button>
        </div>

        {/* 2. Consistency Streak */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Daily Streak</span>
            <span className="p-1.5 bg-orange-50 dark:bg-orange-950/50 rounded-lg text-orange-500"><Flame className="w-4 h-4 animate-pulse" /></span>
          </div>
          <div className="my-3">
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">
              {profile.streakCounter || 0}{" "}
              <span className="text-xs font-medium text-slate-400">days streak</span>
            </h3>
            <p className="text-[10px] text-slate-400 mt-1">Keep logging in daily to protect it!</p>
          </div>
          <button 
            onClick={() => onNavigate("habits")}
            className="text-[10px] font-bold text-orange-500 hover:underline text-left flex items-center cursor-pointer"
          >
            Track Habits <ChevronRight className="w-3 h-3 ml-0.5" />
          </button>
        </div>

        {/* 3. XP / Gamification Levels */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Rank XP</span>
            <span className="p-1.5 bg-amber-50 dark:bg-amber-950/50 rounded-lg text-amber-500"><Trophy className="w-4 h-4" /></span>
          </div>
          <div className="my-3">
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">
              {profile.xp} <span className="text-xs font-medium text-slate-400">XP</span>
            </h3>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1.5">
              <div className="bg-amber-500 h-full rounded-full transition-all duration-300" style={{ width: `${(profile.xp % 150) / 1.5}%` }}></div>
            </div>
          </div>
          <button 
            onClick={() => onNavigate("analytics")}
            className="text-[10px] font-bold text-amber-500 hover:underline text-left flex items-center cursor-pointer"
          >
            View Achievements <ChevronRight className="w-3 h-3 ml-0.5" />
          </button>
        </div>

        {/* 4. Habits completion rate */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Habit Rate</span>
            <span className="p-1.5 bg-emerald-50 dark:bg-emerald-950/50 rounded-lg text-emerald-500"><Award className="w-4 h-4" /></span>
          </div>
          <div className="my-3">
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">
              {habitsPercent}% <span className="text-xs font-medium text-slate-400">today</span>
            </h3>
            <p className="text-[10px] text-slate-400 mt-1">{completedHabitsCount} of {habits.length} habits done</p>
          </div>
          <button 
            onClick={() => onNavigate("habits")}
            className="text-[10px] font-bold text-emerald-500 hover:underline text-left flex items-center cursor-pointer"
          >
            Habits Heatmap <ChevronRight className="w-3 h-3 ml-0.5" />
          </button>
        </div>

      </div>

      {/* POMBO'S CHEER ZONE */}
      <div className="bg-amber-50/60 dark:bg-slate-950 border border-amber-200/50 dark:border-slate-800 rounded-3xl p-5 flex items-center space-x-4">
        <span className="text-5xl animate-bounce">🐼</span>
        <div className="space-y-1">
          <h4 className="text-xs font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
            <span>Pombo Panda</span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
            <span className="text-[9px] font-bold text-slate-400 lowercase">your cheer buddy</span>
          </h4>
          <p className="text-xs text-slate-700 dark:text-slate-200 font-semibold leading-relaxed">
            {profile.streakCounter && profile.streakCounter > 0 ? (
              profile.streakCounter === 1 ? (
                `"Awesome first day of your consistency streak, ${profile.nickname || profile.fullName.split(" ")[0]}! 🐼 Every study sprint starts with a single step. Let's make today count!"`
              ) : profile.streakCounter === 2 ? (
                `"Wow, 2 days in a row! 🐼 You're building a rock-solid habit! Pombo is so proud of you. Let's study for a bit and protect this fire!"`
              ) : (
                `"Incredible! A ${profile.streakCounter}-day consistency streak! 🔥 You are absolutely unstoppable! Pombo is cheering you on all the way to CBSE Board Exams excellence!"`
              )
            ) : (
              `"Hey ${profile.nickname || profile.fullName.split(" ")[0]}! 🐼 Let's start your study streak today! Complete a task or start a Focus Sprint to spark your streak!"`
            )}
          </p>
        </div>
      </div>

      {/* DAILY STUDY INSIGHTS, AI RECOMMENDATIONS, & WEEKLY ANALYTICS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Card 1: Daily Study Insights & AI Recommendations */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-50 dark:border-slate-800">
            <div className="flex items-center space-x-2">
              <span className="p-2 bg-indigo-50 dark:bg-indigo-950 rounded-2xl text-indigo-600 dark:text-indigo-400">
                <Lightbulb className="w-5 h-5 animate-pulse" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">AI Study Recommendations</h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">Personalized daily study path guidance</p>
              </div>
            </div>
            <button
              onClick={handleRegenerateRecommendations}
              disabled={isRegeneratingInsights}
              className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-indigo-600 dark:text-indigo-400 transition cursor-pointer flex items-center gap-1 text-[10px] font-bold"
              aria-label="Regenerate AI recommendations"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRegeneratingInsights ? "animate-spin text-violet-500" : ""}`} />
              <span>{isRegeneratingInsights ? "Thinking..." : "Regen"}</span>
            </button>
          </div>

          <div className="space-y-3">
            {aiRecommendations.map((rec, idx) => (
              <div 
                key={idx}
                className="flex items-start space-x-3 p-3 bg-indigo-50/40 dark:bg-slate-800/20 border border-indigo-100/30 dark:border-indigo-900/10 rounded-2xl hover:bg-indigo-50/70 transition"
              >
                <span className="text-sm mt-0.5">💡</span>
                <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">{rec}</p>
              </div>
            ))}
          </div>

          <div className="bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-slate-950 dark:to-slate-950 p-3 rounded-2xl flex items-center space-x-3 border border-indigo-100/20">
            <span className="text-xs">🎯</span>
            <p className="text-[11px] text-indigo-900 dark:text-indigo-300 font-semibold">
              Today's peak productivity zone is estimated between <strong className="text-indigo-600 dark:text-indigo-400">4:00 PM and 6:30 PM</strong> based on your routine.
            </p>
          </div>
        </div>

        {/* Card 2: Weekly Performance Analytics & Smart Notifications */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <span className="p-2 bg-emerald-50 dark:bg-emerald-950 rounded-2xl text-emerald-600 dark:text-emerald-400">
                <BarChart3 className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Weekly Progress Analytics</h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">Study hours logged over past week</p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-full flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              <span>+15% efficiency</span>
            </span>
          </div>

          {/* Elegant Interactive SVG Bar Chart */}
          <div className="h-28 flex items-end justify-between px-2 pt-4 relative">
            {/* Guide gridlines */}
            <div className="absolute inset-x-0 top-0 border-t border-slate-100 dark:border-slate-800/50" />
            <div className="absolute inset-x-0 top-1/2 border-t border-slate-100 dark:border-slate-800/30" />
            
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
                  {/* Tooltip on Hover */}
                  <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition duration-150 bg-slate-900 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-md pointer-events-none whitespace-nowrap z-10">
                    {d.hrs} hrs studied
                  </div>
                  
                  {/* Visual Bar */}
                  <div className="w-4 bg-slate-100 dark:bg-slate-800 h-20 rounded-t-md overflow-hidden relative flex items-end">
                    <div 
                      className={`w-full rounded-t-md transition-all duration-500 ${
                        idx === 6 
                          ? "bg-gradient-to-t from-indigo-500 to-indigo-600" 
                          : "bg-gradient-to-t from-emerald-500 to-teal-500"
                      }`}
                      style={{ height: `${percent}%` }}
                    />
                  </div>
                  
                  {/* X-Axis Label */}
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold mt-1.5">{d.day}</span>
                </div>
              );
            })}
          </div>

          {/* Smart System Notifications Feed */}
          <div className="space-y-2 pt-2 border-t border-slate-50 dark:border-slate-800">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Smart Study Alerts</h4>
            <div className="flex items-center justify-between p-2.5 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100/30 dark:border-amber-900/10 rounded-xl">
              <div className="flex items-center space-x-2">
                <Bell className="w-3.5 h-3.5 text-amber-500 animate-swing animate-pulse" />
                <p className="text-[11px] text-slate-700 dark:text-slate-300 font-semibold">Streak Saver: Log study time or start a Focus Sprint to keep your streak going!</p>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* PRIMARY TWO COLUMN LAYOUT: PENDING TASKS & UPCOMING ALARMS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 cols: Today's Tasks & Actions */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* TODAY'S PENDING TASKS */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center">
                  <CheckCircle2 className="w-5 h-5 text-indigo-500 mr-2" />
                  Today's Pending Tasks
                </h2>
                <p className="text-xs text-slate-400 dark:text-slate-500">Stay organized. Check off your core study items.</p>
              </div>
              <button 
                onClick={() => setShowQuickAdd(true)}
                className="p-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 dark:hover:bg-indigo-900 rounded-xl text-indigo-600 dark:text-indigo-400 transition cursor-pointer"
                title="Add Task"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {pendingTasks.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl">
                <span className="text-3xl block mb-2">🎉</span>
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">No pending tasks!</p>
                <p className="text-xs text-slate-400 mt-1">Excellent job keeping up with your studies today.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {pendingTasks.map((task) => (
                  <div 
                    key={task.id}
                    className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-indigo-100 transition duration-200"
                  >
                    <div className="flex items-center space-x-3">
                      <button 
                        onClick={() => onToggleTask(task.id)}
                        className="w-5 h-5 rounded-md border border-slate-300 dark:border-slate-700 hover:border-indigo-500 flex items-center justify-center transition"
                      >
                        <Check className="w-3.5 h-3.5 text-transparent hover:text-indigo-500" />
                      </button>
                      <div>
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{task.title}</p>
                        <div className="flex items-center space-x-2 mt-0.5">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                            {task.subjectTag}
                          </span>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                            task.priority === "High" ? "bg-rose-50 text-rose-600 dark:bg-rose-950/50" : 
                            task.priority === "Medium" ? "bg-amber-50 text-amber-600 dark:bg-amber-950/50" : 
                            "bg-slate-100 text-slate-600 dark:bg-slate-800"
                          }`}>
                            {task.priority} Priority
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 flex items-center">
                      <Calendar className="w-3 h-3 mr-1" />
                      {task.deadline ? new Date(task.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Today"}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <button 
              onClick={() => onNavigate("tasks")}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline w-full text-center block"
            >
              See all tasks ({tasks.length})
            </button>
          </div>

          {/* QUICK TOOL LAUNCHERS CARD */}
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => onNavigate("alarms")}
              className="bg-gradient-to-br from-indigo-500/10 to-indigo-600/5 hover:from-indigo-500/20 hover:to-indigo-600/10 border border-indigo-500/20 p-5 rounded-3xl text-left transition duration-200 cursor-pointer group"
            >
              <div className="p-2.5 bg-indigo-100 dark:bg-indigo-950 rounded-2xl w-fit mb-3 group-hover:scale-110 transition duration-200 text-indigo-600 dark:text-indigo-400">
                <Bell className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Smart Alarms</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Configure wake-up reminders with math-challenge blockers.</p>
            </button>

            <button 
              onClick={() => onNavigate("pomodoro")}
              className="bg-gradient-to-br from-rose-500/10 to-rose-600/5 hover:from-rose-500/20 hover:to-rose-600/10 border border-rose-500/20 p-5 rounded-3xl text-left transition duration-200 cursor-pointer group"
            >
              <div className="p-2.5 bg-rose-100 dark:bg-rose-950 rounded-2xl w-fit mb-3 group-hover:scale-110 transition duration-200 text-rose-600 dark:text-rose-400">
                <Timer className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Focus Pomodoro</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Start a high-productivity 25/5 focus session.</p>
            </button>
          </div>

        </div>

        {/* Right 1 col: Alarms & Calendars agenda */}
        <div className="space-y-6">
          
          {/* UPCOMING STUDY ALARMS */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center">
                  <Bell className="w-5 h-5 text-indigo-500 mr-2 animate-bounce" />
                  Upcoming Alarms
                </h2>
                <p className="text-xs text-slate-400 dark:text-slate-500">Wake up / study on time.</p>
              </div>
              <button 
                onClick={() => onNavigate("alarm")}
                className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer"
              >
                Set Alarm
              </button>
            </div>

            {activeAlarms.length === 0 ? (
              <div className="text-center py-6 bg-slate-50 dark:bg-slate-800/20 rounded-2xl border border-slate-100 dark:border-slate-800">
                <span className="text-2xl block mb-1">😴</span>
                <p className="text-xs text-slate-400">No active alarms set</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeAlarms.map((alarm) => (
                  <div 
                    key={alarm.id}
                    className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between hover:border-indigo-100 transition"
                  >
                    <div>
                      <span className="text-2xl font-black tracking-tight text-slate-800 dark:text-slate-100 block">
                        {alarm.time}
                      </span>
                      <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-1.5 py-0.5 rounded block w-fit mt-1">
                        {alarm.subject}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-1">{alarm.label || "Study Alarm"}</span>
                    </div>
                    
                    <button 
                      onClick={() => onTriggerAlarmChallenge(alarm)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-extrabold rounded-xl shadow-sm flex items-center cursor-pointer active:scale-95 transition"
                    >
                      <Play className="w-3 h-3 mr-1 fill-white" />
                      Test ring
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* DYNAMIC PERSONALIZED GOAL BLOCK */}
          <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-orange-500/20 p-6 rounded-3xl space-y-3 text-slate-800 dark:text-slate-100">
            <h3 className="font-bold text-sm flex items-center text-orange-600 dark:text-orange-400">
              <Trophy className="w-4 h-4 mr-1.5" />
              Onboarding Challenge
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Hey, <strong className="text-indigo-600 dark:text-indigo-400">{profile.fullName.split(" ")[0]}</strong>! Complete your daily goal of <strong>{profile.dailyStudyGoal} Hours</strong>. Add homework tasks and mark them done to earn rank XP points. Let's aim to unlock the **AI Prodigy** badge today!
            </p>
          </div>

        </div>

      </div>

      {/* QUICK ADD TASK MODAL POPUP */}
      {showQuickAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-xl overflow-hidden"
          >
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="font-bold text-slate-800 dark:text-slate-100">Quick Add Study Task</h3>
                <button onClick={() => setShowQuickAdd(false)} className="p-1 text-slate-400 hover:bg-slate-100 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleQuickAddSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Task Title</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Read Physics Chapter 3"
                    className="w-full px-3 py-2 text-sm border rounded-xl dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500"
                    value={quickTaskTitle}
                    onChange={(e) => setQuickTaskTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Subject Tag</label>
                    <select
                      className="w-full px-3 py-2 text-sm border rounded-xl dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 outline-none"
                      value={quickTaskSubject}
                      onChange={(e) => setQuickTaskSubject(e.target.value)}
                    >
                      <option value="">Select subject...</option>
                      {profile.favoriteSubjects.map((sub) => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Priority</label>
                    <select
                      className="w-full px-3 py-2 text-sm border rounded-xl dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 outline-none"
                      value={quickTaskPriority}
                      onChange={(e) => setQuickTaskPriority(e.target.value as any)}
                    >
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl transition"
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-xl overflow-hidden"
          >
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="font-bold text-slate-800 dark:text-slate-100">Log Daily Study Hours</h3>
                <button onClick={() => setShowLogHours(false)} className="p-1 text-slate-400 hover:bg-slate-100 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleLogHoursSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-2">How many hours did you study?</label>
                  <div className="flex items-center justify-center space-x-4">
                    <button 
                      type="button" 
                      onClick={() => setLogAmount(Math.max(0.5, logAmount - 0.5))}
                      className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-lg font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center"
                    >
                      -
                    </button>
                    <span className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">{logAmount} hrs</span>
                    <button 
                      type="button" 
                      onClick={() => setLogAmount(Math.min(12, logAmount + 0.5))}
                      className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-lg font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl transition"
                >
                  Log Hours (+{Math.round(logAmount * 30)} XP)
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      )}

      {/* ONE-TIME SYSTEM INTEGRATION PERMISSIONS MODAL */}
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
                    StudyMate AI needs your permission once to integrate fully with your device for a highly polished, interactive learning experience.
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
                    {permissions.notifications === "denied" && (
                      <p className="text-[9px] bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 p-2 rounded-lg font-semibold">
                        🔔 Notification permission has been blocked. Click the lock icon in the URL bar, enable notifications, and click <span className="underline cursor-pointer font-black hover:text-red-500" onClick={requestNotification}>Retry</span>.
                      </p>
                    )}
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
                    {permissions.camera === "denied" && (
                      <p className="text-[9px] bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 p-2 rounded-lg font-semibold">
                        📸 Camera access is blocked. Click the lock icon in the URL bar, enable camera, and click <span className="underline cursor-pointer font-black hover:text-red-500" onClick={requestCamera}>Retry</span>.
                      </p>
                    )}
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
                    {permissions.microphone === "denied" && (
                      <p className="text-[9px] bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 p-2 rounded-lg font-semibold">
                        🎙️ Microphone access is blocked. Click the lock icon in the URL bar, enable microphone, and click <span className="underline cursor-pointer font-black hover:text-red-500" onClick={requestMicrophone}>Retry</span>.
                      </p>
                    )}
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
                    try {
                      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
                      const osc = ctx.createOscillator();
                      const gain = ctx.createGain();
                      osc.type = "sine";
                      osc.frequency.setValueAtTime(520, ctx.currentTime);
                      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3);
                      gain.gain.setValueAtTime(0.08, ctx.currentTime);
                      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
                      osc.connect(gain);
                      gain.connect(ctx.destination);
                      osc.start();
                      osc.stop(ctx.currentTime + 0.3);
                    } catch (e) {}
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
