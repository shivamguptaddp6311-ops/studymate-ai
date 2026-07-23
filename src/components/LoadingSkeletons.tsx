import React from "react";
import { motion } from "motion/react";
import { 
  Sparkles, Gamepad2, ClipboardList, MessageSquare, 
  BarChart3, Calendar, User, RefreshCw, Zap, Shield, Flame
} from "lucide-react";

/**
 * Reusable Shimmer Line / Box Component
 */
export const ShimmerBox: React.FC<{
  className?: string;
  style?: React.CSSProperties;
}> = ({ className = "h-4 w-full rounded-xl", style }) => (
  <div
    style={style}
    className={`relative overflow-hidden bg-slate-200/70 dark:bg-slate-800/70 ${className}`}
  >
    <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/50 dark:via-indigo-500/15 to-transparent animate-[shimmer_1.8s_infinite]" />
  </div>
);

/**
 * Animated Progress Bar Indicator Shimmer
 */
export const ShimmerProgressBar: React.FC<{
  progress?: number;
  className?: string;
}> = ({ progress = 65, className = "h-2.5 w-full rounded-full" }) => (
  <div className={`relative overflow-hidden bg-slate-200/60 dark:bg-slate-800/60 ${className}`}>
    <motion.div
      initial={{ width: "0%" }}
      animate={{ width: `${progress}%` }}
      transition={{ duration: 1.2, ease: "easeOut" }}
      className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full relative overflow-hidden"
    >
      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/60 to-transparent animate-[shimmer_1.5s_infinite]" />
    </motion.div>
  </div>
);

/**
 * 1. AI SKELETON LOADING SCREEN
 */
export const AISkeletonLoader: React.FC = () => (
  <div className="flex-1 flex flex-col min-h-[500px] w-full max-w-5xl mx-auto p-3 sm:p-6 space-y-5 select-none">
    {/* Top Header Banner Skeleton */}
    <div className="p-4 sm:p-5 rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-indigo-200/50 dark:border-indigo-900/50 shadow-lg flex items-center justify-between gap-4">
      <div className="flex items-center gap-3.5 w-full">
        <div className="relative p-3 bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 rounded-2xl border border-indigo-500/30">
          <Sparkles className="w-6 h-6 text-indigo-500 animate-pulse" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-indigo-500 rounded-full animate-ping" />
        </div>
        <div className="space-y-2 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <ShimmerBox className="h-5 w-44 rounded-lg" />
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 animate-pulse">
              AI Engine Ready
            </span>
          </div>
          <ShimmerBox className="h-3 w-64 rounded-md" />
        </div>
      </div>
    </div>

    {/* Quick Tools & Mode Pills Skeleton */}
    <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <ShimmerBox key={i} className="h-9 w-28 sm:w-32 rounded-2xl shrink-0" />
      ))}
    </div>

    {/* Chat Stream Skeleton Bubbles */}
    <div className="flex-1 space-y-4 py-2">
      {/* AI Welcome / Tutor Response Bubble */}
      <div className="flex items-start gap-3 max-w-2xl">
        <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shrink-0 shadow-md">
          <Zap className="w-4 h-4 animate-bounce" />
        </div>
        <div className="p-4 rounded-3xl rounded-tl-sm bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 shadow-md w-full space-y-3">
          <div className="flex items-center justify-between">
            <ShimmerBox className="h-4 w-32 rounded-md" />
            <ShimmerBox className="h-3 w-16 rounded-md" />
          </div>
          <ShimmerBox className="h-3.5 w-full rounded-md" />
          <ShimmerBox className="h-3.5 w-[85%] rounded-md" />
          <ShimmerBox className="h-3.5 w-[60%] rounded-md" />
          
          {/* Animated step-by-step list shimmer */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 space-y-2">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-indigo-500/20 shrink-0" />
                <ShimmerBox className="h-3 w-[80%] rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* User Query Bubble Right */}
      <div className="flex items-start justify-end gap-3 ml-auto max-w-lg">
        <div className="p-4 rounded-3xl rounded-tr-sm bg-indigo-600/90 text-white shadow-md w-full space-y-2">
          <ShimmerBox className="h-3.5 w-[90%] rounded-md bg-white/30" />
          <ShimmerBox className="h-3.5 w-[50%] rounded-md bg-white/30" />
        </div>
      </div>

      {/* AI Processing Code/Solution Skeleton */}
      <div className="flex items-start gap-3 max-w-2xl">
        <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shrink-0 shadow-md">
          <Sparkles className="w-4 h-4 animate-spin" />
        </div>
        <div className="p-4 rounded-3xl rounded-tl-sm bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 shadow-md w-full space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">Synthesizing Smart Answer...</span>
            </div>
            <ShimmerBox className="h-3 w-12 rounded-md" />
          </div>
          <ShimmerBox className="h-16 w-full rounded-2xl" />
        </div>
      </div>
    </div>

    {/* Prompt Input Bar Skeleton */}
    <div className="p-3 bg-white/90 dark:bg-slate-900/90 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-xl flex items-center gap-2">
      <ShimmerBox className="h-10 w-10 rounded-2xl shrink-0" />
      <ShimmerBox className="h-10 w-10 rounded-2xl shrink-0" />
      <ShimmerBox className="h-10 flex-1 rounded-2xl" />
      <ShimmerBox className="h-10 w-24 rounded-2xl shrink-0" />
    </div>
  </div>
);

