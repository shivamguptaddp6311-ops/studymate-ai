import React, { createContext, useContext, useState, useMemo, useCallback } from "react";
import { AppNotification } from "../types";
import { useAuth } from "./AuthProvider";

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

interface NotificationContextType {
  notifications: AppNotification[];
  setNotifications: React.Dispatch<React.SetStateAction<AppNotification[]>>;
  focusLockdown: boolean;
  setFocusLockdown: React.Dispatch<React.SetStateAction<boolean>>;
  handleAddNotification: (title: string, message: string, type: "info" | "alert" | "success" | "reminder") => void;
  handleMarkAsRead: (id: string) => void;
  handleClearSeenNotifications: () => void;
  handleClearAllNotifications: () => void;
  handleTriggerManualMorningNudge: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [focusLockdown, setFocusLockdown] = useState(false);
  const { getStorageKey } = useAuth();

  const handleAddNotification = useCallback((
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
  }, [focusLockdown, getStorageKey]);

  const handleMarkAsRead = useCallback((id: string) => {
    setNotifications((prev) => {
      const updated = prev.map(n => n.id === id ? { ...n, read: true } : n);
      localStorage.setItem(getStorageKey("studymate_notifications"), JSON.stringify(updated));
      return updated;
    });
  }, [getStorageKey]);

  const handleClearSeenNotifications = useCallback(() => {
    setNotifications((prev) => {
      const updated = prev.filter(n => !n.read);
      localStorage.setItem(getStorageKey("studymate_notifications"), JSON.stringify(updated));
      return updated;
    });
  }, [getStorageKey]);

  const handleClearAllNotifications = useCallback(() => {
    setNotifications([]);
    localStorage.setItem(getStorageKey("studymate_notifications"), JSON.stringify([]));
  }, [getStorageKey]);

  const handleTriggerManualMorningNudge = useCallback(() => {
    const today = new Date();
    const daySeed = today.getDate() + today.getMonth() * 31;
    const dailyIndex = daySeed % MORNING_MOTIVATIONAL_POOL.length;
    const morningNotice = MORNING_MOTIVATIONAL_POOL[dailyIndex];
    handleAddNotification(morningNotice.title, morningNotice.message, morningNotice.type);
    
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
  }, [handleAddNotification]);

  const contextValue = useMemo(() => ({
    notifications,
    setNotifications,
    focusLockdown,
    setFocusLockdown,
    handleAddNotification,
    handleMarkAsRead,
    handleClearSeenNotifications,
    handleClearAllNotifications,
    handleTriggerManualMorningNudge,
  }), [
    notifications,
    focusLockdown,
    handleAddNotification,
    handleMarkAsRead,
    handleClearSeenNotifications,
    handleClearAllNotifications,
    handleTriggerManualMorningNudge,
  ]);

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
};
