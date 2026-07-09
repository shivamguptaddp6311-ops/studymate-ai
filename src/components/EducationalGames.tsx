import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Gamepad2, Trophy, Award, Zap, Brain, Eye, Sparkles, Coins, Gem, Target, 
  Volume2, VolumeX, Shield, Play, Lock, AlertCircle, RefreshCw, User, 
  Flame, CheckCircle2, Star, Clock, UserCheck, UserPlus, Search, Sliders, 
  Menu, X, HelpCircle, Dumbbell, Activity, Check, Share2, Compass, AlertTriangle
} from "lucide-react";
import { UserProfile } from "../types";

interface EducationalGamesProps {
  profile: UserProfile;
  onAwardXP: (xpAmount: number) => void;
  onAddNotification: (title: string, message: string, type: "info" | "alert" | "success" | "reminder") => void;
}

// Global Types for Game System
type GameCategory = "all" | "math" | "memory" | "eye" | "logic" | "speed" | "focus";
type DifficultyLevel = "easy" | "medium" | "hard" | "expert";

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: string;
  rewardCoins: number;
  rewardGems: number;
}

interface GameItem {
  id: string;
  title: string;
  category: GameCategory;
  desc: string;
  icon: React.ReactNode;
  color: string;
  bgLight: string;
  borderCol: string;
  skillsTrained: string[];
}

