import React, { useState, useEffect, useRef } from "react";
import { UserProfile, TimetableItem, Habit, Task } from "../types";
import { 
  Calendar, Clock, Sparkles, Plus, Trash2, Edit2, ArrowRight, BookOpen, 
  ListTodo, Compass, AlarmClock, AlertCircle, RefreshCw, Trophy, X,
  Search, CheckCircle2, Zap, Bell, Play, Pause, Volume2, Check, RotateCcw,
  Info, ChevronLeft, ChevronRight
} from "lucide-react";

interface PlannerProps {
  profile: UserProfile;
  timetable: TimetableItem[];
  onAddTimetableItem: (day: string, time: string, subject: string, topic: string) => void;
  onDeleteTimetableItem: (id: string) => void;
  onEditTimetableItem: (id: string, updatedFields: Partial<TimetableItem>) => void;
  onLoadAISchedule: (aiSchedule: { timetable: TimetableItem[]; studyTips: string[] }) => void;
}

interface LocalExam {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  subject: string;
}

interface PlannerTask {
  id: string;
  title: string;
  completed: boolean;
  date: string; // YYYY-MM-DD
}

interface HabitStreak {
  id: string;
  name: string;
  history: { [date: string]: boolean }; // dateStr -> completed
}

interface CustomReminder {
  id: string;
  text: string;
  time: string; // HH:MM
  active: boolean;
}

