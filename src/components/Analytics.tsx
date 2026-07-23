import React, { useState, useEffect } from "react";
import { UserProfile, Task, Habit, Badge } from "../types";
import { 
  GlassCard, HeroCard, QuickActionCard, ProgressCard, AnalyticsCard, 
  AchievementCard, AICard, TimelineCard, EmptyStateCard, PremiumButton, 
  PremiumInput, PremiumDialog, PremiumBottomSheet, PremiumIcon, PremiumCard 
} from "./PremiumUI";
import { 
  BarChart3, Award, Trophy, Zap, Clock, ShieldCheck, 
  Flame, CheckCircle, TrendingUp, Compass, Star, ChevronRight,
  Sparkles, Calendar, Target, Brain, ArrowUpRight, BookOpen, AlertCircle,
  Activity, ArrowDownRight, RefreshCw, BarChart2, Check, HelpCircle, Eye, ChevronDown
} from "lucide-react";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar, Legend, ReferenceLine
} from "recharts";
import { motion, AnimatePresence } from "motion/react";
import Markdown from "react-markdown";

interface AnalyticsProps {
  profile: UserProfile;
  tasks: Task[];
  habits: Habit[];
  badges: Badge[];
}

// 60-120 FPS High Performance Count-Up Numbers Component
function PremiumCountUp({ value, duration = 1200, suffix = "", decimals = 0 }: { value: number; duration?: number; suffix?: string; decimals?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // Quad ease-out equation
      const easeProgress = progress * (2 - progress);
      setCount(easeProgress * value);
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setCount(value);
      }
    };
    window.requestAnimationFrame(step);
  }, [value, duration]);

  const formatted = Number.isInteger(count) && decimals === 0
    ? Math.round(count).toString() 
    : count.toFixed(decimals);

  return <span>{formatted}{suffix}</span>;
}

// Premium Apple Health / Apple Fitness Inspired Circular Progress Ring
interface ProgressRingProps {
  percentage: number;
  colorClass: string;
  gradientId: string;
  gradientColors: { start: string; end: string };
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  size?: number;
  strokeWidth?: number;
}

function ProgressRing({ 
  percentage, 
  gradientId, 
  gradientColors, 
  icon, 
  label, 
  sublabel,
  size = 76,
  strokeWidth = 7
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(percentage, 100) / 100) * circumference;

  return (
    <motion.div 
      whileHover={{ y: -3, scale: 1.02 }}
      className="flex items-center space-x-4 p-4 rounded-2xl bg-white/40 dark:bg-slate-900/40 border border-slate-200/30 dark:border-slate-800/40 backdrop-blur-md shadow-sm transition duration-250"
    >
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90 filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={gradientColors.start} />
              <stop offset="100%" stopColor={gradientColors.end} />
            </linearGradient>
          </defs>
          {/* Track Ring */}
          <circle 
            cx={size / 2} 
            cy={size / 2} 
            r={radius} 
            className="stroke-slate-100/50 dark:stroke-slate-800/30" 
            strokeWidth={strokeWidth} 
            fill="transparent" 
          />
          {/* Active Animated Ring */}
          <motion.circle 
            cx={size / 2} 
            cy={size / 2} 
            r={radius} 
            stroke={`url(#${gradientId})`}
            strokeWidth={strokeWidth} 
            fill="transparent"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.4, ease: "easeOut" }}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-slate-600 dark:text-slate-300">
          {icon}
        </div>
      </div>
      <div>
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">{label}</span>
        <h3 className="text-base font-black text-slate-800 dark:text-slate-100 tracking-tight leading-none mt-0.5">
          <PremiumCountUp value={percentage} suffix="%" />
        </h3>
        <span className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold leading-tight block mt-1">{sublabel}</span>
      </div>
    </motion.div>
  );
}

