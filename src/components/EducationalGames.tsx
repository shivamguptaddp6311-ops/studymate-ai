import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Gamepad2, Trophy, Award, Zap, Brain, Eye, Sparkles, Coins, Gem, Target, 
  Volume2, VolumeX, Shield, Play, Lock, AlertCircle, RefreshCw, User, 
  Flame, CheckCircle2, Star, Clock, UserCheck, UserPlus, Search, Sliders, 
  Menu, X, HelpCircle, Dumbbell, Activity, Check, Share2, Compass, AlertTriangle,
  Heart, ArrowLeft, Lightbulb, EyeOff, Keyboard, Calendar, History
} from "lucide-react";
import { UserProfile } from "../types";

interface EducationalGamesProps {
  profile: UserProfile;
  onAwardXP: (xpAmount: number) => void;
  onAddNotification: (title: string, message: string, type: "info" | "alert" | "success" | "reminder") => void;
}

// Global Types for Game System
type GameCategory = "all" | "math" | "memory" | "eye" | "logic" | "speed";
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
      id: "geometry_challenge",
      title: "Geometry Challenge",
      category: "math",
      desc: "Identify shapes, angles, areas, perimeters, volumes, and coordinate planes with beautiful interactive vector diagrams!",
      icon: <span className="text-2xl">📐</span>,
      color: "from-amber-500 to-orange-500",
      bgLight: "bg-amber-50/60 dark:bg-amber-950/20",
      borderCol: "border-amber-100 dark:border-amber-900/40",
      skillsTrained: ["Geometry", "Spatial Reasoning", "Area & Volume"]
    },
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
      id: "pattern_memory",
      title: "Pattern Memory Grid",
      category: "memory",
      desc: "Remember and repeat increasingly complex flashing visual patterns. Test your visual-spatial focus and accuracy!",
      icon: <span className="text-2xl">🔲</span>,
      color: "from-pink-500 to-purple-600",
      bgLight: "bg-pink-50/60 dark:bg-pink-950/20",
      borderCol: "border-pink-100 dark:border-pink-900/40",
      skillsTrained: ["Visual-Spatial Recall", "Short-term Memory", "Sequence Encoding"]
    },
    {
      id: "sequence_recall",
      title: "Sequence Recall Master",
      category: "memory",
      desc: "Remember and repeat sequences of numbers, letters, colors, or mixed symbols. Adapts to your performance!",
      icon: <span className="text-2xl">🔁</span>,
      color: "from-fuchsia-500 to-indigo-600",
      bgLight: "bg-fuchsia-50/60 dark:bg-fuchsia-950/20",
      borderCol: "border-fuchsia-100 dark:border-fuchsia-900/40",
      skillsTrained: ["Sequential Auditory Buffer", "Adaptive Logic Decoding", "Color Working Memory"]
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
                { id: "speed", label: "⚡ Brain Speed", icon: null }
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
                    { id: "geometry_challenge", label: "Geometry Challenge (Visual Duel)", color: "hover:bg-amber-50 dark:hover:bg-amber-950/20 border-amber-100" },
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
              {/* MATH: Arithmetic Sprint, Fractions Matcher or Geometry Challenge */}
              {activeGameId === "geometry_challenge" && (
                <GeometryChallengeGame 
                  difficulty={difficulty}
                  grade={profile.classGrade}
                  onFinished={(score, max, acc) => handleGameFinished("geometry_challenge", score, max, acc)}
                  opponentScore={isMultiplayerMatch ? opponentScore : undefined}
                  opponentName={isMultiplayerMatch && matchedOpponent ? matchedOpponent.name : undefined}
                  synthSound={synthSound}
                />
              )}

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

              {/* MEMORY: Matrix Pairs, Formula Recall, Pattern Memory, or Sequence Recall */}
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

              {activeGameId === "pattern_memory" && (
                <PatternMemoryGame 
                  difficulty={difficulty}
                  onFinished={(score, max, acc) => handleGameFinished("pattern_memory", score, max, acc)}
                  opponentScore={isMultiplayerMatch ? opponentScore : undefined}
                  synthSound={synthSound}
                />
              )}

              {activeGameId === "sequence_recall" && (
                <SequenceRecallGame 
                  difficulty={difficulty}
                  onFinished={(score, max, acc) => handleGameFinished("sequence_recall", score, max, acc)}
                  opponentScore={isMultiplayerMatch ? opponentScore : undefined}
                  synthSound={synthSound}
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
  const [startTime] = useState(Date.now());

  const getGridDimension = () => {
    if (difficulty === "easy") return 9; // 3x3
    if (difficulty === "expert") return 25; // 5x5
    return 16; // 4x4
  };

  const totalTargets = getGridDimension();

  const getGridColsClass = () => {
    if (difficulty === "easy") return "grid-cols-3 max-w-[210px]";
    if (difficulty === "expert") return "grid-cols-5 max-w-[350px]";
    return "grid-cols-4 max-w-[280px]";
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

      <div className={`grid gap-3 mx-auto ${getGridColsClass()}`}>
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
  const [balls, setBalls] = useState<any[]>([
    { id: 0, cx: 25, cy: 50, x: 25, y: 50, dx: 1.5, dy: 1.2, isTarget: true },
    { id: 1, cx: 50, cy: 25, x: 50, y: 25, dx: -1.2, dy: 1.5, isTarget: false },
    { id: 2, cx: 75, cy: 75, x: 75, y: 75, dx: 1.4, dy: -1.3, isTarget: false }
  ]);

  const [mixTimeLeft, setMixTimeLeft] = useState(10);
  const [mixingElapsedMs, setMixingElapsedMs] = useState(0);
  const [selectedBallId, setSelectedBallId] = useState<number | null>(null);

  // Available patterns list
  const PATTERNS_LIST = ["linear", "circular", "wave", "figure8", "vortex"];
  const [roundPatterns, setRoundPatterns] = useState<string[]>(["linear", "wave", "circular"]);

  const currentPattern = roundPatterns[round - 1] || "linear";

  const getPatternLabel = (p: string) => {
    switch (p) {
      case "circular": return "Circular Orbit";
      case "wave": return "Sine Wave";
      case "figure8": return "Infinity Loop";
      case "vortex": return "Spiraling Vortex";
      default: return "Bouncy Linear";
    }
  };

  const getBallPosition = (ball: any, pattern: string, elapsedMs: number) => {
    const t = elapsedMs / 1000; // in seconds
    let x = ball.cx;
    let y = ball.cy;

    if (pattern === "circular") {
      const radius = 7;
      const speed = 4; // rad/sec
      const offsetAngle = ball.id * (2 * Math.PI / 8); 
      x = ball.cx + radius * Math.cos(t * speed + offsetAngle);
      y = ball.cy + radius * Math.sin(t * speed + offsetAngle);
    } else if (pattern === "wave") {
      const amplitude = 9;
      const frequency = 4.5;
      const length = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy) || 1;
      const perpX = -ball.dy / length;
      const perpY = ball.dx / length;
      const wave = amplitude * Math.sin(t * frequency + ball.id);
      x = ball.cx + perpX * wave;
      y = ball.cy + perpY * wave;
    } else if (pattern === "figure8") {
      const amplitude = 8;
      const speed = 3.5;
      const offset = ball.id * 1.2;
      x = ball.cx + amplitude * Math.sin((t * speed) + offset);
      y = ball.cy + (amplitude / 1.7) * Math.sin(2 * ((t * speed) + offset));
    } else if (pattern === "vortex") {
      const angleSpeed = 3.0;
      const baseRadius = 10;
      const radialOscillation = 3 * Math.sin(t * 3.5);
      const angle = t * angleSpeed + ball.id * 1.1;
      x = ball.cx + (baseRadius + radialOscillation) * Math.cos(angle);
      y = ball.cy + (baseRadius + radialOscillation) * Math.sin(angle);
    }

    x = Math.max(6, Math.min(94, x));
    y = Math.max(10, Math.min(90, y));

    return { x, y };
  };

  // Initialize and Reset Balls for a new round
  const initRound = (r: number = round) => {
    const speedMultiplier = r === 1 ? 1.0 : r === 2 ? 1.5 : 2.1;
    let speed = 1.2 * speedMultiplier;
    if (difficulty === "easy") speed = 1.0 * speedMultiplier;
    else if (difficulty === "medium") speed = 1.5 * speedMultiplier;
    else if (difficulty === "hard") speed = 2.2 * speedMultiplier;
    else if (difficulty === "expert") speed = 3.0 * speedMultiplier;

    // Number of balls increases per round: Round 1: 4, Round 2: 6, Round 3: 8
    const numBalls = r === 1 ? 4 : r === 2 ? 6 : 8;

    const newBalls = [];
    for (let i = 0; i < numBalls; i++) {
      const x = 15 + (i * (70 / numBalls)) + Math.random() * 8;
      const y = 20 + Math.random() * 55;
      const dx = speed * (Math.random() > 0.5 ? 1 : -1) * (0.8 + Math.random() * 0.4);
      const dy = speed * (Math.random() > 0.5 ? 1 : -1) * (0.8 + Math.random() * 0.4);
      
      newBalls.push({
        id: i,
        cx: x,
        cy: y,
        x: x,
        y: y,
        dx,
        dy,
        isTarget: i === 0
      });
    }

    setBalls(newBalls);
    setSelectedBallId(null);
    setMixingElapsedMs(0);

    const duration = r === 1 ? 10 : r === 2 ? 15 : 20;
    setMixTimeLeft(duration);
  };

  const startRound = () => {
    // Shuffle patterns for this entire game session
    const shuffled = [...PATTERNS_LIST].sort(() => Math.random() - 0.5);
    setRoundPatterns(shuffled.slice(0, 3));

    setRound(1);
    setScore(0);
    setAccuracyList([]);

    initRound(1);
    setPhase("preview");
    synthSound(520, "sine", 0.15);
    
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
          let nextCx = ball.cx + ball.dx;
          let nextCy = ball.cy + ball.dy;
          let nextDx = ball.dx;
          let nextDy = ball.dy;

          if (nextCx <= 10 || nextCx >= 90) {
            nextDx = -ball.dx;
            nextCx = Math.max(10, Math.min(90, nextCx));
          }
          if (nextCy <= 15 || nextCy >= 85) {
            nextDy = -ball.dy;
            nextCy = Math.max(15, Math.min(85, nextCy));
          }

          const { x, y } = getBallPosition(
            { ...ball, cx: nextCx, cy: nextCy, dx: nextDx, dy: nextDy },
            currentPattern,
            mixingElapsedMs + 30
          );

          return {
            ...ball,
            cx: nextCx,
            cy: nextCy,
            dx: nextDx,
            dy: nextDy,
            x,
            y
          };
        });
      });
    }, 30);

    return () => clearInterval(interval);
  }, [phase, currentPattern, mixingElapsedMs]);

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
    const correct = id === 0;

    setAccuracyList(prev => [...prev, correct ? 100 : 0]);
    if (correct) {
      setScore(prev => prev + 33);
      synthSound(880, "sine", 0.25);
    } else {
      synthSound(150, "sawtooth", 0.2);
    }

    setPhase("round_result");

    setTimeout(() => {
      if (round >= 3) {
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

  const getTargetBallColor = () => {
    if (phase === "preview") return "rgb(239, 68, 68)";
    if (phase === "guess") return "rgb(248, 250, 252)";
    if (phase === "round_result") return "rgb(239, 68, 68)";
    
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
            <p className="text-xs text-slate-400 max-w-sm mx-auto font-medium">Follow the red target ball closely! It will turn white in under 2 seconds. The balls will move in dynamic patterns that change every round (Linear, Circular, Wave, Infinity, or Vortex) with increasing speeds and ball counts (4, 6, 8 balls)! Keep your eyes locked, then tap the correct ball!</p>
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
            <span>Round {round} of 3 ({getPatternLabel(currentPattern)})</span>
            <span>
              {phase === "preview" && <span className="text-rose-500 animate-pulse">PREVIEW: REMEMBER THE RED BALL!</span>}
              {phase === "mixing" && <span className="text-indigo-500 animate-pulse">MIXING... ⏳ {mixTimeLeft}s Left</span>}
              {phase === "guess" && <span className="text-amber-500 animate-pulse">GUESS: WHERE IS THE RED BALL?</span>}
              {phase === "round_result" && <span className="text-emerald-500">ROUND OVER!</span>}
            </span>
          </div>

          <div className="relative w-full h-64 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-3xl overflow-hidden shadow-inner select-none">
            {balls.map(ball => {
              let bgStyle = { backgroundColor: "rgb(248, 250, 252)" };
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
// GAME 6: GEOMETRY CHALLENGE GAME
// ==========================================
interface GeometryChallengeProps {
  difficulty: DifficultyLevel;
  grade: string;
  onFinished: (score: number, max: number, accuracy: number) => void;
  opponentScore?: number;
  opponentName?: string;
  synthSound: (f: number, t?: OscillatorType, d?: number) => void;
}

function GeometryChallengeGame({ difficulty, grade, onFinished, opponentScore, opponentName, synthSound }: GeometryChallengeProps) {
  const gradeNum = parseInt(grade) || 8;

  // Game flow states
  const [mode, setMode] = useState<"select" | "learn" | "practice" | "quiz">("select");
  const [currentStep, setCurrentStep] = useState(0); // 0 to 9 (10 questions)
  const [score, setScore] = useState(0);
  const [wrongAnswers, setWrongAnswers] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [activeDiff, setActiveDiff] = useState<DifficultyLevel>(difficulty);

  // Question State
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [selectedOpt, setSelectedOpt] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  
  // Timer for Timed Quiz mode
  const [timeLeft, setTimeLeft] = useState(20);
  const [timerActive, setTimerActive] = useState(false);
  const [gameFinished, setGameFinished] = useState(false);

  // Adaptive Difficulty Trackers
  const [correctStreak, setCorrectStreak] = useState(0);
  const [incorrectStreak, setIncorrectStreak] = useState(0);

  // Generate question
  const loadNextQuestion = (stepIdx: number, diffLevel: DifficultyLevel) => {
    setSelectedOpt(null);
    setShowExplanation(false);
    setShowHint(false);
    
    const q = generateGeometryQuestion(gradeNum, diffLevel, stepIdx, history);
    setCurrentQuestion(q);
    setHistory(prev => [...prev, q.questionText]);

    if (mode === "quiz") {
      setTimeLeft(20);
      setTimerActive(true);
    }
  };

  // Start Session after mode selection
  const startSession = (selectedMode: "learn" | "practice" | "quiz") => {
    setMode(selectedMode);
    setCurrentStep(0);
    setScore(0);
    setWrongAnswers(0);
    setHintsUsed(0);
    setCorrectStreak(0);
    setIncorrectStreak(0);
    setGameFinished(false);
    setHistory([]);

    synthSound(600, "sine", 0.1);
    setTimeout(() => synthSound(800, "sine", 0.15), 80);

    // Initial load
    const q = generateGeometryQuestion(gradeNum, difficulty, 0, []);
    setCurrentQuestion(q);
    setHistory([q.questionText]);

    if (selectedMode === "quiz") {
      setTimeLeft(20);
      setTimerActive(true);
    }
  };

  // Timer loop for timed quiz
  useEffect(() => {
    if (mode !== "quiz" || !timerActive || gameFinished || !currentQuestion) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleSelectOption("__timeout__");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [currentStep, mode, timerActive, gameFinished, currentQuestion]);

  const handleSelectOption = (opt: string) => {
    if (selectedOpt) return; // Prevent double selecting
    setTimerActive(false);
    setSelectedOpt(opt);
    setShowExplanation(true);

    const isCorrect = opt === currentQuestion?.correctAnswer;

    if (isCorrect) {
      // Calculate score value. In practice mode, hints decrease question points by 50%. In quiz mode, there's a 1.5x multiplier!
      let points = 10;
      if (mode === "practice" && showHint) {
        points = 5;
      } else if (mode === "quiz") {
        points = 15;
      }
      setScore(prev => prev + points);
      setCorrectStreak(prev => prev + 1);
      setIncorrectStreak(0);
      synthSound(880, "sine", 0.2);

      // Adaptive difficulty logic (only in Practice mode)
      if (mode === "practice") {
        if (correctStreak + 1 >= 2) {
          // Increase difficulty level
          if (activeDiff === "easy") {
            setActiveDiff("medium");
            onFinished && synthSound(900, "sine", 0.1); // subtle level-up feedback sound
          } else if (activeDiff === "medium") {
            setActiveDiff("hard");
          } else if (activeDiff === "hard") {
            setActiveDiff("expert");
          }
          setCorrectStreak(0);
        }
      }
    } else {
      setWrongAnswers(prev => prev + 1);
      setIncorrectStreak(prev => prev + 1);
      setCorrectStreak(0);
      synthSound(150, "sawtooth", 0.3);

      // Adaptive difficulty logic
      if (mode === "practice") {
        if (incorrectStreak + 1 >= 2) {
          // Decrease difficulty level
          if (activeDiff === "expert") {
            setActiveDiff("hard");
          } else if (activeDiff === "hard") {
            setActiveDiff("medium");
          } else if (activeDiff === "medium") {
            setActiveDiff("easy");
          }
          setIncorrectStreak(0);
        }
      }
    }
  };

  const handleNext = () => {
    if (currentStep >= 9) {
      // Game Over
      setGameFinished(true);
      setTimerActive(false);
      synthSound(900, "sine", 0.4);
    } else {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      loadNextQuestion(nextStep, activeDiff);
    }
  };

  const collectRewardsAndExit = () => {
    const accuracy = Math.round(((10 - wrongAnswers) / 10) * 100);
    // In quiz mode we payout higher, in Learn mode we give small baseline rewards
    let finalScore = score;
    if (mode === "learn") {
      finalScore = 20; // baseline static score for full learn completion
    }
    onFinished(finalScore, 100, accuracy);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 md:p-6 rounded-3xl shadow-sm space-y-6">
      
      {/* MODE SELECTOR SCREEN */}
      {mode === "select" && (
        <div className="space-y-6 py-4">
          <div className="text-center space-y-2">
            <span className="text-3xl">📐</span>
            <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">Geometry Challenge</h3>
            <p className="text-xs text-slate-400 font-semibold max-w-sm mx-auto leading-relaxed">
              Master geometric proofs, diagrams, area formulas, angles, coordinates and volume modules inspired by Board Exams & Textbook syllabi (Classes 8–12).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Learn Mode */}
            <button
              onClick={() => startSession("learn")}
              className="p-5 bg-emerald-50/40 dark:bg-emerald-950/10 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl text-left transition duration-150 flex flex-col justify-between h-44 cursor-pointer"
            >
              <div className="space-y-1.5">
                <span className="bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400 font-black text-[9px] px-2 py-0.5 rounded uppercase tracking-wider">LEARN</span>
                <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">Study Guide Mode</h4>
                <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                  No timers, free hints, and detailed textbook solutions. Perfect for reviewing new syllabus items and building core concepts.
                </p>
              </div>
              <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 flex items-center mt-3">Start learning →</span>
            </button>

            {/* Practice Mode */}
            <button
              onClick={() => startSession("practice")}
              className="p-5 bg-indigo-50/40 dark:bg-indigo-950/10 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl text-left transition duration-150 flex flex-col justify-between h-44 cursor-pointer"
            >
              <div className="space-y-1.5">
                <span className="bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 font-black text-[9px] px-2 py-0.5 rounded uppercase tracking-wider">PRACTICE</span>
                <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">Adaptive Challenge</h4>
                <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                  Our system scales difficulty dynamically based on your correct/incorrect streaks. Hints available but decrease points.
                </p>
              </div>
              <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 flex items-center mt-3">Start practice →</span>
            </button>

            {/* Timed Quiz */}
            <button
              onClick={() => startSession("quiz")}
              className="p-5 bg-rose-50/40 dark:bg-rose-950/10 hover:bg-rose-50 dark:hover:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-2xl text-left transition duration-150 flex flex-col justify-between h-44 cursor-pointer"
            >
              <div className="space-y-1.5">
                <span className="bg-rose-100 dark:bg-rose-900 text-rose-600 dark:text-rose-400 font-black text-[9px] px-2 py-0.5 rounded uppercase tracking-wider">QUIZ</span>
                <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">Timed Arena</h4>
                <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                  Strict 20-second countdown timer per question! No hints allowed. Standard high score multiplier payouts for expert performance.
                </p>
              </div>
              <span className="text-xs font-black text-rose-600 dark:text-rose-400 flex items-center mt-3">Start quiz (1.5x Multiplier) →</span>
            </button>
          </div>
        </div>
      )}

      {/* GAME ONGOING SCREEN */}
      {mode !== "select" && !gameFinished && currentQuestion && (
        <div className="space-y-5">
          {/* Header Progress Bar */}
          <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/40 px-4 py-2.5 rounded-2xl">
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-black uppercase text-indigo-500 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded">
                Question {currentStep + 1} / 10
              </span>
              <span className="text-[10px] font-bold text-slate-400">
                Grade {gradeNum} Syllabus
              </span>
            </div>

            <div className="flex items-center space-x-4">
              {mode === "quiz" && (
                <div className="flex items-center space-x-1.5 text-rose-500 font-black text-xs animate-pulse">
                  <Clock className="w-3.5 h-3.5" />
                  <span>⏳ {timeLeft}s</span>
                </div>
              )}
              {opponentName && (
                <div className="text-right text-[10px]">
                  <span className="text-slate-400 block font-semibold">OPPONENT SCORE</span>
                  <span className="font-black text-purple-600">{(opponentScore || 0) * 10} Pts</span>
                </div>
              )}
              <div className="text-right">
                <span className="text-[9px] text-slate-400 block font-semibold">SCORE</span>
                <span className="text-xs font-black text-amber-500">{score} Pts</span>
              </div>
            </div>
          </div>

          {/* Dynamic Interactive SVG Vector Diagram */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/60 rounded-3xl flex items-center justify-center min-h-[160px]">
            <GeometryDiagram shapeType={currentQuestion.diagramData.shapeType} params={currentQuestion.diagramData.params} />
          </div>

          {/* Question Text */}
          <div className="space-y-1">
            <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest block">
              {currentQuestion.type} challenge ({activeDiff})
            </span>
            <p className="text-sm font-extrabold text-slate-800 dark:text-slate-100 leading-relaxed">
              {currentQuestion.questionText}
            </p>
          </div>

          {/* Hint trigger (Not available in Timed Quiz) */}
          {mode !== "quiz" && (
            <div>
              {!showHint ? (
                <button
                  type="button"
                  onClick={() => {
                    setShowHint(true);
                    setHintsUsed(prev => prev + 1);
                    synthSound(500, "sine", 0.08);
                  }}
                  className="text-[10px] font-bold text-indigo-500 hover:text-indigo-600 flex items-center space-x-1 border border-indigo-100 dark:border-indigo-900/30 px-3 py-1.5 rounded-xl bg-indigo-50/20 hover:bg-indigo-50/40 transition cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Use Hint {mode === "practice" && "(Scores 50% points)"}</span>
                </button>
              ) : (
                <div className="p-3 bg-amber-50/40 dark:bg-amber-950/10 border border-amber-200/40 dark:border-amber-900/30 rounded-xl text-[10px] text-amber-800 dark:text-amber-300 font-semibold leading-relaxed">
                  💡 <span className="font-extrabold">Formula/Concept Hint:</span> {currentQuestion.hint}
                </div>
              )}
            </div>
          )}

          {/* Options grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {currentQuestion.options.map((opt: string) => {
              const isSelected = selectedOpt === opt;
              const isCorrectOpt = opt === currentQuestion.correctAnswer;
              let btnClass = "bg-white dark:bg-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-150 dark:border-slate-800 text-slate-800 dark:text-slate-100";
              
              if (selectedOpt) {
                if (isSelected) {
                  btnClass = isCorrectOpt 
                    ? "bg-emerald-500 text-white border-emerald-500" 
                    : "bg-rose-500 text-white border-rose-500";
                } else if (isCorrectOpt) {
                  btnClass = "bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-300";
                } else {
                  btnClass = "bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-850 opacity-40";
                }
              }

              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => handleSelectOption(opt)}
                  disabled={!!selectedOpt}
                  className={`p-3.5 border rounded-2xl text-xs font-black transition duration-150 text-left flex items-center justify-between min-h-[48px] ${
                    !selectedOpt ? "hover:border-indigo-400 active:scale-[0.98] cursor-pointer" : ""
                  } ${btnClass}`}
                >
                  <span>{opt}</span>
                  {selectedOpt && isCorrectOpt && <Check className="w-4 h-4 text-current shrink-0 ml-2" />}
                  {selectedOpt && isSelected && !isCorrectOpt && <X className="w-4 h-4 text-current shrink-0 ml-2" />}
                </button>
              );
            })}
          </div>

          {/* Step-by-Step Textbook Explanation Block */}
          {showExplanation && (
            <div className="space-y-4 pt-1 animate-fadeIn">
              <div className="p-4 bg-indigo-50/40 dark:bg-indigo-950/15 border border-indigo-100/50 dark:border-indigo-900/30 rounded-2xl text-left space-y-2">
                <div className="flex items-center space-x-2 text-indigo-700 dark:text-indigo-300">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span className="font-extrabold text-xs">Textbook Explanation:</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed font-semibold font-sans">
                  {selectedOpt === "__timeout__" && (
                    <span className="text-rose-500 font-extrabold block mb-1">⏳ Time is Up!</span>
                  )}
                  {currentQuestion.explanation}
                </p>
              </div>

              <button
                type="button"
                onClick={handleNext}
                className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-black rounded-2xl shadow-md transition cursor-pointer flex items-center justify-center space-x-1"
              >
                <span>{currentStep >= 9 ? "Finish Challenge" : "Next Question"} →</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* GAME FINISHED SCREEN */}
      {gameFinished && (
        <div className="text-center py-6 space-y-6 max-w-sm mx-auto">
          <div className="w-20 h-20 bg-amber-50 dark:bg-amber-950/20 text-amber-500 rounded-full flex items-center justify-center mx-auto text-4xl shadow-inner border border-amber-100 dark:border-amber-900/30 animate-bounce">
            🏆
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">Challenge Completed!</h3>
            <p className="text-xs text-slate-400 font-semibold leading-relaxed">
              Fantastic work completing the Geometry training arena. Your accuracy stats and points have been saved offline and synchronized to your StudyMate ledger!
            </p>
          </div>

          {/* Accuracy Stats Widget */}
          <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-[9px] text-slate-400 block font-semibold uppercase">Accuracy</span>
              <span className="text-base font-black text-emerald-500 block mt-0.5">
                {Math.round(((10 - wrongAnswers) / 10) * 100)}%
              </span>
            </div>
            <div>
              <span className="text-[9px] text-slate-400 block font-semibold uppercase">Total Score</span>
              <span className="text-base font-black text-amber-500 block mt-0.5">
                {score} Pts
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={collectRewardsAndExit}
            className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-black rounded-2xl shadow-lg transition active:scale-[0.98] cursor-pointer"
          >
            Collect Board Rewards & Exit
          </button>
        </div>
      )}

    </div>
  );
}

// Helper: Vector Geometry Diagrams Drawing Engine
function GeometryDiagram({ shapeType, params }: { shapeType: string; params: any }) {
  const strokeColor = "rgb(99, 102, 241)"; // Indigo-500
  const fillColor = "rgba(99, 102, 241, 0.05)";
  const axisColor = "#94a3b8"; // Slate-400
  const pointColor = "#f59e0b"; // Amber-500

  switch (shapeType) {
    case "parallelogram":
      return (
        <svg viewBox="0 0 200 120" className="w-full max-w-[200px] mx-auto text-indigo-500">
          <polygon points="40,100 160,100 180,30 60,30" fill={fillColor} stroke={strokeColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="40" y1="100" x2="60" y2="30" stroke="#f59e0b" strokeWidth="2" strokeDasharray="3,3" />
          <text x="35" y="65" className="text-[10px] fill-amber-500 font-extrabold font-mono">h</text>
          <text x="100" y="115" className="text-[10px] fill-slate-500 font-extrabold font-mono">base</text>
        </svg>
      );
    case "trapezoid":
    case "trapezoid_dimensions": {
      const a = params.a || "a";
      const b = params.b || "b";
      const h = params.h || "h";
      return (
        <svg viewBox="0 0 200 120" className="w-full max-w-[200px] mx-auto text-indigo-500">
          <polygon points="30,100 170,100 140,30 60,30" fill={fillColor} stroke={strokeColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="60" y1="30" x2="60" y2="100" stroke="#f59e0b" strokeWidth="2" strokeDasharray="3,3" />
          <rect x="60" y="92" width="8" height="8" fill="none" stroke="#f59e0b" strokeWidth="1" />
          <text x="45" y="70" className="text-[10px] fill-amber-500 font-extrabold font-mono">h = {h}</text>
          <text x="100" y="22" className="text-[10px] fill-slate-500 font-extrabold font-mono">a = {a}</text>
          <text x="100" y="115" className="text-[10px] fill-slate-500 font-extrabold font-mono">b = {b}</text>
        </svg>
      );
    }
    case "rhombus":
      return (
        <svg viewBox="0 0 200 120" className="w-full max-w-[200px] mx-auto text-indigo-500">
          <polygon points="100,10 160,60 100,110 40,60" fill={fillColor} stroke={strokeColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="100" y1="10" x2="100" y2="110" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="2,2" />
          <line x1="40" y1="60" x2="160" y2="60" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="2,2" />
          <text x="105" y="45" className="text-[9px] fill-slate-400 font-bold font-mono">d1</text>
          <text x="120" y="55" className="text-[9px] fill-slate-400 font-bold font-mono">d2</text>
        </svg>
      );
    case "right_triangle":
      return (
        <svg viewBox="0 0 200 120" className="w-full max-w-[180px] mx-auto text-indigo-500">
          <polygon points="50,20 50,100 150,100" fill={fillColor} stroke={strokeColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="50" y="90" width="10" height="10" fill="none" stroke={strokeColor} strokeWidth="1.5" />
          <text x="35" y="65" className="text-[10px] fill-slate-500 font-extrabold font-mono">h</text>
          <text x="100" y="115" className="text-[10px] fill-slate-500 font-extrabold font-mono">b</text>
          <text x="105" y="55" className="text-[9px] fill-slate-400 font-bold font-mono">hypotenuse</text>
        </svg>
      );
    case "isosceles_triangle":
      return (
        <svg viewBox="0 0 200 120" className="w-full max-w-[180px] mx-auto text-indigo-500">
          <polygon points="100,20 50,100 150,100" fill={fillColor} stroke={strokeColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="71" y1="55" x2="79" y2="61" stroke="#f59e0b" strokeWidth="2" />
          <line x1="121" y1="61" x2="129" y2="55" stroke="#f59e0b" strokeWidth="2" />
          <text x="100" y="115" className="text-[10px] fill-slate-500 font-extrabold font-mono">base</text>
        </svg>
      );
    case "cone":
    case "cone_dimensions": {
      const r = params.r || "r";
      const h = params.h || "h";
      return (
        <svg viewBox="0 0 200 140" className="w-full max-w-[160px] mx-auto text-indigo-500">
          <path d="M 50 100 A 50 15 0 1 0 150 100 A 50 15 0 1 0 50 100 Z" fill="none" stroke={strokeColor} strokeWidth="3" />
          <line x1="50" y1="100" x2="100" y2="20" stroke={strokeColor} strokeWidth="3" strokeLinecap="round" />
          <line x1="150" y1="100" x2="100" y2="20" stroke={strokeColor} strokeWidth="3" strokeLinecap="round" />
          <line x1="100" y1="20" x2="100" y2="100" stroke="#f59e0b" strokeWidth="2" strokeDasharray="3,3" />
          <line x1="100" y1="100" x2="150" y2="100" stroke="#f59e0b" strokeWidth="2" strokeDasharray="3,3" />
          <text x="112" y="113" className="text-[10px] fill-amber-500 font-extrabold font-mono">r = {r}</text>
          <text x="80" y="65" className="text-[10px] fill-amber-500 font-extrabold font-mono">h = {h}</text>
        </svg>
      );
    }
    case "cylinder":
    case "cylinder_dimensions": {
      const r = params.r || "r";
      const h = params.h || "h";
      return (
        <svg viewBox="0 0 200 140" className="w-full max-w-[150px] mx-auto text-indigo-500">
          <path d="M 60 110 A 40 12 0 1 0 140 110 A 40 12 0 1 0 60 110 Z" fill="none" stroke={strokeColor} strokeWidth="3" />
          <path d="M 60 30 A 40 12 0 1 0 140 30 A 40 12 0 1 0 60 30 Z" fill="none" stroke={strokeColor} strokeWidth="3" />
          <line x1="60" y1="30" x2="60" y2="110" stroke={strokeColor} strokeWidth="3" />
          <line x1="140" y1="30" x2="140" y2="110" stroke={strokeColor} strokeWidth="3" />
          <line x1="100" y1="30" x2="140" y2="30" stroke="#f59e0b" strokeWidth="2" strokeDasharray="3,3" />
          <text x="110" y="24" className="text-[10px] fill-amber-500 font-extrabold font-mono">r = {r}</text>
          <text x="148" y="75" className="text-[10px] fill-amber-500 font-extrabold font-mono">h = {h}</text>
        </svg>
      );
    }
    case "sphere":
    case "sphere_dimensions": {
      const r = params.r || "r";
      return (
        <svg viewBox="0 0 200 140" className="w-full max-w-[140px] mx-auto text-indigo-500">
          <circle cx="100" cy="70" r="50" fill={fillColor} stroke={strokeColor} strokeWidth="3" />
          <path d="M 50 70 A 50 15 0 1 0 150 70 A 50 15 0 1 0 50 70 Z" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3,3" />
          <line x1="100" y1="70" x2="150" y2="70" stroke="#f59e0b" strokeWidth="2" strokeDasharray="3,3" />
          <circle cx="100" cy="70" r="3" fill="#f59e0b" />
          <text x="115" y="62" className="text-[10px] fill-amber-500 font-extrabold font-mono">r = {r}</text>
        </svg>
      );
    }
    case "hemisphere":
      return (
        <svg viewBox="0 0 200 140" className="w-full max-w-[140px] mx-auto text-indigo-500">
          <path d="M 50 70 A 50 50 0 0 0 150 70 Z" fill={fillColor} stroke={strokeColor} strokeWidth="3" strokeLinecap="round" />
          <path d="M 50 70 A 50 15 0 1 0 150 70 A 50 15 0 1 0 50 70 Z" fill="none" stroke={strokeColor} strokeWidth="3" />
          <line x1="100" y1="70" x2="150" y2="70" stroke="#f59e0b" strokeWidth="2" strokeDasharray="3,3" />
          <circle cx="100" cy="70" r="3" fill="#f59e0b" />
          <text x="115" y="85" className="text-[10px] fill-amber-500 font-extrabold font-mono">r</text>
        </svg>
      );
    case "triangle_angles": {
      const a = params.a;
      const b = params.b;
      return (
        <svg viewBox="0 0 200 120" className="w-full max-w-[180px] mx-auto text-indigo-500">
          <polygon points="100,20 40,100 160,100" fill={fillColor} stroke={strokeColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <text x="92" y="45" className="text-[10px] fill-slate-500 font-extrabold font-mono">A = {a}°</text>
          <text x="45" y="93" className="text-[10px] fill-slate-500 font-extrabold font-mono">B = {b}°</text>
          <text x="130" y="93" className="text-[11px] fill-amber-500 font-black font-mono">C = x°</text>
        </svg>
      );
    }
    case "linear_pair": {
      const a = params.a;
      return (
        <svg viewBox="0 0 200 100" className="w-full max-w-[200px] mx-auto text-indigo-500">
          <line x1="20" y1="80" x2="180" y2="80" stroke={strokeColor} strokeWidth="3" strokeLinecap="round" />
          <line x1="100" y1="80" x2="140" y2="30" stroke={strokeColor} strokeWidth="3" strokeLinecap="round" />
          <path d="M 115 75 A 15 15 0 0 0 100 80" fill="none" stroke="#f59e0b" strokeWidth="2" />
          <text x="65" y="70" className="text-[10px] fill-slate-500 font-extrabold font-mono">{a}°</text>
          <text x="115" y="65" className="text-[11px] fill-amber-500 font-black font-mono">x°</text>
        </svg>
      );
    }
    case "circle_tangent": {
      const o = params.angleO;
      return (
        <svg viewBox="0 0 200 140" className="w-full max-w-[160px] mx-auto text-indigo-500">
          <circle cx="90" cy="70" r="40" fill={fillColor} stroke={strokeColor} strokeWidth="2.5" />
          <line x1="90" y1="70" x2="130" y2="70" stroke={strokeColor} strokeWidth="2.5" />
          <line x1="130" y1="30" x2="130" y2="120" stroke="#f59e0b" strokeWidth="2.5" />
          <line x1="90" y1="70" x2="130" y2="110" stroke={strokeColor} strokeWidth="2" />
          <circle cx="90" cy="70" r="3" fill="#f59e0b" />
          <text x="78" y="75" className="text-[9px] fill-slate-400 font-bold font-mono">O</text>
          <text x="135" y="75" className="text-[9px] fill-slate-400 font-bold font-mono">P</text>
          <text x="135" y="115" className="text-[9px] fill-slate-400 font-bold font-mono">T</text>
          <text x="98" y="85" className="text-[9px] fill-slate-500 font-bold font-mono">{o}°</text>
          <text x="120" y="105" className="text-[10px] fill-amber-500 font-black font-mono">x°</text>
          <rect x="122" y="70" width="8" height="8" fill="none" stroke="#f59e0b" strokeWidth="1" />
        </svg>
      );
    }
    case "parallel_transversal": {
      const l1 = params.label1;
      const l2 = params.label2;
      return (
        <svg viewBox="0 0 200 120" className="w-full max-w-[200px] mx-auto text-indigo-500">
          <line x1="20" y1="40" x2="180" y2="40" stroke={strokeColor} strokeWidth="3" />
          <line x1="20" y1="80" x2="180" y2="80" stroke={strokeColor} strokeWidth="3" />
          <line x1="60" y1="110" x2="140" y2="10" stroke="#f59e0b" strokeWidth="2.5" />
          <text x="105" y="55" className="text-[10px] fill-indigo-600 font-bold font-mono">({l1})°</text>
          <text x="65" y="75" className="text-[10px] fill-amber-500 font-extrabold font-mono">({l2})°</text>
        </svg>
      );
    }
    case "triangle_dimensions": {
      const b = params.b;
      const h = params.h;
      return (
        <svg viewBox="0 0 200 120" className="w-full max-w-[180px] mx-auto text-indigo-500">
          <polygon points="100,20 40,100 160,100" fill={fillColor} stroke={strokeColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="100" y1="20" x2="100" y2="100" stroke="#f59e0b" strokeWidth="2" strokeDasharray="3,3" />
          <rect x="100" y="92" width="8" height="8" fill="none" stroke="#f59e0b" strokeWidth="1" />
          <text x="105" y="60" className="text-[10px] fill-amber-500 font-extrabold font-mono">h = {h}</text>
          <text x="85" y="115" className="text-[10px] fill-slate-500 font-extrabold font-mono">base = {b}</text>
        </svg>
      );
    }
    case "rectangle_dimensions": {
      const l = params.l;
      const w = params.w;
      return (
        <svg viewBox="0 0 200 120" className="w-full max-w-[180px] mx-auto text-indigo-500">
          <rect x="30" y="25" width="140" height="70" fill={fillColor} stroke={strokeColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <text x="85" y="18" className="text-[10px] fill-slate-500 font-extrabold font-mono">length = {l}</text>
          <text x="173" y="65" className="text-[10px] fill-slate-500 font-extrabold font-mono">w = {w}</text>
        </svg>
      );
    }
    case "circle_sector": {
      const r = params.r;
      const theta = params.theta;
      return (
        <svg viewBox="0 0 200 140" className="w-full max-w-[150px] mx-auto text-indigo-500">
          <circle cx="100" cy="70" r="50" fill="none" stroke="#e2e8f0" strokeWidth="2" />
          <path d="M 100 70 L 150 70 A 50 50 0 0 0 125 27 Z" fill={fillColor} stroke={strokeColor} strokeWidth="3" />
          <text x="110" y="55" className="text-[9px] fill-indigo-600 font-black font-mono">{theta}°</text>
          <text x="120" y="83" className="text-[10px] fill-amber-500 font-extrabold font-mono">r = {r}</text>
        </svg>
      );
    }
    case "semicircle_dimensions": {
      const r = params.r;
      return (
        <svg viewBox="0 0 200 120" className="w-full max-w-[160px] mx-auto text-indigo-500">
          <path d="M 50 80 A 50 50 0 0 1 150 80 Z" fill={fillColor} stroke={strokeColor} strokeWidth="3" strokeLinecap="round" />
          <line x1="50" y1="80" x2="150" y2="80" stroke={strokeColor} strokeWidth="3" />
          <circle cx="100" cy="80" r="3.5" fill="#f59e0b" />
          <line x1="100" y1="80" x2="150" y2="80" stroke="#f59e0b" strokeWidth="2" strokeDasharray="3,3" />
          <text x="115" y="95" className="text-[10px] fill-amber-500 font-extrabold font-mono">r = {r}</text>
        </svg>
      );
    }
    case "cuboid_dimensions": {
      const l = params.l;
      const w = params.w;
      const h = params.h;
      return (
        <svg viewBox="0 0 200 120" className="w-full max-w-[180px] mx-auto text-indigo-500">
          <rect x="60" y="20" width="100" height="60" fill="none" stroke="#cbd5e1" strokeWidth="2" />
          <rect x="40" y="40" width="100" height="60" fill={fillColor} stroke={strokeColor} strokeWidth="3" />
          <line x1="40" y1="40" x2="60" y2="20" stroke={strokeColor} strokeWidth="2.5" />
          <line x1="140" y1="40" x2="160" y2="20" stroke={strokeColor} strokeWidth="2.5" />
          <line x1="40" y1="100" x2="60" y2="80" stroke={strokeColor} strokeWidth="2.5" />
          <line x1="140" y1="100" x2="160" y2="80" stroke={strokeColor} strokeWidth="2.5" />
          <text x="80" y="115" className="text-[9px] fill-slate-500 font-extrabold font-mono">L = {l}</text>
          <text x="145" y="75" className="text-[9px] fill-slate-500 font-extrabold font-mono">H = {h}</text>
          <text x="155" y="32" className="text-[9px] fill-amber-500 font-extrabold font-mono">W = {w}</text>
        </svg>
      );
    }
    case "cartesian_grid": {
      const px = params.x;
      const py = params.y;
      const scaleX = (val: number) => 100 + val * 8;
      const scaleY = (val: number) => 70 - val * 6;
      const svgX = scaleX(px);
      const svgY = scaleY(py);

      return (
        <svg viewBox="0 0 200 140" className="w-full max-w-[200px] mx-auto bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-100 dark:border-slate-800">
          <line x1="10" y1="70" x2="190" y2="70" stroke={axisColor} strokeWidth="2" />
          <line x1="100" y1="10" x2="100" y2="130" stroke={axisColor} strokeWidth="2" />
          <line x1="140" y1="67" x2="140" y2="73" stroke={axisColor} strokeWidth="1.5" />
          <line x1="60" y1="67" x2="60" y2="73" stroke={axisColor} strokeWidth="1.5" />
          <line x1="97" y1="40" x2="103" y2="40" stroke={axisColor} strokeWidth="1.5" />
          <line x1="97" y1="100" x2="103" y2="100" stroke={axisColor} strokeWidth="1.5" />
          <circle cx={svgX} cy={svgY} r="5" fill={pointColor} className="animate-pulse" />
          <text x={svgX + 8} y={svgY - 4} className="text-[10px] fill-amber-500 font-black font-mono">P({px},{py})</text>
          <text x="180" y="65" className="text-[8px] fill-slate-400 font-black font-mono">X</text>
          <text x="105" y="18" className="text-[8px] fill-slate-400 font-black font-mono">Y</text>
        </svg>
      );
    }
    case "cartesian_segment": {
      const x1 = params.x1;
      const y1 = params.y1;
      const x2 = params.x2;
      const y2 = params.y2;
      const scaleX = (val: number) => 100 + val * 8;
      const scaleY = (val: number) => 70 - val * 6;
      const sx1 = scaleX(x1);
      const sy1 = scaleY(y1);
      const sx2 = scaleX(x2);
      const sy2 = scaleY(y2);

      return (
        <svg viewBox="0 0 200 140" className="w-full max-w-[200px] mx-auto bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-100 dark:border-slate-800">
          <line x1="10" y1="70" x2="190" y2="70" stroke={axisColor} strokeWidth="1.5" />
          <line x1="100" y1="10" x2="100" y2="130" stroke={axisColor} strokeWidth="1.5" />
          <line x1={sx1} y1={sy1} x2={sx2} y2={sy2} stroke={strokeColor} strokeWidth="3" strokeLinecap="round" />
          <circle cx={sx1} cy={sy1} r="4.5" fill={pointColor} />
          <circle cx={sx2} cy={sy2} r="4.5" fill={pointColor} />
          <text x={sx1 + 6} y={sy1 - 4} className="text-[8px] fill-slate-500 font-bold font-mono">A({x1},{y1})</text>
          <text x={sx2 + 6} y={sy2 - 4} className="text-[8px] fill-slate-500 font-bold font-mono">B({x2},{y2})</text>
        </svg>
      );
    }
    default:
      return (
        <div className="w-32 h-32 mx-auto flex items-center justify-center bg-indigo-50/20 rounded-full border border-indigo-100">
          <span className="text-3xl">📐</span>
        </div>
      );
  }
}

// Helper: Syllabi / Textbook Dynamic Question Generator (Classes 8-12)
function generateGeometryQuestion(gradeNum: number, difficulty: DifficultyLevel, index: number, history: string[]): any {
  const categories: ("shape" | "angle" | "area" | "perimeter" | "volume" | "coordinate")[] = [
    "shape", "angle", "area", "perimeter", "volume", "coordinate"
  ];
  let type = categories[index % categories.length];

  let questionText = "";
  let options: string[] = [];
  let correctAnswer = "";
  let explanation = "";
  let hint = "";
  let diagramData: { shapeType: string; params: any } = { shapeType: "none", params: {} };

  if (type === "shape") {
    if (gradeNum < 10) {
      const shapes_8_9 = [
        { name: "Parallelogram", desc: "A quadrilateral with opposite sides parallel.", svg: "parallelogram" },
        { name: "Trapezoid", desc: "A quadrilateral with exactly one pair of parallel sides.", svg: "trapezoid" },
        { name: "Rhombus", desc: "A parallelogram with four equal sides.", svg: "rhombus" },
        { name: "Right-Angled Triangle", desc: "A triangle with one angle of 90 degrees.", svg: "right_triangle" },
        { name: "Isosceles Triangle", desc: "A triangle with at least two equal sides.", svg: "isosceles_triangle" }
      ];
      const item = shapes_8_9[Math.floor(Math.random() * shapes_8_9.length)];
      questionText = `Identify the 2D shape shown in the diagram. It has: ${item.desc}`;
      correctAnswer = item.name;
      options = [item.name, ...shapes_8_9.filter(s => s.name !== item.name).slice(0, 3).map(s => s.name)].sort();
      explanation = `The given shape is a ${item.name} because it has the following properties: ${item.desc}`;
      hint = `Look at the parallel lines or equal sides indicated in the drawing.`;
      diagramData = { shapeType: item.svg, params: {} };
    } else {
      const shapes_10_12 = [
        { name: "Cone", desc: "A 3D solid that tapers smoothly from a flat circular base to an apex.", svg: "cone" },
        { name: "Cylinder", desc: "A 3D solid with two parallel circular bases of equal size connected by a curved surface.", svg: "cylinder" },
        { name: "Sphere", desc: "A perfectly round 3D geometrical object that is the surface of a round ball.", svg: "sphere" },
        { name: "Hemisphere", desc: "Exactly half of a sphere, having a flat circular base and a curved dome.", svg: "hemisphere" }
      ];
      const item = shapes_10_12[Math.floor(Math.random() * shapes_10_12.length)];
      questionText = `Identify the 3D solid geometry shown in the diagram. It has: ${item.desc}`;
      correctAnswer = item.name;
      options = [item.name, ...shapes_10_12.filter(s => s.name !== item.name).slice(0, 3).map(s => s.name)].sort();
      explanation = `The 3D diagram represents a ${item.name}, defined as a ${item.desc.toLowerCase()}`;
      hint = `This is a 3D solid shape. Notice the elliptical contours representing circular cross-sections.`;
      diagramData = { shapeType: item.svg, params: { r: 40, h: 80 } };
    }
  } else if (type === "angle") {
    if (gradeNum < 10) {
      const angleSubtypes = ["triangle_sum", "linear_pair"];
      const subtype = angleSubtypes[Math.floor(Math.random() * angleSubtypes.length)];
      if (subtype === "triangle_sum") {
        const a = Math.floor(Math.random() * 40) + 40;
        const b = Math.floor(Math.random() * 40) + 40;
        const c = 180 - a - b;
        questionText = `In the triangle shown, angle A = ${a}° and angle B = ${b}°. Find the missing angle x (angle C).`;
        correctAnswer = `${c}°`;
        options = [`${c}°`, `${c + 15}°`, `${c - 10}°`, `${180 - c}°`].filter((v, i, arr) => arr.indexOf(v) === i).slice(0, 4).sort();
        while (options.length < 4) {
          options.push(`${c + options.length * 12}°`);
        }
        explanation = `The sum of interior angles in any triangle is always 180°. Therefore, x = 180° - (${a}° + ${b}°) = 180° - ${a + b}° = ${c}°.`;
        hint = `Recall the Angle Sum Property of a triangle: A + B + C = 180°.`;
        diagramData = { shapeType: "triangle_angles", params: { a, b, c } };
      } else {
        const a = Math.floor(Math.random() * 80) + 50;
        const b = 180 - a;
        questionText = `Find the value of the missing angle x which forms a linear pair on the straight line with the given angle of ${a}°.`;
        correctAnswer = `${b}°`;
        options = [`${b}°`, `${b + 20}°`, `${b - 15}°`, `${180 - b + 5}°`].filter((v, i, arr) => arr.indexOf(v) === i).slice(0, 4).sort();
        while (options.length < 4) {
          options.push(`${b + options.length * 10}°`);
        }
        explanation = `Angles on a straight line add up to 180° (Linear Pair Theorem). Thus, x = 180° - ${a}° = ${b}°.`;
        hint = `Straight line angles are supplementary (sum = 180°).`;
        diagramData = { shapeType: "linear_pair", params: { a, b } };
      }
    } else {
      const angleSubtypes = ["circle_tangent", "parallel_algebra"];
      const subtype = angleSubtypes[Math.floor(Math.random() * angleSubtypes.length)];
      if (subtype === "circle_tangent") {
        const angleO = Math.floor(Math.random() * 30) + 35;
        const angleP = 90 - angleO;
        questionText = `In the circle diagram, OP is a radius and PT is a tangent at point P. If angle OPT = 90° and angle POT = ${angleO}°, find angle PTO (x).`;
        correctAnswer = `${angleP}°`;
        options = [`${angleP}°`, `${angleP + 10}°`, `${angleP - 10}°`, `${90 - angleP}°`].filter((v, i, arr) => arr.indexOf(v) === i).slice(0, 4).sort();
        while (options.length < 4) {
          options.push(`${angleP + options.length * 5}°`);
        }
        explanation = `The radius is perpendicular to the tangent at the point of contact, making angle OPT = 90°. In right triangle OPT, the sum of acute angles is 90°. Hence, angle PTO = 90° - ${angleO}° = ${angleP}°.`;
        hint = `Radius is perpendicular to the tangent line at the contact point. Use the acute angles of the right triangle.`;
        diagramData = { shapeType: "circle_tangent", params: { angleO, angleP } };
      } else {
        const term1 = "3x + 10";
        const term2 = "2x + 30";
        questionText = `Two parallel lines are cut by a transversal. The alternate interior angles are given as (${term1})° and (${term2})°. Solve for x and find the angle value.`;
        correctAnswer = "x = 20, Angle = 70°";
        options = ["x = 20, Angle = 70°", "x = 15, Angle = 55°", "x = 25, Angle = 85°", "x = 10, Angle = 40°"];
        explanation = `Alternate interior angles are equal when lines are parallel. Set up the equation: 3x + 10 = 2x + 30 => 3x - 2x = 30 - 10 => x = 20. Plugging x back in: 3(20) + 10 = 70°.`;
        hint = `Since the lines are parallel, set the alternate interior angles equal to each other and solve for x.`;
        diagramData = { shapeType: "parallel_transversal", params: { label1: term1, label2: term2 } };
      }
    }
  } else if (type === "area") {
    if (gradeNum < 10) {
      const sub = ["trapezoid", "triangle", "rectangle"][Math.floor(Math.random() * 3)];
      if (sub === "trapezoid") {
        const a = Math.floor(Math.random() * 6) + 6;
        const b = a + Math.floor(Math.random() * 4) + 4;
        const h = Math.floor(Math.random() * 5) + 4;
        const area = 0.5 * (a + b) * h;
        questionText = `Calculate the area of the trapezoid with parallel bases a = ${a} cm, b = ${b} cm and height h = ${h} cm.`;
        correctAnswer = `${area} cm²`;
        options = [`${area} cm²`, `${area + 5} cm²`, `${area - 3} cm²`, `${(a + b) * h} cm²`].filter((v, i, arr) => arr.indexOf(v) === i).slice(0, 4).sort();
        while (options.length < 4) {
          options.push(`${area + options.length * 6} cm²`);
        }
        explanation = `The formula for the area of a trapezoid is A = 1/2 × (a + b) × h. Plugging in the values: A = 1/2 × (${a} + ${b}) × ${h} = 1/2 × ${a + b} × ${h} = ${area} cm².`;
        hint = `Area of Trapezoid = 1/2 * (sum of parallel sides) * height.`;
        diagramData = { shapeType: "trapezoid_dimensions", params: { a, b, h } };
      } else if (sub === "triangle") {
        const b = Math.floor(Math.random() * 8) + 8;
        const h = Math.floor(Math.random() * 6) + 4;
        const area = 0.5 * b * h;
        questionText = `Find the area of the triangle with a base of ${b} cm and height of ${h} cm.`;
        correctAnswer = `${area} cm²`;
        options = [`${area} cm²`, `${b * h} cm²`, `${area + 4} cm²`, `${area - 2} cm²`].filter((v, i, arr) => arr.indexOf(v) === i).slice(0, 4).sort();
        while (options.length < 4) {
          options.push(`${area + options.length * 4} cm²`);
        }
        explanation = `The formula for the area of a triangle is A = 1/2 × base × height. Here, A = 1/2 × ${b} × ${h} = ${area} cm².`;
        hint = `Area of Triangle = 1/2 * base * perpendicular height.`;
        diagramData = { shapeType: "triangle_dimensions", params: { b, h } };
      } else {
        const l = Math.floor(Math.random() * 8) + 8;
        const w = Math.floor(Math.random() * 5) + 3;
        const area = l * w;
        questionText = `Find the area of the rectangle with length = ${l} cm and width = ${w} cm.`;
        correctAnswer = `${area} cm²`;
        options = [`${area} cm²`, `${2 * (l + w)} cm²`, `${area + 10} cm²`, `${area - 6} cm²`].filter((v, i, arr) => arr.indexOf(v) === i).slice(0, 4).sort();
        while (options.length < 4) {
          options.push(`${area + options.length * 5} cm²`);
        }
        explanation = `The area of a rectangle is calculated as Area = length × width. Therefore, Area = ${l} × ${w} = ${area} cm².`;
        hint = `Area of Rectangle = length * width.`;
        diagramData = { shapeType: "rectangle_dimensions", params: { l, w } };
      }
    } else {
      const sub = ["sector", "cylinder_surface"];
      const chosen = sub[Math.floor(Math.random() * sub.length)];
      if (chosen === "sector") {
        const r = 6;
        const theta = 60;
        questionText = `Find the area of the sector of a circle of radius r = ${r} cm with a central angle of ${theta}°. (Take π = 3.14)`;
        const area = parseFloat(((theta / 360) * 3.14 * r * r).toFixed(2));
        correctAnswer = `${area} cm²`;
        options = [`${area} cm²`, `${((theta / 360) * r * r).toFixed(2)} cm²`, `${(3.14 * r * r).toFixed(2)} cm²`, `${(area + 4.5).toFixed(2)} cm²`].filter((v, i, arr) => arr.indexOf(v) === i).slice(0, 4).sort();
        while (options.length < 4) {
          options.push(`${(area + options.length * 3.2).toFixed(2)} cm²`);
        }
        explanation = `The area of a sector is given by A = (θ/360) × π × r². Here, A = (${theta}/360) × 3.14 × ${r}² = 1/6 × 3.14 × 36 = 6 × 3.14 = ${area} cm².`;
        hint = `Area of Sector = (θ / 360) * π * r² where θ is the angle in degrees.`;
        diagramData = { shapeType: "circle_sector", params: { r, theta } };
      } else {
        const r = 7;
        const h = 10;
        questionText = `Calculate the curved surface area (CSA) of a solid cylinder having radius r = ${r} cm and height h = ${h} cm. (Take π = 22/7)`;
        const csa = 2 * (22 / 7) * r * h;
        correctAnswer = `${csa} cm²`;
        options = [`${csa} cm²`, `${Math.round((22/7) * r * r * h)} cm²`, `${csa / 2} cm²`, `${csa + 80} cm²`].filter((v, i, arr) => arr.indexOf(v) === i).slice(0, 4).sort();
        while (options.length < 4) {
          options.push(`${csa + options.length * 50} cm²`);
        }
        explanation = `Curved Surface Area (CSA) of a cylinder = 2πrh. Plugging in the values: CSA = 2 × (22/7) × ${r} × ${h} = 2 × 22 × ${h} = ${csa} cm².`;
        hint = `CSA of Cylinder = 2 * π * r * h.`;
        diagramData = { shapeType: "cylinder_dimensions", params: { r, h } };
      }
    }
  } else if (type === "perimeter") {
    if (gradeNum < 10) {
      const sub = Math.random() > 0.5 ? "rectangle" : "circle";
      if (sub === "rectangle") {
        const l = Math.floor(Math.random() * 10) + 10;
        const w = Math.floor(Math.random() * 5) + 4;
        const perimeter = 2 * (l + w);
        questionText = `Find the perimeter of the rectangle with length = ${l} cm and width = ${w} cm.`;
        correctAnswer = `${perimeter} cm`;
        options = [`${perimeter} cm`, `${l * w} cm`, `${perimeter - 4} cm`, `${l + w} cm`].filter((v, i, arr) => arr.indexOf(v) === i).slice(0, 4).sort();
        while (options.length < 4) {
          options.push(`${perimeter + options.length * 6} cm`);
        }
        explanation = `Perimeter of a rectangle is equal to 2 × (length + width). Here, P = 2 × (${l} + ${w}) = 2 × ${l + w} = ${perimeter} cm.`;
        hint = `Perimeter is the total boundary of the shape: P = 2 * (l + w).`;
        diagramData = { shapeType: "rectangle_dimensions", params: { l, w } };
      } else {
        const r = Math.floor(Math.random() * 5) + 5;
        const circPi = 2 * r;
        questionText = `What is the exact circumference of a circle with radius r = ${r} cm? (Express in terms of π)`;
        correctAnswer = `${circPi}π cm`;
        options = [`${circPi}π cm`, `${r * r}π cm`, `${r}π cm`, `${2 * circPi}π cm`].filter((v, i, arr) => arr.indexOf(v) === i).slice(0, 4).sort();
        while (options.length < 4) {
          options.push(`${circPi + options.length * 4}π cm`);
        }
        explanation = `The circumference of a circle is calculated by the formula C = 2 × π × r. Since r = ${r} cm, C = 2 × π × ${r} = ${circPi}π cm.`;
        hint = `Circumference formula is C = 2 * π * r. Keep 'π' as a symbol in your answer.`;
        diagramData = { shapeType: "circle_radius", params: { r } };
      }
    } else {
      const r = 7;
      questionText = `Calculate the total perimeter of a semicircle with radius r = ${r} cm. (Take π = 22/7)`;
      const perimeter = (22 / 7) * r + 2 * r;
      correctAnswer = `${perimeter} cm`;
      options = [`${perimeter} cm`, `22 cm`, `44 cm`, `29 cm`].filter((v, i, arr) => arr.indexOf(v) === i).slice(0, 4).sort();
      while (options.length < 4) {
        options.push(`${perimeter + options.length * 7} cm`);
      }
      explanation = `The perimeter of a semicircle includes the curved arc boundary (π × r) plus the straight diameter base (2 × r). Thus, P = πr + 2r = (22/7) × ${r} + 2 × ${r} = 22 + 14 = ${perimeter} cm.`;
      hint = `Remember that the perimeter includes BOTH the curved arc boundary (π * r) AND the straight diameter (2 * r).`;
      diagramData = { shapeType: "semicircle_dimensions", params: { r } };
    }
  } else if (type === "volume") {
    if (gradeNum < 10) {
      const l = Math.floor(Math.random() * 4) + 6;
      const w = Math.floor(Math.random() * 3) + 3;
      const h = Math.floor(Math.random() * 3) + 2;
      const vol = l * w * h;
      questionText = `Find the volume of a rectangular cuboid with dimensions: length = ${l} cm, width = ${w} cm, and height = ${h} cm.`;
      correctAnswer = `${vol} cm³`;
      options = [`${vol} cm³`, `${l * w + h} cm³`, `${2 * (l * w + w * h + h * l)} cm³`, `${vol + 12} cm³`].filter((v, i, arr) => arr.indexOf(v) === i).slice(0, 4).sort();
      while (options.length < 4) {
        options.push(`${vol + options.length * 15} cm³`);
      }
      explanation = `The volume of a cuboid is given by V = length × width × height. Here, V = ${l} × ${w} × ${h} = ${vol} cm³.`;
      hint = `Volume of a 3D rectangular box (cuboid) is length * width * height.`;
      diagramData = { shapeType: "cuboid_dimensions", params: { l, w, h } };
    } else {
      const sub = ["cone", "cylinder", "sphere"][Math.floor(Math.random() * 3)];
      if (sub === "cone") {
        const r = 3;
        const h = 7;
        questionText = `Find the volume of a right circular cone with radius r = ${r} cm and height h = ${h} cm. (Take π = 22/7)`;
        const vol = Math.round((1 / 3) * (22 / 7) * r * r * h);
        correctAnswer = `${vol} cm³`;
        options = [`${vol} cm³`, `${vol * 3} cm³`, `${Math.round(vol * 1.5)} cm³`, `${vol - 12} cm³`].filter((v, i, arr) => arr.indexOf(v) === i).slice(0, 4).sort();
        while (options.length < 4) {
          options.push(`${vol + options.length * 10} cm³`);
        }
        explanation = `The volume of a cone is V = 1/3 × π × r² × h. Substituting values: V = 1/3 × (22/7) × ${r}² × ${h} = 1/3 × (22/7) × 9 × 7 = 3 × 22 = ${vol} cm³.`;
        hint = `Volume of a Cone is exactly 1/3 of the volume of a cylinder: V = 1/3 * π * r² * h.`;
        diagramData = { shapeType: "cone_dimensions", params: { r, h } };
      } else if (sub === "cylinder") {
        const r = 7;
        const h = 5;
        questionText = `Find the volume of a cylinder with radius r = ${r} cm and height h = ${h} cm. (Take π = 22/7)`;
        const vol = (22 / 7) * r * r * h;
        correctAnswer = `${vol} cm³`;
        options = [`${vol} cm³`, `${vol / 3} cm³`, `${vol + 110} cm³`, `${vol - 70} cm³`].filter((v, i, arr) => arr.indexOf(v) === i).slice(0, 4).sort();
        while (options.length < 4) {
          options.push(`${vol + options.length * 50} cm³`);
        }
        explanation = `Volume of a cylinder is V = π × r² × h. Substituting values: V = (22/7) × ${r}² × ${h} = (22/7) × 49 × ${h} = 22 × 7 × 5 = ${vol} cm³.`;
        hint = `Volume of Cylinder = base area * height = π * r² * h.`;
        diagramData = { shapeType: "cylinder_dimensions", params: { r, h } };
      } else {
        const r = 3;
        questionText = `Find the volume of a sphere with radius r = ${r} cm. (Take π = 3.14)`;
        const vol = parseFloat(((4 / 3) * 3.14 * r * r * r).toFixed(2));
        correctAnswer = `${vol} cm³`;
        options = [`${vol} cm³`, `${(4 * 3.14 * r * r).toFixed(2)} cm³`, `${(vol / 2).toFixed(2)} cm³`, `${(vol + 20).toFixed(2)} cm³`].filter((v, i, arr) => arr.indexOf(v) === i).slice(0, 4).sort();
        while (options.length < 4) {
          options.push(`${(vol + options.length * 15.6).toFixed(2)} cm³`);
        }
        explanation = `The volume of a sphere is V = 4/3 × π × r³. Plugging in values: V = 4/3 × 3.14 × ${r}³ = 4/3 × 3.14 × 27 = 36 × 3.14 = ${vol} cm³.`;
        hint = `Volume of Sphere = 4/3 * π * r³.`;
        diagramData = { shapeType: "sphere_dimensions", params: { r } };
      }
    }
  } else if (type === "coordinate") {
    if (gradeNum < 10) {
      const x = (Math.random() > 0.5 ? 1 : -1) * (Math.floor(Math.random() * 8) + 2);
      const y = (Math.random() > 0.5 ? 1 : -1) * (Math.floor(Math.random() * 8) + 2);
      let quadrant = "";
      if (x > 0 && y > 0) quadrant = "Quadrant I (+, +)";
      else if (x < 0 && y > 0) quadrant = "Quadrant II (-, +)";
      else if (x < 0 && y < 0) quadrant = "Quadrant III (-, -)";
      else quadrant = "Quadrant IV (+, -)";

      questionText = `In which quadrant does the coordinate point P(${x}, ${y}) lie?`;
      correctAnswer = quadrant;
      options = ["Quadrant I (+, +)", "Quadrant II (-, +)", "Quadrant III (-, -)", "Quadrant IV (+, -)"].sort();
      explanation = `The coordinates are x = ${x} (${x > 0 ? "positive" : "negative"}) and y = ${y} (${y > 0 ? "positive" : "negative"}). This lies in the ${quadrant.split(" ")[0]} ${quadrant.split(" ")[1]}.`;
      hint = `Recall the quadrant signs: QI (+,+), QII (-,+), QIII (-,-), QIV (+,-).`;
      diagramData = { shapeType: "cartesian_grid", params: { x, y } };
    } else {
      const points = [
        { p1: { x: 1, y: 2 }, p2: { x: 4, y: 6 }, dist: "5 units", exp: "√((4-1)² + (6-2)²) = √(3² + 4²) = √(9+16) = √25 = 5" },
        { p1: { x: -1, y: -1 }, p2: { x: 2, y: 3 }, dist: "5 units", exp: "√((2 - -1)² + (3 - -1)²) = √(3² + 4²) = √25 = 5" },
        { p1: { x: 0, y: 0 }, p2: { x: 6, y: 8 }, dist: "10 units", exp: "√((6-0)² + (8-0)²) = √(36+64) = √100 = 10" },
        { p1: { x: 2, y: -3 }, p2: { x: -4, y: 5 }, dist: "10 units", exp: "√((-4-2)² + (5 - -3)²) = √((-6)² + 8²) = √(36+64) = √100 = 10" }
      ];
      const item = points[Math.floor(Math.random() * points.length)];
      questionText = `Find the distance between the two coordinate points A(${item.p1.x}, ${item.p1.y}) and B(${item.p2.x}, ${item.p2.y}) on the Cartesian plane.`;
      correctAnswer = item.dist;
      options = [item.dist, "6 units", "8 units", "12 units", "√50 units"].filter((v, i, arr) => arr.indexOf(v) === i).slice(0, 4).sort();
      while (options.length < 4) {
        options.push(`${Math.floor(Math.random() * 5) + 3} units`);
      }
      explanation = `The distance formula between two points (x1, y1) and (x2, y2) is d = √((x2 - x1)² + (y2 - y1)²). Plugging in the coordinates: d = ${item.exp} = ${item.dist}.`;
      hint = `Use the standard coordinate distance formula: d = √((x2-x1)² + (y2-y1)²).`;
      diagramData = { shapeType: "cartesian_segment", params: { x1: item.p1.x, y1: item.p1.y, x2: item.p2.x, y2: item.p2.y } };
    }
  }

  return {
    type,
    questionText,
    options,
    correctAnswer,
    explanation,
    hint,
    diagramData
  };
}

// ==========================================
// GAME 11: PATTERN MEMORY GRID
// ==========================================
interface PatternMemoryProps {
  difficulty: DifficultyLevel;
  onFinished: (score: number, max: number, accuracy: number) => void;
  opponentScore?: number;
  synthSound: (f: number, t?: OscillatorType, d?: number) => void;
}

function PatternMemoryGame({ difficulty, onFinished, opponentScore, synthSound }: PatternMemoryProps) {
  const getGridSize = () => {
    if (difficulty === "easy") return 3; // 3x3
    if (difficulty === "medium") return 4; // 4x4
    if (difficulty === "hard") return 5; // 5x5
    return 6; // expert 6x6
  };

  const getBasePatternLength = () => {
    if (difficulty === "easy") return 3;
    if (difficulty === "medium") return 4;
    if (difficulty === "hard") return 5;
    return 6; // expert
  };

  const gridSize = getGridSize();
  const totalTiles = gridSize * gridSize;

  const [pattern, setPattern] = useState<number[]>([]);
  const [playerPattern, setPlayerPattern] = useState<number[]>([]);
  const [round, setRound] = useState(1);
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [isDisplaying, setIsDisplaying] = useState(false);
  const [flashingTile, setFlashingTile] = useState<number | null>(null);
  const [timer, setTimer] = useState(20);
  const [hasUsedHint, setHasUsedHint] = useState(false);
  const [gameState, setGameState] = useState<"start" | "ready" | "flashing" | "playing" | "incorrect" | "gameover" | "success">("start");
  const [correctTaps, setCorrectTaps] = useState(0);
  const [totalTaps, setTotalTaps] = useState(0);

  // Stats / High score management
  const [localHigh, setLocalHigh] = useState<number>(0);
  useEffect(() => {
    const saved = localStorage.getItem(`studymate_pm_highscore_${difficulty}`);
    if (saved) setLocalHigh(parseInt(saved));
  }, [difficulty]);

  // Generate initial pattern
  const generateNewPattern = (length: number) => {
    const newPat: number[] = [];
    for (let i = 0; i < length; i++) {
      newPat.push(Math.floor(Math.random() * totalTiles));
    }
    return newPat;
  };

  // Start the game
  const startGame = () => {
    const startLen = getBasePatternLength();
    const initPat = generateNewPattern(startLen);
    setPattern(initPat);
    setPlayerPattern([]);
    setRound(1);
    setLives(3);
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setCorrectTaps(0);
    setTotalTaps(0);
    setGameState("ready");
    synthSound(300, "sine", 0.1);
  };

  // Trigger flash animation for pattern
  const playPattern = async (seq: number[]) => {
    setIsDisplaying(true);
    setGameState("flashing");
    setPlayerPattern([]);
    
    // speed gets faster with round
    const flashSpeed = Math.max(160, 600 - (round - 1) * 45);
    const gapSpeed = flashSpeed / 2;

    for (let i = 0; i < seq.length; i++) {
      const tileIndex = seq[i];
      // flash on
      setFlashingTile(tileIndex);
      synthSound(400 + (tileIndex % gridSize) * 80 + Math.floor(tileIndex / gridSize) * 40, "sine", flashSpeed / 1000 - 0.05);
      await new Promise(resolve => setTimeout(resolve, flashSpeed));
      
      // flash off
      setFlashingTile(null);
      await new Promise(resolve => setTimeout(resolve, gapSpeed));
    }

    setIsDisplaying(false);
    setGameState("playing");
    setTimer(15 + round); // generous timer based on sequence length
  };

  // Replay pattern hint
  const handleReplayHint = () => {
    if (hasUsedHint || isDisplaying || gameState !== "playing") return;
    setHasUsedHint(true);
    playPattern(pattern);
  };

  // Timer Countdown Effect
  useEffect(() => {
    if (gameState !== "playing" || isDisplaying) return;
    
    const interval = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          // Time out! Counts as an error
          handleMistake("timeout");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState, isDisplaying, pattern, round]);

  const handleMistake = (type: "timeout" | "wrong") => {
    synthSound(130, "sawtooth", 0.3);
    setCombo(0);
    setLives(prev => {
      const nextLives = prev - 1;
      if (nextLives <= 0) {
        // Game Over!
        setGameState("gameover");
        const finalAcc = totalTaps > 0 ? Math.round((correctTaps / totalTaps) * 100) : 0;
        // Save high score if beaten
        if (score > localHigh) {
          localStorage.setItem(`studymate_pm_highscore_${difficulty}`, String(score));
          setLocalHigh(score);
        }
        setTimeout(() => {
          onFinished(score, round, finalAcc);
        }, 2200);
      } else {
        setGameState("incorrect");
        setTimeout(() => {
          setGameState("ready");
        }, 1200);
      }
      return nextLives;
    });
  };

  // When state is "ready", give player a brief countdown or start button
  useEffect(() => {
    if (gameState === "ready") {
      const timeout = setTimeout(() => {
        playPattern(pattern);
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [gameState, pattern]);

  const handleTileClick = (index: number) => {
    if (isDisplaying || gameState !== "playing") return;

    setTotalTaps(prev => prev + 1);
    const expected = pattern[playerPattern.length];

    if (index === expected) {
      // Correct click
      const newPlayerPat = [...playerPattern, index];
      setPlayerPattern(newPlayerPat);
      setCorrectTaps(prev => prev + 1);
      
      const newCombo = combo + 1;
      setCombo(newCombo);
      setMaxCombo(prev => Math.max(prev, newCombo));

      // play note
      synthSound(500 + playerPattern.length * 60, "sine", 0.08);

      // Check if finished pattern
      if (newPlayerPat.length === pattern.length) {
        // Success Round!
        setGameState("success");
        const roundPoints = round * 15 + Math.floor(newCombo * 1.5);
        setScore(prev => prev + roundPoints);
        
        synthSound(880, "sine", 0.15);
        synthSound(1100, "sine", 0.15);

        // Next round prep
        setTimeout(() => {
          setRound(r => r + 1);
          setHasUsedHint(false); // reset hint for new round
          
          // add another step to pattern
          setPattern(prev => [...prev, Math.floor(Math.random() * totalTiles)]);
          setGameState("ready");
        }, 1200);
      }
    } else {
      // Mistake
      handleMistake("wrong");
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 md:p-6 rounded-3xl shadow-sm text-center space-y-5">
      {gameState === "start" && (
        <div className="py-8 space-y-4">
          <div className="w-16 h-16 bg-pink-100 dark:bg-pink-950/40 text-pink-500 rounded-2xl flex items-center justify-center mx-auto text-3xl animate-bounce">
            🔲
          </div>
          <div>
            <h4 className="text-xl font-black text-slate-800 dark:text-slate-100">Pattern Memory Grid</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Watch the grid tiles light up, remember the exact sequence, and tap them in order. Each level adds one more step!
            </p>
          </div>
          
          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl max-w-xs mx-auto text-left text-xs space-y-1.5 border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between">
              <span className="text-slate-400 font-semibold">DIFFICULTY:</span>
              <span className="font-black text-pink-500 uppercase">{difficulty}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-semibold">GRID SCALE:</span>
              <span className="font-bold">{gridSize}x{gridSize} ({totalTiles} tiles)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-semibold">HIGH SCORE:</span>
              <span className="font-bold text-amber-500">{localHigh} Pts</span>
            </div>
          </div>

          <button
            onClick={startGame}
            className="w-full max-w-xs py-3 px-6 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-black rounded-2xl shadow-md hover:opacity-90 active:scale-98 transition-all cursor-pointer flex items-center justify-center space-x-2"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>START RECALL</span>
          </button>
        </div>
      )}

      {gameState !== "start" && (
        <div className="space-y-4">
          {/* Top Status Indicators */}
          <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl text-xs font-bold text-slate-500 border border-slate-100 dark:border-slate-800/20">
            <div className="flex flex-col items-center justify-center">
              <span className="text-[9px] text-slate-400">ROUND</span>
              <span className="text-sm font-black text-slate-800 dark:text-slate-100">{round}</span>
            </div>
            <div className="flex flex-col items-center justify-center border-x border-slate-200 dark:border-slate-800">
              <span className="text-[9px] text-slate-400">LIVES</span>
              <span className="text-sm tracking-wider font-semibold text-rose-500">
                {"❤️".repeat(lives)}{"🖤".repeat(3 - lives)}
              </span>
            </div>
            <div className="flex flex-col items-center justify-center">
              <span className="text-[9px] text-slate-400">TIME</span>
              <span className={`text-sm font-black transition-colors ${timer <= 4 ? "text-rose-500 animate-pulse" : "text-amber-500"}`}>
                {gameState === "playing" ? `${timer}s` : "--"}
              </span>
            </div>
          </div>

          {/* Score & Combo */}
          <div className="flex justify-between items-center px-2">
            <div className="text-left">
              <span className="text-[10px] text-slate-400 font-semibold block uppercase">SCORE</span>
              <span className="text-lg font-black text-amber-500">{score} <span className="text-xs text-slate-400 font-semibold">Pts</span></span>
            </div>
            {combo > 0 && (
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-purple-100 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 text-xs font-black py-1 px-3 rounded-full flex items-center space-x-1 border border-purple-200 dark:border-purple-900/30 shadow-sm"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>COMBO x{combo}</span>
              </motion.div>
            )}
          </div>

          {/* Main Visual Hint Overlay */}
          <div className="h-6 flex items-center justify-center text-xs font-extrabold">
            {gameState === "ready" && <span className="text-indigo-500 animate-pulse">Get ready...</span>}
            {gameState === "flashing" && <span className="text-purple-600 dark:text-purple-400 animate-pulse flex items-center space-x-1.5"><span>🔮</span> <span>Watch pattern carefully...</span></span>}
            {gameState === "playing" && <span className="text-emerald-500">Your turn! Repeat the pattern</span>}
            {gameState === "incorrect" && <span className="text-rose-500 animate-bounce">❌ Oops! Incorrect step</span>}
            {gameState === "success" && <span className="text-emerald-500 flex items-center space-x-1"><span>✨</span> <span>Excellent! Level Clear!</span></span>}
            {gameState === "gameover" && <span className="text-rose-600 font-black tracking-widest uppercase">GAME OVER</span>}
          </div>

          {/* Grid Layout Container */}
          <div 
            className="grid mx-auto gap-2 bg-slate-50 dark:bg-slate-950/40 p-3 rounded-3xl border border-slate-100 dark:border-slate-800/40 max-w-[300px]"
            style={{
              gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`
            }}
          >
            {Array.from({ length: totalTiles }).map((_, idx) => {
              const isFlashing = flashingTile === idx;
              const isCorrectInput = playerPattern.includes(idx);
              const isLastPressed = playerPattern[playerPattern.length - 1] === idx;

              return (
                <button
                  key={idx}
                  onClick={() => handleTileClick(idx)}
                  disabled={gameState !== "playing" || isDisplaying}
                  className={`
                    aspect-square rounded-2xl transition-all duration-150 relative overflow-hidden select-none cursor-pointer border
                    ${isFlashing 
                      ? "bg-purple-500 border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.7)] scale-95" 
                      : isCorrectInput && isLastPressed
                        ? "bg-emerald-400 dark:bg-emerald-500/80 border-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.5)] scale-95"
                        : "bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 active:scale-95 border-slate-100 dark:border-slate-800"
                    }
                  `}
                  id={`pm-tile-${idx}`}
                >
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono opacity-0 hover:opacity-10 dark:text-slate-400">
                    {idx + 1}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Utility Action Buttons */}
          <div className="flex space-x-3 max-w-[300px] mx-auto pt-2">
            <button
              onClick={handleReplayHint}
              disabled={hasUsedHint || gameState !== "playing" || isDisplaying}
              className={`flex-1 py-2 px-3 rounded-2xl font-bold text-xs flex items-center justify-center space-x-1 border shadow-sm transition-all cursor-pointer
                ${hasUsedHint || gameState !== "playing" || isDisplaying
                  ? "bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400 cursor-not-allowed opacity-50"
                  : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-purple-600 dark:text-purple-400"
                }
              `}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Replay Hint {hasUsedHint ? "(0/1)" : "(1/1)"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// GAME 12: SEQUENCE RECALL MASTER
// ==========================================
interface SequenceRecallProps {
  difficulty: DifficultyLevel;
  onFinished: (score: number, max: number, accuracy: number) => void;
  opponentScore?: number;
  synthSound: (f: number, t?: OscillatorType, d?: number) => void;
}

type SequenceType = "numbers" | "letters" | "colors" | "mixed";
type SequenceMode = "practice" | "timed" | "endless";

function SequenceRecallGame({ difficulty, onFinished, opponentScore, synthSound }: SequenceRecallProps) {
  const [seqType, setSeqType] = useState<SequenceType>("numbers");
  const [seqMode, setSeqMode] = useState<SequenceMode>("endless");
  const [gameState, setGameState] = useState<"menu" | "showing" | "inputting" | "feedback" | "gameover" | "win">("menu");
  
  const [level, setLevel] = useState(1);
  const [sequence, setSequence] = useState<string[]>([]);
  const [playerInput, setPlayerInput] = useState<string[]>([]);
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [correctInputs, setCorrectInputs] = useState(0);
  const [totalInputs, setTotalInputs] = useState(0);
  const [isDisplaying, setIsDisplaying] = useState(false);
  const [activeDisplayItem, setActiveDisplayItem] = useState<string | null>(null);

  // Global game timer for Timed Mode, or item timer
  const [globalTimer, setGlobalTimer] = useState(30);

  // Local storage stats keys
  const storageBestKey = `studymate_sr_best_${difficulty}`;
  const storageStreakKey = `studymate_sr_streak_${difficulty}`;
  const storageSessionKey = `studymate_sr_session_${difficulty}`;

  const [bestLevel, setBestLevel] = useState<number>(() => {
    return parseInt(localStorage.getItem(storageBestKey) || "1");
  });
  const [longestStreakGlobal, setLongestStreakGlobal] = useState<number>(() => {
    return parseInt(localStorage.getItem(storageStreakKey) || "0");
  });

  const [hasSavedSession, setHasSavedSession] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(storageSessionKey);
    if (saved) {
      setHasSavedSession(true);
    }
  }, [difficulty]);

  // Color mappings
  const colorMap: { [key: string]: { name: string; class: string; hex: string } } = {
    "R": { name: "Red", class: "bg-rose-500 border-rose-400 shadow-rose-300", hex: "#ef4444" },
    "B": { name: "Blue", class: "bg-blue-500 border-blue-400 shadow-blue-300", hex: "#3b82f6" },
    "G": { name: "Green", class: "bg-emerald-500 border-emerald-400 shadow-emerald-300", hex: "#10b981" },
    "Y": { name: "Yellow", class: "bg-amber-400 border-amber-300 shadow-amber-200", hex: "#fbbf24" },
    "P": { name: "Purple", class: "bg-purple-500 border-purple-400 shadow-purple-300", hex: "#a855f7" },
    "O": { name: "Orange", class: "bg-orange-500 border-orange-400 shadow-orange-300", hex: "#f97316" }
  };

  // Letters subset to keep UI extremely mobile clean (12 keys total)
  const lettersPool = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];
  const numbersPool = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

  // Generate random sequence item
  const getRandomItem = (type: SequenceType): string => {
    if (type === "numbers") {
      return numbersPool[Math.floor(Math.random() * numbersPool.length)];
    } else if (type === "letters") {
      return lettersPool[Math.floor(Math.random() * lettersPool.length)];
    } else if (type === "colors") {
      const keys = Object.keys(colorMap);
      return keys[Math.floor(Math.random() * keys.length)];
    } else {
      // mixed mode
      const combined = [...numbersPool, ...lettersPool];
      return combined[Math.floor(Math.random() * combined.length)];
    }
  };

  const saveCurrentSession = (currentLvl: number, currentScore: number) => {
    const state = {
      level: currentLvl,
      score: currentScore,
      seqType,
      seqMode,
      lives
    };
    localStorage.setItem(storageSessionKey, JSON.stringify(state));
    setHasSavedSession(true);
  };

  const clearSavedSession = () => {
    localStorage.removeItem(storageSessionKey);
    setHasSavedSession(false);
  };

  const resumeLastSession = () => {
    const saved = localStorage.getItem(storageSessionKey);
    if (!saved) return;
    try {
      const state = JSON.parse(saved);
      setSeqType(state.seqType);
      setSeqMode(state.seqMode);
      setLevel(state.level);
      setScore(state.score);
      setLives(state.lives);
      setStreak(0);
      setLongestStreak(0);
      setCorrectInputs(0);
      setTotalInputs(0);
      setGameState("showing");
      clearSavedSession();
      startLevelSequence(state.level, state.seqType);
    } catch (e) {
      clearSavedSession();
    }
  };

  const startNewGame = (mode: SequenceMode, type: SequenceType) => {
    setSeqType(type);
    setSeqMode(mode);
    setLevel(1);
    setScore(0);
    setStreak(0);
    setLongestStreak(0);
    setCorrectInputs(0);
    setTotalInputs(0);
    setLives(mode === "practice" ? 999 : 3);
    setGlobalTimer(30);
    setGameState("showing");
    clearSavedSession();
    startLevelSequence(1, type);
  };

  const startLevelSequence = async (lvl: number, type: SequenceType) => {
    setIsDisplaying(true);
    setPlayerInput([]);
    
    // Calculate sequence length based on difficulty and level
    const baseLength = difficulty === "easy" ? 3 : difficulty === "medium" ? 4 : difficulty === "hard" ? 5 : 6;
    const length = baseLength + (lvl - 1);

    const generated: string[] = [];
    for (let i = 0; i < length; i++) {
      generated.push(getRandomItem(type));
    }
    setSequence(generated);

    // Adaptive display duration: gets faster at higher levels
    const baseDuration = difficulty === "easy" ? 1800 : difficulty === "medium" ? 1400 : difficulty === "hard" ? 1000 : 700;
    const displayDuration = Math.max(350, baseDuration - (lvl - 1) * 60);

    // Flash items one-by-one to user
    for (let i = 0; i < generated.length; i++) {
      const item = generated[i];
      setActiveDisplayItem(item);
      
      // play item sound
      if (type === "colors") {
        const toneIndex = Object.keys(colorMap).indexOf(item);
        synthSound(400 + toneIndex * 60, "sine", displayDuration / 1000 - 0.05);
      } else {
        const code = item.charCodeAt(0);
        synthSound(400 + (code % 15) * 40, "sine", displayDuration / 1000 - 0.05);
      }

      await new Promise(resolve => setTimeout(resolve, displayDuration));
      setActiveDisplayItem(null);
      await new Promise(resolve => setTimeout(resolve, 200)); // gap
    }

    setIsDisplaying(false);
    setGameState("inputting");
  };

  // Timed Mode Global Timer
  useEffect(() => {
    if (gameState !== "inputting" && gameState !== "showing") return;
    if (seqMode !== "timed") return;

    const interval = setInterval(() => {
      setGlobalTimer(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleGameOver();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState, seqMode]);

  const handleInput = (char: string) => {
    if (isDisplaying || gameState !== "inputting") return;

    setTotalInputs(prev => prev + 1);
    const expected = sequence[playerInput.length];
    const isCorrect = char === expected;

    const nextInput = [...playerInput, char];
    setPlayerInput(nextInput);

    if (isCorrect) {
      setCorrectInputs(prev => prev + 1);
      const newStreak = streak + 1;
      setStreak(newStreak);
      setLongestStreak(prev => Math.max(prev, newStreak));
      setLongestStreakGlobal(prev => {
        const next = Math.max(prev, newStreak);
        localStorage.setItem(storageStreakKey, String(next));
        return next;
      });

      // tone
      synthSound(500 + playerInput.length * 60, "sine", 0.08);

      // Check if finished sequence
      if (nextInput.length === sequence.length) {
        setGameState("feedback");
        
        // Success
        synthSound(880, "sine", 0.15);
        
        const levelScore = level * 20 + Math.floor(streak * 2);
        setScore(prev => prev + levelScore);

        // Update Level & Best level stats
        const nextLevel = level + 1;
        setBestLevel(prev => {
          const nextBest = Math.max(prev, nextLevel);
          localStorage.setItem(storageBestKey, String(nextBest));
          return nextBest;
        });

        // Save progress for resume
        saveCurrentSession(nextLevel, score + levelScore);

        setTimeout(() => {
          setLevel(nextLevel);
          setGameState("showing");
          startLevelSequence(nextLevel, seqType);
        }, 1200);
      }
    } else {
      // Incorrect Keystroke
      synthSound(150, "sawtooth", 0.25);
      setStreak(0);
      setGameState("feedback");

      if (seqMode === "endless" || seqMode === "timed") {
        setLives(prev => {
          const nextLives = prev - 1;
          if (nextLives <= 0) {
            handleGameOver();
          } else {
            // Let them retry a fresh sequence at the same level
            setTimeout(() => {
              setGameState("showing");
              startLevelSequence(level, seqType);
            }, 1505);
          }
          return nextLives;
        });
      } else {
        // Practice Mode: Infinite retries
        setTimeout(() => {
          setGameState("showing");
          startLevelSequence(level, seqType);
        }, 1505);
      }
    }
  };

  const handleGameOver = () => {
    setGameState("gameover");
    clearSavedSession();
    const finalAcc = totalInputs > 0 ? Math.round((correctInputs / totalInputs) * 100) : 100;
    
    setTimeout(() => {
      onFinished(score, level, finalAcc);
    }, 2200);
  };

  // Keyboard support! Matches Numbers or letters
  useEffect(() => {
    if (gameState !== "inputting") return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();
      if (seqType === "numbers" && numbersPool.includes(key)) {
        handleInput(key);
      } else if (seqType === "letters" && lettersPool.includes(key)) {
        handleInput(key);
      } else if (seqType === "mixed" && [...numbersPool, ...lettersPool].includes(key)) {
        handleInput(key);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameState, seqType, playerInput, sequence]);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 md:p-6 rounded-3xl shadow-sm text-center space-y-5">
      {gameState === "menu" && (
        <div className="space-y-4">
          <div className="w-16 h-16 bg-fuchsia-100 dark:bg-fuchsia-950/40 text-fuchsia-500 rounded-2xl flex items-center justify-center mx-auto text-3xl animate-pulse">
            🔁
          </div>
          <div>
            <h4 className="text-xl font-black text-slate-800 dark:text-slate-100">Sequence Recall Master</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Remember and repeat numbers, letters, colors, or mixed symbols. The sequence length increases as you level up!
            </p>
          </div>

          {/* Options Panels */}
          <div className="space-y-3 pt-2">
            <div className="space-y-1.5 text-left">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide">1. Select Sequence Type</span>
              <div className="grid grid-cols-2 gap-2">
                {(["numbers", "letters", "colors", "mixed"] as SequenceType[]).map(t => (
                  <button
                    key={t}
                    onClick={() => {
                      setSeqType(t);
                      synthSound(400, "sine", 0.05);
                    }}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold capitalize transition-all cursor-pointer
                      ${seqType === t 
                        ? "bg-fuchsia-500 text-white border-fuchsia-400 shadow-sm" 
                        : "bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300 border-slate-100 dark:border-slate-800 hover:bg-slate-100/50"
                      }
                    `}
                  >
                    {t === "colors" ? "🎨 Colors" : t === "numbers" ? "🔢 Numbers" : t === "letters" ? "🔤 Letters" : "🔀 Mixed Mode"}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5 text-left">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide">2. Select Game Mode</span>
              <div className="grid grid-cols-3 gap-1.5">
                {(["endless", "timed", "practice"] as SequenceMode[]).map(m => (
                  <button
                    key={m}
                    onClick={() => {
                      setSeqMode(m);
                      synthSound(420, "sine", 0.05);
                    }}
                    className={`py-1.5 px-2 rounded-xl border text-[10px] font-black capitalize transition-all cursor-pointer
                      ${seqMode === m 
                        ? "bg-indigo-600 text-white border-indigo-500 shadow-sm" 
                        : "bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300 border-slate-100 dark:border-slate-800 hover:bg-slate-100/50"
                      }
                    `}
                  >
                    {m === "endless" ? "❤️ Endless" : m === "timed" ? "⏱️ Timed (30s)" : "🧘 Practice"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Leaderboard stats box */}
          <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl text-[11px] text-slate-500 space-y-1 border border-slate-100 dark:border-slate-800 flex justify-around text-center">
            <div>
              <span className="text-slate-400 block font-semibold">BEST LEVEL</span>
              <span className="font-black text-slate-800 dark:text-slate-100 text-xs">Level {bestLevel}</span>
            </div>
            <div className="border-r border-slate-200 dark:border-slate-800 my-1" />
            <div>
              <span className="text-slate-400 block font-semibold">BEST STREAK</span>
              <span className="font-black text-slate-800 dark:text-slate-100 text-xs">{longestStreakGlobal} Keys</span>
            </div>
          </div>

          <div className="flex flex-col space-y-2 pt-2">
            <button
              onClick={() => startNewGame(seqMode, seqType)}
              className="w-full py-3 bg-gradient-to-r from-fuchsia-500 to-indigo-600 text-white font-black rounded-2xl shadow-md hover:opacity-95 active:scale-98 transition-all cursor-pointer flex items-center justify-center space-x-2"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>START NEW SESSION</span>
            </button>

            {hasSavedSession && (
              <button
                onClick={resumeLastSession}
                className="w-full py-2.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40 font-extrabold rounded-2xl hover:bg-emerald-100/50 transition-all cursor-pointer flex items-center justify-center space-x-1.5"
              >
                <RefreshCw className="w-4 h-4 animate-spin-slow" />
                <span>RESUME LAST SESSION (Level {JSON.parse(localStorage.getItem(storageSessionKey) || "{}").level || 1})</span>
              </button>
            )}
          </div>

          {/* Daily Missions */}
          <div className="text-left bg-indigo-50/40 dark:bg-indigo-950/15 p-3 rounded-2xl border border-indigo-100/50 dark:border-indigo-900/30">
            <div className="flex items-center space-x-1 text-xs text-indigo-600 dark:text-indigo-400 font-extrabold pb-1.5">
              <Award className="w-4 h-4" />
              <span>DAILY MISSIONS</span>
            </div>
            <div className="space-y-1.5 text-[10px] text-slate-500">
              <div className="flex items-center justify-between">
                <span>• Match 10 colors in Colors mode</span>
                <span className="font-bold text-emerald-500">{bestLevel >= 3 ? "100% Correct ✅" : "In Progress"}</span>
              </div>
              <div className="flex items-center justify-between border-t border-indigo-100/30 dark:border-indigo-900/10 pt-1">
                <span>• Achieve a 5-step sequence in Timed Mode</span>
                <span className="font-bold text-indigo-500">{longestStreakGlobal >= 5 ? "Matched! ✅" : "Try Timed mode"}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {gameState !== "menu" && (
        <div className="space-y-4">
          {/* Top Info Header */}
          <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl text-xs font-bold text-slate-500 border border-slate-100 dark:border-slate-800/20">
            <div className="flex flex-col items-center justify-center">
              <span className="text-[9px] text-slate-400">LEVEL</span>
              <span className="text-sm font-black text-slate-800 dark:text-slate-100">{level}</span>
            </div>
            <div className="flex flex-col items-center justify-center border-x border-slate-200 dark:border-slate-800">
              <span className="text-[9px] text-slate-400">LIVES</span>
              <span className="text-sm tracking-wider font-semibold text-rose-500">
                {seqMode === "practice" ? "🧘 ∞" : `${"❤️".repeat(lives)}${"🖤".repeat(3 - lives)}`}
              </span>
            </div>
            <div className="flex flex-col items-center justify-center">
              <span className="text-[9px] text-slate-400">
                {seqMode === "timed" ? "GLOBAL TIMER" : "STREAK"}
              </span>
              <span className={`text-sm font-black transition-colors ${seqMode === "timed" && globalTimer <= 6 ? "text-rose-500 animate-pulse" : "text-slate-800 dark:text-slate-200"}`}>
                {seqMode === "timed" ? `${globalTimer}s` : `🔥 ${streak}`}
              </span>
            </div>
          </div>

          <div className="flex justify-between items-center px-1">
            <div className="text-left">
              <span className="text-[10px] text-slate-400 font-semibold block uppercase">SCORE</span>
              <span className="text-sm font-black text-amber-500">{score} Pts</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 font-semibold block uppercase">ACCURACY</span>
              <span className="text-sm font-black text-emerald-500">
                {totalInputs > 0 ? `${Math.round((correctInputs / totalInputs) * 100)}%` : "100%"}
              </span>
            </div>
          </div>

          {/* Main Display Screen */}
          <div className="h-28 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 rounded-3xl flex flex-col items-center justify-center relative p-3">
            {gameState === "showing" && (
              <div className="space-y-2">
                <span className="text-[10px] text-indigo-500 font-extrabold uppercase tracking-widest animate-pulse">MEMORIZE THIS</span>
                <div className="h-14 flex items-center justify-center">
                  {activeDisplayItem ? (
                    seqType === "colors" ? (
                      <motion.div
                        initial={{ scale: 0.3, rotate: -20 }}
                        animate={{ scale: 1, rotate: 0 }}
                        className={`w-14 h-14 rounded-full border-3 shadow-md flex items-center justify-center ${colorMap[activeDisplayItem]?.class}`}
                      >
                        <span className="text-white font-black text-xs">{colorMap[activeDisplayItem]?.name[0]}</span>
                      </motion.div>
                    ) : (
                      <motion.div
                        initial={{ scale: 0.3, y: 15 }}
                        animate={{ scale: 1, y: 0 }}
                        className="text-4xl font-black text-indigo-600 dark:text-indigo-400 font-mono tracking-widest"
                      >
                        {activeDisplayItem}
                      </motion.div>
                    )
                  ) : (
                    <span className="text-xs text-slate-400">Loading item...</span>
                  )}
                </div>
              </div>
            )}

            {gameState === "inputting" && (
              <div className="space-y-3 w-full px-4">
                <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest">REPEAT THE SEQUENCE</span>
                <div className="flex justify-center items-center gap-1.5 flex-wrap">
                  {sequence.map((_, idx) => {
                    const entered = playerInput[idx];
                    const isActive = playerInput.length === idx;
                    
                    return (
                      <div
                        key={idx}
                        className={`w-8 h-8 rounded-xl border flex items-center justify-center text-xs font-black font-mono transition-all
                          ${isActive 
                            ? "border-fuchsia-400 bg-fuchsia-50/50 dark:bg-fuchsia-950/20 scale-105 animate-pulse" 
                            : entered 
                              ? seqType === "colors" 
                                ? `${colorMap[entered]?.class} text-white`
                                : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                              : "border-slate-200 dark:border-slate-850 bg-slate-100/50 dark:bg-slate-900/30 text-slate-300"
                          }
                        `}
                      >
                        {entered ? (seqType === "colors" ? colorMap[entered]?.name[0] : entered) : "?"}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {gameState === "feedback" && (
              <div className="flex flex-col items-center justify-center space-y-2 animate-bounce">
                {streak > 0 ? (
                  <>
                    <span className="text-emerald-500 text-3xl">✨</span>
                    <span className="text-sm font-black text-emerald-500">CORRECT ANSWER!</span>
                  </>
                ) : (
                  <>
                    <span className="text-rose-500 text-3xl">❌</span>
                    <span className="text-sm font-black text-rose-500">MISTAKE! RETRYING...</span>
                  </>
                )}
              </div>
            )}

            {gameState === "gameover" && (
              <div className="flex flex-col items-center justify-center space-y-1">
                <span className="text-rose-600 text-xl font-black tracking-widest uppercase">GAME OVER</span>
                <span className="text-[10px] text-slate-400 font-semibold">Final score: {score} Pts • Accuracy: {totalInputs > 0 ? Math.round((correctInputs / totalInputs) * 100) : 100}%</span>
              </div>
            )}
          </div>

          {/* Keypads */}
          {gameState === "inputting" && (
            <div className="space-y-2">
              {seqType === "colors" && (
                <div className="grid grid-cols-3 gap-2.5 max-w-[240px] mx-auto">
                  {Object.keys(colorMap).map(k => (
                    <button
                      key={k}
                      onClick={() => handleInput(k)}
                      className={`h-11 rounded-2xl border-2 flex flex-col items-center justify-center text-[10px] font-black text-white hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-sm ${colorMap[k]?.class}`}
                    >
                      <span className="text-xs uppercase">{colorMap[k]?.name}</span>
                    </button>
                  ))}
                </div>
              )}

              {seqType === "numbers" && (
                <div className="grid grid-cols-5 gap-1.5 max-w-[280px] mx-auto">
                  {numbersPool.map(n => (
                    <button
                      key={n}
                      onClick={() => handleInput(n)}
                      className="h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 font-black text-sm active:scale-95 transition-all cursor-pointer text-slate-800 dark:text-slate-100"
                    >
                      {n}
                    </button>
                  ))}
                </div>
              )}

              {seqType === "letters" && (
                <div className="grid grid-cols-4 gap-1.5 max-w-[280px] mx-auto">
                  {lettersPool.map(l => (
                    <button
                      key={l}
                      onClick={() => handleInput(l)}
                      className="h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 font-black text-sm active:scale-95 transition-all cursor-pointer text-slate-800 dark:text-slate-100"
                    >
                      {l}
                    </button>
                  ))}
                </div>
              )}

              {seqType === "mixed" && (
                <div className="grid grid-cols-4 gap-1.5 max-w-[280px] mx-auto">
                  {/* Select 12 items (6 numbers + 6 letters) */}
                  {["1", "2", "3", "A", "4", "5", "6", "B", "C", "D", "E", "F"].map(item => (
                    <button
                      key={item}
                      onClick={() => handleInput(item)}
                      className="h-9 rounded-xl bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 font-black text-xs active:scale-95 transition-all cursor-pointer text-slate-800 dark:text-slate-100"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Reset / Quit button */}
          <div className="pt-2 flex justify-center">
            <button
              onClick={() => setGameState("menu")}
              className="py-1.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all cursor-pointer"
            >
              Quit to Menu
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


