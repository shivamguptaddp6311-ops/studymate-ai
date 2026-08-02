import React from "react";
import { Maximize2, Minimize2, ChevronDown, Settings, Brain, Sparkles, Image as ImageIcon, Trash2, Plus, X, Mic } from "lucide-react";
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
  onOpenWorkspacePanel?: () => void;
  onCreateNewChat: () => void;
  onDeleteCurrentChat: () => void;
  onOpenLiveVoiceTutor?: () => void;
  onOpenNotebookLMStudio?: () => void;
  onOpenImageGenerator?: () => void;
  activeDocumentCount?: number;
  showSettingsModal: boolean;
  setShowSettingsModal: (val: boolean) => void;
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
  onOpenWorkspacePanel,
  onCreateNewChat,
  onDeleteCurrentChat,
  onOpenLiveVoiceTutor,
  onOpenNotebookLMStudio,
  onOpenImageGenerator,
  showSettingsModal,
  setShowSettingsModal,
}: ChatHeaderProps) {

  return (
    <>
      <header className="h-[68px] min-h-[68px] px-3 md:px-5 border-b border-slate-200/70 dark:border-slate-800/80 bg-white/85 dark:bg-[#0c1326]/85 backdrop-blur-2xl flex items-center justify-between shrink-0 z-30 relative shadow-xs">
        {/* Left Section: Title, Subtitle, and AI Workspace Dropdown */}
        <div className="flex flex-col justify-center min-w-0 py-1">
          <div className="flex items-center space-x-2">
            <h1 className="font-extrabold text-base md:text-lg text-slate-900 dark:text-slate-100 tracking-tight leading-none">
              StudyMate AI
            </h1>
            <button
              type="button"
              onClick={onOpenWorkspacePanel || onOpenSessionsMenu}
              className="text-[10px] font-extrabold text-purple-600 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 px-2.5 py-0.5 rounded-full border border-purple-200/80 dark:border-purple-800/60 transition cursor-pointer flex items-center gap-1 shadow-2xs"
            >
              <Sparkles className="w-2.5 h-2.5 text-purple-500" />
              <span>AI Workspace</span>
            </button>
          </div>

          {/* Single AI Workspace Button with Dropdown Indicator */}
          <div className="mt-1">
            <button
              type="button"
              onClick={onOpenWorkspacePanel || onOpenSessionsMenu}
              className="inline-flex items-center space-x-1.5 text-xs font-semibold px-2.5 py-0.5 bg-slate-100/90 dark:bg-slate-800/70 hover:bg-slate-200/90 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg border border-slate-200/80 dark:border-slate-700/60 transition cursor-pointer max-w-[220px] sm:max-w-[320px] truncate"
              title="Open AI Workspace panel"
            >
              <span className="truncate">{activeSession?.title || "AI Workspace"}</span>
              <span className="text-[9px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.2 rounded shrink-0">
                {totalSessionsCount || 1}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </button>
          </div>
        </div>

        {/* Right Section: AI Settings & Fullscreen */}
        <div className="flex items-center space-x-2 shrink-0">
          {/* AI Settings Button */}
          <button
            type="button"
            onClick={() => setShowSettingsModal(true)}
            className="p-2 bg-slate-100/80 hover:bg-slate-200/80 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200/70 dark:border-slate-700/60 rounded-xl text-slate-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 transition cursor-pointer shadow-2xs"
            title="AI Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Fullscreen Button */}
          {onToggleFullScreen && (
            <button
              type="button"
              onClick={onToggleFullScreen}
              className="p-2 bg-slate-100/80 hover:bg-slate-200/80 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200/70 dark:border-slate-700/60 rounded-xl text-slate-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 transition cursor-pointer shadow-2xs"
              title={isFullScreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
              {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          )}
        </div>
      </header>

      {/* AI Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-[160] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Settings className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">AI Workspace Settings</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Settings Options */}
            <div className="space-y-3 text-xs">
              {/* Personalization Toggle */}
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-700/50">
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">Grade Personalization</span>
                  <span className="text-[10px] text-slate-400">Tailor responses for Class {profile?.classGrade || "10"}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setUsePersonalization(!usePersonalization)}
                  className={`w-10 h-6 flex items-center rounded-full p-1 transition cursor-pointer ${
                    usePersonalization ? "bg-purple-600 justify-end" : "bg-slate-300 dark:bg-slate-700 justify-start"
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-white shadow-xs" />
                </button>
              </div>

              {/* Auxiliary Tools */}
              {onOpenNotebookLMStudio && (
                <button
                  type="button"
                  onClick={() => {
                    setShowSettingsModal(false);
                    onOpenNotebookLMStudio();
                  }}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800/50 hover:bg-purple-50 dark:hover:bg-purple-950/30 rounded-xl border border-slate-200/60 dark:border-slate-700/50 flex items-center space-x-2.5 text-left transition font-semibold text-slate-800 dark:text-slate-200"
                >
                  <Brain className="w-4 h-4 text-purple-500" />
                  <span>Open NotebookLM Studio</span>
                </button>
              )}

              {onOpenImageGenerator && (
                <button
                  type="button"
                  onClick={() => {
                    setShowSettingsModal(false);
                    onOpenImageGenerator();
                  }}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800/50 hover:bg-purple-50 dark:hover:bg-purple-950/30 rounded-xl border border-slate-200/60 dark:border-slate-700/50 flex items-center space-x-2.5 text-left transition font-semibold text-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  <ImageIcon className="w-4 h-4 text-purple-500" />
                  <span>Open AI Image Generator</span>
                </button>
              )}

              {onOpenLiveVoiceTutor && (
                <button
                  type="button"
                  onClick={() => {
                    setShowSettingsModal(false);
                    onOpenLiveVoiceTutor();
                  }}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800/50 hover:bg-pink-50 dark:hover:bg-pink-950/30 rounded-xl border border-slate-200/60 dark:border-slate-700/50 flex items-center space-x-2.5 text-left transition font-semibold text-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  <Mic className="w-4 h-4 text-pink-500" />
                  <span>Open Live Voice Tutor</span>
                </button>
              )}

              {/* Create New Chat */}
              <button
                type="button"
                onClick={() => {
                  setShowSettingsModal(false);
                  onCreateNewChat();
                }}
                className="w-full p-3 bg-slate-50 dark:bg-slate-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-xl border border-slate-200/60 dark:border-slate-700/50 flex items-center space-x-2.5 text-left transition font-semibold text-slate-800 dark:text-slate-200"
              >
                <Plus className="w-4 h-4 text-indigo-500" />
                <span>Start New Chat Thread</span>
              </button>

              {/* Clear Current Chat */}
              <button
                type="button"
                onClick={() => {
                  setShowSettingsModal(false);
                  onOpenClearConfirm();
                }}
                className="w-full p-3 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-950/40 rounded-xl border border-rose-200/60 dark:border-rose-900/50 flex items-center space-x-2.5 text-left transition font-semibold text-rose-600 dark:text-rose-400"
              >
                <Trash2 className="w-4 h-4 text-rose-500" />
                <span>Delete Current Thread</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ChatHeader;
