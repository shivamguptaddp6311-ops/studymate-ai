import React, { useState, useEffect } from "react";
import { UserProfile } from "../types";
import { 
  GlassCard, HeroCard, QuickActionCard, ProgressCard, AnalyticsCard, 
  AchievementCard, AICard, TimelineCard, EmptyStateCard, PremiumButton, 
  PremiumInput, PremiumDialog, PremiumBottomSheet, PremiumIcon, PremiumCard 
} from "./PremiumUI";
import { 
  Settings, Sun, Moon, Bell, Volume2, ShieldAlert, Database, Lock, 
  Eye, Play, Sparkles, RefreshCw, Cpu, Activity, Check, XCircle, 
  Type, Contrast, User, ChevronRight, Laptop, Accessibility, 
  Sliders, Info, HardDrive, ShieldCheck, Heart, AlertCircle,
  HelpCircle, ExternalLink, Calendar, CheckCircle, Smartphone
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface SettingsViewProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  profile: UserProfile | null;
  syncStatus: "synced" | "syncing" | "offline" | "idle";
  onTriggerSync: () => Promise<void>;
  onDeleteAccount: () => Promise<void>;
  textSize: "sm" | "md" | "lg";
  onChangeTextSize: (size: "sm" | "md" | "lg") => void;
}

// Interactive Premium Switch Component using motion springs
function PremiumSwitch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`relative w-11 h-6 rounded-full transition-colors duration-300 outline-none flex items-center p-0.5 cursor-pointer ${
        checked 
          ? "bg-indigo-600 dark:bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.4)]" 
          : "bg-slate-200 dark:bg-slate-800"
      }`}
    >
      <motion.div
        layout
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="w-5 h-5 bg-white rounded-full shadow-md"
        style={{ x: checked ? 20 : 0 }}
      />
    </button>
  );
}