/**
 * 2. GAMES SKELETON LOADING SCREEN
 */
export const GamesSkeletonLoader: React.FC = () => (
  <div className="flex-1 flex flex-col min-h-[500px] w-full max-w-5xl mx-auto p-3 sm:p-6 space-y-6 select-none">
    {/* Game Hero Banner Skeleton */}
    <div className="p-5 sm:p-6 rounded-[2.5rem] bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-indigo-500/10 border border-amber-200/60 dark:border-amber-900/40 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-4 w-full sm:w-auto">
        <div className="p-4 bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-3xl shadow-lg shadow-amber-500/30">
          <Gamepad2 className="w-8 h-8 animate-bounce" />
        </div>
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-2">
            <ShimmerBox className="h-6 w-48 rounded-lg" />
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
              Gamified CBSE Learning
            </span>
          </div>
          <ShimmerBox className="h-3.5 w-64 rounded-md" />
        </div>
      </div>
      <div className="w-full sm:w-48 space-y-2">
        <div className="flex justify-between text-xs font-bold text-slate-500">
          <span>XP Boost</span>
          <span className="text-amber-500 animate-pulse">Leveling up...</span>
        </div>
        <ShimmerProgressBar progress={78} className="h-3 w-full rounded-full" />
      </div>
    </div>

    {/* Game Category Tabs Skeleton */}
    <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
      {[1, 2, 3, 4].map((i) => (
        <ShimmerBox key={i} className="h-10 w-36 rounded-2xl shrink-0" />
      ))}
    </div>

    {/* Game Cards 4-Grid Skeleton */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="p-5 rounded-3xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShimmerBox className="h-12 w-12 rounded-2xl shrink-0" />
              <div className="space-y-1.5">
                <ShimmerBox className="h-4 w-32 rounded-md" />
                <ShimmerBox className="h-3 w-20 rounded-md" />
              </div>
            </div>
            <ShimmerBox className="h-6 w-16 rounded-full" />
          </div>
          <ShimmerBox className="h-3.5 w-full rounded-md" />
          <ShimmerBox className="h-3.5 w-3/4 rounded-md" />
          <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/60">
            <ShimmerBox className="h-4 w-24 rounded-md" />
            <ShimmerBox className="h-9 w-28 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

/**
 * 3. HOMEWORK / TASKS SKELETON LOADING SCREEN
 */
export const HomeworkSkeletonLoader: React.FC = () => (
  <div className="flex-1 flex flex-col min-h-[500px] w-full max-w-5xl mx-auto p-3 sm:p-6 space-y-6 select-none">
    {/* Summary Stats Row Skeleton */}
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {[
        { label: "Pending", color: "border-blue-200/60 dark:border-blue-900/50" },
        { label: "Due Today", color: "border-amber-200/60 dark:border-amber-900/50" },
        { label: "High Priority", color: "border-rose-200/60 dark:border-rose-900/50" },
        { label: "Completed", color: "border-emerald-200/60 dark:border-emerald-900/50" }
      ].map((card, i) => (
        <div key={i} className={`p-4 rounded-3xl bg-white/80 dark:bg-slate-900/80 border ${card.color} shadow-md space-y-2`}>
          <div className="flex items-center justify-between">
            <ShimmerBox className="h-3 w-16 rounded-md" />
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
          </div>
          <ShimmerBox className="h-7 w-12 rounded-lg" />
          <ShimmerProgressBar progress={(i + 1) * 22} className="h-2 w-full rounded-full" />
        </div>
      ))}
    </div>

    {/* Search & Filter Pills Skeleton */}
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-white/80 dark:bg-slate-900/80 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
      <ShimmerBox className="h-10 w-full sm:w-72 rounded-2xl" />
      <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto no-scrollbar">
        {[1, 2, 3, 4].map((f) => (
          <ShimmerBox key={f} className="h-8 w-20 rounded-xl shrink-0" />
        ))}
      </div>
    </div>

    {/* Homework List Items Skeleton */}
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((item) => (
        <div key={item} className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 flex-1 min-w-0">
            <ShimmerBox className="h-6 w-6 rounded-lg shrink-0" />
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <ShimmerBox className="h-4 w-48 rounded-md" />
                <ShimmerBox className="h-4 w-16 rounded-full" />
              </div>
              <div className="flex items-center gap-3">
                <ShimmerBox className="h-3 w-24 rounded-md" />
                <ShimmerBox className="h-3 w-20 rounded-md" />
              </div>
            </div>
          </div>
          <ShimmerBox className="h-8 w-8 rounded-xl shrink-0" />
        </div>
      ))}
    </div>
  </div>
);

/**
 * 4. CHAT SKELETON LOADING SCREEN
 */
export const ChatSkeletonLoader: React.FC = () => (
  <div className="w-full max-w-md mx-auto flex-1 flex flex-col min-h-[500px] bg-slate-50/90 dark:bg-slate-950/90 rounded-none sm:rounded-[2.5rem] border-0 sm:border border-slate-200/80 dark:border-slate-800/80 shadow-2xl overflow-hidden select-none my-0 sm:my-2">
    {/* Top Header Bar */}
    <div className="p-4 bg-white/80 dark:bg-slate-900/80 border-b border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-600 text-white rounded-2xl shadow-md">
          <MessageSquare className="w-4 h-4 animate-pulse" />
        </div>
        <div className="space-y-1">
          <ShimmerBox className="h-4 w-28 rounded-md" />
          <ShimmerBox className="h-3 w-20 rounded-md" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <ShimmerBox className="h-8 w-16 rounded-xl" />
        <ShimmerBox className="h-8 w-8 rounded-xl" />
      </div>
    </div>

    {/* Room Switcher Tabs */}
    <div className="p-2 bg-white/60 dark:bg-slate-900/60 border-b border-slate-200/40 dark:border-slate-800/40">
      <div className="grid grid-cols-3 gap-1 bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-2xl">
        {[1, 2, 3].map((t) => (
          <ShimmerBox key={t} className="h-8 w-full rounded-xl" />
        ))}
      </div>
    </div>

    {/* Chat Message Stream Skeleton */}
    <div className="flex-1 p-4 space-y-4 overflow-y-hidden">
      {/* Pinned announcement banner */}
      <div className="p-3 bg-indigo-50/80 dark:bg-indigo-950/50 border border-indigo-200/50 dark:border-indigo-800/50 rounded-2xl space-y-1.5">
        <div className="flex justify-between items-center">
          <ShimmerBox className="h-3 w-24 rounded-md" />
          <ShimmerBox className="h-3 w-12 rounded-md" />
        </div>
        <ShimmerBox className="h-3 w-full rounded-md" />
      </div>

      {/* Received Message Bubble */}
      <div className="flex items-start gap-2.5 max-w-[85%]">
        <ShimmerBox className="h-8 w-8 rounded-full shrink-0" />
        <div className="space-y-1 flex-1">
          <ShimmerBox className="h-3 w-20 rounded-md" />
          <div className="p-3 rounded-2xl rounded-tl-sm bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 shadow-sm space-y-1.5">
            <ShimmerBox className="h-3.5 w-full rounded-md" />
            <ShimmerBox className="h-3.5 w-[75%] rounded-md" />
          </div>
        </div>
      </div>

      {/* Sent Message Bubble */}
      <div className="flex items-start justify-end gap-2.5 ml-auto max-w-[80%]">
        <div className="space-y-1 flex-1 items-end">
          <div className="p-3 rounded-2xl rounded-tr-sm bg-indigo-600 text-white shadow-sm space-y-1.5">
            <ShimmerBox className="h-3.5 w-full rounded-md bg-white/30" />
            <ShimmerBox className="h-3.5 w-[60%] rounded-md bg-white/30" />
          </div>
        </div>
      </div>

      {/* Another Received Message */}
      <div className="flex items-start gap-2.5 max-w-[85%]">
        <ShimmerBox className="h-8 w-8 rounded-full shrink-0" />
        <div className="space-y-1 flex-1">
          <ShimmerBox className="h-3 w-24 rounded-md" />
          <div className="p-3 rounded-2xl rounded-tl-sm bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 shadow-sm space-y-1.5">
            <ShimmerBox className="h-3.5 w-[90%] rounded-md" />
          </div>
        </div>
      </div>
    </div>

    {/* Message Composer Bar Skeleton */}
    <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center gap-2">
      <ShimmerBox className="h-9 w-9 rounded-xl shrink-0" />
      <ShimmerBox className="h-9 flex-1 rounded-xl" />
      <ShimmerBox className="h-9 w-12 rounded-xl shrink-0" />
    </div>
  </div>
);

/**
 * 5. ANALYTICS SKELETON LOADING SCREEN
 */
export const AnalyticsSkeletonLoader: React.FC = () => (
  <div className="flex-1 flex flex-col min-h-[500px] w-full max-w-5xl mx-auto p-3 sm:p-6 space-y-6 select-none">
    {/* KPI Metrics Row */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {[
        { label: "Study Time", color: "from-indigo-500/10 to-purple-500/10" },
        { label: "Mastery Rate", color: "from-emerald-500/10 to-teal-500/10" },
        { label: "Study Streak", color: "from-amber-500/10 to-orange-500/10" },
        { label: "Tasks Cleared", color: "from-rose-500/10 to-pink-500/10" }
      ].map((kpi, idx) => (
        <div key={idx} className={`p-4 rounded-3xl bg-gradient-to-br ${kpi.color} bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 shadow-md space-y-2`}>
          <div className="flex items-center justify-between">
            <ShimmerBox className="h-3 w-20 rounded-md" />
            <BarChart3 className="w-4 h-4 text-slate-400 animate-pulse" />
          </div>
          <ShimmerBox className="h-8 w-16 rounded-lg" />
          <div className="flex items-center gap-2">
            <ShimmerBox className="h-3 w-10 rounded-md" />
            <ShimmerBox className="h-3 flex-1 rounded-md" />
          </div>
        </div>
      ))}
    </div>

    {/* Chart & Subject Breakdown Grid */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Main Chart Skeleton */}
      <div className="lg:col-span-2 p-5 sm:p-6 rounded-3xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 shadow-md space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <ShimmerBox className="h-5 w-44 rounded-md" />
            <ShimmerBox className="h-3 w-32 rounded-md" />
          </div>
          <ShimmerBox className="h-8 w-24 rounded-xl" />
        </div>

        {/* Bar Towers Skeleton */}
        <div className="h-56 flex items-end justify-between gap-3 pt-6 border-b border-slate-100 dark:border-slate-800/60">
          {[40, 75, 55, 90, 65, 85, 50].map((h, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
              <ShimmerProgressBar progress={h} className="w-full h-full max-h-[180px] rounded-t-2xl" />
              <ShimmerBox className="h-3 w-6 rounded-md" />
            </div>
          ))}
        </div>
      </div>

      {/* Subject Mastery Ring Skeleton */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 shadow-md space-y-4 flex flex-col justify-between">
        <div className="space-y-1">
          <ShimmerBox className="h-5 w-36 rounded-md" />
          <ShimmerBox className="h-3 w-28 rounded-md" />
        </div>

        <div className="relative w-36 h-36 mx-auto flex items-center justify-center">
          <div className="w-full h-full rounded-full border-8 border-slate-200 dark:border-slate-800 animate-pulse border-t-indigo-500 border-r-purple-500" />
          <div className="absolute flex flex-col items-center">
            <ShimmerBox className="h-6 w-12 rounded-md" />
            <ShimmerBox className="h-3 w-16 rounded-md mt-1" />
          </div>
        </div>

        <div className="space-y-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="space-y-1">
              <div className="flex justify-between text-xs">
                <ShimmerBox className="h-3 w-20 rounded-md" />
                <ShimmerBox className="h-3 w-8 rounded-md" />
              </div>
              <ShimmerProgressBar progress={s * 28} className="h-2 w-full rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

/**
 * 6. CALENDAR SKELETON LOADING SCREEN
 */
export const CalendarSkeletonLoader: React.FC = () => (
  <div className="flex-1 flex flex-col min-h-[500px] w-full max-w-5xl mx-auto p-3 sm:p-6 space-y-5 select-none">
    {/* Calendar Header Bar Skeleton */}
    <div className="p-4 sm:p-5 rounded-3xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-3 w-full sm:w-auto">
        <div className="p-2.5 bg-gradient-to-tr from-indigo-500 to-purple-600 text-white rounded-2xl shadow-md">
          <Calendar className="w-5 h-5 animate-pulse" />
        </div>
        <div className="space-y-1 flex-1">
          <ShimmerBox className="h-5 w-40 rounded-md" />
          <ShimmerBox className="h-3 w-24 rounded-md" />
        </div>
      </div>
      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
        <ShimmerBox className="h-9 w-24 rounded-xl" />
        <ShimmerBox className="h-9 w-9 rounded-xl" />
        <ShimmerBox className="h-9 w-9 rounded-xl" />
      </div>
    </div>

    {/* Weekday Headers */}
    <div className="grid grid-cols-7 gap-1.5 text-center">
      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
        <div key={day} className="py-2 bg-slate-100/60 dark:bg-slate-800/60 rounded-xl">
          <ShimmerBox className="h-3 w-8 mx-auto rounded-md" />
        </div>
      ))}
    </div>

    {/* 35 Cell Calendar Grid */}
    <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
      {Array.from({ length: 28 }).map((_, i) => (
        <div 
          key={i} 
          className="min-h-[60px] sm:min-h-[85px] p-2 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800/60 shadow-sm space-y-1.5"
        >
          <ShimmerBox className="h-3.5 w-5 rounded-md" />
          {i % 3 === 0 && <ShimmerBox className="h-2.5 w-full rounded-md bg-indigo-200 dark:bg-indigo-900/60" />}
          {i % 5 === 0 && <ShimmerBox className="h-2.5 w-3/4 rounded-md bg-emerald-200 dark:bg-emerald-900/60" />}
        </div>
      ))}
    </div>
  </div>
);

/**
 * 7. PROFILE SKELETON LOADING SCREEN
 */
export const ProfileSkeletonLoader: React.FC = () => (
  <div className="flex-1 flex flex-col min-h-[500px] w-full max-w-5xl mx-auto p-3 sm:p-6 space-y-6 select-none">
    {/* Profile Hero Header Banner Skeleton */}
    <div className="p-6 sm:p-8 rounded-[2.5rem] bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-200/50 dark:border-indigo-900/50 shadow-xl flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
      <div className="relative">
        <ShimmerBox className="w-24 h-24 rounded-full border-4 border-white dark:border-slate-900 shadow-xl" />
        <span className="absolute bottom-1 right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900 animate-ping" />
      </div>
      <div className="space-y-2 flex-1">
        <div className="flex flex-col sm:flex-row items-center gap-2">
          <ShimmerBox className="h-7 w-48 rounded-lg" />
          <ShimmerBox className="h-5 w-24 rounded-full" />
        </div>
        <ShimmerBox className="h-3.5 w-64 rounded-md mx-auto sm:mx-0" />
        <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2">
          <ShimmerBox className="h-7 w-28 rounded-xl" />
          <ShimmerBox className="h-7 w-28 rounded-xl" />
        </div>
      </div>
    </div>

    {/* Level & Streak Progress Card Skeleton */}
    <div className="p-5 rounded-3xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 shadow-md space-y-3">
      <div className="flex justify-between items-center">
        <ShimmerBox className="h-4 w-32 rounded-md" />
        <ShimmerBox className="h-4 w-16 rounded-md" />
      </div>
      <ShimmerProgressBar progress={72} className="h-3.5 w-full rounded-full" />
    </div>

    {/* Badges Grid Skeleton */}
    <div className="space-y-3">
      <ShimmerBox className="h-5 w-36 rounded-md" />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {[1, 2, 3, 4, 5, 6].map((b) => (
          <div key={b} className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex flex-col items-center text-center space-y-2">
            <ShimmerBox className="w-12 h-12 rounded-full" />
            <ShimmerBox className="h-3 w-16 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

/**
 * 8. GENERIC MODULE LAZY FALLBACK SKELETON
 */
export const GenericModuleSkeletonLoader: React.FC<{ tab?: string }> = ({ tab }) => {
  switch (tab) {
    case "assistant":
      return <AISkeletonLoader />;
    case "games":
      return <GamesSkeletonLoader />;
    case "tasks":
      return <HomeworkSkeletonLoader />;
    case "chat":
      return <ChatSkeletonLoader />;
    case "analytics":
      return <AnalyticsSkeletonLoader />;
    case "calendar":
      return <CalendarSkeletonLoader />;
    case "profile":
      return <ProfileSkeletonLoader />;
    default:
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[420px] w-full max-w-4xl mx-auto space-y-5 select-none">
          <div className="relative p-5 rounded-3xl bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-pink-500/20 border border-indigo-500/30 shadow-xl">
            <RefreshCw className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-spin" />
          </div>
          <div className="space-y-2 w-full max-w-sm">
            <ShimmerBox className="h-5 w-48 mx-auto rounded-lg" />
            <ShimmerBox className="h-3.5 w-64 mx-auto rounded-md" />
          </div>
          <div className="w-full max-w-md p-6 rounded-3xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 shadow-lg space-y-3">
            <ShimmerBox className="h-4 w-full rounded-md" />
            <ShimmerBox className="h-4 w-[80%] rounded-md" />
            <ShimmerProgressBar progress={85} className="h-2.5 w-full rounded-full mt-2" />
          </div>
        </div>
      );
  }
};

export default GenericModuleSkeletonLoader;
