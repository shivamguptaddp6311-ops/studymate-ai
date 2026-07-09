import React, { useState } from "react";
import { Habit, UserProfile } from "../types";
import { 
  Flame, Calendar, Sparkles, Check, Plus, Trash2, Award, 
  TrendingUp, Activity, HelpCircle, CheckCircle2, ChevronRight, Droplet, Book, Footprints, X
} from "lucide-react";

interface HabitsProps {
  habits: Habit[];
  onToggleHabitDate: (id: string, date: string) => void;
  onAddHabit: (name: string, icon: string, color: string) => void;
  onDeleteHabit: (id: string) => void;
  profile: UserProfile;
}

const COLOR_PRESETS = [
  { class: "indigo", bg: "bg-indigo-500", text: "text-indigo-500" },
  { class: "emerald", bg: "bg-emerald-500", text: "text-emerald-500" },
  { class: "sky", bg: "bg-sky-500", text: "text-sky-500" },
  { class: "amber", bg: "bg-amber-500", text: "text-amber-500" },
  { class: "rose", bg: "bg-rose-500", text: "text-rose-500" },
  { class: "purple", bg: "bg-purple-500", text: "text-purple-500" }
];

const HABIT_ICONS = ["📚", "📖", "💧", "🏃", "🧘", "🌙", "🥦", "✏️", "🎨", "🚴"];

