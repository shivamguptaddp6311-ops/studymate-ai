import React, { useState } from "react";
import { Task, UserProfile } from "../types";
import { 
  GlassCard, HeroCard, QuickActionCard, ProgressCard, AnalyticsCard, 
  AchievementCard, AICard, TimelineCard, EmptyStateCard, PremiumButton, 
  PremiumInput, PremiumDialog, PremiumBottomSheet, PremiumIcon, PremiumCard 
} from "./PremiumUI";
import { 
  Plus, Search, Calendar, Tag, AlertTriangle, Check, Trash2, 
  Info, X, Bell, BellOff, Clock, Layers, CheckCircle2, RefreshCw, 
  Sparkles, Star, ChevronRight, TrendingUp, Inbox, Compass, CheckSquare, Settings
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Confetti from "./Confetti";

interface TasksProps {
  tasks: Task[];
  profile: UserProfile;
  onAddTask: (
    title: string, 
    priority: "High" | "Medium" | "Low", 
    subject: string, 
    deadline: string, 
    notes?: string,
    estimatedTime?: number,
    reminderSet?: boolean
  ) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
}

export default function Tasks({ 
  tasks, 
  profile, 
  onAddTask, 
  onToggleTask, 
  onDeleteTask,
  onUpdateTask
}: TasksProps) {
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<"All" | "High" | "Medium" | "Low">("All");
  const [subjectFilter, setSubjectFilter] = useState<string>("All");
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");

  // Form states for New Task Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<"High" | "Medium" | "Low">("Medium");
  const [subject, setSubject] = useState("");
  const [deadline, setDeadline] = useState("");
  const [notes, setNotes] = useState("");
  const [estimatedTime, setEstimatedTime] = useState<number>(45);
  const [reminderSet, setReminderSet] = useState<boolean>(false);

  // Success animations states
  const [showCelebration, setShowCelebration] = useState(false);
  const [activeDragColumn, setActiveDragColumn] = useState<string | null>(null);

  // Notification states
  const [notificationPermission, setNotificationPermission] = useState<"default" | "granted" | "denied">(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      return Notification.permission;
    }
    return "default";
  });
  const [showNotificationBanner, setShowNotificationBanner] = useState(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "granted") return false;
    }
    return localStorage.getItem("studymate_permissions_requested") !== "true";
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToastNotification = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  const playSuccessSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.28);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {
      console.warn("Audio feedback context failed:", e);
    }
  };

  const requestNotificationPermission = async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      try {
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);
        if (permission === "granted") {
          new Notification("Homework Reminders Enabled!", {
            body: `Excellent! You have ${activeCount} pending assignments awaiting your attention.`,
            icon: "https://cdn-icons-png.flaticon.com/512/2232/2232688.png"
          });
          triggerToastNotification("🔔 Homework reminders successfully activated!");
        }
      } catch (e) {
        setNotificationPermission("granted");
        triggerToastNotification("🔔 Homework reminders successfully activated!");
      }
    } else {
      setNotificationPermission("granted");
      triggerToastNotification("🔔 Homework reminders successfully activated!");
    }
  };

  const triggerRemindersNotification = () => {
    const pendingCount = tasks.filter((t) => !t.completed).length;
    if (pendingCount === 0) {
      triggerToastNotification("🎉 Zero pending tasks left! Keep up the brilliant study tempo!");
      return;
    }

    const urgentTask = tasks.find((t) => !t.completed && t.priority === "High") || tasks.find((t) => !t.completed);
    const message = `Pending homework items: ${pendingCount}. Next up: "${urgentTask?.title || "General studies"}"`;

    if (notificationPermission === "granted" && typeof window !== "undefined" && "Notification" in window) {
      try {
        new Notification("Homework Pending Reminder", {
          body: message,
          icon: "https://cdn-icons-png.flaticon.com/512/2232/2232688.png"
        });
      } catch (e) {
        console.warn(e);
      }
    }
    triggerToastNotification(`🔔 ${message}`);
  };

  const handleToggle = (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (task && !task.completed) {
      setShowCelebration(true);
      playSuccessSound();
    }
    onToggleTask(id);
    if (task) {
      onUpdateTask(id, { 
        progress: !task.completed ? 100 : 0,
        completedDate: !task.completed ? new Date().toISOString().split("T")[0] : undefined
      });
    }
  };

  const handleToggleReminder = (id: string, current: boolean) => {
    onUpdateTask(id, { reminderSet: !current });
    triggerToastNotification(!current ? "🔔 Reminder set for this assignment!" : "🔕 Reminder disabled.");
  };

  const handleProgressSliderChange = (id: string, value: number) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    if (value === 100 && !task.completed) {
      setShowCelebration(true);
      playSuccessSound();
      onToggleTask(id);
      onUpdateTask(id, { progress: 100, completedDate: new Date().toISOString().split("T")[0] });
    } else if (value < 100 && task.completed) {
      onToggleTask(id);
      onUpdateTask(id, { progress: value, completedDate: undefined });
    } else {
      onUpdateTask(id, { progress: value });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAddTask(
      title,
      priority,
      subject || profile.favoriteSubjects[0] || "General",
      deadline || new Date().toISOString().split("T")[0],
      notes,
      estimatedTime,
      reminderSet
    );
    // Reset modal state
    setTitle("");
    setPriority("Medium");
    setSubject("");
    setDeadline("");
    setNotes("");
    setEstimatedTime(45);
    setReminderSet(false);
    setShowAddModal(false);
    triggerToastNotification("📝 New Homework assigned successfully!");
  };

  // Drag and Drop implementation
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("text/plain", taskId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
  };

  const handleDragEnter = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    setActiveDragColumn(columnId);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setActiveDragColumn(null);
  };

  const handleDrop = (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    setActiveDragColumn(null);
    const taskId = e.dataTransfer.getData("text/plain");
    if (!taskId) return;

    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const todayStr = new Date().toISOString().split("T")[0];

    if (targetColumnId === "Completed") {
      if (!task.completed) {
        setShowCelebration(true);
        playSuccessSound();
        onToggleTask(taskId);
      }
      onUpdateTask(taskId, { progress: 100, completedDate: todayStr });
      triggerToastNotification("🚀 Task completed successfully!");
    } else {
      if (task.completed) {
        onToggleTask(taskId);
      }

      let nextDeadline = task.deadline;
      if (targetColumnId === "Today") {
        nextDeadline = todayStr;
      } else if (targetColumnId === "Upcoming") {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        nextDeadline = tomorrow.toISOString().split("T")[0];
      } else if (targetColumnId === "Overdue") {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        nextDeadline = yesterday.toISOString().split("T")[0];
      }

      onUpdateTask(taskId, {
        completed: false,
        deadline: nextDeadline,
        progress: task.progress === 100 ? 50 : task.progress
      });
      triggerToastNotification(`📍 Moved assignment to ${targetColumnId}`);
    }
  };

  // Date constants & helpers
  const todayStr = new Date().toISOString().split("T")[0];

  const getTaskColumn = (task: Task): "Today" | "Upcoming" | "Completed" | "Overdue" => {
    if (task.completed) return "Completed";
    if (task.deadline < todayStr) return "Overdue";
    if (task.deadline === todayStr) return "Today";
    return "Upcoming";
  };

  // Pre-filter with search, priority, and subject select options
  const filteredTasks = tasks.filter((t) => {
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase()) || 
                          (t.notes && t.notes.toLowerCase().includes(search.toLowerCase())) ||
                          t.subjectTag.toLowerCase().includes(search.toLowerCase());
    
    const matchesPriority = priorityFilter === "All" ? true : t.priority === priorityFilter;
    const matchesSubject = subjectFilter === "All" ? true : t.subjectTag === subjectFilter;

    return matchesSearch && matchesPriority && matchesSubject;
  });

  const activeCount = tasks.filter((t) => !t.completed).length;
  const completedCount = tasks.filter((t) => t.completed).length;
  const totalCount = tasks.length;
  const highPriorityCount = tasks.filter((t) => !t.completed && t.priority === "High").length;
  const overdueCount = tasks.filter((t) => !t.completed && t.deadline < todayStr).length;

  // Circular Stats Calculations
  const completionPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (completionPercent / 100) * circumference;

  // Concentric ring 2: High priority tasks resolution
  const highPriorityTotal = tasks.filter(t => t.priority === "High").length;
  const highPriorityCompleted = tasks.filter(t => t.priority === "High" && t.completed).length;
  const highPriorityPercent = highPriorityTotal > 0 ? Math.round((highPriorityCompleted / highPriorityTotal) * 100) : 0;
  const innerRadius = 24;
  const innerCircumference = 2 * Math.PI * innerRadius;
  const innerStrokeDashoffset = innerCircumference - (highPriorityPercent / 100) * innerCircumference;

  // Active estimated hours tracker
  const totalEstimatedMins = tasks.filter(t => !t.completed).reduce((sum, t) => sum + (t.estimatedTime || 45), 0);
  const formattedEstimatedHrs = totalEstimatedMins >= 60 
    ? `${Math.floor(totalEstimatedMins / 60)}h ${totalEstimatedMins % 60}m` 
    : `${totalEstimatedMins}m`;

  // Dynamic Subject Badge Styles Mapping
  const getSubjectColor = (subject: string) => {
    const s = subject.toLowerCase();
    if (s.includes("math")) return "bg-sky-50/80 text-sky-650 border-sky-100/50 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-900/20";
    if (s.includes("phys") || s.includes("chem") || s.includes("scie") || s.includes("biol")) {
      return "bg-violet-50/80 text-violet-650 border-violet-100/50 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-900/20";
    }
    if (s.includes("comp") || s.includes("code") || s.includes("program")) {
      return "bg-emerald-50/80 text-emerald-650 border-emerald-100/50 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/20";
    }
    if (s.includes("eng") || s.includes("lit") || s.includes("lang")) {
      return "bg-pink-50/80 text-pink-650 border-pink-100/50 dark:bg-pink-950/30 dark:text-pink-400 dark:border-pink-900/20";
    }
    if (s.includes("hist") || s.includes("soci") || s.includes("civ")) {
      return "bg-amber-50/80 text-amber-655 border-amber-100/50 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/20";
    }
    return "bg-slate-50/80 text-slate-650 border-slate-100/50 dark:bg-slate-800/40 dark:text-slate-350 dark:border-slate-800/50";
  };

  // Group columns
  const columnData = {
    Today: filteredTasks.filter((t) => getTaskColumn(t) === "Today"),
    Upcoming: filteredTasks.filter((t) => getTaskColumn(t) === "Upcoming"),
    Overdue: filteredTasks.filter((t) => getTaskColumn(t) === "Overdue"),
    Completed: filteredTasks.filter((t) => getTaskColumn(t) === "Completed"),
  };

  const columnMeta = {
    Today: { title: "Today", icon: Calendar, color: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20" },
    Upcoming: { title: "Upcoming", icon: Compass, color: "text-sky-500 bg-sky-500/10 border-sky-500/20" },
    Overdue: { title: "Overdue", icon: AlertTriangle, color: "text-rose-500 bg-rose-500/10 border-rose-500/20" },
    Completed: { title: "Completed", icon: CheckCircle2, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
  };

  return (
    <div id="homework_workspace" className="space-y-6 relative select-none">
      <Confetti active={showCelebration} onComplete={() => setShowCelebration(false)} />

      {/* NOTIFICATION ACCESS BANNER */}
      {showNotificationBanner && (
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-3xl p-5 border border-indigo-700/30 shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="absolute right-0 top-0 opacity-[0.08] translate-x-12 -translate-y-6 pointer-events-none">
            <Layers className="w-48 h-48 text-white" />
          </div>
          <div className="space-y-1 relative z-10 text-center md:text-left">
            <h3 className="text-sm font-extrabold flex items-center justify-center md:justify-start gap-1.5">
              <span>🔔 Enable Homework Reminders & Push Alerts</span>
              {notificationPermission === "granted" && (
                <span className="ml-1 bg-emerald-500 text-white text-[8px] px-2 py-0.5 rounded-full font-mono uppercase font-black">Active</span>
              )}
            </h3>
            <p className="text-xs text-indigo-100 max-w-xl leading-relaxed font-medium">
              Activate notifications to receive desktop and in-app alerts for pending assignments, close deadlines, and revision routines. Currently you have <strong className="font-extrabold">{activeCount}</strong> items pending.
            </p>
          </div>
          <div className="flex items-center space-x-2 shrink-0 relative z-10">
            {notificationPermission !== "granted" ? (
              <button
                onClick={requestNotificationPermission}
                className="px-4 py-2.5 bg-white text-indigo-600 hover:bg-indigo-50 font-black text-xs rounded-xl shadow-sm transition duration-150 cursor-pointer active:scale-95"
              >
                Request Access
              </button>
            ) : (
              <button
                onClick={triggerRemindersNotification}
                className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white font-black text-xs rounded-xl shadow-sm transition duration-150 cursor-pointer flex items-center space-x-1 active:scale-95"
              >
                <span>Notify Pending Tasks</span>
              </button>
            )}
            <button
              onClick={() => setShowNotificationBanner(false)}
              className="p-1.5 text-indigo-200 hover:text-white hover:bg-indigo-700/50 rounded-lg cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white/60 dark:bg-slate-900/40 backdrop-blur-md border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 rounded-2xl">
              <Layers className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h1 className="text-lg md:text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight font-display">
                Homework Space
              </h1>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {activeCount === 0 
                  ? "All caught up! Zero outstanding homework items. 🎉" 
                  : `You have ${activeCount} active assignments. Drag and drop cards to organize.`}
              </p>
            </div>
          </div>
        </div>
        
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-4.5 py-2.5 rounded-xl text-xs font-black shadow-lg shadow-indigo-600/15 transition-all duration-200 cursor-pointer active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Assignment</span>
        </button>
      </div>

      {/* PREMIUM BENTO DASHBOARD STATS */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Double Concentric circular chart */}
        <div className="md:col-span-5 bg-white/60 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 backdrop-blur-md p-5 rounded-3xl flex items-center gap-6 shadow-sm">
          <div className="relative flex items-center justify-center w-24 h-24 shrink-0">
            <svg className="w-24 h-24 transform -rotate-90">
              {/* Ring 1 base */}
              <circle
                cx="48"
                cy="48"
                r={radius}
                stroke="currentColor"
                className="text-slate-100 dark:text-slate-800"
                strokeWidth="6"
                fill="transparent"
              />
              {/* Ring 1 value (Overall Completion) */}
              <motion.circle
                cx="48"
                cy="48"
                r={radius}
                stroke="url(#completionGradient)"
                strokeWidth="6"
                fill="transparent"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                strokeLinecap="round"
              />
              
              {/* Ring 2 base */}
              <circle
                cx="48"
                cy="48"
                r={innerRadius}
                stroke="currentColor"
                className="text-slate-50 dark:text-slate-850"
                strokeWidth="5"
                fill="transparent"
              />
              {/* Ring 2 value (High priority completed) */}
              <motion.circle
                cx="48"
                cy="48"
                r={innerRadius}
                stroke="url(#highPriorityGradient)"
                strokeWidth="5"
                fill="transparent"
                strokeDasharray={innerCircumference}
                initial={{ strokeDashoffset: innerCircumference }}
                animate={{ strokeDashoffset: innerStrokeDashoffset }}
                transition={{ duration: 1.2, ease: "easeOut", delay: 0.15 }}
                strokeLinecap="round"
              />

              <defs>
                <linearGradient id="completionGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
                <linearGradient id="highPriorityGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f43f5e" />
                  <stop offset="100%" stopColor="#fb7185" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-sm font-black text-slate-800 dark:text-slate-100 font-mono">
                {completionPercent}%
              </span>
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider scale-90">Done</span>
            </div>
          </div>

          <div className="space-y-1.5 overflow-hidden flex-1 text-left">
            <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">Weekly Board Activity</h3>
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-[10px] text-slate-500 dark:text-slate-400">
                <span className="w-2.5 h-2.5 rounded bg-gradient-to-br from-indigo-500 to-purple-500 shrink-0" />
                <span className="font-semibold">Syllabus Completion: {completionPercent}%</span>
              </div>
              <div className="flex items-center space-x-2 text-[10px] text-slate-500 dark:text-slate-400">
                <span className="w-2.5 h-2.5 rounded bg-gradient-to-br from-rose-500 to-rose-400 shrink-0" />
                <span className="font-semibold">Priority Goals met: {highPriorityPercent}%</span>
              </div>
            </div>
            <div className="flex items-center space-x-1 pt-1.5 border-t border-slate-100 dark:border-slate-800/60">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-[9px] font-black text-emerald-500">+12% resolution rate from last week</span>
            </div>
          </div>
        </div>

        {/* 3 bento mini blocks */}
        <div className="md:col-span-7 grid grid-cols-3 gap-3">
          <div className="bg-white/60 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 backdrop-blur-md p-4 rounded-3xl shadow-sm text-left flex flex-col justify-between">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Overdue</span>
            <div className="space-y-1 pt-2">
              <div className={`text-2xl font-black font-mono leading-none ${overdueCount > 0 ? "text-rose-500" : "text-slate-400"}`}>{overdueCount}</div>
              <div className="text-[9px] font-bold text-slate-400 dark:text-slate-500 leading-tight">Passed target date</div>
            </div>
          </div>

          <div className="bg-white/60 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 backdrop-blur-md p-4 rounded-3xl shadow-sm text-left flex flex-col justify-between">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">High Goals</span>
            <div className="space-y-1 pt-2">
              <div className={`text-2xl font-black font-mono leading-none ${highPriorityCount > 0 ? "text-rose-500" : "text-slate-400"}`}>{highPriorityCount}</div>
              <div className="text-[9px] font-bold text-slate-400 dark:text-slate-500 leading-tight">Urgent tasks active</div>
            </div>
          </div>

          <div className="bg-white/60 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 backdrop-blur-md p-4 rounded-3xl shadow-sm text-left flex flex-col justify-between">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Load Estimator</span>
            <div className="space-y-1 pt-2">
              <div className="text-2xl font-black text-indigo-500 dark:text-indigo-400 font-mono leading-none">{formattedEstimatedHrs}</div>
              <div className="text-[9px] font-bold text-slate-400 dark:text-slate-500 leading-tight">Est. workload</div>
            </div>
          </div>
        </div>
      </div>

      {/* SEARCH AND VIEW MODE TOGGLER */}
      <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-md border border-slate-100 dark:border-slate-800 p-3.5 rounded-2xl shadow-sm flex flex-col sm:flex-row items-center gap-4">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search assignments, tags, homework notes..."
            className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-slate-150 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500 placeholder-slate-400 font-medium"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Filter selectors */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0 justify-end">
          <select
            className="px-3 py-2 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 text-slate-650 dark:text-slate-400 outline-none w-full sm:w-36 transition-colors focus:border-indigo-500"
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
          >
            <option value="All">📓 All Subjects</option>
            {profile.favoriteSubjects.map((sub) => (
              <option key={sub} value={sub}>⚡ {sub}</option>
            ))}
            <option value="General">⭐ General</option>
          </select>

          <select
            className="px-3 py-2 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 text-slate-650 dark:text-slate-400 outline-none w-full sm:w-36 transition-colors focus:border-indigo-500"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as any)}
          >
            <option value="All">🚦 All Priorities</option>
            <option value="High">🔴 High Priority</option>
            <option value="Medium">🟡 Medium Priority</option>
            <option value="Low">🟢 Low Priority</option>
          </select>

          {/* Dual View Mode Selector */}
          <div className="p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl flex items-center shrink-0 border border-slate-200/40 dark:border-slate-700/50">
            <button
              onClick={() => setViewMode("kanban")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === "kanban"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              Board
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === "list"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              List
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {viewMode === "kanban" ? (
          <motion.div
            key="kanban-view"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start"
          >
            {(Object.keys(columnData) as Array<keyof typeof columnData>).map((colId) => {
              const colTasks = columnData[colId];
              const meta = columnMeta[colId];
              const ColIcon = meta.icon;
              const isOver = activeDragColumn === colId;

              return (
                <div
                  key={colId}
                  onDragOver={(e) => handleDragOver(e, colId)}
                  onDragEnter={(e) => handleDragEnter(e, colId)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, colId)}
                  className={`rounded-3xl border transition-all duration-300 min-h-[460px] flex flex-col p-4 bg-white/40 dark:bg-slate-900/10 backdrop-blur-md ${
                    isOver 
                      ? "border-indigo-400 bg-indigo-50/20 dark:bg-indigo-950/25 scale-[1.01] shadow-lg shadow-indigo-500/5" 
                      : "border-slate-100 dark:border-slate-800/80"
                  }`}
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800 mb-4 shrink-0">
                    <div className="flex items-center space-x-2">
                      <div className={`p-1.5 rounded-xl border border-slate-100/30 dark:border-slate-800/40 ${meta.color}`}>
                        <ColIcon className="w-4 h-4" />
                      </div>
                      <h3 className="text-xs font-black text-slate-750 dark:text-slate-350 uppercase tracking-wider">
                        {meta.title}
                      </h3>
                    </div>
                    <span className="text-[10px] font-black font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                      {colTasks.length}
                    </span>
                  </div>

                  {/* Cards Area */}
                  <div className="space-y-3 flex-1 overflow-y-auto max-h-[580px] pr-1 scrollbar-thin">
                    {colTasks.length === 0 ? (
                      <div className="py-12 text-center text-slate-300 dark:text-slate-700 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center p-4 bg-slate-50/10 dark:bg-slate-950/10">
                        <span className="text-xl mb-1 opacity-70">📥</span>
                        <p className="text-[10px] font-extrabold text-slate-400">Empty Section</p>
                        <p className="text-[8px] text-slate-400 dark:text-slate-500 font-medium max-w-[120px] mx-auto mt-0.5 leading-relaxed">
                          Drag active tasks here to update progress status
                        </p>
                      </div>
                    ) : (
                      colTasks.map((task) => {
                        const taskSubjectColor = getSubjectColor(task.subjectTag);
                        return (
                          <div
                            key={task.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, task.id)}
                            className={`group relative bg-white dark:bg-slate-900 border rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-305 cursor-grab active:cursor-grabbing hover:-translate-y-0.5 flex flex-col justify-between ${
                              task.completed 
                                ? "border-slate-100/60 dark:border-slate-800/60 opacity-60" 
                                : task.priority === "High"
                                  ? "border-rose-100 dark:border-rose-950/40 hover:border-rose-300"
                                  : "border-slate-100 dark:border-slate-800 hover:border-indigo-250 dark:hover:border-indigo-950"
                            }`}
                          >
                            {/* High Priority breathing aura or color-coded left bar */}
                            {task.priority === "High" && !task.completed && (
                              <div className="absolute left-0 top-3.5 bottom-3.5 w-1 bg-rose-500 rounded-r-full animate-pulse" />
                            )}

                            <div className="space-y-3">
                              {/* Pill & Reminder Ring Controls */}
                              <div className="flex items-center justify-between">
                                <span className={`inline-flex items-center text-[9px] font-black px-2 py-0.5 rounded-full border ${taskSubjectColor} truncate max-w-[120px]`}>
                                  {task.subjectTag}
                                </span>

                                <div className="flex items-center space-x-1">
                                  {/* Alarm toggle */}
                                  <button
                                    onClick={() => handleToggleReminder(task.id, !!task.reminderSet)}
                                    className={`p-1 rounded-lg transition-all cursor-pointer ${
                                      task.reminderSet 
                                        ? "bg-indigo-500/10 text-indigo-500 dark:text-indigo-400" 
                                        : "text-slate-300 dark:text-slate-650 hover:text-indigo-400"
                                    }`}
                                    title={task.reminderSet ? "Alert Reminder active" : "Enable reminder Alert"}
                                  >
                                    {task.reminderSet ? <Bell className="w-3 h-3 text-indigo-500 dark:text-indigo-400" /> : <BellOff className="w-3 h-3" />}
                                  </button>

                                  <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md ${
                                    task.priority === "High" ? "bg-rose-50 text-rose-600 dark:bg-rose-950/50" : 
                                    task.priority === "Medium" ? "bg-amber-50 text-amber-600 dark:bg-amber-950/50" : 
                                    "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50"
                                  }`}>
                                    {task.priority}
                                  </span>
                                </div>
                              </div>

                              {/* Title & Interactive Toggle Box */}
                              <div className="flex items-start gap-2.5 pt-0.5">
                                <button
                                  onClick={() => handleToggle(task.id)}
                                  className={`w-4.5 h-4.5 rounded-lg border mt-0.5 flex items-center justify-center shrink-0 transition-all duration-205 cursor-pointer ${
                                    task.completed
                                      ? "bg-indigo-600 border-indigo-600 text-white"
                                      : "border-slate-300 dark:border-slate-700 hover:border-indigo-500 hover:scale-105"
                                  }`}
                                >
                                  {task.completed && (
                                    <motion.div
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      transition={{ type: "spring", stiffness: 400, damping: 15 }}
                                    >
                                      <Check className="w-3.5 h-3.5 stroke-[3.5px]" />
                                    </motion.div>
                                  )}
                                </button>

                                <div className="space-y-1 overflow-hidden flex-1 text-left">
                                  <h4 className={`text-xs font-bold leading-snug break-words ${
                                    task.completed 
                                      ? "line-through text-slate-450 dark:text-slate-500 font-medium" 
                                      : "text-slate-850 dark:text-slate-205"
                                  }`}>
                                    {task.title}
                                  </h4>
                                  {task.notes && (
                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-normal line-clamp-2">
                                      {task.notes}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Progress status indicators */}
                              <div className="space-y-1.5 pt-1.5">
                                <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                  <span>Task Progress</span>
                                  <span className="font-mono">{task.progress || 0}%</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={task.progress || 0}
                                    onChange={(e) => handleProgressSliderChange(task.id, parseInt(e.target.value))}
                                    className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none"
                                  />
                                </div>
                                <div className="h-1 w-full bg-slate-50 dark:bg-slate-950 rounded-full overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${task.progress || 0}%` }}
                                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                                  />
                                </div>
                              </div>

                              {/* Duration Estimator & Target Date */}
                              <div className="flex items-center justify-between pt-2 border-t border-slate-50 dark:border-slate-850/80 text-[9px] text-slate-450 dark:text-slate-500">
                                <span className="flex items-center font-bold font-mono">
                                  <Clock className="w-3.5 h-3.5 mr-1" />
                                  {task.estimatedTime || 45}m
                                </span>

                                <span className="flex items-center font-bold">
                                  <Calendar className="w-3.5 h-3.5 mr-1" />
                                  {new Date(task.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                </span>
                              </div>
                            </div>

                            {/* Trash Delete block */}
                            <div className="flex justify-end pt-3 border-t border-slate-50 dark:border-slate-850/80 mt-3.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => onDeleteTask(task.id)}
                                className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer"
                                title="Delete Assignment"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </motion.div>
        ) : (
          <motion.div
            key="list-view"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="bg-white/40 dark:bg-slate-900/10 backdrop-blur-md rounded-3xl border border-slate-100 dark:border-slate-800 p-5 shadow-sm space-y-4 text-left"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">All Homework Listings</h3>
              <span className="text-[10px] font-bold text-slate-400">{filteredTasks.length} total tasks</span>
            </div>

            {filteredTasks.length === 0 ? (
              <EmptyStateCard
                icon={<Sparkles className="w-8 h-8 text-indigo-500" />}
                title="All Homework & Assignments Caught Up!"
                description="Zero pending items matching your filter! Outstanding focus. Stay ahead by adding your next project checkpoint or homework task below."
                motivationalQuote="The secret of getting ahead is getting started. — Mark Twain"
                aiSuggestions={[
                  "Add Physics Numericals Assignment",
                  "Create English Essay Draft Task",
                  "Set Chemistry Lab Report Homework"
                ]}
                onSelectSuggestion={(sug) => {
                  setTitle(sug);
                  setShowAddModal(true);
                }}
                action={{
                  label: "+ Create Homework Assignment",
                  onClick: () => setShowAddModal(true)
                }}
              />
            ) : (
              <div className="divide-y divide-slate-100/50 dark:divide-slate-800/40">
                {filteredTasks.map((task) => {
                  const taskSubjectColor = getSubjectColor(task.subjectTag);
                  const isOverdue = !task.completed && task.deadline < todayStr;
                  return (
                    <div 
                      key={task.id} 
                      className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 first:pt-0 last:pb-0 group"
                    >
                      <div className="flex items-start space-x-3 flex-1 min-w-0">
                        <button
                          onClick={() => handleToggle(task.id)}
                          className={`w-5 h-5 rounded-lg border mt-0.5 flex items-center justify-center shrink-0 transition-all duration-200 cursor-pointer ${
                            task.completed
                              ? "bg-indigo-600 border-indigo-600 text-white"
                              : "border-slate-300 dark:border-slate-750 hover:border-indigo-500"
                          }`}
                        >
                          {task.completed && <Check className="w-3.5 h-3.5 stroke-[3px]" />}
                        </button>

                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className={`text-xs font-bold truncate leading-snug ${
                              task.completed ? "line-through text-slate-400 dark:text-slate-500" : "text-slate-800 dark:text-slate-100"
                            }`}>
                              {task.title}
                            </h4>
                            <span className={`inline-flex items-center text-[9px] font-black px-1.5 py-0.2 rounded border ${taskSubjectColor}`}>
                              {task.subjectTag}
                            </span>
                            <span className={`text-[8px] font-black uppercase px-1.5 py-0.2 rounded ${
                              task.priority === "High" ? "bg-rose-50 text-rose-600 dark:bg-rose-950/40" : 
                              task.priority === "Medium" ? "bg-amber-50 text-amber-600 dark:bg-amber-950/40" : 
                              "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40"
                            }`}>
                              {task.priority}
                            </span>
                            {isOverdue && (
                              <span className="bg-rose-500/10 text-rose-600 text-[8px] font-black uppercase px-1.5 py-0.2 rounded border border-rose-500/15">
                                Overdue
                              </span>
                            )}
                          </div>
                          {task.notes && (
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-normal line-clamp-1 group-hover:line-clamp-none transition-all">
                              {task.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-4 shrink-0 justify-end">
                        {/* Progress slider */}
                        <div className="flex items-center space-x-2">
                          <span className="text-[9px] font-mono font-bold text-slate-400 w-8 text-right">{task.progress || 0}%</span>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={task.progress || 0}
                            onChange={(e) => handleProgressSliderChange(task.id, parseInt(e.target.value))}
                            className="w-20 sm:w-28 h-1 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                          />
                        </div>

                        {/* Deadline */}
                        <div className="text-[10px] font-semibold text-slate-400 flex items-center space-x-1 font-mono w-20 justify-end font-bold">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{new Date(task.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                        </div>

                        {/* Alarm bell button */}
                        <button
                          onClick={() => handleToggleReminder(task.id, !!task.reminderSet)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            task.reminderSet 
                              ? "bg-indigo-500/10 text-indigo-550 dark:text-indigo-400" 
                              : "text-slate-300 dark:text-slate-650 hover:text-indigo-455"
                          }`}
                          title="Toggle System Alert"
                        >
                          {task.reminderSet ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
                        </button>

                        <button
                          onClick={() => onDeleteTask(task.id)}
                          className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* NEW ASSIGNMENT MODAL DIALOG */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 text-left"
          >
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 bg-indigo-500/10 text-indigo-500 rounded-lg">
                    <CheckSquare className="w-4 h-4" />
                  </div>
                  <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm uppercase tracking-wide">Add Homework Assignment</h3>
                </div>
                <button 
                  onClick={() => setShowAddModal(false)} 
                  className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Homework / Title *</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Solve chemistry exercise 4.2 equations"
                    className="w-full px-3 py-2.5 text-xs border rounded-xl border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 placeholder-slate-400 font-semibold"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Subject Tag</label>
                    <select
                      className="w-full px-3 py-2.5 text-xs border rounded-xl border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 font-semibold"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                    >
                      <option value="">Select subject...</option>
                      {profile.favoriteSubjects.map((sub) => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                      <option value="General">General</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Priority Level</label>
                    <select
                      className="w-full px-3 py-2.5 text-xs border rounded-xl border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 font-semibold"
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as any)}
                    >
                      <option value="High">🔴 High Priority</option>
                      <option value="Medium">🟡 Medium Priority</option>
                      <option value="Low">🟢 Low Priority</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Estimated Time (mins)</label>
                    <input 
                      type="number"
                      min="5"
                      max="480"
                      className="w-full px-3 py-2.5 text-xs border rounded-xl border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 font-mono font-bold"
                      value={estimatedTime}
                      onChange={(e) => setEstimatedTime(Math.max(5, parseInt(e.target.value) || 0))}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Deadline Date</label>
                    <input 
                      type="date" 
                      className="w-full px-3 py-2.5 text-xs border rounded-xl border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 font-semibold"
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="flex items-center space-x-2 cursor-pointer py-1 select-none">
                    <input 
                      type="checkbox"
                      checked={reminderSet}
                      onChange={(e) => setReminderSet(e.target.checked)}
                      className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                    />
                    <span className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Enable Desktop Notification Alerts</span>
                  </label>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Additional Notes</label>
                  <textarea 
                    placeholder="Page numbers, link attachments, submission platform, or specific questions..."
                    rows={2}
                    className="w-full px-3 py-2 text-xs border rounded-xl border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 placeholder-slate-400 font-semibold"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                <div className="flex items-center space-x-2 bg-indigo-50/50 dark:bg-indigo-950/20 p-3 rounded-xl border border-indigo-100/30">
                  <Info className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                  <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-extrabold leading-normal">
                    Earn <strong className="font-black">20 XP</strong> on task creation, plus a <strong className="font-black">50 XP bonus</strong> upon completion!
                  </p>
                </div>

                <button 
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl shadow-lg shadow-indigo-600/10 transition-all cursor-pointer active:scale-95"
                >
                  Create Homework Assignment
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      )}

      {/* SYSTEM TOAST ALERT */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 right-6 z-50 max-w-sm bg-slate-900/95 dark:bg-slate-950/95 text-white border border-slate-800 p-4 rounded-2xl shadow-2xl backdrop-blur-md flex items-start space-x-3"
          >
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl">
              <Layers className="w-5 h-5 animate-pulse text-indigo-400" />
            </div>
            <div className="flex-1 space-y-0.5 pr-2 text-left">
              <h4 className="text-xs font-black tracking-tight">StudyMate System Alert</h4>
              <p className="text-[10px] text-slate-300 leading-normal font-medium">{toastMessage}</p>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="p-0.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
