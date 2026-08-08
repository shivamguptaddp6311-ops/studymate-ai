import React, { useState } from "react";
import { motion } from "motion/react";
import { 
  X, Settings, Brain, Sliders, Volume2, Shield, Eye, Download, Trash2, Check, Sparkles, Cpu, Layers
} from "lucide-react";

interface AISettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  usePersonalization: boolean;
  setUsePersonalization: (val: boolean) => void;
  onExportData?: () => void;
  onClearData?: () => void;
}

export function AISettingsModal({
  isOpen,
  onClose,
  selectedModel,
  setSelectedModel,
  usePersonalization,
  setUsePersonalization,
  onExportData,
  onClearData
}: AISettingsModalProps) {
  const [autoFallback, setAutoFallback] = useState(() => localStorage.getItem("studymate_auto_fallback") !== "false");
  const [reasoningMode, setReasoningMode] = useState(() => localStorage.getItem("studymate_reasoning_mode") || "standard");
  const [responseLang, setResponseLang] = useState(() => localStorage.getItem("studymate_response_lang") || "en");
  const [voiceSpeed, setVoiceSpeed] = useState(() => localStorage.getItem("studymate_voice_speed") || "1.0");
  const [memoryEnabled, setMemoryEnabled] = useState(() => localStorage.getItem("studymate_memory") !== "false");
  const [saveHistory, setSaveHistory] = useState(() => localStorage.getItem("studymate_save_history") !== "false");
  const [imageQuality, setImageQuality] = useState(() => localStorage.getItem("studymate_image_quality") || "1080p");
  const [videoQuality, setVideoQuality] = useState(() => localStorage.getItem("studymate_video_quality") || "720p");

  if (!isOpen) return null;

  const saveSetting = (key: string, value: string, setter: (val: any) => void) => {
    setter(value);
    localStorage.setItem(key, value);
  };

  const toggleSetting = (key: string, current: boolean, setter: (val: boolean) => void) => {
    const next = !current;
    setter(next);
    localStorage.setItem(key, String(next));
  };

  return (
    <div className="fixed inset-0 z-[160] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.15 }}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg max-h-[88vh] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-950/80 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-gradient-to-tr from-purple-600 to-indigo-600 text-white rounded-xl shadow-xs">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">AI Assistant Settings</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Configure models, reasoning, quality & preferences</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 bg-slate-200/80 dark:bg-slate-800/80 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          {/* Default Model */}
          <div className="space-y-1.5">
            <label className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-purple-600" />
              <span>Default AI Model</span>
            </label>
            <select
              value={selectedModel}
              onChange={(e) => {
                setSelectedModel(e.target.value);
                localStorage.setItem("studymate_ai_model", e.target.value);
              }}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 rounded-xl text-slate-800 dark:text-slate-200 font-bold focus:outline-none"
            >
              <option value="auto">⚡ Auto AI (Intelligent Selector)</option>
              <option value="openai">🧠 OpenAI GPT-4o Mini</option>
              <option value="gemini">♊ Google Gemini 2.5 Flash</option>
              <option value="claude">🦉 Anthropic Claude 3.5 Sonnet</option>
              <option value="groq">⚡ Groq (Llama 3.3 Fast)</option>
              <option value="grok">🚀 xAI Grok 3</option>
              <option value="deepseek">🐋 DeepSeek V3 / R1</option>
              <option value="openrouter">🌐 OpenRouter Multi-Model</option>
            </select>
          </div>

          {/* Toggles Group */}
          <div className="space-y-2.5">
            {/* Auto Model Fallback */}
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/60 dark:border-slate-700/50">
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200 block">Auto Model Fallback</span>
                <span className="text-[10px] text-slate-400">Switch providers if primary API times out</span>
              </div>
              <button
                type="button"
                onClick={() => toggleSetting("studymate_auto_fallback", autoFallback, setAutoFallback)}
                className={`w-10 h-6 flex items-center rounded-full p-1 transition cursor-pointer ${
                  autoFallback ? "bg-purple-600 justify-end" : "bg-slate-300 dark:bg-slate-700 justify-start"
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-white shadow-xs" />
              </button>
            </div>

            {/* Context Memory */}
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/60 dark:border-slate-700/50">
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200 block">Context Memory</span>
                <span className="text-[10px] text-slate-400 font-medium">Remember previous notes & study topics</span>
              </div>
              <button
                type="button"
                onClick={() => toggleSetting("studymate_memory", memoryEnabled, setMemoryEnabled)}
                className={`w-10 h-6 flex items-center rounded-full p-1 transition cursor-pointer ${
                  memoryEnabled ? "bg-purple-600 justify-end" : "bg-slate-300 dark:bg-slate-700 justify-start"
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-white shadow-xs" />
              </button>
            </div>

            {/* Chat History */}
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/60 dark:border-slate-700/50">
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200 block">Save Chat History</span>
                <span className="text-[10px] text-slate-400">Persist conversations across study sessions</span>
              </div>
              <button
                type="button"
                onClick={() => toggleSetting("studymate_save_history", saveHistory, setSaveHistory)}
                className={`w-10 h-6 flex items-center rounded-full p-1 transition cursor-pointer ${
                  saveHistory ? "bg-purple-600 justify-end" : "bg-slate-300 dark:bg-slate-700 justify-start"
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-white shadow-xs" />
              </button>
            </div>

            {/* Grade Personalization */}
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/60 dark:border-slate-700/50">
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200 block">Grade Personalization</span>
                <span className="text-[10px] text-slate-400">Adapt explanations to your syllabus level</span>
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
          </div>

          {/* Reasoning Mode & Language */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">Reasoning Mode</label>
              <select
                value={reasoningMode}
                onChange={(e) => saveSetting("studymate_reasoning_mode", e.target.value, setReasoningMode)}
                className="w-full p-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 rounded-xl text-slate-800 dark:text-slate-200 font-semibold"
              >
                <option value="standard">Standard Fast</option>
                <option value="deep">Deep Chain-of-Thought</option>
                <option value="exam">Exam Problem Solving</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">Response Language</label>
              <select
                value={responseLang}
                onChange={(e) => saveSetting("studymate_response_lang", e.target.value, setResponseLang)}
                className="w-full p-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 rounded-xl text-slate-800 dark:text-slate-200 font-semibold"
              >
                <option value="en">English</option>
                <option value="hi">Hindi (हिंदी)</option>
                <option value="es">Spanish (Español)</option>
                <option value="fr">French (Français)</option>
                <option value="de">German (Deutsch)</option>
              </select>
            </div>
          </div>

          {/* Quality Preferences */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">Image Quality</label>
              <select
                value={imageQuality}
                onChange={(e) => saveSetting("studymate_image_quality", e.target.value, setImageQuality)}
                className="w-full p-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 rounded-xl text-slate-800 dark:text-slate-200 font-semibold"
              >
                <option value="720p">Standard 720p</option>
                <option value="1080p">High 1080p</option>
                <option value="4k">Ultra 4K</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">Video Quality</label>
              <select
                value={videoQuality}
                onChange={(e) => saveSetting("studymate_video_quality", e.target.value, setVideoQuality)}
                className="w-full p-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 rounded-xl text-slate-800 dark:text-slate-200 font-semibold"
              >
                <option value="540p">Fast 540p</option>
                <option value="720p">Balanced 720p</option>
                <option value="1080p">High 1080p</option>
              </select>
            </div>
          </div>

          {/* Export & Reset Actions */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onExportData}
              className="flex-1 p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl font-extrabold flex items-center justify-center space-x-1.5 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-indigo-500" />
              <span>Export AI Data</span>
            </button>

            <button
              type="button"
              onClick={onClearData}
              className="flex-1 p-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/40 rounded-xl font-extrabold flex items-center justify-center space-x-1.5 transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              <span>Clear AI Data</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default AISettingsModal;
