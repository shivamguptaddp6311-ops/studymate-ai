import express from "express";
import path from "path";
import dotenv from "dotenv";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { executeAIRequest, getConfiguredProviders, AIProvider, AIMessage } from "./server/aiService";

dotenv.config();

const app = express();
const PORT = 3000;

// Chat Database definition and persistence paths
const DB_PATH = path.join(process.cwd(), "server_chat_db.json");

interface ChatMessage {
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
  deletedBy?: string;
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

interface ChatDB {
  messages: ChatMessage[];
  users: { [email: string]: ChatUser };
  reports: ChatReport[];
  adminLogs: AdminLog[];
}

let dbCache: ChatDB = {
  messages: [],
  users: {},
  reports: [],
  adminLogs: []
};

function loadDB() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, "utf8");
      dbCache = JSON.parse(data);
      // Ensure basic shapes exist
      if (!dbCache.messages) dbCache.messages = [];
      if (!dbCache.users) dbCache.users = {};
      if (!dbCache.reports) dbCache.reports = [];
      if (!dbCache.adminLogs) dbCache.adminLogs = [];
    } else {
      saveDB();
    }
  } catch (error) {
    console.error("Failed to load chat database, resetting:", error);
  }
}

function saveDB() {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(dbCache, null, 2), "utf8");
  } catch (error) {
    console.error("Failed to save chat database:", error);
  }
}

// Perform initial boot database loading
loadDB();

// Track SSE connections for real-time dispatching
let sseClients: Array<{ id: string; email: string; res: any }> = [];
const lastMessageTimes: { [email: string]: number } = {};


// Setup JSON body parsing with large limit for image uploads
app.use(express.json({ limit: "25mb" }));

// ----------------------------------------------------
// API ROUTES FIRST
// ----------------------------------------------------

// Get configured/available AI providers
app.get("/api/ai/providers", (req, res) => {
  try {
    const providers = getConfiguredProviders();
    res.json(providers);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch providers." });
  }
});

// 1. AI Solver Route - Multi-modal OCR & Step-by-Step Question Solver
app.post("/api/gemini/solve", async (req, res) => {
  try {
    const { prompt, image, subject, grade, favSubjects, weakSubjects, explainBriefly, provider = "auto" } = req.body;

    // Prepare core prompt instructions
    const systemInstruction = `You are StudyMate AI, an advanced expert academic tutor and general-knowledge companion, as powerful and unrestricted as Gemini or ChatGPT.
Your task is to analyze the provided image, handwritten notes, or question. You are capable of answering any type of question, academic or otherwise.
CRITICAL: Always respond and explain in the exact language used by the user or detected in the image/text (e.g., if the user asks in Hindi, solve and explain in Hindi; if in English, in English, etc.).
If an image is provided, first perform OCR to extract the question text accurately.
Then:
1. Detect the academic subject or domain.
2. Detect the topic/chapter.
3. Provide a clear, step-by-step solution explaining how to solve it. Show calculations, formulas used, and reasoning.
4. Provide a concise final answer.
5. Explain the underlying conceptual details in simple, friendly language.
6. Provide useful tips, shortcuts, or mental models.
7. Suggest 2-3 similar practice questions to help the student master this exact concept.

You MUST respond strictly in the following JSON format. Ensure all strings can be parsed properly and markdown formatting is utilized inside text fields for formulas and formatting (e.g. bolding, math equations, tables).
JSON schema to match:
{
  "ocrText": "The extracted question text from image (or the original text prompt)",
  "subject": "Subject or Domain name",
  "topic": "The specific topic or concept name",
  "steps": [
    "Step 1: description...",
    "Step 2: description..."
  ],
  "finalAnswer": "The direct concise answer",
  "conceptualExplanation": "The friendly simple conceptual explanation...",
  "tips": [
    "Shortcut or tip 1...",
    "Shortcut or tip 2..."
  ],
  "practiceQuestions": [
    "Practice Q1...",
    "Practice Q2..."
  ]
}`;

    let userPrompt = prompt || "Solve this academic question or scan this page.";
    if (explainBriefly) {
      userPrompt += `\n- **CRITICAL FORMAT RULE**: The user requested a BRIEF, HIGHLY CONCISE EXPLANATION. Minimize extra introductory words, keep steps and conceptual explanations short, focused, and straight-to-the-point. Summarize formulas and solutions into quick-reading lists.`;
    }
    if (grade || favSubjects || weakSubjects) {
      userPrompt += `\n\nStudent Profile Context to customize explanation depth and style:`;
      if (grade) userPrompt += `\n- Class Grade Level: ${grade}`;
      if (favSubjects && Array.isArray(favSubjects) && favSubjects.length > 0) {
        userPrompt += `\n- Favorite/Strong Subjects: ${favSubjects.join(", ")}`;
      }
      if (weakSubjects && Array.isArray(weakSubjects) && weakSubjects.length > 0) {
        userPrompt += `\n- Weak Subjects (Explain terms extra clearly and provide step-by-step encouragement): ${weakSubjects.join(", ")}`;
      }
    }
    
    const messages = [{ role: "user" as const, content: userPrompt }];

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        ocrText: { type: Type.STRING },
        subject: { type: Type.STRING },
        topic: { type: Type.STRING },
        steps: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        },
        finalAnswer: { type: Type.STRING },
        conceptualExplanation: { type: Type.STRING },
        tips: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        },
        practiceQuestions: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      },
      required: ["ocrText", "subject", "topic", "steps", "finalAnswer", "conceptualExplanation", "tips", "practiceQuestions"]
    };

    const response = await executeAIRequest({
      messages,
      systemInstruction,
      image,
      preferredProvider: provider as AIProvider,
      responseSchema
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("No response received from AI model.");
    }

    // Try parsing JSON with fallback cleanup for any markdown code blocks
    let parsedResult;
    try {
      parsedResult = JSON.parse(responseText);
    } catch (parseErr) {
      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        parsedResult = JSON.parse(jsonMatch[1].trim());
      } else {
        throw parseErr;
      }
    }

    res.json(parsedResult);
  } catch (error: any) {
    console.error("AI solver error:", error);
    res.status(500).json({ error: error.message || "Failed to solve the question. Please try again." });
  }
});

