import { firebaseDB, UserMemory, ChatUser, SyncData } from "./firebase";
import { AIMessage } from "./aiService";
import { GoogleGenAI } from "@google/genai";

// Cache for runtime memory in-memory for speed
const memoryCache = new Map<string, { memory: UserMemory; timestamp: number }>();
const MEMORY_CACHE_TTL = 2 * 60 * 1000; // 2 minutes

/**
 * 1. RUNTIME DATE & TIME
 * Generates exact live date, time, timezone, and explicit year instructions.
 */
export function getRuntimeInfo(): string {
  const now = new Date();
  
  // Formatters for precise runtime components
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
 * 3. LONG-TERM MEMORY RETRIEVAL
 * Loads user memories from Firestore / Fallback DB.
 */
export async function getOrLoadUserMemory(uid: string, email: string): Promise<UserMemory> {
  const cacheKey = uid.trim() || email.toLowerCase().trim();
  const cached = memoryCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < MEMORY_CACHE_TTL) {
    return cached.memory;
  }

  const existing = await firebaseDB.getUserMemory(uid, email);
  if (existing) {
    memoryCache.set(cacheKey, { memory: existing, timestamp: Date.now() });
    return existing;
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

export function formatLongTermMemoryContext(memory: UserMemory, currentMessage = ""): string {
  const parts: string[] = [];

  if (memory.facts && memory.facts.length > 0) {
    // Select facts, prioritizing relevant ones if currentMessage provided
    let relevantFacts = memory.facts;
    if (currentMessage.trim().length > 0) {
      const lower = currentMessage.toLowerCase();
      const keywords = lower.split(/\s+/).filter(w => w.length > 3);
      
      const scored = memory.facts.map(fact => {
        const factLower = fact.toLowerCase();
        let score = 0;
        keywords.forEach(kw => {
          if (factLower.includes(kw)) score++;
        });
        return { fact, score };
      });

      scored.sort((a, b) => b.score - a.score);
      // Keep all high relevance + up to 15 general facts
      relevantFacts = scored.map(s => s.fact).slice(0, 20);
    }

    parts.push(`- Remembered User Facts & Preferences:\n  * ` + relevantFacts.join("\n  * "));
  }

  if (memory.learningsAndGoals && memory.learningsAndGoals.length > 0) {
    parts.push(`- Long-Term Learning Goals & Progress:\n  * ` + memory.learningsAndGoals.join("\n  * "));
  }

  if (memory.summary && memory.summary.trim().length > 0) {
    parts.push(`- Past Interactions Summary: ${memory.summary}`);
  }

  if (parts.length === 0) {
    return "=== LONG-TERM MEMORY ===\n(No long-term memories saved yet for this user. You will automatically retain facts from this conversation.)";
  }

  return `=== LONG-TERM RECALLED MEMORY ===\n` + parts.join("\n");
}

/**
 * 4. CONTEXT COMPRESSION & HISTORY MANAGEMENT
 * Keeps recent 20-30 messages untouched. Summarizes older turns if history is large.
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
    if (h && typeof h === "object" && h.message && typeof h.message === "string" && h.message.trim().length > 0) {
      const role: "user" | "model" = h.role === "user" ? "user" : "model";
      const content = h.message.trim();
      validTurns.push({ role, content });
    }
  });

  if (validTurns.length === 0) {
    return { compressedSummary: "", recentMessages: [] };
  }

  // If history <= 25 messages, keep all of them untouched
  if (validTurns.length <= 25) {
    return { compressedSummary: "", recentMessages: validTurns };
  }

  // Splice older messages (all except recent 20)
  const olderTurns = validTurns.slice(0, validTurns.length - 20);
  const recentTurns = validTurns.slice(validTurns.length - 20);

  // Generate a concise text summary of older turns
  const summaryLines: string[] = [];
  olderTurns.forEach(turn => {
    const prefix = turn.role === "user" ? "User asked/stated:" : "AI responded:";
    const snippet = turn.content.length > 150 ? turn.content.substring(0, 150) + "..." : turn.content;
    summaryLines.push(`${prefix} ${snippet}`);
  });

  const compressedSummary = `=== EARLY CONVERSATION SUMMARY (MESSAGES 1 to ${olderTurns.length}) ===
${summaryLines.join("\n")}
[Note: The above is a compressed summary of earlier turns in this chat session to optimize context size without losing context.]`;

  return {
    compressedSummary,
    recentMessages: recentTurns
  };
}

/**
 * 5. MEMORY RETRIEVAL TRIGGERS
 * Detects recall signals like "remember", "continue", "as I said earlier", "same as before", "you forgot".
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
 * 6. AUTOMATED MEMORY EXTRACTION IN BACKGROUND
 * Scans user message & AI response to extract key facts, preferences, corrections, and goals.
 */
export async function extractAndSaveMemoriesInBackground(
  uid: string,
  email: string,
  userMessage: string,
  aiResponseText: string
): Promise<void> {
  if (!userMessage || userMessage.trim().length < 5) return;

  try {
    const lower = userMessage.toLowerCase();
    const isFactTrigger = [
      "remember that", "remember:", "i am in", "my name is", "my goal is", "i prefer",
      "i like", "i hate", "i am studying", "my exam is", "i live in", "my favourite",
      "i am preparing for", "correcting you", "you got that wrong", "actually,"
    ].some(k => lower.includes(k));

    if (!isFactTrigger && userMessage.length < 30) {
      return; // Skip simple casual messages
    }

    const memory = await getOrLoadUserMemory(uid, email);

    // Fast heuristic extraction for common direct facts
    const newFacts: string[] = [];

    if (lower.includes("remember that") || lower.includes("remember:")) {
      const factStr = userMessage.replace(/remember\s+that:?/i, "").trim();
      if (factStr.length > 5 && !memory.facts.includes(factStr)) {
        newFacts.push(factStr);
      }
    }

    if (lower.includes("my goal is") || lower.includes("i want to achieve")) {
      const goalStr = userMessage.trim();
      if (!memory.learningsAndGoals.includes(goalStr)) {
        memory.learningsAndGoals.push(goalStr);
      }
    }

    // Direct LLM extraction pass if explicit fact trigger or correction detected
    if (isFactTrigger) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey && apiKey.length > 5) {
        try {
          const ai = new GoogleGenAI({ apiKey });
          const prompt = `Extract any long-term user facts, academic background, goals, study habits, or preferences stated in this message.
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
            const lines = res.text.split("\n").map(l => l.replace(/^[*\-\d.\s]+/, "").trim()).filter(l => l.length > 5 && !l.includes("NONE"));
            lines.forEach(fact => {
              if (!memory.facts.includes(fact)) {
                newFacts.push(fact);
              }
            });
          }
        } catch (e) {
          // Non-blocking fallback
        }
      }
    }

    if (newFacts.length > 0) {
      // Merge unique facts
      const updatedFacts = Array.from(new Set([...memory.facts, ...newFacts])).slice(-40); // cap at 40 key facts
      memory.facts = updatedFacts;
      memory.lastUpdated = new Date().toISOString();

      await firebaseDB.saveUserMemory(uid, memory);
      memoryCache.set(uid.trim() || email.toLowerCase().trim(), { memory, timestamp: Date.now() });
      console.log(`[MemoryService] Saved ${newFacts.length} new facts for user ${email}`);
    }
  } catch (err) {
    console.warn("[MemoryService] Background memory extraction exception:", err);
  }
}
