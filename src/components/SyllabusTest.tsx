import React, { useState, useEffect } from "react";
import { TEST_BANKS, TestQuestion, SYLLABUS_DB } from "../syllabusData";
import { UserProfile } from "../types";
import { motion, AnimatePresence } from "motion/react";
import PremiumErrorCard from "./PremiumErrorCard";
import { 
  GlassCard, HeroCard, QuickActionCard, ProgressCard, AnalyticsCard, 
  AchievementCard, AICard, TimelineCard, EmptyStateCard, PremiumButton, 
  PremiumInput, PremiumDialog, PremiumBottomSheet, PremiumIcon, PremiumCard 
} from "./PremiumUI";
import { 
  Award, Clock, CheckCircle2, AlertCircle, BookOpen, 
  HelpCircle, Sparkles, ChevronRight, RefreshCw, Volume2, ShieldCheck,
  Filter, Play, Trash2, Lock, Flame, Zap, Trophy, Star, Check, HelpCircle as HelpIcon, Lightbulb
} from "lucide-react";
import { getDifficult50Questions } from "../difficultTestBank";
import Confetti from "./Confetti";

// Client-side daily challenge questions generator based on class, subject, and chapter selection
const generateDailyChallengeQuestions = (subject: string, chapter: string, dayIndex: number) => {
  const sub = subject.toLowerCase();
  
  if (sub.includes("math")) {
    return [
      {
        question: `Which of the following representation methods is most fundamental for equations and values in "${chapter}"?`,
        options: [
          "Linear and quadratic standardized coefficient mappings",
          "Continuous proportionality checking",
          "Symmetric balance and variable isolated evaluation",
          "All of the above"
        ],
        correctAnswer: 3,
        explanation: `In CBSE Mathematics, establishing variable balances, handling coefficient mappings, and resolving equations are core foundations for chapters like ${chapter}.`
      },
      {
        question: `Solve this active recall equation: If we double the variable and add 5, resulting in 25, what is the value of x?`,
        options: ["x = 5", "x = 10", "x = 15", "x = 20"],
        correctAnswer: 1,
        explanation: "Setting up the equation: 2x + 5 = 25. Subtracting 5 from both sides gives 2x = 20, which simplifies directly to x = 10."
      },
      {
        question: `Assertion (A): The value of a mathematical ratio or variable coefficient in "${chapter}" is independent of the system of measurement units. \nReason (R): Dimensionless ratios are universal constant descriptors.`,
        options: [
          "Both A and R are true, and R is the correct explanation of A.",
          "Both A and R are true, but R is not the correct explanation of A.",
          "A is true, but R is false.",
          "A is false, but R is true."
        ],
        correctAnswer: 0,
        explanation: "The values and ratios in CBSE mathematics are dimensionless coefficients. Thus, they are constant regardless of measurement systems. (R) correctly explains (A)."
      }
    ];
  } else if (sub.includes("science")) {
    return [
      {
        question: `Which of the following processes is most critical to understanding the core scientific phenomena of "${chapter}"?`,
        options: [
          "Catalytic metabolic cellular conversion",
          "Direct molecular diffusion across gradients",
          "Law of conservation of energy and mass transfer",
          "All of the above"
        ],
        correctAnswer: 3,
        explanation: "CBSE Science chapters are deeply rooted in physical conservation laws, cellular structures, and thermodynamic mechanics."
      },
      {
        question: `What is the principal unit or reaction element primarily investigated in "${chapter}"?`,
        options: [
          "Molecules / ATP / Chemical compounds",
          "Force / Newton / Kinetic Energy units",
          "Empirical observation data and reactant formulas",
          "Depends on specific chapter context"
        ],
        correctAnswer: 3,
        explanation: "CBSE evaluations test your deep structural understanding of context-specific scientific properties, formulas, and phenomena."
      },
      {
        question: `Assertion (A): The chemical or physical laws explained in "${chapter}" can be actively observed in everyday surroundings. \nReason (R): Natural sciences exist to model and explain empirical real-world observations.`,
        options: [
          "Both A and R are true, and R is the correct explanation of A.",
          "Both A and R are true, but R is not the correct explanation of A.",
          "A is true, but R is false.",
          "A is false, but R is true."
        ],
        correctAnswer: 0,
        explanation: "Empirical physical laws describe day-to-day mechanisms. Therefore, both Assertion and Reason are true, and R serves as the direct logical explanation."
      }
    ];
  } else {
    // General humanities & fallback languages
    return [
      {
        question: `What is the chief educational objective of analyzing "${chapter}" in ${subject}?`,
        options: [
          "To analyze historical, social, and literary context and significance",
          "To memorize static timelines without contextual linkages",
          "To learn advanced mathematical algorithms",
          "To practice coding parameters and compiler execution flags"
        ],
        correctAnswer: 0,
        explanation: `Social studies and general humanities focus on developing analytical context, social critical thinking, and summary skills regarding ${chapter}.`
      },
      {
        question: `Which memorization and retention strategy is most effective for mastering "${chapter}"?`,
        options: [
          "Passive multi-reading of the textbook several times",
          "Active recall, self-testing, and concept summarization",
          "Skipping all exercises and practice questions",
          "Direct rote duplication of study material answers"
        ],
        correctAnswer: 1,
        explanation: "Active recall is scientifically proven to establish stronger neural path connections for long-term retention."
      },
      {
        question: `Assertion (A): Building solid conceptual clarity on "${chapter}" enhances overall CBSE board score outcomes. \nReason (R): CBSE examinations are structured around competency-based questions rather than rote repetition.`,
        options: [
          "Both A and R are true, and R is the correct explanation of A.",
          "Both A and R are true, but R is not the correct explanation of A.",
          "A is true, but R is false.",
          "A is false, but R is true."
        ],
        correctAnswer: 0,
        explanation: "Competency examinations require real understanding rather than memorization. Hence, both are true and R perfectly explains A."
      }
    ];
  }
};

interface SyllabusTestProps {
  profile: UserProfile;
  onAwardXP: (xpAmount: number) => void;
  onAddNotification: (title: string, message: string, type: "info" | "alert" | "success" | "reminder") => void;
  onIncrementStreak?: () => void;
}

// Custom function to return available subjects for any class
const getSubjectsForClass = (grade: string): string[] => {
  const matched = SYLLABUS_DB.find(s => s.grade.toLowerCase() === grade.toLowerCase());
  if (matched) {
    return matched.subjects.map(sub => sub.subject);
  }
  // Fallbacks for Class 6, 7, 8
  return ["Mathematics", "Science", "Social Science", "English"];
};

// Custom function to return available chapters for any class and subject
const getChaptersForSubject = (grade: string, subject: string): string[] => {
  const matchedClass = SYLLABUS_DB.find(s => s.grade.toLowerCase() === grade.toLowerCase());
  if (matchedClass) {
    const matchedSub = matchedClass.subjects.find(sub => sub.subject.toLowerCase() === subject.toLowerCase());
    if (matchedSub) {
      return matchedSub.chapters.map(ch => ch.title);
    }
  }
  
  // Custom Fallbacks for Class 6, 7, 8 or custom subjects
  const lowerGrade = grade.toLowerCase();
  const lowerSub = subject.toLowerCase();
  
  if (lowerGrade.includes("6")) {
    if (lowerSub.includes("math")) {
      return ["Knowing Our Numbers", "Whole Numbers", "Playing with Numbers", "Basic Geometrical Ideas", "Understanding Elementary Shapes", "Integers", "Fractions", "Decimals", "Data Handling", "Mensuration", "Algebra", "Ratio and Proportion"];
    }
    if (lowerSub.includes("science")) {
      return ["Components of Food", "Sorting Materials Into Groups", "Separation of Substances", "Getting to Know Plants", "Body Movements", "The Living Organisms and Their Surroundings", "Motion and Measurement of Distances", "Light, Shadows and Reflections", "Electricity and Circuits", "Fun with Magnets", "Air Around Us"];
    }
    return ["Chapter 1: Foundational Core", "Chapter 2: Concept Analysis", "Chapter 3: Interactive Practice", "Chapter 4: Chapter Summary Review"];
  }
  
  if (lowerGrade.includes("7")) {
    if (lowerSub.includes("math")) {
      return ["Integers", "Fractions and Decimals", "Data Handling", "Simple Equations", "Lines and Angles", "The Triangle and its Properties", "Congruence of Triangles", "Comparing Quantities", "Rational Numbers", "Practical Geometry", "Perimeter and Area", "Algebraic Expressions", "Exponents and Powers", "Symmetry", "Visualising Solid Shapes"];
    }
    if (lowerSub.includes("science")) {
      return ["Nutrition in Plants", "Nutrition in Animals", "Heat", "Acids, Bases and Salts", "Physical and Chemical Changes", "Respiration in Organisms", "Transportation in Animals and Plants", "Reproduction in Plants", "Motion and Time", "Electric Current and its Effects", "Light", "Forests: Our Lifeline", "Wastewater Story"];
    }
    return ["Chapter 1: Foundational Core", "Chapter 2: Concept Analysis", "Chapter 3: Interactive Practice", "Chapter 4: Chapter Summary Review"];
  }
  
  if (lowerGrade.includes("8")) {
    if (lowerSub.includes("math")) {
      return ["Rational Numbers", "Linear Equations in One Variable", "Understanding Quadrilaterals", "Practical Geometry", "Data Handling", "Squares and Square Roots", "Cubes and Cube Roots", "Comparing Quantities", "Algebraic Expressions and Identities", "Visualising Solid Shapes", "Mensuration", "Exponents and Powers", "Direct and Inverse Proportions", "Factorisation", "Introduction to Graphs", "Playing with Numbers"];
    }
    if (lowerSub.includes("science")) {
      return ["Crop Production and Management", "Microorganisms: Friend and Foe", "Coal and Petroleum", "Combustion and Flame", "Conservation of Plants and Animals", "Cell - Structure and Functions", "Reproduction in Animals", "Reaching the Age of Adolescence", "Force and Pressure", "Friction", "Sound", "Chemical Effects of Electric Current", "Some Natural Phenomena", "Light", "Stars and the Solar System", "Pollution of Air and Water"];
    }
    return ["Chapter 1: Foundational Core", "Chapter 2: Concept Analysis", "Chapter 3: Interactive Practice", "Chapter 4: Chapter Summary Review"];
  }
  
  return ["Chapter 1: Foundational Core", "Chapter 2: Concept Analysis", "Chapter 3: Interactive Practice", "Chapter 4: Chapter Summary Review"];
};

