import fs from "fs";
import path from "path";
import crypto from "crypto";
import { executeAIRequest, parseJsonResponse } from "./aiService";
import { Type } from "@google/genai";

export interface Question {
  id: string;
  type: "mcq" | "assertion-reason" | "case-based" | "match-following" | "numerical";
  classGrade: string; // "Class 6" to "Class 12"
  subject: string;
  chapter: string;
  difficulty: "Easy" | "Medium" | "Hard" | "Expert";
  question: string;
  options: string[];
  correctAnswer: number; // 0 to 3
  explanation: string;
  createdAt: string;
}

const POOL_PATH = path.join(process.cwd(), "server_question_pool.json");

let questionPool: Question[] = [];

// Helper to load question pool from local file
export function loadQuestionPool() {
  try {
    if (fs.existsSync(POOL_PATH)) {
      const data = fs.readFileSync(POOL_PATH, "utf8");
      questionPool = JSON.parse(data);
      console.log(`[QuestionService] Loaded ${questionPool.length} questions from local pool cache.`);
    } else {
      questionPool = [];
      saveQuestionPool();
      console.log(`[QuestionService] Created empty question pool cache.`);
    }
  } catch (err) {
    console.error("[QuestionService] Failed to load question pool:", err);
    questionPool = [];
  }
}

// Helper to save question pool to local file
export function saveQuestionPool() {
  try {
    fs.writeFileSync(POOL_PATH, JSON.stringify(questionPool, null, 2), "utf8");
  } catch (err) {
    console.error("[QuestionService] Failed to save question pool:", err);
  }
}

// Generate new questions using Gemini API
async function generateNewQuestions(
  classGrade: string,
  subject: string,
  chapter: string,
  difficulty: string,
  countToGenerate: number
): Promise<Question[]> {
  console.log(`[QuestionService] Calling Gemini to generate ${countToGenerate} unique questions for ${classGrade}, ${subject}, Chapter: "${chapter}", Difficulty: ${difficulty}`);

  const types = ["mcq", "assertion-reason", "case-based", "match-following", "numerical"];
  
  // Find existing question texts in our pool to prevent duplicates
  const existingQuestions = questionPool
    .filter(
      (q) =>
        q.classGrade.toLowerCase() === classGrade.toLowerCase() &&
        q.subject.toLowerCase() === subject.toLowerCase() &&
        q.chapter.toLowerCase() === chapter.toLowerCase() &&
        q.difficulty.toLowerCase() === difficulty.toLowerCase()
    )
    .slice(0, 15)
    .map((q) => q.question);

  const systemInstruction = `You are StudyMate AI, an elite board exam developer and competitive exam paper designer (CBSE, Olympiad, JEE, NEET).
Your task is to design extremely high-quality, syllabus-aligned, and error-free assessment questions for students.

Target Specifications:
- Class Grade: ${classGrade} (Follow Class ${classGrade.replace("Class ", "")} syllabus standards strictly)
- Subject: ${subject}
- Chapter/Topic: ${chapter}
- Difficulty Level: ${difficulty}
  - Easy: core basic definitions, fundamental recall, and simple direct concepts.
  - Medium: application-based, analytical interpretations, and compound concepts.
  - Hard: board exam-level HOTS (High Order Thinking Skills), tricky conceptual reasoning, or board-style PYQ equivalents.
  - Expert: Olympiad, JEE Mains/NEET level rigorous conceptual and expert level problems.

You MUST vary the question types. Include a balanced mix from:
1. "mcq": standard multiple-choice questions.
2. "assertion-reason": formatted as:
   "Assertion (A): [Statement]\nReason (R): [Reason statement]"
   With options exactly matching standard CBSE convention:
   Option 0: Both A and R are true and R is the correct explanation of A.
   Option 1: Both A and R are true but R is not the correct explanation of A.
   Option 2: A is true but R is false.
   Option 3: A is false but R is true.
3. "case-based": begins with a paragraph scenario/experiment, followed by a targeted query.
4. "match-following": Column I & Column II mapping, options representing matching pairings (e.g. A-2, B-1, C-4, D-3).
5. "numerical": conceptual calculations (with realistic numbers, correct formulas, and 4 distinct numeric options).

Every question MUST have:
- A unique question text.
- Exactly 4 options.
- One correct answer index (0, 1, 2, or 3).
- A clear, detailed step-by-step conceptual and calculated explanation.

You MUST return your response as a strict JSON array matching the required schema. Ensure no trailing commas, no truncated fields, and proper markdown formatting (e.g. bolding, math equations, subscript/superscript) inside text strings.`;

  let userPrompt = `Generate exactly ${countToGenerate} unique, high-quality, and error-free questions.
Ensure they are completely relevant to the chapter "${chapter}" of ${subject} for ${classGrade} at "${difficulty}" difficulty.
Do not duplicate any existing standard questions. Ensure different question types (mcq, assertion-reason, case-based, match-following, numerical) are represented where appropriate.`;

  if (existingQuestions.length > 0) {
    userPrompt += `\n\nCRITICAL: To prevent repetition, you MUST NOT generate questions that are identical to, similar to, or duplicates of the following already existing questions in our database:\n` +
      existingQuestions.map((qText, idx) => `${idx + 1}. "${qText}"`).join("\n") +
      `\n\nGenerate completely fresh and unique questions.`;
  }

  const responseSchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        type: { type: Type.STRING },
        question: { type: Type.STRING },
        options: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        },
        correctAnswer: { type: Type.INTEGER },
        explanation: { type: Type.STRING }
      },
      required: ["type", "question", "options", "correctAnswer", "explanation"]
    }
  };

  try {
    const aiResponse = await executeAIRequest({
      messages: [{ role: "user", content: userPrompt }],
      systemInstruction,
      preferredProvider: "gemini",
      responseSchema,
      timeoutMs: 45000 // Generous timeout for multiple questions
    });

    const parsedArray = parseJsonResponse(aiResponse.text);
    if (!Array.isArray(parsedArray)) {
      throw new Error("Gemini response is not a valid JSON array.");
    }

    const newQuestions: Question[] = parsedArray.map((item: any, idx: number) => {
      const qId = `q-${classGrade.toLowerCase().replace(/\s+/g, "")}-${subject.toLowerCase().replace(/\s+/g, "")}-${crypto.randomBytes(4).toString("hex")}-${idx}`;
      return {
        id: qId,
        type: item.type || "mcq",
        classGrade,
        subject,
        chapter,
        difficulty: difficulty as any,
        question: item.question,
        options: Array.isArray(item.options) && item.options.length === 4 ? item.options : ["Option A", "Option B", "Option C", "Option D"],
        correctAnswer: typeof item.correctAnswer === "number" && item.correctAnswer >= 0 && item.correctAnswer < 4 ? item.correctAnswer : 0,
        explanation: item.explanation || "No explanation provided.",
        createdAt: new Date().toISOString()
      };
    });

    return newQuestions;
  } catch (err) {
    console.error("[QuestionService] Failed to generate questions via Gemini:", err);
    throw err;
  }
}