export default function Habits({ habits, onToggleHabitDate, onAddHabit, onDeleteHabit, profile }: HabitsProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("📚");
  const [color, setColor] = useState("indigo");

  const todayStr = new Date().toISOString().split("T")[0];

  // Helper to generate past 30 days dates for Heatmap
  const getPast30Days = () => {
    const dates: string[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split("T")[0]);
    }
    return dates;
  };

  const past30Days = getPast30Days();

  // Calculate completion statistics
  const getHabitStats = (habit: Habit) => {
    const totalCompletions = habit.datesCompleted.length;
    const completedToday = habit.datesCompleted.includes(todayStr);
    
    // Simple streak calculation
    let currentStreak = 0;
    const checkDate = new Date();
    while (true) {
      const checkStr = checkDate.toISOString().split("T")[0];
      if (habit.datesCompleted.includes(checkStr)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return { totalCompletions, completedToday, currentStreak };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAddHabit(name, icon, color);
    setName("");
    setIcon("📚");
    setColor("indigo");
    setShowAdd(false);
  };

  // Generate day-wise completion count for heatmap rendering
  const getHeatmapIntensity = (dateStr: string) => {
    let completedCount = 0;
    habits.forEach((h) => {
      if (h.datesCompleted.includes(dateStr)) {
        completedCount++;
      }
    });
    return completedCount;
  };

  // Streaks indicators
  const totalHabitsCompletedToday = habits.filter((h) => h.datesCompleted.includes(todayStr)).length;
  const overallCompletionRate = habits.length 
    ? Math.round((habits.reduce((acc, h) => acc + h.datesCompleted.length, 0) / (habits.length * 30)) * 100)
    : 0;

  return (
    <div id="habits_tab" className="space-y-6">

      {/* HEADER PANELS */}
      <div className="flex justify-between items-center bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm">
        <div className="space-y-1">
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center">
            <Flame className="w-6 h-6 text-orange-500 mr-2" />
            Consistency & Habits Tracker
          </h1>
          <p className="text-xs text-slate-400">Track study routines, reading, exercise, and sleep. Build daily streaks.</p>
        </div>
        
        <button 
          onClick={() => setShowAdd(true)}
          className="flex items-center space-x-1 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-2xl text-xs font-bold shadow-md cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Habit</span>
        </button>
      </div>

      {/* SUMMARY STATS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Streak card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-3xl shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-orange-50 dark:bg-orange-950/40 rounded-2xl text-orange-500">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block font-medium">Daily Streak</span>
            <h4 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">
              {profile.xp > 200 ? "4" : "1"} Days Consistent
            </h4>
            <span className="text-[10px] text-slate-400 block">Longest Streak: 7 Days</span>
          </div>
        </div>

        {/* Completion percentage card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-3xl shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl text-emerald-500">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block font-medium">Completion Rate</span>
            <h4 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">
              {overallCompletionRate}% last 30 days
            </h4>
            <span className="text-[10px] text-slate-400 block">{totalHabitsCompletedToday} completed today</span>
          </div>
        </div>

        {/* Level bonus multiplier card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-3xl shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl text-indigo-500">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block font-medium">Streak Multiplier</span>
            <h4 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">1.2x Study XP</h4>
            <span className="text-[10px] text-slate-400 block">Active level up bonus active!</span>
          </div>
        </div>
      </div>

      {/* HEATMAP CALENDAR VISUALIZER */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
        <div>
          <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm flex items-center">
            <Activity className="w-4.5 h-4.5 text-indigo-500 mr-1.5" />
            30-Day Productivity Heatmap
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Visualizing combined habits check-ins. Shadier boxes show higher consistency.</p>
        </div>

        {/* Heatmap Grid */}
        <div className="flex flex-col items-center">
          <div className="grid grid-cols-10 gap-2.5 p-4 bg-slate-50 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800 rounded-2xl">
            {past30Days.map((dateStr) => {
              const intensity = getHeatmapIntensity(dateStr);
              // Color mapping based on intensity count
              let colorClass = "bg-slate-100 dark:bg-slate-800";
              if (intensity === 1) colorClass = "bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600";
              else if (intensity === 2) colorClass = "bg-indigo-300 dark:bg-indigo-900/60";
              else if (intensity === 3) colorClass = "bg-indigo-500 dark:bg-indigo-700 text-white";
              else if (intensity >= 4) colorClass = "bg-indigo-700 dark:bg-indigo-600 text-white";

              return (
                <div 
                  key={dateStr}
                  className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center text-[10px] font-bold shadow-sm relative group ${colorClass}`}
                >
                  {/* Day number */}
                  <span>{new Date(dateStr).getDate()}</span>
                  
                  {/* Hover tooltip */}
                  <span className="absolute bottom-11 scale-0 group-hover:scale-100 transition-all bg-slate-800 text-white text-[9px] px-2 py-1 rounded shadow-md whitespace-nowrap z-20 pointer-events-none">
                    {new Date(dateStr).toLocaleDateString([], { month: "short", day: "numeric" })}: {intensity} habits
                  </span>
                </div>
              );
            })}
          </div>

          {/* Color Key */}
          <div className="flex items-center space-x-3 text-[10px] text-slate-400 mt-4 font-semibold">
            <span>Missed Day</span>
            <div className="w-4.5 h-4.5 rounded bg-slate-100 dark:bg-slate-800" />
            <div className="w-4.5 h-4.5 rounded bg-indigo-100 dark:bg-indigo-950/40" />
            <div className="w-4.5 h-4.5 rounded bg-indigo-300" />
            <div className="w-4.5 h-4.5 rounded bg-indigo-500" />
            <div className="w-4.5 h-4.5 rounded bg-indigo-700" />
            <span>Fully Productive (4+ habits)</span>
          </div>
        </div>
      </div>

      {/* CORE HABITS LIST CHECKBOXES */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
        <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">Target Habits Checklist</h3>

        <div className="space-y-3">
          {habits.map((habit) => {
            const { totalCompletions, completedToday, currentStreak } = getHabitStats(habit);
            
            // Get color properties
            const colorObj = COLOR_PRESETS.find((c) => c.class === habit.color) || COLOR_PRESETS[0];

            return (
              <div 
                key={habit.id}
                className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center justify-between"
              >
                <div className="flex items-center space-x-4">
                  {/* Emoji container */}
                  <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center text-2xl shadow-sm">
                    {habit.icon}
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">{habit.name}</h4>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-[10px] font-bold text-orange-500 flex items-center bg-orange-50 dark:bg-orange-950/40 px-1.5 py-0.5 rounded">
                        <Flame className="w-3 h-3 mr-0.5" />
                        {currentStreak} day streak
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400">Total: {totalCompletions} times</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {/* Toggle button */}
                  <button 
                    onClick={() => onToggleHabitDate(habit.id, todayStr)}
                    className={`h-9 px-4 rounded-xl text-xs font-bold transition flex items-center space-x-1 cursor-pointer ${
                      completedToday 
                        ? "bg-emerald-500 text-white shadow-sm" 
                        : "bg-white dark:bg-slate-950 hover:bg-slate-100 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800"
                    }`}
                  >
                    <Check className={`w-4 h-4 ${completedToday ? "stroke-[3px]" : "text-transparent"}`} />
                    <span>{completedToday ? "Completed" : "Check-in"}</span>
                  </button>

                  {/* Delete button */}
                  <button 
                    onClick={() => onDeleteHabit(habit.id)}
                    className="p-1.5 text-slate-300 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ADD HABIT MODAL POPUP */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-xl overflow-hidden">
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="font-bold text-slate-800 dark:text-slate-100">Create Study Habit</h3>
                <button onClick={() => setShowAdd(false)} className="p-1 text-slate-400 hover:bg-slate-100 rounded-full cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Habit Name *</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Solve 5 Algebra proofs"
                    className="w-full px-3.5 py-2 text-sm border rounded-xl border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 outline-none"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                {/* Icon emoji selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Choose Habit Icon</label>
                  <div className="flex flex-wrap gap-1.5">
                    {HABIT_ICONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setIcon(emoji)}
                        className={`text-xl p-1.5 hover:scale-110 active:scale-95 transition-all rounded-lg ${
                          icon === emoji ? "bg-indigo-50 border border-indigo-200" : ""
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Theme selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Color Tag</label>
                  <div className="flex space-x-2">
                    {COLOR_PRESETS.map((col) => (
                      <button
                        key={col.class}
                        type="button"
                        onClick={() => setColor(col.class)}
                        className={`w-6 h-6 rounded-full ${col.bg} transition border-2 ${
                          color === col.class ? "border-slate-800 dark:border-white scale-110" : "border-transparent"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center space-x-2 bg-indigo-50 dark:bg-indigo-950/20 p-2.5 rounded-xl border border-indigo-100/30 text-[10px] text-indigo-600 dark:text-indigo-400">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Each daily check-in logs <strong>+30 Study XP points</strong>!</span>
                </div>

                <button 
                  type="submit"
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl transition"
                >
                  Create Habit Tag
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
