import React, { useState, useEffect, useCallback, useRef, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "motion/react";
import { UserProfile, Alarm } from "../types";
import { startRingtonePlayback, stopRingtonePlayback } from "./Alarms";

// Context Hooks
import { useAuth } from "../providers/AuthProvider";
import { useTheme } from "../providers/ThemeProvider";
import { useNotifications } from "../providers/NotificationProvider";
import { useStorage } from "../providers/StorageProvider";

// Eager components
import GoogleLogin from "./GoogleLogin";
import Onboarding from "./Onboarding";
import WelcomeWalkthrough from "./WelcomeWalkthrough";
import Dashboard from "./Dashboard";
import Tasks from "./Tasks";
import Alarms from "./Alarms";
import Planner from "./Planner";
import Habits from "./Habits";
import Pomodoro from "./Pomodoro";
import UniversalSmartSearch from "./UniversalSmartSearch";
import StudyMateAI from "./StudyMateAI";
import { 
  AISkeletonLoader, 
  GamesSkeletonLoader, 
  ChatSkeletonLoader, 
  AnalyticsSkeletonLoader, 
  CalendarSkeletonLoader, 
  ProfileSkeletonLoader, 
  GenericModuleSkeletonLoader 
} from "./LoadingSkeletons";
import { AIErrorBoundary } from "./studymate-ai/AIErrorBoundary";

// Helper for robust dynamic imports with automatic retry and reload fallback
const lazyWithRetry = (factory: () => Promise<any>) =>
  lazy(async () => {
    const pageHasAlreadyBeenRefreshed = JSON.parse(
      window.sessionStorage.getItem('page_has_been_refreshed') || 'false'
    );
    try {
      return await factory();
    } catch (error) {
      console.warn("[AppRouter] Dynamic component import failed, retrying...", error);
      try {
        return await factory();
      } catch (retryError) {
        console.error("[AppRouter] Failed dynamic component import after retry:", retryError);
        if (!pageHasAlreadyBeenRefreshed) {
          window.sessionStorage.setItem('page_has_been_refreshed', 'true');
          window.location.reload();
        }
        throw retryError;
      }
    }
  });

// Lazy components
const CalendarView = lazyWithRetry(() => import("./CalendarView"));
const Analytics = lazyWithRetry(() => import("./Analytics"));
const SyllabusTest = lazyWithRetry(() => import("./SyllabusTest"));
const ImageGenerator = lazyWithRetry(() => import("./ImageGenerator"));
const EducationalGames = lazyWithRetry(() => import("./EducationalGames"));
const ProfileView = lazyWithRetry(() => import("./ProfileView"));
const SettingsView = lazyWithRetry(() => import("./SettingsView"));
const CommunityChat = lazyWithRetry(() => import("./CommunityChat"));

// Navigation Icons
import { 
  LayoutDashboard, ClipboardList, Bell, Calendar as CalIcon, Flame, 
  Clock, Sparkles, BarChart3, User, Settings, RefreshCw, HelpCircle, Gamepad2, MessageSquare, Type, Search, Image as ImageIcon
} from "lucide-react";
import {
  FlagshipHomeIcon,
  FlagshipGamesIcon,
  FlagshipAiIcon,
  FlagshipChatIcon,
  FlagshipProfileIcon
} from "./NavIcons";

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
  imageGen: { gradient: "from-purple-600 to-pink-600", activeBg: "bg-gradient-to-r from-purple-600 to-pink-600", activeText: "text-white", inactiveBg: "bg-purple-50/50 dark:bg-purple-950/20", inactiveText: "text-purple-600/70 dark:text-purple-400/70 hover:text-purple-600 dark:hover:text-purple-400", shadow: "shadow-purple-500/20", border: "border-purple-100 dark:border-purple-950" },
  chat: { gradient: "from-teal-600 to-emerald-600", activeBg: "bg-gradient-to-r from-teal-600 to-emerald-600", activeText: "text-white", inactiveBg: "bg-teal-50/50 dark:bg-teal-950/20", inactiveText: "text-teal-600/70 dark:text-teal-400/70 hover:text-teal-600 dark:hover:text-teal-400", shadow: "shadow-teal-500/20", border: "border-teal-100 dark:border-teal-950" },
  analytics: { gradient: "from-cyan-600 to-blue-600", activeBg: "bg-gradient-to-r from-cyan-600 to-blue-600", activeText: "text-white", inactiveBg: "bg-cyan-50/50 dark:bg-cyan-950/20", inactiveText: "text-cyan-600/70 dark:text-cyan-400/70 hover:text-cyan-600 dark:hover:text-cyan-400", shadow: "shadow-cyan-500/20", border: "border-cyan-100 dark:border-cyan-950" },
  profile: { gradient: "from-lime-600 to-emerald-600", activeBg: "bg-gradient-to-r from-lime-600 to-emerald-600", activeText: "text-white", inactiveBg: "bg-lime-50/50 dark:bg-lime-950/20", inactiveText: "text-lime-600/70 dark:text-lime-400/70 hover:text-lime-600 dark:hover:text-lime-400", shadow: "shadow-lime-500/20", border: "border-lime-100 dark:border-lime-950" },
  settings: { gradient: "from-slate-600 to-slate-800", activeBg: "bg-gradient-to-r from-slate-600 to-slate-800", activeText: "text-white", inactiveBg: "bg-slate-100/50 dark:bg-slate-800/40", inactiveText: "text-slate-500/70 dark:text-slate-400/70 hover:text-slate-600 dark:hover:text-slate-400", shadow: "shadow-slate-500/20", border: "border-slate-200 dark:border-slate-800" }
};

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
  { id: "imageGen", label: "AI Art & Diagrams", icon: Sparkles, symbol: "🎨" },
  { id: "chat", label: "Community", icon: MessageSquare, symbol: "💬" },
  { id: "analytics", label: "Analytics", icon: BarChart3, symbol: "📈" },
  { id: "profile", label: "Profile", icon: User, symbol: "👤" },
  { id: "settings", label: "Settings", icon: Settings, symbol: "⚙️" }
];