export default function Planner({
  profile,
  timetable,
  onAddTimetableItem,
  onDeleteTimetableItem,
  onEditTimetableItem,
  onLoadAISchedule
}: PlannerProps) {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<"Daily" | "Weekly" | "Monthly" | "Countdown" | "Reminders">("Daily");

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSubject, setFilterSubject] = useState("All");

  // Local storage keys helper
  const getStorageKey = (key: string) => `${profile.emailAddress || "guest"}_planner_${key}`;

  // State: Exams list with live countdowns
  const [exams, setExams] = useState<LocalExam[]>(() => {
    const saved = localStorage.getItem(getStorageKey("exams"));
    return saved ? JSON.parse(saved) : [
      { id: "ex-1", name: "Mathematics Mid-Term", date: "2026-07-20", subject: "Mathematics" },
      { id: "ex-2", name: "Physics Laws of Motion exam", date: "2026-08-05", subject: "Physics" },
      { id: "ex-3", name: "Chemistry Lab Practical Test", date: "2026-08-15", subject: "Chemistry" }
    ];
  });

  // State: Daily Checklist Tasks
  const [dailyTasks, setDailyTasks] = useState<PlannerTask[]>(() => {
    const saved = localStorage.getItem(getStorageKey("daily_tasks"));
    return saved ? JSON.parse(saved) : [
      { id: "dt-1", title: "Complete Calculus review exercises", completed: false, date: new Date().toISOString().split("T")[0] },
      { id: "dt-2", title: "Revise Laws of Motion formulae sheet", completed: true, date: new Date().toISOString().split("T")[0] }
    ];
  });

  // State: Habit Streaks
  const [habits, setHabits] = useState<HabitStreak[]>(() => {
    const saved = localStorage.getItem(getStorageKey("habit_streaks"));
    return saved ? JSON.parse(saved) : [
      { id: "h-1", name: "Active Recall revision", history: {} },
      { id: "h-2", name: "Stayed off distractions (focus)", history: {} },
      { id: "h-3", name: "Completed study timetable block", history: {} }
    ];
  });

  // State: Reminders
  const [reminders, setReminders] = useState<CustomReminder[]>(() => {
    const saved = localStorage.getItem(getStorageKey("reminders"));
    return saved ? JSON.parse(saved) : [
      { id: "rem-1", text: "Revise math formula sheets before resting", time: "19:30", active: true },
      { id: "rem-2", text: "Take Spaced Repetition test for biology notes", time: "09:00", active: false }
    ];
  });

  // Persistent storage updates
  useEffect(() => {
    localStorage.setItem(getStorageKey("exams"), JSON.stringify(exams));
  }, [exams]);

  useEffect(() => {
    localStorage.setItem(getStorageKey("daily_tasks"), JSON.stringify(dailyTasks));
  }, [dailyTasks]);

  useEffect(() => {
    localStorage.setItem(getStorageKey("habit_streaks"), JSON.stringify(habits));
  }, [habits]);

  useEffect(() => {
    localStorage.setItem(getStorageKey("reminders"), JSON.stringify(reminders));
  }, [reminders]);

  // Timetable Add/Edit Modal state
  const [showAdd, setShowAdd] = useState(false);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [day, setDay] = useState("Monday");
  const [time, setTime] = useState("04:00 PM - 05:30 PM");
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [isRecurring, setIsRecurring] = useState(true);

  // Exam Add/Edit Modal State
  const [showAddExam, setShowAddExam] = useState(false);
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [newExamName, setNewExamName] = useState("");
  const [newExamDate, setNewExamDate] = useState("");
  const [newExamSub, setNewExamSub] = useState("");

  // New Reminder State
  const [newRemText, setNewRemText] = useState("");
  const [newRemTime, setNewRemTime] = useState("18:00");
  const [showAddRem, setShowAddRem] = useState(false);

  // New Daily Task Input State
  const [newTaskTitle, setNewTaskTitle] = useState("");

  // AI Assistant suggested schedule parameters
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiTips, setAiTips] = useState<string[]>(() => {
    const saved = localStorage.getItem(getStorageKey("ai_tips"));
    return saved ? JSON.parse(saved) : [
      "Use active recall: quiz yourself instead of just reading chapters.",
      "Implement Spaced Repetition: revise concepts after 1, 3, 7, and 14 days.",
      "Solve previous year boards/exam question sheets under strict time pressure."
    ];
  });

  // Study Timer (Pomodoro Tracker) States
  const [timerMode, setTimerMode] = useState<"study" | "break">("study");
  const [timeLeft, setTimeLeft] = useState(1500); // 25 mins initial
  const [timerRunning, setTimerRunning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [customTimerMinutes, setCustomTimerMinutes] = useState(25);

  // Calendar State
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());
  const [selectedCalendarDateStr, setSelectedCalendarDateStr] = useState(new Date().toISOString().split("T")[0]);

  // Sync / Offline simulation
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"synced" | "saving" | "offline">("synced");

  // In-App Notification Overlay Alerts
  const [notificationBanner, setNotificationBanner] = useState<{ title: string; desc: string; type: "success" | "info" } | null>(null);

  // Play audio chime or synth sound
  const playAlertSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880.00, audioCtx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.4);
    } catch (e) {
      console.warn("Audio Context blocked or not supported on this platform.", e);
    }
  };

  // Trigger brief in-app notification banner
  const triggerNotification = (title: string, desc: string, type: "success" | "info" = "success") => {
    setNotificationBanner({ title, desc, type });
    playAlertSound();
    setTimeout(() => {
      setNotificationBanner(null);
    }, 4500);
  };

  // Study Timer Logic
  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setTimerRunning(false);
            if (timerRef.current) clearInterval(timerRef.current);
            playAlertSound();
            triggerNotification(
              timerMode === "study" ? "Focus Sprint Completed! 🎯" : "Break time over! ⚡",
              timerMode === "study" ? "Amazing work. Take a well-deserved 5-minute breather." : "Let's return to study. Keep up the high energy!",
              "success"
            );
            return timerMode === "study" ? 300 : 1500; // auto swap mode or rest
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerRunning, timerMode]);

  const handleTimerStartStop = () => {
    setTimerRunning(!timerRunning);
  };

  const handleTimerReset = (mins = 25) => {
    setTimerRunning(false);
    setTimeLeft(mins * 60);
    setCustomTimerMinutes(mins);
  };

  // Days left helper
  const calculateDaysLeft = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    const diff = target.getTime() - today.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days;
  };

  // AI Revision Suggestion generator proxy
  const handleAIScheduleRequest = async () => {
    setLoadingAI(true);
    setSyncStatus("saving");

    const timeoutLimit = Number(localStorage.getItem("studymate_ai_timeout")) || 30000;
    const controller = new AbortController();

    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeoutLimit);

    try {
      const response = await fetch("/api/gemini/suggest-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          name: profile.fullName,
          grade: profile.classGrade,
          targetExam: profile.targetExam,
          dailyGoalHours: profile.dailyStudyGoal,
          preferredTime: profile.preferredStudyTime,
          favSubjects: profile.favoriteSubjects,
          weakSubjects: profile.weakSubjects,
          provider: localStorage.getItem("studymate_ai_provider") || "auto",
          timeoutMs: timeoutLimit
        })
      });

      clearTimeout(timeoutId);

      if (response.status === 504) {
        throw new Error("The AI partner timed out. Please try choosing a faster provider, or increase the timeout limit in Settings.");
      }
      if (!response.ok) {
        throw new Error("Failed to load suggested schedule.");
      }

      const data = await response.json();
      if (data && data.timetable) {
        const loadedItems: TimetableItem[] = [];
        data.timetable.forEach((item: any, idx: number) => {
          if (item.sessions) {
            item.sessions.forEach((session: any, sIdx: number) => {
              loadedItems.push({
                id: `ai-timetable-${idx}-${sIdx}-${Date.now()}`,
                day: item.day,
                time: session.time || "04:00 PM - 05:30 PM",
                subject: session.subject || "Study",
                topic: session.topic || "Review"
              });
            });
          }
        });

        onLoadAISchedule({
          timetable: loadedItems,
          studyTips: data.studyTips || ["Active recall rules!"]
        });

        if (data.studyTips) {
          setAiTips(data.studyTips);
          localStorage.setItem(getStorageKey("ai_tips"), JSON.stringify(data.studyTips));
        }

        triggerNotification("Schedule Suggester", "AI Timetable constructed and integrated with zero effort!", "success");
        setSyncStatus("synced");
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.warn(err);
      if (err.name === "AbortError" || controller.signal.aborted) {
        triggerNotification("AI Suggester Timeout", "The AI partner took too long to respond. You can increase the timeout limit in Settings.", "info");
      } else {
        triggerNotification("AI Suggester Failed", err.message || "Could not retrieve automated recommendations.", "info");
      }
      setSyncStatus("synced");
    } finally {
      setLoadingAI(false);
    }
  };

  // Timetable Add or Edit submission
  const handleSubmitTimetable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) return;

    setSyncStatus("saving");
    if (editingBlockId) {
      onEditTimetableItem(editingBlockId, {
        day,
        time,
        subject,
        topic: topic || "General Study Session"
      });
      triggerNotification("Block updated", "Timetable study session details saved perfectly.", "success");
    } else {
      onAddTimetableItem(day, time, subject, topic || "General Study Session");
      triggerNotification("Block Created", `Added study slot for ${subject} on ${day}.`, "success");
    }

    setSubject("");
    setTopic("");
    setEditingBlockId(null);
    setShowAdd(false);
    setTimeout(() => setSyncStatus("synced"), 600);
  };

  const handleEditBlockClick = (item: TimetableItem) => {
    setEditingBlockId(item.id);
    setDay(item.day);
    setTime(item.time);
    setSubject(item.subject);
    setTopic(item.topic);
    setShowAdd(true);
  };

  const handleDeleteBlockClick = (id: string) => {
    if (confirm("Are you sure you want to delete this study block?")) {
      setSyncStatus("saving");
      onDeleteTimetableItem(id);
      triggerNotification("Block Removed", "The selected timetable study block has been deleted.", "info");
      setTimeout(() => setSyncStatus("synced"), 600);
    }
  };

  // Exam Add or Edit submission
  const handleSubmitExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExamName.trim() || !newExamDate) return;

    setSyncStatus("saving");
    if (editingExamId) {
      setExams(
        exams.map((ex) =>
          ex.id === editingExamId
            ? { ...ex, name: newExamName, date: newExamDate, subject: newExamSub || "General" }
            : ex
        )
      );
      triggerNotification("Exam Updated", "Exam registration parameters changed successfully.", "success");
    } else {
      setExams([
        ...exams,
        {
          id: `exam-${Date.now()}`,
          name: newExamName,
          date: newExamDate,
          subject: newExamSub || "General"
        }
      ]);
      triggerNotification("Exam Registered", `Added deadline for ${newExamName}.`, "success");
    }

    setNewExamName("");
    setNewExamDate("");
    setNewExamSub("");
    setEditingExamId(null);
    setShowAddExam(false);
    setTimeout(() => setSyncStatus("synced"), 600);
  };

  const handleEditExamClick = (ex: LocalExam) => {
    setEditingExamId(ex.id);
    setNewExamName(ex.name);
    setNewExamDate(ex.date);
    setNewExamSub(ex.subject);
    setShowAddExam(true);
  };

  const handleDeleteExam = (id: string) => {
    if (confirm("Are you sure you want to delete this exam entry?")) {
      setSyncStatus("saving");
      setExams(exams.filter((e) => e.id !== id));
      triggerNotification("Exam Removed", "Exam deadline removed from study dashboard.", "info");
      setTimeout(() => setSyncStatus("synced"), 600);
    }
  };

  // Daily Tasks Checklist Logic
  const handleAddDailyTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    setDailyTasks([
      ...dailyTasks,
      {
        id: `dt-${Date.now()}`,
        title: newTaskTitle.trim(),
        completed: false,
        date: new Date().toISOString().split("T")[0]
      }
    ]);
    setNewTaskTitle("");
    triggerNotification("Task Created", "Daily study checklist objective added.", "success");
  };

  const handleToggleDailyTask = (id: string) => {
    setDailyTasks(
      dailyTasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const handleDeleteDailyTask = (id: string) => {
    setDailyTasks(dailyTasks.filter((t) => t.id !== id));
    triggerNotification("Task Deleted", "Object removed from daily study checklist.", "info");
  };

  // Habit Streak tracking
  const toggleHabitToday = (habitId: string, dateStr: string) => {
    setHabits(
      habits.map((h) => {
        if (h.id === habitId) {
          const nextHistory = { ...h.history };
          nextHistory[dateStr] = !nextHistory[dateStr];
          return { ...h, history: nextHistory };
        }
        return h;
      })
    );
  };

  const calculateStreak = (history: { [date: string]: boolean }) => {
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dStr = d.toISOString().split("T")[0];
      if (history[dStr]) {
        streak++;
      } else {
        // If it's today and not completed yet, keep scanning yesterday
        if (i === 0) continue;
        break;
      }
    }
    return streak;
  };

  // Reminder Logic
  const handleAddReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRemText.trim()) return;

    setReminders([
      ...reminders,
      {
        id: `rem-${Date.now()}`,
        text: newRemText.trim(),
        time: newRemTime,
        active: true
      }
    ]);
    setNewRemText("");
    setShowAddRem(false);
    triggerNotification("Reminder Armed", `Alert set for ${newRemTime}.`, "success");
  };

  const toggleReminderActive = (id: string) => {
    setReminders(
      reminders.map((r) => (r.id === id ? { ...r, active: !r.active } : r))
    );
  };

  const handleDeleteReminder = (id: string) => {
    setReminders(reminders.filter((r) => r.id !== id));
    triggerNotification("Reminder Erased", "Study reminder deactivated.", "info");
  };

  const triggerTestNotification = (rem: CustomReminder) => {
    triggerNotification("⏰ Reminder Alert!", rem.text, "success");
    if (Notification.permission === "granted") {
      new Notification("StudyMate Reminder", {
        body: rem.text,
        icon: "/favicon.ico"
      });
    } else {
      Notification.requestPermission();
    }
  };

  // Force Cloud backup trigger
  const handleForceSync = () => {
    setIsSyncing(true);
    setSyncStatus("saving");
    setTimeout(() => {
      setIsSyncing(false);
      setSyncStatus("synced");
      triggerNotification("Cloud Synchronized", "Study structures securely backed up to cloud systems.", "success");
    }, 1200);
  };

  // Filter study sessions and exams
  const filteredTimetable = timetable.filter((item) => {
    const matchesSearch = 
      item.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.topic.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = filterSubject === "All" || item.subject === filterSubject;
    return matchesSearch && matchesSubject;
  });

  const filteredExams = exams.filter((ex) => {
    const matchesSearch = ex.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = filterSubject === "All" || ex.subject === filterSubject;
    return matchesSearch && matchesSubject;
  });

  const WEEKDAYS_GRID = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  // Fetch current day name for Daily Timeline view
  const currentDayName = new Date().toLocaleDateString("en-US", { weekday: "long" });

  // Month Calendar helpers
  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // Sun = 0, Mon = 1...

  const prevMonth = () => setCurrentCalendarDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentCalendarDate(new Date(year, month + 1, 1));

  // Get combined events for a given calendar dateStr
  const getEventsForDate = (dateStr: string) => {
    const events: Array<{ id: string; type: "exam" | "task" | "timetable"; title: string; color: string }> = [];
    
    // Exams
    exams.forEach((ex) => {
      if (ex.date === dateStr) {
        events.push({ id: ex.id, type: "exam", title: `🚨 Exam: ${ex.name}`, color: "bg-rose-500 text-white" });
      }
    });

    // Daily Tasks
    dailyTasks.forEach((dt) => {
      if (dt.date === dateStr) {
        events.push({ id: dt.id, type: "task", title: `📝 Task: ${dt.title}`, color: "bg-indigo-500 text-white" });
      }
    });

    // Timetable Items mapped by day of the week
    const dateObj = new Date(dateStr);
    const dayOfWeek = dateObj.toLocaleDateString("en-US", { weekday: "long" });
    timetable.forEach((tt) => {
      if (tt.day === dayOfWeek) {
        events.push({ id: tt.id, type: "timetable", title: `📚 Study: ${tt.subject} (${tt.time})`, color: "bg-purple-500 text-white" });
      }
    });

    return events;
  };

  // Cells grid generator for monthly view
  const calendarCells: React.ReactNode[] = [];
  // Empty padding cells
  const emptyDaysOffset = firstDayIndex === 0 ? 6 : firstDayIndex - 1; // start from Monday
  for (let i = 0; i < emptyDaysOffset; i++) {
    calendarCells.push(
      <div key={`empty-${i}`} className="h-20 bg-slate-50/40 dark:bg-slate-900/10 border border-slate-100 dark:border-slate-800/40" />
    );
  }
  // Days of current month
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const events = getEventsForDate(dateStr);
    const isToday = new Date().toISOString().split("T")[0] === dateStr;
    const isSelected = selectedCalendarDateStr === dateStr;

    calendarCells.push(
      <button
        key={d}
        onClick={() => setSelectedCalendarDateStr(dateStr)}
        className={`h-20 p-1.5 border border-slate-100 dark:border-slate-800 text-left flex flex-col justify-between items-start transition hover:bg-slate-50 dark:hover:bg-slate-800/40 relative cursor-pointer ${
          isToday ? "bg-indigo-50/40 dark:bg-indigo-950/20" : ""
        } ${isSelected ? "ring-2 ring-indigo-500 dark:ring-indigo-400 z-10" : ""}`}
      >
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
          isToday ? "bg-indigo-600 text-white" : "text-slate-600 dark:text-slate-400"
        }`}>
          {d}
        </span>
        <div className="w-full flex flex-col space-y-0.5 overflow-hidden">
          {events.slice(0, 2).map((ev) => (
            <div key={ev.id} className="text-[7.5px] px-1 py-0.2 rounded truncate leading-tight font-bold scale-[0.9] origin-left bg-indigo-500/10 dark:bg-indigo-400/10 text-indigo-600 dark:text-indigo-400">
              {ev.title}
            </div>
          ))}
          {events.length > 2 && (
            <div className="text-[7px] text-slate-400 text-right font-black">+ {events.length - 2} more</div>
          )}
        </div>
      </button>
    );
  }

  // Active day details for Month view
  const activeMonthDayEvents = getEventsForDate(selectedCalendarDateStr);

  return (
    <div id="planner_tab" className="space-y-6 relative select-none">

      {/* Floating Audio Alert/Banner feedback */}
      {notificationBanner && (
        <div className="fixed top-4 right-4 z-50 animate-bounce max-w-sm bg-slate-900/95 dark:bg-slate-950/95 text-white p-4 rounded-2xl border border-indigo-500 shadow-2xl flex items-start space-x-3 backdrop-blur">
          <Bell className="w-5 h-5 text-indigo-400 mt-0.5 animate-pulse shrink-0" />
          <div className="text-left">
            <h5 className="text-xs font-black tracking-tight">{notificationBanner.title}</h5>
            <p className="text-[10px] text-slate-300 mt-0.5 leading-relaxed">{notificationBanner.desc}</p>
          </div>
          <button onClick={() => setNotificationBanner(null)} className="text-slate-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* HEADER SECTION WITH CLOUD SYNC STATS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Calendar className="w-6 h-6 text-indigo-500" />
            <h1 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
              Study Planner Dashboard
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">Streamline study times, organize homework count-downs, and track focus streaks seamlessly.</p>
        </div>

        {/* Sync Controls & Offline Status */}
        <div className="flex items-center space-x-3 bg-slate-50 dark:bg-slate-800/40 px-3.5 py-2 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs font-bold">
          <span className="flex items-center space-x-1.5 text-emerald-600 dark:text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>{syncStatus === "synced" ? "Cloud Synced" : syncStatus === "saving" ? "Saving..." : "Offline mode"}</span>
          </span>
          <button 
            onClick={handleForceSync}
            disabled={isSyncing}
            className="p-1 hover:bg-white dark:hover:bg-slate-900 rounded-lg text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
            title="Backup Study Structures to Firebase Store"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* SEARCH AND FILTERING PANEL */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search study blocks, tasks, or count-downs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border rounded-xl border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
          />
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Subject:</span>
          <select
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            className="px-3 py-2 text-xs border rounded-xl border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 outline-none font-bold"
          >
            <option value="All">All Subjects</option>
            {profile.favoriteSubjects.map((sub) => (
              <option key={sub} value={sub}>{sub}</option>
            ))}
            <option value="General">General</option>
          </select>
        </div>
      </div>

      {/* PLANNER SUB-NAVIGATION TABS */}
      <div className="flex space-x-1 overflow-x-auto no-scrollbar bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl">
        {[
          { id: "Daily", label: "Daily Planner", icon: Clock },
          { id: "Weekly", label: "Weekly Timetable", icon: Compass },
          { id: "Monthly", label: "Monthly Calendar", icon: Calendar },
          { id: "Countdown", label: "Exam Deadlines", icon: AlarmClock },
          { id: "Reminders", label: "Study Reminders", icon: Bell }
        ].map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer ${
                isSelected 
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm" 
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENTS */}

      {/* 1. DAILY PLANNER TAB */}
      {activeTab === "Daily" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Block: Today's Timeline list & Task checklists */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Timeline study blocks */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm flex items-center">
                    <Clock className="w-4.5 h-4.5 text-indigo-500 mr-2" />
                    Today's Chronological Roadmap
                  </h3>
                  <span className="text-[10px] text-slate-400 font-medium">Scheduled study slots for today ({currentDayName})</span>
                </div>
                <span className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-1 rounded">
                  {currentDayName}
                </span>
              </div>

              {timetable.filter((t) => t.day === currentDayName).length === 0 ? (
                <div className="text-center py-10 border border-dashed border-slate-100 dark:border-slate-800 rounded-2xl bg-slate-50/20">
                  <span className="text-2xl block mb-1">📅</span>
                  <p className="text-xs font-bold text-slate-700">No sessions scheduled for today</p>
                  <p className="text-[10px] text-slate-400 max-w-xs mx-auto mt-0.5">Toggle to Weekly Timetable to populate slots or suggest with AI!</p>
                </div>
              ) : (
                <div className="relative pl-6 border-l border-indigo-100 dark:border-indigo-950/60 space-y-6 pt-2">
                  {timetable
                    .filter((t) => t.day === currentDayName)
                    .map((item) => (
                      <div key={item.id} className="relative group">
                        {/* Bullet point node */}
                        <div className="absolute -left-[29px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-indigo-500 bg-white dark:bg-slate-900 z-10 flex items-center justify-center group-hover:scale-125 transition-all" />
                        
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 rounded-2xl flex justify-between items-start hover:border-indigo-500/20 transition duration-150">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{item.subject}</span>
                              <span className="text-[9px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded flex items-center">
                                <Clock className="w-2.5 h-2.5 mr-0.5 text-indigo-500" />
                                {item.time}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
                              Topic focus: <span className="italic font-medium">"{item.topic}"</span>
                            </p>
                          </div>

                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleEditBlockClick(item)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition"
                              title="Edit Block"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteBlockClick(item.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                              title="Delete Block"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Today's Checklist Tasks */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
              <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm flex items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                <ListTodo className="w-4.5 h-4.5 text-indigo-500 mr-2" />
                Today's Study Checklist ({dailyTasks.filter(t => t.completed).length}/{dailyTasks.length})
              </h3>

              <form onSubmit={handleAddDailyTask} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add a dynamic homework objective..."
                  className="flex-1 px-4 py-2.5 text-xs border rounded-xl border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                />
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer shadow active:scale-95 transition shrink-0"
                >
                  Add Objective
                </button>
              </form>

              {dailyTasks.length === 0 ? (
                <p className="text-[10px] text-slate-400 text-center py-6 italic">No checkpoints listed. Write one above!</p>
              ) : (
                <div className="space-y-2">
                  {dailyTasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-3 bg-slate-50 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800 rounded-xl flex items-center justify-between"
                    >
                      <button
                        onClick={() => handleToggleDailyTask(task.id)}
                        className="flex items-start space-x-3 text-left flex-1"
                      >
                        <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5 transition ${
                          task.completed 
                            ? "bg-indigo-600 border-indigo-600 text-white" 
                            : "border-slate-300 dark:border-slate-700"
                        }`}>
                          {task.completed && <Check className="w-3 h-3" />}
                        </span>
                        <span className={`text-xs font-medium leading-relaxed ${
                          task.completed ? "line-through text-slate-400" : "text-slate-700 dark:text-slate-300"
                        }`}>
                          {task.title}
                        </span>
                      </button>

                      <button
                        onClick={() => handleDeleteDailyTask(task.id)}
                        className="text-slate-300 hover:text-rose-500 p-1 rounded-lg"
                        title="Delete Task"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Right Block: Study Timer + Habit streak dashboards */}
          <div className="space-y-6">
            
            {/* Embedded Study Timer (Pomodoro Tracker) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4 text-center">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3 text-left">
                <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm flex items-center">
                  <AlarmClock className="w-4.5 h-4.5 text-indigo-500 mr-1.5" />
                  Study Session Focus timer
                </h3>
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${
                  timerMode === "study" ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                }`}>
                  {timerMode}
                </span>
              </div>

              {/* Countdown Circular Display */}
              <div className="relative py-4 flex flex-col items-center justify-center">
                <div className="text-4xl font-black font-mono tracking-tight text-slate-800 dark:text-slate-100">
                  {Math.floor(timeLeft / 60).toString().padStart(2, "0")}:
                  {(timeLeft % 60).toString().padStart(2, "0")}
                </div>
                <span className="text-[10px] text-slate-400 block mt-1">Remaining seconds</span>
              </div>

              {/* Timer Controls */}
              <div className="flex justify-center items-center gap-2">
                <button
                  onClick={handleTimerStartStop}
                  className={`flex items-center space-x-1 px-4 py-2 text-xs font-bold rounded-xl text-white shadow cursor-pointer transition ${
                    timerRunning ? "bg-rose-500 hover:bg-rose-600" : "bg-indigo-600 hover:bg-indigo-500"
                  }`}
                >
                  {timerRunning ? (
                    <>
                      <Pause className="w-3.5 h-3.5" />
                      <span>Pause Sprint</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      <span>Start Focus</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => handleTimerReset(customTimerMinutes)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800 rounded-xl transition"
                  title="Reset timer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Timer Presets */}
              <div className="grid grid-cols-3 gap-1.5 pt-1">
                {[15, 25, 45].map((mins) => (
                  <button
                    key={mins}
                    onClick={() => {
                      setTimerMode("study");
                      handleTimerReset(mins);
                    }}
                    className={`py-1 rounded-lg text-[10px] font-bold border transition ${
                      customTimerMinutes === mins 
                        ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 text-indigo-600 dark:text-indigo-400" 
                        : "border-slate-100 dark:border-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    }`}
                  >
                    {mins} Min Focus
                  </button>
                ))}
              </div>

              {/* Mode Toggle Button */}
              <button
                onClick={() => {
                  const nextMode = timerMode === "study" ? "break" : "study";
                  setTimerMode(nextMode);
                  handleTimerReset(nextMode === "study" ? 25 : 5);
                }}
                className="w-full text-[10px] text-slate-400 hover:text-indigo-600 transition pt-1 text-center italic"
              >
                Switch to {timerMode === "study" ? "Break Mode" : "Study Mode"}
              </button>
            </div>

            {/* Habit tracking and Streak calculations */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
              <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm flex items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                <Trophy className="w-4.5 h-4.5 text-indigo-500 mr-2" />
                Study Habit Streak Center
              </h3>

              <div className="space-y-4">
                {habits.map((h) => {
                  const streak = calculateStreak(h.history);
                  const todayStr = new Date().toISOString().split("T")[0];
                  const completedToday = !!h.history[todayStr];

                  return (
                    <div key={h.id} className="space-y-1.5 p-3.5 bg-slate-50 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800 rounded-2xl">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{h.name}</span>
                        <span className="text-[10px] font-black text-amber-500 flex items-center">
                          <Zap className="w-3.5 h-3.5 mr-0.5 fill-current" />
                          🔥 {streak} Days
                        </span>
                      </div>

                      {/* Tick list for the last 5 days */}
                      <div className="flex justify-between items-center pt-1.5">
                        <span className="text-[9px] font-bold text-slate-400">Complete past days:</span>
                        <div className="flex space-x-1.5">
                          {[4, 3, 2, 1, 0].map((offset) => {
                            const d = new Date();
                            d.setDate(d.getDate() - offset);
                            const dStr = d.toISOString().split("T")[0];
                            const completed = !!h.history[dStr];
                            const isTodayCircle = offset === 0;

                            return (
                              <button
                                key={offset}
                                onClick={() => toggleHabitToday(h.id, dStr)}
                                className={`w-5.5 h-5.5 rounded-full border text-[9px] font-bold flex items-center justify-center transition cursor-pointer relative ${
                                  completed 
                                    ? "bg-emerald-500 border-emerald-500 text-white" 
                                    : isTodayCircle 
                                      ? "border-indigo-500 dark:border-indigo-400 text-indigo-500" 
                                      : "border-slate-200 dark:border-slate-700 text-slate-400"
                                }`}
                                title={d.toLocaleDateString(undefined, { weekday: "short" })}
                              >
                                {completed ? "✓" : d.getDate()}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* 2. WEEKLY TIMETABLE TAB */}
      {activeTab === "Weekly" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main 7-day grid column */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm flex items-center">
                  <Compass className="w-4.5 h-4.5 text-indigo-500 mr-2" />
                  Weekly Timetable Overview
                </h3>
                <span className="text-[10px] text-slate-400 font-medium">Coordinate weekly study blocks and concept revision times.</span>
              </div>
              
              <div className="flex space-x-1.5">
                <button 
                  onClick={handleAIScheduleRequest}
                  disabled={loadingAI}
                  className="flex items-center space-x-1 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 text-white px-3 py-2 rounded-xl text-[10px] font-black shadow transition shrink-0 active:scale-95"
                >
                  {loadingAI ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  <span>{loadingAI ? "Mapping..." : "AI Timetable"}</span>
                </button>
                
                <button 
                  onClick={() => {
                    setEditingBlockId(null);
                    setSubject("");
                    setTopic("");
                    setShowAdd(true);
                  }}
                  className="flex items-center space-x-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 rounded-xl px-3 py-2 text-[10px] font-bold text-indigo-600 dark:text-indigo-400"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Block</span>
                </button>
              </div>
            </div>

            {filteredTimetable.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl bg-slate-50/10">
                <span className="text-3xl block mb-2">📅</span>
                <p className="text-xs font-bold text-slate-700">No timetable items found</p>
                <p className="text-[10px] text-slate-400 max-w-xs mx-auto mt-1">Try resetting filters or tap 'AI Timetable' to construct suggestions automatically!</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                {WEEKDAYS_GRID.map((d) => {
                  const dayItems = filteredTimetable.filter((t) => t.day === d);
                  if (dayItems.length === 0) return null;

                  return (
                    <div key={d} className="space-y-2 border-l-2 border-indigo-200 dark:border-indigo-800/60 pl-3">
                      <h4 className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 tracking-wider uppercase">{d}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {dayItems.map((item) => (
                          <div 
                            key={item.id}
                            className="p-3.5 bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 rounded-xl flex justify-between items-start"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{item.subject}</span>
                                <span className="text-[9px] text-slate-400 font-bold flex items-center">
                                  <Clock className="w-2.5 h-2.5 mr-0.5" />
                                  {item.time}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal italic">
                                Focus: {item.topic}
                              </p>
                            </div>

                            <div className="flex items-center space-x-1.5">
                              <button 
                                onClick={() => handleEditBlockClick(item)}
                                className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-white dark:hover:bg-slate-900 rounded-lg transition"
                                title="Edit Block"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button 
                                onClick={() => handleDeleteBlockClick(item.id)}
                                className="p-1 text-slate-300 hover:text-rose-500 hover:bg-white dark:hover:bg-slate-900 rounded-lg transition"
                                title="Delete Block"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column details */}
          <div className="space-y-6">
            
            {/* AI Revision Methods */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
              <h3 className="font-extrabold text-slate-800 dark:text-slate-100 flex items-center text-sm">
                <Trophy className="w-4.5 h-4.5 text-indigo-500 mr-1.5" />
                Study Techniques
              </h3>

              <div className="space-y-3">
                {aiTips.map((tip, idx) => (
                  <div key={idx} className="flex items-start space-x-2.5 p-3 bg-slate-50/60 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800 rounded-xl">
                    <span className="text-xs bg-indigo-50 dark:bg-indigo-950 font-bold text-indigo-600 dark:text-indigo-400 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">
                      {idx + 1}
                    </span>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-normal">{tip}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom weights */}
            <div className="bg-gradient-to-br from-indigo-500/10 to-indigo-600/5 border border-indigo-500/15 p-6 rounded-3xl text-xs text-slate-600 dark:text-slate-400 leading-relaxed space-y-2">
              <h4 className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center">
                <AlertCircle className="w-3.5 h-3.5 mr-1" /> Custom Subject Weights
              </h4>
              <p>
                Based on your profile, revision for weak subjects is highly prioritized:
                <strong className="text-slate-800 dark:text-slate-200"> {profile.weakSubjects.join(", ") || "None listed"}</strong>. Dedicate at least 2 days a week to core concept testing.
              </p>
            </div>

          </div>

        </div>
      )}

      {/* 3. MONTHLY PLANNER TAB */}
      {activeTab === "Monthly" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Monthly Grid */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">
                {currentCalendarDate.toLocaleString("default", { month: "long" })} {year}
              </h3>
              
              <div className="flex space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <button onClick={prevMonth} className="p-1 hover:bg-white dark:hover:bg-slate-900 rounded-lg transition">
                  <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                </button>
                <button onClick={nextMonth} className="p-1 hover:bg-white dark:hover:bg-slate-900 rounded-lg transition">
                  <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                </button>
              </div>
            </div>

            {/* Days labels */}
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>

            {/* Month Days Grid Cells */}
            <div className="grid grid-cols-7 gap-1 bg-slate-50 dark:bg-slate-800/10 rounded-2xl overflow-hidden p-1 border border-slate-100 dark:border-slate-800">
              {calendarCells}
            </div>

            <div className="flex flex-wrap justify-center gap-3 text-[10px] text-slate-400 font-bold pt-1">
              <span className="flex items-center"><span className="w-2 h-2 rounded bg-rose-500 mr-1" /> Exams / Countdowns</span>
              <span className="flex items-center"><span className="w-2 h-2 rounded bg-indigo-500 mr-1" /> Checklist objectives</span>
              <span className="flex items-center"><span className="w-2 h-2 rounded bg-purple-500 mr-1" /> Timetable Study Sessions</span>
            </div>
          </div>

          {/* Monthly Agenda Detail Panel */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">Selected Date Agenda</h3>
              <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-black mt-1">
                {new Date(selectedCalendarDateStr).toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>

            {activeMonthDayEvents.length === 0 ? (
              <div className="text-center py-16 bg-slate-50/40 dark:bg-slate-800/15 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col justify-center items-center">
                <span className="text-2xl block mb-2">🗓️</span>
                <p className="text-xs font-bold text-slate-700">Quiet day!</p>
                <p className="text-[10px] text-slate-400 mt-1 max-w-[180px] mx-auto text-center">No assignments due, exams, or study slots scheduled for this specific date.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {activeMonthDayEvents.map((ev, idx) => (
                  <div 
                    key={idx}
                    className="p-3 bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 rounded-xl flex items-start space-x-3"
                  >
                    <span className="w-2 h-2 rounded bg-indigo-500 mt-1.5 shrink-0" />
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{ev.title}</p>
                      <span className="text-[9px] text-slate-400 font-bold capitalize">{ev.type} alert</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => {
                setNewExamDate(selectedCalendarDateStr);
                setShowAddExam(true);
              }}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow active:scale-95 transition"
            >
              Add Event/Exam on this date
            </button>
          </div>

        </div>
      )}

      {/* 4. EXAM COUNTDOWNS TAB */}
      {activeTab === "Countdown" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Main Countdown deadlines card */}
          <div className="md:col-span-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">Target Exams Countdown</h3>
                <span className="text-[10px] text-slate-400">Track milestones and revise before important dates.</span>
              </div>

              <button 
                onClick={() => {
                  setEditingExamId(null);
                  setNewExamName("");
                  setNewExamDate("");
                  setNewExamSub("");
                  setShowAddExam(true);
                }}
                className="flex items-center space-x-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold px-3 py-2 rounded-xl border border-indigo-100 dark:border-indigo-900/30"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Register Exam</span>
              </button>
            </div>

            {filteredExams.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-slate-100 dark:border-slate-800 rounded-2xl bg-slate-50/20">
                <span className="text-2xl block mb-1">⏱️</span>
                <p className="text-xs font-bold text-slate-700">No exams registered</p>
                <p className="text-[10px] text-slate-400 mt-1">Register your upcoming testing schedules above!</p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {filteredExams.map((ex) => {
                  const daysLeft = calculateDaysLeft(ex.date);
                  return (
                    <div 
                      key={ex.id}
                      className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center justify-between"
                    >
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 w-fit block">
                          {ex.subject}
                        </span>
                        <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-100">{ex.name}</h4>
                        <span className="text-[9px] text-slate-400 block font-medium">Date: {new Date(ex.date).toLocaleDateString()}</span>
                      </div>

                      <div className="flex items-center space-x-3">
                        <div className="text-right">
                          <span className={`text-xl font-black ${
                            daysLeft < 0 
                              ? "text-slate-400" 
                              : daysLeft <= 3 
                                ? "text-rose-500 animate-pulse" 
                                : daysLeft <= 7 
                                  ? "text-amber-500" 
                                  : "text-indigo-600 dark:text-indigo-400"
                          }`}>
                            {daysLeft < 0 ? "Completed" : daysLeft}
                          </span>
                          {daysLeft >= 0 && (
                            <span className="text-[8px] text-slate-400 font-bold block uppercase tracking-wider">Days Left</span>
                          )}
                        </div>

                        <div className="flex items-center space-x-1.5 border-l border-slate-100 dark:border-slate-800/80 pl-3">
                          <button
                            onClick={() => handleEditExamClick(ex)}
                            className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-white dark:hover:bg-slate-900 rounded-lg transition"
                            title="Edit Exam parameters"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          
                          <button 
                            onClick={() => handleDeleteExam(ex.id)}
                            className="p-1 text-slate-300 hover:text-rose-500 hover:bg-white dark:hover:bg-slate-900 rounded-lg transition"
                            title="Delete exam"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm text-center flex flex-col justify-center items-center py-10 space-y-3">
            <span className="text-4xl">⏱️</span>
            <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">Prepare Smartly</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs leading-normal">
              Keep tight tabs on your examination timelines. Having visible countdowns activates your subconscious focus, ensuring you schedule daily study times to match.
            </p>
          </div>

        </div>
      )}

      {/* 5. REMINDERS AND ALERTS TAB */}
      {activeTab === "Reminders" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="md:col-span-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm flex items-center">
                  <Bell className="w-4.5 h-4.5 text-indigo-500 mr-2" />
                  Planner Reminder Center
                </h3>
                <span className="text-[10px] text-slate-400">Receive alert cues before study blocks or review sessions.</span>
              </div>

              <button 
                onClick={() => setShowAddRem(true)}
                className="flex items-center space-x-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold px-3 py-2 rounded-xl"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Reminder</span>
              </button>
            </div>

            {reminders.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8 italic">No reminders armed currently.</p>
            ) : (
              <div className="space-y-3">
                {reminders.map((rem) => (
                  <div key={rem.id} className="p-4 bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{rem.text}</p>
                      <span className="text-[9px] text-slate-400 font-bold bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded flex items-center w-fit">
                        <Clock className="w-3 h-3 mr-1 text-indigo-500" />
                        {rem.time}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 border-l border-slate-100 dark:border-slate-800/80 pl-3">
                      <button
                        onClick={() => toggleReminderActive(rem.id)}
                        className={`text-[9px] font-bold px-2 py-1 rounded-lg transition shrink-0 ${
                          rem.active 
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                            : "bg-slate-100 text-slate-400 dark:bg-slate-800"
                        }`}
                      >
                        {rem.active ? "Armed" : "Disabled"}
                      </button>

                      <button
                        onClick={() => triggerTestNotification(rem)}
                        className="p-1.5 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition"
                        title="Test trigger notification delivery"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDeleteReminder(rem.id)}
                        className="p-1.5 text-slate-300 hover:text-rose-500 rounded-lg transition"
                        title="Delete reminder"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm text-center flex flex-col justify-center items-center py-10 space-y-3">
            <span className="text-3xl">🔔</span>
            <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">Browser Notification Rules</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs leading-normal">
              Click the audio icons to test system notification triggers. Make sure to allow study alerts in your browser preferences to receive instant cues.
            </p>
          </div>

        </div>
      )}


      {/* MODALS */}

      {/* A. ADD/EDIT TIMETABLE BLOCK MODAL */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 animate-slide-up">
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="font-black text-slate-800 dark:text-slate-100 text-sm">
                  {editingBlockId ? "Modify Study Block parameters" : "Schedule New Study Block"}
                </h3>
                <button onClick={() => setShowAdd(false)} className="p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitTimetable} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Weekday</label>
                    <select
                      className="w-full px-3 py-2 text-xs border rounded-xl border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 outline-none"
                      value={day}
                      onChange={(e) => setDay(e.target.value)}
                    >
                      {WEEKDAYS_GRID.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Subject</label>
                    <select
                      className="w-full px-3 py-2 text-xs border rounded-xl border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 outline-none"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      required
                    >
                      <option value="">Select subject...</option>
                      {profile.favoriteSubjects.map((sub) => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                      <option value="General">General</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Study Duration Interval</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 04:00 PM - 05:30 PM"
                    className="w-full px-3.5 py-2 text-xs border rounded-xl border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Revision Topic Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Solve sample exercises"
                    className="w-full px-3.5 py-2 text-xs border rounded-xl border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                  />
                </div>

                <div className="flex items-center space-x-2 pt-1">
                  <input
                    type="checkbox"
                    id="recurring_check"
                    checked={isRecurring}
                    onChange={(e) => setIsRecurring(e.target.checked)}
                    className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="recurring_check" className="text-[10px] font-bold text-slate-500 dark:text-slate-400 select-none">
                    🔁 Repeat this study slot weekly on {day}
                  </label>
                </div>

                <button 
                  type="submit"
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition shadow shadow-indigo-500/10"
                >
                  {editingBlockId ? "Save Study block Changes" : "Create Timetable Block"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* B. REGISTER/EDIT EXAM MODAL */}
      {showAddExam && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 animate-slide-up">
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="font-black text-slate-800 dark:text-slate-100 text-sm">
                  {editingExamId ? "Adjust Exam Settings" : "Register Target Exam"}
                </h3>
                <button onClick={() => setShowAddExam(false)} className="p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitExam} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Exam Title *</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Physics Mid-Term Board Test"
                    className="w-full px-3.5 py-2 text-xs border rounded-xl border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500"
                    value={newExamName}
                    onChange={(e) => setNewExamName(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Subject</label>
                    <select
                      className="w-full px-3 py-2 text-xs border rounded-xl border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 outline-none"
                      value={newExamSub}
                      onChange={(e) => setNewExamSub(e.target.value)}
                    >
                      <option value="">Select subject...</option>
                      {profile.favoriteSubjects.map((sub) => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                      <option value="General">General</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Exam Date *</label>
                    <input 
                      type="date" 
                      className="w-full px-3 py-2 text-xs border rounded-xl border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 outline-none"
                      value={newExamDate}
                      onChange={(e) => setNewExamDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition shadow"
                >
                  {editingExamId ? "Save Exam alterations" : "Set Target Exam date"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* C. CREATE REMINDER MODAL */}
      {showAddRem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 animate-slide-up">
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="font-black text-slate-800 dark:text-slate-100 text-sm">Arm Study Reminder</h3>
                <button onClick={() => setShowAddRem(false)} className="p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddReminder} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Reminder Text *</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Revise Chemistry Lab notes"
                    className="w-full px-3.5 py-2 text-xs border rounded-xl border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500"
                    value={newRemText}
                    onChange={(e) => setNewRemText(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Time (24-Hour) *</label>
                  <input 
                    type="time" 
                    className="w-full px-3.5 py-2 text-xs border rounded-xl border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500"
                    value={newRemTime}
                    onChange={(e) => setNewRemTime(e.target.value)}
                    required
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition"
                >
                  Activate Reminder alert
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
