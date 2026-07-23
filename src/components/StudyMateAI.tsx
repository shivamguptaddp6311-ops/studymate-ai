import React, { useState, useRef, useEffect } from "react";
import { 
  GlassCard, HeroCard, QuickActionCard, ProgressCard, AnalyticsCard, 
  AchievementCard, AICard, TimelineCard, EmptyStateCard, PremiumButton, 
  PremiumInput, PremiumDialog, PremiumBottomSheet, PremiumIcon, PremiumCard 
} from "./PremiumUI";
import { 
  Sparkles, Send, Image as ImageIcon, Trash2, X, Paperclip, 
  Check, Brain, GraduationCap, Lightbulb, MessageSquare, AlertCircle, RefreshCw,
  Camera, Crop, ArrowRight,
  Sliders, Settings, CheckCircle, Languages, Activity, ChevronUp, ChevronDown,
  Maximize2, Minimize2, Undo, RotateCcw, Plus, ChevronRight, Compass, FileText,
  Globe, Mic, MicOff, Volume2, VolumeX, Copy, FileCode, Layers, Zap, Search, Bot,
  BookOpen, FileCheck, CloudUpload, Upload, Folder, ExternalLink
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "motion/react";
import { UserProfile } from "../types";
import { checkImageQuality, compressImage, enhanceImageForOCR } from "../utils/imageOptimizer";
import { StudyMateBrainLogo } from "./NavIcons";
import PremiumErrorCard from "./PremiumErrorCard";
import DynamicIslandAI from "./DynamicIslandAI";

declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

interface StudyMateAIProps {
  profile: UserProfile;
  onAwardXP?: (amount: number, reason: string) => void;
  onAddNotification?: (title: string, text: string, type: "success" | "info" | "alert") => void;
  isFullScreen?: boolean;
  onToggleFullScreen?: () => void;
}

interface ChatMessage {
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

interface AIOrbProps {
  isLoading: boolean;
  isTyping: boolean;
  isListening?: boolean;
  size?: "sm" | "md" | "lg";
}

// Apple Intelligence & Gemini Inspired Multi-Layered Liquid AI Orb
function AIOrb({ isLoading, isTyping, isListening = false, size = "lg" }: AIOrbProps) {
  const isSm = size === "sm";
  const isMd = size === "md";

  const dimensionClasses = isSm 
    ? "w-10 h-10" 
    : isMd 
      ? "w-24 h-24" 
      : "w-44 h-44 md:w-56 md:h-56";

  const innerCoreSize = isSm 
    ? "w-7 h-7" 
    : isMd 
      ? "w-14 h-14" 
      : "w-28 h-28 md:w-32 md:h-32";

  const iconSize = isSm 
    ? "w-3.5 h-3.5" 
    : isMd 
      ? "w-6 h-6" 
      : "w-10 h-10 md:w-12 md:h-12";

  return (
    <div className={`relative flex items-center justify-center mx-auto transition-all duration-500 ${dimensionClasses}`}>
      {/* Outer ambient aura glow */}
      <div className={`absolute inset-0 rounded-full blur-3xl transition-all duration-1000 ${
        isListening
          ? "bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500 opacity-80 scale-130 animate-pulse"
          : isLoading 
            ? "bg-gradient-to-r from-rose-500 via-indigo-600 to-purple-600 opacity-80 scale-130 animate-pulse" 
            : isTyping 
              ? "bg-gradient-to-r from-cyan-400 to-indigo-500 opacity-60 scale-110" 
              : "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-40 hover:opacity-60"
      }`} />

      {/* Outer liquid wave ring */}
      <motion.div 
        animate={{ 
          rotate: [0, 360],
          scale: isLoading ? [1, 1.08, 0.95, 1.06, 1] : isListening ? [1, 1.12, 1] : isTyping ? [1, 1.03, 0.98, 1] : [1, 1.04, 1]
        }}
        transition={{ 
          rotate: { duration: isLoading ? 4 : isListening ? 3 : 20, ease: "linear", repeat: Infinity },
          scale: { duration: isLoading ? 1.2 : isListening ? 0.8 : isTyping ? 0.7 : 5, ease: "easeInOut", repeat: Infinity }
        }}
        className="absolute inset-1 rounded-full border border-white/30 dark:border-slate-800/70 bg-gradient-to-tr from-indigo-500/15 via-purple-500/10 to-pink-500/15 backdrop-blur-xl shadow-[inset_0_0_30px_rgba(255,255,255,0.25)] dark:shadow-[inset_0_0_30px_rgba(99,102,241,0.2)] flex items-center justify-center"
      >
        {/* Mid orbital ring */}
        <motion.div
          animate={{ rotate: [-360, 0] }}
          transition={{ duration: isLoading ? 6 : 28, ease: "linear", repeat: Infinity }}
          className="absolute inset-3 rounded-full border border-dashed border-indigo-400/40 dark:border-indigo-400/30"
        />

        {/* Counter-rotating accent halo */}
        <motion.div
          animate={{ rotate: [0, 360], scale: [0.95, 1.05, 0.95] }}
          transition={{ 
            rotate: { duration: 15, ease: "linear", repeat: Infinity },
            scale: { duration: 4, ease: "easeInOut", repeat: Infinity }
          }}
          className="absolute inset-6 rounded-full border border-purple-400/30 dark:border-purple-300/20"
        />

        {/* Core animated liquid morphing glass sphere */}
        <motion.div
          animate={{
            borderRadius: isLoading 
              ? ["42% 58% 70% 30% / 45% 45% 55% 55%", "70% 30% 52% 48% / 60% 40% 60% 40%", "42% 58% 70% 30% / 45% 45% 55% 55%"]
              : isListening
                ? ["55% 45% 40% 60% / 60% 35% 65% 40%", "40% 60% 65% 35% / 35% 65% 35% 65%", "55% 45% 40% 60% / 60% 35% 65% 40%"]
                : ["50% 50% 50% 50% / 50% 50% 50% 50%", "46% 54% 48% 52% / 53% 47% 53% 47%", "50% 50% 50% 50% / 50% 50% 50% 50%"]
          }}
          transition={{
            duration: isLoading ? 1.6 : isListening ? 1.2 : 6,
            ease: "easeInOut",
            repeat: Infinity
          }}
          className={`bg-gradient-to-br transition-all duration-500 shadow-2xl relative overflow-hidden flex items-center justify-center ${innerCoreSize} ${
            isListening
              ? "from-emerald-400 via-teal-500 to-cyan-600 shadow-emerald-500/40"
              : isLoading 
                ? "from-rose-500 via-indigo-600 to-purple-600 shadow-rose-500/40" 
                : isTyping 
                  ? "from-cyan-400 via-teal-500 to-indigo-600 shadow-cyan-400/30" 
                  : "from-indigo-600 via-purple-600 to-pink-500 shadow-indigo-500/30"
          }`}
        >
          {/* Glass glare highlight */}
          <div className="absolute top-1 left-2 w-16 h-8 bg-white/35 rounded-full blur-[2px] transform -rotate-12 pointer-events-none" />
          
          {/* Shimmer light sweep */}
          <div className="absolute inset-0 bg-gradient-to-t from-white/0 via-white/20 to-white/0 translate-y-[-100%] animate-[shimmer_2.2s_infinite]" />

          {/* Brain / Core Icon inside Orb */}
          <Brain className={`text-white drop-shadow-[0_2px_12px_rgba(255,255,255,0.6)] ${iconSize} ${
            isLoading ? "animate-bounce" : isListening ? "animate-pulse" : ""
          }`} />
        </motion.div>
      </motion.div>
      
      {/* Dynamic floating particles (only for medium & large sizes) */}
      {!isSm && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ 
                x: Math.random() * 120 - 60, 
                y: Math.random() * 120 - 60,
                opacity: 0.2 + Math.random() * 0.4,
                scale: 0.5 + Math.random() * 0.5
              }}
              animate={{
                y: [0, -16, 0],
                x: [0, Math.random() * 10 - 5, 0],
                opacity: [0.3, 0.8, 0.3],
              }}
              transition={{
                duration: 2 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 1.5
              }}
              className={`absolute w-2 h-2 rounded-full ${
                isListening ? "bg-emerald-300" : isLoading ? "bg-rose-400" : isTyping ? "bg-cyan-300" : "bg-purple-300"
              }`}
              style={{
                top: '50%',
                left: '50%',
                marginLeft: '-4px',
                marginTop: '-4px',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface ChatMessageBubbleProps {
  msg: ChatMessage;
  onCopyText: (text: string) => void;
  onSpeakText: (text: string) => void;
  isSpeaking: boolean;
}

const ChatMessageBubble = React.memo(function ChatMessageBubble({ 
  msg, 
  onCopyText, 
  onSpeakText,
  isSpeaking 
}: ChatMessageBubbleProps) {
  const isUser = msg.role === "user";
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    onCopyText(msg.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 15, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", damping: 25, stiffness: 350 }}
      className={`flex flex-col ${isUser ? "items-end" : "items-start"} space-y-1.5 w-full my-1`}
    >
      {/* Sender Header Label & Timestamp */}
      <div className="flex items-center space-x-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 px-2">
        {isUser ? (
          <>
            <span className="font-extrabold text-indigo-600 dark:text-indigo-400">You</span>
            <span className="w-1 h-1 rounded-full bg-indigo-400/50" />
            <span className="font-mono text-[9px]">{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </>
        ) : (
          <>
            <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 animate-pulse shrink-0 flex items-center justify-center shadow-xs">
              <Sparkles className="w-2.5 h-2.5 text-white" />
            </div>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 dark:from-indigo-400 dark:to-purple-300 font-extrabold">
              StudyMate AI
            </span>
            <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
            <span className="font-mono text-[9px]">{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </>
        )}
      </div>

      {/* Floating Glass Message Card */}
      <div
        className={`max-w-[88%] md:max-w-[78%] rounded-3xl p-4.5 md:p-5.5 text-sm leading-relaxed transition-all duration-300 relative group overflow-hidden ${
          isUser
            ? "bg-gradient-to-br from-indigo-600/95 via-indigo-600 to-purple-600/95 text-white rounded-tr-sm border border-indigo-400/30 shadow-[0_10px_30px_rgba(99,102,241,0.18)] font-medium"
            : "bg-white/75 dark:bg-slate-900/60 backdrop-blur-xl text-slate-800 dark:text-slate-100 rounded-tl-sm border border-white/30 dark:border-slate-800/60 shadow-[0_10px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.25)]"
        }`}
      >
        {/* Subtle background ambient highlight for AI bubble */}
        {!isUser && (
          <div className="absolute top-0 left-0 w-36 h-36 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent blur-2xl pointer-events-none rounded-full" />
        )}

        {/* Attached image preview */}
        {msg.image && (
          <div className="mb-3.5 max-w-sm rounded-2xl overflow-hidden border border-black/10 dark:border-white/10 shadow-lg relative group">
            <img src={msg.image} alt="User Attached Visual Resource" className="w-full h-auto max-h-[240px] object-cover transition-all duration-300 group-hover:scale-105" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
              <span className="text-[10px] text-white font-black bg-black/70 px-3 py-1.5 rounded-full backdrop-blur-md">
                Attached Resource
              </span>
            </div>
          </div>
        )}

        {/* Attached PDF Preview */}
        {msg.pdf && (
          <div className="mb-3.5 max-w-sm rounded-2xl p-3 bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/60 dark:border-slate-700/60 shadow-md flex items-center space-x-3">
            <div className="p-2.5 bg-gradient-to-tr from-emerald-500 to-teal-600 text-white rounded-xl shadow-xs shrink-0">
              <CloudUpload className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-1.5">
                <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                  {msg.pdf.source}
                </span>
              </div>
              <p className="text-xs font-extrabold text-slate-800 dark:text-slate-100 truncate mt-0.5">
                {msg.pdf.name}
              </p>
              {msg.pdf.size && (
                <p className="text-[10px] text-slate-400 font-medium">{msg.pdf.size}</p>
              )}
            </div>
            {msg.pdf.url && (
              <a
                href={msg.pdf.url}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-lg transition shrink-0"
                title="Open PDF Document"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        )}

        {/* Formatted Markdown Content */}
        <div className={`prose dark:prose-invert max-w-none text-xs md:text-sm leading-relaxed ${
          isUser 
            ? "text-white prose-headings:text-white prose-p:text-indigo-50/95 prose-strong:text-white prose-a:text-white hover:prose-a:opacity-80" 
            : "text-slate-800 dark:text-slate-200 prose-headings:text-slate-900 dark:prose-headings:text-white prose-p:leading-relaxed prose-strong:text-indigo-600 dark:prose-strong:text-indigo-400 prose-a:text-indigo-500 hover:prose-a:underline"
        }`}>
          <ReactMarkdown>{msg.text}</ReactMarkdown>
        </div>

        {/* Verified Search Sources */}
        {!isUser && msg.searched && (
          <div className="mt-4 pt-3.5 border-t border-slate-200/50 dark:border-slate-800/50 space-y-2">
            <div className="flex items-center space-x-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              <Globe className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
              <span>Verified Web Sources ({msg.sources?.length || 0})</span>
            </div>
            {msg.sources && msg.sources.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {msg.sources.map((source, idx) => (
                  <a
                    key={idx}
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    referrerPolicy="no-referrer"
                    className="flex items-center space-x-1.5 bg-slate-50/80 hover:bg-indigo-50 dark:bg-slate-950/50 dark:hover:bg-indigo-950/30 border border-slate-200/60 hover:border-indigo-300 dark:border-slate-800/60 dark:hover:border-indigo-900/60 px-2.5 py-1 rounded-lg text-xs text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition duration-200 shadow-xs shrink-0"
                  >
                    <span className="w-4 h-4 rounded bg-indigo-100 dark:bg-indigo-950 text-[9px] font-bold flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                      {idx + 1}
                    </span>
                    <span className="max-w-[150px] truncate">{source.title}</span>
                  </a>
                ))}
              </div>
            ) : msg.searchError ? (
              <p className="text-[10px] text-rose-500 dark:text-rose-400 font-medium flex items-center space-x-1">
                <span>⚠️</span>
                <span>Live search failed. Answer served from AI knowledge base.</span>
              </p>
            ) : (
              <p className="text-[10px] text-slate-400 dark:text-slate-500 italic">No direct sources linked.</p>
            )}
          </div>
        )}

        {/* Action Toolbar for AI responses */}
        {!isUser && (
          <div className="mt-3 pt-2.5 border-t border-slate-200/40 dark:border-slate-800/40 flex items-center justify-between opacity-80 group-hover:opacity-100 transition-opacity">
            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-indigo-500" /> Adaptive Academic Model
            </span>

            <div className="flex items-center space-x-1.5">
              {/* Voice Read Aloud */}
              <button
                type="button"
                onClick={() => onSpeakText(msg.text)}
                className={`p-1.5 rounded-lg text-xs transition cursor-pointer flex items-center space-x-1 ${
                  isSpeaking 
                    ? "bg-indigo-500 text-white animate-pulse" 
                    : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                }`}
                title="Listen to Explanation"
              >
                {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>

              {/* Copy Response */}
              <button
                type="button"
                onClick={handleCopy}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs transition cursor-pointer flex items-center space-x-1"
                title="Copy text"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-[9px] font-bold text-emerald-500">Copied</span>
                  </>
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
});

export default function StudyMateAI({ 
  profile, 
  onAwardXP, 
  onAddNotification,
  isFullScreen = false,
  onToggleFullScreen
}: StudyMateAIProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    // Local storage recall for chat history persistence
    const saved = localStorage.getItem(`studymate_ai_chat_history_${profile.fullName}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }));
      } catch (e) {
        // Fallback
      }
    }
    return [
      {
        id: "welcome",
        role: "model",
        text: `Hello **${profile.fullName || "Student"}**! Welcome to your **StudyMate Flagship AI Workspace**. 

I am your personal AI tutor, problem solver, and academic accelerator. I can help you:
• **Solve Homework & Equations** step-by-step
• **Scan Textbook Questions** with live camera & auto-crop
• **Transcribe Notes & Handwriting** with OCR
• **Explain Complex Concepts** tailored to Class ${profile.classGrade || "10"}
• **Generate Practice Quizzes & Summaries**
• **Analyze PDFs & Images**

How can we accelerate your learning today?`,
        timestamp: new Date()
      }
    ];
  });

  const [inputText, setInputText] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isWebSearching, setIsWebSearching] = useState(false);
  const [usePersonalization, setUsePersonalization] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [qualityWarning, setQualityWarning] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);

  // Plus Action Menu & Drive PDF Modal States
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [showDriveModal, setShowDriveModal] = useState(false);
  const [driveUrlInput, setDriveUrlInput] = useState("");
  const [driveError, setDriveError] = useState<string | null>(null);
  const [attachedPdf, setAttachedPdf] = useState<{
    name: string;
    url?: string;
    source: "Google Drive" | "Local File";
    size?: string;
  } | null>(null);

  // Quick Tools Group Expandable State
  const [expandedToolCategory, setExpandedToolCategory] = useState<"vision" | "learning" | "all" | null>("all");

  // Voice Speech Recognition State
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // SpeechSynthesis TTS State
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);

  // Live Camera Scanner & Hand Cropping tool states
  const [cameraActive, setCameraActive] = useState(false);
  const [cropSourceImage, setCropSourceImage] = useState<string | null>(null);
  const [cropBox, setCropBox] = useState({ x: 15, y: 15, width: 70, height: 70 });
  const [dragType, setDragType] = useState<"none" | "center" | "tl" | "tr" | "bl" | "br" | "pan">("none");
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragBoxStart, setDragBoxStart] = useState({ x: 15, y: 15, width: 70, height: 70 });

  // Zoom, pan, and undo history states for scanner
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [undoHistory, setUndoHistory] = useState<{ x: number; y: number; width: number; height: number }[]>([]);
  const [pinchStartDist, setPinchStartDist] = useState(0);
  const [pinchStartZoom, setPinchStartZoom] = useState(1);
  const [pinchStartPan, setPinchStartPan] = useState({ x: 0, y: 0 });

  // Scanned Solved Question State
  const [scannedSolution, setScannedSolution] = useState<any | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const handleCancelRequest = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
      setErrorMessage("Request cancelled successfully by user.");
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfFileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cropStageRef = useRef<HTMLDivElement>(null);

  // Google Drive & PDF Attachment Handlers
  const handleImportDriveUrl = () => {
    if (!driveUrlInput.trim()) {
      setDriveError("Please enter a Google Drive link.");
      return;
    }
    let fileName = "Google_Drive_Document.pdf";
    const match = driveUrlInput.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match) {
      fileName = `Drive_Doc_${match[1].slice(0, 8)}.pdf`;
    }
    setAttachedPdf({
      name: fileName,
      url: driveUrlInput.trim(),
      source: "Google Drive",
      size: "Drive Document"
    });
    setShowDriveModal(false);
    setDriveUrlInput("");
    setDriveError(null);
    if (onAddNotification) {
      onAddNotification("Google Drive PDF Attached", `Attached ${fileName} for AI analysis.`, "success");
    }
  };

  const handleSelectDriveSample = (name: string, size: string) => {
    setAttachedPdf({
      name,
      url: `https://drive.google.com/file/d/sample_${Date.now()}/view`,
      source: "Google Drive",
      size
    });
    setShowDriveModal(false);
    if (onAddNotification) {
      onAddNotification("Google Drive PDF Attached", `Attached ${name} for AI analysis.`, "success");
    }
  };

  const handlePdfFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const sizeStr = file.size > 1024 * 1024 
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` 
        : `${Math.round(file.size / 1024)} KB`;
      setAttachedPdf({
        name: file.name,
        source: "Local File",
        size: sizeStr
      });
      if (onAddNotification) {
        onAddNotification("PDF Attached", `Attached ${file.name} (${sizeStr})`, "success");
      }
    }
  };

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Clean voices on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
    };
  }, []);

  // Voice Input Speech Recognition Handler
  const toggleVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      if (onAddNotification) {
        onAddNotification("Voice Input Not Supported", "Your browser doesn't support live speech recognition. Try using Chrome or Edge.", "info");
      }
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join("");
        setInputText(transcript);
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error("Speech recognition launch failed:", err);
      setIsListening(false);
    }
  };

  // Text-To-Speech Output
  const speakText = (text: string) => {
    if (!window.speechSynthesis) return;

    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
      return;
    }

    // Clean markdown tags for clean reading
    const cleanText = text
      .replace(/[*_#`~]/g, "")
      .replace(/\[(.*?)\]\(.*?\)/g, "$1")
      .slice(0, 500); // Read first 500 chars

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onend = () => setSpeakingMsgId(null);
    utterance.onerror = () => setSpeakingMsgId(null);

    setSpeakingMsgId("speaking");
    window.speechSynthesis.speak(utterance);
  };

  // Copy text helper
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    if (onAddNotification) {
      onAddNotification("Copied to Clipboard", "Response text copied successfully.", "success");
    }
  };

  // ----------------------------------------------------
  // Camera scanning controls
  // ----------------------------------------------------
  const startCamera = async () => {
    let perms = { camera: "default" };
    try {
      const stored = localStorage.getItem("studymate_permissions_store");
      if (stored) perms = JSON.parse(stored);
    } catch (e) {}

    if (perms.camera === "denied") {
      setErrorMessage("Camera access is blocked in your browser settings. Please grant Camera access and try again, or upload an image directly.");
      fileInputRef.current?.click();
      return;
    }

    setCameraActive(true);
    setErrorMessage(null);
    try {
      const constraints = { video: { facingMode: "environment" } };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      if (perms.camera !== "granted") {
        perms.camera = "granted";
        localStorage.setItem("studymate_permissions_store", JSON.stringify(perms));
      }
    } catch (err: any) {
      console.warn("Camera streaming not supported or blocked, opening file gallery upload.", err);
      perms.camera = "denied";
      localStorage.setItem("studymate_permissions_store", JSON.stringify(perms));
      setErrorMessage("Camera access failed or was blocked. Opening file upload as fallback.");
      setCameraActive(false);
      fileInputRef.current?.click();
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const capturePhoto = async () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth || 1280;
      canvas.height = videoRef.current.videoHeight || 720;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        
        const quality = checkImageQuality(canvas);
        if (quality.warning) {
          setQualityWarning(quality.warning);
          if (onAddNotification) {
            onAddNotification("Image Quality Warning", quality.warning, "info");
          }
        } else {
          setQualityWarning(null);
        }

        let rawDataUrl = canvas.toDataURL("image/jpeg", 0.95);
        try {
          rawDataUrl = await enhanceImageForOCR(rawDataUrl);
          const compressed = await compressImage(rawDataUrl, 1024, 0.78);
          setCropSourceImage(compressed);
        } catch (err) {
          setCropSourceImage(rawDataUrl);
        }
        setCropBox({ x: 15, y: 15, width: 70, height: 70 });
        stopCamera();
      }
    } else {
      fileInputRef.current?.click();
    }
  };

  // Boundary Detector
  const detectQuestionBoundaries = (imageSrc: string) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const size = 150;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        
        ctx.drawImage(img, 0, 0, size, size);
        const imgData = ctx.getImageData(0, 0, size, size);
        const data = imgData.data;

        let totalLuminance = 0;
        const numPixels = size * size;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i+1];
          const b = data[i+2];
          totalLuminance += 0.299 * r + 0.587 * g + 0.114 * b;
        }
        const avgLuminance = totalLuminance / numPixels;
        const textThreshold = Math.min(145, avgLuminance * 0.85);

        const rowDensity = new Array(size).fill(0);
        const colDensity = new Array(size).fill(0);

        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            const idx = (y * size + x) * 4;
            const r = data[idx];
            const g = data[idx+1];
            const b = data[idx+2];
            const L = 0.299 * r + 0.587 * g + 0.114 * b;
            if (L < textThreshold) {
              rowDensity[y]++;
              colDensity[x]++;
            }
          }
        }

        const noiseThreshold = 2;
        let minY = 0, maxY = size - 1, minX = 0, maxX = size - 1;

        for (let y = 0; y < size; y++) {
          if (rowDensity[y] > noiseThreshold) { minY = y; break; }
        }
        for (let y = size - 1; y >= 0; y--) {
          if (rowDensity[y] > noiseThreshold) { maxY = y; break; }
        }
        for (let x = 0; x < size; x++) {
          if (colDensity[x] > noiseThreshold) { minX = x; break; }
        }
        for (let x = size - 1; x >= 0; x--) {
          if (colDensity[x] > noiseThreshold) { maxX = x; break; }
        }

        const margin = 5;
        const boxX = Math.max(0, Math.round((minX / size) * 100) - margin);
        const boxY = Math.max(0, Math.round((minY / size) * 100) - margin);
        const boxW = Math.min(100 - boxX, Math.round(((maxX - minX) / size) * 100) + margin * 2);
        const boxH = Math.min(100 - boxY, Math.round(((maxY - minY) / size) * 100) + margin * 2);

        if (boxW >= 15 && boxH >= 15 && boxW < 98 && boxH < 98) {
          setCropBox({ x: boxX, y: boxY, width: boxW, height: boxH });
        }
      } catch (err) {
        console.warn("Boundary detection failed:", err);
      }
    };
    img.src = imageSrc;
  };

  useEffect(() => {
    if (cropSourceImage) {
      detectQuestionBoundaries(cropSourceImage);
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setUndoHistory([]);
    }
  }, [cropSourceImage]);

  // Hand Cropping Gestures
  const handleCropDragStart = (e: React.MouseEvent | React.TouchEvent, type: "center" | "tl" | "tr" | "bl" | "br" | "pan") => {
    e.preventDefault();
    if ('touches' in e && e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      setDragType("none");
      setPinchStartDist(dist);
      setPinchStartZoom(zoom);
      setPinchStartPan({ ...pan });
      return;
    }

    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    setDragType(type);
    setDragStart({ x: clientX, y: clientY });
    setDragBoxStart({ ...cropBox });
    setPinchStartPan({ ...pan });
  };

  const handleCropDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e && e.touches.length === 2) {
      e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      if (pinchStartDist > 0) {
        const factor = dist / pinchStartDist;
        const nextZoom = Math.max(1, Math.min(5, pinchStartZoom * factor));
        setZoom(nextZoom);
      }
      return;
    }

    if (dragType === "none") return;
    e.preventDefault();

    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    const dx = clientX - dragStart.x;
    const dy = clientY - dragStart.y;

    if (dragType === "pan") {
      setPan({ x: pinchStartPan.x + dx, y: pinchStartPan.y + dy });
      return;
    }

    const rect = cropStageRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = ((clientX - rect.left) / rect.width) * 100;
    const mouseY = ((clientY - rect.top) / rect.height) * 100;

    const boxStart = dragBoxStart;
    const MIN_SIZE = 10;

    setCropBox(() => {
      let nextX = boxStart.x, nextY = boxStart.y, nextW = boxStart.width, nextH = boxStart.height;

      if (dragType === "center") {
        const pctDx = (dx / rect.width) * 100;
        const pctDy = (dy / rect.height) * 100;
        nextX = Math.max(0, Math.min(100 - boxStart.width, boxStart.x + pctDx));
        nextY = Math.max(0, Math.min(100 - boxStart.height, boxStart.y + pctDy));
      } else if (dragType === "tl") {
        const fixedRight = boxStart.x + boxStart.width;
        const fixedBottom = boxStart.y + boxStart.height;
        nextX = Math.max(0, Math.min(fixedRight - MIN_SIZE, mouseX));
        nextY = Math.max(0, Math.min(fixedBottom - MIN_SIZE, mouseY));
        nextW = fixedRight - nextX;
        nextH = fixedBottom - nextY;
      } else if (dragType === "tr") {
        const fixedLeft = boxStart.x;
        const fixedBottom = boxStart.y + boxStart.height;
        nextX = fixedLeft;
        nextY = Math.max(0, Math.min(fixedBottom - MIN_SIZE, mouseY));
        nextW = Math.max(MIN_SIZE, Math.min(100 - fixedLeft, mouseX - fixedLeft));
        nextH = fixedBottom - nextY;
      } else if (dragType === "bl") {
        const fixedRight = boxStart.x + boxStart.width;
        const fixedTop = boxStart.y;
        nextX = Math.max(0, Math.min(fixedRight - MIN_SIZE, mouseX));
        nextY = fixedTop;
        nextW = fixedRight - nextX;
        nextH = Math.max(MIN_SIZE, Math.min(100 - fixedTop, mouseY - fixedTop));
      } else if (dragType === "br") {
        const fixedLeft = boxStart.x;
        const fixedTop = boxStart.y;
        nextX = fixedLeft;
        nextY = fixedTop;
        nextW = Math.max(MIN_SIZE, Math.min(100 - fixedLeft, mouseX - fixedLeft));
        nextH = Math.max(MIN_SIZE, Math.min(100 - fixedTop, mouseY - fixedTop));
      }

      return {
        x: Math.round(nextX),
        y: Math.round(nextY),
        width: Math.round(nextW),
        height: Math.round(nextH)
      };
    });
  };

  const handleCropDragEnd = () => {
    if (dragType !== "none") {
      setUndoHistory(prev => {
        const nextHist = [...prev, { ...cropBox }];
        if (nextHist.length > 20) nextHist.shift();
        return nextHist;
      });
    }
    setDragType("none");
    setPinchStartDist(0);
  };

  const handleUndoCrop = () => {
    if (undoHistory.length > 0) {
      const prevBox = undoHistory[undoHistory.length - 1];
      setCropBox(prevBox);
      setUndoHistory(prev => prev.slice(0, -1));
    }
  };

  const handleResetCrop = () => {
    setCropBox({ x: 15, y: 15, width: 70, height: 70 });
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setUndoHistory([]);
  };

  const executeCrop = () => {
    if (!cropSourceImage) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const Wi = img.naturalWidth;
        const Hi = img.naturalHeight;

        const rect = cropStageRef.current?.getBoundingClientRect();
        const Ws = rect ? rect.width : 350;
        const Hs = rect ? rect.height : 350;

        const Ls = (cropBox.x / 100) * Ws;
        const Ts = (cropBox.y / 100) * Hs;
        const Rs = ((cropBox.x + cropBox.width) / 100) * Ws;
        const Bs = ((cropBox.y + cropBox.height) / 100) * Hs;

        const getOriginalCoords = (xs: number, ys: number) => {
          const f = Math.min(Ws / Wi, Hs / Hi);
          const Wd = Wi * f;
          const Hd = Hi * f;
          const Xd = (Ws - Wd) / 2;
          const Yd = (Hs - Hd) / 2;

          const Cx = Ws / 2;
          const Cy = Hs / 2;

          const x1 = Cx + (xs - Cx - pan.x) / zoom;
          const y1 = Cy + (ys - Cy - pan.y) / zoom;

          const xi = (x1 - Xd) / f;
          const yi = (y1 - Yd) / f;

          return { x: xi, y: yi };
        };

        const topLeft = getOriginalCoords(Ls, Ts);
        const bottomRight = getOriginalCoords(Rs, Bs);

        const sx = Math.max(0, Math.min(Wi - 1, topLeft.x));
        const sy = Math.max(0, Math.min(Hi - 1, topLeft.y));
        const sWidth = Math.max(10, Math.min(Wi - sx, bottomRight.x - topLeft.x));
        const sHeight = Math.max(10, Math.min(Hi - sy, bottomRight.y - topLeft.y));

        canvas.width = sWidth;
        canvas.height = sHeight;

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, sWidth, sHeight);
        const croppedDataUrl = canvas.toDataURL("image/jpeg", 0.82);
        
        setSelectedImage(croppedDataUrl);
        setCropSourceImage(null);
        solveScannedQuestion(croppedDataUrl);
      }
    };
    img.src = cropSourceImage;
  };

  const solveScannedQuestion = async (base64Image: string) => {
    if (isLoading) return;

    setIsLoading(true);
    setErrorMessage(null);
    setScannedSolution(null);

    const timeoutLimit = Number(localStorage.getItem("studymate_ai_timeout")) || 30000;
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeoutLimit);

    try {
      let token = localStorage.getItem("studymate_token") || window.localStorage.getItem("studymate_token") || "";
      let email = localStorage.getItem("studymate_logged_in_email") || window.localStorage.getItem("studymate_logged_in_email") || "shivamguptaddp6312@gmail.com";

      if (!token) {
        try {
          const guestRes = await fetch("/api/auth/guest-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email })
          });
          if (guestRes.ok) {
            const guestData = await guestRes.json();
            token = guestData.token;
            window.localStorage.setItem("studymate_token", token);
            window.localStorage.setItem("studymate_logged_in_email", guestData.email);
          }
        } catch (e) {
          console.warn("Pre-flight solve token fetch failed:", e);
        }
      }

      let res = await fetch("/api/gemini/solve", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        signal: controller.signal,
        body: JSON.stringify({
          image: base64Image,
          grade: profile.classGrade,
          favSubjects: profile.favoriteSubjects,
          weakSubjects: profile.weakSubjects,
          explainBriefly: true,
          provider: localStorage.getItem("studymate_ai_provider") || "auto",
          timeoutMs: timeoutLimit
        })
      });

      if (res.status === 401) {
        try {
          const reauthRes = await fetch("/api/auth/guest-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({ email })
          });
          if (reauthRes.ok) {
            const reauthData = await reauthRes.json();
            token = reauthData.token;
            window.localStorage.setItem("studymate_token", token);
            window.localStorage.setItem("studymate_logged_in_email", reauthData.email);
            res = await fetch("/api/gemini/solve", {
              method: "POST",
              headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
              },
              signal: controller.signal,
              body: JSON.stringify({
                image: base64Image,
                grade: profile.classGrade,
                favSubjects: profile.favoriteSubjects,
                weakSubjects: profile.weakSubjects,
                explainBriefly: true,
                provider: localStorage.getItem("studymate_ai_provider") || "auto",
                timeoutMs: timeoutLimit
              })
            });
          }
        } catch (e) {}
      }

      clearTimeout(timeoutId);

      if (res.status === 504) throw new Error("The AI partner timed out. Please try again.");
      if (res.status === 499) throw new Error("Request cancelled.");
      if (!res.ok) throw new Error("Failed to contact the StudyMate AI solver.");

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setScannedSolution(data);

      const stepsFormatted = data.steps ? data.steps.join("\n\n") : "";
      const botText = `### 📸 Question Scanned Solution
**Subject:** ${data.subject || "General"} • **Topic:** ${data.topic || "Topic"}

#### Step-by-Step Solution:
${stepsFormatted}

#### Direct Answer:
**${data.finalAnswer || "Solved successfully."}**

#### Concept Breakdown:
${data.conceptualExplanation || ""}`;

      setMessages(prev => [...prev, {
        id: `scan-solve-${Date.now()}`,
        role: "model",
        text: botText,
        timestamp: new Date()
      }]);

      if (onAwardXP) {
        onAwardXP(15, "Scanned & Mastered a question!");
      }

    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error(err);
      if (err.name === "AbortError" || controller.signal.aborted) {
        setErrorMessage("Request timed out or was cancelled.");
      } else {
        setErrorMessage(err.message || "Failed to process question scan.");
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  // Save history to localStorage
  useEffect(() => {
    localStorage.setItem(
      `studymate_ai_chat_history_${profile.fullName}`,
      JSON.stringify(messages)
    );
  }, [messages, profile.fullName]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 16 * 1024 * 1024) {
        setErrorMessage("Image is too large. Please select an image smaller than 16MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const rawSrc = reader.result as string;
        const img = new Image();
        img.onload = async () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const quality = checkImageQuality(canvas);
            if (quality.warning) {
              setQualityWarning(quality.warning);
            } else {
              setQualityWarning(null);
            }
          }
          
          try {
            const compressed = await compressImage(rawSrc, 1024, 0.78);
            setCropSourceImage(compressed);
          } catch (err) {
            setCropSourceImage(rawSrc);
          }
          setCropBox({ x: 15, y: 15, width: 70, height: 70 });
          setErrorMessage(null);
        };
        img.src = rawSrc;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSend = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    if (isLoading) return;

    const textToSend = customText !== undefined ? customText : inputText;
    if (!textToSend.trim() && !selectedImage && !attachedPdf) return;

    const userMsgId = `msg-user-${Date.now()}`;
    const userMessage: ChatMessage = {
      id: userMsgId,
      role: "user",
      text: textToSend || (attachedPdf ? `Please analyze this ${attachedPdf.source} PDF: ${attachedPdf.name}` : ""),
      image: selectedImage || undefined,
      pdf: attachedPdf ? { ...attachedPdf } : undefined,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText("");
    setSelectedImage(null);
    setAttachedPdf(null);
    setShowPlusMenu(false);
    setIsLoading(true);

    const searchTriggers = [
      "latest", "today", "current", "recent", "newest", "recently", "breaking news",
      "weather", "stock price", "crypto price", "live sports", "sports score",
      "news on", "what happened in", "yesterday", "who won", "current president"
    ];
    const needsSearchPrediction = searchTriggers.some(trigger => textToSend.toLowerCase().includes(trigger));
    setIsWebSearching(needsSearchPrediction);

    setErrorMessage(null);

    const timeoutLimit = Number(localStorage.getItem("studymate_ai_timeout")) || 30000;
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeoutLimit);

    try {
      const recentHistory = messages
        .filter(m => m.id !== "welcome" && m.id !== "welcome-reset")
        .slice(-15)
        .map(m => ({
          role: m.role,
          message: m.text
        }));

      let finalPrompt = textToSend;
      if (userMessage.pdf) {
        finalPrompt = `[Attached PDF Document (${userMessage.pdf.source}): "${userMessage.pdf.name}" (${userMessage.pdf.size || "PDF"})]\n\n` + (finalPrompt || "Please analyze this PDF document, summarize key concepts, formulas, and answer any questions from it.");
      }
      if (usePersonalization) {
        finalPrompt += `\n\n[Personalization Context: Student Grade level is "${profile.classGrade}", targeting exam "${profile.targetExam}". Favorite subjects are: ${profile.favoriteSubjects.join(", ") || "None"}. Weak subjects needing extra patient guidance are: ${profile.weakSubjects.join(", ") || "None"}.]`;
      }

      let token = localStorage.getItem("studymate_token") || window.localStorage.getItem("studymate_token") || "";
      let email = localStorage.getItem("studymate_logged_in_email") || window.localStorage.getItem("studymate_logged_in_email") || "shivamguptaddp6312@gmail.com";

      if (!token) {
        try {
          const guestRes = await fetch("/api/auth/guest-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email })
          });
          if (guestRes.ok) {
            const guestData = await guestRes.json();
            token = guestData.token;
            window.localStorage.setItem("studymate_token", token);
            window.localStorage.setItem("studymate_logged_in_email", guestData.email);
          }
        } catch (e) {}
      }

      let response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        signal: controller.signal,
        body: JSON.stringify({
          message: finalPrompt,
          history: recentHistory,
          image: userMessage.image || undefined,
          provider: localStorage.getItem("studymate_ai_provider") || "auto",
          timeoutMs: timeoutLimit
        })
      });

      if (response.status === 401) {
        try {
          const reauthRes = await fetch("/api/auth/guest-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({ email })
          });
          if (reauthRes.ok) {
            const reauthData = await reauthRes.json();
            token = reauthData.token;
            window.localStorage.setItem("studymate_token", token);
            window.localStorage.setItem("studymate_logged_in_email", reauthData.email);
            response = await fetch("/api/gemini/chat", {
              method: "POST",
              headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
              },
              signal: controller.signal,
              body: JSON.stringify({
                message: finalPrompt,
                history: recentHistory,
                image: userMessage.image || undefined,
                provider: localStorage.getItem("studymate_ai_provider") || "auto",
                timeoutMs: timeoutLimit
              })
            });
          }
        } catch (e) {}
      }

      clearTimeout(timeoutId);

      if (response.status === 504) throw new Error("The AI partner timed out. Please try again.");
      if (response.status === 499) throw new Error("Request cancelled.");
      if (!response.ok) throw new Error(`Server returned status ${response.status}`);

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      const replyText = data.reply || "I apologize, but I was unable to generate a response. Please try again.";

      setMessages(prev => [...prev, {
        id: `msg-model-${Date.now()}`,
        role: "model",
        text: replyText,
        timestamp: new Date(),
        searched: data.searched,
        searchQuery: data.searchQuery,
        sources: data.sources,
        searchError: data.searchError
      }]);

      if (onAwardXP && textToSend.length > 5) {
        onAwardXP(3, "Studied with StudyMate AI");
      }

    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === "AbortError" || controller.signal.aborted) {
        setErrorMessage("Request timed out or was cancelled.");
      } else {
        setErrorMessage(err.message || "Failed to communicate with StudyMate AI.");
      }
    } finally {
      setIsLoading(false);
      setIsWebSearching(false);
      abortControllerRef.current = null;
    }
  };

  const triggerSuggestedPrompt = (prompt: string) => {
    handleSend(undefined, prompt);
  };

  // Dynamic suggestions engine based on chat history
  const getDynamicSuggestions = () => {
    if (messages.length <= 1) {
      return [
        { label: "💡 Active Recall Hacks", text: "What are the most scientifically proven active recall techniques for exam prep?" },
        { label: "📐 Math Homework Help", text: "Help me solve a challenging math problem step-by-step suited for Class " + profile.classGrade },
        { label: "🧪 Mind-Blowing Science", text: "Explain a mind-blowing physics or chemistry concept simply." },
        { label: "📝 Summarize Notes", text: "How can I summarize a heavy textbook chapter efficiently into a high-yield cheat sheet?" }
      ];
    }

    const lastMsg = messages[messages.length - 1];
    if (lastMsg.role === "user") {
      return [
        { label: "⚡ Key Takeaways", text: "What are the top 3 core takeaways I should write down from this?" },
        { label: "☕ Study Break Strategy", text: "How should I structure my Pomodoro study breaks today?" }
      ];
    }

    const txt = lastMsg.text.toLowerCase();
    if (txt.includes("math") || txt.includes("equation") || txt.includes("solve") || txt.includes("=") || txt.includes("formula")) {
      return [
        { label: "🔄 Similar Practice Problem", text: "Give me one practice problem of a similar type to test myself!" },
        { label: "🧑‍🏫 Breakdown Formula", text: "Can you break down the mathematical formula used here in plain terms?" },
        { label: "✨ Alternative Method", text: "Are there any shortcut or alternative methods to solve this?" }
      ];
    }
    if (txt.includes("science") || txt.includes("chemistry") || txt.includes("physics") || txt.includes("biology") || txt.includes("atom")) {
      return [
        { label: "🌾 Real-World Analogy", text: "Can you explain this concept using a simple real-life analogy?" },
        { label: "❓ 3-Question Practice Quiz", text: "Generate a quick 3-question multiple-choice quiz on this concept." },
        { label: "📚 Common Exam Questions", text: "What are the most common exam questions asked about this topic?" }
      ];
    }

    return [
      { label: "💡 Explain Simpler", text: "Can you explain that again, but simpler?" },
      { label: "🧠 Memory Mnemonic", text: "Can you create a fun mnemonic device to help me memorize this?" },
      { label: "❓ Test My Knowledge", text: "Ask me a follow-up question to test if I understood this correctly!" },
      { label: "⚡ High-Yield Notes", text: "Summarize this into 3 concise bullet points for my study notebook." }
    ];
  };

  // The 8 Specified Quick AI Tools
  const VISION_TOOLS = [
    {
      id: "scan_question",
      label: "Scan Question",
      desc: "Instant camera scanner with auto-crop & step solver",
      icon: Camera,
      color: "from-blue-500 via-indigo-500 to-purple-600",
      action: () => startCamera()
    },
    {
      id: "ocr_transcribe",
      label: "OCR Transcribe",
      desc: "Transcribe notes, handwriting & textbook formulas",
      icon: FileText,
      color: "from-emerald-500 via-teal-500 to-cyan-600",
      action: () => {
        fileInputRef.current?.click();
        if (onAddNotification) onAddNotification("OCR Upload Ready", "Upload an image of notes or handwriting for instant transcription.", "info");
      }
    },
    {
      id: "solve_homework",
      label: "Solve Homework",
      desc: "Step-by-step solutions with fundamental breakdowns",
      icon: GraduationCap,
      color: "from-indigo-500 via-purple-500 to-pink-600",
      action: () => setInputText("Help me solve this homework question step-by-step: ")
    },
    {
      id: "image_analysis",
      label: "Image Analysis",
      desc: "Diagram, graph, chart & visual figure breakdown",
      icon: ImageIcon,
      color: "from-violet-500 via-purple-500 to-indigo-600",
      action: () => fileInputRef.current?.click()
    }
  ];

  const LEARNING_TOOLS = [
    {
      id: "explain_concepts",
      label: "Explain Concepts",
      desc: "Patient, grade-tailored tutoring & simple analogies",
      icon: Brain,
      color: "from-purple-500 via-pink-500 to-rose-600",
      action: () => setInputText(`Can you explain the concept of [Topic] tailored for Class ${profile.classGrade || "10"}?`)
    },
    {
      id: "generate_quiz",
      label: "Generate Quiz",
      desc: "Custom multiple-choice self-assessment test",
      icon: CheckCircle,
      color: "from-amber-500 via-orange-500 to-rose-600",
      action: () => setInputText(`Generate a 3-question diagnostic quiz with answer key on Class ${profile.classGrade || "10"} syllabus.`)
    },
    {
      id: "summarize_notes",
      label: "Summarize Notes",
      desc: "Extract core highlights, cheat sheets & formulas",
      icon: Sparkles,
      color: "from-rose-500 via-pink-500 to-purple-600",
      action: () => setInputText("Generate a structured summary and cheat sheet for these chapter notes: ")
    },
    {
      id: "pdf_analysis",
      label: "Upload Drive PDF",
      desc: "Upload & analyze Google Drive PDFs, syllabus & chapters",
      icon: CloudUpload,
      color: "from-emerald-500 via-teal-500 to-cyan-600",
      action: () => setShowDriveModal(true)
    }
  ];

  return (
    <div 
      id="studymate_ai_workspace" 
      className={`bg-slate-50/40 dark:bg-slate-950/40 backdrop-blur-xl shadow-2xl flex flex-col overflow-hidden relative transition-all duration-300 ${
        isFullScreen 
          ? "w-screen h-screen rounded-none border-none" 
          : "border border-white/30 dark:border-slate-800/80 rounded-3xl h-[calc(100vh-140px)]"
      }`}
    >
      {/* Background ambient lighting glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-tr from-indigo-500/10 via-purple-500/8 to-pink-500/5 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-gradient-to-tr from-cyan-500/8 via-indigo-500/8 to-purple-500/10 blur-3xl rounded-full pointer-events-none" />

      {/* Clear Chat confirmation modal */}
      <AnimatePresence>
        {showClearConfirm && (
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-white/20 dark:border-slate-800 rounded-3xl p-6 shadow-2xl max-w-sm w-full text-center space-y-4"
            >
              <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto shadow-inner">
                <Trash2 className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">Clear Chat Workspace?</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">This will reset your conversation with StudyMate AI. Action cannot be undone.</p>
              </div>
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-extrabold text-xs rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const resetMessages: ChatMessage[] = [
                      {
                        id: "welcome-reset",
                        role: "model",
                        text: `Workspace cleared! Ready for a new study session, homework query, or exam question.`,
                        timestamp: new Date()
                      }
                    ];
                    setMessages(resetMessages);
                    setSelectedImage(null);
                    setErrorMessage(null);
                    setShowClearConfirm(false);
                    if (onAddNotification) {
                      onAddNotification("Chat Reset", "Your conversation history has been cleared.", "success");
                    }
                  }}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs rounded-xl shadow-md transition cursor-pointer"
                >
                  Clear History
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Header Bar */}
      <div className="p-4 border-b border-white/20 dark:border-slate-800/50 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl flex items-center justify-between flex-shrink-0 z-10 shadow-xs">
        <div className="flex items-center space-x-3.5">
          <div className="relative">
            <StudyMateBrainLogo isActive={true} size={32} />
            <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full shadow-md animate-pulse"></span>
          </div>
          <div>
            <h3 className="font-black text-sm text-slate-800 dark:text-slate-100 flex items-center space-x-2">
              <span>StudyMate AI</span>
              <span className="text-[9px] font-black tracking-widest uppercase bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-2 py-0.5 rounded-full shadow-xs">
                AI WORKSPACE
              </span>
            </h3>
            <p className="text-[10px] text-slate-400 font-bold flex items-center space-x-1.5 mt-0.5">
              <span>Cognitive Academic Engine</span>
              <span>•</span>
              <span className="text-indigo-500 dark:text-indigo-400 font-extrabold flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-indigo-400" /> Powered by Gemini
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Personalization Toggle */}
          <button
            type="button"
            onClick={() => setUsePersonalization(!usePersonalization)}
            className={`text-[10px] font-black border px-3 py-2 rounded-xl transition duration-150 flex items-center space-x-1.5 cursor-pointer shadow-xs ${
              usePersonalization 
                ? "bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-200/40 dark:border-indigo-900/40"
                : "bg-slate-100 dark:bg-slate-800/50 text-slate-400 border-slate-200/60 dark:border-slate-700/60"
            }`}
            title="Tailor explanations based on your Grade and weak subjects"
          >
            <Brain className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{usePersonalization ? `Class ${profile.classGrade || "10"} Tailored` : "General Mode"}</span>
          </button>

          {/* Full Screen Toggle */}
          {onToggleFullScreen && (
            <button
              type="button"
              onClick={onToggleFullScreen}
              className="p-2 bg-slate-100 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-800 rounded-xl transition cursor-pointer text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 shadow-xs"
              title={isFullScreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
              {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          )}

          {/* Clear History */}
          <button
            type="button"
            onClick={() => setShowClearConfirm(true)}
            className="p-2 bg-slate-100 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/20 hover:text-rose-500 rounded-xl transition cursor-pointer text-slate-400 shadow-xs"
            title="Clear Workspace History"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages / Main Workspace Body */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-transparent scroll-smooth relative"
      >
        {/* Dynamic Island Floating VisionOS HUD */}
        <div className="sticky top-0 z-30 flex justify-center py-1 pointer-events-auto">
          <DynamicIslandAI
            isListening={isListening}
            isLoading={isLoading}
            isScanning={cameraActive || cropSourceImage !== null}
            isTyping={inputText.trim().length > 0}
            activePrompt={inputText || (messages.length > 0 && messages[messages.length - 1].role === "user" ? messages[messages.length - 1].text : undefined)}
            onToggleListen={toggleVoiceInput}
            onToggleCamera={() => startCamera()}
            onCancelRequest={handleCancelRequest}
          />
        </div>

        {/* TOP HERO AREA WITH LARGE ANIMATED AI ORB & EXPANDABLE QUICK AI TOOLS */}
        {messages.length <= 1 ? (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-4xl mx-auto py-6 md:py-8 space-y-8 text-center"
          >
            {/* The Large Animated AI Orb */}
            <div className="relative inline-block py-2">
              <AIOrb isLoading={isLoading} isTyping={inputText !== ""} isListening={isListening} size="lg" />
            </div>

            <div className="space-y-2.5 max-w-xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 dark:from-indigo-400 dark:to-purple-300 tracking-tight">
                StudyMate Flagship AI
              </h2>
              <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                Adaptive learning companion customized for <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">{profile.fullName || "Student"}</span>. Choose a Quick AI Tool or ask any question.
              </p>
            </div>

            {/* EXPANDABLE QUICK AI TOOLS (GROUPED IN GLASS CARDS) */}
            <div className="space-y-4 pt-2 text-left">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center space-x-2">
                  <Zap className="w-4 h-4 text-indigo-500 animate-pulse" />
                  <h4 className="text-xs font-black uppercase text-indigo-500 tracking-wider">Quick AI Tools</h4>
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={() => setExpandedToolCategory(expandedToolCategory === "all" ? null : "all")}
                    className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-full border border-indigo-200/50 dark:border-indigo-900/30"
                  >
                    {expandedToolCategory === "all" ? "Collapse All" : "Expand All"}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* GLASS CARD 1: PROBLEM SOLVING & VISION */}
                <div className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-white/30 dark:border-slate-800/80 rounded-3xl p-4.5 shadow-xl transition-all duration-300">
                  <button
                    type="button"
                    onClick={() => setExpandedToolCategory(expandedToolCategory === "vision" ? null : "vision")}
                    className="w-full flex items-center justify-between pb-3 border-b border-slate-200/50 dark:border-slate-800/50 cursor-pointer"
                  >
                    <div className="flex items-center space-x-2.5">
                      <div className="p-2 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-xl text-white shadow-md">
                        <Camera className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <h5 className="font-extrabold text-xs text-slate-800 dark:text-slate-200">Problem Solving & Vision</h5>
                        <p className="text-[9px] text-slate-400 font-semibold">Scan, OCR, math solver & image analysis</p>
                      </div>
                    </div>
                    {expandedToolCategory === "vision" || expandedToolCategory === "all" ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </button>

                  <AnimatePresence>
                    {(expandedToolCategory === "vision" || expandedToolCategory === "all") && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-3"
                      >
                        {VISION_TOOLS.map((tool) => {
                          const IconComp = tool.icon;
                          return (
                            <button
                              key={tool.id}
                              type="button"
                              onClick={tool.action}
                              className="p-3 bg-slate-50/80 dark:bg-slate-950/40 hover:bg-indigo-50/80 dark:hover:bg-indigo-950/30 border border-slate-200/50 dark:border-slate-800/60 hover:border-indigo-300 dark:hover:border-indigo-900/50 rounded-2xl text-left transition cursor-pointer group flex items-start space-x-2.5 shadow-xs"
                            >
                              <div className={`p-2 bg-gradient-to-tr ${tool.color} text-white rounded-xl shadow-sm shrink-0 group-hover:scale-110 transition`}>
                                <IconComp className="w-3.5 h-3.5" />
                              </div>
                              <div className="overflow-hidden">
                                <span className="font-extrabold text-xs text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 block truncate">{tool.label}</span>
                                <span className="text-[9px] text-slate-400 block line-clamp-2 leading-tight mt-0.5">{tool.desc}</span>
                              </div>
                            </button>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* GLASS CARD 2: LEARNING & CONTENT GENERATION */}
                <div className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-white/30 dark:border-slate-800/80 rounded-3xl p-4.5 shadow-xl transition-all duration-300">
                  <button
                    type="button"
                    onClick={() => setExpandedToolCategory(expandedToolCategory === "learning" ? null : "learning")}
                    className="w-full flex items-center justify-between pb-3 border-b border-slate-200/50 dark:border-slate-800/50 cursor-pointer"
                  >
                    <div className="flex items-center space-x-2.5">
                      <div className="p-2 bg-gradient-to-tr from-purple-500 to-pink-600 rounded-xl text-white shadow-md">
                        <Brain className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <h5 className="font-extrabold text-xs text-slate-800 dark:text-slate-200">Learning & Content AI</h5>
                        <p className="text-[9px] text-slate-400 font-semibold">Concepts, quiz, notes summary & PDF analysis</p>
                      </div>
                    </div>
                    {expandedToolCategory === "learning" || expandedToolCategory === "all" ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </button>

                  <AnimatePresence>
                    {(expandedToolCategory === "learning" || expandedToolCategory === "all") && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-3"
                      >
                        {LEARNING_TOOLS.map((tool) => {
                          const IconComp = tool.icon;
                          return (
                            <button
                              key={tool.id}
                              type="button"
                              onClick={tool.action}
                              className="p-3 bg-slate-50/80 dark:bg-slate-950/40 hover:bg-indigo-50/80 dark:hover:bg-indigo-950/30 border border-slate-200/50 dark:border-slate-800/60 hover:border-indigo-300 dark:hover:border-indigo-900/50 rounded-2xl text-left transition cursor-pointer group flex items-start space-x-2.5 shadow-xs"
                            >
                              <div className={`p-2 bg-gradient-to-tr ${tool.color} text-white rounded-xl shadow-sm shrink-0 group-hover:scale-110 transition`}>
                                <IconComp className="w-3.5 h-3.5" />
                              </div>
                              <div className="overflow-hidden">
                                <span className="font-extrabold text-xs text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 block truncate">{tool.label}</span>
                                <span className="text-[9px] text-slate-400 block line-clamp-2 leading-tight mt-0.5">{tool.desc}</span>
                              </div>
                            </button>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          /* Render Active Conversation Bubbles */
          messages.map((msg) => (
            <ChatMessageBubble 
              key={msg.id} 
              msg={msg} 
              onCopyText={copyToClipboard}
              onSpeakText={speakText}
              isSpeaking={speakingMsgId === "speaking"}
            />
          ))
        )}

        {/* Thinking & Skeleton Loading State */}
        <AnimatePresence>
          {isLoading && (
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="flex flex-col items-start space-y-3 w-full max-w-[85%] md:max-w-[78%]"
            >
              {/* Orb Mini thinking indicator */}
              <div className="flex items-center space-x-2 text-[10px] font-bold text-slate-400 px-2 animate-pulse">
                <AIOrb isLoading={true} isTyping={false} size="sm" />
                <span className="text-indigo-500 font-extrabold">
                  {isWebSearching ? "Searching global web sources..." : "Synthesizing step-by-step cognitive solution..."}
                </span>
              </div>

              {/* Skeleton loading bubble */}
              <div className="w-full bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-white/30 dark:border-slate-800/60 rounded-3xl rounded-tl-sm p-5 shadow-xl space-y-4 overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 dark:via-indigo-500/10 to-transparent translate-x-[-100%] animate-[shimmer_1.8s_infinite] pointer-events-none" />

                <div className="space-y-2.5">
                  <div className="h-3.5 bg-indigo-200/50 dark:bg-indigo-900/40 rounded-full w-[45%] animate-pulse" />
                  <div className="h-3 bg-slate-200/60 dark:bg-slate-800/60 rounded-full w-[92%] animate-pulse" />
                  <div className="h-3 bg-slate-200/50 dark:bg-slate-800/50 rounded-full w-[88%] animate-pulse" />
                  <div className="h-3 bg-slate-200/40 dark:bg-slate-800/40 rounded-full w-[60%] animate-pulse" />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200/40 dark:border-slate-800/40">
                  <span className="text-[10px] font-black text-indigo-500">Processing StudyMate AI</span>
                  <button
                    type="button"
                    onClick={handleCancelRequest}
                    className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-[10px] font-black rounded-full cursor-pointer transition flex items-center space-x-1"
                  >
                    <X className="w-3 h-3" />
                    <span>Cancel</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Warning / Error Notifications */}
        {qualityWarning && (
          <div className="p-3.5 bg-amber-50/80 dark:bg-amber-950/30 backdrop-blur-md border border-amber-200/60 dark:border-amber-900/40 rounded-2xl flex items-start space-x-2.5 text-amber-700 dark:text-amber-300 text-xs shadow-md">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 animate-bounce text-amber-500" />
            <div className="flex-1">
              <span className="font-extrabold block">Image Quality Notice</span>
              <span className="block text-[11px] mt-0.5 opacity-90">{qualityWarning}</span>
            </div>
            <button onClick={() => setQualityWarning(null)} className="text-[10px] font-bold underline cursor-pointer">
              Dismiss
            </button>
          </div>
        )}

        {errorMessage && (
          <div className="my-2">
            <PremiumErrorCard
              compact
              type="ai"
              title="AI Partner Communication Error"
              description={errorMessage}
              error={errorMessage}
              onRetry={() => {
                setErrorMessage(null);
              }}
              onGoBack={() => setErrorMessage(null)}
            />
          </div>
        )}
      </div>

      {/* FLOATING AI SUGGESTIONS CHIPS SLIDER */}
      <div className="px-4 py-1.5 bg-transparent z-10 flex-shrink-0">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center space-x-1.5 mb-1 px-1 opacity-80">
            <Sparkles className="w-3 h-3 text-indigo-500 animate-pulse" />
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">
              AI Suggestions
            </span>
          </div>
          <div className="flex overflow-x-auto gap-2 pb-1 scrollbar-none pr-4 -mr-4">
            {getDynamicSuggestions().map((chip, idx) => (
              <motion.button
                key={chip.label + idx}
                type="button"
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => triggerSuggestedPrompt(chip.text)}
                className="bg-white/80 dark:bg-slate-900/70 backdrop-blur-md hover:bg-indigo-50/80 dark:hover:bg-indigo-950/40 border border-white/30 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-900/60 px-3 py-1.5 rounded-full text-[11px] text-slate-700 dark:text-slate-200 transition cursor-pointer shadow-xs font-bold flex items-center space-x-1.5 whitespace-nowrap"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                <span>{chip.label}</span>
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Selected Image Attachment Preview */}
      {selectedImage && (
        <div className="px-4 py-2 border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/60 dark:bg-indigo-950/30 backdrop-blur-xl rounded-2xl mx-auto w-[94%] max-w-4xl mb-2 flex items-center justify-between flex-shrink-0 shadow-lg">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden border-2 border-indigo-300 dark:border-indigo-800 bg-white shadow-md">
              <img src={selectedImage} alt="Selection Preview" className="w-full h-full object-cover" />
            </div>
            <div>
              <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 block">Visual Resource Attached</span>
              <span className="text-[10px] text-slate-400 font-semibold block">Ready for StudyMate AI analysis</span>
            </div>
          </div>
          <button
            onClick={() => setSelectedImage(null)}
            className="p-1.5 bg-rose-50 dark:bg-rose-950/40 text-rose-500 rounded-full hover:bg-rose-100 transition cursor-pointer"
            title="Remove Attachment"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Selected PDF Attachment Preview */}
      {attachedPdf && (
        <div className="px-4 py-2 border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/70 dark:bg-emerald-950/40 backdrop-blur-xl rounded-2xl mx-auto w-[94%] max-w-4xl mb-2 flex items-center justify-between flex-shrink-0 shadow-lg">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-gradient-to-tr from-emerald-500 to-teal-600 text-white rounded-xl shadow-md">
              <CloudUpload className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-[9px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded">
                  {attachedPdf.source} PDF
                </span>
              </div>
              <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 block truncate max-w-xs">
                {attachedPdf.name}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setAttachedPdf(null)}
            className="p-1.5 bg-rose-50 dark:bg-rose-950/40 text-rose-500 rounded-full hover:bg-rose-100 transition cursor-pointer"
            title="Remove Attachment"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* FLOATING ACTION DOCK AT THE BOTTOM */}
      <div className="p-3 bg-transparent flex-shrink-0 z-10 relative">
        <form 
          onSubmit={handleSend}
          className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-white/40 dark:border-slate-800/80 shadow-[0_15px_40px_rgba(0,0,0,0.12)] rounded-full p-2 mx-auto w-[96%] max-w-4xl flex items-center space-x-2"
        >
          {/* Image File Input */}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImageSelect}
            accept="image/*"
            className="hidden"
          />

          {/* PDF File Input */}
          <input 
            type="file" 
            ref={pdfFileInputRef} 
            onChange={handlePdfFileSelect}
            accept=".pdf,.doc,.docx,.txt"
            className="hidden"
          />

          {/* SINGLE PLUS ICON BUTTON WITH POPUP ATTACHMENT MENU */}
          <div className="relative pl-1">
            {/* Backdrop to close plus menu when clicking outside */}
            {showPlusMenu && (
              <div 
                className="fixed inset-0 z-40 bg-transparent" 
                onClick={() => setShowPlusMenu(false)} 
              />
            )}

            <button
              type="button"
              onClick={() => setShowPlusMenu(!showPlusMenu)}
              className={`p-2.5 rounded-full border transition-all duration-200 cursor-pointer shadow-xs relative z-50 ${
                showPlusMenu 
                  ? "bg-indigo-600 text-white border-indigo-600 rotate-45 shadow-md shadow-indigo-500/30" 
                  : "bg-slate-100/80 dark:bg-slate-800/50 border-slate-200/50 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
              }`}
              title="Add Camera, Gallery Photo, or Drive PDF"
            >
              <Plus className="w-4 h-4 transition-transform duration-200" />
            </button>

            {/* Floating Plus Action Menu */}
            <AnimatePresence>
              {showPlusMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute bottom-12 left-0 w-64 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-white/40 dark:border-slate-800 rounded-3xl p-2 shadow-2xl z-50 space-y-1"
                >
                  <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Attachments</span>
                    <span className="text-[9px] font-bold text-indigo-500">StudyMate</span>
                  </div>

                  {/* Camera Option */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowPlusMenu(false);
                      startCamera();
                    }}
                    className="w-full p-2.5 hover:bg-indigo-50/80 dark:hover:bg-indigo-950/40 rounded-2xl flex items-center space-x-3 transition text-left cursor-pointer group"
                  >
                    <div className="p-2 bg-gradient-to-tr from-blue-500 to-indigo-600 text-white rounded-xl shadow-xs group-hover:scale-105 transition">
                      <Camera className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                        Camera Scanner
                      </span>
                      <span className="text-[9px] text-slate-400 font-medium block">
                        Scan textbook question with camera
                      </span>
                    </div>
                  </button>

                  {/* Gallery Option */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowPlusMenu(false);
                      fileInputRef.current?.click();
                    }}
                    className="w-full p-2.5 hover:bg-indigo-50/80 dark:hover:bg-indigo-950/40 rounded-2xl flex items-center space-x-3 transition text-left cursor-pointer group"
                  >
                    <div className="p-2 bg-gradient-to-tr from-purple-500 to-pink-600 text-white rounded-xl shadow-xs group-hover:scale-105 transition">
                      <ImageIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                        Gallery Photo
                      </span>
                      <span className="text-[9px] text-slate-400 font-medium block">
                        Upload image from device gallery
                      </span>
                    </div>
                  </button>

                  {/* Upload PDF from Drive Option */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowPlusMenu(false);
                      setShowDriveModal(true);
                    }}
                    className="w-full p-2.5 hover:bg-indigo-50/80 dark:hover:bg-indigo-950/40 rounded-2xl flex items-center space-x-3 transition text-left cursor-pointer group"
                  >
                    <div className="p-2 bg-gradient-to-tr from-emerald-500 to-teal-600 text-white rounded-xl shadow-xs group-hover:scale-105 transition">
                      <CloudUpload className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block group-hover:text-indigo-600 dark:group-hover:text-indigo-400 flex items-center gap-1">
                        Upload PDF from Drive
                        <span className="text-[8px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-md font-black">NEW</span>
                      </span>
                      <span className="text-[9px] text-slate-400 font-medium block">
                        Import Google Drive PDF document
                      </span>
                    </div>
                  </button>

                  {/* Local Document Option */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowPlusMenu(false);
                      pdfFileInputRef.current?.click();
                    }}
                    className="w-full p-2.5 hover:bg-indigo-50/80 dark:hover:bg-indigo-950/40 rounded-2xl flex items-center space-x-3 transition text-left cursor-pointer group"
                  >
                    <div className="p-2 bg-gradient-to-tr from-cyan-500 to-blue-600 text-white rounded-xl shadow-xs group-hover:scale-105 transition">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                        Local PDF Document
                      </span>
                      <span className="text-[9px] text-slate-400 font-medium block">
                        Attach document from computer
                      </span>
                    </div>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 mx-1" />

          {/* Prompt Input Field */}
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              selectedImage 
                ? "Describe what to solve in the image..." 
                : attachedPdf
                  ? `Ask a question about ${attachedPdf.name}...`
                  : "Ask StudyMate AI anything..."
            }
            className="flex-1 bg-transparent border-none rounded-full px-3 py-2 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none font-medium"
            disabled={isLoading}
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={isLoading || (!inputText.trim() && !selectedImage && !attachedPdf)}
            className={`p-3 rounded-full text-white font-bold flex items-center justify-center transition-all duration-300 shrink-0 shadow-md ${
              (inputText.trim() || selectedImage || attachedPdf) && !isLoading
                ? "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 hover:scale-105 cursor-pointer shadow-indigo-500/20"
                : "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed"
            }`}
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* GOOGLE DRIVE PDF UPLOAD MODAL */}
      <AnimatePresence>
        {showDriveModal && (
          <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md z-[160] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-white/20 dark:border-slate-800 rounded-3xl p-6 shadow-2xl max-w-lg w-full space-y-5 relative overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-600 text-white rounded-2xl shadow-lg">
                    <CloudUpload className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
                      Upload PDF from Google Drive
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      Import textbook chapters, syllabus notes, or sample papers directly
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowDriveModal(false);
                    setDriveError(null);
                  }}
                  className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-500 dark:text-slate-400 rounded-full transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Option A: Paste Google Drive URL */}
              <div className="space-y-2 pt-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Paste Google Drive Shareable Link</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={driveUrlInput}
                    onChange={(e) => {
                      setDriveUrlInput(e.target.value);
                      setDriveError(null);
                    }}
                    placeholder="https://drive.google.com/file/d/..."
                    className="flex-1 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleImportDriveUrl}
                    className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5 shrink-0"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Import</span>
                  </button>
                </div>
                {driveError && (
                  <p className="text-[10px] text-rose-500 font-bold flex items-center gap-1">
                    <span>⚠️</span> {driveError}
                  </p>
                )}
              </div>

              {/* Divider */}
              <div className="flex items-center my-3">
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                <span className="px-3 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  OR SELECT DRIVE STUDY MATERIALS
                </span>
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
              </div>

              {/* Option B: Curated Sample Drive PDFs */}
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {[
                  { name: `NCERT_Class_${profile.classGrade || "10"}_Science_Physics_Ch1.pdf`, size: "1.8 MB", topic: "Electricity & Magnetism" },
                  { name: `CBSE_Class_${profile.classGrade || "10"}_Math_Sample_Paper_2026.pdf`, size: "2.4 MB", topic: "Board Exam Prep" },
                  { name: `Chemistry_Reaction_Mechanisms_FormulaSheet.pdf`, size: "950 KB", topic: "High Yield Formulae" },
                  { name: `Biology_Diagrams_and_Key_Notes.pdf`, size: "1.2 MB", topic: "Illustrated Notes" }
                ].map((doc, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectDriveSample(doc.name, doc.size)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/40 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border border-slate-200/60 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-900 rounded-xl flex items-center justify-between transition cursor-pointer text-left group"
                  >
                    <div className="flex items-center space-x-2.5 overflow-hidden">
                      <div className="p-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg group-hover:scale-110 transition shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                          {doc.name}
                        </span>
                        <span className="text-[9px] text-slate-400 font-medium block">
                          Google Drive • {doc.topic} • {doc.size}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg shrink-0">
                      Attach
                    </span>
                  </button>
                ))}
              </div>

              {/* Local File Fallback Button */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => {
                    setShowDriveModal(false);
                    pdfFileInputRef.current?.click();
                  }}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1.5 cursor-pointer"
                >
                  <Folder className="w-3.5 h-3.5" />
                  <span>Or upload PDF from device</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowDriveModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-extrabold text-xs rounded-xl transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* LIVE CAMERA QUESTION SCANNER OVERLAY */}
      {cameraActive && (
        <div className="fixed inset-0 bg-slate-950/95 z-[150] flex flex-col items-center justify-between p-4 md:p-6 select-none">
          <div className="w-full max-w-md flex justify-between items-center text-white pt-4">
            <div className="flex items-center space-x-2">
              <Camera className="w-5 h-5 text-indigo-400 animate-pulse" />
              <div>
                <h3 className="font-extrabold text-sm">Question Scanner</h3>
                <p className="text-[9px] text-slate-400 font-bold">Align your textbook question</p>
              </div>
            </div>
            <button 
              type="button"
              onClick={stopCamera} 
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full transition cursor-pointer text-slate-300 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="relative w-full max-w-sm aspect-square bg-slate-900 border border-indigo-500/30 rounded-3xl overflow-hidden shadow-inner flex items-center justify-center">
            <video 
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-8 border border-white/20 rounded-2xl pointer-events-none flex items-center justify-center">
              <div className="w-10 h-10 border-t-2 border-l-2 border-indigo-500 absolute top-0 left-0"></div>
              <div className="w-10 h-10 border-t-2 border-r-2 border-indigo-500 absolute top-0 right-0"></div>
              <div className="w-10 h-10 border-b-2 border-l-2 border-indigo-500 absolute bottom-0 left-0"></div>
              <div className="w-10 h-10 border-b-2 border-r-2 border-indigo-500 absolute bottom-0 right-0"></div>
              
              <span className="text-[10px] text-white/50 bg-black/40 px-2 py-1 rounded-md font-semibold text-center">
                StudyMate Scan Target
              </span>
            </div>
          </div>

          <div className="w-full max-w-md pb-6 flex flex-col items-center space-y-4">
            <button
              type="button"
              onClick={capturePhoto}
              className="w-16 h-16 bg-white hover:bg-slate-200 border-4 border-slate-700/50 rounded-full shadow-lg transition active:scale-95 cursor-pointer flex items-center justify-center"
              title="Capture Image"
            >
              <div className="w-8 h-8 bg-indigo-600 rounded-full"></div>
            </button>
            <p className="text-[10px] text-slate-400 font-semibold text-center max-w-xs">
              StudyMate will capture, allow hand cropping, and deliver a step-by-step solution.
            </p>
          </div>
        </div>
      )}

      {/* HAND CROPPING TOOL OVERLAY */}
      {cropSourceImage && (
        <div 
          className="fixed inset-0 bg-slate-950/95 z-[150] flex flex-col items-center justify-between p-4 md:p-6"
          onMouseMove={handleCropDragMove}
          onTouchMove={handleCropDragMove}
          onMouseUp={handleCropDragEnd}
          onTouchEnd={handleCropDragEnd}
        >
          <div className="w-full max-w-md flex justify-between items-center text-white pt-4">
            <div className="flex items-center space-x-2">
              <Crop className="w-5 h-5 text-indigo-400" />
              <div>
                <h3 className="font-extrabold text-sm">Crop Your Question</h3>
                <p className="text-[9px] text-slate-400 font-bold">Use hand corners to select a particular question</p>
              </div>
            </div>
            <button 
              type="button"
              onClick={() => setCropSourceImage(null)} 
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full transition cursor-pointer text-slate-300 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div 
            ref={cropStageRef}
            className="relative w-full max-w-sm aspect-square bg-slate-900 border border-slate-800/80 rounded-3xl overflow-hidden select-none cursor-crosshair flex items-center justify-center"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('bg-black/60')) {
                handleCropDragStart(e, "pan");
              }
            }}
            onTouchStart={(e) => {
              if (e.touches.length === 2) {
                handleCropDragStart(e, "pan");
              } else if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('bg-black/60')) {
                handleCropDragStart(e, "pan");
              }
            }}
          >
            <div 
              className="w-full h-full transition-transform duration-75 ease-out"
              style={{
                transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
                transformOrigin: "center center"
              }}
            >
              <img 
                src={cropSourceImage} 
                alt="Source to Crop" 
                className="w-full h-full object-contain pointer-events-none" 
              />
            </div>

            <div className="absolute inset-0 bg-black/60 pointer-events-none"></div>

            <div 
              className="absolute border-2 border-indigo-400 bg-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] cursor-move rounded-md"
              style={{
                left: `${cropBox.x}%`,
                top: `${cropBox.y}%`,
                width: `${cropBox.width}%`,
                height: `${cropBox.height}%`,
              }}
              onMouseDown={(e) => handleCropDragStart(e, "center")}
              onTouchStart={(e) => handleCropDragStart(e, "center")}
            >
              <div 
                className="absolute -top-1.5 -left-1.5 w-4.5 h-4.5 bg-indigo-500 border border-white rounded-full cursor-nwse-resize active:scale-125 transition-transform"
                onMouseDown={(e) => { e.stopPropagation(); handleCropDragStart(e, "tl"); }}
                onTouchStart={(e) => { e.stopPropagation(); handleCropDragStart(e, "tl"); }}
              ></div>
              <div 
                className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 bg-indigo-500 border border-white rounded-full cursor-nesw-resize active:scale-125 transition-transform"
                onMouseDown={(e) => { e.stopPropagation(); handleCropDragStart(e, "tr"); }}
                onTouchStart={(e) => { e.stopPropagation(); handleCropDragStart(e, "tr"); }}
              ></div>
              <div 
                className="absolute -bottom-1.5 -left-1.5 w-4.5 h-4.5 bg-indigo-500 border border-white rounded-full cursor-nesw-resize active:scale-125 transition-transform"
                onMouseDown={(e) => { e.stopPropagation(); handleCropDragStart(e, "bl"); }}
                onTouchStart={(e) => { e.stopPropagation(); handleCropDragStart(e, "bl"); }}
              ></div>
              <div 
                className="absolute -bottom-1.5 -right-1.5 w-4.5 h-4.5 bg-indigo-500 border border-white rounded-full cursor-nwse-resize active:scale-125 transition-transform"
                onMouseDown={(e) => { e.stopPropagation(); handleCropDragStart(e, "br"); }}
                onTouchStart={(e) => { e.stopPropagation(); handleCropDragStart(e, "br"); }}
              ></div>
              
              <div className="absolute inset-0 border border-dashed border-indigo-400/30 pointer-events-none flex items-center justify-center">
                <div className="w-full h-px bg-indigo-400/20 absolute"></div>
                <div className="h-full w-px bg-indigo-400/20 absolute"></div>
              </div>
            </div>
          </div>

          <div className="w-full max-w-sm pb-6 flex flex-col items-center space-y-4">
            <div className="flex items-center justify-center space-x-3 w-full">
              <button
                type="button"
                onClick={handleResetCrop}
                className="flex items-center space-x-1.5 px-3 py-2 bg-slate-850 hover:bg-slate-800 text-xs text-slate-200 hover:text-white rounded-xl transition cursor-pointer font-bold border border-slate-800"
              >
                <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
                <span>Reset</span>
              </button>
              
              <button
                type="button"
                onClick={handleUndoCrop}
                disabled={undoHistory.length === 0}
                className={`flex items-center space-x-1.5 px-3 py-2 text-xs rounded-xl transition font-bold border ${
                  undoHistory.length === 0 
                    ? "bg-slate-900/40 text-slate-600 border-slate-900/60 cursor-not-allowed" 
                    : "bg-slate-850 hover:bg-slate-800 text-slate-200 hover:text-white border-slate-800 cursor-pointer"
                }`}
              >
                <Undo className="w-3.5 h-3.5 text-purple-400" />
                <span>Undo</span>
              </button>

              <div className="flex items-center bg-slate-850 border border-slate-800 rounded-xl px-1">
                <button
                  type="button"
                  onClick={() => setZoom(prev => Math.max(1, prev - 0.25))}
                  className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg text-xs font-black transition cursor-pointer"
                  title="Zoom Out"
                >
                  -
                </button>
                <span className="text-[10px] text-slate-400 font-mono font-bold px-2 w-11 text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoom(prev => Math.min(5, prev + 0.25))}
                  className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg text-xs font-black transition cursor-pointer"
                  title="Zoom In"
                >
                  +
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={executeCrop}
              className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-black rounded-2xl shadow-lg transition active:scale-[0.98] cursor-pointer flex items-center justify-center space-x-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Crop & Solve Question</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
