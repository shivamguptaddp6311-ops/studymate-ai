import { firebaseDB, UserMemory, ChatUser, SyncData } from "./firebase";
import { AIMessage } from "./aiService";
import { GoogleGenAI } from "@google/genai";

// LRU / TTL Cache for user memory in Node.js memory
const memoryCache = new Map<string, { memory: UserMemory; timestamp: number }>();
const MEMORY_CACHE_TTL = 3 * 60 * 1000; // 3 minutes TTL

// Trivial casual phrases to ignore for long-term memory extraction
const TRIVIAL_PHRASES = new Set([
  "hi", "hello", "hey", "hola", "ok", "okay", "k", "sure", "thanks", "thank you",
  "thx", "got it", "cool", "nice", "awesome", "great", "good", "lol", "haha",
  "yes", "no", "yep", "nope", "bye", "goodbye", "see ya", "brb", "what's up",
  "how are you", "who are you", "good morning", "good night", "sorry", "please"
]);

// Prompt injection keywords to strip from long-term memory facts
const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior)\s+instructions/gi,
  /system\s*prompt/gi,
  /you\s+are\s+now\s+a/gi,
  /override\s+rules/gi,
  /<script.*?>.*?<\/script>/gi,
  /eval\s*\(.*?\)/gi
];

/**
 * Sanitize fact strings to prevent prompt injections or malformed text before saving/injecting.
 */
export function sanitizeFact(text: string): string {
  if (!text || typeof text !== "string") return "";
  let clean = text.trim();

  // Strip prompt injection attempts
  PROMPT_INJECTION_PATTERNS.forEach(pattern => {
    clean = clean.replace(pattern, "[redacted]");
  });

  // Normalize whitespace & cap maximum length per individual fact
  clean = clean.replace(/\s+/g, " ").substring(0, 300).trim();
  return clean;
}

/**
 * Calculates Token / Word Jaccard Similarity between two text strings to detect duplicates.
 */
export function calculateJaccardSimilarity(str1: string, str2: string): number {
  const words1 = new Set(str1.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/).filter(w => w.length > 2));
  const words2 = new Set(str2.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/).filter(w => w.length > 2));

  if (words1.size === 0 || words2.size === 0) return 0;

  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}

/**
 * Deduplicates and updates facts array.
 * Replaces older contradicting facts if a newer fact updates the same topic.
 */
export function normalizeAndDeduplicateFacts(existingFacts: string[], newFacts: string[]): string[] {
  let result = [...existingFacts];

  for (const rawNewFact of newFacts) {
    const cleanFact = sanitizeFact(rawNewFact);
    if (!cleanFact || cleanFact.length < 5) continue;

    let isDuplicateOrUpdated = false;

    for (let i = 0; i < result.length; i++) {
      const existing = result[i];
      const similarity = calculateJaccardSimilarity(existing, cleanFact);

      if (similarity > 0.65) {
        // High similarity: update with the newer, potentially more specific fact
        result[i] = cleanFact;
        isDuplicateOrUpdated = true;
        break;
      }
    }

    if (!isDuplicateOrUpdated) {
      result.push(cleanFact);
    }
  }

  // Cap total facts to 40 items max
  return result.slice(-40);
}

/**
 * 1. RUNTIME DATE & TIME INFORMATION
 * Generates live date, time, timezone, and explicit year instructions.
 */
export function getRuntimeInfo(): string {
  const now = new Date();
  
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });
  
  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });

  const timezoneName = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const isoStr = now.toISOString();
  const currentYear = now.getFullYear();

  return `=== RUNTIME ENVIRONMENT INFORMATION ===
- Current Date: ${dateStr}
- Current Time: ${timeStr}
- Timezone: ${timezoneName}
- ISO Timestamp: ${isoStr}
- Current Year: ${currentYear}
[STRICT DATE RULE]: Today is ${dateStr}. The current year is strictly ${currentYear}. Never assume 2024 or 2025. If asked about today's date, current year, or recent events, refer strictly to this runtime information.`;
}

/**
 * 2. USER PROFILE CONTEXT
 * Formats user's grade, subjects, habits, streak, and goals from sync data.
 */
