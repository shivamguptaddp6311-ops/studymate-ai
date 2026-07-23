import React, { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence, HTMLMotionProps } from "motion/react";
import { Loader2, Check, ArrowUpRight, Sparkles, AlertCircle, ChevronRight, Search, X, ChevronDown } from "lucide-react";

/* ==========================================================================
   FLAGSHIP DESIGN SYSTEM TOKEN CONSTANTS (Apple HIG + VisionOS + Material 3)
   Radius: Cards 28px | Buttons 22px | Dialogs 32px | Bottom Sheets 36px | Inputs 18px
   ========================================================================== */

export const DESIGN_TOKENS = {
  radius: {
    card: "rounded-[28px]",
    button: "rounded-[22px]",
    dialog: "rounded-[32px]",
    bottomSheet: "rounded-t-[36px]",
    input: "rounded-[18px]",
    badge: "rounded-[14px]",
  },
  glass: {
    surface: "bg-white/70 dark:bg-[#0d1527]/75 backdrop-blur-xl border border-white/30 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] relative overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/40 dark:before:via-white/15 before:to-transparent pointer-events-auto",
    surfaceElevated: "bg-white/85 dark:bg-[#111a30]/85 backdrop-blur-2xl border border-white/50 dark:border-white/15 shadow-[0_16px_48px_rgba(0,0,0,0.18)] dark:shadow-[0_16px_48px_rgba(0,0,0,0.6)] relative overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/60 dark:before:via-white/20 before:to-transparent pointer-events-auto",
    aiSurface: "bg-gradient-to-br from-purple-950/50 via-[#0d1527]/80 to-indigo-950/50 backdrop-blur-2xl border border-purple-500/30 dark:border-purple-400/25 shadow-[0_12px_40px_rgba(147,51,234,0.2)] relative overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-purple-500/0 before:via-purple-400/60 before:to-purple-500/0 pointer-events-auto",
  }
};

// ==========================================
// 1. PREMIUM BUTTON (22px Radius)
// ==========================================
interface PremiumButtonProps extends Omit<HTMLMotionProps<"button">, "variant" | "size"> {
  variant?: "primary" | "secondary" | "accent" | "success" | "danger" | "ghost" | "gradient" | "amber" | "ai";
  isLoading?: boolean;
  isSuccess?: boolean;
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
}

export const PremiumButton = React.forwardRef<HTMLButtonElement, PremiumButtonProps>(
  (
    {
      variant = "primary",
      isLoading = false,
      isSuccess = false,
      size = "md",
      fullWidth = false,
      className = "",
      disabled,
      onClick,
      children,
      type = "button",
      ...props
    },
    ref
  ) => {
    const [ripples, setRipples] = useState<{ id: number; x: number; y: number; size: number }[]>([]);
    const nextRippleId = useRef(0);

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled || isLoading || isSuccess) return;

      const button = e.currentTarget;
      const rect = button.getBoundingClientRect();
      const rippleSize = Math.max(rect.width, rect.height) * 2;
      const x = e.clientX - rect.left - rippleSize / 2;
      const y = e.clientY - rect.top - rippleSize / 2;

      setRipples((prev) => [...prev, { id: nextRippleId.current++, x, y, size: rippleSize }]);
      if (onClick) onClick(e as any);
    };

    const variants = {
      primary: "bg-gradient-to-r from-purple-600 via-indigo-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white shadow-lg shadow-purple-600/25 active:shadow-sm border border-white/20",
      secondary: "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 active:shadow-sm border border-white/20",
      accent: "bg-orange-500 hover:bg-orange-400 text-white shadow-lg shadow-orange-500/20 active:shadow-sm border border-white/20",
      success: "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 border border-white/20",
      danger: "bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/20 border border-white/20",
      ghost: "bg-white/10 dark:bg-white/5 hover:bg-white/20 dark:hover:bg-white/10 text-slate-800 dark:text-slate-100 border border-white/10 backdrop-blur-md",
      gradient: "bg-gradient-to-r from-purple-600 via-indigo-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white shadow-lg shadow-purple-500/25 border border-white/20",
      amber: "bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 border border-amber-300/30 font-bold",
      ai: "bg-gradient-to-r from-purple-600 via-indigo-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white shadow-xl shadow-purple-500/30 border border-white/25 relative overflow-hidden",
    };

    const sizes = {
      sm: "px-3.5 py-1.5 text-xs gap-1.5 font-medium",
      md: "px-5 py-2.5 text-xs font-bold gap-2 tracking-wide",
      lg: "px-6 py-3.5 text-sm font-bold gap-2.5 tracking-wide",
    };

    const isBtnDisabled = disabled || isLoading || isSuccess;

    return (
      <motion.button
        ref={ref}
        type={type}
        disabled={isBtnDisabled}
        whileHover={isBtnDisabled ? {} : { scale: 1.02, y: -1 }}
        whileTap={isBtnDisabled ? {} : { scale: 0.97, y: 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 25 }}
        onClick={handleClick}
        className={`
          relative overflow-hidden inline-flex items-center justify-center font-sans transition-all duration-200 outline-none select-none cursor-pointer
          ${DESIGN_TOKENS.radius.button}
          ${variants[variant]}
          ${sizes[size]}
          ${fullWidth ? "w-full" : ""}
          ${isBtnDisabled ? "opacity-50 cursor-not-allowed scale-100" : ""}
          ${className}
        `}
        {...props}
      >
        {/* Ripples */}
        {ripples.map((ripple) => (
          <motion.span
            key={ripple.id}
            className="absolute rounded-full bg-white/30 pointer-events-none"
            style={{ left: ripple.x, top: ripple.y, width: ripple.size, height: ripple.size }}
            initial={{ scale: 0, opacity: 0.5 }}
            animate={{ scale: 1, opacity: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            onAnimationComplete={() => setRipples((prev) => prev.filter((r) => r.id !== ripple.id))}
          />
        ))}

        {/* Content */}
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.span
              key="loading"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="flex items-center justify-center"
            >
              <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
              <span>Processing...</span>
            </motion.span>
          ) : isSuccess ? (
            <motion.span
              key="success"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              className="flex items-center justify-center text-emerald-100"
            >
              <Check className="w-4 h-4 mr-1.5 stroke-[3px]" />
              <span>Done</span>
            </motion.span>
          ) : (
            <motion.span
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center gap-1.5"
            >
              {children}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    );
  }
);
PremiumButton.displayName = "PremiumButton";