// 2. Interactive Tutor Chat - Follow-up and conversation
app.post("/api/gemini/chat", async (req, res) => {
  try {
    const { message, history, image, provider = "auto" } = req.body;

    // Reconstruct conversation history to clean AIMessage format
    // history format: Array<{ role: 'user' | 'model', message: string }>
    const messages: AIMessage[] = [];
    if (history && Array.isArray(history)) {
      history.forEach((h: any) => {
        if (h.message && h.message.trim()) {
          messages.push({
            role: h.role === "user" ? "user" : "model",
            content: h.message
          });
        }
      });
    }

    messages.push({
      role: "user",
      content: message || "Hello StudyMate AI"
    });

    const systemInstruction = `You are StudyMate AI, the trusted AI assistant for learning, work, creativity, coding, writing, research, productivity, and everyday conversations on the StudyMate platform.

Identity:
- Name: StudyMate AI
- Platform: StudyMate
- Personality: Friendly, intelligent, patient, professional, conversational, and respectful.
- Never claim to be human. You are an AI.
- Never invent facts (no hallucinations). Clearly distinguish between facts, opinions, estimates, and assumptions.
- Be warm, friendly, smart, professional, helpful, and encouraging. Never be rude or dismissive.

Primary Responsibilities:
You can help users with almost any topic, including but not limited to:
1. Education (Classes 1–12, all major boards):
   - Mathematics, Physics, Chemistry, Biology, English, Hindi, Social Science, Computer Science, Economics, Accountancy, Business Studies, Geography, History, Political Science.
   - Always explain concepts in simple language before giving advanced explanations.
2. Competitive Exams:
   - Olympiads, Reasoning, Aptitude.
3. General Knowledge:
   - Science, Technology, Space, AI, Programming, Business, Finance, Health, Sports, Entertainment, Geography, History, Culture, Politics, Government, Current Affairs, Environment, Nature, Travel, Food, Books, Movies, Music, Psychology, Philosophy.
4. Writing Assistant:
   - Essays, Reports, Emails, Letters, Assignments, Speeches, Stories, Poems, Resumes, Cover Letters, Notes, Summaries.
   - Adapt tone naturally based on the user's request.

Mathematics & Academic Solving Rules:
- Show every single step of your working.
- Explain formulas and the physical/mathematical reasoning behind them.
- Check calculations carefully to ensure absolute accuracy.
- Highlight common student mistakes and how to avoid them.
- Offer useful shortcuts or mental models when appropriate.
- Explain concepts and teach instead of only giving direct answers.
- Generate similar practice questions and provide revision notes when appropriate.

Image Understanding:
If the user uploads an image:
- Read printed text and handwriting where possible.
- Solve textbook questions, detect equations, explain diagrams, analyze graphs, extract tables, identify objects, and summarize notes.
- If the image is unclear, ask the user politely to upload a clearer image.

Conversational Guidelines:
- Hold natural, flowing conversations.
- Users may ask about daily life, motivation, productivity, hobbies, technology, travel, relationships, career, personal growth, or random questions. Respond naturally, and do NOT unnecessarily redirect every conversation back to studying.
- Language Support: Seamlessly understand and respond in English, Hindi, and Hinglish (mixed phonetic Hindi/English). Attempt to understand mixed-language input naturally.
- Live Internet: If live web search tools are provided, search only when needed, use reliable sources, and mention when information comes from live search. (If unavailable, state that your knowledge may not include the latest developments instead of pretending to know).

Response Style:
- IMPORTANT CONSTRAINTS: Keep your responses extremely short, concise, scannable, and simple while talking with the user so they can easily read and understand.
- DO NOT GIVE BIG OR VERBOSE REPLIES. Make them small, highly understandable, and split into short, scannable bullet points or single-sentence steps.
- Avoid massive paragraphs or walls of text. Ensure the explanation is bite-sized, direct, and incredibly easy to read.
- Use rich markdown formatting for headers, bold text, bullet points, numbered lists, and math equations, but keep the total text brief.
- Default response structure:
  1. Direct concise answer / high-level summary (1-2 sentences max).
  2. Brief step-by-step Explanation (bullet points).
  3. Simple example or quick tip.
  4. Ask whether the user wants more details.
- Avoid unnecessary repetition and be structured, brief, and honest.`;

    const response = await executeAIRequest({
      messages,
      systemInstruction,
      image,
      preferredProvider: provider as AIProvider
    });

    res.json({ reply: response.text });
  } catch (error: any) {
    console.error("AI chat error:", error);
    res.status(500).json({ error: error.message || "Failed to chat with AI Assistant." });
  }
});