export function getUserProfileContext(user: ChatUser | null, syncData: SyncData | null): string {
  const parts: string[] = [];

  if (user) {
    if (user.username) parts.push(`- Student Name/Username: ${user.username}`);
    if (user.email) parts.push(`- Account Email: ${user.email}`);
  }

  if (syncData && syncData.profile) {
    const p = syncData.profile;
    if (p.fullName || p.nickname) parts.push(`- Name: ${p.nickname || p.fullName}`);
    if (p.classGrade || p.grade) parts.push(`- Academic Class/Grade Level: Class ${p.classGrade || p.grade}`);
    if (p.targetExam) parts.push(`- Target Board/Exam: ${p.targetExam}`);
    if (p.stream) parts.push(`- Academic Stream: ${p.stream}`);
    if (p.favSubjects && Array.isArray(p.favSubjects) && p.favSubjects.length > 0) {
      parts.push(`- Favorite/Strong Subjects: ${p.favSubjects.join(", ")}`);
    }
    if (p.weakSubjects && Array.isArray(p.weakSubjects) && p.weakSubjects.length > 0) {
      parts.push(`- Target Improvement/Weak Subjects: ${p.weakSubjects.join(", ")}`);
    }
    if (p.studyHabits || p.preferredStudyTime) {
      parts.push(`- Study Habits & Timing: ${p.studyHabits || p.preferredStudyTime}`);
    }
    if (p.streak) {
      parts.push(`- Active Learning Streak: ${p.streak} days`);
    }
  }

  if (syncData && syncData.tasks && Array.isArray(syncData.tasks) && syncData.tasks.length > 0) {
    const pendingTasks = syncData.tasks.filter((t: any) => !t.completed).slice(0, 5);
    if (pendingTasks.length > 0) {
      const taskTitles = pendingTasks.map((t: any) => `"${t.title || t.subject}"`).join(", ");
      parts.push(`- Active Pending Study Tasks: ${taskTitles}`);
    }
  }

  if (parts.length === 0) {
    return "User Profile: Standard Student Profile (No specific board/grade preferences set yet).";
  }

  return `=== USER PROFILE & ACADEMIC CONTEXT ===\n` + parts.join("\n");
}

/**
 * 3. LONG-TERM MEMORY RETRIEVAL WITH CACHING
 */
export async function getOrLoadUserMemory(uid: string, email: string): Promise<UserMemory> {
  const cacheKey = uid.trim() || email.toLowerCase().trim();
  const cached = memoryCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < MEMORY_CACHE_TTL) {
    return cached.memory;
  }

  const existing = await firebaseDB.getUserMemory(uid, email);
  if (existing) {
    const memory: UserMemory = {
      facts: (existing.facts || []).map(sanitizeFact).filter(f => f.length > 0),
      summary: existing.summary || "",
      learningsAndGoals: (existing.learningsAndGoals || []).map(sanitizeFact).filter(f => f.length > 0),
      lastUpdated: existing.lastUpdated || new Date().toISOString()
    };
    memoryCache.set(cacheKey, { memory, timestamp: Date.now() });
    return memory;
  }

  const emptyMemory: UserMemory = {
    facts: [],
    summary: "",
    learningsAndGoals: [],
    lastUpdated: new Date().toISOString()
  };

  memoryCache.set(cacheKey, { memory: emptyMemory, timestamp: Date.now() });
  return emptyMemory;
}

/**
 * Rank and retrieve relevant long-term memories based on current query.
 */
export function searchAndRankMemories(memory: UserMemory, currentMessage = "", maxFacts = 15): {
  relevantFacts: string[];
  relevantGoals: string[];
  summary: string;
} {
  const queryLower = currentMessage.toLowerCase().trim();
  const keywords = queryLower.split(/\s+/).filter(w => w.length > 2);

  // Score facts based on keyword overlap and core relevance
  let factsWithScore = (memory.facts || []).map(fact => {
    const factLower = fact.toLowerCase();
    let score = 0;

    // High priority terms (name, grade, exam, target, preference) get bonus base score
    if (/name|class|grade|exam|board|subject|stream/i.test(fact)) {
      score += 2;
    }

    keywords.forEach(kw => {
      if (factLower.includes(kw)) {
        score += 3;
      }
    });

    return { fact, score };
  });

  factsWithScore.sort((a, b) => b.score - a.score);

  const relevantFacts = factsWithScore.slice(0, maxFacts).map(item => item.fact);

  // Score goals
  let goalsWithScore = (memory.learningsAndGoals || []).map(goal => {
    const goalLower = goal.toLowerCase();
    let score = 0;
    keywords.forEach(kw => {
      if (goalLower.includes(kw)) score += 3;
    });
    return { goal, score };
  });

  goalsWithScore.sort((a, b) => b.score - a.score);
  const relevantGoals = goalsWithScore.slice(0, 10).map(item => item.goal);

  return {
    relevantFacts,
    relevantGoals,
    summary: memory.summary || ""
  };
}