// Alias for backwards compatibility
export const GlassButton = PremiumButton;

// ==========================================
// 2. GLASS CARD / PREMIUM CARD (28px Radius)
// ==========================================
interface GlassCardProps extends Omit<HTMLMotionProps<"div">, "variant"> {
  variant?: "default" | "elevated" | "indigo" | "rose" | "amber" | "emerald" | "slate" | "ai";
  hoverEffect?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  variant = "default",
  hoverEffect = true,
  className = "",
  ...props
}) => {
  const variants = {
    default: DESIGN_TOKENS.glass.surface,
    elevated: DESIGN_TOKENS.glass.surfaceElevated,
    indigo: "bg-gradient-to-br from-indigo-500/10 via-indigo-600/5 to-purple-600/10 backdrop-blur-xl border border-indigo-500/20 dark:border-indigo-500/30 shadow-[0_8px_32px_rgba(99,102,241,0.08)] relative overflow-hidden",
    rose: "bg-gradient-to-br from-rose-500/10 via-rose-600/5 to-orange-600/10 backdrop-blur-xl border border-rose-500/20 dark:border-rose-500/30 shadow-[0_8px_32px_rgba(244,63,94,0.08)] relative overflow-hidden",
    amber: "bg-gradient-to-br from-amber-500/10 via-amber-600/5 to-yellow-600/10 backdrop-blur-xl border border-amber-500/20 dark:border-amber-500/30 shadow-[0_8px_32px_rgba(245,158,11,0.08)] relative overflow-hidden",
    emerald: "bg-gradient-to-br from-emerald-500/10 via-emerald-600/5 to-teal-600/10 backdrop-blur-xl border border-emerald-500/20 dark:border-emerald-500/30 shadow-[0_8px_32px_rgba(16,185,129,0.08)] relative overflow-hidden",
    slate: "bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-xl border border-slate-200/60 dark:border-slate-700/60 shadow-md relative overflow-hidden",
    ai: DESIGN_TOKENS.glass.aiSurface,
  };

  return (
    <motion.div
      whileHover={hoverEffect ? { y: -3, scale: 1.005 } : {}}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={`
        ${DESIGN_TOKENS.radius.card}
        p-6 transition-all duration-200
        ${variants[variant]}
        ${className}
      `}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export const PremiumCard = GlassCard;

// ==========================================
// 3. HERO CARD (28px Radius)
// ==========================================
interface HeroCardProps {
  badge?: string;
  badgeIcon?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  illustration?: React.ReactNode;
  className?: string;
  gradientVariant?: "indigo" | "emerald" | "amber" | "purple" | "cyan";
}

export const HeroCard: React.FC<HeroCardProps> = ({
  badge,
  badgeIcon,
  title,
  subtitle,
  actions,
  illustration,
  className = "",
  gradientVariant = "indigo",
}) => {
  const gradients = {
    indigo: "from-indigo-600/90 via-purple-600/80 to-pink-600/80 border-indigo-400/30",
    emerald: "from-emerald-600/90 via-teal-600/80 to-cyan-600/80 border-emerald-400/30",
    amber: "from-amber-600/90 via-orange-600/80 to-red-600/80 border-amber-400/30",
    purple: "from-purple-600/90 via-fuchsia-600/80 to-pink-600/80 border-purple-400/30",
    cyan: "from-cyan-600/90 via-blue-600/80 to-indigo-600/80 border-cyan-400/30",
  };

  return (
    <div
      className={`
        relative overflow-hidden ${DESIGN_TOKENS.radius.card} p-8 text-white
        bg-gradient-to-br ${gradients[gradientVariant]}
        shadow-[0_20px_50px_rgba(79,70,229,0.25)] border backdrop-blur-2xl
        before:absolute before:inset-0 before:bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.25),transparent_60%)]
        ${className}
      `}
    >
      {/* Background ambient lighting */}
      <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-4 max-w-xl">
          {badge && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 dark:bg-black/20 backdrop-blur-md typo-label-sm border border-white/30 text-white shadow-sm">
              {badgeIcon || <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" style={{ animationDuration: "4s" }} />}
              <span>{badge}</span>
            </div>
          )}

          <div className="typo-large-title text-white drop-shadow-sm">
            {title}
          </div>

          {subtitle && (
            <p className="typo-subtitle text-white/90 leading-relaxed max-w-lg">
              {subtitle}
            </p>
          )}

          {actions && <div className="pt-2 flex flex-wrap items-center gap-3">{actions}</div>}
        </div>

        {illustration && (
          <div className="shrink-0 flex items-center justify-center md:justify-end">
            {illustration}
          </div>
        )}
      </div>
    </div>
  );
};

// ==========================================
// 4. QUICK ACTION CARD (28px Radius)
// ==========================================
interface QuickActionCardProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  onClick: () => void;
  badge?: string;
  variant?: "indigo" | "amber" | "emerald" | "rose" | "cyan" | "slate";
  className?: string;
}

export const QuickActionCard: React.FC<QuickActionCardProps> = ({
  icon,
  title,
  description,
  onClick,
  badge,
  variant = "indigo",
  className = "",
}) => {
  return (
    <GlassCard
      onClick={onClick}
      hoverEffect={true}
      className={`cursor-pointer group hover:border-indigo-500/50 transition-all p-5 flex flex-col justify-between ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <PremiumIcon variant={variant} size="lg">
          {icon}
        </PremiumIcon>
        {badge && (
          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
            {badge}
          </span>
        )}
      </div>

      <div className="mt-4 space-y-1">
        <div className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors flex items-center justify-between">
          <span>{title}</span>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
        </div>
        {description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
            {description}
          </p>
        )}
      </div>
    </GlassCard>
  );
};

// ==========================================
// 5. PROGRESS CARD (28px Radius)
// ==========================================
interface ProgressCardProps {
  title: string;
  subtitle?: string;
  progress: number; // 0 - 100
  targetText?: string;
  colorVariant?: "indigo" | "emerald" | "amber" | "rose" | "purple";
  icon?: React.ReactNode;
  className?: string;
}

export const ProgressCard: React.FC<ProgressCardProps> = ({
  title,
  subtitle,
  progress,
  targetText,
  colorVariant = "indigo",
  icon,
  className = "",
}) => {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  const colors = {
    indigo: "from-indigo-600 to-violet-600 bg-indigo-500 text-indigo-600 dark:text-indigo-400",
    emerald: "from-emerald-600 to-teal-600 bg-emerald-500 text-emerald-600 dark:text-emerald-400",
    amber: "from-amber-500 to-orange-500 bg-amber-500 text-amber-600 dark:text-amber-400",
    rose: "from-rose-600 to-pink-600 bg-rose-500 text-rose-600 dark:text-rose-400",
    purple: "from-purple-600 to-fuchsia-600 bg-purple-500 text-purple-600 dark:text-purple-400",
  };

  return (
    <GlassCard className={`p-6 space-y-4 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {icon && <PremiumIcon variant={colorVariant} size="md">{icon}</PremiumIcon>}
          <div>
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">{title}</h4>
            {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
          </div>
        </div>
        <span className={`text-base font-extrabold font-display ${colors[colorVariant].split(" ").slice(-2).join(" ")}`}>
          {Math.round(clampedProgress)}%
        </span>
      </div>

      <div className="space-y-1.5">
        <div className="h-3 w-full rounded-full bg-slate-200/60 dark:bg-slate-800/80 overflow-hidden p-0.5 border border-slate-200/40 dark:border-slate-700/40">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${clampedProgress}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className={`h-full rounded-full bg-gradient-to-r ${colors[colorVariant].split(" ").slice(0, 2).join(" ")} shadow-sm`}
          />
        </div>
        {targetText && (
          <div className="flex justify-end text-[11px] font-medium text-slate-500 dark:text-slate-400">
            {targetText}
          </div>
        )}
      </div>
    </GlassCard>
  );
};

// ==========================================
// 6. ANALYTICS CARD (28px Radius)
// ==========================================
interface AnalyticsCardProps {
  title: string;
  metric: string | number;
  subtext?: string;
  trend?: { value: string; isPositive: boolean };
  icon: React.ReactNode;
  chart?: React.ReactNode;
  iconVariant?: "indigo" | "rose" | "amber" | "emerald" | "sky";
  className?: string;
}

export const AnalyticsCard: React.FC<AnalyticsCardProps> = ({
  title,
  metric,
  subtext,
  trend,
  icon,
  chart,
  iconVariant = "indigo",
  className = "",
}) => {
  return (
    <GlassCard className={`p-6 flex flex-col justify-between space-y-4 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {title}
          </span>
          <div className="text-2xl md:text-3xl font-extrabold font-display text-slate-900 dark:text-white tracking-tight">
            {metric}
          </div>
        </div>
        <PremiumIcon variant={iconVariant} size="md">
          {icon}
        </PremiumIcon>
      </div>

      {chart && <div className="pt-2">{chart}</div>}

      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/40 dark:border-slate-800/50">
        {subtext && <span className="text-slate-500 dark:text-slate-400">{subtext}</span>}
        {trend && (
          <span
            className={`inline-flex items-center gap-0.5 font-bold px-2 py-0.5 rounded-full text-[11px] ${
              trend.isPositive
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
            }`}
          >
            {trend.isPositive ? "↑" : "↓"} {trend.value}
          </span>
        )}
      </div>
    </GlassCard>
  );
};

// ==========================================
// 7. ACHIEVEMENT CARD (28px Radius)
// ==========================================
interface AchievementCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  unlocked: boolean;
  unlockedAt?: string;
  progress?: number;
  tier?: "Bronze" | "Silver" | "Gold" | "Diamond" | "Cosmic";
  className?: string;
}

export const AchievementCard: React.FC<AchievementCardProps> = ({
  title,
  description,
  icon,
  unlocked,
  unlockedAt,
  progress,
  tier = "Gold",
  className = "",
}) => {
  const tierBorders = {
    Bronze: "border-amber-700/30 text-amber-700 dark:text-amber-500",
    Silver: "border-slate-400/40 text-slate-600 dark:text-slate-300",
    Gold: "border-amber-400/50 text-amber-600 dark:text-amber-400",
    Diamond: "border-cyan-400/50 text-cyan-600 dark:text-cyan-400",
    Cosmic: "border-purple-400/50 text-purple-600 dark:text-purple-400",
  };

  return (
    <GlassCard
      className={`p-5 flex items-center gap-4 ${
        unlocked ? "opacity-100" : "opacity-60 grayscale-[40%]"
      } ${className}`}
    >
      <div
        className={`p-3.5 rounded-2xl border ${
          unlocked
            ? "bg-amber-500/10 border-amber-500/30 text-amber-500 shadow-md shadow-amber-500/10"
            : "bg-slate-200/50 dark:bg-slate-800/50 border-slate-300 dark:border-slate-700 text-slate-400"
        }`}
      >
        {icon}
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">{title}</h4>
          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${tierBorders[tier]}`}>
            {tier}
          </span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{description}</p>

        {unlocked && unlockedAt && (
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
            Unlocked {unlockedAt}
          </p>
        )}

        {!unlocked && typeof progress === "number" && (
          <div className="pt-1.5 space-y-1">
            <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </GlassCard>
  );
};

// ==========================================
// 8. AI CARD (28px Radius, Cyber/AI Cyber Surface)
// ==========================================
interface AICardProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  badgeText?: string;
  className?: string;
}

export const AICard: React.FC<AICardProps> = ({
  title,
  description,
  children,
  actions,
  badgeText = "StudyMate AI Solver",
  className = "",
}) => {
  return (
    <GlassCard variant="ai" className={`p-6 md:p-8 space-y-5 text-white ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-2xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-lg shadow-indigo-500/20">
            <Sparkles className="w-5 h-5 animate-pulse text-indigo-300" />
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-widest font-extrabold text-indigo-300">
              {badgeText}
            </span>
            <h3 className="font-extrabold text-lg text-white font-display tracking-tight">{title}</h3>
          </div>
        </div>
        {actions && <div>{actions}</div>}
      </div>

      {description && <p className="text-xs md:text-sm text-indigo-100/90 leading-relaxed">{description}</p>}

      {children && <div className="space-y-4">{children}</div>}
    </GlassCard>
  );
};

// ==========================================
// 9. TIMELINE CARD (28px Radius)
// ==========================================
interface TimelineCardProps {
  time: string;
  title: string;
  subtitle?: string;
  status?: "completed" | "upcoming" | "in-progress" | "alert";
  tags?: string[];
  icon?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export const TimelineCard: React.FC<TimelineCardProps> = ({
  time,
  title,
  subtitle,
  status = "upcoming",
  tags = [],
  icon,
  onClick,
  className = "",
}) => {
  const statusColors = {
    completed: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    upcoming: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
    "in-progress": "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    alert: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  };

  return (
    <GlassCard
      onClick={onClick}
      hoverEffect={!!onClick}
      className={`p-5 flex items-center justify-between gap-4 ${onClick ? "cursor-pointer" : ""} ${className}`}
    >
      <div className="flex items-center gap-4 min-w-0">
        <div className="px-3 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 text-center shrink-0 border border-slate-200/60 dark:border-slate-700/60">
          <span className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 font-mono">
            {time}
          </span>
        </div>

        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">{title}</h4>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColors[status]}`}>
              {status}
            </span>
          </div>

          {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{subtitle}</p>}

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="text-[10px] px-2 py-0.5 rounded-md bg-slate-200/50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {icon && <div className="shrink-0 text-slate-400">{icon}</div>}
    </GlassCard>
  );
};

// ==========================================
// 10. EMPTY STATE CARD (28px Radius)
// ==========================================
interface EmptyStateCardProps {
  icon?: React.ReactNode;
  illustration?: React.ReactNode;
  title: string;
  description: string;
  motivationalQuote?: string;
  aiSuggestions?: string[];
  onSelectSuggestion?: (suggestion: string) => void;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const EmptyStateCard: React.FC<EmptyStateCardProps> = ({
  icon,
  illustration,
  title,
  description,
  motivationalQuote,
  aiSuggestions,
  onSelectSuggestion,
  action,
  secondaryAction,
  className = "",
}) => {
  return (
    <GlassCard className={`p-8 sm:p-10 flex flex-col items-center justify-center text-center space-y-5 relative overflow-hidden ${className}`}>
      {/* Background Soft Floating Gradient */}
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-gradient-to-tr from-amber-500/10 via-teal-500/10 to-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Floating Animated Illustration or Badge */}
      <motion.div 
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
        className="relative z-10"
      >
        {illustration ? (
          <div className="p-4 rounded-3xl bg-slate-50/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 shadow-xl">
            {illustration}
          </div>
        ) : icon ? (
          <div className="p-4 rounded-3xl bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/60 dark:to-purple-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50 shadow-lg relative">
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-indigo-500 rounded-full animate-ping" />
            {icon}
          </div>
        ) : (
          <div className="p-4 rounded-3xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-500">
            <Sparkles className="w-8 h-8" />
          </div>
        )}
      </motion.div>

      {/* Title & Description */}
      <div className="space-y-1.5 max-w-md relative z-10">
        <h3 className="font-extrabold text-lg sm:text-xl text-slate-900 dark:text-white tracking-tight font-display">
          {title}
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
          {description}
        </p>
      </div>

      {/* Optional Motivational Quote */}
      {motivationalQuote && (
        <div className="px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-purple-500/10 border border-amber-500/20 text-[11px] font-bold text-amber-700 dark:text-amber-300 max-w-md flex items-center gap-2">
          <span>💡</span>
          <span className="italic">"{motivationalQuote}"</span>
        </div>
      )}

      {/* Optional Contextual AI Prompt Suggestions */}
      {aiSuggestions && aiSuggestions.length > 0 && (
        <div className="w-full max-w-md pt-1 space-y-2 relative z-10">
          <div className="flex items-center justify-center gap-1.5 text-[10px] font-extrabold tracking-wider uppercase text-indigo-600 dark:text-indigo-400">
            <Sparkles className="w-3 h-3 animate-pulse" />
            <span>AI Quick Recommendations</span>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {aiSuggestions.map((sug, idx) => (
              <button
                key={idx}
                onClick={() => onSelectSuggestion?.(sug)}
                className="px-3 py-1.5 rounded-xl bg-white/80 dark:bg-slate-800/80 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200 dark:border-slate-700 text-xs font-semibold shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>✨</span>
                <span>{sug}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5 w-full max-w-sm relative z-10">
          {action && (
            <PremiumButton 
              variant="primary" 
              size="md" 
              onClick={action.onClick}
              fullWidth={!secondaryAction}
            >
              {action.label}
            </PremiumButton>
          )}
          {secondaryAction && (
            <PremiumButton 
              variant="secondary" 
              size="md" 
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.label}
            </PremiumButton>
          )}
        </div>
      )}
    </GlassCard>
  );
};

// ==========================================
// 11. PREMIUM INPUT FIELD (18px Radius)
// ==========================================
interface PremiumInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  clearable?: boolean;
  onClear?: () => void;
  error?: string;
}

export const PremiumInput = React.forwardRef<HTMLInputElement, PremiumInputProps>(
  ({ icon, clearable, onClear, error, className = "", value, onChange, ...props }, ref) => {
    return (
      <div className="w-full space-y-1">
        <div className="relative flex items-center">
          {icon && (
            <div className="absolute left-4 text-slate-400 pointer-events-none">
              {icon}
            </div>
          )}

          <input
            ref={ref}
            value={value}
            onChange={onChange}
            className={`
              w-full bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800
              ${DESIGN_TOKENS.radius.input}
              py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400
              focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500
              transition-all shadow-inner backdrop-blur-md
              ${icon ? "pl-11" : "pl-4"}
              ${clearable && value ? "pr-10" : "pr-4"}
              ${error ? "border-rose-500 focus:ring-rose-500/50" : ""}
              ${className}
            `}
            {...props}
          />

          {clearable && value && (
            <button
              type="button"
              onClick={onClear}
              className="absolute right-3 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <AlertCircle className="w-4 h-4 rotate-45" />
            </button>
          )}
        </div>

        {error && <p className="text-xs text-rose-500 font-medium pl-2">{error}</p>}
      </div>
    );
  }
);
PremiumInput.displayName = "PremiumInput";

// ==========================================
// 12. PREMIUM DIALOG / MODAL (32px Radius)
// ==========================================
interface PremiumDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl";
}

export const PremiumDialog: React.FC<PremiumDialogProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = "md",
}) => {
  const maxWidths = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-2xl",
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", stiffness: 450, damping: 30 }}
            className={`
              relative w-full ${maxWidths[maxWidth]} ${DESIGN_TOKENS.radius.dialog}
              bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl p-6 md:p-8
              border border-white/40 dark:border-slate-800/80
              shadow-[0_24px_64px_rgba(0,0,0,0.3)] z-10 space-y-5
            `}
          >
            <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800/80 pb-4">
              <h3 className="font-extrabold text-lg text-slate-900 dark:text-white font-display">
                {title}
              </h3>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="max-h-[80vh] overflow-y-auto">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// ==========================================
// 13. PREMIUM BOTTOM SHEET (36px Top Radius)
// ==========================================
interface PremiumBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export const PremiumBottomSheet: React.FC<PremiumBottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className={`
              relative w-full max-w-2xl ${DESIGN_TOKENS.radius.bottomSheet}
              bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl p-6 md:p-8
              border-t border-white/40 dark:border-slate-800/80
              shadow-[0_-16px_48px_rgba(0,0,0,0.3)] z-10 space-y-4 max-h-[90vh] overflow-y-auto
            `}
          >
            {/* Drag Handle Indicator */}
            <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mb-2" />

            {title && (
              <h3 className="font-extrabold text-lg text-slate-900 dark:text-white font-display text-center pb-2 border-b border-slate-200/50 dark:border-slate-800/80">
                {title}
              </h3>
            )}

            <div>{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// ==========================================
// 14. PREMIUM ICON WRAPPER
// ==========================================
interface PremiumIconProps {
  children: React.ReactNode;
  variant?: "indigo" | "rose" | "amber" | "emerald" | "slate" | "sky" | "teal" | "violet" | "fuchsia" | "lime" | "cyan" | "purple";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const PremiumIcon: React.FC<PremiumIconProps> = ({
  children,
  variant = "indigo",
  size = "md",
  className = "",
}) => {
  const backgrounds = {
    indigo: "bg-indigo-50/80 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 border-indigo-200/50 dark:border-indigo-900/50 shadow-sm",
    rose: "bg-rose-50/80 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border-rose-200/50 dark:border-rose-900/50 shadow-sm",
    amber: "bg-amber-50/80 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 border-amber-200/50 dark:border-amber-900/50 shadow-sm",
    emerald: "bg-emerald-50/80 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-900/50 shadow-sm",
    slate: "bg-slate-100/80 text-slate-700 dark:bg-slate-800/80 dark:text-slate-300 border-slate-200/50 dark:border-slate-700/50 shadow-sm",
    sky: "bg-sky-50/80 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400 border-sky-200/50 dark:border-sky-900/50 shadow-sm",
    teal: "bg-teal-50/80 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400 border-teal-200/50 dark:border-teal-900/50 shadow-sm",
    violet: "bg-violet-50/80 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400 border-violet-200/50 dark:border-violet-900/50 shadow-sm",
    purple: "bg-purple-50/80 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400 border-purple-200/50 dark:border-purple-900/50 shadow-sm",
    fuchsia: "bg-fuchsia-50/80 text-fuchsia-600 dark:bg-fuchsia-950/60 dark:text-fuchsia-400 border-fuchsia-200/50 dark:border-fuchsia-900/50 shadow-sm",
    lime: "bg-lime-50/80 text-lime-600 dark:bg-lime-950/60 dark:text-lime-400 border-lime-200/50 dark:border-lime-900/50 shadow-sm",
    cyan: "bg-cyan-50/80 text-cyan-600 dark:bg-cyan-950/60 dark:text-cyan-400 border-cyan-200/50 dark:border-cyan-900/50 shadow-sm",
  };

  const sizes = {
    sm: "p-2 rounded-xl text-xs",
    md: "p-3 rounded-2xl text-sm",
    lg: "p-4 rounded-[20px] text-base",
  };

  return (
    <div
      className={`
        inline-flex items-center justify-center border shrink-0 transition-all duration-200 backdrop-blur-md
        ${backgrounds[variant]}
        ${sizes[size]}
        ${className}
      `}
    >
      {children}
    </div>
  );
};

// ==========================================
// 15. TYPOGRAPHY PRIMITIVE COMPONENTS (Apple-Level Font Hierarchy)
// ==========================================

export const HeroTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <h1 className={`typo-hero text-slate-900 dark:text-white tracking-tight ${className}`}>
    {children}
  </h1>
);

export const LargeTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <h2 className={`typo-large-title text-slate-900 dark:text-white tracking-tight ${className}`}>
    {children}
  </h2>
);

export const SectionTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <h3 className={`typo-section-title text-slate-900 dark:text-white tracking-tight ${className}`}>
    {children}
  </h3>
);

export const Subtitle: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <p className={`typo-subtitle text-slate-600 dark:text-slate-300 ${className}`}>
    {children}
  </p>
);

export const BodyText: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <p className={`typo-body text-slate-700 dark:text-slate-300 ${className}`}>
    {children}
  </p>
);

