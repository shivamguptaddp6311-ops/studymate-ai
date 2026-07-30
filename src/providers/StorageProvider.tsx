import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { UserProfile, Task, Alarm, TimetableItem, Habit, Badge, AppNotification, DailyActivity } from "../types";
import { DEFAULT_BADGES } from "../data";
import { useAuth } from "./AuthProvider";
import { useNotifications } from "./NotificationProvider";

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

interface StorageContextType {
  profile: UserProfile | null;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile | null>>;
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  alarms: Alarm[];
  setAlarms: React.Dispatch<React.SetStateAction<Alarm[]>>;
  timetable: TimetableItem[];
  setTimetable: React.Dispatch<React.SetStateAction<TimetableItem[]>>;
  habits: Habit[];
  setHabits: React.Dispatch<React.SetStateAction<Habit[]>>;
  badges: Badge[];
  setBadges: React.Dispatch<React.SetStateAction<Badge[]>>;
  activityLog: DailyActivity[];
  setActivityLog: React.Dispatch<React.SetStateAction<DailyActivity[]>>;
  studyHoursToday: number;
  setStudyHoursToday: React.Dispatch<React.SetStateAction<number>>;
  showNewSignupWelcome: boolean;
  setShowNewSignupWelcome: React.Dispatch<React.SetStateAction<boolean>>;
  syncStatus: "synced" | "syncing" | "offline" | "idle";
  triggeredAlarm: Alarm | null;
  setTriggeredAlarm: React.Dispatch<React.SetStateAction<Alarm | null>>;
  
  triggerCloudSync: (
    currentProfile?: UserProfile | null,
    currentTasks?: Task[],
    currentAlarms?: Alarm[],
    currentTimetable?: TimetableItem[],
    currentHabits?: Habit[],
    currentBadges?: Badge[],
    currentNotifications?: AppNotification[]
  ) => Promise<void>;
  handleTriggerSync: () => Promise<void>;
  handleAwardXP: (xpAmount: number) => void;
  handleIncrementPomodoro: () => void;
  handleOnboardingComplete: (data: Omit<UserProfile, "xp" | "level" | "badges" | "unlockedFeatures" | "totalStudyHours">) => void;
  handleAddTask: (
    title: string, 
    priority: "High" | "Medium" | "Low", 
    subject: string, 
    deadline?: string, 
    notes?: string,
    estimatedTime?: number,
    reminderSet?: boolean
  ) => void;
  handleUpdateTask: (id: string, updates: Partial<Task>) => void;
  handleToggleTask: (id: string) => void;
  handleDeleteTask: (id: string) => void;
  handleAddAlarm: (
    time: string, 
    label: string, 
    subject: string, 
    repeatDays: number[], 
    ringtone: string, 
    vibration: boolean, 
    snoozeOption: boolean, 
    challengeMode: boolean, 
    triggerTimestamp?: number,
    priority?: "High" | "Medium" | "Low",
    color?: string
  ) => void;
  handleUpdateAlarm: (id: string, updates: Partial<Alarm>) => void;
  handleToggleAlarm: (id: string) => void;
  handleDeleteAlarm: (id: string) => void;
  handleAddTimetableItem: (day: string, time: string, subject: string, topic: string) => void;
  handleDeleteTimetableItem: (id: string) => void;
  handleEditTimetableItem: (id: string, updatedFields: Partial<TimetableItem>) => void;
  handleLoadAISchedule: (aiData: { timetable: TimetableItem[]; studyTips: string[] }, replace?: boolean) => void;
  handleToggleHabitDate: (id: string, dateStr: string) => void;
  handleAddHabit: (
    name: string, 
    icon: string, 
    color: string,
    subject?: string,
    reminderTime?: string,
    difficulty?: "Easy" | "Medium" | "Hard",
    xpReward?: number
  ) => void;
  handleDeleteHabit: (id: string) => void;
  handleUpdateProfile: (updates: Partial<UserProfile>) => void;
  handleResetApp: () => void;
  handleDeleteAccount: () => Promise<void>;
}

const StorageContext = createContext<StorageContextType | undefined>(undefined);

