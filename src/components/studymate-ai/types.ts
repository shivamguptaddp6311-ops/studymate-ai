import { UserProfile } from "../../types";

export interface ChatMessage {
  id: string;
  role: "user" | "model";
  text: string;
  image?: string; // Base64 string for reference
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
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messages: ChatMessage[];
}

export interface AIOrbProps {
  isLoading: boolean;
  isTyping: boolean;
  isListening?: boolean;
  size?: "sm" | "md" | "lg";
}

export interface StudyMateAIProps {
  profile: UserProfile;
  onAwardXP?: (amount: number, reason: string) => void;
  onAddNotification?: (title: string, text: string, type: "success" | "info" | "alert") => void;
  isFullScreen?: boolean;
  onToggleFullScreen?: () => void;
}
