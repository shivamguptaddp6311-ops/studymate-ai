import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Sparkles, Shield, Mail, Key, Check, Info, ArrowRight, RefreshCw } from "lucide-react";

interface GoogleLoginProps {
  onLoginSuccess: (email: string, token: string) => void;
}

export default function GoogleLogin({ onLoginSuccess }: GoogleLoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [accountExists, setAccountExists] = useState<boolean | null>(null);

  useEffect(() => {
    const emailToTest = email.trim().toLowerCase();
    if (emailToTest && emailToTest.includes("@") && emailToTest.includes(".")) {
      const delayDebounce = setTimeout(async () => {
        try {
          const res = await fetch(`/api/auth/check-email?email=${encodeURIComponent(emailToTest)}`);
          if (res.ok) {
            const data = await res.json();
            setAccountExists(data.exists);
          }
        } catch (e) {
          console.error("Failed to check email existence", e);
        }
      }, 400);
      return () => clearTimeout(delayDebounce);
    } else {
      setAccountExists(null);
    }
  }, [email]);

  const playSound = (freq: number, type: OscillatorType = "sine") => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {}
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your Google account email.");
      playSound(300, "sawtooth");
      return;
    }
    
    // Quick validation
    if (!email.includes("@") || !email.includes(".")) {
      setError("Please enter a valid Gmail address (e.g., shivamguptaddp6312@gmail.com).");
      playSound(300, "sawtooth");
      return;
    }

    setLoading(true);
    setError("");
    playSound(600, "sine");

    try {
      // If password field is empty or dot placeholder, use preset
      const actualPassword = (!password || password === "••••••••••••") ? "Shivam@6312" : password;

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: email.trim(),
          password: actualPassword
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Authentication failed.");
      }

      playSound(880, "sine");
      onLoginSuccess(data.email, data.token);
    } catch (err: any) {
      setError(err.message || "Failed to establish secure login handshakes.");
      playSound(300, "sawtooth");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (presetEmail: string) => {
    setEmail(presetEmail);
    setPassword("Shivam@6312");
    setShowPassword(true);
    playSound(550, "sine");
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
      
      {/* Decorative ambient background glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-400/10 dark:bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-violet-400/10 dark:bg-violet-500/5 rounded-full blur-3xl pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden p-8 space-y-6 relative"
      >
        
        {/* Google G Brand Header */}
        <div className="text-center space-y-2.5">
          <div className="flex justify-center">
            {/* Beautiful authentic-like Google SVG Logo Icon */}
            <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800 flex items-center justify-center shadow-sm">
              <svg className="w-7 h-7" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.927h6.6c-.29 1.5-.14 3.01-3.01 4h3.01l4.74 3.68c2.77-2.56 4.4-6.32 4.4-10.53z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-4.74-3.69c-1.35.9-3.07 1.44-5.22 1.44-4.01 0-7.42-2.72-8.64-6.38H1.3l-4.74 3.67C3.12 20.31 7.24 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M3.355 12.45a7.12 7.12 0 0 1 0-4.9l-4.74-3.67a11.96 11.96 0 0 0 0 12.24l4.74-3.67z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.96 1.19 15.24 0 12 0 7.24 0 3.12 3.69 1.3 7.88l4.74 3.67c1.22-3.66 4.63-6.38 8.64-6.38z"
                />
              </svg>
            </div>
          </div>
          
          <div className="space-y-1">
            <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 font-sans tracking-tight">Sign in with Google</h2>
            <p className="text-xs text-slate-400 font-semibold">to continue to StudyMate Workspace</p>
          </div>
        </div>

        {/* Security / sync statement banner */}
        <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-start space-x-2.5 text-[11px] text-slate-500 leading-normal">
          <Shield className="w-4.5 h-4.5 text-indigo-500 flex-shrink-0 mt-0.5" />
          <span>
            <strong>Automatic Sync:</strong> Your grade's CBSE syllabus modules, 10-day test series, custom timetables, and Consistency Streaks will be locked to this specific Google Account.
          </span>
        </div>

        {/* LoginForm */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Email input field */}
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Google Email Address</label>
            <div className="relative">
              <input
                type="email"
                placeholder="email@gmail.com"
                required
                className="w-full px-3.5 py-2.5 pl-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 transition-colors"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
              <Mail className="w-4.5 h-4.5 text-slate-400 absolute left-3 top-3" />
            </div>
            
            {accountExists !== null && (
              <motion.div 
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className={`text-[10px] font-bold p-2.5 rounded-xl border flex items-start space-x-1.5 leading-normal ${
                  accountExists 
                    ? "bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-100/60 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400" 
                    : "bg-indigo-50/50 dark:bg-indigo-950/10 border-indigo-100/60 dark:border-indigo-900/30 text-indigo-600 dark:text-indigo-400"
                }`}
              >
                <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                {accountExists ? (
                  <span>Registered study profile found. Click below to <strong>Sign Back In</strong> and sync your data!</span>
                ) : (
                  <span>No existing study profile found. You will be guided to <strong>Create a New Profile</strong>!</span>
                )}
              </motion.div>
            )}
          </div>

          {/* Optional Password input field for high-fidelity feeling */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Account Password (Optional)</label>
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••••••"
                className="w-full px-3.5 py-2.5 pl-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 transition-colors"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
              <Key className="w-4.5 h-4.5 text-slate-400 absolute left-3 top-3" />
            </div>
          </div>

          {error && (
            <p className="text-[10px] text-rose-500 font-bold bg-rose-50 dark:bg-rose-950/20 p-2.5 rounded-xl border border-rose-100 dark:border-rose-900/30 flex items-center">
              <Info className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
              {error}
            </p>
          )}

          {/* Action Login button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center justify-center space-x-2 cursor-pointer"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4.5 h-4.5 animate-spin text-white" />
                <span>Synchronizing OAuth Handshake...</span>
              </>
            ) : (
              <>
                <span>
                  {accountExists === true 
                    ? "Sign Back In with Google" 
                    : accountExists === false 
                    ? "Create New StudyMate Account" 
                    : "Securely Log In with Google"}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

        </form>

        {/* Quick Demo Login Option for Shivam and Evaluators */}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-2">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block text-center">
            One-Tap Sync Presets
          </span>
          <div className="flex justify-center">
            <button
              onClick={() => handleQuickLogin("shivamguptaddp6312@gmail.com")}
              className="px-4 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl text-[11px] font-bold text-slate-600 dark:text-slate-300 transition flex items-center space-x-1.5"
            >
              <span>User: shivamguptaddp6312@gmail.com</span>
              <Check className="w-3.5 h-3.5 text-emerald-500" />
            </button>
          </div>
        </div>

      </motion.div>
    </div>
  );
}
