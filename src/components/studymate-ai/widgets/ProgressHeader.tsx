import React from "react";
import { Clock, Award, Flame, BarChart2 } from "lucide-react";

interface ProgressHeaderProps {
  title: string;
  subject: string;
  chapter?: string;
  currentIndex: number;
  totalCount: number;
  score?: number;
  maxScore?: number;
  difficulty?: string;
  estimatedTime?: string;
  modeLabel?: string;
  onSelectMode?: (mode: string) => void;
}

export const ProgressHeader: React.FC<ProgressHeaderProps> = ({
  title,
  subject,
  chapter,
  currentIndex,
  totalCount,
  score,
  maxScore,
  difficulty = "Medium",
  estimatedTime,
  modeLabel
}) => {
  const progressPercent = totalCount > 0 ? Math.min(100, Math.round(((currentIndex + 1) / totalCount) * 100)) : 0;

  const getDifficultyColor = (diff: string) => {
    switch (diff.toLowerCase()) {
      case "easy":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "hard":
      case "exam level":
        return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
      case "medium":
      default:
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
    }
  };

  return (
    <div className="w-full bg-slate-50/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-3.5 mb-4 shadow-2xs">
      {/* Top Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center space-x-2">
          <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-wider border border-indigo-500/20">
            {subject}
          </span>
          {chapter && (
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate max-w-[180px]">
              {chapter}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {difficulty && (
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${getDifficultyColor(difficulty)}`}>
              {difficulty}
            </span>
          )}

          {estimatedTime && (
            <span className="flex items-center space-x-1 text-[11px] font-bold text-slate-500 dark:text-slate-400 bg-slate-200/50 dark:bg-slate-800/60 px-2 py-0.5 rounded-md">
              <Clock className="w-3 h-3 text-indigo-500" />
              <span>{estimatedTime}</span>
            </span>
          )}

          {score !== undefined && maxScore !== undefined && (
            <span className="flex items-center space-x-1 text-[11px] font-extrabold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
              <Award className="w-3 h-3 text-amber-500" />
              <span>{score} / {maxScore}</span>
            </span>
          )}
        </div>
      </div>

      {/* Title & Counter */}
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 truncate pr-2">
          {title}
        </h4>
        <div className="flex items-center space-x-1.5 shrink-0">
          {modeLabel && (
            <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md">
              {modeLabel}
            </span>
          )}
          <span className="text-xs font-black font-mono text-indigo-600 dark:text-indigo-400">
            {Math.min(currentIndex + 1, totalCount)} <span className="text-slate-400 font-normal">/ {totalCount}</span>
          </span>
        </div>
      </div>

      {/* Animated Progress Bar */}
      <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-300 rounded-full"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
};
