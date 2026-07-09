import React, { useState, useEffect, useRef } from "react";
import { 
  MessageSquare, Send, Users, ShieldAlert, Trash2, Slash, 
  UserMinus, UserPlus, Flag, AlertTriangle, Sparkles, CheckCircle, 
  Search, Smile, Reply, Clock, User, MapPin, Award, Info, X, 
  Check, AlertCircle, Calendar, Shield, Volume2, VolumeX, Eye
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { UserProfile } from "../types";

interface Message {
  id: string;
  userEmail: string;
  username: string;
  avatar: string;
  level: number;
  badge?: string;
  text: string;
  country?: string;
  timestamp: string;
  repliedToId?: string | null;
  repliedToUser?: string | null;
  isDeleted: boolean;
  reportsCount: number;
}

interface ChatUser {
  email: string;
  username: string;
  avatar: string;
  level: number;
  badge?: string;
  joinDate: string;
  country?: string;
  violationsCount: number;
  muteExpiresAt?: string | null;
  isBanned: boolean;
  banReason?: string;
}

interface ChatReport {
  id: string;
  messageId: string;
  messageText: string;
  messageAuthor: string;
  reportedBy: string;
  reason: string;
  comment: string;
  timestamp: string;
  status: "pending" | "reviewed";
  actionTaken?: string;
  reviewedAt?: string;
}

interface AdminLog {
  id: string;
  adminEmail: string;
  action: string;
  targetEmail?: string;
  details: string;
  timestamp: string;
}

interface AdminStats {
  reports: ChatReport[];
  adminLogs: AdminLog[];
  users: ChatUser[];
  totalMessages: number;
  activeUsersCount: number;
}

interface CommunityChatProps {
  profile: UserProfile;
  onAwardXP: (xp: number) => void;
  handleAddNotification: (title: string, message: string, type: "info" | "success" | "alert") => void;
}

const COMMON_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏", "💯", "🔥", "🎓", "📚", "👏", "🎉", "💡", "🚀"];

const isAdminEmail = (email: string | null | undefined): boolean => {
  if (!email) return false;
  return email.toLowerCase().trim() === "shivamguptaddp6312@gmail.com";
};

export default function CommunityChat({ profile, onAwardXP, handleAddNotification }: CommunityChatProps) {
  // Authentication & Admin status helper
  const isUserAdmin = isAdminEmail(profile.emailAddress);

  // Tab switching: "chat" or "admin" (moderation dashboard)
  const [activeTab, setActiveTab] = useState<"chat" | "admin">("chat");

  // Agreement and Rules check state
  const [rulesAgreed, setRulesAgreed] = useState<boolean>(() => {
    return localStorage.getItem("studymate_chat_rules_agreed") === "true";
  });

  // Core chat states
  const [messages, setMessages] = useState<Message[]>([]);
  const [searchText, setSearchText] = useState("");
  const [inputText, setInputText] = useState("");
  const [replyTarget, setReplyTarget] = useState<Message | null>(null);
  const [onlineCount, setOnlineCount] = useState(1);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [isSending, setIsSending] = useState(false);

  // Mute warning overlay / violation states
  const [violationAlert, setViolationAlert] = useState<{
    reason: string;
    explanation: string;
    violationsCount: number;
    penaltyMessage: string;
  } | null>(null);

  // Typing state indicators
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const typingTimers = useRef<{ [username: string]: NodeJS.Timeout }>({});
  const lastTypingSent = useRef<number>(0);

  // Profile modal viewing state
  const [selectedUserProfile, setSelectedUserProfile] = useState<ChatUser | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Reporting sub-modal state
  const [reportingMessage, setReportingMessage] = useState<Message | null>(null);
  const [reportReason, setReportReason] = useState("profanity");
  const [reportComment, setReportComment] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  // Sound effects config
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Admin Dashboard states
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [loadingAdmin, setLoadingAdmin] = useState(false);
  const [adminActionReason, setAdminActionReason] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sseRef = useRef<EventSource | null>(null);

  // Save rules agreement
  const handleAcceptRules = () => {
    localStorage.setItem("studymate_chat_rules_agreed", "true");
    setRulesAgreed(true);
  };

  // Play micro-sound triggers
  const playSound = (type: "send" | "receive" | "notification" | "system") => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === "send") {
        osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
        osc.frequency.exponentialRampToValueAtTime(783.99, audioCtx.currentTime + 0.1); // G5
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.12);
      } else if (type === "receive") {
        osc.frequency.setValueAtTime(659.25, audioCtx.currentTime); // E5
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
      } else if (type === "notification") {
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        osc.frequency.setValueAtTime(880.00, audioCtx.currentTime + 0.08); // A5
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.25);
      } else if (type === "system") {
        osc.frequency.setValueAtTime(220.00, audioCtx.currentTime); // A3
        gain.gain.setValueAtTime(0.07, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.2);
      }
    } catch (e) {
      // AudioContext fails silently if blocked by browser autoplay rules
    }
  };

  // 1. Core Fetch Messages
  const fetchMessages = async (searchQuery = "") => {
    try {
      const url = searchQuery 
        ? `/api/chat/messages?search=${encodeURIComponent(searchQuery)}`
        : `/api/chat/messages`;
      const res = await fetch(url);
      const data = await res.json();
      if (Array.isArray(data)) {
        setMessages(data);
      }
    } catch (error) {
      console.error("Failed to load chat history:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  // 2. Fetch Admin Stats
  const fetchAdminStats = async () => {
    if (!isUserAdmin) return;
    setLoadingAdmin(true);
    try {
      const res = await fetch(`/api/chat/admin/stats?email=${encodeURIComponent(profile.emailAddress)}`);
      if (res.ok) {
        const data = await res.json();
        setAdminStats(data);
      }
    } catch (error) {
      console.error("Failed to load admin logs/reports:", error);
    } finally {
      setLoadingAdmin(false);
    }
  };

  // 3. Setup SSE Listeners
  useEffect(() => {
    if (!rulesAgreed) return;

    fetchMessages();
    if (isUserAdmin) {
      fetchAdminStats();
    }

    // Connect Server-Sent Events stream
    const emailEnc = encodeURIComponent(profile.emailAddress);
    const sse = new EventSource(`/api/chat/stream?email=${emailEnc}`);
    sseRef.current = sse;

    sse.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const { type, data } = payload;

        switch (type) {
          case "connected":
            console.log("Global community stream connected successfully!");
            break;

          case "onlineCount":
            setOnlineCount(data.count);
            break;

          case "message":
            setMessages((prev) => {
              // Avoid duplicates
              if (prev.some((m) => m.id === data.id)) return prev;
              const next = [...prev, data];
              // Scroll to bottom on new active message
              setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
              }, 100);
              return next;
            });
            // Play received chime sound if someone else sent it
            if (data.userEmail.toLowerCase() !== profile.emailAddress.toLowerCase()) {
              playSound("receive");
            }
            break;

          case "messageDeleted":
            setMessages((prev) => 
              prev.map((m) => m.id === data.messageId 
                ? { ...m, text: "🚫 This message was removed by a community moderator.", isDeleted: true }
                : m
              )
            );
            break;

          case "reportCreated":
            if (isUserAdmin) {
              playSound("system");
              handleAddNotification("🛡️ New Chat Abuse Report", `A user has reported message author: ${data.messageAuthor}`, "alert");
              fetchAdminStats();
            }
            break;

          case "adminLogsUpdated":
            if (isUserAdmin) {
              fetchAdminStats();
            }
            break;

          case "userMuted":
            if (data.email.toLowerCase() === profile.emailAddress.toLowerCase()) {
              playSound("system");
              handleAddNotification(
                "⚖️ Temporary Moderation Mute",
                `An administrator has muted you until ${new Date(data.expiresAt).toLocaleTimeString()}`,
                "alert"
              );
            }
            break;

          case "userBanned":
            if (data.email.toLowerCase() === profile.emailAddress.toLowerCase()) {
              playSound("system");
              handleAddNotification(
                "⚖️ Account Suspended",
                "Your account has been permanently suspended for guidelines infractions.",
                "alert"
              );
              window.location.reload();
            }
            break;

          case "notification":
            // Target user's specific notification dispatch
            if (data.targetEmail.toLowerCase() === profile.emailAddress.toLowerCase()) {
              playSound("notification");
              handleAddNotification(data.title, data.message, data.type);
            }
            break;

          case "typingState":
            // Update live typing indicators
            if (data.userEmail.toLowerCase() !== profile.emailAddress.toLowerCase()) {
              const typingUser = data.username;
              if (data.isTyping) {
                setTypingUsers((prev) => {
                  const copy = new Set(prev);
                  copy.add(typingUser);
                  return copy;
                });

                // Reset timer for automatic removal
                if (typingTimers.current[typingUser]) {
                  clearTimeout(typingTimers.current[typingUser]);
                }
                typingTimers.current[typingUser] = setTimeout(() => {
                  setTypingUsers((prev) => {
                    const copy = new Set(prev);
                    copy.delete(typingUser);
                    return copy;
                  });
                }, 4000);
              } else {
                setTypingUsers((prev) => {
                  const copy = new Set(prev);
                  copy.delete(typingUser);
                  return copy;
                });
                if (typingTimers.current[typingUser]) {
                  clearTimeout(typingTimers.current[typingUser]);
                }
              }
            }
            break;

          default:
            break;
        }
      } catch (err) {
        console.error("SSE parsing failure:", err);
      }
    };

    sse.onerror = (err) => {
      console.error("SSE stream error, automatic fallback reconnect triggered...", err);
    };

    return () => {
      sse.close();
      Object.values(typingTimers.current).forEach(clearTimeout);
    };
  }, [rulesAgreed, isUserAdmin]);

  // Scroll to bottom on initial history loading complete
  useEffect(() => {
    if (!loadingHistory) {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    }
  }, [loadingHistory]);

  // 4. Handle Search Messages
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchMessages(searchText);
  };

  const handleClearSearch = () => {
    setSearchText("");
    fetchMessages("");
  };

  // 5. Handle Typing Notification Broadcasting
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);

    // Heartbeat typing notification every 2.5s
    const now = Date.now();
    if (now - lastTypingSent.current > 2500 && e.target.value.trim().length > 0) {
      lastTypingSent.current = now;
      fetch("/api/chat/typing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail: profile.emailAddress,
          username: profile.nickname || profile.fullName,
          isTyping: true
        })
      }).catch(() => {});
    }
  };

  // 6. Send Message Submission
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim() === "" || isSending) return;

    setIsSending(true);
    const textToSend = inputText;
    setInputText("");

    try {
      const payload = {
        userEmail: profile.emailAddress,
        username: profile.nickname || profile.fullName,
        avatar: profile.avatar || "🎓",
        level: profile.level || 1,
        badge: profile.badges && profile.badges.length > 0 ? profile.badges[0] : undefined,
        text: textToSend,
        country: profile.country || "India",
        repliedToId: replyTarget ? replyTarget.id : undefined,
        repliedToUser: replyTarget ? replyTarget.username : undefined
      };

      const res = await fetch("/api/chat/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        // If message triggered AI violation
        if (data.violation) {
          playSound("system");
          setViolationAlert({
            reason: data.reason,
            explanation: data.explanation,
            violationsCount: data.violationsCount,
            penaltyMessage: data.penaltyMessage
          });
        } else {
          handleAddNotification("⚠️ Chat Alert", data.error || "Failed to deliver message.", "alert");
        }
        // Restore input value
        setInputText(textToSend);
      } else {
        // Clear reply targets
        setReplyTarget(null);
        playSound("send");

        // Gamified XP incentive: Give +2 XP for positive active contribution (capped daily)
        const lastAward = localStorage.getItem("studymate_chat_xp_awarded_date");
        const todayStr = new Date().toDateString();
        let dailyCount = parseInt(localStorage.getItem("studymate_chat_xp_awarded_count") || "0");

        if (lastAward !== todayStr) {
          localStorage.setItem("studymate_chat_xp_awarded_date", todayStr);
          dailyCount = 0;
        }

        if (dailyCount < 5) { // Cap at 5 messages (+10 XP) to discourage spam
          localStorage.setItem("studymate_chat_xp_awarded_count", String(dailyCount + 1));
          onAwardXP(2);
          handleAddNotification("🎓 Contribution Reward", "Earned +2 XP for sharing in community study chat!", "success");
        }
      }
    } catch (err) {
      console.error("Failed to send message:", err);
      setInputText(textToSend);
      handleAddNotification("⚠️ Network Issue", "Please verify your active network and try again.", "alert");
    } finally {
      setIsSending(false);
    }
  };

  // Send emoji reaction
  const handleEmojiClick = (emoji: string) => {
    setInputText((prev) => prev + emoji);
  };

  // 7. Submit Report Message
  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportingMessage || isSubmittingReport) return;

    setIsSubmittingReport(true);
    try {
      const res = await fetch("/api/chat/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId: reportingMessage.id,
          reportedBy: profile.emailAddress,
          reason: reportReason,
          comment: reportComment
        })
      });

      if (res.ok) {
        handleAddNotification("⚖️ Message Reported", "Your report was submitted successfully for AI & administrator review.", "success");
        setReportingMessage(null);
        setReportComment("");
      } else {
        const data = await res.json();
        alert(data.error || "Failed to file report.");
      }
    } catch (err) {
      console.error("Report submit error:", err);
    } finally {
      setIsSubmittingReport(false);
    }
  };

  // 8. Open Public Profile Details
  const handleOpenUserProfile = async (email: string) => {
    setLoadingProfile(true);
    // Find in localized messages first for basic details
    const authorMsg = messages.find(m => m.userEmail.toLowerCase() === email.toLowerCase());
    
    // Default fallback mock-up stats based on their active message meta
    const defaultProfile: ChatUser = {
      email,
      username: authorMsg ? authorMsg.username : "Fellow Student",
      avatar: authorMsg ? authorMsg.avatar : "🎓",
      level: authorMsg ? authorMsg.level : 1,
      badge: authorMsg?.badge,
      joinDate: new Date(Date.now() - 30 * 24 * 3600 * 1000).toDateString(), // Est. 30 days ago
      country: authorMsg ? authorMsg.country : "India",
      violationsCount: 0,
      isBanned: false
    };

    try {
      // If administrator is loading, they fetch live database values
      if (isUserAdmin && adminStats) {
        const found = adminStats.users.find(u => u.email.toLowerCase() === email.toLowerCase());
        if (found) {
          setSelectedUserProfile(found);
          return;
        }
      }
      setSelectedUserProfile(defaultProfile);
    } catch (e) {
      setSelectedUserProfile(defaultProfile);
    } finally {
      setLoadingProfile(false);
    }
  };

  // 9. Execute Admin Action
  const handleAdminAction = async (action: string, targetId?: string, targetEmail?: string) => {
    if (!isUserAdmin) return;
    try {
      const res = await fetch("/api/chat/admin/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminEmail: profile.emailAddress,
          action,
          targetId,
          targetEmail,
          reason: adminActionReason || "Moderator directive."
        })
      });

      if (res.ok) {
        handleAddNotification("🛡️ Moderator Action", `Command executed successfully.`, "success");
        setAdminActionReason("");
        fetchAdminStats();
        fetchMessages();
      } else {
        const d = await res.json();
        alert(d.error || "Action rejected by server.");
      }
    } catch (error) {
      console.error("Admin trigger error:", error);
    }
  };

  // Rules Introduction Screen Overlay
  if (!rulesAgreed) {
    return (
      <div className="flex-1 p-6 md:p-8 flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-6"
        >
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-950/50 rounded-2xl flex items-center justify-center mx-auto text-indigo-600 dark:text-indigo-400">
              <MessageSquare className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 font-display">Global Study Room</h2>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">StudyMate Rules & Code of Conduct</p>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 space-y-4 font-medium leading-relaxed">
            <div className="flex items-start gap-3">
              <span className="p-1.5 bg-indigo-100 dark:bg-indigo-900/60 rounded-lg text-indigo-600 dark:text-indigo-400 shrink-0 font-bold">1</span>
              <div>
                <strong className="text-slate-800 dark:text-slate-100 block">Personal Life Discussions Welcome</strong>
                You are 100% permitted to talk about your personal life, feelings, family, hobbies, goals, achievements, and struggles. Connect and support your peers!
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="p-1.5 bg-indigo-100 dark:bg-indigo-900/60 rounded-lg text-indigo-600 dark:text-indigo-400 shrink-0 font-bold">2</span>
              <div>
                <strong className="text-slate-800 dark:text-slate-100 block">AI Automated Moderation</strong>
                Zero tolerance for bad language, swearing, curse words (English/Hindi phonetic profanities), bullying, or hate speech. Our AI moderates every text instantly.
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="p-1.5 bg-indigo-100 dark:bg-indigo-900/60 rounded-lg text-indigo-600 dark:text-indigo-400 shrink-0 font-bold">3</span>
              <div>
                <strong className="text-slate-800 dark:text-slate-100 block">Multi-Tier Penalty System</strong>
                Violations trigger warnings first, followed by a 10-minute mute, then a 24-hour mute, culminating in permanent account suspension.
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="p-1.5 bg-indigo-100 dark:bg-indigo-900/60 rounded-lg text-indigo-600 dark:text-indigo-400 shrink-0 font-bold">4</span>
              <div>
                <strong className="text-slate-800 dark:text-slate-100 block">No Links, Photos, or URLs</strong>
                Sharing external links, website URLs, photos, pictures, images, or media attachments is strictly banned to prevent spam and preserve privacy.
              </div>
            </div>
          </div>

          <button
            onClick={handleAcceptRules}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-500/10 transition-colors"
          >
            I Agree, Unlock Global Chat
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-50 dark:bg-slate-950">
      
      {/* Top Header Controls bar */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800/80 px-4 md:px-6 py-3 flex items-center justify-between z-20 shrink-0 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <Users className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <h1 className="text-sm font-black text-slate-800 dark:text-slate-100 font-display">Global Study Room</h1>
              <span className="text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full flex items-center gap-1.5 animate-pulse">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                {onlineCount} active
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-semibold">Join {Math.max(onlineCount + 42, 53)} study-mates around the world</p>
          </div>
        </div>

        {/* Action controls (sound, admin dashboard toggle) */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? "Disable interface chime" : "Enable interface chime"}
            className="p-2 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-indigo-500 rounded-xl transition cursor-pointer"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {isUserAdmin && (
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab("chat")}
                className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                  activeTab === "chat" 
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm" 
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800"
                }`}
              >
                💬 Chat
              </button>
              <button
                onClick={() => {
                  setActiveTab("admin");
                  fetchAdminStats();
                }}
                className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                  activeTab === "admin" 
                    ? "bg-indigo-600 text-white shadow-sm" 
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800"
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                Desk
                {adminStats && adminStats.reports.filter(r => r.status === "pending").length > 0 && (
                  <span className="w-2 h-2 bg-rose-500 rounded-full animate-ping"></span>
                )}
              </button>
            </div>
          )}
        </div>
      </header>

      {/* SEARCH AND FILTERS LAYER (ONLY CHAT TAB) */}
      {activeTab === "chat" && (
        <form onSubmit={handleSearchSubmit} className="bg-white dark:bg-slate-900 px-4 py-2 border-b border-slate-100 dark:border-slate-800/50 flex gap-2 shrink-0">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search study room messages or user logs..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-xs rounded-xl text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-500 focus:bg-white"
            />
            {searchText && (
              <button 
                type="button" 
                onClick={handleClearSearch}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl cursor-pointer transition"
          >
            Find
          </button>
        </form>
      )}

      {/* CORE ACTIVE TABS BODY */}
      <div className="flex-1 min-h-0 relative flex flex-col">
        {activeTab === "chat" ? (
          <>
            {/* -------------------- CHAT ROOM SCREEN -------------------- */}
            <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-4 min-h-0 bg-slate-50 dark:bg-slate-950">
              {loadingHistory ? (
                <div className="h-full flex flex-col items-center justify-center space-y-2">
                  <span className="text-3xl animate-spin text-indigo-500">⏳</span>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Caching Global Messages...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
                  <span className="text-4xl">💭</span>
                  <h3 className="text-sm font-black text-slate-800 dark:text-slate-200">The study room is silent</h3>
                  <p className="text-xs text-slate-400 max-w-xs font-semibold leading-relaxed">Ask a chemistry formula, schedule study sprints, or share CBSE updates to start!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg, index) => {
                    const isSelf = msg.userEmail.toLowerCase() === profile.emailAddress.toLowerCase();
                    const isMsgAdmin = isAdminEmail(msg.userEmail);

                    return (
                      <motion.div
                        key={msg.id || index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex gap-3 items-end ${isSelf ? "justify-end" : "justify-start"}`}
                      >
                        {/* Sender Photo / Emoji Avatar */}
                        {!isSelf && (
                          <button
                            onClick={() => handleOpenUserProfile(msg.userEmail)}
                            className="w-10 h-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-center text-xl shadow-sm cursor-pointer hover:border-indigo-400 transition"
                          >
                            {msg.avatar || "🎓"}
                          </button>
                        )}

                        {/* Message box envelope */}
                        <div className={`max-w-[75%] md:max-w-[60%] flex flex-col space-y-1 ${isSelf ? "items-end" : "items-start"}`}>
                          
                          {/* Top Author Metadata */}
                          <div className="flex items-center gap-1.5 px-1.5 text-[10px] text-slate-400 font-bold">
                            <span 
                              className="text-slate-700 dark:text-slate-300 hover:underline cursor-pointer"
                              onClick={() => handleOpenUserProfile(msg.userEmail)}
                            >
                              {msg.username}
                            </span>
                            <span className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-1 rounded">
                              Lvl {msg.level}
                            </span>
                            {isMsgAdmin && (
                              <span className="bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 px-1 rounded flex items-center gap-0.5">
                                <Shield className="w-2.5 h-2.5" /> Staff
                              </span>
                            )}
                            {msg.country && (
                              <span className="text-[9px] text-slate-400/80 uppercase font-bold tracking-tight">
                                📍 {msg.country}
                              </span>
                            )}
                          </div>

                          {/* Replied To Anchor box preview */}
                          {msg.repliedToUser && (
                            <div className="text-[10px] bg-slate-100 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/50 px-2.5 py-1 rounded-t-xl text-slate-500 dark:text-slate-400 font-semibold italic flex items-center gap-1">
                              <Reply className="w-2.5 h-2.5" /> Replying to @{msg.repliedToUser}
                            </div>
                          )}

                          {/* Message Content Bubble */}
                          <div 
                            className={`p-3.5 rounded-2xl text-xs font-medium leading-relaxed shadow-sm break-words relative group ${
                              msg.isDeleted 
                                ? "bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 italic text-slate-400" 
                                : isSelf 
                                  ? "bg-indigo-600 text-white rounded-br-none" 
                                  : "bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-850 rounded-bl-none text-slate-800 dark:text-slate-100"
                            }`}
                          >
                            <p>{msg.text}</p>

                            {/* Message Micro Options Trigger (Hover or touch) */}
                            {!msg.isDeleted && (
                              <div className={`absolute top-1 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 bg-slate-50/90 dark:bg-slate-850/90 px-1.5 py-0.5 rounded-lg border border-slate-200/40 dark:border-slate-800/40 shadow-sm z-10`}>
                                <button
                                  onClick={() => setReplyTarget(msg)}
                                  title="Reply to message"
                                  className="p-1 hover:text-indigo-500 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-all cursor-pointer"
                                >
                                  <Reply className="w-3 h-3" />
                                </button>
                                
                                {!isSelf && (
                                  <button
                                    onClick={() => setReportingMessage(msg)}
                                    title="Report abuse/slur"
                                    className="p-1 hover:text-rose-500 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-all cursor-pointer"
                                  >
                                    <Flag className="w-3 h-3" />
                                  </button>
                                )}

                                {isUserAdmin && (
                                  <button
                                    onClick={() => handleAdminAction("deleteMessage", msg.id, msg.userEmail)}
                                    title="Delete immediately"
                                    className="p-1 hover:text-rose-500 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-all cursor-pointer"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Sent Timing */}
                          <div className={`text-[9px] text-slate-400/80 font-bold px-1.5 flex items-center gap-1 ${isSelf ? "justify-end" : "justify-start"}`}>
                            <Clock className="w-2.5 h-2.5" />
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>

                        </div>

                        {/* Profile Photo (Self Align) */}
                        {isSelf && (
                          <button
                            onClick={() => handleOpenUserProfile(msg.userEmail)}
                            className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-900 rounded-2xl flex items-center justify-center text-xl shadow-sm cursor-pointer hover:border-indigo-400 transition"
                          >
                            {msg.avatar || "🎓"}
                          </button>
                        )}
                      </motion.div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* LIVE ACTIVE TYPING INDICATORS WRAPPER */}
            <AnimatePresence>
              {typingUsers.size > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="absolute bottom-[80px] left-6 bg-white/90 dark:bg-slate-900/95 backdrop-blur-sm border border-slate-200 dark:border-slate-800 px-3.5 py-1.5 rounded-full text-[10px] text-slate-500 dark:text-slate-400 font-bold shadow-md z-10 flex items-center gap-2"
                >
                  <span className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                  </span>
                  <span>{Array.from(typingUsers).join(", ")} {typingUsers.size === 1 ? "is typing..." : "are typing..."}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ACTIVE DRAFT / REPLY STATE BLOCK */}
            {replyTarget && (
              <div className="bg-indigo-50 dark:bg-indigo-950/40 border-t border-indigo-100 dark:border-indigo-900/60 px-4 py-2 flex items-center justify-between z-10 text-[10px] shrink-0 font-bold text-indigo-600 dark:text-indigo-400">
                <div className="flex items-center gap-1.5">
                  <Reply className="w-3.5 h-3.5" />
                  <span>Replying to @{replyTarget.username}: "{replyTarget.text.substring(0, 45)}..."</span>
                </div>
                <button 
                  onClick={() => setReplyTarget(null)}
                  className="p-1 hover:bg-indigo-100 dark:hover:bg-indigo-900 rounded cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* QUICK EMOJI BAR AND CONTROLS */}
            <div className="bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800/80 px-4 py-2 flex gap-1.5 overflow-x-auto shrink-0 no-scrollbar select-none">
              {COMMON_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleEmojiClick(emoji)}
                  className="px-2 py-1 text-sm bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition shrink-0"
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* CHAT INPUT FORM */}
            <form onSubmit={handleSendMessage} className="bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800/80 p-3 md:p-4 flex gap-2 shrink-0 z-10">
              <input
                type="text"
                placeholder="Ask syllabus queries, chat CBSE updates, be supportive..."
                value={inputText}
                onChange={handleInputChange}
                maxLength={500}
                className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 rounded-xl text-xs text-slate-700 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:bg-white transition"
              />
              <button
                type="submit"
                disabled={isSending || inputText.trim() === ""}
                className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow transition duration-150 cursor-pointer flex items-center justify-center shrink-0 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </>
        ) : (
          <>
            {/* -------------------- ADMIN DESK SCREEN -------------------- */}
            <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6 space-y-6 bg-slate-50 dark:bg-slate-950">
              <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
                <div>
                  <h2 className="text-base font-black text-slate-800 dark:text-slate-100 font-display flex items-center gap-1.5">
                    <ShieldAlert className="w-5 h-5 text-indigo-600" /> Administrative Moderation Desk
                  </h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Authorized staff eyes only • Real-time stream active</p>
                </div>
                <button
                  onClick={fetchAdminStats}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-[10px] rounded-lg transition"
                >
                  Sync Logs
                </button>
              </div>

              {loadingAdmin ? (
                <div className="py-20 flex flex-col items-center justify-center space-y-2">
                  <span className="text-3xl animate-spin">⏳</span>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Syncing Admin Records...</p>
                </div>
              ) : !adminStats ? (
                <div className="p-8 bg-rose-50 dark:bg-rose-950/20 text-rose-500 text-xs font-bold rounded-2xl border border-rose-100 text-center">
                  Access Denied: Please verify administrator credentials on the server.
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Left Column: Abuse Reports and users list */}
                  <div className="lg:col-span-2 space-y-6">
                    
                    {/* Active Pending Reports */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-4">
                      <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest border-b pb-2 flex justify-between items-center">
                        <span>🚨 Pending Abuse Reports ({adminStats.reports.filter(r => r.status === "pending").length})</span>
                      </h3>

                      {adminStats.reports.filter(r => r.status === "pending").length === 0 ? (
                        <p className="text-xs text-slate-400 font-semibold italic py-4 text-center">No reports filed. Study room is healthy! 🎉</p>
                      ) : (
                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                          {adminStats.reports.filter(r => r.status === "pending").map((rep) => (
                            <div key={rep.id} className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-150 dark:border-slate-800 text-xs space-y-2">
                              <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                                <span>Reported: {rep.reportedBy}</span>
                                <span className="text-rose-500 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded uppercase">
                                  {rep.reason}
                                </span>
                              </div>
                              <p className="p-2 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 rounded font-mono text-[11px] text-slate-700 dark:text-slate-300">
                                "{rep.messageText}"
                              </p>
                              {rep.comment && (
                                <p className="text-[10px] text-slate-400 font-semibold italic">Reporter feedback: "{rep.comment}"</p>
                              )}

                              {/* Action buttons */}
                              <div className="flex gap-2 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                                <button
                                  onClick={() => handleAdminAction("deleteMessage", rep.messageId)}
                                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] rounded cursor-pointer"
                                >
                                  Delete Msg
                                </button>
                                <button
                                  onClick={() => handleAdminAction("muteUser", undefined, rep.messageAuthor)}
                                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white font-bold text-[10px] rounded cursor-pointer"
                                >
                                  Mute User (24h)
                                </button>
                                <button
                                  onClick={() => handleAdminAction("banUser", undefined, rep.messageAuthor)}
                                  className="px-2.5 py-1 bg-red-700 hover:bg-red-600 text-white font-bold text-[10px] rounded cursor-pointer"
                                >
                                  Ban User
                                </button>
                                <button
                                  onClick={() => handleAdminAction("resolveReport", rep.id)}
                                  className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[10px] rounded cursor-pointer"
                                >
                                  Dismiss
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Chat Users violating status lists */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-4">
                      <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest border-b pb-2">
                        👥 Chat Registered Student Accounts ({adminStats.users.length})
                      </h3>

                      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                        {adminStats.users.map((usr) => {
                          const isMuted = usr.muteExpiresAt && new Date(usr.muteExpiresAt) > new Date();
                          return (
                            <div key={usr.email} className="flex items-center justify-between p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/20 rounded-xl transition text-xs">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{usr.avatar}</span>
                                <div>
                                  <h4 className="font-bold text-slate-700 dark:text-slate-200">{usr.username}</h4>
                                  <p className="text-[9px] text-slate-400 font-bold">{usr.email}</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                  usr.violationsCount > 2 ? "bg-red-50 text-red-600 dark:bg-red-950/40" : "bg-slate-100 text-slate-500"
                                }`}>
                                  Violations: {usr.violationsCount}
                                </span>
                                {usr.isBanned ? (
                                  <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-[9px] font-bold rounded">Banned</span>
                                ) : isMuted ? (
                                  <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-bold rounded">Muted</span>
                                ) : (
                                  <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 text-[9px] font-bold rounded">Active</span>
                                )}

                                {/* Toggles */}
                                <div className="flex gap-1 pl-2">
                                  {usr.isBanned ? (
                                    <button 
                                      onClick={() => handleAdminAction("unbanUser", undefined, usr.email)}
                                      className="p-1 text-emerald-500 hover:bg-emerald-50 rounded"
                                    >
                                      Unban
                                    </button>
                                  ) : isMuted ? (
                                    <button 
                                      onClick={() => handleAdminAction("unmuteUser", undefined, usr.email)}
                                      className="p-1 text-emerald-500 hover:bg-emerald-50 rounded"
                                    >
                                      Unmute
                                    </button>
                                  ) : (
                                    <>
                                      <button 
                                        onClick={() => handleAdminAction("muteUser", undefined, usr.email)}
                                        className="p-1 text-amber-500 hover:bg-amber-50 rounded"
                                        title="Mute user 24h"
                                      >
                                        Mute
                                      </button>
                                      <button 
                                        onClick={() => handleAdminAction("banUser", undefined, usr.email)}
                                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                                        title="Ban permanently"
                                      >
                                        Ban
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                  </div>

                  {/* Right Column: Admin System Logs */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-4">
                    <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest border-b pb-2 flex items-center justify-between">
                      <span>📜 Security & Moderation Logs</span>
                    </h3>

                    <div className="space-y-3 max-h-[750px] overflow-y-auto pr-1">
                      {adminStats.adminLogs.slice().reverse().map((log) => (
                        <div key={log.id} className="p-2.5 bg-slate-50 dark:bg-slate-800/20 rounded-lg border border-slate-100 dark:border-slate-800 font-mono text-[9px] space-y-1">
                          <div className="flex items-center justify-between text-indigo-500 font-black">
                            <span>{log.action}</span>
                            <span className="text-slate-400">{new Date(log.timestamp).toLocaleTimeString()}</span>
                          </div>
                          {log.targetEmail && <p className="text-slate-400 font-bold">Target: {log.targetEmail}</p>}
                          <p className="text-slate-600 dark:text-slate-300 text-[10px] leading-relaxed font-semibold italic">"{log.details}"</p>
                          <p className="text-[8px] text-slate-400 font-bold">By: {log.adminEmail}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* -------------------- POPUP MODAL: VIOLATION ALERTS -------------------- */}
      <AnimatePresence>
        {violationAlert && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 text-center space-y-4 shadow-2xl"
            >
              <div className="w-12 h-12 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6 animate-bounce" />
              </div>
              <h3 className="text-base font-black text-slate-800 dark:text-slate-100 font-display">Message Blocked by AI</h3>
              
              <div className="p-3 bg-rose-50/50 dark:bg-rose-950/25 border border-rose-100 dark:border-rose-900/40 rounded-xl text-xs space-y-2">
                <p className="font-bold text-rose-600 dark:text-rose-400">Violation Reason: {violationAlert.reason.replace("_", " ")}</p>
                <p className="text-slate-500 dark:text-slate-300 leading-relaxed font-medium">"{violationAlert.explanation}"</p>
              </div>

              <div className="p-3.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-[10px] text-slate-500 dark:text-slate-400 leading-normal space-y-1 text-left font-semibold">
                <p>⚠️ Accumulated infractions: <strong className="text-slate-800 dark:text-slate-100">{violationAlert.violationsCount} / 3</strong></p>
                <p className="text-indigo-600 dark:text-indigo-400 font-bold">{violationAlert.penaltyMessage}</p>
              </div>

              <button
                onClick={() => setViolationAlert(null)}
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow transition"
              >
                Acknowledge Warning
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* -------------------- POPUP MODAL: REPORT REASON PICKER -------------------- */}
      <AnimatePresence>
        {reportingMessage && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl"
            >
              <div className="flex justify-between items-center border-b pb-3 border-slate-200 dark:border-slate-800">
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 font-display flex items-center gap-1.5">
                  <Flag className="w-4 h-4 text-indigo-500" /> Report Guideline Violation
                </h3>
                <button 
                  onClick={() => setReportingMessage(null)}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmitReport} className="space-y-4 pt-4 text-xs font-semibold">
                <p className="text-slate-400">You are reporting a message authored by <strong className="text-slate-700 dark:text-slate-300">@{reportingMessage.username}</strong>:</p>
                <p className="p-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-150 rounded italic text-slate-500 dark:text-slate-400 font-medium">
                  "{reportingMessage.text}"
                </p>

                <div className="space-y-2.5">
                  <label className="text-slate-400 block uppercase tracking-wider text-[10px]">Select Violation Category:</label>
                  {[
                    { id: "profanity", label: "Swearing, slurs, or vulgarities" },
                    { id: "hate_speech", label: "Hate speech, discrimination, racism" },
                    { id: "harassment", label: "Harassment or direct bullying" },
                    { id: "spam", label: "Spamming, repetitive gibberish, links" },
                    { id: "threat", label: "Physical threats or violent details" },
                    { id: "off_topic", label: "Off-topic chat (unrelated to studying)" }
                  ].map((cat) => (
                    <label key={cat.id} className="flex items-center gap-2.5 p-2 bg-slate-50 hover:bg-slate-100/80 dark:bg-slate-800/20 rounded-xl cursor-pointer transition">
                      <input
                        type="radio"
                        name="reportReason"
                        value={cat.id}
                        checked={reportReason === cat.id}
                        onChange={() => setReportReason(cat.id)}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-slate-700 dark:text-slate-300 font-medium">{cat.label}</span>
                    </label>
                  ))}
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-400 block uppercase tracking-wider text-[10px]">Additional Comments (Optional):</label>
                  <textarea
                    placeholder="Enter context to assist moderators..."
                    value={reportComment}
                    onChange={(e) => setReportComment(e.target.value)}
                    maxLength={150}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200/60 rounded-xl outline-none focus:border-indigo-500 font-medium"
                    rows={2}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingReport}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition cursor-pointer disabled:bg-slate-300 text-xs"
                >
                  {isSubmittingReport ? "Filing Incident..." : "Submit Incident Report"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* -------------------- POPUP MODAL: PUBLIC PROFILE CARD -------------------- */}
      <AnimatePresence>
        {selectedUserProfile && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl relative text-center space-y-5"
            >
              <button
                onClick={() => setSelectedUserProfile(null)}
                className="absolute right-4 top-4 p-1.5 bg-slate-50 dark:bg-slate-800 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-2">
                {/* Huge avatar photo */}
                <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-950/60 text-5xl rounded-3xl flex items-center justify-center mx-auto border-2 border-indigo-200 dark:border-indigo-800/80 shadow">
                  {selectedUserProfile.avatar || "🎓"}
                </div>
                <h3 className="text-base font-black text-slate-800 dark:text-slate-100 font-display">
                  {selectedUserProfile.username}
                </h3>
                <span className="inline-block bg-indigo-600 text-white font-bold text-[10px] px-2.5 py-0.5 rounded-full shadow-sm">
                  Student Level {selectedUserProfile.level}
                </span>
              </div>

              {/* Stats bento layout grid */}
              <div className="grid grid-cols-2 gap-2 text-xs font-semibold leading-relaxed">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-800 rounded-2xl space-y-0.5 text-left">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-bold">Location</span>
                  <p className="text-slate-700 dark:text-slate-300 font-bold flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-indigo-500" /> {selectedUserProfile.country || "India"}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-800 rounded-2xl space-y-0.5 text-left">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-bold">Unlocks</span>
                  <p className="text-slate-700 dark:text-slate-300 font-bold flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-indigo-500" /> {selectedUserProfile.badge || "Gold Scholar"}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-800 rounded-2xl col-span-2 space-y-0.5 text-left">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-bold">Enrolled Class Curriculum</span>
                  <p className="text-slate-700 dark:text-slate-300 font-bold flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-indigo-500" /> CBSE Class Grade 10-12 Prep
                  </p>
                </div>
              </div>

              {/* Join date clock */}
              <p className="text-[10px] text-slate-400 font-bold flex items-center justify-center gap-1">
                <Calendar className="w-3 h-3" /> Member of StudyMate since {new Date(selectedUserProfile.joinDate).toLocaleDateString([], { month: "short", year: "numeric" })}
              </p>

              {/* Special admin controls inside card */}
              {isUserAdmin && selectedUserProfile.email.toLowerCase() !== profile.emailAddress.toLowerCase() && (
                <div className="border-t border-slate-100 dark:border-slate-800 pt-4 text-left space-y-3">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-bold">Moderator Panel Actions:</span>
                  
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Add specific action reason..."
                      value={adminActionReason}
                      onChange={(e) => setAdminActionReason(e.target.value)}
                      className="flex-1 px-3 py-1.5 border dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-[10px] outline-none font-medium"
                    />
                  </div>

                  <div className="flex gap-2 text-[10px]">
                    {selectedUserProfile.isBanned ? (
                      <button
                        onClick={() => {
                          handleAdminAction("unbanUser", undefined, selectedUserProfile.email);
                          setSelectedUserProfile(null);
                        }}
                        className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded cursor-pointer"
                      >
                        Unban Member
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          handleAdminAction("banUser", undefined, selectedUserProfile.email);
                          setSelectedUserProfile(null);
                        }}
                        className="flex-1 py-1.5 bg-red-700 hover:bg-red-600 text-white font-bold rounded cursor-pointer"
                      >
                        Ban Account
                      </button>
                    )}

                    {selectedUserProfile.muteExpiresAt && new Date(selectedUserProfile.muteExpiresAt) > new Date() ? (
                      <button
                        onClick={() => {
                          handleAdminAction("unmuteUser", undefined, selectedUserProfile.email);
                          setSelectedUserProfile(null);
                        }}
                        className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded cursor-pointer"
                      >
                        Unmute
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          handleAdminAction("muteUser", undefined, selectedUserProfile.email);
                          setSelectedUserProfile(null);
                        }}
                        className="flex-1 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded cursor-pointer"
                      >
                        Mute Member (24h)
                      </button>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
