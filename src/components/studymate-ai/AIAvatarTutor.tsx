import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Sparkles, Mic, Volume2, Globe, Eye, Zap } from "lucide-react";
import { AvatarState } from "./types";

interface AIAvatarTutorProps {
  state?: AvatarState;
  selectedLanguage?: string;
  onLanguageChange?: (lang: string) => void;
  compact?: boolean;
}

export function AIAvatarTutor({
  state = "idle",
  selectedLanguage = "English",
  onLanguageChange,
  compact = false
}: AIAvatarTutorProps) {
  const [mouthOpen, setMouthOpen] = useState(false);
  const [blink, setBlink] = useState(false);
  const [headTilt, setHeadTilt] = useState(0);

  // Animated lip sync effect when explaining
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (state === "explaining") {
      interval = setInterval(() => {
        setMouthOpen((prev) => !prev);
      }, 180);
    } else {
      setMouthOpen(false);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [state]);

  // Random eye blink and subtle head tilt
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 200);
    }, 3500);

    const tiltInterval = setInterval(() => {
      setHeadTilt(Math.sin(Date.now() / 1000) * 4);
    }, 1000);

    return () => {
      clearInterval(blinkInterval);
      clearInterval(tiltInterval);
    };
  }, []);

  const languages = ["English", "Hindi", "Spanish", "French", "German"];

  return (
    <div className={`relative flex flex-col items-center justify-center p-4 bg-gradient-to-b from-indigo-900/40 via-slate-900 to-slate-950 border border-indigo-500/30 rounded-3xl overflow-hidden shadow-xl ${compact ? "w-full max-w-xs" : "w-full max-w-sm"}`}>
      {/* Background ambient lighting */}
      <div className={`absolute inset-0 bg-gradient-to-tr from-indigo-600/10 via-purple-600/10 to-pink-600/10 blur-xl pointer-events-none ${state === "explaining" ? "animate-pulse" : ""}`} />

      {/* Top Status & Language Bar */}
      <div className="w-full flex items-center justify-between z-10 mb-3 text-xs">
        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/80 text-slate-200 font-extrabold text-[10px] uppercase">
          <span className={`w-2 h-2 rounded-full ${state === "explaining" ? "bg-purple-400 animate-ping" : state === "listening" ? "bg-emerald-400 animate-pulse" : "bg-indigo-400"}`} />
          <span>{state}</span>
        </div>

        {onLanguageChange && (
          <div className="flex items-center space-x-1">
            <Globe className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <select
              value={selectedLanguage}
              onChange={(e) => onLanguageChange(e.target.value)}
              className="bg-slate-800 text-slate-200 border border-slate-700 text-[11px] font-bold rounded-lg px-2 py-0.5 focus:outline-none cursor-pointer"
            >
              {languages.map((lang) => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Avatar Head & Features Canvas */}
      <div className="relative w-36 h-36 flex items-center justify-center my-2">
        {/* Glow Halo */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
          className="absolute inset-0 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 opacity-30 blur-md"
        />

        {/* Head Shell */}
        <motion.div
          style={{ rotate: headTilt }}
          className="relative w-32 h-32 rounded-full bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 border-2 border-indigo-400/50 shadow-2xl flex flex-col items-center justify-center overflow-hidden"
        >
          {/* Holographic forehead mark */}
          <div className="absolute top-4 p-1 rounded-full bg-indigo-500/20 text-indigo-300">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          </div>

          {/* Eyes Container */}
          <div className="flex items-center space-x-7 mt-3">
            {/* Left Eye */}
            <div className="relative w-5 h-5 rounded-full bg-indigo-950 border border-indigo-400 flex items-center justify-center overflow-hidden shadow-inner">
              {!blink ? (
                <div className={`w-2.5 h-2.5 rounded-full bg-indigo-300 shadow-[0_0_8px_#818cf8] transition-all ${state === "listening" ? "scale-125 bg-emerald-300 shadow-[0_0_8px_#34d399]" : ""}`} />
              ) : (
                <div className="w-full h-0.5 bg-indigo-400" />
              )}
            </div>

            {/* Right Eye */}
            <div className="relative w-5 h-5 rounded-full bg-indigo-950 border border-indigo-400 flex items-center justify-center overflow-hidden shadow-inner">
              {!blink ? (
                <div className={`w-2.5 h-2.5 rounded-full bg-indigo-300 shadow-[0_0_8px_#818cf8] transition-all ${state === "listening" ? "scale-125 bg-emerald-300 shadow-[0_0_8px_#34d399]" : ""}`} />
              ) : (
                <div className="w-full h-0.5 bg-indigo-400" />
              )}
            </div>
          </div>

          {/* Animated Mouth (Lip-sync simulation) */}
          <div className="mt-5 flex items-center justify-center">
            {state === "explaining" ? (
              <motion.div
                animate={{ height: mouthOpen ? 12 : 4, width: mouthOpen ? 18 : 14 }}
                className="bg-gradient-to-r from-pink-400 to-purple-400 rounded-full shadow-[0_0_10px_#ec4899]"
              />
            ) : state === "listening" ? (
              <div className="w-3 h-1 bg-emerald-400 rounded-full animate-pulse" />
            ) : (
              <div className="w-4 h-0.5 bg-indigo-300/80 rounded-full" />
            )}
          </div>
        </motion.div>
      </div>

      {/* Dynamic Caption / Gesture Label */}
      <div className="mt-2 text-center text-xs font-extrabold text-indigo-200 flex items-center space-x-1.5">
        {state === "explaining" && <Volume2 className="w-3.5 h-3.5 text-purple-400 animate-bounce" />}
        {state === "listening" && <Mic className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />}
        {state === "idle" && <Zap className="w-3.5 h-3.5 text-indigo-400" />}
        <span>
          {state === "explaining"
            ? `Speaking in ${selectedLanguage}...`
            : state === "listening"
            ? "Listening live..."
            : "AI Tutor Ready"}
        </span>
      </div>
    </div>
  );
}