// 2.5. Dynamic CBSE Chapter Material Generator (Textbook details on-demand)
app.post("/api/gemini/generate-chapter-materials", async (req, res) => {
  try {
    const { grade, subject, chapterNumber, chapterTitle, provider = "auto" } = req.body;

    const prompt = `You are StudyMate AI, the ultimate expert academic tutor for the CBSE/NCERT curriculum.
Generate highly detailed, comprehensive study materials for:
- Grade: ${grade}
- Subject: ${subject}
- Chapter Number: ${chapterNumber}
- Chapter Title: "${chapterTitle}"

The student needs:
1. "longNotes": In-depth revision notes explaining all theories, definitions, derivations, key concepts, and practical examples in full detail. Return as an array of 4-6 detailed paragraphs/sections.
2. "shortNotes": Quick-glance summary notes for fast learning. Return as an array of 4-5 items.
3. "formulas": Important formulas, key terms, or core equations. Return as an array of 3-5 items.
4. "pyqs": A collection of Solved Previous Year Questions (PYQs) with step-by-step CBSE criteria solutions. Generate a set of high-quality solved exam questions. Return as an array of objects: { "question": "Question text...", "answer": "Detailed step-by-step model answer...", "year": "2023/2024" }.
5. "practiceQuestions": Conceptual questions for self-testing. Return as an array of 5-10 challenge questions.

Ensure the content is extremely comprehensive and detailed. Do NOT return mock data or shorthand placeholders.
Respond strictly in JSON format matching this schema:
{
  "longNotes": ["detailed theory 1...", "detailed theory 2..."],
  "shortNotes": ["short recall point 1...", "short recall point 2..."],
  "formulas": ["formula or term 1...", "formula or term 2..."],
  "pyqs": [
    { "question": "CBSE Board exam question 1...", "answer": "Step-by-step board mark-scheme solution...", "year": "2024" }
  ],
  "practiceQuestions": ["challenge question 1...", "challenge question 2..."]
}`;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        longNotes: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        },
        shortNotes: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        },
        formulas: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        },
        pyqs: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              answer: { type: Type.STRING },
              year: { type: Type.STRING }
            },
            required: ["question", "answer", "year"]
          }
        },
        practiceQuestions: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      },
      required: ["longNotes", "shortNotes", "formulas", "pyqs", "practiceQuestions"]
    };

    const response = await executeAIRequest({
      messages: [{ role: "user", content: prompt }],
      preferredProvider: provider as AIProvider,
      responseSchema
    });

    res.json(JSON.parse(response.text || "{}"));
  } catch (error: any) {
    console.error("AI material generator error:", error);
    res.status(500).json({ error: error.message || "Failed to generate study materials." });
  }
});