export const AppRouter: React.FC = () => {
  const { loggedInEmail, booted, handleLoginSuccess, handleLogout, getStorageKey } = useAuth();
  const { darkMode, handleToggleDarkMode, textSize, setTextSize } = useTheme();
  const { 
    notifications, 
    focusLockdown, 
    setFocusLockdown, 
    handleAddNotification, 
    handleMarkAsRead, 
    handleClearSeenNotifications, 
    handleClearAllNotifications, 
    handleTriggerManualMorningNudge 
  } = useNotifications();

  const {
    profile,
    tasks,
    alarms,
    timetable,
    habits,
    badges,
    studyHoursToday,
    setStudyHoursToday,
    showNewSignupWelcome,
    setShowNewSignupWelcome,
    syncStatus,
    triggeredAlarm,
    setTriggeredAlarm,
    handleTriggerSync,
    handleAwardXP,
    handleIncrementPomodoro,
    handleOnboardingComplete,
    handleAddTask,
    handleUpdateTask,
    handleToggleTask,
    handleDeleteTask,
    handleAddAlarm,
    handleUpdateAlarm,
    handleToggleAlarm,
    handleDeleteAlarm,
    handleAddTimetableItem,
    handleDeleteTimetableItem,
    handleEditTimetableItem,
    handleLoadAISchedule,
    handleToggleHabitDate,
    handleAddHabit,
    handleDeleteHabit,
    handleUpdateProfile,
    handleResetApp,
    handleDeleteAccount
  } = useStorage();

  const [currentTab, setCurrentTab] = useState("dashboard");

  const safeNavigateTab = useCallback((tabId: string) => {
    try {
      const isKnown = NAV_LINKS.some(l => l.id === tabId) || ["dashboard", "settings", "imageGen", "assistant", "chat"].includes(tabId);
      const targetTab = isKnown ? tabId : "dashboard";
      setCurrentTab(targetTab);
    } catch (err: any) {
      console.error(`[AppRouter Navigation Error] Failed navigating to tab '${tabId}':`, err, "\nStack:", err?.stack);
      handleAddNotification("Navigation Error", "Could not open requested view. Staying on current screen.", "alert");
    }
  }, [handleAddNotification]);
  const [mobileRipples, setMobileRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationMenuOpen, setNotificationMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Fullscreen states for AI Assistant and Community Chat
  const [aiFullScreen, setAiFullScreen] = useState(false);
  const [chatFullScreen, setChatFullScreen] = useState(false);

  // Native browser fullscreen helpers
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

  const aiSettingsHandlerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    setAiFullScreen(false);
    setChatFullScreen(false);
    exitBrowserFullscreen();
  }, [currentTab]);

  const toggleAiFullScreen = () => {
    const nextVal = !aiFullScreen;
    setAiFullScreen(nextVal);
    
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

  // 1. Boot screen
  if (!booted) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-xs font-bold text-slate-500">Booting StudyMate Core DB...</p>
      </div>
    );
  }

  // 2. Login screen
  if (!loggedInEmail) {
    return <GoogleLogin onLoginSuccess={handleLoginSuccess} />;
  }

  // 3. Onboarding screen
  if (!profile) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  // 4. Welcome Walkthrough
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



  const isFullScreenActive = 
    focusLockdown || 
    (currentTab === "assistant" && aiFullScreen) || 
    (currentTab === "chat" && chatFullScreen);

  return (
    <div className="h-dvh md:h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col md:flex-row font-sans transition-colors duration-300">
      
      {/* Sidebar for Desktop */}
      <aside className={`hidden md:flex flex-col w-64 h-full bg-white/70 dark:bg-[#0c1326]/65 backdrop-blur-2xl border-r border-white/60 dark:border-white/10 shadow-[10px_0_30px_rgba(0,0,0,0.03)] dark:shadow-[16px_0_40px_rgba(0,0,0,0.4)] p-4 space-y-4 flex-shrink-0 z-20 relative overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/80 dark:before:via-white/20 before:to-transparent ${isFullScreenActive ? "md:!hidden" : ""}`}>
        {/* Branding */}
        <div className="flex items-center space-x-2.5 pb-3 border-b border-white/50 dark:border-white/10">
          <span className="text-2xl p-1.5 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-2xl border border-indigo-500/30 backdrop-blur-md shadow-sm">🎓</span>
          <div>
            <h2 className="text-base font-extrabold font-display tracking-tight text-indigo-600 dark:text-indigo-400">StudyMate</h2>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">VisionOS AI Suite</span>
          </div>
        </div>

        {/* User context widget */}
        <div className="p-3 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/80 dark:border-white/12 rounded-2xl flex items-center justify-between space-x-2 shadow-sm">
          <div className="flex items-center space-x-2.5 overflow-hidden">
            <span className="text-2xl p-1 bg-white/80 dark:bg-slate-800/80 rounded-xl shadow-inner border border-white/60 dark:border-white/10">
              {profile.avatar}
            </span>
            <div className="overflow-hidden">
              <h4 className="text-xs font-bold truncate text-slate-800 dark:text-slate-100">{profile.fullName}</h4>
              <span className="text-[9px] font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-50/80 dark:bg-indigo-950/60 border border-indigo-200/50 dark:border-indigo-800/40 px-1.5 py-0.5 rounded-md">
                Level {profile.level}
              </span>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            title="Log out Google Account"
            className="p-1.5 bg-slate-100/80 dark:bg-slate-800/80 hover:text-rose-500 rounded-xl hover:bg-rose-50/80 dark:hover:bg-rose-950/50 transition-all cursor-pointer text-xs border border-transparent hover:border-rose-300 dark:hover:border-rose-800/50"
          >
            ❌
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 space-y-1 overflow-y-auto pr-1 no-scrollbar select-none">
          {NAV_LINKS.map((link) => {
            const Icon = link.icon;
            const isSelected = currentTab === link.id;
            const theme = TAB_THEMES[link.id] || TAB_THEMES.dashboard;
            return (
              <button
                key={link.id}
                onClick={() => {
                  safeNavigateTab(link.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center space-x-2.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer border ${
                  isSelected 
                    ? `${theme.activeBg} ${theme.activeText} border-white/30 dark:border-white/20 shadow-lg ${theme.shadow} scale-[1.02] backdrop-blur-xl` 
                    : "bg-transparent border-transparent text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-slate-100 hover:border-white/40 dark:hover:border-white/10"
                }`}
              >
                <span className="text-xs leading-none shrink-0">{link.symbol}</span>
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{link.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Mobile top app bar */}
      <header className={`md:hidden bg-white/75 dark:bg-[#0c1326]/75 backdrop-blur-2xl border-b border-white/60 dark:border-white/10 px-4 py-2.5 flex justify-between items-center z-30 flex-shrink-0 shadow-sm ${isFullScreenActive ? "!hidden" : ""}`}>
        <div className="flex items-center space-x-2">
          <span className="text-xl">🎓</span>
          <h2 className="text-sm font-extrabold font-display tracking-tight text-indigo-600 dark:text-indigo-400">StudyMate</h2>
        </div>

        <div className="flex items-center space-x-2">
          <button 
            onClick={handleToggleDarkMode}
            className="p-1.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm cursor-pointer"
          >
            {darkMode ? "☀️" : "🌙"}
          </button>
          
          <button 
            onClick={() => safeNavigateTab("settings")}
            className={`p-1.5 rounded-xl transition cursor-pointer ${
              currentTab === "settings"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-indigo-600"
            }`}
            title="Settings"
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Mobile Drawer menu list overlays */}
      {mobileMenuOpen && !isFullScreenActive && (
        <div className="md:hidden fixed inset-0 top-[45px] bg-white dark:bg-slate-900 z-40 flex flex-col p-4 space-y-4">
          <h4 className="text-[10px] font-medium text-slate-400 uppercase tracking-widest border-b pb-2">Navigation Routes</h4>
          <div className="grid grid-cols-2 gap-2 overflow-y-auto max-h-[70%]">
            {NAV_LINKS.map((link) => {
              const Icon = link.icon;
              const isSelected = currentTab === link.id;
              const theme = TAB_THEMES[link.id] || TAB_THEMES.dashboard;
              return (
                <button
                  key={link.id}
                  onClick={() => {
                    safeNavigateTab(link.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center space-x-2 p-2.5 rounded-xl text-[11px] font-semibold border transition-all duration-150 ${
                    isSelected 
                      ? `${theme.activeBg} border-transparent text-white shadow-md ${theme.shadow} scale-[1.03]` 
                      : "bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <span className="text-sm leading-none shrink-0">{link.symbol}</span>
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{link.label}</span>
                </button>
              );
            })}
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-3 mt-auto flex items-center space-x-3 bg-slate-50 dark:bg-slate-800/20 p-2.5 rounded-2xl">
            <span className="text-2xl">{profile.avatar}</span>
            <div>
              <p className="text-xs font-semibold">{profile.fullName}</p>
              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">Level {profile.level} student</span>
            </div>
          </div>
        </div>
      )}

      {/* Main active screen tab contents viewport */}
      <main className={`flex-1 min-h-0 ${
        isFullScreenActive 
          ? "p-0 h-screen w-screen overflow-hidden flex flex-col" 
          : currentTab === "assistant"
            ? "p-2 sm:p-3 md:p-4 pb-20 md:pb-4 overflow-hidden h-full flex flex-col min-h-0"
            : "p-4 md:p-6 pb-24 md:pb-6 overflow-y-auto md:h-full"
      }`}>
        
        {/* App Header for notification center and theme triggers */}
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-2.5 border-b border-slate-100 dark:border-slate-800/80 ${isFullScreenActive ? "hidden" : ""}`}>
          <div>
            <h1 className="text-lg md:text-xl font-bold text-slate-950 dark:text-slate-50 tracking-tight capitalize flex items-center gap-2">
              <span>{currentTab === "dashboard" ? "🏠" : NAV_LINKS.find(l => l.id === currentTab)?.label === "10-Day Test" ? "🎯" : "📚"}</span>
              <span>{currentTab === "dashboard" ? `Welcome Back, ${profile?.fullName || "Student"}!` : `${NAV_LINKS.find(l => l.id === currentTab)?.label || currentTab}`}</span>
            </h1>
            <p className="text-xs text-slate-400 font-medium">
              {currentTab === "dashboard" 
                ? "Let's make study easy, structured, and fun today!" 
                : "Manage your active studies and boost your exam readiness."}
            </p>
          </div>

          {/* Quick Widgets panel */}
          <div className="flex items-center space-x-2 self-end sm:self-auto relative z-30">
            <button 
              onClick={() => setIsSearchOpen(true)}
              className="p-2 px-2.5 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-blue-500/10 border border-indigo-200/80 dark:border-indigo-800/60 hover:border-indigo-400 text-indigo-600 dark:text-indigo-300 rounded-xl shadow-sm transition text-xs font-semibold cursor-pointer flex items-center space-x-1.5"
              title="Flagship Universal Smart Search (Cmd+K)"
              aria-label="Universal Search"
            >
              <Search className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span className="hidden sm:inline-block font-mono text-[9px] font-bold text-slate-500 dark:text-slate-400 bg-white/80 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                ⌘K
              </span>
            </button>

            <button 
              onClick={() => {
                const nextSize = textSize === "sm" ? "md" : textSize === "md" ? "lg" : "sm";
                setTextSize(nextSize);
              }}
              className="p-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl shadow-sm transition text-xs font-semibold cursor-pointer flex items-center space-x-1"
              title={`Cycle Text Scaling: Current ${textSize}`}
              aria-label={`Cycle text scaling, current size is ${textSize}`}
            >
              <Type className="w-4 h-4 text-slate-500" />
              <span className="text-[10px] uppercase font-extrabold">{textSize}</span>
            </button>

            <button 
              onClick={() => {
                if (currentTab === "assistant" && aiSettingsHandlerRef.current) {
                  aiSettingsHandlerRef.current();
                } else {
                  setCurrentTab("settings");
                }
              }}
              className={`p-2 border rounded-xl shadow-sm transition text-xs font-semibold cursor-pointer flex items-center space-x-1 ${
                currentTab === "settings" 
                  ? "bg-indigo-600 border-indigo-600 text-white" 
                  : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
              title="Open Settings"
              aria-label="Open Settings"
            >
              <Settings className="w-4 h-4" />
            </button>

            <button 
              onClick={handleToggleDarkMode}
              className="p-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl shadow-sm transition text-xs font-medium cursor-pointer"
              title="Toggle theme mode"
            >
              {darkMode ? "☀️ Light" : "🌙 Dark"}
            </button>

            {/* Notification Bell */}
            <div className="relative">
              <button 
                onClick={() => setNotificationMenuOpen(!notificationMenuOpen)}
                className={`p-2 border hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl shadow-sm transition relative cursor-pointer ${
                  notificationMenuOpen 
                    ? "bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-950/40 dark:border-indigo-800/50" 
                    : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                }`}
                title="Study Inbox Notifications"
              >
                <Bell className="w-4 h-4" />
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white font-bold text-[9px] w-4.5 h-4.5 flex items-center justify-center rounded-full border-2 border-white dark:border-slate-950 animate-bounce">
                    {notifications.filter(n => !n.read).length}
                  </span>
                )}
              </button>

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
                          className="text-[10px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold px-2 py-1 rounded-lg transition cursor-pointer"
                        >
                          Clear All
                        </button>
                      </div>
                    </div>

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
        
        {/* Floating trigger alarm alert overlay */}
        {!focusLockdown && (
          <TriggeredAlarmsOverlay 
            triggeredAlarm={triggeredAlarm}
            profile={profile}
            onClearTriggeredAlarm={() => setTriggeredAlarm(null)}
            onNavigate={(tab) => safeNavigateTab(tab)}
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
            timetable={timetable}
            onAddTask={handleAddTask}
            onToggleTask={handleToggleTask}
            onNavigate={(tab) => safeNavigateTab(tab)}
            onTriggerAlarmChallenge={(alarm) => setTriggeredAlarm(alarm)}
            onToggleHabitDate={handleToggleHabitDate}
            onOpenSearch={() => setIsSearchOpen(true)}
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
            onUpdateTask={handleUpdateTask}
          />
        )}

        {currentTab === "alarms" && (
          <Alarms 
            alarms={alarms}
            profile={profile}
            onAddAlarm={handleAddAlarm}
            onToggleAlarm={handleToggleAlarm}
            onDeleteAlarm={handleDeleteAlarm}
            onUpdateAlarm={handleUpdateAlarm}
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
          <Suspense fallback={<CalendarSkeletonLoader />}>
            <CalendarView 
              tasks={tasks}
              timetable={timetable}
              profile={profile}
              alarms={alarms}
              habits={habits}
              onToggleTask={handleToggleTask}
              onToggleHabitDate={handleToggleHabitDate}
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
          <Suspense fallback={<GenericModuleSkeletonLoader tab="assessment" />}>
            <SyllabusTest 
              profile={profile}
              onAwardXP={handleAwardXP}
              onAddNotification={handleAddNotification}
            />
          </Suspense>
        )}

        {currentTab === "analytics" && (
          <Suspense fallback={<AnalyticsSkeletonLoader />}>
            <Analytics 
              profile={profile}
              tasks={tasks}
              habits={habits}
              badges={badges}
            />
          </Suspense>
        )}

        {currentTab === "profile" && (
          <Suspense fallback={<ProfileSkeletonLoader />}>
            <ProfileView 
              profile={profile}
              badges={badges}
              tasks={tasks}
              habits={habits}
              onUpdateProfile={handleUpdateProfile}
              onResetApp={handleResetApp}
            />
          </Suspense>
        )}

        {currentTab === "games" && (
          <Suspense fallback={<GamesSkeletonLoader />}>
            <EducationalGames 
              profile={profile}
              onAwardXP={handleAwardXP}
              onAddNotification={handleAddNotification}
            />
          </Suspense>
        )}

        {currentTab === "assistant" && (
          <div className="flex-1 min-h-0 h-full w-full flex flex-col overflow-hidden">
            <AIErrorBoundary>
              <Suspense fallback={<AISkeletonLoader />}>
                <StudyMateAI 
                  profile={profile}
                  onAwardXP={handleAwardXP}
                  onAddNotification={handleAddNotification}
                  isFullScreen={aiFullScreen}
                  onToggleFullScreen={toggleAiFullScreen}
                  onOpenAISettings={(fn) => {
                    aiSettingsHandlerRef.current = fn;
                  }}
                />
              </Suspense>
            </AIErrorBoundary>
          </div>
        )}

        {currentTab === "imageGen" && (
          <Suspense fallback={<AISkeletonLoader />}>
            <ImageGenerator />
          </Suspense>
        )}

        {currentTab === "chat" && (
          <Suspense fallback={<ChatSkeletonLoader />}>
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
          <Suspense fallback={<GenericModuleSkeletonLoader tab="settings" />}>
            <SettingsView 
              darkMode={darkMode}
              onToggleDarkMode={handleToggleDarkMode}
              profile={profile}
              syncStatus={syncStatus}
              onTriggerSync={handleTriggerSync}
              onDeleteAccount={handleDeleteAccount}
              textSize={textSize}
              onChangeTextSize={setTextSize}
            />
          </Suspense>
        )}

      </main>

      {/* Mobile persistent bottom navigation bar */}
      <div 
        id="mobile_bottom_bar" 
        className={`md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md bg-white/30 dark:bg-slate-900/30 backdrop-blur-2xl border border-white/20 dark:border-slate-800/40 z-40 p-2.5 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.12)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.45)] flex items-center justify-around select-none ${isFullScreenActive ? "!hidden" : ""}`}
      >
        {[
          { id: "dashboard", label: "Home", iconComponent: FlagshipHomeIcon, symbol: "🏠", activeColor: "text-indigo-600 dark:text-indigo-400" },
          { id: "games", label: "Games", iconComponent: FlagshipGamesIcon, symbol: "🎮", activeColor: "text-amber-500 dark:text-amber-400" },
          { id: "assistant", label: "AI", iconComponent: FlagshipAiIcon, symbol: "⚡", activeColor: "text-purple-600 dark:text-purple-400" },
          { id: "chat", label: "Chat", iconComponent: FlagshipChatIcon, symbol: "💬", activeColor: "text-emerald-500 dark:text-emerald-400" },
          { id: "profile", label: "Profile", iconComponent: FlagshipProfileIcon, symbol: "👤", activeColor: "text-pink-500 dark:text-pink-400" }
        ].map((link) => {
          const IconComp = link.iconComponent;
          const isSelected = currentTab === link.id;

          return (
            <button
              id={`nav_link_${link.id}`}
              key={link.id}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const rippleId = Date.now();
                setMobileRipples((prev) => [...prev, { id: rippleId, x, y }]);
                setTimeout(() => {
                  setMobileRipples((prev) => prev.filter((r) => r.id !== rippleId));
                }, 600);

                safeNavigateTab(link.id);
                setMobileMenuOpen(false);
              }}
              className="relative flex flex-col items-center justify-center min-w-[48px] min-h-[48px] cursor-pointer outline-none select-none px-2 py-1 z-10"
              style={{ touchAction: "manipulation" }}
            >
              {mobileRipples.filter(r => r.x !== undefined).map((r) => (
                <motion.span
                  key={r.id}
                  className="absolute bg-slate-400/20 dark:bg-indigo-500/10 rounded-full pointer-events-none"
                  style={{
                    left: r.x,
                    top: r.y,
                    width: 4,
                    height: 4,
                    transform: "translate(-50%, -50%)",
                  }}
                  initial={{ scale: 0, opacity: 0.8 }}
                  animate={{ scale: 15, opacity: 0 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              ))}

              <motion.div
                className="flex flex-col items-center justify-center space-y-0.5"
                whileTap={{ scale: 0.92, y: 1 }}
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                {isSelected && (
                  <motion.div
                    layoutId="activeMobileTabCapsule"
                    className="absolute inset-0 rounded-2xl bg-white/65 dark:bg-slate-800/65 border border-white/40 dark:border-slate-700/40 -z-10 shadow-sm"
                    transition={{ type: "spring", stiffness: 350, damping: 25 }}
                  />
                )}

                <div className="flex flex-col items-center justify-center py-0.5">
                  <IconComp isActive={isSelected} size={20} />
                </div>

                <AnimatePresence>
                  {isSelected && (
                    <motion.span
                      initial={{ opacity: 0, y: 4, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: "auto" }}
                      exit={{ opacity: 0, y: 4, height: 0 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className={`text-[9px] font-black uppercase tracking-wider ${link.activeColor}`}
                    >
                      {link.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            </button>
          );
        })}
      </div>

      {profile && (
        <UniversalSmartSearch 
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          onNavigate={(tab) => safeNavigateTab(tab)}
          profile={profile}
          tasks={tasks}
          alarms={alarms}
          timetable={timetable}
          habits={habits}
          onToggleTask={handleToggleTask}
          onToggleAlarm={handleToggleAlarm}
        />
      )}
    </div>
  );
};

interface TriggeredAlarmsOverlayProps {
  triggeredAlarm: Alarm | null;
  profile: UserProfile;
  onClearTriggeredAlarm: () => void;
  onNavigate: (tab: string) => void;
  onAwardXP: (xp: number) => void;
}

function TriggeredAlarmsOverlay({
  triggeredAlarm,
  onClearTriggeredAlarm,
  onNavigate,
  onAwardXP
}: TriggeredAlarmsOverlayProps) {
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
};

export default AppRouter;