// Retrieve questions matching filters, automatically generating new ones if the pool is small
export async function getQuestions(params: {
  classGrade: string;
  subject: string;
  chapter: string;
  difficulty: "Easy" | "Medium" | "Hard" | "Expert";
  excludeIds: string[];
  count: number;
}): Promise<Question[]> {
  const { classGrade, subject, chapter, difficulty, excludeIds = [], count = 5 } = params;

  // 1. Filter local cache pool first
  let filtered = questionPool.filter(
    (q) =>
      q.classGrade.toLowerCase() === classGrade.toLowerCase() &&
      q.subject.toLowerCase() === subject.toLowerCase() &&
      q.chapter.toLowerCase() === chapter.toLowerCase() &&
      q.difficulty.toLowerCase() === difficulty.toLowerCase()
  );

  // 2. Filter out previously served questions
  let available = filtered.filter((q) => !excludeIds.includes(q.id));

  console.log(`[QuestionService] Found ${filtered.length} total cached, ${available.length} available unused questions for ${classGrade}, ${subject}, ${chapter}, ${difficulty}`);

  // 3. If available pool has fewer questions than requested, generate more!
  if (available.length < count) {
    const needed = count - available.length;
    // Generate a slightly larger batch (e.g., generate 5 or 10) to expand the pool for next time
    const countToGenerate = Math.max(needed, 8);
    
    try {
      const generated = await generateNewQuestions(classGrade, subject, chapter, difficulty, countToGenerate);
      
      // Add newly generated questions to our cache pool
      questionPool.push(...generated);
      saveQuestionPool();

      // Refilter with the new questions added
      filtered = questionPool.filter(
        (q) =>
          q.classGrade.toLowerCase() === classGrade.toLowerCase() &&
          q.subject.toLowerCase() === subject.toLowerCase() &&
          q.chapter.toLowerCase() === chapter.toLowerCase() &&
          q.difficulty.toLowerCase() === difficulty.toLowerCase()
      );
      available = filtered.filter((q) => !excludeIds.includes(q.id));
    } catch (err) {
      console.warn("[QuestionService] Question generation failed, falling back to recycle cached questions.");
      // Fallback: If we can't generate via Gemini, recycle previously served questions in this category
      if (filtered.length > 0) {
        available = [...filtered];
      }
    }
  }

  // 4. Truly dynamic randomization: shuffle the available questions
  const shuffled = [...available].sort(() => Math.random() - 0.5);

  // 5. Take exactly the requested amount
  let selected = shuffled.slice(0, count);

  // Ultimate fallback: If still empty (e.g. no questions in database and generation failed), return some mock placeholders
  if (selected.length === 0) {
    selected = [
      {
        id: `q-mock-fallback-${Date.now()}`,
        type: "mcq",
        classGrade,
        subject,
        chapter,
        difficulty,
        question: `Assess your knowledge on ${subject}: ${chapter}. (Dynamic generation is currently establishing, try again shortly).`,
        options: [
          "Study key concepts from notes",
          "Attempt practice questions",
          "Solve past year CBSE board papers",
          "Utilize StudyMate dynamic worksheets"
        ],
        correctAnswer: 0,
        explanation: "This is a placeholder question because your dynamic pool is generating. Please ensure your GEMINI_API_KEY is active.",
        createdAt: new Date().toISOString()
      }
    ];
  }

  return selected;
}

// Initial seed loading
loadQuestionPool();
