import React, { useState } from "react";
import { motion } from "motion/react";
import { Shield, Mail, Key, Info, ArrowRight, RefreshCw, LogIn, UserPlus } from "lucide-react";
import { 
  auth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from "../lib/firebase";

interface GoogleLoginProps {
  onLoginSuccess: (email: string, token: string, refreshToken?: string, rememberMe?: boolean) => void;
}

export default function GoogleLogin({ onLoginSuccess }: GoogleLoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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

  const handleEmailPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in both email and password fields.");
      playSound(300, "sawtooth");
      return;
    }

    if (!email.includes("@") || !email.includes(".")) {
      setError("Please enter a valid email address.");
      playSound(300, "sawtooth");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      playSound(300, "sawtooth");
      return;
    }

    setLoading(true);
    setError("");
    playSound(600, "sine");

    try {
      let userCredential;
      if (isSignUp) {
        userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      } else {
        userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      }

      const user = userCredential.user;
      if (!user || !user.email) {
        throw new Error("Firebase auth did not return a valid user session.");
      }

      const idToken = await user.getIdToken();

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: user.email,
          idToken
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to secure backend session synchronization.");
      }

      playSound(880, "sine");
      onLoginSuccess(data.email, data.token, data.refreshToken, rememberMe);
    } catch (err: any) {
      console.error("Email/Password auth error:", err);
      let errMsg = "Authentication failed.";
      
      if (
        err.code === "auth/wrong-password" || 
        err.code === "auth/invalid-credential" || 
        err.message?.includes("wrong-password") || 
        err.message?.includes("invalid-credential")
      ) {
        errMsg = "Incorrect password. Please verify your password and try again.";
      } else if (
        err.code === "auth/user-not-found" || 
        err.message?.includes("user-not-found")
      ) {
        errMsg = "Account not found.";
      } else if (
        err.code === "auth/email-already-in-use" || 
        err.message?.includes("email-already-in-use")
      ) {
        errMsg = "This email is already in use.";
      } else if (
        err.code === "auth/invalid-email" || 
        err.message?.includes("invalid-email")
      ) {
        errMsg = "Please enter a valid email address.";
      } else if (
        err.code === "auth/weak-password" || 
        err.message?.includes("weak-password")
      ) {
        errMsg = "Password must be at least 6 characters long.";
      } else {
        errMsg = err.message || errMsg;
      }
      
      setError(errMsg);
      playSound(300, "sawtooth");
    } finally {
      setLoading(false);
    }
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
        
        {/* Brand Header */}
        <div className="text-center space-y-2.5">
          <div className="flex justify-center">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-slate-800/80 border border-indigo-100 dark:border-slate-800 flex items-center justify-center shadow-sm text-2xl">
              🎓
            </div>
          </div>
          
          <div className="space-y-1">
            <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 font-sans tracking-tight">StudyMate Workspace</h2>
            <p className="text-xs text-slate-400 font-semibold">Secure study synchronization platform</p>
          </div>
        </div>

        {/* Security / sync statement banner */}
        <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-start space-x-2.5 text-[11px] text-slate-500 leading-normal">
          <Shield className="w-4.5 h-4.5 text-indigo-500 flex-shrink-0 mt-0.5" />
          <span>
            <strong>Automatic Sync:</strong> Your CBSE syllabus modules, custom timetables, and Consistency Streaks will be secured to your authenticated account.
          </span>
        </div>

        {error && (
          <p className="text-[10px] text-rose-500 font-bold bg-rose-50 dark:bg-rose-950/20 p-2.5 rounded-xl border border-rose-100 dark:border-rose-900/30 flex items-center leading-normal">
            <Info className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
            {error}
          </p>
        )}

        <form onSubmit={handleEmailPasswordSubmit} className="space-y-4">
          
          {/* Log In vs Sign Up toggle */}
          <div className="flex justify-between items-center px-1">
            <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {isSignUp ? "Create a New Profile" : "Access Existing Profile"}
            </span>
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError("");
                playSound(500, "sine");
              }}
              className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              {isSignUp ? "Switch to Log In" : "Switch to Sign Up"}
            </button>
          </div>

          {/* Email input field */}
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Email Address</label>
            <div className="relative">
              <input
                type="email"
                placeholder="email@example.com"
                required
                className="w-full px-3.5 py-2.5 pl-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 transition-colors"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
              <Mail className="w-4.5 h-4.5 text-slate-400 absolute left-3 top-3" />
            </div>
          </div>

          {/* Password input field */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Password</label>
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
                required
                className="w-full px-3.5 py-2.5 pl-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 transition-colors"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
              <Key className="w-4.5 h-4.5 text-slate-400 absolute left-3 top-3" />
            </div>
          </div>

          {/* Remember Me checkbox */}
          <div className="flex items-center space-x-2 pb-2">
            <input
              id="email_remember_me"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
            />
            <label htmlFor="email_remember_me" className="text-[11px] font-bold text-slate-500 dark:text-slate-400 select-none cursor-pointer">
              Remember me on this device
            </label>
          </div>

          {/* Action button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center justify-center space-x-2 cursor-pointer"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4.5 h-4.5 animate-spin text-white" />
                <span>Authenticating secure profile...</span>
              </>
            ) : (
              <>
                {isSignUp ? (
                  <>
                    <UserPlus className="w-4.5 h-4.5 mr-1" />
                    <span>Create Profile & Sign Up</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4.5 h-4.5 mr-1" />
                    <span>Log In to StudyMate</span>
                  </>
                )}
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </button>
        </form>

      </motion.div>
    </div>
  );
}