export default function SyllabusTest({ 
  profile, 
  onAwardXP, 
  onAddNotification,
  onIncrementStreak 
}: SyllabusTestProps) {
  const storageKeyPrefix = `studymate_${profile.emailAddress.replace(/[^a-zA-Z0-9]/g, "_")}`;

  // Interactive filtering states
  const [selectedClass, setSelectedClass] = useState<string>(profile.classGrade || "Class 10");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedChapter, setSelectedChapter] = useState<string>("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<"Easy" | "Medium" | "Hard" | "Expert">("Medium");
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Auto update selectors based on Class and Subject
  useEffect(() => {
    const subjects = getSubjectsForClass(selectedClass);
    const initialSubject = subjects[0] || "";
    setSelectedSubject(initialSubject);
  }, [selectedClass]);

  useEffect(() => {
    if (selectedSubject) {
      const chapters = getChaptersForSubject(selectedClass, selectedSubject);
      setSelectedChapter(chapters[0] || "");
    } else {
      setSelectedChapter("");
    }
  }, [selectedClass, selectedSubject]);

  // Track served counts for the selected category
  const [servedCount, setServedCount] = useState<number>(0);

  const getCacheKeyForCurrentSelection = () => {
    return `${storageKeyPrefix}_served_ids_${selectedClass.replace(/\s+/g, "_")}_${selectedSubject.replace(/\s+/g, "_")}_${selectedChapter.replace(/\s+/g, "_")}_${selectedDifficulty}`;
  };

  const updateServedCount = () => {
    try {
      const key = getCacheKeyForCurrentSelection();
      const saved = localStorage.getItem(key);
      const list = saved ? JSON.parse(saved) : [];
      setServedCount(list.length);
    } catch {
      setServedCount(0);
    }
  };

  useEffect(() => {
    if (selectedClass && selectedSubject && selectedChapter && selectedDifficulty) {
      updateServedCount();
    }
  }, [selectedClass, selectedSubject, selectedChapter, selectedDifficulty]);

  // Days elapsed state (saves to localStorage, defaults to 0)
  const [daysElapsed, setDaysElapsed] = useState<number>(() => {
    const savedStart = localStorage.getItem(`${storageKeyPrefix}_cycle_start_time`);
    let startTime = savedStart ? parseInt(savedStart) : 0;
    if (!savedStart) {
      startTime = Date.now();
      localStorage.setItem(`${storageKeyPrefix}_cycle_start_time`, String(startTime));
    }
    const diffDays = Math.floor((Date.now() - startTime) / (1000 * 60 * 60 * 24));
    const savedDays = localStorage.getItem(`${storageKeyPrefix}_days_elapsed`);
    const manualDays = savedDays ? parseInt(savedDays) : 0;
    return Math.min(Math.max(diffDays, manualDays), 10);
  });

  const [hasTriggeredEarlyThisCycle, setHasTriggeredEarlyThisCycle] = useState<boolean>(() => {
    return localStorage.getItem(`${storageKeyPrefix}_triggered_early_this_cycle`) === "true";
  });

  const [showXpUnlockModal, setShowXpUnlockModal] = useState(false);

  const [testHistory, setTestHistory] = useState<any[]>(() => {
    const saved = localStorage.getItem(`${storageKeyPrefix}_test_history`);
    return saved ? JSON.parse(saved) : [];
  });

  // Active exam states
  const [activeTest, setActiveTest] = useState<any[] | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [showAnswerResult, setShowAnswerResult] = useState(false);
  const [testCompleted, setTestCompleted] = useState(false);
  const [score, setScore] = useState(0);
  const [isSimulated, setIsSimulated] = useState(false);
  const [showStartNotice, setShowStartNotice] = useState(false);
  const [isSimulatedNext, setIsSimulatedNext] = useState(false);
  const [acceptedNoticeRules, setAcceptedNoticeRules] = useState(false);
  const [examTypeToStart, setExamTypeToStart] = useState<"20q" | "50q" | "dynamic">("dynamic");

  // Daily challenge states
  const [showDailyChallengeModal, setShowDailyChallengeModal] = useState(false);
  const [dailyChallengeQuestions, setDailyChallengeQuestions] = useState<any[]>([]);
  const [currentDailyQuestionIdx, setCurrentDailyQuestionIdx] = useState(0);
  const [dailyAnswers, setDailyAnswers] = useState<Record<number, number>>({});
  const [dailyChallengeSubmitted, setDailyChallengeSubmitted] = useState(false);
  const [dailyChallengeScore, setDailyChallengeScore] = useState(0);
  const [aiRecommendation, setAiRecommendation] = useState<string>("");
  const [isLoadingAiRec, setIsLoadingAiRec] = useState(false);
  const [triggerChallengeConfetti, setTriggerChallengeConfetti] = useState(false);
  const [showCompletedTimeline, setShowCompletedTimeline] = useState(false);

  // Daily challenge action handlers
  const handleLaunchDailyChallenge = () => {
    const qCount = generateDailyChallengeQuestions(selectedSubject, selectedChapter, daysElapsed);
    setDailyChallengeQuestions(qCount);
    setCurrentDailyQuestionIdx(0);
    setDailyAnswers({});
    setDailyChallengeSubmitted(false);
    setDailyChallengeScore(0);
    setAiRecommendation("");
    setIsLoadingAiRec(false);
    setShowDailyChallengeModal(true);
    playSound(600, "sine", 0.08);
  };

  const handleSelectDailyAnswer = (idx: number) => {
    if (dailyChallengeSubmitted) return; // Prevent changing after submission
    setDailyAnswers({
      ...dailyAnswers,
      [currentDailyQuestionIdx]: idx
    });
    playSound(520, "triangle", 0.05);
  };

  const loadAiRecommendation = async (newDays: number, quizScore: number) => {
    setIsLoadingAiRec(true);
    setAiRecommendation("");
    try {
      const token = localStorage.getItem("studymate_token") || "";
      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers,
        body: JSON.stringify({
          message: `I am a CBSE student in grade ${profile.classGrade}. I just completed Day ${daysElapsed + 1} of my exam preparation timeline for the subject "${selectedSubject}" (specifically the chapter: "${selectedChapter}"). On my 3-question active recall mini-challenge today, I scored ${quizScore}/3. Please give me 3 highly targeted study recommendations, memorization techniques, and conceptual tips to master this topic for my boards.`
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.reply) {
          setAiRecommendation(data.reply);
          return;
        }
      }
      throw new Error("Failed to fetch recommendation");
    } catch (err) {
      console.error("AI recommendation error:", err);
      const fallbacks = [
        `💡 Focus on core concepts of "${selectedChapter}". Write down all formulas or key definitions 3 times from memory to reinforce retention.`,
        `💡 Try teaching this topic to a classmate or explanation partner. Explaining concepts in your own words builds robust logical paths.`,
        `💡 Review previous year board questions for ${selectedSubject}. Highlight common CBSE mark-scheme trick areas.`,
        `💡 Complete the mock assessment of 10 questions on StudyMate with a target accuracy of >85% for elite confidence!`
      ];
      setAiRecommendation(fallbacks[Math.floor(Math.random() * fallbacks.length)] + "\n\n💡 Maintain your daily streak to achieve complete syllabus mastery!");
    } finally {
      setIsLoadingAiRec(false);
    }
  };

  const handleNextDailyQuestion = () => {
    if (currentDailyQuestionIdx < dailyChallengeQuestions.length - 1) {
      setCurrentDailyQuestionIdx(currentDailyQuestionIdx + 1);
      playSound(550, "sine", 0.05);
    } else {
      // Complete! Calculate score
      let scoreCount = 0;
      dailyChallengeQuestions.forEach((q, idx) => {
        if (dailyAnswers[idx] === q.correctAnswer) {
          scoreCount++;
        }
      });
      setDailyChallengeScore(scoreCount);
      setDailyChallengeSubmitted(true);
      
      // Increment Day
      const newDays = Math.min(daysElapsed + 1, 10);
      setDaysElapsed(newDays);
      localStorage.setItem(`${storageKeyPrefix}_days_elapsed`, String(newDays));
      
      // Award XP
      const xpReward = 30 + (scoreCount * 10);
      onAwardXP(xpReward);
      
      // Notification
      onAddNotification(
        "🏆 Daily Challenge Complete!", 
        `You completed the Day ${daysElapsed + 1} challenge with ${scoreCount}/3 score. +${xpReward} XP awarded!`, 
        "success"
      );
      
      // Confetti!
      setTriggerChallengeConfetti(true);
      playSound(800, "sine", 0.1);
      
      // Load AI Recommendation
      loadAiRecommendation(newDays, scoreCount);
    }
  };

  // Launch dynamic customized assessment
  const handleLaunchDynamicAssessment = async () => {
    if (!selectedClass || !selectedSubject || !selectedChapter || !selectedDifficulty) {
      setLoadError("Please select all filters first.");
      return;
    }

    setIsLoadingQuestions(true);
    setLoadError(null);
    playSound(520, "sine", 0.15);

    try {
      const token = localStorage.getItem("studymate_token") || "";
      const cacheKey = getCacheKeyForCurrentSelection();
      const savedServedIds = localStorage.getItem(cacheKey);
      const servedIds: string[] = savedServedIds ? JSON.parse(savedServedIds) : [];

      const response = await fetch("/api/quiz/questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          classGrade: selectedClass,
          subject: selectedSubject,
          chapter: selectedChapter,
          difficulty: selectedDifficulty,
          excludeIds: servedIds,
          count: questionCount
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch custom assessment questions.");
      }

      const data = await response.json();
      if (data.success && Array.isArray(data.questions) && data.questions.length > 0) {
        setIsSimulated(false);
        setActiveTest(data.questions);
        setCurrentQuestionIndex(0);
        setSelectedAnswers({});
        setShowAnswerResult(false);
        setTestCompleted(false);
        setScore(0);

        onAddNotification(
          "✍️ Dynamic Assessment Started",
          `You have started a custom ${questionCount}-question dynamic test for ${selectedClass} ${selectedSubject} (${selectedChapter}) - ${selectedDifficulty} level.`,
          "info"
        );
      } else {
        throw new Error("No questions returned for this selection. Try adjusting filters.");
      }
    } catch (err: any) {
      console.error("Failed to start assessment:", err);
      setLoadError(err.message || "An unexpected error occurred. Please try again.");
      onAddNotification("❌ Quiz Startup Failed", err.message || "Could not retrieve questions.", "alert");
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  const triggerStartExam = (force = false) => {
    setIsSimulatedNext(force);
    setExamTypeToStart("20q");
    setAcceptedNoticeRules(false);
    setShowStartNotice(true);
    playSound(480, "sine", 0.15);
  };

  const triggerStart50QuestionExamNotice = () => {
    setIsSimulatedNext(false);
    setExamTypeToStart("50q");
    setAcceptedNoticeRules(false);
    setShowStartNotice(true);
    playSound(480, "sine", 0.15);
  };

  // Sound effects helper
  const playSound = (freq: number, type: OscillatorType = "sine", duration = 0.15) => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      // Ignore audio failure
    }
  };

  // Trigger days increment (simulating time passing)
  const handleIncrementDay = () => {
    const nextDays = daysElapsed + 1;
    setDaysElapsed(nextDays);
    localStorage.setItem(`${storageKeyPrefix}_days_elapsed`, String(nextDays));
    playSound(400, "triangle", 0.1);

    if (nextDays === 10) {
      triggerTestNotification();
    }
  };

  const triggerTestNotification = () => {
    onAddNotification(
      "📝 10-Day Syllabus Test Unlocked!",
      `A new comprehensive revision test of 20 high-impact questions has been generated based on your CBSE ${profile.classGrade} syllabus. Test your limits!`,
      "alert"
    );
    playSound(600, "sine", 0.3);
  };

  // Generate full 20 questions exam for current syllabus
  const handleStartExam = (force = false) => {
    if (daysElapsed < 10 && !force) return;

    setIsSimulated(force);
    // Find questions matching user's class
    const gradeKey = profile.classGrade || "Class 10";
    const baseQuestions = TEST_BANKS[gradeKey] || TEST_BANKS["Class 10"];
    
    // Mix and replicate questions if necessary to fill up to 20 total questions as requested
    let examSet: TestQuestion[] = [...baseQuestions];
    while (examSet.length < 20) {
      examSet = examSet.concat(baseQuestions.map((q, idx) => ({
        ...q,
        id: `${q.id}-dup-${idx}-${examSet.length}`
      })));
    }
    
    // Slice exactly at 20 questions
    examSet = examSet.slice(0, 20);

    setActiveTest(examSet);
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setShowAnswerResult(false);
    setTestCompleted(false);
    setScore(0);

    onAddNotification(
      "✍️ Exam Started",
      "You are now taking the 20-question CBSE Board Exam mock test. Do not close this tab!",
      "info"
    );
    playSound(520, "sine", 0.2);
  };

  const handleStart50QuestionExam = () => {
    const gradeKey = profile.classGrade || "Class 10";
    const examSet = getDifficult50Questions(gradeKey);
    
    setIsSimulated(false);
    setActiveTest(examSet);
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setShowAnswerResult(false);
    setTestCompleted(false);
    setScore(0);

    onAddNotification(
      "🔥 50-Question Exam Started",
      "You are now taking the 50-question CBSE Syllabus Ultimate Challenge. Maximum focus required!",
      "alert"
    );
    playSound(600, "sine", 0.35);
  };

  const handleSelectOption = (optionIndex: number) => {
    const currentQ = activeTest?.[currentQuestionIndex];
    if (!currentQ) return;

    setSelectedAnswers({
      ...selectedAnswers,
      [currentQ.id]: optionIndex
    });
    playSound(450, "sine", 0.05);
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      playSound(500, "sine", 0.08);
    }
  };

  const handleNextQuestion = () => {
    if (!activeTest) return;
    if (currentQuestionIndex < activeTest.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      playSound(500, "sine", 0.08);
    }
  };

  const handleCompleteExam = () => {
    if (!activeTest) return;
    
    // Evaluate total score
    let calculatedScore = 0;
    activeTest.forEach((q) => {
      if (selectedAnswers[q.id] === q.correctAnswer) {
        calculatedScore += 1;
      }
    });
    
    setScore(calculatedScore);
    setTestCompleted(true);
    
    // Calculate final score percentage
    const finalScorePercent = Math.round((calculatedScore / activeTest.length) * 100);
    
    // Determine if it is the 50-question test
    const isLongTest = activeTest.length === 50;
    const isDynamic = activeTest[0] && !activeTest[0].id.includes("elite-base") && !activeTest[0].id.includes("dup") && !activeTest[0].id.includes("mock-fallback");
    
    // Award XP rewards (Higher scaling for 50-question challenge)
    const xpReward = isLongTest 
      ? 300 + (calculatedScore * 15) 
      : 150 + (calculatedScore * 10);
    onAwardXP(xpReward);

    // Save served IDs to exclude them from future sessions
    if (activeTest.length > 0 && isDynamic) {
      const classKey = activeTest[0].classGrade || selectedClass;
      const subKey = activeTest[0].subject || selectedSubject;
      const chKey = activeTest[0].chapter || selectedChapter;
      const diffKey = activeTest[0].difficulty || selectedDifficulty;

      const cacheKey = `${storageKeyPrefix}_served_ids_${classKey.replace(/\s+/g, "_")}_${subKey.replace(/\s+/g, "_")}_${chKey.replace(/\s+/g, "_")}_${diffKey}`;
      
      const savedServedIds = localStorage.getItem(cacheKey);
      let servedIds: string[] = savedServedIds ? JSON.parse(savedServedIds) : [];
      
      const newQuestionIds = activeTest.map(q => q.id);
      servedIds = Array.from(new Set([...servedIds, ...newQuestionIds]));
      
      localStorage.setItem(cacheKey, JSON.stringify(servedIds));
      updateServedCount();
    }

    // Save test history record
    let displayTitle = `${profile.classGrade} Exam`;
    if (isLongTest) {
      displayTitle = "Ultimate 50Q Board Challenge";
    } else if (isDynamic) {
      displayTitle = `${activeTest[0].subject}: ${activeTest[0].chapter} (${activeTest[0].difficulty})`;
    }

    const newRecord = {
      id: `test-${Date.now()}`,
      grade: profile.classGrade,
      title: displayTitle,
      date: new Date().toISOString().split("T")[0],
      score: `${calculatedScore}/${activeTest.length}`,
      percentage: finalScorePercent,
      xpEarned: xpReward,
      isLongTest: isLongTest
    };

    const nextHistory = [newRecord, ...testHistory];
    setTestHistory(nextHistory);
    localStorage.setItem(`${storageKeyPrefix}_test_history`, JSON.stringify(nextHistory));

    // Reset 10 day timeline countdown ONLY if they took the standard 10-day test
    if (!isLongTest && !isDynamic) {
      setDaysElapsed(0);
      localStorage.setItem(`${storageKeyPrefix}_days_elapsed`, "0");
      localStorage.setItem(`${storageKeyPrefix}_cycle_start_time`, String(Date.now()));
      setHasTriggeredEarlyThisCycle(false);
      localStorage.setItem(`${storageKeyPrefix}_triggered_early_this_cycle`, "false");
    }

    // Boost login streak
    if (onIncrementStreak) {
      onIncrementStreak();
    }

    onAddNotification(
      isLongTest ? "🏆 Ultimate 50-Question Challenge Completed!" : "🏆 Assessment Accomplished!",
      `Incredible job! You completed your assessment with a score of ${calculatedScore}/${activeTest.length} (${finalScorePercent}%). Earned +${xpReward} XP!`,
      "success"
    );

    playSound(950, "sine", 0.4);
  };

  const handleClearServedCache = () => {
    if (window.confirm("Are you sure you want to reset served question IDs for this chapter selection? This will allow reshuffling and reusing questions from the start.")) {
      const key = getCacheKeyForCurrentSelection();
      localStorage.removeItem(key);
      updateServedCount();
      onAddNotification("🔄 Selection Reset Successful", "All questions in this specific category can now be served again.", "success");
      playSound(450, "sine", 0.1);
    }
  };

  // Helper to get visually stunning badges depending on question format type
  const getQuestionTypeBadge = (type: string) => {
    switch (type) {
      case "assertion-reason":
        return <span className="bg-sky-500 text-white font-black text-[9px] px-2 py-0.5 rounded uppercase tracking-wider">Assertion-Reason</span>;
      case "case-based":
        return <span className="bg-amber-500 text-slate-950 font-black text-[9px] px-2 py-0.5 rounded uppercase tracking-wider">Case-Based Study</span>;
      case "match-following":
        return <span className="bg-pink-500 text-white font-black text-[9px] px-2 py-0.5 rounded uppercase tracking-wider">Match Column</span>;
      case "numerical":
        return <span className="bg-emerald-500 text-white font-black text-[9px] px-2 py-0.5 rounded uppercase tracking-wider">Numerical Analysis</span>;
      default:
        return <span className="bg-indigo-500 text-white font-black text-[9px] px-2 py-0.5 rounded uppercase tracking-wider">MCQ</span>;
    }
  };

  return (
    <div id="syllabus_test_view" className="space-y-6">
      
      {/* 📋 TEST START NOTICE GUIDELINES MODAL */}
      <AnimatePresence>
        {showStartNotice && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 text-left"
            >
              <div className="flex items-center space-x-3 text-indigo-600 dark:text-indigo-400">
                <span className="text-3xl">{examTypeToStart === "50q" ? "🔥" : "📝"}</span>
                <div>
                  <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-50">
                    {examTypeToStart === "50q" ? "50Q PYQ Ultimate Challenge Guidelines" : "10-Day 20Q Syllabus Test Guidelines"}
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">Please review the syllabus test structure and critical guidelines before starting.</p>
                </div>
              </div>

              <div className="space-y-3.5 bg-slate-50 dark:bg-slate-950 p-4.5 rounded-2xl border border-slate-100 dark:border-slate-850">
                <span className="text-[10px] font-black uppercase text-indigo-500 tracking-wider block">Key Exam Features</span>
                
                <div className="space-y-3">
                  <div className="flex items-start space-x-2.5">
                    <span className="text-sm mt-0.5">🎯</span>
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {examTypeToStart === "50q" ? "50 High-Difficulty Board Level Questions" : "20 High-Impact Mapped Questions"}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {examTypeToStart === "50q" 
                          ? "This mock test contains 50 rigorous questions hand-selected from CBSE previous years' board exam papers."
                          : "Every test pulls exactly 20 syllabus-specific MCQ questions mapped strictly to your CBSE curriculum."}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2.5">
                    <span className="text-sm mt-0.5">⏱️</span>
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">No Strict Time Limit, but Speed Matters</p>
                      <p className="text-[10px] text-slate-400">
                        {examTypeToStart === "50q" 
                          ? "Take your time to answer accurately! Expected completion time: 60-90 minutes." 
                          : "Pace yourself! We record your progress to calculate study efficacy and exam confidence indexes."}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2.5">
                    <span className="text-sm mt-0.5">🏆</span>
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Earn Massive Study XP Rewards</p>
                      <p className="text-[10px] text-slate-400">
                        {examTypeToStart === "50q"
                          ? "Earn +300 Base XP on completion, and +15 bonus XP for each correct answer! Boost your grade rank status."
                          : "Earn +150 Base XP on completion, and +10 bonus XP for each correct answer. Perfect score yields +350 XP!"}
                      </p>
                    </div>
                  </div>

                  {/* Anti-Close/Warning Notice */}
                  <div className="flex items-start space-x-2.5 p-3 bg-rose-50/70 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl">
                    <span className="text-sm mt-0.5">⚠️</span>
                    <div>
                      <p className="text-xs font-black text-rose-600 dark:text-rose-400 uppercase tracking-wide">NOTICE: DO NOT CLOSE OR REFRESH BEFORE COMPLETING!</p>
                      <p className="text-[10px] text-rose-500 font-extrabold leading-normal mt-0.5">
                        Starting this exam locks your session. If you close this browser tab, reload the page, or navigate away before answering all questions and clicking Submit, all active progress will be lost.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Acceptance Switch */}
              <div className="flex items-center space-x-3 p-1">
                <input 
                  type="checkbox" 
                  id="accept-rules" 
                  checked={acceptedNoticeRules}
                  onChange={(e) => setAcceptedNoticeRules(e.target.checked)}
                  className="w-4.5 h-4.5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                />
                <label htmlFor="accept-rules" className="text-xs font-black text-slate-700 dark:text-slate-300 cursor-pointer">
                  I understand that I must NOT close, reload, or leave the app until completing the exam.
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowStartNotice(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 text-xs font-extrabold rounded-xl transition cursor-pointer"
                >
                  Go Back
                </button>
                <button
                  type="button"
                  disabled={!acceptedNoticeRules}
                  onClick={() => {
                    setShowStartNotice(false);
                    if (examTypeToStart === "50q") {
                      handleStart50QuestionExam();
                    } else {
                      handleStartExam(isSimulatedNext);
                    }
                  }}
                  className={`flex-1 py-2.5 text-xs font-extrabold rounded-xl transition cursor-pointer flex items-center justify-center space-x-1.5 ${
                    acceptedNoticeRules 
                      ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow" 
                      : "bg-slate-100 text-slate-400 dark:bg-slate-800 cursor-not-allowed"
                  }`}
                >
                  <span>Start Mock Exam</span>
                  <span>&rarr;</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🪙 XP EARLY TEST UNLOCK MODAL */}
      <AnimatePresence>
        {showXpUnlockModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl text-center space-y-5"
            >
              <div className="mx-auto w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center text-amber-500 text-xl font-bold animate-pulse">
                🪙
              </div>

              <div className="space-y-2">
                <h3 className="text-base font-black text-slate-950 dark:text-slate-50 uppercase tracking-tight">
                  Unlock Test Early with XP
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                  You have {profile.xp} XP points available. Unlocking requires 50 XP.
                </p>
              </div>

              {profile.xp >= 50 ? (
                <div className="space-y-4">
                  <div className="p-4 bg-amber-50/50 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/30 rounded-2xl text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-semibold">
                    Expending <span className="text-amber-600 dark:text-amber-400 font-black">50 XP</span> will unlock 1 CBSE mock test immediately. Once triggered, you must complete it or your session will be lost. Your 10-day schedule resets upon test completion.
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowXpUnlockModal(false)}
                      className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-black rounded-xl cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowXpUnlockModal(false);
                        onAwardXP(-50);
                        setHasTriggeredEarlyThisCycle(true);
                        localStorage.setItem(`${storageKeyPrefix}_triggered_early_this_cycle`, "true");
                        handleStartExam(true);
                      }}
                      className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl shadow-md cursor-pointer"
                    >
                      Spend 50 XP & Start
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-rose-50/50 dark:bg-amber-950/10 border border-rose-100 dark:border-rose-900/30 rounded-2xl text-xs text-rose-600 dark:text-rose-400 leading-relaxed font-semibold">
                    Oops! You only have <span className="font-black">{profile.xp} XP</span>. You need at least <span className="font-black">50 XP</span> to unlock a test early. Earn more XP by answering active recalls, completing tasks, or running Pomodoro sessions.
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowXpUnlockModal(false)}
                    className="w-full py-2.5 bg-slate-900 dark:bg-slate-800 text-white hover:bg-slate-800 text-xs font-black rounded-xl cursor-pointer"
                  >
                    Got It
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dynamic Main Dashboard Container */}
      {!activeTest ? (
        <div className="space-y-8">
          
          {/* FLAGSHIP DUOLINGO/KHAN ACADEMY STYLE 10-DAY ROAD TO MASTERY CHASSIS */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-md space-y-6">
            
            {/* Challenge Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-5">
              <div className="space-y-1 text-left">
                <span className="text-[10px] bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 px-2.5 py-1 rounded-full font-black uppercase tracking-widest">
                  Flagship Exam Preparation Map
                </span>
                <h2 className="text-xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100 flex items-center mt-2">
                  <Sparkles className="w-5 h-5 text-yellow-400 mr-2 animate-pulse" />
                  10-Day Challenge Timeline
                </h2>
                <p className="text-xs text-slate-500 leading-relaxed max-w-2xl font-medium">
                  Embark on an interactive active-recall journey modeled after Duolingo and Khan Academy. Unlock subsequent days by successfully completing micro-challenges, securing daily study goals, and practicing curriculum topics.
                </p>
              </div>
              
              {/* Launch 20Q Main Revision test button */}
              <div className="flex flex-col items-stretch sm:items-end">
                <button
                  onClick={() => triggerStartExam(false)}
                  className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-extrabold text-xs rounded-xl shadow-lg hover:shadow-xl transition flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <Award className="w-4 h-4 text-yellow-300 animate-bounce" />
                  <span>Launch 20Q Revision Test</span>
                </button>
                <span className="text-[9px] text-slate-400 font-bold mt-1.5 text-center sm:text-right">
                  {daysElapsed === 10 ? "✨ Fully Unlocked!" : `🔓 Complete 10 Days (Currently at ${daysElapsed}/10)`}
                </span>
              </div>
            </div>

            {/* The Dashboard Stats Belt */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              
              {/* 1. Day Progress Ring */}
              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 p-4 rounded-2xl flex flex-col items-center justify-center text-center space-y-2 relative overflow-hidden">
                <div className="relative w-14 h-14">
                  {/* SVG Ring */}
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-slate-200 dark:text-slate-800"
                      strokeWidth="3.5"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-indigo-600 transition-all duration-550"
                      strokeWidth="3.5"
                      strokeDasharray={`${(daysElapsed / 10) * 100}, 100`}
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200">{daysElapsed * 10}%</span>
                  </div>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block">Day Progress</span>
                  <span className="text-xs font-black text-slate-800 dark:text-slate-200">Day {daysElapsed} of 10</span>
                </div>
              </div>

              {/* 2. Remaining Days */}
              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 p-4 rounded-2xl flex flex-col items-center justify-center text-center space-y-1">
                <div className="w-9 h-9 rounded-full bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center text-rose-500">
                  <Clock className="w-5 h-5" />
                </div>
                <div className="space-y-0.5 mt-1">
                  <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block">Remaining Days</span>
                  <span className="text-base font-black text-rose-600 dark:text-rose-400">{10 - daysElapsed} Days</span>
                </div>
              </div>

              {/* 3. Cumulative Accuracy */}
              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 p-4 rounded-2xl flex flex-col items-center justify-center text-center space-y-1">
                <div className="w-9 h-9 rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-500">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div className="space-y-0.5 mt-1">
                  <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block">Avg Accuracy</span>
                  <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                    {testHistory.length > 0 
                      ? `${Math.round(testHistory.reduce((acc, curr) => acc + curr.percentage, 0) / testHistory.length)}%`
                      : "100% Target"}
                  </span>
                </div>
              </div>

              {/* 4. Total XP Earned */}
              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 p-4 rounded-2xl flex flex-col items-center justify-center text-center space-y-1">
                <div className="w-9 h-9 rounded-full bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center text-amber-500">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="space-y-0.5 mt-1">
                  <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block">Cycle XP</span>
                  <span className="text-base font-black text-amber-600 dark:text-amber-400">
                    +{daysElapsed * 30 + testHistory.reduce((acc, curr) => acc + curr.xpEarned, 0)} XP
                  </span>
                </div>
              </div>

              {/* 5. Scholar Rank */}
              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 p-4 rounded-2xl flex flex-col items-center justify-center text-center space-y-1">
                <div className="w-9 h-9 rounded-full bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-500">
                  <Award className="w-5 h-5" />
                </div>
                <div className="space-y-0.5 mt-1">
                  <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block">Scholar Rank</span>
                  <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 truncate w-full px-1">
                    {(() => {
                      const xp = profile.xp || 0;
                      if (xp < 200) return "Novice Scholar";
                      if (xp < 500) return "Bronze Scholar";
                      if (xp < 1000) return "Silver Genius";
                      if (xp < 2000) return "Gold Master";
                      if (xp < 4000) return "Platinum Elite";
                      return "Grandmaster VI";
                    })()}
                  </span>
                </div>
              </div>

              {/* 6. Daily Goal Tracker */}
              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 p-4 rounded-2xl flex flex-col items-center justify-center text-center space-y-1">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center ${daysElapsed > 0 ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500" : "bg-slate-100 dark:bg-slate-800 text-slate-400"}`}>
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="space-y-0.5 mt-1">
                  <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block">Daily Goal</span>
                  <span className={`text-[10px] font-black uppercase ${daysElapsed > 0 ? "text-emerald-500" : "text-amber-500 animate-pulse"}`}>
                    {daysElapsed > 0 ? "🏆 Secured" : "⚠️ Pending"}
                  </span>
                </div>
              </div>
            </div>

            {/* Accordion for Completed Days to Reduce Scrolling */}
            {daysElapsed > 0 && (
              <div className="border border-slate-100 dark:border-slate-800/80 rounded-2xl bg-slate-50/50 dark:bg-slate-950/30 overflow-hidden">
                <button
                  onClick={() => setShowCompletedTimeline(!showCompletedTimeline)}
                  className="w-full px-5 py-3.5 flex justify-between items-center text-xs font-extrabold text-slate-600 dark:text-slate-300 hover:bg-slate-100/50 dark:hover:bg-slate-900/30 transition cursor-pointer"
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-emerald-500">✔</span>
                    <span>Completed Study Challenges ({daysElapsed} Days)</span>
                  </div>
                  <span className="text-indigo-500 underline text-[10px]">
                    {showCompletedTimeline ? "Hide Completed Days" : "Show Completed Days"}
                  </span>
                </button>
                
                {showCompletedTimeline && (
                  <div className="p-4 border-t border-slate-100 dark:border-slate-800/60 grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[250px] overflow-y-auto">
                    {Array.from({ length: daysElapsed }).map((_, idx) => {
                      const dayNum = idx + 1;
                      return (
                        <div 
                          key={idx}
                          className="p-3 bg-white dark:bg-slate-900 border border-emerald-100 dark:border-emerald-950/30 rounded-xl flex items-center justify-between"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-7 h-7 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 flex items-center justify-center text-xs font-black">
                              ✓
                            </div>
                            <div className="text-left">
                              <h4 className="text-[11px] font-black text-slate-800 dark:text-slate-200">Day {dayNum} Milestone Complete</h4>
                              <p className="text-[9px] text-slate-400 font-semibold">{selectedSubject} Prep Challenge</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 font-extrabold px-1.5 py-0.5 rounded">
                              +30 XP
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* The Softly Glowing Active Day Card */}
            {daysElapsed < 10 ? (
              <div className="relative group text-left">
                {/* soft glowing animated breath border */}
                <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-pink-500 rounded-3xl blur opacity-35 group-hover:opacity-50 transition duration-1000 group-hover:duration-200 animate-pulse" />
                
                <div className="relative bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 p-6 rounded-3xl text-white space-y-4 shadow-xl">
                  <div className="flex justify-between items-center">
                    <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider animate-pulse flex items-center">
                      <Flame className="w-3.5 h-3.5 text-orange-400 mr-1" />
                      Active Day {daysElapsed + 1} Challenge
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold">Recommended Study Topic</span>
                  </div>

                  <div className="space-y-2 text-left">
                    <h3 className="text-lg font-black tracking-tight flex items-center">
                      <BookOpen className="w-5 h-5 text-indigo-400 mr-2" />
                      {selectedSubject} Revision Challenge: {(() => {
                        const topics = [
                          "Arithmetic Foundations", "Equation Manipulation", "Logical Proofs", 
                          "Geometric Vision", "Calculus/Formula Drill", "CBSE Sample Practice", 
                          "HOTS Questions", "Error-Prevention Analysis", "Syllabus Synthesis", 
                          "Ultimate Mock Revision"
                        ];
                        return topics[daysElapsed] || "Concept Deep Dive";
                      })()}
                    </h3>
                    <p className="text-xs text-indigo-200 leading-relaxed font-medium">
                      Current Chapter: <span className="font-extrabold text-white underline">{selectedChapter}</span>. Master the core assertions, formulas, and mock questions designed to secure full marks in your CBSE examination.
                    </p>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center space-x-2.5 text-xs text-indigo-300">
                      <Sparkles className="w-4 h-4 text-yellow-400 animate-spin" />
                      <span>Awards +30 XP, custom badges, and AI Study recommendations</span>
                    </div>

                    <button
                      onClick={handleLaunchDailyChallenge}
                      className="w-full sm:w-auto px-6 py-2.5 bg-white text-indigo-950 hover:bg-slate-100 font-black text-xs rounded-xl shadow-lg hover:shadow-xl transition flex items-center justify-center space-x-2 cursor-pointer border border-transparent active:scale-95"
                    >
                      <Play className="w-3.5 h-3.5 fill-indigo-950 text-indigo-950" />
                      <span>Launch Active Challenge</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* All 10 Days Completed celebratory badge/message */
              <div className="bg-gradient-to-r from-emerald-600 to-teal-600 border border-emerald-500/20 p-6 rounded-3xl text-white text-center space-y-4 shadow-xl">
                <span className="text-5xl block animate-bounce">🏆</span>
                <div className="space-y-1">
                  <h3 className="text-lg font-black tracking-tight">10-Day Road to Mastery Completed!</h3>
                  <p className="text-xs text-emerald-100 font-medium max-w-xl mx-auto">
                    Congratulations! You completed all 10 days of the automated revision cycle. Your readiness level is supreme.
                  </p>
                </div>
                <button
                  onClick={() => triggerStartExam(false)}
                  className="px-6 py-2.5 bg-white text-emerald-900 hover:bg-emerald-50 font-black text-xs rounded-xl shadow-lg transition cursor-pointer"
                >
                  Start Final 20Q Revision Exam
                </button>
              </div>
            )}

            {/* Locked Days Preview Grid (Compact and elegant) */}
            {daysElapsed < 9 && (
              <div className="space-y-2.5 text-left">
                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider text-left">Upcoming Day Challenges</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {Array.from({ length: 4 }).map((_, i) => {
                    const dayNum = daysElapsed + 2 + i;
                    if (dayNum > 10) return null;
                    return (
                      <div 
                        key={i} 
                        className="p-3.5 bg-slate-50 dark:bg-slate-950/45 border border-slate-100 dark:border-slate-850 rounded-2xl flex items-center justify-between opacity-60 select-none text-left"
                      >
                        <div className="text-left space-y-0.5">
                          <span className="text-[9px] font-bold text-slate-400 block">Day {dayNum}</span>
                          <p className="text-[11px] font-extrabold text-slate-600 dark:text-slate-400 truncate max-w-[120px]">
                            {(() => {
                              const topics = [
                                "Arithmetic Foundations", "Equation Manipulation", "Logical Proofs", 
                                "Geometric Vision", "Calculus/Formula Drill", "CBSE Sample Practice", 
                                "HOTS Questions", "Error-Prevention Analysis", "Syllabus Synthesis", 
                                "Ultimate Mock Revision"
                              ];
                              return topics[dayNum - 1] || "Concept Concept";
                            })()}
                          </p>
                        </div>
                        <span className="text-slate-300 dark:text-slate-700 font-extrabold">🔒</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>

          {/* TWO-COLUMN LAYOUT UNDERNEATH FOR GENERAL WORKSPACE */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Main Interactive Filter & Practice Center */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-6 flex flex-col justify-between">
              <div className="space-y-1 text-left">
                <span className="text-[10px] font-black bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-2.5 py-1 rounded-full uppercase tracking-widest">
                  Dynamic Syllabus Assessment
                </span>
                <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 flex items-center mt-2">
                  <Filter className="w-5 h-5 mr-2 text-indigo-500" />
                  Practice & Test Center
                </h2>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  Configure and launch customized assessments. New questions are dynamically designed based on your selected parameters, maintaining strict syllabus mapping. Previously served questions are tracked to ensure unique assessments.
                </p>
              </div>

              {/* Filter controls section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-100 dark:border-slate-850">
                
                {/* Class Select */}
                <div className="space-y-1 text-left">
                  <label className="text-[11px] font-black uppercase text-slate-400 block tracking-wider">Select Class</label>
                  <select 
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold p-2.5 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    {["Class 6", "Class 7", "Class 8", "Class 9", "Class 10", "Class 11", "Class 12"].map(grade => (
                      <option key={grade} value={grade}>{grade}</option>
                    ))}
                  </select>
                </div>

                {/* Subject Select */}
                <div className="space-y-1 text-left">
                  <label className="text-[11px] font-black uppercase text-slate-400 block tracking-wider">Select Subject</label>
                  <select 
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold p-2.5 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    {getSubjectsForClass(selectedClass).map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>

                {/* Chapter Select */}
                <div className="space-y-1 md:col-span-2 text-left">
                  <label className="text-[11px] font-black uppercase text-slate-400 block tracking-wider">Select Chapter</label>
                  <select 
                    value={selectedChapter}
                    onChange={(e) => setSelectedChapter(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold p-2.5 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    {getChaptersForSubject(selectedClass, selectedSubject).map(ch => (
                      <option key={ch} value={ch}>{ch}</option>
                    ))}
                  </select>
                </div>

                {/* Difficulty Select */}
                <div className="space-y-1 text-left">
                  <label className="text-[11px] font-black uppercase text-slate-400 block tracking-wider">Difficulty Level</label>
                  <select 
                    value={selectedDifficulty}
                    onChange={(e) => setSelectedDifficulty(e.target.value as any)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold p-2.5 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    {["Easy", "Medium", "Hard", "Expert"].map(diff => (
                      <option key={diff} value={diff}>{diff}</option>
                    ))}
                  </select>
                </div>

                {/* Question Count Select */}
                <div className="space-y-1 text-left">
                  <label className="text-[11px] font-black uppercase text-slate-400 block tracking-wider">Number of Questions</label>
                  <select 
                    value={questionCount}
                    onChange={(e) => setQuestionCount(Number(e.target.value))}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold p-2.5 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    {[5, 10, 15, 20].map(cnt => (
                      <option key={cnt} value={cnt}>{cnt} Questions</option>
                    ))}
                  </select>
                </div>

              </div>

              {/* Error display */}
              {loadError && (
                <PremiumErrorCard
                  compact
                  type="general"
                  title="Assessment Setup Warning"
                  description={loadError}
                  error={loadError}
                  onRetry={() => handleStartExam(true)}
                  onGoBack={() => setLoadError(null)}
                />
              )}

              {/* Animated Shimmer Loader Card when generating */}
              {isLoadingQuestions && (
                <div className="p-6 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 rounded-2xl border border-indigo-200/50 dark:border-indigo-900/40 shadow-inner space-y-3 relative overflow-hidden">
                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    <Sparkles className="w-4 h-4 text-indigo-500 animate-spin" />
                    <span>Constructing {questionCount} Custom {selectedDifficulty} Questions for {selectedSubject}...</span>
                  </div>
                  <div className="h-3 w-full bg-slate-200/60 dark:bg-slate-800/60 rounded-full overflow-hidden relative">
                    <div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full animate-[shimmer_1.5s_infinite] w-full" />
                  </div>
                </div>
              )}

              {/* Launcher button and tracking info */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="text-left space-y-1 self-start sm:self-center">
                  <span className="text-[10px] text-slate-400 font-bold block">Assessment Cache Tracking:</span>
                  <div className="flex items-center space-x-2.5">
                    <span className="text-[11px] font-black text-indigo-600 dark:text-indigo-400">
                      Served question IDs: <span className="underline">{servedCount}</span>
                    </span>
                    {servedCount > 0 && (
                      <button 
                        onClick={handleClearServedCache}
                        className="text-[10px] text-rose-500 hover:text-rose-600 hover:underline flex items-center cursor-pointer font-bold"
                      >
                        <Trash2 className="w-3 h-3 mr-0.5" />
                        Reset Selection History
                      </button>
                    )}
                  </div>
                </div>

                <button
                  disabled={isLoadingQuestions}
                  onClick={handleLaunchDynamicAssessment}
                  className="w-full sm:w-auto px-8 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-100 dark:disabled:bg-slate-800 text-white disabled:text-slate-400 font-black text-xs rounded-xl shadow-md transition flex items-center justify-center space-x-2 cursor-pointer"
                >
                  {isLoadingQuestions ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                      <span>Analyzing & Designing Syllabus Assessment...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-white text-white" />
                      <span>Launch Dynamic Syllabus Assessment</span>
                    </>
                  )}
                </button>
              </div>

            </div>

            {/* Hard Mode & Assessment History Panel (Right Column) */}
            <div className="lg:col-span-1 space-y-6 flex flex-col">
              
              {/* Past Year 50-Question Board Exam Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-3xl shadow-sm space-y-4">
                <div className="space-y-1 text-left">
                  <span className="text-[9px] bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                    🔥 Hard Mode
                  </span>
                  <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 mt-1">Ultimate 50Q Board Exam</h3>
                  <p className="text-[10px] text-slate-400 leading-relaxed font-semibold text-left">
                    A complete, rigid 50-question mock evaluation featuring high-difficulty HOTS problems and official past year CBSE board questions.
                  </p>
                </div>

                <button
                  onClick={triggerStart50QuestionExamNotice}
                  className="w-full py-2 bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-500 hover:to-orange-500 text-white font-extrabold text-[10px] rounded-xl shadow-sm transition flex items-center justify-center space-x-1 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-yellow-350 animate-pulse" />
                  <span>Start 50Q Ultimate Challenge</span>
                </button>
              </div>

              {/* Syllabus Assessment History Logs */}
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-3xl shadow-sm flex-1 flex flex-col space-y-4 max-h-[350px]">
                <h3 className="font-extrabold text-xs text-slate-800 dark:text-slate-100 flex items-center text-left">
                  <Award className="w-4 h-4 text-amber-500 mr-2" />
                  Assessment History
                </h3>
                
                {testHistory.length === 0 ? (
                  <EmptyStateCard
                    icon={<Award className="w-6 h-6 text-amber-500" />}
                    title="No Test History Logs Yet"
                    description="Take a syllabus exam to unlock performance analytics, score trends, and AI topic mastery suggestions."
                    motivationalQuote="Test yourself early and often. Self-testing is the ultimate key to retention."
                    aiSuggestions={[
                      "Attempt 10-Min Diagnostic Test",
                      "Try Class 10 Physics Mock Exam"
                    ]}
                    onSelectSuggestion={() => {
                      handleStartExam(true);
                    }}
                    action={{
                      label: "Launch First Assessment",
                      onClick: () => handleStartExam(true)
                    }}
                  />
                ) : (
                  <div className="space-y-2.5 flex-1 overflow-y-auto pr-1">
                    {testHistory.map((h, i) => (
                      <div key={i} className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
                        <div className="space-y-0.5 text-left max-w-[70%]">
                          <span className="text-[9px] font-bold text-slate-400 block">{h.date}</span>
                          <p className="font-extrabold text-slate-800 dark:text-slate-150 truncate leading-tight">
                            {h.title || `${h.grade} Exam`}
                          </p>
                          <span className="text-[9px] text-emerald-500 font-extrabold block">+{h.xpEarned} XP</span>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 block leading-tight">{h.score}</span>
                          <span className="text-[9px] bg-indigo-50 dark:bg-indigo-950 font-black px-1 py-0.2 rounded text-indigo-700 dark:text-indigo-400">{h.percentage}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

          </div>

          {/* 🏆 DAILY ACTIVE RECALL CHALLENGE MODAL (DUOLINGO/KHAN STYLE) */}
          <AnimatePresence>
            {showDailyChallengeModal && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto"
              >
                <motion.div 
                  initial={{ scale: 0.95, y: 30 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.95, y: 30 }}
                  className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col"
                >
                  {/* Confetti container for completion celebration */}
                  <Confetti active={triggerChallengeConfetti} onComplete={() => setTriggerChallengeConfetti(false)} />

                  {/* Progress bar */}
                  <div className="w-full bg-slate-100 dark:bg-slate-850 h-1.5">
                    <div 
                      className="bg-indigo-600 h-full transition-all duration-300"
                      style={{ 
                        width: dailyChallengeSubmitted 
                          ? "100%" 
                          : `${((currentDailyQuestionIdx + 1) / dailyChallengeQuestions.length) * 100}%` 
                      }}
                    />
                  </div>

                  {!dailyChallengeSubmitted ? (
                    /* Active Challenge Question */
                    <div className="p-6 space-y-6 flex-1 text-left">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 px-2.5 py-1 rounded-full uppercase tracking-wider">
                          Day {daysElapsed + 1} Prep Quiz
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold">
                          Question {currentDailyQuestionIdx + 1} of {dailyChallengeQuestions.length}
                        </span>
                      </div>

                      {dailyChallengeQuestions[currentDailyQuestionIdx] && (
                        <div className="space-y-5">
                          <div className="p-5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl">
                            <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 leading-relaxed whitespace-pre-wrap">
                              {dailyChallengeQuestions[currentDailyQuestionIdx].question}
                            </h3>
                          </div>

                          {/* Options */}
                          <div className="space-y-2.5">
                            {dailyChallengeQuestions[currentDailyQuestionIdx].options.map((option: string, idx: number) => {
                              const isSelected = dailyAnswers[currentDailyQuestionIdx] === idx;
                              return (
                                <button
                                  key={idx}
                                  onClick={() => handleSelectDailyAnswer(idx)}
                                  className={`w-full text-left p-4 rounded-xl border text-xs transition flex items-center justify-between cursor-pointer ${
                                    isSelected 
                                      ? "bg-indigo-50/50 border-indigo-400 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 font-bold ring-2 ring-indigo-500" 
                                      : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50"
                                  }`}
                                >
                                  <div className="flex items-center space-x-3 text-left">
                                    <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-500 flex-shrink-0">
                                      {String.fromCharCode(65 + idx)}
                                    </span>
                                    <span>{option}</span>
                                  </div>
                                  {isSelected && (
                                    <span className="text-indigo-600 dark:text-indigo-400 text-xs font-bold flex-shrink-0 ml-2">Selected</span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-800/80">
                        <span className="text-[10px] text-slate-400 font-medium italic text-left">
                          * Choose carefully! Your score affects today's XP multiplier!
                        </span>
                        <button
                          disabled={dailyAnswers[currentDailyQuestionIdx] === undefined}
                          onClick={handleNextDailyQuestion}
                          className={`px-6 py-2.5 text-xs font-extrabold rounded-xl shadow transition ${
                            dailyAnswers[currentDailyQuestionIdx] !== undefined 
                              ? "bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer" 
                              : "bg-slate-100 text-slate-400 dark:bg-slate-800 cursor-not-allowed"
                          }`}
                        >
                          <span>
                            {currentDailyQuestionIdx === dailyChallengeQuestions.length - 1 
                              ? "Submit Challenge" 
                              : "Next Question →"
                            }
                          </span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Completion Celebration Screen & AI Study Coach Recommendations */
                    <div className="p-6 space-y-6 text-left overflow-y-auto max-h-[80vh]">
                      <div className="text-center space-y-3 pb-5 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-5xl block animate-bounce">🎓</span>
                        <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">
                          Day {daysElapsed} Active Recall Finished!
                        </h3>
                        <p className="text-xs text-slate-400 font-semibold">
                          Your daily learning streak is officially locked in and secured!
                        </p>

                        <div className="max-w-xs mx-auto p-4 bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100/30 rounded-2xl text-center space-y-1">
                          <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest block">Daily Challenge Score</span>
                          <p className="text-2xl font-black text-slate-800 dark:text-slate-100">
                            {dailyChallengeScore} / 3 Correct
                          </p>
                          <span className="text-[10px] text-emerald-500 font-bold block">
                            +{30 + (dailyChallengeScore * 10)} XP Earned!
                          </span>
                        </div>
                      </div>

                      {/* AI Study Recommendations */}
                      <div className="space-y-3.5">
                        <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 flex items-center">
                          <Lightbulb className="w-4.5 h-4.5 text-amber-500 mr-2 animate-pulse" />
                          AI Study Coach Recommendations
                        </h4>

                        {isLoadingAiRec ? (
                          <div className="p-8 border border-dashed border-slate-100 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center space-y-3 text-center">
                            <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
                            <span className="text-xs text-slate-400 font-bold animate-pulse">
                              StudyMate AI is designing your personalized study advice...
                            </span>
                          </div>
                        ) : (
                          <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-2xl text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium space-y-3 whitespace-pre-wrap">
                            {aiRecommendation}
                          </div>
                        )}
                      </div>

                      <div className="flex justify-center pt-4 border-t border-slate-100 dark:border-slate-800">
                        <button
                          onClick={() => setShowDailyChallengeModal(false)}
                          className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-md transition cursor-pointer"
                        >
                          Got It, Let's Continue!
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      ) : (
        /* Immersive Board Test Screen Window */
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-lg space-y-6">
          
          {/* Test Header */}
          <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800/80">
            <div className="space-y-1 text-left">
              <div className="flex items-center space-x-2">
                <span className="bg-rose-500 text-white font-extrabold text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                  Active Board Assessment
                </span>
                {isSimulated && (
                  <span className="bg-amber-500 text-slate-950 font-bold text-[9px] px-2 py-0.5 rounded-full">
                    DEMO BYPASS MODE
                  </span>
                )}
              </div>
              <h2 className="text-base font-black text-slate-800 dark:text-slate-100">
                {activeTest[0]?.id?.includes("elite-base") || activeTest[0]?.id?.includes("dup")
                  ? `CBSE ${profile.classGrade} Comprehensive Syllabus Test`
                  : `${activeTest[0]?.subject || selectedSubject}: ${activeTest[0]?.chapter || selectedChapter} Assessment`}
              </h2>
            </div>

            {testCompleted && (
              <button
                onClick={() => setActiveTest(null)}
                className="px-3.5 py-1.5 text-xs font-bold text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition cursor-pointer"
              >
                Close Dashboard
              </button>
            )}
          </div>

          {!testCompleted ? (
            /* Active Test Panel */
            <div className="space-y-6">
              
              {/* Question status bar */}
              <div className="space-y-2 text-left">
                <div className="flex justify-between text-xs text-slate-400 font-bold">
                  <span>QUESTION {currentQuestionIndex + 1} OF {activeTest.length}</span>
                  <span>{Object.keys(selectedAnswers).length} of {activeTest.length} Answered</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                    style={{ width: `${((currentQuestionIndex + 1) / activeTest.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Question visual block card */}
              <div className="p-5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80 rounded-2xl space-y-3.5 text-left">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-black bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded">
                      📚 {activeTest[currentQuestionIndex].subject}
                    </span>
                    {getQuestionTypeBadge(activeTest[currentQuestionIndex].type)}
                  </div>
                  {activeTest[currentQuestionIndex].yearHint && (
                    <span className="text-[10px] text-amber-500 font-bold">
                      🎯 {activeTest[currentQuestionIndex].yearHint}
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-relaxed whitespace-pre-wrap">
                  {activeTest[currentQuestionIndex].question}
                </h3>
              </div>

              {/* Multiple Choice Answers Options */}
              <div className="space-y-2.5">
                {activeTest[currentQuestionIndex].options.map((option, idx) => {
                  const isSelected = selectedAnswers[activeTest[currentQuestionIndex].id] === idx;
                  
                  let optionStyles = "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50";
                  if (isSelected) {
                    optionStyles = "bg-indigo-50/50 border-indigo-400 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 font-bold ring-2 ring-indigo-500";
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelectOption(idx)}
                      className={`w-full text-left p-3.5 rounded-2xl border text-xs transition flex items-center justify-between cursor-pointer ${optionStyles}`}
                    >
                      <div className="flex items-center space-x-3 text-left">
                        <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-500 flex-shrink-0">
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span>{option}</span>
                      </div>
                      {isSelected && (
                        <span className="text-indigo-600 dark:text-indigo-400 text-xs font-bold flex-shrink-0 ml-2">Selected</span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="p-3 bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100/30 rounded-xl text-[10px] text-indigo-500 font-semibold leading-relaxed text-left">
                * Tip: You can freely click "Back" to correct any answer. There is no penalty for changing options during the exam phase!
              </div>

              {/* Action Navigation Buttons */}
              <div className="flex justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
                <button
                  disabled={currentQuestionIndex === 0}
                  onClick={handlePrevQuestion}
                  className={`px-5 py-2 text-xs font-bold rounded-xl shadow transition flex items-center space-x-1 ${
                    currentQuestionIndex > 0
                      ? "bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
                      : "bg-slate-50 text-slate-300 dark:bg-slate-950 dark:text-slate-700 cursor-not-allowed"
                  }`}
                >
                  <span>← Back</span>
                </button>

                {currentQuestionIndex < activeTest.length - 1 ? (
                  <button
                    onClick={handleNextQuestion}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow transition flex items-center cursor-pointer"
                  >
                    <span>Next →</span>
                  </button>
                ) : (
                  <button
                    disabled={Object.keys(selectedAnswers).length < activeTest.length}
                    onClick={handleCompleteExam}
                    className={`px-6 py-2.5 text-xs font-extrabold rounded-xl shadow transition ${
                      Object.keys(selectedAnswers).length === activeTest.length
                        ? "bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                        : "bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-800"
                    }`}
                  >
                    {Object.keys(selectedAnswers).length === activeTest.length
                      ? "Submit Comprehensive Exam"
                      : `Answer All Questions (${Object.keys(selectedAnswers).length}/${activeTest.length})`
                    }
                  </button>
                )}
              </div>

            </div>
          ) : (
            /* Completed Exam Summary & Detailed Solutions panel */
            <div className="space-y-8 text-left">
              
              <div className="text-center py-6 space-y-4 border-b border-slate-100 dark:border-slate-800/80">
                <span className="text-5xl block animate-bounce">🏆</span>
                <div className="space-y-1">
                  <h3 className="text-xl font-black text-slate-800 dark:text-slate-100">Assessment Accomplished!</h3>
                  <p className="text-xs text-slate-400 font-semibold">
                    You completed the dynamic assessment syllabus revision challenge.
                  </p>
                </div>

                {/* Score breakdown bubble */}
                <div className="max-w-xs mx-auto p-5 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-800/50 rounded-2xl space-y-1.5 text-center">
                  <span className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block">Final Score Report</span>
                  <p className="text-3xl font-black text-slate-800 dark:text-slate-100">{score} / {activeTest.length} Correct</p>
                  <p className="text-sm font-bold text-slate-500">{Math.round((score / activeTest.length) * 100)}% Proficiency</p>
                </div>

                <div className="max-w-md mx-auto p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl text-xs text-slate-500 font-medium leading-relaxed space-y-1 text-left">
                  <p className="font-extrabold text-slate-700 dark:text-slate-300 flex items-center">
                    <ShieldCheck className="w-4.5 h-4.5 text-emerald-500 mr-1.5" />
                    Scholar Achievements Mapped:
                  </p>
                  <p>• CBSE Board Syllabus Coverage updated successfully.</p>
                  <p>• XP Awarded: +{activeTest.length === 50 ? 300 + (score * 15) : 150 + (score * 10)} Rank XP points synced.</p>
                  <p>• Streak counter secured successfully for today!</p>
                </div>
              </div>

              {/* Exhaustive Question Answers & Solutions Display */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center">
                    <BookOpen className="w-4.5 h-4.5 text-indigo-500 mr-2" />
                    Complete Exam Answer Key & Solutions
                  </h4>
                  <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded font-black animate-pulse">
                    {activeTest.length} OF {activeTest.length} QUESTIONS
                  </span>
                </div>

                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 border-l border-slate-100 dark:border-slate-800/80 pl-4">
                  {activeTest.map((q, qidx) => {
                    const userChoice = selectedAnswers[q.id];
                    const isCorrect = userChoice === q.correctAnswer;

                    return (
                      <div 
                        key={q.id} 
                        className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-3.5"
                      >
                        <div className="flex justify-between items-start text-xs">
                          <span className="font-black text-slate-400 block uppercase">
                            Q{qidx + 1}. {q.subject}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full font-black text-[9px] uppercase ${
                            isCorrect 
                              ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40" 
                              : "bg-rose-50 text-rose-600 dark:bg-rose-950/40"
                          }`}>
                            {isCorrect ? "✓ Correct" : "✗ Incorrect"}
                          </span>
                        </div>

                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                          {q.question}
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                          {q.options.map((opt, oidx) => {
                            const isCorrectOpt = q.correctAnswer === oidx;
                            const isSelectedOpt = userChoice === oidx;

                            let optStyle = "border-slate-100 dark:border-slate-900 bg-white dark:bg-slate-900 text-slate-500";
                            if (isCorrectOpt) {
                              optStyle = "border-emerald-200 bg-emerald-50/50 text-emerald-700 dark:border-emerald-950/40 dark:bg-emerald-950/20 font-bold";
                            } else if (isSelectedOpt) {
                              optStyle = "border-rose-200 bg-rose-50/50 text-rose-700 dark:border-rose-950/40 dark:bg-rose-950/20 font-bold";
                            }

                            return (
                              <div key={oidx} className={`p-2 border rounded-xl flex items-center space-x-2 ${optStyle}`}>
                                <span className="font-bold text-[10px] w-5 h-5 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                                  {String.fromCharCode(65 + oidx)}
                                </span>
                                <span>{opt}</span>
                                {isCorrectOpt && <span className="text-[9px] text-emerald-600 font-bold ml-auto flex-shrink-0">✓ Key</span>}
                                {isSelectedOpt && !isCorrectOpt && <span className="text-[9px] text-rose-600 font-bold ml-auto flex-shrink-0">Your choice</span>}
                              </div>
                            );
                          })}
                        </div>

                        <div className="p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl space-y-1">
                          <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest block">
                            Detailed Solution Step-by-Step:
                          </span>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium whitespace-pre-wrap">
                            {q.explanation}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-center pt-4">
                <button
                  onClick={() => setActiveTest(null)}
                  className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl shadow transition cursor-pointer"
                >
                  Return to Dashboard
                </button>
              </div>

            </div>
          )}

        </div>
      )}

    </div>
  );
}
