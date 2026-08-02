import { UserProfile } from "../../types";

export interface VideoSegment {
  order: number;
  total: number;
  status: "pending" | "generating" | "completed" | "failed";
  videoUrl?: string;
  label: string;
}

export interface VideoSettingsPickerData {
  topic: string;
  forMessageId: string;
}

export interface VideoSettings {
  quality: "540p" | "720p" | "1080p";
  aspectRatio: "16:9" | "9:16" | "1:1";
  depth: "overview" | "full";
  topic: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "model";
  text: string;
  image?: string; // Base64 string for reference
  videoUrl?: string; // Generated video URL
  providerUsed?: string;
  pdf?: {
    name: string;
    source: "Google Drive" | "Local File";
    url?: string;
    size?: string;
  };
  timestamp: Date;
  searched?: boolean;
  searchQuery?: string;
  sources?: Array<{ title: string; url: string }>;
  searchError?: boolean;

  // Inline video lecture features
  videoSettingsPicker?: VideoSettingsPickerData;
  videoSegments?: VideoSegment[];
  lectureJobId?: string;
}

export interface StudyWorkspace {
  id: string;
  name: string;
  subject: string;
  chapter?: string;
  isPinned?: boolean;
  lastActive: string;
  pdfs: Array<{ id: string; name: string; pageCount?: number; size?: string; url?: string }>;
  notes: Array<{ id: string; title: string; content: string; createdAt: string }>;
  quizzes: Array<{ id: string; title: string; questionCount: number; score?: string }>;
  flashcards: Array<{ id: string; title: string; cardCount: number }>;
  chats: Array<{ id: string; title: string; updatedAt: string }>;
  contextChips: Array<{ id: string; label: string; type: "subject" | "pdf" | "workspace" | "grade" | "chapter" }>;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messages: ChatMessage[];
  workspaceId?: string;
}

export interface AIOrbProps {
  isLoading: boolean;
  isTyping: boolean;
  isListening?: boolean;
  size?: "sm" | "md" | "lg";
}

export type TutorLevel = "Beginner" | "Intermediate" | "Advanced";

export interface MistakeEntry {
  id: string;
  subject: string;
  chapter: string;
  concept: string;
  question: string;
  wrongAnswer: string;
  correctAnswer: string;
  explanation: string;
  difficulty: "easy" | "medium" | "hard" | "exam-level";
  savedAt: string;
}

export interface WeakTopic {
  id: string;
  subject: string;
  chapter: string;
  topic: string;
  mistakeCount: number;
  accuracy: number;
  recommendedAction: string;
}

export interface StudyPlanGoal {
  id: string;
  text: string;
  completed: boolean;
  dueDate: string;
}

export interface StudyPlan {
  id: string;
  title: string;
  subject: string;
  targetExamDate: string;
  dailyTargetHours: number;
  weeklyGoals: StudyPlanGoal[];
  backlogItems: string[];
}

export interface FormulaCard {
  id: string;
  subject: string;
  chapter: string;
  title: string;
  formula: string;
  derivationSummary: string;
  memoryTrick: string;
}

export type AvatarState = "idle" | "listening" | "explaining" | "gesture";

export interface CollaborativeMember {
  id: string;
  name: string;
  avatar: string;
  role: "Host" | "Collaborator" | "Viewer";
  isOnline: boolean;
}

export interface WhiteboardStep {
  stepNumber: number;
  title: string;
  mathLatexOrText: string;
  explanation: string;
}

export interface StudyMateAIProps {
  profile: UserProfile;
  onAwardXP?: (amount: number, reason: string) => void;
  onAddNotification?: (title: string, text: string, type: "success" | "info" | "alert") => void;
  isFullScreen?: boolean;
  onToggleFullScreen?: () => void;
  onOpenAISettings?: (fn: () => void) => void;
}
