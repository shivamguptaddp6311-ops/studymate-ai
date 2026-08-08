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
  onLoginSuccess: (email: string, token: string, refreshToken?: string, rememberMe?: boolean, isSignUp?: boolean) => void;
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

  const fallbackBackendLogin = async (targetEmail: string) => {
    const res = await fetch("/api/auth/guest-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: targetEmail })
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Backend authentication failed.");
    }
    const data = await res.json();
    playSound(880, "sine");
    onLoginSuccess(data.email, data.token, data.refreshToken, rememberMe, isSignUp);
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError("");
    playSound(600, "sine");

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      if (!user || !user.email) {
        throw new Error("Google Sign-In did not return a valid user email.");
      }
      const idToken = await user.getIdToken();

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, idToken })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to synchronize backend session.");
      }

      playSound(880, "sine");
      onLoginSuccess(data.email, data.token, data.refreshToken, rememberMe, isSignUp);
    } catch (err: any) {
      console.warn("Google Popup Sign-In warning/error:", err);
      // Fallback if popup fails or is blocked
      if (email && email.includes("@")) {
        try {
          await fallbackBackendLogin(email.trim());
          return;
        } catch (e) {}
      }
      setError(err.message || "Google Authentication failed. Please try Email login below.");
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

    const cleanEmail = email.trim();

    if (!cleanEmail.includes("@") || !cleanEmail.includes(".")) {
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
        try {
          userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        } catch (signUpErr: any) {
          const errCode = signUpErr?.code || "";
          const errMsg = signUpErr?.message || "";

          // Handle auth/email-already-in-use
          if (errCode === "auth/email-already-in-use" || errMsg.includes("email-already-in-use")) {
            try {
              userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
            } catch (signInErr: any) {
              const signInCode = signInErr?.code || "";
              const signInMsg = signInErr?.message || "";

              if (signInCode === "auth/operation-not-allowed" || signInMsg.includes("operation-not-allowed")) {
                await fallbackBackendLogin(cleanEmail);
                return;
              }

              setIsSignUp(false);
              setError("An account with this email already exists. Switched to Log In mode — please verify your password.");
              playSound(300, "sawtooth");
              setLoading(false);
              return;
            }
          } 
          // Handle auth/operation-not-allowed & network-request-failed
          else if (
            errCode === "auth/operation-not-allowed" || 
            errCode === "auth/network-request-failed" || 
            errMsg.includes("operation-not-allowed") || 
            errMsg.includes("network-request-failed")
          ) {
            await fallbackBackendLogin(cleanEmail);
            return;
          } 
          else {
            throw signUpErr;
          }
        }
      } else {
        // Log In mode
        try {
          userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
        } catch (signInErr: any) {
          const errCode = signInErr?.code || "";
          const errMsg = signInErr?.message || "";

          // Handle user not found -> auto try sign up
          if (errCode === "auth/user-not-found" || errMsg.includes("user-not-found")) {
            try {
              userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
            } catch (autoSignUpErr: any) {
              const autoCode = autoSignUpErr?.code || "";
              const autoMsg = autoSignUpErr?.message || "";

              if (
                autoCode === "auth/operation-not-allowed" || 
                autoCode === "auth/network-request-failed" ||
                autoMsg.includes("operation-not-allowed") || 
                autoMsg.includes("network-request-failed")
              ) {
                await fallbackBackendLogin(cleanEmail);
                return;
              }
              throw autoSignUpErr;
            }
          } 
          // Handle auth/operation-not-allowed & network-request-failed
          else if (
            errCode === "auth/operation-not-allowed" || 
            errCode === "auth/network-request-failed" ||
            errMsg.includes("operation-not-allowed") || 
            errMsg.includes("network-request-failed")
          ) {
            await fallbackBackendLogin(cleanEmail);
            return;
          } 
          else {
            throw signInErr;
          }
        }
      }

      if (userCredential && userCredential.user) {
        const user = userCredential.user;
        const idToken = await user.getIdToken();

        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: user.email, idToken })
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to secure backend session synchronization.");
        }

        playSound(880, "sine");
        onLoginSuccess(data.email, data.token, data.refreshToken, rememberMe, isSignUp);
      } else {
        await fallbackBackendLogin(cleanEmail);
      }
    } catch (err: any) {
      console.warn("Email/Password auth fallback check:", err);
      let errMsg = "Authentication failed.";
      const code = err?.code || "";
      const msg = err?.message || "";

      if (
        code === "auth/operation-not-allowed" || 
        code === "auth/network-request-failed" || 
        msg.includes("operation-not-allowed") || 
        msg.includes("network-request-failed")
      ) {
        // Attempt fallback one more time via backend guest token login
        try {
          await fallbackBackendLogin(cleanEmail);
          return;
        } catch (fErr) {
          errMsg = "Unable to connect to authentication server. Please check your network or try Guest login.";
        }
      } else if (
        code === "auth/wrong-password" || 
        code === "auth/invalid-credential" || 
        msg.includes("wrong-password") || 
        msg.includes("invalid-credential")
      ) {
        errMsg = "Incorrect password. Please verify your password and try again.";
      } else if (code === "auth/user-not-found" || msg.includes("user-not-found")) {
        errMsg = "Account not found.";
      } else if (code === "auth/email-already-in-use" || msg.includes("email-already-in-use")) {
        errMsg = "This email address is already in use. Try logging in instead.";
      } else if (code === "auth/invalid-email" || msg.includes("invalid-email")) {
        errMsg = "Please enter a valid email address.";
      } else if (code === "auth/weak-password" || msg.includes("weak-password")) {
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

        {/* Google Sign-In Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full py-3 px-4 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm transition flex items-center justify-center space-x-2.5 cursor-pointer disabled:opacity-60"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Continue with Google Account</span>
        </button>

        <div className="relative flex items-center justify-center my-2">
          <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
          <span className="bg-white dark:bg-slate-900 px-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest absolute">
            Or use email
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

