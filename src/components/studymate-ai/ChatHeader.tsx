import React from "react";
import { Brain, Maximize2, Minimize2, Trash2, Plus, MessageSquare, ChevronDown, Mic, Radio } from "lucide-react";
import { StudyMateBrainLogo } from "../NavIcons";
import { UserProfile } from "../../types";
import { ChatSession } from "./types";

interface ChatHeaderProps {
  profile: UserProfile;
  usePersonalization: boolean;
  setUsePersonalization: (val: boolean) => void;
  isFullScreen?: boolean;
  onToggleFullScreen?: () => void;
  activeSession: ChatSession;
  totalSessionsCount: number;
  onOpenClearConfirm: () => void;
  onOpenSessionsMenu: () => void;
  onCreateNewChat: () => void;
  onDeleteCurrentChat: () => void;
  onOpenLiveVoiceTutor?: () => void;
}

export function ChatHeader({
  profile,
  usePersonalization,
  setUsePersonalization,
  isFullScreen,
  onToggleFullScreen,
  activeSession,
  totalSessionsCount,
  onOpenClearConfirm,
  onOpenSessionsMenu,
  onCreateNewChat,
  onDeleteCurrentChat,
  onOpenLiveVoiceTutor
}: ChatHeaderProps) {
  return (
    <div className="p-3 md:p-4 border-b border-white/20 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl flex items-center justify-between flex-shrink-0 z-30 shadow-xs relative gap-2">
      {/* Brand Logo & Active Session Indicator */}
      <div className="flex items-center space-x-3 min-w-0">
        <div className="relative shrink-0">
          <StudyMateBrainLogo isActive={true} size={32} />
          <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full shadow-md animate-pulse"></span>
        </div>
        <div className="min-w-0">
          <div className="flex items-center space-x-2">
            <h3 className="font-black text-sm text-slate-800 dark:text-slate-100 truncate">
              StudyMate AI
            </h3>
            <span className="hidden sm:inline-block text-[9px] font-black tracking-wider uppercase bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-2 py-0.5 rounded-full shadow-xs shrink-0">
              AI WORKSPACE
            </span>
          </div>

          {/* Active Chat Thread Pill / Dropdown Switcher Trigger */}
          <button
            type="button"
            onClick={onOpenSessionsMenu}
            className="flex items-center space-x-1.5 text-left group mt-0.5 hover:opacity-90 transition cursor-pointer"
            title="Switch or manage chat threads"
          >
            <MessageSquare className="w-3 h-3 text-indigo-500 shrink-0" />
            <span className="text-[11px] font-extrabold text-slate-600 dark:text-slate-300 max-w-[140px] sm:max-w-[200px] truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
              {activeSession.title || "Study Session"}
            </span>
            <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-extrabold px-1.5 py-0.2 rounded-md shrink-0">
              {totalSessionsCount}
            </span>
            <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-indigo-500 transition shrink-0" />
          </button>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
        {/* Live AI Voice Tutor Button */}
        {onOpenLiveVoiceTutor && (
          <button
            type="button"
            onClick={onOpenLiveVoiceTutor}
            className="px-2.5 py-1.5 sm:px-3 sm:py-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-md hover:shadow-emerald-500/20 transition flex items-center space-x-1.5 cursor-pointer shrink-0 border border-emerald-400/30 animate-pulse"
            title="Launch Real-time Gemini Live AI Voice Tutor"
          >
            <Mic className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Live Voice Tutor</span>
            <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping shrink-0" />
          </button>
        )}

        {/* + New Chat Button */}
        <button
          type="button"
          onClick={onCreateNewChat}
          className="px-2.5 py-1.5 sm:px-3 sm:py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold text-xs rounded-xl shadow-md hover:shadow-indigo-500/20 transition flex items-center space-x-1 cursor-pointer shrink-0"
          title="Create a new clean study chat thread"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New Chat</span>
        </button>

        {/* Delete Current Chat Button */}
        <button
          type="button"
          onClick={onDeleteCurrentChat}
          className="p-2 bg-slate-100 hover:bg-rose-50 dark:bg-slate-800/50 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200/50 dark:border-slate-800 hover:border-rose-200 dark:hover:border-rose-900/50 rounded-xl transition cursor-pointer shadow-xs"
          title="Delete this chat thread"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        {/* Personalization Toggle */}
        <button
          type="button"
          onClick={() => setUsePersonalization(!usePersonalization)}
          className={`text-[10px] font-black border px-2.5 py-2 rounded-xl transition duration-150 flex items-center space-x-1.5 cursor-pointer shadow-xs ${
            usePersonalization 
              ? "bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-200/40 dark:border-indigo-900/40"
              : "bg-slate-100 dark:bg-slate-800/50 text-slate-400 border-slate-200/60 dark:border-slate-700/60"
          }`}
          title="Tailor explanations based on your Grade and weak subjects"
        >
          <Brain className="w-3.5 h-3.5" />
          <span className="hidden md:inline">{usePersonalization ? `Class ${profile.classGrade || "10"} Mode` : "General"}</span>
        </button>

        {/* Full Screen Toggle */}
        {onToggleFullScreen && (
          <button
            type="button"
            onClick={onToggleFullScreen}
            className="p-2 bg-slate-100 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-800 rounded-xl transition cursor-pointer text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 shadow-xs hidden sm:flex"
            title={isFullScreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  );
}

export default ChatHeader;
