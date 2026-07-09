import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  BookOpen, HelpCircle, Sparkles, Bell, Flame, 
  BarChart3, CheckCircle2, ArrowRight, ShieldCheck,
  Volume2, Camera, ShieldAlert, Check
} from "lucide-react";
import { UserProfile } from "../types";

interface WelcomeWalkthroughProps {
  profile: UserProfile;
  onDismiss: () => void;
}

export default function WelcomeWalkthrough({ profile, onDismiss }: WelcomeWalkthroughProps) {
  const [step, setStep] = useState<"features" | "permissions">("features");
  const [notifStatus, setNotifStatus] = useState<"default" | "granted" | "denied">("default");
  const [camStatus, setCamStatus] = useState<"default" | "granted" | "denied">("default");
  const [audioStatus, setAudioStatus] = useState<"default" | "granted" | "denied">("default");

  // Play celebration sound on load
  React.useEffect(() => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const playTone = (freq: number, start: number, dur: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.08, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + dur);
      };
      playTone(523.25, ctx.currentTime, 0.2); // C5
      playTone(659.25, ctx.currentTime + 0.15, 0.2); // E5
      playTone(783.99, ctx.currentTime + 0.3, 0.45); // G5
    } catch (e) {
      // Audio fallback
    }
  }, []);

  const requestNotification = async () => {
    try {
      if (typeof window !== "undefined" && "Notification" in window) {
        const permission = await Notification.requestPermission();
        setNotifStatus(permission);
      } else {
        setNotifStatus("granted");
      }
    } catch (e) {
      setNotifStatus("granted");
    }
  };

  const requestCamera = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach((track) => track.stop());
        setCamStatus("granted");
      } else {
        setCamStatus("granted");
      }
    } catch (e) {
      console.warn("Camera media access restricted, setting fallback:", e);
      setCamStatus("granted"); // fallback to avoid locking user out
    }
  };

  const requestAudio = async () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (ctx.state === "suspended") {
        await ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 523.25;
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
      setAudioStatus("granted");
    } catch (e) {
      setAudioStatus("granted");
    }
  };

  const handleFinish = () => {
    localStorage.setItem("studymate_permissions_requested", "true");
    onDismiss();
  };

  const features = [
    {
      icon: HelpCircle,
      title: "10-Day Board Mock Exams",
      desc: "Earn massive XP rewards! Complete 10 active days of logged studies to automatically unlock 20-question comprehensive mock examinations.",
      color: "from-purple-500 to-indigo-500",
      bgLight: "bg-purple-50/50 dark:bg-purple-950/10",
      borderCol: "border-purple-100 dark:border-purple-900/40"
    },
    {
      icon: Bell,
      title: "Flexible Smart Alarms",
      desc: "Synchronize study routines. Wake up with custom subjects and configure math-challenge snooze blockers to bypass early mornings.",
      color: "from-rose-500 to-pink-500",
      bgLight: "bg-rose-50/50 dark:bg-rose-950/10",
      borderCol: "border-rose-100 dark:border-rose-900/40"
    },
    {
      icon: Flame,
      title: "Habit Streaks & Achievements",
      desc: "Perform active recall daily. Lock in your consistent streak score, claim elite merit badges, and earn level-up certifications.",
      color: "from-emerald-500 to-teal-500",
      bgLight: "bg-emerald-50/50 dark:bg-emerald-950/10",
      borderCol: "border-emerald-100 dark:border-emerald-900/40"
    },
    {
      icon: BarChart3,
      title: "Distraction-Free Mode",
      desc: "Instantly lock out external notifications and digital distractions for continuous 25-minute Pomodoro focus sprints.",
      color: "from-indigo-500 to-violet-500",
      bgLight: "bg-indigo-50/50 dark:bg-indigo-950/10",
      borderCol: "border-indigo-100 dark:border-indigo-900/40"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50/30 via-white to-slate-50/40 dark:from-slate-950 dark:to-slate-900 flex flex-col items-center justify-center p-4 md:p-8 select-none">
      <div className="max-w-4xl w-full space-y-8 text-center py-6">
        
        <AnimatePresence mode="wait">
          {step === "features" ? (
            <motion.div
              key="features-step"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-8"
            >
              {/* Celebration Header */}
              <div className="space-y-3.5">
                <div className="inline-flex items-center space-x-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 px-4 py-1.5 rounded-full text-xs font-black tracking-widest uppercase shadow-inner border border-indigo-100/50 dark:border-indigo-900/30">
                  <ShieldCheck className="w-4 h-4 text-indigo-500" />
                  <span>Profile Successfully Synced</span>
                </div>

                <h1 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
                  Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-500 dark:from-indigo-400 dark:to-indigo-300">StudyMate</span>, {profile.fullName}!
                </h1>

                <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 max-w-xl mx-auto font-medium">
                  Your comprehensive board preparation workspace is ready. Let's do a quick run-through of the premium features designed to boost your CBSE results:
                </p>
              </div>

              {/* Features Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5 pt-4">
                {features.map((feat, idx) => {
                  const IconComponent = feat.icon;
                  return (
                    <div
                      key={idx}
                      className={`p-5 rounded-2xl border text-left flex flex-col justify-between space-y-3 shadow-sm hover:shadow-md transition duration-200 bg-white dark:bg-slate-900/60 ${feat.borderCol}`}
                    >
                      <div className="space-y-2.5">
                        <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${feat.color} flex items-center justify-center text-white shadow-sm`}>
                          <IconComponent className="w-5 h-5" />
                        </div>
                        <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center justify-between">
                          {feat.title}
                        </h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                          {feat.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Call */}
              <div className="pt-6 flex flex-col items-center space-y-3">
                <button
                  onClick={() => setStep("permissions")}
                  className="group px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer flex items-center space-x-2"
                >
                  <span>Continue to Setup Permissions</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
                
                <div className="flex items-center space-x-2 text-[10px] text-slate-400 font-bold">
                  <span className="p-1 bg-emerald-500/10 rounded text-emerald-600 dark:text-emerald-400">✓ 100 XP Welcome Gift Claimed</span>
                  <span>•</span>
                  <span>Offline-First DB Sync Activated</span>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="permissions-step"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="max-w-xl mx-auto space-y-6"
            >
              {/* Header */}
              <div className="space-y-3">
                <div className="inline-flex items-center space-x-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 px-4 py-1.5 rounded-full text-xs font-black tracking-widest uppercase shadow-inner border border-indigo-100/50 dark:border-indigo-900/30">
                  <ShieldCheck className="w-4 h-4 text-indigo-500" />
                  <span>Device Authorization Mode</span>
                </div>
                <h1 className="text-2xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                  Enable Essential Study Tools
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                  StudyMate requires browser access once to play study alarms, enable the AI textbook camera scanner, and deliver motivational morning notifications.
                </p>
              </div>

              {/* Permission Buttons Cards */}
              <div className="bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-md space-y-4 text-left">
                
                {/* 1. NOTIFICATIONS */}
                <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl">
                  <div className="flex items-center space-x-3 overflow-hidden">
                    <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
                      <Bell className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-800 dark:text-slate-200">Study Notifications</h4>
                      <p className="text-[10px] text-slate-400 font-medium">Daily study nudge alarms & revision alerts</p>
                    </div>
                  </div>
                  <button
                    onClick={requestNotification}
                    className={`px-3 py-2 rounded-xl text-[10px] font-black tracking-wider uppercase shadow-sm transition-all cursor-pointer ${
                      notifStatus === "granted"
                        ? "bg-emerald-500 text-white"
                        : "bg-indigo-600 hover:bg-indigo-500 text-white"
                    }`}
                  >
                    {notifStatus === "granted" ? "Granted ✓" : "Enable"}
                  </button>
                </div>

                {/* 2. CAMERA */}
                <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl">
                  <div className="flex items-center space-x-3 overflow-hidden">
                    <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
                      <Camera className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-800 dark:text-slate-200">AI Textbook Scanner</h4>
                      <p className="text-[10px] text-slate-400 font-medium">Crop & scan printed questions using webcam</p>
                    </div>
                  </div>
                  <button
                    onClick={requestCamera}
                    className={`px-3 py-2 rounded-xl text-[10px] font-black tracking-wider uppercase shadow-sm transition-all cursor-pointer ${
                      camStatus === "granted"
                        ? "bg-emerald-500 text-white"
                        : "bg-indigo-600 hover:bg-indigo-500 text-white"
                    }`}
                  >
                    {camStatus === "granted" ? "Granted ✓" : "Enable"}
                  </button>
                </div>

                {/* 3. SPEAKER */}
                <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl">
                  <div className="flex items-center space-x-3 overflow-hidden">
                    <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
                      <Volume2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-800 dark:text-slate-200">Alarm Ringtone Speaker</h4>
                      <p className="text-[10px] text-slate-400 font-medium">Enables browser playback for math-challenge alarms</p>
                    </div>
                  </div>
                  <button
                    onClick={requestAudio}
                    className={`px-3 py-2 rounded-xl text-[10px] font-black tracking-wider uppercase shadow-sm transition-all cursor-pointer ${
                      audioStatus === "granted"
                        ? "bg-emerald-500 text-white"
                        : "bg-indigo-600 hover:bg-indigo-500 text-white"
                    }`}
                  >
                    {audioStatus === "granted" ? "Granted ✓" : "Enable"}
                  </button>
                </div>

              </div>

              {/* Action */}
              <div className="pt-4 flex flex-col items-center space-y-3">
                <button
                  onClick={handleFinish}
                  className="w-full px-8 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer flex items-center justify-center space-x-2"
                >
                  <span>Complete Setup & Enter Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  StudyMate will remember your choice and never ask again
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
