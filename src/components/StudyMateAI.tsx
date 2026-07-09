import React, { useState, useRef, useEffect } from "react";
import { 
  Sparkles, Send, Image as ImageIcon, Trash2, X, Paperclip, 
  Check, Brain, GraduationCap, Lightbulb, MessageSquare, AlertCircle, RefreshCw,
  Camera, Volume2, VolumeX, Pause, Play, Square, Crop, ArrowRight,
  Rewind, FastForward, Sliders, Settings, CheckCircle, Languages, Activity, ChevronUp, ChevronDown, Repeat
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "motion/react";
import { UserProfile } from "../types";

interface StudyMateAIProps {
  profile: UserProfile;
  onAwardXP?: (amount: number, reason: string) => void;
  onAddNotification?: (title: string, text: string, type: "success" | "info" | "alert") => void;
}

interface ChatMessage {
  id: string;
  role: "user" | "model";
  text: string;
  image?: string; // Base64 string for reference
  timestamp: Date;
}

export interface VoiceProfile {
  id: string;
  name: string;
  gender: "female" | "male";
  avatar: string;
  title: string;
  pitch: number; // custom base pitch
  rate: number; // custom base rate
  description: string;
}

export const VOICE_PROFILES: VoiceProfile[] = [
  { id: "warm_teacher", name: "Mrs. Grace", gender: "female", avatar: "👩‍🏫", title: "Warm Teacher", pitch: 1.0, rate: 0.90, description: "Gentle, caring, and perfectly paced for deep understanding." },
  { id: "friendly_mentor", name: "Tara", gender: "female", avatar: "👩‍🎓", title: "Friendly Student Mentor", pitch: 1.15, rate: 1.05, description: "Peer student mentor with a relaxed, relatable, supportive vibe." },
  { id: "calm_professional", name: "Dr. Alice", gender: "female", avatar: "👩‍💼", title: "Calm Professional", pitch: 1.0, rate: 1.0, description: "Steady, polished academic precision with high clarity." },
  { id: "energetic_tutor", name: "Coach Mia", gender: "female", avatar: "⚡", title: "Energetic Tutor", pitch: 1.25, rate: 1.15, description: "Bright, enthusiastic, and highly motivational style." },
  { id: "pro_teacher", name: "Prof. Robert", gender: "male", avatar: "👨‍🏫", title: "Professional Teacher", pitch: 0.9, rate: 0.92, description: "Authoritative, highly structured, and deeply reassuring guidance." },
  { id: "friendly_male_mentor", name: "Sam", gender: "male", avatar: "👨‍💼", title: "Friendly Mentor", pitch: 0.95, rate: 1.05, description: "Conversational, empathetic, and incredibly patient partner in study." },
  { id: "calm_narrator", name: "Marcus", gender: "male", avatar: "🎙️", title: "Calm Narrator", pitch: 0.8, rate: 0.88, description: "Warm, soothing, deeper-pitched narrational tone." },
  { id: "motivational_coach", name: "Coach Jack", gender: "male", avatar: "🏋️", title: "Motivational Coach", pitch: 1.05, rate: 1.15, description: "High-octane, encouraging, and action-driven coaching." }
];

export default function StudyMateAI({ profile, onAwardXP, onAddNotification }: StudyMateAIProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    // Attempt local storage recall of history for persistence
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
        text: `Hello ${profile.fullName || "Student"}! I am **StudyMate AI**, your dedicated general-knowledge search, coding, writing, and expert academic companion. 

How can I help you today? I can teach you Class 1-12 subjects, solve math equations step-by-step, explain graphs or diagrams, write essays, practice Hifz/Hindi/Hinglish, or just chat about life and study motivation. Ask me anything!`,
        timestamp: new Date()
      }
    ];
  });

  const [inputText, setInputText] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [usePersonalization, setUsePersonalization] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Live Camera Scanner & Hand Cropping tool states
  const [cameraActive, setCameraActive] = useState(false);
  const [cropSourceImage, setCropSourceImage] = useState<string | null>(null);
  const [cropBox, setCropBox] = useState({ x: 15, y: 15, width: 70, height: 70 });
  const [dragType, setDragType] = useState<"none" | "center" | "tl" | "tr" | "bl" | "br">("none");
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragBoxStart, setDragBoxStart] = useState({ x: 15, y: 15, width: 70, height: 70 });

  // Scanned Solved Question State
  const [scannedSolution, setScannedSolution] = useState<any | null>(null);

  // Text to Speech states
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [isSpeakingPaused, setIsSpeakingPaused] = useState(false);
  const [selectedVoiceProfile, setSelectedVoiceProfile] = useState<VoiceProfile>(VOICE_PROFILES[0]);
  const [speechRate, setSpeechRate] = useState(1.0); // range 0.5 - 2.0
  const [speechPitch, setSpeechPitch] = useState(1.0); // range 0.5 - 1.5
  const [speechVolume, setSpeechVolume] = useState(1.0); // range 0.0 - 1.0
  const [speechLanguage, setSpeechLanguage] = useState<"auto" | "en" | "hi" | "hinglish">("auto");
  const [explanationDepth, setExplanationDepth] = useState<"short" | "standard" | "detailed">("standard");
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [textSegments, setTextSegments] = useState<string[]>([]);
  const [autoPlayEnabled, setAutoPlayEnabled] = useState(false);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);

  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Clean voices on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  // ----------------------------------------------------
  // Camera scanning controls
  // ----------------------------------------------------
  const startCamera = async () => {
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
    } catch (err: any) {
      console.warn("Camera streaming not supported or blocked, opening device file gallery upload instead.", err);
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

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/png");
        setCropSourceImage(dataUrl);
        setCropBox({ x: 15, y: 15, width: 70, height: 70 });
        stopCamera();
      }
    } else {
      fileInputRef.current?.click();
    }
  };

  // ----------------------------------------------------
  // Hand Cropping Gestures (Drag-to-Crop resize math)
  // ----------------------------------------------------
  const handleCropDragStart = (e: React.MouseEvent | React.TouchEvent, type: "center" | "tl" | "tr" | "bl" | "br") => {
    e.preventDefault();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    setDragType(type);
    setDragStart({ x: clientX, y: clientY });
    setDragBoxStart({ ...cropBox });
  };

  const handleCropDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (dragType === "none") return;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    const dx = clientX - dragStart.x;
    const dy = clientY - dragStart.y;

    // Approximating pixel-to-percentage scaling factors
    const scaleFactor = 0.25; 
    const pctDx = dx * scaleFactor;
    const pctDy = dy * scaleFactor;

    setCropBox(prev => {
      let nextX = prev.x;
      let nextY = prev.y;
      let nextW = prev.width;
      let nextH = prev.height;

      if (dragType === "center") {
        nextX = Math.max(0, Math.min(100 - prev.width, dragBoxStart.x + pctDx));
        nextY = Math.max(0, Math.min(100 - prev.height, dragBoxStart.y + pctDy));
      } else if (dragType === "tl") {
        nextX = Math.max(0, Math.min(prev.x + prev.width - 15, dragBoxStart.x + pctDx));
        nextY = Math.max(0, Math.min(prev.y + prev.height - 15, dragBoxStart.y + pctDy));
        nextW = dragBoxStart.width - (nextX - dragBoxStart.x);
        nextH = dragBoxStart.height - (nextY - dragBoxStart.y);
      } else if (dragType === "tr") {
        nextY = Math.max(0, Math.min(prev.y + prev.height - 15, dragBoxStart.y + pctDy));
        nextW = Math.max(15, Math.min(100 - prev.x, dragBoxStart.width + pctDx));
        nextH = dragBoxStart.height - (nextY - dragBoxStart.y);
      } else if (dragType === "bl") {
        nextX = Math.max(0, Math.min(prev.x + prev.width - 15, dragBoxStart.x + pctDx));
        nextW = dragBoxStart.width - (nextX - dragBoxStart.x);
        nextH = Math.max(15, Math.min(100 - prev.y, dragBoxStart.height + pctDy));
      } else if (dragType === "br") {
        nextW = Math.max(15, Math.min(100 - prev.x, dragBoxStart.width + pctDx));
        nextH = Math.max(15, Math.min(100 - prev.y, dragBoxStart.height + pctDy));
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
    setDragType("none");
  };

  const executeCrop = () => {
    if (!cropSourceImage) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const sx = (cropBox.x / 100) * img.width;
        const sy = (cropBox.y / 100) * img.height;
        const sWidth = (cropBox.width / 100) * img.width;
        const sHeight = (cropBox.height / 100) * img.height;

        canvas.width = sWidth;
        canvas.height = sHeight;
        ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, sWidth, sHeight);
        const croppedDataUrl = canvas.toDataURL("image/png");
        
        setSelectedImage(croppedDataUrl);
        setCropSourceImage(null);
        solveScannedQuestion(croppedDataUrl);
      }
    };
    img.src = cropSourceImage;
  };

  const solveScannedQuestion = async (base64Image: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    setScannedSolution(null);
    try {
      const res = await fetch("/api/gemini/solve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: base64Image,
          grade: profile.classGrade,
          favSubjects: profile.favoriteSubjects,
          weakSubjects: profile.weakSubjects,
          explainBriefly: true
        })
      });

      if (!res.ok) throw new Error("Failed to contact the StudyMate AI solver. Please check your connection.");
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
        onAwardXP(15, "Scanned & Mastered a Doubts question!");
      }

    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Failed to process question scan. Please upload standard files or type in plain text.");
    } finally {
      setIsLoading(false);
    }
  };

  // ----------------------------------------------------
  // Voice Explanation System (Speech Synthesis)
  // ----------------------------------------------------
  const [voiceScriptCache, setVoiceScriptCache] = useState<Record<string, string>>({});

  const cleanMarkdownForSpeech = (markdown: string): string => {
    return markdown
      .replace(/#+\s+/g, "") 
      .replace(/\*\*|__/g, "") 
      .replace(/\*|_/g, "") 
      .replace(/```[\s\S]*?```/g, "Code content.") 
      .replace(/`([^`]+)`/g, "$1") 
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1") 
      .replace(/-\s+/g, "") 
      .replace(/\s+/g, " ") 
      .trim();
  };

  // Helper to split text into list of sentences
  const segmentText = (text: string): string[] => {
    const cleanText = cleanMarkdownForSpeech(text);
    // Split on punctuation followed by space or end of string, avoiding initials
    const sentenceRegex = /[^.!?]+[.!?]+(?:\s|$)/g;
    const matches = cleanText.match(sentenceRegex);
    if (!matches || matches.length === 0) {
      return [cleanText].filter(Boolean);
    }
    return matches.map(s => s.trim()).filter(Boolean);
  };

  const speakSegment = (index: number, segmentsList: string[], msgId: string, profileVoice = selectedVoiceProfile) => {
    window.speechSynthesis.cancel();
    
    if (index < 0 || index >= segmentsList.length) {
      setSpeakingMsgId(null);
      setIsSpeakingPaused(false);
      setCurrentSegmentIndex(0);
      return;
    }

    setCurrentSegmentIndex(index);
    const textToSpeak = segmentsList[index];
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    currentUtteranceRef.current = utterance;

    const voices = window.speechSynthesis.getVoices();
    let selectedVoice = null;

    // Detect target lang based on speechLanguage setting or guess
    const isHindiText = /[\u0900-\u097F]/.test(textToSpeak);
    const targetLang = speechLanguage === "hi" || (speechLanguage === "auto" && isHindiText) ? "hi-IN" : "en-US";

    selectedVoice = voices.find(v => {
      const nameLower = v.name.toLowerCase();
      const isGenderMatch = profileVoice.gender === "female"
        ? (nameLower.includes("female") || nameLower.includes("zira") || nameLower.includes("hazel") || nameLower.includes("google us english female") || nameLower.includes("samantha") || nameLower.includes("heera") || nameLower.includes("kalpana"))
        : (nameLower.includes("male") || nameLower.includes("david") || nameLower.includes("mark") || nameLower.includes("google us english male") || nameLower.includes("microsoft david") || nameLower.includes("ravi"));
      return v.lang.startsWith(targetLang.substring(0, 2)) && isGenderMatch;
    });

    if (!selectedVoice) {
      selectedVoice = voices.find(v => {
        const nameLower = v.name.toLowerCase();
        return profileVoice.gender === "female"
          ? (nameLower.includes("female") || nameLower.includes("zira") || nameLower.includes("hazel") || nameLower.includes("samantha") || nameLower.includes("kalpana"))
          : (nameLower.includes("male") || nameLower.includes("david") || nameLower.includes("mark") || nameLower.includes("ravi"));
      });
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    } else if (voices.length > 0) {
      utterance.voice = voices[0];
    }

    // Apply voice modifiers
    utterance.pitch = speechPitch * profileVoice.pitch;
    utterance.rate = speechRate * profileVoice.rate;
    utterance.volume = speechVolume;

    utterance.onstart = () => {
      setSpeakingMsgId(msgId);
      setIsSpeakingPaused(false);
    };

    utterance.onend = () => {
      // Natural 450ms pause between sentences
      const timer = setTimeout(() => {
        if (!window.speechSynthesis.paused && speakingMsgId === msgId) {
          speakSegment(index + 1, segmentsList, msgId, profileVoice);
        }
      }, 450);
      return () => clearTimeout(timer);
    };

    utterance.onerror = (e) => {
      console.warn("Speech Synthesis error:", e);
      // Fallback: silently auto progress to next sentence after a tiny delay
      setTimeout(() => {
        if (speakingMsgId === msgId) {
          speakSegment(index + 1, segmentsList, msgId, profileVoice);
        }
      }, 1000);
    };

    window.speechSynthesis.speak(utterance);
  };

  const startVoiceExplanation = async (text: string, msgId: string, requestedDepth = explanationDepth, forceVoice = selectedVoiceProfile) => {
    window.speechSynthesis.cancel();
    
    // Check cache first for this specific text & depth
    const cacheKey = `${msgId}-${requestedDepth}`;
    let finalScriptText = text;

    if (voiceScriptCache[cacheKey]) {
      finalScriptText = voiceScriptCache[cacheKey];
    } else {
      setIsGeneratingScript(true);
      try {
        const res = await fetch("/api/gemini/voice-script", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            originalText: text,
            depth: requestedDepth,
            language: speechLanguage
          })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.script) {
            finalScriptText = data.script;
            // Cache it!
            setVoiceScriptCache(prev => ({ ...prev, [cacheKey]: data.script }));
          }
        }
      } catch (err) {
        console.warn("Failed to generate voice script from Gemini, falling back to original message text:", err);
      } finally {
        setIsGeneratingScript(false);
      }
    }

    const segments = segmentText(finalScriptText);
    setTextSegments(segments);
    setSpeakingMsgId(msgId);
    setExplanationDepth(requestedDepth);
    speakSegment(0, segments, msgId, forceVoice);
  };

  const stopVoiceExplanation = () => {
    window.speechSynthesis.cancel();
    setSpeakingMsgId(null);
    setIsSpeakingPaused(false);
    setCurrentSegmentIndex(0);
    setTextSegments([]);
  };

  const togglePauseVoiceExplanation = () => {
    if (speakingMsgId) {
      if (isSpeakingPaused) {
        window.speechSynthesis.resume();
        setIsSpeakingPaused(false);
      } else {
        window.speechSynthesis.pause();
        setIsSpeakingPaused(true);
      }
    }
  };

  const rewindSentence = () => {
    if (speakingMsgId && textSegments.length > 0) {
      const prevIdx = Math.max(0, currentSegmentIndex - 1);
      speakSegment(prevIdx, textSegments, speakingMsgId);
    }
  };

  const forwardSentence = () => {
    if (speakingMsgId && textSegments.length > 0) {
      const nextIdx = Math.min(textSegments.length - 1, currentSegmentIndex + 1);
      speakSegment(nextIdx, textSegments, speakingMsgId);
    }
  };

  const repeatSentence = () => {
    if (speakingMsgId && textSegments.length > 0) {
      speakSegment(currentSegmentIndex, textSegments, speakingMsgId);
    }
  };

  // Preview a voice profile
  const previewVoiceProfile = (profileToPreview: VoiceProfile) => {
    window.speechSynthesis.cancel();
    const previewText = `Hello! I am ${profileToPreview.name}, your StudyMate ${profileToPreview.title}. Let's learn together!`;
    const utterance = new SpeechSynthesisUtterance(previewText);
    
    const voices = window.speechSynthesis.getVoices();
    const selectedVoice = voices.find(v => {
      const nameLower = v.name.toLowerCase();
      const isGenderMatch = profileToPreview.gender === "female"
        ? (nameLower.includes("female") || nameLower.includes("zira") || nameLower.includes("hazel") || nameLower.includes("samantha") || nameLower.includes("kalpana"))
        : (nameLower.includes("male") || nameLower.includes("david") || nameLower.includes("mark") || nameLower.includes("ravi"));
      return v.lang.startsWith("en") && isGenderMatch;
    });

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    
    utterance.pitch = speechPitch * profileToPreview.pitch;
    utterance.rate = speechRate * profileToPreview.rate;
    utterance.volume = speechVolume;

    window.speechSynthesis.speak(utterance);
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
      if (file.size > 4 * 1024 * 1024) {
        setErrorMessage("Image is too large. Please select an image smaller than 4MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        setErrorMessage(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearChat = () => {
    setShowClearConfirm(true);
  };

  const handleSend = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    
    const textToSend = customText !== undefined ? customText : inputText;
    if (!textToSend.trim() && !selectedImage) return;

    // Build the user message
    const userMsgId = `msg-user-${Date.now()}`;
    const userMessage: ChatMessage = {
      id: userMsgId,
      role: "user",
      text: textToSend,
      image: selectedImage || undefined,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText("");
    setSelectedImage(null);
    setIsLoading(true);
    setErrorMessage(null);

    try {
      // Structure chat history to format matching Gemini request:
      // Array<{ role: 'user' | 'model', message: string }>
      // Limit to last 15 messages for token optimization and context retention
      const recentHistory = messages
        .filter(m => m.id !== "welcome" && m.id !== "welcome-reset")
        .slice(-15)
        .map(m => ({
          role: m.role,
          message: m.text
        }));

      // Augment current prompt with student details if personalization is enabled
      let finalPrompt = textToSend;
      if (usePersonalization) {
        finalPrompt += `\n\n[Personalization Context: Student Grade level is "${profile.classGrade}", targeting exam "${profile.targetExam}". Favorite subjects are: ${profile.favoriteSubjects.join(", ") || "None"}. Weak subjects needing extra patient guidance are: ${profile.weakSubjects.join(", ") || "None"}.]`;
      }

      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: finalPrompt,
          history: recentHistory,
          image: userMessage.image || undefined
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      const replyText = data.reply || "I apologize, but I was unable to generate a response. Please check your query or try again.";

      // Add Model reply
      setMessages(prev => [...prev, {
        id: `msg-model-${Date.now()}`,
        role: "model",
        text: replyText,
        timestamp: new Date()
      }]);

      // Award XP for engaging with AI study tools
      if (onAwardXP && textToSend.length > 5) {
        onAwardXP(3, "Studied with StudyMate AI");
      }

    } catch (err: any) {
      console.error("StudyMate AI API error:", err);
      setErrorMessage(err.message || "Failed to communicate with StudyMate AI. Please check your server or API key.");
    } finally {
      setIsLoading(false);
    }
  };

  const triggerSuggestedPrompt = (prompt: string) => {
    handleSend(undefined, prompt);
  };

  const SUGGESTED_CHIPS = [
    { label: "📐 Solve Math Equation", text: "Explain and solve this quadratic equation step-by-step: 3x^2 - 11x + 6 = 0" },
    { label: "⚛️ Explain Science", text: "Explain the concept of 'Valency' in Chemistry simply, as if I'm a Class 9 student." },
    { label: "✍️ Write an Essay", text: "Help me write a concise outline for an essay on 'The Role of AI in Future Classrooms'." },
    { label: "💡 Motivation", text: "I feel stressed about my upcoming board exams and keep procrastinating. Give me some practical motivation." },
    { label: "📝 Test Me", text: "Generate 3 practice multiple-choice questions on Class 10 Light Reflection with answers and explanations." }
  ];

  return (
    <div id="studymate_ai_panel" className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-sm h-[calc(100vh-140px)] flex flex-col overflow-hidden relative">
      
      {/* Clear Chat confirmation dialog overlay */}
      <AnimatePresence>
        {showClearConfirm && (
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-xl max-w-sm w-full text-center space-y-4"
            >
              <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/30 text-rose-500 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">Clear Chat History?</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">This will permanently delete all your conversation history with StudyMate AI. This action cannot be undone.</p>
              </div>
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-extrabold text-xs rounded-xl transition cursor-pointer"
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
                        text: `Conversation cleared! I am **StudyMate AI**, ready to assist you with new study goals, general topics, or math questions. Let me know what you'd like to work on!`,
                        timestamp: new Date()
                      }
                    ];
                    setMessages(resetMessages);
                    setSelectedImage(null);
                    setErrorMessage(null);
                    setShowClearConfirm(false);
                    if (onAddNotification) {
                      onAddNotification("Chat Cleared", "Your StudyMate conversation has been reset.", "success");
                    }
                  }}
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs rounded-xl shadow-sm transition cursor-pointer"
                >
                  Yes, Clear
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Header Bar */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800/60 bg-gradient-to-r from-indigo-50/50 to-purple-50/20 dark:from-indigo-950/20 dark:to-slate-900 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl text-white shadow-md animate-pulse">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full"></span>
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 flex items-center space-x-1.5">
              <span>StudyMate AI</span>
              <span className="text-[9px] font-black tracking-widest uppercase bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded">
                Active Companion
              </span>
            </h3>
            <p className="text-[10px] text-slate-400 font-semibold flex items-center space-x-1">
              <span>Personalized Assistant</span>
              <span>•</span>
              <span className="text-indigo-500 dark:text-indigo-400 font-bold">Powered by Gemini 3.5</span>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Personalization Toggle */}
          <button
            onClick={() => setUsePersonalization(!usePersonalization)}
            className={`text-[10px] font-black border px-2.5 py-1.5 rounded-xl transition duration-150 flex items-center space-x-1.5 cursor-pointer shadow-sm ${
              usePersonalization 
                ? "bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-200/50 dark:border-indigo-900/30"
                : "bg-slate-50 dark:bg-slate-800/50 text-slate-400 border-slate-200/60 dark:border-slate-700/60"
            }`}
            title="Tailor explanations automatically based on your Grade and weak subjects"
          >
            <Brain className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{usePersonalization ? "Tailoring On" : "General Mode"}</span>
          </button>

          {/* Clear History */}
          <button
            type="button"
            onClick={clearChat}
            className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/40 dark:border-slate-800/60 hover:bg-rose-50 dark:hover:bg-rose-950/20 hover:text-rose-500 hover:border-rose-200/50 dark:hover:border-rose-900/40 rounded-xl transition duration-150 cursor-pointer text-slate-400 flex items-center space-x-1"
            title="Clear Chat History"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="text-[10px] font-extrabold hidden sm:inline">Clear Chat</span>
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-slate-50/50 dark:bg-slate-900/10"
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
          >
            {/* Sender Label */}
            <span className="text-[9px] font-bold text-slate-400 mb-1 px-1">
              {msg.role === "user" ? "You" : "StudyMate AI"} • {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>

            {/* Bubble */}
            <div
              className={`max-w-[85%] md:max-w-[75%] rounded-3xl p-4 md:p-5 shadow-sm text-sm leading-relaxed transition duration-150 ${
                msg.role === "user"
                  ? "bg-indigo-600 text-white rounded-tr-none font-medium"
                  : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-none border border-slate-100 dark:border-slate-800/60"
              }`}
            >
              {/* Optional attached image inside bubble */}
              {msg.image && (
                <div className="mb-3 max-w-sm rounded-xl overflow-hidden border border-black/10 dark:border-white/10 shadow-inner">
                  <img src={msg.image} alt="User Uploaded Attached File" className="w-full h-auto max-h-[220px] object-cover" />
                </div>
              )}

              {/* Text content rendered using Markdown */}
              <div className={`prose dark:prose-invert max-w-none text-xs md:text-sm ${msg.role === "user" ? "text-white prose-headings:text-white prose-p:text-white prose-strong:text-white" : "text-slate-800 dark:text-slate-200"}`}>
                <ReactMarkdown>{msg.text}</ReactMarkdown>
              </div>

              {/* Voice Explanation Panel for AI Answers */}
              {msg.role === "model" && (
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] text-slate-400 font-extrabold flex items-center space-x-1">
                      <Volume2 className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Voice Explanation</span>
                    </span>
                    <span className="text-[10px] text-slate-300 dark:text-slate-600">•</span>
                    {/* Voice gender select */}
                    <div className="flex bg-slate-50 dark:bg-slate-900 border border-slate-200/40 dark:border-slate-750 p-0.5 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setSpeechVoiceType("female")}
                        className={`px-1.5 py-0.5 text-[9px] font-bold rounded-md transition cursor-pointer ${speechVoiceType === "female" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400"}`}
                        title="Female Tutor Voice"
                      >
                        👩 Female
                      </button>
                      <button
                        type="button"
                        onClick={() => setSpeechVoiceType("male")}
                        className={`px-1.5 py-0.5 text-[9px] font-bold rounded-md transition cursor-pointer ${speechVoiceType === "male" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400"}`}
                        title="Male Tutor Voice"
                      >
                        👨 Male
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    {speakingMsgId === msg.id ? (
                      <>
                        <button
                          type="button"
                          onClick={togglePauseVoiceExplanation}
                          className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100 border border-amber-100 dark:border-amber-900/30 text-[10px] font-black rounded-lg transition flex items-center space-x-1 cursor-pointer"
                        >
                          {isSpeakingPaused ? <Play className="w-2.5 h-2.5 fill-current" /> : <Pause className="w-2.5 h-2.5 fill-current" />}
                          <span>{isSpeakingPaused ? "Resume" : "Pause"}</span>
                        </button>
                        <button
                          type="button"
                          onClick={stopVoiceExplanation}
                          className="px-2.5 py-1 bg-rose-50 dark:bg-rose-950/20 text-rose-500 hover:bg-rose-100 border border-rose-100 dark:border-rose-900/30 text-[10px] font-black rounded-lg transition flex items-center space-x-1 cursor-pointer"
                        >
                          <Square className="w-2.5 h-2.5 fill-current" />
                          <span>Stop</span>
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startVoiceExplanation(msg.text, msg.id)}
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black rounded-lg transition flex items-center space-x-1 cursor-pointer shadow-sm shadow-indigo-500/10"
                      >
                        <Play className="w-2.5 h-2.5 fill-current" />
                        <span>Start Voice Explanation</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Loading Spinner / Assistant Typing Dots */}
        {isLoading && (
          <div className="flex flex-col items-start animate-pulse">
            <span className="text-[9px] font-bold text-slate-400 mb-1 px-1">StudyMate AI is typing...</span>
            <div className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-800/60 rounded-3xl rounded-tl-none p-4 shadow-sm flex items-center space-x-2">
              <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
              <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
              <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
            </div>
          </div>
        )}

        {/* Error message card */}
        {errorMessage && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200/50 dark:border-rose-900/30 rounded-2xl flex items-start space-x-3 text-rose-600 dark:text-rose-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-extrabold block">Connection Error</span>
              <span className="block mt-0.5 opacity-90">{errorMessage}</span>
              <button 
                onClick={() => setErrorMessage(null)}
                className="mt-2 font-black underline cursor-pointer hover:opacity-80 block"
              >
                Dismiss Error
              </button>
            </div>
          </div>
        )}

        {/* Initial setup prompt chips shown when only the welcome message is present */}
        {messages.length <= 1 && (
          <div className="pt-4 space-y-3">
            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Suggested Quick Starts:</h4>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_CHIPS.map((chip) => (
                <button
                  key={chip.label}
                  onClick={() => triggerSuggestedPrompt(chip.text)}
                  className="bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 border border-slate-100 dark:border-slate-800/80 hover:border-indigo-200 dark:hover:border-indigo-900/40 p-2.5 rounded-2xl text-[11px] text-slate-600 dark:text-slate-300 transition duration-150 cursor-pointer shadow-sm text-left font-semibold max-w-sm flex items-center space-x-1"
                >
                  <span>{chip.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Floating action bar to show image selection review */}
      {selectedImage && (
        <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800/40 bg-indigo-50/20 dark:bg-indigo-950/10 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-lg overflow-hidden border border-indigo-200/50 dark:border-indigo-900/40 bg-white">
              <img src={selectedImage} alt="Selection Preview" className="w-full h-full object-cover" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold text-slate-700 dark:text-slate-300 block">Image attachment ready</span>
              <span className="text-[9px] text-slate-400 font-semibold block">Will be solved by StudyMate AI</span>
            </div>
          </div>
          <button
            onClick={() => setSelectedImage(null)}
            className="p-1.5 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-full hover:bg-rose-100 transition cursor-pointer"
            title="Remove Image"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Form Submit bar */}
      <form 
        onSubmit={handleSend}
        className="p-3 md:p-4 border-t border-slate-100 dark:border-slate-800/60 flex items-center space-x-2 flex-shrink-0"
      >
        {/* Attachment upload input */}
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleImageSelect}
          accept="image/*"
          className="hidden"
        />

        {/* Gallery Upload Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-3 bg-slate-50 dark:bg-slate-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 border border-slate-200/40 dark:border-slate-800/60 hover:text-indigo-600 rounded-2xl transition duration-150 cursor-pointer shrink-0 text-slate-400"
          title="Upload image from gallery"
        >
          <ImageIcon className="w-5 h-5" />
        </button>

        {/* Live Camera Scanner Button */}
        <button
          type="button"
          onClick={startCamera}
          className="p-3 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100/50 dark:border-indigo-900/30 text-indigo-600 hover:bg-indigo-100/60 rounded-2xl transition duration-150 cursor-pointer shrink-0"
          title="Scan textbook question with Live Camera"
        >
          <Camera className="w-5 h-5" />
        </button>

        {/* Input box */}
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={selectedImage ? "Describe what to solve in the attached image..." : "Ask StudyMate AI any general or educational question..."}
          className="flex-1 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/40 dark:border-slate-800/60 focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/50 rounded-2xl px-4 py-3 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none transition duration-150 font-medium"
          disabled={isLoading}
        />

        {/* Send Button */}
        <button
          type="submit"
          disabled={isLoading || (!inputText.trim() && !selectedImage)}
          className={`p-3 rounded-2xl text-white font-bold flex items-center justify-center transition duration-200 shrink-0 shadow-sm ${
            (inputText.trim() || selectedImage) && !isLoading
              ? "bg-indigo-600 hover:bg-indigo-500 cursor-pointer shadow-indigo-500/10"
              : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed"
          }`}
        >
          <Send className="w-5 h-5" />
        </button>
      </form>

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
            {/* Overlay aiming marks */}
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
              StudyMate will capture, allow you to crop the particular question, and deliver a step-by-step simple solution!
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

          {/* Interactive Crop Stage */}
          <div className="relative w-full max-w-sm aspect-square bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden select-none">
            {/* The source image */}
            <img 
              src={cropSourceImage} 
              alt="Source to Crop" 
              className="w-full h-full object-contain pointer-events-none" 
            />

            {/* Tinted dark overlays to shade uncropped area */}
            <div className="absolute inset-0 bg-black/60 pointer-events-none"></div>

            {/* Lit crop box area */}
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
              {/* Draggable handles on corners */}
              {/* Top-Left */}
              <div 
                className="absolute -top-1.5 -left-1.5 w-4.5 h-4.5 bg-indigo-500 border border-white rounded-full cursor-nwse-resize active:scale-125 transition-transform"
                onMouseDown={(e) => { e.stopPropagation(); handleCropDragStart(e, "tl"); }}
                onTouchStart={(e) => { e.stopPropagation(); handleCropDragStart(e, "tl"); }}
              ></div>
              {/* Top-Right */}
              <div 
                className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 bg-indigo-500 border border-white rounded-full cursor-nesw-resize active:scale-125 transition-transform"
                onMouseDown={(e) => { e.stopPropagation(); handleCropDragStart(e, "tr"); }}
                onTouchStart={(e) => { e.stopPropagation(); handleCropDragStart(e, "tr"); }}
              ></div>
              {/* Bottom-Left */}
              <div 
                className="absolute -bottom-1.5 -left-1.5 w-4.5 h-4.5 bg-indigo-500 border border-white rounded-full cursor-nesw-resize active:scale-125 transition-transform"
                onMouseDown={(e) => { e.stopPropagation(); handleCropDragStart(e, "bl"); }}
                onTouchStart={(e) => { e.stopPropagation(); handleCropDragStart(e, "bl"); }}
              ></div>
              {/* Bottom-Right */}
              <div 
                className="absolute -bottom-1.5 -right-1.5 w-4.5 h-4.5 bg-indigo-500 border border-white rounded-full cursor-nwse-resize active:scale-125 transition-transform"
                onMouseDown={(e) => { e.stopPropagation(); handleCropDragStart(e, "br"); }}
                onTouchStart={(e) => { e.stopPropagation(); handleCropDragStart(e, "br"); }}
              ></div>
              
              {/* Helpful crosshair guide */}
              <div className="absolute inset-0 border border-dashed border-indigo-400/30 pointer-events-none flex items-center justify-center">
                <div className="w-full h-px bg-indigo-400/20 absolute"></div>
                <div className="h-full w-px bg-indigo-400/20 absolute"></div>
              </div>
            </div>
          </div>

          <div className="w-full max-w-sm pb-6 flex flex-col items-center space-y-4">
            <button
              type="button"
              onClick={executeCrop}
              className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-black rounded-2xl shadow-lg transition active:scale-[0.98] cursor-pointer flex items-center justify-center space-x-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Crop & Solve Question</span>
            </button>
            <p className="text-[10px] text-slate-400 font-semibold text-center">
              Drag corners by hand to select the particular math equation, question, or diagram to solve!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
