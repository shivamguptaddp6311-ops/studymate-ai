import { Badge } from "./types";

export const DEFAULT_BADGES: Badge[] = [
  {
    id: "day1",
    name: "Day 1 Scholar",
    description: "Successfully set up your StudyMate profile!",
    icon: "🎓",
    xpRequired: 10,
    category: "general",
    unlocked: true
  },
  {
    id: "task_crusher_1",
    name: "Task Crusher I",
    description: "Complete your first 3 productivity tasks.",
    icon: "⚡",
    xpRequired: 100,
    category: "tasks",
    unlocked: false
  },
  {
    id: "focus_master",
    name: "Pomodoro Pioneer",
    description: "Complete a full 25-minute study focus session.",
    icon: "⏱️",
    xpRequired: 150,
    category: "pomodoro",
    unlocked: false
  },
  {
    id: "habit_champion",
    name: "Habit Builder",
    description: "Complete a habit 3 times.",
    icon: "🌱",
    xpRequired: 200,
    category: "habits",
    unlocked: false
  },
  {
    id: "social_scholar",
    name: "Social Scholar",
    description: "Join and contribute to the Global Study Community chat.",
    icon: "💬",
    xpRequired: 400,
    category: "general",
    unlocked: false
  },
  {
    id: "consistency_legend",
    name: "Consistency King",
    description: "Unlock by accumulating 500 total study XP points.",
    icon: "👑",
    xpRequired: 500,
    category: "study",
    unlocked: false
  },
  {
    id: "night_owl",
    name: "Night Owl Elite",
    description: "Commit to study discipline during quiet night hours.",
    icon: "🦉",
    xpRequired: 750,
    category: "study",
    unlocked: false
  },
  {
    id: "perfect_recaller",
    name: "Perfect Recaller",
    description: "Score 15+ correct answers in a 10-day comprehensive test.",
    icon: "🎯",
    xpRequired: 1000,
    category: "study",
    unlocked: false
  },
  {
    id: "board_topper_gold",
    name: "Board Topper Golden",
    description: "Acquire 1500 XP to prove ultimate preparation levels.",
    icon: "🏅",
    xpRequired: 1500,
    category: "study",
    unlocked: false
  },
  {
    id: "apex_academic",
    name: "Apex Academic Prime",
    description: "Cross 2500 XP to claim the absolute peak title.",
    icon: "💎",
    xpRequired: 2500,
    category: "general",
    unlocked: false
  },
  {
    id: "daily_streak_3",
    name: "3-Day Streak Legend",
    description: "Keep your StudyMate login streak active for 3 consecutive days.",
    icon: "🔥",
    xpRequired: 300,
    category: "general",
    unlocked: false
  },
  {
    id: "daily_streak_7",
    name: "7-Day Streak Overlord",
    description: "Hold a flawless 7-day continuous learning streak to achieve ultimate discipline.",
    icon: "👑",
    xpRequired: 700,
    category: "study",
    unlocked: false
  },
  {
    id: "voice_learner",
    name: "Auditory Scholar",
    description: "Listen to standard textbook summaries using Voice Explanation.",
    icon: "🔊",
    xpRequired: 180,
    category: "pomodoro",
    unlocked: false
  },
  {
    id: "topper_unlocked",
    name: "Topper Materializer",
    description: "Successfully unlock and study official CBSE Topper Notes.",
    icon: "🏆",
    xpRequired: 600,
    category: "study",
    unlocked: false
  },
  {
    id: "chat_warrior",
    name: "Community Advocate",
    description: "Make an impactful contribution to the global chat room.",
    icon: "🗣️",
    xpRequired: 450,
    category: "general",
    unlocked: false
  },
  {
    id: "perfect_10_test",
    name: "Board Exam Conqueror",
    description: "Unlock by reaching 1200 XP points to display elite academic power.",
    icon: "🌟",
    xpRequired: 1200,
    category: "study",
    unlocked: false
  }
];

export const MOTIVATIONAL_QUOTES = [
  { quote: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { quote: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { quote: "Success is the sum of small efforts, repeated day in and day out.", author: "Robert Collier" },
  { quote: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { quote: "Your talent determines what you can do. Your motivation determines how much you are willing to do.", author: "Lou Holtz" },
  { quote: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
  { quote: "Focus on being productive instead of busy.", author: "Tim Ferriss" },
  { quote: "Procrastination is the thief of time.", author: "Edward Young" }
];

export const SUBJECT_PRESETS = [
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "English Language",
  "English Literature",
  "History",
  "Geography",
  "Civics/Political Science",
  "Economics",
  "Computer Science",
  "General Science",
  "Social Studies"
];

export const EXAM_PRESETS = [
  "CBSE Board Exams",
  "ICSE Board Exams",
  "State Board Exams",
  "JEE Main / Advanced",
  "NEET",
  "UPSC CSE",
  "SAT / ACT",
  "AP Exams",
  "GCSE / A-Levels",
  "IB Diploma",
  "University Finals",
  "Other Competitive Exam"
];

export const DEFAULT_HABITS = [
  { id: "habit-1", name: "Daily Study Sessions", icon: "📚", datesCompleted: [], color: "indigo" },
  { id: "habit-2", name: "Read 10 Pages", icon: "📖", datesCompleted: [], color: "emerald" },
  { id: "habit-3", name: "Hydrate (8 glasses)", icon: "💧", datesCompleted: [], color: "sky" },
  { id: "habit-4", name: "Morning Exercise", icon: "🏃", datesCompleted: [], color: "amber" },
  { id: "habit-5", name: "Meditation / Break", icon: "🧘", datesCompleted: [], color: "rose" },
  { id: "habit-6", name: "Sleep 8 Hours", icon: "🌙", datesCompleted: [], color: "purple" }
];
