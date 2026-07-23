import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Search, Mic, Camera, X, Clock, Sparkles, ArrowRight, CornerDownLeft,
  ClipboardList, Bell, Calendar as CalIcon, Flame, BookOpen, Target,
  Gamepad2, MessageSquare, BarChart3, User, Settings, CheckCircle2,
  ChevronRight, Volume2, Image as ImageIcon, Zap, Shield, Trash2,
  Sliders, RefreshCw, Lightbulb, Play
} from "lucide-react";
import { Task, Alarm, TimetableItem, Habit, UserProfile } from "../types";
import { EmptyStateCard } from "./PremiumUI";

export interface SearchResultItem {
  id: string;
  category: "Homework" | "Alarm" | "Timetable" | "Habits" | "Calendar" | "10-Day Test" | "Games" | "AI Chats" | "Global Chat" | "Analytics" | "Profile" | "Settings" | "Focus";
  title: string;
  description: string;
  icon: React.ElementType;
  color: string; // Tailwind gradient or text color
  bgColor: string;
  tab: string;
  actionType?: "navigate" | "toggleAlarm" | "completeTask" | "startAI";
  payload?: any;
  badge?: string;
  keywords?: string[];
}

interface UniversalSmartSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: string) => void;
  profile: UserProfile;
  tasks: Task[];
  alarms: Alarm[];
  timetable?: TimetableItem[];
  habits: Habit[];
  onToggleTask?: (id: string) => void;
  onToggleAlarm?: (id: string) => void;
}

const DEFAULT_RECENT_SEARCHES = [
  "Physics Gauss Law",
  "CBSE 10-Day Test",
  "6:00 AM Study Alarm",
  "Math Speed Challenge",
  "Organic Chemistry Notes"
];

