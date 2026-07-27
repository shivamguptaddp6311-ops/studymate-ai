import React from "react";
import { Brain, Settings, CheckCircle, GraduationCap } from "lucide-react";
import { UserProfile } from "../../types";

interface ChatSettingsProps {
  profile: UserProfile;
  usePersonalization: boolean;
  setUsePersonalization: (val: boolean) => void;
}

export function ChatSettings({
  profile,
  usePersonalization,
  setUsePersonalization,
}: ChatSettingsProps) {
  return (
    <div className="p-4 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-white/30 dark:border-slate-800 rounded-2xl space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Settings className="w-4 h-4 text-indigo-500" />
          <h4 className="font-extrabold text-xs text-slate-800 dark:text-slate-200">
            Workspace Learning Settings
          </h4>
        </div>
        <button
          type="button"
          onClick={() => setUsePersonalization(!usePersonalization)}
          className={`text-xs font-bold px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center space-x-1.5 ${
            usePersonalization
              ? "bg-indigo-600 text-white shadow-xs"
              : "bg-slate-100 dark:bg-slate-800 text-slate-500"
          }`}
        >
          <Brain className="w-3.5 h-3.5" />
          <span>{usePersonalization ? "Tailored Mode Active" : "General Mode"}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-500 dark:text-slate-400">
        <div className="flex items-center space-x-2 p-2 rounded-xl bg-slate-50/80 dark:bg-slate-950/40 border border-slate-200/50 dark:border-slate-800">
          <GraduationCap className="w-4 h-4 text-indigo-500 shrink-0" />
          <div>
            <span className="font-bold text-slate-700 dark:text-slate-300 block">Class Grade</span>
            <span>Class {profile.classGrade || "10"} ({profile.targetExam || "Board Exam"})</span>
          </div>
        </div>

        <div className="flex items-center space-x-2 p-2 rounded-xl bg-slate-50/80 dark:bg-slate-950/40 border border-slate-200/50 dark:border-slate-800">
          <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
          <div>
            <span className="font-bold text-slate-700 dark:text-slate-300 block">Focus Areas</span>
            <span className="truncate block max-w-[180px]">
              {profile.weakSubjects.join(", ") || "All Subjects"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatSettings;