export const StorageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { loggedInEmail, sessionToken, setLoggedInEmail, setSessionToken, refreshClientToken, getStorageKey, setBooted, booted } = useAuth();
  const { notifications, setNotifications, handleAddNotification } = useNotifications();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [timetable, setTimetable] = useState<TimetableItem[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [activityLog, setActivityLog] = useState<DailyActivity[]>([]);
  const [studyHoursToday, setStudyHoursToday] = useState(2);
  const [syncStatus, setSyncStatus] = useState<"synced" | "syncing" | "offline" | "idle">("synced");
  const [triggeredAlarm, setTriggeredAlarm] = useState<Alarm | null>(null);
  const [lastTriggeredTime, setLastTriggeredTime] = useState("");

  const [showNewSignupWelcome, setShowNewSignupWelcome] = useState<boolean>(() => {
    const remember = window.localStorage.getItem("studymate_remember_me") === "true";
    if (!remember) return false;
    const loggedEmail = window.localStorage.getItem("studymate_logged_in_email") || "default";
    const dbPrefix = loggedEmail.replace(/[^a-zA-Z0-9]/g, "_");
    return window.localStorage.getItem(`studymate_show_welcome_${dbPrefix}`) === "true";
  });

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

  // Auto-Restore Sync Pull on auth
  useEffect(() => {
    if (!loggedInEmail) {
      setBooted(true);
      return;
    }

    const loadAndSyncData = async () => {
      setSyncStatus("syncing");

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

      setBooted(true);
      setSyncStatus(hasNetworkError ? "offline" : "synced");

      if (!serverData && finalProfile && !hasNetworkError) {
        triggerCloudSync(finalProfile, finalTasks, finalAlarms, finalTimetable, finalHabits, finalBadges, finalNotifications).catch((err) => {
          console.warn("Initial cloud sync error:", err);
        });
      }
    };

    loadAndSyncData().catch((err) => {
      console.warn("loadAndSyncData uncaught error:", err);
      setBooted(true);
      setSyncStatus("offline");
    });
  }, [loggedInEmail]);

  // Alarm clock ticking
  useEffect(() => {
    if (!booted || alarms.length === 0) return;

    const interval = setInterval(() => {
      const now = new Date();
      const currentHHMM = now.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" });

      const expiredCountdown = alarms.find(a => 
        a.isActive && 
        a.triggerTimestamp && 
        a.triggerTimestamp <= Date.now()
      );

      if (expiredCountdown) {
        setTriggeredAlarm(expiredCountdown);
        const nextAlarms = alarms.map(a => 
          a.id === expiredCountdown.id ? { ...a, isActive: false } : a
        );
        setAlarms(nextAlarms);
        localStorage.setItem(getStorageKey("studymate_alarms"), JSON.stringify(nextAlarms));
        return;
      }

      if (currentHHMM !== lastTriggeredTime) {
        const activeAlarm = alarms.find((a) => a.isActive && !a.triggerTimestamp && a.time === currentHHMM);
        if (activeAlarm) {
          const todayIdx = now.getDay();
          if (activeAlarm.repeatDays.length === 0 || activeAlarm.repeatDays.includes(todayIdx)) {
            setTriggeredAlarm(activeAlarm);
            setLastTriggeredTime(currentHHMM);
          }
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [booted, alarms, lastTriggeredTime]);

  const handleAwardXP = (xpAmount: number) => {
    if (!profile) return;
    const newXP = profile.xp + xpAmount;
    const newLevel = Math.floor(newXP / 300) + 1;

    const updated = {
      ...profile,
      xp: newXP,
      level: newLevel
    };

    setProfile(updated);
    localStorage.setItem(getStorageKey("studymate_profile"), JSON.stringify(updated));

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

  const handleOnboardingComplete = (data: Omit<UserProfile, "xp" | "level" | "badges" | "unlockedFeatures" | "totalStudyHours">) => {
    const freshProfile: UserProfile = {
      ...data,
      emailAddress: loggedInEmail || data.emailAddress,
      xp: 100,
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

  const handleAddTask = (
    title: string, 
    priority: "High" | "Medium" | "Low", 
    subject: string, 
    deadline?: string, 
    notes?: string,
    estimatedTime?: number,
    reminderSet?: boolean
  ) => {
    const newTask: Task = {
      id: `task-${Date.now()}`,
      title,
      completed: false,
      priority,
      subjectTag: subject,
      deadline: deadline || new Date().toISOString().split("T")[0],
      notes,
      dateCreated: new Date().toISOString().split("T")[0],
      estimatedTime: estimatedTime || 45,
      progress: 0,
      reminderSet: reminderSet || false
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

  const handleUpdateTask = (id: string, updates: Partial<Task>) => {
    const nextTasks = tasks.map((t) => {
      if (t.id === id) {
        return { ...t, ...updates };
      }
      return t;
    });
    setTasks(nextTasks);
    localStorage.setItem(getStorageKey("studymate_tasks"), JSON.stringify(nextTasks));
    triggerCloudSync(undefined, nextTasks, undefined, undefined, undefined, undefined, undefined);
  };

  const incrementSyllabusStudyDays = () => {
    try {
      const storageKeyPrefix = "studymate_syllabus";
      const savedDays = localStorage.getItem(`${storageKeyPrefix}_days_elapsed`);
      const currentDays = savedDays ? parseInt(savedDays) : 0;
      if (currentDays < 10) {
        const nextDays = currentDays + 1;
        localStorage.setItem(`${storageKeyPrefix}_days_elapsed`, String(nextDays));
      }
    } catch (e) {
      console.error("Failed to automatically increment study day tracker:", e);
    }
  };

  const handleToggleTask = (id: string) => {
    let xpGain = 0;
    const nextTasks = tasks.map((t) => {
      if (t.id === id) {
        const nextState = !t.completed;
        if (nextState) {
          xpGain = 50;
          incrementSyllabusStudyDays();
        }
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

  const handleAddAlarm = (
    time: string, 
    label: string, 
    subject: string, 
    repeatDays: number[], 
    ringtone: string, 
    vibration: boolean, 
    snoozeOption: boolean, 
    challengeMode: boolean, 
    triggerTimestamp?: number,
    priority?: "High" | "Medium" | "Low",
    color?: string
  ) => {
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
      triggerTimestamp,
      priority: priority || "Medium",
      color: color || "indigo"
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

  const handleUpdateAlarm = (id: string, updates: Partial<Alarm>) => {
    const nextAlarms = alarms.map((a) => {
      if (a.id === id) {
        return { ...a, ...updates };
      }
      return a;
    });
    setAlarms(nextAlarms);
    localStorage.setItem(getStorageKey("studymate_alarms"), JSON.stringify(nextAlarms));
    triggerCloudSync(undefined, undefined, nextAlarms, undefined, undefined, undefined, undefined);
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

  const handleLoadAISchedule = (aiData: { timetable: TimetableItem[]; studyTips: string[] }, replace = false) => {
    const combined = replace ? aiData.timetable : [...timetable, ...aiData.timetable];
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
          incrementSyllabusStudyDays();
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

  const handleAddHabit = (
    name: string, 
    icon: string, 
    color: string,
    subject?: string,
    reminderTime?: string,
    difficulty?: "Easy" | "Medium" | "Hard",
    xpReward?: number
  ) => {
    const newHabit: Habit = {
      id: `habit-${Date.now()}`,
      name,
      icon,
      color,
      datesCompleted: [],
      subject,
      reminderTime,
      difficulty,
      xpReward
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
    alert("Application data successfully wiped for your current Google Account! Returning to onboarding walkthrough.");
  };

  const contextValue = useMemo(() => ({
    profile,
    setProfile,
    tasks,
    setTasks,
    alarms,
    setAlarms,
    timetable,
    setTimetable,
    habits,
    setHabits,
    badges,
    setBadges,
    activityLog,
    setActivityLog,
    studyHoursToday,
    setStudyHoursToday,
    showNewSignupWelcome,
    setShowNewSignupWelcome,
    syncStatus,
    triggeredAlarm,
    setTriggeredAlarm,
    triggerCloudSync,
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
  }), [
    profile,
    tasks,
    alarms,
    timetable,
    habits,
    badges,
    activityLog,
    studyHoursToday,
    showNewSignupWelcome,
    syncStatus,
    triggeredAlarm
  ]);

  return (
    <StorageContext.Provider value={contextValue}>
      {children}
    </StorageContext.Provider>
  );
};

export const useStorage = (): StorageContextType => {
  const context = useContext(StorageContext);
  if (!context) {
    throw new Error("useStorage must be used within a StorageProvider");
  }
  return context;
};
