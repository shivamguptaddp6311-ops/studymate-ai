import React, { useState, useEffect, useRef } from "react";
import { 
  MessageSquare, Send, Users, ShieldAlert, Trash2, Flag, AlertTriangle, 
  Sparkles, CheckCircle, Search, Smile, Reply, Clock, MapPin, Award, 
  Info, X, Check, Calendar, Shield, Volume2, VolumeX, Eye, Maximize2, 
  Minimize2, Paperclip, Mic, Camera, Image, MoreVertical, Play, Pause, 
  Download, Globe, GraduationCap, Flame, ArrowRight, History, Copy, Languages,
  Pin, ThumbsUp, Heart, SmilePlus, Radio, Headphones, MessageCircle, Share2,
  ExternalLink, Zap, CheckCheck, TrendingUp, Plus, UserPlus, UserCheck, UserX, Lock
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { UserProfile } from "../types";

export interface MessageReaction {
  emoji: string;
  count: number;
  users: string[]; // emails of users who reacted
}

export interface Message {
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
  isPinned?: boolean;
  reactions?: MessageReaction[];
  attachment?: {
    type: "image" | "voice" | "camera" | "file";
    name: string;
    url?: string;
    duration?: number;
  } | null;
}

export interface ChatUser {
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
}

export interface FriendRequest {
  id: string;
  fromEmail: string;
  fromUsername: string;
  fromAvatar: string;
  fromLevel: number;
  fromBadge?: string;
  timestamp: string;
  status: "pending" | "accepted" | "declined";
}

export interface FriendUser {
  id: string;
  email: string;
  username: string;
  avatar: string;
  level: number;
  status: "online" | "offline";
  statusText: string;
  badge: string;
  unread: boolean;
  messages: Message[];
}

interface CommunityChatProps {
  profile: UserProfile;
  onAwardXP: (xp: number) => void;
  handleAddNotification: (title: string, message: string, type: "info" | "success" | "alert") => void;
  isFullScreen?: boolean;
  onToggleFullScreen?: () => void;
}

const COMMON_EMOJIS = ["👍", "❤️", "😂", "🔥", "🎓", "📚", "👏", "🎉", "💡", "🚀", "💯", "🙏", "⚡", "🧠", "✨"];

const isAdminEmail = (email: string | null | undefined): boolean => {
  return email?.toLowerCase().trim() === "shivamguptaddp6312@gmail.com";
};

export default function CommunityChat({ 
  profile, 
  onAwardXP, 
  handleAddNotification,
  isFullScreen = false,
  onToggleFullScreen
}: CommunityChatProps) {
  const isUserAdmin = isAdminEmail(profile.emailAddress);

  // Tabs: "global" | "class" | "friends"
  const [activeTab, setActiveTab] = useState<"global" | "class" | "friends">("global");
  const [adminMode, setAdminMode] = useState(false);
  const [rulesAgreed, setRulesAgreed] = useState(() => localStorage.getItem("studymate_chat_rules_agreed") === "true");

  // Single Plus (+) Action Menu state
  const [showPlusMenu, setShowPlusMenu] = useState(false);

  // Voice study room active state
  const [inVoiceRoom, setInVoiceRoom] = useState(false);

  // Core chats state
  const [globalMessages, setGlobalMessages] = useState<Message[]>([]);
  const [classMessages, setClassMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem("sm_chat_class");
    return saved ? JSON.parse(saved) : [
      { 
        id: "c0", 
        userEmail: "teacher@studymate.ai", 
        username: "Dr. Sharma (Physics Faculty)", 
        avatar: "👨‍🏫", 
        level: 12, 
        badge: "Grandmaster", 
        text: "📌 IMPORTANT: Physics Board Revision Paper & Formula Sheets uploaded for CBSE 2026! Check pinned messages.", 
        country: "India", 
        timestamp: new Date(Date.now() - 7200000).toISOString(), 
        isDeleted: false, 
        reportsCount: 0,
        isPinned: true,
        reactions: [
          { emoji: "🔥", count: 18, users: ["rahul@gmail.com"] },
          { emoji: "🎓", count: 12, users: [] }
        ]
      },
      { 
        id: "c1", 
        userEmail: "rahul@gmail.com", 
        username: "Rahul Mehta", 
        avatar: "⚡", 
        level: 4, 
        badge: "Scholar", 
        text: "Does anyone have the simplified derivation notes for Gauss's Law in Electrostatics?", 
        country: "India", 
        timestamp: new Date(Date.now() - 3600000).toISOString(), 
        isDeleted: false, 
        reportsCount: 0,
        reactions: [
          { emoji: "💡", count: 5, users: [] }
        ]
      },
      { 
        id: "c2", 
        userEmail: "priya@gmail.com", 
        username: "Priya Sharma", 
        avatar: "🌸", 
        level: 6, 
        badge: "Top Scholar", 
        text: "Here is my handwritten summary diagram! Super easy to memorize.", 
        country: "India", 
        timestamp: new Date(Date.now() - 1800000).toISOString(), 
        isDeleted: false, 
        reportsCount: 0,
        attachment: {
          type: "image",
          name: "Gauss_Law_Summary.png",
          url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&q=80"
        },
        reactions: [
          { emoji: "❤️", count: 14, users: [] },
          { emoji: "👏", count: 9, users: [] }
        ]
      }
    ];
  });

  // Friend Requests State
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>(() => {
    const saved = localStorage.getItem("sm_chat_friend_requests");
    return saved ? JSON.parse(saved) : [
      {
        id: "req_ananya",
        fromEmail: "ananya@gmail.com",
        fromUsername: "Ananya Gupta",
        fromAvatar: "🌸",
        fromLevel: 5,
        fromBadge: "Top Scholar",
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        status: "pending"
      }
    ];
  });

  // Friends List (Pre-populated with 3 friends so selecting between 2+ friends works out-of-the-box)
  const [friendsList, setFriendsList] = useState<FriendUser[]>(() => {
    const saved = localStorage.getItem("sm_chat_friends_list");
    return saved ? JSON.parse(saved) : [
      {
        id: "f1",
        email: "aditi@gmail.com",
        username: "Aditi Sharma",
        avatar: "🌟",
        level: 5,
        status: "online",
        statusText: "Studying Organic Chemistry",
        badge: "Topper",
        unread: true,
        messages: [
          { id: "fm1", userEmail: "aditi@gmail.com", username: "Aditi Sharma", avatar: "🌟", level: 5, text: "Hey! Ready for our 25-min Pomodoro chemistry study sprint?", timestamp: new Date(Date.now() - 3600000).toISOString(), isDeleted: false, reportsCount: 0, reactions: [{ emoji: "🚀", count: 2, users: [] }] }
        ]
      },
      {
        id: "f2",
        email: "rohan@gmail.com",
        username: "Rohan Roy",
        avatar: "⚡",
        level: 4,
        status: "offline",
        statusText: "Last seen 2h ago",
        badge: "Euler Jr.",
        unread: false,
        messages: [
          { id: "fm2", userEmail: "rohan@gmail.com", username: "Rohan Roy", avatar: "⚡", level: 4, text: "Dude, that integration substitution trick you shared was brilliant!", timestamp: new Date(Date.now() - 86400000).toISOString(), isDeleted: false, reportsCount: 0, reactions: [{ emoji: "💯", count: 1, users: [] }] }
        ]
      },
      {
        id: "f3",
        email: "vikram@gmail.com",
        username: "Vikram Singh",
        avatar: "📐",
        level: 6,
        status: "online",
        statusText: "Solving Physics Numerical Set",
        badge: "Physics Ace",
        unread: false,
        messages: [
          { id: "fm3", userEmail: "vikram@gmail.com", username: "Vikram Singh", avatar: "📐", level: 6, text: "Let me know if you want the PDF for Gauss's Law revision notes!", timestamp: new Date(Date.now() - 43200000).toISOString(), isDeleted: false, reportsCount: 0 }
        ]
      }
    ];
  });

  const [activeFriendId, setActiveFriendId] = useState<string>("f1");
  const [showFriendRequestsModal, setShowFriendRequestsModal] = useState(false);

  // Local state managers
  const [inputText, setInputText] = useState("");
  const [searchText, setSearchText] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    return JSON.parse(localStorage.getItem("sm_recent_searches") || "[\"chemistry\", \"gauss law\", \"syllabus\", \"jee mock\"]");
  });
  const [searchSuggestions] = useState(["Organic Reactions", "Gauss Law", "CBSE Datesheet", "Trigonometry Tricks", "Pomodoro Sprint"]);
  const [replyTarget, setReplyTarget] = useState<Message | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [onlineCount, setOnlineCount] = useState(18);
  const [isSending, setIsSending] = useState(false);

  // Media Lightbox Modal
  const [expandedMediaUrl, setExpandedMediaUrl] = useState<string | null>(null);

  // Pinned Messages Modal
  const [showPinnedModal, setShowPinnedModal] = useState(false);

  // Floating attachment composer states
  const [activeAttachment, setActiveAttachment] = useState<{ type: "image" | "voice" | "camera" | "file"; name: string; url?: string; duration?: number } | null>(null);
  const [recording, setRecording] = useState(false);
  const [recTime, setRecTime] = useState(0);
  const recInterval = useRef<NodeJS.Timeout | null>(null);
  const [camStream, setCamStream] = useState<boolean>(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Audio playing state for voice memos
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);

  // Multi-user alerts/moderation
  const [violationAlert, setViolationAlert] = useState<{ reason: string; explanation: string; violationsCount: number; penaltyMessage: string } | null>(null);
  const [selectedUserProfile, setSelectedUserProfile] = useState<ChatUser | null>(null);
  const [reportingMessage, setReportingMessage] = useState<Message | null>(null);
  const [reportReason, setReportReason] = useState("profanity");
  const [reportComment, setReportComment] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  // Contextual action sheet
  const [contextMessage, setContextMessage] = useState<Message | null>(null);

  // Admin Stats
  const [adminStats, setAdminStats] = useState<{ reports: any[]; users: ChatUser[]; adminLogs: any[]; totalMessages: number; activeUsersCount: number } | null>(null);
  const [loadingAdmin, setLoadingAdmin] = useState(false);

  // Typing states
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const typingTimers = useRef<{ [username: string]: NodeJS.Timeout }>({});
  const lastTypingSent = useRef<number>(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sseRef = useRef<EventSource | null>(null);

  // Save persistent states
  useEffect(() => {
    localStorage.setItem("sm_chat_class", JSON.stringify(classMessages));
  }, [classMessages]);

  useEffect(() => {
    localStorage.setItem("sm_chat_friends_list", JSON.stringify(friendsList));
  }, [friendsList]);

  useEffect(() => {
    localStorage.setItem("sm_chat_friend_requests", JSON.stringify(friendRequests));
  }, [friendRequests]);

  // Audio chimes
  const playSound = (type: "send" | "receive" | "notification" | "system" | "reaction") => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === "send") {
        osc.frequency.setValueAtTime(523.25, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(783.99, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.12);
      } else if (type === "receive") {
        osc.frequency.setValueAtTime(659.25, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
      } else if (type === "reaction") {
        osc.frequency.setValueAtTime(880.00, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1046.50, audioCtx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.09);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.09);
      } else if (type === "notification") {
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
        osc.frequency.setValueAtTime(880.00, audioCtx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.25);
      } else if (type === "system") {
        osc.frequency.setValueAtTime(220.00, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.07, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.2);
      }
    } catch (e) {
      // Audio fallback
    }
  };

  // Fetch API Messages
  const fetchMessages = async (searchQuery = "") => {
    try {
      const url = searchQuery 
        ? `/api/chat/messages?search=${encodeURIComponent(searchQuery)}`
        : `/api/chat/messages`;
      const token = localStorage.getItem("studymate_token") || "";
      const res = await fetch(url, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setGlobalMessages(data);
      }
    } catch (error) {
      console.warn("Failed to load chat history:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Fetch Admin Stats
  const fetchAdminStats = async () => {
    if (!isUserAdmin) return;
    setLoadingAdmin(true);
    try {
      const token = localStorage.getItem("studymate_token") || "";
      const res = await fetch(`/api/chat/admin/stats?email=${encodeURIComponent(profile.emailAddress)}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAdminStats(data);
      }
    } catch (error) {
      console.warn("Failed to load admin stats:", error);
    } finally {
      setLoadingAdmin(false);
    }
  };

  // SSE setup
  useEffect(() => {
    if (!rulesAgreed) return;

    fetchMessages();
    if (isUserAdmin) {
      fetchAdminStats();
    }

    const token = localStorage.getItem("studymate_token") || "";
    const emailEnc = encodeURIComponent(profile.emailAddress);
    const tokenEnc = encodeURIComponent(token);
    const sse = new EventSource(`/api/chat/stream?email=${emailEnc}&token=${tokenEnc}`);
    sseRef.current = sse;

    sse.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const { type, data } = payload;

        switch (type) {
          case "connected":
            break;
          case "onlineCount":
            setOnlineCount(data.count || 18);
            break;
          case "message":
            setGlobalMessages((prev) => {
              if (prev.some((m) => m.id === data.id)) return prev;
              const next = [...prev, data];
              setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
              }, 100);
              return next;
            });
            if (data.userEmail.toLowerCase() !== profile.emailAddress.toLowerCase()) {
              playSound("receive");
            }
            break;
          case "messageDeleted":
            setGlobalMessages((prev) => 
              prev.map((m) => m.id === data.messageId 
                ? { ...m, text: "🚫 Message removed by moderator.", isDeleted: true }
                : m
              )
            );
            break;
          case "reportCreated":
            if (isUserAdmin) {
              playSound("system");
              handleAddNotification("🛡️ New Chat Abuse Report", `Message reported by user.`, "alert");
              fetchAdminStats();
            }
            break;
          case "typingState":
            if (data.userEmail.toLowerCase() !== profile.emailAddress.toLowerCase()) {
              const typingUser = data.username;
              if (data.isTyping) {
                setTypingUsers((prev) => {
                  const copy = new Set(prev);
                  copy.add(typingUser);
                  return copy;
                });
                if (typingTimers.current[typingUser]) clearTimeout(typingTimers.current[typingUser]);
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
                if (typingTimers.current[typingUser]) clearTimeout(typingTimers.current[typingUser]);
              }
            }
            break;
          default:
            break;
        }
      } catch (err) {
        console.warn("SSE parse error:", err);
      }
    };

    return () => {
      sse.close();
      Object.values(typingTimers.current).forEach(clearTimeout);
    };
  }, [rulesAgreed, isUserAdmin]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeTab, activeFriendId]);

  // Friend Request Actions
  const handleSendFriendRequest = (targetEmail: string, targetUsername: string, targetAvatar: string, targetLevel: number) => {
    // Check if already friends
    if (friendsList.some(f => f.email.toLowerCase() === targetEmail.toLowerCase())) {
      handleAddNotification("👥 Already Friends", `You are already friends with @${targetUsername}.`, "info");
      return;
    }

    // Check if request already pending
    const existingReq = friendRequests.find(r => r.fromEmail.toLowerCase() === targetEmail.toLowerCase() && r.status === "pending");
    if (existingReq) {
      handleAddNotification("⏳ Request Pending", `Friend request to @${targetUsername} is pending.`, "info");
      return;
    }

    const newReq: FriendRequest = {
      id: "req_" + Date.now(),
      fromEmail: targetEmail,
      fromUsername: targetUsername,
      fromAvatar: targetAvatar || "🎓",
      fromLevel: targetLevel || 1,
      timestamp: new Date().toISOString(),
      status: "pending"
    };

    setFriendRequests(prev => [...prev, newReq]);
    handleAddNotification("📩 Request Sent", `Friend request sent to @${targetUsername}!`, "success");

    // Auto accept simulation so user can test private chatting immediately
    setTimeout(() => {
      handleAddNotification("🎉 Request Accepted!", `@${targetUsername} accepted your friend request! You can now chat in Friends Section.`, "success");
      handleAcceptFriendRequest(newReq.id, targetEmail, targetUsername, targetAvatar, targetLevel);
    }, 2000);
  };

  const handleAcceptFriendRequest = (reqId: string, email: string, username: string, avatar: string, level: number) => {
    setFriendRequests(prev => prev.map(r => r.id === reqId ? { ...r, status: "accepted" } : r));

    setFriendsList(prev => {
      if (prev.some(f => f.email.toLowerCase() === email.toLowerCase())) return prev;
      const newFriend: FriendUser = {
        id: "f_" + Date.now(),
        email,
        username,
        avatar: avatar || "🎓",
        level: level || 1,
        status: "online",
        statusText: "Active in StudyMate",
        badge: "Study Buddy",
        unread: false,
        messages: [
          {
            id: "m_welcome_" + Date.now(),
            userEmail: email,
            username: username,
            avatar: avatar || "🎓",
            level: level || 1,
            text: `Hey! Thanks for accepting my friend request. Ready to crush our study targets together! 🚀`,
            timestamp: new Date().toISOString(),
            isDeleted: false,
            reportsCount: 0
          }
        ]
      };
      setActiveFriendId(newFriend.id);
      return [...prev, newFriend];
    });

    setActiveTab("friends");
    setShowFriendRequestsModal(false);
    if (selectedUserProfile) setSelectedUserProfile(null);
  };

  const handleDeclineFriendRequest = (reqId: string) => {
    setFriendRequests(prev => prev.map(r => r.id === reqId ? { ...r, status: "declined" } : r));
    handleAddNotification("❌ Request Declined", "Friend request declined.", "info");
  };

  // Handle Send Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((inputText.trim() === "" && !activeAttachment) || isSending) return;

    setIsSending(true);
    const textToSend = inputText;
    const attachmentToSend = activeAttachment;
    setInputText("");
    setActiveAttachment(null);
    setShowEmojiPicker(false);
    setShowPlusMenu(false);

    if (activeTab === "global") {
      try {
        const payload = {
          userEmail: profile.emailAddress,
          username: profile.nickname || profile.fullName,
          avatar: profile.avatar || "🎓",
          level: profile.level || 1,
          badge: profile.badges && profile.badges.length > 0 ? profile.badges[0] : undefined,
          text: textToSend || `Shared an attachment: ${attachmentToSend?.name}`,
          country: profile.country || "India",
          repliedToId: replyTarget ? replyTarget.id : undefined,
          repliedToUser: replyTarget ? replyTarget.username : undefined,
          attachment: attachmentToSend
        };

        const token = localStorage.getItem("studymate_token") || "";
        const res = await fetch("/api/chat/message", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (!res.ok) {
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
          setInputText(textToSend);
        } else {
          setReplyTarget(null);
          playSound("send");
          onAwardXP(2);
        }
      } catch (err) {
        console.warn(err);
        setInputText(textToSend);
      } finally {
        setIsSending(false);
      }
    } else {
      // Localized chat tabs: Class or Friends
      const localMsg: Message = {
        id: "local-" + Date.now() + Math.random().toString(36).substring(2, 6),
        userEmail: profile.emailAddress,
        username: profile.nickname || profile.fullName,
        avatar: profile.avatar || "🎓",
        level: profile.level || 1,
        badge: profile.badges?.[0] || "Scholar",
        text: textToSend || `Shared an attachment: ${attachmentToSend?.name}`,
        country: profile.country || "India",
        timestamp: new Date().toISOString(),
        repliedToId: replyTarget?.id || null,
        repliedToUser: replyTarget?.username || null,
        isDeleted: false,
        reportsCount: 0,
        reactions: [],
        attachment: attachmentToSend
      };

      if (activeTab === "class") {
        setClassMessages((prev) => [...prev, localMsg]);
        playSound("send");

        // Simulate classmate reply
        setTimeout(() => {
          const classmates = [
            { username: "Nikita Negi", avatar: "🌸", text: "That solution is super clear! Thank you for sharing." },
            { username: "Hardik Patel", avatar: "🤠", text: "Great question! Let's solve two more numericals on this topic." }
          ];
          const randomPeer = classmates[Math.floor(Math.random() * classmates.length)];
          const classmateMsg: Message = {
            id: "local-reply-" + Date.now(),
            userEmail: "peer@studymate.ai",
            username: randomPeer.username,
            avatar: randomPeer.avatar,
            level: 4,
            badge: "Aspirant",
            text: randomPeer.text,
            country: "India",
            timestamp: new Date().toISOString(),
            isDeleted: false,
            reportsCount: 0,
            reactions: [{ emoji: "❤️", count: 1, users: [] }]
          };
          setClassMessages((prev) => [...prev, classmateMsg]);
          playSound("receive");
        }, 1800);

      } else if (activeTab === "friends") {
        setFriendsList((prev) => 
          prev.map((f) => f.id === activeFriendId 
            ? { ...f, messages: [...f.messages, localMsg] } 
            : f
          )
        );
        playSound("send");

        const activeFriendObj = friendsList.find((f) => f.id === activeFriendId);
        setTimeout(() => {
          const replyText = `Got your message! Let's schedule a 25-minute study sprint together soon.`;
          const friendMsg: Message = {
            id: "local-reply-" + Date.now(),
            userEmail: activeFriendObj?.email || "friend@studymate.ai",
            username: activeFriendObj?.username.split(" ")[0] || "Buddy",
            avatar: activeFriendObj?.avatar || "🌟",
            level: activeFriendObj?.level || 4,
            badge: activeFriendObj?.badge || "Aspirant",
            text: replyText,
            timestamp: new Date().toISOString(),
            isDeleted: false,
            reportsCount: 0,
            reactions: [{ emoji: "🚀", count: 1, users: [] }]
          };

          setFriendsList((prev) => 
            prev.map((f) => f.id === activeFriendId 
              ? { ...f, messages: [...f.messages, friendMsg] } 
              : f
            )
          );
          playSound("receive");
        }, 1500);

      }

      setReplyTarget(null);
      setIsSending(false);
    }
  };

  // Toggle Reaction on a message
  const handleToggleReaction = (msgId: string, emoji: string) => {
    playSound("reaction");
    const userEmail = profile.emailAddress;

    const updater = (messages: Message[]): Message[] => {
      return messages.map((m) => {
        if (m.id !== msgId) return m;

        const currentReactions = m.reactions ? [...m.reactions] : [];
        const existingIndex = currentReactions.findIndex((r) => r.emoji === emoji);

        if (existingIndex >= 0) {
          const r = currentReactions[existingIndex];
          const hasReacted = r.users.includes(userEmail);

          if (hasReacted) {
            const newUsers = r.users.filter((u) => u !== userEmail);
            const newCount = r.count - 1;
            if (newCount <= 0) {
              currentReactions.splice(existingIndex, 1);
            } else {
              currentReactions[existingIndex] = { ...r, count: newCount, users: newUsers };
            }
          } else {
            currentReactions[existingIndex] = { ...r, count: r.count + 1, users: [...r.users, userEmail] };
          }
        } else {
          currentReactions.push({ emoji, count: 1, users: [userEmail] });
        }

        return { ...m, reactions: currentReactions };
      });
    };

    if (activeTab === "global") {
      setGlobalMessages(updater);
    } else if (activeTab === "class") {
      setClassMessages(updater);
    } else if (activeTab === "friends") {
      setFriendsList((prev) =>
        prev.map((f) => f.id === activeFriendId ? { ...f, messages: updater(f.messages) } : f)
      );
    }
  };

  // Toggle Pin on message
  const handleTogglePin = (msgId: string) => {
    const updater = (messages: Message[]): Message[] => {
      return messages.map((m) => m.id === msgId ? { ...m, isPinned: !m.isPinned } : m);
    };

    if (activeTab === "global") setGlobalMessages(updater);
    else if (activeTab === "class") setClassMessages(updater);
    else if (activeTab === "friends") {
      setFriendsList((prev) => prev.map((f) => f.id === activeFriendId ? { ...f, messages: updater(f.messages) } : f));
    }

    handleAddNotification("📌 Pinned Updated", "Message pin status toggled.", "info");
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchText.trim()) return;
    if (!recentSearches.includes(searchText)) {
      const updated = [searchText, ...recentSearches.slice(0, 4)];
      setRecentSearches(updated);
      localStorage.setItem("sm_recent_searches", JSON.stringify(updated));
    }
    fetchMessages(searchText);
  };

  const handleClearSearch = () => {
    setSearchText("");
    fetchMessages("");
  };

  // Voice recording mock-up
  const startRecording = () => {
    setRecording(true);
    setRecTime(0);
    recInterval.current = setInterval(() => {
      setRecTime((prev) => prev + 1);
    }, 1000);
  };

  const stopRecording = (shouldAttach: boolean) => {
    if (recInterval.current) clearInterval(recInterval.current);
    setRecording(false);
    if (shouldAttach) {
      setActiveAttachment({
        type: "voice",
        name: `Audio Voice Note (${recTime}s)`,
        duration: recTime || 5
      });
      handleAddNotification("🎙️ Audio Captured", "Your voice memo is attached and ready to send.", "success");
    }
    setRecTime(0);
  };

  // Base64 file loaders
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const isImg = file.type.startsWith("image/");
      setActiveAttachment({
        type: isImg ? "image" : "file",
        name: file.name,
        url: reader.result as string
      });
      handleAddNotification(isImg ? "🖼️ Image Loaded" : "📂 File Attached", `${file.name} is attached!`, "success");
    };
    reader.readAsDataURL(file);
  };

  const triggerCamera = () => {
    setCamStream(true);
  };

  const takeSnap = () => {
    setCamStream(false);
    setActiveAttachment({
      type: "camera",
      name: "Captured_Syllabus_Snap.png",
      url: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600&q=80"
    });
    handleAddNotification("📷 Camera Captured", "Syllabus snap attached successfully.", "success");
  };

  const handleOpenUserProfile = (email: string) => {
    // Search in friendsList or existing chat messages for profile details
    const existingFriend = friendsList.find(f => f.email.toLowerCase() === email.toLowerCase());
    
    const defaultProfile: ChatUser = {
      email,
      username: existingFriend?.username || email.split("@")[0],
      avatar: existingFriend?.avatar || "🎓",
      level: existingFriend?.level || 5,
      joinDate: new Date(Date.now() - 45 * 24 * 3600 * 1000).toDateString(),
      country: "India",
      violationsCount: 0,
      isBanned: false
    };
    setSelectedUserProfile(defaultProfile);
  };

  const handleAcceptRules = () => {
    localStorage.setItem("studymate_chat_rules_agreed", "true");
    setRulesAgreed(true);
  };

  const triggerTTS = (text: string) => {
    try {
      const u = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(u);
      handleAddNotification("🔊 Audio Reading", "Reading chat message aloud...", "info");
    } catch (err) {
      console.warn("TTS failed:", err);
    }
  };

  const executeAdminAction = async (action: string, targetId?: string, targetEmail?: string) => {
    if (!isUserAdmin) return;
    try {
      const token = localStorage.getItem("studymate_token") || "";
      const res = await fetch("/api/chat/admin/action", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          adminEmail: profile.emailAddress,
          action,
          targetId,
          targetEmail,
          reason: "Staff directive."
        })
      });

      if (res.ok) {
        handleAddNotification("🛡️ Moderator Action", "Task performed successfully.", "success");
        fetchAdminStats();
        fetchMessages();
      }
    } catch (e) {
      console.warn(e);
    }
  };

  // Get active messages list based on current tab
  const getActiveMessages = () => {
    let list: Message[] = [];
    if (activeTab === "global") list = globalMessages;
    else if (activeTab === "class") list = classMessages;
    else if (activeTab === "friends") {
      const activeFriend = friendsList.find((f) => f.id === activeFriendId);
      list = activeFriend ? activeFriend.messages : [];
    }

    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      return list.filter((m) => m.text.toLowerCase().includes(q) || m.username.toLowerCase().includes(q));
    }
    return list;
  };

  const activeMessages = getActiveMessages();
  const pinnedMessages = activeMessages.filter((m) => m.isPinned);

  if (!rulesAgreed) {
    return (
      <div className="flex-1 p-6 md:p-8 flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200/60 dark:border-slate-800/60 rounded-[2.5rem] p-8 shadow-2xl space-y-6"
        >
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-purple-600 text-white rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/20">
              <MessageSquare className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 font-display">StudyMate Flagship Community</h2>
            <p className="text-xs text-indigo-500 font-bold uppercase tracking-widest">Discord & Telegram Inspired Study Platform</p>
          </div>

          <div className="p-5 bg-slate-50/70 dark:bg-slate-850/50 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 space-y-4 font-medium leading-relaxed">
            <div className="flex items-start gap-3">
              <span className="p-2 bg-indigo-100 dark:bg-indigo-900/60 rounded-xl text-indigo-600 dark:text-indigo-400 shrink-0 font-bold">1</span>
              <div>
                <strong className="text-slate-800 dark:text-slate-100 block">Collaborative Study Rooms</strong>
                Join Global, Class, and Friends rooms to share notes, ask doubts, and chat 1-on-1 with friends!
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="p-2 bg-indigo-100 dark:bg-indigo-900/60 rounded-xl text-indigo-600 dark:text-indigo-400 shrink-0 font-bold">2</span>
              <div>
                <strong className="text-slate-800 dark:text-slate-100 block">AI Guard Moderation</strong>
                Profanity and slurs are automatically intercepted by StudyMate AI Guard to maintain a clean study environment.
              </div>
            </div>
          </div>

          <button
            onClick={handleAcceptRules}
            className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs rounded-2xl shadow-xl shadow-indigo-600/20 transition-all cursor-pointer"
          >
            I Agree, Unlock Community Hub
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div id="studymate_chat_panel" className="w-full max-w-md mx-auto flex-1 flex flex-col min-h-0 bg-slate-50/90 dark:bg-slate-950/90 rounded-none sm:rounded-[2.5rem] border-0 sm:border border-slate-200/80 dark:border-slate-800/80 shadow-2xl overflow-x-hidden overflow-y-hidden transition-all duration-300 relative my-0 sm:my-2">
      
      {/* Top Header Bar */}
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border-b border-slate-200/50 dark:border-slate-800/50 px-4 py-3 flex items-center justify-between shrink-0 shadow-sm z-20">
        
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="p-2 bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 text-white rounded-2xl shadow-md shadow-indigo-500/20 shrink-0">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-1.5 truncate">
              <h1 className="text-sm font-black text-slate-800 dark:text-slate-100 tracking-tight font-display truncate">StudyMate Hub</h1>
              <span className="text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                {onlineCount} Online
              </span>
            </div>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider truncate">Mobile Chat Hub</p>
          </div>
        </div>

        {/* Top Header Actions */}
        <div className="flex items-center space-x-1.5 shrink-0">
          {pinnedMessages.length > 0 && (
            <button
              onClick={() => setShowPinnedModal(true)}
              className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 rounded-xl text-[10px] font-bold transition flex items-center gap-1 cursor-pointer border border-indigo-200/40"
            >
              <Pin className="w-3 h-3" />
              <span>{pinnedMessages.length}</span>
            </button>
          )}

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            title="Toggle Audio Effects"
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl transition cursor-pointer"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-indigo-500" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {isUserAdmin && (
            <button
              onClick={() => {
                setAdminMode(!adminMode);
                fetchAdminStats();
              }}
              className={`p-1.5 rounded-xl text-[10px] font-bold transition flex items-center gap-1 cursor-pointer ${
                adminMode ? "bg-red-600 text-white shadow-md" : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </header>

      {/* Segmented Mobile Room Switcher Tabs (Global, Class, Friends) */}
      <div className="p-2 bg-white/60 dark:bg-slate-900/60 border-b border-slate-200/40 dark:border-slate-800/40 shrink-0 select-none">
        <div className="grid grid-cols-3 gap-1 bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-2xl text-xs font-bold">
          {[
            { id: "global", label: "Global", icon: Globe, count: 0 },
            { id: "class", label: "Class", icon: GraduationCap, count: 2 },
            { id: "friends", label: "Friends", icon: Users, count: friendsList.filter(f => f.unread).length }
          ].map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`py-2 px-1 rounded-xl flex items-center justify-center gap-1.5 transition-all text-xs font-extrabold cursor-pointer relative ${
                  isActive
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/20"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{t.label}</span>
                {t.count > 0 && !isActive && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping absolute top-1 right-1"></span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Chat Viewport */}
      <div className="flex-1 flex flex-col min-h-0 relative overflow-x-hidden">
        
        {/* Center Main Chat Viewport */}
        <section className="flex-1 flex flex-col min-h-0 bg-white/20 dark:bg-slate-950/20 backdrop-blur-md relative overflow-x-hidden">

          {/* Friends Section Top Selector Header Bar */}
          {activeTab === "friends" && (
            <div className="bg-white/70 dark:bg-slate-900/70 p-3 border-b border-slate-200/40 dark:border-slate-800/40 space-y-2.5 shrink-0 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-500" />
                  <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                    Friends Section ({friendsList.length} Friends)
                  </h3>
                </div>

                {/* Friend Requests Badge Button */}
                <button
                  onClick={() => setShowFriendRequestsModal(true)}
                  className="px-2.5 py-1 bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 rounded-full text-[10px] font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Friend Requests ({friendRequests.filter(r => r.status === "pending").length})</span>
                </button>
              </div>

              {/* Friend Selector Bar (Switch between specific friends) */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                {friendsList.map((friend) => {
                  const isSelected = activeFriendId === friend.id;
                  return (
                    <button
                      key={friend.id}
                      onClick={() => {
                        setActiveFriendId(friend.id);
                        setFriendsList(prev => prev.map(f => f.id === friend.id ? { ...f, unread: false } : f));
                      }}
                      className={`px-3 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 transition shrink-0 cursor-pointer border ${
                        isSelected 
                          ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-transparent shadow-md shadow-indigo-600/20 scale-102" 
                          : "bg-white/80 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200/50 dark:border-slate-700/50"
                      }`}
                    >
                      <div className="relative">
                        <span className="text-base">{friend.avatar}</span>
                        <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white dark:border-slate-900 ${friend.status === "online" ? "bg-emerald-500" : "bg-slate-400"}`}></span>
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="leading-tight">{friend.username}</span>
                        <span className={`text-[9px] font-normal ${isSelected ? "text-indigo-100" : "text-slate-400"}`}>
                          Lvl {friend.level}
                        </span>
                      </div>
                      {friend.unread && !isSelected && (
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Current Selected Friend Active Banner */}
              {(() => {
                const activeFriendObj = friendsList.find(f => f.id === activeFriendId);
                if (!activeFriendObj) return null;
                return (
                  <div className="p-2.5 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/50 dark:border-indigo-800/50 rounded-2xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">{activeFriendObj.avatar}</span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-slate-800 dark:text-slate-100">{activeFriendObj.username}</span>
                          <span className="text-[9px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.2 rounded-md font-bold">Lvl {activeFriendObj.level}</span>
                          <span className="text-[9px] bg-purple-500/10 text-purple-600 dark:text-purple-400 px-1.5 py-0.2 rounded-md font-bold">{activeFriendObj.badge}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5 text-emerald-500" /> Private 1-on-1 Chat • {activeFriendObj.statusText}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleOpenUserProfile(activeFriendObj.email)}
                      className="px-2.5 py-1 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 rounded-xl text-[10px] font-bold border border-indigo-200/40 cursor-pointer"
                    >
                      View Profile
                    </button>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Search bar & filter pill row */}
          <div className="bg-white/40 dark:bg-slate-900/40 px-4 md:px-6 py-2.5 border-b border-slate-200/30 dark:border-slate-800/30 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center shrink-0">
            <form onSubmit={handleSearchSubmit} className="flex-1 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
              <input
                type="text"
                placeholder="Search community doubts, notes, formula sheets, or users..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-white/70 dark:bg-slate-900/70 border border-slate-200/40 dark:border-slate-800/40 rounded-2xl text-xs outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 text-slate-800 dark:text-slate-100"
              />
              {searchText && (
                <button type="button" onClick={handleClearSearch} className="absolute right-3 top-2 text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </form>
            
            {/* Search Suggestion Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar select-none">
              {searchSuggestions.slice(0, 3).map((s) => (
                <button
                  key={s}
                  onClick={() => setSearchText(s)}
                  className="px-3 py-1 bg-white/60 dark:bg-slate-800/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-[10px] font-bold text-slate-600 dark:text-slate-300 rounded-full border border-slate-200/30 dark:border-slate-800/30 shrink-0 transition"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Pinned Announcement Sticky Banner */}
          {pinnedMessages.length > 0 && (
            <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-purple-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-between text-xs shrink-0 font-bold text-amber-700 dark:text-amber-300">
              <div className="flex items-center gap-2 truncate">
                <Pin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span className="truncate">📌 {pinnedMessages[0].username}: "{pinnedMessages[0].text.substring(0, 60)}..."</span>
              </div>
              <button onClick={() => setShowPinnedModal(true)} className="text-[10px] underline font-extrabold uppercase shrink-0 text-amber-600 hover:text-amber-800">
                View All ({pinnedMessages.length})
              </button>
            </div>
          )}

          {/* Main Message Stream Feed */}
          <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6 space-y-4 min-h-0 bg-slate-50/30 dark:bg-slate-950/30">
            
            {loadingHistory && activeTab === "global" ? (
              <div className="space-y-4 py-8">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="flex gap-3 animate-pulse">
                    <div className="w-10 h-10 bg-slate-200 dark:bg-slate-800 rounded-2xl shrink-0"></div>
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/4"></div>
                      <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-2xl w-2/3"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : activeMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                <div className="w-16 h-16 bg-white/60 dark:bg-slate-800/60 rounded-3xl flex items-center justify-center shadow-xl border border-slate-200/40 dark:border-slate-800/40">
                  <MessageSquare className="w-8 h-8 text-indigo-500 animate-bounce" />
                </div>
                <h3 className="text-base font-black text-slate-800 dark:text-slate-200 font-display">Study channel is quiet</h3>
                <p className="text-xs text-slate-400 max-w-xs font-semibold leading-relaxed">Ask physics doubts, upload study notes, or send a message to start the conversation!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeMessages.map((msg, index) => {
                  const isSelf = msg.userEmail.toLowerCase() === profile.emailAddress.toLowerCase();
                  const isMsgAdmin = isAdminEmail(msg.userEmail);

                  return (
                    <motion.div
                      key={`${msg.id || 'msg'}-${index}`}
                      initial={{ opacity: 0, y: 12, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      className={`flex gap-3 items-end ${isSelf ? "justify-end" : "justify-start"}`}
                    >
                      {!isSelf && (
                        <button
                          onClick={() => handleOpenUserProfile(msg.userEmail)}
                          className="w-10 h-10 bg-white/80 dark:bg-slate-900/80 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl flex items-center justify-center text-xl shadow-md hover:scale-105 transition shrink-0 cursor-pointer"
                          title="View Profile"
                        >
                          {msg.avatar || "🎓"}
                        </button>
                      )}

                      <div className={`max-w-[80%] md:max-w-[65%] flex flex-col space-y-1.5 ${isSelf ? "items-end" : "items-start"}`}>
                        
                        {/* Sender Header info */}
                        <div className="flex items-center gap-1.5 px-1.5 text-[10px] text-slate-400 font-bold">
                          <span 
                            className="text-slate-700 dark:text-slate-300 hover:underline cursor-pointer"
                            onClick={() => handleOpenUserProfile(msg.userEmail)}
                          >
                            {msg.username}
                          </span>
                          <span className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.2 rounded-md text-[9px]">
                            Lvl {msg.level}
                          </span>
                          {msg.badge && (
                            <span className="bg-purple-500/10 text-purple-600 dark:text-purple-400 px-1.5 py-0.2 rounded-md text-[9px]">
                              {msg.badge}
                            </span>
                          )}
                          {isMsgAdmin && (
                            <span className="bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 px-1.5 py-0.2 rounded-md flex items-center gap-0.5 text-[8px] font-black">
                              <Shield className="w-2.5 h-2.5" /> Staff
                            </span>
                          )}
                          {msg.isPinned && (
                            <span className="bg-amber-500/20 text-amber-600 dark:text-amber-400 px-1.5 py-0.2 rounded-md flex items-center gap-0.5 text-[8px]">
                              <Pin className="w-2.5 h-2.5" /> Pinned
                            </span>
                          )}
                        </div>

                        {/* Quoted reply message box */}
                        {msg.repliedToUser && (
                          <div className="p-2 bg-indigo-500/10 border-l-2 border-indigo-500 rounded-r-xl text-[10px] text-slate-500 dark:text-slate-400 max-w-full truncate">
                            Replying to <span className="font-bold text-indigo-600 dark:text-indigo-400">@{msg.repliedToUser}</span>
                          </div>
                        )}

                        {/* Floating Glass Bubble */}
                        <div 
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setContextMessage(msg);
                          }}
                          className={`p-4 rounded-3xl text-xs font-medium leading-relaxed shadow-xl relative group overflow-hidden break-words cursor-pointer transition-all ${
                            msg.isDeleted 
                              ? "bg-slate-100 dark:bg-slate-900 italic text-slate-400 border border-slate-200/30" 
                              : isSelf 
                                ? "bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 text-white rounded-br-none shadow-indigo-600/20" 
                                : "bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/40 dark:border-slate-800/50 rounded-bl-none text-slate-800 dark:text-slate-100"
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{msg.text}</p>

                          {/* Render Rich Media Attachments */}
                          {msg.attachment && (
                            <div className="mt-3 pt-3 border-t border-white/20 dark:border-slate-800/50 space-y-2">
                              {msg.attachment.type === "image" || msg.attachment.type === "camera" ? (
                                <div 
                                  onClick={() => setExpandedMediaUrl(msg.attachment?.url || null)}
                                  className="rounded-2xl overflow-hidden max-h-56 relative border border-slate-200/20 group/img cursor-pointer"
                                >
                                  <img 
                                    src={msg.attachment.url || "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600&q=80"} 
                                    alt="attachment" 
                                    className="object-cover w-full h-full group-hover/img:scale-105 transition duration-300"
                                    referrerPolicy="no-referrer"
                                  />
                                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition flex items-center justify-center text-white text-xs font-bold gap-1">
                                    <Maximize2 className="w-4 h-4" /> Expand Media
                                  </div>
                                </div>
                              ) : msg.attachment.type === "voice" ? (
                                <div className="flex items-center gap-3 bg-black/10 dark:bg-white/10 p-2.5 rounded-2xl text-xs font-bold">
                                  <button 
                                    type="button"
                                    onClick={() => {
                                      if (playingVoiceId === msg.id) {
                                        setPlayingVoiceId(null);
                                      } else {
                                        setPlayingVoiceId(msg.id);
                                        playSound("receive");
                                      }
                                    }}
                                    className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-md shrink-0 cursor-pointer"
                                  >
                                    {playingVoiceId === msg.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                                  </button>
                                  <div className="flex-1 flex items-center gap-1">
                                    {[12, 24, 18, 30, 16, 28, 20, 14, 22, 10].map((h, i) => (
                                      <span 
                                        key={i} 
                                        className={`w-1 rounded-full transition-all ${
                                          playingVoiceId === msg.id ? "bg-indigo-500 animate-pulse" : "bg-slate-400/50"
                                        }`}
                                        style={{ height: `${h}px` }}
                                      ></span>
                                    ))}
                                  </div>
                                  <span className="text-[10px] text-slate-400 shrink-0">{msg.attachment.duration || 6}s</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2.5 bg-black/10 dark:bg-white/10 p-2.5 rounded-2xl border border-white/10">
                                  <div className="p-2 bg-indigo-500/20 text-indigo-500 rounded-xl">
                                    <Paperclip className="w-4 h-4" />
                                  </div>
                                  <div className="flex-1 min-w-0 text-left">
                                    <p className="text-[11px] font-bold truncate text-slate-700 dark:text-slate-200">{msg.attachment.name}</p>
                                    <p className="text-[8px] text-slate-400">Study Note PDF • 2.4 MB</p>
                                  </div>
                                  <button className="p-1.5 hover:bg-black/20 rounded-lg text-slate-400">
                                    <Download className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Quick hover trigger menu bar */}
                          {!msg.isDeleted && (
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-white/90 dark:bg-slate-800/95 px-2 py-1 rounded-xl border border-slate-200/40 dark:border-slate-700/40 shadow-md z-10">
                              <button onClick={() => setReplyTarget(msg)} title="Reply" className="p-1 hover:text-indigo-500 text-slate-400 cursor-pointer">
                                <Reply className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => handleTogglePin(msg.id)} title="Pin message" className="p-1 hover:text-amber-500 text-slate-400 cursor-pointer">
                                <Pin className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => setContextMessage(msg)} title="More options" className="p-1 hover:text-indigo-500 text-slate-400 cursor-pointer">
                                <MoreVertical className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}

                        </div>

                        {/* Reaction Chips Row */}
                        {msg.reactions && msg.reactions.length > 0 && (
                          <div className="flex flex-wrap gap-1 px-1 py-0.5">
                            {msg.reactions.map((r, ri) => {
                              const userReacted = r.users.includes(profile.emailAddress);
                              return (
                                <button
                                  key={ri}
                                  onClick={() => handleToggleReaction(msg.id, r.emoji)}
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 transition cursor-pointer border ${
                                    userReacted 
                                      ? "bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border-indigo-300 dark:border-indigo-700" 
                                      : "bg-white/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-slate-200/40 dark:border-slate-700/40"
                                  }`}
                                >
                                  <span>{r.emoji}</span>
                                  <span>{r.count}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {/* Timestamp & metadata */}
                        <div className={`text-[9px] text-slate-400 font-semibold px-1.5 flex items-center gap-1.5 ${isSelf ? "justify-end" : "justify-start"}`}>
                          <Clock className="w-2.5 h-2.5" />
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {msg.country && <span>• 📍 {msg.country}</span>}
                        </div>

                      </div>

                      {isSelf && (
                        <button
                          onClick={() => handleOpenUserProfile(msg.userEmail)}
                          className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200/40 rounded-2xl flex items-center justify-center text-xl shadow-md hover:scale-105 transition shrink-0 cursor-pointer"
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

          {/* Live Typing Users Indicator */}
          <AnimatePresence>
            {typingUsers.size > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="absolute bottom-24 left-6 bg-white/90 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/60 dark:border-slate-800/60 px-4 py-2 rounded-full text-[10px] text-slate-600 dark:text-slate-300 font-bold shadow-xl z-20 flex items-center gap-2"
              >
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                </span>
                <span>{Array.from(typingUsers).join(", ")} {typingUsers.size === 1 ? "is typing doubt..." : "are typing..."}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Reply Banner */}
          {replyTarget && (
            <div className="bg-indigo-50/90 dark:bg-indigo-950/60 border-t border-indigo-200/40 px-4 py-2 flex items-center justify-between text-xs shrink-0 font-bold text-indigo-600 dark:text-indigo-400">
              <div className="flex items-center gap-2 truncate">
                <Reply className="w-4 h-4 shrink-0" />
                <span className="truncate">Replying to @{replyTarget.username}: "{replyTarget.text.substring(0, 45)}..."</span>
              </div>
              <button onClick={() => setReplyTarget(null)} className="p-1 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Active Attachment Chip */}
          {activeAttachment && (
            <div className="bg-emerald-500/10 border-t border-emerald-500/20 p-3 flex items-center justify-between text-xs shrink-0 font-bold text-emerald-600 dark:text-emerald-400">
              <div className="flex items-center gap-2.5">
                {activeAttachment.type === "image" || activeAttachment.type === "camera" ? (
                  <div className="w-10 h-10 bg-emerald-500/20 rounded-lg overflow-hidden shrink-0">
                    <img src={activeAttachment.url || "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400&q=80"} alt="preview" className="object-cover w-full h-full" />
                  </div>
                ) : (
                  <div className="p-2 bg-emerald-500/20 rounded-lg">
                    <Paperclip className="w-4 h-4" />
                  </div>
                )}
                <div>
                  <p className="truncate max-w-[200px]">{activeAttachment.name}</p>
                  <p className="text-[9px] uppercase font-bold text-emerald-500/80">{activeAttachment.type} attachment ready</p>
                </div>
              </div>
              <button onClick={() => setActiveAttachment(null)} className="p-1.5 hover:bg-emerald-500/20 rounded-xl cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Quick Emoji Bar */}
          {showEmojiPicker && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="bg-white/90 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200/40 dark:border-slate-800/40 px-4 py-2.5 flex gap-2 overflow-x-auto shrink-0 no-scrollbar select-none z-20"
            >
              {COMMON_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => setInputText((prev) => prev + emoji)}
                  className="px-3 py-1.5 text-base hover:scale-125 active:scale-95 bg-slate-100 dark:bg-slate-800/80 rounded-xl cursor-pointer transition shrink-0"
                >
                  {emoji}
                </button>
              ))}
            </motion.div>
          )}

          {/* Voice recording state banner */}
          {recording && (
            <div className="bg-rose-500/10 border-t border-rose-500/20 p-3 flex items-center justify-between text-xs shrink-0 font-bold text-rose-600 dark:text-rose-400">
              <div className="flex items-center gap-2.5">
                <span className="w-3.5 h-3.5 bg-rose-500 rounded-full animate-ping"></span>
                <span>Recording Audio Voice Note... {recTime}s</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => stopRecording(true)} className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl cursor-pointer text-[11px]">
                  Attach Memo
                </button>
                <button onClick={() => stopRecording(false)} className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl cursor-pointer text-[11px]">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Chatbox Input Composer Form with Single Plus (+) Icon */}
          <div className="p-3 md:p-4 shrink-0 z-20">
            <form 
              onSubmit={handleSendMessage} 
              className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-white/50 dark:border-slate-800/60 p-2.5 rounded-[2rem] shadow-2xl flex items-center gap-2"
            >
              
              {/* Consolidated Single Plus (+) Action Button */}
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setShowPlusMenu(!showPlusMenu)}
                  className={`p-2.5 rounded-2xl transition cursor-pointer flex items-center justify-center ${
                    showPlusMenu 
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 rotate-45" 
                      : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                  }`}
                  title="Add attachments, emojis, or recording"
                >
                  <Plus className="w-5 h-5 transition-transform duration-200" />
                </button>

                {/* Single Plus Menu Popover */}
                <AnimatePresence>
                  {showPlusMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute bottom-14 left-0 w-56 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-2 shadow-2xl z-40 space-y-1"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setShowEmojiPicker(!showEmojiPicker);
                          setShowPlusMenu(false);
                        }}
                        className="w-full px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2.5 transition cursor-pointer"
                      >
                        <div className="p-1.5 bg-amber-500/10 text-amber-500 rounded-lg">
                          <Smile className="w-4 h-4" />
                        </div>
                        <span>Emoji Expressions</span>
                      </button>

                      <label className="w-full px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2.5 transition cursor-pointer">
                        <div className="p-1.5 bg-indigo-500/10 text-indigo-500 rounded-lg">
                          <Image className="w-4 h-4" />
                        </div>
                        <span>Upload Image</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => {
                            handleFileUpload(e);
                            setShowPlusMenu(false);
                          }} 
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() => {
                          triggerCamera();
                          setShowPlusMenu(false);
                        }}
                        className="w-full px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2.5 transition cursor-pointer"
                      >
                        <div className="p-1.5 bg-emerald-500/10 text-emerald-500 rounded-lg">
                          <Camera className="w-4 h-4" />
                        </div>
                        <span>Take Camera Snap</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          startRecording();
                          setShowPlusMenu(false);
                        }}
                        disabled={recording}
                        className="w-full px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2.5 transition cursor-pointer disabled:opacity-50"
                      >
                        <div className="p-1.5 bg-rose-500/10 text-rose-500 rounded-lg">
                          <Mic className="w-4 h-4" />
                        </div>
                        <span>Record Voice Memo</span>
                      </button>

                      <label className="w-full px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2.5 transition cursor-pointer">
                        <div className="p-1.5 bg-purple-500/10 text-purple-500 rounded-lg">
                          <Paperclip className="w-4 h-4" />
                        </div>
                        <span>Attach Study File</span>
                        <input 
                          type="file" 
                          className="hidden" 
                          onChange={(e) => {
                            handleFileUpload(e);
                            setShowPlusMenu(false);
                          }} 
                        />
                      </label>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Text input */}
              <input
                type="text"
                placeholder="Ask physics doubts, share notes, post board revision tips..."
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value);
                  const now = Date.now();
                  if (now - lastTypingSent.current > 2500 && e.target.value.trim().length > 0) {
                    lastTypingSent.current = now;
                    const token = localStorage.getItem("studymate_token") || "";
                    fetch("/api/chat/typing", {
                      method: "POST",
                      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                      body: JSON.stringify({
                        userEmail: profile.emailAddress,
                        username: profile.nickname || profile.fullName,
                        isTyping: true
                      })
                    }).catch(() => {});
                  }
                }}
                maxLength={500}
                className="flex-1 px-4 py-2.5 bg-slate-100/60 dark:bg-slate-800/60 border border-slate-200/40 dark:border-slate-700/40 rounded-2xl text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 font-medium"
              />

              {/* Send Button */}
              <button
                type="submit"
                disabled={isSending || (inputText.trim() === "" && !activeAttachment)}
                className="p-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-40 text-white rounded-2xl shadow-lg shadow-indigo-600/20 transition cursor-pointer flex items-center justify-center shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>

        </section>

      </div>

      {/* -------------------- MODAL: EXPANDED MEDIA LIGHTBOX -------------------- */}
      <AnimatePresence>
        {expandedMediaUrl && (
          <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-xl select-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative max-w-4xl max-h-[85vh] overflow-hidden rounded-3xl border border-white/20 shadow-2xl flex flex-col items-center"
            >
              <button 
                onClick={() => setExpandedMediaUrl(null)} 
                className="absolute top-4 right-4 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full transition z-10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <img src={expandedMediaUrl} alt="Expanded media" className="object-contain max-h-[80vh] w-full" />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* -------------------- MODAL: PINNED MESSAGES DRAWER -------------------- */}
      <AnimatePresence>
        {showPinnedModal && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-md select-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[80vh] flex flex-col"
            >
              <div className="flex justify-between items-center border-b pb-3 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Pin className="w-5 h-5 text-amber-500" />
                  <h3 className="text-base font-black text-slate-800 dark:text-slate-100">Pinned Announcements</h3>
                </div>
                <button onClick={() => setShowPinnedModal(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {pinnedMessages.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">No pinned messages in this room yet.</p>
                ) : (
                  pinnedMessages.map((pm) => (
                    <div key={pm.id} className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/40 dark:border-slate-800/40 space-y-1 text-xs">
                      <div className="flex justify-between font-bold text-slate-700 dark:text-slate-200">
                        <span>@{pm.username}</span>
                        <span className="text-[10px] text-slate-400">{new Date(pm.timestamp).toLocaleDateString()}</span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 font-medium">{pm.text}</p>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* -------------------- MODAL: FRIEND REQUESTS DRAWER -------------------- */}
      <AnimatePresence>
        {showFriendRequestsModal && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-md select-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center border-b pb-3 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-indigo-500" />
                  <h3 className="text-base font-black text-slate-800 dark:text-slate-100">Friend Requests</h3>
                </div>
                <button onClick={() => setShowFriendRequestsModal(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {friendRequests.filter(r => r.status === "pending").length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">No pending friend requests.</p>
                ) : (
                  friendRequests.filter(r => r.status === "pending").map((req) => (
                    <div key={req.id} className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/40 dark:border-slate-800/40 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl">{req.fromAvatar}</span>
                        <div>
                          <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-100">{req.fromUsername}</h4>
                          <p className="text-[10px] text-slate-400">Lvl {req.fromLevel} • Wants to connect</p>
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleAcceptFriendRequest(req.id, req.fromEmail, req.fromUsername, req.fromAvatar, req.fromLevel)}
                          className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold cursor-pointer"
                          title="Accept Friend Request"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeclineFriendRequest(req.id)}
                          className="p-2 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                          title="Decline"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* -------------------- POPUP: WEBCAM SNAPSHOT VIEWPORT -------------------- */}
      <AnimatePresence>
        {camStream && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-md select-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden p-6 text-center space-y-4"
            >
              <h3 className="text-sm font-black text-white">Capture Syllabus Snap</h3>
              <div className="w-full h-48 bg-slate-950 rounded-2xl overflow-hidden relative flex items-center justify-center border border-slate-800">
                <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 to-transparent"></div>
                <GraduationCap className="w-12 h-12 text-indigo-400 animate-pulse" />
                <span className="absolute bottom-3 text-[10px] text-slate-400 font-bold uppercase tracking-widest">StudyMate Camera Ready</span>
              </div>
              <div className="flex gap-2">
                <button onClick={takeSnap} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl cursor-pointer">
                  Snap Frame
                </button>
                <button onClick={() => setCamStream(false)} className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl cursor-pointer">
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* -------------------- CONTEXTUAL ACTION SHEET -------------------- */}
      <AnimatePresence>
        {contextMessage && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center p-4 backdrop-blur-md select-none">
            <motion.div
              initial={{ opacity: 0, y: 150 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 150 }}
              className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-5 shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center border-b pb-2 dark:border-slate-800">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Message Options</span>
                <button onClick={() => setContextMessage(null)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Quick reactions bar */}
              <div className="flex justify-between bg-slate-50 dark:bg-slate-800/50 p-2 rounded-2xl">
                {["👍", "❤️", "😂", "🔥", "🎓", "💡"].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      handleToggleReaction(contextMessage.id, emoji);
                      setContextMessage(null);
                    }}
                    className="p-2 text-lg hover:scale-125 transition cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl max-h-20 overflow-y-auto text-xs italic text-slate-500 border border-slate-100 dark:border-slate-800">
                "{contextMessage.text}"
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                <button 
                  onClick={() => {
                    setReplyTarget(contextMessage);
                    setContextMessage(null);
                  }}
                  className="p-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-xl transition text-left flex items-center gap-2 cursor-pointer"
                >
                  <Reply className="w-4 h-4 text-indigo-500" /> Reply
                </button>

                <button 
                  onClick={() => {
                    handleTogglePin(contextMessage.id);
                    setContextMessage(null);
                  }}
                  className="p-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-xl transition text-left flex items-center gap-2 cursor-pointer"
                >
                  <Pin className="w-4 h-4 text-amber-500" /> {contextMessage.isPinned ? "Unpin" : "Pin"}
                </button>

                <button 
                  onClick={() => {
                    triggerTTS(contextMessage.text);
                    setContextMessage(null);
                  }}
                  className="p-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-xl transition text-left flex items-center gap-2 cursor-pointer"
                >
                  <Volume2 className="w-4 h-4 text-indigo-500" /> Speak Out
                </button>

                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(contextMessage.text);
                    handleAddNotification("📋 Copied", "Message text copied to clipboard.", "success");
                    setContextMessage(null);
                  }}
                  className="p-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-xl transition text-left flex items-center gap-2 cursor-pointer"
                >
                  <Copy className="w-4 h-4 text-indigo-500" /> Copy Text
                </button>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
                <button 
                  onClick={() => {
                    setReportingMessage(contextMessage);
                    setContextMessage(null);
                  }}
                  className="w-full p-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Flag className="w-4 h-4" /> Report Abuse
                </button>

                {isUserAdmin && (
                  <button 
                    onClick={() => {
                      executeAdminAction("deleteMessage", contextMessage.id, contextMessage.userEmail);
                      setContextMessage(null);
                    }}
                    className="w-full p-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" /> Moderator Delete
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* -------------------- POPUP: REPORT FORM -------------------- */}
      <AnimatePresence>
        {reportingMessage && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-md select-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center border-b pb-2">
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">File Study Group Violation</h3>
                <button onClick={() => setReportingMessage(null)} className="p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-slate-400">Reporting author: @{reportingMessage.username}</p>
              
              <div className="space-y-2">
                {["profanity", "hate_speech", "spam"].map((cat) => (
                  <label key={cat} className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800/40 rounded-xl cursor-pointer">
                    <input
                      type="radio"
                      name="report"
                      value={cat}
                      checked={reportReason === cat}
                      onChange={() => setReportReason(cat)}
                    />
                    <span className="text-xs text-slate-700 dark:text-slate-200 font-bold capitalize">{cat.replace("_", " ")}</span>
                  </label>
                ))}
              </div>

              <button
                onClick={async () => {
                  setIsSubmittingReport(true);
                  try {
                    const token = localStorage.getItem("studymate_token") || "";
                    await fetch("/api/chat/report", {
                      method: "POST",
                      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                      body: JSON.stringify({
                        messageId: reportingMessage.id,
                        reportedBy: profile.emailAddress,
                        reason: reportReason,
                        comment: reportComment
                      })
                    });
                    handleAddNotification("⚖️ Reported", "Violation sent to administrators.", "success");
                    setReportingMessage(null);
                  } catch (e) {
                    console.warn(e);
                  } finally {
                    setIsSubmittingReport(false);
                  }
                }}
                className="w-full py-2.5 bg-indigo-600 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                {isSubmittingReport ? "Submitting..." : "Submit Abuse Report"}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* -------------------- POPUP: VIOLATION WARNINGS -------------------- */}
      <AnimatePresence>
        {violationAlert && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 text-center space-y-4 shadow-2xl"
            >
              <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-black text-slate-800 dark:text-slate-100">Message Blocked by AI Moderator</h3>
              <p className="text-xs text-slate-500 font-semibold">"{violationAlert.explanation}"</p>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-[10px] text-left">
                <p className="font-bold text-indigo-500">{violationAlert.penaltyMessage}</p>
              </div>
              <button onClick={() => setViolationAlert(null)} className="w-full py-2.5 bg-indigo-600 text-white text-xs font-bold rounded-xl cursor-pointer">
                I Understand
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* -------------------- POPUP: USER PROFILE DETAIL CARD -------------------- */}
      <AnimatePresence>
        {selectedUserProfile && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-md select-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-6 text-center space-y-4 relative shadow-2xl"
            >
              <button onClick={() => setSelectedUserProfile(null)} className="absolute right-4 top-4 p-1.5 bg-slate-50 dark:bg-slate-800 rounded-full cursor-pointer">
                <X className="w-4 h-4" />
              </button>

              <div className="w-20 h-20 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto text-4xl shadow-xl shadow-indigo-500/20 text-white">
                {selectedUserProfile.avatar}
              </div>

              <div>
                <h4 className="text-base font-black text-slate-800 dark:text-slate-100">{selectedUserProfile.username}</h4>
                <p className="text-xs text-slate-400 font-bold">{selectedUserProfile.email}</p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl text-left text-xs font-bold space-y-2">
                <div className="flex justify-between"><span>Grade Track:</span><span className="text-indigo-500">CBSE 11-12</span></div>
                <div className="flex justify-between"><span>Region:</span><span>{selectedUserProfile.country || "India"}</span></div>
                <div className="flex justify-between"><span>Community Rank:</span><span className="text-amber-500">Lvl {selectedUserProfile.level}</span></div>
                <div className="flex justify-between"><span>Joined:</span><span className="text-slate-400">{selectedUserProfile.joinDate}</span></div>
              </div>

              {/* Friend Action Buttons */}
              {selectedUserProfile.email.toLowerCase() === profile.emailAddress.toLowerCase() ? (
                <div className="p-2.5 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs font-bold text-slate-500">
                  This is your profile
                </div>
              ) : (() => {
                const isFriend = friendsList.some(f => f.email.toLowerCase() === selectedUserProfile.email.toLowerCase());
                const pendingOutgoing = friendRequests.find(r => r.fromEmail.toLowerCase() === selectedUserProfile.email.toLowerCase() && r.status === "pending");

                if (isFriend) {
                  const friendObj = friendsList.find(f => f.email.toLowerCase() === selectedUserProfile.email.toLowerCase());
                  return (
                    <div className="space-y-2">
                      <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5">
                        <UserCheck className="w-4 h-4" /> Friends Connected
                      </div>
                      <button 
                        onClick={() => {
                          if (friendObj) setActiveFriendId(friendObj.id);
                          setActiveTab("friends");
                          setSelectedUserProfile(null);
                        }}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl cursor-pointer flex items-center justify-center gap-2"
                      >
                        <MessageSquare className="w-4 h-4" /> Chat in Friends Section
                      </button>
                    </div>
                  );
                }

                if (pendingOutgoing) {
                  return (
                    <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl text-xs font-bold flex items-center justify-center gap-2">
                      <Clock className="w-4 h-4 animate-spin" /> Friend Request Sent (Pending)
                    </div>
                  );
                }

                return (
                  <button 
                    onClick={() => {
                      handleSendFriendRequest(
                        selectedUserProfile.email,
                        selectedUserProfile.username,
                        selectedUserProfile.avatar,
                        selectedUserProfile.level
                      );
                    }}
                    className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
                  >
                    <UserPlus className="w-4 h-4" /> Send Friend Request
                  </button>
                );
              })()}

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