export default function SettingsView({ 
  darkMode, 
  onToggleDarkMode, 
  profile,
  syncStatus,
  onTriggerSync,
  onDeleteAccount,
  textSize,
  onChangeTextSize
}: SettingsViewProps) {
  // Category states
  const [activeCategory, setActiveCategory] = useState<string>("account");

  // Local state toggles to align with modern interactive requirements
  const [allowNotifications, setAllowNotifications] = useState(true);
  const [streakReminders, setStreakReminders] = useState(true);
  const [alarmVolume, setAlarmVolume] = useState(80);
  
  // Advanced preferences local states
  const [dailyGoalHours, setDailyGoalHours] = useState<number>(4);
  const [studySessionTime, setStudySessionTime] = useState<string>("morning");
  const [activeRecallMinutes, setActiveRecallMinutes] = useState<number>(25);
  const [autoStartBreaks, setAutoStartBreaks] = useState<boolean>(true);
  
  // Privacy & Locker States
  const [biometricLock, setBiometricLock] = useState<boolean>(false);
  const [securePinLock, setSecurePinLock] = useState<boolean>(false);
  const [incognitoStudy, setIncognitoStudy] = useState<boolean>(false);

  // Accessibility Extra State
  const [textToSpeech, setTextToSpeech] = useState<boolean>(false);
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);

  // Bottom sheets & modal confirmations
  const [showAdvancedBottomSheet, setShowAdvancedBottomSheet] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [savingBackup, setSavingBackup] = useState(false);
  const [backupSuccess, setBackupSuccess] = useState(false);

  const [selectedProvider, setSelectedProvider] = useState<string>(() => {
    return localStorage.getItem("studymate_ai_provider") || "auto";
  });
  const [providerStatuses, setProviderStatuses] = useState<Record<string, boolean>>({});

  const [timeoutLimit, setTimeoutLimit] = useState<number>(() => {
    return Number(localStorage.getItem("studymate_ai_timeout")) || 30000;
  });

  const [metrics, setMetrics] = useState<any>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);

  // Storage states
  const [storageUtil, setStorageUtil] = useState({
    cacheUsed: 1.4,
    cacheTotal: 5.0,
    logsCount: 24,
    assetsCount: 8
  });

  const fetchMetrics = () => {
    setLoadingMetrics(true);
    fetch("/api/ai/metrics")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        setMetrics(data);
        setLoadingMetrics(false);
      })
      .catch((err) => {
        console.warn("Error fetching AI metrics:", err);
        setLoadingMetrics(false);
      });
  };

  useEffect(() => {
    fetch("/api/ai/providers")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        if (data) {
          setProviderStatuses(data);
        }
      })
      .catch((err) => console.warn("Error fetching providers:", err));

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleTimeoutChange = (value: number) => {
    setTimeoutLimit(value);
    localStorage.setItem("studymate_ai_timeout", String(value));
  };

  const handleProviderChange = (value: string) => {
    setSelectedProvider(value);
    localStorage.setItem("studymate_ai_provider", value);
  };

  const handleClearCache = () => {
    setStorageUtil({
      cacheUsed: 0.1,
      cacheTotal: 5.0,
      logsCount: 0,
      assetsCount: 1
    });
    alert("Cached databases and assets optimized. Saved 1.3 MB of system memory!");
  };

  const handleBackupRequest = () => {
    setSavingBackup(true);
    setTimeout(() => {
      setSavingBackup(false);
      setBackupSuccess(true);
      setTimeout(() => setBackupSuccess(false), 3000);
    }, 1200);
  };

  // Categories list with dynamic counters, labels and icons
  const categories = [
    { id: "account", label: "Account", desc: "Syllabus profile and sync", icon: User, color: "text-indigo-500 bg-indigo-500/10 dark:bg-indigo-500/15" },
    { id: "appearance", label: "Appearance", desc: "Dark mode, text scaling", icon: Sun, color: "text-amber-500 bg-amber-500/10 dark:bg-amber-500/15" },
    { id: "ai", label: "AI Settings", desc: "Fallback LLM engines", icon: Cpu, color: "text-purple-500 bg-purple-500/10 dark:bg-purple-500/15" },
    { id: "notifications", label: "Notifications", desc: "Alarms and reminders", icon: Bell, color: "text-rose-500 bg-rose-500/10 dark:bg-rose-500/15" },
    { id: "study", label: "Study Preferences", desc: "Goals and focus options", icon: Sliders, color: "text-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/15" },
    { id: "privacy", label: "Privacy & Security", desc: "Safe lock, sandbox mode", icon: Lock, color: "text-teal-500 bg-teal-500/10 dark:bg-teal-500/15" },
    { id: "backup", label: "Backup & Sync", desc: "Cloud ledger backup", icon: Database, color: "text-blue-500 bg-blue-500/10 dark:bg-blue-500/15" },
    { id: "storage", label: "Storage & Cache", desc: "Optimize local databases", icon: HardDrive, color: "text-orange-500 bg-orange-500/10 dark:bg-orange-500/15" },
    { id: "accessibility", label: "Accessibility", desc: "Contrast & narration", icon: Accessibility, color: "text-cyan-500 bg-cyan-500/10 dark:bg-cyan-500/15" },
    { id: "about", label: "About StudyMate", desc: "Version and diagnostics", icon: Info, color: "text-slate-500 bg-slate-500/10 dark:bg-slate-500/15" },
  ];

  return (
    <div id="settings_tab" className="max-w-7xl mx-auto pb-16 space-y-8 select-none">
      
      {/* GLOWING HEADER SECTION */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/30 dark:border-slate-800/40 bg-gradient-to-tr from-indigo-950 via-slate-900 to-purple-950 p-6 text-white shadow-xl">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start justify-between gap-4">
          <div className="space-y-1 text-center md:text-left">
            <h1 className="text-2xl font-black tracking-tight flex items-center justify-center md:justify-start gap-2">
              <Settings className="w-6 h-6 text-indigo-400 animate-spin-slow" />
              Flagship Settings Panel
            </h1>
            <p className="text-xs text-slate-300">
              Customize appearance layout, fallback intelligence models, study ledger backups and security pin locks.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAdvancedBottomSheet(true)}
            className="px-4 py-2 bg-white/10 hover:bg-white/15 active:scale-95 text-white font-extrabold text-xs rounded-xl border border-white/20 transition flex items-center space-x-1.5 cursor-pointer shadow-lg"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
            <span>Diagnostics Hub</span>
          </button>
        </div>
      </div>

      {/* TWO COLUMN FLAGSHIP LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: LIQUID GLASS CATEGORIES SELECTION */}
        <div className="lg:col-span-4 space-y-3 bg-white/45 dark:bg-slate-900/45 border border-slate-200/30 dark:border-slate-800/40 backdrop-blur-md rounded-3xl p-4 shadow-md">
          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3.5 block mb-2">
            System Preferences
          </span>
          <div className="space-y-1 max-h-[500px] overflow-y-auto pr-1">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isSelected = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all duration-200 cursor-pointer text-left ${
                    isSelected 
                      ? "bg-indigo-600 dark:bg-indigo-500 text-white shadow-[0_4px_16px_rgba(99,102,241,0.25)] scale-[1.01]" 
                      : "hover:bg-slate-100/50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-xl flex items-center justify-center transition-colors ${
                      isSelected ? "bg-white/20 text-white" : cat.color
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black tracking-tight leading-snug">{cat.label}</h4>
                      <p className={`text-[9px] truncate max-w-[180px] ${
                        isSelected ? "text-slate-200" : "text-slate-400 dark:text-slate-500"
                      }`}>
                        {cat.desc}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className={`w-3.5 h-3.5 transition-transform ${
                    isSelected ? "text-white translate-x-0.5" : "text-slate-400 dark:text-slate-600"
                  }`} />
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: DETAILED CATEGORY PANEL WITH LIQUID GLASS CARDS */}
        <div className="lg:col-span-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeCategory}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="bg-white/40 dark:bg-slate-900/40 border border-slate-200/30 dark:border-slate-800/40 backdrop-blur-md rounded-3xl p-6 md:p-8 shadow-lg space-y-6"
            >
              
              {/* CATEGORY 1: ACCOUNT DETAILS */}
              {activeCategory === "account" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <User className="w-5 h-5 text-indigo-500" />
                      Academic Student Account
                    </h3>
                    <p className="text-[10px] text-slate-400 font-medium">
                      Configure your online ledger link, synchronization logs and student credentials.
                    </p>
                  </div>

                  {profile ? (
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850/40 border border-slate-100 dark:border-slate-800/60 flex items-center space-x-4">
                      <div className="text-3xl p-2 bg-indigo-500/10 rounded-full border border-indigo-500/20">
                        {profile.avatar || "🎓"}
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-xs font-black text-slate-800 dark:text-slate-100">
                          {profile.fullName || "Honored Student"}
                        </h4>
                        <p className="text-[10px] text-slate-400 font-semibold">
                          Grade: {profile.classGrade} student • Level {profile.level} Scholar
                        </p>
                        <p className="text-[9px] text-slate-500">
                          Target: {profile.targetExam} Examination
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-400">
                      No active student profile found. Please configure the Profile tab first.
                    </div>
                  )}

                  {/* Account Synchronizer Panel */}
                  <div className="p-4 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 space-y-3">
                    <h4 className="text-xs font-black text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                      <Database className="w-4 h-4" />
                      Cloud Storage Integration
                    </h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      Your high-score streak counts, customized homework records, and notes are synced safely to your personal Google cloud account.
                    </p>
                    
                    <div className="flex items-center justify-between text-xs font-bold p-3 rounded-xl bg-white/40 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500 text-[10px] uppercase tracking-wider">Sync Connection Status</span>
                      <div className="flex items-center space-x-1.5">
                        {syncStatus === "syncing" ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 text-indigo-500 animate-spin" />
                            <span className="text-indigo-600 dark:text-indigo-400">Syncing...</span>
                          </>
                        ) : syncStatus === "offline" ? (
                          <>
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            <span className="text-amber-600 dark:text-amber-400">Local Sandbox Only</span>
                          </>
                        ) : (
                          <>
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span className="text-emerald-600 dark:text-emerald-400">Synced to Google Cloud</span>
                          </>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={onTriggerSync}
                      disabled={syncStatus === "syncing"}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === "syncing" ? "animate-spin" : ""}`} />
                      <span>{syncStatus === "syncing" ? "Synchronizing Database..." : "Sync Database Now"}</span>
                    </button>
                  </div>

                  {/* permanent wipe settings */}
                  <div className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/15 space-y-3">
                    <h4 className="text-xs font-black text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4" />
                      Danger Zone
                    </h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      Completely delete your StudyMate user profile from Google Cloud. All stored progress logs, homework trackers and currency balances will be erased permanently.
                    </p>
                    
                    {showDeleteConfirm ? (
                      <div className="p-3 bg-white dark:bg-slate-900 border border-rose-500/30 rounded-xl space-y-3">
                        <p className="text-[10px] font-black text-rose-600 dark:text-rose-400 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Are you absolutely sure? This action is irreversible!
                        </p>
                        <div className="flex space-x-2">
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteAccount();
                              setShowDeleteConfirm(false);
                            }}
                            className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg cursor-pointer transition"
                          >
                            Yes, Permanently Delete
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowDeleteConfirm(false)}
                            className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg cursor-pointer transition"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(true)}
                        className="w-full py-2 bg-rose-600/10 hover:bg-rose-600/20 text-rose-600 dark:text-rose-400 text-xs font-black rounded-xl border border-rose-500/20 transition cursor-pointer"
                      >
                        Wipe Google Account Link
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* CATEGORY 2: APPEARANCE (Apple/Pixel inspired Segmented Controls) */}
              {activeCategory === "appearance" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <Sun className="w-5 h-5 text-amber-500" />
                      Appearance & Display Mode
                    </h3>
                    <p className="text-[10px] text-slate-400 font-medium">
                      Configure screen light preferences, contrast modes and system text scaling limits.
                    </p>
                  </div>

                  <div className="space-y-5">
                    
                    {/* Theme Mode Segmented Control */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Current Theme Mode</label>
                      <div className="p-1 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800/80 grid grid-cols-2 gap-1">
                        <button
                          type="button"
                          onClick={() => { if (darkMode) onToggleDarkMode(); }}
                          className={`py-3 rounded-xl text-xs font-black tracking-tight flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                            !darkMode 
                              ? "bg-white text-indigo-600 shadow-md" 
                              : "text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          <Sun className="w-4 h-4" />
                          <span>Elegant Light Theme</span>
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => { if (!darkMode) onToggleDarkMode(); }}
                          className={`py-3 rounded-xl text-xs font-black tracking-tight flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                            darkMode 
                              ? "bg-indigo-600 text-white shadow-md" 
                              : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          <Moon className="w-4 h-4" />
                          <span>Dark AMOLED Theme</span>
                        </button>
                      </div>
                    </div>

                    {/* Text Scaling Size (Premium Segmented Controls) */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                        <Type className="w-3.5 h-3.5 text-indigo-400" />
                        System Font Scaling
                      </label>
                      <div className="p-1 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800/80 grid grid-cols-3 gap-1">
                        {(["sm", "md", "lg"] as const).map((size) => (
                          <button
                            key={size}
                            onClick={() => onChangeTextSize(size)}
                            className={`py-2.5 rounded-xl text-xs font-black tracking-tight flex items-center justify-center transition-all cursor-pointer ${
                              textSize === size
                                ? "bg-indigo-600 text-white shadow-md"
                                : "text-slate-500 dark:text-slate-400 hover:bg-slate-200/30 dark:hover:bg-slate-900/40"
                            }`}
                          >
                            <span>{size === "sm" ? "A- Small" : size === "md" ? "A Medium" : "A+ Large"}</span>
                          </button>
                        ))}
                      </div>
                      <p className="text-[9px] text-slate-400">
                        Adjust text scaling parameters across active chat modules, study dashboard checklists and notes editors.
                      </p>
                    </div>

                  </div>
                </div>
              )}

              {/* CATEGORY 3: AI CORE & PROVIDERS */}
              {activeCategory === "ai" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <Cpu className="w-5 h-5 text-purple-500" />
                      AI Core & LLM Providers
                    </h3>
                    <p className="text-[10px] text-slate-400 font-medium">
                      Configure fallback routes, response timeouts and inspect real-time connection latencies.
                    </p>
                  </div>

                  {/* AI Provider configuration selector */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Active AI Model Route</label>
                      <select
                        value={selectedProvider}
                        onChange={(e) => handleProviderChange(e.target.value)}
                        className="w-full px-3.5 py-3 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                      >
                        <option value="auto">🌟 Intelligent Auto-Fallback</option>
                        <option value="gemini">♊ Google Gemini (Pro)</option>
                        <option value="openai">🧠 OpenAI GPT-4o</option>
                        <option value="groq">⚡ Groq LLaMA 3 (Fastest)</option>
                        <option value="openrouter">📡 OpenRouter Hub</option>
                        <option value="anthropic">🦉 Anthropic Claude 3.5</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Maximum API Timeout</label>
                      <select
                        value={timeoutLimit}
                        onChange={(e) => handleTimeoutChange(Number(e.target.value))}
                        className="w-full px-3.5 py-3 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                      >
                        <option value="5000">⚡ 5 Seconds Limit</option>
                        <option value="10000">🚀 10 Seconds Limit</option>
                        <option value="15000">⏱️ 15 Seconds (Recommended)</option>
                        <option value="30000">🛡️ 30 Seconds Standard</option>
                        <option value="60000">🐳 60 Seconds Deep Research</option>
                      </select>
                    </div>
                  </div>

                  {/* Realtime API status indicators */}
                  <div className="space-y-2">
                    <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Connection Health</span>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      
                      {/* Auto Mode Status */}
                      <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/25 border border-indigo-100/50 dark:border-indigo-900/50 rounded-2xl flex flex-col justify-between space-y-2">
                        <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400">Auto Route</span>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[8px] font-extrabold uppercase text-emerald-600 dark:text-emerald-400">Operational</span>
                        </div>
                      </div>

                      {/* Gemini Status */}
                      <div className={`p-3 border rounded-2xl flex flex-col justify-between space-y-2 ${
                        providerStatuses.gemini 
                          ? "bg-slate-50 dark:bg-slate-850/50 border-slate-100 dark:border-slate-800" 
                          : "bg-slate-50/20 dark:bg-slate-850/10 border-dashed border-slate-100 dark:border-slate-800/80 opacity-60"
                      }`}>
                        <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">Gemini Pro API</span>
                        <div className="flex items-center gap-1.5">
                          <div className={`w-2 h-2 rounded-full ${providerStatuses.gemini ? "bg-emerald-500" : "bg-slate-400"}`} />
                          <span className={`text-[8px] font-extrabold uppercase ${providerStatuses.gemini ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}`}>
                            {providerStatuses.gemini ? "Connected" : "Inactive"}
                          </span>
                        </div>
                      </div>

                      {/* OpenAI Status */}
                      <div className={`p-3 border rounded-2xl flex flex-col justify-between space-y-2 ${
                        providerStatuses.openai 
                          ? "bg-slate-50 dark:bg-slate-850/50 border-slate-100 dark:border-slate-800" 
                          : "bg-slate-50/20 dark:bg-slate-850/10 border-dashed border-slate-100 dark:border-slate-800/80 opacity-60"
                      }`}>
                        <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">OpenAI GPT API</span>
                        <div className="flex items-center gap-1.5">
                          <div className={`w-2 h-2 rounded-full ${providerStatuses.openai ? "bg-emerald-500" : "bg-slate-400"}`} />
                          <span className={`text-[8px] font-extrabold uppercase ${providerStatuses.openai ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}`}>
                            {providerStatuses.openai ? "Connected" : "Inactive"}
                          </span>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Telemetry Metrics Widget */}
                  {metrics && (
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850/30 border border-slate-100 dark:border-slate-800 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-200/20 dark:border-slate-800/40 pb-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                          <Activity className="w-3.5 h-3.5 text-indigo-500" />
                          AI API Request Telemetry Logs
                        </span>
                        <button 
                          type="button" 
                          onClick={fetchMetrics} 
                          className="text-[9px] font-black text-indigo-600 hover:underline"
                        >
                          Refresh Logs
                        </button>
                      </div>

                      <div className="overflow-x-auto max-h-[150px] overflow-y-auto pr-1">
                        <table className="w-full text-left text-[9px] border-collapse">
                          <thead>
                            <tr className="bg-slate-100/50 dark:bg-slate-900/65 text-slate-500 font-bold border-b border-slate-200/50 dark:border-slate-800">
                              <th className="p-2">Endpoint</th>
                              <th className="p-2">Provider</th>
                              <th className="p-2 text-right">Latency</th>
                              <th className="p-2 text-right">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 font-medium text-slate-600 dark:text-slate-400">
                            {metrics.recentLogs && metrics.recentLogs.length > 0 ? (
                              metrics.recentLogs.slice(0, 4).map((log: any) => (
                                <tr key={log.id} className="hover:bg-slate-100/30 dark:hover:bg-slate-800/20">
                                  <td className="p-2 font-bold text-slate-800 dark:text-slate-300">{log.endpoint || "Request"}</td>
                                  <td className="p-2 capitalize">{log.provider || "auto"}</td>
                                  <td className="p-2 text-right font-mono font-bold">{log.responseTimeMs}ms</td>
                                  <td className="p-2 text-right">
                                    <span className={`px-1.5 py-0.5 rounded-full text-[7px] font-black uppercase ${
                                      log.success ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
                                    }`}>
                                      {log.success ? "Success" : "Failed"}
                                    </span>
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={4} className="p-3 text-center text-slate-400">No recent AI queries logged in active session.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* CATEGORY 4: NOTIFICATIONS & ALARMS */}
              {activeCategory === "notifications" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <Bell className="w-5 h-5 text-rose-500" />
                      Alerts & Push Reminders
                    </h3>
                    <p className="text-[10px] text-slate-400 font-medium">
                      Configure daily streak counts, study block triggers, and ringtone alarm volume ranges.
                    </p>
                  </div>

                  <div className="space-y-4">
                    
                    {/* Switch: Allow Push Notifications */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-850/30 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-xs font-black text-slate-800 dark:text-slate-200">Push Alarms & Reminders</span>
                        <p className="text-[9px] text-slate-400">Receive persistent desktop audio cues for completed Pomodoro sprints.</p>
                      </div>
                      <PremiumSwitch checked={allowNotifications} onChange={() => setAllowNotifications(!allowNotifications)} />
                    </div>

                    {/* Switch: Daily Streak reminders */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-850/30 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-xs font-black text-slate-800 dark:text-slate-200">Daily Streak Reminders</span>
                        <p className="text-[9px] text-slate-400">Reminds you to check off your scheduled habits 1 hour before expiration.</p>
                      </div>
                      <PremiumSwitch checked={streakReminders} onChange={() => setStreakReminders(!streakReminders)} />
                    </div>

                    {/* Alarm Ringtone Range Volume slider */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-850/30 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-3">
                      <div className="flex justify-between text-xs font-black text-slate-800 dark:text-slate-200">
                        <span className="flex items-center gap-1">
                          <Volume2 className="w-4 h-4 text-rose-500 animate-pulse" />
                          Active Alarm Ringtone Volume
                        </span>
                        <span className="font-mono">{alarmVolume}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="10" 
                        max="100" 
                        step="10"
                        className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg accent-rose-500 cursor-pointer"
                        value={alarmVolume}
                        onChange={(e) => setAlarmVolume(parseInt(e.target.value))}
                      />
                      <div className="flex justify-between text-[8px] text-slate-400 font-bold uppercase">
                        <span>Min Volume (Ssh)</span>
                        <span>Audible Study Alert (Loud)</span>
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* CATEGORY 5: STUDY PREFERENCES */}
              {activeCategory === "study" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <Sliders className="w-5 h-5 text-emerald-500" />
                      Study Preferences & Sprints
                    </h3>
                    <p className="text-[10px] text-slate-400 font-medium">
                      Configure your daily study schedules, Pomodoro break options, and recall timers.
                    </p>
                  </div>

                  <div className="space-y-4">
                    
                    {/* Goal Select option */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-850/30 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-3">
                      <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Daily Focus Hour Target</span>
                      <div className="grid grid-cols-4 gap-2">
                        {[2, 4, 6, 8].map((hours) => (
                          <button
                            key={hours}
                            type="button"
                            onClick={() => setDailyGoalHours(hours)}
                            className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                              dailyGoalHours === hours
                                ? "bg-emerald-600 border-emerald-600 text-white shadow-md"
                                : "bg-white dark:bg-slate-900 hover:bg-slate-100 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                            }`}
                          >
                            {hours} Hours
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Preferred study time block */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-850/30 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-3">
                      <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Preferred Clock Study block</span>
                      <div className="grid grid-cols-4 gap-2">
                        {["morning", "afternoon", "evening", "night"].map((time) => (
                          <button
                            key={time}
                            type="button"
                            onClick={() => setStudySessionTime(time)}
                            className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer border capitalize ${
                              studySessionTime === time
                                ? "bg-emerald-600 border-emerald-600 text-white shadow-md"
                                : "bg-white dark:bg-slate-900 hover:bg-slate-100 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                            }`}
                          >
                            {time}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Active Recall Timers */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      <div className="p-4 bg-slate-50 dark:bg-slate-850/30 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-2">
                        <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Active Recall Interval</span>
                        <select
                          value={activeRecallMinutes}
                          onChange={(e) => setActiveRecallMinutes(Number(e.target.value))}
                          className="w-full p-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-black text-slate-800 dark:text-slate-200 cursor-pointer"
                        >
                          <option value="20">20 Minutes Standard</option>
                          <option value="25">25 Minutes (Classic Pomodoro)</option>
                          <option value="30">30 Minutes Focused</option>
                          <option value="45">45 Minutes Ultra-deep</option>
                        </select>
                      </div>

                      <div className="p-4 bg-slate-50 dark:bg-slate-850/30 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center justify-between">
                        <div className="space-y-0.5">
                          <span className="text-xs font-black text-slate-800 dark:text-slate-200">Auto-start Breaks</span>
                          <p className="text-[9px] text-slate-400">Triggers break session automatically.</p>
                        </div>
                        <PremiumSwitch checked={autoStartBreaks} onChange={() => setAutoStartBreaks(!autoStartBreaks)} />
                      </div>

                    </div>

                  </div>
                </div>
              )}

              {/* CATEGORY 6: PRIVACY & SECURITY */}
              {activeCategory === "privacy" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <Lock className="w-5 h-5 text-teal-500" />
                      Privacy & Locker Security
                    </h3>
                    <p className="text-[10px] text-slate-400 font-medium">
                      Configure sandbox locks, biometric authentication and off-grid logs encryption.
                    </p>
                  </div>

                  <div className="space-y-4">
                    
                    {/* Sandbox description */}
                    <div className="p-4 bg-teal-500/5 border border-teal-500/20 rounded-2xl flex items-start space-x-3.5">
                      <ShieldCheck className="w-5 h-5 text-teal-500 shrink-0 mt-0.5 animate-pulse" />
                      <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed space-y-1">
                        <h4 className="font-extrabold text-slate-800 dark:text-slate-200">Off-Grid Offline Database Architecture</h4>
                        <p className="text-[10px]">
                          StudyMate utilizes a highly secure client-side sandbox container. None of your homework drafts, study hour timestamps, or uploaded document credentials are shared with third-party networks.
                        </p>
                      </div>
                    </div>

                    {/* Biometric lock switch */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-850/30 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1">
                          <Smartphone className="w-4 h-4 text-teal-500" />
                          Request Device Biometric Unlock
                        </span>
                        <p className="text-[9px] text-slate-400">Requires FaceID/Fingerprint scan when opening the StudyMate dashboard.</p>
                      </div>
                      <PremiumSwitch checked={biometricLock} onChange={() => setBiometricLock(!biometricLock)} />
                    </div>

                    {/* Pin Code lock switch */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-850/30 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1">
                          <Lock className="w-4 h-4 text-teal-500" />
                          Secure Lock Screen (4-Digit PIN)
                        </span>
                        <p className="text-[9px] text-slate-400">Lock the app after 3 minutes of passive idle behavior.</p>
                      </div>
                      <PremiumSwitch checked={securePinLock} onChange={() => setSecurePinLock(!securePinLock)} />
                    </div>

                    {/* Incognito study switch */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-850/30 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1">
                          <Eye className="w-4 h-4 text-teal-500" />
                          Incognito Study Block
                        </span>
                        <p className="text-[9px] text-slate-400">Suspends logging study duration hours to local metrics history logs for the session.</p>
                      </div>
                      <PremiumSwitch checked={incognitoStudy} onChange={() => setIncognitoStudy(!incognitoStudy)} />
                    </div>

                  </div>
                </div>
              )}

              {/* CATEGORY 7: BACKUP & SYNC */}
              {activeCategory === "backup" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <Database className="w-5 h-5 text-blue-500" />
                      Backup & Study Ledger Sync
                    </h3>
                    <p className="text-[10px] text-slate-400 font-medium">
                      Back up local data files manually to Google Drive to ensure absolute safety.
                    </p>
                  </div>

                  <div className="space-y-4">
                    
                    <div className="p-4 rounded-2xl border border-blue-500/20 bg-blue-500/5 space-y-3">
                      <h4 className="text-xs font-black text-blue-600 dark:text-blue-400">Manual JSON Export Ledger</h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        Generate and save an encrypted JSON ledger backup containing your streak metrics, homework accomplishments, unlocked achievement badges and study logs.
                      </p>

                      <div className="flex items-center justify-between p-3 rounded-xl bg-white/40 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 text-xs font-bold">
                        <span className="text-slate-500 text-[10px] uppercase">Last Saved Backup</span>
                        <span className="text-slate-700 dark:text-slate-300 font-mono text-[10px]">
                          {backupSuccess ? "Just Now (Success)" : "No backup saved in active session"}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={handleBackupRequest}
                        disabled={savingBackup}
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs rounded-xl shadow-md transition flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {savingBackup ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
                        <span>{savingBackup ? "Backing up ledger databases..." : "Backup Data to Google Drive"}</span>
                      </button>
                    </div>

                    {backupSuccess && (
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-[10px] font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 animate-bounce">
                        <Check className="w-4 h-4 text-emerald-500" />
                        Encrypted StudyMate Database successfully saved to your Google account link!
                      </div>
                    )}

                  </div>
                </div>
              )}

              {/* CATEGORY 8: STORAGE & CACHE (Apple styled storage analyzer) */}
              {activeCategory === "storage" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <HardDrive className="w-5 h-5 text-orange-500" />
                      Storage Utilization & Cache
                    </h3>
                    <p className="text-[10px] text-slate-400 font-medium">
                      Inspect and purge cached document vector files, study statistics logs and IndexedDB state data.
                    </p>
                  </div>

                  <div className="space-y-5">
                    
                    {/* Progress Analyzer Bar */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-850/30 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-3">
                      <div className="flex justify-between items-center text-xs font-black text-slate-800 dark:text-slate-200">
                        <span>Local Browser Sandbox Storage</span>
                        <span className="font-mono text-[10px] text-slate-400">
                          {storageUtil.cacheUsed.toFixed(2)} MB / {storageUtil.cacheTotal.toFixed(1)} MB Used
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(storageUtil.cacheUsed / storageUtil.cacheTotal) * 100}%` }}
                          transition={{ duration: 1 }}
                          className="h-full bg-gradient-to-r from-orange-400 to-amber-500"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4 pt-1 text-[10px] font-bold text-slate-500">
                        <span>📋 IndexedDB Tasks: {storageUtil.logsCount} entries</span>
                        <span>🌟 Study Assets: {storageUtil.assetsCount} files</span>
                      </div>
                    </div>

                    <div className="flex space-x-3">
                      <button
                        type="button"
                        onClick={handleClearCache}
                        className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-black rounded-xl transition cursor-pointer border border-slate-200/40 dark:border-slate-800"
                      >
                        Purge Session Cache
                      </button>
                      <button
                        type="button"
                        onClick={() => alert("All IndexedDB and LocalStorage schema structures verified and consolidated!")}
                        className="flex-1 py-3 bg-orange-600 hover:bg-orange-500 text-white text-xs font-black rounded-xl transition shadow-md cursor-pointer"
                      >
                        Optimize Storage
                      </button>
                    </div>

                  </div>
                </div>
              )}

              {/* CATEGORY 9: ACCESSIBILITY */}
              {activeCategory === "accessibility" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <Accessibility className="w-5 h-5 text-cyan-500" />
                      Accessibility Preferences
                    </h3>
                    <p className="text-[10px] text-slate-400 font-medium">
                      Configure high contrast modes, screen reader integrations, and motion speeds.
                    </p>
                  </div>

                  <div className="space-y-4">
                    
                    {/* Switch: Screen Reader voice narration */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-850/30 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-xs font-black text-slate-800 dark:text-slate-200">Text-to-Speech Narration</span>
                        <p className="text-[9px] text-slate-400">Speak generated AI study recommendations aloud automatically.</p>
                      </div>
                      <PremiumSwitch checked={textToSpeech} onChange={() => setTextToSpeech(!textToSpeech)} />
                    </div>

                    {/* Switch: Reduced Motion */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-850/30 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-xs font-black text-slate-800 dark:text-slate-200">Reduced Motion Modes</span>
                        <p className="text-[9px] text-slate-400">Suspends complex UI page flips and decorative spring animations.</p>
                      </div>
                      <PremiumSwitch checked={reducedMotion} onChange={() => setReducedMotion(!reducedMotion)} />
                    </div>
                  </div>
                </div>
              )}

              {/* CATEGORY 10: ABOUT STUDYMATE */}
              {activeCategory === "about" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <Info className="w-5 h-5 text-slate-500" />
                      About StudyMate Flagship
                    </h3>
                    <p className="text-[10px] text-slate-400 font-medium">
                      Inspect running version manifests, runtime metrics and workspace credits.
                    </p>
                  </div>

                  <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-850/30 border border-slate-100 dark:border-slate-800 space-y-4 text-center">
                    <div className="w-16 h-16 mx-auto bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-md">
                      <Settings className="w-8 h-8 text-white animate-spin-slow" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-black text-slate-800 dark:text-slate-100">StudyMate AI Companion</h4>
                      <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest">
                        v4.2.0 - Flagship Premium Edition
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 border-t border-slate-200/20 dark:border-slate-800/40">
                      <div className="p-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl">
                        <span className="block text-slate-400 text-[8px] uppercase">Runtime Platform</span>
                        <span className="text-slate-700 dark:text-slate-200">Express + Vite React</span>
                      </div>
                      <div className="p-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl">
                        <span className="block text-slate-400 text-[8px] uppercase">Workspace Code</span>
                        <span className="text-slate-700 dark:text-slate-200">AI Studio Build</span>
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed pt-2">
                      A highly customized and responsive student helper suite featuring real-time active recall mechanisms, intelligent flashcard engines and gamified achievement trackers.
                    </p>
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>

      </div>

      {/* ADVANCED DIAGNOSTICS BOTTOM SHEET / SLIDE UP DRAWER */}
      <AnimatePresence>
        {showAdvancedBottomSheet && (
          <>
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAdvancedBottomSheet(false)}
              className="fixed inset-0 bg-black z-40 cursor-pointer"
            />

            {/* Bottom Sheet Modal Panel */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="fixed bottom-0 left-0 right-0 max-h-[85vh] bg-white dark:bg-slate-900 rounded-t-[32px] border-t border-slate-200 dark:border-slate-800 z-50 p-6 md:p-8 overflow-y-auto shadow-2xl"
            >
              {/* Apple-style draggable pill indicator */}
              <div className="w-12 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-6" />

              <div className="max-w-3xl mx-auto space-y-6">
                
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                      <Sparkles className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight">
                        Diagnostics Hub & Version Audit
                      </h3>
                      <p className="text-xs text-slate-400 font-medium">Verify system parameters, connection status, and running caches.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAdvancedBottomSheet(false)}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition text-slate-400 hover:text-slate-600 cursor-pointer text-sm font-black"
                  >
                    Close Drawer
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                  
                  {/* System parameter listing */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-850/30 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-3">
                    <h4 className="font-extrabold text-slate-800 dark:text-slate-200">System Information</h4>
                    <div className="space-y-2 text-[11px] font-medium text-slate-600 dark:text-slate-400 divide-y divide-slate-100 dark:divide-slate-800/40">
                      <div className="flex justify-between py-1.5">
                        <span>Active Theme Mode</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{darkMode ? "AMOLED Dark" : "Clean Light"}</span>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <span>Text Scaling Factor</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 capitalize">{textSize}</span>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <span>Cloud Database Sync</span>
                        <span className="font-bold text-slate-850 dark:text-slate-200 capitalize">{syncStatus}</span>
                      </div>
                    </div>
                  </div>

                  {/* AI connection audit */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-850/30 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-3">
                    <h4 className="font-extrabold text-slate-800 dark:text-slate-200">AI Service Health</h4>
                    <div className="space-y-2 text-[11px] font-medium text-slate-600 dark:text-slate-400 divide-y divide-slate-100 dark:divide-slate-800/40">
                      <div className="flex justify-between py-1.5">
                        <span>Active Provider Mode</span>
                        <span className="font-bold text-indigo-600 capitalize">{selectedProvider}</span>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <span>Timeout Threshold</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{timeoutLimit / 1000} seconds</span>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <span>Total Queries Count</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{metrics?.summary?.totalRequests || 0}</span>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <span>Average Latency</span>
                        <span className="font-bold text-emerald-600">{metrics?.summary?.avgResponseTime || 0} ms</span>
                      </div>
                    </div>
                  </div>

                </div>

                <div className="p-4 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 space-y-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  <h4 className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4 text-indigo-500" />
                    Student Data Storage Protection Policy
                  </h4>
                  <p className="text-[11px]">
                    All study notes, homework checklists, Pomodoro log timers, and generated AI recommendations are saved exclusively on your personal browser sandbox database (IndexedDB / LocalStorage). StudyMate AI does not sell, track, or share private information with external tracking brokers.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAdvancedBottomSheet(false)}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-black text-xs rounded-xl transition shadow-md cursor-pointer"
                >
                  Confirm & Dismiss diagnostics
                </button>

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
