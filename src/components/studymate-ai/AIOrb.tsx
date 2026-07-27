import React from "react";
import { motion } from "motion/react";
import { Brain } from "lucide-react";
import { AIOrbProps } from "./types";

// Apple Intelligence & Gemini Inspired Multi-Layered Liquid AI Orb
export function AIOrb({ isLoading, isTyping, isListening = false, size = "lg" }: AIOrbProps) {
  const isSm = size === "sm";
  const isMd = size === "md";

  const dimensionClasses = isSm 
    ? "w-10 h-10" 
    : isMd 
      ? "w-24 h-24" 
      : "w-44 h-44 md:w-56 md:h-56";

  const innerCoreSize = isSm 
    ? "w-7 h-7" 
    : isMd 
      ? "w-14 h-14" 
      : "w-28 h-28 md:w-32 md:h-32";

  const iconSize = isSm 
    ? "w-3.5 h-3.5" 
    : isMd 
      ? "w-6 h-6" 
      : "w-10 h-10 md:w-12 md:h-12";

  return (
    <div className={`relative flex items-center justify-center mx-auto transition-all duration-500 ${dimensionClasses}`}>
      {/* Outer ambient aura glow */}
      <div className={`absolute inset-0 rounded-full blur-3xl transition-all duration-1000 ${
        isListening
          ? "bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500 opacity-80 scale-130 animate-pulse"
          : isLoading 
            ? "bg-gradient-to-r from-rose-500 via-indigo-600 to-purple-600 opacity-80 scale-130 animate-pulse" 
            : isTyping 
              ? "bg-gradient-to-r from-cyan-400 to-indigo-500 opacity-60 scale-110" 
              : "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-40 hover:opacity-60"
      }`} />

      {/* Outer liquid wave ring */}
      <motion.div 
        animate={{ 
          rotate: [0, 360],
          scale: isLoading ? [1, 1.08, 0.95, 1.06, 1] : isListening ? [1, 1.12, 1] : isTyping ? [1, 1.03, 0.98, 1] : [1, 1.04, 1]
        }}
        transition={{ 
          rotate: { duration: isLoading ? 4 : isListening ? 3 : 20, ease: "linear", repeat: Infinity },
          scale: { duration: isLoading ? 1.2 : isListening ? 0.8 : isTyping ? 0.7 : 5, ease: "easeInOut", repeat: Infinity }
        }}
        className="absolute inset-1 rounded-full border border-white/30 dark:border-slate-800/70 bg-gradient-to-tr from-indigo-500/15 via-purple-500/10 to-pink-500/15 backdrop-blur-xl shadow-[inset_0_0_30px_rgba(255,255,255,0.25)] dark:shadow-[inset_0_0_30px_rgba(99,102,241,0.2)] flex items-center justify-center"
      >
        {/* Mid orbital ring */}
        <motion.div
          animate={{ rotate: [-360, 0] }}
          transition={{ duration: isLoading ? 6 : 28, ease: "linear", repeat: Infinity }}
          className="absolute inset-3 rounded-full border border-dashed border-indigo-400/40 dark:border-indigo-400/30"
        />

        {/* Counter-rotating accent halo */}
        <motion.div
          animate={{ rotate: [0, 360], scale: [0.95, 1.05, 0.95] }}
          transition={{ 
            rotate: { duration: 15, ease: "linear", repeat: Infinity },
            scale: { duration: 4, ease: "easeInOut", repeat: Infinity }
          }}
          className="absolute inset-6 rounded-full border border-purple-400/30 dark:border-purple-300/20"
        />

        {/* Core animated liquid morphing glass sphere */}
        <motion.div
          animate={{
            borderRadius: isLoading 
              ? ["42% 58% 70% 30% / 45% 45% 55% 55%", "70% 30% 52% 48% / 60% 40% 60% 40%", "42% 58% 70% 30% / 45% 45% 55% 55%"]
              : isListening
                ? ["55% 45% 40% 60% / 60% 35% 65% 40%", "40% 60% 65% 35% / 35% 65% 35% 65%", "55% 45% 40% 60% / 60% 35% 65% 40%"]
                : ["50% 50% 50% 50% / 50% 50% 50% 50%", "46% 54% 48% 52% / 53% 47% 53% 47%", "50% 50% 50% 50% / 50% 50% 50% 50%"]
          }}
          transition={{
            duration: isLoading ? 1.6 : isListening ? 1.2 : 6,
            ease: "easeInOut",
            repeat: Infinity
          }}
          className={`bg-gradient-to-br transition-all duration-500 shadow-2xl relative overflow-hidden flex items-center justify-center ${innerCoreSize} ${
            isListening
              ? "from-emerald-400 via-teal-500 to-cyan-600 shadow-emerald-500/40"
              : isLoading 
                ? "from-rose-500 via-indigo-600 to-purple-600 shadow-rose-500/40" 
                : isTyping 
                  ? "from-cyan-400 via-teal-500 to-indigo-600 shadow-cyan-400/30" 
                  : "from-indigo-600 via-purple-600 to-pink-500 shadow-indigo-500/30"
          }`}
        >
          {/* Glass glare highlight */}
          <div className="absolute top-1 left-2 w-16 h-8 bg-white/35 rounded-full blur-[2px] transform -rotate-12 pointer-events-none" />
          
          {/* Shimmer light sweep */}
          <div className="absolute inset-0 bg-gradient-to-t from-white/0 via-white/20 to-white/0 translate-y-[-100%] animate-[shimmer_2.2s_infinite]" />

          {/* Brain / Core Icon inside Orb */}
          <Brain className={`text-white drop-shadow-[0_2px_12px_rgba(255,255,255,0.6)] ${iconSize} ${
            isLoading ? "animate-bounce" : isListening ? "animate-pulse" : ""
          }`} />
        </motion.div>
      </motion.div>
      
      {/* Dynamic floating particles (only for medium & large sizes) */}
      {!isSm && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ 
                x: Math.random() * 120 - 60, 
                y: Math.random() * 120 - 60,
                opacity: 0.2 + Math.random() * 0.4,
                scale: 0.5 + Math.random() * 0.5
              }}
              animate={{
                y: [0, -16, 0],
                x: [0, Math.random() * 10 - 5, 0],
                opacity: [0.3, 0.8, 0.3],
              }}
              transition={{
                duration: 2 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 1.5
              }}
              className={`absolute w-2 h-2 rounded-full ${
                isListening ? "bg-emerald-300" : isLoading ? "bg-rose-400" : isTyping ? "bg-cyan-300" : "bg-purple-300"
              }`}
              style={{
                top: '50%',
                left: '50%',
                marginLeft: '-4px',
                marginTop: '-4px',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default AIOrb;