// 3. AI Study Planner Generator
app.post("/api/gemini/suggest-schedule", async (req, res) => {
  try {
    const { name, grade, targetExam, dailyGoalHours, preferredTime, favSubjects, weakSubjects, provider = "auto" } = req.body;

    const prompt = `Generate a highly personalized study planner and timetable for a student named ${name}.
Details:
- Class/Grade: ${grade}
- Preparing for Target Exam: ${targetExam}
- Daily Study Goal: ${dailyGoalHours} hours
- Preferred Study Time: ${preferredTime}
- Favorite Subjects: ${favSubjects.join(", ") || "General"}
- Weak Subjects (which need extra focus & revision): ${weakSubjects.join(", ") || "None specified"}

Suggest a weekly routine schema with specific advice on spaced repetition, active recall, and Pomodoro breaks.
The response should be JSON structured strictly like this:
{
  "studyTips": ["Tip 1", "Tip 2", "Tip 3"],
  "weeklyTheme": "Theme name or focus focus for this class",
  "suggestedTimeAllocation": [
    { "subject": "Subject Name", "hoursPerWeek": 5, "reason": "Reason for focus" }
  ],
  "timetable": [
    { "day": "Monday", "sessions": [{ "time": "04:00 PM - 05:30 PM", "subject": "Math", "topic": "Algebra practice & active recall" }] }
  ]
}`;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        studyTips: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        },
        weeklyTheme: { type: Type.STRING },
        suggestedTimeAllocation: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              subject: { type: Type.STRING },
              hoursPerWeek: { type: Type.INTEGER },
              reason: { type: Type.STRING }
            },
            required: ["subject", "hoursPerWeek", "reason"]
          }
        },
        timetable: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              day: { type: Type.STRING },
              sessions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    time: { type: Type.STRING },
                    subject: { type: Type.STRING },
                    topic: { type: Type.STRING }
                  },
                  required: ["time", "subject", "topic"]
                }
              }
            },
            required: ["day", "sessions"]
          }
        }
      },
      required: ["studyTips", "weeklyTheme", "suggestedTimeAllocation", "timetable"]
    };

    const response = await executeAIRequest({
      messages: [{ role: "user", content: prompt }],
      preferredProvider: provider as AIProvider,
      responseSchema
    });

    res.json(JSON.parse(response.text || "{}"));
  } catch (error: any) {
    console.error("AI schedule error:", error);
    res.status(500).json({ error: error.message || "Failed to generate study plan." });
  }
});

// ----------------------------------------------------
// GLOBAL COMMUNITY CHAT ROUTES (SSE & REST API)
// ----------------------------------------------------

// Admin matching constraint: shivamguptaddp6312@gmail.com is the primary bootstrapped admin
function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.toLowerCase().trim();
  return normalized === "shivamguptaddp6312@gmail.com";
}

// Helper to broadcast event to all SSE streams
function broadcastToSSE(type: string, data: any) {
  const payload = JSON.stringify({ type, data });
  sseClients.forEach((client) => {
    try {
      client.res.write(`data: ${payload}\n\n`);
    } catch (e) {
      console.error("Error writing to client SSE connection:", e);
    }
  });
}

// SSE live online user count broadcaster
function broadcastOnlineCount() {
  const uniqueEmails = new Set(sseClients.map(c => c.email.toLowerCase()));
  broadcastToSSE("onlineCount", { count: Math.max(1, uniqueEmails.size) });
}

// 1. Establish Server-Sent Events (SSE) stream for instant real-time broadcasts
app.get("/api/chat/stream", (req, res) => {
  const { email } = req.query;
  const userEmail = typeof email === "string" ? email.toLowerCase().trim() : "anonymous";

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const clientId = Date.now().toString() + Math.random().toString(36).substring(2, 7);
  const newClient = { id: clientId, email: userEmail, res };
  sseClients.push(newClient);

  // Instantly acknowledge stream launch
  res.write(`data: ${JSON.stringify({ type: "connected", data: { clientId } })}\n\n`);

  // Broadcast updated count
  broadcastOnlineCount();

  // If user is admin, tell them how many reports are pending immediately
  if (isAdminEmail(userEmail)) {
    const pendingCount = dbCache.reports.filter(r => r.status === "pending").length;
    res.write(`data: ${JSON.stringify({ type: "adminInit", data: { pendingReportsCount: pendingCount } })}\n\n`);
  }

  req.on("close", () => {
    sseClients = sseClients.filter(c => c.id !== clientId);
    broadcastOnlineCount();
  });
});

