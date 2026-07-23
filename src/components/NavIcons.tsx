import React from "react";
import { motion } from "motion/react";
import { Brain } from "lucide-react";

export interface NavIconProps {
  isActive?: boolean;
  className?: string;
  size?: number;
}

// 1. HOME: Premium Modern House Icon with Soft Rounded Geometry
export const FlagshipHomeIcon: React.FC<NavIconProps> = ({ isActive = false, className = "", size = 20 }) => {
  return (
    <motion.div
      className={`relative inline-flex items-center justify-center ${className}`}
      animate={{ scale: isActive ? 1.1 : 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="overflow-visible"
      >
        <defs>
          <linearGradient id="homeGradient" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
            <stop stopColor="#9333EA" />
            <stop offset="0.5" stopColor="#6366F1" />
            <stop offset="1" stopColor="#3B82F6" />
          </linearGradient>
          <filter id="homeGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Outer subtle glow ring when active */}
        {isActive && (
          <motion.path
            d="M12 2.5L20.5 9.5C21.1 10 21.5 10.75 21.5 11.55V19C21.5 20.38 20.38 21.5 19 21.5H15C14.17 21.5 13.5 20.83 13.5 20V16C13.5 15.17 12.83 14.5 12 14.5C11.17 14.5 10.5 15.17 10.5 16V20C10.5 20.83 9.83 21.5 9 21.5H5C3.62 21.5 2.5 20.38 2.5 19V11.55C2.5 10.75 2.9 10 3.5 9.5L12 2.5Z"
            fill="url(#homeGradient)"
            opacity={0.35}
            filter="url(#homeGlow)"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1.15, opacity: 0.4 }}
            transition={{ duration: 1.5, repeat: Infinity, repeatType: "reverse" }}
          />
        )}

        {/* Main Body */}
        <path
          d="M12 3L20 9.6C20.6 10.1 21 10.8 21 11.6V19C21 20.1 20.1 21 19 21H15C14.4 21 14 20.6 14 20V16C14 14.9 13.1 14 12 14C10.9 14 10 14.9 10 16V20C10 20.6 9.6 21 9 21H5C3.9 21 3 20.1 3 19V11.6C3 10.8 3.4 10.1 4 9.6L12 3Z"
          fill={isActive ? "url(#homeGradient)" : "none"}
          stroke={isActive ? "url(#homeGradient)" : "currentColor"}
          strokeWidth={isActive ? 1.5 : 1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </motion.div>
  );
};

// 2. GAMES: Modern Game Controller Icon with Rounded Buttons and Balanced Proportions
export const FlagshipGamesIcon: React.FC<NavIconProps> = ({ isActive = false, className = "", size = 20 }) => {
  return (
    <motion.div
      className={`relative inline-flex items-center justify-center ${className}`}
      animate={{ scale: isActive ? 1.1 : 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="overflow-visible"
      >
        <defs>
          <linearGradient id="gamesGradient" x1="2" y1="4" x2="22" y2="20" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F59E0B" />
            <stop offset="0.5" stopColor="#F97316" />
            <stop offset="1" stopColor="#EF4444" />
          </linearGradient>
        </defs>

        {/* Controller Outer Body */}
        <path
          d="M6 18.5C4 18.5 2 16.5 2 13.5V10.5C2 7.5 4.5 5.5 7.5 5.5H16.5C19.5 5.5 22 7.5 22 10.5V13.5C22 16.5 20 18.5 18 18.5C16.8 18.5 15.8 17.6 15.4 16.5L14.7 14.8C14.3 13.7 13.2 13 12 13C10.8 13 9.7 13.7 9.3 14.8L8.6 16.5C8.2 17.6 7.2 18.5 6 18.5Z"
          fill={isActive ? "url(#gamesGradient)" : "none"}
          stroke={isActive ? "url(#gamesGradient)" : "currentColor"}
          strokeWidth={isActive ? 1.5 : 1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Left D-pad cross */}
        <path
          d="M6.5 8.5V11.5M5 10H8"
          stroke={isActive ? "#FFFFFF" : "currentColor"}
          strokeWidth="1.8"
          strokeLinecap="round"
        />

        {/* Right Rounded Action Buttons */}
        <circle cx="16" cy="9" r="1" fill={isActive ? "#FFFFFF" : "currentColor"} />
        <circle cx="18" cy="11" r="1" fill={isActive ? "#FFFFFF" : "currentColor"} />
      </svg>
    </motion.div>
  );
};

// 3. AI ASSISTANT: Exact Branded StudyMate Brain Logo Component (Rotatable AI Symbol)
export const StudyMateBrainLogo: React.FC<NavIconProps> = ({
  isActive = false,
  className = "",
  size = 28
}) => {
  // Proportional icon sizing for crisp rendering at 24px, 28px, 32px
  const brainIconSize = Math.max(12, Math.round(size * 0.58));

  return (
    <motion.div
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${className}`}
      animate={{
        scale: isActive ? 1.08 : 1,
        opacity: isActive ? 1 : 0.85
      }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      style={{ width: size, height: size }}
    >
      {/* Active state: Soft purple outer glow */}
      {isActive && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 0.65, scale: 1.18 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-violet-600 blur-md pointer-events-none"
        />
      )}

      {/* Main Glassmorphic Container / Shield Badge Logo */}
      <div
        className={`relative w-full h-full rounded-xl sm:rounded-2xl flex items-center justify-center overflow-hidden transition-all duration-300 ${
          isActive
            ? "bg-gradient-to-br from-indigo-500 via-purple-600 to-violet-600 text-white shadow-[0_4px_18px_rgba(147,51,234,0.5)] border border-white/40 dark:border-white/30"
            : "bg-slate-200/80 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border border-slate-300/50 dark:border-slate-700/50 shadow-none"
        }`}
      >
        {/* Subtle glass top highlight reflection */}
        {isActive && (
          <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/35 to-transparent rounded-t-xl pointer-events-none" />
        )}

        {/* Crisp Rotatable AI Brain Symbol - Rotates continuously all the time */}
        <motion.div
          animate={{
            rotate: [0, 360]
          }}
          transition={{
            duration: isActive ? 6 : 10,
            repeat: Infinity,
            ease: "linear"
          }}
          className="relative z-10 flex items-center justify-center pointer-events-none"
        >
          <Brain
            size={brainIconSize}
            className={`transition-all duration-300 ${
              isActive
                ? "text-white drop-shadow-[0_2px_8px_rgba(255,255,255,0.65)]"
                : "text-slate-500 dark:text-slate-400"
            }`}
            strokeWidth={isActive ? 2.2 : 2.0}
          />
        </motion.div>
      </div>
    </motion.div>
  );
};

export const FlagshipAiIcon: React.FC<NavIconProps> = ({ isActive = false, className = "", size = 28 }) => {
  return <StudyMateBrainLogo isActive={isActive} className={className} size={size} />;
};

// 4. GLOBAL CHAT: Premium Dual Chat Bubble Icon with Smooth Rounded Corners and Perfect Symmetry
export const FlagshipChatIcon: React.FC<NavIconProps> = ({ isActive = false, className = "", size = 20 }) => {
  return (
    <motion.div
      className={`relative inline-flex items-center justify-center ${className}`}
      animate={{ scale: isActive ? 1.1 : 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="overflow-visible"
      >
        <defs>
          <linearGradient id="chatGradient" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
            <stop stopColor="#10B981" />
            <stop offset="0.6" stopColor="#059669" />
            <stop offset="1" stopColor="#047857" />
          </linearGradient>
        </defs>

        {/* Primary Main Chat Bubble */}
        <path
          d="M14 17H8L4.5 19.5C3.8 20 3 19.5 3 18.6V15C2.4 13.9 2 12.5 2 11C2 6.6 6.5 3 12 3C17.5 3 22 6.6 22 11C22 15.4 17.5 19 12 19C11.3 19 10.6 18.9 10 18.7"
          fill={isActive ? "url(#chatGradient)" : "none"}
          stroke={isActive ? "url(#chatGradient)" : "currentColor"}
          strokeWidth={isActive ? 1.5 : 1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Inner Chat Indicator Dots */}
        <circle cx="8" cy="11" r="1.2" fill={isActive ? "#FFFFFF" : "currentColor"} />
        <circle cx="12" cy="11" r="1.2" fill={isActive ? "#FFFFFF" : "currentColor"} />
        <circle cx="16" cy="11" r="1.2" fill={isActive ? "#FFFFFF" : "currentColor"} />
      </svg>
    </motion.div>
  );
};

// 5. PROFILE: Premium Rounded User Avatar Icon with Elegant Proportions and Clean Curves
export const FlagshipProfileIcon: React.FC<NavIconProps> = ({ isActive = false, className = "", size = 20 }) => {
  return (
    <motion.div
      className={`relative inline-flex items-center justify-center ${className}`}
      animate={{ scale: isActive ? 1.1 : 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="overflow-visible"
      >
        <defs>
          <linearGradient id="profileGradient" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
            <stop stopColor="#EC4899" />
            <stop offset="0.6" stopColor="#D946EF" />
            <stop offset="1" stopColor="#8B5CF6" />
          </linearGradient>
        </defs>

        {/* Outer Capsule Frame */}
        <circle
          cx="12"
          cy="12"
          r="9.5"
          fill={isActive ? "url(#profileGradient)" : "none"}
          stroke={isActive ? "url(#profileGradient)" : "currentColor"}
          strokeWidth={isActive ? 1.5 : 1.8}
        />

        {/* Avatar Head */}
        <circle
          cx="12"
          cy="9.5"
          r="3"
          fill={isActive ? "#FFFFFF" : "none"}
          stroke={isActive ? "#FFFFFF" : "currentColor"}
          strokeWidth="1.6"
        />

        {/* Avatar Body/Shoulders Arc */}
        <path
          d="M6.8 17.5C7.8 15.5 9.8 14.2 12 14.2C14.2 14.2 16.2 15.5 17.2 17.5"
          stroke={isActive ? "#FFFFFF" : "currentColor"}
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    </motion.div>
  );
};
