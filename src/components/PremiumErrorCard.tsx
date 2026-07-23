import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  AlertTriangle, RefreshCw, ArrowLeft, LifeBuoy, 
  ChevronDown, ChevronUp, Copy, Check, ShieldAlert,
  WifiOff, Sparkles, ServerOff, Send, X, HelpCircle
} from "lucide-react";

export interface PremiumErrorCardProps {
  title?: string;
  description?: string;
  error?: Error | string | null;
  type?: "general" | "network" | "ai" | "game" | "data" | "auth";
  onRetry?: () => void;
  onGoBack?: () => void;
  onContactSupport?: () => void;
  compact?: boolean;
  className?: string;
}

export const PremiumErrorCard: React.FC<PremiumErrorCardProps> = ({
  title,
  description,
  error,
  type = "general",
  onRetry,
  onGoBack,
  onContactSupport,
  compact = false,
  className = "",
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportMessage, setSupportMessage] = useState("");
  const [supportSent, setSupportSent] = useState(false);

  const errorMessageString = typeof error === "string" ? error : error?.message || null;

  // Defaults based on type
  const getTypeMeta = () => {
    switch (type) {
      case "network":
        return {
          icon: <WifiOff className="w-8 h-8 text-amber-500" />,
          glow: "from-amber-500/20 via-orange-500/10 to-transparent",
          badgeBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
          defaultTitle: "Connection Interrupt Detected",
          defaultDesc: "We couldn't connect to StudyMate servers. Check your internet connection or cloud proxy status.",
        };
      case "ai":
        return {
          icon: <Sparkles className="w-8 h-8 text-indigo-500 animate-pulse" />,
          glow: "from-indigo-500/20 via-purple-500/10 to-transparent",
          badgeBg: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
          defaultTitle: "AI Model Paused",
          defaultDesc: "The cognitive AI service experienced a temporary hiccup during response generation.",
        };
      case "game":
        return {
          icon: <AlertTriangle className="w-8 h-8 text-purple-500" />,
          glow: "from-purple-500/20 via-pink-500/10 to-transparent",
          badgeBg: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
          defaultTitle: "Game Session Interrupted",
          defaultDesc: "We hit an obstacle loading game assets or calculating adaptive scores.",
        };
      case "data":
      case "auth":
        return {
          icon: <ServerOff className="w-8 h-8 text-rose-500" />,
          glow: "from-rose-500/20 via-red-500/10 to-transparent",
          badgeBg: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
          defaultTitle: "Sync Conflict or Auth Expiry",
          defaultDesc: "Your study state could not be verified in cloud database. Reloading usually fixes this instantly.",
        };
      default:
        return {
          icon: <ShieldAlert className="w-8 h-8 text-rose-500" />,
          glow: "from-rose-500/20 via-indigo-500/10 to-transparent",
          badgeBg: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
          defaultTitle: "Something Went Sideways",
          defaultDesc: "An unexpected interface state occurred. Don't worry, all your study notes and progress remain safe in cloud memory.",
        };
    }
  };

  const meta = getTypeMeta();
  const cardTitle = title || meta.defaultTitle;
  const cardDesc = description || meta.defaultDesc;

  const handleCopyDetails = () => {
    if (errorMessageString) {
      navigator.clipboard.writeText(errorMessageString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSendSupport = (e: React.FormEvent) => {
    e.preventDefault();
    setSupportSent(true);
    setTimeout(() => {
      setSupportSent(false);
      setShowSupportModal(false);
      setSupportMessage("");
    }, 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: -12 }}
      transition={{ type: "spring", stiffness: 350, damping: 28 }}
      className={`relative w-full overflow-hidden rounded-[2.5rem] bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 shadow-2xl backdrop-blur-2xl ${
        compact ? "p-5 sm:p-6 max-w-xl mx-auto" : "p-6 sm:p-10 max-w-2xl mx-auto"
      } ${className}`}
    >
      {/* Background Ambient Glow */}
      <div className={`absolute -top-24 -left-24 w-72 h-72 rounded-full bg-gradient-to-br ${meta.glow} blur-3xl pointer-events-none`} />

      <div className="relative z-10 flex flex-col items-center text-center space-y-5">
        
        {/* Friendly Illustration Badge */}
        <div className="relative">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center shadow-lg relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 via-purple-500/10 to-pink-500/10 opacity-70 group-hover:opacity-100 transition" />
            <motion.div
              animate={{ rotate: [0, -5, 5, 0], scale: [1, 1.05, 1] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              {meta.icon}
            </motion.div>
          </div>
          <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500 border-2 border-white dark:border-slate-900"></span>
          </span>
        </div>

        {/* Content Typography */}
        <div className="space-y-2 max-w-lg">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider border shadow-xs ${meta.badgeBg}">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>StudyMate Diagnostic</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight font-display">
            {cardTitle}
          </h3>
          <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
            {cardDesc}
          </p>
        </div>

        {/* Technical Stack Details Accordion */}
        {errorMessageString && (
          <div className="w-full max-w-lg text-left">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="w-full py-2 px-3 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold flex items-center justify-between transition cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>Technical Details</span>
              </span>
              {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            <AnimatePresence>
              {showDetails && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mt-2 p-3 bg-slate-900 text-slate-200 rounded-2xl text-[11px] font-mono leading-relaxed overflow-x-auto relative group border border-slate-800"
                >
                  <button
                    onClick={handleCopyDetails}
                    title="Copy Error"
                    className="absolute top-2.5 right-2.5 p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <pre className="pr-8 whitespace-pre-wrap break-all">{errorMessageString}</pre>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Action Buttons: Retry, Go Back, Contact Support */}
        <div className="pt-2 w-full max-w-lg flex flex-col sm:flex-row items-center justify-center gap-3">
          {onRetry && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onRetry}
              className="w-full sm:flex-1 py-3 px-5 bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 cursor-pointer transition"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry Action</span>
            </motion.button>
          )}

          {onGoBack && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onGoBack}
              className="w-full sm:flex-1 py-3 px-5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-extrabold text-xs sm:text-sm rounded-2xl border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-center gap-2 cursor-pointer transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Go Back</span>
            </motion.button>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              if (onContactSupport) {
                onContactSupport();
              } else {
                setShowSupportModal(true);
              }
            }}
            className="w-full sm:w-auto py-3 px-4 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 font-bold text-xs rounded-2xl border border-indigo-200/60 dark:border-indigo-800/60 flex items-center justify-center gap-2 cursor-pointer transition"
          >
            <LifeBuoy className="w-4 h-4 text-indigo-500" />
            <span>Contact Support</span>
          </motion.button>
        </div>

      </div>

      {/* Contact Support Modal */}
      <AnimatePresence>
        {showSupportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl relative space-y-4"
            >
              <button
                onClick={() => setShowSupportModal(false)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-500/10 text-indigo-600 rounded-2xl border border-indigo-500/20">
                  <LifeBuoy className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-black text-slate-800 dark:text-slate-100">StudyMate Priority Support</h4>
                  <p className="text-xs text-slate-400">Direct assistance from our tech support team</p>
                </div>
              </div>

              {supportSent ? (
                <div className="p-6 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-center space-y-2">
                  <span className="text-2xl">✨</span>
                  <p className="text-xs font-extrabold text-emerald-700 dark:text-emerald-300">
                    Support Ticket Dispatched!
                  </p>
                  <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400">
                    Our team will review your session logs and respond to support@studymate.ai shortly.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSendSupport} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Describe what happened:</label>
                    <textarea
                      required
                      value={supportMessage}
                      onChange={(e) => setSupportMessage(e.target.value)}
                      placeholder="e.g. I was attempting a Syllabus Quiz and experienced a connection pause..."
                      className="w-full p-3 h-24 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-[10px] text-slate-400 flex items-center justify-between">
                    <span>Target Email: support@studymate.ai</span>
                    <span className="font-bold text-indigo-500">Auto-attaching error logs</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowSupportModal(false)}
                      className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Ticket</span>
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default PremiumErrorCard;