// 2. Fetch paginated or searched chat history
app.get("/api/chat/messages", (req, res) => {
  try {
    const { before, search, limit } = req.query;
    let list = [...dbCache.messages];

    // Map deleted messages to hide content for standard clients
    const mappedList = list.map(m => {
      if (m.isDeleted) {
        return {
          ...m,
          text: "🚫 This message was removed by a community moderator.",
          isDeleted: true
        };
      }
      return m;
    });

    let filtered = mappedList;

    // Search filter
    if (search && typeof search === "string" && search.trim() !== "") {
      const q = search.toLowerCase().trim();
      filtered = filtered.filter(m => m.text.toLowerCase().includes(q) || m.username.toLowerCase().includes(q));
    }

    // Lazy load before cursor (using ISO string time)
    if (before && typeof before === "string") {
      const beforeTime = new Date(before).getTime();
      filtered = filtered.filter(m => new Date(m.timestamp).getTime() < beforeTime);
    }

    // Sort by timestamp chronological order
    filtered.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Page constraints
    const maxLimit = limit ? parseInt(limit as string) : 50;
    const paginated = filtered.slice(-maxLimit);

    res.json(paginated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to retrieve chat logs." });
  }
});

// 3. Post a message, validating constraints and using Gemini for strict OCR/Safety moderation
app.post("/api/chat/message", async (req, res) => {
  try {
    const { userEmail, username, avatar, level, badge, text, country, repliedToId, repliedToUser } = req.body;

    if (!userEmail || !username || !text) {
      return res.status(400).json({ error: "Missing required profile credentials or message string." });
    }

    const emailNorm = userEmail.toLowerCase().trim();
    const cleanText = text.trim();

    // Verification 1: Is user banned?
    const userState = dbCache.users[emailNorm];
    if (userState && userState.isBanned) {
      return res.status(403).json({ error: "Your account has been suspended for violating CBSE study group guidelines." });
    }

    // Verification 2: Is user temporarily muted?
    if (userState && userState.muteExpiresAt) {
      const now = new Date();
      const muteExpires = new Date(userState.muteExpiresAt);
      if (muteExpires > now) {
        const diffMs = muteExpires.getTime() - now.getTime();
        const minutesLeft = Math.ceil(diffMs / 60000);
        return res.status(403).json({
          error: `You are temporarily muted from sending messages. Duration remaining: ${minutesLeft} minute(s).`
        });
      }
    }

    // Verification 3: Rate limiting (One message every 2 seconds)
    const lastTime = lastMessageTimes[emailNorm] || 0;
    const nowTime = Date.now();
    if (nowTime - lastTime < 2000) {
      return res.status(429).json({ error: "Spam Guard: Please wait 2 seconds between messages." });
    }
    lastMessageTimes[emailNorm] = nowTime;

    // Verification 4: Max length boundary limit
    if (cleanText.length > 500) {
      return res.status(400).json({ error: "Spam Guard: Messages must be under 500 characters." });
    }

    // Verification 5: Duplicate message check
    const activeMsgs = dbCache.messages.filter(m => m.userEmail === emailNorm && !m.isDeleted);
    if (activeMsgs.length > 0) {
      const lastMsg = activeMsgs[activeMsgs.length - 1];
      if (lastMsg.text.toLowerCase().trim() === cleanText.toLowerCase()) {
        return res.status(400).json({ error: "Spam Guard: Duplicate message block. Try posting something new!" });
      }
    }

    // Verification 6: Link, photo and URL block (for non-admins)
    if (!isAdminEmail(emailNorm)) {
      const hasLink = /https?:\/\/[^\s]+|www\.[^\s]+|\b[a-zA-Z0-9-]+\.(com|org|net|in|co|info|us|xyz|me|io|edu|gov|app|co\.in)\b/gi.test(cleanText);
      const hasPhotoReference = /\.(jpg|jpeg|png|gif|webp|bmp)/gi.test(cleanText) || /\b(jpeg|jpg|png|gif|webp|bmp)\b/gi.test(cleanText) || /\[(photo|image|picture|pic|img)\]/gi.test(cleanText);
      
      if (hasLink) {
        return res.status(400).json({ error: "Spam Guard: External links, URLs, and advertisements are strictly banned in the community chat room." });
      }
      if (hasPhotoReference) {
        return res.status(400).json({ error: "Spam Guard: Sharing photos, images, or media file extensions is strictly banned in the community chat room." });
      }
    }

    // Verification 7: Excess emoji flooding check
    const emojis = cleanText.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]|\p{Emoji_Presentation}|\p{Emoji}\uFE0F/gu) || [];
    if (emojis.length > 8) {
      return res.status(400).json({ error: "Spam Guard: Please limit message to a maximum of 8 emojis." });
    }

    // Verification 8: AI-Powered Moderation Check via Gemini API (Unified Multi AI Service)
    let isViolation = false;
    let violationReason = "";
    let violationExplain = "";

    try {
      const systemPrompt = `You are a real-time automated Study Group Chat Moderator.
Analyze the user's text and determine if it violates community guidelines.

COMMUNITY PERMISSIONS:
- Users HAVE explicit permission to talk about their personal life, feelings, friends, hobbies, struggles, family, daily life, relationships, or academic stress. This is a supportive peer community, so personal discussions are 100% PERMITTED and should NOT be flagged as violations.

COMMUNITY RESTRICTIONS (VIOLATIONS):
- Strict Ban: Abusive language, swearing, profanities, slurs, curse words, hate speech, bullying, or "gaali" in any language (especially Hindi/English phonetics e.g. chutiya, bhenchod, madarchod, gand, asshole, bitch, fuck, whre, randi, bkl, mc, bc, etc.) MUST be flagged as isViolation: true.
- Strict Ban: Sharing website links, URLs (e.g., .com, .net, www., http) or mentioning/attempting to share photos, pictures, images, file extensions (.jpg, .png), or graphic attachments. These MUST be flagged as isViolation: true.

Return strictly a JSON object matching this schema:
{
  "isViolation": boolean,
  "reason": "Specify: 'profanity' | 'link_or_photo_ban' | 'hate_speech' | 'harassment' | null",
  "explanation": "A user-facing concise warning reason in English (e.g., 'Abusive language is not allowed' or 'URLs and photos are strictly banned in this community'), or null"
}`;

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          isViolation: { type: Type.BOOLEAN },
          reason: { type: Type.STRING },
          explanation: { type: Type.STRING }
        },
        required: ["isViolation", "reason", "explanation"]
      };

      const response = await executeAIRequest({
        messages: [{ role: "user", content: `Analyze this chat text: "${cleanText}"` }],
        systemInstruction: systemPrompt,
        preferredProvider: "auto",
        responseSchema
      });

      const resJson = JSON.parse(response.text || "{}");
      isViolation = !!resJson.isViolation;
      violationReason = resJson.reason || "profanity";
      violationExplain = resJson.explanation || "Your message violates community guidelines.";
    } catch (apiErr) {
      console.warn("AI moderation failed, engaging regex fallback engine:", apiErr);
      const lowerText = cleanText.toLowerCase();
      const localBadWords = [
        "abuse", "hate", "racism", "harass", "threat", "bully", "scam", "spam",
        "chutiya", "gand", "bhenchod", "madarchod", "lauda", "loda", "asshole",
        "bitch", "fuck", "bastard", "idiot", "nigger", "slut", "whore", "mc", "bc"
      ];
      const foundBad = localBadWords.some(w => lowerText.includes(w));
      if (foundBad) {
        isViolation = true;
        violationReason = "profanity";
        violationExplain = "Your message contains inappropriate or offensive language (Spam/Safety Filter).";
      }
    }

    // 9. Handle infraction consequences (Warning, 10-Min Mute, 24-Hr Mute, Suspension)
    if (isViolation) {
      if (!dbCache.users[emailNorm]) {
        dbCache.users[emailNorm] = {
          email: emailNorm,
          username,
          avatar,
          level: level || 1,
          badge,
          joinDate: new Date().toISOString(),
          country: country || "India",
          violationsCount: 0,
          isBanned: false
        };
      }

      dbCache.users[emailNorm].violationsCount += 1;
      const count = dbCache.users[emailNorm].violationsCount;

      let penaltyMsg = "";
      let muteExpiresString: string | null = null;
      let accountBanned = false;

      if (count === 1) {
        penaltyMsg = "Your message violates community guidelines. This is warning (1/3). Continued abuse will trigger mutes/ban.";
      } else if (count === 2) {
        const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        muteExpiresString = expiry.toISOString();
        dbCache.users[emailNorm].muteExpiresAt = muteExpiresString;
        penaltyMsg = "Your message violates community guidelines. This is infraction (2/3). You are MUTED for 10 minutes.";
      } else if (count === 3) {
        const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        muteExpiresString = expiry.toISOString();
        dbCache.users[emailNorm].muteExpiresAt = muteExpiresString;
        penaltyMsg = "Your message violates community guidelines. This is infraction (3/3). You are MUTED for 24 hours.";
      } else {
        accountBanned = true;
        dbCache.users[emailNorm].isBanned = true;
        dbCache.users[emailNorm].banReason = "Repeated deliberate abuse of chat safety guidelines.";
        penaltyMsg = "Your account has been SUSPENDED due to continued guidelines violations.";
      }

      saveDB();

      // Log to system logs
      dbCache.adminLogs.push({
        id: "log-" + Date.now(),
        adminEmail: "AUTO_AI_MODERATOR",
        action: accountBanned ? "BAN_USER" : "WARNING_PENALTY",
        targetEmail: emailNorm,
        details: `Auto-moderated text: "${cleanText}". Reason: ${violationReason}. Outcome: ${penaltyMsg}`,
        timestamp: new Date().toISOString()
      });
      saveDB();

      // Notify admins
      broadcastToSSE("adminLogsUpdated", {});

      return res.status(400).json({
        violation: true,
        reason: violationReason,
        explanation: violationExplain,
        violationsCount: count,
        penaltyMessage: penaltyMsg,
        muteExpiresAt: muteExpiresString,
        isBanned: accountBanned
      });
    }

    // 10. Persist and broadcast valid chat message
    const newMessage: ChatMessage = {
      id: "msg-" + Date.now() + Math.random().toString(36).substring(2, 6),
      userEmail: emailNorm,
      username,
      avatar,
      level: level || 1,
      badge,
      text: cleanText,
      country: country || "India",
      timestamp: new Date().toISOString(),
      repliedToId: repliedToId || null,
      repliedToUser: repliedToUser || null,
      isDeleted: false,
      reportsCount: 0
    };

    // Ensure profile is kept synced in chat users directory
    dbCache.users[emailNorm] = {
      email: emailNorm,
      username,
      avatar,
      level: level || 1,
      badge,
      joinDate: dbCache.users[emailNorm]?.joinDate || new Date().toISOString(),
      country: country || "India",
      violationsCount: dbCache.users[emailNorm]?.violationsCount || 0,
      muteExpiresAt: dbCache.users[emailNorm]?.muteExpiresAt || null,
      isBanned: false
    };

    dbCache.messages.push(newMessage);
    saveDB();

    // Broadcast message via SSE
    broadcastToSSE("message", newMessage);

    // Analyze mentions and dispatch notifications
    const mentionMatch = cleanText.match(/@([a-zA-Z0-9_\-]+)/g);
    if (mentionMatch) {
      mentionMatch.forEach(m => {
        const nameToFind = m.substring(1).toLowerCase().trim();
        const matchedUser = Object.values(dbCache.users).find(u => u.username.toLowerCase().trim() === nameToFind);
        if (matchedUser && matchedUser.email !== emailNorm) {
          broadcastToSSE("notification", {
            targetEmail: matchedUser.email,
            title: "💬 Community Chat Mention",
            message: `${username} mentioned you in global chat: "${cleanText.substring(0, 50)}${cleanText.length > 50 ? "..." : ""}"`,
            type: "alert"
          });
        }
      });
    }

    // Analyze replied messages
    if (repliedToId) {
      const origMsg = dbCache.messages.find(m => m.id === repliedToId);
      if (origMsg && origMsg.userEmail !== emailNorm) {
        broadcastToSSE("notification", {
          targetEmail: origMsg.userEmail,
          title: "💬 Community Chat Reply",
          message: `${username} replied to your chat: "${cleanText.substring(0, 50)}${cleanText.length > 50 ? "..." : ""}"`,
          type: "info"
        });
      }
    }

    res.json(newMessage);
  } catch (error: any) {
    console.error("Post message error:", error);
    res.status(500).json({ error: error.message || "Failed to process chat message." });
  }
});