export const CaptionText: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <span className={`typo-caption text-slate-500 dark:text-slate-400 ${className}`}>
    {children}
  </span>
);

export const ButtonText: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <span className={`typo-button ${className}`}>
    {children}
  </span>
);

export const SmallLabel: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <span className={`typo-label-sm text-slate-500 dark:text-slate-400 ${className}`}>
    {children}
  </span>
);

// ==========================================
// 16. STANDARDIZED SEARCH BAR
// ==========================================
interface PremiumSearchBarProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  onClear?: () => void;
  className?: string;
}
export const PremiumSearchBar: React.FC<PremiumSearchBarProps> = ({
  value,
  onChange,
  placeholder = "Search...",
  onClear,
  className = "",
}) => {
  return (
    <div className={`relative flex items-center w-full ${className}`}>
      <Search className="absolute left-4 w-4 h-4 text-purple-400 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[#0d1527]/75 dark:bg-[#0d1527]/80 backdrop-blur-xl border border-white/10 rounded-2xl py-2.5 pl-11 pr-10 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-400 transition-all shadow-inner"
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            onChange("");
            onClear?.();
          }}
          className="absolute right-3.5 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

// ==========================================
// 17. STANDARDIZED SELECT / DROPDOWN
// ==========================================
interface PremiumSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  icon?: React.ReactNode;
  className?: string;
}
export const PremiumSelect: React.FC<PremiumSelectProps> = ({ icon, children, className = "", ...props }) => {
  return (
    <div className="relative flex items-center w-full">
      {icon && <div className="absolute left-4 text-purple-400 pointer-events-none">{icon}</div>}
      <select
        className={`w-full bg-[#0d1527]/80 backdrop-blur-xl border border-white/10 rounded-2xl py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-400 transition-all shadow-inner appearance-none ${
          icon ? "pl-11" : "pl-4"
        } pr-10 ${className}`}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="absolute right-4 w-4 h-4 text-slate-400 pointer-events-none" />
    </div>
  );
};

