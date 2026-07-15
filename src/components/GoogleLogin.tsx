import React, { useState } from "react";
import { motion } from "motion/react";
import { Shield, Mail, Key, Info, ArrowRight, RefreshCw, LogIn, UserPlus } from "lucide-react";
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from "../lib/firebase";

interface GoogleLoginProps {
  onLoginSuccess: (email: string, token: string, refreshToken?: string, rememberMe?: boolean) => void;
}

export default function GoogleLogin({ onLoginSuccess }: GoogleLoginProps) {
  const [activeTab, setActiveTab] = useState<"google" | "email">("google");
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

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError("");
    playSound(600, "sine");
    try {
      // Force account selection is configured in googleProvider custom parameters
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      if (!user || !user.email) {
        throw new Error("Failed to retrieve user email from Google OAuth.");
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
        throw new Error(data.error || "Authentication verification failed on the server.");
      }

      playSound(880, "sine");
      onLoginSuccess(data.email, data.token, data.refreshToken, rememberMe);
    } catch (err: any) {
      console.error("Google sign in error:", err);
      setError(err.message || "Google authentication handshake failed.");
      playSound(300, "sawtooth");
    } finally {
      setLoading(false);
    }
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
      if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        errMsg = "Incorrect password. Please verify your password and try again.";
      } else if (err.code === "auth/user-not-found") {
        errMsg = "No study profile matches this email. Toggle to 'Sign Up' to register your profile!";
      } else if (err.code === "auth/email-already-in-use") {
        errMsg = "This email is already registered. Toggle to 'Log In' to access your profile.";
      } else if (err.code === "auth/invalid-email") {
        errMsg = "Please enter a valid email address.";
      } else if (err.code === "auth/weak-password") {
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

        {/* Switch Tabs for Auth Type */}
        <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-2xl border border-slate-150 dark:border-slate-800">
          <button
            type="button"
            onClick={() => {
              setActiveTab("google");
              setError("");
              playSound(450, "sine");
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "google"
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-100/60 dark:border-slate-800"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            Google OAuth
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("email");
              setError("");
              playSound(450, "sine");
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "email"
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-100/60 dark:border-slate-800"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            Email & Password
          </button>
        </div>

        {error && (
          <p className="text-[10px] text-rose-500 font-bold bg-rose-50 dark:bg-rose-950/20 p-2.5 rounded-xl border border-rose-100 dark:border-rose-900/30 flex items-center leading-normal">
            <Info className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
            {error}
          </p>
        )}

        {/* Auth Content based on active tab */}
        {activeTab === "google" ? (
          <div className="space-y-4">
            <div className="p-3 text-center text-[11px] text-slate-400 font-semibold leading-relaxed">
              Log in securely with your Google account. We never permanently save or auto-fill your credentials.
            </div>

            <div className="flex items-center space-x-2 pb-2 justify-center">
              <input
                id="google_remember_me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
              />
              <label htmlFor="google_remember_me" className="text-[11px] font-bold text-slate-500 dark:text-slate-400 select-none cursor-pointer">
                Remember me on this device
              </label>
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={handleGoogleSignIn}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center justify-center space-x-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4.5 h-4.5 animate-spin text-white" />
                  <span>Verifying Google Handshake...</span>
                </>
              ) : (
                <>
                  <span>Sign In with Google Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        ) : (
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
        )}

      </motion.div>
    </div>
  );
}