/**
 * Format Long-Term Memory Context for System Prompt Injection.
 */
export function formatLongTermMemoryContext(memory: UserMemory, currentMessage = ""): string {
  const { relevantFacts, relevantGoals, summary } = searchAndRankMemories(memory, currentMessage);

  const parts: string[] = [];

  if (relevantFacts.length > 0) {
    parts.push(`- Remembered User Facts & Preferences:\n  * ` + relevantFacts.join("\n  * "));
  }

  if (relevantGoals.length > 0) {
    parts.push(`- Long-Term Learning Goals & Progress:\n  * ` + relevantGoals.join("\n  * "));
  }

  if (summary && summary.trim().length > 0) {
    parts.push(`- Past Interactions Summary: ${summary}`);
  }

  if (parts.length === 0) {
    return "=== LONG-TERM MEMORY ===\n(No long-term memories saved yet for this user. You will automatically retain facts from this conversation.)";
  }

  return `=== LONG-TERM RECALLED MEMORY ===\n` + parts.join("\n");
}

/**
 * 4. CONTEXT COMPRESSION & SLIDING WINDOW SHORT-TERM HISTORY MANAGEMENT
 * Keeps recent messages (15-20 turns) untouched. Summarizes older turns efficiently to minimize tokens.
 */
export function prepareConversationHistory(rawHistory: any[]): {
  compressedSummary: string;
  recentMessages: AIMessage[];
} {
  if (!rawHistory || !Array.isArray(rawHistory) || rawHistory.length === 0) {
    return { compressedSummary: "", recentMessages: [] };
  }

  // Filter valid entries
  const validTurns: AIMessage[] = [];
  rawHistory.forEach(h => {
    if (h && typeof h === "object") {
      const content = String(h.content || h.message || h.text || "").trim();
      if (content.length > 0) {
        const role: "user" | "model" = (h.role === "user" || h.role === "human") ? "user" : "model";
        validTurns.push({ role, content });
      }
    }
  });

  if (validTurns.length === 0) {
    return { compressedSummary: "", recentMessages: [] };
  }

  // Sliding window: If history <= 20 messages, keep all untouched
  const MAX_RECENT_TURNS = 20;
  if (validTurns.length <= MAX_RECENT_TURNS) {
    return { compressedSummary: "", recentMessages: validTurns };
  }

  // Split older messages from recent window
  const olderTurns = validTurns.slice(0, validTurns.length - MAX_RECENT_TURNS);
  const recentTurns = validTurns.slice(validTurns.length - MAX_RECENT_TURNS);

  // Generate a structured, token-optimized summary of older turns
  const summaryLines: string[] = [];
  olderTurns.forEach(turn => {
    const prefix = turn.role === "user" ? "User:" : "AI:";
    const snippet = turn.content.length > 120 ? turn.content.substring(0, 120) + "..." : turn.content;
    summaryLines.push(`${prefix} ${snippet}`);
  });

  const compressedSummary = `=== EARLY CONVERSATION SUMMARY (MESSAGES 1 to ${olderTurns.length}) ===
${summaryLines.join("\n")}
[Note: The above is a token-optimized compressed summary of earlier turns in this chat session to preserve memory context without exceeding context windows.]`;

  return {
    compressedSummary,
    recentMessages: recentTurns
  };
}

/**
 * 5. MEMORY RETRIEVAL TRIGGERS
 * Detects explicit recall triggers in user prompts.
 */
export function detectMemoryRetrievalTriggers(message: string): string {
  if (!message || typeof message !== "string") return "";
  const lower = message.toLowerCase();

  const triggers = [
    "remember", "remember that", "continue", "as i said earlier", "as i mentioned",
    "same as before", "you forgot", "what did i say", "my previous question",
    "earlier you said", "last time", "don't forget"
  ];

  const matched = triggers.some(t => lower.includes(t));
  if (matched) {
    return `\n[EXPLICIT CONTEXT RECALL TRIGGER DETECTED]:
The user explicitly mentioned prior context ("remember", "continue", "as I said earlier", "same as before", "you forgot").
You MUST carefully cross-reference the Long-Term Recalled Memory and Recent Conversation History above before answering. Address their prior context directly.`;
  }

  return "";
}

