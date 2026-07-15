import React, { useState } from "react";
import { Task, UserProfile, TimetableItem } from "../types";
import { 
  Calendar, ChevronLeft, ChevronRight, Clock, BookOpen, AlertTriangle, 
  MapPin, ClipboardList, Info, Sparkles, Star
} from "lucide-react";

interface CalendarViewProps {
  tasks: Task[];
  timetable: TimetableItem[];
  profile: UserProfile;
}

export default function CalendarView({ tasks, timetable, profile }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(new Date().toISOString().split("T")[0]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Hardcoded academic holidays for a realistic experience
  const holidays: Record<string, string> = {
    "2026-07-04": "Independence Day Holiday",
    "2026-08-15": "Independence Day",
    "2026-09-05": "Teachers Day Seminar",
    "2026-10-02": "Gandhi Jayanti Recess",
    "2026-12-25": "Christmas break"
  };

  const getDaysInMonth = (y: number, m: number) => {
    return new Date(y, m + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (y: number, m: number) => {
    return new Date(y, m, 1).getDay(); // 0 = Sunday, 1 = Monday, etc.
  };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const getMonthName = () => {
    return currentDate.toLocaleString("default", { month: "long" });
  };

  // Generate event tags for a given date
  const getEventsForDate = (dateStr: string) => {
    const events: Array<{ type: "task" | "holiday" | "timetable" | "exam"; title: string; color: string }> = [];

    // 1. Task Deadlines
    tasks.forEach((t) => {
      if (t.deadline === dateStr) {
        events.push({
          type: "task",
          title: `Deadline: ${t.title}`,
          color: "bg-indigo-500"
        });
      }
    });

    // 2. Holidays
    if (holidays[dateStr]) {
      events.push({
        type: "holiday",
        title: `Holiday: ${holidays[dateStr]}`,
        color: "bg-emerald-500"
      });
    }

    // 3. Timetable integrations (map day of week to timetable item)
    const dayName = new Date(dateStr).toLocaleDateString("en-US", { weekday: "long" });
    timetable.forEach((item) => {
      if (item.day === dayName) {
        events.push({
          type: "timetable",
          title: `Study Session: ${item.subject} (${item.time})`,
          color: "bg-purple-500"
        });
      }
    });

    // Simulated general exam presets if dates correlate
    if (dateStr === "2026-07-20") {
      events.push({
        type: "exam",
        title: "Mathematics Mid-Term Exam",
        color: "bg-rose-500"
      });
    } else if (dateStr === "2026-08-05") {
      events.push({
        type: "exam",
        title: "Physics Laws of Motion Exam",
        color: "bg-rose-500"
      });
    }

    return events;
  };

  // Rendering dates
  const cells: React.ReactNode[] = [];
  
  // Empty slots for previous month offset
  for (let i = 0; i < firstDay; i++) {
    cells.push(<div key={`empty-${i}`} className="h-14 bg-slate-50/50 dark:bg-slate-900/10 border border-slate-100 dark:border-slate-800/20" />);
  }

  // Days in month
  for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
    const dayDate = new Date(year, month, dayNum);
    const dayDateStr = dayDate.toISOString().split("T")[0];
    const isToday = dayDateStr === new Date().toISOString().split("T")[0];
    const isSelected = dayDateStr === selectedDateStr;
    const events = getEventsForDate(dayDateStr);

    cells.push(
      <button
        key={dayNum}
        onClick={() => setSelectedDateStr(dayDateStr)}
        className={`h-14 border border-slate-100 dark:border-slate-800 p-1 flex flex-col justify-between items-start transition cursor-pointer relative hover:bg-indigo-50/20 text-left ${
          isToday ? "bg-indigo-50/30 dark:bg-indigo-950/20" : ""
        } ${isSelected ? "ring-2 ring-indigo-500 z-10" : ""}`}
      >
        <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${
          isToday ? "bg-indigo-600 text-white" : "text-slate-700 dark:text-slate-300"
        }`}>
          {dayNum}
        </span>

        {/* Indicators dots row */}
        <div className="flex space-x-0.5 w-full overflow-hidden h-1.5 mt-auto">
          {events.slice(0, 4).map((ev, idx) => (
            <div key={idx} className={`w-1.5 h-1.5 rounded-full ${ev.color} flex-shrink-0`} title={ev.title} />
          ))}
          {events.length > 4 && (
            <span className="text-[7px] text-slate-400 font-bold leading-none">+</span>
          )}
        </div>
      </button>
    );
  }

  // Selected date agenda details
  const selectedEvents = getEventsForDate(selectedDateStr);
  const formattedSelectedDate = new Date(selectedDateStr).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  return (
    <div id="calendar_tab" className="space-y-6">

      {/* HEADER SECTION */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm">
        <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center">
          <Calendar className="w-6 h-6 text-indigo-500 mr-2" />
          Interactive Calendar
        </h1>
        <p className="text-xs text-slate-400">View homework deadlines, target exam countdowns, holidays, and integrated timetable blocks.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2 cols): Main Month Calendar Grid */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">
              {getMonthName()} {year}
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

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>

          {/* Days Grid cells */}
          <div className="grid grid-cols-7 gap-1 bg-slate-50 dark:bg-slate-800/10 rounded-2xl overflow-hidden p-1.5 border border-slate-100 dark:border-slate-800">
            {cells}
          </div>

          {/* Key Indicators Legend */}
          <div className="flex flex-wrap items-center justify-center gap-3.5 text-[10px] text-slate-400 font-semibold pt-2">
            <span className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500 mr-1" /> Homework Deadlines</span>
            <span className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 mr-1" /> Exams / Assessments</span>
            <span className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-purple-500 mr-1" /> Timetable Study Slots</span>
            <span className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-1" /> Academic Holidays</span>
          </div>
        </div>

        {/* Right Column: Daily Agenda Underneath */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">Daily Agenda</h3>
            <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold mt-0.5">{formattedSelectedDate}</p>
          </div>

          {selectedEvents.length === 0 ? (
            <div className="text-center py-12 bg-slate-50/40 dark:bg-slate-800/10 rounded-2xl border border-slate-100 dark:border-slate-800/60 flex flex-col justify-center items-center">
              <span className="text-3xl block mb-2">🍃</span>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Quiet day!</p>
              <p className="text-[10px] text-slate-400 mt-0.5 max-w-[180px] mx-auto text-center">No assignments due, holidays, or specific exam slots scheduled.</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {selectedEvents.map((ev, idx) => (
                <div 
                  key={idx}
                  className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-xl flex items-start space-x-3"
                >
                  <span className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${ev.color}`} />
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{ev.title}</p>
                    <span className="text-[9px] text-slate-400 font-medium capitalize">{ev.type} notification</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