// ==========================================
// 18. STANDARDIZED BADGE
// ==========================================
interface PremiumBadgeProps {
  children: React.ReactNode;
  variant?: "purple" | "blue" | "orange" | "green" | "amber" | "red" | "glass";
  size?: "sm" | "md";
  icon?: React.ReactNode;
  className?: string;
}
export const PremiumBadge: React.FC<PremiumBadgeProps> = ({
  children,
  variant = "purple",
  size = "md",
  icon,
  className = "",
}) => {
  const styles = {
    purple: "bg-purple-500/15 text-purple-300 border-purple-500/30",
    blue: "bg-blue-500/15 text-blue-300 border-blue-500/30",
    orange: "bg-orange-500/15 text-orange-300 border-orange-500/30",
    green: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    amber: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    red: "bg-red-500/15 text-red-300 border-red-500/30",
    glass: "bg-white/10 text-slate-200 border-white/15 backdrop-blur-md",
  };
  const sizes = {
    sm: "px-2 py-0.5 text-[10px]",
    md: "px-3 py-1 text-xs",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-bold rounded-full border shadow-sm backdrop-blur-md tracking-wide ${styles[variant]} ${sizes[size]} ${className}`}
    >
      {icon}
      {children}
    </span>
  );
};

// ==========================================
// 19. STANDARDIZED AVATAR
// ==========================================
interface PremiumAvatarProps {
  src?: string;
  name?: string;
  size?: "sm" | "md" | "lg" | "xl";
  status?: "online" | "busy" | "offline";
  className?: string;
}
export const PremiumAvatar: React.FC<PremiumAvatarProps> = ({
  src,
  name = "User",
  size = "md",
  status,
  className = "",
}) => {
  const sizes = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
    xl: "w-16 h-16 text-xl",
  };
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="relative inline-block shrink-0">
      <div
        className={`rounded-2xl border border-white/20 shadow-md flex items-center justify-center font-bold text-white bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 overflow-hidden ${sizes[size]} ${className}`}
      >
        {src ? <img src={src} alt={name} className="w-full h-full object-cover" /> : initials}
      </div>
      {status && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#070b18] ${
            status === "online" ? "bg-emerald-500" : status === "busy" ? "bg-amber-500" : "bg-slate-500"
          }`}
        />
      )}
    </div>
  );
};

