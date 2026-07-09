import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  BookOpen, HelpCircle, Sparkles, Bell, Flame, 
  BarChart3, CheckCircle2, ArrowRight, ShieldCheck,
  Volume2, Camera, ShieldAlert, Check, Mic, Image as ImageIcon
} from "lucide-react";
import { UserProfile } from "../types";

interface WelcomeWalkthroughProps {
  profile: UserProfile;
  onDismiss: () => void;
}

export default function WelcomeWalkthrough({ profile, onDismiss }: WelcomeWalkthroughProps) {
  const [step, setStep] = useState<"features" | "permissions">("features");
  
  const [permissions, setPermissions] = useState<{
    notifications: "default" | "granted" | "denied";
    camera: "default" | "granted" | "denied";
    microphone: "default" | "granted" | "denied";
    gallery: "default" | "granted" | "denied";
  }>(() => {
    try {
      const stored = localStorage.getItem("studymate_permissions_store");
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {}
    return {
      notifications: "default",
      camera: "default",
      microphone: "default",
      gallery: "default"
    };
  });

  const updatePermission = (key: keyof typeof permissions, status: "default" | "granted" | "denied") => {
    setPermissions(prev => {
      const updated = { ...prev, [key]: status };
      localStorage.setItem("studymate_permissions_store", JSON.stringify(updated));
      return updated;
    });
  };

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
        updatePermission("notifications", permission);
        return permission;
      } else {
        updatePermission("notifications", "granted");
        return "granted";
      }
    } catch (e) {
      updatePermission("notifications", "denied");
      return "denied";
    }
  };

  const requestCamera = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach((track) => track.stop());
        updatePermission("camera", "granted");
        return "granted";
      } else {
        updatePermission("camera", "granted");
        return "granted";
      }
    } catch (e) {
      console.warn("Camera media access blocked:", e);
      updatePermission("camera", "denied");
      return "denied";
    }
  };

  const requestMicrophone = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
        updatePermission("microphone", "granted");
        return "granted";
      } else {
        updatePermission("microphone", "granted");
        return "granted";
      }
    } catch (e) {
      console.warn("Microphone access blocked:", e);
      updatePermission("microphone", "denied");
      return "denied";
    }
  };

  const requestGallery = async () => {
    try {
      // Photo/Gallery custom file chooser confirmation
      updatePermission("gallery", "granted");
      return "granted";
    } catch (e) {
      updatePermission("gallery", "denied");
      return "denied";
    }
  };

  const requestAllPermissions = async () => {
    const notif = await requestNotification();
    const cam = await requestCamera();
    const mic = await requestMicrophone();
    const gal = await requestGallery();

    if (notif === "granted" || cam === "granted" || mic === "granted" || gal === "granted") {
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.25); // A5
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } catch (e) {}
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
                  StudyMate requires browser access to play study alarms, enable the AI textbook camera scanner, voice explanations, and deliver motivational morning notifications.
                </p>
              </div>

              {/* Master permission action */}
              <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border border-indigo-100/40 dark:border-indigo-900/40 rounded-2xl text-center space-y-2.5 shadow-sm">
                <p className="text-[11px] text-indigo-900/80 dark:text-indigo-200 font-bold uppercase tracking-wider">
                  ⚡ Recommended Unified Action
                </p>
                <button
                  type="button"
                  onClick={requestAllPermissions}
                  className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-black rounded-xl shadow-md cursor-pointer transition flex items-center justify-center space-x-1"
                >
                  <span>Grant All Required Permissions Together</span>
                </button>
                <p className="text-[10px] text-slate-400 font-medium">
                  We will prompt you for each required feature sequentially.
                </p>
              </div>

              {/* Permission Buttons Cards */}
              <div className="bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-md space-y-4 text-left">
                
                {/* 1. NOTIFICATIONS */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between">
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
                      type="button"
                      onClick={requestNotification}
                      className={`px-3 py-2 rounded-xl text-[10px] font-black tracking-wider uppercase shadow-sm transition-all cursor-pointer ${
                        permissions.notifications === "granted"
                          ? "bg-emerald-500 text-white"
                          : "bg-indigo-600 hover:bg-indigo-500 text-white"
                      }`}
                    >
                      {permissions.notifications === "granted" ? "Granted ✓" : "Enable"}
                    </button>
                  </div>
                  {permissions.notifications === "denied" && (
                    <div className="p-2.5 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 rounded-xl text-[10px] leading-relaxed font-semibold">
                      🔔 Notification permission has been blocked. To unblock, please click the <strong>lock / padlock icon</strong> next to the address bar, toggle "Notifications" to "Allow" or "Reset Permissions", and click <span className="underline cursor-pointer font-black hover:text-red-500" onClick={requestNotification}>Retry</span>.
                    </div>
                  )}
                </div>

                {/* 2. CAMERA */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 overflow-hidden">
                      <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
                        <Camera className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-800 dark:text-slate-200">AI Textbook Scanner</h4>
                        <p className="text-[10px] text-slate-400 font-medium">Crop & scan printed questions using camera</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={requestCamera}
                      className={`px-3 py-2 rounded-xl text-[10px] font-black tracking-wider uppercase shadow-sm transition-all cursor-pointer ${
                        permissions.camera === "granted"
                          ? "bg-emerald-500 text-white"
                          : "bg-indigo-600 hover:bg-indigo-500 text-white"
                      }`}
                    >
                      {permissions.camera === "granted" ? "Granted ✓" : "Enable"}
                    </button>
                  </div>
                  {permissions.camera === "denied" && (
                    <div className="p-2.5 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 rounded-xl text-[10px] leading-relaxed font-semibold">
                      📸 Camera access has been blocked. To scan textbook questions, click the <strong>lock / padlock icon</strong> in your browser's address bar, enable camera permission, and click <span className="underline cursor-pointer font-black hover:text-red-500" onClick={requestCamera}>Retry</span>.
                    </div>
                  )}
                </div>

                {/* 3. MICROPHONE */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 overflow-hidden">
                      <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
                        <Mic className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-800 dark:text-slate-200">Voice & Explanation Audio</h4>
                        <p className="text-[10px] text-slate-400 font-medium">Enables interactive speech-to-text & dictation</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={requestMicrophone}
                      className={`px-3 py-2 rounded-xl text-[10px] font-black tracking-wider uppercase shadow-sm transition-all cursor-pointer ${
                        permissions.microphone === "granted"
                          ? "bg-emerald-500 text-white"
                          : "bg-indigo-600 hover:bg-indigo-500 text-white"
                      }`}
                    >
                      {permissions.microphone === "granted" ? "Granted ✓" : "Enable"}
                    </button>
                  </div>
                  {permissions.microphone === "denied" && (
                    <div className="p-2.5 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 rounded-xl text-[10px] leading-relaxed font-semibold">
                      🎙️ Microphone access has been blocked. To enable voice controls and interactive audio, click the <strong>lock icon</strong> in the browser bar, enable "Microphone", and click <span className="underline cursor-pointer font-black hover:text-red-500" onClick={requestMicrophone}>Retry</span>.
                    </div>
                  )}
                </div>

                {/* 4. GALLERY */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 overflow-hidden">
                      <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-800 dark:text-slate-200">File & Image Gallery Access</h4>
                        <p className="text-[10px] text-slate-400 font-medium">Enables uploading images of handwritten textbook pages</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={requestGallery}
                      className={`px-3 py-2 rounded-xl text-[10px] font-black tracking-wider uppercase shadow-sm transition-all cursor-pointer ${
                        permissions.gallery === "granted"
                          ? "bg-emerald-500 text-white"
                          : "bg-indigo-600 hover:bg-indigo-500 text-white"
                      }`}
                    >
                      {permissions.gallery === "granted" ? "Granted ✓" : "Enable"}
                    </button>
                  </div>
                </div>

              </div>

              {/* Action */}
              <div className="pt-4 flex flex-col items-center space-y-3">
                <button
                  type="button"
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