const QUICK_SUGGESTIONS = [
  { label: "Homework", tab: "tasks", icon: ClipboardList, color: "text-blue-500 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800" },
  { label: "Alarm", tab: "alarms", icon: Bell, color: "text-rose-500 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800" },
  { label: "Timetable", tab: "planner", icon: CalIcon, color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800" },
  { label: "Habits", tab: "habits", icon: Flame, color: "text-amber-500 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800" },
  { label: "Calendar", tab: "calendar", icon: BookOpen, color: "text-sky-500 bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800" },
  { label: "10-Day Test", tab: "assessment", icon: Target, color: "text-fuchsia-500 bg-fuchsia-50 dark:bg-fuchsia-950/40 border-fuchsia-200 dark:border-fuchsia-800" },
  { label: "Games", tab: "games", icon: Gamepad2, color: "text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800" },
  { label: "AI Chats", tab: "assistant", icon: Sparkles, color: "text-purple-500 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800" },
  { label: "Global Chat", tab: "chat", icon: MessageSquare, color: "text-teal-500 bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800" },
  { label: "Analytics", tab: "analytics", icon: BarChart3, color: "text-cyan-500 bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-800" },
  { label: "Profile", tab: "profile", icon: User, color: "text-lime-600 bg-lime-50 dark:bg-lime-950/40 border-lime-200 dark:border-lime-800" },
  { label: "Settings", tab: "settings", icon: Settings, color: "text-slate-600 bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700" },
];

export function highlightMatch(text: string, query: string) {
  if (!query || !query.trim()) return text;
  const escapedQuery = query.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escapedQuery})`, "gi"));

  return parts.map((part, index) => {
    if (part.toLowerCase() === query.trim().toLowerCase()) {
      return (
        <mark
          key={`hl-${index}-${part}`}
          className="bg-amber-300/90 dark:bg-amber-400/40 text-amber-950 dark:text-amber-100 font-bold rounded px-1 py-0.5"
        >
          {part}
        </mark>
      );
    }
    return <React.Fragment key={`txt-${index}`}>{part}</React.Fragment>;
  });
}

export default function UniversalSmartSearch({
  isOpen,
  onClose,
  onNavigate,
  profile,
  tasks,
  alarms,
  timetable = [],
  habits,
  onToggleTask,
  onToggleAlarm
}: UniversalSmartSearchProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("sm_universal_recent_searches");
      return saved ? JSON.parse(saved) : DEFAULT_RECENT_SEARCHES;
    } catch {
      return DEFAULT_RECENT_SEARCHES;
    }
  });

  // Voice Search states
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Camera Shortcut Modal
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [camStreamActive, setCamStreamActive] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Check speech recognition browser support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setVoiceSupported(true);
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = "en-US";

      rec.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((res: any) => res[0].transcript)
          .join("");
        setQuery(transcript);
      };

      rec.onerror = (e: any) => {
        console.warn("Voice search error:", e);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }
  }, []);

  // Keyboard shortcuts (Cmd+K or Ctrl+K & Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Focus input
          setTimeout(() => inputRef.current?.focus(), 50);
        }
      } else if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setSelectedIndex(0);
    } else {
      setQuery("");
      if (isListening) {
        recognitionRef.current?.stop();
        setIsListening(false);
      }
    }
  }, [isOpen]);

  const toggleVoiceSearch = () => {
    if (!voiceSupported) {
      alert("Voice speech recognition is not supported in this browser. You can type your query instead.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (err) {
        console.warn("Voice start error:", err);
      }
    }
  };

  const saveRecentSearch = (term: string) => {
    if (!term || !term.trim()) return;
    const cleanTerm = term.trim();
    const filtered = recentSearches.filter((s) => s.toLowerCase() !== cleanTerm.toLowerCase());
    const updated = [cleanTerm, ...filtered.slice(0, 5)];
    setRecentSearches(updated);
    try {
      localStorage.setItem("sm_universal_recent_searches", JSON.stringify(updated));
    } catch {}
  };

  const removeRecentSearch = (e: React.MouseEvent, term: string) => {
    e.stopPropagation();
    const updated = recentSearches.filter((s) => s !== term);
    setRecentSearches(updated);
    try {
      localStorage.setItem("sm_universal_recent_searches", JSON.stringify(updated));
    } catch {}
  };

  const clearAllRecent = () => {
    setRecentSearches([]);
    try {
      localStorage.setItem("sm_universal_recent_searches", JSON.stringify([]));
    } catch {}
  };

  // Construct search items database dynamically
  const allSearchableItems = useMemo<SearchResultItem[]>(() => {
    const list: SearchResultItem[] = [
      // 1. Feature Modules (Top Level Navigation)
      {
        id: "mod-homework",
        category: "Homework",
        title: "Homework & Tasks Manager",
        description: `Manage pending subject homework (${tasks.filter(t => !t.completed).length} pending)`,
        icon: ClipboardList,
        color: "text-blue-500",
        bgColor: "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800",
        tab: "tasks",
        badge: "Homework",
        keywords: ["homework", "tasks", "assignment", "todo", "cbse", "deadline"]
      },
      {
        id: "mod-alarm",
        category: "Alarm",
        title: "Smart Study Alarms & Challenges",
        description: "Set early morning wake-up alarms with Math & Physics challenges",
        icon: Bell,
        color: "text-rose-500",
        bgColor: "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800",
        tab: "alarms",
        badge: "Alarms",
        keywords: ["alarm", "wake", "morning", "ringtone", "challenge", "math puzzle", "clock"]
      },
      {
        id: "mod-timetable",
        category: "Timetable",
        title: "Daily Timetable & Schedule Planner",
        description: "View weekly class schedule, subject routines, and tuition timings",
        icon: CalIcon,
        color: "text-emerald-500",
        bgColor: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800",
        tab: "planner",
        badge: "Timetable",
        keywords: ["timetable", "planner", "schedule", "routine", "subject", "classes"]
      },
      {
        id: "mod-habits",
        category: "Habits",
        title: "Academic Habit Tracker",
        description: "Build daily study streaks, water intake, reading, and revision routines",
        icon: Flame,
        color: "text-amber-500",
        bgColor: "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800",
        tab: "habits",
        badge: "Habits",
        keywords: ["habits", "tracker", "streak", "routine", "reading", "consistency"]
      },
      {
        id: "mod-calendar",
        category: "Calendar",
        title: "Interactive Academic Calendar",
        description: "Track board exam dates, holiday schedule, and study milestone events",
        icon: BookOpen,
        color: "text-sky-500",
        bgColor: "bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800",
        tab: "calendar",
        badge: "Calendar",
        keywords: ["calendar", "dates", "exam date", "events", "holidays", "milestones"]
      },
      {
        id: "mod-10daytest",
        category: "10-Day Test",
        title: "10-Day Test Series & Syllabus Tracker",
        description: "Comprehensive 10-day test prep, mock exam papers, and syllabus completion",
        icon: Target,
        color: "text-fuchsia-500",
        bgColor: "bg-fuchsia-50 dark:bg-fuchsia-950/40 border-fuchsia-200 dark:border-fuchsia-800",
        tab: "assessment",
        badge: "10-Day Test",
        keywords: ["10-day test", "test series", "assessment", "syllabus", "mock test", "exam paper", "revision"]
      },
      {
        id: "mod-games",
        category: "Games",
        title: "Educational Games Hub",
        description: "Play Math Speed Challenge, Memory Grid, Physics Blitz & Syllabus Quest",
        icon: Gamepad2,
        color: "text-indigo-500",
        bgColor: "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800",
        tab: "games",
        badge: "Games",
        keywords: ["games", "math challenge", "physics blitz", "memory grid", "quiz", "fun", "game"]
      },
      {
        id: "mod-ai",
        category: "AI Chats",
        title: "AI Tutor & Doubt Solver",
        description: "Ask homework questions, scan textbook problems with camera, or chat with AI",
        icon: Sparkles,
        color: "text-purple-500",
        bgColor: "bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800",
        tab: "assistant",
        badge: "AI Chats",
        keywords: ["ai", "ai tutor", "chat", "doubt", "solver", "scanner", "camera", "homework help"]
      },
      {
        id: "mod-chat",
        category: "Global Chat",
        title: "Flagship Community & Class Chat",
        description: "Chat in Global General room, Class Room, or 1-on-1 with Study Friends",
        icon: MessageSquare,
        color: "text-teal-500",
        bgColor: "bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800",
        tab: "chat",
        badge: "Global Chat",
        keywords: ["chat", "community", "global chat", "class chat", "friends", "study buddy", "group"]
      },
      {
        id: "mod-analytics",
        category: "Analytics",
        title: "Study Performance Analytics",
        description: "View daily study hours, subject distribution, XP progression, and stats",
        icon: BarChart3,
        color: "text-cyan-500",
        bgColor: "bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-800",
        tab: "analytics",
        badge: "Analytics",
        keywords: ["analytics", "stats", "performance", "study hours", "xp", "charts", "graphs"]
      },
      {
        id: "mod-profile",
        category: "Profile",
        title: "User Profile & Badges",
        description: `${profile.fullName} • Level ${profile.level} • ${profile.xp} XP • ${profile.badges.length} Badges Earned`,
        icon: User,
        color: "text-lime-600",
        bgColor: "bg-lime-50 dark:bg-lime-950/40 border-lime-200 dark:border-lime-800",
        tab: "profile",
        badge: "Profile",
        keywords: ["profile", "account", "level", "xp", "badges", "avatar", "user"]
      },
      {
        id: "mod-settings",
        category: "Settings",
        title: "App Settings & Preferences",
        description: "Toggle Dark Mode, font size, high contrast, sound chimes, and account options",
        icon: Settings,
        color: "text-slate-600",
        bgColor: "bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700",
        tab: "settings",
        badge: "Settings",
        keywords: ["settings", "preferences", "dark mode", "theme", "sound", "contrast", "text size"]
      },

      // Games Sub-Items
      {
        id: "game-math",
        category: "Games",
        title: "Math Speed Sprint Game",
        description: "Practice rapid mental calculation, algebra, and arithmetic under time pressure",
        icon: Gamepad2,
        color: "text-indigo-500",
        bgColor: "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800",
        tab: "games",
        badge: "Math Game",
        keywords: ["math game", "speed math", "calculation", "mental math"]
      },
      {
        id: "game-physics",
        category: "Games",
        title: "Physics Formula Blitz Game",
        description: "Test your formula memory for CBSE Physics electrostatics, optics & mechanics",
        icon: Zap,
        color: "text-amber-500",
        bgColor: "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800",
        tab: "games",
        badge: "Physics Game",
        keywords: ["physics game", "formula blitz", "gauss law", "optics"]
      },
      {
        id: "game-memory",
        category: "Games",
        title: "Cognitive Memory Grid Game",
        description: "Improve visual memory and spatial pattern recall with cognitive grids",
        icon: Gamepad2,
        color: "text-purple-500",
        bgColor: "bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800",
        tab: "games",
        badge: "Memory Game",
        keywords: ["memory grid", "cognitive", "brain training"]
      }
    ];

    // 2. Real User Homework Tasks
    tasks.forEach((t) => {
      list.push({
        id: `task-${t.id}`,
        category: "Homework",
        title: `Homework: ${t.title}`,
        description: `Subject: ${t.subjectTag || "General"} • Priority: ${t.priority} • Status: ${t.completed ? "Completed" : "Pending"}`,
        icon: ClipboardList,
        color: t.completed ? "text-emerald-500" : "text-blue-500",
        bgColor: "bg-blue-50/70 dark:bg-blue-950/30 border-blue-200/60 dark:border-blue-800/60",
        tab: "tasks",
        badge: t.priority,
        actionType: "navigate",
        keywords: [t.title.toLowerCase(), (t.subjectTag || "").toLowerCase(), t.priority.toLowerCase(), "homework", "task"]
      });
    });

    // 3. Real User Alarms
    alarms.forEach((a) => {
      list.push({
        id: `alarm-${a.id}`,
        category: "Alarm",
        title: `Alarm: ${a.time} - ${a.label || a.subject || "Study Alarm"}`,
        description: `Subject: ${a.subject || "General"} • Challenge: ${a.challengeMode ? "Math Problem" : "Standard"} • ${a.isActive ? "Active" : "Disabled"}`,
        icon: Bell,
        color: "text-rose-500",
        bgColor: "bg-rose-50/70 dark:bg-rose-950/30 border-rose-200/60 dark:border-rose-800/60",
        tab: "alarms",
        badge: a.time,
        actionType: "navigate",
        keywords: [a.time.toLowerCase(), (a.label || "").toLowerCase(), (a.subject || "").toLowerCase(), "alarm", "wake up"]
      });
    });

    // 4. Real User Timetable
    timetable.forEach((tm) => {
      list.push({
        id: `tt-${tm.id}`,
        category: "Timetable",
        title: `Timetable: ${tm.subject} (${tm.day})`,
        description: `Time: ${tm.time} • Topic: ${tm.topic || "Chapter Review"}`,
        icon: CalIcon,
        color: "text-emerald-500",
        bgColor: "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200/60 dark:border-emerald-800/60",
        tab: "planner",
        badge: tm.day,
        keywords: [tm.subject.toLowerCase(), tm.day.toLowerCase(), tm.time.toLowerCase(), (tm.topic || "").toLowerCase(), "timetable", "class"]
      });
    });

    // 5. Real User Habits
    habits.forEach((h) => {
      list.push({
        id: `habit-${h.id}`,
        category: "Habits",
        title: `Habit: ${h.name}`,
        description: `Completed: ${h.datesCompleted.length} Days • Difficulty: ${h.difficulty || "Medium"} • XP Reward: ${h.xpReward || 30}`,
        icon: Flame,
        color: "text-amber-500",
        bgColor: "bg-amber-50/70 dark:bg-amber-950/30 border-amber-200/60 dark:border-amber-800/60",
        tab: "habits",
        badge: `${h.datesCompleted.length} Days`,
        keywords: [h.name.toLowerCase(), (h.subject || "").toLowerCase(), "habit", "streak", "daily"]
      });
    });

    return list;
  }, [tasks, alarms, timetable, habits, profile]);

  // Filter items based on user query
  const filteredResults = useMemo(() => {
    if (!query.trim()) return [];

    const q = query.toLowerCase().trim();
    return allSearchableItems.filter((item) => {
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchDesc = item.description.toLowerCase().includes(q);
      const matchCat = item.category.toLowerCase().includes(q);
      const matchKw = item.keywords?.some((k) => k.includes(q));
      return matchTitle || matchDesc || matchCat || matchKw;
    });
  }, [query, allSearchableItems]);

  // Key navigation in result list
  const handleKeyDownInInput = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (filteredResults.length ? (prev + 1) % filteredResults.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (filteredResults.length ? (prev - 1 + filteredResults.length) % filteredResults.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredResults.length > 0) {
        const item = filteredResults[selectedIndex] || filteredResults[0];
        handleSelectResult(item);
      } else if (query.trim()) {
        // Fallback: ask AI with this query!
        saveRecentSearch(query);
        onNavigate("assistant");
        onClose();
      }
    }
  };

  const handleSelectResult = (item: SearchResultItem) => {
    saveRecentSearch(query || item.title);
    if (item.actionType === "toggleAlarm" && item.payload && onToggleAlarm) {
      onToggleAlarm(item.payload);
    } else if (item.actionType === "completeTask" && item.payload && onToggleTask) {
      onToggleTask(item.payload);
    } else {
      onNavigate(item.tab);
    }
    onClose();
  };

  const triggerCameraScanner = () => {
    setShowCameraModal(true);
    setCamStreamActive(true);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 sm:pt-16 md:pt-20 px-3 sm:px-4 bg-slate-950/60 backdrop-blur-md transition-all">
        
        {/* Backdrop click to close */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 z-0"
        />

        {/* Main Floating Glassmorphism Search Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: -20 }}
          transition={{ type: "spring", stiffness: 380, damping: 28 }}
          className="relative z-10 w-full max-w-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-slate-200/70 dark:border-slate-800/80 rounded-[2.2rem] shadow-[0_25px_70px_-15px_rgba(79,70,229,0.35)] overflow-hidden flex flex-col max-h-[85vh]"
        >
          {/* Top Search Input Bar */}
          <div className="p-4 sm:p-5 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center gap-3 relative">
            <div className="p-2.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl shrink-0">
              <Search className="w-5 h-5" />
            </div>

            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              onKeyDown={handleKeyDownInInput}
              placeholder="Search Homework, Alarms, Timetable, Habits, 10-Day Test, Games, AI Chats..."
              className="flex-1 bg-transparent text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
            />

            {/* Quick Action Icons: Clear, Voice Search, Camera, ESC */}
            <div className="flex items-center gap-1.5 shrink-0">
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 rounded-xl transition cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              {/* Voice Search Button */}
              <button
                onClick={toggleVoiceSearch}
                className={`p-2.5 rounded-xl transition cursor-pointer relative ${
                  isListening
                    ? "bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/30"
                    : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400"
                }`}
                title="Voice Search"
              >
                <Mic className="w-4 h-4" />
                {isListening && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping" />
                )}
              </button>

              {/* Camera Shortcut Button */}
              <button
                onClick={triggerCameraScanner}
                className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl transition cursor-pointer"
                title="Camera Doubt Scanner"
              >
                <Camera className="w-4 h-4" />
              </button>

              {/* Close button */}
              <button
                onClick={onClose}
                className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 rounded-xl transition cursor-pointer"
              >
                <span className="text-[10px] font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                  ESC
                </span>
              </button>
            </div>
          </div>

          {/* Voice Search Listening Indicator */}
          <AnimatePresence>
            {isListening && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-gradient-to-r from-rose-500/10 via-indigo-500/10 to-purple-500/10 px-5 py-3 border-b border-rose-500/20 flex items-center justify-between text-xs font-bold text-rose-600 dark:text-rose-400"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-rose-500 rounded-full animate-ping" />
                  <span>Listening to your voice... Speak your query clearly!</span>
                </div>
                <button
                  onClick={toggleVoiceSearch}
                  className="text-[10px] bg-rose-500 text-white px-2.5 py-1 rounded-lg font-extrabold cursor-pointer"
                >
                  Done
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Content Area: Suggestions vs Active Search Results */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 custom-scrollbar">
            
            {/* 1. NO QUERY STATE -> SHOW RECENT SEARCHES & INSTANT CATEGORY SHORTCUTS */}
            {!query.trim() && (
              <div className="space-y-6">
                
                {/* Recent Searches Header */}
                {recentSearches.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-indigo-500" /> Recent Searches
                      </span>
                      <button
                        onClick={clearAllRecent}
                        className="text-[10px] font-bold text-slate-400 hover:text-rose-500 transition cursor-pointer flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" /> Clear
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {recentSearches.map((term, idx) => (
                        <div
                          key={idx}
                          onClick={() => setQuery(term)}
                          className="px-3 py-1.5 bg-slate-100/80 dark:bg-slate-800/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200/50 dark:border-slate-800 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer group"
                        >
                          <span>{term}</span>
                          <button
                            onClick={(e) => removeRecentSearch(e, term)}
                            className="text-slate-400 hover:text-rose-500 opacity-60 group-hover:opacity-100 transition"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Instant Category Navigation Grid */}
                <div className="space-y-2.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-amber-500" /> Instant Module Jump
                  </span>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                    {QUICK_SUGGESTIONS.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.tab}
                          onClick={() => {
                            onNavigate(item.tab);
                            onClose();
                          }}
                          className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition hover:scale-[1.02] cursor-pointer ${item.color}`}
                        >
                          <Icon className="w-4 h-4 shrink-0" />
                          <span className="text-xs font-extrabold truncate">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Popular Smart Prompts */}
                <div className="space-y-2.5 pt-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                    <Lightbulb className="w-3 h-3 text-cyan-500" /> Popular Smart Queries
                  </span>

                  <div className="space-y-1.5">
                    {[
                      { text: "Physics Gauss Law Derivation Summary", tab: "chat" },
                      { text: "10-Day Test CBSE Mock Papers", tab: "assessment" },
                      { text: "Math Speed Calculation Game", tab: "games" },
                      { text: "Ask AI Tutor to solve textbook doubts", tab: "assistant" }
                    ].map((prompt, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setQuery(prompt.text);
                        }}
                        className="w-full p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 hover:bg-indigo-50/80 dark:hover:bg-indigo-950/40 border border-slate-100 dark:border-slate-800 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center justify-between transition cursor-pointer"
                      >
                        <span className="truncate">"{prompt.text}"</span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {/* 2. QUERY ACTIVE -> RENDER SEARCH RESULTS WITH HIGHLIGHTS */}
            {query.trim() && (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                    Found {filteredResults.length} Matching Results
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400">
                    Use <kbd className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">↑</kbd> <kbd className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">↓</kbd> to navigate
                  </span>
                </div>

                {filteredResults.length === 0 ? (
                  <EmptyStateCard
                    icon={<Search className="w-8 h-8 text-indigo-500" />}
                    title={`No direct matches found for "${query}"`}
                    description="Don't worry! Ask StudyMate AI Tutor directly to search solutions, generate practice notes, or summarize this topic."
                    motivationalQuote="Curiosity is the engine of achievement. Ask AI anything!"
                    aiSuggestions={[
                      `Explain ${query} simply`,
                      `Solve sample problems on ${query}`,
                      `Create test questions for ${query}`
                    ]}
                    onSelectSuggestion={() => {
                      saveRecentSearch(query);
                      onNavigate("assistant");
                      onClose();
                    }}
                    action={{
                      label: `✨ Ask AI Tutor "${query}"`,
                      onClick: () => {
                        saveRecentSearch(query);
                        onNavigate("assistant");
                        onClose();
                      }
                    }}
                  />
                ) : (
                  <div className="space-y-2">
                    {filteredResults.map((item, index) => {
                      const Icon = item.icon;
                      const isSelected = index === selectedIndex;
                      return (
                        <motion.div
                          key={`${item.id}-${index}`}
                          layout
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.15, delay: index * 0.02 }}
                          onClick={() => handleSelectResult(item)}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            isSelected
                              ? "bg-indigo-50/90 dark:bg-indigo-950/80 border-indigo-300 dark:border-indigo-700 shadow-md ring-2 ring-indigo-500/20"
                              : "bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 border-slate-200/50 dark:border-slate-800"
                          }`}
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className={`p-2.5 rounded-xl border shrink-0 ${item.bgColor}`}>
                              <Icon className={`w-5 h-5 ${item.color}`} />
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100 truncate">
                                  {highlightMatch(item.title, query)}
                                </h4>
                                {item.badge && (
                                  <span className="text-[9px] font-extrabold bg-slate-200/80 dark:bg-slate-700/80 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md shrink-0">
                                    {item.badge}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                {highlightMatch(item.description, query)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="hidden sm:inline-block text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-100/80 dark:bg-indigo-950 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800">
                              Jump to {item.category}
                            </span>
                            <CornerDownLeft className="w-4 h-4 text-slate-400" />
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Footer Bar */}
          <div className="p-3 px-5 bg-slate-50/80 dark:bg-slate-900/80 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400 font-medium">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="font-mono bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[9px] text-slate-700 dark:text-slate-300">↵</kbd> Select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="font-mono bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[9px] text-slate-700 dark:text-slate-300">ESC</kbd> Close
              </span>
            </div>
            <span className="font-bold text-indigo-500 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> StudyMate Flagship Smart Search
            </span>
          </div>

        </motion.div>
      </div>

      {/* Camera Doubt Scanner Quick Modal */}
      <AnimatePresence>
        {showCameraModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white space-y-4 text-center shadow-2xl"
            >
              <div className="w-12 h-12 bg-indigo-600/20 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto border border-indigo-500/30">
                <Camera className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black font-display">Camera Question Scanner</h3>
              <p className="text-xs text-slate-300">
                Capture any textbook question or diagram to solve with StudyMate AI Tutor.
              </p>

              <div className="relative aspect-video bg-slate-950 rounded-2xl border-2 border-dashed border-indigo-500/40 flex items-center justify-center overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600&q=80"
                  alt="Textbook Scan Preview"
                  className="w-full h-full object-cover opacity-70"
                />
                <div className="absolute inset-0 border-2 border-amber-400/80 rounded-xl m-6 animate-pulse flex items-center justify-center">
                  <span className="text-[10px] font-bold bg-amber-400 text-slate-950 px-2 py-0.5 rounded-md">
                    AI Scanning Box
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowCameraModal(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowCameraModal(false);
                    onNavigate("assistant");
                    onClose();
                  }}
                  className="flex-1 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-xs rounded-xl shadow-lg cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" /> Analyze & Solve
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
}