// ==========================================
// 20. STANDARDIZED PROGRESS BAR
// ==========================================
interface PremiumProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  sublabel?: string;
  variant?: "purple" | "blue" | "orange" | "green" | "gradient";
  size?: "sm" | "md" | "lg";
  className?: string;
}
export const PremiumProgressBar: React.FC<PremiumProgressBarProps> = ({
  value,
  max = 100,
  label,
  sublabel,
  variant = "gradient",
  size = "md",
  className = "",
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const height = {
    sm: "h-1.5",
    md: "h-2.5",
    lg: "h-4",
  };
  const gradients = {
    purple: "bg-purple-600",
    blue: "bg-blue-600",
    orange: "bg-orange-500",
    green: "bg-emerald-500",
    gradient: "bg-gradient-to-r from-purple-600 via-indigo-500 to-blue-500",
  };

  return (
    <div className={`w-full space-y-1.5 ${className}`}>
      {(label || sublabel) && (
        <div className="flex justify-between items-center text-xs">
          {label && <span className="font-semibold text-slate-200">{label}</span>}
          {sublabel && <span className="font-mono text-purple-300 font-bold">{sublabel}</span>}
        </div>
      )}
      <div className={`w-full bg-white/10 dark:bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/10 shadow-inner ${height[size]}`}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={`h-full rounded-full ${gradients[variant]} shadow-sm`}
        />
      </div>
    </div>
  );
};

// ==========================================
// 21. STANDARDIZED TABS
// ==========================================
interface PremiumTabsProps<T extends string> {
  tabs: { id: T; label: string; icon?: React.ReactNode; badge?: string | number }[];
  activeTab: T;
  onChange: (tabId: T) => void;
  className?: string;
}
export function PremiumTabs<T extends string>({ tabs, activeTab, onChange, className = "" }: PremiumTabsProps<T>) {
  return (
    <div className={`flex items-center gap-1.5 p-1.5 bg-[#0d1527]/80 backdrop-blur-xl border border-white/10 rounded-2xl overflow-x-auto no-scrollbar shadow-md ${className}`}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap z-10 ${
              isActive
                ? "text-white shadow-md"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="activeTabGlow"
                className="absolute inset-0 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl -z-10 shadow-lg shadow-purple-600/30 border border-white/20"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            {tab.icon}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span className={`px-1.5 py-0.5 text-[10px] rounded-full font-extrabold ${isActive ? "bg-white/20 text-white" : "bg-white/10 text-slate-400"}`}>
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ==========================================
// 23. FLAGSHIP MOTION LANGUAGE & SPRING PHYSICS
// ==========================================

export const SPRING_CONFIGS = {
  gentle: { type: "spring" as const, stiffness: 220, damping: 24 },
  bouncy: { type: "spring" as const, stiffness: 380, damping: 18 },
  snappy: { type: "spring" as const, stiffness: 480, damping: 28 },
  slow: { type: "spring" as const, stiffness: 120, damping: 20 },
};

// --- Smooth Page Transition Wrapper ---
interface SmoothPageTransitionProps {
  children: React.ReactNode;
  className?: string;
}
export const SmoothPageTransition: React.FC<SmoothPageTransitionProps> = ({ children, className = "" }) => (
  <motion.div
    initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
    exit={{ opacity: 0, y: -16, filter: "blur(6px)" }}
    transition={SPRING_CONFIGS.snappy}
    className={`w-full ${className}`}
  >
    {children}
  </motion.div>
);

// --- Blur Reveal Wrapper ---
interface BlurRevealProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}
export const BlurReveal: React.FC<BlurRevealProps> = ({ children, delay = 0, className = "" }) => (
  <motion.div
    initial={{ opacity: 0, filter: "blur(12px)", y: 12, scale: 0.97 }}
    animate={{ opacity: 1, filter: "blur(0px)", y: 0, scale: 1 }}
    transition={{ ...SPRING_CONFIGS.gentle, delay }}
    className={className}
  >
    {children}
  </motion.div>
);

// --- Floating Card Component ---
interface FloatingCardProps {
  children: React.ReactNode;
  floatOffset?: number;
  duration?: number;
  className?: string;
}
export const FloatingCard: React.FC<FloatingCardProps> = ({
  children,
  floatOffset = 6,
  duration = 4,
  className = "",
}) => (
  <motion.div
    animate={{ y: [0, -floatOffset, 0] }}
    transition={{ repeat: Infinity, duration, ease: "easeInOut" }}
    className={className}
  >
    {children}
  </motion.div>
);

// --- Animated Counter ---
interface AnimatedCounterProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}
export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  duration = 1000,
  prefix = "",
  suffix = "",
  className = "",
}) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const startValue = displayValue;
    const endValue = value;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.floor(startValue + (endValue - startValue) * easeOut));
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };

    requestAnimationFrame(step);
  }, [value, duration]);

  return (
    <motion.span
      key={value}
      initial={{ scale: 1.15, opacity: 0.8 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={SPRING_CONFIGS.bouncy}
      className={`font-mono font-bold tracking-tight ${className}`}
    >
      {prefix}
      {displayValue.toLocaleString()}
      {suffix}
    </motion.span>
  );
};

// --- Shimmer Loading & Skeleton Loader ---
interface SkeletonLoaderProps {
  className?: string;
  width?: string;
  height?: string;
  rounded?: string;
}
export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  className = "",
  width = "w-full",
  height = "h-4",
  rounded = "rounded-xl",
}) => (
  <div
    className={`bg-white/10 dark:bg-white/5 border border-white/5 animate-shimmer ${width} ${height} ${rounded} ${className}`}
  />
);

