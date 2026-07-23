export interface UserProfile {
  fullName: string;
  nickname?: string;
  profilePhoto?: string; // Base64 data or default emoji
  schoolName: string;
  classGrade: string;
  section: string;
  rollNumber?: string;
  dateOfBirth: string;
  gender?: string;
  city: string;
  state: string;
  country: string;
  targetExam: string; // "Board Exam" | "JEE" | "NEET" | "UPSC" | "SATS" | "Custom"
  dailyStudyGoal: number; // in hours
  preferredStudyTime: string; // "Morning" | "Afternoon" | "Evening" | "Late Night"
  favoriteSubjects: string[];
  weakSubjects: string[];
  emailAddress: string;
  phoneNumber?: string;
  
  // Gamification properties
  xp: number;
  level: number;
  badges: string[]; // Badge ID array
  unlockedFeatures: string[];
  avatar: string;
  totalStudyHours: number;

  // Login streak & custom assessment parameters
  streakCounter?: number;
  lastLoginDate?: string;
  lastTestTimestamp?: number;
}

export interface Task {
  id: string;
  title: string;
  priority: "High" | "Medium" | "Low";
  deadline: string; // YYYY-MM-DD
  notes?: string;
  subjectTag: string;
  completed: boolean;
  dateCreated: string;
  // Premium workspace optional properties
  estimatedTime?: number; // in minutes
  progress?: number; // 0 to 100
  reminderSet?: boolean;
  completedDate?: string; // YYYY-MM-DD
}

export interface Alarm {
  id: string;
  label: string;
  subject: string;
  time: string; // "HH:MM"
  repeatDays: number[]; // 0 = Sunday, 1 = Monday, etc. Empty means once.
  ringtone: string; // "Classic" | "Zen" | "Energetic" | "Cyberpunk"
  vibration: boolean;
  snoozeOption: boolean;
  challengeMode: boolean; // Solve math problem before dismiss
  isActive: boolean;
  triggerTimestamp?: number; // Milliseconds timestamp for absolute alarms
  priority?: "High" | "Medium" | "Low";
  color?: string;
}

export interface TimetableItem {
  id: string;
  day: string; // "Monday", "Tuesday", etc.
  time: string; // "04:00 PM - 05:30 PM"
  subject: string;
  topic: string;
}

export interface Habit {
  id: string;
  name: string;
  icon: string; // Emoji
  datesCompleted: string[]; // Array of YYYY-MM-DD
  color: string; // CSS color or Tailwind class
  subject?: string;
  reminderTime?: string;
  difficulty?: "Easy" | "Medium" | "Hard";
  xpReward?: number;
}

export interface ScannedQuestion {
  id: string;
  imageUri?: string;
  ocrText: string;
  subject: string;
  topic: string;
  steps: string[];
  finalAnswer: string;
  conceptualExplanation: string;
  tips: string[];
  practiceQuestions: string[];
  timestamp: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: "info" | "alert" | "success" | "reminder";
  timestamp: string;
  read: boolean;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string; // Lucide icon name or Emoji
  xpRequired: number;
  category: "tasks" | "alarms" | "habits" | "pomodoro" | "study" | "general";
  unlocked: boolean;
}

export interface DailyActivity {
  date: string; // YYYY-MM-DD
  studyMinutes: number;
  tasksCompleted: number;
  habitsCompleted: number;
  pomodorosDone: number;
}

export const getStudentRank = (xp: number) => {
  if (xp < 300) return { name: "Novice Scholar", symbol: "🌱", color: "text-slate-500 bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800" };
  if (xp < 600) return { name: "Bronze Academic", symbol: "🥉", color: "text-amber-700 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/30" };
  if (xp < 1000) return { name: "Silver Intellectual", symbol: "🥈", color: "text-slate-400 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800" };
  if (xp < 1500) return { name: "Gold Polymath", symbol: "🥇", color: "text-yellow-600 bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900/30" };
  if (xp < 2100) return { name: "Platinum Champion", symbol: "🏆", color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900/30" };
  if (xp < 3000) return { name: "Diamond Mastermind", symbol: "💎", color: "text-sky-600 bg-sky-50 dark:bg-sky-950/20 border-sky-200 dark:border-sky-900/30" };
  return { name: "Elite Board Topper", symbol: "👑", color: "text-rose-600 bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/30" };
};
