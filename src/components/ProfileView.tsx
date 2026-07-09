import React, { useState } from "react";
import { UserProfile, Badge, getStudentRank } from "../types";
import { 
  User, Mail, GraduationCap, Award, Compass, Save, RefreshCw, 
  Trash2, HelpCircle, CheckCircle, Flame, Star, ShieldCheck, HeartPulse
} from "lucide-react";

interface ProfileViewProps {
  profile: UserProfile;
  badges: Badge[];
  onUpdateProfile: (updates: Partial<UserProfile>) => void;
  onResetApp: () => void;
}

const AVATAR_OPTIONS = [
  "🎓", "🧠", "💡", "🎨", "🚀", "🌟", "🔥", "⚡", "🐼", "🦊", "🦁", "🦖"
];

export default function ProfileView({ profile, badges, onUpdateProfile, onResetApp }: ProfileViewProps) {
  const [fullName, setFullName] = useState(profile.fullName);
  const [classGrade, setClassGrade] = useState(profile.classGrade);
  const [targetExam, setTargetExam] = useState(profile.targetExam);
  const [dailyStudyGoal, setDailyStudyGoal] = useState(profile.dailyStudyGoal);
  const [preferredStudyTime, setPreferredStudyTime] = useState(profile.preferredStudyTime);
  const [avatar, setAvatar] = useState(profile.avatar);

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [selectedFavs, setSelectedFavs] = useState<string[]>(profile.favoriteSubjects);
  const [selectedWeaks, setSelectedWeaks] = useState<string[]>(profile.weakSubjects);

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    // Simulate 400ms lag for fluid experience
    setTimeout(() => {
      onUpdateProfile({
        fullName,
        classGrade,
        targetExam,
        dailyStudyGoal,
        preferredStudyTime,
        avatar,
        favoriteSubjects: selectedFavs,
        weakSubjects: selectedWeaks
      });
      setSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    }, 400);
  };

  const handleFavToggle = (sub: string) => {
    if (selectedFavs.includes(sub)) {
      setSelectedFavs(selectedFavs.filter((f) => f !== sub));
    } else {
      setSelectedFavs([...selectedFavs, sub]);
    }
  };

  const handleWeakToggle = (sub: string) => {
    if (selectedWeaks.includes(sub)) {
      setSelectedWeaks(selectedWeaks.filter((w) => w !== sub));
    } else {
      setSelectedWeaks([...selectedWeaks, sub]);
    }
  };

  const subjectPresets = ["Mathematics", "Physics", "Chemistry", "Biology", "English", "History", "Computer Science", "Geography"];

  const unlockedBadges = badges.filter((b) => b.unlocked);

  // Personal study milestones database
  const personalMilestones = [
    { name: "CBSE Syllabus Starter", xp: 100, reward: "🌱 Novice Scholar Status", icon: "📚" },
    { name: "Active Recall Master", xp: 300, reward: "🥉 Bronze Academic Rank", icon: "🧠" },
    { name: "Pomodoro Focus Champion", xp: 600, reward: "🥈 Silver Intellectual Title", icon: "⏱️" },
    { name: "Mock Test Conqueror", xp: 1000, reward: "🥇 Gold Polymath Shield", icon: "🏆" },
    { name: "Elite Board Topper Rank", xp: 1500, reward: "👑 Elite Board Topper Rank", icon: "👑" },
  ];

  return (
    <div id="profile_tab" className="space-y-6">

      {/* HEADER CARD */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div className="flex items-center space-x-4">
          <span className="text-5xl p-2 bg-slate-50 dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
            {profile.avatar}
          </span>
          <div>
            <h1 className="text-xl font-black text-slate-800 dark:text-slate-100 flex flex-wrap items-center gap-2">
              <span>{profile.fullName}</span>
              <span className="text-[10px] font-extrabold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded uppercase">
                Lv. {profile.level}
              </span>
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded border flex items-center space-x-1 ${getStudentRank(profile.xp).color}`}>
                <span>{getStudentRank(profile.xp).symbol}</span>
                <span>{getStudentRank(profile.xp).name}</span>
              </span>
              <span className="text-[10px] font-black bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/30 px-2 py-0.5 rounded uppercase flex items-center space-x-1 shadow-sm">
                <span>🏅 Active Student</span>
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">{profile.classGrade} student preparing for {profile.targetExam}</p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-xs text-slate-400 font-semibold block uppercase">Total Study XP</span>
          <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{profile.xp} XP</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Profile Modification Form */}
        <form onSubmit={handleUpdate} className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-5">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">Update Student Profile</h3>
            {saveSuccess && (
              <span className="text-xs font-bold text-emerald-500 flex items-center animate-pulse">
                <CheckCircle className="w-4 h-4 mr-1" /> Profile saved successfully!
              </span>
            )}
          </div>

          {/* Avatar selector */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">Choose Student Avatar</label>
            <div className="flex flex-wrap gap-2">
              {AVATAR_OPTIONS.map((av) => (
                <button
                  key={av}
                  type="button"
                  onClick={() => setAvatar(av)}
                  className={`text-2xl p-2 bg-slate-50 dark:bg-slate-800 hover:scale-110 active:scale-95 transition-all rounded-2xl border ${
                    avatar === av 
                      ? "border-indigo-600 ring-2 ring-indigo-500/15" 
                      : "border-slate-100 dark:border-slate-800"
                  }`}
                >
                  {av}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input 
                  type="text" 
                  className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Grade / Year</label>
              <div className="relative">
                <GraduationCap className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input 
                  type="text" 
                  className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500"
                  value={classGrade}
                  onChange={(e) => setClassGrade(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Target Academic Exam</label>
              <input 
                type="text" 
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500"
                value={targetExam}
                onChange={(e) => setTargetExam(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Daily Goal (Hours)</label>
              <input 
                type="number" 
                min="1" 
                max="12"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500"
                value={dailyStudyGoal}
                onChange={(e) => setDailyStudyGoal(parseInt(e.target.value))}
                required
              />
            </div>
          </div>

          {/* Subjects selectors grids */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 dark:border-slate-800/60 pt-4">
            {/* Fav subjects */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400">Select Strong Subjects</label>
              <div className="flex flex-wrap gap-1.5">
                {subjectPresets.map((sub) => {
                  const selected = selectedFavs.includes(sub);
                  return (
                    <button
                      key={sub}
                      type="button"
                      onClick={() => handleFavToggle(sub)}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded border transition ${
                        selected 
                          ? "bg-indigo-50 border-indigo-300 text-indigo-600 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-400" 
                          : "bg-transparent border-slate-200 dark:border-slate-800 text-slate-400"
                      }`}
                    >
                      {sub}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Weak subjects */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400">Select Weak Subjects (AI Priority)</label>
              <div className="flex flex-wrap gap-1.5">
                {subjectPresets.map((sub) => {
                  const selected = selectedWeaks.includes(sub);
                  return (
                    <button
                      key={sub}
                      type="button"
                      onClick={() => handleWeakToggle(sub)}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded border transition ${
                        selected 
                          ? "bg-rose-50 border-rose-300 text-rose-600 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-400" 
                          : "bg-transparent border-slate-200 dark:border-slate-800 text-slate-400"
                      }`}
                    >
                      {sub}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center space-x-2 cursor-pointer"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{saving ? "Saving Updates..." : "Save Profile Configuration"}</span>
          </button>
        </form>

        {/* Gamification trophies sidebar review */}
        <div className="space-y-6">

          {/* PERSONAL STUDY MILESTONES */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
            <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm flex items-center justify-between">
              <span className="flex items-center">
                <Compass className="w-4.5 h-4.5 text-amber-500 mr-1.5" />
                Personal Study Milestones
              </span>
              <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded font-black border border-indigo-200/40 dark:border-indigo-900/30 shadow-sm">
                {personalMilestones.filter(m => profile.xp >= m.xp).length} / {personalMilestones.length} Completed
              </span>
            </h3>
            <p className="text-[10px] text-slate-400 leading-normal font-medium">
              Track your individual academic progression. Unlock elite scholar ranks as you study, do revision cards, and complete board mock tests!
            </p>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {personalMilestones.map((milestone) => {
                const isUnlocked = profile.xp >= milestone.xp;
                return (
                  <div 
                    key={milestone.name}
                    className={`flex items-center justify-between p-3 rounded-2xl border text-xs transition-all ${
                      isUnlocked 
                        ? "bg-emerald-50/40 dark:bg-emerald-950/10 border-emerald-200/50" 
                        : "bg-slate-50/50 dark:bg-slate-900/40 border-slate-100/80 dark:border-slate-800/60 opacity-60"
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <span className="text-base">{milestone.icon}</span>
                      <div className="space-y-0.5">
                        <span className="text-[11px] block font-black text-slate-700 dark:text-slate-200 leading-none">
                          {milestone.name}
                        </span>
                        <span className="text-[9px] block text-slate-400 font-semibold">
                          {milestone.reward}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-[10px] font-black ${isUnlocked ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500"}`}>
                        {isUnlocked ? "Unlocked ✓" : `${milestone.xp} XP`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
            <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm flex items-center">
              <Star className="w-4.5 h-4.5 text-yellow-500 mr-1.5" />
              Academic Ranks & Titles
            </h3>
            <p className="text-[10px] text-slate-400 leading-normal">
              Earn Study XP to elevate your scholar status and unlock elite board preparation ranks!
            </p>
            
            <div className="space-y-2 text-[10px] font-semibold text-slate-600 dark:text-slate-400">
              <div className="flex items-center justify-between p-1.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/60">
                <span className="flex items-center gap-1">🌱 Novice Scholar</span>
                <span>0 - 299 XP</span>
              </div>
              <div className="flex items-center justify-between p-1.5 rounded bg-amber-50/40 dark:bg-amber-950/10 border border-amber-100/20">
                <span className="flex items-center gap-1">🥉 Bronze Academic</span>
                <span>300 - 599 XP</span>
              </div>
              <div className="flex items-center justify-between p-1.5 rounded bg-slate-100/50 dark:bg-slate-800/40 border border-slate-200/20">
                <span className="flex items-center gap-1">🥈 Silver Intellectual</span>
                <span>600 - 999 XP</span>
              </div>
              <div className="flex items-center justify-between p-1.5 rounded bg-yellow-50/40 dark:bg-yellow-950/10 border border-yellow-100/20">
                <span className="flex items-center gap-1">🥇 Gold Polymath</span>
                <span>1000 - 1499 XP</span>
              </div>
              <div className="flex items-center justify-between p-1.5 rounded bg-indigo-50/40 dark:bg-indigo-950/10 border border-indigo-100/20">
                <span className="flex items-center gap-1">🏆 Platinum Champion</span>
                <span>1500 - 2099 XP</span>
              </div>
              <div className="flex items-center justify-between p-1.5 rounded bg-sky-50/40 dark:bg-sky-950/10 border border-sky-100/20 font-bold">
                <span className="flex items-center gap-1 text-sky-500">💎 Diamond Mastermind</span>
                <span className="text-sky-500">2100 - 2999 XP</span>
              </div>
              <div className="flex items-center justify-between p-1.5 rounded bg-rose-50/40 dark:bg-rose-950/10 border border-rose-100/20 font-bold animate-pulse">
                <span className="flex items-center gap-1 text-rose-500">👑 Elite Board Topper</span>
                <span className="text-rose-500">3000+ XP</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
            <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm flex items-center">
              <Award className="w-4.5 h-4.5 text-indigo-500 mr-1.5" />
              Achievements ({unlockedBadges.length}/{badges.length})
            </h3>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {badges.map((badge) => (
                <div 
                  key={badge.id}
                  className={`p-3 border rounded-xl flex items-center space-x-3 ${
                    badge.unlocked 
                      ? "bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/20" 
                      : "bg-slate-50/50 dark:bg-slate-900/10 border-slate-100 dark:border-slate-800 opacity-50"
                  }`}
                >
                  <span className="text-2xl">{badge.icon}</span>
                  <div>
                    <h4 className="text-[11px] font-black text-slate-800 dark:text-slate-100">{badge.name}</h4>
                    <span className="text-[9px] text-slate-400 leading-none">{badge.description}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Reset button section */}
          <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 p-5 rounded-3xl space-y-3">
            <h4 className="font-extrabold text-rose-600 dark:text-rose-400 text-xs flex items-center">
              <Trash2 className="w-4 h-4 mr-1" />
              Danger Zone (Account Settings)
            </h4>
            <p className="text-[10px] text-slate-500 leading-normal">
              Reset all application records, tasks lists, alarms scheduled, streaks, local DB caches, and logged hours. This operation cannot be undone.
            </p>
            <button 
              type="button"
              onClick={() => {
                if (confirm("Are you absolutely sure you want to restore default onboarding? All local tasks, habits, and XP logs will be wiped!")) {
                  onResetApp();
                }
              }}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[10px] font-bold shadow-md transition"
            >
              Reset Application & Clear Data
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}