export const ShimmerLoading: React.FC<{ lines?: number; className?: string }> = ({ lines = 3, className = "" }) => (
  <div className={`space-y-3 ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <SkeletonLoader
        key={i}
        height={i === 0 ? "h-6" : "h-4"}
        width={i === lines - 1 ? "w-2/3" : "w-full"}
      />
    ))}
  </div>
);

// --- XP Burst Animation ---
interface XPBurstProps {
  amount: number;
  onComplete?: () => void;
  className?: string;
}
export const XPBurst: React.FC<XPBurstProps> = ({ amount, onComplete, className = "" }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.5, y: 10 }}
    animate={{ opacity: [0, 1, 1, 0], scale: [0.5, 1.2, 1, 0.9], y: -40 }}
    transition={{ duration: 1.4, ease: "easeOut" }}
    onAnimationComplete={onComplete}
    className={`fixed pointer-events-none z-50 flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-purple-600 via-indigo-600 to-amber-500 text-white font-black text-sm shadow-2xl border border-white/30 backdrop-blur-xl ${className}`}
  >
    <Sparkles className="w-4 h-4 text-amber-300 animate-spin" style={{ animationDuration: "3s" }} />
    <span>+{amount} XP</span>
  </motion.div>
);

// --- Achievement Pop-up Animation ---
interface AchievementAnimationProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  onClose?: () => void;
}
export const AchievementAnimation: React.FC<AchievementAnimationProps> = ({
  title,
  description,
  icon,
  onClose,
}) => (
  <AnimatePresence>
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.8, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: -30, scale: 0.9, filter: "blur(6px)" }}
      transition={SPRING_CONFIGS.bouncy}
      className="fixed top-6 left-1/2 -translate-x-1/2 z-50 max-w-md w-full px-4"
    >
      <div className="flex items-center gap-4 p-4 rounded-3xl bg-gradient-to-r from-purple-900/90 via-[#0d1527]/95 to-indigo-950/90 border border-purple-400/40 shadow-[0_20px_50px_rgba(147,51,234,0.35)] backdrop-blur-2xl">
        <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-400/30">
          {icon || <Sparkles className="w-6 h-6 animate-pulse" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase font-extrabold tracking-wider text-amber-300">
            Achievement Unlocked!
          </div>
          <div className="font-bold text-sm text-white truncate">{title}</div>
          {description && <div className="text-xs text-slate-300 truncate">{description}</div>}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </motion.div>
  </AnimatePresence>
);

// --- Morphing Card Component (Shared Element Layout) ---
interface MorphingCardProps {
  layoutId: string;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}
export const MorphingCard: React.FC<MorphingCardProps> = ({
  layoutId,
  onClick,
  children,
  className = "",
}) => (
  <motion.div
    layoutId={layoutId}
    onClick={onClick}
    whileHover={{ scale: 1.015, y: -2 }}
    whileTap={{ scale: 0.985 }}
    transition={SPRING_CONFIGS.snappy}
    className={`cursor-pointer ${className}`}
  >
    {children}
  </motion.div>
);

