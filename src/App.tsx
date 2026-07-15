import React, { useState, useEffect, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "motion/react";
import { UserProfile, Task, Alarm, TimetableItem, Habit, Badge, AppNotification, DailyActivity } from "./types";
import ErrorBoundary from "./components/ErrorBoundary";
import { auth, signOut } from "./lib/firebase";

// Privacy-respecting localStorage proxy wrapper to prevent caching sensitive session data unless explicitly enabled
const customLocalStorage = {
  getItem(key: string): string | null {
    const remember = window.localStorage.getItem("studymate_remember_me") === "true";
    if (key === "studymate_remember_me" || remember) {
      return window.localStorage.getItem(key);
    }
    return null;
  },
  setItem(key: string, value: string): void {
    if (key === "studymate_remember_me" || window.localStorage.getItem("studymate_remember_me") === "true") {
      window.localStorage.setItem(key, value);
    }
  },
  removeItem(key: string): void {
    window.localStorage.removeItem(key);
  },
  clear(): void {
    window.localStorage.clear();
  }
};

// Privacy-respecting sessionStorage proxy wrapper
const customSessionStorage = {
  getItem(key: string): string | null {
    const remember = window.localStorage.getItem("studymate_remember_me") === "true";
    if (remember) {
      return window.sessionStorage.getItem(key);
    }
    return null;
  },
  setItem(key: string, value: string): void {
    if (window.localStorage.getItem("studymate_remember_me") === "true") {
      window.sessionStorage.setItem(key, value);
    }
  },
  removeItem(key: string): void {
    window.sessionStorage.removeItem(key);
  },
  clear(): void {
    window.sessionStorage.clear();
  }
};

const localStorage = customLocalStorage;
const sessionStorage = customSessionStorage;

import { 
  DEFAULT_BADGES, MOTIVATIONAL_QUOTES, SUBJECT_PRESETS, EXAM_PRESETS, DEFAULT_HABITS 
} from "./data";

// Import custom screen modules eagerly for critical path
import GoogleLogin from "./components/GoogleLogin";
import Onboarding from "./components/Onboarding";
import WelcomeWalkthrough from "./components/WelcomeWalkthrough";
import Dashboard from "./components/Dashboard";
import Tasks from "./components/Tasks";
import Alarms, { startRingtonePlayback, stopRingtonePlayback } from "./components/Alarms";
import Planner from "./components/Planner";
import Habits from "./components/Habits";
import Pomodoro from "./components/Pomodoro";

// Lazily load heavier secondary pages for optimum bundle chunking
const CalendarView = lazy(() => import("./components/CalendarView"));
const Analytics = lazy(() => import("./components/Analytics"));
const SyllabusTest = lazy(() => import("./components/SyllabusTest"));
const StudyMateAI = lazy(() => import("./components/StudyMateAI"));
const EducationalGames = lazy(() => import("./components/EducationalGames"));
const ProfileView = lazy(() => import("./components/ProfileView"));
const SettingsView = lazy(() => import("./components/SettingsView"));
const CommunityChat = lazy(() => import("./components/CommunityChat"));

// Visual loading shimmer skeleton for lazy chunks
const LoadingTabPlaceholder = () => (
  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-pulse min-h-[400px]">
    <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center mb-4">
      <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin" />
    </div>
    <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Loading Feature Module</h3>
    <p className="text-xs text-slate-400 mt-1">Optimizing performance with dynamic bundle splitting...</p>
  </div>
);

// Icons for navigation rails
import { 
  LayoutDashboard, ClipboardList, Bell, Calendar as CalIcon, Flame, 
  Clock, Sparkles, BarChart3, User, Settings, ShieldCheck, Menu, X, HelpCircle, RefreshCw, BookOpen,
  MessageSquare, Gamepad2
} from "lucide-react";

const MORNING_MOTIVATIONAL_POOL = [
  {
    title: "🌅 Good Morning! Make Your Study Easy",
    message: "Good Morning! StudyMate is here to make your study easy. Try starting today with a relaxed 25-minute Pomodoro block to master your first topic effortlessly.",
    type: "success" as const
  },
  {
    title: "🌅 Good Morning! Clear Progress Today",
    message: "Good Morning! Focus on small, steady achievements today. Let's make your study easy by checking off just one chapter topic from your list.",
    type: "info" as const
  },
  {
    title: "🌅 Good Morning! Joy of Learning",
    message: "Good Morning! Breaking huge CBSE syllabus goals into tiny topics makes your study easy and exciting. What topic are we mastering first today?",
    type: "reminder" as const
  },
  {
    title: "🌅 Good Morning! Active Learning Boost",
    message: "Good Morning! Boost your memory retention effortlessly. Doing active recall today makes your study easy and keeps your mind extremely sharp.",
    type: "success" as const
  },
  {
    title: "🌅 Good Morning! Simple and Consistent",
    message: "Good Morning! Consistency is key. StudyMate's early alarms and trackers are ready to make your study easy and stress-free every morning.",
    type: "info" as const
  },
  {
    title: "🌅 Good Morning! Dynamic Mindset",
    message: "Good Morning! Ready to learn? Plan your daily study slot now to make your study easy, focused, and incredibly productive today.",
    type: "reminder" as const
  },
  {
    title: "🌅 Good Morning! Smart Textbook Solutions",
    message: "Good Morning! Got a complex homework doubt? Use the AI Tutor scanner to crop your question and make your study easy with instant solutions.",
    type: "success" as const
  },
  {
    title: "🌅 Good Morning! Habit Mastery",
    message: "Good Morning! Build powerful academic routines one step at a time. Tracking your daily progress makes your study easy and deeply satisfying.",
    type: "info" as const
  },
  {
    title: "🌅 Good Morning! Deep Focus Sprint",
    message: "Good Morning! A fresh day brings fresh potential. Set a distraction-free Pomodoro timer right now to make your study easy and laser-focused.",
    type: "reminder" as const
  },
  {
    title: "🌅 Good Morning! Take It Step-by-Step",
    message: "Good Morning! Trust your abilities. Tracking your syllabus chapters step-by-step makes your study easy, organized, and rewarding.",
    type: "success" as const
  }
];

const TAB_THEMES: Record<string, { gradient: string; activeBg: string; activeText: string; inactiveBg: string; inactiveText: string; shadow: string; border: string }> = {
  dashboard: { gradient: "from-indigo-600 to-blue-600", activeBg: "bg-gradient-to-r from-indigo-600 to-blue-600", activeText: "text-white", inactiveBg: "bg-indigo-50/50 dark:bg-indigo-950/20", inactiveText: "text-indigo-600/70 dark:text-indigo-400/70 hover:text-indigo-600 dark:hover:text-indigo-400", shadow: "shadow-indigo-500/20", border: "border-indigo-100 dark:border-indigo-950" },
  tasks: { gradient: "from-emerald-600 to-teal-600", activeBg: "bg-gradient-to-r from-emerald-600 to-teal-600", activeText: "text-white", inactiveBg: "bg-emerald-50/50 dark:bg-emerald-950/20", inactiveText: "text-emerald-600/70 dark:text-emerald-400/70 hover:text-emerald-600 dark:hover:text-emerald-400", shadow: "shadow-emerald-500/20", border: "border-emerald-100 dark:border-emerald-950" },
  alarms: { gradient: "from-rose-600 to-red-600", activeBg: "bg-gradient-to-r from-rose-600 to-red-600", activeText: "text-white", inactiveBg: "bg-rose-50/50 dark:bg-rose-950/20", inactiveText: "text-rose-600/70 dark:text-rose-400/70 hover:text-rose-600 dark:hover:text-rose-400", shadow: "shadow-rose-500/20", border: "border-rose-100 dark:border-rose-950" },
  planner: { gradient: "from-sky-600 to-indigo-600", activeBg: "bg-gradient-to-r from-sky-600 to-indigo-600", activeText: "text-white", inactiveBg: "bg-sky-50/50 dark:bg-sky-950/20", inactiveText: "text-sky-600/70 dark:text-sky-400/70 hover:text-sky-600 dark:hover:text-sky-400", shadow: "shadow-sky-500/20", border: "border-sky-100 dark:border-sky-950" },
  habits: { gradient: "from-amber-500 to-orange-600", activeBg: "bg-gradient-to-r from-amber-500 to-orange-600", activeText: "text-white", inactiveBg: "bg-amber-50/50 dark:bg-amber-950/20", inactiveText: "text-amber-600/70 dark:text-amber-400/70 hover:text-amber-600 dark:hover:text-amber-400", shadow: "shadow-amber-500/20", border: "border-amber-100 dark:border-amber-950" },
  calendar: { gradient: "from-violet-600 to-purple-600", activeBg: "bg-gradient-to-r from-violet-600 to-purple-600", activeText: "text-white", inactiveBg: "bg-violet-50/50 dark:bg-violet-950/20", inactiveText: "text-violet-600/70 dark:text-violet-400/70 hover:text-violet-600 dark:hover:text-violet-400", shadow: "shadow-violet-500/20", border: "border-violet-100 dark:border-violet-950" },
  syllabus: { gradient: "from-blue-600 to-cyan-600", activeBg: "bg-gradient-to-r from-blue-600 to-cyan-600", activeText: "text-white", inactiveBg: "bg-blue-50/50 dark:bg-blue-950/20", inactiveText: "text-blue-600/70 dark:text-blue-400/70 hover:text-blue-600 dark:hover:text-blue-400", shadow: "shadow-blue-500/20", border: "border-blue-100 dark:border-blue-950" },
  assessment: { gradient: "from-fuchsia-600 to-rose-600", activeBg: "bg-gradient-to-r from-fuchsia-600 to-rose-600", activeText: "text-white", inactiveBg: "bg-fuchsia-50/50 dark:bg-fuchsia-950/20", inactiveText: "text-fuchsia-600/70 dark:text-fuchsia-400/70 hover:text-fuchsia-600 dark:hover:text-fuchsia-400", shadow: "shadow-fuchsia-500/20", border: "border-fuchsia-100 dark:border-fuchsia-950" },
  pomodoro: { gradient: "from-orange-500 to-red-500", activeBg: "bg-gradient-to-r from-orange-500 to-red-500", activeText: "text-white", inactiveBg: "bg-orange-50/50 dark:bg-orange-950/20", inactiveText: "text-orange-600/70 dark:text-orange-400/70 hover:text-orange-600 dark:hover:text-orange-400", shadow: "shadow-orange-500/20", border: "border-orange-100 dark:border-orange-950" },
  assistant: { gradient: "from-purple-600 to-fuchsia-600", activeBg: "bg-gradient-to-r from-purple-600 to-fuchsia-600", activeText: "text-white", inactiveBg: "bg-purple-50/50 dark:bg-purple-950/20", inactiveText: "text-purple-600/70 dark:text-purple-400/70 hover:text-purple-600 dark:hover:text-purple-400", shadow: "shadow-purple-500/20", border: "border-purple-100 dark:border-purple-950" },
  chat: { gradient: "from-teal-600 to-emerald-600", activeBg: "bg-gradient-to-r from-teal-600 to-emerald-600", activeText: "text-white", inactiveBg: "bg-teal-50/50 dark:bg-teal-950/20", inactiveText: "text-teal-600/70 dark:text-teal-400/70 hover:text-teal-600 dark:hover:text-teal-400", shadow: "shadow-teal-500/20", border: "border-teal-100 dark:border-teal-950" },
  analytics: { gradient: "from-cyan-600 to-blue-600", activeBg: "bg-gradient-to-r from-cyan-600 to-blue-600", activeText: "text-white", inactiveBg: "bg-cyan-50/50 dark:bg-cyan-950/20", inactiveText: "text-cyan-600/70 dark:text-cyan-400/70 hover:text-cyan-600 dark:hover:text-cyan-400", shadow: "shadow-cyan-500/20", border: "border-cyan-100 dark:border-cyan-950" },
  profile: { gradient: "from-lime-600 to-emerald-600", activeBg: "bg-gradient-to-r from-lime-600 to-emerald-600", activeText: "text-white", inactiveBg: "bg-lime-50/50 dark:bg-lime-950/20", inactiveText: "text-lime-600/70 dark:text-lime-400/70 hover:text-lime-600 dark:hover:text-lime-400", shadow: "shadow-lime-500/20", border: "border-lime-100 dark:border-lime-950" },
  settings: { gradient: "from-slate-600 to-slate-800", activeBg: "bg-gradient-to-r from-slate-600 to-slate-800", activeText: "text-white", inactiveBg: "bg-slate-100/50 dark:bg-slate-800/40", inactiveText: "text-slate-500/70 dark:text-slate-400/70 hover:text-slate-600 dark:hover:text-slate-400", shadow: "shadow-slate-500/20", border: "border-slate-200 dark:border-slate-800" }
};

export default function App() {
  // Gmail Session Authentication
  const [loggedInEmail, setLoggedInEmail] = useState<string | null>(() => {
    const remember = window.localStorage.getItem("studymate_remember_me") === "true";
    return remember ? window.localStorage.getItem("studymate_logged_in_email") : null;
  });

  const [sessionToken, setSessionToken] = useState<string | null>(() => {
    const remember = window.localStorage.getItem("studymate_remember_me") === "true";
    return remember ? window.localStorage.getItem("studymate_token") : null;
  });

  const [sessionRefreshToken, setSessionRefreshToken] = useState<string | null>(() => {
    const remember = window.localStorage.getItem("studymate_remember_me") === "true";
    return remember ? window.localStorage.getItem("studymate_refresh_token") : null;
  });

  const isRememberMe = () => {
    return window.localStorage.getItem("studymate_remember_me") === "true";
  };

  // Dynamic user storage partition key generator
  const getStorageKey = (key: string) => {
    if (!loggedInEmail) return key;
    const dbPrefix = loggedInEmail.replace(/[^a-zA-Z0-9]/g, "_");
    return `${key}_${dbPrefix}`;
  };

  // Global configuration preferences
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [timetable, setTimetable] = useState<TimetableItem[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [activityLog, setActivityLog] = useState<DailyActivity[]>([]);
  const [studyHoursToday, setStudyHoursToday] = useState(2);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNewSignupWelcome, setShowNewSignupWelcome] = useState<boolean>(() => {
    const remember = window.localStorage.getItem("studymate_remember_me") === "true";
    if (!remember) return false;
    const loggedEmail = window.localStorage.getItem("studymate_logged_in_email") || "default";
    const dbPrefix = loggedEmail.replace(/[^a-zA-Z0-9]/g, "_");
    return window.localStorage.getItem(`studymate_show_welcome_${dbPrefix}`) === "true";
  });
  
  // Navigation states
  const [currentTab, setCurrentTab] = useState("dashboard");
  const [darkMode, setDarkMode] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationMenuOpen, setNotificationMenuOpen] = useState(false);
  const [focusLockdown, setFocusLockdown] = useState(false);

  // Fullscreen states for AI Assistant and Community Chat
  const [aiFullScreen, setAiFullScreen] = useState(false);
  const [chatFullScreen, setChatFullScreen] = useState(false);

  // Helper functions for browser-native fullscreen
  const triggerBrowserFullscreen = (element: HTMLElement) => {
    try {
      if (element.requestFullscreen) {
        element.requestFullscreen();
      } else if ((element as any).webkitRequestFullscreen) {
        (element as any).webkitRequestFullscreen();
      } else if ((element as any).msRequestFullscreen) {
        (element as any).msRequestFullscreen();
      }
    } catch (e) {
      console.warn("Native browser fullscreen blocked or not supported:", e);
    }
  };

  const exitBrowserFullscreen = () => {
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen();
      }
    } catch (e) {
      console.warn("Native browser exit fullscreen blocked or not supported:", e);
    }
  };

  // Sync React state if user exits native fullscreen via browser mechanisms (e.g. Esc key)
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!document.fullscreenElement;
      if (!isCurrentlyFullscreen) {
        setAiFullScreen(false);
        setChatFullScreen(false);
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
      document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
    };
  }, []);

  // Exit fullscreen state automatically when the user changes screens/tabs
  useEffect(() => {
    setAiFullScreen(false);
    setChatFullScreen(false);
    exitBrowserFullscreen();
  }, [currentTab]);

  const toggleAiFullScreen = () => {
    const nextVal = !aiFullScreen;
    setAiFullScreen(nextVal);
    
    // Attempt native browser fullscreen for premium experience
    setTimeout(() => {
      const panel = document.getElementById("studymate_ai_panel");
      if (panel) {
        if (nextVal) {
          triggerBrowserFullscreen(panel);
        } else {
          exitBrowserFullscreen();
        }
      }
    }, 50);
  };

  const toggleChatFullScreen = () => {
    const nextVal = !chatFullScreen;
    setChatFullScreen(nextVal);

    // Attempt native browser fullscreen
    setTimeout(() => {
      const panel = document.getElementById("studymate_chat_panel");
      if (panel) {
        if (nextVal) {
          triggerBrowserFullscreen(panel);
        } else {
          exitBrowserFullscreen();
        }
      }
    }, 50);
  };

  // Alarm clock ticking states
  const [triggeredAlarm, setTriggeredAlarm] = useState<Alarm | null>(null);
  const [lastTriggeredTime, setLastTriggeredTime] = useState("");

  // Loading indicator for local persistence boot
  const [booted, setBooted] = useState(false);

  // Quick In-app Notification Adder
  const handleAddNotification = (
    title: string, 
    message: string, 
    type: "info" | "alert" | "success" | "reminder"
  ) => {
    if (focusLockdown) {
      console.log(`[Focus Mode] Suppressed notification: ${title}`);
      return;
    }
    const newNotice: AppNotification = {
      id: `notice-${Date.now()}`,
      title,
      message,
      type,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      read: false
    };
    setNotifications((prev) => {
      const updated = [newNotice, ...prev];
      localStorage.setItem(getStorageKey("studymate_notifications"), JSON.stringify(updated));
      return updated;
    });
  };

  const handleMarkAsRead = (id: string) => {
    setNotifications((prev) => {
      const updated = prev.map(n => n.id === id ? { ...n, read: true } : n);
      localStorage.setItem(getStorageKey("studymate_notifications"), JSON.stringify(updated));
      return updated;
    });
  };

  const handleClearSeenNotifications = () => {
    setNotifications((prev) => {
      const updated = prev.filter(n => !n.read);
      localStorage.setItem(getStorageKey("studymate_notifications"), JSON.stringify(updated));
      return updated;
    });
  };

  const handleClearAllNotifications = () => {
    setNotifications([]);
    localStorage.setItem(getStorageKey("studymate_notifications"), JSON.stringify([]));
  };

  const handleTriggerManualMorningNudge = () => {
    const today = new Date();
    const daySeed = today.getDate() + today.getMonth() * 31;
    const dailyIndex = daySeed % MORNING_MOTIVATIONAL_POOL.length;
    const morningNotice = MORNING_MOTIVATIONAL_POOL[dailyIndex];
    handleAddNotification(morningNotice.title, morningNotice.message, morningNotice.type);
    
    // Play a motivational chime sound
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {
      // Ignore audio error
    }
  };

  // Log in Success handler
  const handleLoginSuccess = (email: string, token: string, refreshToken?: string, rememberMe?: boolean) => {
    if (rememberMe) {
      window.localStorage.setItem("studymate_remember_me", "true");
      window.localStorage.setItem("studymate_logged_in_email", email);
      window.localStorage.setItem("studymate_token", token);
      if (refreshToken) {
        window.localStorage.setItem("studymate_refresh_token", refreshToken);
      }
    } else {
      window.localStorage.clear();
      window.sessionStorage.clear();
    }
    setLoggedInEmail(email);
    setSessionToken(token);
    if (refreshToken) {
      setSessionRefreshToken(refreshToken);
    }
  };

  // Log Out / Clear session handler
  const handleLogout = () => {
    // Fire-and-forget logout on server to clear HTTP-only cookies
    fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    
    // Clear Firebase Client Auth session
    signOut(auth).catch((e) => console.warn("Firebase signOut error:", e));

    window.localStorage.clear();
    window.sessionStorage.clear();

    setLoggedInEmail(null);
    setSessionToken(null);
    setSessionRefreshToken(null);
    setProfile(null);
    setTasks([]);
    setAlarms([]);
    setTimetable([]);
    setHabits([]);
    setBadges([]);
    setNotifications([]);
    setCurrentTab("dashboard");
  };

  // Helper to silently request a fresh access token using refresh token
  const refreshClientToken = async (): Promise<string | null> => {
    try {
      const storedRefreshToken = sessionRefreshToken || window.localStorage.getItem("studymate_refresh_token") || "";
      if (!storedRefreshToken) {
        handleLogout();
        return null;
      }
      
      const res = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: storedRefreshToken })
      });
      
      if (res.ok) {
        const data = await res.json();
        setSessionToken(data.token);
        if (data.refreshToken) {
          setSessionRefreshToken(data.refreshToken);
        }
        if (isRememberMe()) {
          window.localStorage.setItem("studymate_token", data.token);
          if (data.refreshToken) {
            window.localStorage.setItem("studymate_refresh_token", data.refreshToken);
          }
        }
        return data.token;
      } else if (res.status === 401 || res.status === 403) {
        console.warn("Refresh token expired or blacklisted. Enforcing clean logout.");
        handleLogout();
      }
    } catch (e) {
      console.warn("Token refresh communication failed:", e);
    }
    return null;
  };

  // Durable Google Cloud Sync status
  const [syncStatus, setSyncStatus] = useState<"synced" | "syncing" | "offline" | "idle">("synced");

  // Trigger automatic secure push to Google Cloud Database
  const triggerCloudSync = async (
    currentProfile?: UserProfile | null,
    currentTasks?: Task[],
    currentAlarms?: Alarm[],
    currentTimetable?: TimetableItem[],
    currentHabits?: Habit[],
    currentBadges?: Badge[],
    currentNotifications?: AppNotification[]
  ) => {
    if (!loggedInEmail) return;
    setSyncStatus("syncing");
    
    try {
      let token = sessionToken || window.localStorage.getItem("studymate_token") || "";
      const payload = {
        profile: currentProfile !== undefined ? currentProfile : profile,
        tasks: currentTasks !== undefined ? currentTasks : tasks,
        alarms: currentAlarms !== undefined ? currentAlarms : alarms,
        timetable: currentTimetable !== undefined ? currentTimetable : timetable,
        habits: currentHabits !== undefined ? currentHabits : habits,
        badges: currentBadges !== undefined ? currentBadges : badges,
        notifications: currentNotifications !== undefined ? currentNotifications : notifications,
        updatedAt: new Date().toISOString()
      };

      let res = await fetch("/api/sync/push", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.status === 401) {
        console.warn("Push token expired. Initiating silent token refresh...");
        const freshToken = await refreshClientToken();
        if (freshToken) {
          res = await fetch("/api/sync/push", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${freshToken}`
            },
            body: JSON.stringify(payload)
          });
        }
      }

      if (!res.ok) {
        throw new Error("Sync push rejected by server");
      }
      setSyncStatus("synced");
    } catch (error) {
      console.warn("[Cloud Sync Error] Connection failure, cached locally:", error);
      setSyncStatus("offline");
    }
  };

  const handleTriggerSync = async () => {
    await triggerCloudSync();
  };

  const handleDeleteAccount = async () => {
    const confirm1 = window.confirm("Are you absolutely sure you want to permanently delete your StudyMate account and all synchronized records? This cannot be undone.");
    if (!confirm1) return;
    const confirm2 = window.confirm("FINAL WARNING: All your tasks, study logs, streaks, and grades will be immediately wiped from Google Cloud. Type OK to proceed.");
    if (!confirm2) return;
    
    setSyncStatus("syncing");
    try {
      const token = sessionToken || window.localStorage.getItem("studymate_token") || "";
      const res = await fetch("/api/auth/delete-account", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (res.ok) {
        // Clear local storage prefix
        const dbPrefix = loggedInEmail ? loggedInEmail.replace(/[^a-zA-Z0-9]/g, "_") : "";
        if (dbPrefix) {
          localStorage.removeItem(`studymate_profile_${dbPrefix}`);
          localStorage.removeItem(`studymate_tasks_${dbPrefix}`);
          localStorage.removeItem(`studymate_alarms_${dbPrefix}`);
          localStorage.removeItem(`studymate_timetable_${dbPrefix}`);
          localStorage.removeItem(`studymate_habits_${dbPrefix}`);
          localStorage.removeItem(`studymate_badges_${dbPrefix}`);
          localStorage.removeItem(`studymate_notifications_${dbPrefix}`);
        }
        localStorage.removeItem("studymate_token");
        localStorage.removeItem("studymate_logged_in_email");
        
        setProfile(null);
        setTasks([]);
        setAlarms([]);
        setTimetable([]);
        setHabits([]);
        setBadges([]);
        setNotifications([]);
        setLoggedInEmail(null);
        setSyncStatus("idle");
        alert("Your account and linked database have been successfully deleted from our servers.");
      } else {
        throw new Error("Failed to delete account on server.");
      }
    } catch (err) {
      console.error("Account deletion failed:", err);
      alert("Network failure or connection error. Could not delete account from server. Please try again.");
      setSyncStatus("offline");
    }
  };

  // 1. Core Boot Loader with Auto-Restore Sync Pull
  useEffect(() => {
    if (!loggedInEmail) {
      setBooted(true);
      return;
    }

    const loadAndSyncData = async () => {
      setBooted(false);
      setSyncStatus("syncing");

      // A. Try to fetch from server first (reliable cloud sync / auto-restore)
      let serverData: any = null;
      let hasNetworkError = false;
      try {
        let token = sessionToken || window.localStorage.getItem("studymate_token") || "";
        let res = await fetch("/api/sync/pull", {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        if (res.status === 401) {
          // Attempt silent re-authentication to refresh the token automatically
          console.warn("Pull token expired. Silent reauthenticating...");
          const freshToken = await refreshClientToken();
          if (freshToken) {
            res = await fetch("/api/sync/pull", {
              headers: {
                "Authorization": `Bearer ${freshToken}`
              }
            });
          }
        }
        if (res.ok) {
          const result = await res.json();
          if (result.success && result.data) {
            serverData = result.data;
          }
        }
      } catch (err) {
        console.warn("Failed to contact sync server, falling back to offline cache:", err);
        hasNetworkError = true;
      }

      // B. Load / Merge data
      const dbPrefix = loggedInEmail.replace(/[^a-zA-Z0-9]/g, "_");
      const localProfileStr = localStorage.getItem(`studymate_profile_${dbPrefix}`);
      const localProfile = localProfileStr ? JSON.parse(localProfileStr) : null;

      let finalProfile: UserProfile | null = null;
      if (serverData && serverData.profile) {
        finalProfile = serverData.profile;
        localStorage.setItem(`studymate_profile_${dbPrefix}`, JSON.stringify(finalProfile));
      } else if (localProfile) {
        finalProfile = localProfile;
      }

      if (finalProfile) {
        const todayStr = new Date().toISOString().split("T")[0];
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split("T")[0];

        let nextStreak = finalProfile.streakCounter || 1;
        
        if (finalProfile.lastLoginDate && finalProfile.lastLoginDate !== todayStr) {
          const savedDays = localStorage.getItem(`studymate_${dbPrefix}_days_elapsed`);
          const currentDays = savedDays ? parseInt(savedDays) : 0;
          const nextDays = Math.min(currentDays + 1, 10);
          localStorage.setItem(`studymate_${dbPrefix}_days_elapsed`, String(nextDays));

          if (finalProfile.lastLoginDate === yesterdayStr) {
            nextStreak += 1;
            setTimeout(() => {
              handleAddNotification(
                "🔥 Consistency Streak Extended!",
                `Congratulations! You logged in yesterday and today to keep your streak alive. Current streak: ${nextStreak} days!`,
                "success"
              );
            }, 1000);
          } else {
            nextStreak = 1;
            setTimeout(() => {
              handleAddNotification(
                "💪 New Streak Started!",
                "Welcome back to StudyMate! Let's build a consistent daily study routine starting today.",
                "info"
              );
            }, 1000);
          }
        }

        finalProfile.streakCounter = nextStreak;
        finalProfile.lastLoginDate = todayStr;
        
        setProfile(finalProfile);
        localStorage.setItem(`studymate_profile_${dbPrefix}`, JSON.stringify(finalProfile));
      } else {
        setProfile(null);
      }

      // Load tasks
      let finalTasks: Task[] = [];
      if (serverData && serverData.tasks) {
        finalTasks = serverData.tasks;
      } else {
        const storedTasks = localStorage.getItem(`studymate_tasks_${dbPrefix}`);
        if (storedTasks) finalTasks = JSON.parse(storedTasks);
      }
      setTasks(finalTasks);
      localStorage.setItem(`studymate_tasks_${dbPrefix}`, JSON.stringify(finalTasks));

      // Load alarms
      let finalAlarms: Alarm[] = [];
      if (serverData && serverData.alarms) {
        finalAlarms = serverData.alarms;
      } else {
        const storedAlarms = localStorage.getItem(`studymate_alarms_${dbPrefix}`);
        if (storedAlarms) finalAlarms = JSON.parse(storedAlarms);
      }
      setAlarms(finalAlarms);
      localStorage.setItem(`studymate_alarms_${dbPrefix}`, JSON.stringify(finalAlarms));

      // Load timetable
      let finalTimetable: TimetableItem[] = [];
      if (serverData && serverData.timetable) {
        finalTimetable = serverData.timetable;
      } else {
        const storedTimetable = localStorage.getItem(`studymate_timetable_${dbPrefix}`);
        if (storedTimetable) finalTimetable = JSON.parse(storedTimetable);
      }
      setTimetable(finalTimetable);
      localStorage.setItem(`studymate_timetable_${dbPrefix}`, JSON.stringify(finalTimetable));

      // Load habits
      let finalHabits: Habit[] = [];
      if (serverData && serverData.habits) {
        finalHabits = serverData.habits;
      } else {
        const storedHabits = localStorage.getItem(`studymate_habits_${dbPrefix}`);
        if (storedHabits) finalHabits = JSON.parse(storedHabits);
      }
      setHabits(finalHabits);
      localStorage.setItem(`studymate_habits_${dbPrefix}`, JSON.stringify(finalHabits));

      // Load badges
      let finalBadges: Badge[] = [];
      if (serverData && serverData.badges) {
        finalBadges = serverData.badges;
      } else {
        const storedBadges = localStorage.getItem(`studymate_badges_${dbPrefix}`);
        if (storedBadges) {
          finalBadges = JSON.parse(storedBadges);
        } else {
          finalBadges = DEFAULT_BADGES;
        }
      }
      setBadges(finalBadges);
      localStorage.setItem(`studymate_badges_${dbPrefix}`, JSON.stringify(finalBadges));

      // Load notifications
      let finalNotifications: AppNotification[] = [];
      if (serverData && serverData.notifications) {
        finalNotifications = serverData.notifications;
      } else {
        const storedNotices = localStorage.getItem(`studymate_notifications_${dbPrefix}`);
        if (storedNotices) {
          finalNotifications = JSON.parse(storedNotices);
        } else {
          finalNotifications = [
            {
              id: "notice-study-1",
              title: "🧠 Technique: The Feynman Fast Study Method",
              message: "To master any chapter fast: Explain the core concepts to a 10-year old in simple terms. This immediately exposes gap areas in your retention!",
              type: "info",
              timestamp: "09:00 AM",
              read: false
            },
            {
              id: "notice-study-2",
              title: "📈 CBSE Current Affairs & Focus Areas",
              message: "CBSE board marks allocations are increasing competency-based and case-study questions. Practice conceptual reasoning rather than direct memorization!",
              type: "success",
              timestamp: "Yesterday",
              read: false
            },
            {
              id: "notice-study-3",
              title: "⚡ Memory Hack: Spaced Repetition",
              message: "Revise a completed subject after 1 day, 3 days, 7 days, and 30 days. This shifts the material from fragile short-term to permanent memory storage.",
              type: "reminder",
              timestamp: "2 days ago",
              read: false
            },
            {
              id: "notice-study-4",
              title: "🔑 Quick Remember: Acronym Mnemonics",
              message: "Convert complicated definitions or lists into catchphrases or acronyms. Your brain recalls structured formulas 10x faster than dry facts.",
              type: "info",
              timestamp: "3 days ago",
              read: false
            }
          ];
        }
      }
      setNotifications(finalNotifications);
      localStorage.setItem(`studymate_notifications_${dbPrefix}`, JSON.stringify(finalNotifications));

      const todayStr = new Date().toISOString().split("T")[0];
      const lastMorningTrigger = localStorage.getItem(`studymate_last_morning_motivation_${dbPrefix}`);
      if (lastMorningTrigger !== todayStr) {
        const today = new Date();
        const daySeed = today.getDate() + today.getMonth() * 31;
        const dailyIndex = daySeed % MORNING_MOTIVATIONAL_POOL.length;
        const morningNotice = MORNING_MOTIVATIONAL_POOL[dailyIndex];
        const newNotice: AppNotification = {
          id: `morning-notice-${Date.now()}`,
          title: morningNotice.title,
          message: morningNotice.message,
          type: morningNotice.type,
          timestamp: "07:30 AM",
          read: false
        };
        
        const updatedNotices = [newNotice, ...finalNotifications];
        setNotifications(updatedNotices);
        localStorage.setItem(`studymate_notifications_${dbPrefix}`, JSON.stringify(updatedNotices));
        localStorage.setItem(`studymate_last_morning_motivation_${dbPrefix}`, todayStr);
      }

      // Load dark mode preference
      const storedTheme = localStorage.getItem("studymate_dark_mode");
      if (storedTheme === "true") {
        setDarkMode(true);
        document.documentElement.classList.add("dark");
      }

      setBooted(true);
      setSyncStatus(hasNetworkError ? "offline" : "synced");

      // Sync offline data up if server profile was empty but we had local cache
      if (!serverData && finalProfile && !hasNetworkError) {
        triggerCloudSync(finalProfile, finalTasks, finalAlarms, finalTimetable, finalHabits, finalBadges, finalNotifications);
      }
    };

    loadAndSyncData();
  }, [loggedInEmail]);

  // 2. Ticking Clock Alarm Sync check
  useEffect(() => {
    if (!booted || alarms.length === 0) return;

    const interval = setInterval(() => {
      const now = new Date();
      const currentHHMM = now.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" });

      // 1. Check if any active Countdown Alarm has passed its triggerTimestamp
      const expiredCountdown = alarms.find(a => 
        a.isActive && 
        a.triggerTimestamp && 
        a.triggerTimestamp <= Date.now()
      );

      if (expiredCountdown) {
        setTriggeredAlarm(expiredCountdown);
        // Automatically set countdown alarm to inactive once triggered
        const nextAlarms = alarms.map(a => 
          a.id === expiredCountdown.id ? { ...a, isActive: false } : a
        );
        setAlarms(nextAlarms);
        localStorage.setItem("studymate_alarms", JSON.stringify(nextAlarms));
        return;
      }

      // 2. Standard absolute alarms
      if (currentHHMM !== lastTriggeredTime) {
        // Find if any active alarm is scheduled for this HH:MM
        const activeAlarm = alarms.find((a) => a.isActive && !a.triggerTimestamp && a.time === currentHHMM);
        if (activeAlarm) {
          // Double check if repeating matches today's day of week
          const todayIdx = now.getDay(); // 0 = Sun, 1 = Mon, etc.
          if (activeAlarm.repeatDays.length === 0 || activeAlarm.repeatDays.includes(todayIdx)) {
            setTriggeredAlarm(activeAlarm);
            setLastTriggeredTime(currentHHMM);
          }
        }
      }
    }, 2000); // Check every 2 seconds for highly precise triggering

    return () => clearInterval(interval);
  }, [booted, alarms, lastTriggeredTime]);

  // Toggle theme
  const handleToggleDarkMode = () => {
    const nextDark = !darkMode;
    setDarkMode(nextDark);
    localStorage.setItem("studymate_dark_mode", String(nextDark));
    if (nextDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  // State modification wrappers (Saves automatically offline-first to localStorage!)
  const handleAwardXP = (xpAmount: number) => {
    if (!profile) return;
    const newXP = profile.xp + xpAmount;
    // Simple level calculator: 300XP per level
    const newLevel = Math.floor(newXP / 300) + 1;

    const updated = {
      ...profile,
      xp: newXP,
      level: newLevel
    };

    setProfile(updated);
    localStorage.setItem(getStorageKey("studymate_profile"), JSON.stringify(updated));

    // Audit and unlock badges if XP limits are met
    const updatedBadges = badges.map((b) => {
      if (b.id === "badge-1" && newXP >= 200 && !b.unlocked) {
        return { ...b, unlocked: true };
      }
      if (b.id === "badge-2" && newXP >= 500 && !b.unlocked) {
        return { ...b, unlocked: true };
      }
      return b;
    });
    setBadges(updatedBadges);
    localStorage.setItem(getStorageKey("studymate_badges"), JSON.stringify(updatedBadges));
    triggerCloudSync(updated, undefined, undefined, undefined, undefined, updatedBadges, undefined);
  };

  const handleIncrementPomodoro = () => {
    if (!profile) return;
    const updated = {
      ...profile,
      totalStudyHours: profile.totalStudyHours + 1
    };
    setProfile(updated);
    localStorage.setItem(getStorageKey("studymate_profile"), JSON.stringify(updated));
    triggerCloudSync(updated, undefined, undefined, undefined, undefined, undefined, undefined);
  };

  // Onboarding Complete Callback
  const handleOnboardingComplete = (data: Omit<UserProfile, "xp" | "level" | "badges" | "unlockedFeatures" | "totalStudyHours">) => {
    const freshProfile: UserProfile = {
      ...data,
      emailAddress: loggedInEmail || data.emailAddress, // enforce login Gmail as profiles account email
      xp: 100, // starting gift XP
      level: 1,
      badges: ["badge-1"],
      unlockedFeatures: [],
      totalStudyHours: 0,
      streakCounter: 1,
      lastLoginDate: new Date().toISOString().split("T")[0]
    };
    setProfile(freshProfile);
    const dbPrefix = (loggedInEmail || data.emailAddress).replace(/[^a-zA-Z0-9]/g, "_");
    localStorage.setItem(`studymate_profile_${dbPrefix}`, JSON.stringify(freshProfile));
    localStorage.setItem(`studymate_show_welcome_${dbPrefix}`, "true");
    setShowNewSignupWelcome(true);

    handleAddNotification(
      "🎉 Profile Synchronized!",
      `Welcome to StudyMate, ${freshProfile.fullName}! Your CBSE syllabus classes are now actively synced to ${freshProfile.emailAddress}.`,
      "success"
    );
    triggerCloudSync(freshProfile, undefined, undefined, undefined, undefined, undefined, undefined);
  };

  // Tasks actions
  const handleAddTask = (title: string, priority: "High" | "Medium" | "Low", subject: string, deadline?: string, notes?: string) => {
    const newTask: Task = {
      id: `task-${Date.now()}`,
      title,
      completed: false,
      priority,
      subjectTag: subject,
      deadline: deadline || new Date().toISOString().split("T")[0],
      notes,
      dateCreated: new Date().toISOString().split("T")[0]
    };
    const nextTasks = [newTask, ...tasks];
    setTasks(nextTasks);
    localStorage.setItem(getStorageKey("studymate_tasks"), JSON.stringify(nextTasks));
    
    if (profile) {
      const newXP = profile.xp + 20;
      const newLevel = Math.floor(newXP / 300) + 1;
      const updatedProf = { ...profile, xp: newXP, level: newLevel };
      setProfile(updatedProf);
      localStorage.setItem(getStorageKey("studymate_profile"), JSON.stringify(updatedProf));
      triggerCloudSync(updatedProf, nextTasks, undefined, undefined, undefined, undefined, undefined);
    } else {
      triggerCloudSync(undefined, nextTasks, undefined, undefined, undefined, undefined, undefined);
    }
  };

  const handleToggleTask = (id: string) => {
    let xpGain = 0;
    const nextTasks = tasks.map((t) => {
      if (t.id === id) {
        const nextState = !t.completed;
        if (nextState) xpGain = 50;
        return { ...t, completed: nextState };
      }
      return t;
    });
    setTasks(nextTasks);
    localStorage.setItem(getStorageKey("studymate_tasks"), JSON.stringify(nextTasks));
    
    if (xpGain > 0 && profile) {
      const newXP = profile.xp + xpGain;
      const newLevel = Math.floor(newXP / 300) + 1;
      const updatedProf = { ...profile, xp: newXP, level: newLevel };
      setProfile(updatedProf);
      localStorage.setItem(getStorageKey("studymate_profile"), JSON.stringify(updatedProf));
      triggerCloudSync(updatedProf, nextTasks, undefined, undefined, undefined, undefined, undefined);
    } else {
      triggerCloudSync(undefined, nextTasks, undefined, undefined, undefined, undefined, undefined);
    }
  };

  const handleDeleteTask = (id: string) => {
    const nextTasks = tasks.filter((t) => t.id !== id);
    setTasks(nextTasks);
    localStorage.setItem(getStorageKey("studymate_tasks"), JSON.stringify(nextTasks));
    triggerCloudSync(undefined, nextTasks, undefined, undefined, undefined, undefined, undefined);
  };

  // Alarm actions
  const handleAddAlarm = (time: string, label: string, subject: string, repeatDays: number[], ringtone: string, vibration: boolean, snoozeOption: boolean, challengeMode: boolean, triggerTimestamp?: number) => {
    const newAlarm: Alarm = {
      id: `alarm-${Date.now()}`,
      time,
      label,
      subject,
      repeatDays,
      ringtone,
      vibration,
      snoozeOption,
      challengeMode,
      isActive: true,
      triggerTimestamp
    };
    const nextAlarms = [newAlarm, ...alarms];
    setAlarms(nextAlarms);
    localStorage.setItem(getStorageKey("studymate_alarms"), JSON.stringify(nextAlarms));
    
    if (profile) {
      const newXP = profile.xp + 10;
      const newLevel = Math.floor(newXP / 300) + 1;
      const updatedProf = { ...profile, xp: newXP, level: newLevel };
      setProfile(updatedProf);
      localStorage.setItem(getStorageKey("studymate_profile"), JSON.stringify(updatedProf));
      triggerCloudSync(updatedProf, undefined, nextAlarms, undefined, undefined, undefined, undefined);
    } else {
      triggerCloudSync(undefined, undefined, nextAlarms, undefined, undefined, undefined, undefined);
    }
  };

  const handleToggleAlarm = (id: string) => {
    const nextAlarms = alarms.map((a) => a.id === id ? { ...a, isActive: !a.isActive } : a);
    setAlarms(nextAlarms);
    localStorage.setItem(getStorageKey("studymate_alarms"), JSON.stringify(nextAlarms));
    triggerCloudSync(undefined, undefined, nextAlarms, undefined, undefined, undefined, undefined);
  };

  const handleDeleteAlarm = (id: string) => {
    const nextAlarms = alarms.filter((a) => a.id !== id);
    setAlarms(nextAlarms);
    localStorage.setItem(getStorageKey("studymate_alarms"), JSON.stringify(nextAlarms));
    triggerCloudSync(undefined, undefined, nextAlarms, undefined, undefined, undefined, undefined);
  };

  // Timetable planner actions
  const handleAddTimetableItem = (day: string, time: string, subject: string, topic: string) => {
    const newItem: TimetableItem = {
      id: `time-${Date.now()}`,
      day,
      time,
      subject,
      topic
    };
    const nextTimetable = [...timetable, newItem];
    setTimetable(nextTimetable);
    localStorage.setItem(getStorageKey("studymate_timetable"), JSON.stringify(nextTimetable));
    
    if (profile) {
      const newXP = profile.xp + 15;
      const newLevel = Math.floor(newXP / 300) + 1;
      const updatedProf = { ...profile, xp: newXP, level: newLevel };
      setProfile(updatedProf);
      localStorage.setItem(getStorageKey("studymate_profile"), JSON.stringify(updatedProf));
      triggerCloudSync(updatedProf, undefined, undefined, nextTimetable, undefined, undefined, undefined);
    } else {
      triggerCloudSync(undefined, undefined, undefined, nextTimetable, undefined, undefined, undefined);
    }
  };

  const handleDeleteTimetableItem = (id: string) => {
    const nextTimetable = timetable.filter((t) => t.id !== id);
    setTimetable(nextTimetable);
    localStorage.setItem(getStorageKey("studymate_timetable"), JSON.stringify(nextTimetable));
    triggerCloudSync(undefined, undefined, undefined, nextTimetable, undefined, undefined, undefined);
  };

  const handleEditTimetableItem = (id: string, updatedFields: Partial<TimetableItem>) => {
    const nextTimetable = timetable.map((t) => t.id === id ? { ...t, ...updatedFields } : t);
    setTimetable(nextTimetable);
    localStorage.setItem(getStorageKey("studymate_timetable"), JSON.stringify(nextTimetable));
    triggerCloudSync(undefined, undefined, undefined, nextTimetable, undefined, undefined, undefined);
  };

  const handleLoadAISchedule = (aiData: { timetable: TimetableItem[]; studyTips: string[] }) => {
    const combined = [...timetable, ...aiData.timetable];
    setTimetable(combined);
    localStorage.setItem(getStorageKey("studymate_timetable"), JSON.stringify(combined));
    
    if (profile) {
      const newXP = profile.xp + 50;
      const newLevel = Math.floor(newXP / 300) + 1;
      const updatedProf = { ...profile, xp: newXP, level: newLevel };
      setProfile(updatedProf);
      localStorage.setItem(getStorageKey("studymate_profile"), JSON.stringify(updatedProf));
      triggerCloudSync(updatedProf, undefined, undefined, combined, undefined, undefined, undefined);
    } else {
      triggerCloudSync(undefined, undefined, undefined, combined, undefined, undefined, undefined);
    }
  };

  // Habit trackers
  const handleToggleHabitDate = (id: string, dateStr: string) => {
    let xpGain = 0;
    const nextHabits = habits.map((h) => {
      if (h.id === id) {
        const completed = h.datesCompleted.includes(dateStr);
        let nextDates = [];
        if (completed) {
          nextDates = h.datesCompleted.filter((d) => d !== dateStr);
        } else {
          nextDates = [...h.datesCompleted, dateStr];
          xpGain = 30;
        }
        return { ...h, datesCompleted: nextDates };
      }
      return h;
    });
    setHabits(nextHabits);
    localStorage.setItem(getStorageKey("studymate_habits"), JSON.stringify(nextHabits));
    
    if (xpGain > 0 && profile) {
      const newXP = profile.xp + xpGain;
      const newLevel = Math.floor(newXP / 300) + 1;
      const updatedProf = { ...profile, xp: newXP, level: newLevel };
      setProfile(updatedProf);
      localStorage.setItem(getStorageKey("studymate_profile"), JSON.stringify(updatedProf));
      triggerCloudSync(updatedProf, undefined, undefined, undefined, nextHabits, undefined, undefined);
    } else {
      triggerCloudSync(undefined, undefined, undefined, undefined, nextHabits, undefined, undefined);
    }
  };

  const handleAddHabit = (name: string, icon: string, color: string) => {
    const newHabit: Habit = {
      id: `habit-${Date.now()}`,
      name,
      icon,
      color,
      datesCompleted: []
    };
    const nextHabits = [...habits, newHabit];
    setHabits(nextHabits);
    localStorage.setItem(getStorageKey("studymate_habits"), JSON.stringify(nextHabits));
    
    if (profile) {
      const newXP = profile.xp + 15;
      const newLevel = Math.floor(newXP / 300) + 1;
      const updatedProf = { ...profile, xp: newXP, level: newLevel };
      setProfile(updatedProf);
      localStorage.setItem(getStorageKey("studymate_profile"), JSON.stringify(updatedProf));
      triggerCloudSync(updatedProf, undefined, undefined, undefined, nextHabits, undefined, undefined);
    } else {
      triggerCloudSync(undefined, undefined, undefined, undefined, nextHabits, undefined, undefined);
    }
  };

  const handleDeleteHabit = (id: string) => {
    const nextHabits = habits.filter((h) => h.id !== id);
    setHabits(nextHabits);
    localStorage.setItem(getStorageKey("studymate_habits"), JSON.stringify(nextHabits));
    triggerCloudSync(undefined, undefined, undefined, undefined, nextHabits, undefined, undefined);
  };

  // Profile modification callback
  const handleUpdateProfile = (updates: Partial<UserProfile>) => {
    if (!profile) return;
    const updated = {
      ...profile,
      ...updates
    };
    setProfile(updated);
    localStorage.setItem(getStorageKey("studymate_profile"), JSON.stringify(updated));
    triggerCloudSync(updated, undefined, undefined, undefined, undefined, undefined, undefined);
  };

  // Account Wipe / Reset Default Callback
  const handleResetApp = () => {
    localStorage.removeItem(getStorageKey("studymate_profile"));
    localStorage.removeItem(getStorageKey("studymate_tasks"));
    localStorage.removeItem(getStorageKey("studymate_alarms"));
    localStorage.removeItem(getStorageKey("studymate_timetable"));
    localStorage.removeItem(getStorageKey("studymate_habits"));
    localStorage.removeItem(getStorageKey("studymate_badges"));
    localStorage.removeItem(getStorageKey("studymate_notifications"));
    setProfile(null);
    setTasks([]);
    setAlarms([]);
    setTimetable([]);
    setHabits([]);
    setBadges([]);
    setNotifications([]);
    setCurrentTab("dashboard");
    alert("Application data successfully wiped for your current Google Account! Returning to onboarding walkthrough.");
  };

  if (!booted) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-xs font-bold text-slate-500">Booting StudyMate Core DB...</p>
      </div>
    );
  }

  // 2.5 Google authentication gate
  if (!loggedInEmail) {
    return <GoogleLogin onLoginSuccess={handleLoginSuccess} />;
  }

  // 3. Conditional Onboarding Redirect
  if (!profile) {
    return <Onboarding onComplete={handleOnboardingComplete} />;;
  }

  // 3.5 Conditional WelcomeWalkthrough Page for New Signups
  if (showNewSignupWelcome) {
    return (
      <WelcomeWalkthrough 
        profile={profile} 
        onDismiss={() => {
          localStorage.setItem(getStorageKey("studymate_show_welcome"), "false");
          setShowNewSignupWelcome(false);
        }} 
      />
    );
  }

  // Navigation Links array for drawers and bottom bars - Centralized with custom symbols!
  const NAV_LINKS = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, symbol: "🏠" },
    { id: "tasks", label: "Homework", icon: ClipboardList, symbol: "📝" },
    { id: "alarms", label: "Alarms", icon: Bell, symbol: "🔔" },
    { id: "planner", label: "Timetable", icon: CalIcon, symbol: "📅" },
    { id: "habits", label: "Habits", icon: Flame, symbol: "⚡" },
    { id: "calendar", label: "Calendar", icon: CalIcon, symbol: "📆" },
    { id: "assessment", label: "10-Day Test", icon: HelpCircle, symbol: "🎯" },
    { id: "pomodoro", label: "Focus Sprint", icon: Clock, symbol: "⏱️" },
    { id: "games", label: "Cognitive Games", icon: Gamepad2, symbol: "🎮" },
    { id: "assistant", label: "StudyMate AI", icon: Sparkles, symbol: "🔮" },
    { id: "chat", label: "Community", icon: MessageSquare, symbol: "💬" },
    { id: "analytics", label: "Analytics", icon: BarChart3, symbol: "📈" },
    { id: "profile", label: "Profile", icon: User, symbol: "👤" },
    { id: "settings", label: "Settings", icon: Settings, symbol: "⚙️" }
  ];

  const isFullScreenActive = 
    focusLockdown || 
    (currentTab === "assistant" && aiFullScreen) || 
    (currentTab === "chat" && chatFullScreen);

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col md:flex-row font-sans transition-colors duration-300">
      
      {/* Side drawer for Desktop screen viewports */}
      <aside className={`hidden md:flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800/80 p-5 space-y-6 flex-shrink-0 ${isFullScreenActive ? "md:!hidden" : ""}`}>
        {/* Branding header */}
        <div className="flex items-center space-x-2.5 pb-2 border-b border-slate-100 dark:border-slate-800/60">
          <span className="text-2xl">🎓</span>
          <div>
            <h2 className="text-base font-black font-display tracking-tight text-indigo-600 dark:text-indigo-400">StudyMate</h2>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Productivity Suite</span>
          </div>
        </div>

        {/* User context widget in sidebar */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center justify-between space-x-2">
          <div className="flex items-center space-x-2.5 overflow-hidden">
            <span className="text-3xl p-1 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800">
              {profile.avatar}
            </span>
            <div className="overflow-hidden">
              <h4 className="text-xs font-black truncate text-slate-800 dark:text-slate-100">{profile.fullName}</h4>
              <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-1 rounded">
                Level {profile.level}
              </span>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            title="Log out Google Account"
            className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer text-xs"
          >
            ❌
          </button>
        </div>

        {/* Nav lists */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto max-h-[500px] pr-1">
          {NAV_LINKS.map((link) => {
            const Icon = link.icon;
            const isSelected = currentTab === link.id;
            const theme = TAB_THEMES[link.id] || TAB_THEMES.dashboard;
            return (
              <button
                key={link.id}
                onClick={() => {
                  setCurrentTab(link.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-extrabold transition-all duration-200 cursor-pointer border ${
                  isSelected 
                    ? `${theme.activeBg} ${theme.activeText} border-transparent shadow-md ${theme.shadow} scale-[1.02]` 
                    : "bg-transparent border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/30 hover:text-slate-800 dark:hover:text-slate-100"
                }`}
              >
                <span className="text-sm leading-none shrink-0">{link.symbol}</span>
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{link.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Mobile top app bar */}
      <header className={`md:hidden bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800/80 px-4 py-3.5 flex justify-between items-center z-30 flex-shrink-0 ${isFullScreenActive ? "!hidden" : ""}`}>
        <div className="flex items-center space-x-2">
          <span className="text-xl">🎓</span>
          <h2 className="text-sm font-black font-display tracking-tight text-indigo-600 dark:text-indigo-400">StudyMate</h2>
        </div>

        <div className="flex items-center space-x-2">
          <button 
            onClick={handleToggleDarkMode}
            className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl"
          >
            {darkMode ? "☀️" : "🌙"}
          </button>
          
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-400"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer menu list overlays */}
      {mobileMenuOpen && !isFullScreenActive && (
        <div className="md:hidden fixed inset-0 top-[57px] bg-white dark:bg-slate-900 z-40 flex flex-col p-6 space-y-4">
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b pb-2">Navigation Routes</h4>
          <div className="grid grid-cols-2 gap-2 overflow-y-auto max-h-[70%]">
            {NAV_LINKS.map((link) => {
              const Icon = link.icon;
              const isSelected = currentTab === link.id;
              const theme = TAB_THEMES[link.id] || TAB_THEMES.dashboard;
              return (
                <button
                  key={link.id}
                  onClick={() => {
                    setCurrentTab(link.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center space-x-2.5 p-3 rounded-xl text-[11px] font-black border transition-all duration-150 ${
                    isSelected 
                      ? `${theme.activeBg} border-transparent text-white shadow-md ${theme.shadow} scale-[1.03]` 
                      : "bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <span className="text-sm leading-none shrink-0">{link.symbol}</span>
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{link.label}</span>
                </button>
              );
            })}
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-4 mt-auto flex items-center space-x-3 bg-slate-50 dark:bg-slate-800/20 p-3 rounded-2xl">
            <span className="text-3xl">{profile.avatar}</span>
            <div>
              <p className="text-xs font-black">{profile.fullName}</p>
              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">Level {profile.level} student</span>
            </div>
          </div>
        </div>
      )}

      {/* Main active screen tab contents viewport */}
      <main className={`flex-1 overflow-y-auto max-h-screen ${isFullScreenActive ? "p-0 h-screen w-screen overflow-hidden flex flex-col" : "p-4 md:p-8 pb-24 md:pb-8"}`}>
        
        {/* Unified App Header for notification center and theme triggers */}
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800/80 ${isFullScreenActive ? "hidden" : ""}`}>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-950 dark:text-slate-50 tracking-tight capitalize flex items-center gap-2">
              <span>{currentTab === "dashboard" ? "🏠" : NAV_LINKS.find(l => l.id === currentTab)?.label === "10-Day Test" ? "🎯" : "📚"}</span>
              <span>{currentTab === "dashboard" ? `Welcome Back, ${profile?.fullName || "Student"}!` : `${NAV_LINKS.find(l => l.id === currentTab)?.label || currentTab}`}</span>
            </h1>
            <p className="text-xs text-slate-400 font-semibold">
              {currentTab === "dashboard" 
                ? "Let's make study easy, structured, and fun today!" 
                : "Manage your active studies and boost your exam readiness."}
            </p>
          </div>

          {/* Quick Widgets panel */}
          <div className="flex items-center space-x-3 self-end sm:self-auto relative z-30">
            {/* Desktop Theme Toggle */}
            <button 
              onClick={handleToggleDarkMode}
              className="p-2.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl shadow-sm transition text-xs cursor-pointer"
              title="Toggle theme mode"
            >
              {darkMode ? "☀️ Light" : "🌙 Dark"}
            </button>

            {/* Notification Bell Icon */}
            <div className="relative">
              <button 
                onClick={() => setNotificationMenuOpen(!notificationMenuOpen)}
                className={`p-2.5 border hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl shadow-sm transition relative cursor-pointer ${
                  notificationMenuOpen 
                    ? "bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-950/40 dark:border-indigo-800/50" 
                    : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                }`}
                title="Study Inbox Notifications"
              >
                <Bell className="w-5 h-5" />
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white font-black text-[9px] w-5 h-5 flex items-center justify-center rounded-full border-2 border-white dark:border-slate-950 animate-bounce">
                    {notifications.filter(n => !n.read).length}
                  </span>
                )}
              </button>

              {/* Notification Center Dropdown */}
              <AnimatePresence>
                {notificationMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-3 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-3xl shadow-2xl p-4 space-y-4 text-left"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                      <div>
                        <h3 className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                          <span>🔔</span> StudyMate Inbox
                        </h3>
                        <p className="text-[10px] text-slate-400 font-semibold">{notifications.filter(n => !n.read).length} unread messages</p>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        {notifications.some(n => n.read) && (
                          <button 
                            onClick={handleClearSeenNotifications}
                            className="text-[10px] bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 font-bold px-2 py-1 rounded-lg transition cursor-pointer"
                          >
                            Clear Seen
                          </button>
                        )}
                        <button 
                          onClick={handleClearAllNotifications}
                          className="text-[10px] bg-slate-105 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 font-bold px-2 py-1 rounded-lg transition cursor-pointer"
                        >
                          Clear All
                        </button>
                      </div>
                    </div>

                    {/* Simulation tools inside */}
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 p-2.5 rounded-2xl border border-amber-100/60 dark:border-amber-900/20 flex flex-col gap-1.5 text-[10px]">
                      <span className="font-bold text-slate-700 dark:text-slate-300">🌅 Simulate Morning Notification:</span>
                      <p className="text-[9px] text-slate-400">Triggers a daily morning notification containing warm greetings and simple focus tips!</p>
                      <button
                        onClick={handleTriggerManualMorningNudge}
                        className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-2.5 py-1.5 rounded-lg transition cursor-pointer self-start"
                      >
                        Trigger Morning Nudge Now
                      </button>
                    </div>

                    {/* Notification lists */}
                    <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                      {notifications.length === 0 ? (
                        <div className="py-8 text-center space-y-2">
                          <span className="text-2xl block">📭</span>
                          <p className="text-xs font-bold text-slate-400">No notifications found</p>
                          <p className="text-[10px] text-slate-400">Click trigger above to see motivational notifications!</p>
                        </div>
                      ) : (
                        notifications.map((notice) => (
                          <div 
                            key={notice.id}
                            onClick={() => handleMarkAsRead(notice.id)}
                            className={`p-3 rounded-2xl border transition cursor-pointer flex gap-2.5 text-left relative overflow-hidden group ${
                              notice.read 
                                ? "bg-slate-50/50 dark:bg-slate-950/20 border-slate-100 dark:border-slate-800/60" 
                                : "bg-indigo-50/25 dark:bg-indigo-950/15 border-indigo-100/70 dark:border-indigo-900/30 shadow-sm hover:border-indigo-200"
                            }`}
                          >
                            {/* Type symbol badge indicator */}
                            <span className="text-sm flex-shrink-0">
                              {notice.type === "success" ? "🏆" : notice.type === "alert" ? "🚨" : notice.type === "reminder" ? "📅" : "💡"}
                            </span>

                            <div className="space-y-0.5">
                              <h4 className={`text-[11px] font-bold ${notice.read ? "text-slate-600 dark:text-slate-400" : "text-slate-800 dark:text-slate-100"}`}>
                                {notice.title}
                              </h4>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                                {notice.message}
                              </p>
                              <span className="text-[8px] font-bold text-slate-400 block pt-1">
                                {notice.timestamp} {!notice.read && "• Unread"}
                              </span>
                            </div>

                            {/* Unread circle badge */}
                            {!notice.read && (
                              <span className="absolute top-3.5 right-3 w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
        
        {/* Floating trigger alert for quick feedback */}
        {!focusLockdown && (
          <TriggeredAlarmsOverlay 
            triggeredAlarm={triggeredAlarm}
            profile={profile}
            onClearTriggeredAlarm={() => setTriggeredAlarm(null)}
            onNavigate={(tab) => setCurrentTab(tab)}
            onAwardXP={handleAwardXP}
          />
        )}

        {currentTab === "dashboard" && (
          <Dashboard 
            profile={profile}
            tasks={tasks}
            alarms={alarms}
            habits={habits}
            studyHoursToday={studyHoursToday}
            onAddTask={handleAddTask}
            onToggleTask={handleToggleTask}
            onNavigate={(tab) => setCurrentTab(tab)}
            onTriggerAlarmChallenge={(alarm) => setTriggeredAlarm(alarm)}
            onLogStudyHours={(hours) => {
              setStudyHoursToday((p) => p + hours);
              handleAwardXP(hours * 30);
            }}
          />
        )}

        {currentTab === "tasks" && (
          <Tasks 
            tasks={tasks}
            profile={profile}
            onAddTask={handleAddTask}
            onToggleTask={handleToggleTask}
            onDeleteTask={handleDeleteTask}
          />
        )}

        {currentTab === "alarms" && (
          <Alarms 
            alarms={alarms}
            profile={profile}
            onAddAlarm={handleAddAlarm}
            onToggleAlarm={handleToggleAlarm}
            onDeleteAlarm={handleDeleteAlarm}
            onNavigate={(tab) => setCurrentTab(tab)}
            triggeredAlarm={triggeredAlarm}
            onClearTriggeredAlarm={() => setTriggeredAlarm(null)}
            onAwardXP={handleAwardXP}
          />
        )}

        {currentTab === "planner" && (
          <Planner 
            profile={profile}
            timetable={timetable}
            onAddTimetableItem={handleAddTimetableItem}
            onDeleteTimetableItem={handleDeleteTimetableItem}
            onEditTimetableItem={handleEditTimetableItem}
            onLoadAISchedule={handleLoadAISchedule}
          />
        )}

        {currentTab === "habits" && (
          <Habits 
            habits={habits}
            onToggleHabitDate={handleToggleHabitDate}
            onAddHabit={handleAddHabit}
            onDeleteHabit={handleDeleteHabit}
            profile={profile}
          />
        )}

        {currentTab === "calendar" && (
          <Suspense fallback={<LoadingTabPlaceholder />}>
            <CalendarView 
              tasks={tasks}
              timetable={timetable}
              profile={profile}
            />
          </Suspense>
        )}

        {currentTab === "pomodoro" && (
          <Pomodoro 
            onAwardXP={handleAwardXP}
            onIncrementPomodoro={handleIncrementPomodoro}
            isFocusLockdown={focusLockdown}
            onFocusLockdownChange={setFocusLockdown}
            profileClassGrade={profile.classGrade}
          />
        )}

        {currentTab === "assessment" && (
          <Suspense fallback={<LoadingTabPlaceholder />}>
            <SyllabusTest 
              profile={profile}
              onAwardXP={handleAwardXP}
              onAddNotification={handleAddNotification}
            />
          </Suspense>
        )}

        {currentTab === "analytics" && (
          <Suspense fallback={<LoadingTabPlaceholder />}>
            <Analytics 
              profile={profile}
              tasks={tasks}
              habits={habits}
              badges={badges}
            />
          </Suspense>
        )}

        {currentTab === "profile" && (
          <Suspense fallback={<LoadingTabPlaceholder />}>
            <ProfileView 
              profile={profile}
              badges={badges}
              onUpdateProfile={handleUpdateProfile}
              onResetApp={handleResetApp}
            />
          </Suspense>
        )}

        {currentTab === "games" && (
          <Suspense fallback={<LoadingTabPlaceholder />}>
            <EducationalGames 
              profile={profile}
              onAwardXP={handleAwardXP}
              onAddNotification={handleAddNotification}
            />
          </Suspense>
        )}

        {currentTab === "assistant" && (
          <Suspense fallback={<LoadingTabPlaceholder />}>
            <StudyMateAI 
              profile={profile}
              onAwardXP={handleAwardXP}
              onAddNotification={handleAddNotification}
              isFullScreen={aiFullScreen}
              onToggleFullScreen={toggleAiFullScreen}
            />
          </Suspense>
        )}

        {currentTab === "chat" && (
          <Suspense fallback={<LoadingTabPlaceholder />}>
            <CommunityChat
              profile={profile}
              onAwardXP={handleAwardXP}
              handleAddNotification={handleAddNotification}
              isFullScreen={chatFullScreen}
              onToggleFullScreen={toggleChatFullScreen}
            />
          </Suspense>
        )}

        {currentTab === "settings" && (
          <Suspense fallback={<LoadingTabPlaceholder />}>
            <SettingsView 
              darkMode={darkMode}
              onToggleDarkMode={handleToggleDarkMode}
              profile={profile}
              syncStatus={syncStatus}
              onTriggerSync={handleTriggerSync}
              onDeleteAccount={handleDeleteAccount}
            />
          </Suspense>
        )}

      </main>

      {/* Mobile persistent bottom navigation bar */}
      <div id="mobile_bottom_bar" className={`md:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-100 dark:border-slate-800/80 z-40 px-4 py-3.5 flex items-center gap-2 overflow-x-auto no-scrollbar shadow-lg ${isFullScreenActive ? "!hidden" : ""}`}>
        {NAV_LINKS.map((link) => {
          const Icon = link.icon;
          const isSelected = currentTab === link.id;
          const theme = TAB_THEMES[link.id] || TAB_THEMES.dashboard;
          return (
            <button
              id={`nav_link_${link.id}`}
              key={link.id}
              onClick={() => {
                setCurrentTab(link.id);
                setMobileMenuOpen(false);
              }}
              className={`flex items-center space-x-2 px-3.5 py-2.5 rounded-xl text-xs font-black transition-all duration-200 shrink-0 cursor-pointer ${
                isSelected 
                  ? `${theme.activeBg} ${theme.activeText} shadow-md ${theme.shadow} scale-105` 
                  : `${theme.inactiveBg} ${theme.inactiveText} hover:bg-slate-100 dark:hover:bg-slate-800/60`
              }`}
            >
              <span className="text-sm shrink-0 leading-none">{link.symbol}</span>
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{link.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  </ErrorBoundary>
  );
}

// Sub-compoennt to handle active alarm rings across tabs gracefully
interface TriggeredAlarmsOverlayProps {
  triggeredAlarm: Alarm | null;
  profile: UserProfile;
  onClearTriggeredAlarm: () => void;
  onNavigate: (tab: string) => void;
  onAwardXP: (xp: number) => void;
}

function TriggeredAlarmsOverlay({
  triggeredAlarm,
  profile,
  onClearTriggeredAlarm,
  onNavigate,
  onAwardXP
}: TriggeredAlarmsOverlayProps) {
  // If we are currently active on the alarms screen, the Alarms.tsx component itself will handle the ringing modal layout!
  // This sub-component handles launching the math challenge if they are currently on another screen tab like Dashboard or Calendar!
  const [show, setShow] = useState(false);
  const [currentChallenge, setCurrentChallenge] = useState({ q: "", a: 0 });
  const [userAnswer, setUserAnswer] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (triggeredAlarm) {
      generateMathChallenge();
      setShow(true);
      startRingtonePlayback(triggeredAlarm.ringtone);
    } else {
      setShow(false);
      stopRingtonePlayback();
    }
    return () => {
      stopRingtonePlayback();
    };
  }, [triggeredAlarm]);

  const generateMathChallenge = () => {
    const num1 = Math.floor(Math.random() * 12) + 2;
    const num2 = Math.floor(Math.random() * 12) + 2;
    setCurrentChallenge({
      q: `${num1} × ${num2}`,
      a: num1 * num2
    });
    setUserAnswer("");
    setError("");
  };

  const handleDismiss = () => {
    stopRingtonePlayback();
    if (triggeredAlarm?.challengeMode) {
      if (parseInt(userAnswer.trim()) === currentChallenge.a) {
        setShow(false);
        onClearTriggeredAlarm();
        onAwardXP(50);
        onNavigate("tasks");
      } else {
        setError("Wrong calculation! Try again to shut off the active alert.");
        generateMathChallenge();
      }
    } else {
      setShow(false);
      onClearTriggeredAlarm();
      onNavigate("tasks");
    }
  };

  if (!show || !triggeredAlarm) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-md">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 text-center space-y-4 border border-slate-200 dark:border-slate-800">
        <span className="text-4xl block animate-bounce">⏰</span>
        <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">Study Alarm Active!</h3>
        <span className="text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded">
          📚 {triggeredAlarm.subject}
        </span>
        <p className="text-xs text-slate-500 font-semibold italic">"{triggeredAlarm.label}"</p>

        {triggeredAlarm.challengeMode ? (
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-2xl text-center space-y-2">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Wake up Calculation</span>
            <p className="text-2xl font-black text-slate-800 dark:text-slate-100">{currentChallenge.q} = ?</p>
            <input 
              type="number"
              placeholder="Your answer"
              className="w-full px-3 py-2 text-sm border rounded-xl border-slate-200 dark:border-slate-800 text-center font-bold bg-transparent text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleDismiss()}
              autoFocus
            />
            {error && <p className="text-[10px] text-rose-500 font-bold">{error}</p>}
          </div>
        ) : (
          <p className="text-xs text-slate-400">Click below to dismiss and view today's tasks.</p>
        )}

        <button 
          onClick={handleDismiss}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow transition"
        >
          Shut Off Alert (+50 XP)
        </button>
      </div>
    </div>
  );
}