/**
 * Check if a user message is trivial or casual filler that should NOT be extracted as long-term facts.
 */
export function isTrivialMessage(message: string): boolean {
  if (!message) return true;
  const clean = message.trim().toLowerCase().replace(/[^\w\s]/g, "");

  if (clean.length < 3) return true;
  if (TRIVIAL_PHRASES.has(clean)) return true;

  // Single word or two word trivial greetings
  const words = clean.split(/\s+/);
  if (words.length <= 2 && words.every(w => TRIVIAL_PHRASES.has(w))) {
    return true;
  }

  return false;
}

/**
 * 6. AUTOMATED INTELLIGENT MEMORY EXTRACTION IN BACKGROUND
 * Scans user message & AI response to extract key facts, preferences, corrections, and goals,
 * then saves deduplicated memories to Firestore.
 */
export async function extractAndSaveMemoriesInBackground(
  uid: string,
  email: string,
  userMessage: string,
  aiResponseText: string
): Promise<void> {
  if (!userMessage || userMessage.trim().length < 5) return;

  // Ignore trivial casual filler messages
  if (isTrivialMessage(userMessage)) {
    return;
  }

  try {
    const lower = userMessage.toLowerCase();

    const isFactTrigger = [
      "remember that", "remember:", "i am in", "my name is", "my goal is", "i prefer",
      "i like", "i hate", "i am studying", "my exam is", "i live in", "my favourite",
      "i am preparing for", "correcting you", "you got that wrong", "actually,"
    ].some(k => lower.includes(k));

    if (!isFactTrigger && userMessage.length < 25) {
      return; // Skip non-trigger short messages
    }

    const memory = await getOrLoadUserMemory(uid, email);
    const extractedFacts: string[] = [];

    // Fast direct heuristic extraction for explicit "remember that" or "remember:"
    if (lower.includes("remember that") || lower.includes("remember:")) {
      const factStr = userMessage.replace(/remember\s+that:?/i, "").trim();
      if (factStr.length > 5) {
        extractedFacts.push(factStr);
      }
    }

    if (lower.includes("my goal is") || lower.includes("i want to achieve")) {
      const goalStr = userMessage.trim();
      if (!memory.learningsAndGoals.includes(goalStr)) {
        memory.learningsAndGoals.push(sanitizeFact(goalStr));
      }
    }

    // LLM Extraction pass if explicit fact trigger or correction detected
    if (isFactTrigger) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey && apiKey.length > 5) {
        try {
          const ai = new GoogleGenAI({ apiKey });
          const prompt = `Extract long-term user personal facts, academic background, exam goals, study habits, or specific preferences stated in this user message.
Format as 1-2 concise bullet facts (e.g. "User is preparing for CBSE Class 10 math exam in March"). If no clear personal facts are stated, respond with "NONE".

User Message: "${userMessage}"`;

          const res = await Promise.race([
            ai.models.generateContent({
              model: "gemini-3.6-flash",
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              config: { temperature: 0.1, maxOutputTokens: 100 }
            }),
            new Promise<null>((_, reject) => setTimeout(() => reject(new Error("Timeout")), 3000))
          ]);

          if (res && res.text) {
            const lines = res.text
              .split("\n")
              .map(l => l.replace(/^[*\-\d.\s]+/, "").trim())
              .filter(l => l.length > 5 && !l.includes("NONE"));

            lines.forEach(fact => {
              extractedFacts.push(fact);
            });
          }
        } catch (e) {
          // Non-blocking fallback
        }
      }
    }

    if (extractedFacts.length > 0) {
      // Deduplicate and merge facts
      const updatedFacts = normalizeAndDeduplicateFacts(memory.facts, extractedFacts);
      memory.facts = updatedFacts;
      memory.lastUpdated = new Date().toISOString();

      await firebaseDB.saveUserMemory(uid, memory);
      
      const cacheKey = uid.trim() || email.toLowerCase().trim();
      memoryCache.set(cacheKey, { memory, timestamp: Date.now() });

      console.log(`[MemoryService] Saved ${extractedFacts.length} new/updated facts for user ${email}`);
    }
  } catch (err) {
    console.warn("[MemoryService] Background memory extraction exception:", err);
  }
}
