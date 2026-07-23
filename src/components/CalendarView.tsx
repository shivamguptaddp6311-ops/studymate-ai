import React, { useState, useEffect, useMemo } from "react";
import { Task, UserProfile, TimetableItem, Alarm, Habit } from "../types";
import { 
  GlassCard, HeroCard, QuickActionCard, ProgressCard, AnalyticsCard, 
  AchievementCard, AICard, TimelineCard, EmptyStateCard, PremiumButton, 
  PremiumInput, PremiumDialog, PremiumBottomSheet, PremiumIcon, PremiumCard 
} from "./PremiumUI";
import { 
  Calendar, ChevronLeft, ChevronRight, Clock, BookOpen, AlertTriangle, 
  MapPin, ClipboardList, Info, Sparkles, Star, Trophy, ArrowRight,
  Plus, Check, ChevronDown, CheckCircle, Bell, Volume2, Moon, Sun, Flame,
  Coffee, ChevronUp, AlertCircle, Heart, Zap, Play, User, Compass, CalendarRange,
  Eye, EyeOff
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Confetti from "./Confetti";

interface CalendarViewProps {
  tasks: Task[];
  timetable: TimetableItem[];
  profile: UserProfile;
  alarms: Alarm[];
  habits: Habit[];
  onToggleTask?: (id: string) => void;
  onToggleHabitDate?: (id: string, date: string) => void;
}

interface CalendarEvent {
  id: string;
  type: "task" | "timetable" | "alarm" | "habit" | "exam" | "holiday";
  title: string;
  time: string; // "All Day", "04:30 PM", etc.
  timeSortValue: number; // 0 to 1440 minutes for chronological sorting
  color: string; // Tailwind text/bg colors
  completed?: boolean;
  priority?: "High" | "Medium" | "Low";
  subject?: string;
  details?: string;
  originalData?: any;
}

export default function CalendarView({ 
  tasks = [], 
  timetable = [], 
  profile, 
  alarms = [], 
  habits = [],
  onToggleTask,
  onToggleHabitDate
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  });

  const [viewMode, setViewMode] = useState<"month" | "week" | "day">("month");
  const [showConfetti, setShowConfetti] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const [showCompleted, setShowCompleted] = useState<boolean>(true);
  const [isAgendaExpanded, setIsAgendaExpanded] = useState(false);

  // Swipe gesture tracking variables
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const getLocalDateString = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const todayStr = useMemo(() => getLocalDateString(new Date()), []);

  // Hardcoded academic holidays
  const holidays: Record<string, string> = {
    "2026-07-04": "Independence Day Holiday",
    "2026-08-15": "Independence Day Recess",
    "2026-09-05": "Teachers Day Seminar",
    "2026-10-02": "Gandhi Jayanti Recess",
    "2026-11-26": "Thanksgiving Day Study Recess",
    "2026-12-25": "Christmas Break"
  };

  // Convert "04:30 PM" or "04:00 PM - 05:30 PM" to minutes from midnight
  const parseTimeToMinutes = (timeStr: string): number => {
    if (!timeStr || timeStr.toLowerCase() === "all day") return 0;
    try {
      // Handle interval like "04:00 PM - 05:30 PM" by parsing first part
      const firstPart = timeStr.split("-")[0].trim();
      const match = firstPart.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (match) {
        let hrs = parseInt(match[1]);
        const mins = parseInt(match[2]);
        const ampm = match[3].toUpperCase();
        if (ampm === "PM" && hrs < 12) hrs += 12;
        if (ampm === "AM" && hrs === 12) hrs = 0;
        return hrs * 60 + mins;
      }
    } catch (e) {
      console.warn("Failed to parse time:", timeStr);
    }
    return 12 * 60; // default noon
  };

  // Memoized dynamic event builder for any given date
  const getEventsForDate = useMemo(() => {
    return (dateStr: string): CalendarEvent[] => {
      const events: CalendarEvent[] = [];

      // 1. Task Deadlines
      tasks.forEach((t) => {
        if (t.deadline === dateStr) {
          events.push({
            id: t.id,
            type: "task",
            title: t.title,
            time: "All Day",
            timeSortValue: t.priority === "High" ? 5 : 10,
            color: t.completed 
              ? "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-slate-400"
              : "border-indigo-100 dark:border-indigo-950 bg-indigo-50/40 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 ring-indigo-500/10",
            completed: t.completed,
            priority: t.priority,
            subject: t.subjectTag || "General",
            details: t.notes || "Homework Task",
            originalData: t
          });
        }
      });

      // 2. Holidays
      if (holidays[dateStr]) {
        events.push({
          id: `holiday-${dateStr}`,
          type: "holiday",
          title: holidays[dateStr],
          time: "All Day",
          timeSortValue: 1,
          color: "border-teal-100 dark:border-teal-950 bg-teal-50/40 dark:bg-teal-950/20 text-teal-600 dark:text-teal-400 ring-teal-500/10",
          subject: "Holiday",
          details: "Academic Off-Day"
        });
      }

      // 3. Timetable Slots
      const dateObj = new Date(dateStr + "T00:00:00");
      const dayName = dateObj.toLocaleDateString("en-US", { weekday: "long" });
      timetable.forEach((item) => {
        if (item.day === dayName) {
          const sortVal = parseTimeToMinutes(item.time);
          events.push({
            id: item.id,
            type: "timetable",
            title: `${item.subject} (${item.topic})`,
            time: item.time,
            timeSortValue: sortVal,
            color: "border-purple-100 dark:border-purple-950 bg-purple-50/40 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 ring-purple-500/10",
            subject: item.subject,
            details: `Topic: ${item.topic}`
          });
        }
      });

      // 4. Alarms
      const dayOfWeekNum = dateObj.getDay(); // 0 = Sunday, 1 = Monday, etc.
      alarms.forEach((alarm) => {
        const isRepeatingToday = alarm.repeatDays.length === 0 || alarm.repeatDays.includes(dayOfWeekNum);
        if (alarm.isActive && isRepeatingToday) {
          const sortVal = parseTimeToMinutes(alarm.time + " AM"); // base approx
          events.push({
            id: alarm.id,
            type: "alarm",
            title: `${alarm.label || "Study Alarm"} - ${alarm.subject}`,
            time: alarm.time,
            timeSortValue: sortVal,
            color: "border-amber-100 dark:border-amber-950 bg-amber-50/40 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 ring-amber-500/10",
            subject: alarm.subject,
            details: `Ringtone: ${alarm.ringtone} | Vibration: ${alarm.vibration ? "On" : "Off"}`
          });
        }
      });

      // 5. Habits
      habits.forEach((habit) => {
        const isCompleted = habit.datesCompleted.includes(dateStr);
        // Habits are recurring daily items, we show them as active daily routines on/before today
        const habitCreatedDate = new Date("2026-01-01"); // default safe limit
        const queryDate = new Date(dateStr + "T00:00:00");
        const todayDate = new Date(todayStr + "T00:00:00");
        
        if (queryDate >= habitCreatedDate && queryDate <= todayDate) {
          const sortVal = parseTimeToMinutes(habit.reminderTime || "07:00 AM");
          events.push({
            id: `habit-${habit.id}-${dateStr}`,
            type: "habit",
            title: `Routine: ${habit.name}`,
            time: habit.reminderTime || "07:00 AM",
            timeSortValue: sortVal,
            completed: isCompleted,
            color: isCompleted
              ? "border-emerald-100 dark:border-emerald-950/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-emerald-500/10"
              : "border-rose-100 dark:border-rose-950/40 bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-rose-500/10",
            subject: habit.subject || "General",
            details: `${habit.icon} Habit Tracker • Reward: ${habit.xpReward || 30} XP`,
            originalData: habit
          });
        }
      });

      // 6. Hardcoded Academic Assessments
      if (dateStr === "2026-07-20") {
        events.push({
          id: "exam-math",
          type: "exam",
          title: "Mathematics Mid-Term Assessment",
          time: "09:00 AM",
          timeSortValue: 9 * 60,
          color: "border-rose-200 dark:border-rose-950 bg-rose-100/50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 ring-rose-500/20",
          subject: "Mathematics",
          details: "Coverage: Calculus, Matrices, Integrals. Counts for 20% total grade."
        });
      } else if (dateStr === "2026-08-05") {
        events.push({
          id: "exam-phys",
          type: "exam",
          title: "Physics Laws of Motion Exam",
          time: "10:30 AM",
          timeSortValue: 10.5 * 60,
          color: "border-rose-200 dark:border-rose-950 bg-rose-100/50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 ring-rose-500/20",
          subject: "Physics",
          details: "Assessment on Newton's laws, angular momentum, friction formulas."
        });
      }

      // Chronological sort
      return events.sort((a, b) => a.timeSortValue - b.timeSortValue);
    };
  }, [tasks, timetable, alarms, habits, todayStr]);

  // Handle Swipe Gesture Mechanics
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50; // swipe next
    const isRightSwipe = distance < -50; // swipe prev

    if (isLeftSwipe) {
      handleNextPeriod();
    } else if (isRightSwipe) {
      handlePrevPeriod();
    }
  };

  const handleNextPeriod = () => {
    if (viewMode === "month") {
      setCurrentDate(new Date(year, month + 1, 1));
    } else if (viewMode === "week") {
      const nextW = new Date(currentDate);
      nextW.setDate(currentDate.getDate() + 7);
      setCurrentDate(nextW);
    } else {
      const nextD = new Date(currentDate);
      nextD.setDate(currentDate.getDate() + 1);
      setCurrentDate(nextD);
      setSelectedDateStr(getLocalDateString(nextD));
    }
  };

  const handlePrevPeriod = () => {
    if (viewMode === "month") {
      setCurrentDate(new Date(year, month - 1, 1));
    } else if (viewMode === "week") {
      const prevW = new Date(currentDate);
      prevW.setDate(currentDate.getDate() - 7);
      setCurrentDate(prevW);
    } else {
      const prevD = new Date(currentDate);
      prevD.setDate(currentDate.getDate() - 1);
      setCurrentDate(prevD);
      setSelectedDateStr(getLocalDateString(prevD));
    }
  };

  // Generate Current Week dates starting from Monday
  const currentWeekDays = useMemo(() => {
    const start = new Date(currentDate);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Monday start
    const monday = new Date(start.setDate(diff));
    
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const temp = new Date(monday);
      temp.setDate(monday.getDate() + i);
      days.push(temp);
    }
    return days;
  }, [currentDate]);

  // Helper to determine Month cells
  const monthCells = useMemo(() => {
    const cells: Array<{ date: Date | null; isToday: boolean; isSelected: boolean; events: CalendarEvent[]; dateStr: string }> = [];
    const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
    const getFirstDayOfMonth = (y: number, m: number) => {
      // Adjusted so Monday is first slot
      let day = new Date(y, m, 1).getDay();
      return day === 0 ? 6 : day - 1; // 0=Mon, ..., 6=Sun
    };

    const daysInMonth = getDaysInMonth(year, month);
    const firstDayIndex = getFirstDayOfMonth(year, month);

    // Padding for empty leading days
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push({ date: null, isToday: false, isSelected: false, events: [], dateStr: "" });
    }

    // Actual month days
    for (let dNum = 1; dNum <= daysInMonth; dNum++) {
      const tempDate = new Date(year, month, dNum);
      const dStr = getLocalDateString(tempDate);
      const isToday = dStr === todayStr;
      const isSelected = dStr === selectedDateStr;
      const dayEvents = getEventsForDate(dStr);

      cells.push({
        date: tempDate,
        isToday,
        isSelected,
        events: dayEvents,
        dateStr: dStr
      });
    }

    return cells;
  }, [year, month, selectedDateStr, todayStr, getEventsForDate]);

  // Upcoming Event Track for Banner Timeline
  const upcomingTimelineEvents = useMemo(() => {
    const list: Array<{ dateStr: string; event: CalendarEvent }> = [];
    const todayObj = new Date(todayStr + "T00:00:00");
    
    // Scan next 14 days
    for (let i = 0; i < 14; i++) {
      const nextD = new Date(todayObj);
      nextD.setDate(todayObj.getDate() + i);
      const dStr = getLocalDateString(nextD);
      const dayEvs = getEventsForDate(dStr);
      
      dayEvs.forEach(ev => {
        if (!ev.completed) {
          list.push({ dateStr: dStr, event: ev });
        }
      });
    }
    return list.slice(0, 5); // top 5
  }, [todayStr, getEventsForDate]);

  const selectedEventsFiltered = useMemo(() => {
    let list = getEventsForDate(selectedDateStr);
    
    if (filterType !== "all") {
      list = list.filter(e => e.type === filterType);
    }
    if (!showCompleted) {
      list = list.filter(e => !e.completed);
    }
    return list;
  }, [selectedDateStr, filterType, showCompleted, getEventsForDate]);

  // Interactive toggle actions
  const handleInteractWithEvent = (ev: CalendarEvent) => {
    if (ev.type === "habit" && onToggleHabitDate) {
      onToggleHabitDate(ev.originalData.id, selectedDateStr);
      if (!ev.completed) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 2000);
      }
    } else if (ev.type === "task" && onToggleTask) {
      onToggleTask(ev.id);
      if (!ev.completed) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 2000);
      }
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case "task": return <ClipboardList className="w-4 h-4" />;
      case "holiday": return <Sparkles className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />;
      case "timetable": return <BookOpen className="w-4 h-4 text-purple-500 dark:text-purple-400" />;
      case "alarm": return <Bell className="w-4 h-4 text-amber-500 dark:text-amber-400 animate-bounce" />;
      case "habit": return <Flame className="w-4 h-4 text-orange-500 dark:text-orange-400 animate-pulse" />;
      case "exam": return <Trophy className="w-4 h-4 text-rose-500 dark:text-rose-400 animate-pulse" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  const getEventBadgeColor = (type: string) => {
    switch (type) {
      case "task": return "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200/20";
      case "holiday": return "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-200/20";
      case "timetable": return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200/20";
      case "alarm": return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200/20";
      case "habit": return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200/20";
      case "exam": return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200/20";
      default: return "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-200/20";
    }
  };

  const formattedSelectedDate = new Date(selectedDateStr + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  return (
    <div 
      id="premium_interactive_planner" 
      className="space-y-6 relative pb-10 select-none text-left"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <Confetti active={showConfetti} onComplete={() => setShowConfetti(false)} />

      {/* FLOAT GLASS HEADER WITH GRADIENT METADATA */}
      <div className="relative overflow-hidden bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/30 dark:border-slate-800/80 p-6 md:p-8 rounded-3xl shadow-xl shadow-slate-100/10 dark:shadow-none">
        <div className="absolute right-0 top-0 w-80 h-80 bg-gradient-to-tr from-indigo-500/10 to-purple-500/10 rounded-full blur-[80px] pointer-events-none translate-x-20 -translate-y-20" />
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-black rounded-full border border-indigo-500/10 uppercase tracking-widest">
              <CalendarRange className="w-3.5 h-3.5 animate-pulse" />
              <span>Epic Chrono Planner</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-slate-100 font-display tracking-tight leading-tight">
              Aesthetic Time-Matrix
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium max-w-xl">
              Immersive spatial agenda syncing homework, smart alarms, habit quests, midterms, and real-time study sessions effortlessly. Swipe left or right to navigate seamlessly.
            </p>
          </div>

          {/* VIEW SWITCH TABS (layoutId matching slider animation) */}
          <div className="bg-slate-100/80 dark:bg-slate-950/60 p-1.5 rounded-2xl flex items-center border border-slate-200/30 dark:border-slate-800/60 shadow-inner w-full sm:w-auto">
            {(["month", "week", "day"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`relative px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 flex-1 sm:flex-initial cursor-pointer ${
                  viewMode === mode
                    ? "text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 shadow-md font-extrabold"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                {mode === "month" ? "Month View" : mode === "week" ? "Week View" : "Day View"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SWIPE NAVIGATION CONTROLS */}
      <div className="flex flex-wrap justify-between items-center bg-white/50 dark:bg-slate-900/30 backdrop-blur-md border border-slate-150/40 dark:border-slate-800/40 px-5 py-4 rounded-2xl gap-4">
        
        <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-950 px-1 py-1 rounded-xl">
          <button 
            onClick={handlePrevPeriod} 
            className="p-2 hover:bg-white dark:hover:bg-slate-900 rounded-lg transition-all duration-200 cursor-pointer active:scale-95"
            title="Navigate Back"
          >
            <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          </button>
          
          <span className="text-xs font-bold text-slate-400 px-1 select-none font-mono">Swipe Navigation</span>
          
          <button 
            onClick={handleNextPeriod} 
            className="p-2 hover:bg-white dark:hover:bg-slate-900 rounded-lg transition-all duration-200 cursor-pointer active:scale-95"
            title="Navigate Next"
          >
            <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          </button>
        </div>

        {/* Dynamic header text display */}
        <h2 className="text-base font-black text-slate-800 dark:text-slate-100 tracking-tight font-display">
          {viewMode === "month" && `${currentDate.toLocaleString("default", { month: "long" })} ${year}`}
          {viewMode === "week" && `Week of ${currentWeekDays[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${currentWeekDays[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
          {viewMode === "day" && new Date(selectedDateStr + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" })}
        </h2>

        {/* Today Action button with custom glow animation */}
        <button
          onClick={() => {
            const today = new Date();
            setCurrentDate(today);
            setSelectedDateStr(getLocalDateString(today));
          }}
          className="relative px-4 py-2 text-xs font-extrabold bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl shadow-lg hover:shadow-indigo-500/20 active:scale-95 transition-all duration-200 cursor-pointer"
        >
          <span className="absolute inset-0 bg-white/20 rounded-xl blur-md opacity-0 hover:opacity-100 transition-opacity" />
          <span className="relative z-10">Today</span>
        </button>
      </div>

      {/* UPCOMING TIMELINE CARDS BANNER */}
      {upcomingTimelineEvents.length > 0 && (
        <div className="bg-gradient-to-r from-indigo-500/5 via-violet-500/5 to-purple-500/5 dark:from-indigo-950/20 dark:via-violet-950/10 dark:to-purple-950/20 p-5 rounded-3xl border border-indigo-500/10 text-left space-y-3.5">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 dark:text-indigo-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-spin" />
              Strategic Upcoming Timeline
            </span>
            <span className="text-[10px] text-slate-400 font-bold">Uncompleted Priority Focus</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {upcomingTimelineEvents.map(({ dateStr, event }) => {
              const dateObj = new Date(dateStr + "T00:00:00");
              const isToday = dateStr === todayStr;
              return (
                <div
                  key={`${event.id}-${dateStr}`}
                  onClick={() => setSelectedDateStr(dateStr)}
                  className={`p-3.5 rounded-2xl border bg-white/60 dark:bg-slate-900/60 backdrop-blur-md cursor-pointer transition-all duration-200 hover:y-[-2px] hover:shadow-md flex flex-col justify-between space-y-2.5 text-left border-slate-150/60 dark:border-slate-800/80 ${
                    isToday ? "ring-2 ring-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/25" : ""
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${getEventBadgeColor(event.type)}`}>
                      {event.type}
                    </span>
                    <span className="text-[9px] font-black font-mono text-indigo-500 dark:text-indigo-400">
                      {isToday ? "★ Today" : dateObj.toLocaleDateString([], { month: "short", day: "numeric" })}
                    </span>
                  </div>

                  <p className="text-xs font-extrabold text-slate-800 dark:text-slate-100 line-clamp-2 leading-tight">
                    {event.title}
                  </p>

                  <div className="flex items-center space-x-1 text-[9px] text-slate-400 dark:text-slate-500 font-semibold">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>{event.time}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MAIN LAYOUT SPLIT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* VIEW AREA CONTAINER (Month / Week / Day) - 7 Columns */}
        <div className="lg:col-span-8 bg-white/70 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200/30 dark:border-slate-800/80 p-5 rounded-3xl shadow-xl relative overflow-hidden">
          
          <AnimatePresence mode="wait">
            <motion.div
              key={viewMode}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              
              {/* MONTH VIEW GRID */}
              {viewMode === "month" && (
                <div className="space-y-4">
                  {/* Weekday Labels */}
                  <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pb-1 border-b border-slate-150/40 dark:border-slate-850/40">
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                      <span key={day}>{day}</span>
                    ))}
                  </div>

                  {/* Day Blocks */}
                  <div className="grid grid-cols-7 gap-1.5">
                    {monthCells.map((cell, idx) => {
                      if (!cell.date) {
                        return (
                          <div 
                            key={`empty-${idx}`} 
                            className="aspect-square bg-slate-50/20 dark:bg-slate-950/5 border border-slate-100/50 dark:border-slate-850/20 rounded-xl" 
                          />
                        );
                      }

                      const hasActiveExams = cell.events.some(e => e.type === "exam");
                      const hasAlarms = cell.events.some(e => e.type === "alarm");

                      return (
                        <button
                          key={`day-${cell.dateStr}`}
                          onClick={() => setSelectedDateStr(cell.dateStr)}
                          className={`aspect-square p-2 border rounded-2xl flex flex-col justify-between items-start transition-all duration-200 cursor-pointer text-left relative overflow-hidden ${
                            cell.isToday 
                              ? "border-indigo-500 dark:border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 ring-4 ring-indigo-500/5 shadow-md shadow-indigo-500/10" 
                              : cell.isSelected
                                ? "border-slate-900 dark:border-white bg-slate-100 dark:bg-slate-800 shadow-md ring-2 ring-slate-800/15"
                                : "border-slate-150/50 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-850 bg-white/40 dark:bg-slate-900/30"
                          }`}
                        >
                          {/* Pulsing neon halo indicator for Today */}
                          {cell.isToday && (
                            <span className="absolute top-1.5 right-1.5 flex h-1.5 w-1.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-500 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-600"></span>
                            </span>
                          )}

                          {/* Glow background on exam assessing dates */}
                          {hasActiveExams && (
                            <div className="absolute inset-0 bg-rose-500/5 pointer-events-none" />
                          )}

                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${
                            cell.isToday 
                              ? "bg-indigo-600 text-white shadow-sm" 
                              : cell.isSelected
                                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                                : "text-slate-700 dark:text-slate-300"
                          }`}>
                            {cell.date.getDate()}
                          </span>

                          {/* Indicators dots line */}
                          <div className="flex flex-wrap gap-1 mt-auto w-full overflow-hidden">
                            {cell.events.slice(0, 3).map((ev, eIdx) => {
                              let dotCol = "bg-indigo-500";
                              if (ev.type === "holiday") dotCol = "bg-teal-500";
                              else if (ev.type === "timetable") dotCol = "bg-purple-500";
                              else if (ev.type === "alarm") dotCol = "bg-amber-500";
                              else if (ev.type === "habit") dotCol = ev.completed ? "bg-emerald-500" : "bg-rose-400";
                              else if (ev.type === "exam") dotCol = "bg-rose-500 animate-pulse";

                              return (
                                <div 
                                  key={eIdx} 
                                  className={`w-1.5 h-1.5 rounded-full ${dotCol}`} 
                                  title={`${ev.type}: ${ev.title}`}
                                />
                              );
                            })}
                            {cell.events.length > 3 && (
                              <span className="text-[8px] leading-none font-extrabold text-slate-400 dark:text-slate-500">
                                +{cell.events.length - 3}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* WEEK VIEW COLUMNS */}
              {viewMode === "week" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
                    {currentWeekDays.map((date, idx) => {
                      const dStr = getLocalDateString(date);
                      const isToday = dStr === todayStr;
                      const isSelected = dStr === selectedDateStr;
                      const dayEvents = getEventsForDate(dStr);

                      return (
                        <div
                          key={`week-col-${idx}`}
                          onClick={() => setSelectedDateStr(dStr)}
                          className={`p-3.5 border rounded-2xl flex flex-col space-y-3 cursor-pointer min-h-[220px] text-left transition-all duration-200 relative overflow-hidden ${
                            isToday
                              ? "border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20 shadow-md ring-2 ring-indigo-500/10"
                              : isSelected
                                ? "border-slate-800 dark:border-white bg-slate-50 dark:bg-slate-850"
                                : "border-slate-150/40 dark:border-slate-800 bg-white/40 dark:bg-slate-900/20 hover:bg-slate-100/50 dark:hover:bg-slate-800/40"
                          }`}
                        >
                          {/* Day details */}
                          <div className="flex justify-between items-center border-b border-slate-150/30 dark:border-slate-800 pb-2">
                            <div className="text-left">
                              <p className="text-[9px] uppercase font-black tracking-wider text-slate-400">
                                {date.toLocaleDateString("en-US", { weekday: "short" })}
                              </p>
                              <p className={`text-base font-black leading-none mt-0.5 ${isToday ? "text-indigo-600 dark:text-indigo-400" : "text-slate-800 dark:text-slate-100"}`}>
                                {date.getDate()}
                              </p>
                            </div>
                            
                            {isToday && (
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse shrink-0" />
                            )}
                          </div>

                          {/* Events stack */}
                          <div className="flex-1 space-y-1.5 overflow-y-auto max-h-[160px] pr-0.5">
                            {dayEvents.length === 0 ? (
                              <span className="text-[9px] text-slate-400 dark:text-slate-650 block text-center pt-8 font-semibold">
                                Empty Grid
                              </span>
                            ) : (
                              dayEvents.map((ev, eIdx) => (
                                <div
                                  key={eIdx}
                                  className={`p-1.5 rounded-lg border text-[9px] font-bold line-clamp-2 leading-tight ${
                                    ev.type === "exam" ? "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400" :
                                    ev.type === "alarm" ? "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400" :
                                    ev.type === "timetable" ? "bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400" :
                                    ev.type === "holiday" ? "bg-teal-500/10 border-teal-500/20 text-teal-600 dark:text-teal-400" :
                                    ev.completed ? "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-850 text-slate-400 line-through" :
                                    "bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400"
                                  }`}
                                  title={`${ev.time} - ${ev.title}`}
                                >
                                  <div className="flex items-center gap-1">
                                    <span className="shrink-0">{getEventIcon(ev.type)}</span>
                                    <span className="truncate">{ev.title}</span>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* HIGH INTENSITY DAY TIMELINE VIEW */}
              {viewMode === "day" && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-150/40 dark:border-slate-800 pb-3">
                    <div>
                      <h3 className="text-base font-black text-slate-850 dark:text-slate-100 font-display">
                        Chronological Day Focus
                      </h3>
                      <p className="text-[10px] text-slate-400">
                        Detailed time allocation for {formattedSelectedDate}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/10">
                        {getEventsForDate(selectedDateStr).length} Active Segments
                      </span>
                    </div>
                  </div>

                  {/* Hourly Track Axis */}
                  <div className="space-y-3 relative before:absolute before:left-14 before:top-4 before:bottom-4 before:w-0.5 before:bg-slate-100 dark:before:bg-slate-800">
                    
                    {/* Hourly marks */}
                    {[8, 10, 12, 14, 16, 18, 20, 22].map((hour) => {
                      const timeString = `${hour > 12 ? hour - 12 : hour}:00 ${hour >= 12 ? "PM" : "AM"}`;
                      const hourEvents = getEventsForDate(selectedDateStr).filter(ev => {
                        if (ev.time.toLowerCase() === "all day") return false;
                        const mins = ev.timeSortValue;
                        return mins >= hour * 60 && mins < (hour + 2) * 60;
                      });

                      const allDayEvents = hour === 8 ? getEventsForDate(selectedDateStr).filter(ev => ev.time.toLowerCase() === "all day") : [];
                      const matchingEvents = [...allDayEvents, ...hourEvents];

                      return (
                        <div key={hour} className="flex gap-4 items-start relative z-10 text-left">
                          <div className="w-10 text-right shrink-0">
                            <span className="text-[10px] font-black font-mono text-slate-400 dark:text-slate-500">
                              {timeString}
                            </span>
                          </div>

                          <div className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700 border-2 border-white dark:border-slate-900 mt-1.5 shrink-0" />

                          <div className="flex-1 space-y-2">
                            {matchingEvents.length === 0 ? (
                              <div className="py-2.5 text-[10px] text-slate-350 dark:text-slate-700 italic">
                                Free Block
                              </div>
                            ) : (
                              matchingEvents.map((ev, eIdx) => (
                                <div
                                  key={eIdx}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleInteractWithEvent(ev);
                                  }}
                                  className={`p-3.5 border rounded-2xl flex items-center justify-between cursor-pointer transition-all duration-200 hover:scale-[1.01] bg-white/50 dark:bg-slate-900/40 hover:shadow-md ${ev.color}`}
                                >
                                  <div className="flex items-center space-x-3.5">
                                    <div className="p-2 bg-white dark:bg-slate-900 rounded-xl shadow-sm">
                                      {getEventIcon(ev.type)}
                                    </div>
                                    <div className="text-left space-y-0.5">
                                      <p className={`text-xs font-black ${ev.completed ? "line-through text-slate-400" : "text-slate-850 dark:text-slate-100"}`}>
                                        {ev.title}
                                      </p>
                                      <p className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold">
                                        {ev.time} • {ev.details}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Quick checkbox/button check-in directly inside Day View */}
                                  {(ev.type === "habit" || ev.type === "task") && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleInteractWithEvent(ev);
                                      }}
                                      className={`p-1.5 rounded-xl border flex items-center justify-center shrink-0 cursor-pointer active:scale-95 transition-all ${
                                        ev.completed
                                          ? "bg-emerald-500 border-emerald-500 text-white"
                                          : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 hover:text-indigo-500"
                                      }`}
                                    >
                                      <Check className={`w-3.5 h-3.5 ${ev.completed ? "stroke-[4px]" : ""}`} />
                                    </button>
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      );
                    })}

                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>

          {/* KEY INDICATORS LEGEND */}
          <div className="flex flex-wrap items-center justify-center gap-3 text-[9px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-wider border-t border-slate-150/40 dark:border-slate-850/40 pt-4 mt-5">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-500" /> Homework Deadlines</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" /> Midterms / Exams</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-500" /> Timetable Studies</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /> Smart Alarms</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Active Habits</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-teal-500" /> Holidays</span>
          </div>

        </div>

        {/* AGENDA DRAWER / SIDE BAR PANEL - 4 Columns */}
        <div className="lg:col-span-4 space-y-5">
          
          <div className="bg-white/70 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200/30 dark:border-slate-800/80 p-5 rounded-3xl shadow-xl text-left space-y-4">
            
            {/* Filter segments & options */}
            <div className="border-b border-slate-150/40 dark:border-slate-850/40 pb-3.5 space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">
                  Agenda Focus
                </h3>
                
                {/* Toggle completed events switch */}
                <button
                  onClick={() => setShowCompleted(!showCompleted)}
                  className="p-1.5 bg-slate-100 dark:bg-slate-950 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-900 transition-colors cursor-pointer"
                  title={showCompleted ? "Hide Completed Activities" : "Show Completed Activities"}
                >
                  {showCompleted ? <Eye className="w-4 h-4 text-indigo-500" /> : <EyeOff className="w-4 h-4 text-slate-400" />}
                </button>
              </div>

              <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-black tracking-wider uppercase bg-indigo-500/10 px-3 py-1.5 rounded-xl border border-indigo-500/10 inline-block">
                📅 {formattedSelectedDate}
              </div>

              {/* Filtering pill selection */}
              <div className="flex flex-wrap gap-1.5 pt-1.5">
                {[
                  { value: "all", label: "All Items" },
                  { value: "task", label: "Tasks" },
                  { value: "habit", label: "Habits" },
                  { value: "timetable", label: "Timetable" }
                ].map((pill) => (
                  <button
                    key={pill.value}
                    onClick={() => setFilterType(pill.value)}
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                      filterType === pill.value
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "bg-slate-100 dark:bg-slate-950 text-slate-500 dark:text-slate-400 hover:text-slate-800"
                    }`}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>
            </div>

            {/* List items block */}
            {selectedEventsFiltered.length === 0 ? (
              <EmptyStateCard
                icon={<Calendar className="w-8 h-8 text-indigo-500" />}
                title="Quiet Academic Schedule"
                description="No active assignments, ringing alarms, test schedules, or incomplete habits mapped for this date."
                motivationalQuote="Organizing your time is organizing your future success. — StudyMate AI"
                aiSuggestions={[
                  "Review Physics Formulas",
                  "Solve Chemistry Numericals",
                  "Pomodoro Study Session"
                ]}
              />
            ) : (
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {selectedEventsFiltered.map((ev) => (
                  <div
                    key={ev.id}
                    onClick={() => handleInteractWithEvent(ev)}
                    className={`p-4 rounded-2xl border transition-all duration-300 relative overflow-hidden group flex flex-col justify-between cursor-pointer ${
                      ev.completed
                        ? "border-slate-150/50 dark:border-slate-850/50 bg-slate-50/40 dark:bg-slate-950/20 opacity-60"
                        : "border-slate-200/50 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md"
                    }`}
                  >
                    {/* Background decoration indicator lines */}
                    <div className={`absolute top-0 bottom-0 left-0 w-1.5 ${
                      ev.type === "exam" ? "bg-rose-500" :
                      ev.type === "alarm" ? "bg-amber-500" :
                      ev.type === "timetable" ? "bg-purple-500" :
                      ev.type === "holiday" ? "bg-teal-500" :
                      ev.completed ? "bg-slate-300" : "bg-indigo-500"
                    }`} />

                    <div className="pl-2 space-y-2.5">
                      <div className="flex justify-between items-start gap-2">
                        <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${getEventBadgeColor(ev.type)}`}>
                          {ev.type}
                        </span>

                        <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {ev.time}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <h4 className={`text-xs font-black tracking-tight leading-snug ${ev.completed ? "line-through text-slate-400" : "text-slate-850 dark:text-slate-100"}`}>
                          {ev.title}
                        </h4>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                          {ev.details}
                        </p>
                      </div>

                      {/* Interactive pill alerts inside card footer */}
                      {(ev.type === "habit" || ev.type === "task") && (
                        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-850 pt-2.5 mt-1.5">
                          <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
                            {ev.type === "habit" ? "🔥 Daily Quest" : "📝 Deadline Target"}
                          </span>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInteractWithEvent(ev);
                            }}
                            className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                              ev.completed
                                ? "bg-emerald-500 text-white"
                                : "bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/50 dark:border-slate-800"
                            }`}
                          >
                            {ev.completed ? "Completed" : "Mark Done"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* EXPANDABLE MONTH-WIDE SUMMARY AGENDA */}
            <div className="border-t border-slate-150/40 dark:border-slate-850/40 pt-4">
              <button
                onClick={() => setIsAgendaExpanded(!isAgendaExpanded)}
                className="w-full flex items-center justify-between py-2 text-xs font-extrabold text-slate-600 dark:text-slate-400 hover:text-slate-900 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <CalendarRange className="w-4 h-4 text-indigo-500" />
                  Expand Month-Wide Agenda Summary
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isAgendaExpanded ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence>
                {isAgendaExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden pt-3 space-y-2 max-h-[260px] overflow-y-auto pr-1"
                  >
                    {/* Retrieve next 30 days active elements summary */}
                    {Array.from({ length: 30 }).map((_, i) => {
                      const futureD = new Date();
                      futureD.setDate(futureD.getDate() + i);
                      const fStr = getLocalDateString(futureD);
                      const futureEvs = getEventsForDate(fStr);

                      if (futureEvs.length === 0) return null;

                      return (
                        <div key={fStr} className="p-2.5 bg-slate-50/50 dark:bg-slate-950/30 rounded-xl border border-slate-100 dark:border-slate-850 flex justify-between items-start gap-2 text-[10px]">
                          <div className="text-left font-black text-slate-500 shrink-0">
                            {futureD.toLocaleDateString([], { month: "short", day: "numeric" })}
                          </div>
                          <div className="flex-1 space-y-1 text-left">
                            {futureEvs.map((e, eIdx) => (
                              <div key={eIdx} className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                <span className="font-extrabold truncate max-w-[150px]" title={e.title}>{e.title}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
