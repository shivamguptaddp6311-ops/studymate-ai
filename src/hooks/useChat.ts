import { useState, useEffect, useCallback } from "react";
import { UserProfile } from "../types";
import { ChatMessage, ChatSession } from "../components/studymate-ai/types";

function ensureValidDate(d: any): Date {
  if (!d) return new Date();
  const dateObj = d instanceof Date ? d : new Date(d);
  return isNaN(dateObj.getTime()) ? new Date() : dateObj;
}

function sanitizeMessage(m: any): ChatMessage {
  return {
    id: String(m?.id || `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`),
    role: m?.role === "user" ? "user" : "model",
    text: String(m?.text || ""),
    image: typeof m?.image === "string" ? m.image : undefined,
    pdf: m?.pdf && typeof m.pdf === "object" ? {
      name: String(m.pdf.name || "Document.pdf"),
      source: m.pdf.source === "Google Drive" ? "Google Drive" : "Local File",
      url: typeof m.pdf.url === "string" ? m.pdf.url : undefined,
      size: typeof m.pdf.size === "string" ? m.pdf.size : undefined,
    } : undefined,
    timestamp: ensureValidDate(m?.timestamp),
    searched: Boolean(m?.searched),
    searchQuery: typeof m?.searchQuery === "string" ? m.searchQuery : undefined,
    sources: Array.isArray(m?.sources) 
      ? m.sources.filter((s: any) => s && typeof s.title === "string" && typeof s.url === "string")
      : undefined,
    searchError: Boolean(m?.searchError)
  };
}

function createWelcomeMessage(profileName: string, classGrade: string): ChatMessage {
  return {
    id: `welcome-${Date.now()}`,
    role: "model",
    text: `Hello **${profileName || "Student"}**! Welcome to your **StudyMate AI Workspace**. 

I am your personal AI tutor, problem solver, and academic accelerator. I can help you:
• **Solve Homework & Equations** step-by-step
• **Scan Textbook Questions** with live camera & auto-crop
• **Transcribe Notes & Handwriting** with OCR
• **Explain Complex Concepts** tailored to Class ${classGrade || "10"}
• **Generate Practice Quizzes & Summaries**
• **Analyze PDFs & Images**

How can we accelerate your learning today?`,
    timestamp: new Date()
  };
}

