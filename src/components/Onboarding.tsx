import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { UserProfile } from "../types";
import { SUBJECT_PRESETS, EXAM_PRESETS } from "../data";
import { 
  BookOpen, Sparkles, Clock, Calendar, ShieldCheck, Trophy, Camera, 
  ArrowRight, ArrowLeft, Check, Compass, GraduationCap, MapPin, 
  Smartphone, User
} from "lucide-react";

interface OnboardingProps {
  onComplete: (profile: UserProfile) => void;
}

const AVATAR_OPTIONS = [
  "🦊", "🦁", "🐼", "🐨", "🦉", "🦕", "🚀", "🎓", "🧠", "🎨", "⚽", "⭐"
];

const WALKTHROUGH_PAGES = [
  {
    title: "All-in-One Study Hub",
    description: "Manage your homework tasks, alarms, calendars, and weekly timetables in one unified sleek dashboard customized just for you.",
    icon: <Compass className="w-16 h-16 text-indigo-500" />,
    color: "from-indigo-500/10 to-purple-500/10"
  },
  {
    title: "10-Day Board Mock Exams",
    description: "Complete 10 active days of logged studies to automatically unlock 20-question comprehensive mock board examinations.",
    icon: <GraduationCap className="w-16 h-16 text-amber-500" />,
    color: "from-amber-500/10 to-orange-500/10"
  },
  {
    title: "Gamified Habit Tracker",
    description: "Keep daily streaks, complete math challenge alarms, finish study goals, and climb the productivity rankings to unlock legendary badges!",
    icon: <Trophy className="w-16 h-16 text-emerald-500" />,
    color: "from-emerald-500/10 to-teal-500/10"
  },
  {
    title: "Focus Pomodoro & Stats",
    description: "Harness the scientific Pomodoro technique, block out distractions with Focus Mode, and visualize your deep study analytics effortlessly.",
    icon: <Clock className="w-16 h-16 text-rose-500" />,
    color: "from-rose-500/10 to-pink-500/10"
  }
];

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [slideIndex, setSlideIndex] = useState(0); // 0-3 for Walkthrough, 4 for Details Setup, 5 for Academic Setup, 6 for Goal Setup
  const [formData, setFormData] = useState<Partial<UserProfile>>({
    fullName: "",
    nickname: "",
    profilePhoto: "🎓",
    schoolName: "",
    classGrade: "Grade 10",
    section: "A",
    rollNumber: "",
    dateOfBirth: "",
    gender: "Prefer not to say",
    city: "",
    state: "",
    country: "India",
    targetExam: "Board Exam",
    dailyStudyGoal: 4,
    preferredStudyTime: "Evening",
    favoriteSubjects: [],
    weakSubjects: [],
    emailAddress: "",
    phoneNumber: "",
    xp: 10,
    level: 1,
    badges: ["day1"],
    unlockedFeatures: ["dashboard"]
  });

  const [customPhoto, setCustomPhoto] = useState<string | null>(null);
  const [photoMode, setPhotoMode] = useState<"emoji" | "upload">("emoji");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 4) {
      // Personal Details
      if (!formData.fullName?.trim()) newErrors.fullName = "Full Name is required";
      if (!formData.emailAddress?.trim()) {
        newErrors.emailAddress = "Email Address is required";
      } else if (!/\S+@\S+\.\S+/.test(formData.emailAddress)) {
        newErrors.emailAddress = "Please enter a valid email address";
      }
      if (!formData.dateOfBirth) newErrors.dateOfBirth = "Date of Birth is required";
      if (!formData.city?.trim()) newErrors.city = "City is required";
      if (!formData.state?.trim()) newErrors.state = "State is required";
    }

    if (step === 5) {
      // Academic details
      if (!formData.schoolName?.trim()) newErrors.schoolName = "School or College Name is required";
      if (!formData.classGrade?.trim()) newErrors.classGrade = "Class/Grade is required";
      if (!formData.section?.trim()) newErrors.section = "Section is required";
    }

    if (step === 6) {
      // Goals
      if (!formData.dailyStudyGoal || formData.dailyStudyGoal <= 0) {
        newErrors.dailyStudyGoal = "Daily goal must be at least 1 hour";
      }
      if (formData.favoriteSubjects?.length === 0) {
        newErrors.favoriteSubjects = "Select at least one favorite subject";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (slideIndex < 4) {
      setSlideIndex(slideIndex + 1);
    } else {
      if (validateStep(slideIndex)) {
        if (slideIndex < 6) {
          setSlideIndex(slideIndex + 1);
        } else {
          // Finished!
          const completeProfile: UserProfile = {
            fullName: formData.fullName || "Student",
            nickname: formData.nickname || formData.fullName?.split(" ")[0] || "Scholar",
            profilePhoto: customPhoto || formData.profilePhoto || "🎓",
            schoolName: formData.schoolName || "Self Study",
            classGrade: formData.classGrade || "Class 10",
            section: formData.section || "A",
            rollNumber: formData.rollNumber,
            dateOfBirth: formData.dateOfBirth || "2010-01-01",
            gender: formData.gender,
            city: formData.city || "",
            state: formData.state || "",
            country: formData.country || "",
            targetExam: formData.targetExam || "Board Exam",
            dailyStudyGoal: formData.dailyStudyGoal || 4,
            preferredStudyTime: formData.preferredStudyTime || "Evening",
            favoriteSubjects: formData.favoriteSubjects || [],
            weakSubjects: formData.weakSubjects || [],
            emailAddress: formData.emailAddress || "student@example.com",
            phoneNumber: formData.phoneNumber,
            xp: 10,
            level: 1,
            badges: ["day1"],
            unlockedFeatures: ["dashboard"],
            avatar: customPhoto || formData.profilePhoto || "🎓",
            totalStudyHours: 0
          };
          onComplete(completeProfile);
        }
      }
    }
  };

  const handleBack = () => {
    if (slideIndex > 0) {
      setSlideIndex(slideIndex - 1);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCustomPhoto(reader.result as string);
        setPhotoMode("upload");
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleSubject = (subject: string, field: "favoriteSubjects" | "weakSubjects") => {
    const current = formData[field] || [];
    if (current.includes(subject)) {
      setFormData({ ...formData, [field]: current.filter((s) => s !== subject) });
    } else {
      // Prevent duplicates between fav and weak if appropriate, or just add
      setFormData({ ...formData, [field]: [...current, subject] });
    }
  };

  const getProgressWidth = () => {
    return `${(slideIndex / 6) * 100}%`;
  };

  return (
    <div id="onboarding_viewport" className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
      
      {/* Container Card */}
      <div id="onboarding_card" className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800/80 overflow-hidden flex flex-col min-h-[620px]">
        
        {/* Top Progress bar */}
        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2">
          <div 
            className="bg-indigo-600 dark:bg-indigo-500 h-full transition-all duration-300"
            style={{ width: getProgressWidth() }}
          />
        </div>

        {/* Content Wrapper */}
        <div className="flex-1 p-6 md:p-8 flex flex-col justify-between">
          <AnimatePresence mode="wait">
            
            {/* WALKTHROUGH SLIDES (0 to 3) */}
            {slideIndex < 4 && (
              <motion.div
                key={`slide-${slideIndex}`}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
                className="flex-1 flex flex-col justify-center text-center items-center py-6"
              >
                <div className={`p-6 rounded-full bg-gradient-to-br ${WALKTHROUGH_PAGES[slideIndex].color} mb-6`}>
                  {WALKTHROUGH_PAGES[slideIndex].icon}
                </div>
                <h1 className="text-3xl font-bold font-sans tracking-tight text-slate-800 dark:text-slate-100 mb-4">
                  {WALKTHROUGH_PAGES[slideIndex].title}
                </h1>
                <p className="text-slate-500 dark:text-slate-400 max-w-md text-base leading-relaxed">
                  {WALKTHROUGH_PAGES[slideIndex].description}
                </p>
                
                {/* Visual Indicators */}
                <div className="flex justify-center space-x-2 mt-8">
                  {WALKTHROUGH_PAGES.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSlideIndex(idx)}
                      className={`w-2.5 h-2.5 rounded-full transition-all ${
                        idx === slideIndex ? "bg-indigo-600 w-6" : "bg-slate-200 dark:bg-slate-700"
                      }`}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {/* STEP 4: Personal Setup */}
            {slideIndex === 4 && (
              <motion.div
                key="slide-4"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
                className="space-y-4 flex-1 flex flex-col"
              >
                <div className="text-center md:text-left mb-2">
                  <span className="text-indigo-600 dark:text-indigo-400 font-semibold text-xs tracking-wider uppercase">Step 1 of 3</span>
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Create Scholar Profile</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Let's set up your personal credentials to tailor your workspace.</p>
                </div>

                {/* Avatar Selection */}
                <div className="flex flex-col items-center space-y-2 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Choose Avatar</label>
                  
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center text-4xl shadow-sm overflow-hidden">
                      {photoMode === "emoji" ? formData.profilePhoto : (
                        <img src={customPhoto || ""} alt="custom avatar" className="w-full h-full object-cover" />
                      )}
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex space-x-1.5 flex-wrap max-w-[280px]">
                        {AVATAR_OPTIONS.slice(0, 8).map((av) => (
                          <button
                            key={av}
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, profilePhoto: av });
                              setPhotoMode("emoji");
                            }}
                            className={`text-xl p-1 hover:scale-115 active:scale-95 transition-all rounded-lg ${
                              formData.profilePhoto === av && photoMode === "emoji" ? "bg-indigo-100 dark:bg-indigo-900 border border-indigo-300" : ""
                            }`}
                          >
                            {av}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center space-x-2">
                        <label className="text-xs text-indigo-600 dark:text-indigo-400 cursor-pointer flex items-center hover:underline font-medium mt-1">
                          <Camera className="w-3.5 h-3.5 mr-1" />
                          Upload Custom Photo
                          <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                        </label>
                        {photoMode === "upload" && (
                          <span className="text-xs text-emerald-500 font-medium mt-1 flex items-center">
                            <Check className="w-3 h-3 mr-0.5" /> Uploaded
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Form fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Full Name *</label>
                    <input
                      type="text"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm outline-none transition"
                      placeholder="e.g. Shivam Gupta"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    />
                    {errors.fullName && <p className="text-xs text-rose-500 mt-1">{errors.fullName}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Nickname (Optional)</label>
                    <input
                      type="text"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm outline-none transition"
                      placeholder="e.g. Shiv"
                      value={formData.nickname}
                      onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Email Address *</label>
                    <input
                      type="email"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm outline-none transition"
                      placeholder="shivamguptaddp6312@gmail.com"
                      value={formData.emailAddress}
                      onChange={(e) => setFormData({ ...formData, emailAddress: e.target.value })}
                    />
                    {errors.emailAddress && <p className="text-xs text-rose-500 mt-1">{errors.emailAddress}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Phone Number (Optional)</label>
                    <input
                      type="text"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm outline-none transition"
                      placeholder="e.g. +91 9876543210"
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Date of Birth *</label>
                    <input
                      type="date"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm outline-none transition"
                      value={formData.dateOfBirth}
                      onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    />
                    {errors.dateOfBirth && <p className="text-xs text-rose-500 mt-1">{errors.dateOfBirth}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Gender</label>
                    <select
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm outline-none transition"
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Non-binary">Non-binary</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">City *</label>
                    <input
                      type="text"
                      placeholder="City"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs outline-none focus:border-indigo-500 transition"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    />
                    {errors.city && <p className="text-[10px] text-rose-500 mt-0.5">{errors.city}</p>}
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">State *</label>
                    <input
                      type="text"
                      placeholder="State"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs outline-none focus:border-indigo-500 transition"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    />
                    {errors.state && <p className="text-[10px] text-rose-500 mt-0.5">{errors.state}</p>}
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">Country</label>
                    <input
                      type="text"
                      placeholder="Country"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs outline-none focus:border-indigo-500 transition"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 5: Academic Setup */}
            {slideIndex === 5 && (
              <motion.div
                key="slide-5"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
                className="space-y-4 flex-1 flex flex-col"
              >
                <div className="text-center md:text-left mb-2">
                  <span className="text-indigo-600 dark:text-indigo-400 font-semibold text-xs tracking-wider uppercase">Step 2 of 3</span>
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">School & Target Exams</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Tell us what and where you are studying so we can calibrate scheduling suggestions.</p>
                </div>

                <div className="space-y-3 flex-1">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">School / Academy Name *</label>
                    <input
                      type="text"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm outline-none transition"
                      placeholder="e.g. DPS International School"
                      value={formData.schoolName}
                      onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                    />
                    {errors.schoolName && <p className="text-xs text-rose-500 mt-1">{errors.schoolName}</p>}
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Class / Grade *</label>
                      <input
                        type="text"
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm outline-none transition"
                        placeholder="e.g. Class 10"
                        value={formData.classGrade}
                        onChange={(e) => setFormData({ ...formData, classGrade: e.target.value })}
                      />
                      {errors.classGrade && <p className="text-xs text-rose-500 mt-1">{errors.classGrade}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Section *</label>
                      <input
                        type="text"
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm outline-none transition"
                        placeholder="A"
                        value={formData.section}
                        onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                      />
                      {errors.section && <p className="text-xs text-rose-500 mt-1">{errors.section}</p>}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Roll Number (Optional)</label>
                    <input
                      type="text"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm outline-none transition"
                      placeholder="e.g. 42"
                      value={formData.rollNumber}
                      onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Target Exam *</label>
                    <select
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm outline-none transition"
                      value={formData.targetExam}
                      onChange={(e) => setFormData({ ...formData, targetExam: e.target.value })}
                    >
                      {EXAM_PRESETS.map((ex) => (
                        <option key={ex} value={ex}>{ex}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 6: Subjects and Goals */}
            {slideIndex === 6 && (
              <motion.div
                key="slide-6"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
                className="space-y-4 flex-1 flex flex-col overflow-y-auto max-h-[550px] pr-1"
              >
                <div className="text-center md:text-left mb-2">
                  <span className="text-indigo-600 dark:text-indigo-400 font-semibold text-xs tracking-wider uppercase">Step 3 of 3</span>
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Study Goal & Subjects</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Set daily timelines and categorize favorite/weak subjects for customized planner insights.</p>
                </div>

                <div className="space-y-4 flex-1">
                  
                  {/* Daily Goal slider */}
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center">
                        <Clock className="w-3.5 h-3.5 mr-1.5 text-indigo-500" />
                        Daily Study Goal (Hours)
                      </label>
                      <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded-lg">
                        {formData.dailyStudyGoal} Hours / day
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="12"
                      className="w-full accent-indigo-600 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer mt-2"
                      value={formData.dailyStudyGoal}
                      onChange={(e) => setFormData({ ...formData, dailyStudyGoal: parseInt(e.target.value) })}
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Consistency is key! Average students start with 3-5 hours daily.</p>
                  </div>

                  {/* Preferred study time */}
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Preferred Study Time</label>
                    <div className="grid grid-cols-2 gap-2">
                      {["Morning", "Afternoon", "Evening", "Late Night"].map((time) => (
                        <button
                          key={time}
                          type="button"
                          onClick={() => setFormData({ ...formData, preferredStudyTime: time })}
                          className={`py-2 px-3 text-xs font-medium rounded-xl border text-center transition ${
                            formData.preferredStudyTime === time 
                              ? "bg-indigo-600 text-white border-indigo-600 shadow-sm" 
                              : "bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50"
                          }`}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Favorite Subjects Selector */}
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Favorite Subjects * <span className="text-[10px] text-indigo-500">(Tap multiple)</span>
                    </label>
                    <div className="flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto p-1 bg-slate-50 dark:bg-slate-800/20 rounded-xl border border-slate-100 dark:border-slate-800">
                      {SUBJECT_PRESETS.map((sub) => {
                        const isFav = formData.favoriteSubjects?.includes(sub);
                        return (
                          <button
                            key={`fav-${sub}`}
                            type="button"
                            onClick={() => toggleSubject(sub, "favoriteSubjects")}
                            className={`px-2.5 py-1 text-xs rounded-lg border transition ${
                              isFav 
                                ? "bg-emerald-500 text-white border-emerald-500 font-medium" 
                                : "bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800"
                            }`}
                          >
                            {sub}
                          </button>
                        );
                      })}
                    </div>
                    {errors.favoriteSubjects && <p className="text-xs text-rose-500 mt-1">{errors.favoriteSubjects}</p>}
                  </div>

                  {/* Weak Subjects Selector */}
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Weak Subjects <span className="text-[10px] text-rose-400">(Needs extra attention)</span>
                    </label>
                    <div className="flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto p-1 bg-slate-50 dark:bg-slate-800/20 rounded-xl border border-slate-100 dark:border-slate-800">
                      {SUBJECT_PRESETS.map((sub) => {
                        const isWeak = formData.weakSubjects?.includes(sub);
                        return (
                          <button
                            key={`weak-${sub}`}
                            type="button"
                            onClick={() => toggleSubject(sub, "weakSubjects")}
                            className={`px-2.5 py-1 text-xs rounded-lg border transition ${
                              isWeak 
                                ? "bg-rose-500 text-white border-rose-500 font-medium" 
                                : "bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800"
                            }`}
                          >
                            {sub}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                </div>
              </motion.div>
            )}

          </AnimatePresence>

          {/* Action Buttons */}
          <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4 mt-6">
            <button
              type="button"
              onClick={handleBack}
              disabled={slideIndex === 0}
              className={`flex items-center text-xs font-semibold px-4 py-2.5 rounded-xl transition ${
                slideIndex === 0 
                  ? "text-slate-300 dark:text-slate-700 cursor-not-allowed" 
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Back
            </button>

            <button
              type="button"
              onClick={handleNext}
              className="flex items-center text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl shadow-md active:scale-98 transition"
            >
              {slideIndex === 6 ? "Finish Setup" : slideIndex >= 4 ? "Next Step" : "Get Started"}
              {slideIndex === 6 ? <Check className="w-4 h-4 ml-1.5" /> : <ArrowRight className="w-4 h-4 ml-1.5" />}
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}