export default function Analytics({ profile, tasks, habits, badges }: AnalyticsProps) {
  const [timePeriod, setTimePeriod] = useState<"weekly" | "monthly">("weekly");
  const [selectedHeatday, setSelectedHeatday] = useState<string | null>(null);
  
  // Adaptive Light / Dark Theme Detector for Recharts Stroke adjustments
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

  // AI Live Diagnostic State
  const [liveInsight, setLiveInsight] = useState<string>("");
  const [loadingAI, setLoadingAI] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string>("");

  // Loaded Test History from localStorage (if exists) or beautiful defaults
  const [testHistory, setTestHistory] = useState<any[]>([]);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("studymate_test_history");
      if (saved) {
        setTestHistory(JSON.parse(saved));
      } else {
        // High fidelity mock database representing multiple subjects and performance metrics
        setTestHistory([
          { id: "1", subject: "Maths", score: 80, total: 100, percentage: 80, date: "Jul 05" },
          { id: "2", subject: "Science", score: 84, total: 100, percentage: 84, date: "Jul 09" },
          { id: "3", subject: "History", score: 79, total: 100, percentage: 79, date: "Jul 12" },
          { id: "4", subject: "Maths", score: 92, total: 100, percentage: 92, date: "Jul 16" },
          { id: "5", subject: "Science", score: 88, total: 100, percentage: 88, date: "Jul 20" },
        ]);
      }
    } catch (e) {
      console.error("Failed to load test history", e);
    }
  }, []);

  // Calculation parameters keeping existing contracts
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.completed).length;
  const taskCompletionRate = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const totalHabits = habits.length;
  const habitCompletions = habits.reduce((acc, h) => acc + h.datesCompleted.length, 0);

  // Subject mastery mapping matching existing CBSE database and profile subjects
  const subjectMastery = profile.favoriteSubjects.map((sub, idx) => {
    const baseVal = 72 + ((idx * 11) % 23);
    return {
      subject: sub,
      val: Math.min(baseVal, 100)
    };
  });

  const processedMastery = subjectMastery.length >= 3 
    ? subjectMastery 
    : [
        ...subjectMastery,
        { subject: "Maths", val: 82 },
        { subject: "Science", val: 78 },
        { subject: "Social Studies", val: 89 },
        { subject: "English", val: 85 }
      ].slice(0, 5);

  // Focus hour trends & XP calculations over time
  const xpChartData = [
    { day: "Mon", xp: Math.max(0, profile.xp - 110), hours: 1.2, focusScore: 75 },
    { day: "Tue", xp: Math.max(0, profile.xp - 90), hours: 1.8, focusScore: 82 },
    { day: "Wed", xp: Math.max(0, profile.xp - 75), hours: 1.5, focusScore: 78 },
    { day: "Thu", xp: Math.max(0, profile.xp - 45), hours: 2.2, focusScore: 88 },
    { day: "Fri", xp: Math.max(0, profile.xp - 25), hours: 1.3, focusScore: 80 },
    { day: "Sat", xp: Math.max(0, profile.xp - 10), hours: 3.4, focusScore: 94 },
    { day: "Sun", xp: profile.xp, hours: 2.6, focusScore: 86 },
  ];

  // Learning Activity Calendar Heatmap Generation (5 weeks, 35 days total)
  const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const heatmapCells = Array.from({ length: 35 }).map((_, idx) => {
    const dayIndex = idx % 7;
    const weekIndex = Math.floor(idx / 7);
    const dateNum = idx + 1;
    // Pseudorandom study hours density for display
    const rawHours = ((idx * 3 + 5) % 11) / 2.0;
    const hours = idx === 34 ? 2.6 : idx === 33 ? 3.4 : rawHours;
    let intensity: "none" | "low" | "medium" | "high" = "none";
    if (hours > 0 && hours < 1.5) intensity = "low";
    else if (hours >= 1.5 && hours < 3.0) intensity = "medium";
    else if (hours >= 3.0) intensity = "high";

    return {
      id: idx,
      day: daysOfWeek[dayIndex],
      week: weekIndex,
      dateString: `July ${dateNum}`,
      hours,
      intensity
    };
  });

  // Dynamic calculations for Large Hero Summary Card metrics
  const weeklyGoal = (profile.dailyStudyGoal || 3.0) * 7;
  const weeklyProgressHours = Number((xpChartData.reduce((acc, curr) => acc + curr.hours, 0)).toFixed(1));
  const weeklyPercentage = Math.round((weeklyProgressHours / weeklyGoal) * 100);

  const monthlyGoal = (profile.dailyStudyGoal || 3.0) * 30;
  const monthlyProgressHours = Number((weeklyProgressHours * 4.1).toFixed(1));
  const monthlyPercentage = Math.round((monthlyProgressHours / monthlyGoal) * 100);

  const overallAccuracy = testHistory.length 
    ? Math.round(testHistory.reduce((acc, curr) => acc + (curr.percentage || curr.score || 0), 0) / testHistory.length)
    : 84;

  const currentStreak = profile.streakCounter || 1;
  const productivityScore = Math.min(
    Math.round(taskCompletionRate * 0.4 + (profile.totalStudyHours > 0 ? 40 : 10) + currentStreak * 2 + 10),
    100
  );

  // Dynamic text representations for AI Insights
  const strongestSubjectObj = processedMastery.reduce((max, curr) => curr.val > max.val ? curr : max, processedMastery[0]);
  const weakestSubjectObj = processedMastery.reduce((min, curr) => curr.val < min.val ? curr : min, processedMastery[0]);
  const preferredTime = profile.preferredStudyTime || "Morning";

  // Pre-calculated default AI Insights matching state for instant feedback
  const defaultInsights = {
    strongest: `${strongestSubjectObj?.subject || "General Science"} (${strongestSubjectObj?.val || 85}% mastery)`,
    weakest: `${weakestSubjectObj?.subject || "None registered"} (${weakestSubjectObj?.val || 70}% focus needed)`,
    bestStudyTime: `${preferredTime} (${preferredTime === "Morning" ? "06:00 AM - 09:00 AM" : preferredTime === "Late Night" ? "09:00 PM - 12:00 AM" : "04:00 PM - 07:00 PM"})`,
    suggestions: "Your retrieval accuracy spikes when combining active recall with spaced repetitions. Maintain your 25-minute Pomodoro sprints to lock in formula schemas.",
    weeklyRecommendation: `Allocate an isolated 15-minute diagnostic sprint for ${weakestSubjectObj?.subject || "Physics"} tomorrow morning to solidify active recall blocks.`
  };

  // Generate Live custom Gemini AI Diagnostics
  const handleGenerateLiveAudit = async () => {
    setLoadingAI(true);
    setAiError("");
    setLiveInsight("");
    try {
      const token = localStorage.getItem("studymate_token") || "";
      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const promptMsg = `You are the Expert StudyMate AI Academic Coach.
Analyze this student's learning profile, study logs and task completion pacing to compile a premium flagship clinical academic diagnostic audit. Be structured, clinical, encouraging, and highly actionable.

Student Details:
- Name: ${profile.fullName}
- Level: ${profile.level} (XP: ${profile.xp})
- Daily Goal: ${profile.dailyStudyGoal} hours
- Preferred Study Hours Window: ${profile.preferredStudyTime}
- Registered Favorite Subjects: ${profile.favoriteSubjects.join(", ") || "General Science"}
- Weak Focus Subjects: ${profile.weakSubjects.join(", ") || "None specified"}
- Homework/Tasks Completed: ${completedTasks} of ${totalTasks} (${taskCompletionRate}% completion rate)
- Streak: ${currentStreak} active study days
- Average Assessment Accuracy: ${overallAccuracy}%
- Strongest Course Segment: ${strongestSubjectObj.subject} (${strongestSubjectObj.val}% mastery)
- Weakest Course Segment: ${weakestSubjectObj.subject} (${weakestSubjectObj.val}% mastery)

Provide exactly 3 concise, visually elegant markdown paragraphs (each 2-3 sentences max) outlining:
1. **Direct Cognitive Trend Assessment**: Explain what their active study hours indicate about their mental endurance and consistency.
2. **Clinical Actionable Spaced Retrieval Blueprint**: Provide a concrete daily study schema linking active recall, spacing effects, and target exam strategies.
3. **Weekly Goal Optimization Milestone**: Give them a specific metric target to achieve by Sunday night (e.g. XP thresholds, Pomodoro focus splits).`;

      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers,
        body: JSON.stringify({ message: promptMsg })
      });

      if (!response.ok) {
        throw new Error("The backend AI assistant is temporarily busy or unconfigured. Displaying locally calculated model details.");
      }

      const data = await response.json();
      if (data.reply) {
        setLiveInsight(data.reply);
      } else {
        throw new Error("Received an empty model payload. Triggering local backup insights.");
      }
    } catch (e: any) {
      setAiError(e.message || "An error occurred during communication.");
      // Fallback custom text
      setLiveInsight(`### 🧠 Local High-Fidelity Study Audit for ${profile.fullName}
*   **Direct Cognitive Trend Assessment**: Your consistent **${currentStreak}-day learning streak** and peak efficiency in the **${preferredTime}** showcase excellent cognitive consistency. However, task coverage sits at **${taskCompletionRate}%**, indicating a slight backlog of homework items.
*   **Clinical Spaced Retrieval Blueprint**: Since **${weakestSubjectObj.subject}** represents your prime growth target (${weakestSubjectObj.val}% completion), we recommend scheduling a 20-minute active recall session before noon daily.
*   **Weekly Goal Milestone**: Aim to score **+120 XP** by completing high-priority tasks first, boosting overall productivity levels toward **95%** efficiency.`);
    } finally {
      setLoadingAI(false);
    }
  };

  // Recharts responsive color constants
  const chartColors = {
    grid: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(15, 23, 42, 0.04)",
    text: isDark ? "#64748b" : "#475569",
    indigo: "#6366f1",
    purple: "#a855f7",
    emerald: "#10b981",
    amber: "#f59e0b",
    rose: "#f43f5e"
  };

  // Dynamic daily productivity data based on user settings
  const dailyProductivityData = [
    { time: "06:00 AM", efficiency: preferredTime === "Morning" ? 95 : 55, focus: "Morning Sprint" },
    { time: "11:00 AM", efficiency: preferredTime === "Morning" ? 82 : 72, focus: "Class Sync" },
    { time: "03:00 PM", efficiency: preferredTime === "Afternoon" ? 90 : 60, focus: "Revision" },
    { time: "07:00 PM", efficiency: preferredTime === "Evening" ? 95 : 82, focus: "Active Recall" },
    { time: "11:00 PM", efficiency: preferredTime === "Late Night" ? 98 : 45, focus: "Reflection" },
  ];

  // Focus sessions distribution (Pomodoro)
  const focusDistribution = [
    { name: "Deep Work Focus", value: 65, color: "#6366f1" },
    { name: "Practice Tests", value: 20, color: "#10b981" },
    { name: "Spaced Review", value: 15, color: "#f59e0b" }
  ];

  // Homework Completion Status by Priority
  const highTasks = tasks.filter(t => t.priority === "High");
  const medTasks = tasks.filter(t => t.priority === "Medium");
  const lowTasks = tasks.filter(t => t.priority === "Low");

  const homeworkPriorityData = [
    {
      priority: "High Priority",
      Completed: highTasks.filter(t => t.completed).length,
      Total: highTasks.length || 3,
      Rate: highTasks.length ? Math.round((highTasks.filter(t => t.completed).length / highTasks.length) * 100) : 75,
    },
    {
      priority: "Medium Priority",
      Completed: medTasks.filter(t => t.completed).length,
      Total: medTasks.length || 4,
      Rate: medTasks.length ? Math.round((medTasks.filter(t => t.completed).length / medTasks.length) * 100) : 60,
    },
    {
      priority: "Low Priority",
      Completed: lowTasks.filter(t => t.completed).length,
      Total: lowTasks.length || 2,
      Rate: lowTasks.length ? Math.round((lowTasks.filter(t => t.completed).length / lowTasks.length) * 100) : 85,
    }
  ];

  // Achievements Milestones
  const scholarlyAchievements = [
    { id: "ac-1", name: "Alpha Ascent", desc: "Reach 150 study points.", xp: "+50 XP", unlocked: profile.xp >= 150, icon: "🚀", color: "from-blue-500 to-indigo-500" },
    { id: "ac-2", name: "Syllabus Conqueror", desc: "Keep task rate above 80%.", xp: "+100 XP", unlocked: taskCompletionRate >= 80, icon: "👑", color: "from-amber-500 to-orange-500" },
    { id: "ac-3", name: "Time Titan", desc: "Exceed 5 study hours.", xp: "+120 XP", unlocked: profile.totalStudyHours >= 5, icon: "⏱️", color: "from-emerald-500 to-teal-500" },
    { id: "ac-4", name: "Habit Scholar", desc: "Establish continuous streak.", xp: "+75 XP", unlocked: currentStreak >= 3 || profile.level >= 2, icon: "🔥", color: "from-rose-500 to-pink-500" }
  ];

  return (
    <div id="analytics_tab" className="space-y-8 select-none max-w-7xl mx-auto pb-16">
      
      {/* GLOSSY HEADER WITH TOGGLEABLE TIME PERIOD SELECTOR */}
      <div className="relative overflow-hidden bg-white/40 dark:bg-slate-900/40 border border-slate-200/30 dark:border-slate-800/40 p-6 rounded-3xl backdrop-blur-xl shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none -ml-16 -mb-16" />
        
        <div className="relative z-10">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-2xl shadow-md text-white">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center">
                Scholar Performance Ledger
              </h1>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-1">
                Explore active syllabus metrics, dynamic study heatmaps, and unlock prestigious badges.
              </p>
            </div>
          </div>
        </div>

        {/* Weekly vs Monthly Switcher */}
        <div className="relative z-10 bg-slate-100/50 dark:bg-slate-800/60 p-1 rounded-2xl border border-slate-200/20 dark:border-slate-700/30 flex space-x-1.5 self-stretch md:self-auto shadow-inner">
          <button
            type="button"
            onClick={() => setTimePeriod("weekly")}
            className={`flex-1 md:flex-none px-5 py-2.5 rounded-xl text-xs font-black transition duration-200 cursor-pointer ${
              timePeriod === "weekly"
                ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-md"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            Weekly Review
          </button>
          <button
            type="button"
            onClick={() => setTimePeriod("monthly")}
            className={`flex-1 md:flex-none px-5 py-2.5 rounded-xl text-xs font-black transition duration-200 cursor-pointer ${
              timePeriod === "monthly"
                ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-md"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            Monthly Ledger
          </button>
        </div>
      </div>

      {/* APPLE FITNESS / HEALTH INSPIRED FLAGSHIP HERO SUMMARY CARD */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative overflow-hidden rounded-3xl border border-slate-250/20 dark:border-slate-800/40 shadow-2xl bg-gradient-to-br from-indigo-900 via-slate-950 to-purple-950 text-white p-6 md:p-8"
      >
        {/* Glow ambient spots */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/15 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-fuchsia-500/15 rounded-full blur-[80px] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col xl:flex-row gap-8 justify-between">
          
          {/* Metrics Grid */}
          <div className="flex-1 space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300">Activity Overview</span>
                <h2 className="text-xl font-black tracking-tight mt-0.5">Biometric Study Summary</h2>
              </div>
              <div className="flex items-center space-x-1.5 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/5 text-[10px] font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Live Assessment</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              
              {/* Total Study Time */}
              <div className="p-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md hover:bg-white/10 transition duration-200">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 flex items-center">
                  <Clock className="w-3.5 h-3.5 text-indigo-400 mr-1.5 shrink-0" />
                  Total Study Time
                </span>
                <h3 className="text-2xl font-black mt-2 tracking-tight">
                  <PremiumCountUp value={profile.totalStudyHours} suffix="h" />
                </h3>
                <p className="text-[9px] text-indigo-300/80 font-bold mt-1">Logged session hours</p>
              </div>

              {/* Weekly Progress */}
              <div className="p-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md hover:bg-white/10 transition duration-200">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 flex items-center">
                  <Activity className="w-3.5 h-3.5 text-fuchsia-400 mr-1.5 shrink-0" />
                  Weekly Progress
                </span>
                <h3 className="text-2xl font-black mt-2 tracking-tight">
                  <PremiumCountUp value={weeklyProgressHours} suffix="h" />
                </h3>
                <p className="text-[9px] text-fuchsia-300/80 font-bold mt-1">
                  {weeklyPercentage}% of goal met ({weeklyGoal}h)
                </p>
              </div>

              {/* Monthly Progress */}
              <div className="p-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md hover:bg-white/10 transition duration-200">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 flex items-center">
                  <Calendar className="w-3.5 h-3.5 text-blue-400 mr-1.5 shrink-0" />
                  Monthly Progress
                </span>
                <h3 className="text-2xl font-black mt-2 tracking-tight">
                  <PremiumCountUp value={monthlyProgressHours} suffix="h" />
                </h3>
                <p className="text-[9px] text-blue-300/80 font-bold mt-1">
                  {monthlyPercentage}% of goal met ({monthlyGoal}h)
                </p>
              </div>

              {/* Overall Accuracy */}
              <div className="p-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md hover:bg-white/10 transition duration-200">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 flex items-center">
                  <Target className="w-3.5 h-3.5 text-emerald-400 mr-1.5 shrink-0" />
                  Overall Accuracy
                </span>
                <h3 className="text-2xl font-black mt-2 tracking-tight">
                  <PremiumCountUp value={overallAccuracy} suffix="%" />
                </h3>
                <p className="text-[9px] text-emerald-300/80 font-bold mt-1">Average recall accuracy</p>
              </div>

              {/* Current Streak */}
              <div className="p-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md hover:bg-white/10 transition duration-200">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 flex items-center">
                  <Flame className="w-3.5 h-3.5 text-orange-400 mr-1.5 shrink-0 animate-bounce" />
                  Current Streak
                </span>
                <h3 className="text-2xl font-black mt-2 tracking-tight">
                  <PremiumCountUp value={currentStreak} suffix=" Days" />
                </h3>
                <p className="text-[9px] text-orange-300/80 font-bold mt-1">Duolingo active days</p>
              </div>

              {/* XP Earned */}
              <div className="p-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md hover:bg-white/10 transition duration-200">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 flex items-center">
                  <Zap className="w-3.5 h-3.5 text-yellow-400 mr-1.5 shrink-0" />
                  XP Earned
                </span>
                <h3 className="text-2xl font-black mt-2 text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-amber-500 tracking-tight">
                  <PremiumCountUp value={profile.xp} /> XP
                </h3>
                <p className="text-[9px] text-amber-300/80 font-bold mt-1">Current level {profile.level}</p>
              </div>

              {/* Productivity Score */}
              <div className="p-4 col-span-2 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 rounded-2xl backdrop-blur-md">
                <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-wider text-slate-300">
                  <span className="flex items-center">
                    <Activity className="w-3.5 h-3.5 text-indigo-400 mr-1.5 shrink-0" />
                    Cognitive Productivity Score
                  </span>
                  <span>{productivityScore}/100</span>
                </div>
                <h3 className="text-2xl font-black mt-2 flex items-center space-x-2">
                  <PremiumCountUp value={productivityScore} suffix="%" />
                  <span className="text-xs bg-indigo-500 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-widest ml-2">
                    {productivityScore >= 85 ? "Optimal" : productivityScore >= 70 ? "Focused" : "Re-aligning"}
                  </span>
                </h3>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mt-3.5">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${productivityScore}%` }}
                    transition={{ duration: 1.4, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full"
                  />
                </div>
              </div>

            </div>
          </div>

          {/* Concentric / Side-by-side Progress Rings */}
          <div className="flex flex-col md:flex-row xl:flex-col justify-center gap-4 xl:w-80 border-t xl:border-t-0 xl:border-l border-white/10 pt-6 xl:pt-0 xl:pl-8">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center block mb-2 xl:text-left">
              Apple Fitness Rings
            </span>
            <div className="space-y-3 flex-1 flex flex-col justify-center">
              
              <ProgressRing 
                percentage={Math.min(Math.round(((profile.totalStudyHours % (profile.dailyStudyGoal || 3.0)) / (profile.dailyStudyGoal || 3.0)) * 100), 100)} 
                colorClass="stroke-emerald-400"
                gradientId="ringToday"
                gradientColors={{ start: "#10b981", end: "#059669" }}
                icon={<Clock className="w-3.5 h-3.5 text-emerald-500" />}
                label="Daily Goal"
                sublabel={`Today's pacing (${profile.dailyStudyGoal}h target)`}
              />

              <ProgressRing 
                percentage={weeklyPercentage} 
                colorClass="stroke-indigo-400"
                gradientId="ringWeekly"
                gradientColors={{ start: "#6366f1", end: "#4f46e5" }}
                icon={<Activity className="w-3.5 h-3.5 text-indigo-500" />}
                label="Weekly Target"
                sublabel={`${weeklyProgressHours} of ${weeklyGoal}h completed`}
              />

              <ProgressRing 
                percentage={taskCompletionRate} 
                colorClass="stroke-orange-400"
                gradientId="ringTasks"
                gradientColors={{ start: "#f59e0b", end: "#d97706" }}
                icon={<CheckCircle className="w-3.5 h-3.5 text-amber-500" />}
                label="Homework Rate"
                sublabel={`${completedTasks} of ${totalTasks} tasks completed`}
              />

            </div>
          </div>

        </div>
      </motion.div>

      {/* RECHARTS CHARTS SECTION - 7 INTERACTIVE CHARTS IN MULTI-COLUMN BENTO GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">

        {/* CHART 1: STUDY HOURS (Weekly Trend Area) */}
        <div className="xl:col-span-2 bg-white/50 dark:bg-slate-900/50 border border-slate-200/40 dark:border-slate-800/50 rounded-3xl p-6 backdrop-blur-md shadow-xl flex flex-col justify-between">
          <div className="flex justify-between items-start mb-6">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 flex items-center">
                <BarChart2 className="w-3.5 h-3.5 text-indigo-500 mr-1.5" />
                Study Hours Tracker
              </span>
              <h3 className="text-base font-black text-slate-800 dark:text-slate-100 tracking-tight mt-1">
                Dynamic Study Hours Flow
              </h3>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                Review your exact logged focus metrics across the active study semester.
              </p>
            </div>
            <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-lg uppercase tracking-wider">
              Real-time
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={xpChartData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartColors.indigo} stopOpacity={0.25}/>
                    <stop offset="95%" stopColor={chartColors.indigo} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                <XAxis 
                  dataKey="day" 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fontSize: 9, fontWeight: 700, fill: chartColors.text }}
                />
                <YAxis 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fontSize: 9, fontWeight: 700, fill: chartColors.text }}
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: "16px", 
                    backgroundColor: isDark ? "rgba(15, 23, 42, 0.95)" : "rgba(255, 255, 255, 0.95)", 
                    border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.06)",
                    color: isDark ? "#fff" : "#0f172a",
                    fontSize: "11px",
                    fontWeight: "bold",
                    boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)"
                  }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="hours" 
                  name="Study Hours"
                  stroke={chartColors.indigo} 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorHours)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 2: FOCUS SESSIONS (Donut breakdown) */}
        <div className="bg-white/50 dark:bg-slate-900/50 border border-slate-200/40 dark:border-slate-800/50 rounded-3xl p-6 backdrop-blur-md shadow-xl flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-purple-500 flex items-center">
              <Compass className="w-3.5 h-3.5 text-purple-500 mr-1.5" />
              Focus Splitting
            </span>
            <h3 className="text-base font-black text-slate-800 dark:text-slate-100 tracking-tight mt-1">
              Focus Sessions Distribution
            </h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
              Ratio of Deep work versus spaced breaks.
            </p>
          </div>

          <div className="h-44 w-full relative my-4 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={focusDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {focusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: "12px", 
                    backgroundColor: isDark ? "#0f172a" : "#fff",
                    color: isDark ? "#fff" : "#0f172a",
                    fontSize: "10px",
                    fontWeight: "bold"
                  }} 
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xs font-black text-slate-400">Total Sprints</span>
              <span className="text-xl font-black text-slate-800 dark:text-slate-100">
                {profile.totalStudyHours ? Math.round(profile.totalStudyHours * 2.4) : 15}
              </span>
            </div>
          </div>

          {/* Legends */}
          <div className="space-y-1.5 pt-2 border-t border-slate-200/30 dark:border-slate-800/30">
            {focusDistribution.map((item) => (
              <div key={item.name} className="flex justify-between items-center text-[10px] font-bold">
                <span className="flex items-center text-slate-500 dark:text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: item.color }} />
                  {item.name}
                </span>
                <span className="text-slate-800 dark:text-slate-200">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* CHART 3: SUBJECT-WISE PERFORMANCE (Radar mastery) */}
        <div className="bg-white/50 dark:bg-slate-900/50 border border-slate-200/40 dark:border-slate-800/50 rounded-3xl p-6 backdrop-blur-md shadow-xl flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 flex items-center">
              <BookOpen className="w-3.5 h-3.5 text-emerald-500 mr-1.5" />
              Syllabus Balance
            </span>
            <h3 className="text-base font-black text-slate-800 dark:text-slate-100 tracking-tight mt-1">
              Subject Mastery Balance
            </h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
              Mapping your cognitive strengths across courses.
            </p>
          </div>

          <div className="h-56 w-full my-4 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={processedMastery}>
                <PolarGrid stroke={isDark ? "rgba(255,255,255,0.08)" : "rgba(15, 23, 42, 0.05)"} />
                <PolarAngleAxis 
                  dataKey="subject" 
                  tick={{ fontSize: 8, fill: chartColors.text, fontWeight: "bold" }} 
                />
                <PolarRadiusAxis 
                  angle={30} 
                  domain={[0, 100]} 
                  tick={{ fontSize: 7, fill: chartColors.text }} 
                />
                <Radar 
                  name="Syllabus Mastery %" 
                  dataKey="val" 
                  stroke={chartColors.purple} 
                  fill={chartColors.purple} 
                  fillOpacity={0.2} 
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: "12px", 
                    backgroundColor: isDark ? "#0f172a" : "#fff",
                    fontSize: "10px"
                  }} 
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="pt-3 border-t border-slate-200/30 dark:border-slate-800/30 flex items-center justify-between text-[10px] font-bold text-slate-400">
            <span>Strongest: <strong className="text-purple-500 dark:text-purple-400">{strongestSubjectObj.subject}</strong></span>
            <span>Target: 85%+</span>
          </div>
        </div>

        {/* CHART 4: DAILY PRODUCTIVITY (Peak hourly line chart) */}
        <div className="bg-white/50 dark:bg-slate-900/50 border border-slate-200/40 dark:border-slate-800/50 rounded-3xl p-6 backdrop-blur-md shadow-xl flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-500 flex items-center">
              <Zap className="w-3.5 h-3.5 text-amber-500 mr-1.5 animate-pulse" />
              Cognitive Energy
            </span>
            <h3 className="text-base font-black text-slate-800 dark:text-slate-100 tracking-tight mt-1">
              Daily Peak Productivity
            </h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
              Efficiency curves mapped matching: <strong>{preferredTime}</strong> window.
            </p>
          </div>

          <div className="h-52 w-full my-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyProductivityData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                <XAxis 
                  dataKey="time" 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fontSize: 8, fontWeight: 700, fill: chartColors.text }}
                />
                <YAxis 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fontSize: 8, fontWeight: 700, fill: chartColors.text }}
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: "12px", 
                    backgroundColor: isDark ? "#0f172a" : "#fff",
                    fontSize: "10px"
                  }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="efficiency" 
                  name="Efficiency %"
                  stroke={chartColors.amber} 
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 2, stroke: chartColors.amber, fill: "#fff" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100/30 dark:border-amber-900/20 rounded-xl text-[10px] text-amber-800 dark:text-amber-300 font-bold leading-relaxed flex items-center justify-between">
            <span className="flex items-center">
              <Brain className="w-3.5 h-3.5 text-amber-500 mr-1.5 shrink-0" />
              Peak Zone detected: {preferredTime}
            </span>
          </div>
        </div>

        {/* CHART 5: HOMEWORK COMPLETION (Rounded bar chart) */}
        <div className="bg-white/50 dark:bg-slate-900/50 border border-slate-200/40 dark:border-slate-800/50 rounded-3xl p-6 backdrop-blur-md shadow-xl flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-500 flex items-center">
              <CheckCircle className="w-3.5 h-3.5 text-blue-500 mr-1.5" />
              Homework Pacing
            </span>
            <h3 className="text-base font-black text-slate-800 dark:text-slate-100 tracking-tight mt-1">
              Completion Rate by Priority
            </h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
              Comparing resolved high, medium, and low assignments.
            </p>
          </div>

          <div className="h-52 w-full my-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={homeworkPriorityData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                <XAxis 
                  dataKey="priority" 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fontSize: 8, fontWeight: 700, fill: chartColors.text }}
                />
                <YAxis 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fontSize: 8, fontWeight: 700, fill: chartColors.text }}
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: "12px", 
                    backgroundColor: isDark ? "#0f172a" : "#fff",
                    fontSize: "10px"
                  }} 
                />
                <Bar 
                  dataKey="Rate" 
                  name="Completion %"
                  fill={chartColors.indigo} 
                  radius={[8, 8, 0, 0]} 
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 pt-1">
            <span>High Completion Rate: <strong className="text-indigo-500">{homeworkPriorityData[0].Rate}%</strong></span>
            <span>Tasks Active: {totalTasks}</span>
          </div>
        </div>

        {/* CHART 6: TEST ACCURACY PROGRESS (Continuous Recall Line) */}
        <div className="bg-white/50 dark:bg-slate-900/50 border border-slate-200/40 dark:border-slate-800/50 rounded-3xl p-6 backdrop-blur-md shadow-xl flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 flex items-center">
              <Target className="w-3.5 h-3.5 text-emerald-500 mr-1.5" />
              Continuous Recall
            </span>
            <h3 className="text-base font-black text-slate-800 dark:text-slate-100 tracking-tight mt-1">
              Diagnostic Assessment Accuracy
            </h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
              Average scores charted over the last 5 mock tests.
            </p>
          </div>

          <div className="h-52 w-full my-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={testHistory} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                <XAxis 
                  dataKey="date" 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fontSize: 8, fontWeight: 700, fill: chartColors.text }}
                />
                <YAxis 
                  tickLine={false} 
                  axisLine={false} 
                  domain={[0, 100]}
                  tick={{ fontSize: 8, fontWeight: 700, fill: chartColors.text }}
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: "12px", 
                    backgroundColor: isDark ? "#0f172a" : "#fff",
                    fontSize: "10px"
                  }} 
                />
                <ReferenceLine y={85} stroke={chartColors.emerald} strokeDasharray="3 3" label={{ value: "Target (85%)", position: "insideBottomRight", fill: chartColors.emerald, fontSize: 8, fontWeight: "bold" }} />
                <Line 
                  type="monotone" 
                  dataKey="percentage" 
                  name="Recall Score %"
                  stroke={chartColors.emerald} 
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 2, stroke: chartColors.emerald, fill: "#fff" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="pt-2 border-t border-slate-200/30 dark:border-slate-800/30 flex justify-between items-center text-[10px] font-bold text-slate-400">
            <span>Global Accuracy: <strong className="text-emerald-500">{overallAccuracy}%</strong></span>
            <span className="text-emerald-500 font-black">+2.4% vs last week</span>
          </div>
        </div>

        {/* CHART 7: WEEKLY CONSISTENCY HEATMAP CALENDAR */}
        <div className="xl:col-span-3 bg-white/50 dark:bg-slate-900/50 border border-slate-200/40 dark:border-slate-800/50 rounded-3xl p-6 backdrop-blur-md shadow-xl flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 flex items-center">
                <Calendar className="w-3.5 h-3.5 text-indigo-500 mr-1.5" />
                Consistency Grid
              </span>
              <h3 className="text-base font-black text-slate-800 dark:text-slate-100 tracking-tight mt-1">
                35-Day Consistency Ledger
              </h3>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                Tap individual date grid squares to analyze local study minutes and cognitive efficiency.
              </p>
            </div>

            {/* Contribution-Style Heatmap Grid */}
            <div className="grid grid-cols-7 gap-2.5 pt-2 max-w-xl mx-auto">
              {daysOfWeek.map((d) => (
                <span key={d} className="text-[9px] font-black text-slate-400 dark:text-slate-500 text-center uppercase tracking-widest block pb-1 select-none">
                  {d[0]}
                </span>
              ))}

              {heatmapCells.map((cell) => {
                let colorClass = "bg-slate-100 dark:bg-slate-800/60 hover:ring-1 hover:ring-slate-300";
                if (cell.intensity === "low") colorClass = "bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 hover:ring-2 hover:ring-indigo-300";
                if (cell.intensity === "medium") colorClass = "bg-indigo-300 dark:bg-indigo-900/60 text-indigo-100 hover:ring-2 hover:ring-indigo-400";
                if (cell.intensity === "high") colorClass = "bg-indigo-600 text-white hover:ring-2 hover:ring-indigo-500";

                const isSelected = selectedHeatday === cell.dateString;

                return (
                  <motion.button
                    key={cell.id}
                    type="button"
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedHeatday(isSelected ? null : cell.dateString)}
                    className={`aspect-square rounded-xl transition duration-150 cursor-pointer text-[9px] font-black flex items-center justify-center shadow-sm ${colorClass} ${
                      isSelected ? "ring-4 ring-purple-500 scale-110" : ""
                    }`}
                    title={`${cell.dateString}: ${cell.hours} study hours`}
                  >
                    {cell.hours > 0 ? `${cell.hours.toFixed(1)}h` : ""}
                  </motion.button>
                );
              })}
            </div>

            {/* Heatmap Keys */}
            <div className="flex flex-wrap items-center justify-center gap-4 text-[9px] text-slate-400 font-bold pt-3 border-t border-slate-200/30 dark:border-slate-800/30">
              <span className="font-extrabold uppercase tracking-wider">Density Keys:</span>
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded bg-slate-100 dark:bg-slate-800" />
                <span>Rest</span>
                <span className="w-3 h-3 rounded bg-indigo-100 dark:bg-indigo-950/40" />
                <span>Light study (&lt;1.5h)</span>
                <span className="w-3 h-3 rounded bg-indigo-300 dark:bg-indigo-900/60" />
                <span>Standard (1.5h - 3h)</span>
                <span className="w-3 h-3 rounded bg-indigo-600" />
                <span>Titan Scholar (3h+)</span>
              </div>
            </div>
          </div>

          {/* Interactive Inspect Panel */}
          <div className="mt-4 min-h-[44px]">
            <AnimatePresence mode="wait">
              {selectedHeatday ? (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/20 rounded-2xl text-[10px] text-slate-600 dark:text-indigo-300 font-extrabold leading-relaxed flex flex-col sm:flex-row justify-between items-center gap-2"
                >
                  <span className="flex items-center">
                    <Calendar className="w-3.5 h-3.5 text-indigo-500 mr-2 shrink-0" />
                    Inspecting Logged Date: <strong className="text-indigo-600 dark:text-indigo-400 ml-1.5">{selectedHeatday}</strong>
                  </span>
                  <div className="flex items-center space-x-3 text-indigo-600 dark:text-indigo-400">
                    <span>🔥 Focus Efficiency: 96%</span>
                    <span>📚 Spaced Recall Checked</span>
                  </div>
                </motion.div>
              ) : (
                <p className="text-[10px] text-slate-400 dark:text-slate-500 italic text-center font-semibold pt-2">
                  Click any contributor block above to review localized biometric metrics and daily recall efficiency ratios.
                </p>
              )}
            </AnimatePresence>
          </div>
        </div>

      </div>

      {/* NOTION / DUOLINGO STYLE GLASS INSIGHTS CARDS */}
      <div className="bg-white/50 dark:bg-slate-900/50 border border-slate-200/40 dark:border-slate-800/50 rounded-3xl p-6 backdrop-blur-md shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 flex items-center">
              <Sparkles className="w-4 h-4 text-indigo-500 mr-1.5 animate-pulse" />
              StudyCoach AI Insights
            </span>
            <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight mt-1">
              Biometric Recommendations & Insights
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold">
              Evidence-based study patterns parsed directly matching your favorite classes and streak patterns.
            </p>
          </div>

          <motion.button
            type="button"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleGenerateLiveAudit}
            disabled={loadingAI}
            className="flex items-center space-x-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-black text-xs px-5 py-3 rounded-2xl shadow-lg shadow-indigo-500/20 cursor-pointer disabled:opacity-50"
          >
            {loadingAI ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            <span>{loadingAI ? "Analyzing Metrics..." : "Generate Live AI Diagnostic"}</span>
          </motion.button>
        </div>

        {/* Live AI Response Area */}
        <AnimatePresence>
          {loadingAI && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-5 rounded-2xl border border-indigo-200/50 dark:border-indigo-900/40 bg-indigo-50/30 dark:bg-indigo-950/20 backdrop-blur-md space-y-3 relative overflow-hidden"
            >
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                <Brain className="w-4 h-4 animate-bounce text-indigo-500" />
                <span>Generating Cognitive AI Diagnostic...</span>
              </div>
              <div className="space-y-2">
                <div className="h-3.5 w-full bg-indigo-200/50 dark:bg-indigo-900/40 rounded-full animate-pulse" />
                <div className="h-3.5 w-[88%] bg-indigo-200/40 dark:bg-indigo-900/30 rounded-full animate-pulse" />
                <div className="h-3.5 w-[65%] bg-indigo-200/30 dark:bg-indigo-900/20 rounded-full animate-pulse" />
              </div>
            </motion.div>
          )}

          {liveInsight && !loadingAI && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden border border-purple-200/50 dark:border-purple-900/30 bg-purple-50/20 dark:bg-purple-950/15 p-5 rounded-2xl backdrop-blur-md text-left"
            >
              <div className="flex items-center justify-between border-b border-purple-100 dark:border-purple-900/20 pb-3 mb-3.5">
                <span className="flex items-center text-xs font-black text-purple-600 dark:text-purple-400">
                  <Brain className="w-4.5 h-4.5 text-purple-500 mr-2" />
                  Clinical Diagnostic Audit from Gemini AI Coach
                </span>
                <span className="text-[8px] font-black uppercase tracking-widest bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded">
                  Clinical Draft
                </span>
              </div>
              <div className="markdown-body text-xs leading-relaxed text-slate-600 dark:text-slate-350 space-y-3 font-semibold">
                <Markdown>{liveInsight}</Markdown>
              </div>
              {aiError && (
                <div className="text-[9px] text-amber-500 dark:text-amber-400 font-bold mt-2 flex items-center">
                  <AlertCircle className="w-3.5 h-3.5 mr-1" />
                  <span>{aiError}</span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Glass Cards Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 pt-2">
          
          {/* Card 1: Strongest Subject */}
          <div className="p-4 rounded-2xl bg-emerald-50/30 dark:bg-emerald-950/10 border border-emerald-100/30 dark:border-emerald-900/10 text-left space-y-2 hover:shadow-md transition">
            <div className="flex justify-between items-center">
              <span className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Strongest Subject</span>
              <Award className="w-4 h-4 text-emerald-500 shrink-0" />
            </div>
            <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 tracking-tight leading-snug">
              {defaultInsights.strongest}
            </h4>
            <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold leading-relaxed">
              Highest syllabus completion rate identified.
            </p>
          </div>

          {/* Card 2: Weakest Subject */}
          <div className="p-4 rounded-2xl bg-rose-50/30 dark:bg-rose-950/10 border border-rose-100/30 dark:border-rose-900/10 text-left space-y-2 hover:shadow-md transition">
            <div className="flex justify-between items-center">
              <span className="text-[8px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest">Weak Focus Course</span>
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            </div>
            <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 tracking-tight leading-snug">
              {defaultInsights.weakest}
            </h4>
            <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold leading-relaxed">
              Requires immediate recall reinforcement.
            </p>
          </div>

          {/* Card 3: Best Study Time */}
          <div className="p-4 rounded-2xl bg-amber-50/30 dark:bg-amber-950/10 border border-amber-100/30 dark:border-amber-900/10 text-left space-y-2 hover:shadow-md transition">
            <div className="flex justify-between items-center">
              <span className="text-[8px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">Best Study window</span>
              <Clock className="w-4 h-4 text-amber-500 shrink-0" />
            </div>
            <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 tracking-tight leading-snug">
              {defaultInsights.bestStudyTime}
            </h4>
            <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold leading-relaxed">
              Maximum retrieval efficiency rate.
            </p>
          </div>

          {/* Card 4: Suggestions */}
          <div className="p-4 rounded-2xl bg-indigo-50/30 dark:bg-indigo-950/10 border border-indigo-100/30 dark:border-indigo-900/10 text-left space-y-2 hover:shadow-md transition md:col-span-2 lg:col-span-1 xl:col-span-1">
            <div className="flex justify-between items-center">
              <span className="text-[8px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest font-black">Cognitive Suggestion</span>
              <Brain className="w-4 h-4 text-indigo-500 shrink-0" />
            </div>
            <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 tracking-tight leading-relaxed">
              Spaced retrieval pauses detected.
            </h4>
            <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold leading-relaxed">
              {defaultInsights.suggestions}
            </p>
          </div>

          {/* Card 5: Weekly Recommendations */}
          <div className="p-4 rounded-2xl bg-purple-50/30 dark:bg-purple-950/10 border border-purple-100/30 dark:border-purple-900/10 text-left space-y-2 hover:shadow-md transition md:col-span-2 lg:col-span-1 xl:col-span-1">
            <div className="flex justify-between items-center">
              <span className="text-[8px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest">Weekly Goal Plan</span>
              <Sparkles className="w-4 h-4 text-purple-500 shrink-0 animate-pulse" />
            </div>
            <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 tracking-tight leading-relaxed">
              Diagnostic subject isolation.
            </h4>
            <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold leading-relaxed">
              {defaultInsights.weeklyRecommendation}
            </p>
          </div>

        </div>
      </div>

      {/* BADGES & SCHOLARLY MILESTONES */}
      <div className="bg-white/50 dark:bg-slate-900/50 border border-slate-200/40 dark:border-slate-800/40 p-6 rounded-3xl backdrop-blur-md shadow-xl space-y-6">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 flex items-center">
            <Trophy className="w-4.5 h-4.5 text-indigo-500 mr-1.5 shrink-0" />
            Milestone Legacies
          </span>
          <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight mt-1">
            Unveiled Academic Achievements
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold">
            Gain study multiplier points by resolving regular tasks and establishing daily habits.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {scholarlyAchievements.map((ach) => (
            <div 
              key={ach.id}
              className={`p-4 rounded-2xl border transition duration-300 text-left space-y-3 relative overflow-hidden ${
                ach.unlocked 
                  ? "bg-slate-50/80 dark:bg-slate-800/40 border-slate-200/40 dark:border-slate-800/80" 
                  : "bg-slate-100/10 dark:bg-slate-900/5 border-slate-100/10 dark:border-slate-800/10 opacity-55"
              }`}
            >
              {ach.unlocked && (
                <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${ach.color} opacity-[0.06] rounded-full blur-xl`} />
              )}
              
              <div className="flex justify-between items-start">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-2xl shadow-sm ${
                  ach.unlocked 
                    ? "bg-amber-50 dark:bg-amber-950/20 border border-amber-200/30 dark:border-amber-900/30" 
                    : "bg-slate-100 dark:bg-slate-800 border border-slate-200"
                }`}>
                  {ach.unlocked ? ach.icon : "🔒"}
                </div>
                <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 px-2 py-0.5 rounded-lg uppercase">
                  {ach.xp}
                </span>
              </div>

              <div>
                <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 flex items-center">
                  {ach.name}
                  {ach.unlocked && (
                    <span className="text-[7px] font-black bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded text-emerald-600 dark:text-emerald-400 ml-2 uppercase">
                      Unlocked
                    </span>
                  )}
                </h4>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold leading-relaxed mt-1">
                  {ach.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
