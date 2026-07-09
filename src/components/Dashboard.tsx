import React, { useState, useEffect } from "react";
import { UserProfile, Task, Alarm, Habit } from "../types";
import { MOTIVATIONAL_QUOTES } from "../data";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, Calendar, Bell, Trophy, Plus, Clock, Play, CheckCircle2, 
  X, Check, Flame, ChevronRight, BookOpen, AlertTriangle, User, Award, Timer
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
  
  // Permissions gateway states
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [permsState, setPermsState] = useState({
    notifications: true,
    speaker: true,
    gallery: true
  });

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
    const hasAsked = localStorage.getItem(permissionKey);
    if (hasAsked !== "true") {
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

                <div className="space-y-3 bg-slate-50 dark:bg-slate-950/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                  {/* Notification */}
                  <label className="flex items-start space-x-3.5 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={permsState.notifications}
                      onChange={(e) => setPermsState({ ...permsState, notifications: e.target.checked })}
                      className="mt-0.5 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                    />
                    <div>
                      <span className="block text-xs font-bold text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        🔔 Notification Access
                      </span>
                      <span className="block text-[10px] text-slate-400 font-medium leading-relaxed">
                        Enable daily study alarms, morning motivational reminders, and active revision nudges.
                      </span>
                    </div>
                  </label>

                  {/* Speaker */}
                  <label className="flex items-start space-x-3.5 cursor-pointer group pt-2.5 border-t border-slate-100 dark:border-slate-800/60">
                    <input
                      type="checkbox"
                      checked={permsState.speaker}
                      onChange={(e) => setPermsState({ ...permsState, speaker: e.target.checked })}
                      className="mt-0.5 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                    />
                    <div>
                      <span className="block text-xs font-bold text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        🔊 Speaker & Audio Output
                      </span>
                      <span className="block text-[10px] text-slate-400 font-medium leading-relaxed">
                        Enable male/female voice explanations for textbook chats and custom game sound effects.
                      </span>
                    </div>
                  </label>

                  {/* Gallery */}
                  <label className="flex items-start space-x-3.5 cursor-pointer group pt-2.5 border-t border-slate-100 dark:border-slate-800/60">
                    <input
                      type="checkbox"
                      checked={permsState.gallery}
                      onChange={(e) => setPermsState({ ...permsState, gallery: e.target.checked })}
                      className="mt-0.5 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                    />
                    <div>
                      <span className="block text-xs font-bold text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        📸 Gallery & Live Camera Access
                      </span>
                      <span className="block text-[10px] text-slate-400 font-medium leading-relaxed">
                        Enables live homework question scanning, custom hand-cropping selection, and image analysis.
                      </span>
                    </div>
                  </label>
                </div>

                <button
                  onClick={() => {
                    localStorage.setItem(permissionKey, "true");
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
