import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, Mic, MicOff, Camera, Brain, CheckCircle2, 
  Loader2, Zap, Minimize2, Maximize2, X, ChevronDown, Volume2, ShieldCheck, Flame
} from "lucide-react";

export type AIStatusType = "idle" | "thinking" | "listening" | "scanning" | "generating" | "completed";

export interface DynamicIslandAIProps {
  status?: AIStatusType;
  statusMessage?: string;
  isListening?: boolean;
  isLoading?: boolean;
  isScanning?: boolean;
  isTyping?: boolean;
  activePrompt?: string;
  onToggleListen?: () => void;
  onToggleCamera?: () => void;
  onCancelRequest?: () => void;
  onMinimize?: () => void;
  isMinimized?: boolean;
  onExpand?: () => void;
  className?: string;
}

export const DynamicIslandAI: React.FC<DynamicIslandAIProps> = ({
  status = "idle",
  statusMessage,
  isListening = false,
  isLoading = false,
  isScanning = false,
  isTyping = false,
  activePrompt,
  onToggleListen,
  onToggleCamera,
  onCancelRequest,
  onMinimize,
  isMinimized = false,
  onExpand,
  className = "",
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [waveHeights, setWaveHeights] = useState<number[]>([40, 70, 30, 90, 50, 80, 40]);

  // Compute actual active status
  const currentStatus: AIStatusType = status !== "idle" 
    ? status 
    : isListening 
      ? "listening" 
      : isScanning 
        ? "scanning" 
        : isLoading 
          ? "thinking" 
          : isTyping 
            ? "generating" 
            : "idle";

  // Dynamic status metadata
  const getStatusMeta = () => {
    switch (currentStatus) {
      case "listening":
        return {
          label: "Listening...",
          sub: "Speak your homework query or equation",
          color: "text-emerald-400",
          glow: "from-emerald-500/30 via-teal-500/20 to-cyan-500/10",
          borderColor: "border-emerald-500/40",
          badgeBg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
          icon: <Mic className="w-4 h-4 text-emerald-400 animate-pulse" />,
          auraColor: "rgba(16, 185, 129, 0.4)",
        };
      case "scanning":
        return {
          label: "Scanning...",
          sub: "Reading textbook page & detecting OCR math text",
          color: "text-amber-400",
          glow: "from-amber-500/30 via-orange-500/20 to-yellow-500/10",
          borderColor: "border-amber-500/40",
          badgeBg: "bg-amber-500/20 text-amber-300 border-amber-500/30",
          icon: <Camera className="w-4 h-4 text-amber-400 animate-spin" style={{ animationDuration: "3s" }} />,
          auraColor: "rgba(245, 158, 11, 0.4)",
        };
      case "thinking":
        return {
          label: "Thinking...",
          sub: "Cognitive AI model parsing concept context",
          color: "text-indigo-400",
          glow: "from-indigo-500/30 via-purple-500/20 to-pink-500/10",
          borderColor: "border-indigo-500/40",
          badgeBg: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
          icon: <Brain className="w-4 h-4 text-indigo-400 animate-bounce" />,
          auraColor: "rgba(99, 102, 241, 0.45)",
        };
      case "generating":
        return {
          label: "Generating...",
          sub: "Synthesizing step-by-step academic solution",
          color: "text-purple-400",
          glow: "from-purple-500/30 via-fuchsia-500/20 to-indigo-500/10",
          borderColor: "border-purple-500/40",
          badgeBg: "bg-purple-500/20 text-purple-300 border-purple-500/30",
          icon: <Sparkles className="w-4 h-4 text-purple-400 animate-spin" style={{ animationDuration: "4s" }} />,
          auraColor: "rgba(168, 85, 247, 0.45)",
        };
      case "completed":
        return {
          label: "Completed",
          sub: "Academic explanation & solution generated",
          color: "text-teal-400",
          glow: "from-teal-500/30 via-emerald-500/20 to-indigo-500/10",
          borderColor: "border-teal-500/40",
          badgeBg: "bg-teal-500/20 text-teal-300 border-teal-500/30",
          icon: <CheckCircle2 className="w-4 h-4 text-teal-400" />,
          auraColor: "rgba(20, 184, 166, 0.4)",
        };
      default:
        return {
          label: "StudyMate AI Ready",
          sub: "Ask a question, scan notes or record voice",
          color: "text-indigo-300",
          glow: "from-indigo-600/20 via-purple-600/15 to-transparent",
          borderColor: "border-white/20 dark:border-white/10",
          badgeBg: "bg-indigo-500/15 text-indigo-300 border-indigo-500/20",
          icon: <Sparkles className="w-4 h-4 text-indigo-400" />,
          auraColor: "rgba(99, 102, 241, 0.25)",
        };
    }
  };

  const meta = getStatusMeta();

  // Voice waveform effect simulator
  useEffect(() => {
    if (isListening) {
      const interval = setInterval(() => {
        setWaveHeights(Array.from({ length: 7 }, () => Math.floor(Math.random() * 70) + 20));
      }, 150);
      return () => clearInterval(interval);
    }
  }, [isListening]);

  return (
    <div className={`relative flex flex-col items-center justify-center z-50 select-none ${className}`}>
      
      {/* Outer Shimmering Aurora Glow Halo */}
      <motion.div
        animate={{
          scale: currentStatus !== "idle" ? [1, 1.08, 1] : [1, 1.03, 1],
          opacity: currentStatus !== "idle" ? [0.6, 0.9, 0.6] : [0.3, 0.5, 0.3],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -inset-4 rounded-[40px] blur-2xl pointer-events-none transition-all duration-500"
        style={{
          background: `radial-gradient(circle, ${meta.auraColor} 0%, transparent 70%)`,
        }}
      />

      {/* Main VisionOS Dynamic Island Container */}
      <motion.div
        layout
        layoutId="visionos_dynamic_island_core"
        initial={{ scale: 0.9, opacity: 0, y: -10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: -10 }}
        transition={{
          type: "spring",
          stiffness: 380,
          damping: 28,
          mass: 0.8
        }}
        onClick={() => {
          if (!isExpanded) setIsExpanded(true);
        }}
        className={`relative overflow-hidden rounded-[30px] border ${meta.borderColor} bg-slate-950/85 dark:bg-slate-950/90 text-white shadow-[0_20px_60px_rgba(0,0,0,0.6)] backdrop-blur-3xl transition-all duration-300 cursor-pointer ${
          isExpanded ? "w-full max-w-lg p-5" : "px-4 py-2.5 flex items-center justify-between gap-3 max-w-md"
        }`}
      >
        {/* Specular Liquid Glass Top Reflection */}
        <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 via-white/5 to-transparent rounded-t-[30px] pointer-events-none" />

        {/* Shimmering Animated Aurora Waveform Background */}
        <div className={`absolute inset-0 bg-gradient-to-r ${meta.glow} opacity-60 pointer-events-none transition-all duration-500`} />

        {/* COMPACT MODE (Standard Floating Capsule) */}
        {!isExpanded && (
          <div className="relative z-10 w-full flex items-center justify-between gap-3">
            
            {/* Left: Dynamic Icon + Status Indicator */}
            <div className="flex items-center gap-2.5 min-w-0">
              <motion.div
                animate={currentStatus !== "idle" ? { scale: [1, 1.15, 1] } : {}}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="relative p-2 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0 shadow-inner"
              >
                {meta.icon}
                {currentStatus !== "idle" && (
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
                  </span>
                )}
              </motion.div>

              <div className="flex flex-col text-left min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={`text-xs font-black tracking-tight ${meta.color}`}>
                    {statusMessage || meta.label}
                  </span>
                  {currentStatus === "listening" && (
                    <div className="flex items-center gap-0.5 h-3">
                      {waveHeights.slice(0, 4).map((h, i) => (
                        <div
                          key={i}
                          className="w-0.5 bg-emerald-400 rounded-full transition-all duration-150"
                          style={{ height: `${h}%` }}
                        />
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-slate-300/80 font-medium truncate max-w-[180px] sm:max-w-[240px]">
                  {activePrompt || meta.sub}
                </p>
              </div>
            </div>

            {/* Right: Quick Interactive Controls */}
            <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
              {/* Mic toggle */}
              {onToggleListen && (
                <button
                  type="button"
                  onClick={onToggleListen}
                  className={`p-2 rounded-xl transition cursor-pointer ${
                    isListening 
                      ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30" 
                      : "bg-white/10 hover:bg-white/20 text-slate-300"
                  }`}
                  title={isListening ? "Stop Voice Input" : "Voice Input"}
                >
                  {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                </button>
              )}

              {/* Camera scanner toggle */}
              {onToggleCamera && (
                <button
                  type="button"
                  onClick={onToggleCamera}
                  className="p-2 bg-white/10 hover:bg-white/20 text-slate-300 rounded-xl transition cursor-pointer"
                  title="Scan Textbook Question"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Cancel Request if loading */}
              {isLoading && onCancelRequest && (
                <button
                  type="button"
                  onClick={onCancelRequest}
                  className="p-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded-xl transition cursor-pointer"
                  title="Cancel Request"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Expand Controls */}
              <button
                type="button"
                onClick={() => setIsExpanded(true)}
                className="p-2 bg-white/10 hover:bg-white/20 text-slate-300 rounded-xl transition cursor-pointer"
                title="Expand Dynamic Island Controls"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>
        )}

        {/* EXPANDED SPATIAL CONTROL PANEL */}
        {isExpanded && (
          <div className="relative z-10 space-y-4 text-left">
            
            {/* Header: Title + Collapse Button */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className={`p-2.5 rounded-2xl border shadow-inner ${meta.badgeBg}`}>
                  {meta.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-black text-sm text-white tracking-tight">VisionOS Dynamic Island</h4>
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      LIVE AI HUD
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-medium">{meta.sub}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(false);
                }}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 transition cursor-pointer"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
            </div>

            {/* Active Status Live Meter */}
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Current Cognitive Mode</span>
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${meta.badgeBg}`}>
                  {meta.label}
                </span>
              </div>

              {/* Status Audio Visualizer Wave / Progress Line */}
              {isListening ? (
                <div className="flex items-center justify-center gap-1 py-2">
                  {waveHeights.map((h, i) => (
                    <motion.div
                      key={i}
                      className="w-1.5 bg-gradient-to-t from-emerald-500 to-teal-300 rounded-full"
                      style={{ height: `${Math.max(12, h)}px` }}
                      transition={{ type: "spring", stiffness: 300, damping: 15 }}
                    />
                  ))}
                </div>
              ) : isLoading ? (
                <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden relative">
                  <motion.div
                    animate={{ x: ["-100%", "100%"] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                    className="w-1/2 h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full"
                  />
                </div>
              ) : (
                <p className="text-xs font-mono text-slate-300 bg-slate-900/80 p-2.5 rounded-xl border border-white/10 truncate">
                  {activePrompt ? `Prompt: "${activePrompt}"` : "Ready to assist with homework, OCR questions & concept reviews."}
                </p>
              )}
            </div>

            {/* Spatial Control Action Grid */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              {onToggleListen && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleListen();
                  }}
                  className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                    isListening 
                      ? "bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-600/30" 
                      : "bg-white/10 hover:bg-white/20 text-white border-white/15"
                  }`}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-emerald-400" />}
                  <span>{isListening ? "Stop Listening" : "Voice Input"}</span>
                </button>
              )}

              {onToggleCamera && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleCamera();
                  }}
                  className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Camera className="w-4 h-4 text-amber-400" />
                  <span>OCR Camera</span>
                </button>
              )}
            </div>

            {/* Footer Status Indicators */}
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium pt-1 px-1">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" /> Grounded by Gemini API
              </span>
              <span className="font-mono text-slate-500">VisionOS Glass HUD</span>
            </div>

          </div>
        )}

      </motion.div>
    </div>
  );
};

export default DynamicIslandAI;