export default function EducationalGames({ profile, onAwardXP, onAddNotification }: EducationalGamesProps) {
  const emailPrefix = profile.emailAddress.replace(/[^a-zA-Z0-9]/g, "_");
  
  // Game Dashboard States
  const [activeTab, setActiveTab] = useState<"arcade" | "multiplayer" | "profile" | "shop" | "leaderboard">("arcade");
  const [selectedCategory, setSelectedCategory] = useState<GameCategory>("all");
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("medium");
  const [textSize, setTextSize] = useState<"normal" | "large" | "xlarge">("normal");

  // Player Economy & Progression (Persisted via LocalStorage)
  const [coins, setCoins] = useState<number>(() => {
    return parseInt(localStorage.getItem(`studymate_games_${emailPrefix}_coins`) || "250");
  });
  const [gems, setGems] = useState<number>(() => {
    return parseInt(localStorage.getItem(`studymate_games_${emailPrefix}_gems`) || "15");
  });
  const [userGameXP, setUserGameXP] = useState<number>(() => {
    return parseInt(localStorage.getItem(`studymate_games_${emailPrefix}_xp`) || "0");
  });
  const [gameStreak, setGameStreak] = useState<number>(() => {
    return parseInt(localStorage.getItem(`studymate_games_${emailPrefix}_streak`) || "3");
  });
  const [unlockedAvatars, setUnlockedAvatars] = useState<string[]>(() => {
    const saved = localStorage.getItem(`studymate_games_${emailPrefix}_unlocked_avatars`);
    return saved ? JSON.parse(saved) : ["👨‍🎓", "👩‍🎓", "👾", "🦊"];
  });
  const [selectedAvatar, setSelectedAvatar] = useState<string>(() => {
    return localStorage.getItem(`studymate_games_${emailPrefix}_selected_avatar`) || profile.avatar || "👨‍🎓";
  });
  const [unlockedFrames, setUnlockedFrames] = useState<string[]>(() => {
    const saved = localStorage.getItem(`studymate_games_${emailPrefix}_unlocked_frames`);
    return saved ? JSON.parse(saved) : ["none", "bronze"];
  });
  const [selectedFrame, setSelectedFrame] = useState<string>(() => {
    return localStorage.getItem(`studymate_games_${emailPrefix}_selected_frame`) || "bronze";
  });
  const [registeredTournaments, setRegisteredTournaments] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`studymate_games_${emailPrefix}_registered_tournaments`);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Daily / Weekly Challenges System
  const [dailyChallenges, setDailyChallenges] = useState([
    { id: "math_1", text: "Solve 5 Math speed sprints", target: 5, current: 2, xp: 20, coins: 50, completed: false },
    { id: "memory_1", text: "Reach a score of 12 in Card Matching", target: 12, current: 0, xp: 25, coins: 60, completed: false },
    { id: "multi_1", text: "Win 1 Live Multiplayer Duel", target: 1, current: 0, xp: 30, coins: 80, completed: false }
  ]);

  // Audio system state
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    return localStorage.getItem("studymate_games_audio_muted") === "true";
  });

  // Analytics Stats State
  const [stats, setStats] = useState({
    gamesPlayed: parseInt(localStorage.getItem(`studymate_games_${emailPrefix}_played`) || "0"),
    gamesWon: parseInt(localStorage.getItem(`studymate_games_${emailPrefix}_won`) || "0"),
    accuracyAvg: parseInt(localStorage.getItem(`studymate_games_${emailPrefix}_accuracy`) || "0"),
    completionSecAvg: parseInt(localStorage.getItem(`studymate_games_${emailPrefix}_speed`) || "0"),
    bestMathStreak: parseInt(localStorage.getItem(`studymate_games_${emailPrefix}_math_best`) || "0"),
    bestMemoryScore: parseInt(localStorage.getItem(`studymate_games_${emailPrefix}_memory_best`) || "0")
  });

  // Achievements
  const [achievements, setAchievements] = useState<Achievement[]>(() => {
    try {
      const saved = localStorage.getItem(`studymate_games_${emailPrefix}_achievements`);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      { id: "first_win", title: "Arcade Champion", description: "Win any Educational Game", icon: "🏆", rewardCoins: 100, rewardGems: 5 },
      { id: "math_wizard", title: "Math Prodigy", description: "Get a perfect score in Math Challenge on Expert difficulty", icon: "🧮", rewardCoins: 300, rewardGems: 15 },
      { id: "focus_guru", title: "Zen Master", description: "Complete a Focus Dot training session with >95% accuracy", icon: "👁️", rewardCoins: 200, rewardGems: 10 },
      { id: "multiplayer_king", title: "Gladiator", description: "Win 10 live Multiplayer Duels", icon: "⚔️", rewardCoins: 500, rewardGems: 25 },
      { id: "streak_5", title: "Unstoppable", description: "Maintain a 5-day cognitive training streak", icon: "🔥", rewardCoins: 150, rewardGems: 8 }
    ];
  });

  // Active game flow states
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [gamePlaying, setGamePlaying] = useState<boolean>(false);
  const [isMultiplayerMatch, setIsMultiplayerMatch] = useState<boolean>(false);
  const [showGameSummary, setShowGameSummary] = useState<boolean>(false);
  const [summaryData, setSummaryData] = useState<any>(null);

  // Simulated Multiplayer Matchmaker States
  const [matchmakingActive, setMatchmakingActive] = useState(false);
  const [matchmakerTimer, setMatchmakerTimer] = useState(0);
  const [matchedOpponent, setMatchedOpponent] = useState<{ name: string; avatar: string; grade: string; rating: number } | null>(null);

  // Live Opponent Stats for Dual Competition
  const [opponentScore, setOpponentScore] = useState(0);
  const opponentScoreInterval = useRef<any>(null);

  // Sound effects synthesizer (AudioContext)
  const synthSound = (freq: number, type: OscillatorType = "sine", duration = 0.15) => {
    if (isMuted) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      // Ignore audio contextual blocker
    }
  };

  const playSuccessChime = () => {
    synthSound(400, "sine", 0.08);
    setTimeout(() => synthSound(600, "sine", 0.12), 80);
    setTimeout(() => synthSound(800, "sine", 0.2), 160);
  };

  const playFailureBuzz = () => {
    synthSound(150, "sawtooth", 0.35);
  };

  const playLevelUpFanfare = () => {
    synthSound(300, "triangle", 0.1);
    setTimeout(() => synthSound(450, "triangle", 0.1), 100);
    setTimeout(() => synthSound(600, "triangle", 0.12), 200);
    setTimeout(() => synthSound(900, "sine", 0.4), 300);
  };

  // Sync state to localStorage on modification
  useEffect(() => {
    localStorage.setItem(`studymate_games_${emailPrefix}_coins`, String(coins));
    localStorage.setItem(`studymate_games_${emailPrefix}_gems`, String(gems));
    localStorage.setItem(`studymate_games_${emailPrefix}_xp`, String(userGameXP));
    localStorage.setItem(`studymate_games_${emailPrefix}_streak`, String(gameStreak));
    localStorage.setItem(`studymate_games_${emailPrefix}_unlocked_avatars`, JSON.stringify(unlockedAvatars));
    localStorage.setItem(`studymate_games_${emailPrefix}_selected_avatar`, selectedAvatar);
    localStorage.setItem(`studymate_games_${emailPrefix}_unlocked_frames`, JSON.stringify(unlockedFrames));
    localStorage.setItem(`studymate_games_${emailPrefix}_selected_frame`, selectedFrame);
    localStorage.setItem("studymate_games_audio_muted", String(isMuted));
  }, [coins, gems, userGameXP, gameStreak, unlockedAvatars, selectedAvatar, unlockedFrames, selectedFrame, isMuted, emailPrefix]);

  // AI Game Recommender engine based on profile weakSubjects
  const getAIRecommendation = () => {
    const weak = profile.weakSubjects && profile.weakSubjects.length > 0 ? profile.weakSubjects[0].toLowerCase() : "mathematics";
    
    if (weak.includes("math") || weak.includes("algebra") || weak.includes("geometry") || weak.includes("arithmetic") || weak.includes("calculation")) {
      return {
        gameId: "quick_calc",
        reason: "Based on your focus on strengthening Math skills, try the Mental Arithmetic Sprint to build high-speed calculations!",
        title: "🧮 Math Calculation Sprint"
      };
    } else if (weak.includes("science") || weak.includes("physics") || weak.includes("chemistry") || weak.includes("biology")) {
      return {
        gameId: "memory_pairs",
        reason: "Strengthen active memorization of chemical symbols and physics formulas with Memory Card Match!",
        title: "🧠 Memory Matrix Pairs"
      };
    } else if (weak.includes("english") || weak.includes("hindi") || weak.includes("history")) {
      return {
        gameId: "speed_matrix",
        reason: "Train rapid lexical recognition and eye-span tracking to read complex essays faster with Eye Speed Vision!",
        title: "👁️ Speed Vision & Search"
      };
    } else {
      return {
        gameId: "stroop_reflex",
        reason: "Enhance cognitive speed, distraction filtration, and rapid focus shifting with Brain Reflex Rush!",
        title: "⚡ Stroop Reflex Rush"
      };
    }
  };

  const aiRecommendation = getAIRecommendation();

  // Shop Avatars & Frames catalog
  const AVATAR_SHOP = [
    { emoji: "🧙‍♂️", name: "Math Wizard", cost: 450, isGem: false },
    { emoji: "🚀", name: "Astronaut Scholar", cost: 800, isGem: false },
    { emoji: "🦖", name: "Logic T-Rex", cost: 50, isGem: true },
    { emoji: "🦄", name: "Creativity Unicorn", cost: 80, isGem: true },
    { emoji: "🤖", name: "Coded Cyborg", cost: 1200, isGem: false },
    { emoji: "🏆", name: "Olympiad Champ", cost: 150, isGem: true },
    { emoji: "🐲", name: "Dragon Overlord", cost: 2500, isGem: false },
    { emoji: "🐙", name: "Brainiac Kraken", cost: 1800, isGem: false },
    { emoji: "👽", name: "Alien Telepath", cost: 220, isGem: true },
    { emoji: "🔥", name: "Phoenix Legend", cost: 350, isGem: true },
    { emoji: "💀", name: "Immortal Thinker", cost: 3000, isGem: false }
  ];

  const FRAME_SHOP = [
    { id: "gold", name: "Gilded Gold Frame", style: "border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.5)]", cost: 600, isGem: false },
    { id: "neon", name: "Neon Cyberspace Frame", style: "border-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.6)] animate-pulse", cost: 120, isGem: true },
    { id: "obsidian", name: "Obsidian Sage Frame", style: "border-purple-600 shadow-[0_0_8px_rgba(147,51,234,0.4)]", cost: 80, isGem: true },
    { id: "emerald_plasma", name: "Emerald Plasma Frame", style: "border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.8)] animate-pulse", cost: 200, isGem: true },
    { id: "cosmic_blackhole", name: "Cosmic Blackhole Frame", style: "border-slate-950 dark:border-indigo-950 shadow-[0_0_20px_rgba(99,102,241,0.8)]", cost: 5000, isGem: false },
    { id: "rainbow_matrix", name: "Rainbow Matrix Frame", style: "border-fuchsia-500 shadow-[0_0_12px_#3b82f6,_0_0_12px_#ec4899]", cost: 350, isGem: true },
    { id: "ruby_inferno", name: "Ruby Inferno Frame", style: "border-rose-600 shadow-[0_0_18px_rgba(225,29,72,0.9)]", cost: 1500, isGem: false }
  ];

  // Game List
  const GAMES_CATALOGUE: GameItem[] = [
    {
      id: "quick_calc",
      title: "Math Calculation Sprint",
      category: "math",
      desc: "Speed-solve dynamic arithmetic questions tailored perfectly to your Grade level under rapid countdown!",
      icon: <span className="text-2xl">🧮</span>,
      color: "from-blue-500 to-indigo-600",
      bgLight: "bg-blue-50/60 dark:bg-blue-950/20",
      borderCol: "border-blue-100 dark:border-blue-900/40",
      skillsTrained: ["Mental Math", "Arithmetic Speed", "Accuracy under stress"]
    },
    {
      id: "math_fractions",
      title: "Fraction & Decimal Matcher",
      category: "math",
      desc: "Compare fraction equations and values rapidly! Master NCERT/CBSE fraction modules under a clock.",
      icon: <span className="text-2xl">🍰</span>,
      color: "from-sky-400 to-indigo-500",
      bgLight: "bg-sky-50/60 dark:bg-sky-950/20",
      borderCol: "border-sky-100 dark:border-sky-900/40",
      skillsTrained: ["Fractions & Ratios", "Mental Division", "Decimal Estimation"]
    },
    {
      id: "memory_pairs",
      title: "Memory Matrix Pairs",
      category: "memory",
      desc: "Match grid card duplicates representing standard academic diagrams, key mathematical formulas, or colorful icons.",
      icon: <span className="text-2xl">🧠</span>,
      color: "from-purple-500 to-pink-600",
      bgLight: "bg-purple-50/60 dark:bg-purple-950/20",
      borderCol: "border-purple-100 dark:border-purple-900/40",
      skillsTrained: ["Active Recall", "Visual Retention", "Spatial Matching"]
    },
    {
      id: "formula_recall",
      title: "Formula Match & Recall",
      category: "memory",
      desc: "Connect essential formulas (Science, Chemistry, Algebra) to master board exams via active retention memory games.",
      icon: <span className="text-2xl">🔬</span>,
      color: "from-fuchsia-500 to-rose-600",
      bgLight: "bg-fuchsia-50/60 dark:bg-fuchsia-950/20",
      borderCol: "border-fuchsia-100 dark:border-fuchsia-900/40",
      skillsTrained: ["Scientific Formulas", "Algebraic Identities", "Chemical Notations"]
    },
    {
      id: "speed_matrix",
      title: "Speed Vision & Search",
      category: "eye",
      desc: "Scientifically-inspired training: Rapidly locate numbers or symbols in order to train peripheral eye sight and cognitive mapping.",
      icon: <span className="text-2xl">👁️</span>,
      color: "from-emerald-500 to-teal-600",
      bgLight: "bg-emerald-50/60 dark:bg-emerald-950/20",
      borderCol: "border-emerald-100 dark:border-emerald-900/40",
      skillsTrained: ["Visual Span", "Eye-Hand Coordination", "Peripheral Tracking"]
    },
    {
      id: "letter_tracking",
      title: "Dynamic Alphabet Pursuit",
      category: "eye",
      desc: "A classical ocular scan exercise: Search and track letter matrices in strict alphabetic order under high-speed pacing.",
      icon: <span className="text-2xl">🔤</span>,
      color: "from-green-400 to-emerald-500",
      bgLight: "bg-green-50/60 dark:bg-green-950/20",
      borderCol: "border-green-100 dark:border-green-900/40",
      skillsTrained: ["Peripheral Vision", "Cognitive Scan Velocity", "Saccadic Focus"]
    },
    {
      id: "eye_ball_tracker",
      title: "Find the Ball (Eye Training)",
      category: "eye",
      desc: "Watch the red target ball shuffle and slowly turn white over 10 seconds. Keep your eyes locked to find the target!",
      icon: <span className="text-2xl">🔴</span>,
      color: "from-rose-500 to-amber-500",
      bgLight: "bg-rose-50/60 dark:bg-rose-950/10",
      borderCol: "border-rose-100 dark:border-rose-900/30",
      skillsTrained: ["Eye Tracking", "Attention Maintenance", "Visual Trajectory"]
    },
    {
      id: "tic_tac_ai",
      title: "Tic-Tac-Toe AI",
      category: "logic",
      desc: "Outsmart the unbeatable minimax StudyMate AI on varying grid scales. Perfect logic practice!",
      icon: <span className="text-2xl">🧩</span>,
      color: "from-amber-500 to-orange-600",
      bgLight: "bg-amber-50/60 dark:bg-amber-950/20",
      borderCol: "border-amber-100 dark:border-amber-900/40",
      skillsTrained: ["Logical Planning", "Anticipation", "Tactical Play"]
    },
    {
      id: "logic_sequences",
      title: "Numeric Series Solver",
      category: "logic",
      desc: "Solve CBSE logic sequences and numeric pattern boards! Figure out what number is missing in the progression.",
      icon: <span className="text-2xl">🔢</span>,
      color: "from-orange-400 to-red-500",
      bgLight: "bg-orange-50/60 dark:bg-orange-950/20",
      borderCol: "border-orange-100 dark:border-orange-900/40",
      skillsTrained: ["Sequence Identification", "Inductive Logic", "Formula Extrapolation"]
    },
    {
      id: "speed_sum",
      title: "Speed Number Addition",
      category: "speed",
      desc: "10 numbers flash one by one every 2 seconds. Keep a running sum in your head and select the correct total!",
      icon: <span className="text-2xl">⏱️</span>,
      color: "from-rose-500 to-red-600",
      bgLight: "bg-rose-50/60 dark:bg-rose-950/20",
      borderCol: "border-rose-100 dark:border-rose-900/40",
      skillsTrained: ["Working Memory", "Arithmetic Velocity", "Active Auditory Buffer"]
    },
    {
      id: "speed_ops",
      title: "Arithmetic Speed Sprint",
      category: "speed",
      desc: "Solve addition, subtraction, multiplication, and division under a rapid clock without getting distracted!",
      icon: <span className="text-2xl">⚡</span>,
      color: "from-rose-600 to-pink-500",
      bgLight: "bg-rose-50/60 dark:bg-rose-950/10",
      borderCol: "border-rose-100 dark:border-rose-900/40",
      skillsTrained: ["Rapid Operations", "Operator Decoding", "Multi-Thread Calculations"]
    },
    {
      id: "focus_dots",
      title: "Focus Attention Tracker",
      category: "focus",
      desc: "Tap target colors while ignoring floating spatial distractions. Deep focus challenge to improve attention span.",
      icon: <span className="text-2xl">🎯</span>,
      color: "from-cyan-500 to-blue-600",
      bgLight: "bg-cyan-50/60 dark:bg-cyan-950/20",
      borderCol: "border-cyan-100 dark:border-cyan-900/40",
      skillsTrained: ["Selective Attention", "Distraction Immunity", "Focus Endurance"]
    },
    {
      id: "shape_focus",
      title: "Active Shape Concentrator",
      category: "focus",
      desc: "Concentrate on matching specific target shapes in a fast-paced environment while tuning out noisy background alerts.",
      icon: <span className="text-2xl">💠</span>,
      color: "from-teal-400 to-cyan-500",
      bgLight: "bg-teal-50/60 dark:bg-teal-950/20",
      borderCol: "border-teal-100 dark:border-teal-900/40",
      skillsTrained: ["Sustained Attention", "Selective Focus", "Noise Cancellation"]
    }
  ];

  // Buy Shop Items Handler
  const buyAvatar = (emoji: string, cost: number, isGem: boolean) => {
    if (unlockedAvatars.includes(emoji)) {
      setSelectedAvatar(emoji);
      synthSound(400, "sine", 0.08);
      onAddNotification("Avatar Updated", `Successfully equipped avatar ${emoji}!`, "info");
      return;
    }
    
    if (isGem) {
      if (gems < cost) {
        synthSound(150, "sawtooth", 0.2);
        onAddNotification("Insufficient Gems", "You need more gems to unlock this premium scholar avatar!", "alert");
        return;
      }
      setGems(prev => prev - cost);
    } else {
      if (coins < cost) {
        synthSound(150, "sawtooth", 0.2);
        onAddNotification("Insufficient Coins", "Earn more coins by playing arcade games or completing study milestones!", "alert");
        return;
      }
      setCoins(prev => prev - cost);
    }

    setUnlockedAvatars(prev => [...prev, emoji]);
    setSelectedAvatar(emoji);
    playLevelUpFanfare();
    onAddNotification("Purchase Successful!", `Unlocked and equipped the gorgeous avatar ${emoji}!`, "success");
  };

  const buyFrame = (id: string, cost: number, isGem: boolean) => {
    if (unlockedFrames.includes(id)) {
      setSelectedFrame(id);
      synthSound(400, "sine", 0.08);
      onAddNotification("Frame Changed", "Successfully equipped your profile frame!", "info");
      return;
    }

    if (isGem) {
      if (gems < cost) {
        playFailureBuzz();
        onAddNotification("Insufficient Gems", "You need more gems to purchase this aesthetic outline!", "alert");
        return;
      }
      setGems(prev => prev - cost);
    } else {
      if (coins < cost) {
        playFailureBuzz();
        onAddNotification("Insufficient Coins", "Play games to win more StudyMate gold coins!", "alert");
        return;
      }
      setCoins(prev => prev - cost);
    }

    setUnlockedFrames(prev => [...prev, id]);
    setSelectedFrame(id);
    playLevelUpFanfare();
    onAddNotification("Border Frame Purchased!", "Your avatar card looks majestic now!", "success");
  };

  // Simulated Matchmaking Launcher for Multiplayer Duels
  const startMatchmaking = (gameId: string) => {
    setActiveGameId(gameId);
    setMatchmakingActive(true);
    setMatchmakerTimer(0);
    setMatchedOpponent(null);
    synthSound(300, "sine", 0.1);

    const opponentPool = [
      { name: "StudyMate Bot (Delta)", avatar: "🤖", grade: profile.classGrade, rating: 1240 },
      { name: "Academic Bot (Sigma)", avatar: "🦾", grade: profile.classGrade, rating: 1180 },
      { name: "Science Solver (Omega)", avatar: "📡", grade: profile.classGrade, rating: 1310 },
      { name: "Revision Bot (Theta)", avatar: "👾", grade: profile.classGrade, rating: 1290 },
      { name: "Peer Companion (Zeta)", avatar: "🧠", grade: profile.classGrade, rating: 1150 }
    ];

    const matchInterval = setInterval(() => {
      setMatchmakerTimer(prev => {
        if (prev >= 3) {
          clearInterval(matchInterval);
          const opp = opponentPool[Math.floor(Math.random() * opponentPool.length)];
          setMatchedOpponent(opp);
          synthSound(600, "sine", 0.15);
          setTimeout(() => synthSound(800, "sine", 0.2), 100);
          
          // Match Found: Auto-play
          setTimeout(() => {
            setMatchmakingActive(false);
            setIsMultiplayerMatch(true);
            setGamePlaying(true);
            setOpponentScore(0);
            
            // Set up active opponent scores increasing
            let oScore = 0;
            opponentScoreInterval.current = setInterval(() => {
              const incChance = Math.random() > 0.45;
              if (incChance) {
                oScore += Math.floor(Math.random() * 2) + 1;
                setOpponentScore(oScore);
                synthSound(250, "sine", 0.05); // Opponent subtle sound
              }
            }, 3000);

          }, 1500);
          return 3;
        }
        synthSound(400 + prev * 100, "sine", 0.08);
        return prev + 1;
      });
    }, 1000);
  };

  // Finished Game Score Dispatcher
  const handleGameFinished = (gameId: string, playerScore: number, maxPossible: number, accuracy: number) => {
    if (opponentScoreInterval.current) {
      clearInterval(opponentScoreInterval.current);
    }

    const won = isMultiplayerMatch ? playerScore > opponentScore : playerScore >= (maxPossible * 0.4);
    
    // XP and Currency payouts
    const baseXP = won ? 40 : 15;
    const bonusXP = Math.floor(playerScore * 0.5);
    const totalXPWon = baseXP + bonusXP;

    const baseCoins = won ? 50 : 20;
    const bonusCoins = Math.floor(playerScore * 0.8);
    const totalCoinsWon = baseCoins + bonusCoins;

    const gemsWon = accuracy >= 95 ? 2 : 0;

    // Update global variables
    setUserGameXP(prev => prev + totalXPWon);
    setCoins(prev => prev + totalCoinsWon);
    if (gemsWon > 0) setGems(prev => prev + gemsWon);
    onAwardXP(totalXPWon);

    // Track analytics stats
    setStats(prev => {
      const plays = prev.gamesPlayed + 1;
      const wins = won ? prev.gamesWon + 1 : prev.gamesWon;
      const newAcc = Math.round((prev.accuracyAvg * prev.gamesPlayed + accuracy) / plays);
      
      localStorage.setItem(`studymate_games_${emailPrefix}_played`, String(plays));
      localStorage.setItem(`studymate_games_${emailPrefix}_won`, String(wins));
      localStorage.setItem(`studymate_games_${emailPrefix}_accuracy`, String(newAcc));

      return {
        ...prev,
        gamesPlayed: plays,
        gamesWon: wins,
        accuracyAvg: newAcc
      };
    });

    // Check Daily Challenges
    setDailyChallenges(prev => {
      return prev.map(c => {
        if (c.id === "math_1" && gameId === "quick_calc") {
          const updated = Math.min(c.current + 1, c.target);
          return { ...c, current: updated, completed: updated >= c.target };
        }
        if (c.id === "multi_1" && isMultiplayerMatch && won) {
          const updated = Math.min(c.current + 1, c.target);
          return { ...c, current: updated, completed: updated >= c.target };
        }
        return c;
      });
    });

    setSummaryData({
      gameId,
      won,
      score: playerScore,
      opponentScore: isMultiplayerMatch ? opponentScore : undefined,
      opponentName: isMultiplayerMatch && matchedOpponent ? matchedOpponent.name : undefined,
      xpGained: totalXPWon,
      coinsGained: totalCoinsWon,
      gemsGained: gemsWon,
      accuracy
    });

    setGamePlaying(false);
    setShowGameSummary(true);
    if (won) {
      playSuccessChime();
    } else {
      playFailureBuzz();
    }
  };

  const closeGame = () => {
    if (opponentScoreInterval.current) {
      clearInterval(opponentScoreInterval.current);
    }
    setGamePlaying(false);
    setIsMultiplayerMatch(false);
    setActiveGameId(null);
    setShowGameSummary(false);
    setMatchedOpponent(null);
  };

  const getFilteredGames = () => {
    if (selectedCategory === "all") return GAMES_CATALOGUE;
    return GAMES_CATALOGUE.filter(g => g.category === selectedCategory);
  };

  const getTextSizeClass = () => {
    if (textSize === "large") return "text-base";
    if (textSize === "xlarge") return "text-lg";
    return "text-xs";
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-6 space-y-6 h-[calc(100vh-140px)] overflow-y-auto pr-2">
      
      {/* Top Banner Status Header bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="relative">
            {/* Avatar frame renderer */}
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-indigo-50 dark:bg-indigo-950 border-4 ${
              selectedFrame === "gold" ? "border-amber-400 shadow-md" : 
              selectedFrame === "neon" ? "border-cyan-400 animate-pulse" :
              selectedFrame === "obsidian" ? "border-purple-600" : "border-indigo-100 dark:border-slate-800"
            }`}>
              <span className="text-3xl">{selectedAvatar}</span>
            </div>
            <div className="absolute -top-1.5 -right-1.5 bg-amber-500 text-white rounded-full p-0.5 text-[9px] font-black flex items-center shadow-md">
              Lv.{Math.floor(userGameXP / 200) + 1}
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-black text-slate-800 dark:text-slate-100">{profile.fullName || "Gamer"}</h2>
              <span className="text-[10px] font-extrabold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-lg border border-indigo-100 dark:border-indigo-900/40">
                Grade {profile.classGrade}
              </span>
            </div>
            <div className="flex items-center space-x-4 mt-1.5 text-xs text-slate-500 dark:text-slate-400 font-semibold">
              <span className="flex items-center text-amber-500 font-black">
                <Flame className="w-4 h-4 mr-1 animate-bounce" /> {gameStreak} Day Streak
              </span>
              <span>XP: {userGameXP % 200} / 200 to next level</span>
            </div>
          </div>
        </div>

        {/* Currency Widgets & Mute Toggles */}
        <div className="flex items-center flex-wrap gap-3">
          <div className="flex items-center bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 px-3 py-1.5 rounded-2xl text-xs font-black text-amber-600 dark:text-amber-400 shadow-sm">
            <Coins className="w-4 h-4 mr-1.5 text-amber-500 shrink-0" />
            <span>{coins} Gold</span>
          </div>

          <div className="flex items-center bg-cyan-50 dark:bg-cyan-950/20 border border-cyan-200/50 dark:border-cyan-900/30 px-3 py-1.5 rounded-2xl text-xs font-black text-cyan-600 dark:text-cyan-400 shadow-sm">
            <Gem className="w-4 h-4 mr-1.5 text-cyan-500 shrink-0" />
            <span>{gems} Gems</span>
          </div>

          <button
            onClick={() => {
              setIsMuted(!isMuted);
              synthSound(440, "sine", 0.08);
            }}
            className="p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200/40 dark:border-slate-700/50 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 hover:text-indigo-600 transition duration-150 cursor-pointer shadow-sm"
            title={isMuted ? "Unmute sound" : "Mute sound"}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Tabs Navigator */}
      <div className="flex border-b border-slate-100 dark:border-slate-800/60 pb-0.5 overflow-x-auto gap-1">
        <button
          onClick={() => { setActiveTab("arcade"); synthSound(300, "sine", 0.08); }}
          className={`px-4 py-2.5 font-extrabold text-sm flex items-center space-x-2 border-b-2 transition duration-200 cursor-pointer ${
            activeTab === "arcade"
              ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
          }`}
        >
          <Gamepad2 className="w-4 h-4" />
          <span>Game Arcade</span>
        </button>
        <button
          onClick={() => { setActiveTab("multiplayer"); synthSound(350, "sine", 0.08); }}
          className={`px-4 py-2.5 font-extrabold text-sm flex items-center space-x-2 border-b-2 transition duration-200 cursor-pointer ${
            activeTab === "multiplayer"
              ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
          }`}
        >
          <Target className="w-4 h-4 text-purple-500" />
          <span>Live Multiplayer</span>
          <span className="bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 text-[9px] px-1.5 py-0.5 rounded font-black">DUEL</span>
        </button>
        <button
          onClick={() => { setActiveTab("profile"); synthSound(400, "sine", 0.08); }}
          className={`px-4 py-2.5 font-extrabold text-sm flex items-center space-x-2 border-b-2 transition duration-200 cursor-pointer ${
            activeTab === "profile"
              ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
          }`}
        >
          <User className="w-4 h-4 text-emerald-500" />
          <span>Stats & Badges</span>
        </button>
        <button
          onClick={() => { setActiveTab("shop"); synthSound(450, "sine", 0.08); }}
          className={`px-4 py-2.5 font-extrabold text-sm flex items-center space-x-2 border-b-2 transition duration-200 cursor-pointer ${
            activeTab === "shop"
              ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
          }`}
        >
          <Coins className="w-4 h-4 text-amber-500" />
          <span>Unlock Shop</span>
        </button>
        <button
          onClick={() => { setActiveTab("leaderboard"); synthSound(500, "sine", 0.08); }}
          className={`px-4 py-2.5 font-extrabold text-sm flex items-center space-x-2 border-b-2 transition duration-200 cursor-pointer ${
            activeTab === "leaderboard"
              ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
          }`}
        >
          <Trophy className="w-4 h-4 text-rose-500" />
          <span>Live Board</span>
        </button>
      </div>

      {/* Main Interface Router */}
      <AnimatePresence mode="wait">
        
        {/* TAB 1: GAME ARCADE */}
        {activeTab === "arcade" && !gamePlaying && !matchmakingActive && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* Intelligent AI Practice Recommendation Card */}
            <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 dark:from-indigo-950/20 dark:to-purple-950/20 border border-indigo-200/40 dark:border-indigo-900/30 p-5 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start space-x-3.5">
                <div className="p-3 bg-indigo-100 dark:bg-indigo-950 rounded-2xl text-indigo-600 dark:text-indigo-400 animate-pulse shrink-0">
                  <Brain className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm flex items-center space-x-2">
                    <span>StudyMate AI Coach Suggestion</span>
                    <span className="bg-indigo-500 text-white font-black text-[8px] tracking-widest px-1.5 py-0.5 rounded-md">RECOMMENDED</span>
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-normal font-semibold">
                    {aiRecommendation.reason}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setActiveGameId(aiRecommendation.gameId);
                  setGamePlaying(true);
                  synthSound(600, "sine", 0.15);
                }}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs px-4 py-2.5 rounded-2xl flex items-center space-x-1.5 cursor-pointer shadow-md transition duration-200"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Train Weak Skill</span>
              </button>
            </div>

            {/* Accessibility Controls & Difficulty Level selector */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-3xl border border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center space-x-3.5">
                <span className="text-xs font-black text-slate-500 dark:text-slate-400 flex items-center">
                  <Sliders className="w-4 h-4 mr-1.5" /> Set Difficulty:
                </span>
                <div className="flex bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200/40 dark:border-slate-700/50">
                  {(["easy", "medium", "hard", "expert"] as DifficultyLevel[]).map((level) => (
                    <button
                      key={level}
                      onClick={() => { setDifficulty(level); synthSound(300 + (level === "expert" ? 200 : 50), "sine", 0.08); }}
                      className={`text-[10px] uppercase tracking-wider font-black px-3 py-1.5 rounded-lg cursor-pointer transition ${
                        difficulty === level
                          ? "bg-indigo-500 text-white shadow-sm"
                          : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              {/* Text Size Accessibility Controls */}
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Text Scale:</span>
                <div className="flex bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200/40 dark:border-slate-700/50">
                  <button onClick={() => setTextSize("normal")} className={`px-2 py-1 rounded text-xs font-extrabold ${textSize === "normal" ? "bg-indigo-500 text-white" : "text-slate-400"}`}>A</button>
                  <button onClick={() => setTextSize("large")} className={`px-2.5 py-1 rounded text-sm font-extrabold ${textSize === "large" ? "bg-indigo-500 text-white" : "text-slate-400"}`}>A+</button>
                  <button onClick={() => setTextSize("xlarge")} className={`px-3 py-1 rounded text-base font-extrabold ${textSize === "xlarge" ? "bg-indigo-500 text-white" : "text-slate-400"}`}>A++</button>
                </div>
              </div>
            </div>

            {/* Category selection bar */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-2 border-b border-slate-100 dark:border-slate-800/40">
              {[
                { id: "all", label: "All Categories", icon: <Gamepad2 className="w-4 h-4" /> },
                { id: "math", label: "🧮 Math Challenges", icon: null },
                { id: "memory", label: "🧠 Memory Games", icon: null },
                { id: "eye", label: "👁️ Eye Training", icon: null },
                { id: "logic", label: "🧩 Logic & Puzzles", icon: null },
                { id: "speed", label: "⚡ Brain Speed", icon: null },
                { id: "focus", label: "🎯 Focus Training", icon: null }
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => { setSelectedCategory(cat.id as GameCategory); synthSound(300, "sine", 0.08); }}
                  className={`px-3.5 py-2 rounded-2xl text-xs font-black shrink-0 transition duration-150 cursor-pointer border ${
                    selectedCategory === cat.id
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white dark:bg-slate-800 text-slate-500 border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700"
                  }`}
                >
                  <span className="flex items-center space-x-1">
                    {cat.icon}
                    <span>{cat.label}</span>
                  </span>
                </button>
              ))}
            </div>

            {/* Grid display of Arcade Games */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {getFilteredGames().map((game) => (
                <div 
                  key={game.id}
                  className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm hover:shadow-md hover:border-indigo-200/50 transition duration-200 flex flex-col justify-between"
                >
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between">
                      <div className={`p-3 rounded-2xl ${game.bgLight}`}>
                        {game.icon}
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest bg-slate-50 dark:bg-slate-800/80 text-slate-500 px-2 py-0.5 rounded border border-slate-100 dark:border-slate-700">
                        {game.category}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">{game.title}</h3>
                      <p className={`text-slate-400 leading-relaxed font-semibold mt-1.5 ${getTextSizeClass()}`}>
                        {game.desc}
                      </p>
                    </div>

                    {/* Skill tags */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {game.skillsTrained.map(s => (
                        <span key={s} className="text-[9px] font-bold bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-5 border-t border-slate-50 dark:border-slate-800/40 mt-5">
                    <button
                      onClick={() => {
                        setActiveGameId(game.id);
                        setIsMultiplayerMatch(false);
                        setGamePlaying(true);
                        synthSound(500, "sine", 0.15);
                      }}
                      className={`flex-1 bg-gradient-to-r ${game.color} text-white font-black text-xs py-2.5 rounded-2xl flex items-center justify-center space-x-1.5 hover:opacity-90 shadow-sm transition duration-150 cursor-pointer`}
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Solo Practice</span>
                    </button>
                    <button
                      onClick={() => startMatchmaking(game.id)}
                      className="p-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950/20 text-purple-600 dark:text-purple-400 border border-slate-100 dark:border-slate-700 rounded-2xl transition duration-150 cursor-pointer shadow-sm"
                      title="Play live multiplayer duel"
                    >
                      <Target className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Daily Challenges Widget inside Arcade tab */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
              <h3 className="font-black text-slate-800 dark:text-slate-100 text-sm flex items-center justify-between">
                <span className="flex items-center">
                  <Flame className="w-4.5 h-4.5 mr-2 text-orange-500 animate-pulse" /> Daily Learning Quests
                </span>
                <span className="text-[10px] text-slate-400">Updates in 18 hrs</span>
              </h3>
              
              <div className="space-y-3">
                {dailyChallenges.map((challenge) => (
                  <div 
                    key={challenge.id}
                    className={`p-3.5 rounded-2xl border text-xs flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                      challenge.completed 
                        ? "bg-emerald-50/40 dark:bg-emerald-950/10 border-emerald-200/50 text-emerald-800 dark:text-emerald-300"
                        : "bg-slate-50/50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      {challenge.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-slate-300 dark:border-slate-600 flex items-center justify-center shrink-0">
                          <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full opacity-0"></div>
                        </div>
                      )}
                      <div>
                        <span className="font-extrabold block text-slate-700 dark:text-slate-200">{challenge.text}</span>
                        <span className="text-[9px] text-slate-400 block mt-0.5">
                          Progress: {challenge.current} / {challenge.target}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-amber-100 dark:bg-amber-950/40 text-amber-600 px-2 py-1 rounded font-black">
                        +{challenge.coins} Coins
                      </span>
                      <span className="text-[10px] bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 px-2 py-1 rounded font-black">
                        +{challenge.xp} XP
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 2: MULTIPLAYER SYSTEM */}
        {activeTab === "multiplayer" && !gamePlaying && !matchmakingActive && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            <div className="bg-gradient-to-r from-purple-600 to-indigo-700 text-white rounded-3xl p-6 md:p-8 shadow-md relative overflow-hidden">
              <div className="absolute right-0 bottom-0 opacity-10 text-9xl transform translate-x-10 translate-y-10">
                ⚔️
              </div>
              <div className="max-w-lg space-y-4">
                <span className="text-[10px] bg-white/20 px-3 py-1 rounded-full font-black tracking-widest uppercase">
                  Competitive Arena
                </span>
                <h2 className="text-2xl font-black font-display leading-tight">Live Multiplayer Duels</h2>
                <p className="text-xs text-indigo-100 leading-relaxed font-semibold">
                  Match with student toppers or friends from grade level {profile.classGrade} in direct, rapid academic duels! Prove your intellectual supremacy, win double gold coin stakes, and climb global leaderboards.
                </p>
                <div className="pt-2 flex flex-wrap gap-3">
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-indigo-100">
                    <UserCheck className="w-4.5 h-4.5 text-emerald-300" />
                    <span>248 Active Duellers Online</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Tournaments Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
                <h3 className="font-black text-slate-800 dark:text-slate-100 text-sm flex items-center">
                  <Trophy className="w-4.5 h-4.5 mr-2 text-rose-500 animate-pulse" /> Weekly Arena Tournaments
                </h3>
                <p className="text-xs text-slate-400 font-semibold leading-relaxed">
                  Join standard board exam simulation tournaments occurring every Friday. Complete mock speed papers side-by-side with 100+ candidates live!
                </p>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black block text-slate-700 dark:text-slate-200">Class {profile.classGrade} Science Olympics</span>
                    <span className="text-[10px] text-indigo-500 block font-bold mt-1">Starts: Friday, 6:00 PM</span>
                  </div>
                  {registeredTournaments.includes(`olympics_${profile.classGrade}`) ? (
                    <span className="text-emerald-500 font-extrabold text-xs flex items-center bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-100/50 dark:border-emerald-900/30 px-3 py-1.5 rounded-xl shrink-0">
                      <Check className="w-4 h-4 mr-1 text-emerald-500 shrink-0" /> Registered
                    </span>
                  ) : (
                    <button
                      onClick={() => {
                        setRegisteredTournaments(prev => {
                          const next = [...prev, `olympics_${profile.classGrade}`];
                          localStorage.setItem(`studymate_games_${emailPrefix}_registered_tournaments`, JSON.stringify(next));
                          return next;
                        });
                        synthSound(600, "sine", 0.1);
                        onAddNotification("Tournament Registered", "We will alert you 10 minutes before the Science Olympics begins!", "success");
                      }}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs px-3.5 py-2 rounded-xl transition duration-150 cursor-pointer shrink-0"
                    >
                      Register
                    </button>
                  )}
                </div>
              </div>

              {/* Matchmaker Trigger Grid */}
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
                <h3 className="font-black text-slate-800 dark:text-slate-100 text-sm flex items-center">
                  <Compass className="w-4.5 h-4.5 mr-2 text-purple-500" /> Start Rapid Matching
                </h3>
                <p className="text-xs text-slate-400 font-semibold">
                  Pick your favorite cognitive field to start matching with classmates instantly.
                </p>

                <div className="space-y-2.5">
                  {[
                    { id: "quick_calc", label: "Arithmetic Rush (Math Duel)", color: "hover:bg-blue-50 dark:hover:bg-blue-950/20 border-blue-100" },
                    { id: "speed_ops", label: "Arithmetic Speed Sprint (Rapid Duel)", color: "hover:bg-rose-50 dark:hover:bg-rose-950/20 border-rose-100" },
                    { id: "memory_pairs", label: "Diagram Matrix Memory (Active Recall Duel)", color: "hover:bg-purple-50 dark:hover:bg-purple-950/20 border-purple-100" }
                  ].map(item => (
                    <button
                      key={item.id}
                      onClick={() => startMatchmaking(item.id)}
                      className={`w-full p-3.5 bg-slate-50/50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center justify-between text-xs font-black text-slate-700 dark:text-slate-300 transition duration-150 cursor-pointer ${item.color}`}
                    >
                      <span>{item.label}</span>
                      <Target className="w-4 h-4 text-purple-500" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 3: STATS & BADGES */}
        {activeTab === "profile" && !gamePlaying && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* Statistics Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Games Played", val: stats.gamesPlayed, icon: <Gamepad2 className="w-4 h-4" />, col: "text-blue-500 bg-blue-50 dark:bg-blue-950" },
                { label: "Win Rate", val: stats.gamesPlayed > 0 ? `${Math.round((stats.gamesWon / stats.gamesPlayed) * 100)}%` : "0%", icon: <Trophy className="w-4 h-4" />, col: "text-rose-500 bg-rose-50 dark:bg-rose-950" },
                { label: "Accuracy Avg", val: `${stats.accuracyAvg}%`, icon: <Check className="w-4 h-4" />, col: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950" },
                { label: "Math Streak Best", val: `${stats.bestMathStreak} Qs`, icon: <Flame className="w-4 h-4" />, col: "text-amber-500 bg-amber-50 dark:bg-amber-950" }
              ].map((card, idx) => (
                <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-3xl shadow-sm flex items-center space-x-3.5">
                  <div className={`p-3 rounded-2xl ${card.col}`}>
                    {card.icon}
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">{card.label}</span>
                    <span className="text-base font-black text-slate-800 dark:text-slate-100 block mt-0.5">{card.val}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Badges system */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5">
              <h3 className="font-black text-slate-800 dark:text-slate-100 text-sm flex items-center">
                <Award className="w-4.5 h-4.5 mr-2 text-indigo-500" /> Unlockable Academic Trophy Room
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {achievements.map((badge) => {
                  const unlocked = !!badge.unlockedAt;
                  return (
                    <div 
                      key={badge.id}
                      className={`p-4 rounded-2xl border flex items-center space-x-4 transition duration-150 ${
                        unlocked 
                          ? "bg-amber-50/20 dark:bg-amber-950/10 border-amber-200/50 text-slate-800 dark:text-slate-200" 
                          : "bg-slate-50/50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800 opacity-60"
                      }`}
                    >
                      <div className="text-3xl p-2.5 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
                        {badge.icon}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-black text-xs block text-slate-800 dark:text-slate-100 leading-none">{badge.title}</span>
                          {unlocked && (
                            <span className="text-[8px] bg-emerald-500 text-white font-bold px-1 py-0.5 rounded uppercase">UNLOCKED</span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-semibold block mt-1.5">{badge.description}</span>
                        {!unlocked && (
                          <span className="text-[9px] text-indigo-500 font-bold block mt-1">Reward: {badge.rewardCoins} gold</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 4: SHOP */}
        {activeTab === "shop" && !gamePlaying && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* Avatars Grid */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
              <h3 className="font-black text-slate-800 dark:text-slate-100 text-sm flex items-center">
                <UserPlus className="w-4.5 h-4.5 mr-2 text-indigo-500" /> Purchase Premium Avatars
              </h3>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {AVATAR_SHOP.map((av) => {
                  const unlocked = unlockedAvatars.includes(av.emoji);
                  const active = selectedAvatar === av.emoji;
                  return (
                    <div 
                      key={av.name}
                      className={`p-4 rounded-2xl border flex flex-col items-center justify-between text-center transition duration-150 ${
                        active 
                          ? "bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-500 shadow-sm" 
                          : "bg-slate-50/50 dark:bg-slate-900/40 border-slate-100 dark:border-slate-800"
                      }`}
                    >
                      <div className="text-4xl">{av.emoji}</div>
                      <span className="font-black text-[10px] text-slate-700 dark:text-slate-300 block mt-2 truncate max-w-full">{av.name}</span>
                      
                      <button
                        onClick={() => buyAvatar(av.emoji, av.cost, av.isGem)}
                        className={`w-full mt-3 py-1.5 rounded-xl font-black text-[10px] transition duration-150 flex items-center justify-center space-x-1 cursor-pointer ${
                          active 
                            ? "bg-emerald-500 text-white" 
                            : unlocked 
                            ? "bg-indigo-500 text-white" 
                            : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:opacity-90"
                        }`}
                      >
                        {active ? (
                          <span>Equipped</span>
                        ) : unlocked ? (
                          <span>Equip</span>
                        ) : (
                          <span className="flex items-center space-x-1">
                            {av.isGem ? <Gem className="w-3 h-3 text-cyan-400" /> : <Coins className="w-3 h-3 text-amber-400" />}
                            <span>{av.cost}</span>
                          </span>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Frames Grid */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
              <h3 className="font-black text-slate-800 dark:text-slate-100 text-sm flex items-center">
                <Award className="w-4.5 h-4.5 mr-2 text-indigo-500" /> Unlockable Border Profiles
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {FRAME_SHOP.map((frame) => {
                  const unlocked = unlockedFrames.includes(frame.id);
                  const active = selectedFrame === frame.id;
                  return (
                    <div 
                      key={frame.id}
                      className={`p-4 rounded-2xl border flex flex-col items-center justify-between text-center transition duration-150 ${
                        active 
                          ? "bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-500 shadow-sm" 
                          : "bg-slate-50/50 dark:bg-slate-900/40 border-slate-100 dark:border-slate-800"
                      }`}
                    >
                      {/* Preview frame */}
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center border-4 ${frame.style} bg-white dark:bg-slate-800`}>
                        <span className="text-2xl">🎓</span>
                      </div>
                      <span className="font-black text-xs text-slate-700 dark:text-slate-300 block mt-2.5">{frame.name}</span>
                      
                      <button
                        onClick={() => buyFrame(frame.id, frame.cost, frame.isGem)}
                        className={`w-full mt-3 py-2 rounded-xl font-black text-xs transition duration-150 flex items-center justify-center space-x-1.5 cursor-pointer ${
                          active 
                            ? "bg-emerald-500 text-white" 
                            : unlocked 
                            ? "bg-indigo-500 text-white" 
                            : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:opacity-90"
                        }`}
                      >
                        {active ? (
                          <span>Equipped</span>
                        ) : unlocked ? (
                          <span>Equip</span>
                        ) : (
                          <span className="flex items-center space-x-1">
                            {frame.isGem ? <Gem className="w-3.5 h-3.5 text-cyan-400" /> : <Coins className="w-3.5 h-3.5 text-amber-400" />}
                            <span>{frame.cost}</span>
                          </span>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 5: LEADERBOARD */}
        {activeTab === "leaderboard" && !gamePlaying && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6 max-w-xl mx-auto"
          >
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
              <h3 className="font-black text-slate-800 dark:text-slate-100 text-sm flex items-center justify-between">
                <span>Class {profile.classGrade} Cognitive Leaderboard</span>
                <span className="text-[10px] bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded font-bold">Grade Top 10</span>
              </h3>

              <div className="space-y-2">
                {(() => {
                  const list: { name: string; avatar: string; xp: number; isUser: boolean }[] = [];
                  
                  // Always add the current user
                  list.push({
                    name: `${profile.fullName} (You)`,
                    avatar: selectedAvatar,
                    xp: userGameXP,
                    isUser: true
                  });

                  // Scan localStorage for other real profiles
                  try {
                    for (let i = 0; i < localStorage.length; i++) {
                      const key = localStorage.key(i);
                      if (key && key.startsWith("studymate_profile_")) {
                        const raw = localStorage.getItem(key);
                        if (raw) {
                          const p = JSON.parse(raw);
                          // Don't add the current user twice
                          if (p.emailAddress !== profile.emailAddress) {
                            list.push({
                              name: p.fullName,
                              avatar: p.avatar || "🎓",
                              xp: p.xp || 0,
                              isUser: false
                            });
                          }
                        }
                      }
                    }
                  } catch (e) {}

                  // Sort by XP descending
                  list.sort((a, b) => b.xp - a.xp);

                  // Map to include rank
                  return list.map((item, idx) => ({
                    ...item,
                    rank: idx + 1,
                    rating: 1000 + item.xp
                  }));
                })().map((participant) => (
                  <div 
                    key={participant.name}
                    className={`flex items-center justify-between p-3 rounded-2xl border text-xs transition-all ${
                      participant.isUser 
                        ? "bg-amber-500/10 dark:bg-amber-500/15 border-amber-400 shadow-[0_2px_8px_rgba(245,158,11,0.08)] scale-[1.01] font-bold" 
                        : "bg-slate-50/50 dark:bg-slate-900/40 border-slate-100/80 dark:border-slate-800/60"
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <span className={`w-5 text-center text-xs font-black ${participant.rank === 1 ? "text-yellow-500" : participant.rank === 2 ? "text-slate-400" : "text-amber-700"}`}>
                        {participant.rank === 1 ? "👑" : participant.rank === 2 ? "🥈" : participant.rank === 3 ? "🥉" : `#${participant.rank}`}
                      </span>
                      <span className="text-base">{participant.avatar}</span>
                      <span className="text-[11px] truncate max-w-[150px] text-slate-700 dark:text-slate-200">
                        {participant.name}
                      </span>
                    </div>
                    <span className={`text-[10px] font-extrabold ${participant.isUser ? "text-amber-600 dark:text-amber-400" : "text-slate-500"}`}>
                      {participant.xp} XP
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>

      {/* MODAL: Matchmaking Active Screen */}
      <AnimatePresence>
        {matchmakingActive && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 max-w-sm w-full text-center space-y-6"
            >
              <div className="relative mx-auto w-24 h-24">
                {/* Rotating radar effect */}
                <div className="absolute inset-0 rounded-full border-4 border-dashed border-purple-500 animate-spin"></div>
                <div className="absolute inset-2 bg-purple-50 dark:bg-purple-950/20 rounded-full flex items-center justify-center">
                  <span className="text-3xl animate-pulse">⚔️</span>
                </div>
              </div>

              <div>
                <h3 className="font-black text-slate-800 dark:text-slate-100 text-sm">Searching for Opponents...</h3>
                <p className="text-[11px] text-slate-400 font-semibold mt-1">
                  Matching with Grade {profile.classGrade} toppers in live cognitive duels
                </p>
              </div>

              {matchedOpponent ? (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-purple-50/60 dark:bg-purple-950/20 p-4 rounded-2xl border border-purple-100 flex items-center justify-center space-x-3"
                >
                  <span className="text-3xl">{matchedOpponent.avatar}</span>
                  <div className="text-left">
                    <span className="text-xs font-black block text-slate-800 dark:text-slate-200">{matchedOpponent.name}</span>
                    <span className="text-[10px] text-purple-600 dark:text-purple-400 block font-bold">Rating: {matchedOpponent.rating}</span>
                  </div>
                </motion.div>
              ) : (
                <span className="text-xs text-slate-400 block">Queue time: {matchmakerTimer}s</span>
              )}

              <button
                onClick={() => setMatchmakingActive(false)}
                className="w-full py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200/40 rounded-xl text-xs font-extrabold text-slate-500 hover:text-rose-500 transition duration-150 cursor-pointer"
              >
                Cancel Matchmaking
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: GAME SUMMARY SHOW */}
      <AnimatePresence>
        {showGameSummary && summaryData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 max-w-sm w-full text-center space-y-5"
            >
              <div className="text-5xl">{summaryData.won ? "🏆" : "😔"}</div>
              
              <div>
                <h3 className="font-black text-slate-800 dark:text-slate-100 text-sm">
                  {summaryData.won ? "VICTORY!" : "GAME OVER!"}
                </h3>
                {summaryData.opponentName && (
                  <p className="text-[11px] text-slate-400 font-semibold mt-1">
                    Matched Duel vs {summaryData.opponentName}
                  </p>
                )}
              </div>

              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl space-y-2.5 border border-slate-100 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 font-semibold text-left">
                <div className="flex justify-between">
                  <span>Your Score:</span>
                  <span className="font-black text-indigo-600">{summaryData.score} Pts</span>
                </div>
                {summaryData.opponentScore !== undefined && (
                  <div className="flex justify-between border-t border-slate-100 dark:border-slate-700 pt-2">
                    <span>Opponent Score:</span>
                    <span className="font-black text-purple-600">{summaryData.opponentScore} Pts</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-slate-100 dark:border-slate-700 pt-2">
                  <span>Accuracy:</span>
                  <span className="font-black">{summaryData.accuracy}%</span>
                </div>
              </div>

              {/* Reward payouts display */}
              <div className="grid grid-cols-2 gap-2 text-center text-[11px] font-black">
                <div className="p-2.5 bg-amber-500/10 text-amber-600 rounded-xl">
                  +{summaryData.coinsGained} Coins
                </div>
                <div className="p-2.5 bg-indigo-500/10 text-indigo-600 rounded-xl">
                  +{summaryData.xpGained} XP
                </div>
              </div>

              <button
                onClick={closeGame}
                className="w-full py-2.5 bg-indigo-600 text-white hover:bg-indigo-500 rounded-xl text-xs font-black transition duration-150 cursor-pointer shadow-md"
              >
                Back to Arcade
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- SUB-VIEW: ACTIVE PLAYABLE MINIGAMES MODAL VIEW --- */}
      <AnimatePresence>
        {gamePlaying && activeGameId && (
          <div className="fixed inset-0 z-50 bg-slate-50 dark:bg-slate-950 flex flex-col justify-between overflow-y-auto">
            
            {/* Top Stats Bar */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
              <div className="flex items-center space-x-3">
                <button
                  onClick={closeGame}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full cursor-pointer text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
                <h3 className="font-black text-sm text-slate-800 dark:text-slate-100 flex items-center space-x-1.5">
                  <span>{GAMES_CATALOGUE.find(g => g.id === activeGameId)?.title}</span>
                  {isMultiplayerMatch && (
                    <span className="bg-purple-600 text-white font-bold text-[8px] tracking-widest px-1.5 py-0.5 rounded uppercase animate-pulse">MULTIPLAYER LIVE</span>
                  )}
                </h3>
              </div>

              <div className="flex items-center space-x-4">
                <div className="text-right text-xs">
                  <span className="text-[10px] text-slate-400 block font-semibold">DIFFICULTY</span>
                  <span className="font-black text-indigo-600 uppercase">{difficulty}</span>
                </div>
                <div className="text-right text-xs">
                  <span className="text-[10px] text-slate-400 block font-semibold">SCORE</span>
                  <span className="font-black text-amber-500">{coins} Pts</span>
                </div>
              </div>
            </div>

            {/* Render Playable Games dynamically depending on ID */}
            <div className="flex-1 max-w-xl mx-auto w-full p-4 md:p-6 flex flex-col justify-center">
              {/* MATH: Arithmetic Sprint or Fractions Matcher */}
              {activeGameId === "quick_calc" && (
                <MathCalculationSprintGame 
                  difficulty={difficulty}
                  grade={profile.classGrade}
                  onFinished={(score, max, acc) => handleGameFinished("quick_calc", score, max, acc)}
                  opponentScore={isMultiplayerMatch ? opponentScore : undefined}
                  opponentName={isMultiplayerMatch && matchedOpponent ? matchedOpponent.name : undefined}
                  synthSound={synthSound}
                />
              )}

              {activeGameId === "math_fractions" && (
                <MathCalculationSprintGame 
                  difficulty={difficulty}
                  grade={profile.classGrade}
                  onFinished={(score, max, acc) => handleGameFinished("math_fractions", score, max, acc)}
                  opponentScore={isMultiplayerMatch ? opponentScore : undefined}
                  opponentName={isMultiplayerMatch && matchedOpponent ? matchedOpponent.name : undefined}
                  synthSound={synthSound}
                  isFractions={true}
                />
              )}

              {/* MEMORY: Matrix Pairs or Formula Match & Recall */}
              {activeGameId === "memory_pairs" && (
                <MemoryMatrixPairsGame 
                  difficulty={difficulty}
                  onFinished={(score, max, acc) => handleGameFinished("memory_pairs", score, max, acc)}
                  opponentScore={isMultiplayerMatch ? opponentScore : undefined}
                  synthSound={synthSound}
                />
              )}

              {activeGameId === "formula_recall" && (
                <MemoryMatrixPairsGame 
                  difficulty={difficulty}
                  onFinished={(score, max, acc) => handleGameFinished("formula_recall", score, max, acc)}
                  opponentScore={isMultiplayerMatch ? opponentScore : undefined}
                  synthSound={synthSound}
                  useFormulas={true}
                />
              )}

              {/* EYE: Speed Vision & Search or Alphabet Pursuit */}
              {activeGameId === "speed_matrix" && (
                <SpeedVisionMatrixGame 
                  difficulty={difficulty}
                  onFinished={(score, max, acc) => handleGameFinished("speed_matrix", score, max, acc)}
                  opponentScore={isMultiplayerMatch ? opponentScore : undefined}
                  synthSound={synthSound}
                />
              )}

              {activeGameId === "letter_tracking" && (
                <SpeedVisionMatrixGame 
                  difficulty={difficulty}
                  onFinished={(score, max, acc) => handleGameFinished("letter_tracking", score, max, acc)}
                  opponentScore={isMultiplayerMatch ? opponentScore : undefined}
                  synthSound={synthSound}
                  useLetters={true}
                />
              )}

              {activeGameId === "eye_ball_tracker" && (
                <EyeBallTrackerGame 
                  difficulty={difficulty}
                  onFinished={(score, max, acc) => handleGameFinished("eye_ball_tracker", score, max, acc)}
                  opponentScore={isMultiplayerMatch ? opponentScore : undefined}
                  synthSound={synthSound}
                />
              )}

              {/* LOGIC: Tic-Tac-Toe AI or Numeric Series Solver */}
              {activeGameId === "tic_tac_ai" && (
                <TicTacToeAIGame 
                  difficulty={difficulty}
                  onFinished={(score, max, acc) => handleGameFinished("tic_tac_ai", score, max, acc)}
                  synthSound={synthSound}
                />
              )}

              {activeGameId === "logic_sequences" && (
                <MathCalculationSprintGame 
                  difficulty={difficulty}
                  grade={profile.classGrade}
                  onFinished={(score, max, acc) => handleGameFinished("logic_sequences", score, max, acc)}
                  opponentScore={isMultiplayerMatch ? opponentScore : undefined}
                  opponentName={isMultiplayerMatch && matchedOpponent ? matchedOpponent.name : undefined}
                  synthSound={synthSound}
                  isSequences={true}
                />
              )}

              {/* SPEED: Speed Sum and Arithmetic Sprint Games */}
              {activeGameId === "speed_sum" && (
                <SpeedSumGame 
                  difficulty={difficulty}
                  onFinished={(score, max, acc) => handleGameFinished("speed_sum", score, max, acc)}
                  opponentScore={isMultiplayerMatch ? opponentScore : undefined}
                  synthSound={synthSound}
                />
              )}

              {activeGameId === "speed_ops" && (
                <SpeedOpsGame 
                  difficulty={difficulty}
                  onFinished={(score, max, acc) => handleGameFinished("speed_ops", score, max, acc)}
                  opponentScore={isMultiplayerMatch ? opponentScore : undefined}
                  synthSound={synthSound}
                />
              )}

              {/* FOCUS: Attention Tracker or Shape Concentrator */}
              {activeGameId === "focus_dots" && (
                <FocusDotsGame 
                  difficulty={difficulty}
                  onFinished={(score, max, acc) => handleGameFinished("focus_dots", score, max, acc)}
                  opponentScore={isMultiplayerMatch ? opponentScore : undefined}
                  synthSound={synthSound}
                />
              )}

              {activeGameId === "shape_focus" && (
                <FocusDotsGame 
                  difficulty={difficulty}
                  onFinished={(score, max, acc) => handleGameFinished("shape_focus", score, max, acc)}
                  opponentScore={isMultiplayerMatch ? opponentScore : undefined}
                  synthSound={synthSound}
                  useShapes={true}
                />
              )}
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-center text-[10px] text-slate-400 font-semibold">
              StudyMate Cognitive Training Arena • Designed for Classes 1–12
            </div>

          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

// ==========================================
// GAME 1: MATH CALCULATION SPRINT
// ==========================================
interface MathGameProps {
  difficulty: DifficultyLevel;
  grade: string;
  onFinished: (score: number, max: number, accuracy: number) => void;
  opponentScore?: number;
  opponentName?: string;
  synthSound: (f: number, t?: OscillatorType, d?: number) => void;
  isFractions?: boolean;
  isSequences?: boolean;
}

function MathCalculationSprintGame({ difficulty, grade, onFinished, opponentScore, opponentName, synthSound, isFractions, isSequences }: MathGameProps) {
  const [score, setScore] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [timeLeft, setTimeLeft] = useState(40);
  const [currentQuestion, setCurrentQuestion] = useState<{ q: string; a: string; options: string[]; explanation: string } | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [accuracy, setAccuracy] = useState(100);
  const [wrongCount, setWrongCount] = useState(0);

  const generateQuestion = () => {
    const isExpert = difficulty === "expert";
    const isHard = difficulty === "hard";
    const isMedium = difficulty === "medium";
    
    let question = "";
    let answer = "";
    let options: string[] = [];
    let explanation = "";

    if (isFractions) {
      // Fraction generator
      const fracTemplates = [
        {
          q: "What is 1/2 + 1/4?",
          a: "3/4",
          opts: ["3/4", "2/3", "5/8", "1/2"],
          exp: "Find a common denominator of 4: 2/4 + 1/4 = 3/4."
        },
        {
          q: "What is 2/5 + 1/5?",
          a: "3/5",
          opts: ["3/5", "2/5", "4/5", "3/10"],
          exp: "Since the denominators are equal, simply add the numerators: 2 + 1 = 3, yielding 3/5."
        },
        {
          q: "What is 3/4 - 1/2?",
          a: "1/4",
          opts: ["1/4", "1/2", "3/8", "2/3"],
          exp: "Convert 1/2 to 2/4. Then calculate 3/4 - 2/4 = 1/4."
        },
        {
          q: "What is 2/3 × 1/2?",
          a: "1/3",
          opts: ["1/3", "2/5", "3/5", "1/2"],
          exp: "Multiply the numerators (2 × 1 = 2) and the denominators (3 × 2 = 6). 2/6 simplifies to 1/3."
        },
        {
          q: "What is 3/5 of 100?",
          a: "60",
          opts: ["60", "50", "40", "70"],
          exp: "Divide 100 by 5 to get 20, then multiply by 3: 20 × 3 = 60."
        },
        {
          q: "What is 1 - 2/3?",
          a: "1/3",
          opts: ["1/3", "1/2", "2/3", "1/4"],
          exp: "Represent 1 as 3/3. Then 3/3 - 2/3 = 1/3."
        }
      ];
      const template = fracTemplates[Math.floor(Math.random() * fracTemplates.length)];
      question = template.q;
      answer = template.a;
      options = [...template.opts];
      explanation = template.exp;
    } else if (isSequences) {
      // Sequence pattern generator
      const seqTemplates = [
        {
          q: "Complete the sequence: 2, 4, 8, 16, ?",
          a: "32",
          opts: ["32", "24", "20", "48"],
          exp: "Each number in the series is multiplied by 2 (geometric progression)."
        },
        {
          q: "Complete the sequence: 5, 10, 15, 20, ?",
          a: "25",
          opts: ["25", "30", "35", "22"],
          exp: "The series increases by adding 5 to each term (arithmetic progression)."
        },
        {
          q: "Complete the sequence: 1, 4, 9, 16, ?",
          a: "25",
          opts: ["25", "20", "36", "24"],
          exp: "The terms represent perfect squares: 1², 2², 3², 4², so the next term is 5² = 25."
        },
        {
          q: "Complete the sequence: 100, 90, 80, 70, ?",
          a: "60",
          opts: ["60", "50", "65", "55"],
          exp: "The sequence decreases by subtracting 10 from each consecutive term."
        },
        {
          q: "Complete the sequence: 3, 6, 12, 24, ?",
          a: "48",
          opts: ["48", "36", "30", "42"],
          exp: "Each term is double the previous term: 24 × 2 = 48."
        },
        {
          q: "Complete the sequence: 10, 15, 25, 40, ?",
          a: "60",
          opts: ["60", "55", "50", "65"],
          exp: "The differences between numbers are +5, +10, +15, so the next difference is +20: 40 + 20 = 60."
        }
      ];
      const template = seqTemplates[Math.floor(Math.random() * seqTemplates.length)];
      question = template.q;
      answer = template.a;
      options = [...template.opts];
      explanation = template.exp;
    } else {
      // Standard CBSE Calculation Sprint
      let num1 = Math.floor(Math.random() * 10) + 2;
      let num2 = Math.floor(Math.random() * 8) + 2;
      
      // Adapting math based on classes/grades (Primary, Middle, Senior)
      const gradeNum = parseInt(grade) || 8;

      if (gradeNum <= 4) {
        // Primary: Addition, Subtraction, basic tables
        const ops = ["+", "-"];
        const activeOp = ops[Math.floor(Math.random() * ops.length)];
        if (isExpert || isHard) {
          num1 = Math.floor(Math.random() * 80) + 20;
          num2 = Math.floor(Math.random() * 40) + 10;
        } else {
          num1 = Math.floor(Math.random() * 20) + 5;
          num2 = Math.floor(Math.random() * 10) + 2;
        }
        
        if (activeOp === "+") {
          question = `What is ${num1} + ${num2}?`;
          answer = String(num1 + num2);
          explanation = `Simply align the units place and tens place. ${num1} plus ${num2} adds up to ${num1 + num2}.`;
        } else {
          question = `What is ${num1} - ${num2}?`;
          answer = String(num1 - num2);
          explanation = `Subtract ${num2} units from ${num1}. Taking away ${num2} from ${num1} leaves ${num1 - num2}.`;
        }
      } else if (gradeNum <= 8) {
      // Middle School: Multiplication, Division, percentages, fractions
      const ops = ["*", "/", "%"];
      const activeOp = ops[Math.floor(Math.random() * ops.length)];
      
      if (activeOp === "*") {
        num1 = Math.floor(Math.random() * 12) + 4;
        num2 = Math.floor(Math.random() * 9) + 3;
        question = `What is ${num1} × ${num2}?`;
        answer = String(num1 * num2);
        explanation = `By multiplication tables: multiplying ${num1} by ${num2} gives ${num1 * num2}.`;
      } else if (activeOp === "/") {
        num1 = Math.floor(Math.random() * 10) + 2;
        const total = num1 * (Math.floor(Math.random() * 8) + 2);
        question = `What is ${total} ÷ ${num1}?`;
        answer = String(total / num1);
        explanation = `${total} divided by ${num1} is the reverse of multiplication: ${num1} × ${total/num1} = ${total}.`;
      } else {
        const val = [50, 25, 10, 20][Math.floor(Math.random() * 4)];
        const total = [120, 200, 40, 80][Math.floor(Math.random() * 4)];
        question = `What is ${val}% of ${total}?`;
        answer = String((val * total) / 100);
        explanation = `${val}% is equivalent to ${val}/100. Multiplying with ${total}: (${val}/100) × ${total} = ${(val * total) / 100}.`;
      }
    } else {
      // High School Grade 9-12: algebra, squares, roots, missing equation variables
      const modes = ["square", "equation", "prime"];
      const activeMode = modes[Math.floor(Math.random() * modes.length)];

      if (activeMode === "square") {
        num1 = Math.floor(Math.random() * 15) + 5;
        question = `What is the value of ${num1}²?`;
        answer = String(num1 * num1);
        explanation = `Squaring means multiplying the number by itself. ${num1} × ${num1} is equal to ${num1 * num1}.`;
      } else if (activeMode === "equation") {
        // x + 3 = 10 style
        const c1 = Math.floor(Math.random() * 10) + 1;
        const solution = Math.floor(Math.random() * 8) + 2;
        const rhs = solution + c1;
        question = `Solve for x: x + ${c1} = ${rhs}`;
        answer = String(solution);
        explanation = `Subtract ${c1} from both sides to isolate x: x = ${rhs} - ${c1} = ${solution}.`;
      } else {
        // Find square root of perfect squares
        const roots = [121, 144, 169, 196, 225];
        const chosen = roots[Math.floor(Math.random() * roots.length)];
        const ans = Math.sqrt(chosen);
        question = `What is the square root (√) of ${chosen}?`;
        answer = String(ans);
        explanation = `The square root of ${chosen} is the number that multiplied by itself equals ${chosen}. ${ans} × ${ans} = ${chosen}.`;
      }
    }
  }

  // Generate option chips
    const numericAns = parseFloat(answer);
    const deviation1 = Math.floor(Math.random() * 5) + 1;
    const deviation2 = Math.floor(Math.random() * 5) + 1;
    options = [
      answer,
      String(numericAns + deviation1),
      String(numericAns - deviation2),
      String(numericAns + deviation1 + deviation2)
    ];

    // Shuffle options array
    options.sort(() => Math.random() - 0.5);

    setCurrentQuestion({ q: question, a: answer, options, explanation });
  };

  useEffect(() => {
    generateQuestion();
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          const finalAcc = totalQuestions > 0 ? Math.round(((totalQuestions - wrongCount) / totalQuestions) * 100) : 100;
          onFinished(score, totalQuestions, finalAcc);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [score]);

  const handleSelect = (selected: string) => {
    setTotalQuestions(prev => prev + 1);
    if (selected === currentQuestion?.a) {
      setScore(prev => prev + 10);
      synthSound(600, "sine", 0.08);
      generateQuestion();
    } else {
      setWrongCount(prev => prev + 1);
      synthSound(150, "sawtooth", 0.2);
      setShowExplanation(true);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm text-center space-y-6">
      
      {/* Timer & Live Opponent scores */}
      <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/40 px-4 py-2.5 rounded-2xl">
        <span className="text-xs font-black text-rose-500 animate-pulse shrink-0">⏳ {timeLeft}s Left</span>
        {opponentName && (
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block font-semibold">OPPONENT SCORE ({opponentName})</span>
            <span className="text-xs font-black text-purple-600">{(opponentScore || 0) * 10} Pts</span>
          </div>
        )}
      </div>

      {currentQuestion && !showExplanation && (
        <div className="space-y-6">
          <div className="p-6 bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/30 rounded-2xl">
            <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest block mb-2">SOLVE MATH EXPRESSION</span>
            <span className="text-xl font-black text-slate-800 dark:text-slate-100 block">
              {currentQuestion.q}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {currentQuestion.options.map((opt) => (
              <button
                key={opt}
                onClick={() => handleSelect(opt)}
                className="p-3.5 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 border border-slate-100 dark:border-slate-800 rounded-2xl text-xs font-black text-slate-700 dark:text-slate-200 transition duration-150 cursor-pointer shadow-sm hover:border-indigo-300"
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Show step by step explanation if wrong */}
      {showExplanation && currentQuestion && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 rounded-2xl text-left space-y-4">
          <div className="flex items-start space-x-2.5 text-amber-800 dark:text-amber-300">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <span className="font-extrabold text-xs block">Mathematical Explanation:</span>
              <p className="text-[11px] leading-relaxed mt-1 font-semibold">
                {currentQuestion.explanation}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setShowExplanation(false);
              generateQuestion();
            }}
            className="w-full py-2 bg-amber-500 text-white font-black rounded-xl text-[10px] uppercase tracking-wider cursor-pointer shadow-sm hover:bg-amber-400 transition"
          >
            I understand • Next Question
          </button>
        </div>
      )}

    </div>
  );
}

// ==========================================
// GAME 2: MEMORY MATRIX PAIRS MATCH
// ==========================================
interface MemoryProps {
  difficulty: DifficultyLevel;
  onFinished: (score: number, max: number, accuracy: number) => void;
  opponentScore?: number;
  synthSound: (f: number, t?: OscillatorType, d?: number) => void;
  useFormulas?: boolean;
}

function MemoryMatrixPairsGame({ difficulty, onFinished, opponentScore, synthSound, useFormulas }: MemoryProps) {
  const [cards, setCards] = useState<{ id: number; symbol: string; isFlipped: boolean; isMatched: boolean }[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matchesCount, setMatchesCount] = useState(0);
  const [score, setScore] = useState(0);
  const [accuracy, setAccuracy] = useState(100);

  const getGridSize = () => {
    if (difficulty === "easy") return 4; // 2x2
    if (difficulty === "expert") return 12; // 4x3
    return 8; // 4x2
  };

  useEffect(() => {
    const size = getGridSize();
    const iconPool = useFormulas
      ? ["E=mc²", "F=ma", "H₂O", "a²+b²", "PV=nR", "v=d/t", "CO₂", "NaCl", "V=IR", "pH=7", "λ=v/f", "F=G"]
      : ["📐", "🧬", "🧪", "🪐", "🧮", "💻", "📚", "🖊️", "🎨", "🔬", "🛰️", "🦖"];
    const chosenIcons = iconPool.slice(0, size / 2);
    const doubled = [...chosenIcons, ...chosenIcons];
    
    // Randomize
    doubled.sort(() => Math.random() - 0.5);

    const generated = doubled.map((icon, idx) => ({
      id: idx,
      symbol: icon,
      isFlipped: false,
      isMatched: false
    }));

    setCards(generated);
  }, []);

  const handleFlip = (idx: number) => {
    if (cards[idx].isFlipped || cards[idx].isMatched || flippedIndices.length >= 2) return;
    
    synthSound(500, "sine", 0.08);

    // Flip card
    const copy = [...cards];
    copy[idx].isFlipped = true;
    setCards(copy);

    const newFlipped = [...flippedIndices, idx];
    setFlippedIndices(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(prev => prev + 1);
      const first = cards[newFlipped[0]];
      const second = cards[newFlipped[1]];

      if (first.symbol === second.symbol) {
        // Matched
        setTimeout(() => {
          const matchedCopy = [...cards];
          matchedCopy[newFlipped[0]].isMatched = true;
          matchedCopy[newFlipped[1]].isMatched = true;
          setCards(matchedCopy);
          setFlippedIndices([]);
          setMatchesCount(prev => {
            const next = prev + 1;
            const target = getGridSize() / 2;
            setScore(s => s + 20);
            synthSound(800, "sine", 0.15);

            if (next >= target) {
              // Win!
              const calculatedAcc = Math.round((target / (moves + 1)) * 100);
              onFinished(score + 50, target, calculatedAcc);
            }
            return next;
          });
        }, 500);
      } else {
        // No match
        setTimeout(() => {
          const resetCopy = [...cards];
          resetCopy[newFlipped[0]].isFlipped = false;
          resetCopy[newFlipped[1]].isFlipped = false;
          setCards(resetCopy);
          setFlippedIndices([]);
          synthSound(200, "sine", 0.15);
        }, 1000);
      }
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm text-center space-y-6">
      
      <div className="flex justify-between items-center text-xs text-slate-500 font-semibold bg-slate-50 dark:bg-slate-800/40 px-4 py-2.5 rounded-2xl">
        <span>Moves Taken: {moves}</span>
        <span>Matches: {matchesCount} / {getGridSize() / 2}</span>
      </div>

      <div className="grid grid-cols-4 gap-3 max-w-[280px] mx-auto">
        {cards.map((card, idx) => {
          const revealed = card.isFlipped || card.isMatched;
          const isLongFormula = card.symbol.length > 2;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => handleFlip(idx)}
              className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 border shadow-inner ${
                isLongFormula ? "text-[10px] font-black font-mono tracking-tighter" : "text-2xl"
              } ${
                revealed 
                  ? "bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-200 text-slate-800 dark:text-slate-100 scale-95" 
                  : "bg-gradient-to-br from-indigo-500 to-purple-600 border-indigo-600 scale-100 cursor-pointer"
              }`}
            >
              {revealed ? card.symbol : "❓"}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ==========================================
// GAME 3: SPEED VISION MATRIX EYE TRAINING
// ==========================================
interface SpeedVisionProps {
  difficulty: DifficultyLevel;
  onFinished: (score: number, max: number, accuracy: number) => void;
  opponentScore?: number;
  synthSound: (f: number, t?: OscillatorType, d?: number) => void;
  useLetters?: boolean;
}

function SpeedVisionMatrixGame({ difficulty, onFinished, opponentScore, synthSound, useLetters }: SpeedVisionProps) {
  const [grid, setGrid] = useState<number[]>([]);
  const [currentTarget, setCurrentTarget] = useState(1);
  const [clicks, setClicks] = useState(0);
  const [totalTargets] = useState(10);
  const [startTime] = useState(Date.now());

  const getGridDimension = () => {
    if (difficulty === "easy") return 9; // 3x3
    if (difficulty === "expert") return 25; // 5x5
    return 16; // 4x4
  };

  const getChar = (val: number) => String.fromCharCode(64 + val);

  useEffect(() => {
    const dim = getGridDimension();
    // Generate ordered numbers 1 to dim
    const items = Array.from({ length: dim }, (_, i) => i + 1);
    // Shuffle
    items.sort(() => Math.random() - 0.5);
    setGrid(items);
  }, []);

  const handleTileClick = (val: number) => {
    setClicks(prev => prev + 1);
    if (val === currentTarget) {
      synthSound(600, "sine", 0.08);
      if (currentTarget >= totalTargets) {
        // Complete!
        const elapsedSec = Math.floor((Date.now() - startTime) / 1000);
        const acc = Math.round((totalTargets / (clicks + 1)) * 100);
        onFinished(100 - elapsedSec, totalTargets, acc);
      } else {
        setCurrentTarget(prev => prev + 1);
      }
    } else {
      synthSound(150, "sawtooth", 0.15);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm text-center space-y-6">
      
      <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl text-left space-y-1">
        <span className="text-[10px] font-black uppercase text-emerald-600 block">Eye-Hand Peripheral Tracking</span>
        <span className="text-xs font-bold text-slate-600 dark:text-slate-300 block">
          Find and click {useLetters ? "letters" : "numbers"} in sequential order: <span className="font-extrabold text-emerald-500">Find {useLetters ? getChar(currentTarget) : currentTarget}</span>
        </span>
      </div>

      <div className="grid grid-cols-4 gap-3 max-w-[280px] mx-auto">
        {grid.map((num) => {
          const isSolved = num < currentTarget;
          return (
            <button
              key={num}
              type="button"
              onClick={() => handleTileClick(num)}
              className={`w-14 h-14 rounded-2xl flex items-center justify-center text-sm font-black border transition-all ${
                isSolved 
                  ? "bg-emerald-500 text-white border-emerald-500 opacity-40 scale-90" 
                  : "bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 border-slate-100 dark:border-slate-800 cursor-pointer shadow-sm"
              }`}
            >
              {useLetters ? getChar(num) : num}
            </button>
          );
        })}
      </div>

    </div>
  );
}

// ==========================================
// GAME 4: TIC-TAC-TOE AI LOGIC PUZZLE
// ==========================================
interface TicTacToeProps {
  difficulty: DifficultyLevel;
  onFinished: (score: number, max: number, accuracy: number) => void;
  synthSound: (f: number, t?: OscillatorType, d?: number) => void;
}

function TicTacToeAIGame({ difficulty, onFinished, synthSound }: TicTacToeProps) {
  const [board, setBoard] = useState<(string | null)[]>(Array(9).fill(null));
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [gameResult, setGameResult] = useState<string | null>(null);

  const checkWinner = (squares: (string | null)[]) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
      [0, 4, 8], [2, 4, 6]             // diagonals
    ];
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a];
      }
    }
    if (squares.every(s => s !== null)) return "draw";
    return null;
  };

  const handleTileClick = (idx: number) => {
    if (board[idx] || !isPlayerTurn || gameResult) return;

    synthSound(440, "sine", 0.08);

    const nextBoard = [...board];
    nextBoard[idx] = "X";
    setBoard(nextBoard);

    const win = checkWinner(nextBoard);
    if (win) {
      handleGameOver(win);
      return;
    }

    setIsPlayerTurn(false);

    // AI smart turn solver after a short simulated lag
    setTimeout(() => {
      const aiBoard = [...nextBoard];
      let moveIdx = -1;

      if (difficulty === "expert" || difficulty === "hard") {
        // Smart minimax defense or capture winning spot
        moveIdx = findMinimaxMove(aiBoard);
      } else {
        // Random placement
        const blanks = aiBoard.map((s, i) => s === null ? i : null).filter(v => v !== null) as number[];
        moveIdx = blanks[Math.floor(Math.random() * blanks.length)];
      }

      if (moveIdx !== -1) {
        aiBoard[moveIdx] = "O";
        setBoard(aiBoard);
        synthSound(300, "sine", 0.08);

        const aiWin = checkWinner(aiBoard);
        if (aiWin) {
          handleGameOver(aiWin);
        } else {
          setIsPlayerTurn(true);
        }
      }
    }, 600);
  };

  const findMinimaxMove = (squares: (string | null)[]): number => {
    // 1. Check if AI can win immediately
    for (let i = 0; i < 9; i++) {
      if (squares[i] === null) {
        const copy = [...squares];
        copy[i] = "O";
        if (checkWinner(copy) === "O") return i;
      }
    }
    // 2. Block user's win immediately
    for (let i = 0; i < 9; i++) {
      if (squares[i] === null) {
        const copy = [...squares];
        copy[i] = "X";
        if (checkWinner(copy) === "X") return i;
      }
    }
    // 3. Center tile
    if (squares[4] === null) return 4;
    // 4. Default corner or random
    const preferred = [0, 2, 6, 8, 1, 3, 5, 7];
    for (let p of preferred) {
      if (squares[p] === null) return p;
    }
    return -1;
  };

  const handleGameOver = (winner: string) => {
    setGameResult(winner);
  };

  const collectRewardsAndExit = () => {
    if (gameResult === "X") {
      onFinished(50, 1, 100);
    } else if (gameResult === "draw") {
      onFinished(20, 1, 80);
    } else {
      onFinished(0, 1, 30);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm text-center space-y-6">
      
      <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl text-xs font-extrabold text-slate-700 dark:text-slate-300">
        {gameResult ? (
          <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">
            {gameResult === "X" ? "🎉 Victory! You defeated the Master AI!" : gameResult === "draw" ? "🤝 It is a Draw!" : "😔 AI won this round!"}
          </span>
        ) : (
          <span>{isPlayerTurn ? "Your turn! Place an [X]" : "AI is calculating..."}</span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3.5 max-w-[240px] mx-auto">
        {board.map((cell, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleTileClick(idx)}
            className={`w-16 h-16 rounded-2xl border flex items-center justify-center text-2xl font-black transition ${
              cell === "X" 
                ? "bg-indigo-500 text-white border-indigo-500 scale-95" 
                : cell === "O" 
                ? "bg-rose-500 text-white border-rose-500 scale-95" 
                : "bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50/50 border-slate-100 dark:border-slate-700 cursor-pointer"
            }`}
          >
            {cell}
          </button>
        ))}
      </div>

      {gameResult && (
        <button
          type="button"
          onClick={collectRewardsAndExit}
          className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-black rounded-2xl shadow-lg transition active:scale-[0.98] cursor-pointer flex items-center justify-center space-x-1"
        >
          <span>Collect Game Rewards & Exit</span>
        </button>
      )}

    </div>
  );
}

// ==========================================
// GAME 5: SPEED NUMBER ADDITION GAME
// ==========================================
interface SpeedSumProps {
  difficulty: DifficultyLevel;
  onFinished: (score: number, max: number, accuracy: number) => void;
  opponentScore?: number;
  synthSound: (f: number, t?: OscillatorType, d?: number) => void;
}

function SpeedSumGame({ difficulty, onFinished, opponentScore, synthSound }: SpeedSumProps) {
  const [phase, setPhase] = useState<"intro" | "flashing" | "asking" | "result">("intro");
  const [countdown, setCountdown] = useState(3);
  const [numbers, setNumbers] = useState<number[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [options, setOptions] = useState<number[]>([]);
  const [timerLeft, setTimerLeft] = useState(15);

  // Generate 10 numbers based on difficulty
  useEffect(() => {
    let min = 1, max = 5;
    if (difficulty === "easy") { min = 1; max = 6; }
    else if (difficulty === "medium") { min = 2; max = 12; }
    else if (difficulty === "hard") { min = 5; max = 25; }
    else if (difficulty === "expert") { min = 10; max = 50; }

    const generated: number[] = [];
    for (let i = 0; i < 10; i++) {
      generated.push(Math.floor(Math.random() * (max - min + 1)) + min);
    }
    setNumbers(generated);
  }, [difficulty]);

  // Intro Countdown
  useEffect(() => {
    if (phase !== "intro") return;
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setPhase("flashing");
          synthSound(800, "sine", 0.15);
          return 0;
        }
        synthSound(400, "sine", 0.08);
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase]);

  // Flashing Numbers (One every 2 seconds)
  useEffect(() => {
    if (phase !== "flashing") return;
    if (numbers.length === 0) return;

    // Play sound for the first number
    synthSound(600, "sine", 0.12);

    const interval = setInterval(() => {
      setCurrentIndex(prev => {
        if (prev >= 9) {
          clearInterval(interval);
          // Go to asking
          const sum = numbers.reduce((a, b) => a + b, 0);
          // Generate 4 options
          const opts = new Set<number>();
          opts.add(sum);
          while (opts.size < 4) {
            const dev = (Math.random() > 0.5 ? 1 : -1) * (Math.floor(Math.random() * 5) + 1);
            if (sum + dev > 0) opts.add(sum + dev);
          }
          setOptions(Array.from(opts).sort((a, b) => a - b));
          setPhase("asking");
          synthSound(700, "sine", 0.15);
          return 9;
        }
        synthSound(600, "sine", 0.12);
        return prev + 1;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [phase, numbers]);

  // Asking countdown
  useEffect(() => {
    if (phase !== "asking") return;
    const interval = setInterval(() => {
      setTimerLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          // Auto submit wrong
          handleSelectOption(-1);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase]);

  const handleSelectOption = (opt: number) => {
    setSelectedAnswer(opt);
    setPhase("result");
    const sum = numbers.reduce((a, b) => a + b, 0);
    const isCorrect = opt === sum;

    if (isCorrect) {
      synthSound(880, "sine", 0.25);
    } else {
      synthSound(150, "sawtooth", 0.3);
    }

    // Auto complete after 4 seconds
    setTimeout(() => {
      onFinished(isCorrect ? 100 : 0, 100, isCorrect ? 100 : 0);
    }, 4000);
  };

  const currentSum = numbers.reduce((a, b) => a + b, 0);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm text-center space-y-6">
      {phase === "intro" && (
        <div className="py-12 space-y-6">
          <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto text-3xl font-black shadow-inner border border-indigo-100 dark:border-indigo-850 animate-bounce">
            ⏱️
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">Speed Number Addition</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto font-medium">10 numbers will flash on the screen one by one every 2 seconds. Keep a running total in your head and select the correct sum!</p>
          </div>
          <div className="text-4xl font-black text-indigo-600 animate-pulse">
            Starting in {countdown}...
          </div>
        </div>
      )}

      {phase === "flashing" && (
        <div className="py-12 space-y-8">
          <div className="flex justify-between items-center text-[10px] text-slate-400 font-extrabold uppercase bg-slate-50 dark:bg-slate-800/40 px-4 py-2 rounded-xl">
            <span>Progress: {currentIndex + 1} / 10 Numbers</span>
            <span className="text-indigo-600 animate-pulse">FLASHING...</span>
          </div>

          <div className="h-32 flex items-center justify-center">
            <motion.div
              key={currentIndex}
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1.2, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0 }}
              className="text-7xl font-black text-indigo-600 dark:text-indigo-400 drop-shadow-md font-mono"
            >
              {numbers[currentIndex]}
            </motion.div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <motion.div
              className="bg-indigo-600 h-full rounded-full"
              initial={{ width: "0%" }}
              animate={{ width: `${((currentIndex + 1) / 10) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      )}

      {phase === "asking" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center text-xs font-bold text-slate-500 bg-slate-50 dark:bg-slate-800/40 px-4 py-2.5 rounded-xl">
            <span className="text-rose-500">⏳ {timerLeft}s Left</span>
            <span>All 10 Numbers Flashed!</span>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest block">GRAND TOTAL QUESTION</span>
            <span className="text-lg font-black block mt-1 text-slate-800 dark:text-slate-100">
              What is the total sum of the 10 numbers?
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3.5 pt-2">
            {options.map(opt => (
              <button
                key={opt}
                type="button"
                onClick={() => handleSelectOption(opt)}
                className="py-4 bg-white dark:bg-slate-850 hover:bg-indigo-50/50 dark:hover:bg-slate-800 border border-slate-150 dark:border-slate-800 rounded-2xl font-black text-slate-800 dark:text-slate-100 text-sm shadow-sm transition hover:border-indigo-400 active:scale-95 cursor-pointer"
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}

      {phase === "result" && (
        <div className="py-10 space-y-6">
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">YOUR RESPONSE</span>
            <div className="text-sm font-semibold">
              {selectedAnswer === currentSum ? (
                <div className="text-emerald-500 font-black text-2xl flex flex-col items-center gap-1">
                  <span>🎉 CORRECT ANSWER!</span>
                  <span className="text-slate-400 text-xs mt-1">Excellent speed memory retention!</span>
                </div>
              ) : (
                <div className="text-rose-500 font-black text-2xl flex flex-col items-center gap-1">
                  <span>❌ INCORRECT!</span>
                  <span className="text-slate-400 text-xs mt-1">Your answer: {selectedAnswer === -1 ? "Timeout" : selectedAnswer}</span>
                </div>
              )}
            </div>
          </div>

          <div className="p-5 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/30 rounded-2xl max-w-sm mx-auto">
            <div className="text-xs text-indigo-700 dark:text-indigo-300 font-black">Calculation Breakdown:</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono font-semibold mt-2 leading-relaxed">
              {numbers.join(" + ")} = <span className="font-extrabold text-indigo-600 dark:text-indigo-400">{currentSum}</span>
            </div>
          </div>

          <p className="text-[10px] text-slate-400 font-bold animate-pulse">Syncing results to profile...</p>
        </div>
      )}
    </div>
  );
}

// ==========================================
// GAME 5B: ARITHMETIC SPEED SPRINT GAME
// ==========================================
interface SpeedOpsProps {
  difficulty: DifficultyLevel;
  onFinished: (score: number, max: number, accuracy: number) => void;
  opponentScore?: number;
  synthSound: (f: number, t?: OscillatorType, d?: number) => void;
  grade?: string;
}

function SpeedOpsGame({ difficulty, onFinished, opponentScore, synthSound, grade }: SpeedOpsProps) {
  const [currentIdx, setCurrentIdx] = useState(0); // 0 to 9 (10 questions)
  const [score, setScore] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [questions, setQuestions] = useState<{ q: string; a: number; options: number[] }[]>([]);
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);

  // Generate 10 random arithmetic questions based on difficulty
  useEffect(() => {
    const list: { q: string; a: number; options: number[] }[] = [];
    for (let i = 0; i < 10; i++) {
      let num1 = 1, num2 = 1, op = "+";
      const ops = ["+", "-", "*", "/"];
      op = ops[Math.floor(Math.random() * ops.length)];

      if (difficulty === "easy") {
        num1 = Math.floor(Math.random() * 10) + 1;
        num2 = Math.floor(Math.random() * 10) + 1;
        if (op === "*") { num1 = Math.floor(Math.random() * 5) + 1; num2 = Math.floor(Math.random() * 5) + 1; }
        if (op === "/") { num2 = Math.floor(Math.random() * 4) + 1; num1 = num2 * (Math.floor(Math.random() * 5) + 1); }
      } else if (difficulty === "medium") {
        num1 = Math.floor(Math.random() * 30) + 5;
        num2 = Math.floor(Math.random() * 20) + 2;
        if (op === "*") { num1 = Math.floor(Math.random() * 12) + 2; num2 = Math.floor(Math.random() * 10) + 2; }
        if (op === "/") { num2 = Math.floor(Math.random() * 8) + 2; num1 = num2 * (Math.floor(Math.random() * 10) + 2); }
      } else { // hard or expert
        num1 = Math.floor(Math.random() * 100) + 10;
        num2 = Math.floor(Math.random() * 80) + 5;
        if (op === "*") { num1 = Math.floor(Math.random() * 20) + 5; num2 = Math.floor(Math.random() * 15) + 5; }
        if (op === "/") { num2 = Math.floor(Math.random() * 12) + 2; num1 = num2 * (Math.floor(Math.random() * 15) + 2); }
      }

      // Calculate answer
      let answer = num1 + num2;
      if (op === "-") answer = num1 - num2;
      else if (op === "*") answer = num1 * num2;
      else if (op === "/") answer = num1 / num2;

      // Generate options
      const opts = new Set<number>();
      opts.add(answer);
      while (opts.size < 4) {
        const deviation = (Math.random() > 0.5 ? 1 : -1) * (Math.floor(Math.random() * 8) + 1);
        opts.add(answer + deviation);
      }

      list.push({
        q: `${num1} ${op === "*" ? "×" : op === "/" ? "÷" : op} ${num2}`,
        a: answer,
        options: Array.from(opts).sort((a, b) => a - b)
      });
    }
    setQuestions(list);
  }, [difficulty]);

  const handleAnswer = (opt: number) => {
    setSelectedOpt(opt);
    const correct = opt === questions[currentIdx].a;
    if (correct) {
      setScore(prev => prev + 10);
      synthSound(750, "sine", 0.08);
    } else {
      setWrongCount(prev => prev + 1);
      synthSound(150, "sawtooth", 0.15);
    }

    setTimeout(() => {
      setSelectedOpt(null);
      if (currentIdx >= 9) {
        // Complete game
        const finalScore = score + (correct ? 10 : 0);
        const finalQuestionsCount = 10;
        const accuracy = Math.round(((finalQuestionsCount - (wrongCount + (correct ? 0 : 1))) / finalQuestionsCount) * 100);
        onFinished(finalScore, 100, accuracy);
      } else {
        setCurrentIdx(prev => prev + 1);
      }
    }, 400);
  };

  if (questions.length === 0) return null;
  const currentQ = questions[currentIdx];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm text-center space-y-6">
      <div className="flex justify-between items-center text-xs font-bold text-slate-500 bg-slate-50 dark:bg-slate-800/40 px-4 py-2.5 rounded-xl">
        <span className="text-indigo-600 font-extrabold">Sprint Q: {currentIdx + 1} / 10</span>
        <span>Score: {score} Pts</span>
      </div>

      <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 block">ARITHMETIC SPRINT</span>
        <span className="text-3xl font-black block mt-2 text-slate-800 dark:text-slate-100 tracking-wider">
          {currentQ.q} = ?
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {currentQ.options.map(opt => {
          const isSelected = selectedOpt === opt;
          const isCorrect = opt === currentQ.a;
          let btnClass = "bg-white dark:bg-slate-850 border-slate-150 dark:border-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/60";
          if (selectedOpt !== null) {
            if (isCorrect) btnClass = "bg-emerald-500 text-white border-emerald-500";
            else if (isSelected) btnClass = "bg-rose-500 text-white border-rose-500";
          }

          return (
            <button
              key={opt}
              type="button"
              disabled={selectedOpt !== null}
              onClick={() => handleAnswer(opt)}
              className={`py-3 rounded-2xl border text-sm font-black transition cursor-pointer shadow-sm active:scale-95 flex items-center justify-center ${btnClass}`}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
        <div 
          className="bg-indigo-600 h-full transition-all duration-200" 
          style={{ width: `${((currentIdx + 1) / 10) * 100}%` }}
        />
      </div>
    </div>
  );
}

// ==========================================
// GAME 5C: EYE TRAINING BALL TRACKER GAME
// ==========================================
interface EyeBallProps {
  difficulty: DifficultyLevel;
  onFinished: (score: number, max: number, accuracy: number) => void;
  opponentScore?: number;
  synthSound: (f: number, t?: OscillatorType, d?: number) => void;
}

function EyeBallTrackerGame({ difficulty, onFinished, opponentScore, synthSound }: EyeBallProps) {
  const [phase, setPhase] = useState<"intro" | "preview" | "mixing" | "guess" | "round_result">("intro");
  const [round, setRound] = useState(1); // Play 3 rounds to finish
  const [score, setScore] = useState(0);
  const [accuracyList, setAccuracyList] = useState<number[]>([]);
  
  // Ball State: Ball 0 is the correct one (Target red ball)
  const [balls, setBalls] = useState([
    { id: 0, x: 25, y: 50, dx: 1.5, dy: 1.2, isTarget: true },
    { id: 1, x: 50, y: 25, dx: -1.2, dy: 1.5, isTarget: false },
    { id: 2, x: 75, y: 75, dx: 1.4, dy: -1.3, isTarget: false }
  ]);

  const [mixTimeLeft, setMixTimeLeft] = useState(10);
  const [mixingElapsedMs, setMixingElapsedMs] = useState(0);
  const [selectedBallId, setSelectedBallId] = useState<number | null>(null);

  // Initialize and Reset Balls for a new round
  const initRound = (r: number = round) => {
    // 1st round: base speed, 2nd round: 1.5x, 3rd round: 2.1x speed
    const speedMultiplier = r === 1 ? 1.0 : r === 2 ? 1.5 : 2.1;
    let speed = 1.2 * speedMultiplier;
    if (difficulty === "easy") speed = 1.0 * speedMultiplier;
    else if (difficulty === "medium") speed = 1.5 * speedMultiplier;
    else if (difficulty === "hard") speed = 2.2 * speedMultiplier;
    else if (difficulty === "expert") speed = 3.0 * speedMultiplier;

    setBalls([
      { id: 0, x: 20 + Math.random() * 15, y: 20 + Math.random() * 60, dx: speed * (Math.random() > 0.5 ? 1 : -1), dy: speed * (Math.random() > 0.5 ? 1 : -1), isTarget: true },
      { id: 1, x: 40 + Math.random() * 15, y: 20 + Math.random() * 60, dx: speed * (Math.random() > 0.5 ? 1 : -1), dy: speed * (Math.random() > 0.5 ? 1 : -1), isTarget: false },
      { id: 2, x: 65 + Math.random() * 15, y: 20 + Math.random() * 60, dx: speed * (Math.random() > 0.5 ? 1 : -1), dy: speed * (Math.random() > 0.5 ? 1 : -1), isTarget: false }
    ]);
    setSelectedBallId(null);
    setMixingElapsedMs(0);

    // Round 1: 10s, Round 2: 15s, Round 3: 20s
    const duration = r === 1 ? 10 : r === 2 ? 15 : 20;
    setMixTimeLeft(duration);
  };

  // Intro transition to Preview
  const startRound = () => {
    initRound(1);
    setPhase("preview");
    synthSound(520, "sine", 0.15);
    
    // Preview for 2.5 seconds, then start mixing
    setTimeout(() => {
      setPhase("mixing");
      setMixingElapsedMs(0);
      synthSound(600, "sine", 0.15);
    }, 2500);
  };

  // Bouncing/Mixing updates in Animation loop
  useEffect(() => {
    if (phase !== "mixing") return;

    const interval = setInterval(() => {
      setMixingElapsedMs(prev => prev + 30);
      setBalls(prevBalls => {
        return prevBalls.map(ball => {
          let nextX = ball.x + ball.dx;
          let nextY = ball.y + ball.dy;
          let nextDx = ball.dx;
          let nextDy = ball.dy;

          // Bounce boundaries
          if (nextX <= 6 || nextX >= 94) {
            nextDx = -ball.dx;
            nextX = Math.max(6, Math.min(94, nextX));
          }
          if (nextY <= 10 || nextY >= 90) {
            nextDy = -ball.dy;
            nextY = Math.max(10, Math.min(90, nextY));
          }

          return {
            ...ball,
            x: nextX,
            y: nextY,
            dx: nextDx,
            dy: nextDy
          };
        });
      });
    }, 30); // ~33fps

    return () => clearInterval(interval);
  }, [phase]);

  // Mix timer countdown
  useEffect(() => {
    if (phase !== "mixing") return;

    const interval = setInterval(() => {
      setMixTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setPhase("guess");
          synthSound(700, "sine", 0.2);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [phase]);

  const handleGuess = (id: number) => {
    if (phase !== "guess") return;
    setSelectedBallId(id);
    const correct = id === 0; // Ball 0 is target

    setAccuracyList(prev => [...prev, correct ? 100 : 0]);
    if (correct) {
      setScore(prev => prev + 33);
      synthSound(880, "sine", 0.25);
    } else {
      synthSound(150, "sawtooth", 0.2);
    }

    setPhase("round_result");

    // Next round after 3 seconds
    setTimeout(() => {
      if (round >= 3) {
        // Game completed! Calculate overall accuracy and end
        const overallAcc = Math.round(( (correct ? 1 : 0) + accuracyList.filter(x => x === 100).length ) / 3 * 100);
        onFinished(score + (correct ? 34 : 0), 100, overallAcc);
      } else {
        const nextRound = round + 1;
        setRound(nextRound);
        setPhase("preview");
        initRound(nextRound);
        setTimeout(() => {
          setPhase("mixing");
          setMixingElapsedMs(0);
          synthSound(600, "sine", 0.15);
        }, 2500);
      }
    }, 3500);
  };

  // Smooth color interpolation for the red ball as it fades to white under 2 seconds (2000ms)
  const getTargetBallColor = () => {
    if (phase === "preview") return "rgb(239, 68, 68)"; // Fully Red
    if (phase === "guess") return "rgb(248, 250, 252)"; // Fully White/Grey
    if (phase === "round_result") return "rgb(239, 68, 68)"; // Return to Red to show where it was!
    
    // Under 2 seconds (2000ms), interpolate from red (239, 68, 68) to white (248, 250, 252)
    const ratio = Math.min(1, mixingElapsedMs / 2000);
    const r = Math.round(239 + (248 - 239) * ratio);
    const g = Math.round(68 + (250 - 68) * ratio);
    const b = Math.round(68 + (252 - 68) * ratio);
    return `rgb(${r}, ${g}, ${b})`;
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm text-center space-y-6">
      {phase === "intro" && (
        <div className="py-10 space-y-6">
          <div className="w-16 h-16 bg-rose-500 rounded-full flex items-center justify-center mx-auto text-3xl font-black shadow-[0_0_15px_rgba(239,68,68,0.4)] animate-pulse">
            🔴
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-black text-slate-800 dark:text-slate-100">Find the Ball in the Eye Training</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto font-medium">Follow the red target ball closely! It will turn white in under 2 seconds as the balls mix. Keep your eyes locked for 10s (Round 1), 15s (Round 2), or 20s (Round 3) with increasing speed, then tap the correct ball!</p>
          </div>
          <button
            type="button"
            onClick={startRound}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl shadow-md transition cursor-pointer active:scale-95"
          >
            Start Round 1 of 3
          </button>
        </div>
      )}

      {phase !== "intro" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center text-[10px] text-slate-400 font-extrabold uppercase bg-slate-50 dark:bg-slate-800/40 px-4 py-2 rounded-xl">
            <span>Round {round} of 3</span>
            <span>
              {phase === "preview" && <span className="text-rose-500 animate-pulse">PREVIEW: REMEMBER THE RED BALL!</span>}
              {phase === "mixing" && <span className="text-indigo-500 animate-pulse">MIXING... ⏳ {mixTimeLeft}s Left</span>}
              {phase === "guess" && <span className="text-amber-500 animate-pulse">GUESS: WHERE IS THE RED BALL?</span>}
              {phase === "round_result" && <span className="text-emerald-500">ROUND OVER!</span>}
            </span>
          </div>

          {/* Eye Training Interactive Stage */}
          <div className="relative w-full h-64 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-3xl overflow-hidden shadow-inner select-none">
            {balls.map(ball => {
              // Color calculation
              let bgStyle = { backgroundColor: "rgb(248, 250, 252)" }; // White
              let shadowStyle = "shadow-sm border border-slate-200 dark:border-slate-800";
              
              if (ball.isTarget) {
                bgStyle = { backgroundColor: getTargetBallColor() };
                if (phase === "preview" || phase === "round_result") {
                  shadowStyle = "shadow-[0_0_15px_rgba(239,68,68,0.7)] border-none";
                }
              }

              const isGuessed = selectedBallId === ball.id;
              const revealResult = phase === "round_result";

              return (
                <button
                  key={ball.id}
                  type="button"
                  disabled={phase !== "guess"}
                  onClick={() => handleGuess(ball.id)}
                  className={`absolute w-12 h-12 rounded-full flex items-center justify-center font-extrabold text-sm transition-transform cursor-pointer ${shadowStyle} ${
                    phase === "guess" ? "hover:scale-110 active:scale-90" : ""
                  }`}
                  style={{
                    left: `${ball.x}%`,
                    top: `${ball.y}%`,
                    transform: "translate(-50%, -50%)",
                    ...bgStyle
                  }}
                >
                  {revealResult && (
                    <span className="text-xs text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
                      {ball.isTarget ? "🎯" : "❌"}
                    </span>
                  )}
                  {phase === "guess" && (
                    <span className="text-xs text-slate-400 font-bold">?</span>
                  )}
                </button>
              );
            })}
          </div>

          {phase === "round_result" && (
            <div className="text-center">
              {selectedBallId === 0 ? (
                <p className="text-emerald-500 font-black text-sm">🎉 You found it! Great eye tracking coordination.</p>
              ) : (
                <p className="text-rose-500 font-black text-sm">❌ Incorrect! The red ball has been revealed.</p>
              )}
              <p className="text-[10px] text-slate-400 font-bold mt-1.5 animate-pulse">Preparing next round...</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ==========================================
// GAME 6: FOCUS & ATTENTION DOT TRACKER
// ==========================================
interface FocusProps {
  difficulty: DifficultyLevel;
  onFinished: (score: number, max: number, accuracy: number) => void;
  opponentScore?: number;
  synthSound: (f: number, t?: OscillatorType, d?: number) => void;
  useShapes?: boolean;
}

function FocusDotsGame({ difficulty, onFinished, opponentScore, synthSound, useShapes }: FocusProps) {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(25);
  const [clicks, setClicks] = useState(0);
  const [targetDot, setTargetDot] = useState({ x: 50, y: 50 });

  const updateDotPosition = () => {
    setTargetDot({
      x: Math.floor(Math.random() * 80) + 10,
      y: Math.floor(Math.random() * 80) + 10
    });
  };

  useEffect(() => {
    updateDotPosition();
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          onFinished(score, clicks, clicks > 0 ? Math.round((score / (clicks * 10)) * 100) : 100);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [score, clicks]);

  const handleContainerClick = () => {
    setClicks(prev => prev + 1);
    synthSound(150, "sawtooth", 0.1);
  };

  const handleDotClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Stop bubbling to container click
    setClicks(prev => prev + 1);
    setScore(prev => prev + 10);
    synthSound(600, "sine", 0.08);
    updateDotPosition();
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm text-center space-y-6">
      
      <div className="flex justify-between items-center text-xs text-slate-500 font-semibold bg-slate-50 dark:bg-slate-800/40 px-4 py-2.5 rounded-2xl">
        <span className="text-rose-500 font-black animate-pulse">⏳ {timeLeft}s Left</span>
        <span>Score: {score}</span>
      </div>

      <div className="p-3.5 bg-cyan-50/50 dark:bg-cyan-950/20 border border-cyan-100 dark:border-cyan-900/30 rounded-2xl text-xs text-left text-slate-600 dark:text-slate-300 font-bold leading-normal">
        {useShapes ? (
          <span>Ignore the circular moving distractors and tap the <span className="text-amber-500 font-black">glowing golden diamond shape</span> as fast as you can!</span>
        ) : (
          <span>Ignore the moving distractors and tap the <span className="text-cyan-500 font-black">glowing primary focus dot</span> as fast as you can!</span>
        )}
      </div>

      {/* Target exercise tracking arena box */}
      <div 
        onClick={handleContainerClick}
        className="w-full h-64 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 relative overflow-hidden cursor-crosshair shadow-inner"
      >
        {/* Floating Decoy distracting dot */}
        <div 
          className="absolute w-8 h-8 rounded-full bg-rose-500/10 border-2 border-rose-500/30 animate-ping"
          style={{ left: "20%", top: "70%" }}
        />
        <div 
          className="absolute w-6 h-6 rounded-full bg-indigo-500/10 border border-indigo-500/20 animate-bounce"
          style={{ left: "75%", top: "30%" }}
        />

        {/* Target dot or star */}
        <button
          type="button"
          onClick={handleDotClick}
          className={`absolute w-8 h-8 cursor-pointer hover:scale-115 transition-all ${
            useShapes 
              ? "bg-amber-500 rotate-45 rounded-sm border border-white shadow-[0_0_12px_rgba(245,158,11,0.8)] animate-pulse" 
              : "bg-cyan-500 rounded-full border-2 border-white shadow-[0_0_12px_rgba(6,182,212,0.6)]"
          }`}
          style={{ left: `${targetDot.x}%`, top: `${targetDot.y}%` }}
        />
      </div>

    </div>
  );
}