function createDefaultSession(profile?: UserProfile, customTitle?: string): ChatSession {
  const now = new Date();
  const id = `session-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  return {
    id,
    title: customTitle || "New Study Chat",
    createdAt: now,
    updatedAt: now,
    messages: [createWelcomeMessage(profile?.fullName || "", profile?.classGrade || "10")]
  };
}

export function useChat(profile?: UserProfile) {
  const profileName = profile?.fullName || "default";
  const sessionStorageKey = `studymate_ai_sessions_${profileName}`;
  const legacyStorageKey = `studymate_ai_chat_history_${profileName}`;

  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const savedSessions = localStorage.getItem(sessionStorageKey);
      if (savedSessions) {
        const parsed = JSON.parse(savedSessions);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((s: any) => ({
            id: String(s.id || `session-${Date.now()}`),
            title: String(s.title || "Study Session"),
            createdAt: ensureValidDate(s.createdAt),
            updatedAt: ensureValidDate(s.updatedAt),
            messages: Array.isArray(s.messages) ? s.messages.map(sanitizeMessage) : []
          })).filter(s => s.messages.length > 0 || s.id);
        }
      }

      // Check legacy single-chat history for migration
      const savedLegacy = localStorage.getItem(legacyStorageKey);
      if (savedLegacy) {
        const parsedLegacy = JSON.parse(savedLegacy);
        if (Array.isArray(parsedLegacy) && parsedLegacy.length > 0) {
          const migratedMessages = parsedLegacy.map(sanitizeMessage);
          const legacySession: ChatSession = {
            id: `session-migrated-${Date.now()}`,
            title: "Previous Study Session",
            createdAt: new Date(),
            updatedAt: new Date(),
            messages: migratedMessages
          };
          return [legacySession];
        }
      }
    } catch (e) {
      console.warn("Failed to load chat history from localStorage:", e);
    }

    return [createDefaultSession(profile)];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    const activeKey = `studymate_ai_active_session_${profileName}`;
    const savedActive = localStorage.getItem(activeKey);
    if (savedActive && sessions.some(s => s.id === savedActive)) {
      return savedActive;
    }
    return sessions[0]?.id || `session-${Date.now()}`;
  });

  const [inputText, setInputText] = useState("");

  // Persist sessions and active session ID to localStorage
  useEffect(() => {
    if (!profileName || profileName === "default") return;
    try {
      localStorage.setItem(sessionStorageKey, JSON.stringify(sessions));
      localStorage.setItem(`studymate_ai_active_session_${profileName}`, activeSessionId);
    } catch (e) {
      console.warn("Error persisting chat sessions:", e);
    }
  }, [sessions, activeSessionId, profileName, sessionStorageKey]);

  // Always resolve valid active session safely
  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0] || createDefaultSession(profile);
  const messages = activeSession.messages || [];

  const addMessage = useCallback((msg: ChatMessage) => {
    const cleanMsg = sanitizeMessage(msg);
    setSessions(prevSessions => {
      return prevSessions.map(sess => {
        if (sess.id !== activeSessionId) return sess;

        const updatedMessages = [...sess.messages, cleanMsg];
        let newTitle = sess.title;

        // Auto-generate smart session title from first user message if still default
        if ((sess.title === "New Study Chat" || sess.title === "New Session") && cleanMsg.role === "user" && cleanMsg.text) {
          const cleanText = cleanMsg.text.replace(/[\r\n]+/g, " ").trim();
          newTitle = cleanText.length > 32 ? cleanText.substring(0, 32) + "..." : cleanText;
        }

        return {
          ...sess,
          title: newTitle,
          updatedAt: new Date(),
          messages: updatedMessages
        };
      });
    });
  }, [activeSessionId]);

  const createNewSession = useCallback((title?: string) => {
    const newSess = createDefaultSession(profile, title);
    setSessions(prev => [newSess, ...prev]);
    setActiveSessionId(newSess.id);
    return newSess.id;
  }, [profile]);

  const deleteSession = useCallback((sessionId: string) => {
    if (!sessionId) return activeSessionId;

    const remaining = sessions.filter(s => s.id !== sessionId);
    let nextActiveId = activeSessionId;

    if (remaining.length === 0) {
      // If all chats deleted, automatically create a fresh empty chat session
      const freshSession = createDefaultSession(profile);
      nextActiveId = freshSession.id;
      setSessions([freshSession]);
    } else {
      if (sessionId === activeSessionId) {
        // Automatically switch to another valid chat session
        nextActiveId = remaining[0].id;
      }
      setSessions(remaining);
    }

    setActiveSessionId(nextActiveId);
    return nextActiveId;
  }, [activeSessionId, profile, sessions]);

  const deleteActiveChat = useCallback(() => {
    return deleteSession(activeSessionId);
  }, [deleteSession, activeSessionId]);

  const clearActiveChat = useCallback(() => {
    setSessions(prevSessions => {
      return prevSessions.map(sess => {
        if (sess.id !== activeSessionId) return sess;
        return {
          ...sess,
          updatedAt: new Date(),
          messages: [createWelcomeMessage(profile.fullName, profile.classGrade)]
        };
      });
    });
  }, [activeSessionId, profile.fullName, profile.classGrade]);

  const switchSession = useCallback((sessionId: string) => {
    if (sessions.some(s => s.id === sessionId)) {
      setActiveSessionId(sessionId);
    }
  }, [sessions]);

  const renameSession = useCallback((sessionId: string, newTitle: string) => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, title: trimmed, updatedAt: new Date() } : s));
  }, []);

  const getDynamicSuggestions = useCallback(() => {
    const safeMsgs = messages || [];
    if (safeMsgs.length <= 1) {
      return [
        { label: "💡 Active Recall Hacks", text: "What are the most scientifically proven active recall techniques for exam prep?" },
        { label: "📐 Math Homework Help", text: "Help me solve a challenging math problem step-by-step suited for Class " + (profile.classGrade || "10") },
        { label: "🧪 Mind-Blowing Science", text: "Explain a mind-blowing physics or chemistry concept simply." },
        { label: "📝 Summarize Notes", text: "How can I summarize a heavy textbook chapter efficiently into a high-yield cheat sheet?" }
      ];
    }

    const lastMsg = safeMsgs[safeMsgs.length - 1];
    if (!lastMsg) return [];

    if (lastMsg.role === "user") {
      return [
        { label: "⚡ Key Takeaways", text: "What are the top 3 core takeaways I should write down from this?" },
        { label: "☕ Study Break Strategy", text: "How should I structure my Pomodoro study breaks today?" }
      ];
    }

    const txt = (lastMsg.text || "").toLowerCase();
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
  }, [messages, profile.classGrade]);

  return {
    sessions,
    activeSessionId,
    activeSession,
    messages,
    setMessages: (newMsgs: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
      setSessions(prev => prev.map(s => {
        if (s.id !== activeSessionId) return s;
        const resolvedMsgs = typeof newMsgs === "function" ? newMsgs(s.messages || []) : newMsgs;
        return { ...s, messages: resolvedMsgs.map(sanitizeMessage), updatedAt: new Date() };
      }));
    },
    inputText,
    setInputText,
    addMessage,
    createNewSession,
    deleteSession,
    deleteActiveChat,
    clearActiveChat,
    switchSession,
    renameSession,
    getDynamicSuggestions,
  };
}