// 4. Submit an abuse report against a message
app.post("/api/chat/report", (req, res) => {
  try {
    const { messageId, reportedBy, reason, comment } = req.body;

    if (!messageId || !reportedBy || !reason) {
      return res.status(400).json({ error: "Missing reported parameters." });
    }

    const msg = dbCache.messages.find(m => m.id === messageId);
    if (!msg) {
      return res.status(404).json({ error: "Original message not found." });
    }

    const reportId = "rep-" + Date.now() + Math.random().toString(36).substring(2, 6);
    const newReport: ChatReport = {
      id: reportId,
      messageId,
      messageText: msg.text,
      messageAuthor: msg.userEmail,
      reportedBy,
      reason,
      comment: comment || "",
      timestamp: new Date().toISOString(),
      status: "pending"
    };

    dbCache.reports.push(newReport);
    msg.reportsCount = (msg.reportsCount || 0) + 1;
    saveDB();

    // Broadcast event to active admins
    broadcastToSSE("reportCreated", newReport);

    res.json({ success: true, report: newReport });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to log report." });
  }
});

// 5. Broadcast typing state
app.post("/api/chat/typing", (req, res) => {
  try {
    const { userEmail, username, isTyping } = req.body;
    if (userEmail && username) {
      broadcastToSSE("typingState", { userEmail, username, isTyping });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to broadcast typing." });
  }
});

// 6. Admin Panel stats retrieval
app.get("/api/chat/admin/stats", (req, res) => {
  try {
    const { email } = req.query;
    if (!isAdminEmail(email as string)) {
      return res.status(403).json({ error: "Unauthorized access to administrator dashboard." });
    }

    res.json({
      reports: dbCache.reports,
      adminLogs: dbCache.adminLogs,
      users: Object.values(dbCache.users),
      totalMessages: dbCache.messages.length,
      activeUsersCount: new Set(sseClients.map(c => c.email)).size
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to retrieve logs." });
  }
});

// 7. Admin Action Endpoint (Mute, Ban, Delete)
app.post("/api/chat/admin/action", (req, res) => {
  try {
    const { adminEmail, action, targetId, targetEmail, reason } = req.body;

    if (!isAdminEmail(adminEmail)) {
      return res.status(403).json({ error: "Unauthorized access to moderator commands." });
    }

    const timestamp = new Date().toISOString();

    if (action === "deleteMessage") {
      const msg = dbCache.messages.find(m => m.id === targetId);
      if (msg) {
        msg.isDeleted = true;
        msg.deletedBy = adminEmail;

        // Resolve reports
        dbCache.reports.forEach(r => {
          if (r.messageId === targetId && r.status === "pending") {
            r.status = "reviewed";
            r.actionTaken = "DELETED";
            r.reviewedAt = timestamp;

            // Notify reporter of review update
            broadcastToSSE("notification", {
              targetEmail: r.reportedBy,
              title: "⚖️ Report Reviewed",
              message: "A moderator has reviewed your report and deleted the offending message.",
              type: "success"
            });
          }
        });

        dbCache.adminLogs.push({
          id: "log-" + Date.now(),
          adminEmail,
          action: "DELETE_MESSAGE",
          targetEmail: msg.userEmail,
          details: `Deleted message: "${msg.text}". Reason: ${reason || "Moderation Guidelines"}`,
          timestamp
        });

        saveDB();
        broadcastToSSE("messageDeleted", { messageId: targetId });
        broadcastToSSE("adminLogsUpdated", {});
      }
    } else if (action === "muteUser") {
      const u = dbCache.users[targetEmail.toLowerCase().trim()];
      if (u) {
        const muteExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 Hours
        u.muteExpiresAt = muteExpiry;

        dbCache.adminLogs.push({
          id: "log-" + Date.now(),
          adminEmail,
          action: "MUTE_USER",
          targetEmail: targetEmail.toLowerCase().trim(),
          details: `Muted user for 24 hours. Reason: ${reason || "Community violation."}`,
          timestamp
        });

        saveDB();
        broadcastToSSE("userMuted", { email: targetEmail, expiresAt: muteExpiry });
        broadcastToSSE("adminLogsUpdated", {});
      }
    } else if (action === "unmuteUser") {
      const u = dbCache.users[targetEmail.toLowerCase().trim()];
      if (u) {
        u.muteExpiresAt = null;

        dbCache.adminLogs.push({
          id: "log-" + Date.now(),
          adminEmail,
          action: "UNMUTE_USER",
          targetEmail: targetEmail.toLowerCase().trim(),
          details: `Unmuted user manually.`,
          timestamp
        });

        saveDB();
        broadcastToSSE("userUnmuted", { email: targetEmail });
        broadcastToSSE("adminLogsUpdated", {});
      }
    } else if (action === "banUser") {
      const u = dbCache.users[targetEmail.toLowerCase().trim()];
      if (u) {
        u.isBanned = true;
        u.banReason = reason || "Abuse of rules.";

        dbCache.adminLogs.push({
          id: "log-" + Date.now(),
          adminEmail,
          action: "BAN_USER",
          targetEmail: targetEmail.toLowerCase().trim(),
          details: `Banned user. Reason: ${reason || "Abuse"}`,
          timestamp
        });

        saveDB();
        broadcastToSSE("userBanned", { email: targetEmail });
        broadcastToSSE("adminLogsUpdated", {});
      }
    } else if (action === "unbanUser") {
      const u = dbCache.users[targetEmail.toLowerCase().trim()];
      if (u) {
        u.isBanned = false;
        u.banReason = undefined;

        dbCache.adminLogs.push({
          id: "log-" + Date.now(),
          adminEmail,
          action: "UNBAN_USER",
          targetEmail: targetEmail.toLowerCase().trim(),
          details: "Unbanned user manually.",
          timestamp
        });

        saveDB();
        broadcastToSSE("adminLogsUpdated", {});
      }
    } else if (action === "resolveReport") {
      const rep = dbCache.reports.find(r => r.id === targetId);
      if (rep) {
        rep.status = "reviewed";
        rep.actionTaken = "RESOLVED_WITHOUT_DELETE";
        rep.reviewedAt = timestamp;

        dbCache.adminLogs.push({
          id: "log-" + Date.now(),
          adminEmail,
          action: "RESOLVE_REPORT",
          details: `Resolved report ID ${targetId} without message delete.`,
          timestamp
        });

        saveDB();
        broadcastToSSE("notification", {
          targetEmail: rep.reportedBy,
          title: "⚖️ Report Reviewed",
          message: "A moderator has reviewed your report. The content was found to be compliant.",
          type: "info"
        });
        broadcastToSSE("adminLogsUpdated", {});
      }
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to process admin actions." });
  }
});

// ----------------------------------------------------
// VITE AND STATIC ASSET SERVING MIDDLEWARE
// ----------------------------------------------------

async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`StudyMate server listening on http://0.0.0.0:${PORT}`);
  });
}

start();
